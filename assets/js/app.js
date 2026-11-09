// =====================================================
// RETRÔ NFC — app.js (v5)
// Token do Telegram REMOVIDO do frontend.
// Os dados vão para o Apps Script, que encaminha ao Telegram.
// =====================================================

const URL_BACKEND = "https://script.google.com/macros/s/AKfycbw2aJCwpgq1OJ1fVSXUz8hUMCK7M2Ho1l7HdUKGf8hF4rbS2FFEDGiyBW6FA03yRTz_/exec";

// Chaves do localStorage (todas padronizadas com o prefixo retronfc_)
const CHAVE_COLECAO = 'retronfc_colecao';
const CHAVE_JOGOS   = 'retronfc_games_cache';
const CHAVE_NOME    = 'retronfc_nome';
const CHAVE_ID      = 'retronfc_id_curto';
const CHAVE_VISITAS = 'retronfc_visitas';

// Identificador único desta sessão de jogo.
// Serve para o backend editar a mesma mensagem do Telegram no final.
const SESSAO_ID = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// --- Cache do games.json: a coleção abre sem esperar rede ---
function lerCacheJogos() {
    try {
        const bruto = localStorage.getItem(CHAVE_JOGOS);
        if (!bruto) return null;
        const dados = JSON.parse(bruto);
        return (dados && Array.isArray(dados.games)) ? dados.games : null;
    } catch (e) { return null; }
}

function salvarCacheJogos(games) {
    try { localStorage.setItem(CHAVE_JOGOS, JSON.stringify({ games: games })); } catch (e) {}
}

async function obterJogos() {
    const cache = lerCacheJogos();
    if (cache) return cache;
    const response = await fetch("games.json?ts=" + Date.now());
    const data = await response.json();
    if (data && Array.isArray(data.games)) salvarCacheJogos(data.games);
    return (data && data.games) || [];
}

// --- Rastreamento do clique na estante ---
async function rastrearCliqueColecao(origem) {
    marcarCarregandoEstante();

    let listaJogos = "Nenhum cartucho na estante ainda.";

    try {
        const colecaoSalva = JSON.parse(localStorage.getItem(CHAVE_COLECAO) || '[]');
        if (colecaoSalva.length > 0) {
            const jogos = await obterJogos();
            listaJogos = colecaoSalva.map(chave => {
                const jogoEncontrado = jogos.find(g => g.key === chave);
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
        nome: obterNome(),
        jogador: obterIdCurto(),
        aparelho: obterAparelho(),
        jogos: listaJogos
    });

    // Dispara sem await: a navegação acontece na hora.
    // keepalive mantém o POST vivo mesmo depois de a página sair.
    try {
        fetch(URL_BACKEND, {
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

function marcarCarregandoEstante() {
    ['btnEstante', 'btnEstanteErro'].forEach(function (id) {
        const b = document.getElementById(id);
        if (!b) return;
        b.classList.add('carregando');
        b.setAttribute('aria-busy', 'true');
        b.innerText = 'CARREGANDO';
    });
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

let tempoInicio   = 0;
let sessaoEnviada = false; // Trava: garante que o encerramento é enviado só uma vez

// --- Utilitários ---
function obterIdCurto() {
    let id = localStorage.getItem(CHAVE_ID);
    if (!id) {
        id = Math.random().toString(36).substring(2, 6).toUpperCase();
        localStorage.setItem(CHAVE_ID, id);
    }
    return id;
}

function obterIdEVisitas() {
    const id = obterIdCurto();
    let visitas = parseInt(localStorage.getItem(CHAVE_VISITAS) || "0");
    visitas++;
    localStorage.setItem(CHAVE_VISITAS, visitas);
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

// --- Nome do jogador (pedido apenas uma vez por aparelho) ---
function obterNome() {
    try { return (localStorage.getItem(CHAVE_NOME) || '').trim(); } catch (e) { return ''; }
}

function salvarNome(nome) {
    try { localStorage.setItem(CHAVE_NOME, nome); } catch (e) {}
}

function limparNome(txt) {
    let s = String(txt || '');
    try {
        s = s.replace(/[^\p{L}\p{N} ._-]/gu, '');
    } catch (e) {
        s = s.replace(/[^A-Za-zÀ-ÿ0-9 ._-]/g, '');
    }
    return s.replace(/\s+/g, ' ').trim().substring(0, 20);
}

// Modal criado por JS: não exige alteração em play.html nem em style.css
function pedirNome() {
    return new Promise(function (resolve) {
        const jaTem = obterNome();
        if (jaTem) { resolve(jaTem); return; }

        const overlay = document.createElement('div');
        overlay.id = 'nomeOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(4,7,12,.92);display:flex;align-items:center;justify-content:center;padding:24px;font-family:"Press Start 2P",monospace;';

        const caixa = document.createElement('div');
        caixa.style.cssText = 'background:linear-gradient(160deg,#111a26,#0a0f16);border:2px solid #E60012;border-radius:14px;padding:28px 22px;max-width:340px;width:100%;text-align:center;box-shadow:0 0 30px rgba(230,0,18,.45),inset 0 0 40px rgba(230,0,18,.06);';

        const titulo = document.createElement('div');
        titulo.textContent = 'RETRÔ NFC';
        titulo.style.cssText = 'color:#E60012;font-size:14px;letter-spacing:2px;margin-bottom:16px;text-shadow:0 0 12px rgba(230,0,18,.8);';

        const texto = document.createElement('p');
        texto.textContent = 'Insira seu nome ou apelido para ter acesso à sua coleção';
        texto.style.cssText = 'color:#e6edf5;font-size:9px;line-height:1.9;margin:0 0 18px;';

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 20;
        input.autocomplete = 'nickname';
        input.placeholder = 'SEU NOME';
        input.style.cssText = 'width:100%;box-sizing:border-box;background:#070b11;border:1px solid #2b3a4d;border-radius:8px;color:#fff;font-family:inherit;font-size:10px;padding:13px;text-align:center;outline:none;transition:border-color .2s,box-shadow .2s;';

        input.addEventListener('focus', function () {
            input.style.borderColor = '#22D3EE';
            input.style.boxShadow = '0 0 0 3px rgba(34,211,238,.15)';
        });
        input.addEventListener('blur', function () {
            input.style.borderColor = '#2b3a4d';
            input.style.boxShadow = 'none';
        });

        const erro = document.createElement('div');
        erro.style.cssText = 'color:#ff6b6b;font-size:8px;line-height:1.6;min-height:14px;margin-top:10px;';

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = 'COMEÇAR';
        botao.style.cssText = 'width:100%;margin-top:12px;background:linear-gradient(180deg,#ff2233,#C4000F);color:#fff;border:none;border-radius:8px;font-family:inherit;font-size:10px;padding:15px;cursor:pointer;box-shadow:0 6px 18px rgba(230,0,18,.45);transition:transform .15s,filter .15s;';

        botao.addEventListener('pointerdown', function () { botao.style.transform = 'scale(.97)'; });
        botao.addEventListener('pointerup', function () { botao.style.transform = 'scale(1)'; });

        caixa.appendChild(titulo);
        caixa.appendChild(texto);
        caixa.appendChild(input);
        caixa.appendChild(erro);
        caixa.appendChild(botao);
        overlay.appendChild(caixa);
        document.body.appendChild(overlay);

        setTimeout(function () { input.focus(); }, 100);

        function confirmar() {
            const nome = limparNome(input.value);
            if (nome.length < 2) {
                erro.textContent = 'Digite pelo menos 2 caracteres.';
                input.focus();
                return;
            }
            salvarNome(nome);
            overlay.remove();
            resolve(nome);
        }

        botao.addEventListener('click', confirmar);
        input.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter') { ev.preventDefault(); confirmar(); }
        });
    });
}

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
    const texto =
        `🎮 <b>SESSÃO RETRÔ NFC</b>\n\n` +
        `👤 <b>Nome:</b> ${obterNome() || "não informado"}\n` +
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
            sessaoId: SESSAO_ID,
            texto: texto
        })
    });
}

function encerrarSessao() {
    if (sessaoEnviada || tempoInicio === 0) return;
    sessaoEnviada = true;

    const tempoFormatado = formatarTempoDeJogo(Date.now() - tempoInicio);
    const jogo = CURRENT_GAME ? CURRENT_GAME.title : "Desconhecido";

    const texto =
        `🎮 <b>SESSÃO RETRÔ NFC</b>\n\n` +
        `👤 <b>Nome:</b> ${obterNome() || "não informado"}\n` +
        `🕹️ <b>Jogo:</b> ${jogo}\n` +
        `🆔 <b>Jogador:</b> ${obterIdCurto()}\n` +
        `📱 <b>Aparelho:</b> ${obterAparelho()}\n` +
        `⏱️ <b>Tempo jogado:</b> ${tempoFormatado}\n\n` +
        `✅ <b>Status:</b> 🟢 <i>Sessão encerrada</i>`;

    navigator.sendBeacon(URL_BACKEND, JSON.stringify({
        origemRequisicao: "SiteRetroNFC",
        tipo: "TelegramSessao",
        acao: "fim",
        sessaoId: SESSAO_ID,
        texto: texto
    }));
}

window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') encerrarSessao();
});
window.addEventListener('pagehide', encerrarSessao);

// --- Carregamento do jogo ---
async function loadGames() {
    try {
        if (!GAME_KEY) { mostrarTelaErro(); return; }

        const jogos = await obterJogos();

        CURRENT_GAME = jogos.find(game => game.key === GAME_KEY);
        if (!CURRENT_GAME) { mostrarTelaErro(); return; }
        IS_VALID = true;

        let colecao = JSON.parse(localStorage.getItem(CHAVE_COLECAO) || '[]');
        if (!colecao.includes(CURRENT_GAME.key)) {
            colecao.push(CURRENT_GAME.key);
            localStorage.setItem(CHAVE_COLECAO, JSON.stringify(colecao));
        }

        document.getElementById("gameCover").src      = CURRENT_GAME.cover;
        document.getElementById("title").innerText    = CURRENT_GAME.title;
        document.getElementById("subtitle").innerText = CURRENT_GAME.subtitle;
        document.getElementById("year").innerText     = CURRENT_GAME.year;
        document.getElementById("players").innerText  = CURRENT_GAME.players;
        document.getElementById("developer").innerText = CURRENT_GAME.developer;

        const btn = document.getElementById("btnJogar");
        btn.onclick = async () => {
            if (navigator.vibrate) { try { navigator.vibrate(100); } catch(e){} }
            clickSound.play().catch(() => {});

            const nome = await pedirNome();
            if (!nome) return;

            registrarLogAcessoImediato();

            const gameScreen = document.getElementById("gameScreen");
            gameScreen.classList.add("crt-shutdown");
            setTimeout(() => iniciarEmulador(), 400);
        };
    } catch (error) {
        mostrarTelaErro();
    }
}

function iniciarEmulador() {
    document.getElementById("gameScreen").style.display = "none";
    const emulatorScreen = document.getElementById("emulatorScreen");
    emulatorScreen.style.display = "block";

    document.body.style.padding = "0";
    document.body.style.backgroundColor = "#000000";

    const docElement = document.documentElement;
    const requestFS = docElement.requestFullscreen
                   || docElement.webkitRequestFullscreen
                   || docElement.msRequestFullscreen;

    if (requestFS) {
        requestFS.call(docElement).then(() => {
            if (screen.orientation?.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        }).catch(() => {});
    }

    if (typeof CURRENT_GAME !== 'undefined') {
        window.EJS_player        = '#game';
        window.EJS_core          = CURRENT_GAME.core;
        window.EJS_gameUrl       = CURRENT_GAME.romUrl;
        window.EJS_startOnLoaded = true;

        window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';

        const script = document.createElement('script');
        script.src   = 'https://cdn.emulatorjs.org/stable/data/loader.js';
        document.body.appendChild(script);
    }
}

function mostrarTelaErro() {
    IS_VALID = false;
    document.getElementById("splashScreen").style.display = "none";
    document.getElementById("gameScreen").style.display   = "none";
    document.getElementById("bootScreen").style.display   = "none";
    document.getElementById("invalidScreen").style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("gameScreen").style.display  = "none";
    document.getElementById("bootScreen").style.display  = "none";
    document.getElementById("splashScreen").style.display = "flex";
    loadGames();
    setTimeout(() => { if (IS_VALID && typeof startBoot === "function") startBoot(); }, 4000);
});
