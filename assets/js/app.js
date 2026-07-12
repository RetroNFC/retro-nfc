const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;

async function loadGames() {
    try {
        const response = await fetch("games.json?ts=" + Date.now());
        const games = await response.json();
        CURRENT_GAME = games.find(game => game.key === GAME_KEY);
        
        if (!CURRENT_GAME) {
            document.getElementById("invalidScreen").style.display = "flex";
            return;
        }

        // Preencher dados na tela
        document.getElementById("title").innerText = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("description").innerText = CURRENT_GAME.description;
        document.getElementById("gameImage").src = CURRENT_GAME.image;

        // Configurar Botão
        const btn = document.getElementById("startButton");
        btn.addEventListener("click", () => {
            document.getElementById("gameScreen").style.display = "none";
            document.getElementById("bootScreen").style.display = "flex";
            startBoot(); // Chama a função do boot.js
        });

    } catch (error) {
        console.error(error);
    }
}

document.addEventListener("DOMContentLoaded", loadGames);
