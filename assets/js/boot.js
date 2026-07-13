// boot.js
const BOOT_BLOCKS = [
    "□□□□□□□□□□", "■□□□□□□□□□", "■■□□□□□□□□", "■■■□□□□□□□", 
    "■■■■□□□□□□", "■■■■■□□□□□", "■■■■■■□□□□", "■■■■■■■□□□", 
    "■■■■■■■■□□", "■■■■■■■■■□", "■■■■■■■■■■"
];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Função para tentar forçar tela cheia e horizontal
function enterImmersiveMode() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
    
    // Tenta travar em landscape
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {
            console.log("Rotação automática bloqueada pelo navegador.");
        });
    }
}

async function startBoot() {
    // 1. Tenta entrar em modo imersivo logo no começo
    enterImmersiveMode();

    const terminal = document.getElementById("bootTerminal");
    const progressEl = document.getElementById("progressText");
    terminal.innerHTML = "";
    
    const lines = CURRENT_GAME.bootText;
    const totalLines = lines.length;

    for (let i = 0; i < totalLines; i++) {
        const text = lines[i];
        
        // --- TEMPOS MAIS LENTOS (Sentimento de Boot real) ---
        let delay = 800; // Tempo base mais lento
        if (text.includes("VERIFICANDO")) delay = 1200; 
        if (text === "CARTUCHO DETECTADO") delay = 3000; // Suspense total
        if (text === "") delay = 300; 

        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = text;
        
        if (text === "CARTUCHO DETECTADO") {
            line.style.color = "#FFD93D";
            line.style.fontWeight = "700";
        }
        
        terminal.appendChild(line);
        
        // Barra de progresso atualizada pelo progresso real do loop
        const step = Math.floor((i / (totalLines - 1)) * 10);
        progressEl.textContent = BOOT_BLOCKS[step];
        
        await sleep(delay);
    }

    // Delay final para apreciar o "PRONTO PARA JOGAR"
    await sleep(2000);
    window.location.href = CURRENT_GAME.gameUrl;
}
