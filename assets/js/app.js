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
            document.getElementById("gameScreen").style.display = "none";
            document.getElementById("invalidScreen").style.display = "flex";
            return;
        }

        // Preenche as informações
        document.getElementById("gameCover").src = CURRENT_GAME.cover;
        document.getElementById("title").innerText = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("year").innerText = "Ano: " + CURRENT_GAME.year;
        document.getElementById("players").innerText = "Jogadores: " + CURRENT_GAME.players;
        document.getElementById("developer").innerText = "Desenvolvedora: " + CURRENT_GAME.developer;

        // Configura o botão
        const btnJogar = document.getElementById("btnJogar");
        
        // Remove listeners antigos se houver
        btnJogar.onclick = null; 
        
        btnJogar.addEventListener("click", async () => {
            clickSound.play();
            
            // Força Fullscreen (O navegador só deixa se for dentro deste clique)
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
                if (screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock('landscape');
                }
            } catch (e) {
                console.log("Modo tela cheia não suportado pelo navegador");
            }

            document.getElementById("gameScreen").style.display = "none";
            document.getElementById("bootScreen").style.display = "flex";
            
            if (typeof startBoot === 'function') {
                startBoot();
            } else {
                console.error("Função startBoot não encontrada!");
            }
        });

    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

document.addEventListener("DOMContentLoaded", loadGames);
