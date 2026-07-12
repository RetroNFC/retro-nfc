// app.js
const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;

async function loadGames() {
    try {
        const response = await fetch("games.json?ts=" + Date.now());
        const games = await response.json();
        CURRENT_GAME = games.find(game => game.key === GAME_KEY);
        
        if (!CURRENT_GAME) {
            showInvalid();
            return;
        }
        
        // APENAS RENDERIZA A TELA, NÃO INICIA O BOOT
        renderGameScreen(CURRENT_GAME);
        
    } catch (error) {
        showInvalid();
    }
}

function renderGameScreen(game) {
    // Aqui você preenche o HTML com os dados do jogo (título, capa, etc)
    document.getElementById("gameTitle").innerText = game.title;
    document.getElementById("gameSubtitle").innerText = game.subtitle;
    // Vincula o evento ao botão APÓS renderizar
    const startBtn = document.getElementById("startButton");
    if (startBtn) {
        startBtn.onclick = () => {
            // Esconde a tela de apresentação e começa o boot
            document.getElementById("gameScreen").style.display = "none";
            document.getElementById("bootScreen").style.display = "flex";
            startBoot(); 
        };
    }
}

document.addEventListener("DOMContentLoaded", loadGames);
