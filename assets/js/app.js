// =========================================
// CAMADA DE SEGURANÇA E PROTEÇÃO
// =========================================
const DOMINIO_PERMITIDO = "retronfc.github.io";
const ehLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const ehGitHubOFicial = window.location.hostname.includes(DOMINIO_PERMITIDO);
const ehArquivoLocal = window.location.protocol === "file:"; 

if (!ehLocalhost && !ehGitHubOFicial && !ehArquivoLocal) {
    document.body.innerHTML = "<div style='background:#111; color:#ff4444; height:100vh; display:flex; justify-content:center; align-items:center;'><h1>Acesso Não Autorizado</h1></div>";
    throw new Error("Execução bloqueada por segurança.");
}

// =========================================
// VARIÁVEIS GLOBAIS & CONFIGURAÇÃO TELEGRAM
// =========================================
const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
let IS_VALID = false; 
const clickSound = new Audio('assets/life.mp3'); 

const TELEGRAM_TOKEN = "8651257279:AAGK-88zOogg8I51qraFA_0MkfZMU55KLzk";
const TELEGRAM_CHAT_ID = "941396833";

let tempoInicio = 0;
let telegramMessageId = null; 
let telegramTextoBase = ""; 

// =========================================
// FUNÇÕES DE COLETA ESPECÍFICAS
// =========================================
function obterIdJogador() {
    let jogadorId = localStorage.getItem('imortalize_user_id');
    if (!jogadorId) { 
        jogadorId = 'usr_' + Math.random().toString(36).substring(2, 12); 
        localStorage.setItem('imortalize_user_id', jogadorId); 
    }
    return jogadorId;
}

function obterTipoConexao() {
    // Tenta pegar o tipo de rede. No iOS da Apple isso costuma vir como 'Desconhecido' por segurança deles.
    if (navigator.connection && navigator.connection.effectiveType) {
        return navigator.connection.effectiveType.toUpperCase(); // Retorna 4G, 3G, etc.
    }
    return "Desconhecido/Oculto";
}

function formatarTempoDeJogo(ms) {
    let s = Math.floor(ms / 1000); let h = Math.floor(s / 3600); let m = Math.floor((s % 3600) / 60); s = s % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`; if (m > 0) return `${m}m ${s}s`; return `${s}s`;
}

function obterDataBonita() { return new Date().toLocaleString('pt-BR'); }

// =========================================
// INTEGRAÇÃO TELEGRAM: INÍCIO E FIM DE SESSÃO
// =========================================
function registrarLogAcessoImediato() {
    if (!CURRENT_GAME) return;
    tempoInicio = Date.now(); 
    
    // Busca o IP, Localização e Provedor (ISP)
    fetch("https://ipwho.is/")
        .then(res => res.json())
        .then(data => {
            let ipUser = data.success ? data.ip : "Desconhecido";
            let localUser = (data.success && data.city && data.region && data.country) ? `${data.city}, ${data.region} - ${data.country}` : "Desconhecida";
            let provedor = (data.success && data.connection && data.connection.isp) ? data.connection.isp : "Desconhecido";
            enviarParaTelegram(ipUser, localUser, provedor);
        }).catch(() => enviarParaTelegram("Desconhecido", "Desconhecida", "Desconhecido"));
}

async function enviarParaTelegram(ipUser, localUser, provedor) {
    // Monta o layout limpo e cheio de emojis que vai chegar no seu celular
    telegramTextoBase = `🎮 <b>SESSÃO RETRÔ NFC</b>\n\n` +
                        `🕹️ <b>Jogo:</b> ${CURRENT_GAME.title}\n` +
                        `🆔 <b>ID do Jogador:</b> ${obterIdJogador()}\n` +
                        `📅 <b>Início:</b> ${obterDataBonita()}\n` +
                        `📍 <b>Local:</b> ${localUser}\n` +
                        `🌐 <b>IP:</b> ${ipUser}\n` +
                        `📡 <b>Provedor:</b> ${provedor}\n` +
                        `📶 <b>Conexão:</b> ${obterTipoConexao()}\n`;

    const texto = telegramTextoBase + `\n⏱️ <b>Status:</b> 🟢 <i>Jogando...</i>`;

    const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        text: texto,
        parse_mode: "HTML" 
    };

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        
        // Salva a mensagem para editar quando o jogo fechar
        if (data.ok) {
            telegramMessageId = data.result.message_id;
        }
    } catch (e) { console.log("Falha ao notificar Telegram", e); }
}

async function atualizarTempoSessao() {
    if (!telegramMessageId || tempoInicio === 0) return;

    const tempoJogadoMs = Date.now() - tempoInicio;
    const tempoFormatado = formatarTempoDeJogo(tempoJogadoMs);

    // Edita a mensagem trocando apenas a última linha
    const textoAtualizado = telegramTextoBase + `\n⏱️ <b>Tempo Jogado:</b> 🔴 <b>${tempoFormatado}</b>`;

    const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        message_id: telegramMessageId,
        text: textoAtualizado,
        parse_mode: "HTML"
    };

    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, { 
            method: 'POST', 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(payload), 
            keepalive: true 
        });
    } catch (e) {}
}

window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') atualizarTempoSessao(); });
window.addEventListener('pagehide', atualizarTempoSessao);
window.addEventListener('beforeunload', atualizarTempoSessao);

// =========================================
// LÓGICA DE JOGO E EMULADOR
// =========================================
async function loadGames() {
    try {
        if (!GAME_KEY) { mostrarTelaErro(); return; }

        const response = await fetch("games.json?ts=" + Date.now());
        const data = await response.json(); 
        
        CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);
        if (!CURRENT_GAME) { mostrarTelaErro(); return; }
        IS_VALID = true;

        document.getElementById("gameCover").src = CURRENT_GAME.cover;
        document.getElementById("title").innerText = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("year").innerText = CURRENT_GAME.year;
        document.getElementById("players").innerText = CURRENT_GAME.players;
        document.getElementById("developer").innerText = CURRENT_GAME.developer;

        const startBtn = document.getElementById("btnJogar");
        startBtn.onclick = () => {
            clickSound.play(); 
            registrarLogAcessoImediato(); // Dispara o POST do Telegram
            iniciarEmulador(); 
        };

    } catch (error) {
        mostrarTelaErro();
    }
}

function iniciarEmulador() {
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("emulatorScreen").style.display = "block";
    document.body.style.padding = "0";
    document.body.style.backgroundColor = "#000000";

    const docElement = document.documentElement;
    const requestFS = docElement.requestFullscreen || docElement.webkitRequestFullscreen || docElement.msRequestFullscreen;
    if (requestFS) {
        requestFS.call(docElement).then(() => {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        }).catch(() => {});
    }

    if (typeof CURRENT_GAME !== 'undefined') {
        window.EJS_player = '#game';
        window.EJS_core = CURRENT_GAME.core; 
        window.EJS_gameUrl = CURRENT_GAME.romUrl; 
        window.EJS_pathtodata = 'https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@main/data/';
        window.EJS_startOnLoaded = true; 
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@main/data/loader.js';
        document.body.appendChild(script);
    }
}

function mostrarTelaErro() {
    IS_VALID = false;
    document.getElementById("splashScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("bootScreen").style.display = "none";
    document.getElementById("invalidScreen").style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("gameScreen").style.display = "none"; 
    document.getElementById("bootScreen").style.display = "none"; 
    document.getElementById("splashScreen").style.display = "flex"; 

    loadGames();

    setTimeout(() => {
        if (IS_VALID) { 
            if (typeof startBoot === "function") {
                startBoot(); 
            }
        }
    }, 4000); 
});
