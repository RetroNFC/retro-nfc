// =====================================================
// RETRÔ NFC — Google Apps Script (Proxy Seguro) v6
// =====================================================
//
// PROPRIEDADES DO SCRIPT (Projeto ⚙️ → Propriedades do projeto):
//   TELEGRAM_TOKEN    (obrigatória)
//   TELEGRAM_CHAT_ID  (obrigatória)
//   SPREADSHEET_ID    (opcional — grava Acesso/Compra em planilha)
//
// NUNCA coloque o token no código nem no GitHub.
// =====================================================

var PROP = PropertiesService.getScriptProperties();

// --- Freios de segurança ---
var LIMITE_POR_MINUTO = 20;
var LIMITE_SESSAO_MIN = 8;
var MAX_CORPO         = 8000;
var MAX_TEXTO         = 3500;
var MAX_JOGOS         = 1500;
var MAX_CAMPO         = 120;
var TTL_SESSAO        = 21600;

// Separador visual das mensagens
var SEP = "━━━━━━━━━━━━━━━";

// =====================================================
// RECEBIMENTO
// =====================================================

function doPost(e) {

  if (!e || !e.postData || !e.postData.contents) {
    Logger.log("doPost chamado sem corpo (execução manual no editor).");
    return resposta("sem-corpo");
  }

  var bruto = e.postData.contents;

  if (bruto.length > MAX_CORPO) {
    Logger.log("Corpo acima do limite: " + bruto.length + " caracteres.");
    return resposta("corpo-grande");
  }

  var body;
  try {
    body = JSON.parse(bruto);
  } catch (err) {
    Logger.log("JSON inválido: " + err.message);
    return resposta("json-invalido");
  }

  if (body.origemRequisicao !== "SiteRetroNFC") {
    Logger.log("Origem rejeitada: " + body.origemRequisicao);
    return resposta("origem-invalida");
  }

  try {
    switch (body.tipo) {

      case "Acesso":
        registrarLinha("Acesso", nomeLimpo(body.nome) + " — " + (body.jogos || ""), "");
        enviarTelegram(montarAcesso(body), "acesso");
        break;

      case "Compra":
        registrarLinha("Compra", nomeLimpo(body.nome) + " — " + (body.jogo || ""), "");
        enviarTelegram(montarCompra(body), "compra");
        break;

      case "TelegramSessao":
        tratarSessao(body);
        break;

      default:
        Logger.log("Tipo desconhecido: " + body.tipo);
        return resposta("tipo-invalido");
    }

    return resposta("ok");

  } catch (err) {
    Logger.log("Erro no doPost: " + err.message);
    return resposta("error");
  }
}

// =====================================================
// MENSAGENS
// =====================================================

function montarAcesso(body) {
  return "🛒 <b>ESTANTE ABERTA</b>\n" + SEP + "\n" +
    "👤 <b>Jogador</b> · " + esc(nomeLimpo(body.nome)) + "\n" +
    "🆔 <b>ID</b> · " + esc(body.jogador || "—") + "\n" +
    "📱 <b>Aparelho</b> · " + esc(body.aparelho || "—") + "\n" +
    "🏆 <b>Estante</b> · " + esc(body.cartuchos || "0") + " cartucho(s)\n" +
    "🔁 <b>Visita</b> · " + esc(body.visitante || "—") + "\n" +
    "📍 <b>Origem</b> · " + esc(body.origem || "—") + "\n" +
    "🕒 <b>Quando</b> · " + agora() + "\n" + SEP + "\n" +
    "🎮 <b>Cartuchos na estante</b>\n" + esc(body.jogos || "Nenhum cartucho ainda.");
}

function montarCompra(body) {
  return "💰 <b>INTENÇÃO DE COMPRA</b>\n" + SEP + "\n" +
    "🕹️ <b>Jogo</b> · " + esc(body.jogo || "—") + "\n" +
    "👤 <b>Jogador</b> · " + esc(nomeLimpo(body.nome)) + "\n" +
    "🆔 <b>ID</b> · " + esc(body.jogador || "—") + "\n" +
    "📱 <b>Aparelho</b> · " + esc(body.aparelho || "—") + "\n" +
    "🏆 <b>Estante</b> · " + esc(body.cartuchos || "0") + " cartucho(s)\n" +
    "🔁 <b>Visita</b> · " + esc(body.visitante || "—") + "\n" +
    "🕒 <b>Quando</b> · " + agora();
}

// =====================================================
// SESSÃO DE JOGO (início + fim na mesma mensagem)
// =====================================================

function tratarSessao(body) {
  var texto = sanitizarHtml(body.texto || "");
  if (!texto) return;

  var sessaoId = String(body.sessaoId || "").replace(/[^A-Za-z0-9_-]/g, "").substring(0, 40);
  var cache    = CacheService.getScriptCache();
  var chave    = sessaoId ? "msg_" + sessaoId : "";

  if (body.acao === "fim") {
    var guardado = chave ? cache.get(chave) : null;

    if (guardado) {
      if (editarTelegram(guardado, texto, "sessao")) return;
      Logger.log("Edição falhou; enviando mensagem nova como reserva.");
    }

    enviarTelegram(texto, "sessao");
    if (chave) cache.remove(chave);
    return;
  }

  var messageId = enviarTelegram(texto, "sessao");

  if (messageId && chave) {
    cache.put(chave, String(messageId), TTL_SESSAO);
  }
}

// =====================================================
// REGISTRO EM PLANILHA
// =====================================================

function registrarLinha(tipo, campo1, campo2) {
  var idPlanilha = PROP.getProperty("SPREADSHEET_ID");
  if (!idPlanilha) return;

  var lock = LockService.getScriptLock();
  var travado = false;

  try {
    travado = lock.tryLock(5000);

    if (!travado) {
      Logger.log("Planilha ocupada: registro descartado.");
      return;
    }

    var planilha = SpreadsheetApp.openById(idPlanilha);
    var aba = planilha.getSheetByName("Registros");

    if (!aba) aba = planilha.insertSheet("Registros");
    if (aba.getLastRow() === 0) {
      aba.appendRow(["Data/Hora", "Tipo", "Campo 1", "Campo 2"]);
    }

    aba.appendRow([new Date(), tipo, celula(campo1), celula(campo2)]);

  } catch (err) {
    Logger.log("Erro ao registrar na planilha: " + err.message);
  } finally {
    if (travado) lock.releaseLock();
  }
}

function celula(valor) {
  var s = String(valor === null || valor === undefined ? "" : valor).substring(0, MAX_JOGOS);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

// =====================================================
// TELEGRAM
// =====================================================

function enviarTelegram(texto, bucket) {
  var token  = PROP.getProperty("TELEGRAM_TOKEN");
  var chatId = PROP.getProperty("TELEGRAM_CHAT_ID");

  if (!token || !chatId) {
    Logger.log("⚠️ TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID não configurados.");
    return null;
  }

  if (!podeEnviar(bucket || "geral")) {
    Logger.log("Limite de mensagens atingido. Mensagem descartada.");
    return null;
  }

  var payload = JSON.stringify({
    chat_id: chatId,
    text: texto,
    parse_mode: "HTML",
    disable_web_page_preview: true
  });

  try {
    var resp = UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + token + "/sendMessage",
      {
        method: "post",
        contentType: "application/json",
        payload: payload,
        muteHttpExceptions: true
      }
    );

    var codigo = resp.getResponseCode();
    if (codigo !== 200) {
      Logger.log("Telegram respondeu " + codigo + ": " + resp.getContentText());
      return null;
    }

    var dados = JSON.parse(resp.getContentText());
    return (dados && dados.result && dados.result.message_id) ? dados.result.message_id : null;

  } catch (err) {
    Logger.log("Erro ao enviar para o Telegram: " + err.message);
    return null;
  }
}

function editarTelegram(messageId, texto, bucket) {
  var token  = PROP.getProperty("TELEGRAM_TOKEN");
  var chatId = PROP.getProperty("TELEGRAM_CHAT_ID");

  if (!token || !chatId || !messageId) return false;

  if (!podeEnviar(bucket || "geral")) {
    Logger.log("Limite de mensagens atingido. Edição descartada.");
    return false;
  }

  var payload = JSON.stringify({
    chat_id: chatId,
    message_id: Number(messageId),
    text: texto,
    parse_mode: "HTML",
    disable_web_page_preview: true
  });

  try {
    var resp = UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + token + "/editMessageText",
      {
        method: "post",
        contentType: "application/json",
        payload: payload,
        muteHttpExceptions: true
      }
    );

    if (resp.getResponseCode() === 200) return true;

    Logger.log("Telegram (edição) respondeu " + resp.getResponseCode() + ": " + resp.getContentText());
    return false;

  } catch (err) {
    Logger.log("Erro ao editar no Telegram: " + err.message);
    return false;
  }
}

function podeEnviar(bucket) {
  var cache  = CacheService.getScriptCache();
  var minuto = Math.floor(Date.now() / 60000);

  var chaveTotal = "tg_total_" + minuto;
  var total = parseInt(cache.get(chaveTotal) || "0", 10);

  if (total >= LIMITE_POR_MINUTO) {
    Logger.log("Cota global de " + LIMITE_POR_MINUTO + "/min atingida.");
    return false;
  }

  var chaveBucket = "tg_" + bucket + "_" + minuto;
  var doBucket = parseInt(cache.get(chaveBucket) || "0", 10);

  if (bucket === "sessao" && doBucket >= LIMITE_SESSAO_MIN) {
    Logger.log("Cota de sessões de " + LIMITE_SESSAO_MIN + "/min atingida.");
    return false;
  }

  cache.put(chaveTotal, String(total + 1), 120);
  cache.put(chaveBucket, String(doBucket + 1), 120);
  return true;
}

// =====================================================
// UTILITÁRIOS
// =====================================================

function agora() {
  return Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy 'às' HH:mm");
}

function esc(txt) {
  return String(txt === null || txt === undefined ? "" : txt)
    .substring(0, MAX_JOGOS)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function nomeLimpo(valor) {
  var s = String(valor === null || valor === undefined ? "" : valor)
    .replace(/[<>&]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 40);
  return s || "não informado";
}

// Aceita apenas as tags que o site usa. O resto é escapado.
function sanitizarHtml(txt) {
  var s = String(txt === null || txt === undefined ? "" : txt).substring(0, MAX_TEXTO);
  var permitidas = ["b", "i", "u", "s", "code", "pre"];

  permitidas.forEach(function (tag) {
    s = s.replace(new RegExp("<​\\/?" + tag + ">", "gi"), function (m) {
      return "\u0001" + m + "\u0002";
    });
  });

  s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/\u0001([\s\S]*?)\u0002/g, "$1");

  return s;
}

// =====================================================
// TESTE
// =====================================================

function doGet(e) {
  return resposta("Retrô NFC Backend v6 — OK");
}

function resposta(txt) {
  return ContentService
    .createTextOutput(txt)
    .setMimeType(ContentService.MimeType.TEXT);
}
