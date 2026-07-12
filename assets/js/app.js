// app.js
const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
const clickSound = new Audio('assets/life.mp3'); // Som do clique

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

        document.getElementById("cover").src = CURRENT_GAME.cover;
        document.getElementById("title").innerText = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("year").innerText = CURRENT_GAME.year;
        document.getElementById("players").innerText = CURRENT_GAME.players;
        document.getElementById("developer").innerText = CURRENT_GAME.developer;
        // DESCRIÇÃO REMOVIDA

        const startBtn = document.getElementById("startButton");
        startBtn.addEventListener("click", () => {
            // Toca o som no momento do clique
            clickSound.play();
            
            document.getElementById("gameScreen").style.display = "none";
            document.getElementById("bootScreen").style.display = "flex";
            startBoot(); 
        });

    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

document.addEventListener("DOMContentLoaded", loadGames);
