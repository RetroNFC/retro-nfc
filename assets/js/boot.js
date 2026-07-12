// ======================================================
// RETRO NFC - BOOT V2
// ======================================================

// Inicializa o áudio
const bootSound = new Audio('assets/life.mp3');

const BOOT_BLOCKS = [
    "□□□□□□□□□□", "■□□□□□□□□□", "■■□□□□□□□□", "■■■□□□□□□□", 
    "■■■■□□□□□□", "■■■■■□□□□□", "■■■■■■□□□□", "■■■■■■■□□□", 
    "■■■■■■■■□□", "■■■■■■■■■□", "■■■■■■■■■■"
];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

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

async function startBoot() {
    const terminal = document.getElementById("bootTerminal");
    terminal.innerHTML = "";
    
    // Tenta desbloquear o áudio no primeiro toque do usuário
    const unlockAudio = () => {
        bootSound.play().then(() => { bootSound.pause(); bootSound.currentTime = 0; });
        document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);

    const lines = CURRENT_GAME.bootText;
    let progress = 0;

    for (const text of lines) {
        createLine(text);

        // Toca o som em cada linha
        bootSound.currentTime = 0;
        bootSound.play().catch(e => console.log("Áudio bloqueado pelo navegador"));

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
    
    // REDIRECIONAMENTO AUTOMÁTICO
    // Após terminar o boot, ele abre direto o link do jogo
    window.location.href = CURRENT_GAME.gameUrl;
}
