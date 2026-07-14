// boot.js
function startBoot() {
    const container = document.getElementById("bootTextContainer");
    
    // LINHA MÁGICA: Limpa qualquer texto que possa ter ficado lá antes
    container.innerHTML = ""; 
    
    // Adiciona o nome do jogo ao array de texto se ele existir
    const linhas = [...CONFIG.bootText]; // Copia o array original
    if (CURRENT_GAME) {
        linhas.push("JOGO: " + CURRENT_GAME.title.toUpperCase());
    }
    linhas.push("PRONTO PARA JOGAR");

    // Loop de escrita
    linhas.forEach((texto, index) => {
        setTimeout(() => {
            const p = document.createElement("p");
            p.innerText = texto;
            container.appendChild(p);
            
            // Auto-scroll para o final da tela
            container.scrollTop = container.scrollHeight;
        }, index * 400); // Velocidade de 400ms por linha
    });

    // Após terminar o boot, carrega o emulador
    setTimeout(() => {
        loadEmulator(); // Substitua pelo nome da sua função que inicia o emulador
    }, linhas.length * 400 + 1000);
}
