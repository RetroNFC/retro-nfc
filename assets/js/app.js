// =========================================
// CAMADA DE SEGURANÇA E PROTEÇÃO (ANTI-CÓPIA)
// =========================================

// Altere "seu-usuario.github.io" para o seu usuário real do GitHub
const DOMINIO_PERMITIDO = "https://retronfc.github.io/retro-nfc"; 

if (window.location.hostname !== "localhost" && !window.location.hostname.includes(DOMINIO_PERMITIDO)) {
    document.body.innerHTML = "<div style='background:#111; color:#ff4444; height:100vh; display:flex; justify-content:center; align-items:center; font-family:sans-serif; text-align:center;'><h1>Acesso Não Autorizado</h1></div>";
    throw new Error("Execução bloqueada por segurança.");
}

// Bloqueio de Botão Direito
document.addEventListener('contextmenu', event => event.preventDefault());

// Bloqueio de Teclas de Atalho de Desenvolvedor (F12, Ctrl+Shift+I, Ctrl+U, etc.)
document.addEventListener('keydown', function(event) {
    if (event.keyCode === 123 || // F12
        (event.ctrlKey && event.shiftKey && event.keyCode === 73) || // Ctrl+Shift+I
        (event.ctrlKey && event.shiftKey && event.keyCode === 67) || // Ctrl+Shift+C
        (event.ctrlKey && event.keyCode === 85)) { // Ctrl+U
        event.preventDefault();
        return false;
    }
});

// =========================================
// CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
// =========================================
const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
let IS_VALID = false; 
const clickSound = new Audio('assets/life.mp3'); 

// =========================================
// SISTEMA DE INTELIGÊNCIA E LOGS (SUPABASE)
// =========================================
const SUPABASE_URL = "https://dcdhdbcpukjlbwqjrfdn.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZGhkYmNwdWtqbGJ3cWpyZmRuIiqm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MDUwODgsImV4cCI6MjEwMTA4MTA4OH0.qnxhnfPOJYg5JRnqUjSwN-WCK7LVpeFeirbnLF_rB-g";    

let horaInicioJogo = null;

// Gera ou recupera um ID único e anônimo para o usuário
function obterIdJogador() {
    let jogadorId = localStorage.getItem('imortalize_user_id');
    if (!jogadorId) {
        jogadorId = 'usr_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('imortalize_user_id', jogadorId);
    }
    return jogadorId;
}

// Identifica o Aparelho
function obterAparelho() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS (Apple)";
    if (/windows/i.test(ua)) return "Windows PC";
    if (/macintosh/i.test(ua)) return "Mac OS";
    return "Outro";
}

// Identifica o Navegador
function obterNavegador() {
    const ua = navigator.userAgent;
    if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
    if (/chrome|crios/i.test(ua) && !/edge|opr|brave/i.test(ua)) return "Chrome";
    if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return "Safari";
    if (/firefox|fxios/i.test(ua)) return "Firefox";
    return "Outro";
}

// Coleta IP, Localização e Envia IMEDIATAMENTE para o Supabase ao iniciar o jogo
async function registrarLogAcessoImediato() {
    if (!CURRENT_GAME) return;

    horaInicioJogo = new Date().toLocaleTimeString('pt-BR');
    const dataAcesso = new Date().toLocaleDateString('pt-BR');
    const dataHoraCompleta = `${dataAcesso} ${horaInicioJogo}`;

    let ipUser = "Desconhecido";
    let localUser = "Desconhecida";

    try {
        const response = await fetch("https://ipwho.is/");
        const data = await response.json();
        
        if (data.success) {
            ipUser = data.ip || "Desconhecido";
            localUser = (data.city && data.region) ? `${data.city} - ${data.region}` : "Desconhecida";
        } else {
            const ipFallback = await fetch("https://api.ipify.org?format=json");
            const ipData = await ipFallback.json();
            ipUser = ipData.ip || "Desconhecido";
        }
    } catch (e) {
        console.log("Erro ao buscar IP/Localização:", e);
    }

    const payload = {
        data_hora: dataHoraCompleta,
        jogo: CURRENT_GAME.title || "Desconhecido",
        jogador_id: obterIdJogador(),
        tempo: "Sessão Iniciada",
        localizacao: localUser,
        ip: ipUser,
        aparelho: obterAparelho(),
        navegador: obterNavegador()
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
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.log("Erro ao enviar log:", error);
    }
}

// =========================================
// CARREGAMENTO E FLUXO DO JOGO (SEM SPLASH)
// =========================================
async function loadGames() {
    try {
        if (!GAME_KEY) {
            mostrarTelaErro();
            return;
        }

        const response = await fetch("games.json?ts=" + Date.now());
        const data = await response.json(); 
        
        CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);
        
        if (!CURRENT_GAME) {
            mostrarTelaErro();
            return;
        }

        IS_VALID = true;
        document.getElementById("gameCover").src = CURRENT_GAME.cover;
        document.getElementById("title").innerText = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("year").innerText = CURRENT_GAME.year;
        document.getElementById("players").innerText = CURRENT_GAME.players;
        document.getElementById("developer").innerText = CURRENT_GAME.developer;

        // Oculta completamente qualquer resquício da Splash Screen e exibe a tela do jogo direto
        const splashScreen = document.getElementById("splashScreen");
        const gameScreen = document.getElementById("gameScreen");
        const scanlines = document.querySelector(".scanlines"); 

        if (splashScreen) splashScreen.style.display = "none";
        if (scanlines) scanlines.style.display = "none";
        if (gameScreen) gameScreen.style.display = "flex";

        const startBtn = document.getElementById("btnJogar");
        startBtn.addEventListener("click", () => {
            clickSound.play();
            registrarLogAcessoImediato(); 
            startBoot();
        });

    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        mostrarTelaErro();
    }
}

function mostrarTelaErro() {
    IS_VALID = false;
    
    const splash = document.getElementById("splashScreen");
    const gameScreen = document.getElementById("gameScreen");
    const scanlines = document.querySelector(".scanlines"); 
    
    if (splash) splash.style.display = "none";
    if (gameScreen) gameScreen.style.display = "none";
    if (scanlines) scanlines.style.display = "none";
    
    const invalidScreen = document.getElementById("invalidScreen");
    if (invalidScreen) {
        invalidScreen.style.display = "block";
    }
}

document.addEventListener("DOMContentLoaded", loadGames);

// Ativa Tela Cheia e Trava na Horizontal
['click', 'touchstart'].forEach(eventType => {
    document.addEventListener(eventType, function(event) {
        if (event.target && (event.target.classList.contains('ejs_start_button') || event.target.closest('.ejs_start_button'))) {
            
            const docElement = document.documentElement;
            const requestFS = docElement.requestFullscreen || docElement.webkitRequestFullscreen || docElement.msRequestFullscreen;
            
            if (requestFS) {
                requestFS.call(docElement).then(() => {
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch(err => {
                            console.log("Rotação automática bloqueada.");
                        });
                    }
                }).catch(err => console.log("Erro de tela cheia."));
            }
        }
    }, true); 
});
