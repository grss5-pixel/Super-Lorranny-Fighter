# Super Lorranny Fighter — Arena de teste (V0.8)

Abra `index.html` no navegador (duplo clique; não precisa de servidor).

## V0.8 — novidades
- **Gregory** (3º personagem) com todas as animações: parado, andando, agachar/levantar, pulo, soco, chute,
  soco/chute agachado, soco/chute aéreo, dano, defesa e derrota. Configuração em `DEF_GREGORY` (js/config.js).
- **Tela de seleção de personagens** (abre ao iniciar; também pelo menu → *TROCAR PERSONAGENS*).
  Confirma com a tecla de soco do jogador (ou Enter pelo P1), volta com a de chute. No modo 1 jogador o computador sorteia o dele.
  Dá para os dois escolherem o mesmo personagem (`CONFIG.selecao.permitirEspelho`).
- **Defesa** (segurar a tecla): reduz o dano a 20% (`CONFIG.defesa.fatorDano`); andar para trás também defende.
- **Derrota**: quem leva o golpe final perde o controle, é lançado para trás e cai; o jogo entra em **câmera lenta**
  (`CONFIG.combate.cameraLenta`).
- Teclas de defesa do P2 (/) e do modo 1 jogador (F) incluídas, e o rodapé mostra *defender*.

### Frames ignorados do Gregory (pedido)
- gregory-soco: 3º frame
- gregory-pulo: 2º e penúltimo (11º) frames
- gregory-dano: 3º frame

### Como adicionar mais personagens
1. Coloque os sprites em `assets/sprites/` e o retrato em `assets/ui/retrato-NOME.png`.
2. Em `js/config.js`, crie `DEF_NOME` (copie o `DEF_GREGORY` como modelo) e `const NOME = montarPersonagem(DEF_NOME);`.
3. Acrescente uma linha em `ELENCO` (no fim do arquivo): `{ id: 'nome', nome: 'NOME', def: NOME, retrato: 'assets/ui/retrato-nome.png' }`.
   A grade da seleção cresce sozinha (`CONFIG.selecao.colunas`).

## Controles
- P1 (lado esquerdo): A D andar · W pular · S agachar · F socar · G chutar · **R defender (segurar)** · H especial (placeholder)
- P2 (lado direito): ← → andar · ↑ pular · ↓ agachar · , socar · . chutar · **/ defender (segurar)** · ; especial (placeholder)
- F2: menu de pausa (1 jogador vs computador / 2 jogadores / continuar). Com o menu aberto,
  ↑ ↓ ou W S escolhem, Enter confirma, F2 fecha.
- F1: debug (caixas de dano, caixas de ataque, pivô, estado e quadro atual).

No modo 1 jogador, o P1 é controlado por você e o computador controla o P2.
Nesse modo os comandos são do estilo antigo: ← → andar · ↑ pular · ↓ agachar · A socar · S chutar ·
F defender · D especial (placeholder). As teclas do modo 2 jogadores ficam desativadas.

## Arena e pulo
- Arena 1918x820 (`CONFIG.tela`); o personagem anda de `limiteEsq` a `limiteDir` (140 a 1778).
- `CONFIG.arena.chaoY` é a altura do chão; `inicioEsq`/`inicioDir` são as posições iniciais.
- Pulo alto (`velPulo` 1900, `gravidade` 3500, ~495px). Com os pés acima de `regras.alturaParaPassar`,
  um personagem passa por cima do outro; ao pousar em cima, os corpos se afastam aos poucos.
- No ápice do pulo o personagem sai um pouco pela parte de cima da tela.

## Ajustes principais (js/config.js)
- `DEF_LORRANNY.escalaPersonagem` (1.2): tamanho da Lorranny inteira (sprite e caixas).
  Mude para aumentar ou diminuir.
- `CONFIG.regras.corposNaoSobrepoem`: corpos se empurram e não ficam um por cima do outro.
- `CONFIG.regras.recuoAoAcertar` / `duracaoRecuo`: força e tempo do empurrão ao levar golpe.
- `CONFIG.controles`: teclas de cada jogador.
- `CONFIG.cpu.alcance` / `pausaMin` / `pausaMax`: comportamento do computador.

## Vida e dano (v5)
- Cada lutador tem **2 barras de vida**: a **roxa** esgota primeiro, depois a **amarela**. Dois losangos
  embaixo da barra mostram quais ainda têm vida. Um "rastro" claro mostra o dano recente.
- **Soco**: dano baixo (6), recarga curta (0,35 s) e animação mais rápida → ataca com mais frequência.
- **Chute**: dano alto (14), recarga longa (0,9 s) → ataca com menos frequência.
- Vale para golpes em pé, agachado e no ar. O computador também respeita a recarga.
- Quando as 2 barras acabam: aparece **K.O.**, abre a **pausa** e a luta **reinicia** (provisório, até
  existirem as animações de derrota).
- Tudo ajustável em `CONFIG.combate` (js/config.js): `vida`, `dano`, `recarga`, `velocidadeGolpe`, `atrasoFimDeLuta`.

## Frames ignorados (pedido)
- lorranny-dano: 1º frame
- lorranny-soco-aereo: 1º frame
- lorranny-chute-aereo: 1º frame
- lorranny-pulo: 1º e 2º frames

## v4 — novidades
- Tela em **4:3** (1094×820), estilo TV de tubo, com **efeito de TV antiga** (scanlines, máscara RGB, vinheta, cintilação, cantos arredondados). **F3** liga/desliga o efeito.
- **Câmera** acompanha os lutadores pelo cenário largo. Se ficarem longe demais, a tela **divide ao meio com uma barra preta suave** (ajuste em `CONFIG.camera`).
- Controles do P1 à esquerda e do P2 à direita da tela; **F2 / F1 / F3** no meio inferior.
- **Paradinha** ao levar dano (`regras.paradaAoAcertar`) e **contador de combo** a partir de 2 acertos seguidos (`CONFIG.combo`).
- Retratos novos na barra de vida; Lorranny com o mesmo tamanho do Vitor (`escalaPersonagem: 1.0`).
