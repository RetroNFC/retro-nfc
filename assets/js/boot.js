function startBoot(game) {
    const container = document.getElementById("bootTextContainer");
    const btnStart = document.getElementById("btnStartGame");
    
    // Limpa qualquer texto anterior caso a função seja chamada mais de uma vez
    container.innerHTML = "";
    btnStart.style.display = "none";

    const lines = [
        "RETRO NFC SYSTEM v1.0",
        "LIGANDO SISTEMA...",
        "VERIFICANDO KERNEL...",
        "DETECTANDO CARTUCHO: " + game.title.toUpperCase(),
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
            // Libera o botão
            btnStart.style.display = "block";
        }
    }, 600); // Velocidade um pouco mais rápida

    btnStart.onclick = () => {
        // AQUI você chama o seu emulador
        console.log("Abrindo ROM:", game.romUrl);
        alert("Iniciando Jogo!"); 
        // Exemplo: window.location.href = "emulador.html?rom=" + game.romUrl;
    };
}
