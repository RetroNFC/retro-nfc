// =====================================================
// RETRO NFC — app.js (v9.3)
// Frontend envia apenas campos estruturados; o Apps Script monta o texto.
// Falha de armazenamento ou de telemetria nunca bloqueia o jogo.
// =====================================================

const URL_BACKEND = "https://script.google.com/macros/s/AKfycbw2aJCwpgq1OJ1fVSXUz8hUMCK7M2Ho1l7HdUKGf8hF4rbS2FFEDGiyBW6FA03yRTz_/exec";

const APP_VERSAO = "9.3";

// --- Netplay (coop online) ---------------------------------------------
// Deixe vazio para desativar o coop: o botao aparece como INDISPONIVEL.
// Precisa ser HTTPS: a pagina roda em HTTPS e o navegador bloqueia
// WebSocket inseguro (mixed content).
const NETPLAY_SERVIDOR = "https://retronfc-netplay.omitodofifa.workers.dev";
const NETPLAY_WS       = "wss://retronfc-netplay.omitodofifa.workers.dev/ws";

const NETPLAY_ATIVO = /^https:\/\/.+/i.test(NETPLAY_SERVIDOR);

// Chaves do localStorage (todas com o prefixo retronfc_)
const CHAVE_COLECAO   = 'retronfc_colecao';
const CHAVE_JOGOS     = 'retronfc_games_cache';
const CHAVE_NOME      = 'retronfc_nome';
const CHAVE_ID        = 'retronfc_id_curto';
const CHAVE_VISITAS   = 'retronfc_visitas';
const CHAVE_PENDENTES = 'retronfc_pendentes';
const CHAVE_RECENTES  = 'retronfc_recentes';
const CHAVE_MODO      = 'retronfc_modo_jogo';

// Identificador unico desta sessao de jogo (o backend edita a mesma mensagem)
const SESSAO_ID = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// --- Armazenamento seguro (se o localStorage falhar, usa a memoria) ---
const _memoria = {};

function lsGet(chave) {
    try {
        const v = localStorage.getItem(chave);
        if (v !== null) return v;
    } catch (e) {}
    return (chave in _memoria) ? _memoria[chave] : null;
}

function lsSet(chave, valor) {
    _memoria[chave] = String(valor);
    try { localStorage.setItem(chave, String(valor)); } catch (e) {}
}

function lerColecao() {
    try {
        const c = JSON.parse(lsGet(CHAVE_COLECAO) || '[]');
        return Array.isArray(c) ? c : [];
    } catch (e) { return []; }
}

function contarCartuchos() { return lerColecao().length; }

// --- Jogados recentemente: o mais recente fica na frente (max. 8) ---
function registrarRecente(key) {
    try {
        let lista = JSON.parse(lsGet(CHAVE_RECENTES) || '[]');
        if (!Array.isArray(lista)) lista = [];
        lista = lista.filter(function (k) { return k !== key; });
        lista.unshift(key);
        lsSet(CHAVE_RECENTES, JSON.stringify(lista.slice(0, 8)));
    } catch (e) {}
}

// --- Visita: conta UMA vez por sessao do navegador ---
let VISITAS_ATUAIS = 0;
(function contarVisita() {
    let v = parseInt(lsGet(CHAVE_VISITAS) || "0", 10) || 0;
    let jaContou = false;
    try { jaContou = sessionStorage.getItem('retronfc_visita_contada') === '1'; } catch (e) {}
    if (!jaContou) {
        v++;
        lsSet(CHAVE_VISITAS, v);
        try { sessionStorage.setItem('retronfc_visita_contada', '1'); } catch (e) {}
    }
    VISITAS_ATUAIS = v;
})();

function classificarVisita() {
    return VISITAS_ATUAIS <= 1 ? "Primeira visita" : "Recorrente";
}

// --- Catalogo (games.json) com cache que atualiza em segundo plano ---
let _jogosMemoria = null;

function lerCacheJogos() {
    try {
        const d = JSON.parse(lsGet(CHAVE_JOGOS) || 'null');
        return (d && Array.isArray(d.games)) ? d.games : null;
    } catch (e) { return null; }
}

function salvarCacheJogos(games) {
    lsSet(CHAVE_JOGOS, JSON.stringify({ games: games, ts: Date.now() }));
}

async function buscarJogosDaRede() {
    const ctrl  = ('AbortController' in window) ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 10000) : null;
    try {
        const r = await fetch("games.json?ts=" + Date.now(), ctrl ? { signal: ctrl.signal } : undefined);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const data = await r.json();
        if (!data || !Array.isArray(data.games)) throw new Error("games.json invalido");
        _jogosMemoria = data.games;
        salvarCacheJogos(data.games);
        return data.games;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

// Usa o cache se ele ja contem as chaves pedidas; senao busca na rede.
// estrito = true: se a rede falhar, lanca erro em vez de devolver cache incompleto.
async function obterJogos(chaves, estrito) {
    const cache = _jogosMemoria || lerCacheJogos();
    if (cache && (!chaves || chaves.every(c => cache.some(g => g.key === c)))) return cache;
    try {
        return await buscarJogosDaRede();
    } catch (e) {
        if (cache && !estrito) return cache;
        throw e;
    }
}

function atualizarCatalogoEmSegundoPlano() {
    buscarJogosDaRede().catch(() => {});
}

// --- Envio de eventos com confirmacao, fila e reenvio ---
function novoEventoId() {
    return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function lerPendentes() {
    try {
        const l = JSON.parse(lsGet(CHAVE_PENDENTES) || '[]');
        return Array.isArray(l) ? l : [];
    } catch (e) { return []; }
}

function salvarPendentes(lista) {
    lsSet(CHAVE_PENDENTES, JSON.stringify(lista.slice(-10)));
}

function removerPendente(id) {
    salvarPendentes(lerPendentes().filter(i => !(i && i.obj && i.obj.eventoId === id)));
}

function registrarFalha(id) {
    const fila = lerPendentes()
        .map(i => (i && i.obj && i.obj.eventoId === id)
            ? { obj: i.obj, tentativas: (i.tentativas || 0) + 1 }
            : i)
        .filter(i => i && i.obj && (i.tentativas || 0) < 3);
    salvarPendentes(fila);
}

async function postarConfirmado(obj, keepalive) {
    const ctrl  = ('AbortController' in window) ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
    try {
        const r = await fetch(URL_BACKEND, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(obj),
            keepalive: !!keepalive,
            signal: ctrl ? ctrl.signal : undefined
        });
        const j = await r.json();
        if (j && j.ok) {
            if (j.planilha === false || j.telegram === false) {
                console.warn("Backend recebeu, mas um destino falhou:", j);
            }
            return true;
        }
        return false;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function tentarEnviar(obj, keepalive) {
    for (let i = 0; i < 2; i++) {
        try {
            if (await postarConfirmado(obj, keepalive)) return true;
        } catch (e) {}
        if (i === 0) await new Promise(r => setTimeout(r, 1500));
    }
    return false;
}

// Guarda na fila ANTES de enviar; so remove quando o backend confirma.
async function enviarComConfirmacao(obj, opcoes) {
    try {
        opcoes = opcoes || {};
        obj.eventoId = obj.eventoId || novoEventoId();
        const fila = lerPendentes();
        fila.push({ obj: obj, tentativas: 0 });
        salvarPendentes(fila);

        const ok = await tentarEnviar(obj, opcoes.keepalive);
        if (ok) removerPendente(obj.eventoId);
        return ok;
    } catch (e) { return false; }
}

async function reenviarPendentes() {
    const fila = lerPendentes();
    for (const item of fila) {
        if (!item || !item.obj) continue;
        const ok = await tentarEnviar(item.obj, false);
        if (ok) removerPendente(item.obj.eventoId);
        else registrarFalha(item.obj.eventoId);
    }
}

// Envio rapido para saida da pagina (sem confirmacao possivel)
function enviarLeve(obj) {
    try {
        const corpo = JSON.stringify(obj);
        try {
            if (navigator.sendBeacon && navigator.sendBeacon(URL_BACKEND, corpo)) return;
        } catch (e) {}
        fetch(URL_BACKEND, {
            method: 'POST', mode: 'no-cors', keepalive: true,
            headers: { 'Content-Type': 'text/plain' }, body: corpo
        }).catch(() => {});
    } catch (e) {}
}

// --- Rastreamento do clique na estante ---
let _estanteEmCurso = false;

function marcarCarregandoEstante() {
    ['btnEstante', 'btnEstanteErro'].forEach(function (id) {
        const b = document.getElementById(id);
        if (!b) return;
        if (!b.dataset.textoOriginal) b.dataset.textoOriginal = b.innerText;
        b.classList.add('carregando');
        b.setAttribute('aria-busy', 'true');
        b.innerText = 'CARREGANDO';
    });
}

// Ao voltar da estante, devolve os botoes ao estado normal
// e libera a trava para que a estante possa ser aberta de novo.
function restaurarBotoesEstante() {
    ['btnEstante', 'btnEstanteErro'].forEach(function (id) {
        const b = document.getElementById(id);
        if (!b) return;
        b.classList.remove('carregando');
        b.removeAttribute('aria-busy');
        if (b.dataset.textoOriginal) b.innerText = b.dataset.textoOriginal;
    });
    _estanteEmCurso = false;
}
window.addEventListener('pageshow', restaurarBotoesEstante);

function rastrearCliqueColecao(origem, evento) {
    // So dispara com clique real no botao da estante.
    // Chamada programatica, disparo no load ou repeticao sao ignorados.
    if (!evento || evento.isTrusted !== true) return;
    if (_estanteEmCurso) return;
    _estanteEmCurso = true;

    try { marcarCarregandoEstante(); } catch (e) {}

    try {
        const colecaoSalva = lerColecao();
        let listaJogos = "Nenhum";

        try {
            const catalogo = _jogosMemoria || lerCacheJogos() || [];
            const nomes = colecaoSalva.map(function (k) {
                const g = catalogo.find(function (x) { return x.key === k; });
                return g ? g.title : k;
            });
            if (nomes.length) listaJogos = nomes.join(", ");
        } catch (e) {}

        enviarComConfirmacao({
            origemRequisicao: "SiteRetroNFC",
            tipo: "Estante",
            origem: origem,
            nome: obterNome(),
            jogador: obterJogador(),
            aparelho: obterAparelho(),
            cartuchos: colecaoSalva.length,
            visitante: classificarVisita(),
            versao: APP_VERSAO,
            quando: obterDataBonita(),
            jogos: listaJogos
        }, { keepalive: true });
    } catch (e) {}

    window.location.href = 'colecao.html?musica=1';
}

function ligarBotoesEstante() {
    [
        ['btnEstante', 'Tela Principal'],
        ['btnEstanteErro', 'Tela de Bloqueio - Link Compartilhado']
    ].forEach(function (par) {
        const b = document.getElementById(par[0]);
        if (!b) return;
        b.removeAttribute('onclick');
        b.addEventListener('click', function (ev) {
            rastrearCliqueColecao(par[1], ev);
        });
    });
}

// --- Verificacao de dominio ---
const DOMINIOS_PERMITIDOS = [
    "retronfc.github.io",
    "retro-nfc.pages.dev"
];
const hostAtual        = window.location.hostname;
const ehLocalhost      = hostAtual === "localhost" || hostAtual === "127.0.0.1";
const ehDominioOficial = DOMINIOS_PERMITIDOS.some(d => hostAtual === d || hostAtual.endsWith("." + d));
const ehArquivoLocal   = window.location.protocol === "file:";

if (!ehLocalhost && !ehDominioOficial && !ehArquivoLocal) {
    document.body.innerHTML = "<div style='background:#111; color:#ff4444; height:100vh; display:flex; justify-content:center; align-items:center;'><h1>Acesso Nao Autorizado</h1></div>";
    throw new Error("Execucao bloqueada por seguranca.");
}

// --- Estado global ---
// A chave real e guardada aqui: o play.html troca o ?k= da URL por um texto falso.
const PARAMS   = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
let IS_VALID     = false;
const clickSound = new Audio('assets/life.mp3');

let tempoInicio  = 0;
let ocultoDesde  = 0;   // momento em que a pagina saiu de foco (0 = em foco)
let ocultoTotal  = 0;   // tempo total fora de foco (nao conta como jogado)
let dadosSessao  = { local: "—", ip: "—", rede: "—", inicio: "" };

// --- Utilitarios ---
function obterIdCurto() {
    let id = lsGet(CHAVE_ID);
    if (!id) {
        id = Math.random().toString(36).substring(2, 6).toUpperCase();
        lsSet(CHAVE_ID, id);
    }
    return id;
}

function obterJogador() {
    return `${obterIdCurto()} (Acesso #${VISITAS_ATUAIS})`;
}

function obterAparelho() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua))      return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS (Apple)";
    if (/windows/i.test(ua))      return "Windows PC";
    if (/macintosh/i.test(ua))    return "Mac OS";
    return "Outro";
}

function formatarTempoDeJogo(ms) {
    let s = Math.max(0, Math.floor(ms / 1000));
    let h = Math.floor(s / 3600);
    let m = Math.floor((s % 3600) / 60);
    s = s % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function obterDataBonita() { return new Date().toLocaleString('pt-BR'); }

// --- Nome do jogador (pedido apenas uma vez por aparelho) ---
function obterNome() {
    return (lsGet(CHAVE_NOME) || '').trim();
}

function salvarNome(nome) {
    lsSet(CHAVE_NOME, nome);
}

function limparNome(txt) {
    let s = String(txt || '');
    try {
        s = s.replace(/[^\p{L}\p{N} ._-]/gu, '');
    } catch (e) {
        s = s.replace(/[^A-Za-z\u00c0-\u00ff0-9 ._-]/g, '');
    }
    return s.replace(/\s+/g, ' ').trim().substring(0, 20);
}

// Modal criado por JS: nao exige alteracao em play.html nem em style.css
function pedirNome() {
    return new Promise(function (resolve) {
        const jaTem = obterNome();
        if (jaTem) { resolve(jaTem); return; }

        const overlay = document.createElement('div');
        overlay.id = 'nomeOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(7,4,15,.92);display:flex;align-items:center;justify-content:center;padding:24px;font-family:"Pixelify Sans",monospace;';

        const caixa = document.createElement('div');
        caixa.style.cssText = 'border:2px solid transparent;border-radius:14px;padding:28px 22px;max-width:340px;width:100%;text-align:center;background:linear-gradient(160deg,#1a1230,#0F0A1C) padding-box,linear-gradient(90deg,#00CFFF,#A020F0,#FF8C00,#FFD700) border-box;box-shadow:0 0 34px rgba(160,32,240,.45);';

        const titulo = document.createElement('div');
        titulo.textContent = 'RETRÔ NFC';
        titulo.style.cssText = 'font-size:18px;letter-spacing:2px;margin-bottom:16px;background:linear-gradient(90deg,#00CFFF,#A020F0,#FF8C00,#FFD700);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;';

        const texto = document.createElement('p');
        texto.textContent = 'Insira seu nome ou apelido para ter acesso à sua coleção';
        texto.style.cssText = 'color:#ece8f7;font-size:12px;line-height:1.9;margin:0 0 18px;';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 20;
        input.autocomplete = 'nickname';
        input.placeholder = 'SEU NOME';
        input.style.cssText = 'width:100%;box-sizing:border-box;background:#0B0714;border:1px solid #2a2142;border-radius:8px;color:#fff;font-family:inherit;font-size:12px;padding:13px;text-align:center;outline:none;transition:border-color .2s,box-shadow .2s;';

        input.addEventListener('focus', function () {
            input.style.borderColor = '#00CFFF';
            input.style.boxShadow = '0 0 0 3px rgba(0,207,255,.18)';
        });
        input.addEventListener('blur', function () {
            input.style.borderColor = '#2a2142';
            input.style.boxShadow = 'none';
        });

        const erro = document.createElement('div');
        erro.style.cssText = 'color:#FFD700;font-size:10px;line-height:1.6;min-height:14px;margin-top:10px;';

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = 'COMEÇAR';
        botao.style.cssText = 'width:100%;margin-top:12px;background:linear-gradient(135deg,#00CFFF,#A020F0);color:#fff;border:none;border-radius:50px;font-family:inherit;font-size:12px;padding:15px;cursor:pointer;box-shadow:0 0 18px rgba(160,32,240,.5);transition:transform .15s,filter .15s;';

        botao.addEventListener('pointerdown', function () { botao.style.transform = 'scale(.97)'; });
        botao.addEventListener('pointerup', function () { botao.style.transform = 'scale(1)'; });

        caixa.appendChild(titulo);
        caixa.appendChild(texto);
        caixa.appendChild(input);
        caixa.appendChild(erro);
        caixa.appendChild(botao);
        overlay.appendChild(caixa);
        document.body.appendChild(overlay);

        setTimeout(function () { input.focus(); }, 100);

        function confirmar() {
            const nome = limparNome(input.value);
            if (nome.length < 2) {
                erro.textContent = 'Digite pelo menos 2 caracteres.';
                input.focus();
                return;
            }
            salvarNome(nome);
            overlay.remove();
            resolve(nome);
        }

        botao.addEventListener('click', confirmar);
        input.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter') { ev.preventDefault(); confirmar(); }
        });
    });
}

// --- Netplay: ID numerico estavel por jogo ---
// EJS_gameID precisa ser numero e unico por jogo no servidor inteiro.
// Derivamos do UUID do games.json (FNV-1a 32 bits), entao o mesmo jogo
// sempre gera o mesmo ID, em qualquer aparelho, sem precisar editar o JSON.
function idNumericoDoJogo(key) {
    let h = 2166136261;
    const s = String(key || '');
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 2000000000) + 1;
}

// --- Netplay: escolha do modo de jogo (solo ou coop online) ---
// Criado por JS: nao exige alteracao em play.html nem em style.css.
function escolherModoDeJogo() {
    return new Promise(function (resolve) {

        const overlay = document.createElement('div');
        overlay.id = 'modoOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(7,4,15,.94);display:flex;align-items:center;justify-content:center;padding:24px;font-family:"Pixelify Sans",monospace;';

        const caixa = document.createElement('div');
        caixa.style.cssText = 'border:2px solid transparent;border-radius:14px;padding:26px 20px;max-width:360px;width:100%;text-align:center;background:linear-gradient(160deg,#1a1230,#0F0A1C) padding-box,linear-gradient(90deg,#00CFFF,#A020F0,#FF8C00,#FFD700) border-box;box-shadow:0 0 34px rgba(160,32,240,.45);';

        const titulo = document.createElement('div');
        titulo.textContent = 'MODO DE JOGO';
        titulo.style.cssText = 'font-size:16px;letter-spacing:2px;margin-bottom:18px;background:linear-gradient(90deg,#00CFFF,#A020F0,#FF8C00,#FFD700);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;';

        // ---------- Tela 1: escolha ----------
        const tela1 = document.createElement('div');

        const sub1 = document.createElement('p');
        sub1.textContent = 'Como você quer jogar agora?';
        sub1.style.cssText = 'color:#ece8f7;font-size:11px;line-height:2;margin:0 0 16px;';

        const bSolo = document.createElement('button');
        bSolo.type = 'button';
        bSolo.textContent = 'JOGAR SOZINHO';
        bSolo.style.cssText = 'width:100%;background:linear-gradient(135deg,#00CFFF,#A020F0);color:#fff;border:none;border-radius:50px;font-family:inherit;font-size:12px;padding:15px;cursor:pointer;box-shadow:0 0 18px rgba(160,32,240,.5);';

        const bCoop = document.createElement('button');
        bCoop.type = 'button';
        bCoop.textContent = NETPLAY_ATIVO ? 'COOP ONLINE' : 'COOP INDISPONÍVEL';
        bCoop.disabled = !NETPLAY_ATIVO;
        bCoop.style.cssText = 'width:100%;margin-top:10px;background:transparent;color:' + (NETPLAY_ATIVO ? '#00CFFF' : '#4a4560') + ';border:1px solid ' + (NETPLAY_ATIVO ? '#00CFFF' : '#2a2142') + ';border-radius:50px;font-family:inherit;font-size:12px;padding:14px;cursor:' + (NETPLAY_ATIVO ? 'pointer' : 'not-allowed') + ';';

        tela1.appendChild(sub1);
        tela1.appendChild(bSolo);
        tela1.appendChild(bCoop);

        // ---------- Tela 2: instrucoes do coop ----------
        const tela2 = document.createElement('div');
        tela2.style.display = 'none';

        const sub2 = document.createElement('p');
        sub2.textContent = 'Os dois aparelhos precisam ter escaneado a TAG deste cartucho. Um cria a sala e o outro entra com o código.';
        sub2.style.cssText = 'color:#ece8f7;font-size:11px;line-height:2;margin:0 0 14px;text-align:left;';

        const passos = document.createElement('div');
        passos.style.cssText = 'text-align:left;color:#8b9bb0;font-size:10px;line-height:2.1;margin:0 0 18px;';

        ['1. Toque em INICIAR COOP nos dois aparelhos.',
         '2. Abra o menu do emulador e escolha NETPLAY.',
         '3. Um cria a sala, o outro entra com o código.',
         '4. Os dois jogam o mesmo jogo, em tempo real.'
        ].forEach(function (t) {
            const l = document.createElement('div');
            l.textContent = t;
            passos.appendChild(l);
        });

        const bIniciar = document.createElement('button');
        bIniciar.type = 'button';
        bIniciar.textContent = 'INICIAR COOP';
        bIniciar.style.cssText = 'width:100%;background:linear-gradient(135deg,#00CFFF,#A020F0);color:#fff;border:none;border-radius:50px;font-family:inherit;font-size:12px;padding:15px;cursor:pointer;box-shadow:0 0 18px rgba(160,32,240,.5);';

        const bVoltar = document.createElement('button');
        bVoltar.type = 'button';
        bVoltar.textContent = 'VOLTAR';
        bVoltar.style.cssText = 'width:100%;margin-top:10px;background:transparent;color:#8b9bb0;border:1px solid #2b3a4d;border-radius:50px;font-family:inherit;font-size:11px;padding:13px;cursor:pointer;';

        tela2.appendChild(sub2);
        tela2.appendChild(passos);
        tela2.appendChild(bIniciar);
        tela2.appendChild(bVoltar);

        caixa.appendChild(titulo);
        caixa.appendChild(tela1);
        overlay.appendChild(caixa);
        document.body.appendChild(overlay);

        function fechar(modo) {
            overlay.remove();
            resolve(modo);
        }

        bSolo.addEventListener('click', function () { fechar('solo'); });
        bCoop.addEventListener('click', function () { fechar('coop'); });
        bVoltar.addEventListener('click', function () {
            tela2.style.display = 'none';
            tela1.style.display = 'block';
        });
        bIniciar.addEventListener('click', function () { fechar('coop'); });

    });
}

// --- Netplay: sala criada. Aguarda o convidado entrar (link vale 120s) ---
function mostrarSalaCriada(dados, gerarNovo) {
    return new Promise(function (resolve) {
        const VALIDADE = 120;
        let restante = VALIDADE;
        let timer = null;
        let entrou = false;

        const overlay = document.createElement('div');
        overlay.id = 'salaOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9996;background:rgba(7,4,15,.96);display:flex;align-items:center;justify-content:center;padding:24px;font-family:"Pixelify Sans",monospace;';

        const caixa = document.createElement('div');
        caixa.style.cssText = 'border:2px solid transparent;border-radius:14px;padding:26px 20px;max-width:360px;width:100%;text-align:center;background:linear-gradient(160deg,#1a1230,#0F0A1C) padding-box,linear-gradient(90deg,#00CFFF,#A020F0,#FF8C00,#FFD700) border-box;box-shadow:0 0 34px rgba(160,32,240,.45);';

        const titulo = document.createElement('div');
        titulo.textContent = 'CONVIDE O AMIGO';
        titulo.style.cssText = 'font-size:16px;letter-spacing:2px;margin-bottom:16px;background:linear-gradient(90deg,#00CFFF,#A020F0,#FF8C00,#FFD700);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;';

        const sub = document.createElement('p');
        sub.textContent = 'Envie o link e fique nesta tela até o amigo entrar. A partida começa sozinha.';
        sub.style.cssText = 'color:#ece8f7;font-size:11px;line-height:2;margin:0 0 16px;text-align:left;';

        const estado = document.createElement('div');
        estado.style.cssText = 'color:#FFD700;font-size:12px;line-height:2;margin-bottom:16px;';

        const bCopiar = document.createElement('button');
        bCopiar.type = 'button';
        bCopiar.textContent = 'COPIAR LINK';
        bCopiar.style.cssText = 'width:100%;background:transparent;color:#00CFFF;border:1px solid #00CFFF;border-radius:50px;font-family:inherit;font-size:12px;padding:14px;cursor:pointer;';

        const bNovo = document.createElement('button');
        bNovo.type = 'button';
        bNovo.textContent = 'GERAR NOVO LINK';
        bNovo.style.cssText = 'display:none;width:100%;margin-top:10px;background:linear-gradient(135deg,#00CFFF,#A020F0);color:#fff;border:none;border-radius:50px;font-family:inherit;font-size:12px;padding:15px;cursor:pointer;';

        const bSolo = document.createElement('button');
        bSolo.type = 'button';
        bSolo.textContent = 'JOGAR SOZINHO';
        bSolo.style.cssText = 'width:100%;margin-top:10px;background:transparent;color:#8b9bb0;border:none;font-family:inherit;font-size:11px;padding:10px;cursor:pointer;';

        caixa.appendChild(titulo);
        caixa.appendChild(sub);
        caixa.appendChild(estado);
        caixa.appendChild(bCopiar);
        caixa.appendChild(bNovo);
        caixa.appendChild(bSolo);
        overlay.appendChild(caixa);
        document.body.appendChild(overlay);

        function minuto(s) {
            const m = Math.floor(s / 60);
            const r = s % 60;
            return m + ':' + (r < 10 ? '0' : '') + r;
        }

        function atualizar() {
            if (entrou) return;
            if (restante > 0) {
                estado.style.color = '#FFD700';
                estado.textContent = 'AGUARDANDO O AMIGO... LINK VALE ' + minuto(restante);
                bCopiar.style.display = '';
                bNovo.style.display = 'none';
            } else {
                clearInterval(timer);
                estado.style.color = '#FF8C00';
                estado.textContent = 'O LINK EXPIROU.';
                bCopiar.style.display = 'none';
                bNovo.style.display = '';
            }
        }

        function iniciarContagem() {
            restante = VALIDADE;
            clearInterval(timer);
            atualizar();
            timer = setInterval(function () { restante--; atualizar(); }, 1000);
        }

        function limpar() {
            clearInterval(timer);
            window.removeEventListener('netplay-convidado', aoEntrar);
            overlay.remove();
        }

        function aoEntrar() {
            entrou = true;
            clearInterval(timer);
            estado.style.color = '#00CFFF';
            estado.textContent = 'AMIGO CONECTADO! BORA!';
            bCopiar.style.display = 'none';
            bNovo.style.display = 'none';
            bSolo.style.display = 'none';
            setTimeout(function () { limpar(); resolve(true); }, 1200);
        }

        window.addEventListener('netplay-convidado', aoEntrar);

        bCopiar.addEventListener('click', function () {
            const texto = dados.link;
            function feito() { bCopiar.textContent = 'LINK COPIADO'; }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(texto).then(feito).catch(function () {
                    window.prompt('Copie o link:', texto);
                });
            } else {
                window.prompt('Copie o link:', texto);
            }
        });

        bNovo.addEventListener('click', function () {
            bNovo.disabled = true;
            bNovo.textContent = 'GERANDO...';
            try { window.Netplay.fechar(); } catch (e) {}
            gerarNovo().then(function (nd) {
                dados = nd;
                bNovo.disabled = false;
                bNovo.textContent = 'GERAR NOVO LINK';
                bCopiar.textContent = 'COPIAR LINK';
                iniciarContagem();
            }).catch(function () {
                bNovo.disabled = false;
                bNovo.textContent = 'TENTAR DE NOVO';
            });
        });

        bSolo.addEventListener('click', function () {
            limpar();
            resolve(true);
        });

        iniciarContagem();
    });
}

// --- Netplay: aviso quando o coop nao consegue abrir a sala ---
function avisarCoopFalhou(erro) {
    return new Promise(function (resolve) {
        const overlay = document.createElement('div');
        overlay.id = 'coopErroOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(7,4,15,.96);display:flex;align-items:center;justify-content:center;padding:24px;font-family:"Pixelify Sans",monospace;';

        const caixa = document.createElement('div');
        caixa.style.cssText = 'border:2px solid #FF8C00;border-radius:14px;padding:26px 20px;max-width:340px;width:100%;text-align:center;background:#0F0A1C;';

        const titulo = document.createElement('div');
        titulo.textContent = 'COOP INDISPONÍVEL';
        titulo.style.cssText = 'font-size:14px;letter-spacing:2px;margin-bottom:16px;color:#FF8C00;';

        const sub = document.createElement('p');
        sub.textContent = 'Não foi possível abrir a sala agora.';
        sub.style.cssText = 'color:#ece8f7;font-size:11px;line-height:2;margin:0 0 12px;';

        const detalhe = document.createElement('p');
        detalhe.textContent = (erro && erro.message) ? erro.message : 'ERRO DESCONHECIDO';
        detalhe.style.cssText = 'color:#8b9bb0;font-size:10px;line-height:2;margin:0 0 18px;word-break:break-word;';

        const bOk = document.createElement('button');
        bOk.type = 'button';
        bOk.textContent = 'JOGAR SOZINHO';
        bOk.style.cssText = 'width:100%;background:linear-gradient(135deg,#00CFFF,#A020F0);color:#fff;border:none;border-radius:50px;font-family:inherit;font-size:12px;padding:14px;cursor:pointer;';

        caixa.appendChild(titulo);
        caixa.appendChild(sub);
        caixa.appendChild(detalhe);
        caixa.appendChild(bOk);
        overlay.appendChild(caixa);
        document.body.appendChild(overlay);

        bOk.addEventListener('click', function () {
            overlay.remove();
            resolve(true);
        });
    });
}

// --- Erro recuperavel (nunca deixa a tela preta) ---
function recarregarComChave() {
    const base = window.location.pathname;
    const url  = GAME_KEY ? base + "?k=" + encodeURIComponent(GAME_KEY) : base;
    window.location.replace(url);
}

function esconderTelasDeCarga() {
    ['splashScreen', 'gameScreen', 'bootScreen'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function mostrarErroRecuperavel(titulo, mensagem, opcoes) {
    opcoes = opcoes || {};
    const antigo = document.getElementById('erroOverlay');
    if (antigo) antigo.remove();

    if (!opcoes.manterTelas) esconderTelasDeCarga();

    const overlay = document.createElement('div');
    overlay.id = 'erroOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(7,4,15,.96);display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto;font-family:"Pixelify Sans",monospace;';

    const caixa = document.createElement('div');
    caixa.style.cssText = 'background:linear-gradient(160deg,#1a1230,#0F0A1C);border:2px solid #00CFFF;border-radius:14px;padding:26px 20px;max-width:340px;width:100%;text-align:center;';

    const t = document.createElement('div');
    t.textContent = titulo;
    t.style.cssText = 'color:#00CFFF;font-size:14px;line-height:1.8;margin-bottom:14px;';

    const m = document.createElement('p');
    m.textContent = mensagem;
    m.style.cssText = 'color:#ece8f7;font-size:11px;line-height:2;margin:0 0 18px;';

    const b1 = document.createElement('button');
    b1.type = 'button';
    b1.textContent = 'TENTAR NOVAMENTE';
    b1.style.cssText = 'width:100%;background:linear-gradient(90deg,#A020F0,#00CFFF);color:#fff;border:none;border-radius:8px;font-family:inherit;font-size:12px;padding:15px;cursor:pointer;';
    b1.addEventListener('click', recarregarComChave);

    caixa.appendChild(t);
    caixa.appendChild(m);
    caixa.appendChild(b1);

    if (opcoes.secundario) {
        const b2 = document.createElement('button');
        b2.type = 'button';
        b2.textContent = opcoes.secundario.texto;
        b2.style.cssText = 'width:100%;margin-top:10px;background:transparent;color:#8b9bb0;border:1px solid #2b3a4d;border-radius:8px;font-family:inherit;font-size:11px;padding:13px;cursor:pointer;';
        b2.addEventListener('click', function () {
            overlay.remove();
            try { opcoes.secundario.acao(); } catch (e) {}
        });
        caixa.appendChild(b2);
    }

    overlay.appendChild(caixa);
    document.body.appendChild(overlay);
}

// --- Sessao de jogo (Apps Script -> Telegram) ---
function corpoSessao(acao, extra) {
    return Object.assign({
        origemRequisicao: "SiteRetroNFC",
        tipo: "TelegramSessao",
        acao: acao,
        sessaoId: SESSAO_ID,
        versao: APP_VERSAO,
        jogo: CURRENT_GAME ? CURRENT_GAME.title : "Desconhecido",
        nome: obterNome(),
        jogador: obterJogador(),
        aparelho: obterAparelho(),
        cartuchos: contarCartuchos(),
        visitante: classificarVisita(),
        local: dadosSessao.local,
        ip: dadosSessao.ip,
        rede: dadosSessao.rede,
        inicio: dadosSessao.inicio
    }, extra || {});
}

function registrarLogAcessoImediato() {
    if (!CURRENT_GAME) return;
    tempoInicio = Date.now();
    ocultoDesde = 0;
    ocultoTotal = 0;
    dadosSessao.inicio = obterDataBonita();

    const ctrl  = ('AbortController' in window) ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 3000) : null;

    fetch("https://ipwho.is/", ctrl ? { signal: ctrl.signal } : undefined)
        .then(res => res.json())
        .then(data => {
            dadosSessao.ip    = data.success ? data.ip : "Desconhecido";
            dadosSessao.rede  = (data.success && data.connection && data.connection.isp) ? data.connection.isp : "Desconhecido";
            dadosSessao.local = (data.success && data.city) ? `${data.city}, ${data.region}` : "Região Desconhecida";
        })
        .catch(() => {
            dadosSessao.ip = "Desconhecido";
            dadosSessao.rede = "Desconhecido";
            dadosSessao.local = "Região Desconhecida";
        })
        .then(() => {
            if (timer) clearTimeout(timer);
            enviarComConfirmacao(corpoSessao("inicio", { quando: obterDataBonita() }));
        });
}

// Saiu da tela / trocou de app: registra o tempo ate aqui (estimado)
function sinalizarSaida() {
    if (!CURRENT_GAME || tempoInicio === 0 || ocultoDesde) return;
    const agoraMs = Date.now();
    const tempo = formatarTempoDeJogo(agoraMs - tempoInicio - ocultoTotal);
    ocultoDesde = agoraMs;
    enviarLeve(corpoSessao("fim", { tempo: tempo }));
}

// Voltou ao jogo: a mesma mensagem volta para "Jogando..."
function sinalizarRetorno() {
    if (!ocultoDesde) return;
    ocultoTotal += Date.now() - ocultoDesde;
    ocultoDesde = 0;
    enviarLeve(corpoSessao("retomada"));
}

document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sinalizarSaida();
    else sinalizarRetorno();
});
window.addEventListener('pagehide', sinalizarSaida);
window.addEventListener('pageshow', function (ev) { if (ev.persisted) sinalizarRetorno(); });

// --- Carregamento do jogo (retorna true se esta pronto para o boot) ---
async function loadGames() {
    try {
        if (!GAME_KEY) { mostrarTelaErro(); return false; }

        let jogos;
        try {
            jogos = await obterJogos([GAME_KEY], true);
        } catch (e) {
            mostrarErroRecuperavel(
                'SEM CONEXÃO',
                'Não conseguimos carregar os dados do jogo. Verifique sua internet e tente novamente.'
            );
            return false;
        }

        CURRENT_GAME = jogos.find(game => game.key === GAME_KEY);
        if (!CURRENT_GAME) { mostrarTelaErro(); return false; }
        IS_VALID = true;

        try {
            const colecao = lerColecao();
            if (!colecao.includes(CURRENT_GAME.key)) {
                colecao.push(CURRENT_GAME.key);
                lsSet(CHAVE_COLECAO, JSON.stringify(colecao));
            }
        } catch (e) {}

        const preencher = (id, valor, prop) => {
            const el = document.getElementById(id);
            if (el) el[prop || 'innerText'] = valor;
        };
        preencher("gameCover", CURRENT_GAME.cover, 'src');
        preencher("title", CURRENT_GAME.title);
        preencher("subtitle", CURRENT_GAME.subtitle);
        preencher("year", CURRENT_GAME.year);
        preencher("players", CURRENT_GAME.players);
        preencher("developer", CURRENT_GAME.developer);

        const btn = document.getElementById("btnJogar");
        if (btn) {
            btn.onclick = async () => {
                if (btn.dataset.ocupado === '1') return;
                btn.dataset.ocupado = '1';

                try {
                    if (navigator.vibrate) navigator.vibrate(100);
                    clickSound.play().catch(() => {});
                } catch (e) {}

                try {
                    const nome = await pedirNome();
                    if (!nome) { btn.dataset.ocupado = ''; return; }

                    // Solo ou coop online (a TAG ja foi validada em loadGames)
                    let modo = await escolherModoDeJogo();

                    // Coop: cria a sala direto — o Cloudflare nao tem cold start
                    if (modo === 'coop' && NETPLAY_ATIVO) {
                        try {
                            if (!window.Netplay || typeof window.Netplay.abrirSala !== 'function') {
                                throw new Error('host.js nao carregou');
                            }
                            const sala = await window.Netplay.abrirSala(CURRENT_GAME.title, obterNome());
                            await mostrarSalaCriada(sala, function () {
                                return window.Netplay.abrirSala(CURRENT_GAME.title, obterNome());
                            });
                        } catch (e) {
                            await avisarCoopFalhou(e);
                            modo = 'solo';
                        }
                    }

                    // Alimenta a secao "Jogados recentemente" da estante
                    registrarRecente(CURRENT_GAME.key);
                    try { Conquistas.registrarJogo(CURRENT_GAME.key); } catch (e) {}
                    try { registrarLogAcessoImediato(); } catch (e) {}

                    const gameScreen = document.getElementById("gameScreen");
                    gameScreen.classList.add("crt-shutdown");
                    setTimeout(() => {
                        try { iniciarEmulador(modo); } catch (e) { falhaEmulador(e); }
                    }, 1150);
                } catch (e) {
                    btn.dataset.ocupado = '';
                    falhaEmulador(e);
                }
            };
        }

        atualizarCatalogoEmSegundoPlano();
        return true;

    } catch (error) {
        console.error("Erro ao carregar o jogo:", error);
        mostrarErroRecuperavel(
            'ALGO DEU ERRADO',
            'Não foi possível abrir este jogo agora. Tente novamente.'
        );
        return false;
    }
}

function falhaEmulador(motivo) {
    console.error("Falha ao iniciar o emulador:", motivo);
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch (e) {}
    mostrarErroRecuperavel(
        'NÃO FOI POSSÍVEL INICIAR',
        'O emulador não carregou. Verifique sua internet e tente novamente.'
    );
}

function iniciarEmulador(modo) {
    if (!CURRENT_GAME) throw new Error("Jogo nao carregado");

    document.getElementById("gameScreen").style.display = "none";
    const emulatorScreen = document.getElementById("emulatorScreen");
    emulatorScreen.style.display = "block";
    emulatorScreen.classList.add("crt-turnon");
    setTimeout(function () { emulatorScreen.classList.remove("crt-turnon"); }, 1200);
    try { Conquistas.iniciarMaratona(); } catch (e) {}

    document.body.style.padding = "0";
    document.body.style.backgroundColor = "#000000";

    const docElement = document.documentElement;
    const requestFS = docElement.requestFullscreen
                   || docElement.webkitRequestFullscreen
                   || docElement.msRequestFullscreen;

    if (requestFS) {
        try {
            const p = requestFS.call(docElement);
            if (p && p.then) {
                p.then(() => {
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch(() => {});
                    }
                }).catch(() => {});
            }
        } catch (e) {}
    }

    let jogoIniciou = false;

    // Netplay: habilita o recurso e o botao somente no modo coop
    const coopAtivo = modo === 'coop' && NETPLAY_ATIVO;

    window.EJS_DEBUG_XX = coopAtivo;
    window.EJS_EXPERIMENTAL_NETPLAY = coopAtivo;
    window.EJS_Buttons = { netplay: coopAtivo };

    window.EJS_player = '#game';
    window.EJS_core          = CURRENT_GAME.core;
    window.EJS_gameUrl       = CURRENT_GAME.romUrl;
    window.EJS_startOnLoaded = true;
    window.EJS_pathtodata    = 'https://cdn.emulatorjs.org/stable/data/';

    // ID numerico estavel: separa saves por jogo e e exigido pelo netplay
    window.EJS_onGameStart   = function () {
        jogoIniciou = true;
        if (coopAtivo && window.Netplay) window.Netplay.renegociar();
    };

    // Configura o servidor apenas no modo coop
    window.EJS_netplayServer = coopAtivo ? NETPLAY_SERVIDOR : '';

    const script = document.createElement('script');
    script.src     = 'https://cdn.emulatorjs.org/stable/data/loader.js';
    script.onerror = function () { falhaEmulador("loader.js nao carregou"); };
    document.body.appendChild(script);

    // Aviso se o jogo demorar demais para iniciar
    setTimeout(function () {
        const rodando = jogoIniciou || (window.EJS_emulator && window.EJS_emulator.started);
        if (rodando) return;
        mostrarErroRecuperavel(
            'DEMORANDO MAIS QUE O NORMAL',
            'O jogo ainda não iniciou. Você pode continuar aguardando ou tentar novamente.',
            { manterTelas: true, secundario: { texto: 'CONTINUAR AGUARDANDO', acao: function () {} } }
        );
    }, 45000);
}

function mostrarTelaErro() {
    IS_VALID = false;
    esconderTelasDeCarga();
    const inv = document.getElementById("invalidScreen");
    if (inv) inv.style.display = "block";
}

// --- Inicializacao: o boot comeca quando os dados estao prontos ---
document.addEventListener("DOMContentLoaded", () => {
    ligarBotoesEstante();
    document.getElementById("gameScreen").style.display   = "none";
    document.getElementById("bootScreen").style.display   = "none";
    document.getElementById("splashScreen").style.display = "flex";

    const rapido = VISITAS_ATUAIS > 1;
    window.RETRONFC_RAPIDO = rapido;
    const esperaMinima = rapido ? 600 : 3000;

    Promise.all([
        loadGames(),
        new Promise(r => setTimeout(r, esperaMinima))
    ]).then(([pronto]) => {
        if (pronto && IS_VALID && typeof startBoot === "function") startBoot();
    }).catch(() => {});

    // Reenvia registros que nao foram confirmados antes
    setTimeout(() => { reenviarPendentes().catch(() => {}); }, 3000);
});
