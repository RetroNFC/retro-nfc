let isBooting = false; // Trava de segurança para não rodar o boot duas vezes

const BOOT_BLOCKS = [
    "□□□□□□□□□□", "■□□□□□□□□□", "■■□□□□□□□□", "■■■□□□□□□□", 
    "■■■■□□□□□□", "■■■■■□□□□□", "■■■■■■□□□□", "■■■■■■■□□□", 
    "■■■■■■■■□□", "■■■■■■■■■□", "■■■■■■■■■■"
];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function startBoot() {
    if (isBooting) return;
    isBooting = true;

    const som = document.getElementById("bootSound");
    if (som) {
        som.play().catch(erro => console.log("Áudio bloqueado pelo navegador", erro));
    }

    document.getElementById("splashScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("bootScreen").style.display = "flex";

    const terminal = document.getElementById("bootTerminal");
    const progressEl = document.getElementById("progressText");
    
    terminal.innerHTML = "";
    progressEl.textContent = BOOT_BLOCKS[0];
    
    const etapas = [
        "VERIFICANDO CARTUCHO...",
        "LENDO TAG NFC...",
        "CARTUCHO VERIFICADO..."
    ];

    for (let i = 0; i < etapas.length; i++) {
        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = etapas[i];
        terminal.appendChild(line);
        
        const progressIndex = Math.floor(((i + 1) / etapas.length) * (BOOT_BLOCKS.length - 1));
        progressEl.textContent = BOOT_BLOCKS[progressIndex];
        
        try {
            if (navigator.vibrate) {
                if (i === 0) navigator.vibrate(30);
                if (i === 1) navigator.vibrate([40, 60, 40]);
                if (i === 2) navigator.vibrate(150);
            }
        } catch(e) {}
        
        await sleep(1000);
    }

    const doneLine = document.createElement("div");
    doneLine.className = "bootLine";
    doneLine.style.marginTop = "15px";
    doneLine.textContent = "INICIANDO JOGO!";
    terminal.appendChild(doneLine);

    progressEl.textContent = BOOT_BLOCKS[BOOT_BLOCKS.length - 1];

    if (navigator.vibrate) {
        try { navigator.vibrate(80); } catch(e) {}
    }

    await sleep(1500); 
    
    document.getElementById("bootScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "flex";
}
