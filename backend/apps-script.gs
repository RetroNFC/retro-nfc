// =====================================================
// RETRÔ NFC — Google Apps Script (Proxy Seguro) v5
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
var LIMITE_POR_MINUTO = 20;    // total de mensagens ao Telegram por minuto
var LIMITE_SESSAO_MIN = 8;     // mensagens de sessão de jogo por minuto
var MAX_CORPO         = 8000;  // tamanho máximo do corpo da requisição
var MAX_TEXTO         = 3500;  // limite do Telegram é 4096
var MAX_JOGOS         = 1500;
var MAX_CAMPO         = 120;
var TTL_SESSAO        = 21600; // 6h: tempo máximo para editar a mensagem da sessão

// =====================================================
// RECEBIMENTO
// =====================================================

function doPost(e) {

  // Guarda 1: execução manual pelo editor não traz e.postData
  if (!e || !e.postData || !e.postData.contents) {
    Logger.log("doPost chamado sem corpo (execução manual no editor). Nada a fazer.");
    return resposta("sem-corpo");
  }

  var bruto = e.postData.contents;

  // Guarda 2: corpo grande demais é descartado antes de qualquer parse
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

  // Guarda 3: só aceita chamadas identificadas como vindas do site
  if (body.origemRequisicao !== "SiteRetroNFC") {
    Logger.log("Origem rejeitada: " + body.origemRequisicao);
    return resposta("origem-invalida");
  }

  try {
    switch (body.tipo) {

      // --- Clique em "VER MEUS CARTUCHOS" ---
      case "Acesso":
        registrarLinha("Acesso", nomeLimpo(body.nome) + " — " + (body.jogos || ""), "");
        enviarTelegram(
          "🛒 <b>ESTANTE ABERTA</b>\n\n" +
          "👤 <b>Nome:</b> " + esc(nomeLimpo(body.nome)) + "\n" +
          "🆔 <b>Jogador:</b> " + esc(body.jogador || "não informado") + "\n" +
          "📱 <b>Aparelho:</b> " + esc(body.aparelho || "não informado") + "\n" +
          "📍 <b>Origem:</b> " + esc(body.origem || "não informada") + "\n" +
          "📅 <b>Quando:</b> " + new Date().toLocaleString("pt-BR") + "\n\n" +
          "🎮 <b>Cartuchos na estante:</b>\n" + esc(body.jogos || "Nenhum cartucho ainda."),
          "acesso"
        );
        break;

      // --- Clique em "COMPRAR" na coleção ---
      case "Compra":
        registrarLinha("Compra", nomeLimpo(body.nome) + " — " + (body.jogo || ""), "");
        enviarTelegram(
          "💰 <b>INTENÇÃO DE COMPRA</b>\n\n" +
          "👤 <b>Nome:</b> " + esc(nomeLimpo(body.nome)) + "\n" +
          "🆔 <b>Jogador:</b> " + esc(body.jogador || "não informado") + "\n" +
          "📱 <b>Aparelho:</b> " + esc(body.aparelho || "não informado") + "\n" +
          "🕹️ <b>Jogo:</b> " + esc(body.jogo || "não informado") + "\n" +
          "📅 <b>Quando:</b> " + new Date().toLocaleString("pt-BR"),
          "compra"
        );
        break;

      // --- Sessão de jogo: uma mensagem só, editada no final ---
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
// SESSÃO DE JOGO (início + fim na mesma mensagem)
// =====================================================

function tratarSessao(body) {
  var texto = sanitizarHtml(body.texto || "");
  if (!texto) return;

  var sessaoId = String(body.sessaoId || "").replace(/[^A-Za-z0-9_-]/g, "").substring(0, 40);
  var cache    = CacheService.getScriptCache();
  var chave    = sessaoId ? "msg_" + sessaoId : "";

  // Fim de sessão: tenta editar a mensagem já enviada
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

  // Início de sessão: envia e guarda o message_id para a edição final
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

  if (!idPlanilha) return; // sem planilha configurada: sai sem erro

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

    if (!aba) {
      aba = planilha.insertSheet("Registros");
    }

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

// Neutraliza injeção de fórmula e limita o tamanho da célula
function celula(valor) {
  var s = String(valor === null || valor === undefined ? "" : valor).substring(0, MAX_JOGOS);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

// =====================================================
// TELEGRAM
// =====================================================

// Envia mensagem e devolve o message_id (ou null em caso de falha)
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

// Reescreve uma mensagem já enviada. Devolve true se deu certo.
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

    var codigo = resp.getResponseCode();

    // 400 "message is not modified" acontece quando o texto é idêntico: não é erro real
    if (codigo === 200) return true;

    Logger.log("Telegram (edição) respondeu " + codigo + ": " + resp.getContentText());
    return false;

  } catch (err) {
    Logger.log("Erro ao editar no Telegram: " + err.message);
    return false;
  }
}

// Freio contra flood, com cota separada para sessões de jogo
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

// Escapa caracteres que quebrariam o parse_mode HTML do Telegram
function esc(txt) {
  return String(txt === null || txt === undefined ? "" : txt)
    .substring(0, MAX_JOGOS)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Nome/apelido vindo do site: remove tags, colapsa espaços e limita o tamanho
function nomeLimpo(valor) {
  var s = String(valor === null || valor === undefined ? "" : valor)
    .replace(/[<>&]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 40);
  return s || "não informado";
}

// Aceita apenas as tags de formatação que o site realmente usa.
// Todo o resto é escapado, então não há como injetar link ou tag arbitrária.
function sanitizarHtml(txt) {
  var s = String(txt === null || txt === undefined ? "" : txt).substring(0, MAX_TEXTO);
  var permitidas = ["b", "i", "u", "s", "code", "pre"];

  permitidas.forEach(function (tag) {
    s = s.replace(new RegExp("<​\\/?" + tag + ">", "gi"), function (m) {
      return "\u0001" + m + "\u0002";
    });
  });

  s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/\u0001([\s\S]*?)\u0002/g, "\$1");

  return s;
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
