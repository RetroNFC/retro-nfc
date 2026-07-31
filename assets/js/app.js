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

// 1. Gera ou recupera um ID único e anônimo para o usuário (Fidelização Imortalize)
function obterIdJogador() {
    let jogadorId = localStorage.getItem('imortalize_user_id');
    if (!jogadorId) {
        jogadorId = 'usr_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('imortalize_user_id', jogadorId);
    }
    return jogadorId;
}

// 2. Identifica o Aparelho
function obterAparelho() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS (Apple)";
    if (/windows/i.test(ua)) return "Windows PC";
    if (/macintosh/i.test(ua)) return "Mac OS";
    return "Outro";
}

// 3. Identifica o Navegador
function obterNavegador() {
    const ua = navigator.userAgent;
    if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
    if (/chrome|crios/i.test(ua) && !/edge|opr|brave/i.test(ua)) return "Chrome";
    if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return "Safari";
    if (/firefox|fxios/i.test(ua)) return "Firefox";
    return "Outro";
}

// 4. Coleta IP, Localização e Envia IMEDIATAMENTE para o Supabase ao iniciar o jogo
async function registrarLogAcessoImediato() {
    if (!CURRENT_GAME) return;

    horaInicioJogo = new Date().toLocaleTimeString('pt-BR');
    const dataAcesso = new Date().toLocaleDateString('pt-BR');
    const dataHoraCompleta = `${dataAcesso} ${horaInicioJogo}`;

    let ipUser = "Desconhecido";
    let localUser = "Desconhecida";

    // Busca IP e Cidade de forma ultra-rápida e segura
    try {
        const response = await fetch("https://ipwho.is/");
        const data = await response.json();
        
        if (data.success) {
            ipUser = data.ip || "Desconhecido";
            localUser = (data.city && data.region) ? `${data.city} - ${data.region}` : "Desconhecida";
        } else {
            // Fallback caso a principal falhe
            const ipFallback = await fetch("https://api.ipify.org?format=json");
            const ipData = await ipFallback.json();
            ipUser = ipData.ip || "Desconhecido";
        }
    } catch (e) {
        console.log("Erro ao buscar IP/Localização:", e);
    }

    // Monta o pacote de dados
    const payload = {
        data_hora: dataHoraCompleta,
        jogo: CURRENT_GAME.title || "Desconhecido",
        jogador_id: obterIdJogador(),
        tempo: "Sessão Iniciada", // Registra o início do acesso instantaneamente
        localizacao: localUser,
        ip: ipUser,
        aparelho: obterAparelho(),
        navegador: obterNavegador()
    };

    // Envia para o Supabase com a página 100% ativa (sem falhas de fechamento)
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
        console.log("Log de acesso registrado com sucesso!");
    } catch (error) {
        console.log("Erro ao enviar log:", error);
    }
}

// =========================================
// CARREGAMENTO E FLUXO DO JOGO
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

        const startBtn = document.getElementById("btnJogar");
        startBtn.addEventListener("click", () => {
            clickSound.play();
            registrarLogAcessoImediato(); // Dispara o envio imediato dos dados (IP, Cidade, Aparelho, Jogo)
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

// Controle da Tela ZERO (Splash Screen ajustada para 5 segundos)
document.addEventListener("DOMContentLoaded", () => {
    const gameScreen = document.getElementById("gameScreen");
    const splashScreen = document.getElementById("splashScreen");
    const scanlines = document.querySelector(".scanlines"); 
    
    if (gameScreen) gameScreen.style.display = "none"; 
    if (splashScreen) splashScreen.style.display = "flex"; 
    if (scanlines) splashScreen.style.display = "block";

    setTimeout(() => {
        if (IS_VALID) { 
            if (splashScreen) splashScreen.style.display = "none"; 
            if (scanlines) splashScreen.style.display = "none"; 
            if (gameScreen) gameScreen.style.display = "flex";   
        }
    }, 5000); // 5 segundos garantidos para carregar em qualquer celular
});

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
