// =====================================================
// RETRÔ NFC — app.js (versão segura)
// Token do Telegram REMOVIDO do frontend.
// Os dados vão para o Apps Script, que encaminha ao Telegram.
// =====================================================

// URL do seu Apps Script (proxy seguro)
// Se você reimplantar o Apps Script, atualize esta URL.
const URL_BACKEND = "https://script.google.com/macros/s/AKfycbw2aJCwpgq1OJ1fVSXUz8hUMCK7M2Ho1l7HdUKGf8hF4rbS2FFEDGiyBW6FA03yRTz_/exec";

// --- Rastreamento do clique na estante ---
async function rastrearCliqueColecao(origem) {
    const b1 = document.getElementById('btnEstante');
    const b2 = document.getElementById('btnEstanteErro');
    if (b1) { b1.innerText = "CARREGANDO..."; b1.style.opacity = "0.5"; }
    if (b2) { b2.innerText = "CARREGANDO..."; b2.style.opacity = "0.5"; }

    let listaJogos = "Nenhum cartucho na estante ainda.";

    try {
        const colecaoSalva = JSON.parse(localStorage.getItem('imortalize_colecao') || '[]');
        if (colecaoSalva.length > 0) {
            const response = await fetch("games.json?ts=" + Date.now());
            const data = await response.json();
            listaJogos = colecaoSalva.map(chave => {
                const jogoEncontrado = data.games.find(g => g.key === chave);
                return jogoEncontrado ? `• ${jogoEncontrado.title}` : `• ID Desconhecido (${chave})`;
            }).join('\n');
        }
    } catch (e) {
        console.error("Erro ao montar a lista da estante:", e);
    }

    const payload = JSON.stringify({
        origemRequisicao: "SiteRetroNFC",
        tipo: "Acesso",
        origem: origem,
        jogos: listaJogos
    });

    // keepalive mantém a requisição viva mesmo depois de a página navegar.
    // Sem isso, o navegador cancela o POST no instante do redirecionamento.
    try {
        await fetch(URL_BACKEND, {
            method: 'POST',
            mode: 'no-cors',
            keepalive: true,
            headers: { 'Content-Type': 'text/plain' },
            body: payload
        });
    } catch (e) {
        console.error("Erro ao registrar acesso:", e);
    }

    window.location.href = 'colecao.html';
}

// --- Verificação de domínio ---
const DOMINIOS_PERMITIDOS = [
    "retronfc.github.io",
    "retro-nfc.pages.dev"
];
const hostAtual        = window.location.hostname;
const ehLocalhost      = hostAtual === "localhost" || hostAtual === "127.0.0.1";
const ehDominioOficial = DOMINIOS_PERMITIDOS.some(d => hostAtual === d || hostAtual.endsWith("." + d));
const ehArquivoLocal   = window.location.protocol === "file:";

if (!ehLocalhost && !ehGitHubOFicial && !ehArquivoLocal) {
    document.body.innerHTML = "<div style='background:#111; color:#ff4444; height:100vh; display:flex; justify-content:center; align-items:center;'><h1>Acesso Não Autorizado</h1></div>";
    throw new Error("Execução bloqueada por segurança.");
}

// --- Estado global ---
const PARAMS   = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
let IS_VALID     = false;
const clickSound = new Audio('assets/life.mp3');

let tempoInicio   = 0;
let sessaoEnviada = false; // Trava: garante que o encerramento é enviado só uma vez

// --- Utilitários ---
function obterIdEVisitas() {
    let id = localStorage.getItem('imortalize_id_curto');
    let visitas = parseInt(localStorage.getItem('imortalize_visitas') || "0");
    if (!id) {
        id = Math.random().toString(36).substring(2, 6).toUpperCase();
        localStorage.setItem('imortalize_id_curto', id);
    }
    visitas++;
    localStorage.setItem('imortalize_visitas', visitas);
    return `${id} (Acesso #${visitas})`;
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
    let s = Math.floor(ms / 1000);
    let h = Math.floor(s / 3600);
    let m = Math.floor((s % 3600) / 60);
    s = s % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function obterDataBonita() { return new Date().toLocaleString('pt-BR'); }

// --- Notificações de sessão (via Apps Script → Telegram) ---

function registrarLogAcessoImediato() {
    if (!CURRENT_GAME) return;
    tempoInicio   = Date.now();
    sessaoEnviada = false;

    fetch("https://ipwho.is/")
        .then(res => res.json())
        .then(data => {
            const ipUser   = data.success ? data.ip : "Desconhecido";
            const provedor = (data.success && data.connection?.isp) ? data.connection.isp : "Desconhecido";
            const localIP  = (data.success && data.city) ? `${data.city}, ${data.region}` : "Região Desconhecida";
            enviarInicioSessao(ipUser, provedor, localIP);
        })
        .catch(() => enviarInicioSessao("Desconhecido", "Desconhecido", "Região Desconhecida"));
}

function enviarInicioSessao(ipUser, provedor, localIP) {
    // Monta o texto e envia para o Apps Script (sem token aqui!)
    const texto =
        `🎮 <b>SESSÃO RETRÔ NFC</b>\n\n` +
        `🕹️ <b>Jogo:</b> ${CURRENT_GAME.title}\n` +
        `🆔 <b>Jogador:</b> ${obterIdEVisitas()}\n` +
        `📱 <b>Aparelho:</b> ${obterAparelho()}\n` +
        `📅 <b>Início:</b> ${obterDataBonita()}\n\n` +
        `📍 <b>Localização:</b> ${localIP}\n` +
        `🌐 <b>Rede IP:</b> ${ipUser} (${provedor})\n\n` +
        `⏱️ <b>Status:</b> 🔵 <i>Jogando...</i>`;

    fetch(URL_BACKEND, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
            origemRequisicao: "SiteRetroNFC",
            tipo: "TelegramSessao",
            acao: "inicio",
            texto: texto
        })
    });
}

function encerrarSessao() {
    // Trava: só dispara uma vez por sessão, mesmo com múltiplos eventos de saída
    if (sessaoEnviada || tempoInicio === 0) return;
    sessaoEnviada = true;

    const tempoFormatado = formatarTempoDeJogo(Date.now() - tempoInicio);
    const jogo = CURRENT_GAME ? CURRENT_GAME.title : "Desconhecido";

    const texto =
        `🟢 <b>SESSÃO ENCERRADA</b>\n\n` +
        `🕹️ <b>Jogo:</b> ${jogo}\n` +
        `⏱️ <b>Tempo jogado:</b> ${tempoFormatado}`;

    // sendBeacon é mais confiável para enviar dados ao fechar/sair da página
    navigator.sendBeacon(URL_BACKEND, JSON.stringify({
        origemRequisicao: "SiteRetroNFC",
        tipo: "TelegramSessao",
        acao: "fim",
        texto: texto
    }));
}

// Escuta os eventos de saída da página
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') encerrarSessao();
});
window.addEventListener('pagehide', encerrarSessao);

// --- Carregamento do jogo ---
async function loadGames() {
    try {
        if (!GAME_KEY) { mostrarTelaErro(); return; }

        const response = await fetch("games.json?ts=" + Date.now());
        const data = await response.json();

        CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);
        if (!CURRENT_GAME) { mostrarTelaErro(); return; }
        IS_VALID = true;

        let colecao = JSON.parse(localStorage.getItem('imortalize_colecao') || '[]');
        if (!colecao.includes(CURRENT_GAME.key)) {
            colecao.push(CURRENT_GAME.key);
            localStorage.setItem('imortalize_colecao', JSON.stringify(colecao));
        }

        document.getElementById("gameCover").src      = CURRENT_GAME.cover;
        document.getElementById("title").innerText    = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("year").innerText     = CURRENT_GAME.year;
        document.getElementById("players").innerText  = CURRENT_GAME.players;
        document.getElementById("developer").innerText = CURRENT_GAME.developer;

        const btn = document.getElementById("btnJogar");
        btn.onclick = () => {
            if (navigator.vibrate) { try { navigator.vibrate(100); } catch(e){} }
            clickSound.play().catch(() => {});
            registrarLogAcessoImediato();

            const gameScreen = document.getElementById("gameScreen");
            gameScreen.classList.add("crt-shutdown");
            setTimeout(() => iniciarEmulador(), 400);
        };
    } catch (error) {
        mostrarTelaErro();
    }
}

function iniciarEmulador() {
    document.getElementById("gameScreen").style.display = "none";
    const emulatorScreen = document.getElementById("emulatorScreen");
    emulatorScreen.style.display = "block";

    document.body.style.padding = "0";
    document.body.style.backgroundColor = "#000000";

    const docElement = document.documentElement;
    const requestFS = docElement.requestFullscreen
                   || docElement.webkitRequestFullscreen
                   || docElement.msRequestFullscreen;

    if (requestFS) {
        requestFS.call(docElement).then(() => {
            if (screen.orientation?.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        }).catch(() => {});
    }

    if (typeof CURRENT_GAME !== 'undefined') {
        window.EJS_player        = '#game';
        window.EJS_core          = CURRENT_GAME.core;
        window.EJS_gameUrl       = CURRENT_GAME.romUrl;
        window.EJS_startOnLoaded = true;

        // ✅ Usando a versão ESTÁVEL do EmulatorJS (não mais @main, que pode quebrar sem aviso)
        window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';

        const script = document.createElement('script');
        script.src   = 'https://cdn.emulatorjs.org/stable/data/loader.js';
        document.body.appendChild(script);
    }
}

function mostrarTelaErro() {
    IS_VALID = false;
    document.getElementById("splashScreen").style.display = "none";
    document.getElementById("gameScreen").style.display   = "none";
    document.getElementById("bootScreen").style.display   = "none";
    document.getElementById("invalidScreen").style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("gameScreen").style.display  = "none";
    document.getElementById("bootScreen").style.display  = "none";
    document.getElementById("splashScreen").style.display = "flex";
    loadGames();
    setTimeout(() => { if (IS_VALID && typeof startBoot === "function") startBoot(); }, 4000);
});
