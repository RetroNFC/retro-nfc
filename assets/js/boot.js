// boot.js
const BOOT_BLOCKS = [
    "□□□□□□□□□□", "■□□□□□□□□□", "■■□□□□□□□□", "■■■□□□□□□□", 
    "■■■■□□□□□□", "■■■■■□□□□□", "■■■■■■□□□□", "■■■■■■■□□□", 
    "■■■■■■■■□□", "■■■■■■■■■□", "■■■■■■■■■■"
];

const bootSound = new Audio('assets/life.mp3');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function startBoot() {
    const terminal = document.getElementById("bootTerminal");
    const progressEl = document.getElementById("progressText");
    terminal.innerHTML = "";
    
    const totalLines = CURRENT_GAME.bootText.length;

    for (let i = 0; i < totalLines; i++) {
        const text = CURRENT_GAME.bootText[i];
        
        // Cria e adiciona a linha
        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = text;
        
        if (text === "CARTUCHO DETECTADO") {
            line.style.color = "#FFD93D";
            line.style.fontWeight = "700";
        }
        
        terminal.appendChild(line);
        
        // Toca o som a cada linha
        bootSound.currentTime = 0;
        bootSound.play();
        
        // Atualiza a barra de progresso dinamicamente
        const progressPercentage = Math.floor((i / (totalLines - 1)) * 10);
        progressEl.textContent = BOOT_BLOCKS[progressPercentage];
        
        // Delay (Mais lento no cartucho detectado)
        await sleep(text === "CARTUCHO DETECTADO" ? 1000 : 250);
    }

    await sleep(800);
    window.location.href = CURRENT_GAME.gameUrl;
}
