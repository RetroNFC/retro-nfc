// =====================================================
// RETRÔ NFC — app.js (versão segura)
// Token do Telegram REMOVIDO do frontend.
// Os dados vão para o Apps Script, que encaminha ao Telegram.
// =====================================================

// URL do seu Apps Script (proxy seguro)
// Se você reimplantar o Apps Script, atualize esta URL.
const URL_BACKEND = "https://script.google.com/macros/s/AKfycbw2aJCwpgq1OJ1fVSXUz8hUMCK7M2Ho1l7HdUKGf8hF4rbS2FFEDGiyBW6FA03yRTz_/exec";

// --- Rastreamento do clique na estante ---
async function rastrearCliqueColecao(origem) {
    const b1 = document.getElementById('btnEstante');
    const b2 = document.getElementById('btnEstanteErro');
    if (b1) { b1.innerText = "CARREGANDO..."; b1.style.opacity = "0.5"; }
    if (b2) { b2.innerText = "CARREGANDO..."; b2.style.opacity = "0.5"; }

    let listaJogos = "Nenhum cartucho na estante ainda.";

    try {
        const colecaoSalva = JSON.parse(localStorage.getItem('imortalize_colecao') || '[]');
        if (colecaoSalva.length > 0) {
            const response = await fetch("games.json?ts=" + Date.now());
            const data = await response.json();
            listaJogos = colecaoSalva.map(chave => {
                const jogoEncontrado = data.games.find(g => g.key === chave);
                return jogoEncontrado ? `• ${jogoEncontrado.title}` : `• ID Desconhecido (${chave})`;
            }).join('\n');
        }
    } catch (e) {
        console.error("Erro ao montar a lista da estante:", e);
    }

    const payload = JSON.stringify({
        origemRequisicao: "SiteRetroNFC",
        tipo: "Acesso",
        origem: origem,
        jogos: listaJogos
    });

    // keepalive mantém a requisição viva mesmo depois de a página navegar.
    // Sem isso, o navegador cancela o POST no instante do redirecionamento.
    try {
        await fetch(URL_BACKEND, {
            method: 'POST',
            mode: 'no-cors',
            keepalive: true,
            headers: { 'Content-Type': 'text/plain' },
            body: payload
        });
    } catch (e) {
        console.error("Erro ao registrar acesso:", e);
    }

    window.location.href = 'colecao.html';
}

// --- Verificação de domínio ---
const DOMINIOS_PERMITIDOS = [
    "retronfc.github.io",
    "retro-nfc.pages.dev"
];
const hostAtual        = window.location.hostname;
const ehLocalhost      = hostAtual === "localhost" || hostAtual === "127.0.0.1";
const ehDominioOficial = DOMINIOS_PERMITIDOS.some(d => hostAtual === d || hostAtual.endsWith("." + d));
const ehArquivoLocal   = window.location.protocol === "file:";

if (!ehLocalhost && !ehDominioOficial && !ehArquivoLocal) {
    document.body.innerHTML = "<div style='background:#111; color:#ff4444; height:100vh; display:flex; justify-content:center; align-items:center;'><h1>Acesso Não Autorizado</h1></div>";
    throw new Error("Execução bloqueada por segurança.");
}

// --- Estado global ---
const PARAMS   = new URLSearchParams(window.location.search);
const GAME_KEY = PARAMS.get("k");
let CURRENT_GAME = null;
let IS_VALID     = false;
const clickSound = new Audio('assets/life.mp3');

// --- Migração da coleção vinda do domínio antigo (GitHub Pages) ---
// Uso: https://retro-nfc.pages.dev/play.html?k=CHAVE#c=BASE64
(function migrarColecaoAntiga() {
    try {
        const hash = window.location.hash;
        if (!hash || hash.indexOf("#c=") !== 0) return;
        const bruto = decodeURIComponent(hash.substring(3));
        const vindos = JSON.parse(atob(bruto));
        if (!Array.isArray(vindos) || vindos.length === 0) return;
        const atuais = JSON.parse(localStorage.getItem('imortalize_colecao') || '[]');
        vindos.forEach(function (k) { if (atuais.indexOf(k) === -1) atuais.push(k); });
        localStorage.setItem('imortalize_colecao', JSON.stringify(atuais));
        history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) {
        console.error("Falha ao migrar coleção:", e);
    }
})();

// --- Gera o link de migração a partir da coleção local ---
// Usado na página do domínio antigo para levar a estante ao novo domínio.
function gerarLinkMigracao(urlDestino) {
    const destino = urlDestino || "https://retro-nfc.pages.dev/play.html";
    const chave   = GAME_KEY || "";
    let colecao   = [];
    try {
        colecao = JSON.parse(localStorage.getItem('imortalize_colecao') || '[]');
    } catch (e) {
        colecao = [];
    }
    let url = destino + (chave ? "?k=" + encodeURIComponent(chave) : "");
    if (colecao.length > 0) {
        url += "#c=" + encodeURIComponent(btoa(JSON.stringify(colecao)));
    }
    return url;
}

let tempoInicio   = 0;
let sessaoEnviada = false; // Trava: garante que o encerramento é enviado só uma vez

// --- Utilitários ---
function obterIdEVisitas() {
    let id = localStorage.getItem('imortalize_id_curto');
    let visitas = parseInt(localStorage.getItem('imortalize_visitas') || "0");
    if (!id) {
        id = Math.random().toString(36).substring(2, 6).toUpperCase();
        localStorage.setItem('imortalize_id_curto', id);
    }
    visitas++;
    localStorage.setItem('imortalize_visitas', visitas);
    return `${id} (Acesso #${visitas})`;
}

function obterAparelho() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua))      return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS (Apple)";
    if (/windows/i.test(ua))      return "Windows PC";
    if (/macintosh/i.test(ua))    return "Mac OS";
    return "Outro";
}

function formatarTempoDeJogo(ms) {
    let s = Math.floor(ms / 1000);
    let h = Math.floor(s / 3600);
    let m = Math.floor((s % 3600) / 60);
    s = s % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function obterDataBonita() { return new Date().toLocaleString('pt-BR'); }

// --- Notificações de sessão (via Apps Script → Telegram) ---

function registrarLogAcessoImediato() {
    if (!CURRENT_GAME) return;
    tempoInicio   = Date.now();
    sessaoEnviada = false;

    fetch("https://ipwho.is/")
        .then(res => res.json())
        .then(data => {
            const ipUser   = data.success ? data.ip : "Desconhecido";
            const provedor = (data.success && data.connection?.isp) ? data.connection.isp : "Desconhecido";
            const localIP  = (data.success && data.city) ? `${data.city}, ${data.region}` : "Região Desconhecida";
            enviarInicioSessao(ipUser, provedor, localIP);
        })
        .catch(() => enviarInicioSessao("Desconhecido", "Desconhecido", "Região Desconhecida"));
}

function enviarInicioSessao(ipUser, provedor, localIP) {
    // Monta o texto e envia para o Apps Script (sem token aqui!)
    const texto =
        `🎮 <b>SESSÃO RETRÔ NFC</b>\n\n` +
        `🕹️ <b>Jogo:</b> ${CURRENT_GAME.title}\n` +
        `🆔 <b>Jogador:</b> ${obterIdEVisitas()}\n` +
        `📱 <b>Aparelho:</b> ${obterAparelho()}\n` +
        `📅 <b>Início:</b> ${obterDataBonita()}\n\n` +
        `📍 <b>Localização:</b> ${localIP}\n` +
        `🌐 <b>Rede IP:</b> ${ipUser} (${provedor})\n\n` +
        `⏱️ <b>Status:</b> 🔵 <i>Jogando...</i>`;

    fetch(URL_BACKEND, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
            origemRequisicao: "SiteRetroNFC",
            tipo: "TelegramSessao",
            acao: "inicio",
            texto: texto
        })
    });
}

function encerrarSessao() {
    // Trava: só dispara uma vez por sessão, mesmo com múltiplos eventos de saída
    if (sessaoEnviada || tempoInicio === 0) return;
    sessaoEnviada = true;

    const tempoFormatado =
