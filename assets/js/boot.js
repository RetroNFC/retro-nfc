let isBooting = false; // Trava de segurança para não rodar o boot duas vezes

// Os bloquinhos de carregamento que enchem aos poucos
const BOOT_BLOCKS = [
    "□□□□□□□□□□", "■□□□□□□□□□", "■■□□□□□□□□", "■■■□□□□□□□", 
    "■■■■□□□□□□", "■■■■■□□□□□", "■■■■■■□□□□", "■■■■■■■□□□", 
    "■■■■■■■■□□", "■■■■■■■■■□", "■■■■■■■■■■"
];

// Função que cria as pausas de tempo (em milissegundos) entre uma linha e outra
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Função principal do terminal (agora é chamada automaticamente pelo app.js)
async function startBoot() {
    if (isBooting) return; // Se já estiver rodando, ignora
    isBooting = true;

    // Tenta tocar o som da moeda/vida, se o celular permitir
    const som = document.getElementById("bootSound");
    if (som) {
        som.play().catch(erro => console.log("Áudio bloqueado pelo navegador", erro));
    }

    // Esconde qualquer outra tela e exibe a tela do terminal
    document.getElementById("splashScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("bootScreen").style.display = "flex";

    const terminal = document.getElementById("bootTerminal");
    const progressEl = document.getElementById("progressText");
    
    // Limpa o texto antes de começar
    terminal.innerHTML = "";
    progressEl.textContent = BOOT_BLOCKS[0];
    
    // Frases que aparecerão no terminal verde
    const etapas = [
        "LIGANDO SISTEMA...",
        "LENDO TAG NFC...",
        "CARTUCHO VERIFICADO",
        "CARREGANDO DADOS..."
    ];

    // Loop que escreve cada linha dando uma pausa de 1 segundo (1000ms)
    for (let i = 0; i < etapas.length; i++) {
        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = etapas[i];
        terminal.appendChild(line);
        
        // Atualiza a barrinha de bloquinhos junto com o texto
        const progressIndex = Math.floor(((i + 1) / etapas.length) * (BOOT_BLOCKS.length - 1));
        progressEl.textContent = BOOT_BLOCKS[progressIndex];
        
        await sleep(1000); // Pausa 1 segundo
    }

    // Linha final confirmando que está pronto
    const doneLine = document.createElement("div");
    doneLine.className = "bootLine";
    doneLine.style.marginTop = "15px";
    doneLine.textContent = "SISTEMA PRONTO!";
    terminal.appendChild(doneLine);

    // Finaliza a barra de progresso (todos os quadrados pintados)
    progressEl.textContent = BOOT_BLOCKS[BOOT_BLOCKS.length - 1];

    // Espera mais 1,5 segundos para o usuário ler "Sistema Pronto"
    await sleep(1500); 
    
    // FIM DO TERMINAL: Esconde o terminal e mostra a Ficha do Jogo com a Capa!
    document.getElementById("bootScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "flex";
}
