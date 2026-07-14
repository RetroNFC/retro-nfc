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

// ... dentro da função loadGames, após preencher os dados:

// Removemos aquele "document.body.addEventListener" que estava pegando a tela toda
// E colocamos o listener apenas no botão:

const startBtn = document.getElementById("btnJogar");
startBtn.addEventListener("click", async () => {
    
    // 1. Forçar Fullscreen e Paisagem (só funciona no clique!)
    try {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
        }
    } catch (e) {
        console.log("Navegador bloqueou fullscreen/orientação automática");
    }

    // 2. Tocar som e iniciar o boot
    clickSound.play();
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("bootScreen").style.display = "flex";
    
    // Chama a função do boot.js
    startBoot();
});
