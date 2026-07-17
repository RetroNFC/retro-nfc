// assets/js/analytics.js

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxNHyULYwTJoYZkS3qmHjplCnB75e6O5gOBrLMMzBPWILu_60_kiIkSPOvopyIPamN7lA/exec";
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
    let os = "Outro";
    let model = "";

    if (/android/i.test(ua)) {
        os = "Android";
        // Tenta capturar o modelo entre parênteses, geralmente o formato Android...; NomeDoModelo Build
        const match = ua.match(/\(([^)]+)\)/); 
        if (match && match[1]) {
            const parts = match[1].split(';');
            model = parts.length > 2 ? ` (${parts[1].trim()})` : " (Android Genérico)";
        }
    } else if (/iPhone|iPod|iPad/i.test(ua)) {
        os = "iOS";
        if (/iPhone/i.test(ua)) model = " (iPhone)";
        else if (/iPad/i.test(ua)) model = " (iPad)";
        else model = " (Apple)";
    } else if (/Windows/i.test(ua)) {
        os = "Windows PC";
    } else if (/Macintosh/i.test(ua)) {
        os = "Mac/Linux";
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
