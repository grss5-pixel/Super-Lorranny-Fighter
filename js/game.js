/* ==========================================================================
   SUPER LORRANNY FIGHTER — arena
   Depende de js/config.js (CONFIG, ELENCO, ESCALA_GERAL).

   Controles:
     P1 (Lorranny): A D andar · W pular · S agachar · F socar · G chutar · R defender (segurar) · H especial (placeholder)
     P2 (Vitor):    ← → andar · ↑ pular · ↓ agachar · , socar · . chutar · / defender (segurar) · ; especial (placeholder)
     F2 menu de pausa (1 jogador vs computador / 2 jogadores) · F1 debug

   Estrutura:
     1. Carregamento de imagens
     2. Entrada (teclado, menu)
     3. Lutador (estado, física, animação, dano)
     4. Computador (modo 1 jogador)
     5. Colisão entre corpos e acertos
     6. Desenho (cenário, sprite, HUD, debug)
     7. Loop principal
   ========================================================================== */

(() => {
  'use strict';

  const canvas = document.getElementById('jogo');
  const ctx = canvas.getContext('2d');
  const avisoCarregando = document.getElementById('carregando');
  const menuEl = document.getElementById('menu');
  const menuModo = document.getElementById('menu-modo');
  const menuBotoes = [...menuEl.querySelectorAll('button')];
  const ctrlP1 = document.getElementById('ctrl-p1');
  const ctrlP2 = document.getElementById('ctrl-p2');
  const palco = document.querySelector('.palco');

  /* ------------------------------------------------------------------ 1 */
  const imagens = {};

  // Arenas da tela de seleção de arena (CONFIG.arenas). Sem a lista, usa só a arena padrão.
  const ARENAS = (CONFIG.arenas && CONFIG.arenas.length)
    ? CONFIG.arenas
    : [{ id: 'padrao', nome: 'ARENA', fundo: CONFIG.arena.fundo }];
  const CHAO_Y_PADRAO = CONFIG.arena.chaoY;
  // Partida: coroas (vidas) de cada lutador e tempos dos banners
  const PARTIDA = Object.assign({
    coroas: 3,           // quem perder todas as coroas primeiro perde a partida
    tempoRound: 1.3,     // segundos do banner "ROUND N"
    tempoFight: 0.8,     // segundos do banner "FIGHT!"
    tempoVitoria: 3.4,   // segundos da tela de vitória da partida
  }, CONFIG.partida || {});
  // Menu principal: imagem de fundo, logo e qual trecho do cenário aparece (cameraX = coluna da imagem na borda esquerda)
  const MENU_P = Object.assign({
    fundo: 'assets/ui/menu-fundo.png',
    logo: 'assets/ui/logo.png',
    cameraX: 258,
  }, CONFIG.menuPrincipal || {});

  function carregarImagem(url) {
    if (imagens[url]) return Promise.resolve(imagens[url]);
    return new Promise((ok, falha) => {
      const img = new Image();
      img.onload = () => { imagens[url] = img; ok(img); };
      img.onerror = () => falha(new Error('Não achei a imagem: ' + url));
      img.src = url;
    });
  }

  async function carregarTudo() {
    const urls = [CONFIG.arena.fundo, MENU_P.fundo, MENU_P.logo, ...ARENAS.map((a) => a.fundo)];
    for (const e of ELENCO) {
      if (e.bloqueado) continue;
      urls.push(e.retrato);
      for (const folha of Object.values(e.def.folhas)) urls.push(folha.arquivo);
    }
    const tarefas = urls.map(carregarImagem);
    if (document.fonts && document.fonts.load) {
      tarefas.push(
        Promise.race([
          document.fonts.load('20px "Press Start 2P"'),
          new Promise((r) => setTimeout(r, 1500)),
        ]).catch(() => {})
      );
    }
    await Promise.all(tarefas);
  }

  /* ------------------------------------------------------------------ 2 */
  const ACOES = ['esq', 'dir', 'cima', 'baixo', 'soco', 'chute', 'especial', 'defesa'];
  const JOGADORES = ['p1', 'p2'];

  const teclas = {};
  const pendentes = {};
  for (const j of JOGADORES) {
    teclas[j] = Object.fromEntries(ACOES.map((a) => [a, false]));
    pendentes[j] = { soco: false, chute: false, cima: false }; // "apertou agora" (1 frame)
  }

  let debug = false;
  let menuAberto = false;
  let modo = '2p';         // '2p' | 'cpu'
  let focoMenu = 0;

  function bateTecla(b, e) {
    if (!b) return false;
    return (b.code !== undefined && e.code === b.code) || (b.key !== undefined && e.key === b.key);
  }

  // Mapa de teclas ativo. No modo 1 jogador, o P1 usa o estilo antigo (setas + A/S) e o P2 é o computador.
  function mapa(j) {
    if (modo === 'cpu') return j === 'p1' ? CONFIG.controlesSolo.p1 : null;
    return CONFIG.controles[j];
  }

  function acharAcao(e) {
    for (const j of JOGADORES) {
      const m = mapa(j);
      if (!m) continue;
      for (const a of ACOES) {
        if (bateTecla(m[a], e)) return [j, a];
      }
    }
    return null;
  }

  function soltarTudo() {
    for (const j of JOGADORES) {
      for (const a of ACOES) teclas[j][a] = false;
      pendentes[j].soco = false;
      pendentes[j].chute = false;
      pendentes[j].cima = false;
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      e.preventDefault();
      if (telaMenuPrincipal || e.repeat) return;
      if (menuAberto) {              // na pausa: Esc volta ao menu principal
        fecharMenu();
        fadeOut(abrirMenuPrincipal);
        return;
      }
      if (telaSelecao) {             // na seleção de personagem ou arena: Esc volta ao menu principal
        if (sel.vsT === null) fadeOut(abrirMenuPrincipal);
        return;
      }
      abrirMenu();                   // durante a luta: Esc abre a pausa
      return;
    }
    if (menuAberto) {
      // com o menu aberto, as setas e W/S só navegam; Enter/Espaço clicam no botão focado
      if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code) && !e.repeat) {
        e.preventDefault();
        focar(focoMenu + (e.code === 'ArrowUp' || e.code === 'KeyW' ? -1 : 1));
      } else if (e.code === 'Escape') {
        e.preventDefault();
        fecharMenu();
      }
      return;
    }
    if (e.code === 'F1') { e.preventDefault(); debug = !debug; return; }
    if (e.code === 'F3') { e.preventDefault(); if (!e.repeat) palco.classList.toggle('sem-crt'); return; }
    if (telaMenuPrincipal) { menuPrincipalTecla(e); return; }
    if (telaSelecao) { selecaoTecla(e); return; } // na seleção de personagens as teclas só movem/confirmam

    const b = acharAcao(e);
    if (!b) return;
    e.preventDefault();
    const [j, a] = b;
    if (!e.repeat && (a === 'soco' || a === 'chute' || a === 'cima')) pendentes[j][a] = true;
    teclas[j][a] = true;
  });

  window.addEventListener('keyup', (e) => {
    // solta a tecla em qualquer um dos mapas (normal e solo)
    for (const j of JOGADORES) {
      for (const m of [CONFIG.controles[j], (CONFIG.controlesSolo || {})[j]]) {
        if (!m) continue;
        for (const a of ACOES) {
          if (bateTecla(m[a], e)) teclas[j][a] = false;
        }
      }
    }
  });

  window.addEventListener('blur', soltarTudo);

  function lerEntrada(j) {
    const t = teclas[j];
    return {
      esq: t.esq, dir: t.dir, cima: t.cima, baixo: t.baixo, defesa: t.defesa,
      socoApertado: pendentes[j].soco, chuteApertado: pendentes[j].chute,
      cimaApertado: pendentes[j].cima,
    };
  }

  function limparPendentes() {
    for (const j of JOGADORES) { pendentes[j].soco = false; pendentes[j].chute = false; pendentes[j].cima = false; }
  }

  /* ---------- menu de pausa (F2) ---------- */
  let avisoMenu = ''; // ex.: quem venceu a luta
  function atualizarMenu() {
    menuModo.textContent = (avisoMenu ? avisoMenu + '\n' : '') + (modo === 'cpu'
      ? 'modo atual: 1 JOGADOR (P1) vs COMPUTADOR (P2)'
      : 'modo atual: 2 JOGADORES');
    menuBotoes.forEach((b) => b.setAttribute('aria-current', String(
      (b.dataset.acao === '2p' && modo === '2p') || (b.dataset.acao === 'cpu' && modo === 'cpu')
    )));
  }

  function linhasControles(titulo, itens) {
    return `<b>${titulo}</b>` + itens.map(([t, r]) => `<div><span class="teclas">${t.map((k) => `<kbd>${k}</kbd>`).join('')}</span> ${r}</div>`).join('');
  }

  function atualizarRodape() {
    if (modo === 'cpu') {
      ctrlP1.innerHTML = linhasControles('P1 ' + CONFIG.hud.nomeEsq, [[['←', '→'], 'andar'], [['↑'], 'pular'], [['↓'], 'agachar'], [['A'], 'socar'], [['S'], 'chutar'], [['D'], 'especial']]);
      ctrlP2.innerHTML = '<b>P2 ' + CONFIG.hud.nomeDir + '</b><div>controlado pelo computador</div>';
    } else {
      ctrlP1.innerHTML = linhasControles('P1 ' + CONFIG.hud.nomeEsq, [[['A', 'D'], 'andar'], [['W'], 'pular'], [['S'], 'agachar'], [['F'], 'socar'], [['G'], 'chutar'], [['H'], 'especial']]);
      ctrlP2.innerHTML = linhasControles('P2 ' + CONFIG.hud.nomeDir, [[['←', '→'], 'andar'], [['↑'], 'pular'], [['↓'], 'agachar'], [[','], 'socar'], [['.'], 'chutar'], [[';'], 'especial']]);
    }
  }

  function focar(i) {
    focoMenu = (i + menuBotoes.length) % menuBotoes.length;
    menuBotoes[focoMenu].focus();
  }

  let menuTimer = null;
  function abrirMenu(aviso = '') {
    avisoMenu = aviso;
    menuAberto = true;
    soltarTudo();
    atualizarMenu();
    clearTimeout(menuTimer);
    menuEl.classList.remove('saindo');
    menuEl.classList.remove('oculto'); // o CSS (menu-entrar) anima a entrada
    focar(modo === 'cpu' ? 1 : 0);
  }

  function fecharMenu() {
    avisoMenu = '';
    menuAberto = false;
    canvas.focus();
    if (menuEl.classList.contains('oculto')) return;
    menuEl.classList.add('saindo'); // anima a saída e só então esconde
    clearTimeout(menuTimer);
    menuTimer = setTimeout(() => { menuEl.classList.add('oculto'); menuEl.classList.remove('saindo'); }, 170);
  }

  function acaoMenu(acao) {
    if (acao === '2p' || acao === 'cpu') {
      definirModo(acao);
    } else if (acao === 'principal') {
      fecharMenu();
      abrirMenuPrincipal();
    } else if (acao === 'selecao') {
      fecharMenu();
      abrirSelecao();
    } else {
      fecharMenu();
    }
  }

  function definirModo(m) {
    modo = m;
    atualizarRodape();
    novaPartida();
    if (telaSelecao) abrirSelecao(); // trocou o modo na seleção: recomeça a escolha
    fecharMenu();
  }

  menuBotoes.forEach((b) => b.addEventListener('click', () => acaoMenu(b.dataset.acao)));

  /* ------------------------------------------------------------------ 3 */
  const ATAQUES = ['soco', 'chute', 'socoAgachado', 'chuteAgachado', 'socoAereo', 'chuteAereo'];

  class Lutador {
    constructor(def, x, olhaDireita) {
      this.def = def;
      this.oponente = null;
      this.reset(x, olhaDireita);
    }

    reset(x, olhaDireita) {
      this.x = x;
      this.direita = olhaDireita;
      this.alturaPulo = 0;   // 0 = no chão; negativo = no ar (sobe)
      this.vx = 0;
      this.vy = 0;
      this.noAr = false;
      this.ataquesNoAr = 0;  // ataques já feitos neste pulo
      this.jaAcertou = false; // o golpe atual já acertou alguém?
      this.recuoT = 0;       // tempo restante do empurrão de quem levou o golpe
      this.recuoVel = 0;
      this.andandoParaTras = false;
      this.guardaT = 0;
      this.recarga = { soco: 0, chute: 0 };      // tempo até poder atacar de novo
      const V = CONFIG.combate.vida;
      this.barra1 = V.barra1; // roxa (esgota primeiro)
      this.barra2 = V.barra2; // amarela
      this.rastro1 = V.barra1; // "rastro" de dano (efeito visual, desce atrás da barra)
      this.rastro2 = V.barra2;
      this.rastroEspera = 0;
      this.trocar('parado', true);
    }

    get vidaTotal() { return this.barra1 + this.barra2; }

    get derrotado() { return this.vidaTotal <= 0; }

    podeAtacar(tipo) { return this.recarga[tipo] <= 0; }

    // "soco" ou "chute", conforme o golpe em andamento (em pé, agachado ou no ar)
    get tipoDeGolpe() {
      if (this.estado.startsWith('soco')) return 'soco';
      if (this.estado.startsWith('chute')) return 'chute';
      return null;
    }

    tirarVida(dano) {
      const da1 = Math.min(this.barra1, dano);
      this.barra1 -= da1;
      this.barra2 = Math.max(0, this.barra2 - (dano - da1));
      this.rastroEspera = 0.45;
    }

    atualizarRastro(dt) {
      if (this.rastroEspera > 0) { this.rastroEspera -= dt; return; }
      const V = CONFIG.combate.vida;
      this.rastro1 = Math.max(this.barra1, this.rastro1 - V.barra1 * 0.8 * dt);
      this.rastro2 = Math.max(this.barra2, this.rastro2 - V.barra2 * 0.8 * dt);
    }

    get estado() { return this.anim.nome; }

    get atacando() { return ATAQUES.includes(this.estado); }

    // defendendo = segurando a guarda (inclui a preparação); guardaAtiva = já no quadro de bloqueio (reduz o dano)
    // caído = derrotado: lançado, caindo ou deitado no chão (sem controle)
    get caido() { return this.estado === 'derrota' || this.estado === 'derrotaChao'; }

    get defendendo() { return this.estado === 'defesa'; }

    get guardaAtiva() {
      if (this.estado === 'defesa') return this.anim.passo >= 1;
      return CONFIG.defesa.guardaAndandoParaTras && this.estado === 'andando' && this.andandoParaTras;
    }

    get atacandoNoAr() { return this.estado === 'socoAereo' || this.estado === 'chuteAereo'; }

    get atacandoAgachado() { return this.estado === 'socoAgachado' || this.estado === 'chuteAgachado'; }

    trocar(nome, forcar = false) {
      if (!forcar && this.anim && this.anim.nome === nome) return;
      this.anim = { nome, passo: 0, tempo: 0, terminou: false };
    }

    avancarAnimacao(ms) {
      const a = this.anim;
      const def = this.def.animacoes[a.nome];
      if (a.terminou) return;
      a.tempo += ms;
      while (a.tempo >= def.duracao[a.passo]) {
        a.tempo -= def.duracao[a.passo];
        if (a.passo + 1 >= def.sequencia.length) {
          if (def.loop) { a.passo = 0; }
          else { a.terminou = true; a.tempo = 0; break; } // fica no último quadro
        } else {
          a.passo++;
        }
      }
    }

    get quadroAtual() {
      const def = this.def.animacoes[this.anim.nome];
      if (def.porVelocidade) {
        // escolhe o quadro pela velocidade vertical: subida → topo → descida
        const vMax = CONFIG.fisica.velPulo;
        const n = def.sequencia.length;
        const t = (this.vy + vMax) / (2 * vMax);
        const i = Math.max(0, Math.min(n - 1, Math.floor(t * n)));
        return def.sequencia[i];
      }
      return def.sequencia[this.anim.passo];
    }

    voltarAoNormal() {
      this.trocar(this.noAr ? 'pulo' : 'parado');
    }

    iniciarAtaque(tipo) {
      const sufixo = this.noAr ? 'Aereo' : (this.estado === 'agachar' ? 'Agachado' : '');
      if (this.noAr) this.ataquesNoAr++;
      this.jaAcertou = false;
      this.recarga[tipo] = CONFIG.combate.recarga[tipo];
      this.trocar(tipo + sufixo, true);
    }

    levarDano(atacante, dano) {
      this.tirarVida(dano);
      this.trocar('dano', true);
      this.jaAcertou = false;
      const sentido = this.x >= atacante.x ? 1 : -1;
      this.recuoVel = sentido * CONFIG.regras.recuoAoAcertar;
      this.recuoT = CONFIG.regras.duracaoRecuo;
    }

    // golpe final: perde o controle, é lançado para trás e cai
    derrotar(atacante) {
      const D = CONFIG.combate.derrota;
      this.noAr = true;
      this.ataquesNoAr = 0;
      this.vy = -D.velPulo;
      this.vx = (this.x >= atacante.x ? 1 : -1) * D.velX;
      this.recuoT = 0;
      this.trocar('derrota', true);
    }

    // golpe bloqueado: só uma fração do dano passa, empurrão menor e sem animação de dano
    defender(atacante, dano) {
      const D = CONFIG.defesa;
      this.tirarVida(dano * D.fatorDano);
      if (this.estado !== 'defesa') {
        this.trocar('defesa', true);
        this.anim.passo = 1;            // já no quadro de bloqueio
        this.guardaT = D.tempoGuardaAuto;
      }
      const sentido = this.x >= atacante.x ? 1 : -1;
      this.recuoVel = sentido * D.recuo;
      this.recuoT = D.duracaoRecuo;
    }

    movimento(direcao, e, F) {
      if (this.noAr) {
        this.trocar('pulo');           // no ar: mantém a direção do pulo
        return;
      }
      if (e.baixo) {
        this.trocar('agachar');
        this.vx = 0;
        return;
      }
      if (this.estado === 'agachar' || (this.estado === 'levantar' && !this.anim.terminou)) {
        this.trocar('levantar');
        this.vx = 0;
        return;
      }
      if (e.cima || e.cimaApertado) {
        this.noAr = true;
        this.ataquesNoAr = 0;
        this.vy = -F.velPulo;
        this.vx = direcao * (F.velPuloX || F.velAndar);
        this.trocar('pulo', true);
        return;
      }
      if (direcao) {
        this.trocar('andando');
        this.vx = direcao * F.velAndar;
        return;
      }
      this.trocar('parado');
      this.vx = 0;
    }

    atualizar(dt, e) {
      const F = CONFIG.fisica;
      const R = CONFIG.regras;
      const ms = dt * 1000;
      const direcao = e.dir && !e.esq ? 1 : e.esq && !e.dir ? -1 : 0;
      this.guardaT = Math.max(0, this.guardaT - dt);
      this.andandoParaTras = !this.noAr && direcao !== 0 && direcao === (this.direita ? -1 : 1);

      this.recuoT = Math.max(0, this.recuoT - dt);
      this.recarga.soco  = Math.max(0, this.recarga.soco  - dt);
      this.recarga.chute = Math.max(0, this.recarga.chute - dt);

      if (this.caido) {
        this.avancarAnimacao(ms); // sem controle: só a física abaixo age
      } else if (this.estado === 'dano') {
        this.avancarAnimacao(ms);
        if (this.anim.terminou) this.voltarAoNormal();
        if (!this.noAr) this.vx = 0;
      } else if (this.atacando) {
        this.avancarAnimacao(ms * CONFIG.combate.velocidadeGolpe[this.tipoDeGolpe]);
        if (this.anim.terminou) {
          if (this.atacandoAgachado) {
            // volta ao agachado já no último quadro; o movimento decide se levanta
            this.trocar('agachar', true);
            this.anim.passo = this.def.animacoes.agachar.sequencia.length - 1;
            this.anim.terminou = true;
          } else {
            this.voltarAoNormal();
          }
        }
        if (!this.noAr) this.vx = 0; // no chão o golpe é parado
      } else if (this.estado === 'defesaFim') {
        // recuperação da defesa: toca o quadro e volta ao normal
        this.avancarAnimacao(ms);
        if (this.anim.terminou) this.voltarAoNormal();
        this.vx = 0;
      } else if (this.estado === 'defesa') {
        // segura a guarda enquanto a tecla estiver apertada (no mínimo até o quadro de bloqueio)
        this.avancarAnimacao(ms);
        if (!e.defesa && this.guardaT <= 0 && this.anim.passo >= 1) this.trocar('defesaFim', true);
        this.vx = 0;
      } else {
        const tipo = e.socoApertado ? 'soco' : e.chuteApertado ? 'chute' : null;
        const agachado = this.estado === 'agachar';
        const podeNoAr = !this.noAr || this.ataquesNoAr < F.ataquesAereosPorPulo;
        const levantando = this.estado === 'agachar' || (this.estado === 'levantar' && !this.anim.terminou);
        const querDefender = e.defesa && !this.noAr && !e.baixo && !levantando;
        const permitido = !querDefender && tipo && this.podeAtacar(tipo) && podeNoAr && (!agachado || (tipo === 'soco' ? R.socarAgachado : R.chutarAgachado));
        if (querDefender) {
          this.trocar('defesa', true);
          this.vx = 0;
        } else if (permitido) {
          this.iniciarAtaque(tipo);
          if (!this.noAr) this.vx = 0;
        } else {
          this.movimento(direcao, e, F);
          this.avancarAnimacao(ms);
        }
      }

      // empurrão de quem levou o golpe sobrepõe a velocidade normal
      if (this.recuoT > 0) this.vx = this.recuoVel;

      // vira para o oponente (só quando não está atacando)
      if (!this.atacando && !this.caido && this.oponente) this.direita = this.oponente.x >= this.x;

      // física vertical
      if (this.noAr) {
        if (this.atacandoNoAr && F.ataqueAereoParaY) this.vy = 0;
        else this.vy += F.gravidade * dt;
        this.alturaPulo += this.vy * dt;
        if (this.alturaPulo >= 0) {
          this.alturaPulo = 0;
          this.vy = 0;
          this.noAr = false;
          this.ataquesNoAr = 0; // pousou: libera o ataque aéreo de novo
          if (this.estado === 'derrota') { this.trocar('derrotaChao'); this.vx = 0; }
          else if (this.estado === 'pulo' || this.atacandoNoAr) this.voltarAoNormal();
        }
      }

      this.x += this.vx * dt;
      this.x = Math.max(CONFIG.arena.limiteEsq, Math.min(CONFIG.arena.limiteDir, this.x));
    }

    get caixaCorpo() {
      const c = this.def.caixas;
      const agachado = this.estado === 'agachar' || this.atacandoAgachado;
      return this.caixaNoMundo(agachado ? c.corpoAgachado : c.corpoEmPe);
    }

    get caixaAtaque() {
      if (!this.atacando) return null;
      const c = this.def.caixas[this.estado + 'Ataque'];
      if (!c || !c.quadros.includes(this.quadroAtual)) return null;
      return this.caixaNoMundo(c);
    }

    caixaNoMundo(c) {
      const y = CONFIG.arena.chaoY + this.alturaPulo + c.y;
      const x = this.direita ? this.x + c.x : this.x - c.x - c.w;
      return { x, y, w: c.w, h: c.h };
    }
  }

  /* ------------------------------------------------------------------ 4 */
  // Computador (modo 1 jogador): gera as mesmas entradas que o teclado.
  const cpu = {
    tempo: 0.8,          // tempo até poder atacar de novo
    planoAgachado: null, // 'soco' | 'chute': ataque agachado pendente (precisa ficar agachado antes)
    planoT: 0,
    defendeT: 0,         // tempo restante segurando a defesa
    viuAtaque: false,    // já decidiu se defende o ataque atual do oponente?
    sortear(min, max) { return min + Math.random() * (max - min); },
    resetar() { this.tempo = 0.8; this.planoAgachado = null; this.planoT = 0; this.defendeT = 0; this.viuAtaque = false; },
    decidir(eu, outro, dt) {
      const e = { esq: false, dir: false, cima: false, baixo: false, defesa: false, socoApertado: false, chuteApertado: false };
      this.tempo -= dt;

      if (this.planoAgachado) {
        this.planoT -= dt;
        e.baixo = true;
        if (eu.estado === 'agachar' && eu.podeAtacar) {
          e[this.planoAgachado === 'soco' ? 'socoApertado' : 'chuteApertado'] = true;
          this.planoAgachado = null;
          this.tempo = this.sortear(CONFIG.cpu.pausaMin, CONFIG.cpu.pausaMax);
        } else if (this.planoT <= 0) {
          this.planoAgachado = null;
        }
        return e;
      }

      if (eu.estado === 'dano' || eu.atacando) return e;

      const dx = outro.x - eu.x;
      const perto = Math.abs(dx) <= CONFIG.cpu.alcance;

      // defesa: a cada ataque do oponente que chega perto, sorteia uma vez se vai bloquear
      if (outro.atacando && !this.viuAtaque) {
        this.viuAtaque = true;
        if (perto && !eu.noAr && Math.random() < CONFIG.cpu.chanceDefender) this.defendeT = this.sortear(0.35, 0.7);
      } else if (!outro.atacando) {
        this.viuAtaque = false;
      }
      if (this.defendeT > 0 && !eu.noAr) {
        this.defendeT -= dt;
        e.defesa = true;
        return e;
      }

      if (eu.noAr) {
        if (perto && this.tempo <= 0 && eu.podeAtacar) {
          e[Math.random() < 0.5 ? 'socoApertado' : 'chuteApertado'] = true;
          this.tempo = this.sortear(CONFIG.cpu.pausaMin, CONFIG.cpu.pausaMax);
        }
        return e;
      }

      if (!perto) {
        if (dx > 0) e.dir = true; else e.esq = true;
        if (Math.random() < dt * 0.5) e.cima = true;
        return e;
      }

      if (this.tempo > 0 || !eu.podeAtacar) {
        // espera perto, às vezes recuando um pouco
        if (Math.random() < dt * 0.7) { if (dx > 0) e.esq = true; else e.dir = true; }
        return e;
      }

      const r = Math.random();
      if (r < 0.35) {
        e.socoApertado = true;
      } else if (r < 0.6) {
        e.chuteApertado = true;
      } else {
        this.planoAgachado = r < 0.8 ? 'soco' : 'chute';
        this.planoT = 0.5;
        e.baixo = true;
      }
      if (!this.planoAgachado) this.tempo = this.sortear(CONFIG.cpu.pausaMin, CONFIG.cpu.pausaMax);
      return e;
    },
  };

  /* ------------------------------------------------------------------ 5 */
  function sobrepoe(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // Os corpos não podem ficar um por cima do outro: se as caixas se cruzam, eles se afastam.
  function resolverCorpos(dt) {
    if (!CONFIG.regras.corposNaoSobrepoem) return;
    if (lorranny.caido || vitor.caido) return; // quem caiu não empurra mais ninguém
    // pulando alto, um passa por cima do outro
    const passar = CONFIG.regras.alturaParaPassar;
    if (-lorranny.alturaPulo > passar || -vitor.alturaPulo > passar) return;
    const ca = lorranny.caixaCorpo;
    const cb = vitor.caixaCorpo;
    const sobraV = Math.min(ca.y + ca.h, cb.y + cb.h) - Math.max(ca.y, cb.y);
    if (sobraV <= 0) return;
    const sobraH = Math.min(ca.x + ca.w, cb.x + cb.w) - Math.max(ca.x, cb.x);
    if (sobraH <= 0) return;

    const aEsquerda = ca.x + ca.w / 2 <= cb.x + cb.w / 2;
    const esq = aEsquerda ? lorranny : vitor;
    const dir = aEsquerda ? vitor : lorranny;
    const espacoEsq = esq.x - CONFIG.arena.limiteEsq;
    const espacoDir = CONFIG.arena.limiteDir - dir.x;

    // cada um recua metade; se um bater na parede, o outro recua o resto
    let empurraE = sobraH / 2;
    let empurraD = sobraH / 2;
    if (empurraE > espacoEsq) { empurraD += empurraE - espacoEsq; empurraE = espacoEsq; }
    if (empurraD > espacoDir) { empurraE = Math.min(espacoEsq, empurraE + empurraD - espacoDir); empurraD = espacoDir; }

    // o afastamento é gradual (evita "teleporte" ao pousar em cima do outro)
    const maxPasso = CONFIG.regras.velAfastar * dt;
    esq.x -= Math.min(empurraE, maxPasso);
    dir.x += Math.min(empurraD, maxPasso);
  }

  // ---- combo ----
  const combos = {
    esq: { n: 0, janela: 0, fade: 0, pop: 0 },
    dir: { n: 0, janela: 0, fade: 0, pop: 0 },
  };
  let paradaT = 0; // "paradinha" ao levar dano
  let lentaT = 0;  // segundos reais que ainda faltam de câmera lenta (golpe final)

  // fator de velocidade do jogo: 1 = normal; baixo durante a câmera lenta, voltando ao normal aos poucos no fim
  function escalaDeTempo() {
    if (lentaT <= 0) return 1;
    const L = CONFIG.combate.cameraLenta;
    const k = Math.min(1, lentaT / L.suavizar);
    return L.escala + (1 - L.escala) * (1 - k);
  }

  function registrarCombo(lado) {
    const c = combos[lado];
    const outro = combos[lado === 'esq' ? 'dir' : 'esq'];
    outro.n = 0; outro.janela = 0; outro.fade = 0; // quem levou o golpe perde o combo
    c.n = c.janela > 0 ? c.n + 1 : 1;
    c.janela = CONFIG.combo.janela;
    c.pop = 0.25;
    c.fade = 0;
  }

  function atualizarCombos(dt) {
    for (const c of Object.values(combos)) {
      c.pop = Math.max(0, c.pop - dt);
      if (c.janela > 0) {
        c.janela -= dt;
        if (c.janela <= 0) { c.janela = 0; c.fade = c.n >= CONFIG.combo.minimo ? 0.8 : 0; if (!c.fade) c.n = 0; }
      } else if (c.fade > 0) {
        c.fade -= dt;
        if (c.fade <= 0) { c.fade = 0; c.n = 0; }
      }
    }
  }

  function resolverAcertos() {
    if (fimDeLuta) return; // luta decidida: ninguém mais leva dano
    for (const [atacante, alvo] of [[lorranny, vitor], [vitor, lorranny]]) {
      if (atacante.jaAcertou) continue;
      const caixa = atacante.caixaAtaque;
      if (!caixa) continue;
      if (sobrepoe(caixa, alvo.caixaCorpo)) {
        atacante.jaAcertou = true;
        const dano = CONFIG.combate.dano[atacante.tipoDeGolpe];
        if (alvo.guardaAtiva) {
          // bloqueado: dano reduzido, sem animação de dano e sem contar combo
          alvo.defender(atacante, dano);
          ganharEspecial(ladoDe(alvo), dano * CONFIG.defesa.fatorDano * CONFIG.especial.porBloqueio);
          paradaT = CONFIG.defesa.paradaAoDefender;
        } else {
          alvo.levarDano(atacante, dano);
          ganharEspecial(ladoDe(atacante), dano * CONFIG.especial.porDanoCausado);
          ganharEspecial(ladoDe(alvo), dano * CONFIG.especial.porDanoRecebido); // quem apanha ganha mais
          registrarCombo(atacante === lorranny ? 'esq' : 'dir');
          paradaT = CONFIG.regras.paradaAoAcertar;
        }
        if (alvo.derrotado) {
          alvo.derrotar(atacante);
          definirFimDeLuta({ vencedor: atacante, perdedor: alvo, tempo: CONFIG.combate.atrasoFimDeLuta });
          lentaT = CONFIG.combate.cameraLenta.duracao; // câmera lenta
          break;
        }
      }
    }
  }

  /* ------------------------------------------------------------------ 6 */
  function desenharQuadro(def, nomeFolha, indiceQuadro, x, yPes, olhandoDireita, achatarY = 1) {
    const folha = def.folhas[nomeFolha];
    const [sx, sy, sw, sh, pivoX] = folha.quadros[indiceQuadro];
    const escala = folha.escala * ESCALA_GERAL;
    const dw = sw * escala;
    const dh = sh * escala * achatarY;
    const deslocPivo = (pivoX - sx) * escala;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(yPes));
    if (!olhandoDireita) ctx.scale(-1, 1);
    ctx.drawImage(imagens[folha.arquivo], sx, sy, sw, sh, -deslocPivo, -dh, dw, dh);
    ctx.restore();
  }

  function desenharLutador(l) {
    const yPes = CONFIG.arena.chaoY + l.alturaPulo;

    // sombra no chão (encolhe conforme o personagem sobe)
    const altura = -l.alturaPulo;
    const k = Math.max(0.35, 1 - altura / 700);
    ctx.save();
    ctx.globalAlpha = 0.38 * k;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(l.x, CONFIG.arena.chaoY - 4, 170 * k, 16 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const def = l.def.animacoes[l.anim.nome];
    desenharQuadro(l.def, def.folha, l.quadroAtual, l.x, yPes, l.direita, def.achatarY || 1);
  }

  /* ---------- HUD ---------- */
  const FONTE = '"Press Start 2P", "Courier New", monospace';

  function poligono(pontos) {
    ctx.beginPath();
    pontos.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
  }

  // alarga a HUD para telas mais largas que 1671px (os pontos do meio se afastam do centro)
  function alargar(pontos) {
    const d = (CONFIG.tela.largura - 1671) / 2 - 30;
    return pontos.map(([px, py]) => [px > 400 ? px + d : px, py]);
  }

  function espelhar(pontos) {
    return pontos.map(([px, py]) => [CONFIG.tela.largura - px, py]);
  }

  const COR_VIDA = {
    roxa:    { topo: '#e9a6ff', meio: '#b22bff', base: '#6a0fc9', rastro: '#f1d2ff' },
    amarela: { topo: '#fff4a8', meio: '#ffd21f', base: '#c98600', rastro: '#fffbe0' },
  };

  // Desenha uma camada de vida (roxa ou amarela) dentro do miolo já recortado.
  function camadaDeVida(pm, direita, fracao, fracaoRastro, cor) {
    const xMin = Math.min(...pm.map((p) => p[0]));
    const xMax = Math.max(...pm.map((p) => p[0]));
    const larg = xMax - xMin;
    const traco = (f, estilo, y, h) => {
      const w = Math.max(0, Math.min(1, f)) * larg;
      if (w <= 0) return;
      ctx.fillStyle = estilo;
      ctx.fillRect(direita ? xMax - w : xMin, y, w, h);
    };
    traco(fracaoRastro, cor.rastro, 59, 26); // rastro do dano recente
    const grad = ctx.createLinearGradient(0, 59, 0, 84);
    grad.addColorStop(0, cor.topo);
    grad.addColorStop(0.18, cor.meio);
    grad.addColorStop(1, cor.base);
    traco(fracao, grad, 59, 26);
    traco(fracao, 'rgba(255,255,255,0.65)', 60, 3);
  }

  // As duas barras ficam empilhadas: a roxa por cima; esgotada, aparece a amarela por baixo.
  function barraDeVida(lado, lutador) {
    const V = CONFIG.combate.vida;
    const contorno = alargar([[158, 53], [740, 53], [766, 71], [740, 90], [158, 90]]);
    const miolo    = alargar([[164, 59], [736, 59], [756, 71], [736, 84], [164, 84]]);
    const sub      = [[310, 93], [446, 93], [436, 106], [322, 106]];
    const direita = lado === 'dir';
    const pc = direita ? espelhar(contorno) : contorno;
    const pm = direita ? espelhar(miolo) : miolo;
    const ps = direita ? espelhar(sub) : sub;

    ctx.save();
    ctx.shadowColor = '#b04bff';
    ctx.shadowBlur = 14;
    poligono(pc);
    ctx.fillStyle = '#12062e';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#c15cff';
    ctx.stroke();
    ctx.restore();

    ctx.save();
    poligono(pm);
    ctx.clip();
    // 2ª barra (amarela) por baixo; só aparece quando a roxa esvazia
    camadaDeVida(pm, direita, lutador.barra2 / V.barra2, lutador.rastro2 / V.barra2, COR_VIDA.amarela);
    // 1ª barra (roxa) por cima — apaga a amarela enquanto estiver cheia
    if (lutador.rastro1 > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      camadaDeVida(pm, direita, lutador.barra1 / V.barra1, lutador.rastro1 / V.barra1, COR_VIDA.roxa);
      ctx.restore();
    }
    ctx.restore();

    poligono(ps);
    ctx.fillStyle = '#240a5c';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#9a3dff';
    ctx.stroke();

    // marcadores das 2 barras: ◆ roxo (1ª) e ◆ amarelo (2ª), apagam quando a barra esgota
    const L = CONFIG.tela.largura;
    const marcas = [[352, lutador.barra1 > 0, '#c15cff'], [404, lutador.barra2 > 0, '#ffd21f']];
    for (const [mx, ativa, cor] of marcas) {
      const x = direita ? L - mx : mx;
      ctx.save();
      ctx.translate(x, 99.5);
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(8, 0); ctx.lineTo(0, 7); ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fillStyle = ativa ? cor : 'rgba(255,255,255,0.12)';
      ctx.fill();
      ctx.restore();
    }
  }

  function coroa(cx, cy, cor, cheia) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(-15, 10);
    ctx.lineTo(-15, -6);
    ctx.lineTo(-7, 2);
    ctx.lineTo(0, -11);
    ctx.lineTo(7, 2);
    ctx.lineTo(15, -6);
    ctx.lineTo(15, 10);
    ctx.closePath();
    ctx.fillStyle = cheia || 'rgba(30,8,70,0.85)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = cor;
    ctx.stroke();
    ctx.restore();
  }

  // coroas = vidas da partida: douradas enquanto ficam; a que acaba de cair se solta e some
  function desenharCoroas(L) {
    for (const lado of ['esq', 'dir']) {
      for (let i = 0; i < PARTIDA.coroas; i++) {
        const cx = lado === 'esq' ? 176 + i * 41 : L - 176 - i * 41;
        if (i < partida.coroas[lado]) {
          coroa(cx, 118, '#ffd24a', 'rgba(255,196,60,0.55)');
        } else {
          coroa(cx, 118, '#5b4590');
          if (partida.perdaI[lado] === i && partida.perdaT[lado] > 0) {
            const t = partida.perdaT[lado], k = 1 - t; // k: 0 → 1
            ctx.save();
            ctx.globalAlpha = t;
            ctx.translate(cx, 118 + k * k * 60);
            ctx.rotate((lado === 'esq' ? -1 : 1) * k * 0.9);
            ctx.scale(1 + k * 0.5, 1 + k * 0.5);
            coroa(0, 0, '#ffd24a', 'rgba(255,196,60,0.55)');
            ctx.restore();
          }
        }
      }
    }
  }

  function barraEspecial(lado, proporcao) {
    const L = CONFIG.tela.largura;
    const W = 430, H = 30;
    const y0 = CONFIG.tela.altura - 62;
    const direita = lado === 'dir';
    ctx.save();
    if (direita) { ctx.translate(L, 0); ctx.scale(-1, 1); } // espelha: o desenho abaixo é o do lado esquerdo
    const contorno = [[24, y0 + H], [40, y0], [24 + W, y0], [10 + W, y0 + H]];

    ctx.save();
    ctx.shadowColor = '#9a3dff';
    ctx.shadowBlur = 10;
    poligono(contorno);
    ctx.fillStyle = '#1b0652';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#b04bff';
    ctx.stroke();
    ctx.restore();

    ctx.save();
    poligono(contorno);
    ctx.clip();
    ctx.fillStyle = '#ff5ad2';
    // preenche de ponta a ponta (a forma inclinada recorta as pontas); a borda cobre o resto
    ctx.fillRect(24, y0, W * Math.max(0, Math.min(1, proporcao)), H);
    ctx.restore();
    ctx.restore();

    ctx.save();
    ctx.font = `13px ${FONTE}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f5d9ff';
    ctx.shadowColor = '#c15cff';
    ctx.shadowBlur = 6;
    if (direita) { ctx.textAlign = 'right'; ctx.fillText('ESPECIAL', L - 52, y0 + H / 2 + 1); }
    else { ctx.textAlign = 'left'; ctx.fillText('ESPECIAL', 52, y0 + H / 2 + 1); }
    ctx.restore();
  }

  function desenharCombo(lado) {
    const c = combos[lado];
    if (c.n < CONFIG.combo.minimo) return;
    const L = CONFIG.tela.largura;
    const direita = lado === 'dir';
    const alfa = c.fade > 0 ? Math.min(1, c.fade / 0.4) : 1;
    const pop = 1 + (c.pop / 0.25) * 0.35;
    const x = direita ? L - 28 : 28;
    const y = 250;
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.translate(x, y);
    ctx.textAlign = direita ? 'right' : 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#12062e';
    ctx.shadowColor = '#ff5ad2';
    ctx.shadowBlur = 14;
    ctx.save();
    ctx.scale(pop, pop);
    ctx.font = `64px ${FONTE}`;
    ctx.strokeText(String(c.n), 0, 0);
    ctx.fillStyle = c.n >= 5 ? '#ffd24a' : '#fff';
    ctx.fillText(String(c.n), 0, 0);
    ctx.restore();
    ctx.font = `22px ${FONTE}`;
    ctx.strokeText(c.n === 1 ? 'HIT' : 'HITS', 0, 34);
    ctx.fillStyle = '#ff9be6';
    ctx.fillText('HITS', 0, 34);
    ctx.restore();
  }

  function desenharHUD() {
    const L = CONFIG.tela.largura;

    barraDeVida('esq', lorranny);
    barraDeVida('dir', vitor);

    ctx.save();
    ctx.shadowColor = '#c15cff';
    ctx.shadowBlur = 12;
    const R = 124;
    ctx.drawImage(imagens[CONFIG.hud.retratoEsq], 14, 12, R, R);
    ctx.drawImage(imagens[CONFIG.hud.retratoDir], L - 14 - R, 12, R, R);
    ctx.restore();
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#c15cff';
    ctx.strokeRect(14, 12, R, R);
    ctx.strokeRect(L - 14 - R, 12, R, R);
    ctx.restore();

    ctx.save();
    ctx.font = `22px ${FONTE}`;
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#12062e';
    ctx.fillStyle = '#f5e6ff';
    ctx.textAlign = 'left';
    ctx.strokeText(CONFIG.hud.nomeEsq, 156, 44);
    ctx.fillText(CONFIG.hud.nomeEsq, 156, 44);
    ctx.textAlign = 'right';
    ctx.strokeText(CONFIG.hud.nomeDir, L - 156, 44);
    ctx.fillText(CONFIG.hud.nomeDir, L - 156, 44);
    ctx.restore();

    desenharCoroas(L);

    if (mostrarTags) { // os dois lutadores são iguais: marca quem é quem
      for (let p = 0; p < 2; p++) {
        const x = p === 0 ? 14 : L - 14 - 46;
        ctx.fillStyle = COR_P[p];
        ctx.fillRect(x, 12, 46, 24);
        textoSel(rotuloJogador(p), x + 23, 25, 12, '#12062e', 'center', 'rgba(0,0,0,0)');
      }
    }

    const cx = L / 2, cy = 78;
    const hex = [[cx - 78, cy], [cx - 45, cy - 48], [cx + 45, cy - 48], [cx + 78, cy], [cx + 45, cy + 50], [cx - 45, cy + 50]];
    ctx.save();
    ctx.shadowColor = '#c15cff';
    ctx.shadowBlur = 18;
    poligono(hex);
    ctx.fillStyle = '#12062e';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#b04bff';
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.font = `58px ${FONTE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#d58cff';
    ctx.shadowBlur = 14;
    ctx.fillText(Math.ceil(hud.tempo), cx, cy);
    ctx.restore();

    ctx.save();
    ctx.font = `11px ${FONTE}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d9b3ff';
    ctx.fillText(modo === 'cpu' ? '1P vs CPU' : '2 JOGADORES', cx, cy + 76);
    ctx.restore();

    barraEspecial('esq', hud.especialEsq);
    barraEspecial('dir', hud.especialDir);
    desenharCombo('esq');
    desenharCombo('dir');
    if (fimDeLuta) {
      if (fimDeLuta.partida && fimDeLuta.tempo < PARTIDA.tempoVitoria) desenharVitoria();
      else desenharKO();
    } else if (introT > 0) desenharIntro();
  }

  // banner "ROUND N" → "FIGHT!"
  function desenharIntro() {
    const VW = CONFIG.tela.largura, VH = CONFIG.tela.altura;
    const tFight = PARTIDA.tempoFight;
    const fight = introT <= tFight;
    const ult = partida.coroas.esq === 1 && partida.coroas.dir === 1;
    const txt = fight ? 'FIGHT!' : (ult ? 'ROUND FINAL' : 'ROUND ' + partida.rodada);
    const dur = fight ? tFight : PARTIDA.tempoRound;
    const dec = fight ? tFight - introT : PARTIDA.tempoRound - (introT - tFight); // tempo desde que o texto surgiu
    const pop = 1 + Math.max(0, 1 - dec * 6) * 1.2;
    const saida = Math.min(1, (dur - dec) * 5);
    ctx.save();
    ctx.globalAlpha = Math.max(0, saida);
    ctx.translate(VW / 2, VH / 2 - 40);
    ctx.scale(pop, pop);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${fight ? 96 : 66}px ${FONTE}`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#12062e';
    ctx.shadowColor = fight ? '#ff5ad2' : '#c15cff';
    ctx.shadowBlur = 24;
    ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = fight ? '#ffd24a' : '#f5e6ff';
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  // tela de vitória da partida
  function desenharVitoria() {
    const VW = CONFIG.tela.largura, VH = CONFIG.tela.altura;
    const dec = PARTIDA.tempoVitoria - fimDeLuta.tempo;
    const esq = fimDeLuta.partida.vencedor === lorranny;
    const nome = esq ? CONFIG.hud.nomeEsq : CONFIG.hud.nomeDir;
    ctx.save();
    ctx.fillStyle = `rgba(8,2,22,${0.65 * Math.min(1, dec * 3)})`;
    ctx.fillRect(0, 0, VW, VH);
    const pop = 1 + Math.max(0, 1 - dec * 4) * 1.0;
    ctx.globalAlpha = Math.min(1, dec * 4);
    ctx.shadowColor = '#ff5ad2';
    ctx.shadowBlur = 28;
    textoSel(nome, VW / 2, VH / 2 - 50, 44 * pop, '#f5e6ff');
    textoSel('VENCEU!', VW / 2, VH / 2 + 30, 66 * pop, '#ffd24a');
    ctx.restore();
  }

  // etiqueta sobre a cabeça do lutador (P1 / P2)
  function desenharTag(l, p) {
    if (!mostrarTags || l.caido) return;
    const cx = l.x, y = l.caixaCorpo.y - 40 + Math.sin(performance.now() / 220) * 3;
    ctx.save();
    ctx.translate(cx, y);
    ctx.fillStyle = COR_P[p];
    ctx.shadowColor = COR_P[p];
    ctx.shadowBlur = 12;
    ctx.fillRect(-27, -13, 54, 26);
    ctx.beginPath(); ctx.moveTo(-8, 13); ctx.lineTo(8, 13); ctx.lineTo(0, 24); ctx.closePath(); ctx.fill();
    ctx.restore();
    textoSel(rotuloJogador(p), cx, y, 14, '#12062e', 'center', 'rgba(0,0,0,0)');
  }
  function rotuloJogador(p) { return modo === 'cpu' && p === 1 ? 'CPU' : 'P' + (p + 1); }

  function desenharKO() {
    ctx.save();
    ctx.translate(CONFIG.tela.largura / 2, CONFIG.tela.altura / 2 - 40);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `110px ${FONTE}`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#12062e';
    ctx.shadowColor = '#ff5ad2';
    ctx.shadowBlur = 24;
    ctx.strokeText('K.O.', 0, 0);
    ctx.fillStyle = '#ffd24a';
    ctx.fillText('K.O.', 0, 0);
    ctx.restore();
  }

  /* ---------- Debug (F1) ---------- */
  function retangulo(c, cor) {
    ctx.strokeStyle = cor;
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(c.x), Math.round(c.y), c.w, c.h);
  }

  function desenharDebugDe(l, nome) {
    const def = l.def.animacoes[l.anim.nome];
    const folha = l.def.folhas[def.folha];
    const yPes = CONFIG.arena.chaoY + l.alturaPulo;

    const [sx, sy, sw, sh, pivoX] = folha.quadros[l.quadroAtual];
    const esc = folha.escala * ESCALA_GERAL;
    const dw = sw * esc, dh = sh * esc * (def.achatarY || 1);
    const desl = (pivoX - sx) * esc;
    const esqX = l.direita ? l.x - desl : l.x + desl - dw;
    retangulo({ x: esqX, y: yPes - dh, w: dw, h: dh }, 'rgba(255,255,0,0.9)');

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(l.x, yPes - dh - 10); ctx.lineTo(l.x, yPes + 10);
    ctx.moveTo(l.x - 14, yPes); ctx.lineTo(l.x + 14, yPes);
    ctx.stroke();

    retangulo(l.caixaCorpo, 'rgba(80,160,255,0.95)');
    const atq = l.caixaAtaque;
    if (atq) {
      ctx.fillStyle = 'rgba(255,40,60,0.35)';
      ctx.fillRect(atq.x, atq.y, atq.w, atq.h);
      retangulo(atq, '#ff3040');
    }

    return null;
  }

  function textoDebugDe(l, nome) {
    const def = l.def.animacoes[l.anim.nome];
    const folha = l.def.folhas[def.folha];
    return [
      `${nome}: ${l.estado}${def.provisorio ? ' (provisória)' : ''}`,
      `  quadro ${l.quadroAtual + 1}/${folha.quadros.length} · x ${l.x.toFixed(0)} · altura ${(-l.alturaPulo).toFixed(0)}`,
      `  ${l.direita ? 'olhando p/ direita' : 'olhando p/ esquerda'} · ataques no ar ${l.ataquesNoAr}`,
    ];
  }

  function desenharDebugMundo() {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.arena.chaoY); ctx.lineTo(CONFIG.arena.largura, CONFIG.arena.chaoY);
    ctx.stroke();
    ctx.setLineDash([]);
    desenharDebugDe(lorranny, 'P1');
    desenharDebugDe(vitor, 'P2');
  }

  function desenharDebugTexto() {
    const linhas = [
      'DEBUG (F1)  ·  ' + (modo === 'cpu' ? '1P vs CPU' : '2 jogadores'),
      ...textoDebugDe(lorranny, 'P1 ' + CONFIG.hud.nomeEsq),
      ...textoDebugDe(vitor, 'P2 ' + CONFIG.hud.nomeDir),
      `camera ${cam.junta.toFixed(0)} · divisao ${cam.divisao.toFixed(2)} · fps ${fpsMedido.toFixed(0)}`,
    ];
    ctx.save();
    ctx.font = `10px ${FONTE}`;
    ctx.textBaseline = 'top';
    const altura = linhas.length * 17 + 14;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(10, 300, 640, altura);
    ctx.fillStyle = '#9dffcc';
    linhas.forEach((t, i) => ctx.fillText(t, 20, 308 + i * 17));
    ctx.restore();
  }

  /* ---------- Câmera ---------- */
  const cam = { junta: 0, e: 0, d: 0, divisao: 0, alvoDiv: 0, iniciada: false };

  function atualizarCamera(dt) {
    const C = CONFIG.camera, VW = CONFIG.tela.largura, W = CONFIG.arena.largura;
    const xe = Math.min(lorranny.x, vitor.x), xd = Math.max(lorranny.x, vitor.x);
    const dist = xd - xe;
    const dMax = VW - 2 * C.margemDivisao;
    if (dist > dMax) cam.alvoDiv = 1;
    else if (dist < dMax - C.histerese) cam.alvoDiv = 0;

    const alvoJunta = Math.max(0, Math.min(W - VW, (xe + xd) / 2 - VW / 2));
    const kc = cam.iniciada ? 1 - Math.exp(-C.suavidade * dt) : 1;
    cam.junta += (alvoJunta - cam.junta) * kc;

    const passo = C.velDivisao * dt;
    cam.divisao += Math.max(-passo, Math.min(passo, cam.alvoDiv - cam.divisao));

    // cada metade da tela dividida segue um lutador (no meio da transição se mistura com a câmera única)
    const s = cam.divisao;
    const faixa = C.faixaPreta * s;
    const hw = (VW - faixa) / 2;
    const xr0 = VW - hw;
    const alvoE = Math.max(0, Math.min(W - hw, xe - hw / 2));
    const alvoD = Math.max(-xr0, Math.min(W - VW, xd - xr0 - hw / 2));
    cam.e = cam.junta + (alvoE - cam.junta) * s;
    cam.d = cam.junta + (alvoD - cam.junta) * s;
    cam.hw = hw; cam.xr0 = xr0; cam.faixa = faixa;
    cam.iniciada = true;
  }

  function desenharMundo(camX) {
    ctx.save();
    ctx.translate(-Math.round(camX), 0);
    ctx.drawImage(imagens[CONFIG.arena.fundo], 0, 0, CONFIG.arena.largura, CONFIG.tela.altura);
    desenharLutador(vitor);
    desenharLutador(lorranny);
    desenharTag(lorranny, 0);
    desenharTag(vitor, 1);
    if (debug) desenharDebugMundo();
    ctx.restore();
  }

  function desenhar() {
    if (telaMenuPrincipal) desenharMenuPrincipal(); else desenharCena();
    if (fade.v > 0) { // transição (fundo preto)
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade.v)})`;
      ctx.fillRect(0, 0, CONFIG.tela.largura, CONFIG.tela.altura);
    }
  }

  function desenharCena() {
    if (telaSelecao) { desenharSelecao(); return; }
    const VW = CONFIG.tela.largura, VH = CONFIG.tela.altura;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    if (paradaT > 0) ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4); // tremidinha na paradinha
    if (cam.divisao < 0.002) {
      desenharMundo(cam.junta);
    } else {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, cam.hw, VH); ctx.clip();
      desenharMundo(cam.e);
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.rect(cam.xr0, 0, cam.hw, VH); ctx.clip();
      desenharMundo(cam.d);
      ctx.restore();
      // barra preta no meio, com borda suave
      const m = VW / 2, f = cam.faixa, suave = 22 * cam.divisao;
      ctx.fillStyle = '#000';
      ctx.fillRect(m - f / 2, 0, f, VH);
      for (const lado of [-1, 1]) {
        const x0 = m + lado * f / 2;
        const g = ctx.createLinearGradient(x0, 0, x0 + lado * suave, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.85)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(lado > 0 ? x0 : x0 - suave, 0, suave, VH);
      }
    }
    ctx.restore();
    desenharHUD();
    if (debug) desenharDebugTexto();
  }

  /* ------------------------------------------------------------------ 6b */
  /* ---------- Seleção de personagens ---------- */
  let telaSelecao = false;
  // cur = personagem sob o cursor de cada jogador · ok = já confirmou · vsT = contagem da tela "VS"
  const sel = { cur: [0, 1], ok: [false, false], t: 0, vsT: null, cpuT: 0, ciclo: 0, tremer: [0, 0], flash: [0, 0], irArenaT: null };
  // etapa 2: seleção de arena
  let telaArena = false;
  let arenaFinal = 0; // índice (em ARENAS) da arena escolhida
  const arenaSel = { cur: 0, prev: 0, mudouEm: -9, entrouEm: 0 };

  function indicesLivres() { return ELENCO.map((e, i) => i).filter((i) => !ELENCO[i].bloqueado); }
  function colunasSelecao() { return Math.max(1, Math.min(ELENCO.length, CONFIG.selecao.colunas)); }

  function abrirSelecao() {
    telaSelecao = true;
    telaArena = false;
    sel.ok = [false, false];
    sel.vsT = null; sel.cpuT = 0; sel.ciclo = 0; sel.irArenaT = null;
    sel.tremer = [0, 0]; sel.flash = [0, 0];
    soltarTudo();
    atualizarRodape();
  }

  function moverCursor(p, dx, dy) {
    const n = ELENCO.length, cols = colunasSelecao();
    let i = sel.cur[p];
    if (dx) i = (i + dx + n) % n;
    if (dy) {
      const t = i + dy * cols;
      if (t >= 0 && t < n) i = t;
      else if (dy > 0) i = i % cols;                                      // passou da última linha: volta para a primeira
      else i = Math.floor((n - 1 - (i % cols)) / cols) * cols + (i % cols); // passou da primeira: vai para a última
    }
    sel.cur[p] = i;
  }

  function confirmarSelecao(p) {
    if (sel.ok[p]) return;
    if (ELENCO[sel.cur[p]].bloqueado) { sel.tremer[p] = 0.3; return; }
    if (!CONFIG.selecao.permitirEspelho && sel.ok[1 - p] && sel.cur[1 - p] === sel.cur[p]) { sel.tremer[p] = 0.3; return; }
    sel.ok[p] = true;
    sel.flash[p] = 0.35;
    if (modo === 'cpu' && p === 0) { sel.cpuT = CONFIG.selecao.tempoCpu; sel.ciclo = 0; } // o computador "sorteia"
  }

  // cancela a escolha do jogador p e deixa ele trocar de personagem
  function cancelarSelecao(p) {
    sel.ok[p] = false;
    sel.irArenaT = null;
    sel.tremer[p] = 0;
    if (modo === 'cpu') { sel.ok[1] = false; sel.cpuT = 0; }
  }

  /* ---------- etapa 2: seleção de arena ---------- */
  function itensArena() {
    return ARENAS.length > 1 ? [...ARENAS, { id: 'aleatoria', nome: 'ALEATÓRIA', aleatoria: true }] : ARENAS;
  }
  function colunasArena() { return Math.min(itensArena().length, 4); }

  function abrirArena() {
    telaArena = true;
    sel.irArenaT = null;
    arenaSel.entrouEm = sel.t;
    arenaSel.mudouEm = -9;
    soltarTudo();
  }

  function voltarParaLutadores() {
    telaArena = false;
    sel.ok = [false, false]; sel.cpuT = 0; sel.irArenaT = null; sel.flash = [0, 0];
  }

  function moverArena(dx, dy) {
    const n = itensArena().length, cols = colunasArena();
    let i = arenaSel.cur;
    if (dx) i = (i + dx + n) % n;
    if (dy) { const t = i + dy * cols; if (t >= 0 && t < n) i = t; }
    if (i !== arenaSel.cur) { arenaSel.prev = arenaSel.cur; arenaSel.cur = i; arenaSel.mudouEm = sel.t; }
  }

  function confirmarArena() {
    const it = itensArena()[arenaSel.cur];
    arenaFinal = it.aleatoria ? Math.floor(Math.random() * ARENAS.length) : arenaSel.cur;
    sel.vsT = CONFIG.selecao.tempoVS; // tela "VS" e depois a luta
  }

  function arenaTecla(e) {
    if (e.code === 'Enter') { e.preventDefault(); if (!e.repeat) confirmarArena(); return; }
    if (e.code === 'Backspace') { e.preventDefault(); if (!e.repeat) voltarParaLutadores(); return; }
    const b = acharAcao(e);
    if (!b) return;
    e.preventDefault();
    const a = b[1];
    if (a === 'esq') moverArena(-1, 0);
    else if (a === 'dir') moverArena(1, 0);
    else if (a === 'cima') moverArena(0, -1);
    else if (a === 'baixo') moverArena(0, 1);
    else if (a === 'soco' && !e.repeat) confirmarArena();
    else if (a === 'chute' && !e.repeat) voltarParaLutadores();
  }

  function selecaoTecla(e) {
    if (sel.vsT !== null) return; // já está na tela "VS"
    if (telaArena) { arenaTecla(e); return; }
    if (e.code === 'Enter') { e.preventDefault(); if (!e.repeat) confirmarSelecao(0); return; }
    if (e.code === 'Backspace') {
      e.preventDefault();
      if (e.repeat) return;
      if (!sel.ok[0] && !sel.ok[1]) fadeOut(abrirMenuPrincipal); // ninguém escolheu ainda: volta ao menu principal
      else { cancelarSelecao(1); cancelarSelecao(0); }
      return;
    }
    const b = acharAcao(e);
    if (!b) return;
    e.preventDefault();
    const [j, a] = b;
    const p = j === 'p1' ? 0 : 1;
    if (sel.ok[p]) { if (a === 'chute' && !e.repeat) cancelarSelecao(p); return; }
    if (a === 'esq') moverCursor(p, -1, 0);
    else if (a === 'dir') moverCursor(p, 1, 0);
    else if (a === 'cima') moverCursor(p, 0, -1);
    else if (a === 'baixo') moverCursor(p, 0, 1);
    else if (a === 'soco' && !e.repeat) confirmarSelecao(p);
  }

  function atualizarSelecao(dt) {
    sel.t += dt;
    for (let p = 0; p < 2; p++) { sel.tremer[p] = Math.max(0, sel.tremer[p] - dt); sel.flash[p] = Math.max(0, sel.flash[p] - dt); }

    if (sel.cpuT > 0) { // o computador embaralha o cursor e trava num personagem
      sel.cpuT -= dt;
      sel.ciclo -= dt;
      if (sel.ciclo <= 0) {
        sel.ciclo = 0.07;
        const livres = indicesLivres();
        sel.cur[1] = livres[Math.floor(Math.random() * livres.length)];
      }
      if (sel.cpuT <= 0) {
        let livres = indicesLivres();
        if (!CONFIG.selecao.permitirEspelho && livres.length > 1) livres = livres.filter((i) => i !== sel.cur[0]);
        sel.cur[1] = livres[Math.floor(Math.random() * livres.length)];
        sel.ok[1] = true;
        sel.flash[1] = 0.35;
      }
    }

    // os dois prontos: espera um instante (dá para cancelar) e abre a seleção de arena
    if (sel.ok[0] && sel.ok[1] && !telaArena && sel.vsT === null) {
      if (sel.irArenaT === null) sel.irArenaT = CONFIG.selecao.tempoPronto ?? 0.8;
      sel.irArenaT -= dt;
      if (sel.irArenaT <= 0) abrirArena();
    }
    if (sel.vsT !== null) {
      sel.vsT -= dt;
      if (sel.vsT <= 0) iniciarLuta();
    }
  }

  function iniciarLuta() {
    const e1 = ELENCO[sel.cur[0]], e2 = ELENCO[sel.cur[1]];
    CONFIG.hud.nomeEsq = e1.nome;  CONFIG.hud.nomeDir = e2.nome;
    CONFIG.hud.retratoEsq = e1.retrato;  CONFIG.hud.retratoDir = e2.retrato;
    lorranny = new Lutador(e1.def, CONFIG.arena.inicioEsq, true);   // "lorranny" = jogador 1 (esquerda)
    vitor = new Lutador(e2.def, CONFIG.arena.inicioDir, false);     // "vitor" = jogador 2 (direita)
    lorranny.oponente = vitor;
    vitor.oponente = lorranny;
    const ar = ARENAS[arenaFinal] || ARENAS[0];
    CONFIG.arena.fundo = ar.fundo;
    CONFIG.arena.chaoY = ar.chaoY !== undefined ? ar.chaoY : CHAO_Y_PADRAO;
    mostrarTags = e1 === e2 || !!CONFIG.selecao.tagSempre; // mesmo personagem nos dois lados: mostra P1/P2
    telaSelecao = false;
    telaArena = false;
    sel.vsT = null;
    novaPartida();
    atualizarRodape();
    canvas.focus();
  }

  // quadro do "parado" do personagem num instante t (segundos), para animar a pose na seleção
  function quadroDeIdle(def, t) {
    const a = def.animacoes.parado;
    const dur = Array.isArray(a.duracao) ? a.duracao : a.sequencia.map(() => a.duracao);
    const total = dur.reduce((x, y) => x + y, 0) || 1;
    let m = (t * 1000) % total;
    for (let i = 0; i < a.sequencia.length; i++) {
      if (m < dur[i]) return [a.folha, a.sequencia[i]];
      m -= dur[i];
    }
    return [a.folha, a.sequencia[0]];
  }

  function textoSel(txt, x, y, tam, cor, alinha = 'center', contorno = '#12062e') {
    ctx.save();
    ctx.font = `${tam}px ${FONTE}`;
    ctx.textAlign = alinha;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, tam / 4);
    ctx.strokeStyle = contorno;
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = cor;
    ctx.fillText(txt, x, y);
    ctx.restore();
  }

  function rotuloCancelar(p) { return modo === 'cpu' ? 'S' : (p === 0 ? 'G' : '.'); }
  const COR_P = ['#35e0ff', '#ffb02e']; // cursor do P1 (ciano) e do P2 (âmbar)
  const PAINEL = { y: 92, w: 330, h: 528 };

  function geometriaGrade() {
    const VW = CONFIG.tela.largura;
    const n = ELENCO.length, cols = colunasSelecao(), gap = 12;
    const cell = Math.min(112, Math.floor((346 - (cols - 1) * gap) / cols));
    const rows = Math.ceil(n / cols);
    const gw = cols * cell + (cols - 1) * gap, gh = rows * cell + (rows - 1) * gap;
    return { cols, gap, cell, gx0: VW / 2 - gw / 2, gy0: PAINEL.y + PAINEL.h / 2 - gh / 2 + 24 };
  }

  function desenharPainelSelecao(p) {
    const VW = CONFIG.tela.largura;
    const esq = p === 0;
    const x0 = esq ? 24 : VW - 24 - PAINEL.w, cx = x0 + PAINEL.w / 2;
    const cor = COR_P[p];
    const escondido = modo === 'cpu' && p === 1 && !sel.ok[0] && sel.cpuT <= 0 && !sel.ok[1];
    const e = ELENCO[sel.cur[p]];
    const tremor = sel.tremer[p] > 0 ? Math.sin(sel.t * 90) * 5 : 0;

    ctx.save();
    ctx.translate(tremor, 0);

    // painel
    const g = ctx.createLinearGradient(0, PAINEL.y, 0, PAINEL.y + PAINEL.h);
    g.addColorStop(0, 'rgba(28,10,66,0.55)');
    g.addColorStop(1, 'rgba(70,20,120,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, PAINEL.y, PAINEL.w, PAINEL.h);
    if (sel.flash[p] > 0) { ctx.fillStyle = `rgba(255,255,255,${sel.flash[p] * 1.4})`; ctx.fillRect(x0, PAINEL.y, PAINEL.w, PAINEL.h); }
    ctx.lineWidth = 4;
    ctx.strokeStyle = cor;
    ctx.shadowColor = cor;
    ctx.shadowBlur = sel.ok[p] ? 22 : 8;
    ctx.strokeRect(x0, PAINEL.y, PAINEL.w, PAINEL.h);
    ctx.shadowBlur = 0;

    textoSel(modo === 'cpu' && p === 1 ? 'COMPUTADOR' : 'PLAYER ' + (p + 1), x0 + 16, PAINEL.y + 26, 14, cor, 'left');

    // chão
    const baseY = PAINEL.y + PAINEL.h - 86;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(cx, baseY - 4, 120, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // personagem
    if (escondido || e.bloqueado) {
      const pulso = 1 + Math.sin(sel.t * 4) * 0.05;
      textoSel('?', cx, baseY - 190, 170 * pulso, escondido ? '#8a6cc0' : '#5b4590');
      if (e.bloqueado && !escondido) textoSel('EM BREVE', cx, baseY - 60, 14, '#d9b3ff');
    } else {
      const [folha, idx] = quadroDeIdle(e.def, sel.t);
      // encolhe o personagem se ele for largo/alto demais para o painel (pode passar um pouco das bordas)
      const fo = e.def.folhas[folha];
      const dw = fo.quadros[idx][2] * fo.escala * ESCALA_GERAL, dh = fo.quadros[idx][3] * fo.escala * ESCALA_GERAL;
      const k = Math.min(0.95, (PAINEL.w + 40) / dw, 410 / dh) * (1 + sel.flash[p] * 0.25);
      ctx.save();
      ctx.translate(cx, baseY);
      ctx.scale(k, k);
      desenharQuadro(e.def, folha, idx, 0, 0, esq, 1);
      ctx.restore();
    }

    // nome
    const nome = escondido ? '???' : e.nome;
    textoSel(nome, cx, PAINEL.y + PAINEL.h - 50, 22, '#f5e6ff');
    if (sel.ok[p]) {
      textoSel(Math.floor(sel.t * 4) % 2 === 0 ? 'PRONTO!' : (rotuloCancelar(p) + ' = TROCAR'), cx, PAINEL.y + PAINEL.h - 20, 12, cor);
    }
    ctx.restore();
  }

  function desenharGradeSelecao() {
    const { cols, gap, cell, gx0, gy0 } = geometriaGrade();
    const tam = Math.max(8, Math.floor(cell / 11));

    ELENCO.forEach((e, i) => {
      const x = gx0 + (i % cols) * (cell + gap), y = gy0 + Math.floor(i / cols) * (cell + gap);
      ctx.fillStyle = '#160836';
      ctx.fillRect(x, y, cell, cell);
      if (e.bloqueado) {
        textoSel('?', x + cell / 2, y + cell / 2 - 6, cell * 0.55, '#4a3a78');
        textoSel('EM BREVE', x + cell / 2, y + cell - 14, tam, '#8a6cc0');
      } else {
        const im = imagens[e.retrato];
        if (im) {
          const lado = Math.min(im.width, im.height);
          ctx.drawImage(im, (im.width - lado) / 2, 0, lado, lado, x + 4, y + 4, cell - 8, cell - 8);
        }
        const gr = ctx.createLinearGradient(0, y + cell - 26, 0, y + cell);
        gr.addColorStop(0, 'rgba(10,2,26,0)');
        gr.addColorStop(1, 'rgba(10,2,26,0.9)');
        ctx.fillStyle = gr;
        ctx.fillRect(x + 4, y + cell - 30, cell - 8, 26);
        textoSel(e.nome, x + cell / 2, y + cell - 14, tam, '#f5e6ff');
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#5a2f9a';
      ctx.strokeRect(x, y, cell, cell);
    });

    // cursores (o do computador só aparece depois que o P1 confirma)
    for (let p = 0; p < 2; p++) {
      if (modo === 'cpu' && p === 1 && !sel.ok[0]) continue;
      const i = sel.cur[p];
      const x = gx0 + (i % cols) * (cell + gap), y = gy0 + Math.floor(i / cols) * (cell + gap);
      const inset = p === 0 ? -5 : 1; // quando os dois estão no mesmo quadro, um fica por fora do outro
      const piscar = sel.ok[p] || Math.sin(sel.t * 12) > -0.2;
      if (piscar) {
        ctx.save();
        ctx.lineWidth = sel.ok[p] ? 6 : 4;
        ctx.strokeStyle = COR_P[p];
        ctx.shadowColor = COR_P[p];
        ctx.shadowBlur = sel.ok[p] ? 22 : 12;
        ctx.strokeRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);
        ctx.restore();
      }
      const rotulo = modo === 'cpu' && p === 1 ? 'CPU' : (p + 1) + 'P';
      const lx = p === 0 ? x - 5 : x + cell + 5 - 44;
      ctx.fillStyle = COR_P[p];
      ctx.fillRect(lx, y - 28, 44, 22);
      textoSel(rotulo, lx + 22, y - 17, 12, '#12062e', 'center', 'rgba(0,0,0,0)');
    }
  }

  // fundo da seleção: cenário escurecido + faixas diagonais em movimento
  function desenharFundoSelecao(url) {
    const VW = CONFIG.tela.largura, VH = CONFIG.tela.altura, T = sel.t;
    ctx.fillStyle = '#0b0420';
    ctx.fillRect(0, 0, VW, VH);
    const bg = imagens[url];
    if (bg) {
      const k = Math.max(VW / bg.width, VH / bg.height);
      ctx.globalAlpha = 0.35;
      ctx.drawImage(bg, (VW - bg.width * k) / 2, (VH - bg.height * k) / 2, bg.width * k, bg.height * k);
      ctx.globalAlpha = 1;
    }
    const gv = ctx.createLinearGradient(0, 0, 0, VH);
    gv.addColorStop(0, 'rgba(18,6,46,0.88)');
    gv.addColorStop(0.5, 'rgba(48,12,96,0.5)');
    gv.addColorStop(1, 'rgba(12,3,30,0.94)');
    ctx.fillStyle = gv;
    ctx.fillRect(0, 0, VW, VH);
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#d58cff';
    for (let i = 0; i < 9; i++) {
      const x = ((i * 190 + T * 50) % (VW + 380)) - 190;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 80, 0); ctx.lineTo(x - 140, VH); ctx.lineTo(x - 220, VH);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

  }

  function desenharSelecao() {
    if (sel.vsT !== null) { desenharVS(); return; }
    if (telaArena) { desenharArena(); return; }
    const VW = CONFIG.tela.largura, VH = CONFIG.tela.altura;
    const T = sel.t;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    desenharFundoSelecao(CONFIG.arena.fundo);

    // título
    ctx.save();
    ctx.shadowColor = '#c15cff';
    ctx.shadowBlur = 16;
    textoSel(sel.vsT !== null ? 'PREPARAR PARA LUTAR!' : 'SELECIONE O LUTADOR', VW / 2, 50, 26, '#f5e6ff');
    ctx.restore();

    desenharPainelSelecao(0);
    desenharPainelSelecao(1);

    if (sel.vsT === null) {
      ctx.save();
      ctx.shadowColor = '#ff5ad2';
      ctx.shadowBlur = 18;
      textoSel('VS', VW / 2, 168, 54, '#ffd24a');
      ctx.restore();
      desenharGradeSelecao();
    }

    // dicas de controle
    if (sel.vsT !== null) {
      // na tela "VS" não mostra as dicas
    } else if (modo === 'cpu') {
      textoSel('P1  SETAS MOVER   A CONFIRMA   S CANCELA   ENTER CONFIRMA', VW / 2, 690, 11, '#d9b3ff');
    } else {
      textoSel('P1  A D W S MOVER   F CONFIRMA   G CANCELA   (ENTER CONFIRMA)', VW / 2, 680, 11, COR_P[0]);
      textoSel('P2  SETAS MOVER   , CONFIRMA   . CANCELA', VW / 2, 712, 11, COR_P[1]);
    }
    if (sel.vsT === null) textoSel('ESC  MENU', VW / 2, 760, 10, '#8a6cc0');

    // tela "VS": escurece e mostra o confronto
    if (sel.vsT !== null) {
      const prog = 1 - sel.vsT / CONFIG.selecao.tempoVS;
      ctx.fillStyle = `rgba(8,2,22,${0.6 * Math.min(1, prog * 4)})`;
      ctx.fillRect(0, 0, VW, VH);
      const pop = 1 + Math.max(0, 1 - prog * 5) * 0.9;
      ctx.save();
      ctx.shadowColor = '#ff5ad2';
      ctx.shadowBlur = 30;
      textoSel('VS', VW / 2, VH / 2 - 20, 150 * pop, '#ffd24a');
      ctx.restore();
      textoSel(ELENCO[sel.cur[0]].nome, VW / 2, VH / 2 + 80, 20, COR_P[0]);
      textoSel(ELENCO[sel.cur[1]].nome, VW / 2, VH / 2 + 116, 20, COR_P[1]);
    }
  }

  /* ------------------------------------------------------------------ 6c */
  /* ---------- Menu principal ---------- */
  let telaMenuPrincipal = false;
  const menuP = { pagina: 'principal', sel: 0, t: 0, entrouEm: 0, aviso: '', avisoT: 0 };
  const fade = { v: 0, dir: 0, cb: null }; // v = opacidade do preto; dir 1 = escurecendo, -1 = clareando
  const BTN = { w: 360, h: 60, cx: 630, y0: 372, passo: 80, inclina: 16 };

  function fadeOut(cb) { if (fade.dir > 0) return; fade.dir = 1; fade.cb = cb; }
  function atualizarFade(dt) {
    if (fade.dir > 0) {
      fade.v = Math.min(1, fade.v + dt * 3.5);
      if (fade.v >= 1) { fade.dir = -1; const cb = fade.cb; fade.cb = null; if (cb) cb(); }
    } else if (fade.dir < 0) {
      fade.v = Math.max(0, fade.v - dt * 3);
      if (fade.v <= 0) fade.dir = 0;
    }
  }

  function abrirMenuPrincipal() {
    telaMenuPrincipal = true;
    telaSelecao = false; telaArena = false;
    menuP.pagina = 'principal'; menuP.sel = 0; menuP.entrouEm = menuP.t; menuP.aviso = '';
    soltarTudo();
  }

  function irPagina(p) { menuP.pagina = p; menuP.sel = 0; menuP.entrouEm = menuP.t - 0.3; }

  function irParaSelecao(m) {
    fadeOut(() => {
      modo = m;
      atualizarRodape();
      atualizarMenu();
      telaMenuPrincipal = false;
      novaPartida();
      abrirSelecao();
    });
  }

  // itens de cada página (rot pode ser texto ou função, para botões que mudam de texto)
  function paginaMenu() {
    const voltar = { rot: 'VOLTAR', acao: () => irPagina('principal') };
    if (menuP.pagina === 'arcade') {
      return { titulo: 'ARCADE', itens: [
        { rot: '1 JOGADOR vs CPU', acao: () => irParaSelecao('cpu') },
        { rot: '2 JOGADORES', acao: () => irParaSelecao('2p') },
        voltar,
      ] };
    }
    if (menuP.pagina === 'config') {
      return { titulo: 'CONFIGURAÇÕES', itens: [
        { rot: () => 'EFEITO DE TV: ' + (palco.classList.contains('sem-crt') ? 'NÃO' : 'SIM'), acao: () => palco.classList.toggle('sem-crt') },
        voltar,
      ] };
    }
    return { titulo: '', itens: [
      { rot: 'CAMPANHA', acao: () => { menuP.aviso = 'CAMPANHA EM BREVE!'; menuP.avisoT = 1.6; } },
      { rot: 'ARCADE', acao: () => irPagina('arcade') },
      { rot: 'CONFIGURAÇÕES', acao: () => irPagina('config') },
    ] };
  }

  function ativarMenu() {
    if (fade.dir !== 0) return;
    const it = paginaMenu().itens[menuP.sel];
    if (it) it.acao();
  }

  function menuPrincipalTecla(e) {
    if (fade.dir !== 0) return;
    const n = paginaMenu().itens.length;
    const c = e.code;
    if (c === 'ArrowUp' || c === 'KeyW') menuP.sel = (menuP.sel + n - 1) % n;
    else if (c === 'ArrowDown' || c === 'KeyS') menuP.sel = (menuP.sel + 1) % n;
    else if ((c === 'Enter' || c === 'Space' || c === 'KeyF' || e.key === ',') && !e.repeat) ativarMenu();
    else if ((c === 'Backspace' || c === 'KeyG' || e.key === '.') && !e.repeat) { if (menuP.pagina !== 'principal') irPagina('principal'); }
    else return;
    e.preventDefault();
  }

  function botaoSobMouse(ev) {
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left) * CONFIG.tela.largura / r.width;
    const y = (ev.clientY - r.top) * CONFIG.tela.altura / r.height;
    const n = paginaMenu().itens.length;
    for (let i = 0; i < n; i++) {
      const by = BTN.y0 + i * BTN.passo;
      if (x >= BTN.cx - BTN.w / 2 && x <= BTN.cx + BTN.w / 2 && y >= by && y <= by + BTN.h) return i;
    }
    return -1;
  }
  canvas.addEventListener('mousemove', (ev) => {
    if (!telaMenuPrincipal) { canvas.style.cursor = ''; return; }
    const i = botaoSobMouse(ev);
    if (i >= 0) menuP.sel = i;
    canvas.style.cursor = i >= 0 ? 'pointer' : '';
  });
  canvas.addEventListener('click', (ev) => {
    if (!telaMenuPrincipal || menuAberto) return;
    const i = botaoSobMouse(ev);
    if (i >= 0) { menuP.sel = i; ativarMenu(); }
  });

  function atualizarMenuPrincipal(dt) {
    menuP.t += dt;
    if (menuP.avisoT > 0) menuP.avisoT -= dt;
  }

  function desenharBotao(rot, x, y, sele, t) {
    const w = BTN.w, h = BTN.h, s = BTN.inclina;
    const dx = sele ? 12 + Math.sin(t * 8) * 2 : 0;
    ctx.save();
    ctx.translate(x + dx, y);
    const pts = [[s, 0], [w, 0], [w - s, h], [0, h]];
    poligono(pts);
    if (sele) {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#6a1fc2'); g.addColorStop(1, '#d02fb0');
      ctx.fillStyle = g;
      ctx.shadowColor = '#ff5ad2';
      ctx.shadowBlur = 20 + Math.sin(t * 6) * 6;
    } else {
      ctx.fillStyle = 'rgba(22,8,54,0.82)';
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = sele ? 4 : 3;
    ctx.strokeStyle = sele ? '#ffd24a' : '#7a2bd0';
    ctx.stroke();
    if (sele) { // seta piscando ao lado
      ctx.fillStyle = '#ffd24a';
      const ax = -22 + Math.sin(t * 8) * 4;
      ctx.beginPath(); ctx.moveTo(ax, h / 2 - 12); ctx.lineTo(ax + 16, h / 2); ctx.lineTo(ax, h / 2 + 12); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    textoSel(rot, x + dx + w / 2, y + h / 2 + 2, rot.length > 15 ? 15 : 20, sele ? '#ffffff' : '#e6d0ff');
  }

  function desenharMenuPrincipal() {
    const VW = CONFIG.tela.largura, VH = CONFIG.tela.altura, T = menuP.t;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // cenário: enquadra a Lorranny (esquerda) e a torre da Crown Corp (direita), com uma deriva lenta
    const bg = imagens[MENU_P.fundo];
    const k = VH / bg.height, sw = VW / k;
    const sx = Math.max(0, Math.min(bg.width - sw, MENU_P.cameraX + Math.sin(T * 0.3) * 12));
    ctx.drawImage(bg, sx, 0, sw, bg.height, 0, 0, VW, VH);

    // vinheta + escurecimento embaixo (para os botões)
    const gv = ctx.createRadialGradient(VW / 2, VH * 0.45, VH * 0.35, VW / 2, VH * 0.5, VH * 0.95);
    gv.addColorStop(0, 'rgba(10,2,26,0)'); gv.addColorStop(1, 'rgba(10,2,26,0.6)');
    ctx.fillStyle = gv; ctx.fillRect(0, 0, VW, VH);
    const gb = ctx.createLinearGradient(0, VH * 0.55, 0, VH);
    gb.addColorStop(0, 'rgba(10,2,26,0)'); gb.addColorStop(1, 'rgba(10,2,26,0.7)');
    ctx.fillStyle = gb; ctx.fillRect(0, VH * 0.55, VW, VH * 0.45);

    // brasas neon subindo
    for (let i = 0; i < 36; i++) {
      const vel = 18 + (i % 5) * 9;
      const y = VH + 20 - ((T * vel + i * 61) % (VH + 40));
      const x = ((i * 139.7) % VW) + Math.sin(T * 0.8 + i) * 14;
      ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(T * 1.3 + i));
      ctx.fillStyle = i % 3 === 0 ? '#ffd24a' : (i % 3 === 1 ? '#ff5ad2' : '#c9a0ff');
      const t = 2 + (i % 3);
      ctx.fillRect(Math.round(x), Math.round(y), t, t);
    }
    ctx.globalAlpha = 1;

    // logo: cai com um "pop" e depois flutua com brilho pulsante
    const logo = imagens[MENU_P.logo];
    const lw = 480, lh = lw * logo.height / logo.width;
    const e = Math.max(0, Math.min(1, (T - menuP.entrouEm - 0.1) / 0.7));
    const ease = 1 - Math.pow(1 - e, 3);
    const esc = 1 + (1 - ease) * 0.6;
    ctx.save();
    ctx.globalAlpha = ease;
    ctx.translate(BTN.cx, 26 + lh / 2 + Math.sin(T * 1.6) * 5 - (1 - ease) * 40);
    ctx.scale(esc, esc);
    ctx.shadowColor = '#c15cff';
    ctx.shadowBlur = 20 + Math.sin(T * 3) * 8;
    ctx.drawImage(logo, -lw / 2, -lh / 2, lw, lh);
    ctx.restore();

    // botões entram da direita, um depois do outro
    const pag = paginaMenu();
    if (pag.titulo) textoSel(pag.titulo, BTN.cx, BTN.y0 - 26, 13, '#d9b3ff');
    pag.itens.forEach((it, i) => {
      const ent = Math.max(0, Math.min(1, (T - menuP.entrouEm - 0.5 - i * 0.12) / 0.35));
      const ee = 1 - Math.pow(1 - ent, 3);
      if (ee <= 0) return;
      ctx.save();
      ctx.globalAlpha = ee;
      const rot = typeof it.rot === 'function' ? it.rot() : it.rot;
      desenharBotao(rot, BTN.cx - BTN.w / 2 + (1 - ee) * 420, BTN.y0 + i * BTN.passo, i === menuP.sel, T);
      ctx.restore();
    });

    if (menuP.avisoT > 0) {
      if (Math.floor(menuP.avisoT * 8) % 2 === 0) textoSel(menuP.aviso, BTN.cx, BTN.y0 + 3 * BTN.passo + 8, 13, '#ff9be6');
    }
    textoSel(pag.titulo ? 'SETAS OU W S ESCOLHEM   ENTER CONFIRMA   BACKSPACE VOLTA' : 'SETAS OU W S ESCOLHEM   ENTER CONFIRMA', VW / 2, 786, 10, '#d9b3ff');
  }

  function coberturaImagem(im, x, y, w, h, alpha = 1) { // desenha a imagem preenchendo o retângulo (corta o excesso)
    const k = Math.max(w / im.width, h / im.height);
    const sw = w / k, sh = h / k;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h);
    ctx.restore();
  }

  function desenharArena() {
    const VW = CONFIG.tela.largura, VH = CONFIG.tela.altura;
    const itens = itensArena(), item = itens[arenaSel.cur];
    desenharFundoSelecao(item.aleatoria ? CONFIG.arena.fundo : item.fundo);
    ctx.imageSmoothingEnabled = true;

    const e = Math.min(1, (sel.t - arenaSel.entrouEm) / 0.4), ease = 1 - Math.pow(1 - e, 3);
    ctx.save();
    ctx.globalAlpha = ease;
    ctx.translate(0, (1 - ease) * 36);

    ctx.save();
    ctx.shadowColor = '#c15cff';
    ctx.shadowBlur = 16;
    textoSel('SELECIONE A ARENA', VW / 2, 50, 26, '#f5e6ff');
    ctx.restore();
    const n1 = ELENCO[sel.cur[0]].nome, n2 = ELENCO[sel.cur[1]].nome;
    textoSel(n1 + ' (' + rotuloJogador(0) + ')', VW / 2 - 24, 92, 11, COR_P[0], 'right');
    textoSel('vs', VW / 2, 92, 11, '#d9b3ff');
    textoSel(n2 + ' (' + rotuloJogador(1) + ')', VW / 2 + 24, 92, 11, COR_P[1], 'left');

    // pré-visualização grande
    const pw = 820, ph = Math.round(pw * CONFIG.tela.altura / CONFIG.arena.largura), px = (VW - pw) / 2, py = 116;
    ctx.fillStyle = '#0b0420';
    ctx.fillRect(px, py, pw, ph);
    if (item.aleatoria) {
      const ciclo = ARENAS[Math.floor(sel.t * 7) % ARENAS.length];
      coberturaImagem(imagens[ciclo.fundo], px, py, pw, ph, 0.35);
      textoSel('?', VW / 2, py + ph / 2, 150 * (1 + Math.sin(sel.t * 4) * 0.05), '#f5e6ff');
    } else {
      const im = imagens[item.fundo];
      const k = Math.min(1, (sel.t - arenaSel.mudouEm) / 0.25);
      if (k < 1) coberturaImagem(imagens[itens[arenaSel.prev].fundo || ARENAS[0].fundo], px, py, pw, ph);
      coberturaImagem(im, px, py, pw, ph, k);
    }
    ctx.save();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#b04bff';
    ctx.shadowColor = '#c15cff';
    ctx.shadowBlur = 20;
    ctx.strokeRect(px, py, pw, ph);
    ctx.restore();
    textoSel(item.nome, VW / 2, py + ph + 40, 24, '#ffd24a');

    // miniaturas
    const cols = colunasArena(), tw = 200, th = 86, gap = 22;
    const rows = Math.ceil(itens.length / cols);
    const gw = cols * tw + (cols - 1) * gap, gx = VW / 2 - gw / 2, gy = py + ph + 80;
    itens.forEach((it, i) => {
      const x = gx + (i % cols) * (tw + gap), y = gy + Math.floor(i / cols) * (th + gap);
      const sele = i === arenaSel.cur;
      ctx.fillStyle = '#160836';
      ctx.fillRect(x, y, tw, th);
      if (it.aleatoria) textoSel('?', x + tw / 2, y + th / 2 - 4, 44, sele ? '#f5e6ff' : '#5b4590');
      else coberturaImagem(imagens[it.fundo], x, y, tw, th, sele ? 1 : 0.55);
      ctx.save();
      ctx.lineWidth = sele ? 5 : 3;
      ctx.strokeStyle = sele ? '#35e0ff' : '#5a2f9a';
      if (sele) { ctx.shadowColor = '#35e0ff'; ctx.shadowBlur = 16; }
      ctx.strokeRect(x, y, tw, th);
      ctx.restore();
    });

    if (modo === 'cpu') {
      textoSel('SETAS ESCOLHEM   A CONFIRMA   S VOLTA   ENTER CONFIRMA', VW / 2, 760, 10, '#d9b3ff');
    } else {
      textoSel('A D / SETAS ESCOLHEM   F ou , CONFIRMA   G ou . VOLTA', VW / 2, 760, 10, '#d9b3ff');
    }
    textoSel('ESC  MENU', VW / 2, 790, 10, '#8a6cc0');
    ctx.restore();
  }

  // tela "VS": a arena escolhida ao fundo e os dois lutadores se encarando
  function desenharVS() {
    const VW = CONFIG.tela.largura, VH = CONFIG.tela.altura;
    const prog = 1 - sel.vsT / CONFIG.selecao.tempoVS;
    const ent = 1 - Math.pow(1 - Math.min(1, prog * 3), 3);
    const ar = ARENAS[arenaFinal] || ARENAS[0];
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#0b0420';
    ctx.fillRect(0, 0, VW, VH);
    coberturaImagem(imagens[ar.fundo], 0, 0, VW, VH, 0.45);
    const gv = ctx.createLinearGradient(0, 0, 0, VH);
    gv.addColorStop(0, 'rgba(18,6,46,0.85)');
    gv.addColorStop(0.55, 'rgba(48,12,96,0.35)');
    gv.addColorStop(1, 'rgba(12,3,30,0.9)');
    ctx.fillStyle = gv;
    ctx.fillRect(0, 0, VW, VH);

    ctx.save();
    ctx.shadowColor = '#c15cff';
    ctx.shadowBlur = 16;
    textoSel('PREPARAR PARA LUTAR!', VW / 2, 50, 26, '#f5e6ff');
    ctx.restore();

    const baseY = 650;
    for (let p = 0; p < 2; p++) {
      const el = ELENCO[sel.cur[p]], esq = p === 0;
      const x = (esq ? 290 : VW - 290) + (esq ? -1 : 1) * (1 - ent) * 560;
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(x, baseY - 4, 150, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      const [folha, idx] = quadroDeIdle(el.def, sel.t);
      desenharQuadro(el.def, folha, idx, x, baseY, esq, 1);
      textoSel(el.nome, x, baseY + 44, 22, '#f5e6ff');
      const tag = rotuloJogador(p) === 'CPU' ? 'COMPUTADOR' : 'PLAYER ' + (p + 1);
      textoSel(tag, x, baseY + 80, 13, COR_P[p]);
    }

    const pop = 1 + Math.max(0, 1 - prog * 5) * 0.9;
    ctx.save();
    ctx.shadowColor = '#ff5ad2';
    ctx.shadowBlur = 30;
    textoSel('VS', VW / 2, 300, 150 * pop, '#ffd24a');
    ctx.restore();
    textoSel(ar.nome, VW / 2, 760, 14, '#d9b3ff');
  }

  /* ------------------------------------------------------------------ 7 */
  const hud = {
    especialEsq: 0, especialDir: 0,
    roundsEsq: 0, roundsDir: 0,
    tempo: CONFIG.hud.tempo,
  };

  /* ---------- barra de especial (base) ----------
     Cada lado ('esq' = P1, 'dir' = P2) tem uma energia de 0 a CONFIG.especial.max, mostrada em hud.especialEsq/Dir (0 a 1).
     Para criar o golpe especial no futuro, use:
       especialCheio(lado)          → true quando a barra está cheia
       gastarEspecial(lado, custo)  → tira energia (sem custo = esvazia tudo) e devolve true se tinha o bastante */
  const energiaEspecial = { esq: 0, dir: 0 };

  function atualizarBarraEspecial() {
    hud.especialEsq = energiaEspecial.esq / CONFIG.especial.max;
    hud.especialDir = energiaEspecial.dir / CONFIG.especial.max;
  }
  function ganharEspecial(lado, qtd) {
    energiaEspecial[lado] = Math.max(0, Math.min(CONFIG.especial.max, energiaEspecial[lado] + qtd));
    atualizarBarraEspecial();
  }
  function especialCheio(lado) { return energiaEspecial[lado] >= CONFIG.especial.max; }
  function gastarEspecial(lado, custo = CONFIG.especial.max) {
    if (energiaEspecial[lado] < custo) return false;
    energiaEspecial[lado] -= custo;
    atualizarBarraEspecial();
    return true;
  }
  function ladoDe(l) { return l === lorranny ? 'esq' : 'dir'; }

  let lorranny, vitor;
  let fimDeLuta = null; // { vencedor, perdedor, tempo } quando alguém ficou sem as 2 barras
  let fpsMedido = 60;

  /* ---------- Partida: melhor de 3 com coroas ----------
     Cada lutador começa com PARTIDA.coroas coroas. Quem perde um round perde uma coroa;
     quem ficar sem coroas primeiro perde a partida. (coroas: 2 em CONFIG.partida = "melhor de 3" de verdade) */
  const partida = { coroas: { esq: 3, dir: 3 }, rodada: 1, perdaT: { esq: 0, dir: 0 }, perdaI: { esq: -1, dir: -1 } };
  let introT = 0;            // tempo restante do banner "ROUND N / FIGHT!" (a luta fica parada)
  let mostrarTags = false;   // tags P1/P2 sobre os lutadores (quando os dois são o mesmo personagem)

  function novaPartida() {
    partida.coroas.esq = PARTIDA.coroas; partida.coroas.dir = PARTIDA.coroas;
    partida.rodada = 1;
    partida.perdaT.esq = 0; partida.perdaT.dir = 0;
    reiniciarLuta();
  }

  // chamada quando um round termina (KO, tempo ou empate): tira a coroa de quem perdeu
  function definirFimDeLuta(f) {
    fimDeLuta = f;
    let perdem = f.empate ? ['esq', 'dir'] : [ladoDe(f.perdedor)];
    if (f.empate && perdem.every((l) => partida.coroas[l] <= 1)) perdem = []; // os dois seriam eliminados: repete o round
    for (const l of perdem) {
      partida.coroas[l] = Math.max(0, partida.coroas[l] - 1);
      partida.perdaI[l] = partida.coroas[l]; // posição da coroa que acabou de cair
      partida.perdaT[l] = 1;
    }
    const eliminado = perdem.find((l) => partida.coroas[l] <= 0);
    if (eliminado) {
      f.partida = { vencedor: eliminado === 'esq' ? vitor : lorranny };
      f.tempo += PARTIDA.tempoVitoria; // depois do "K.O." mostra a tela de vitória
    }
  }

  function decidirVencedorPorTempo() {
    if (fimDeLuta) return;
    const atraso = CONFIG.combate.atrasoFimDeLuta;
    if (lorranny.vidaTotal > vitor.vidaTotal) definirFimDeLuta({ vencedor: lorranny, perdedor: vitor, tempo: atraso });
    else if (vitor.vidaTotal > lorranny.vidaTotal) definirFimDeLuta({ vencedor: vitor, perdedor: lorranny, tempo: atraso });
    else definirFimDeLuta({ empate: true, tempo: atraso });
  }

  function fimDaLuta() {
    if (fimDeLuta.partida) {
      const nome = fimDeLuta.partida.vencedor === lorranny ? CONFIG.hud.nomeEsq : CONFIG.hud.nomeDir;
      novaPartida();
      abrirMenu(`${nome} venceu a partida!`);
      return;
    }
    partida.rodada++;
    reiniciarLuta(); // próximo round
  }

  function reiniciarLuta() {
    lorranny.reset(CONFIG.arena.inicioEsq, true);
    vitor.reset(CONFIG.arena.inicioDir, false);
    cpu.resetar();
    hud.tempo = CONFIG.hud.tempo;
    if (CONFIG.especial.zerarAoReiniciar) { energiaEspecial.esq = 0; energiaEspecial.dir = 0; atualizarBarraEspecial(); }
    soltarTudo();
    paradaT = 0;
    lentaT = 0;
    fimDeLuta = null;
    introT = PARTIDA.tempoRound + PARTIDA.tempoFight;
    for (const c of Object.values(combos)) { c.n = 0; c.janela = 0; c.fade = 0; c.pop = 0; }
    cam.iniciada = false; cam.divisao = 0; cam.alvoDiv = 0;
  }

  function iniciarLoop() {
    let anterior = performance.now();
    function quadro(agora) {
      let dt = (agora - anterior) / 1000;
      anterior = agora;
      if (dt > 0) fpsMedido = fpsMedido * 0.92 + (1 / dt) * 0.08;
      dt = Math.min(dt, 0.05); // evita saltos se a aba ficar em segundo plano

      atualizarFade(dt);
      if (telaMenuPrincipal) {
        atualizarMenuPrincipal(dt);
      } else if (telaSelecao) {
        if (!menuAberto) atualizarSelecao(dt);
      } else if (!menuAberto && paradaT > 0) {
        paradaT -= dt; // jogo congelado (hit-stop); os apertos de tecla ficam guardados
      } else if (!menuAberto) {
        const dtJogo = dt * escalaDeTempo(); // tempo do jogo (mais curto na câmera lenta)
        if (lentaT > 0) lentaT -= dt;        // a câmera lenta dura em tempo real
        const parado = { esq: false, dir: false, cima: false, baixo: false, defesa: false, socoApertado: false, chuteApertado: false, cimaApertado: false };
        if (introT > 0) introT = Math.max(0, introT - dt);
        const travado = fimDeLuta || introT > 0; // fim de round ou banner de início: ninguém se mexe
        const entradaP1 = travado ? parado : lerEntrada('p1');
        const entradaP2 = travado ? parado : (modo === 'cpu' ? cpu.decidir(vitor, lorranny, dtJogo) : lerEntrada('p2'));
        lorranny.atualizar(dtJogo, entradaP1);
        vitor.atualizar(dtJogo, entradaP2);
        resolverCorpos(dtJogo);
        resolverAcertos();
        atualizarCombos(dtJogo);
        limparPendentes();
        lorranny.atualizarRastro(dtJogo);
        vitor.atualizarRastro(dtJogo);

// Contagem regressiva e decisão por tempo
        if (!fimDeLuta && introT <= 0) {
        hud.tempo = Math.max(0, hud.tempo - dt);

        if (hud.tempo <= 0) {
        decidirVencedorPorTempo();
      } 
}

if (fimDeLuta && (fimDeLuta.tempo -= dt) <= 0) {
  fimDaLuta();
}
      }
      for (const l of ['esq', 'dir']) partida.perdaT[l] = Math.max(0, partida.perdaT[l] - dt * 1.3);
      if (menuAberto) limparPendentes();
      if (!telaSelecao && !telaMenuPrincipal) atualizarCamera(dt);

      desenhar();
      requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);
  }

  carregarTudo()
    .then(() => {
      const livres = indicesLivres();
      sel.cur = [livres[0], livres[1] !== undefined ? livres[1] : livres[0]];
      lorranny = new Lutador(ELENCO[sel.cur[0]].def, CONFIG.arena.inicioEsq, true);
      vitor = new Lutador(ELENCO[sel.cur[1]].def, CONFIG.arena.inicioDir, false);
      lorranny.oponente = vitor;
      vitor.oponente = lorranny;
      avisoCarregando.classList.add('oculto');
      canvas.focus();
      atualizarMenu();
      abrirMenuPrincipal(); // o jogo começa no menu principal
      iniciarLoop();
      window.__jogo = {
        get lorranny() { return lorranny; }, get vitor() { return vitor; },
        teclas, pendentes, cpu, hud, CONFIG, combos, cam, sel, abrirSelecao, abrirMenuPrincipal, menuP, fade, partida, arenaSel,
        get telaArena() { return telaArena; }, get telaMenuPrincipal() { return telaMenuPrincipal; }, get introT() { return introT; }, get fimDeLuta() { return fimDeLuta; },
        get mostrarTags() { return mostrarTags; }, get arenaFinal() { return arenaFinal; },
        energiaEspecial, ganharEspecial, especialCheio, gastarEspecial,
        get telaSelecao() { return telaSelecao; },
        get paradaT() { return paradaT; },
        get modo() { return modo; },
        definirModo, abrirMenu, fecharMenu, get menuAberto() { return menuAberto; },
      };
    })
    .catch((erro) => {
      avisoCarregando.classList.add('erro');
      avisoCarregando.textContent = erro.message +
        ' — confira se a pasta "assets" está ao lado do index.html.';
      console.error(erro);
    });
})();