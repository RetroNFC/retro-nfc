// ==========================================
// TELEGRAM BACKOFFICE: CLIQUE NA COLEÇÃO
// ==========================================
async function rastrearCliqueColecao(origem) {
    const BOT_TOKEN = "8651257279:AAGK-88zOogg8I51qraFA_0MkfZMU55KLzk"; 
    const CHAT_ID = "941396833";
    
    // Pega os IDs salvos no navegador do cliente
    const colecaoSalva = JSON.parse(localStorage.getItem('imortalize_colecao') || '[]');
    
    let listaJogosPossui = "Nenhum cartucho na estante ainda.";
    
    if (colecaoSalva.length > 0) {
        try {
            // Busca o games.json para traduzir os IDs nos nomes comerciais dos jogos
            const response = await fetch("games.json?ts=" + Date.now());
            const data = await response.json();
            
            const meusJogos = data.games
                .filter(game => colecaoSalva.includes(game.key))
                .map(game => `• ${game.title}`);
                
            if (meusJogos.length > 0) {
                listaJogosPossui = meusJogos.join('\n');
            }
        } catch (e) {
            // Caso ocorra falha na rede, exibe os IDs como contingência
            listaJogosPossui = colecaoSalva.map(k => `• ${k}`).join('\n');
        }
    }
    
    const dataHora = new Date().toLocaleString('pt-BR');
    const mensagem = `👀 *VITRINE ACESSADA!*\n\nUm cliente abriu a estante de cartuchos!\n\n📍 *Origem:* ${origem}\n🕒 *Data:* ${dataHora}\n\n🎮 *Cartuchos que ele já possui:*\n${listaJogosPossui}\n\n#AcessoColecao`;
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    
    // Dispara a requisição para o Telegram mantendo o envio seguro
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            chat_id: CHAT_ID, 
            text: mensagem, 
            parse_mode: 'Markdown' 
        }),
        keepalive: true
    }).catch(err => console.log("Erro no radar", err));

    // Pequeno atraso estratégico (300ms) para dar tempo exato do fetch partir antes de mudar de página
    setTimeout(() => {
        window.location.href = 'colecao.html';
    }, 300);
}

const DOMINIO_PERMITIDO = "retronfc.github.io";
const ehLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const ehGitHubOFicial = window.location.hostname.includes(DOMINIO_PERMITIDO);
const ehArquivoLocal = window.location.protocol === "file:"; 

if (!ehLocalhost && !ehGitHubOFicial && !ehArquivoLocal) {
    document.body.innerHTML = "<div style='background:#111; color:#ff4444; height:100vh; display:flex; justify-content:center; align-items:center;'><h1>Acesso Não Autorizado</h1></div>";
    throw new Error("Execução bloqueada por segurança.");
}

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
    if (/android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS (Apple)";
    if (/windows/i.test(ua)) return "Windows PC";
    if (/macintosh/i.test(ua)) return "Mac OS";
    return "Outro";
}

function formatarTempoDeJogo(ms) {
    let s = Math.floor(ms / 1000); let h = Math.floor(s / 3600); let m = Math.floor((s % 3600) / 60); s = s % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`; if (m > 0) return `${m}m ${s}s`; return `${s}s`;
}

function obterDataBonita() { return new Date().toLocaleString('pt-BR'); }

function registrarLogAcessoImediato() {
    if (!CURRENT_GAME) return;
    tempoInicio = Date.now(); 

    fetch("https://ipwho.is/")
        .then(res => res.json())
        .then(data => {
            let ipUser = data.success ? data.ip : "Desconhecido";
            let provedor = (data.success && data.connection && data.connection.isp) ? data.connection.isp : "Desconhecido";
            let localIP = (data.success && data.city) ? `${data.city}, ${data.region}` : "Região Desconhecida";
            enviarParaTelegram(ipUser, provedor, localIP);
        }).catch(() => enviarParaTelegram("Desconhecido", "Desconhecido", "Região Desconhecida"));
}

async function enviarParaTelegram(ipUser, provedor, localIP) {
    telegramTextoBase = `🎮 <b>SESSÃO RETRÔ NFC</b>\n\n` +
                        `🕹️ <b>Jogo:</b> ${CURRENT_GAME.title}\n` +
                        `🆔 <b>Jogador:</b> ${obterIdEVisitas()}\n` +
                        `📱 <b>Aparelho:</b> ${obterAparelho()}\n` +
                        `📅 <b>Início:</b> ${obterDataBonita()}\n\n` +
                        `📍 <b>Localização:</b> ${localIP}\n` +
                        `🌐 <b>Rede IP:</b> ${ipUser} (${provedor})\n`;

    const texto = telegramTextoBase + `\n⏱️ <b>Status:</b> 🔵 <i>Jogando...</i>`;
    const payload = { chat_id: TELEGRAM_CHAT_ID, text: texto, parse_mode: "HTML", disable_web_page_preview: true };

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.ok) telegramMessageId = data.result.message_id;
    } catch (e) { console.log(e); }
}

async function atualizarTempoSessao() {
    if (!telegramMessageId || tempoInicio === 0) return;
    const tempoJogadoMs = Date.now() - tempoInicio;
    const tempoFormatado = formatarTempoDeJogo(tempoJogadoMs);
    const textoAtualizado = telegramTextoBase + `\n⏱️ <b>Status:</b> 🟢 <b>Finalizado (Tempo: ${tempoFormatado})</b>`;
    const payload = { chat_id: TELEGRAM_CHAT_ID, message_id: telegramMessageId, text: textoAtualizado, parse_mode: "HTML", disable_web_page_preview: true };

    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, { 
            method: 'POST', headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true 
        });
    } catch (e) {}
}

window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') atualizarTempoSessao(); });
window.addEventListener('pagehide', atualizarTempoSessao);
window.addEventListener('beforeunload', atualizarTempoSessao);

async function loadGames() {
    try {
        if (!GAME_KEY) { mostrarTelaErro(); return; }
        const response = await fetch("games.json?ts=" + Date.now());
        const data = await response.json(); 
        
        CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);
        if (!CURRENT_GAME) { mostrarTelaErro(); return; }
        IS_VALID = true;

        // 🏆 SISTEMA DE COLEÇÃO (PASSO 1): Salva o jogo no celular
        let colecao = JSON.parse(localStorage.getItem('imortalize_colecao') || '[]');
        if (!colecao.includes(CURRENT_GAME.key)) {
            colecao.push(CURRENT_GAME.key);
            localStorage.setItem('imortalize_colecao', JSON.stringify(colecao));
        }
        // Fim da adição

        document.getElementById("gameCover").src = CURRENT_GAME.cover;
        document.getElementById("title").innerText = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("year").innerText = CURRENT_GAME.year;
        document.getElementById("players").innerText = CURRENT_GAME.players;
        document.getElementById("developer").innerText = CURRENT_GAME.developer;

        const btn = document.getElementById("btnJogar");

        btn.onclick = () => {
            // Vibra e toca o som no exato momento do clique
            if (navigator.vibrate) {
                try { navigator.vibrate(100); } catch(e){}
            }
            clickSound.play().catch(()=>{}); 
            registrarLogAcessoImediato(); 

            // Aplica a animação de TV desligando na tela de info antes de abrir o jogo
            const gameScreen = document.getElementById("gameScreen");
            gameScreen.classList.add("crt-shutdown");

            setTimeout(() => {
                iniciarEmulador();
            }, 400);
        };
    } catch (error) { mostrarTelaErro(); }
}

function iniciarEmulador() {
    document.getElementById("gameScreen").style.display = "none";
    const emulatorScreen = document.getElementById("emulatorScreen");
    emulatorScreen.style.display = "block";

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
    setTimeout(() => { if (IS_VALID && typeof startBoot === "function") startBoot(); }, 4000); 
});
