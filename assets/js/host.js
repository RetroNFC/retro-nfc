// =====================================================
// RETRO NFC — host.js
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
    let destinoAudio = null;

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

        const stream = streamDoEmulador();
        if (stream) stream.getTracks().forEach(function (t) { pc.addTrack(t, stream); });

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
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                try { pc.close(); } catch (e) {}
                pc = null;
                canal = null;
            }
        };

        return pc;
    }

    async function oferecer() {
        const peer = montarPeer();
        const oferta = await peer.createOffer();
        await peer.setLocalDescription(oferta);
        enviar({ t: 'sinal', dados: { offer: peer.localDescription } });
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

            const limite = setTimeout(function () {
                reject(new Error('tempo esgotado ao abrir a sala'));
            }, 15000);

            ws.onopen = function () {
                enviar({ t: 'criar', sala: sala, jogo: jogo, apelido: apelido || 'Anfitriao' });
                drenar();
            };

            ws.onmessage = function (ev) {
                let d;
                try { d = JSON.parse(ev.data); } catch (e) { return; }

                if (d.t === 'criado') {
                    clearTimeout(limite);
                    resolve({ sala: d.sala, link: LINK_BASE + '?sala=' + d.sala });
                    return;
                }

                if (d.t === 'erro') {
                    clearTimeout(limite);
                    reject(new Error(d.erro || 'erro ao abrir a sala'));
                    return;
                }

                if (d.t === 'convidado') { oferecer().catch(function () {}); return; }
                if (d.t === 'sinal')    { receberSinal(d.dados).catch(function () {}); return; }
                if (d.t === 'saiu')     { try { if (pc) pc.close(); } catch (e) {} pc = null; canal = null; return; }
            };

            ws.onerror = function () {
                clearTimeout(limite);
                reject(new Error('falha de conexao com o servidor'));
            };
        });
    }

    function fechar() {
        try { if (canal) canal.close(); } catch (e) {}
        try { if (pc) pc.close(); } catch (e) {}
        try { if (ws) ws.close(); } catch (e) {}
        pc = null; canal = null; ws = null; sala = null; fila = [];
    }

    window.Netplay = {
        abrirSala: abrirSala,
        fechar: fechar,
        instalarCapturaDeAudio: instalarCapturaDeAudio,
        salaAtual: function () { return sala; }
    };
})();
