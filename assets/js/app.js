const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
const clickSound = new Audio('assets/life.mp3');

async function loadGames() {
    const response = await fetch("games.json?ts=" + Date.now());
    const data = await response.json();
    CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);

    if (!CURRENT_GAME) return;

    document.getElementById("gameCover").src = CURRENT_GAME.cover;
    document.getElementById("title").innerText = CURRENT_GAME.title;
    document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
    document.getElementById("year").innerText = "Ano: " + CURRENT_GAME.year;
    document.getElementById("players").innerText = "Jogadores: " + CURRENT_GAME.players;
    document.getElementById("developer").innerText = "Desenvolvedora: " + CURRENT_GAME.developer;

    document.getElementById("btnJogar").onclick = () => {
        clickSound.play();
        
        // Removemos as funções de fullscreen e orientação daqui
        document.getElementById("gameScreen").style.display = "none";
        document.getElementById("bootScreen").style.display = "flex";
        
        // Iniciamos o boot
        startBoot(CURRENT_GAME);
    };
}

document.addEventListener("DOMContentLoaded", loadGames);
