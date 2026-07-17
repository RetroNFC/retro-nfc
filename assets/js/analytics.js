// assets/js/analytics.js

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxFovgGIRAMLJXGQyrAXP5ppIiK6qgMgZwZyHi54zVrXHd9-zppumIR6wJu14Mi-bfO9Q/exec";
let userIp = "Buscando...";
let playStartedAt = null;
let logSent = false;

// 1. Busca o IP
fetch("https://api.ipify.org?format=json")
    .then(res => res.json())
    .then(data => { userIp = data.ip; })
    .catch(() => { userIp = "Não identificado"; });

// 2. Detecta dispositivo
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
    }
    return os + model;
}

// 3. RASTREADOR (Inicia ao carregar o emulador)
const emulatorScreen = document.getElementById("emulatorScreen");
if (emulatorScreen) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === "style" && emulatorScreen.style.display !== "none" && !playStartedAt) {
                playStartedAt = Date.now(); // Marca o início real
            }
        });
    });
    observer.observe(emulatorScreen, { attributes: true, attributeFilter: ["style"] });
}

// 4. PLANO B (Clique no botão)
const btnJogar = document.getElementById("btnJogar");
if (btnJogar) {
    btnJogar.addEventListener("click", () => {
        if (!playStartedAt) {
            playStartedAt = Date.now(); // Marca o início no clique
        }
    });
}

// 5. Envia o log
function sendLog() {
    if (logSent || !playStartedAt) return;
    
    const timeSpentSeconds = Math.round((Date.now() - playStartedAt) / 1000);
    if (timeSpentSeconds < 10) return; 
    
    logSent = true; 

    const gameTitle = (typeof CURRENT_GAME !== 'undefined' && CURRENT_GAME.title) 
        ? CURRENT_GAME.title 
        : (document.getElementById("title") ? document.getElementById("title").textContent : "Jogo Desconhecido");

    const payload = JSON.stringify({
        ip: userIp,
        dispositivo: getDeviceDetails(),
        jogo: gameTitle,
        tempo: timeSpentSeconds
    });

    // Usa sendBeacon (à prova de falhas para fechamento de abas no celular)
    if (navigator.sendBeacon) {
        navigator.sendBeacon(WEB_APP_URL, payload);
    } else {
        // Fallback caso o navegador seja muito antigo
        fetch(WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: payload,
            keepalive: true
        });
    }
}

// 6. Gatilhos de saída
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") sendLog();
});
window.addEventListener("pagehide", sendLog);
