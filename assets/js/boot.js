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
    const btnIniciar = document.getElementById("btnIniciarJogo");
    
    // Limpa a tela
    terminal.innerHTML = "";
    
    // Lista de etapas (Fixa para garantir o ritmo)
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

    // Loop de carregamento
    for (let i = 0; i < etapas.length; i++) {
        // Atualiza a barra de progresso (avança conforme o loop)
        const progressoIndex = Math.min(i + 1, BOOT_BLOCKS.length - 1);
        progressEl.textContent = BOOT_BLOCKS[progressoIndex];

        // Cria a linha
        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = etapas[i];
        
        // Estilo especial para o nome do jogo
        if (i === etapas.length - 1) {
            line.style.color = "#FFD93D";
            line.style.fontSize = "18px";
            line.style.marginTop = "20px";
            line.style.fontWeight = "bold";
        }
        
        terminal.appendChild(line);

        // Espera 1 segundo real para cada etapa
        await sleep(1000); 
    }

    // Ao finalizar, esconde a barra e mostra o botão
    progressEl.style.display = "none";
    btnIniciar.style.display = "block";
    
    // Configura o clique para abrir o link
    btnIniciar.onclick = () => {
        window.open(CURRENT_GAME.gameUrl, '_blank'); // Abre em nova aba
    };
}
