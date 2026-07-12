// =====================================================
// GAME
// =====================================================

function openGame(){

    document.getElementById("bootScreen").style.display="none";

    document.getElementById("gameScreen").style.display="flex";

    document.getElementById("cover").src=CURRENT_GAME.cover;

    document.getElementById("title").textContent=CURRENT_GAME.title;

    document.getElementById("subtitle").textContent=CURRENT_GAME.subtitle;

    document.getElementById("description").textContent=CURRENT_GAME.description;

    document.getElementById("year").textContent=CURRENT_GAME.year;

    document.getElementById("players").textContent=CURRENT_GAME.players;

    document.getElementById("developer").textContent=CURRENT_GAME.developer;

}

document.getElementById("startButton").onclick=()=>{

    window.location.href=CURRENT_GAME.launchUrl;

};

window.onload=loadGames;
