const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
let IS_VALID = false; // Criamos essa trava para avisar o sistema se o jogo existe
const clickSound = new Audio('assets/life.mp3'); 

async function loadGames() {
    try {
        const response = await fetch("games.json?ts=" + Date.now());
        const data = await response.json(); 
        
        CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);
        
        if (!CURRENT_GAME) {
            // SE DER ERRO: Avisa o sistema que é falso e mostra a imagem!
            IS_VALID = false;
            document.getElementById("splashScreen").style.display = "none";
            const scanlines = document.querySelector(".scanlines"); 
            if (scanlines) scanlines.style.display = "none";
            document.getElementById("gameScreen").style.display = "none";
            
            document.getElementById("invalidScreen").style.display = "flex";
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
    }
}

document.addEventListener("DOMContentLoaded", loadGames);

// Esconde a tela do jogo imediatamente e controla a Splash Screen
document.addEventListener("DOMContentLoaded", () => {
    const gameScreen = document.getElementById("gameScreen");
    const splashScreen = document.getElementById("splashScreen");
    const scanlines = document.querySelector(".scanlines"); 
    
    // Estado inicial: Jogo escondido, Splash e Scanlines aparecendo
    gameScreen.style.display = "none"; 
    splashScreen.style.display = "flex"; 
    if (scanlines) scanlines.style.display = "block";

    // Exatos 5 segundos depois... a troca acontece (SÓ SE FOR VERDADEIRO)
    setTimeout(() => {
        if (IS_VALID) { // A trava em ação!
            splashScreen.style.display = "none"; 
            if (scanlines) scanlines.style.display = "none"; 
            gameScreen.style.display = "flex";   
        }
    }, 5000);
});
