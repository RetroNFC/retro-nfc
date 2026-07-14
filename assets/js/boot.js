const BOOT_BLOCKS = [
    "□□□□□□□□□□", "■□□□□□□□□□", "■■□□□□□□□□", "■■■□□□□□□□", 
    "■■■■□□□□□□", "■■■■■□□□□□", "■■■■■■□□□□", "■■■■■■■□□□", 
    "■■■■■■■■□□", "■■■■■■■■■□", "■■■■■■■■■■"
];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function startBoot() {
    // 1. TOCA O SOM DO BOOT ASSIM QUE CLICAR
    const som = document.getElementById("bootSound");
    if (som) {
        // O .catch evita que o código quebre caso o navegador bloqueie o áudio por algum motivo
        som.play().catch(erro => console.log("Áudio bloqueado pelo navegador:", erro));
    }

    // 2. Esconde a interface do jogo e mostra a tela preta de boot
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("bootScreen").style.display = "flex";

    const terminal = document.getElementById("bootTerminal");
    const progressEl = document.getElementById("progressText");
    
    // Zera o terminal e coloca a barra vazia
    terminal.innerHTML = "";
    progressEl.textContent = BOOT_BLOCKS[0];
    
    const etapas = [
        "VERIFICANDO SISTEMA...",
        "VERIFICANDO MEMÓRIA...",
        "VERIFICANDO VÍDEO...",
        "VERIFICANDO ÁUDIO...",
        "LENDO CARTUCHO...",
        "CARTUCHO VERIFICADO",
        "CARREGANDO JOGO..."
    ];

    // 3. Loop de carregamento do hardware
    for (let i = 0; i < etapas.length; i++) {
        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = etapas[i];
        terminal.appendChild(line);

        progressEl.textContent = BOOT_BLOCKS[i + 1];

        await sleep(600); // 600ms por linha
    }

    // 4. Destaca o nome do jogo e preenche o final da barra
    const gameLine = document.createElement("div");
    gameLine.className = "bootLine";
    
    gameLine.textContent = (typeof CURRENT_GAME !== 'undefined' && CURRENT_GAME.title) ? CURRENT_GAME.title : "Donkey Kong Country 2";
    
    gameLine.style.color = "#FFD93D";
    gameLine.style.fontSize = "14px";
    gameLine.style.marginTop = "15px";
    gameLine.style.fontWeight = "bold";
    terminal.appendChild(gameLine);

    // Enche o resto da barra
    await sleep(300);
    progressEl.textContent = BOOT_BLOCKS[8];
    await sleep(300);
    progressEl.textContent = BOOT_BLOCKS[9];
    await sleep(300);
    progressEl.textContent = BOOT_BLOCKS[10]; // 100% Completo!

    await sleep(1000);
    
    // 5. Inicia o jogo diretamente na aba atual
    if (typeof CURRENT_GAME !== 'undefined' && CURRENT_GAME.gameUrl) {
        window.location.href = CURRENT_GAME.gameUrl;
    } else {
        window.location.href = "https://emulatorgamer.com/pt/games/donkey-kong-country-2-diddys-kong-quest/play";
    }
}
