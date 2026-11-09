let isBooting = false;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function startBoot() {
    if (isBooting) return;
    isBooting = true;

    // Visitante recorrente: sequência mais curta
    const rapido     = window.RETRONFC_RAPIDO === true;
    const tempoPasso = rapido ? 250 : 450;
    const tempoFinal = rapido ? 350 : 700;

    const som = document.getElementById("bootSound");
    if (som) {
        som.play().catch(erro => console.log("Áudio bloqueado pelo navegador", erro));
    }

    document.getElementById("splashScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "none";
    document.getElementById("bootScreen").style.display = "flex";

    const terminal = document.getElementById("bootTerminal");
    const progressFill = document.getElementById("progressFill");

    terminal.innerHTML = "";
    progressFill.style.width = "0%";

    const etapas = [
        "LENDO TAG NFC...",
        "VERIFICANDO CARTUCHO...",
        "CARTUCHO VERIFICADO..."
    ];

    // 3 etapas + 1 (mensagem final)
    const totalPassos = etapas.length + 1;

    for (let i = 0; i < etapas.length; i++) {
        const line = document.createElement("div");
        line.className = "bootLine";
        line.textContent = etapas[i];
        terminal.appendChild(line);

        const porcentagem = Math.floor(((i + 1) / totalPassos) * 100);
        progressFill.style.width = porcentagem + "%";

        try {
            if (navigator.vibrate) {
                if (i === 0) navigator.vibrate(30);
                if (i === 1) navigator.vibrate([40, 60, 40]);
                if (i === 2) navigator.vibrate(150);
            }
        } catch (e) {}

        await sleep(tempoPasso);
    }

    const doneLine = document.createElement("div");
    doneLine.className = "bootLine";
    doneLine.style.marginTop = "15px";
    doneLine.textContent = "INICIANDO JOGO!";
    terminal.appendChild(doneLine);

    progressFill.style.width = "100%";

    try {
        if (navigator.vibrate) navigator.vibrate(80);
    } catch (e) {}

    await sleep(tempoFinal);

    document.getElementById("bootScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "flex";
}
