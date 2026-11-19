// =====================================================
// RETRO NFC — sinalização de netplay (Cloudflare)
// Worker + Durable Object (SQLite) por sala.
// Sem cold start: o objeto nasce sob demanda em milissegundos.
// =====================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS)
  });
}

function limparSala(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: 'retronfc-netplay', motor: 'cloudflare' });
    }

    if (url.pathname === '/ws') {
      const sala = limparSala(url.searchParams.get('sala'));
      if (!sala) return json({ ok: false, erro: 'sala-invalida' }, 400);
      const stub = env.SALAS.get(env.SALAS.idFromName(sala));
      return stub.fetch(request);
    }

    return json({ ok: false, erro: 'rota' }, 404);
  }
};

export class SalaNetplay {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async meta() {
    return (await this.state.storage.get('meta')) || null;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.endsWith('/health')) {
      const m = await this.meta();
      return json({ ok: true, sala: m ? m.sala : null, aberta: !!m });
    }

    if ((request.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') {
      return json({ ok: false, erro: 'esperado-websocket' }, 426);
    }

    const par = new WebSocketPair();
    const cliente = par[0];
    const servidor = par[1];

    this.state.acceptWebSocket(servidor);

    return new Response(null, { status: 101, webSocket: cliente });
  }

  papel(ws) {
    try {
      const a = ws.deserializeAttachment();
      return a && a.papel ? a.papel : null;
    } catch (e) { return null; }
  }

  paraHost(obj) {
    const s = JSON.stringify(obj);
    for (const w of this.state.getWebSockets()) {
      if (this.papel(w) !== 'host') continue;
      try { w.send(s); } catch (e) {}
    }
  }

  paraOutros(origem, obj) {
    const s = JSON.stringify(obj);
    for (const w of this.state.getWebSockets()) {
      if (w === origem) continue;
      try { w.send(s); } catch (e) {}
    }
  }

  async webSocketMessage(ws, bruto) {
    let d;
    try {
      d = JSON.parse(typeof bruto === 'string' ? bruto : new TextDecoder().decode(bruto));
    } catch (e) { return; }

    if (!d || !d.t) return;

    if (d.t === 'ping') { try { ws.send(JSON.stringify({ t: 'pong' })); } catch (e) {} return; }
    if (d.t === 'criar') return this.criar(ws, d);
    if (d.t === 'entrar') return this.entrar(ws, d);
    if (d.t === 'sinal') return this.sinal(ws, d);
    if (d.t === 'entrada') return this.entrada(ws, d);
  }

  async criar(ws, d) {
    const sala = limparSala(d.sala);
    if (!sala) { ws.send(JSON.stringify({ t: 'erro', erro: 'sala-invalida' })); return; }

    if (await this.meta()) {
      ws.send(JSON.stringify({ t: 'erro', erro: 'sala-existe' }));
      return;
    }

    const meta = {
      sala: sala,
      jogo: String(d.jogo || '').slice(0, 60),
      apelido: String(d.apelido || 'Anfitriao').slice(0, 20),
      criadaEm: Date.now()
    };

    await this.state.storage.put('meta', meta);
    await this.state.storage.setAlarm(Date.now() + 2 * 60 * 60 * 1000);

    ws.serializeAttachment({ papel: 'host', apelido: meta.apelido });
    ws.send(JSON.stringify({ t: 'criado', sala: sala, jogo: meta.jogo }));
  }

  async entrar(ws, d) {
    const meta = await this.meta();
    if (!meta) { ws.send(JSON.stringify({ t: 'erro', erro: 'sala-fechada' })); return; }

    // Convite vale 60s a partir da criação (só vale para quem ainda não entrou)
    if (!meta.convidadoEm && Date.now() - meta.criadaEm > 60 * 1000) {
      ws.send(JSON.stringify({ t: 'erro', erro: 'link-expirado' }));
      return;
    }

    // Só 1 convidado por vez
    for (const w of this.state.getWebSockets()) {
      if (w !== ws && this.papel(w) === 'convidado') {
        ws.send(JSON.stringify({ t: 'erro', erro: 'sala-cheia' }));
        return;
      }
    }

    if (!meta.convidadoEm) {
      meta.convidadoEm = Date.now();
      await this.state.storage.put('meta', meta);
    }

    ws.serializeAttachment({ papel: 'convidado', apelido: String(d.apelido || 'Convidado').slice(0, 20) });
    ws.send(JSON.stringify({ t: 'entrou', sala: meta.sala, jogo: meta.jogo }));
    this.paraHost({ t: 'convidado' });
  }

  sinal(ws, d) {
    this.paraOutros(ws, { t: 'sinal', dados: d.dados });
  }

  entrada(ws, d) {
    if (this.papel(ws) !== 'convidado') return;
    this.paraHost({ t: 'entrada', b: d.b });
  }

  async webSocketClose(ws) {
    this.paraOutros(ws, { t: 'saiu' });
  }

  async webSocketError(ws) {
    this.paraOutros(ws, { t: 'saiu' });
  }

  async alarm() {
    await this.state.storage.deleteAll();
  }
}
