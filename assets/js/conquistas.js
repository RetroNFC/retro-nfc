// =====================================================
// RETRO NFC — conquistas.js
// Conquistas locais (localStorage). Sem backend, sem sync.
// Falha de armazenamento nunca bloqueia nada.
// Carregar ANTES de app.js no play.html.
// =====================================================

(function (global) {
    'use strict';

    var CH = {
        conquistas: 'retronfc_conquistas',
        jogados:    'retronfc_jogados',
        dias:       'retronfc_dias',
        tempo:      'retronfc_tempo_total',
        ultima:     'retronfc_ultima_visita',
        colecao:    'retronfc_colecao',
        favs:       'retronfc_favoritos',
        visitas:    'retronfc_visitas',
        trilha:     'retronfc_trilha',
        partilha:   'retronfc_partilha',
        saudade:    'retronfc_saudade'
    };

    var _mem = {};

    function get(k) {
        try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {}
        return (k in _mem) ? _mem[k] : null;
    }

    function set(k, v) {
        _mem[k] = String(v);
        try { localStorage.setItem(k, String(v)); } catch (e) {}
    }

    function lista(k) {
        try {
            var v = JSON.parse(get(k) || '[]');
            return Array.isArray(v) ? v : [];
        } catch (e) { return []; }
    }

    function numero(k) {
        var n = parseInt(get(k) || '0', 10);
        return (isFinite(n) && n > 0) ? n : 0;
    }

    function hojeISO() {
        var d = new Date();
        return d.getFullYear() + '-' +
            ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
            ('0' + d.getDate()).slice(-2);
    }

    function diasEntre(a, b) {
        var pa = Date.parse(a + 'T00:00:00');
        var pb = Date.parse(b + 'T00:00:00');
        if (!isFinite(pa) || !isFinite(pb)) return 0;
        return Math.round((pb - pa) / 86400000);
    }

    // --- Presença: roda uma vez por carga de página ---
    function registrarPresenca() {
        var hoje = hojeISO();
        var ultima = get(CH.ultima);

        if (ultima && diasEntre(ultima, hoje) >= 30) set(CH.saudade, '1');
        set(CH.ultima, hoje);

        var dias = lista(CH.dias);
        if (dias.indexOf(hoje) === -1) {
            dias.push(hoje);
            set(CH.dias, JSON.stringify(dias.slice(-60)));
        }
    }

    function registrarJogo(key) {
        if (!key) return;
        var j = lista(CH.jogados);
        if (j.indexOf(key) === -1) {
            j.push(key);
            set(CH.jogados, JSON.stringify(j));
        }
    }

    function somarTempo(ms) {
        if (!ms || ms < 1000) return;
        set(CH.tempo, numero(CH.tempo) + Math.round(ms));
    }

    function marcar(nome) {
        if (!nome) return;
        set('retronfc_' + nome, '1');
    }

    // --- Maratona: só conta com a aba visível ---
    var maratonaAcumulada = 0;
    var maratonaInicio = 0;
    var ticker = null;

    function maratonaAgora() {
        return maratonaAcumulada + (maratonaInicio ? (Date.now() - maratonaInicio) : 0);
    }

    function pausarMaratona() {
        if (!maratonaInicio) return;
        maratonaAcumulada += Date.now() - maratonaInicio;
        maratonaInicio = 0;
    }

    function retomarMaratona() {
        if (maratonaInicio) return;
        maratonaInicio = Date.now();
    }

    function iniciarMaratona() {
        retomarMaratona();
        if (ticker) return;
        ticker = setInterval(function () {
            if (document.visibilityState === 'visible') {
                somarTempo(30000);
                avaliar();
            }
        }, 30000);
    }

    document.addEventListener('visibilitychange', function () {
        if (!ticker) return;
        if (document.visibilityState === 'hidden') pausarMaratona();
        else retomarMaratona();
    });

    // --- Contexto avaliado pelas regras ---
    function contexto() {
        var h = new Date().getHours();
        return {
            colecao:  lista(CH.colecao).length,
            favs:     lista(CH.favs).length,
            visitas:  numero(CH.visitas),
            jogados:  lista(CH.jogados).length,
            dias:     lista(CH.dias).length,
            tempo:    numero(CH.tempo),
            maratona: maratonaAgora(),
            flags: {
                saudade:   get(CH.saudade) === '1',
                trilha:    get(CH.trilha) === '1',
                partilha:  get(CH.partilha) === '1',
                madrugada: (h >= 0 && h < 5)
            }
        };
    }

    var FAMILIAS = {
        site:    { titulo: 'SITE',          arte: 'site.webp' },
        colecao: { titulo: 'COLEÇÃO',       arte: 'colecao.webp' },
        tempo:   { titulo: 'TEMPO DE JOGO', arte: 'tempo.webp' },
        habito:  { titulo: 'HÁBITO',        arte: 'habito.webp' },
        humor:   { titulo: 'HUMOR',         arte: 'humor.webp' },
        estante: { titulo: 'ESTANTE',       arte: 'estante.webp' }
    };

    var ORDEM = ['site', 'colecao', 'tempo', 'habito', 'humor', 'estante'];

    var HORA = 3600000;

    var LISTA = [
        { id: 'visita_1',    familia: 'site',    nivel: 1, arte: 'site.webp', nome: 'PRIMEIRO JOGO',       desc: 'Abriu um jogo pela primeira vez.',            meta: 1,        valor: function (c) { return c.visitas; } },
        { id: 'visita_100',  familia: 'site',    nivel: 3, arte: 'cem_partidas.webp', nome: 'CEM PARTIDAS',        desc: 'Abriu um jogo cem vezes.',                    meta: 100,      valor: function (c) { return c.visitas; } },

        { id: 'cartucho_1',  familia: 'colecao', nivel: 1, arte: 'colecao.webp', nome: 'PRIMEIRO CARTUCHO',   desc: 'Um cartucho na estante.',                     meta: 1,        valor: function (c) { return c.colecao; } },
        { id: 'cartucho_5',  familia: 'colecao', nivel: 2, arte: 'cinco_cartuchos.webp', nome: 'CINCO CARTUCHOS',     desc: 'Cinco cartuchos na estante.',                 meta: 5,        valor: function (c) { return c.colecao; } },
        { id: 'cartucho_10', familia: 'colecao', nivel: 2, arte: 'dez_cartuchos.webp', nome: 'DEZ CARTUCHOS',       desc: 'Dez cartuchos na estante.',                   meta: 10,       valor: function (c) { return c.colecao; } },
        { id: 'cartucho_20', familia: 'colecao', nivel: 3, arte: 'vinte_cartuchos.webp', nome: 'VINTE CARTUCHOS',     desc: 'Vinte cartuchos na estante.',                 meta: 20,       valor: function (c) { return c.colecao; } },
        { id: 'cartucho_30', familia: 'colecao', nivel: 4, arte: 'estante_completa.webp', nome: 'ESTANTE COMPLETA',    desc: 'Os trinta cartuchos do catálogo.',            meta: 30,       valor: function (c) { return c.colecao; } },

        { id: 'tempo_1h',    familia: 'tempo',   nivel: 1, arte: 'tempo.webp', nome: 'UMA HORA',            desc: 'Uma hora de jogo acumulada.',                 meta: HORA,     valor: function (c) { return c.tempo; } },
        { id: 'tempo_10h',   familia: 'tempo',   nivel: 2, arte: 'dez_horas.webp', nome: 'DEZ HORAS',           desc: 'Dez horas de jogo acumuladas.',               meta: 10 * HORA, valor: function (c) { return c.tempo; } },
        { id: 'tempo_100h',  familia: 'tempo',   nivel: 4, arte: 'cem_horas.webp', nome: 'CEM HORAS',           desc: 'Cem horas de jogo acumuladas.',               meta: 100 * HORA, valor: function (c) { return c.tempo; } },

        { id: 'dias_7',      familia: 'habito',  nivel: 2, arte: 'habito.webp', nome: 'SETE DIAS',           desc: 'Jogou em sete dias diferentes.',              meta: 7,        valor: function (c) { return c.dias; } },
        { id: 'dias_30',     familia: 'habito',  nivel: 3, arte: 'um_mes.webp', nome: 'UM MÊS',              desc: 'Jogou em trinta dias diferentes.',            meta: 30,       valor: function (c) { return c.dias; } },
        { id: 'saudade',     familia: 'habito',  nivel: 3, arte: 'saudade.webp', nome: 'SAUDADE',             desc: 'Voltou depois de trinta dias fora.',          meta: 1,        valor: function (c) { return c.flags.saudade ? 1 : 0; } },

        { id: 'madrugada',   familia: 'humor',   nivel: 2, arte: 'humor.webp', nome: 'MADRUGADA',           desc: 'Abriu um jogo entre meia-noite e cinco.',     meta: 1,        valor: function (c) { return c.flags.madrugada ? 1 : 0; } },
        { id: 'maratona_1h', familia: 'humor',   nivel: 2, arte: 'maratona.webp', nome: 'MARATONA',            desc: 'Uma hora seguida no mesmo jogo.',             meta: HORA,     valor: function (c) { return c.maratona; } },
        { id: 'maratona_5h', familia: 'humor',   nivel: 4, arte: 'maratona_epica.webp', nome: 'MARATONA ÉPICA',      desc: 'Cinco horas seguidas no mesmo jogo.',         meta: 5 * HORA, valor: function (c) { return c.maratona; } },

        { id: 'favorito_1',  familia: 'estante', nivel: 1, arte: 'estante.webp', nome: 'FAVORITO',            desc: 'Marcou um cartucho com a estrela.',           meta: 1,        valor: function (c) { return c.favs; } },
        { id: 'favorito_5',  familia: 'estante', nivel: 2, arte: 'cinco_favoritos.webp', nome: 'CINCO FAVORITOS',     desc: 'Marcou cinco cartuchos.',                     meta: 5,        valor: function (c) { return c.favs; } },
        { id: 'partilhou',   familia: 'estante', nivel: 2, arte: 'mostrei_pra_galera.webp', nome: 'MOSTREI PRA GALERA',  desc: 'Gerou o card da estante.',                    meta: 1,        valor: function (c) { return c.flags.partilha ? 1 : 0; } },
        { id: 'trilha',      familia: 'estante', nivel: 1, arte: 'no_embalo_da_trilha.webp', nome: 'NO EMBALO DA TRILHA', desc: 'Abriu a estante com música.',                 meta: 1,        valor: function (c) { return c.flags.trilha ? 1 : 0; } }
    ];

    // --- Estado gravado ---
    function desbloqueadas() {
        var l = lista(CH.conquistas), out = [];
        for (var i = 0; i < l.length; i++) {
            if (l[i] && typeof l[i].id === 'string') out.push(l[i]);
        }
        return out;
    }

    function idsDesbloqueados() {
        return desbloqueadas().map(function (d) { return d.id; });
    }

    function porId(id) {
        for (var i = 0; i < LISTA.length; i++) if (LISTA[i].id === id) return LISTA[i];
        return null;
    }

    function avaliar() {
        var c = contexto();
        var feitos = idsDesbloqueados();
        var guardar = desbloqueadas();
        var novos = [];

        LISTA.forEach(function (a) {
            if (feitos.indexOf(a.id) !== -1) return;
            var v = 0;
            try { v = a.valor(c) || 0; } catch (e) { v = 0; }
            if (v >= a.meta) {
                guardar.push({ id: a.id, em: Date.now() });
                novos.push(a);
            }
        });

        if (novos.length) {
            set(CH.conquistas, JSON.stringify(guardar));
            enfileirar(novos);
        }
        return novos;
    }

    // --- DOM ---
    function el(tag, cls, txt) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (txt != null) n.textContent = txt;
        return n;
    }

    function arte(a) {
        if (!a) return 'assets/img/site.webp';
        if (a.arte) return 'assets/img/' + a.arte;
        return 'assets/img/' + (FAMILIAS[a.familia] ? FAMILIAS[a.familia].arte : 'site.webp');
    }

    var overlay = null, painel = null, faixa = null;
    var fila = [], mostrando = false;

    function montarOverlay() {
        if (overlay) return;
        overlay = el('div', 'cq-overlay');
        overlay.id = 'cqOverlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        var caixa = el('div', 'cq-caixa');
        caixa.appendChild(el('p', 'cq-titulo', 'CONQUISTA DESBLOQUEADA!'));

        var selo = el('img', 'cq-selo');
        selo.id = 'cqSelo';
        selo.alt = '';
        caixa.appendChild(selo);

        var nome = el('p', 'cq-nome');
        nome.id = 'cqNome';
        caixa.appendChild(nome);

        var desc = el('p', 'cq-desc');
        desc.id = 'cqDesc';
        caixa.appendChild(desc);

        var cont = el('p', 'cq-contador');
        cont.id = 'cqContador';
        caixa.appendChild(cont);

        var btn = el('button', 'cq-btn', 'BORA!');
        btn.type = 'button';
        btn.id = 'cqBtn';
        btn.addEventListener('click', fecharOverlay);
        caixa.appendChild(btn);

        overlay.appendChild(caixa);
        document.body.appendChild(overlay);
    }

    function enfileirar(novos) {
        for (var i = 0; i < novos.length; i++) fila.push(novos[i]);
        if (!mostrando) mostrarProximo();
    }

    function mostrarProximo() {
        if (!fila.length) { mostrando = false; return; }

        // Não briga com a celebração de cartucho novo
        if (document.querySelector('.celebra.aberta')) {
            setTimeout(mostrarProximo, 700);
            return;
        }

        montarOverlay();
        mostrando = true;

        var a = fila.shift();
        var feitos = idsDesbloqueados().length;

        document.getElementById('cqSelo').src = arte(a);
        document.getElementById('cqNome').textContent = a.nome;
        document.getElementById('cqDesc').textContent = a.desc;
        document.getElementById('cqContador').textContent = feitos + ' DE ' + LISTA.length;

        overlay.classList.add('aberta');
        document.getElementById('cqBtn').focus();
    }

    function fecharOverlay() {
        if (!overlay) return;
        overlay.classList.remove('aberta');
        setTimeout(mostrarProximo, 220);
    }

    function montarPainel() {
        if (painel) return;
        painel = el('div', 'cq-painel');
        painel.id = 'cqPainel';
        painel.setAttribute('role', 'dialog');
        painel.setAttribute('aria-modal', 'true');

        var caixa = el('div', 'cq-painel-caixa');
        caixa.appendChild(el('p', 'cq-painel-titulo', 'CONQUISTAS'));

        var sub = el('p', 'cq-painel-sub');
        sub.id = 'cqPainelSub';
        caixa.appendChild(sub);

        var corpo = el('div', 'cq-lista');
        corpo.id = 'cqLista';
        caixa.appendChild(corpo);

        var btn = el('button', 'cq-btn', 'FECHAR');
        btn.type = 'button';
        btn.addEventListener('click', fecharPainel);
        caixa.appendChild(btn);

        painel.appendChild(caixa);
        document.body.appendChild(painel);
    }

    function pintarPainel() {
        montarPainel();
        var feitos = idsDesbloqueados();
        var c = contexto();

        document.getElementById('cqPainelSub').textContent =
            feitos.length + ' DE ' + LISTA.length;

        var corpo = document.getElementById('cqLista');
        corpo.innerHTML = '';

        ORDEM.forEach(function (fam) {
            var itens = LISTA.filter(function (a) { return a.familia === fam; });
            if (!itens.length) return;

            corpo.appendChild(el('p', 'cq-grupo', FAMILIAS[fam].titulo));

            itens.forEach(function (a) {
                var aberta = feitos.indexOf(a.id) !== -1;
                var reg = desbloqueadas().filter(function (d) { return d.id === a.id; })[0];

                var linha = el('div', 'cq-item' + (aberta ? ' aberta' : ''));

                var img = el('img', 'cq-item-selo');
                img.src = arte(a);
                img.alt = '';
                linha.appendChild(img);

                var txt = el('div', 'cq-item-txt');
                txt.appendChild(el('p', 'cq-item-nome', a.nome));
                txt.appendChild(el('p', 'cq-item-desc', a.desc));

                var prog = '';
                if (aberta && reg && reg.em) {
                    prog = new Date(reg.em).toLocaleDateString('pt-BR');
                } else {
                    var v = 0;
                    try { v = a.valor(c) || 0; } catch (e) { v = 0; }
                    if (a.meta > 1) {
                        prog = Math.min(v, a.meta) + ' / ' + a.meta;
                    } else {
                        prog = 'BLOQUEADA';
                    }
                }
                txt.appendChild(el('p', 'cq-item-prog', prog));

                linha.appendChild(txt);
                corpo.appendChild(linha);
            });
        });
    }

    function abrirPainel() {
        pintarPainel();
        painel.classList.add('aberta');
    }

    function fecharPainel() {
        if (painel) painel.classList.remove('aberta');
    }

    function montarFaixa(alvo) {
        if (faixa) return faixa;
        var destino = alvo || document.getElementById('conteudo');
        if (!destino || !destino.parentNode) return null;

        faixa = el('div', 'cq-faixa');
        faixa.id = 'cqFaixa';

        var topo = el('button', 'cq-faixa-topo');
        topo.type = 'button';
        topo.appendChild(el('span', 'cq-faixa-rotulo', 'CONQUISTAS'));
        var cont = el('span', 'cq-faixa-contador');
        cont.id = 'cqFaixaContador';
        topo.appendChild(cont);
        topo.addEventListener('click', abrirPainel);
        faixa.appendChild(topo);

        var selos = el('div', 'cq-faixa-selos');
        selos.id = 'cqFaixaSelos';
        faixa.appendChild(selos);

        destino.parentNode.insertBefore(faixa, destino);
        pintarFaixa();
        return faixa;
    }

    function pintarFaixa() {
        if (!faixa) return;
        var feitos = idsDesbloqueados();
        var cont = document.getElementById('cqFaixaContador');
        if (cont) cont.textContent = feitos.length + ' DE ' + LISTA.length;

        var selos = document.getElementById('cqFaixaSelos');
        if (!selos) return;
        selos.innerHTML = '';

        LISTA.forEach(function (a) {
            var img = el('img', 'cq-selo-mini' + (feitos.indexOf(a.id) !== -1 ? ' on' : ''));
            img.src = arte(a);
            img.alt = a.nome;
            img.title = a.nome;
            selos.appendChild(img);
        });
    }

    // --- API ---
    var API = {
        total: function () { return LISTA.length; },
        listar: function () { return LISTA.slice(); },
        desbloqueadas: desbloqueadas,
        avaliar: avaliar,
        registrarJogo: registrarJogo,
        somarTempo: somarTempo,
        marcar: marcar,
        iniciarMaratona: iniciarMaratona,
        montarFaixa: montarFaixa,
        pintarFaixa: pintarFaixa,
        abrirPainel: abrirPainel
    };

    global.Conquistas = API;

    // --- Boot ---
    function iniciar() {
        registrarPresenca();
        montarOverlay();
        montarPainel();
        if (document.getElementById('conteudo')) montarFaixa();
        avaliar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }

})(window);
