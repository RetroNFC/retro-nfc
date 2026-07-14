// boot.js
const BOOT_BLOCKS = [
    "□□□□□□□□□□", "■□□□□□□□□□", "■■□□□□□□□□", "■■■□□□□□□□", 
    "■■■■□□□□□□", "■■■■■□□□□□", "■■■■■■□□□□", "■■■■■■■□□□", 
    "■■■■■■■■□□", "■■■■■■■■■□", "■■■■■■■■■■"
];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function startBoot() {
    const terminal = document.getElementById("bootTerminal");
    const progressEl = document.getElementById("progressText");
    
    // Reset inicial
    terminal.innerHTML = "";
    progressEl.style.display = "block"; 
    progressEl.textContent = BOOT_BLOCKS[0]; // Começa vazia
    
    const etapas = [
        "VERIFICANDO SISTEMA...",
        "VERIFICANDO MEMÓRIA...",
        "VERIFICANDO VÍDEO...",
        "VERIFICANDO ÁUDIO...",
        "LENDO CARTUCHO...",
        "CARTUCHO VERIFICADO",
        "CARREGANDO JOGO...",
        CURRENT_GAME.title // Mostra o nome do jogo
    ];

    for (let i = 0; i < etapas.length; i++) {
        // Cria a linha de texto
        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = etapas[i];
        
        // Estilo especial apenas para o nome do jogo
        if (i === etapas.length - 1) {
            line.style.color = "#FFD93D";
            line.style.fontSize = "18px";
            line.style.marginTop = "15px";
            line.style.fontWeight = "bold";
        }
        
        terminal.appendChild(line);

        // Atualiza a barra de progresso gradativamente
        // A matemática aqui garante que chegue no 10 (100%) na última etapa
        const step = Math.floor(((i + 1) / etapas.length) * 10);
        progressEl.textContent = BOOT_BLOCKS[step];

        // Pausa de 600ms entre cada linha
        await sleep(600); 
    }

    // Aguarda 1 segundo no final para o jogador ver a tela 100% carregada
    await sleep(1000);
    
    // Abre o jogo automaticamente na MESMA aba (como um console real)
    window.location.href = CURRENT_GAME.gameUrl;
}
