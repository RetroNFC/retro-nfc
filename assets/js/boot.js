// ======================================================
// RETRO NFC - BOOT V2
// ======================================================

const BOOT_BLOCKS = [
    "□□□□□□□□□□", "■□□□□□□□□□", "■■□□□□□□□□", "■■■□□□□□□□", 
    "■■■■□□□□□□", "■■■■■□□□□□", "■■■■■■□□□□", "■■■■■■■□□□", 
    "■■■■■■■■□□", "■■■■■■■■■□", "■■■■■■■■■■"
];

// Carrega o áudio
const bootSound = new Audio('assets/life.mp3');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createLine(text) {
    const terminal = document.getElementById("bootTerminal");
    const line = document.createElement("div");
    line.className = "bootLine";
    line.textContent = text;
    
    if (text === "CARTUCHO DETECTADO") {
        line.style.color = "#FFD93D";
        line.style.fontWeight = "700";
        line.style.textShadow = "0 0 18px #FFD93D";
    }
    
    line.style.opacity = "0";
    line.style.transform = "translateY(8px)";
    terminal.appendChild(line);
    
    requestAnimationFrame(() => {
        line.style.transition = "all .25s";
        line.style.opacity = "1";
        line.style.transform = "translateY(0)";
    });
}

function updateProgress(step) {
    const text = document.getElementById("progressText");
    if (text) {
        text.textContent = BOOT_BLOCKS[Math.min(step, BOOT_BLOCKS.length - 1)];
    }
}

// Esta função deve ser chamada quando o usuário clica no botão "JOGAR"
async function startBoot() {
    const terminal = document.getElementById("bootTerminal");
    terminal.innerHTML = "";
    
    // Toca o som (o clique no botão já libera o áudio no navegador)
    bootSound.play().catch(e => console.log("Áudio bloqueado"));

    const lines = CURRENT_GAME.bootText;
    let progress = 0;

    for (const text of lines) {
        createLine(text);

        // Toca o efeito a cada linha
        bootSound.currentTime = 0;
        bootSound.play();

        if (progress < BOOT_BLOCKS.length - 1) {
            progress++;
            updateProgress(progress);
        }

        if (text === "CARTUCHO DETECTADO") {
            if (navigator.vibrate) navigator.vibrate([80, 60, 120]);
            await sleep(350);
        }

        await sleep(text === "CARTUCHO DETECTADO" ? 600 : 140);
    }

    await sleep(500);
    await startTransition();
    
    // REDIRECIONAMENTO AUTOMÁTICO
    window.location.href = CURRENT_GAME.gameUrl;
}

// =====================================================
// TRANSIÇÃO FINAL
// =====================================================
async function startTransition() {
    const boot = document.getElementById("bootScreen");
    const game = document.getElementById("gameScreen");
    
    // Flash branco
    const flash = document.createElement("div");
    flash.style.position = "fixed";
    flash.style.left = "0";
    flash.style.top = "0";
    flash.style.width = "100vw";
    flash.style.height = "100vh";
    flash.style.background = "#FFFFFF";
    flash.style.opacity = "0";
    flash.style.pointerEvents = "none";
    flash.style.zIndex = "9999";
    flash.style.transition = "opacity .12s";

    document.body.appendChild(flash);
    await sleep(50);
    flash.style.opacity = "1";
    await sleep(120);
    flash.style.opacity = "0";
    await sleep(180);
    flash.remove();

    boot.style.display = "none";
}

// Vincula o botão "JOGAR" ao startBoot
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("startButton");
    if(btn) {
        btn.addEventListener("click", startBoot);
    }
});
