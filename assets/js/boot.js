let isBooting = false; // Trava de segurança para evitar duplicidade

const BOOT_BLOCKS = [
    "□□□□□□□□□□", "■□□□□□□□□□", "■■□□□□□□□□", "■■■□□□□□□□", 
    "■■■■□□□□□□", "■■■■■□□□□□", "■■■■■■□□□□", "■■■■■■■□□□", 
    "■■■■■■■■□□", "■■■■■■■■■□", "■■■■■■■■■■"
];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function startBoot() {
    // Se já estiver rodando, ignora novos cliques
    if (isBooting) return;
    isBooting = true;

    const som = document.getElementById("bootSound");
    if (som) {
        som.play().catch(erro => console.log("Áudio bloqueado pelo navegador:", erro));
    }

    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("bootScreen").style.display = "flex";

    const terminal = document.getElementById("bootTerminal");
    const progressEl = document.getElementById("progressText");
    
    terminal.innerHTML = ""; // Limpa a tela antes de começar
    progressEl.textContent = BOOT_BLOCKS[0];
    
    // Lê as frases diretamente do seu JSON
    const bootLines = (typeof CURRENT_GAME !== 'undefined' && CURRENT_GAME.config && CURRENT_GAME.config.bootText) 
        ? CURRENT_GAME.config.bootText 
        : ["CARREGANDO..."];

    // Loop que imprime apenas as frases do JSON, uma vez cada
    for (let i = 0; i < bootLines.length; i++) {
        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = bootLines[i];
        terminal.appendChild(line);
        
        // Atualiza a barrinha conforme o progresso
        if (BOOT_BLOCKS[i + 1]) {
            progressEl.textContent = BOOT_BLOCKS[i + 1];
        }
        await sleep(600); 
    }

    // Exibe o título do jogo no final
    const gameLine = document.createElement("div");
    gameLine.className = "bootLine";
    gameLine.textContent = (typeof CURRENT_GAME !== 'undefined' && CURRENT_GAME.title) ? CURRENT_GAME.title : "Iniciando...";
    gameLine.style.color = "#FFD93D";
    gameLine.style.fontSize = "14px";
    gameLine.style.marginTop = "15px";
    gameLine.style.fontWeight = "bold";
    terminal.appendChild(gameLine);

    await sleep(300);
    progressEl.textContent = BOOT_BLOCKS[8];
    await sleep(300);
    progressEl.textContent = BOOT_BLOCKS[9];
    await sleep(300);
    progressEl.textContent = BOOT_BLOCKS[10]; 

    await sleep(1000);
    
    // --- INTEGRAÇÃO EMULATORJS ---
    
    document.getElementById("bootScreen").style.display = "none";
    document.getElementById("emulatorScreen").style.display = "block";
    
    document.body.style.padding = "0";
    document.body.style.backgroundColor = "#000000";

    if (typeof CURRENT_GAME !== 'undefined') {
        window.EJS_player = '#game';
        window.EJS_core = CURRENT_GAME.core; 
        window.EJS_gameUrl = CURRENT_GAME.romUrl; 
        window.EJS_pathtodata = 'https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@main/data/';
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@main/data/loader.js';
        document.body.appendChild(script);
    } else {
        console.error("Jogo não encontrado para carregar o emulador.");
    }
}
