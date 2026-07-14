function startBoot(game) {
    const container = document.getElementById("bootTextContainer");
    const btnStart = document.getElementById("btnStartGame");
    
    container.innerHTML = "";
    btnStart.style.display = "none";

    const lines = [
        "RETRO NFC SYSTEM v1.0",
        "LIGANDO SISTEMA...",
        "CARREGANDO KERNEL...",
        "DETECTANDO CARTUCHO...",
        "CARTUCHO: " + game.title.toUpperCase(),
        "STATUS: OK",
        "PRONTO PARA JOGAR"
    ];

    let i = 0;
    const interval = setInterval(() => {
        if (i < lines.length) {
            const p = document.createElement("p");
            p.innerText = "> " + lines[i];
            container.appendChild(p);
            
            // Adiciona os "quadradinhos" de loading
            const bar = document.createElement("div");
            bar.className = "progress-bar";
            bar.innerText = "[##########]";
            container.appendChild(bar);
            
            i++;
        } else {
            clearInterval(interval);
            btnStart.style.display = "block";
        }
    }, 800);

    btnStart.onclick = () => {
        // Redirecione aqui para o seu emulador
        console.log("Abrindo jogo:", game.romUrl);
        // window.location.href = "sua_rom.html"; 
    };
}
