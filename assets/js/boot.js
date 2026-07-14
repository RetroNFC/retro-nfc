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
    
    // Reset inicial
    terminal.innerHTML = "";
    btnIniciar.style.display = "none";
    progressEl.style.display = "block"; 
    
    const etapas = [
        "VERIFICANDO SISTEMA...",
        "VERIFICANDO MEMÓRIA...",
        "VERIFICANDO VÍDEO...",
        "VERIFICANDO ÁUDIO...",
        "LENDO CARTUCHO...",
        "CARTUCHO VERIFICADO",
        "CARREGANDO JOGO...",
        CURRENT_GAME.title // Mostra o nome do jogo no final
    ];

    for (let i = 0; i < etapas.length; i++) {
        // MATEMÁTICA CORRIGIDA: Agora a barra chega aos 100% junto com a última linha
        const step = Math.floor((i / (etapas.length - 1)) * 10);
        progressEl.textContent = BOOT_BLOCKS[step];

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

        // VELOCIDADE AJUSTADA: 600 milissegundos (mais rápido, mas ainda legível)
        await sleep(600); 
    }

    // Mostra o botão após carregar tudo
    btnIniciar.style.display = "block";
    
    // Configura o clique
    btnIniciar.onclick = () => {
        window.open(CURRENT_GAME.gameUrl, '_blank');
    };
}
