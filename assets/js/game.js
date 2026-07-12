// =====================================================
// RETRO NFC
// GAME
// =====================================================

function fillGame() {

    if (!CURRENT_GAME) return;

    document.title = CURRENT_GAME.title + " | Retrô NFC";

    const cover = document.getElementById("cover");
    const title = document.getElementById("title");
    const subtitle = document.getElementById("subtitle");
    const description = document.getElementById("description");
    const year = document.getElementById("year");
    const players = document.getElementById("players");
    const developer = document.getElementById("developer");

    cover.onload = () => {

    cover.style.opacity = "1";

};

cover.onerror = () => {

    console.log("Erro ao carregar capa:", CURRENT_GAME.cover);

};

cover.src = CURRENT_GAME.cover;
    cover.alt = CURRENT_GAME.title;

    title.textContent = CURRENT_GAME.title;
    subtitle.textContent = CURRENT_GAME.subtitle;
    description.textContent = CURRENT_GAME.description;

    year.textContent = CURRENT_GAME.year;
    players.textContent = CURRENT_GAME.players;
    developer.textContent = CURRENT_GAME.developer;

    applyTheme();

}

function applyTheme() {

    if (!CURRENT_GAME.theme) return;

    document.documentElement.style.setProperty(
        "--purple",
        CURRENT_GAME.theme
    );

}

function launchGame() {

    if (!CURRENT_GAME) return;

    const button = document.getElementById("startButton");

    button.disabled = true;

    button.textContent = "INICIANDO JOGO...";

    document.body.style.transition = "opacity .4s";
    
    document.body.style.opacity = "0";
    
    setTimeout(()=>{

    document.body.style.transition="all .4s";

    document.body.style.opacity="0";

},150);

setTimeout(()=>{

    window.location.href=CURRENT_GAME.gameUrl;

},650);

}

document
    .getElementById("startButton")
    .addEventListener("click", launchGame);
