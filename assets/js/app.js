// =====================================================
// RETRÔ NFC — Google Apps Script (Proxy Seguro) v2
// =====================================================
//
// CONFIGURAÇÃO (faça UMA VEZ, antes de implantar):
//
//   1. No editor do Apps Script, clique em:
//      Projeto (ícone ⚙️) → "Propriedades do projeto" → aba "Propriedades de script"
//
//   2. Adicione estas propriedades:
        Nome: TELEGRAM_TOKEN    Valor: 8651257279:AAHBqe-zPof_xSmtkyzzLBC97UoVOaqP7rQ
        Nome: TELEGRAM_CHAT_ID  Valor: 941396833
//
//   3. (OPCIONAL) Para gravar Acesso e Compra em uma planilha:
        Nome: Backoffice Retro NFC    Valor: 1qDvqFELE5LNeKinlv_a7M_jk-86ptvNp889eEGCgdhE
//      O ID é o trecho entre /d/ e /edit na URL da planilha:
//      https://docs.google.com/spreadsheets/d/ESTE_TRECHO_AQUI/edit
//      Se você não configurar, o script funciona normalmente e apenas
//      não grava nada — não gera erro.
//
//   4. Implantar → "Gerenciar implantações" → lápis (editar) →
//      Versão: "Nova versão" → Implantar.
//      NÃO use "Nova implantação": isso gera uma URL diferente e
//      quebra todas as tags NFC já gravadas.
//
// IMPORTANTE: o token NÃO aparece no código. Ele fica nas propriedades
// do script, que são privadas e não ficam visíveis em nenhum repositório.
// =====================================================

var PROP = PropertiesService.getScriptProperties();

// Freio de segurança: máximo de mensagens ao Telegram por minuto.
// Protege contra alguém descobrir a URL e inundar o seu chat.
var LIMITE_POR_MINUTO = 20;

// =====================================================
// RECEBIMENTO
// =====================================================

function doPost(e) {

  // Guarda 1: execução manual pelo editor ("Executar") não traz e.postData.
  // Sem isso, o log mostra "Cannot read properties of undefined (reading 'postData')".
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

  // Guarda 2: só aceita chamadas identificadas como vindas do site.
  // O frontend envia origemRequisicao: "SiteRetroNFC" em todas as chamadas.
  if (body.origemRequisicao !== "SiteRetroNFC") {
    Logger.log("Origem rejeitada: " + body.origemRequisicao);
    return resposta("origem-invalida");
  }

  try {
    switch (body.tipo) {

      // --- Clique no botão "Minha Estante" ---
      case "Acesso":
        registrarLinha("Acesso", body.origem || "", body.jogos || "");
        break;

      // --- Clique no botão "Comprar" na coleção ---
      case "Compra":
        registrarLinha("Compra", body.jogo || "", "");
        break;

      // --- Sessão de jogo: encaminha para o Telegram ---
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
// REGISTRO EM PLANILHA (Acesso e Compra)
// =====================================================

function registrarLinha(tipo, campo1, campo2) {
  var idPlanilha = PROP.getProperty("SPREADSHEET_ID");

  // Sem planilha configurada: sai silenciosamente, sem erro.
  if (!idPlanilha) return;

  try {
    var planilha = SpreadsheetApp.openById(idPlanilha);
    var aba = planilha.getSheetByName("Registros");

    if (!aba) {
      aba = planilha.insertSheet("Registros");
    }

    // Cria o cabeçalho na primeira vez
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

  // Freio contra flood: conta quantas mensagens saíram neste minuto
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
    UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + token + "/sendMessage",
      {
        method: "post",
        contentType: "application/json",
        payload: payload,
        muteHttpExceptions: true
      }
    );
  } catch (err) {
    Logger.log("Erro ao enviar para o Telegram: " + err.message);
  }
}

// =====================================================
// TESTE
// =====================================================
// Abrir a URL do Web App no navegador deve mostrar "Retrô NFC Backend — OK".
// O frontend usa POST com Content-Type text/plain justamente para ser uma
// "simple request" e não disparar preflight CORS.

function doGet(e) {
  return resposta("Retrô NFC Backend — OK");
}

function resposta(txt) {
  return ContentService
    .createTextOutput(txt)
    .setMimeType(ContentService.MimeType.TEXT);
}
