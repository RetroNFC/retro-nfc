// app.js

async function loadGames() {
    try {
        const response = await fetch("games.json?ts=" + Date.now());
        const data = await response.json();
        
        CURRENT_GAME = data.games.find(game => game.key === GAME_KEY);
        
        // ... (seu código de validar se o jogo existe continua aqui)

        // Preenche os dados
        document.getElementById("gameCover").src = CURRENT_GAME.cover;
        document.getElementById("title").innerText = CURRENT_GAME.title;

        // NÃO temos mais o botão, então vamos criar um ouvinte na tela toda
        document.body.addEventListener("click", iniciarSistema, { once: true });
        
    } catch (error) {
        console.error("Erro:", error);
    }
}

async function iniciarSistema() {
    // 1. Fullscreen e Landscape (Só funcionam porque o usuário clicou na tela)
    try {
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } catch (e) { console.log("Bloqueado pelo navegador"); }

    // 2. Som e Boot
    clickSound.play();
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("bootScreen").style.display = "flex";
    
    startBoot();
}
