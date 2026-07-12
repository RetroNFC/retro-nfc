// ======================================================
// RETRO NFC
// APP
// ======================================================

const PARAMS = new URLSearchParams(window.location.search);

const GAME_KEY = PARAMS.get("k");

let CURRENT_GAME = null;

async function loadGames() {

    try {

        const response = await fetch("games.json?ts=" + Date.now());

        if (!response.ok) {

            throw new Error("Erro ao carregar games.json");

        }

        const games = await response.json();

        CURRENT_GAME = games.find(game => game.key === GAME_KEY);

        if (!CURRENT_GAME) {

            showInvalid();

            return;

        }

        startBoot();

    }

    catch (error) {

        console.error(error);

        showInvalid();

    }

}

function showInvalid() {

    const boot = document.getElementById("bootScreen");
    const game = document.getElementById("gameScreen");
    const invalid = document.getElementById("invalidScreen");

    if (boot) boot.style.display = "none";

    if (game) game.style.display = "none";

    if (invalid) invalid.style.display = "flex";

}

document.addEventListener("DOMContentLoaded", () => {

    loadGames();

});
