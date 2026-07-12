// =======================================================
// RETRO NFC
// BOOT SYSTEM
// =======================================================

const bootDelay = 700;

async function startBoot() {

    const lines = CURRENT_GAME.bootText;

    const progress = document.getElementById("progressFill");

    const progressText = document.getElementById("progressText");

    progress.style.width = "0%";

    for (let i = 0; i < lines.length; i++) {

        const element = document.getElementById("boot" + (i + 1));

        if (element) {

            element.textContent = lines[i];

            element.style.opacity = "1";

        }

        const percent = Math.round(((i + 1) / lines.length) * 100);

        progress.style.width = percent + "%";

        progressText.textContent = percent + "%";

        await sleep(bootDelay);

    }

    await sleep(900);

    showGame();

}

function showGame() {

    document.getElementById("bootScreen").style.display = "none";

    document.getElementById("gameScreen").style.display = "flex";

    fillGame();

}

function sleep(ms) {

    return new Promise(resolve => {

        setTimeout(resolve, ms);

    });

}
