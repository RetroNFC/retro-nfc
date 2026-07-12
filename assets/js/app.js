const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;

async function loadGames() {
    try {
        const response = await fetch("games.json?ts=" + Date.now());
        const games = await response.json();
        CURRENT_GAME = games.find(game => game.key === GAME_KEY);
        
        if (!CURRENT_GAME) {
            document.getElementById("gameScreen").style.display = "none";
            document.getElementById("invalidScreen").style.display = "flex";
            return;
        }

        // Preencher informações do Jogo
        document.getElementById("cover").src = CURRENT_GAME.image; // Assumindo que seu JSON tem o campo 'image'
        document.getElementById("title").innerText = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("year").innerText = CURRENT_GAME.year;
        document.getElementById("players").innerText = CURRENT_GAME.players;
        document.getElementById("developer").innerText = CURRENT_GAME.developer;
        document.getElementById("description").innerText = CURRENT_GAME.description;

        // Configurar o botão
        const startBtn = document.getElementById("startButton");
        startBtn.addEventListener("click", () => {
            document.getElementById("gameScreen").style.display = "none";
            document.getElementById("bootScreen").style.display = "flex";
            startBoot(); // Função vinda do boot.js
        });

    } catch (error) {
        console.error("Erro ao carregar jogo:", error);
    }
}

document.addEventListener("DOMContentLoaded", loadGames);
