async function startBoot() {

    const terminal = document.getElementById("bootTerminal");
    const fill = document.getElementById("progressFill");
    const text = document.getElementById("progressText");

    terminal.innerHTML = "";

    const lines = CURRENT_GAME.bootText;

    for (let i = 0; i < lines.length; i++) {

        const div = document.createElement("div");

        div.className = "bootLine";

        terminal.appendChild(div);

        div.textContent = lines[i];

        fill.style.width = ((i + 1) / lines.length * 100) + "%";

        text.textContent = lines[i];

        await sleep(250);

    }

    if (navigator.vibrate) {

        navigator.vibrate(120);

    }

    await sleep(700);

    document.getElementById("bootScreen").style.display = "none";

    document.getElementById("gameScreen").style.display = "flex";

    fillGame();

}

function sleep(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));

}
