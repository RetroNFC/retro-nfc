const BOOT_BLOCKS = [
    "□□□□□□□□□□", "■□□□□□□□□□", "■■□□□□□□□□", "■■■□□□□□□□", 
    "■■■■□□□□□□", "■■■■■□□□□□", "■■■■■■□□□□", "■■■■■■■□□□", 
    "■■■■■■■■□□", "■■■■■■■■■□", "■■■■■■■■■■"
];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function startBoot() {
    const terminal = document.getElementById("bootTerminal");
    const progressEl = document.getElementById("progressText");
    terminal.innerHTML = "";
    
    const lines = CURRENT_GAME.bootText;
    const totalLines = lines.length;

    for (let i = 0; i < totalLines; i++) {
        const text = lines[i];
        
        // --- LÓGICA DE TEMPO (O "Sentimento" de boot) ---
        let delay = 300; // padrão
        if (text.includes("VERIFICANDO")) delay = 600;
        if (text === "CARTUCHO DETECTADO") delay = 1500;
        if (text === "") delay = 100; // linhas vazias passam rápido

        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = text;
        
        if (text === "CARTUCHO DETECTADO") {
            line.style.color = "#FFD93D";
            line.style.fontWeight = "700";
        }
        
        terminal.appendChild(line);
        
        // --- BARRA DE PROGRESSO ---
        // Calcula quanto da barra deve estar preenchido
        const step = Math.floor((i / (totalLines - 1)) * 10);
        progressEl.textContent = BOOT_BLOCKS[step];
        
        // Aguarda o tempo calculado
        await sleep(delay);
    }

    // Delay final após o "PRONTO PARA JOGAR" para o usuário ver
    await sleep(1000);
    window.location.href = CURRENT_GAME.gameUrl;
}
