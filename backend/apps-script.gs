// =====================================================
// RETRÔ NFC — Google Apps Script (Proxy Seguro) v3
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

// Freio: máximo de mensagens ao Telegram por minuto
var LIMITE_POR_MINUTO = 20;

// =====================================================
// RECEBIMENTO
// =====================================================

function doPost(e) {

  // Guarda 1: execução manual pelo editor não traz e.postData
  if (!e || !e.postData || !e.postData.contents) {
    Logger.log("doPost chamado sem corpo (execução manual no editor). Nada a fazer.");
    return resposta("sem-corpo");
  }

  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    Logger.log("JSON inválido: " + err.message);
    return resposta("json-invalido");
  }

  // Guarda 2: só aceita chamadas identificadas como vindas do site
  if (body.origemRequisicao !== "SiteRetroNFC") {
    Logger.log("Origem rejeitada: " + body.origemRequisicao);
    return resposta("origem-invalida");
  }

  try {
    switch (body.tipo) {

      // --- Clique em "VER MEUS CARTUCHOS" ---
      case "Acesso":
        registrarLinha("Acesso", body.origem || "", body.jogos || "");
        enviarTelegram(
          "🛒 <b>ESTANTE ABERTA</b>\n\n" +
          "📍 <b>Origem:</b> " + esc(body.origem || "não informada") + "\n" +
          "📅 <b>Quando:</b> " + new Date().toLocaleString("pt-BR") + "\n\n" +
          "🎮 <b>Cartuchos na estante:</b>\n" + esc(body.jogos || "Nenhum cartucho ainda.")
        );
        break;

      // --- Clique em "COMPRAR" na coleção ---
      case "Compra":
        registrarLinha("Compra", body.jogo || "", "");
        enviarTelegram(
          "💰 <b>INTENÇÃO DE COMPRA</b>\n\n" +
          "🕹️ <b>Jogo:</b> " + esc(body.jogo || "não informado") + "\n" +
          "📅 <b>Quando:</b> " + new Date().toLocaleString("pt-BR")
        );
        break;

      // --- Sessão de jogo ---
      case "TelegramSessao":
        if (body.texto) {
          enviarTelegram(body.texto);
        }
        break;

      default:
        Logger.log("Tipo desconhecido: " + body.tipo);
    }

    return resposta("ok");

  } catch (err) {
    Logger.log("Erro no doPost: " + err.message);
    return resposta("error");
  }
}

// =====================================================
// REGISTRO EM PLANILHA
// =====================================================

function registrarLinha(tipo, campo1, campo2) {
  var idPlanilha = PROP.getProperty("SPREADSHEET_ID");

  if (!idPlanilha) return; // sem planilha configurada: sai sem erro

  try {
    var planilha = SpreadsheetApp.openById(idPlanilha);
    var aba = planilha.getSheetByName("Registros");

    if (!aba) {
      aba = planilha.insertSheet("Registros");
    }

    if (aba.getLastRow() === 0) {
      aba.appendRow(["Data/Hora", "Tipo", "Campo 1", "Campo 2"]);
    }

    aba.appendRow([new Date(), tipo, campo1, campo2]);

  } catch (err) {
    Logger.log("Erro ao registrar na planilha: " + err.message);
  }
}

// =====================================================
// TELEGRAM
// =====================================================

function enviarTelegram(texto) {
  var token  = PROP.getProperty("TELEGRAM_TOKEN");
  var chatId = PROP.getProperty("TELEGRAM_CHAT_ID");

  if (!token || !chatId) {
    Logger.log("⚠️ TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID não configurados.");
    return;
  }

  // Freio contra flood
  var cache = CacheService.getScriptCache();
  var chave = "tg_" + Math.floor(Date.now() / 60000);
  var enviados = parseInt(cache.get(chave) || "0", 10);

  if (enviados >= LIMITE_POR_MINUTO) {
    Logger.log("Limite de mensagens por minuto atingido. Mensagem descartada.");
    return;
  }
  cache.put(chave, String(enviados + 1), 120);

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

    // Loga a resposta real do Telegram — é aqui que você descobre o motivo
    // de uma mensagem não chegar (token errado, chat_id errado, HTML inválido).
    var codigo = resp.getResponseCode();
    if (codigo !== 200) {
      Logger.log("Telegram respondeu " + codigo + ": " + resp.getContentText());
    }

  } catch (err) {
    Logger.log("Erro ao enviar para o Telegram: " + err.message);
  }
}

// Escapa caracteres que quebrariam o parse_mode HTML do Telegram
function esc(txt) {
  return String(txt || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// =====================================================
// TESTE
// =====================================================

function doGet(e) {
  return resposta("Retrô NFC Backend — OK");
}

function resposta(txt) {
  return ContentService
    .createTextOutput(txt)
    .setMimeType(ContentService.MimeType.TEXT);
}
