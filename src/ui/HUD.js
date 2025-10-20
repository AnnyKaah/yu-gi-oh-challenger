export class HUD {
  constructor({ callbacks, tooltip, actionLog, contextualInfo }) {
    this.handContainer = null;
    this.turnInfoElement = null;
    this.buttonContainer = null;
    this.gameController = null; // Armazena a referência do GameController
    this.lifePointsElement = null;
    this.settingsContainer = null;
    this.battlePhaseButton = null;
    this.leftPanelContent = null;

    // Store references to the global tooltip and modal components
    this.tooltip = tooltip;
    this.actionLog = actionLog;
    this.contextualInfo = contextualInfo;
    this.callbacks = callbacks;
    this.callbacks.onReorderHand = this.callbacks.onReorderHand || (() => {}); // Garante que o callback exista

    // --- NOVO: Controle de visualização do painel esquerdo ---
    this.leftPanelView = 'log'; // 'log' ou 'graveyard'
    this.graveyardOwner = null;
  }

  render() {
    const el = document.createElement('div');
    el.classList.add('hud');

    el.innerHTML = `
      <div class="hud-left">
        <div class="life-points"></div>
        <div class="hud-settings-container"></div>
        <div class="left-panel-content action-log-panel"></div>
      </div>
      <button class="hud-panel-toggle left-toggle"><span><</span></button>
      <div class="hand-container"></div>
      <div class="hud-right">
        <div class="turn-info"></div>
        <div class="hud-divider"></div>
        <div class="hud-button-container">
          <button class="btn hud-btn" data-phase-action="battle"><i data-feather="shield"></i> <span>Batalha</span></button>
          <button class="btn hud-btn" data-action="graveyard"><i data-feather="archive"></i> <span>Cemitério</span></button>
          <button class="btn hud-btn" data-action="shop"><i data-feather="shopping-cart"></i> <span>Loja</span></button>
          <button class="btn hud-btn" data-action="deck-builder"><i data-feather="layers"></i> <span>Deck</span></button>
          <button class="btn hud-btn" data-action="library"><i data-feather="help-circle"></i> <span>Ajuda</span></button>
        </div>
      </div>
      <button class="hud-panel-toggle right-toggle"><span>></span></button>
      <div class="exit-duel-container">
        <button class="btn hud-btn return-menu-btn" data-action="exit"><i data-feather="log-out"></i> <span>Sair do Duelo</span></button>
      </div>
    `;
    el.appendChild(this.contextualInfo.render());

    this.handContainer = el.querySelector('.hand-container');
    this.lifePointsElement = el.querySelector('.life-points');
    this.settingsContainer = el.querySelector('.hud-settings-container');
    this.turnInfoElement = el.querySelector('.turn-info');
    this.leftPanelContent = el.querySelector('.left-panel-content');
    this.battlePhaseButton = el.querySelector('[data-phase-action="battle"]');

    // Adiciona os listeners de clique aos botões
    el.querySelector('.left-toggle').addEventListener('click', () => el.querySelector('.hud-left').classList.toggle('collapsed'));
    el.querySelector('.right-toggle').addEventListener('click', () => el.querySelector('.hud-right').classList.toggle('collapsed'));
    el.querySelector('[data-action="exit"]').addEventListener('click', this.callbacks.onReturnToMenu);
    el.querySelector('[data-action="library"]').addEventListener('click', this.callbacks.onOpenLibrary);
    el.querySelector('[data-action="shop"]').addEventListener('click', this.callbacks.onOpenShop);
    el.querySelector('[data-action="deck-builder"]').addEventListener('click', this.callbacks.onOpenDeckBuilder);
    el.querySelector('[data-action="graveyard"]').addEventListener('click', (e) => this.showGraveyardMenu(e));

    this.updateLeftPanel();

    // Ativa os ícones da biblioteca Feather após renderizar os botões
    feather.replace(); // Renderiza os ícones

    return el;
  }

  update(player, gameController) {
    this.gameController = gameController; // Armazena a referência para uso posterior
    this.turnInfoElement.innerHTML = `
      <div class="opponent-info-container">
        <span class="opponent-label">OPONENTE</span>
        <div class="opponent-hand-counter"><i data-feather="copy"></i><span>${gameController.ai.hand.length}</span></div>
      </div>
      <div class="turn-phase-container">
        <div class="turn-counter">TURNO <span>${gameController.turn}</span></div>
        <div class="phase-display">${gameController.phase.toUpperCase()}</div>
      </div>
    `;
    this.lifePointsElement.innerHTML = `
      <div class="lp-container player-lp-container">
        <img src="assets/img/avatars/player-avatar.png" alt="Player Avatar" class="avatar">
        <div class="lp-details">
          <span class="lp-label">VOCÊ</span>
          <div class="lp-bar"><div class="lp-fill player-lp" style="width: ${player.lifePoints / 80}%"></div></div>
          <span class="lp-value">${Math.max(0, player.lifePoints)}</span>
        </div>
      </div>
      <div class="lp-container opponent-lp-container">
        <img src="assets/img/avatars/ai-avatar.png" alt="AI Avatar" class="avatar">
        <div class="lp-details">
          <div class="lp-label-container">
          </div>
          <div class="lp-bar"><div class="lp-fill opponent-lp" style="width: ${gameController.ai.lifePoints / 80}%"></div></div>
          <span class="lp-value">${gameController.ai.lifePoints}</span>
        </div>
      </div>
    `;

    // Lógica do botão de progressão de fase dinâmico
    const phaseButton = this.battlePhaseButton;
    if (gameController.currentPlayer === player) {
      phaseButton.style.display = 'flex';
      if (gameController.phase === 'Main Phase 1') {
        if (gameController.turn === 1 && !gameController.isTutorial) {
          phaseButton.innerHTML = `<i data-feather="rotate-cw"></i> <span>Encerrar Turno</span>`;
          phaseButton.dataset.phaseAction = 'end';
          phaseButton.onclick = this.callbacks.onEndTurn;
        } else {
          phaseButton.innerHTML = `<i data-feather="shield"></i> <span>Ir para Batalha</span>`;
          phaseButton.dataset.phaseAction = 'battle';
          phaseButton.onclick = this.callbacks.onEnterBattlePhase;
        }
      } else if (gameController.phase === 'Battle Phase') {
        phaseButton.innerHTML = `<i data-feather="chevrons-right"></i> <span>Ir para Main 2</span>`;
        phaseButton.dataset.phaseAction = 'main2';
        phaseButton.onclick = this.callbacks.onEnterBattlePhase; // Reutiliza para avançar
      } else if (gameController.phase === 'Main Phase 2') {
        phaseButton.innerHTML = `<i data-feather="rotate-cw"></i> <span>Encerrar Turno</span>`;
        phaseButton.dataset.phaseAction = 'end';
        phaseButton.onclick = this.callbacks.onEndTurn;
      } else {
        phaseButton.innerHTML = `<i data-feather="rotate-cw"></i> <span>Encerrar Turno</span>`;
        phaseButton.dataset.phaseAction = 'end';
        phaseButton.onclick = this.callbacks.onEndTurn;
      }
    } else {
      phaseButton.style.display = 'none';
    }

    // Renderiza o checkbox de dicas apenas no modo Fácil
    this.settingsContainer.innerHTML = ''; // Limpa antes de renderizar
    if (gameController.difficulty === 'easy') {
      const hintsEnabled = localStorage.getItem('cyberNexusHintsEnabled') !== 'false'; // Default é true
      const hintsLabel = document.createElement('label');
      hintsLabel.classList.add('hints-label');
      hintsLabel.innerHTML = `
        <input type="checkbox" id="hints-toggle">
        <span>Ativar Dicas</span>
      `;
      const hintsToggle = hintsLabel.querySelector('#hints-toggle');
      hintsToggle.checked = hintsEnabled;

      hintsToggle.addEventListener('change', (e) => {
        localStorage.setItem('cyberNexusHintsEnabled', e.target.checked);
        gameController.updateUI(); // Re-renderiza a UI para mostrar/esconder a dica
      });
      this.settingsContainer.appendChild(hintsLabel);
    }

    feather.replace(); // Re-renderiza os ícones

    this.handContainer.innerHTML = ''; // Limpa a mão antes de redesenhar
    const handSize = player.hand.length;
    const maxRotation = 15; // Ângulo máximo do leque em graus
    const anglePerCard = handSize > 1 ? maxRotation * 2 / (handSize - 1) : 0;

    let draggedIndex = null;

    player.hand.forEach((card, index) => {
      const cardWrapper = document.createElement('div');
      cardWrapper.classList.add('card-in-hand');
      cardWrapper.dataset.handIndex = index;

      // Calcula e aplica a rotação para o efeito de leque
      const rotation = (index - (handSize - 1) / 2) * anglePerCard;
      cardWrapper.style.transform = `rotate(${rotation}deg)`;
      cardWrapper.style.transformOrigin = 'bottom center';

      // Renderização simplificada com imagem de fundo
      cardWrapper.style.backgroundImage = `url('assets/img/cards/${card.image}')`;

      // Adiciona as informações de ATK/DEF para monstros
      if (card.type === 'monster') {
        const statsElement = document.createElement('div');
        statsElement.classList.add('card-in-hand-stats');
        statsElement.innerHTML = `<span>${card.atk}</span> / <span>${card.def}</span>`;
        cardWrapper.appendChild(statsElement);
      }

      // Adiciona o indicador de custo de tributo
      if (card.type === 'monster' && card.level >= 5) {
        const requiredTributes = card.level >= 7 ? 2 : 1;
        const tributeElement = document.createElement('div');
        tributeElement.classList.add('card-tribute-cost');
        tributeElement.textContent = `T${requiredTributes}`;
        cardWrapper.appendChild(tributeElement);
      }

      // --- LÓGICA DE EFEITO DE BRILHO (FOIL) ---
      if (card.rarity === 'rare' || card.rarity === 'ultra-rare') {
        cardWrapper.classList.add('foil');
        // Adiciona um delay aleatório para a animação não ser sincronizada
        cardWrapper.style.setProperty('--animation-delay', `${Math.random() * 5}s`);
      }

      if (gameController.currentPlayer === player) {
        // Um único listener de clique que abre o menu de contexto.
        cardWrapper.addEventListener('click', (e) => gameController.onSelectCardFromHand(index, e));

        // --- LÓGICA DE ARRASTAR E SOLTAR ---
        cardWrapper.draggable = true;

        cardWrapper.addEventListener('dragstart', (e) => {
          draggedIndex = index;
          e.dataTransfer.effectAllowed = 'move';
          // Adiciona um efeito visual para a carta sendo arrastada
          setTimeout(() => e.target.classList.add('dragging'), 0);
        });

        cardWrapper.addEventListener('dragend', (e) => {
          e.target.classList.remove('dragging');
        });

        cardWrapper.addEventListener('dragover', (e) => {
          e.preventDefault(); // Necessário para permitir o 'drop'
        });

        cardWrapper.addEventListener('drop', (e) => {
          e.preventDefault();
          const droppedOnIndex = index;
          if (draggedIndex !== null && draggedIndex !== droppedOnIndex) {
            this.callbacks.onReorderHand(draggedIndex, droppedOnIndex);
          }
        });
      }

      cardWrapper.addEventListener('mouseenter', (e) => this.tooltip?.show(card, e));
      cardWrapper.addEventListener('mouseleave', () => this.tooltip?.hide());

      // Adiciona um indicador visual se a carta não pode ser jogada (ex: já invocou)
      if (card.type === 'monster' && gameController.player.hasNormalSummoned && !gameController.isTutorial && gameController.tributeState === null && index !== gameController.selectedHandCardIndex) {
        cardWrapper.classList.add('unplayable');
      }

      if (index === gameController.selectedHandCardIndex) {
        cardWrapper.classList.add('selected');
      }
      this.handContainer.appendChild(cardWrapper);
    });
  }

  showGraveyard(player, gameController) {
    this.leftPanelView = 'graveyard';
    this.graveyardOwner = player; // Armazena de quem é o cemitério
    this.updateLeftPanel(gameController);
  }

  showLog() {
    this.leftPanelView = 'log';
    this.updateLeftPanel();
  }

  updateLeftPanel(gameController) {
    this.leftPanelContent.innerHTML = ''; // Limpa o conteúdo

    if (this.leftPanelView === 'graveyard' && this.graveyardOwner) {
      const graveyardTitle = document.createElement('h3');
      graveyardTitle.className = 'left-panel-title';
      graveyardTitle.textContent = `Cemitério de ${this.graveyardOwner.name}`;

      const backButton = document.createElement('button');
      backButton.className = 'btn btn-secondary btn-small';
      backButton.textContent = 'Voltar ao Log';
      backButton.style.marginBottom = '1rem';
      backButton.addEventListener('click', () => this.showLog());

      // **REATORAÇÃO**: Usa um grid de imagens em vez de uma lista de texto.
      const cardGrid = document.createElement('div');
      cardGrid.className = 'graveyard-card-grid'; // Reutiliza o estilo do modal

      if (this.graveyardOwner.graveyard.length === 0) {
        cardGrid.innerHTML = '<p class="empty-message" style="text-align: center; width: 100%;">Cemitério vazio.</p>';
      } else {
        [...this.graveyardOwner.graveyard].reverse().forEach(card => {
          const isTargeting = gameController?.targetingState?.targetType === 'graveyard_monster';
          const isMonster = card.type === 'monster';

          const cardItem = document.createElement('div');
          cardItem.className = 'graveyard-card-item'; // Reutiliza o estilo do modal
          cardItem.style.backgroundImage = `url('assets/img/cards/${card.image}')`;
          cardItem.addEventListener('mouseenter', (e) => this.tooltip.show(card, e));
          cardItem.addEventListener('mouseleave', () => this.tooltip.hide());

          if (isTargeting && isMonster) {
            cardItem.classList.add('targetable');
            // A lógica de clique para seleção de alvo pode ser adicionada aqui se necessário
          }
          cardGrid.appendChild(cardItem);
        });
      }

      this.leftPanelContent.append(graveyardTitle, backButton, cardGrid);

    } else { // 'log'
      this.leftPanelContent.appendChild(this.actionLog.render());
      this.leftPanelContent.appendChild(this.contextualInfo.render());
      // **CORREÇÃO**: Rola o painel de conteúdo, não o objeto ActionLog.
      this.leftPanelContent.scrollTop = this.leftPanelContent.scrollHeight;
    }
  }

  showGraveyardMenu(event) {
    if (!this.gameController) return;

    const options = [
      {
        label: 'Seu Cemitério',
        callback: () => this.showGraveyard(this.gameController.player, this.gameController)
      },
      {
        label: 'Cemitério do Oponente',
        callback: () => this.showGraveyard(this.gameController.ai, this.gameController)
      }
    ];

    this.gameController.ui.actionMenu.show(options, event);
  }

   animateDrawCard(drawnCard) {
    const deckElement = document.getElementById('p-deck');
    const handContainer = this.handElement;

    if (!deckElement || !handContainer) return;

    const startRect = deckElement.getBoundingClientRect();
    const endRect = handContainer.getBoundingClientRect();

    const cardClone = document.createElement('div');
    cardClone.classList.add('draw-card-animation');
    document.body.appendChild(cardClone);

    // Define a posição inicial e final via variáveis CSS
    cardClone.style.setProperty('--start-x', `${startRect.left}px`);
    cardClone.style.setProperty('--start-y', `${startRect.top}px`);
    // O destino é o centro da área da mão
    cardClone.style.setProperty('--end-x', `${endRect.left + endRect.width / 2 - 40}px`);
    cardClone.style.setProperty('--end-y', `${endRect.top + endRect.height / 2 - 58}px`);

    // Durante a animação, mostra a face da carta
    setTimeout(() => {
      cardClone.style.backgroundImage = `url('assets/img/cards/${drawnCard.image}')`;
      cardClone.style.transform = 'rotateY(180deg)'; // Garante que a face da carta seja visível
    }, 600); // Metade da duração da animação

    // Remove o clone após a animação
    setTimeout(() => cardClone.remove(), 1200);
  }
}
