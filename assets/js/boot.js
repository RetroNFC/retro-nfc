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
    
    terminal.innerHTML = "";
    
    // Lista de etapas que você pediu (Você pode mudar a ordem aqui)
    const etapas = [
        "VERIFICANDO SISTEMA...",
        "VERIFICANDO MEMÓRIA...",
        "VERIFICANDO VÍDEO...",
        "CARTUCHO VERIFICADO",
        "CARREGANDO JOGO...",
        CURRENT_GAME.title // Mostra o nome do jogo
    ];

    // Loop estrito: 1 segundo por etapa
    for (let i = 0; i < etapas.length; i++) {
        // 1. Atualiza a barra de progresso
        // O progresso avança um quadradinho por etapa (total de 10 passos)
        const progressoIndex = Math.min(i + 1, BOOT_BLOCKS.length - 1);
        progressEl.textContent = BOOT_BLOCKS[progressoIndex];

        // 2. Adiciona a mensagem
        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = etapas[i];
        
        // Destaque para o nome do jogo
        if (i === etapas.length - 1) {
            line.style.color = "#FFD93D";
            line.style.fontSize = "20px";
            line.style.marginTop = "20px";
        }
        
        terminal.appendChild(line);

        // 3. O SEGREDO: O tempo de espera de 1 segundo exato
        await sleep(1000); 
    }

    // Após terminar, mostra o botão
    btnIniciar.style.display = "block";
    
    // Configura o clique do botão para abrir o jogo
    btnIniciar.onclick = () => {
        window.location.href = CURRENT_GAME.gameUrl;
    };
}
