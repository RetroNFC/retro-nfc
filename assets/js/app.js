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

        document.getElementById("gameCover").src = CURRENT_GAME.cover;
        document.getElementById("title").innerText = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("year").innerText = "Ano: " + CURRENT_GAME.year;
        document.getElementById("players").innerText = "Jogadores: " + CURRENT_GAME.players;
        document.getElementById("developer").innerText = "Desenvolvedora: " + CURRENT_GAME.developer;

        // Configuração do botão
        const btnJogar = document.getElementById("btnJogar");
        btnJogar.onclick = async () => {
            try {
                clickSound.play();
                
                // Forçar tela cheia
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
                if (screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock('landscape');
                }

                document.getElementById("gameScreen").style.display = "none";
                document.getElementById("bootScreen").style.display = "flex";
                
                // Chamada segura da função boot
                if (typeof startBoot === 'function') {
                    startBoot();
                } else {
                    alert("Erro: A função startBoot não foi carregada no boot.js");
                }
            } catch (err) {
                alert("Erro ao iniciar: " + err.message);
            }
        };

    } catch (error) {
        alert("Erro crítico no app.js: " + error.message);
    }
}

document.addEventListener("DOMContentLoaded", loadGames);
