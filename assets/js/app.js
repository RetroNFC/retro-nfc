// =====================================================
// RETRO NFC
// APP
// =====================================================

const PARAMS = new URLSearchParams(window.location.search);

const GAME_KEY = PARAMS.get("k");

let CURRENT_GAME = null;

async function loadGames(){

    const response = await fetch("games.json");

    const games = await response.json();

    CURRENT_GAME = games.find(game=>game.key===GAME_KEY);

    if(!CURRENT_GAME){

        document.getElementById("bootScreen").style.display="none";

        document.getElementById("gameScreen").style.display="none";

        document.getElementById("invalidScreen").style.display="flex";

        return;

    }

    startBoot();

}
