// =====================================================
// RETRO NFC — host.js (v2)
// Anfitriao: captura o canvas do EmulatorJS e serve por WebRTC.
// O convidado nao roda emulador: recebe video/audio e devolve botoes.
// =====================================================
(function () {
    'use strict';

    const CFG       = window.RETRONFC_NETPLAY || {};
    const WS_BASE   = CFG.ws   || 'wss://retronfc-netplay.omitodofifa.workers.dev/ws';
    const LINK_BASE = CFG.link || 'https://retro-nfc.pages.dev/convite.html';

    let ws = null;
    let pc = null;
    let canal = null;
    let sala = null;
    let fila = [];
    let convidadoPresente = false;
    let destinoAudio = null;
    let streamAtual = null;
    let oferecendo = false;
    let limiteSala = null;

    function codigoSala() {
        const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const r = crypto.getRandomValues(new Uint8Array(6));
        let s = '';
        for (let i = 0; i < 6; i++) s += abc[r[i] % abc.length];
        return s;
    }

    function enviar(obj) {
        const s = JSON.stringify(obj);
        if (ws && ws.readyState === 1) ws.send(s);
        else fila.push(s);
    }

    function drenar() {
        while (fila.length && ws && ws.readyState === 1) ws.send(fila.shift());
    }

    // Avisa o app.js sem acoplar: ele escuta e decide o que mostrar
    function avisar(nome, detalhe) {
        try {
            window.dispatchEvent(new CustomEvent(nome, { detail: detalhe || null }));
        } catch (e) {}
    }

    // Captura o audio do emulador desviando o connect para um destino de midia.
    // Precisa ser instalado ANTES do loader.js rodar.
    function instalarCapturaDeAudio() {
        if (destinoAudio) return destinoAudio;
        if (!window.AudioNode || !window.AudioContext) return null;

        const original = AudioNode.prototype.connect;

        AudioNode.prototype.connect = function (destino) {
            const r = original.apply(this, arguments);
            try {
                if (destino && destino === this.context.destination) {
                    if (!destinoAudio) destinoAudio = this.context.createMediaStreamDestination();
                    original.call(this, destinoAudio);
                }
            } catch (e) {}
            return r;
        };

        return destinoAudio;
    }

    function streamDoEmulador() {
        const e = window.EJS_emulator;
        const canvas = e && (e.canvas || (e.Module && e.Module.canvas));
        if (!canvas || typeof canvas.captureStream !== 'function') return null;

        const stream = canvas.captureStream(60);

        try {
            const dest = instalarCapturaDeAudio();
            if (dest && dest.stream.getAudioTracks().length) {
                stream.addTrack(dest.stream.getAudioTracks()[0]);
            }
        } catch (e) {}

        return stream;
    }

    // Encerra apenas o video: a faixa de audio e reaproveitada na renegociacao
    function pararStream() {
        if (!streamAtual) return;
        try {
            streamAtual.getVideoTracks().forEach(function (t) { t.stop(); });
        } catch (e) {}
        streamAtual = null;
    }

    function aplicarEntrada(lista) {
        const e = window.EJS_emulator;
        const gm = e && e.gameManager;
        if (!gm || typeof gm.simulateInput !== 'function') return;

        for (let i = 0; i < lista.length; i++) {
            const par = lista[i];
            if (!par || par.length < 2) continue;
            const indice = par[0] | 0;
            const valor  = par[1] ? 1 : 0;
            try { gm.simulateInput(1, indice, valor); } catch (err) {}
        }
    }

    function montarPeer() {
        if (pc) return pc;

        pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.cloudflare.com:3478' },
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        pararStream();
        streamAtual = streamDoEmulador();
        if (streamAtual) {
            streamAtual.getTracks().forEach(function (t) { pc.addTrack(t, streamAtual); });
        }

        canal = pc.createDataChannel('entrada', { ordered: false, maxRetransmits: 0 });
        canal.onmessage = function (ev) {
            try {
                const d = JSON.parse(ev.data);
                if (d && d.b) aplicarEntrada(d.b);
            } catch (e) {}
        };

        pc.onicecandidate = function (ev) {
            if (ev.candidate) enviar({ t: 'sinal', dados: { candidate: ev.candidate } });
        };

        pc.onconnectionstatechange = function () {
            const estado = pc ? pc.connectionState : 'closed';
            if (estado === 'failed' || estado === 'disconnected' || estado === 'closed') {
                try { if (pc) pc.close(); } catch (e) {}
                pc = null;
                canal = null;
                pararStream();
                avisar('netplay-caiu', { estado: estado });
            }
        };

        return pc;
    }

    async function oferecer() {
        if (oferecendo) return;
        oferecendo = true;
        try {
            const peer = montarPeer();
            const oferta = await peer.createOffer();
            await peer.setLocalDescription(oferta);
            enviar({ t: 'sinal', dados: { offer: peer.localDescription } });
        } finally {
            oferecendo = false;
        }
    }

    async function receberSinal(dados) {
        if (!dados) return;

        if (dados.offer) {
            const peer = montarPeer();
            await peer.setRemoteDescription(dados.offer);
            const resposta = await peer.createAnswer();
            await peer.setLocalDescription(resposta);
            enviar({ t: 'sinal', dados: { answer: peer.localDescription } });
            return;
        }

        if (dados.answer && pc) {
            await pc.setRemoteDescription(dados.answer);
            return;
        }

        if (dados.candidate && pc) {
            try { await pc.addIceCandidate(dados.candidate); } catch (e) {}
        }
    }

    function abrirSala(jogo, apelido) {
        return new Promise(function (resolve, reject) {
            sala = codigoSala();
            ws = new WebSocket(WS_BASE + '?sala=' + sala);

            let resolvido = false;

            limiteSala = setTimeout(function () {
                if (resolvido) return;
                resolvido = true;
                reject(new Error('tempo esgotado ao abrir a sala'));
            }, 15000);

            function encerrarLimite() {
                if (limiteSala) { clearTimeout(limiteSala); limiteSala = null; }
            }

            ws.onopen = function () {
                enviar({ t: 'criar', sala: sala, jogo: jogo, apelido: apelido || 'Anfitriao' });
                drenar();
            };

            ws.onmessage = function (ev) {
                let d;
                try { d = JSON.parse(ev.data); } catch (e) { return; }

                if (d.t === 'criado') {
                    encerrarLimite();
                    if (resolvido) return;
                    resolvido = true;
                    resolve({ sala: d.sala, link: LINK_BASE + '?sala=' + d.sala });
                    return;
                }

                if (d.t === 'erro') {
                    encerrarLimite();
                    if (resolvido) { avisar('netplay-erro', { erro: d.erro }); return; }
                    resolvido = true;
                    reject(new Error(d.erro || 'erro ao abrir a sala'));
                    return;
                }

                if (d.t === 'convidado') {
                    convidadoPresente = true;
                    avisar('netplay-convidado');
                    const emu = window.EJS_emulator;
                    const jogoRodando = emu && (emu.canvas || (emu.Module && emu.Module.canvas));
                    if (jogoRodando) oferecer().catch(function () {});
                    return;
                }

                if (d.t === 'sinal') { receberSinal(d.dados).catch(function () {}); return; }

                if (d.t === 'saiu') {
                    convidadoPresente = false;
                    try { if (canal) canal.close(); } catch (e) {}
                    try { if (pc) pc.close(); } catch (e) {}
                    pc = null;
                    canal = null;
                    pararStream();
                    avisar('netplay-saiu');
                    return;
                }
            };

            ws.onerror = function () {
                encerrarLimite();
                if (resolvido) { avisar('netplay-erro', { erro: 'conexao' }); return; }
                resolvido = true;
                reject(new Error('falha de conexao com o servidor'));
            };

            ws.onclose = function () {
                encerrarLimite();
                if (!resolvido) {
                    resolvido = true;
                    reject(new Error('conexao encerrada'));
                    return;
                }
                avisar('netplay-saiu');
            };
        });
    }

    function renegociar() {
        if (!ws || !sala || !convidadoPresente) return;
        try { if (canal) canal.close(); } catch (e) {}
        try { if (pc) pc.close(); } catch (e) {}
        pc = null;
        canal = null;
        pararStream();
        oferecer().catch(function () {});
    }

    function fechar() {
        if (limiteSala) { clearTimeout(limiteSala); limiteSala = null; }
        try { if (canal) canal.close(); } catch (e) {}
        try { if (pc) pc.close(); } catch (e) {}
        try { if (ws) ws.close(); } catch (e) {}

        ws = null;
        pc = null;
        canal = null;
        sala = null;
        fila = [];
        convidadoPresente = false;
        oferecendo = false;
        pararStream();
    }

    window.Netplay = {
        abrirSala: abrirSala,
        fechar: fechar,
        renegociar: renegociar,
        instalarCapturaDeAudio: instalarCapturaDeAudio,
        salaAtual: function () { return sala; },
        convidadoPresente: function () { return convidadoPresente; }
    };

})();
