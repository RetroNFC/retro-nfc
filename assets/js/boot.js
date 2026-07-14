const BOOT_BLOCKS = [
    "□□□□□□□□□□", "■□□□□□□□□□", "■■□□□□□□□□", "■■■□□□□□□□", 
    "■■■■□□□□□□", "■■■■■□□□□□", "■■■■■■□□□□", "■■■■■■■□□□", 
    "■■■■■■■■□□", "■■■■■■■■■□", "■■■■■■■■■■"
];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function startBoot() {
    // 1. Esconde a interface do jogo e mostra a tela preta de boot
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

    // 2. Loop de carregamento do hardware
    for (let i = 0; i < etapas.length; i++) {
        // Renderiza o texto verde
        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = etapas[i];
        terminal.appendChild(line);

        // A barra de progresso acompanha os 7 passos (chegando a 70%)
        progressEl.textContent = BOOT_BLOCKS[i + 1];

        await sleep(600); // 600ms por linha
    }

    // 3. Destaca o nome do jogo e preenche o final da barra (Suspense)
    const gameLine = document.createElement("div");
    gameLine.className = "bootLine";
    
    // Tenta pegar o nome dinâmico (se o app.js passar) ou usa o Donkey Kong como padrão
    gameLine.textContent = (typeof CURRENT_GAME !== 'undefined' && CURRENT_GAME.title) ? CURRENT_GAME.title : "Donkey Kong Country 2";
    
    // Estilo amarelo em destaque
    gameLine.style.color = "#FFD93D";
    gameLine.style.fontSize = "14px";
    gameLine.style.marginTop = "15px";
    gameLine.style.fontWeight = "bold";
    terminal.appendChild(gameLine);

    // Enche o resto da barra rapidamente
    await sleep(300);
    progressEl.textContent = BOOT_BLOCKS[8];
    await sleep(300);
    progressEl.textContent = BOOT_BLOCKS[9];
    await sleep(300);
    progressEl.textContent = BOOT_BLOCKS[10]; // 100% Completo!

    // Aguarda um momento para o jogador apreciar o boot concluído
    await sleep(1000);
    
    // 4. Inicia o jogo diretamente na aba atual
    if (typeof CURRENT_GAME !== 'undefined' && CURRENT_GAME.gameUrl) {
        window.location.href = CURRENT_GAME.gameUrl;
    } else {
        // Link de emergência caso o objeto global não exista
        window.location.href = "https://emulatorgamer.com/pt/games/donkey-kong-country-2-diddys-kong-quest/play";
    }
}
