function startBoot(game) {
    const container = document.getElementById("bootTextContainer");
    const btnStart = document.getElementById("btnStartGame");
    
    container.innerHTML = ""; 
    btnStart.style.display = "none";

    // Usando os textos do seu JSON se existirem, ou padrão
    const lines = [
        "RETRO NFC SYSTEM v1.0",
        "LIGANDO SISTEMA...",
        "CARREGANDO KERNEL...",
        "DETECTANDO CARTUCHO: " + game.title.toUpperCase(),
        "STATUS: OK",
        "PRONTO PARA JOGAR"
    ];

    let i = 0;
    const interval = setInterval(() => {
        if (i < lines.length) {
            const p = document.createElement("p");
            p.innerText = lines[i];
            p.style.margin = "5px 0";
            container.appendChild(p);
            i++;
        } else {
            clearInterval(interval);
            btnStart.style.display = "block"; // Aparece após o carregamento
        }
    }, 600);

    btnStart.onclick = () => {
        console.log("Abrindo:", game.romUrl);
        alert("Iniciando ROM...");
        // Aqui você coloca a chamada para o emulador
    };
}
