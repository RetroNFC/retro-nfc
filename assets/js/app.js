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
// VARIÁVEIS GLOBAIS
// =========================================
const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
let IS_VALID = false; 
const clickSound = new Audio('assets/life.mp3'); 

const SUPABASE_URL = "https://dcdhdbcpukjlbwqjrfdn.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZGhkYmNwdWtqbGJ3cWpyZmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MDUwODgsImV4cCI6MjEwMTA4MTA4OH0.qnxhnfPOJYg5JRnqUjSwN-WCK7LVpeFeirbnLF_rB-g";    

let tempoInicio = 0;
let sessaoAtualId = null; 

// =========================================
// FUNÇÕES DE COLETA (MANTIDAS IGUAIS)
// =========================================
function gerarUUID() { return 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); }
function obterIdJogador() {
    let jogadorId = localStorage.getItem('imortalize_user_id');
    if (!jogadorId) { jogadorId = 'usr_' + Math.random().toString(36).substring(2, 12); localStorage.setItem('imortalize_user_id', jogadorId); }
    return jogadorId;
}
function obterAparelho() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS (Apple)";
    if (/windows/i.test(ua)) return "Windows PC";
    if (/macintosh/i.test(ua)) return "Mac OS";
    return "Outro";
}
function obterNavegador() {
    const ua = navigator.userAgent;
    if (/Instagram/i.test(ua)) return "Navegador In-App (Instagram)";
    if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
    if (/chrome|crios/i.test(ua) && !/edge|opr|brave/i.test(ua)) return "Chrome";
    if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return "Safari";
    return "Outro";
}
function obterDigitalAparelho() { return `Tela: ${window.screen.width}x${window.screen.height} | Núcleos: ${navigator.hardwareConcurrency || 'N/A'} | Idioma: ${navigator.language || 'N/A'}`; }
function formatarTempoDeJogo(ms) {
    let s = Math.floor(ms / 1000); let h = Math.floor(s / 3600); let m = Math.floor((s % 3600) / 60); s = s % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`; if (m > 0) return `${m}m ${s}s`; return `${s}s`;
}
function obterDataBonita() { return new Date().toLocaleString('pt-BR'); }

// =========================================
// SUPABASE: POST E PATCH (MANTIDOS IGUAIS)
// =========================================
function registrarLogAcessoImediato() {
    if (!CURRENT_GAME) return;
    sessaoAtualId = gerarUUID(); 
    tempoInicio = Date.now(); 
    fetch("https://ipwho.is/")
        .then(res => res.json())
        .then(data => {
            let ipUser = data.success ? data.ip : "Desconhecido";
            let localUser = (data.success && data.city && data.region) ? `${data.city} - ${data.region}` : "Desconhecida";
            enviarParaSupabase(ipUser, localUser);
        }).catch(() => enviarParaSupabase("Desconhecido", "Desconhecida"));
}

async function enviarParaSupabase(ipUser, localUser) {
    const payload = {
        sessao_id: sessaoAtualId, data_hora: obterDataBonita(), jogo: CURRENT_GAME.title, jogador_id: obterIdJogador(),
        tempo: "Sessão Iniciada (Jogando...)", localizacao: localUser, ip: ipUser, aparelho: obterAparelho(),
        navegador: obterNavegador(), digital_aparelho: obterDigitalAparelho()
    };
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/logs_acesso`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Prefer": "return=minimal" },
            body: JSON.stringify(payload), keepalive: true 
        });
    } catch (e) { console.log(e); }
}

async function atualizarTempoSessao() {
    if (!sessaoAtualId || tempoInicio === 0) return;
    const patchUrl = `${SUPABASE_URL}/rest/v1/logs_acesso?sessao_id=eq.${sessaoAtualId}`;
    try {
        await fetch(patchUrl, { 
            method: 'PATCH', 
            headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Prefer": "return=minimal" }, 
            body: JSON.stringify({ tempo: formatarTempoDeJogo(Date.now() - tempoInicio) }), keepalive: true 
        });
    } catch (e) {}
}

window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') atualizarTempoSessao(); });
window.addEventListener('pagehide', atualizarTempoSessao);
window.addEventListener('beforeunload', atualizarTempoSessao);

// =========================================
// LÓGICA DE JOGO, TELAS E EMULADOR
// =========================================
async function loadGames() {
    try {
        if (!GAME_KEY) { mostrarTelaErro(); return; }

        // Carrega o games.json
        const response = await fetch("games.json?ts=" + Date.now());
        const data = await response.json(); 
        
        CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);
        if (!CURRENT_GAME) { mostrarTelaErro(); return; }
        IS_VALID = true;

        // Preenche as informações da capa, título, ano, etc. (Elas ficam ocultas até o Terminal acabar)
        document.getElementById("gameCover").src = CURRENT_GAME.cover;
        document.getElementById("title").innerText = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("year").innerText = CURRENT_GAME.year;
        document.getElementById("players").innerText = CURRENT_GAME.players;
        document.getElementById("developer").innerText = CURRENT_GAME.developer;

        // Configura o ÚNICO botão de clique do sistema
        const startBtn = document.getElementById("btnJogar");
        startBtn.onclick = () => {
            clickSound.play(); // Toca o som do Mario
            registrarLogAcessoImediato(); // Salva no Supabase
            iniciarEmulador(); // Inicia o jogo direto!
        };

    } catch (error) {
        mostrarTelaErro();
    }
}

// NOVA FUNÇÃO: Faz a mágica de girar a tela e pular o botão nativo do emulador
function iniciarEmulador() {
    // Esconde a Ficha do Jogo e mostra a tela preta do Emulador
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("emulatorScreen").style.display = "block";
    document.body.style.padding = "0";
    document.body.style.backgroundColor = "#000000";

    // 1. FORÇA A TELA CHEIA E A ROTAÇÃO IMEDIATAMENTE (Graças ao clique no botão)
    const docElement = document.documentElement;
    const requestFS = docElement.requestFullscreen || docElement.webkitRequestFullscreen || docElement.msRequestFullscreen;
    if (requestFS) {
        requestFS.call(docElement).then(() => {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        }).catch(() => {});
    }

    // 2. CONFIGURA E INJETA O EMULADOR
    if (typeof CURRENT_GAME !== 'undefined') {
        window.EJS_player = '#game';
        window.EJS_core = CURRENT_GAME.core; 
        window.EJS_gameUrl = CURRENT_GAME.romUrl; 
        window.EJS_pathtodata = 'https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@main/data/';
        
        // O TRUQUE DE MESTRE: Inicia o jogo automaticamente sem precisar do segundo botão (ejs_start_button)
        window.EJS_startOnLoaded = true; 
        
        // Insere o script no HTML e o jogo começa!
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

// INÍCIO DO FLUXO DO APLICATIVO
document.addEventListener("DOMContentLoaded", () => {
    // Garante que só o Splash Screen aparece primeiro
    document.getElementById("gameScreen").style.display = "none"; 
    document.getElementById("bootScreen").style.display = "none"; 
    document.getElementById("splashScreen").style.display = "flex"; 

    // Carrega os dados silenciosamente no fundo
    loadGames();

    // Segura a arte da tela Splash por exatamente 4 segundos...
    setTimeout(() => {
        if (IS_VALID) { 
            // Após 4s, INICIA O TERMINAL VERDE AUTOMATICAMENTE (Sem clique!)
            if (typeof startBoot === "function") {
                startBoot(); 
            }
        }
    }, 4000); 
});

// Nota: Removemos o antigo código de 'touchstart' que ficava aqui embaixo, 
// pois agora a função iniciarEmulador() cuida da tela cheia com perfeição!
