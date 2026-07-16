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

// 2. Detecta o dispositivo de forma detalhada (Sistema Operacional e Modelo se Android)
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

// 3. Usa um "Observador" invisível para saber o exato milissegundo em que a tela do emulador abriu
const emulatorScreen = document.getElementById("emulatorScreen");
if (emulatorScreen) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Quando a tela do emulador mudar para 'block', iniciamos o cronômetro de jogo
            if (mutation.attributeName === "style" && emulatorScreen.style.display === "block") {
                playStartedAt = Date.now();
                observer.disconnect(); // Desliga o observador para economizar memória do celular
            }
        });
    });
    observer.observe(emulatorScreen, { attributes: true });
}

// 4. Função interna para enviar o relatório à planilha
function sendLog() {
    if (logSent || !playStartedAt) return;
    logSent = true;

    const timeSpentSeconds = Math.round((Date.now() - playStartedAt) / 1000);
    
    // Evita salvar logs de menos de 1 segundo (caso o usuário abra e feche sem querer)
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

    // keepalive: true força o navegador a terminar o envio mesmo se o app for fechado às pressas
    fetch(WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        keepalive: true
    });
}

// 5. Dispara o salvamento se o usuário fechar a aba, mudar de aplicativo ou bloquear a tela
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        sendLog();
    }
});

window.addEventListener("pagehide", sendLog);
