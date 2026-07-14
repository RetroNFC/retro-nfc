const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
const clickSound = new Audio('assets/life.mp3');

async function loadGames() {
    const response = await fetch("games.json?ts=" + Date.now());
    const data = await response.json();
    CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);

    if (!CURRENT_GAME) return;

    // Preenche a capa e infos
    document.getElementById("gameCover").src = CURRENT_GAME.cover;
    document.getElementById("title").innerText = CURRENT_GAME.title;
    document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
    document.getElementById("year").innerText = "Ano: " + CURRENT_GAME.year;
    document.getElementById("players").innerText = "Jogadores: " + CURRENT_GAME.players;
    document.getElementById("developer").innerText = "Desenvolvedora: " + CURRENT_GAME.developer;

    // Botão JOGAR da tela inicial
    document.getElementById("btnJogar").onclick = async () => {
        clickSound.play();
        
        // Tenta Fullscreen
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');

        document.getElementById("gameScreen").style.display = "none";
        document.getElementById("bootScreen").style.display = "flex";
        
        // Inicia o processo de boot
        startBoot(CURRENT_GAME);
    };
}

document.addEventListener("DOMContentLoaded", loadGames);
