function startBoot(game) {
    const container = document.getElementById("bootTextContainer");
    const btnStart = document.getElementById("btnStartGame");
    
    // Lista de textos (adicione os seus aqui)
    const lines = [
        "LIGANDO SISTEMA...",
        "CARREGANDO KERNEL...",
        "DETECTANDO CARTUCHO...",
        "STATUS: OK",
        "PRONTO PARA JOGAR"
    ];

    let i = 0;
    const interval = setInterval(() => {
        if (i < lines.length) {
            const p = document.createElement("p");
            p.innerText = lines[i];
            container.appendChild(p);
            i++;
        } else {
            clearInterval(interval);
            // Quando terminar o texto, mostra o botão para abrir o jogo
            btnStart.style.display = "block";
        }
    }, 800); // Velocidade do loading

    // Ao clicar no botão que apareceu:
    btnStart.onclick = () => {
        // AQUI você chama a função que abre o emulador
        // Exemplo: window.location.href = "emulador.html?rom=" + game.romUrl;
        console.log("Abrindo jogo:", game.title);
        alert("O jogo " + game.title + " deveria abrir aqui!");
    };
}
