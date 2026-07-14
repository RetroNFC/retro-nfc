const PARAMS = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");

document.addEventListener("DOMContentLoaded", async () => {
    const response = await fetch("games.json?ts=" + Date.now());
    const data = await response.json();
    const game = data.games.find(g => g.key === GAME_KEY);

    if (!game) return;

    // Preenche as infos (mantenha os IDs do seu HTML)
    document.getElementById("gameCover").src = game.cover;
    document.getElementById("title").innerText = game.title;

    // Botão Jogar
    document.getElementById("btnJogar").onclick = () => {
        // Apenas troca de tela, sem forçar nada no navegador
        document.getElementById("gameScreen").style.display = "none";
        document.getElementById("bootScreen").style.display = "block";
        
        startBoot(game);
    };
});
