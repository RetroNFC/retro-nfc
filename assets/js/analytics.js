// assets/js/analytics.js

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxFovgGIRAMLJXGQyrAXP5ppIiK6qgMgZwZyHi54zVrXHd9-zppumIR6wJu14Mi-bfO9Q/exec";
let userIp = "Buscando...";
let playStartedAt = null;
let logSent = false;

// 1. Busca o IP de forma silenciosa assim que a página carrega
fetch("https://api.ipify.org?format=json")
    .then(res => res.json())
    .then(data => { userIp = data.ip; })
    .catch(() => { userIp = "Não identificado"; });

// 2. Detecta o dispositivo de forma detalhada
function getDeviceDetails() {
    const ua = navigator.userAgent;
    let os = "Desconhecido";
    let model = "";

    if (/android/i.test(ua)) {
        os = "Android";
        const match = ua.match(/Android\s+([^\s;]+);\s+([^;)]+)/);
        if (match) model = ` (${match[2]})`;
    } else if (/iPad|iPhone|iPod/.test(ua)) {
        os = "iOS";
        const match = ua.match(/CPU\s+iPhone\s+OS\s+([^\s;]+)/);
        if (match) model = ` (iPhone)`;
    } else if (/Windows/.test(ua)) {
        os = "Windows";
    } else if (/Macintosh/.test(ua)) {
        os = "macOS";
    } else if (/Linux/.test(ua)) {
        os = "Linux";
    }
    return os + model;
}

// 3. RASTREADOR PRINCIPAL: Ativa quando a tela do emulador NÃO for mais "none"
const emulatorScreen = document.getElementById("emulatorScreen");
if (emulatorScreen) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Se o estilo mudou e o display NÃO é mais "none", o jogo começou!
            if (mutation.attributeName === "style" && emulatorScreen.style.display !== "none") {
                playStartedAt = Date.now();
                observer.disconnect(); // Desliga o observador para poupar a bateria do celular
            }
        });
    });
    observer.observe(emulatorScreen, { attributes: true, attributeFilter: ["style"] });
}

// 4. DUPLO SEGURO (FALLBACK): Se o observador falhar, o clique no botão serve como início estimado
const btnJogar = document.getElementById("btnJogar");
if (btnJogar) {
    btnJogar.addEventListener("click", () => {
        if (!playStartedAt) {
            // Estima o início real somando 10 segundos (tempo médio da animação de boot)
            playStartedAt = Date.now() + 10000; 
        }
    });
}

// 5. Envia o relatório à planilha
function sendLog() {
    if (logSent || !playStartedAt) return;
    logSent = true;

    const timeSpentSeconds = Math.round((Date.now() - playStartedAt) / 1000);
    
    // Evita salvar logs insignificantes de menos de 1 segundo
    if (timeSpentSeconds < 1) return;

    const gameTitle = (typeof CURRENT_GAME !== 'undefined' && CURRENT_GAME.title) 
        ? CURRENT_GAME.title 
        : (document.getElementById("title") ? document.getElementById("title").textContent : "Jogo Desconhecido");

    const payload = {
        ip: userIp,
        dispositivo: getDeviceDetails(),
        jogo: gameTitle,
        tempo: timeSpentSeconds
    };

    fetch(WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        keepalive: true
    });
}

// 6. Dispara o salvamento ao sair, minimizar ou fechar
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        sendLog();
    }
});

window.addEventListener("pagehide", sendLog);
