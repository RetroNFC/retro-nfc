// boot.js
const BOOT_BLOCKS = [
    "□□□□□□□□□□", "■□□□□□□□□□", "■■□□□□□□□□", "■■■□□□□□□□", 
    "■■■■□□□□□□", "■■■■■□□□□□", "■■■■■■□□□□", "■■■■■■■□□□", 
    "■■■■■■■■□□", "■■■■■■■■■□", "■■■■■■■■■■"
];

const bootSound = new Audio('assets/life.mp3');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function updateProgress(step) {
    const text = document.getElementById("progressText");
    if (text) {
        text.textContent = BOOT_BLOCKS[Math.min(step, BOOT_BLOCKS.length - 1)];
    }
}

async function startBoot() {
    const terminal = document.getElementById("bootTerminal");
    terminal.innerHTML = "";
    
    // Tenta tocar o som
    bootSound.play().catch(e => console.log("Áudio aguardando interação"));

    let progress = 0;

    for (const text of CURRENT_GAME.bootText) {
        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = text;
        
        if (text === "CARTUCHO DETECTADO") {
            line.style.color = "#FFD93D";
            line.style.fontWeight = "700";
        }
        
        terminal.appendChild(line);
        
        // Efeito Sonoro
        bootSound.currentTime = 0;
        bootSound.play();
        
        // Atualiza Barra
        if (progress < BOOT_BLOCKS.length - 1) {
            progress++;
            updateProgress(progress);
        }
        
        await sleep(text === "CARTUCHO DETECTADO" ? 600 : 140);
    }

    await sleep(800);
    window.location.href = CURRENT_GAME.gameUrl; // Redireciona
}
