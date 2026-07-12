const BOOT_BLOCKS = ["□□□□□□□□□□", "■□□□□□□□□□", "■■□□□□□□□□", "■■■□□□□□□□", "■■■■□□□□□□", "■■■■■□□□□□", "■■■■■■□□□□", "■■■■■■■□□□", "■■■■■■■■□□", "■■■■■■■■■□", "■■■■■■■■■■"];
const bootSound = new Audio('assets/life.mp3');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function startBoot() {
    const terminal = document.getElementById("bootTerminal");
    terminal.innerHTML = "";
    
    // Toca o som (o clique no botão já autorizou)
    bootSound.play();

    for (const text of CURRENT_GAME.bootText) {
        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = text;
        if (text === "CARTUCHO DETECTADO") {
            line.style.color = "#FFD93D";
            line.style.fontWeight = "700";
        }
        terminal.appendChild(line);
        
        bootSound.currentTime = 0;
        bootSound.play();
        
        await sleep(text === "CARTUCHO DETECTADO" ? 600 : 140);
    }

    await sleep(500);
    window.location.href = CURRENT_GAME.gameUrl;
}
