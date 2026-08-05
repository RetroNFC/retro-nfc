// =========================================
// CAMADA DE SEGURANÇA E PROTEÇÃO (ANTI-CÓPIA)
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
// CONFIGURAÇÕES GLOBAIS
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
// SISTEMA DE COLETA AVANÇADA DE DADOS
// =========================================
function gerarUUID() {
    return 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function obterIdJogador() {
    let jogadorId = localStorage.getItem('imortalize_user_id');
    if (!jogadorId) {
        jogadorId = 'usr_' + Math.random().toString(36).substring(2, 12);
        localStorage.setItem('imortalize_user_id', jogadorId);
    }
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

function obterDigitalAparelho() {
    const tela = `${window.screen.width}x${window.screen.height}`;
    const nucleos = navigator.hardwareConcurrency || 'Desconhecido';
    const idioma = navigator.language || 'Desconhecido';
    return `Tela: ${tela} | Núcleos: ${nucleos} | Idioma: ${idioma}`;
}

function formatarTempoDeJogo(ms) {
    let segundosTotais = Math.floor(ms / 1000);
    let horas = Math.floor(segundosTotais / 3600);
    let minutos = Math.floor((segundosTotais % 3600) / 60);
    let segundos = segundosTotais % 60;
    
    if (horas > 0) return `${horas}h ${minutos}m ${segundos}s`;
    if (minutos > 0) return `${minutos}m ${segundos}s`;
    return `${segundos}s`;
}

function obterDataBonita() {
    return new Date().toLocaleString('pt-BR'); 
}

// =========================================
// BANCO DE DADOS: INICIO DE SESSÃO (POST)
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
        })
        .catch(() => {
            enviarParaSupabase("Desconhecido", "Desconhecida");
        });
}

async function enviarParaSupabase(ipUser, localUser) {
    const payload = {
        sessao_id: sessaoAtualId, 
        data_hora: obterDataBonita(), 
        jogo: CURRENT_GAME.title,
        jogador_id: obterIdJogador(),
        tempo: "Sessão Iniciada (Jogando...)", 
        localizacao: localUser,
        ip: ipUser,
        aparelho: obterAparelho(),
        navegador: obterNavegador(),
        digital_aparelho: obterDigitalAparelho()
    };

    try {
        await fetch(`${SUPABASE_URL}/rest/v1/logs_acesso`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Prefer": "return=minimal"
            },
            body: JSON.stringify(payload),
            keepalive: true 
        });
    } catch (error) {
        console.log("Erro de rede ao salvar log:", error);
    }
}

// =========================================
// BANCO DE DADOS: FIM DE SESSÃO (PATCH)
// =========================================
async function atualizarTempoSessao() {
    if (!sessaoAtualId || tempoInicio === 0) return;

    const tempoJogadoMs = Date.now() - tempoInicio;
    const tempoFormatado = formatarTempoDeJogo(tempoJogadoMs);

    const patchUrl = `${SUPABASE_URL}/rest/v1/logs_acesso?sessao_id=eq.${sessaoAtualId}`;
    const payload = { tempo: tempoFormatado };

    try {
        await fetch(patchUrl, { 
            method: 'PATCH', 
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Prefer": "return=minimal"
            }, 
            body: JSON.stringify(payload), 
            keepalive: true 
        });
    } catch (e) {
        console.log("Falha ao atualizar tempo", e);
    }
}

window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') atualizarTempoSessao(); });
window.addEventListener('pagehide', atualizarTempoSessao);
window.addEventListener('beforeunload', atualizarTempoSessao);

// =========================================
// CARREGAMENTO DO JOGO E EVENTOS 
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
            registrarLogAcessoImediato(); // Dispara o POST inicial
            if (typeof startBoot === "function") {
                startBoot(); 
            }
        };

    } catch (error) {
        mostrarTelaErro();
    }
}

function mostrarTelaErro() {
    IS_VALID = false;
    const splash = document.getElementById("splashScreen");
    const gameScreen = document.getElementById("gameScreen");
    const invalidScreen = document.getElementById("invalidScreen");
    
    if (splash) splash.style.display = "none";
    if (gameScreen) gameScreen.style.display = "none";
    if (invalidScreen) invalidScreen.style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
    const gameScreen = document.getElementById("gameScreen");
    const splashScreen = document.getElementById("splashScreen");
    
    if (gameScreen) gameScreen.style.display = "none"; 
    if (splashScreen) splashScreen.style.display = "flex"; 

    // Carrega os dados em background enquanto exibe a tela zero
    loadGames();

    // Mantém exatamente os 4 segundos de suspense da tela zero que você configurou
    setTimeout(() => {
        if (IS_VALID) { 
            if (splashScreen) splashScreen.style.display = "none"; 
            if (gameScreen) gameScreen.style.display = "flex";   
        }
    }, 4000); 
});

['click', 'touchstart'].forEach(eventType => {
    document.addEventListener(eventType, function(event) {
        if (event.target && (event.target.classList.contains('ejs_start_button') || event.target.closest('.ejs_start_button'))) {
            const docElement = document.documentElement;
            const requestFS = docElement.requestFullscreen || docElement.webkitRequestFullscreen || docElement.msRequestFullscreen;
            if (requestFS) {
                requestFS.call(docElement).then(() => {
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch(() => {});
                    }
                }).catch(() => {});
            }
        }
    }, true); 
});
