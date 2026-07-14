const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
const clickSound = new Audio('assets/life.mp3'); 

async function loadGames() {
    try {
        const response = await fetch("games.json?ts=" + Date.now());
        const data = await response.json(); // "data" agora recebe o objeto completo
        
        // Acessamos "data.games" para encontrar o jogo dentro da lista
        CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);
        
        if (!CURRENT_GAME) {
            document.getElementById("gameScreen").style.display = "none";
            document.getElementById("invalidScreen").style.display = "flex";
            return;
        }

        // Atualizando os elementos da tela com base nos IDs do seu HTML
        document.getElementById("gameCover").src = CURRENT_GAME.cover;
        document.getElementById("title").innerText = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("year").innerText = CURRENT_GAME.year;
        document.getElementById("players").innerText = CURRENT_GAME.players;
        document.getElementById("developer").innerText = CURRENT_GAME.developer;

        const startBtn = document.getElementById("btnJogar");
        startBtn.addEventListener("click", () => {
            clickSound.play();
            // A função startBoot() está no seu boot.js
            startBoot();
        });

    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

document.addEventListener("DOMContentLoaded", loadGames);
