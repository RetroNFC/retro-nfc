const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
let IS_VALID = false; 
const clickSound = new Audio('assets/life.mp3'); 

async function loadGames() {
    try {
        // Se o usuário acessar totalmente sem o parâmetro 'k'
        if (!GAME_KEY) {
            mostrarTelaErro();
            return;
        }

        const response = await fetch("games.json?ts=" + Date.now());
        const data = await response.json(); 
        
        // Procura o jogo correspondente à chave da URL no JSON
        CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);
        
        if (!CURRENT_GAME) {
            // SE A CHAVE NÃO EXISTE NO JSON (Cartucho Inválido)
            mostrarTelaErro();
            return;
        }

        // SE O JOGO FOR VERDADEIRO:
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
            startBoot();
        });

    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        mostrarTelaErro();
    }
}

function mostrarTelaErro() {
    IS_VALID = false;
    
    // Esconde todas as outras telas possíveis
    const splash = document.getElementById("splashScreen");
    const gameScreen = document.getElementById("gameScreen");
    const scanlines = document.querySelector(".scanlines"); 
    
    if (splash) splash.style.display = "none";
    if (gameScreen) gameScreen.style.display = "none";
    if (scanlines) scanlines.style.display = "none";
    
    // Mostra a tela de erro em tela cheia absoluta
    const invalidScreen = document.getElementById("invalidScreen");
    if (invalidScreen) {
        invalidScreen.style.display = "block";
    }
}

document.addEventListener("DOMContentLoaded", loadGames);

// Controle da Splash Screen de 4 segundos
document.addEventListener("DOMContentLoaded", () => {
    const gameScreen = document.getElementById("gameScreen");
    const splashScreen = document.getElementById("splashScreen");
    const scanlines = document.querySelector(".scanlines"); 
    
    // Estado inicial
    if (gameScreen) gameScreen.style.display = "none"; 
    if (splashScreen) splashScreen.style.display = "flex"; 
    if (scanlines) scanlines.style.display = "block";

    setTimeout(() => {
        // Só transita para a tela do jogo se o cartucho for válido
        if (IS_VALID) { 
            if (splashScreen) splashScreen.style.display = "none"; 
            if (scanlines) scanlines.style.display = "none"; 
            if (gameScreen) gameScreen.style.display = "flex";   
        }
    }, 4000);
});
