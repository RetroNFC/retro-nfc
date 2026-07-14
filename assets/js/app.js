const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
const clickSound = new Audio('assets/life.mp3');

async function loadGames() {
    try {
        const response = await fetch("games.json?ts=" + Date.now());
        const data = await response.json();
        
        // CORREÇÃO: Acessando a lista de jogos dentro da chave "games"
        CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);
        
        if (!CURRENT_GAME) {
            console.error("ERRO: Jogo não encontrado para a chave:", GAME_KEY);
            return;
        }

        // Preenchendo os dados
        document.getElementById("gameCover").src = CURRENT_GAME.cover;
        document.getElementById("title").innerText = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("year").innerText = "Ano: " + CURRENT_GAME.year;
        document.getElementById("players").innerText = "Jogadores: " + CURRENT_GAME.players;
        document.getElementById("developer").innerText = "Desenvolvedora: " + CURRENT_GAME.developer;

        console.log("Sucesso: Dados carregados!");

    } catch (error) {
        console.error("ERRO CRÍTICO no carregamento:", error);
    }
}

// Quando o documento estiver pronto, carrega os jogos
document.addEventListener("DOMContentLoaded", loadGames);
