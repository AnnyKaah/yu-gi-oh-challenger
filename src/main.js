import { GameController } from './core/GameController.js';
import { Background } from './ui/Background.js';
import { Board } from './ui/Board.js';
import { HUD } from './ui/HUD.js';
import { ActionLog } from './ui/ActionLog.js';
import { ContextualInfo } from './ui/ContextualInfo.js';
import { CardNameTooltip } from './ui/CardNameTooltip.js';
import { TutorialController } from './core/TutorialController.js';
import { CardLibrary } from './ui/CardLibrary.js';
import { AudioController } from './core/AudioController.js';
import { HelpMenu } from './ui/HelpMenu.js';
import { ShopScreen } from './ui/ShopScreen.js';
import { EndGameScreen } from './ui/EndGameScreen.js';
import { Tutorial } from './ui/Tutorial.js';
import { DeckBuilderScreen } from './ui/DeckBuilderScreen.js';
import { CoinToss } from './ui/CoinToss.js';
import { ActionMenu } from './ui/ActionMenu.js';
import { CardDetailModal } from './ui/CardDetailModal.js';
import { GraveyardModal } from './ui/GraveyardModal.js';

const app = document.getElementById('app');

async function showHeroScreen() {
  // **CORREÇÃO DEFINITIVA**: Garante a limpeza completa do estado do jogo anterior.
  // Remove todos os elementos filhos de #app e listeners associados.
  while (app.firstChild) {
    app.removeChild(app.firstChild);
  }

  // Garante que tooltips e modais sejam escondidos ao voltar para o menu
  cardNameTooltip.hide();
  actionMenu.hide();
  cardDetailModal.hide();

  // Renderiza o background
  const background = new Background('hero');
  app.appendChild(background.render());

  // Cria o container da hero page
  const heroScreen = document.createElement('div');
  heroScreen.classList.add('hero-screen');

  // Carrega as cartas para o showcase
  const response = await fetch('./cards.json');
  const allCards = await response.json();
  const shuffledCards = [...allCards].sort(() => 0.5 - Math.random());
  const showcaseCards = shuffledCards.slice(0, 3);

  heroScreen.innerHTML = `
    <h1 class="title">Cyber Nexus</h1>
    <div class="card-showcase-section">
      <div class="card-showcase">
        ${showcaseCards.map(card => `
          <div class="showcase-card" style="background-image: url('assets/img/cards/${card.image}')"></div>
        `).join('')}
      </div>
    </div>
    <div class="menu hero-menu">
      <div class="hero-difficulty-buttons">
          <button class="btn btn-primary" data-action="start" data-diff="easy">Fácil</button>
          <button class="btn btn-secondary" data-action="start" data-diff="normal">Normal</button>
          <button class="btn btn-secondary" data-action="start" data-diff="hard">Difícil</button>
      </div>
    </div>
  `;

  app.appendChild(heroScreen);

  // Adiciona os listeners aos botões
  heroScreen.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', e => {
      const action = e.target.dataset.action;

      // Aguarda a animação terminar para trocar de tela
      setTimeout(() => {
        if (action === 'start') {
          const difficulty = e.target.dataset.diff;

          // Função para iniciar o cara-ou-coroa, que então iniciará o jogo apropriado.
          const performCoinToss = (gameStartFunction) => {
            app.innerHTML = '';
            const coinToss = new CoinToss(audioController, 'assets/img/avatars/player-avatar.png', 'assets/img/avatars/ai-avatar.png', (winner) => {
              gameStartFunction(difficulty, allCards, winner);
            });
            app.appendChild(coinToss.render());
            coinToss.start();
          };
          
          // **REATORAÇÃO**: Sempre mostra o modal de escolha do tutorial antes do cara-ou-coroa.
          const tutorialModal = new Tutorial(
            () => performCoinToss(startGame),      // Callback para pular (inicia jogo normal)
            () => startTutorial(difficulty, allCards, 'player') // **CORREÇÃO**: Inicia o tutorial diretamente, sem cara-ou-coroa.
          );
          app.appendChild(tutorialModal.render());
        } else {
          // Fallback para o comportamento antigo, se necessário
          const difficulty = e.target.dataset.diff;
          performCoinToss(startGame);
        }
      }, 500); // Duração da animação de fade-out
    });
  });
}

function setupGameUI(game, allCards) {
  const actionLog = new ActionLog();
  const contextualInfo = new ContextualInfo();
  const board = new Board(game, {
    onSelectFieldSlot: game.onSelectFieldSlot,
    onSelectSpellTrapSlot: game.onSelectSpellTrapSlot,
    onActivateFieldCard: game.onActivateFieldCard,
    onAttack: game.onAttack,
    onChangePosition: game.onChangePosition,
    onSelectAttacker: game.onSelectAttacker,
    onTargetSelected: game.onTargetSelected,
  });
  const hud = new HUD({
    callbacks: {
      onEndTurn: () => game.endTurn(),
      onEnterBattlePhase: () => game.enterBattlePhase(),
      onReturnToMenu: game.exitGame, // **CORREÇÃO**: Usa a nova função centralizada.
      onOpenLibrary: () => helpMenu.show(),
      onOpenShop: () => shopScreen.show(allCards),
      onOpenDeckBuilder: () => deckBuilderScreen.show(allCards),
      onReorderHand: game.reorderHand // Conecta a função de reordenar
    },
    tooltip: cardNameTooltip,
    actionLog: actionLog,
    contextualInfo: contextualInfo
  });

  game.ui.board = board;
  game.ui.hud = hud;
  game.ui.actionLog = actionLog;
  game.ui.contextualInfo = contextualInfo;
  game.ui.audioController = audioController;
  game.ui.library = cardLibrary;
  game.ui.tooltip = cardNameTooltip; // Adiciona o tooltip à UI
  game.ui.actionMenu = actionMenu; // **CORREÇÃO**: Conecta o menu de ação ao controller
  game.ui.cardDetailModal = cardDetailModal; // Conecta o modal de detalhes
  game.ui.graveyardModal = graveyardModal; // Conecta o modal do cemitério

  game.ui.onReturnToMenu = showHeroScreen;
}

// Instancia os componentes globais que vivem no body
const cardNameTooltip = new CardNameTooltip();
const cardLibrary = new CardLibrary();
const shopScreen = new ShopScreen(null, null); // Instancia a loja globalmente
const deckBuilderScreen = new DeckBuilderScreen(null, null); // Instancia o Deck Builder globalmente
const helpMenu = new HelpMenu(cardLibrary); // Instancia o novo menu de ajuda
const actionMenu = new ActionMenu(); // **CORREÇÃO**: Instancia o menu de ação globalmente
const cardDetailModal = new CardDetailModal(); // Instancia o modal de detalhes
const graveyardModal = new GraveyardModal(cardNameTooltip); // Instancia o modal do cemitério
const audioController = new AudioController();

// Inicia a aplicação mostrando a hero page
showHeroScreen();

async function startTutorial(difficulty, allCards, startingPlayer) {
  try {
    app.innerHTML = ''; // Limpa a tela

    const background = new Background('board');
    app.appendChild(background.render());

    // Inicia o jogo em modo tutorial com o vencedor da moeda
    const game = new GameController(difficulty, allCards, true, startingPlayer);

    setupGameUI(game, allCards);

    // Inicia o controlador do tutorial
    const tutorialController = new TutorialController(game, { contextualInfo: game.ui.contextualInfo });
    game.ui.tutorialController = tutorialController;
    game.ui.showEndGameScreen = (isVictory, reward, stats) => {
        const result = isVictory ? 'win' : 'lose';
        const screen = new EndGameScreen(result, showHeroScreen, reward, stats);
        app.appendChild(screen.render());
    }

    // **REATORAÇÃO**: Define o que acontece APÓS a conclusão do tutorial.
    // Em vez de voltar ao menu, inicia um duelo normal com a dificuldade escolhida.
    game.ui.onReturnToMenu = () => {
      startGameWithCoinToss(difficulty, allCards);
    };

    app.append(game.ui.board.render(), game.ui.hud.render(game));

    game.start();
    game.updateUI();
    audioController.play('start-duel');

    // **CORREÇÃO**: Inicia o tutorial DEPOIS que o jogo está totalmente na tela.
    setTimeout(() => tutorialController.start(), 100);
  } catch (error) {
    console.error("Falha ao carregar o tutorial:", error);
  }
}

function startGameWithCoinToss(difficulty, allCards) {
  app.innerHTML = ''; // Limpa a tela
  const coinToss = new CoinToss(audioController, 'assets/img/avatars/player-avatar.png', 'assets/img/avatars/ai-avatar.png', (winner) => {
    startGame(difficulty, allCards, winner);
  });
  app.appendChild(coinToss.render());
  coinToss.start();
}



async function startGame(difficulty, allCards, startingPlayer) {
  try {
    app.innerHTML = ''; // Limpa a tela

    const background = new Background('board');
    app.appendChild(background.render());

    // Instancia o controlador do jogo com o vencedor da moeda
    const game = new GameController(difficulty, allCards, false, startingPlayer);

    setupGameUI(game, allCards);

    game.ui.showEndGameScreen = (isVictory, reward, stats) => {
      const result = isVictory ? 'win' : 'lose';
      const screen = new EndGameScreen(result, showHeroScreen, reward, stats);
      app.appendChild(screen.render());
    };

    app.append(game.ui.board.render(), game.ui.hud.render(game));

    game.start();
    game.updateUI(); // Renderiza o estado inicial do jogo (mão do jogador)
    audioController.play('start-duel');

    // Se a IA começa, inicia o turno dela
    if (game.currentPlayer === game.ai) {
      setTimeout(() => {
        game.logAction({ type: 'system', message: `--- Início do turno de ${game.ai.name} (Turno 1) ---` });
        game.ai.makeMove(game.player, game);
        game.updateUI();
        setTimeout(() => game.endTurn(), 2000);
      }, 1000);
    }
  } catch (error) {
    console.error("Falha ao carregar os dados do jogo:", error);
  }
}
