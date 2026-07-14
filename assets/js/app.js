const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
const clickSound = new Audio('assets/life.mp3');

async function loadGames() {
    try {
        const response = await fetch("games.json?ts=" + Date.now());
        const data = await response.json();
        
        CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);
        
        if (!CURRENT_GAME) {
            alert("Erro: Jogo não encontrado!");
            return;
        }

        // Preenche os dados visuais
        document.getElementById("gameCover").src = CURRENT_GAME.cover;
        document.getElementById("title").innerText = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("year").innerText = "Ano: " + CURRENT_GAME.year;
        document.getElementById("players").innerText = "Jogadores: " + CURRENT_GAME.players;
        document.getElementById("developer").innerText = "Desenvolvedora: " + CURRENT_GAME.developer;

        // Configura o botão para iniciar
        const btnJogar = document.getElementById("btnJogar");
        btnJogar.onclick = async () => {
            clickSound.play();
            
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
                if (screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock('landscape');
                }
            } catch (e) {
                console.log("Modo tela cheia ativado");
            }

            document.getElementById("gameScreen").style.display = "none";
            document.getElementById("bootScreen").style.display = "flex";
            
            // AQUI ESTÁ O SEGREDO: Enviamos o CURRENT_GAME para o boot
            if (typeof startBoot === 'function') {
                startBoot(CURRENT_GAME); 
            }
        };

    } catch (error) {
        console.error("Erro ao carregar:", error);
    }
}

document.addEventListener("DOMContentLoaded", loadGames);
