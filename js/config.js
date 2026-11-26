/* ==========================================================================
   SUPER LORRANNY FIGHTER — configuração da arena de teste
   ========================================================================== */

const CONFIG = {
  // Tela 4:3 (TV de tubo). O cenário (mundo) é mais largo que a tela e a câmera acompanha os lutadores.
  tela: { largura: 1094, altura: 820 },

  arena: {
    fundo: 'assets/arena/arena-fundo.png',
    largura: 1918,      // largura do cenário (a imagem de fundo)
    chaoY: 700,         // y onde a sola das botas encosta no chão
    limiteEsq: 140,     // limites do pivô do personagem (arena grande: dá para andar bastante)
    limiteDir: 1778,
    inicioEsq: 760,     // posição inicial de cada lutador
    inicioDir: 1158,
  },

  fisica: {
    velAndar: 430,
    velPuloX: 520,             // velocidade horizontal durante o pulo (mais rápida para dar para cruzar o oponente)
    gravidade: 3500,
    velPulo: 1900,             // pulo alto: ~515px de altura, dá para passar por cima do outro
    controleNoAr: false,       // false = direção travada durante o pulo
    ataquesAereosPorPulo: 2,   // quantos ataques no ar por pulo
    ataqueAereoParaX: false,   // true = para no eixo X durante o ataque aéreo
    ataqueAereoParaY: false,   // true = para no eixo Y durante o ataque aéreo
  },

  regras: {
    socarAgachado: true,
    chutarAgachado: true,
    corposNaoSobrepoem: true,  // os corpos se empurram e nunca ficam um por cima do outro
    recuoAoAcertar: 220,       // px/s do empurrão de quem leva o golpe
    duracaoRecuo: 0.12,        // segundos
    paradaAoAcertar: 0.09,     // "paradinha" do jogo quando alguém leva um golpe (segundos)
    alturaParaPassar: 240,     // com os pés acima disso (px), um personagem passa por cima do outro
    velAfastar: 1500,          // px/s: quão rápido os corpos se afastam quando se cruzam
  },

  // Câmera: segue os lutadores; se ficarem longe demais para caber na tela, divide a tela ao meio.
  camera: {
    margemDivisao: 190,   // folga (px) até a borda: distância máxima = largura da tela - 2 × isto
    histerese: 60,        // para voltar a juntar a tela, a distância precisa cair mais esta quantia
    suavidade: 10,        // quão rápido a câmera acompanha (maior = mais colada)
    velDivisao: 6,        // velocidade da transição junta ⇄ dividida
    faixaPreta: 12,       // largura (px) da barra preta no meio da tela dividida
  },

  // Combate: vida, dano e ritmo dos golpes. Cada lutador tem 2 barras de vida:
  // a 1ª (roxa) esgota primeiro; depois a 2ª (amarela). Com as duas vazias, a luta acaba.
  combate: {
    vida: { barra1: 200, barra2: 200 },
    // dano por golpe (vale para o golpe em pé, agachado e no ar)
    dano: { soco: 6, chute: 14 },
    // recarga: segundos até poder atacar de novo, contados a partir do INÍCIO do golpe
    // (soco = ataca com mais frequência; chute = menos frequência)
    recarga: { soco: 0.35, chute: 0.8 },
    // velocidade da animação do golpe (1 = normal; soco mais rápido)
    velocidadeGolpe: { soco: 1.25, chute: 1.0 },
    atrasoFimDeLuta: 2.8,   // segundos entre a última barra esgotar e abrir a pausa/reiniciar (dá tempo de ver a queda)
    // quem leva o golpe final é lançado para trás e cai
    derrota: { velX: 650, velPulo: 1300 },
    // câmera lenta no golpe final (segundos reais)
    cameraLenta: { duracao: 2.0, escala: 0.25, suavizar: 0.5 }, // escala 0.25 = 4x mais devagar; suavizar = tempo para voltar ao normal
  },

  // Defesa: segure a tecla para bloquear (só em pé, no chão). Preparação → bloqueio (segura) → recuperação.
  // A guarda só vale a partir do quadro de bloqueio; na preparação e na recuperação o lutador ainda leva o golpe inteiro.
  defesa: {
    fatorDano: 0.2,            // fração do dano que passa ao bloquear (0 = não sofre nada; 1 = sem defesa)
    recuo: 160,                // px/s: empurrão de quem bloqueou (menor que o de levar dano)
    duracaoRecuo: 0.10,        // segundos
    paradaAoDefender: 0.05,    // "paradinha" ao bloquear um golpe (segundos)
    guardaAndandoParaTras: true, // andar para trás já bloqueia os golpes
    tempoGuardaAuto: 0.15,       // segundos mostrando o quadro de bloqueio após um bloqueio automático
  },

  // Barra de ESPECIAL (a funcionalidade do golpe especial ainda não existe; isto é só a base).
  // A barra enche com a energia ganha em cada golpe: quem LEVA dano ganha mais do que quem acerta.
  //   energia = dano do golpe × multiplicador   (0 a `max`; a barra mostra energia / max)
  especial: {
    max: 120,
    porDanoCausado: 0.6,     // quem acerta: ganha 0,6 por ponto de dano causado
    porDanoRecebido: 1.0,    // quem leva o golpe: ganha 1,0 por ponto de dano (mais que quem bate)
    porBloqueio: 0.5,        // quem bloqueia: ganha 0,5 por ponto de dano (já reduzido pela defesa)
    zerarAoReiniciar: true,  // começa cada luta com a barra vazia
  },

  // Combo: aparece a partir de `minimo` acertos seguidos (cada acerto dentro de `janela` segundos do anterior)
  combo: { minimo: 2, janela: 0.9 },

  // Teclas. "code" = tecla física (letras e setas). "key" = caractere (pontuação, vale em qualquer layout).
  // Placeholder: 'especial' (H e ;) ainda não faz nada.
  controles: {
    p1: {
      esq: { code: 'KeyA' }, dir: { code: 'KeyD' }, cima: { code: 'KeyW' }, baixo: { code: 'KeyS' },
      soco: { code: 'KeyF' }, chute: { code: 'KeyG' }, especial: { code: 'KeyH' },
    },
    p2: {
      esq: { code: 'ArrowLeft' }, dir: { code: 'ArrowRight' }, cima: { code: 'ArrowUp' }, baixo: { code: 'ArrowDown' },
      soco: { key: ',' }, chute: { key: '.' }, especial: { key: ';' },
    },
  },

  // Modo 1 jogador: P1 usa o estilo de comando antigo (setas + A/S) e o P2 é o computador.
  // Placeholder: 'especial' (D) ainda não faz nada.
  controlesSolo: {
    p1: {
      esq: { code: 'ArrowLeft' }, dir: { code: 'ArrowRight' }, cima: { code: 'ArrowUp' }, baixo: { code: 'ArrowDown' },
      soco: { code: 'KeyA' }, chute: { code: 'KeyS' }, especial: { code: 'KeyD' }, defesa: { code: 'KeyF' },
    },
  },

  // Modo 1 jogador: o computador controla o Vitor (P2).
  cpu: {
    alcance: 230,   // distância entre os pivôs em que ele para e ataca
    pausaMin: 0.45, // segundos de espera entre um ataque e outro
    pausaMax: 1.0,
    chanceDefender: 0.35, // chance de bloquear cada ataque do P1 que chega perto (0 a 1)
  },

  // Tela de seleção de personagens
  selecao: {
    colunas: 3,             // personagens por linha na grade
    permitirEspelho: true,  // os dois jogadores podem escolher o mesmo personagem
    tempoVS: 1.6,           // segundos da tela "VS" antes da luta começar
    tempoCpu: 1.1,          // segundos que o cursor do computador fica sorteando
  },

  partida: {
    coroas: 3,
    tempoRound: 1.3,    // segundos do banner "ROUND N"
    tempoFight: 0.8,    // segundos do banner "FIGHT!"
    tempoVitoria: 3.4,  // segundos da tela de vitória antes de abrir o menu
  },

  arenas: [
    { id: 'telhado', nome: 'TELHADO DA COROA', fundo: 'assets/arena/arena-fundo.png' },
    { id: 'neon',    nome: 'KIZUNA NEON',      fundo: 'assets/arena/arena-neon.png' },
    { id: 'sakura',  nome: 'PIER SAKURA',      fundo: 'assets/arena/arena-sakura.png' },
  ],

  // Modo campanha: cutscene inicial e sequência de fases (cada fase = um inimigo numa arena).
  // `inimigo` e `heroi` são ids do ELENCO; `arena` é o id em `arenas`.
  // `cpu` ajusta o computador só naquela fase (pausaMin/pausaMax = tempo entre ataques; chanceDefender; alcance).
  // Cena da cutscene: imagem + foco [x,y] (0 a 1, ponto da imagem que fica no centro) + zoom [início, fim]
  //   (ou cameraX = recorte tipo menu principal) + falas [{ quem (opcional), texto }].
  campanha: {
    heroi: 'lorranny',
    tempoCarta: 2.6,        // segundos do cartão "FASE N" antes da luta
    velocidadeTexto: 45,    // letras por segundo nas cutscenes
    cutsceneInicial: [
      {
        imagem: 'assets/ui/cena-vitor-terra.png', foco: [0.5, 0.42], zoom: [1.0, 1.08],
        falas: [
          { texto: 'Em um mundo onde todos são radicais, todos viviam em paz, até que...' },
          { texto: 'Vitor, dono da empresa Crown Corp. decidiu que iria roubar toda show de bolice do mundo para si mesmo...' },
        ],
      },
      {
        imagem: 'assets/ui/cena-lorranny.png', foco: [0.55, 0.62], zoom: [1.0, 1.1],
        falas: [
          { texto: 'Lorranny, vendo isso, decidiu que não iria deixar barato, e partiu para impedi-lo.' },
        ],
      },
      {
        imagem: 'assets/ui/menu-fundo.png', cameraX: 258, zoom: [1.0, 1.05], // mesmo enquadramento do menu principal
        falas: [
          { texto: 'Ajude a Lorranny a derrotar os capangas de Vitor e devolver a radicalidade do mundo!' },
        ],
      },
    ],
    fases: [
      { inimigo: 'manu',    arena: 'neon',   cpu: { pausaMin: 0.7, pausaMax: 1.4, chanceDefender: 0.15 } },
      { inimigo: 'gregory', arena: 'sakura', cpu: { pausaMin: 0.5, pausaMax: 1.1, chanceDefender: 0.35 } },
      // próxima fase (ainda não feita): { inimigo: 'vitor', arena: 'telhado', cpu: { ... } },
    ],
    textoDerrota: 'A RADICALIDADE DO MUNDO DEPENDE DE VOCÊ!',
    textoFim: 'A LUTA FINAL CONTRA O VITOR VEM AÍ!',
  },

  hud: {
    nomeEsq: 'LORRANNY',
    nomeDir: 'VITOR',
    tempo: 99,
    retratoEsq: 'assets/ui/retrato-lorranny.png',
    retratoDir: 'assets/ui/retrato-vitor.png',
  },
};

const ESCALA_GERAL = 0.88;

/* ==========================================================================
   MONTADOR DE PERSONAGEM (não precisa mexer)
   Cada golpe é UM bloco com tudo junto:
     arquivo, escala, quadros   → a folha de sprites (quadro: [x, y, larg, alt, pivoX])
     sequencia, duracao, loop   → a animação
     ataque                     → caixa de dano (opcional): { quadros, x, y, w, h }
     usa: 'outroGolpe'          → reaproveita a folha de outro golpe
     porVelocidade: true        → quadro escolhido pela velocidade vertical (pulo)
     achatarY / provisorio      → achata o desenho / marca como provisório
   escalaPersonagem (opcional)  → tamanho do personagem inteiro: multiplica sprite e caixas
   ========================================================================== */
function escalarCaixa(c, k) {
  return { ...c, x: c.x * k, y: c.y * k, w: c.w * k, h: c.h * k };
}

function montarPersonagem(def) {
  const k = def.escalaPersonagem || 1;
  const folhas = {};
  const animacoes = {};
  const caixas = {};
  for (const [nome, c] of Object.entries(def.corpo)) caixas[nome] = escalarCaixa(c, k);

  for (const [nome, g] of Object.entries(def.golpes)) {
    if (!g.usa) {
      folhas[nome] = { arquivo: g.arquivo, escala: g.escala * k, quadros: g.quadros };
    }
    animacoes[nome] = {
      folha: g.usa || nome,
      sequencia: g.sequencia,
      duracao: g.duracao,
      loop: !!g.loop,
      ...(g.porVelocidade ? { porVelocidade: true } : {}),
      ...(g.achatarY ? { achatarY: g.achatarY } : {}),
      ...(g.provisorio ? { provisorio: true } : {}),
    };
    if (g.ataque) caixas[nome + 'Ataque'] = escalarCaixa(g.ataque, k);
  }
  return { folhas, animacoes, caixas };
}

/* ==========================================================================
   VITOR MATTES
   ========================================================================== */
const DEF_VITOR = {
  corpo: {
    corpoEmPe:     { x: -75, y: -430, w: 170, h: 450 },
    corpoAgachado: { x: -75, y: -270, w: 150, h: 270 },
  },

  golpes: {
    // ---------------- MOVIMENTOS ----------------
    parado: {
      arquivo: 'assets/sprites/vitor-parado.png',
      escala: 1.09,
      quadros: [
        [62, 123, 328, 461, 240.6],     // idle 1
        [478, 124, 349, 460, 658.1],    // idle 2 (mão estendida)
        [903, 123, 356, 461, 1082.1],   // idle 3 (mão estendida)
        [1339, 126, 319, 458, 1511.7],  // idle 4
        [1759, 125, 343, 459, 1934.3],  // idle 5
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [250, 140, 140, 250, 250], loop: true,
    },

    andando: {
      arquivo: 'assets/sprites/vitor-andando.png',
      escala: 0.89,
      quadros: [
        [60, 77, 588, 541, 349.8],
        [752, 72, 442, 555, 1020.7],
        [1479, 76, 551, 549, 1759.9],
      ],
      sequencia: [0, 1, 2, 1], duracao: [115, 115, 115, 115], loop: true,
    },

    agachar: {
      arquivo: 'assets/sprites/vitor-agachar.png',
      escala: 1.5,
      quadros: [
        [40, 118, 250, 300, 165],     // 0 começando a descer
        [335, 185, 245, 230, 455],    // 1 descendo
        [640, 205, 250, 210, 765],    // 2 agachado (fica parado aqui)
        [965, 185, 230, 230, 1085],   // 3 agachado com a rosa (extra, não usado)
        [1285, 118, 250, 300, 1410],  // 4 guarda em pé (extra, não usado)
      ],
      // desce e segura o último quadro enquanto a seta ↓ estiver apertada
      sequencia: [0, 1, 2], duracao: [45, 60, 70], loop: false,
    },

    // ao soltar a seta ↓: toca o agachar ao contrário
    levantar: {
      usa: 'agachar',
      sequencia: [2, 1, 0], duracao: [45, 45, 45], loop: false,
    },

    pulo: {
      arquivo: 'assets/sprites/vitor-pulo.png',
      escala: 2.05,
      quadros: [
        [12, 295, 152, 230, 90],
        [164, 336, 135, 186, 235],
        [345, 285, 160, 207, 430],
        [528, 235, 175, 247, 620],
        [726, 178, 172, 230, 815],
        [916, 124, 174, 244, 1005],
        [1086, 198, 178, 240, 1180],
        [1288, 262, 165, 246, 1375],
        [1468, 322, 156, 212, 1550],
        [1640, 380, 154, 152, 1715],
        [1820, 338, 152, 192, 1895],
        [2010, 294, 154, 232, 2085],
      ],
      sequencia: [2, 3, 4, 5, 6, 7, 8],
      duracao: [100, 100, 100, 100, 100, 100, 100],
      loop: true, porVelocidade: true,
    },

    dano: {
      arquivo: 'assets/sprites/vitor-dano.png',
      escala: 0.77,
      quadros: [
        [185, 55, 495, 620, 440],     // 0 recebendo o golpe (cabeça para trás)
        [805, 120, 520, 550, 1075],   // 1 curvado, segurando a barriga
        [1505, 275, 470, 395, 1790],  // 2 agachado de dor (extra, não usado)
      ],
      sequencia: [0, 1], duracao: [140, 220], loop: false,
    },

    // ---------------- DEFESA ----------------
    // segure a tecla: preparação → bloqueio (segura) ; ao soltar: recuperação
    defesa: {
      arquivo: 'assets/sprites/vitor-defesa.png',
      escala: 0.90,
      quadros: [
        [34, 233, 480, 530, 273.5],     // 0 preparação
        [521, 261, 513, 502, 792.5],    // 1 bloqueio (guarda ativa)
        [1070, 233, 453, 533, 1297.5],  // 2 recuperação
      ],
      sequencia: [0, 1], duracao: [60, 90], loop: false,
    },

    // ao soltar a tecla: toca o quadro de recuperação
    defesaFim: {
      usa: 'defesa',
      sequencia: [2], duracao: [110], loop: false,
    },

    // ---------------- DERROTA ----------------
    // lançado (sobe) → caindo (desce) → derrotado (no chão, fica ali)
    derrota: {
      arquivo: 'assets/sprites/vitor-derrota.png',
      escala: 0.9,
      quadros: [
        [15, 243, 516, 427, 272.5],   // 0 lançado
        [572, 414, 366, 358, 754.5],   // 1 caindo
        [973, 590, 549, 166, 1247.0],   // 2 derrotado no chão
      ],
      sequencia: [0, 1], duracao: [100, 100], loop: true, porVelocidade: true,
    },

    derrotaChao: {
      usa: 'derrota',
      sequencia: [2], duracao: [1000], loop: true,
    },

    // ---------------- GOLPES EM PÉ ----------------
    soco: {
      arquivo: 'assets/sprites/vitor-soco.png',
      escala: 1.15,
      quadros: [
        [49, 156, 353, 425, 223.5],
        [450, 162, 332, 422, 629.5],
        [836, 162, 430, 420, 1011.3],
        [1271, 162, 488, 422, 1475.6],
        [1772, 164, 389, 418, 1967.1],
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [45, 55, 70, 90, 80], loop: false,
      ataque: { quadros: [2, 3], x: 50, y: -360, w: 290, h: 80 },
    },

    chute: {
      arquivo: 'assets/sprites/vitor-chute.png',
      escala: 1.13,
      quadros: [
        [32, 198, 362, 406, 215],
        [432, 163, 282, 442, 580],
        [812, 173, 492, 432, 985],
        [1316, 180, 478, 425, 1470],
        [1822, 181, 282, 424, 1985],
      ],
      sequencia: [0, 1, 2, 4], duracao: [50, 70, 130, 90], loop: false,
      ataque: { quadros: [2], x: 120, y: -350, w: 260, h: 330 },
    },

    // ---------------- GOLPES AGACHADO ----------------
    socoAgachado: {
      arquivo: 'assets/sprites/vitor-soco-agachado.png',
      escala: 0.92,
      quadros: [
        [20, 225, 365, 375, 200],     // 0 guarda agachado
        [445, 245, 330, 355, 610],    // 1 preparação
        [835, 265, 505, 345, 1050],   // 2 braço esticado (impacto)
        [1373, 255, 370, 345, 1558],  // 3 recolhendo
        [1785, 225, 365, 375, 1970],  // 4 volta à guarda
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [45, 55, 120, 70, 70], loop: false,
      ataque: { quadros: [2], x: 60, y: -215, w: 280, h: 260 },
    },

    chuteAgachado: {
      arquivo: 'assets/sprites/vitor-chute-agachado.png',
      escala: 1.33,
      quadros: [
        [20, 280, 235, 245, 140],     // 0 guarda agachado
        [375, 290, 225, 235, 490],    // 1 preparação
        [700, 300, 355, 225, 860],    // 2 perna esticando
        [1090, 300, 400, 225, 1235],  // 3 perna esticada (impacto)
        [1580, 290, 225, 235, 1690],  // 4 recolhendo
        [1910, 285, 235, 240, 2020],  // 5 volta à guarda
      ],
      sequencia: [0, 1, 2, 3, 4, 5], duracao: [50, 70, 100, 110, 80, 70], loop: false,
      ataque: { quadros: [2, 3], x: 60, y: -150, w: 295, h: 250 },
    },

    // ---------------- GOLPES NO AR ----------------
    socoAereo: {
      arquivo: 'assets/sprites/vitor-soco-aereo.png',
      escala: 1.75,
      quadros: [
        [70, 20, 250, 272, 215],
        [450, 20, 255, 272, 570],
        [780, 20, 360, 272, 940],
        [1240, 20, 215, 272, 1360],
        [1625, 20, 215, 272, 1740],
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [45, 55, 90, 80, 70], loop: false,
      ataque: { quadros: [1, 2], x: 50, y: -370, w: 290, h: 300 },
    },

    chuteAereo: {
      arquivo: 'assets/sprites/vitor-chute-aereo.png',
      escala: 1.75,
      quadros: [
        [70, 20, 245, 272, 215],
        [415, 20, 320, 272, 560],
        [780, 20, 365, 272, 940],
        [1225, 20, 240, 272, 1340],
        [1620, 20, 220, 272, 1740],
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [50, 70, 110, 80, 70], loop: false,
      ataque: { quadros: [1, 2], x: 100, y: -380, w: 270, h: 380 },
    },
  },
};

const VITOR = montarPersonagem(DEF_VITOR);

/* ==========================================================================
   LORRANNY
   escalaPersonagem: tamanho da Lorranny inteira (sprite + caixas). 1.0 = mesma altura do Vitor.
   ========================================================================== */
const DEF_LORRANNY = {
  escalaPersonagem: 1.0,

  corpo: {
    corpoEmPe:     { x: -80, y: -430, w: 160, h: 430 },
    corpoAgachado: { x: -80, y: -280, w: 160, h: 280 },
  },

  golpes: {
    // ---------------- MOVIMENTOS ----------------
    parado: {
      arquivo: 'assets/sprites/lorranny-parado.png',
      escala: 1.07,
      quadros: [
        [45, 268, 330, 448, 210],
        [428, 268, 310, 448, 580],
        [795, 268, 310, 448, 950],
        [1170, 268, 315, 448, 1330],
      ],
      sequencia: [0, 1, 2, 3], duracao: [170, 170, 170, 170], loop: true,
    },

    andando: {
      arquivo: 'assets/sprites/lorranny-andando.png',
      escala: 1.15,
      quadros: [
        [47, 183, 308, 417, 199.2],         // passo 1
        [502, 183, 264, 417, 648.0],        // passo 2
        [926, 185, 303, 415, 1084.3],       // passo 3
        [1390, 180, 260, 420, 1535.1],      // passo 4
        [1831, 183, 287, 417, 1973.5],      // passo 5
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [90, 90, 90, 90, 90], loop: true,
    },

    // desce: 0 → 1 → 4 (agachada com as mãos nos joelhos) e segura
    agachar: {
      arquivo: 'assets/sprites/lorranny-agachado.png',
      escala: 1.07,
      quadros: [
        [38, 369, 249, 309, 173.7],         // começando a descer
        [357, 381, 229, 294, 488.4],        // descendo
        [648, 411, 236, 271, 779.2],        // mão no chão (extra, não usado)
        [944, 371, 246, 306, 1080.4],       // agachada (extra, não usado)
        [1260, 378, 249, 299, 1406.5],      // agachada com as mãos nos joelhos
      ],
      sequencia: [0, 1, 4], duracao: [60, 60, 50], loop: false,
    },

    // ao soltar a seta ↓: toca o agachar ao contrário
    levantar: {
      usa: 'agachar',
      sequencia: [4, 1, 0], duracao: [60, 60, 60], loop: false,
    },

    pulo: {
      arquivo: 'assets/sprites/lorranny-pulo.png',
      escala: 1.75,
      quadros: [
        [20, 350, 160, 192, 100],      // 0  preparação (agachada) (extra, não usado)
        [188, 298, 172, 244, 275],     // 1  impulso (extra, não usado)
        [383, 237, 165, 285, 465],     // 2  subida 1
        [577, 178, 160, 286, 655],     // 3  subida 2
        [778, 120, 155, 277, 855],     // 4  topo 1
        [973, 102, 155, 282, 1050],    // 5  topo 2
        [1188, 162, 155, 277, 1265],   // 6  descida 1
        [1388, 248, 157, 271, 1465],   // 7  descida 2
        [1583, 335, 190, 208, 1675],   // 8  amortecimento (extra, não usado)
        [1796, 282, 170, 260, 1880],   // 9  recuperação (extra, não usado)
        [1978, 268, 175, 274, 2065],   // 10 idle (extra, não usado)
      ],
      sequencia: [2, 3, 4, 5, 6, 7],
      duracao: [100, 100, 100, 100, 100, 100],
      loop: true, porVelocidade: true,
    },

    dano: {
      arquivo: 'assets/sprites/lorranny-dano.png',
      escala: 0.80,
      quadros: [
        [623, 156, 523, 602, 878.6],        // recebendo o golpe
        [1252, 211, 416, 546, 1436.3],      // curvada, segurando o corpo
      ],
      sequencia: [0, 1], duracao: [140, 220], loop: false,
    },

    // ---------------- DEFESA ----------------
    // segure a tecla: preparação → bloqueio (segura) ; ao soltar: recuperação
    defesa: {
      arquivo: 'assets/sprites/lorranny-defesa.png',
      escala: 0.85,
      quadros: [
        [62, 234, 425, 551, 274.0],     // 0 preparação
        [562, 260, 421, 525, 773.0],    // 1 bloqueio (guarda ativa)
        [1083, 234, 418, 553, 1291.5],  // 2 recuperação
      ],
      sequencia: [0, 1], duracao: [60, 90], loop: false,
    },

    // ao soltar a tecla: toca o quadro de recuperação
    defesaFim: {
      usa: 'defesa',
      sequencia: [2], duracao: [110], loop: false,
    },

    // ---------------- DERROTA ----------------
    // lançado (sobe) → caindo (desce) → derrotado (no chão, fica ali)
    derrota: {
      arquivo: 'assets/sprites/lorranny-derrota.png',
      escala: 0.85,
      quadros: [
        [14, 199, 493, 478, 260.5],   // 0 lançado
        [516, 393, 439, 390, 735.5],   // 1 caindo
        [921, 588, 596, 185, 1218.5],   // 2 derrotado no chão
      ],
      sequencia: [0, 1], duracao: [100, 100], loop: true, porVelocidade: true,
    },

    derrotaChao: {
      usa: 'derrota',
      sequencia: [2], duracao: [1000], loop: true,
    },

    // ---------------- GOLPES EM PÉ ----------------
    soco: {
      arquivo: 'assets/sprites/lorranny-soco.png',
      escala: 1.22,
      quadros: [
        [45, 245, 290, 392, 190],
        [380, 250, 315, 387, 537],
        [728, 250, 385, 387, 885],
        [1135, 250, 300, 387, 1285],
        [1480, 245, 270, 392, 1615],
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [45, 55, 130, 80, 70], loop: false,
      ataque: { quadros: [2], x: 50, y: -360, w: 290, h: 80 },
    },

    chute: {
      arquivo: 'assets/sprites/lorranny-chute.png',
      escala: 1.28,
      quadros: [
        [45, 190, 285, 370, 190],
        [455, 185, 240, 375, 580],
        [860, 190, 435, 370, 975],
        [1395, 190, 210, 370, 1490],
        [1840, 190, 280, 370, 1980],
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [50, 70, 120, 80, 60], loop: false,
      ataque: { quadros: [2], x: 120, y: -350, w: 300, h: 330 },
    },

    // ---------------- GOLPES AGACHADA ----------------
    socoAgachado: {
      arquivo: 'assets/sprites/lorranny-soco-agachado.png',
      escala: 1.10,
      quadros: [
        [16, 253, 291, 300, 159.8],         // guarda agachada
        [370, 253, 301, 300, 525.8],        // guarda 2
        [689, 256, 336, 297, 870.2],        // punho para trás
        [1072, 257, 374, 296, 1233.5],      // braço esticado (impacto)
        [1468, 254, 313, 299, 1633.3],      // recolhendo
        [1839, 254, 299, 299, 1987.4],      // volta à guarda
      ],
      sequencia: [0, 1, 2, 3, 4, 5], duracao: [45, 55, 70, 110, 80, 60], loop: false,
      ataque: { quadros: [2, 3], x: 40, y: -268, w: 174, h: 104 },
    },

    chuteAgachado: {
      arquivo: 'assets/sprites/lorranny-chute-agachado.png',
      escala: 0.95,
      quadros: [
        [61, 39, 323, 348, 208.4],          // guarda agachada
        [479, 45, 309, 358, 651.4],         // preparação
        [864, 66, 403, 338, 1001.3],        // perna subindo
        [32, 448, 471, 346, 167.6],         // chute completo (impacto)
        [564, 454, 282, 349, 708.9],        // recolhendo
        [884, 453, 312, 349, 1034.8],       // volta à guarda
      ],
      sequencia: [0, 1, 2, 3, 4, 5], duracao: [50, 70, 90, 120, 80, 70], loop: false,
      ataque: { quadros: [2, 3], x: 40, y: -177, w: 337, h: 148 },
    },

    // ---------------- GOLPES NO AR ----------------
    socoAereo: {
      arquivo: 'assets/sprites/lorranny-soco-aereo.png',
      escala: 1.10,
      quadros: [
        [363, 129, 272, 453, 510.7],        // subindo (soco)
        [675, 154, 401, 434, 841.6],        // extensão (soco)
        [1068, 180, 386, 416, 1218.5],      // continuação (impacto)
        [1451, 163, 298, 431, 1607.1],      // recuperação
      ],
      sequencia: [0, 1, 2, 3], duracao: [55, 90, 80, 70], loop: false,
      ataque: { quadros: [1, 2], x: 40, y: -429, w: 208, h: 280 },
    },

    chuteAereo: {
      arquivo: 'assets/sprites/lorranny-chute-aereo.png',
      escala: 0.95,
      quadros: [
        [383, 126, 336, 484, 580.7],        // preparação do chute
        [748, 144, 532, 440, 958.9],        // perna subindo
        [1314, 135, 325, 507, 1476.7],      // chute completo (impacto)
        [1712, 213, 304, 450, 1875.2],      // recuperação
      ],
      sequencia: [0, 1, 2, 3], duracao: [70, 110, 80, 70], loop: false,
      ataque: { quadros: [1, 2], x: 40, y: -395, w: 270, h: 380 },
    },
  },
};

const LORRANNY = montarPersonagem(DEF_LORRANNY);

/* ==========================================================================
   GREGORY
   Quadros ignorados (pedido): soco 3º · pulo 2º e penúltimo (11º) · dano 3º
   ========================================================================== */
const DEF_GREGORY = {
  corpo: {
    corpoEmPe:     { x: -80, y: -430, w: 160, h: 430 },
    corpoAgachado: { x: -80, y: -280, w: 160, h: 280 },
  },

  golpes: {
    // ---------------- MOVIMENTOS ----------------
    parado: {
      arquivo: 'assets/sprites/gregory-parado.png',
      escala: 1.04,
      quadros: [
        [116, 240, 213, 459, 230.5],   // pé no chão
        [552, 240, 222, 459, 673.5],   // bate o pé
        [990, 239, 214, 460, 1103.5],   // bate o outro pé
        [1439, 240, 204, 459, 1548.0],   // volta ao normal
      ],
      sequencia: [0, 1, 2, 3], duracao: [350, 120, 120, 300], loop: true,
    },

    andando: {
      arquivo: 'assets/sprites/gregory-andando.png',
      escala: 1.0,
      quadros: [
        [299, 120, 303, 475, 450.0],   // passo 1
        [955, 120, 191, 475, 1047.0],   // passo 2 (pernas juntas)
        [1567, 120, 288, 475, 1710.5],   // passo 3
      ],
      sequencia: [0, 1, 2, 1], duracao: [110, 110, 110, 110], loop: true,
    },

    agachar: {
      arquivo: 'assets/sprites/gregory-agachar.png',
      escala: 1.22,
      quadros: [
        [70, 189, 264, 365, 201.5],   // 0 preparação
        [495, 252, 263, 302, 636.5],   // 1 descida
        [957, 292, 225, 262, 1068.5],   // 2 agachado
        [1396, 294, 219, 260, 1505.5],   // 3 ajuste (extra, não usado)
        [1823, 227, 252, 327, 1948.5],   // 4 volta à guarda (extra, não usado)
      ],
      sequencia: [0, 1, 2], duracao: [60, 60, 50], loop: false,
    },

    levantar: {
      usa: 'agachar',
      sequencia: [2, 1, 0], duracao: [60, 60, 60], loop: false,
    },

    // pulo: o quadro 2 (índice 1) e o penúltimo (11º, índice 10) ficam de fora
    pulo: {
      arquivo: 'assets/sprites/gregory-pulo.png',
      escala: 1.55,
      quadros: [
        [86, 167, 195, 182, 183.5],   // 0 (1º) agachando para saltar
        [419, 105, 204, 237, 521.0],   // 1 (2º) IGNORADO
        [778, 37, 180, 295, 868.0],   // 2 (3º) subindo
        [1135, 30, 182, 265, 1226.0],   // 3 (4º) subindo
        [61, 392, 218, 249, 170.0],   // 4 (5º) topo
        [423, 391, 222, 220, 534.0],   // 5 (6º) topo
        [784, 392, 199, 271, 883.5],   // 6 (7º) descendo
        [1138, 392, 195, 283, 1235.5],   // 7 (8º) descendo
        [71, 755, 197, 262, 169.5],   // 8 (9º) amortecendo
        [426, 810, 210, 212, 531.0],   // 9 (10º) amortecendo
        [782, 731, 190, 294, 877.0],   // 10 (11º) IGNORADO
        [1138, 714, 173, 314, 1224.5],   // 11 (12º) em pé
      ],
      sequencia: [0, 2, 3, 4, 5, 6, 7, 8, 9, 11],
      duracao: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
      loop: true, porVelocidade: true,
    },

    dano: {
      arquivo: 'assets/sprites/gregory-dano.png',
      escala: 1.0,
      quadros: [
        [232, 170, 352, 474, 407.5],   // 0 impacto
        [726, 128, 445, 513, 986.5],   // 1 recuo
        [1343, 358, 384, 283, 1534.5],   // 2 estabilização (IGNORADO)
      ],
      sequencia: [0, 1], duracao: [140, 220], loop: false,
    },

    // ---------------- DEFESA ----------------
    defesa: {
      arquivo: 'assets/sprites/gregory-defesa.png',
      escala: 0.8,
      quadros: [
        [31, 202, 453, 597, 257.0],   // 0 preparação
        [514, 247, 514, 552, 786.5],   // 1 bloqueio (guarda ativa)
        [1084, 193, 422, 606, 1294.5],   // 2 recuperação
      ],
      sequencia: [0, 1], duracao: [60, 90], loop: false,
    },

    defesaFim: {
      usa: 'defesa',
      sequencia: [2], duracao: [110], loop: false,
    },

    // ---------------- DERROTA ----------------
    // voando (no ar) → batendo no chão → bounce → derrotado (fica no chão)
    derrota: {
      arquivo: 'assets/sprites/gregory-derrota.png',
      escala: 1.05,
      quadros: [
        [83, 199, 384, 342, 275.0],   // 0 voando
        [567, 382, 399, 230, 766.5],   // 1 batendo no chão
        [1038, 420, 297, 181, 1186.5],   // 2 bounce
        [1445, 505, 480, 116, 1685.0],   // 3 derrotado no chão
      ],
      sequencia: [0], duracao: [100], loop: true, porVelocidade: true,
    },

    derrotaChao: {
      usa: 'derrota',
      sequencia: [1, 2, 3], duracao: [120, 120, 1000], loop: false,
    },

    // ---------------- GOLPES EM PÉ ----------------
    // soco: o 3º quadro (impacto com efeito) fica de fora
    soco: {
      arquivo: 'assets/sprites/gregory-soco.png',
      escala: 1.2,
      quadros: [
        [41, 170, 283, 396, 182.0],   // 0 preparação
        [446, 194, 395, 372, 605.5],   // 1 extensão do soco
        [905, 193, 412, 373, 1063.5],   // 2 impacto (IGNORADO)
        [1375, 183, 282, 383, 1515.5],   // 3 retração
        [1800, 173, 284, 393, 1941.5],   // 4 volta à guarda
      ],
      sequencia: [0, 1, 3, 4], duracao: [70, 140, 80, 70], loop: false,
      ataque: { quadros: [1], x: 40, y: -365, w: 254, h: 90 },
    },

    chute: {
      arquivo: 'assets/sprites/gregory-chute.png',
      escala: 1.19,
      quadros: [
        [57, 171, 285, 401, 199.0],   // 0 preparação
        [484, 175, 364, 395, 594.0],   // 1 extensão do chute
        [916, 181, 396, 393, 1012.5],   // 2 impacto
        [1423, 166, 237, 410, 1508.0],   // 3 retração
        [1820, 170, 275, 402, 1957.0],   // 4 volta à guarda
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [60, 70, 120, 80, 60], loop: false,
      ataque: { quadros: [2], x: 40, y: -379, w: 319, h: 129 },
    },

    // ---------------- GOLPES AGACHADO ----------------
    socoAgachado: {
      arquivo: 'assets/sprites/gregory-soco-agachado.png',
      escala: 0.88,
      quadros: [
        [51, 273, 304, 376, 201.5],   // 0 guarda agachada
        [470, 269, 303, 380, 620.5],   // 1 preparação
        [880, 275, 447, 374, 1029.5],   // 2 braço esticado (impacto)
        [1376, 276, 304, 372, 1522.5],   // 3 recolhendo
        [1799, 276, 294, 373, 1945.0],   // 4 volta à guarda
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [45, 60, 120, 80, 60], loop: false,
      ataque: { quadros: [2], x: 40, y: -263, w: 235, h: 90 },
    },

    chuteAgachado: {
      arquivo: 'assets/sprites/gregory-chute-agachado.png',
      escala: 1.17,
      quadros: [
        [59, 294, 266, 283, 192.0],   // 0 preparação
        [421, 291, 272, 283, 553.5],   // 1 giro
        [765, 305, 444, 261, 984.0],   // 2 chute baixo (impacto)
        [1264, 297, 255, 277, 1388.5],   // 3 retração
        [1661, 292, 251, 287, 1788.5],   // 4 volta à guarda
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [50, 70, 130, 80, 70], loop: false,
      ataque: { quadros: [2], x: 40, y: -161, w: 237, h: 138 },
    },

    // ---------------- GOLPES NO AR ----------------
    socoAereo: {
      arquivo: 'assets/sprites/gregory-soco-aereo.png',
      escala: 1.1,
      quadros: [
        [10, 273, 216, 430, 122.0],   // 0 preparação
        [291, 282, 281, 419, 435.0],   // 1 impulso
        [625, 295, 352, 418, 746.0],   // 2 soco (impacto)
        [973, 278, 231, 439, 1087.0],   // 3 recuo
        [1257, 276, 235, 441, 1376.0],   // 4 volta à posição
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [50, 70, 140, 70, 60], loop: false,
      ataque: { quadros: [2], x: 40, y: -429, w: 229, h: 360 },
    },

    chuteAereo: {
      arquivo: 'assets/sprites/gregory-chute-aereo.png',
      escala: 1.0,
      quadros: [
        [61, 228, 239, 356, 181.0],   // 0 preparação
        [397, 122, 249, 458, 516.0],   // 1 subida
        [735, 151, 500, 342, 912.0],   // 2 golpe (impacto)
        [1283, 193, 287, 420, 1418.0],   // 3 recuperação
        [1642, 338, 276, 321, 1800.0],   // 4 queda / guarda
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [70, 90, 130, 80, 60], loop: false,
      ataque: { quadros: [2], x: 40, y: -395, w: 289, h: 380 },
    },
  },
};

const GREGORY = montarPersonagem(DEF_GREGORY);

/* ==========================================================================
   MANU
   Sem sprite de parado/derrota enviados: o "parado" usa os quadros de guarda da folha de soco e a derrota é provisória (usa o dano).
   As caixas de ataque (ataque) já têm ~60px de folga além do alcance desenhado, para ficar jogável.
   Dica: se ela parecer maior/menor que os outros em alguma ação, ajuste só o "escala" daquela folha.
   ========================================================================== */
const DEF_MANU = {
  corpo: {
    corpoEmPe:     { x: -80, y: -430, w: 160, h: 430 },
    corpoAgachado: { x: -80, y: -280, w: 160, h: 280 },
  },
 
  golpes: {
    // ---------------- MOVIMENTOS ----------------
    // provisório: guarda da folha de soco (quadros 0 e 4)
    parado: {
      arquivo: 'assets/sprites/manu-soco.png',
      escala: 1.05,
      quadros: [
        [10, 345, 303, 415, 183.0],   // 0 guarda
        [336, 356, 259, 404, 485.0],   // 1
        [627, 374, 325, 392, 793.0],   // 2
        [976, 365, 272, 403, 1132.0],   // 3
        [1268, 356, 255, 409, 1430.0],   // 4 guarda
      ],
      sequencia: [0, 4], duracao: [400, 400], loop: true, provisorio: true,
    },
 
    andando: {
      arquivo: 'assets/sprites/manu-andando.png',
      escala: 0.77,
      quadros: [
        [2, 174, 261, 562, 178.0],      // 0
        [347, 178, 287, 558, 535.0],    // 1
        [698, 180, 361, 553, 882.0],    // 2
        [1061, 183, 302, 552, 1249.0],  // 3
        [1448, 181, 260, 555, 1626.0],  // 4
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [100, 100, 100, 100, 100], loop: true,
    },
 
    agachar: {
      arquivo: 'assets/sprites/manu-agachar.png',
      escala: 1.0,
      quadros: [
        [22, 303, 316, 410, 190.0],   // 0
        [398, 355, 249, 356, 541.0],   // 1
        [759, 379, 234, 332, 884.0],   // 2
        [1121, 421, 233, 296, 1248.0],   // 3
        [1488, 456, 228, 261, 1612.0],   // 4
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [45, 45, 45, 45, 45], loop: false,
    },
 
    levantar: {
      usa: 'agachar',
      sequencia: [4, 3, 2, 1, 0], duracao: [40, 40, 40, 40, 40], loop: false,
    },
 
    // pulo: ficam de fora o 1º quadro (em pé), o 2º (agachada) e o último (aterrissagem)
    pulo: {
      arquivo: 'assets/sprites/manu-pulo.png',
      escala: 1.5,
      quadros: [
        [79, 39, 230, 286, 208.0],   // 0 (ignorado)
        [477, 65, 188, 259, 585.0],   // 1 (ignorado)
        [850, 31, 207, 292, 979.0],   // 2
        [1242, 19, 197, 289, 1360.0],   // 3
        [93, 340, 185, 291, 210.0],   // 4
        [464, 353, 210, 274, 597.0],   // 5
        [836, 343, 247, 312, 966.0],   // 6
        [1232, 347, 194, 303, 1366.0],   // 7
        [79, 696, 229, 281, 214.0],   // 8
        [464, 712, 247, 285, 588.0],   // 9
        [847, 737, 222, 260, 964.0],   // 10
        [1232, 750, 206, 246, 1342.0],   // 11 (ignorado)
      ],
      sequencia: [2, 3, 4, 5, 6, 7, 8, 9, 10],
      duracao: [100, 100, 100, 100, 100, 100, 100, 100, 100],
      loop: true, porVelocidade: true,
    },
 
    dano: {
      arquivo: 'assets/sprites/manu-dano.png',
      escala: 0.65,
      quadros: [
        [297, 191, 496, 607, 574.0],   // 0 impacto
        [972, 181, 500, 617, 1259.0],   // 1 recuo
      ],
      sequencia: [0, 1], duracao: [140, 220], loop: false,
    },
 
    // ---------------- DEFESA ----------------
    // só vieram 2 quadros (preparação e bloqueio); ao soltar a tecla ela volta pelo quadro de preparação
    defesa: {
      arquivo: 'assets/sprites/manu-defesa.png',
      escala: 0.54,
      quadros: [
        [248, 113, 484, 693, 511.0],   // 0 preparação
        [1004, 141, 483, 665, 1266.0],   // 1 bloqueio (guarda ativa)
      ],
      sequencia: [0, 1], duracao: [60, 90], loop: false,
    },
 
    defesaFim: {
      usa: 'defesa',
      sequencia: [0], duracao: [110], loop: false,
    },
 
    // ---------------- DERROTA ----------------
    // voando (no ar) → caindo/batendo no chão → derrotada (fica deitada)
    derrota: {
      arquivo: 'assets/sprites/manu-derrota.png',
      escala: 0.70,
      quadros: [
        [12, 171, 453, 540, 312.0],     // 0 voando
        [555, 358, 582, 365, 809.0],    // 1 caindo / batendo no chão
        [1149, 531, 612, 206, 1449.0],  // 2 derrotada no chão
      ],
      sequencia: [0, 1], duracao: [100, 100], loop: true, porVelocidade: true,
    },

    derrotaChao: {
      usa: 'derrota',
      sequencia: [1, 2], duracao: [140, 1000], loop: false,
    },
 
    // ---------------- GOLPES EM PÉ ----------------
    soco: {
      arquivo: 'assets/sprites/manu-soco.png',
      escala: 1.05,
      quadros: [
        [10, 345, 303, 415, 183.0],   // 0 preparação
        [336, 356, 259, 404, 485.0],   // 1 recuo do braço
        [627, 374, 325, 392, 793.0],   // 2 soco (impacto)
        [976, 365, 272, 403, 1132.0],   // 3 retração
        [1268, 356, 255, 409, 1430.0],   // 4 volta à guarda
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [45, 60, 110, 80, 60], loop: false,
      ataque: { quadros: [2], x: 40, y: -334, w: 179, h: 50 },
    },
 
    chute: {
      arquivo: 'assets/sprites/manu-chute.png',
      escala: 1.15,
      quadros: [
        [15, 337, 298, 377, 172.0],   // 0 preparação
        [355, 330, 221, 385, 515.0],   // 1 joelho
        [682, 333, 411, 383, 862.0],   // 2 chute (impacto)
        [1143, 332, 241, 383, 1308.0],   // 3 retração
        [1510, 335, 255, 382, 1660.0],   // 4 volta à guarda
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [60, 70, 120, 80, 60], loop: false,
      ataque: { quadros: [2], x: 40, y: -384, w: 283, h: 310 },
    },
 
    // ---------------- GOLPES AGACHADA ----------------
    socoAgachado: {
      arquivo: 'assets/sprites/manu-soco-agachado.png',
      escala: 1.15,
      quadros: [
        [29, 415, 228, 275, 155.0],   // 0
        [372, 422, 278, 267, 502.0],   // 1
        [748, 420, 225, 272, 855.0],   // 2
        [1082, 431, 306, 261, 1201.0],   // 3 braço esticado (impacto)
        [1516, 418, 223, 273, 1635.0],   // 4
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [45, 60, 70, 110, 60], loop: false,
      ataque: { quadros: [3], x: 40, y: -243, w: 224, h: 90 },
    },
 
    chuteAgachado: {
      arquivo: 'assets/sprites/manu-chute-agachado.png',
      escala: 1.18,
      quadros: [
        [29, 365, 216, 259, 152.0],   // 0
        [324, 402, 302, 222, 440.0],   // 1
        [644, 416, 336, 212, 779.0],   // 2
        [996, 407, 441, 219, 1163.0],   // 3 chute baixo (impacto)
        [1507, 402, 237, 227, 1624.0],   // 4
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [50, 70, 80, 120, 70], loop: false,
      ataque: { quadros: [3], x: 40, y: -149, w: 327, h: 110 },
    },
 
    // ---------------- GOLPES NO AR ----------------
    socoAereo: {
      arquivo: 'assets/sprites/manu-soco-aereo.png',
      escala: 1.15,
      quadros: [
        [48, 265, 224, 305, 188.0],   // 0
        [394, 268, 247, 350, 529.0],   // 1
        [712, 274, 303, 367, 850.0],   // 2 soco (impacto)
        [1067, 279, 310, 344, 1185.0],   // 3 soco (impacto)
        [1496, 267, 208, 329, 1626.0],   // 4
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [50, 70, 90, 80, 60], loop: false,
      ataque: { quadros: [2, 3], x: 40, y: -308, w: 196, h: 300 },
    },
 
    chuteAereo: {
      arquivo: 'assets/sprites/manu-chute-aereo.png',
      escala: 1.1,
      quadros: [
        [9, 266, 243, 358, 152.0],   // 0
        [336, 283, 263, 385, 503.0],   // 1
        [653, 283, 299, 375, 845.0],   // 2
        [992, 279, 448, 394, 1198.0],   // 3 chute (impacto)
        [1491, 269, 263, 408, 1659.0],   // 4
      ],
      sequencia: [0, 1, 2, 3, 4], duracao: [70, 90, 80, 130, 70], loop: false,
      ataque: { quadros: [3], x: 40, y: -290, w: 232, h: 340 },
    },
  },
};
 
const MANU = montarPersonagem(DEF_MANU);

/* ==========================================================================
   ELENCO — personagens que aparecem na tela de seleção (na ordem da grade)
   Para ADICIONAR um personagem: crie DEF_NOVO + montarPersonagem(DEF_NOVO) como os outros
   e troque o item "bloqueado" por:
     { id: 'novo', nome: 'NOME', def: NOVO, retrato: 'assets/ui/retrato-novo.png' }
   O personagem precisa ter pelo menos as animações do Vitor/Lorranny (parado, andando, golpes, defesa, derrota...).
   ========================================================================== */
const ELENCO = [
  { id: 'lorranny', nome: 'LORRANNY', def: LORRANNY, retrato: 'assets/ui/retrato-lorranny.png' },
  { id: 'vitor',    nome: 'VITOR',    def: VITOR,    retrato: 'assets/ui/retrato-vitor.png' },
  { id: 'gregory',  nome: 'GREGORY',  def: GREGORY,  retrato: 'assets/ui/retrato-gregory.png' },
  { id: 'manu',     nome: 'MANU',     def: MANU,     retrato: 'assets/ui/retrato-manu.png' },
];
