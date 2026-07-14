const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
const clickSound = new Audio('assets/life.mp3');

async function loadGames() {
    try {
        console.log("Tentando carregar JSON...");
        const response = await fetch("games.json?ts=" + Date.now());
        const data = await response.json();
        
        // Ajuste: Acessando a lista de jogos dentro do objeto
        CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);
        
        if (!CURRENT_GAME) {
            console.error("Jogo não encontrado com a chave:", GAME_KEY);
            return;
        }

        console.log("Jogo encontrado:", CURRENT_GAME.title);

        // Atualizando os campos - Verifique se estes IDs existem no seu HTML!
        const coverEl = document.getElementById("gameCover");
        const titleEl = document.getElementById("title");
        const subtitleEl = document.getElementById("subtitle");
        const yearEl = document.getElementById("year");
        const playersEl = document.getElementById("players");
        const devEl = document.getElementById("developer");

        if(coverEl) coverEl.src = CURRENT_GAME.cover;
        if(titleEl) titleEl.innerText = CURRENT_GAME.title;
        if(subtitleEl) subtitleEl.innerText = CURRENT_GAME.subtitle;
        if(yearEl) yearEl.innerText = CURRENT_GAME.year;
        if(playersEl) playersEl.innerText = CURRENT_GAME.players;
        if(devEl) devEl.innerText = CURRENT_GAME.developer;

        console.log("Dados aplicados com sucesso!");

    } catch (error) {
        console.error("ERRO CRÍTICO no carregamento:", error);
    }
}

document.addEventListener("DOMContentLoaded", loadGames);
