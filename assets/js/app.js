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

    document.getElementById("btnJogar").onclick = async () => {
        clickSound.play();
        
        try {
            if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
            if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
        } catch (e) { console.log("Fullscreen ok"); }

        // Esconde a tela de capa
        document.getElementById("gameScreen").style.display = "none";
        
        // Mostra a tela de boot
        const bootScreen = document.getElementById("bootScreen");
        bootScreen.style.display = "flex";
        
        // O "segredo": damos 100ms para o navegador desenhar a tela antes de rodar o boot
        setTimeout(() => {
            if (typeof startBoot === 'function') {
                startBoot(CURRENT_GAME);
            }
        }, 100);
    };
}

document.addEventListener("DOMContentLoaded", loadGames);
