// =====================================================
// RETRÔ NFC — Google Apps Script (Proxy Seguro) v8
// =====================================================
//
// PROPRIEDADES DO SCRIPT (Projeto ⚙️ → Propriedades do projeto):
//   TELEGRAM_TOKEN    (obrigatória)
//   TELEGRAM_CHAT_ID  (obrigatória)
//   SPREADSHEET_ID    (opcional — grava na aba Registros)
//
// v8: responde JSON (confirmação de recebimento), ignora eventos
// repetidos (eventoId), registra "Partida" na planilha e permite
// retomar a sessão no Telegram.
// =====================================================

var PROP = PropertiesService.getScriptProperties();

var LIMITE_POR_MINUTO = 20;
var LIMITE_SESSAO_MIN = 8;
var MAX_CORPO         = 8000;
var MAX_JOGOS         = 1500;
var TTL_SESSAO        = 21600;

var SEP = "━━━━━━━━━━━━━━━";

// =====================================================
// RECEBIMENTO
// =====================================================

function doPost(e) {

  if (!e || !e.postData || !e.postData.contents) {
    Logger.log("doPost sem corpo (execução manual no editor).");
    return resposta("sem-corpo");
  }

  var bruto = e.postData.contents;

  if (bruto.length > MAX_CORPO) {
    Logger.log("Corpo acima do limite: " + bruto.length);
    return resposta("corpo-grande");
  }

  var body;
  try {
    body = JSON.parse(bruto);
  } catch (err) {
    Logger.log("JSON inválido: " + err.message);
    return resposta("json-invalido");
  }

  if (!body || body.origemRequisicao !== "SiteRetroNFC") {
    Logger.log("Origem rejeitada.");
    return resposta("origem-invalida");
  }

  try {
    var id = body.eventoId
      ? String(body.eventoId).replace(/[^A-Za-z0-9_-]/g, "").substring(0, 40)
      : "";

    switch (body.tipo) {

      case "Acesso":
        if (jaProcessado(id)) return resposta("duplicado");
        var plAcesso = registrarLinha("Acesso", nomeLimpo(body.nome) + " — " + (body.jogos || ""), "");
        var tgAcesso = enviarTelegram(montarAcesso(body), "acesso");
        return resposta("ok", { planilha: plAcesso, telegram: !!tgAcesso });

      case "Compra":
        if (jaProcessado(id)) return resposta("duplicado");
        var plCompra = registrarLinha("Compra", nomeLimpo(body.nome) + " — " + (body.jogo || ""), "");
        var tgCompra = enviarTelegram(montarCompra(body), "compra");
        return resposta("ok", { planilha: plCompra, telegram: !!tgCompra });

      case "TelegramSessao":
        if (body.acao === "inicio") {
          if (jaProcessado(id)) return resposta("duplicado");
          registrarLinha("Partida", nomeLimpo(body.nome) + " — " + (body.jogo || ""), "");
        }
        var tgSessao = tratarSessao(body);
        return resposta("ok", { telegram: !!tgSessao });

      default:
        Logger.log("Tipo desconhecido: " + body.tipo);
        return resposta("tipo-invalido");
    }

  } catch (err) {
    Logger.log("Erro no doPost: " + err.message);
    return resposta("error");
  }
}

// Evita processar duas vezes o mesmo evento (reenvios do site)
function jaProcessado(id) {
  if (!id) return false;
  var cache = CacheService.getScriptCache();
  var chave = "ev_" + id;
  if (cache.get(chave)) return true;
  cache.put(chave, "1", 3600);
  return false;
}

// =====================================================
// MENSAGENS — ACESSO E COMPRA
// =====================================================

function montarAcesso(body) {
  return "🛒 <b>ESTANTE ABERTA</b>\n" + SEP + "\n" +
    "👤 <b>Jogador</b> · " + esc(nomeLimpo(body.nome)) + "\n" +
    "🆔 <b>ID</b> · " + esc(body.jogador || "—") + "\n" +
    "📱 <b>Aparelho</b> · " + esc(body.aparelho || "—") + "\n" +
    "🏆 <b>Estante</b> · " + esc(body.cartuchos || "0") + " cartucho(s)\n" +
    "🔁 <b>Visita</b> · " + esc(body.visitante || "—") + "\n" +
    "📍 <b>Origem</b> · " + esc(body.origem || "—") + "\n" +
    "🕒 <b>Quando</b> · " + (body.quando ? esc(body.quando) : agora()) + "\n" + SEP + "\n" +
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
    "🕒 <b>Quando</b> · " + (body.quando ? esc(body.quando) : agora());
}

// =====================================================
// SESSÃO DE JOGO — TEXTO MONTADO NO SERVIDOR
// =====================================================

function montarSessao(body) {
  var encerrada = body.acao === "fim";

  var texto =
    "🎮 <b>SESSÃO RETRÔ NFC</b>\n" + SEP + "\n" +
    "🕹️ <b>Jogo</b> · " + esc(body.jogo || "—") + "\n" +
    "👤 <b>Jogador</b> · " + esc(nomeLimpo(body.nome)) + "\n" +
    "🆔 <b>ID</b> · " + esc(body.jogador || "—") + "\n" +
    "📱 <b>Aparelho</b> · " + esc(body.aparelho || "—") + "\n" +
    "🏆 <b>Estante</b> · " + esc(body.cartuchos || "0") + " cartucho(s)\n" +
    "🔁 <b>Visita</b> · " + esc(body.visitante || "—") + "\n" + SEP + "\n" +
    "📍 <b>Local</b> · " + esc(body.local || "—") + "\n" +
    "🌐 <b>Rede</b> · " + esc(body.ip || "—") + " · " + esc(body.rede || "—") + "\n" +
    "🕒 <b>Início</b> · " + esc(body.inicio || agora()) + "\n" + SEP + "\n";

  if (encerrada) {
    texto +=
      "⏱️ <b>Tempo jogado</b> · " + esc(body.tempo || "—") + " <i>(estimado)</i>\n" +
      "✅ <b>Status</b> · 🟢 <i>Saiu do jogo</i>";
  } else {
    texto += "⏱️ <b>Status</b> · 🔵 <i>Jogando...</i>";
  }

  return texto;
}

// Retorna true se a mensagem foi enviada/atualizada no Telegram
function tratarSessao(body) {
  if (!body.jogo) return false;

  var sessaoId = String(body.sessaoId || "").replace(/[^A-Za-z0-9_-]/g, "").substring(0, 40);
  var cache    = CacheService.getScriptCache();
  var chave    = sessaoId ? "msg_" + sessaoId : "";
  var texto    = montarSessao(body);
  var guardado = chave ? cache.get(chave) : null;

  // Saída ou retorno: edita a mensagem da sessão (a chave fica no cache
  // até expirar, para permitir várias saídas e retornos na mesma sessão)
  if (body.acao === "fim" || body.acao === "retomada") {
    if (guardado && editarTelegram(guardado, texto, "sessao")) return true;

    if (body.acao === "retomada") return false; // sem mensagem para editar: ignora

    var novoId = enviarTelegram(texto, "sessao");
    if (novoId && chave) cache.put(chave, String(novoId), TTL_SESSAO);
    return !!novoId;
  }

  // Início
  var messageId = enviarTelegram(texto, "sessao");
  if (messageId && chave) cache.put(chave, String(messageId), TTL_SESSAO);
  return !!messageId;
}

// =====================================================
// REGISTRO EM PLANILHA  (true = gravou, false = falhou, null = não configurada)
// =====================================================

function registrarLinha(tipo, campo1, campo2) {
  var idPlanilha = PROP.getProperty("SPREADSHEET_ID");
  if (!idPlanilha) return null;

  var lock = LockService.getScriptLock();
  var travado = false;

  try {
    travado = lock.tryLock(5000);

    if (!travado) {
      Logger.log("Planilha ocupada: registro descartado.");
      return false;
    }

    var planilha = SpreadsheetApp.openById(idPlanilha);
    var aba = planilha.getSheetByName("Registros");

    if (!aba) aba = planilha.insertSheet("Registros");
    if (aba.getLastRow() === 0) {
      aba.appendRow(["Data/Hora", "Tipo", "Campo 1", "Campo 2"]);
    }

    aba.appendRow([new Date(), tipo, celula(campo1), celula(campo2)]);
    return true;

  } catch (err) {
    Logger.log("Erro ao registrar na planilha: " + err.message);
    return false;
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

    var codigo = resp.getResponseCode();
    if (codigo === 200) return true;

    var corpo = resp.getContentText();

    // Texto idêntico: o Telegram recusa, mas o resultado desejado já está na tela.
    if (corpo.indexOf("message is not modified") !== -1) return true;

    Logger.log("Telegram (edição) respondeu " + codigo + ": " + corpo);
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

// =====================================================
// RESPOSTAS
// =====================================================

function doGet(e) {
  return resposta("ok", { versao: "v8" });
}

function resposta(status, extra) {
  var obj = { ok: (status === "ok" || status === "duplicado"), status: status };
  if (extra) {
    for (var k in extra) obj[k] = extra[k];
  }
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
