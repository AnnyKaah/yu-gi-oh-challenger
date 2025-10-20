export class Board {
  constructor(game, callbacks) {
    this.game = game;
    this.onSelectFieldSlotCallback = callbacks.onSelectFieldSlot; // Para invocações
    this.onActivateFieldCardCallback = callbacks.onActivateFieldCard; // Manter para ativar cartas baixadas
    this.onSelectSpellTrapSlotCallback = callbacks.onSelectSpellTrapSlot;
    this.onAttackCallback = callbacks.onAttack;
    this.onSelectAttackerCallback = callbacks.onSelectAttacker; // Novo callback
    this.onTargetSelectedCallback = callbacks.onTargetSelected;
    this.onChangePositionCallback = callbacks.onChangePosition; // Adiciona o callback para o menu de ações
    this.selectedAttacker = null; // Armazena o slot do monstro atacante selecionado

    // --- LÓGICA DE DRAG AND DROP PARA ATAQUE ---
    this.isDragging = false;
    this.draggedCardInfo = null;
    this.targetingLine = null; // Elemento SVG para a linha de mira
    this.boundDragHandler = this.handleDrag.bind(this);
  }

  render() {
    const el = document.createElement('div');
    el.classList.add('board');

    const createPlayerZone = (playerId, isOpponent) => {
      const prefix = isOpponent ? 'op' : 'p';
      return `
        <div class="player-zone" id="${playerId}-zone">
          <div class="card-slot extra-zone deck-zone" id="${prefix}-deck" data-player="${playerId}"></div>          
          <div class="main-zones">
            <div class="monster-field-zone">
              ${Array(5).fill(0).map((_, i) => `<div class="card-slot monster-zone" id="${prefix}-monster-${i}" data-player="${playerId}" data-slot-index="${i}"></div>`).join('')}
            </div>
            <div class="spell-trap-field-zone">
              ${Array(5).fill(0).map((_, i) => `<div class="card-slot spell-trap-zone" id="${prefix}-spell-${i}" data-player="${playerId}" data-slot-index="${i}"></div>`).join('')}
            </div>
          </div>
          <div class="card-slot extra-zone graveyard-zone" id="${prefix}-graveyard" data-player="${playerId}"></div>
        </div>
      `;
    };

    el.innerHTML = `
      <div class="board-surface">
        <div class="field-section">
          <div class="field-label">CAMPO DO OPONENTE</div>
          ${createPlayerZone('Oponente', true)}
        </div>
        <div class="center-line"></div>
        <div class="field-section">
          ${createPlayerZone('Você', false)}
          <div class="field-label">SEU CAMPO</div>
        </div>
      </div>
      <div class="phase-transition-text"></div>
    `;

    // Adiciona listeners de clique para invocação
    // Adiciona listeners de clique para baixar/ativar magias/armadilhas
    el.querySelectorAll('.spell-trap-zone[data-player="Você"]').forEach(slot => {
      slot.addEventListener('click', (e) => {
        if (e.currentTarget.childElementCount === 0) {
          this.onSelectSpellTrapSlotCallback(parseInt(e.currentTarget.dataset.slotIndex, 10));
        } else {
          this.onActivateFieldCardCallback(parseInt(e.currentTarget.dataset.slotIndex, 10), e);
        }
      });
    });

    // Adiciona listeners de clique para os cemitérios
    el.querySelectorAll('.graveyard-zone').forEach(slot => {
      slot.addEventListener('click', (e) => {
        const ownerId = e.currentTarget.dataset.player;
        const targetPlayer = ownerId === 'Você' ? this.game.player : this.game.ai;
        this.game.ui.hud.showGraveyard(targetPlayer); // **NOVA LÓGICA**
      });
    });

    // --- LÓGICA DE CLIQUE CENTRALIZADA E CORRIGIDA ---
    // Um único listener no tabuleiro que delega as ações com base no alvo do clique.
    el.addEventListener('click', (e) => {
      // Se o clique foi no fundo do tabuleiro, limpa a seleção.
      if (e.target.classList.contains('board-surface') || e.target.classList.contains('field-section')) {
        // **CORREÇÃO**: O método resetSelection está no GameController, que é referenciado como this.game.controller
        // após a primeira chamada de update().
        this.game.controller.resetSelection();
        return;
      }

      const targetSlot = e.target.closest('.card-slot');

      // Se clicou fora de um slot, cancela a seleção
      if (!targetSlot) {
        this.game.controller.resetSelection();
        return;
      }

      // Se o clique foi num slot de monstro do jogador
      if (targetSlot.classList.contains('monster-zone') && targetSlot.dataset.player === 'Você') {
        this.handlePlayerMonsterZoneClick(targetSlot, e); // Passa o evento
        return;
      }

      // Se o clique foi num slot de monstro do oponente
      if (targetSlot.classList.contains('monster-zone') && targetSlot.dataset.player === 'Oponente') {
        this.handleOpponentMonsterZoneClick(targetSlot, e); // Passa o evento
        return;
      }
    });
    
    // Adiciona o SVG da linha de mira ao tabuleiro
    this.targetingLine = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.targetingLine.classList.add('targeting-line', 'hidden');
    this.targetingLine.innerHTML = `<line x1="0" y1="0" x2="0" y2="0" />`;
    el.appendChild(this.targetingLine);

    return el;
  }

  // --- NOVAS FUNÇÕES HELPER PARA ORGANIZAR A LÓGICA DE CLIQUE ---

  handlePlayerMonsterZoneClick(targetSlot, event) {
    const cardOnField = targetSlot.querySelector('.card-on-field');
    const slotIndex = parseInt(targetSlot.dataset.slotIndex, 10);
    // **REATORAÇÃO**: Simplifica a lógica. O GameController agora é responsável por decidir
    // se o clique é para selecionar um alvo ou para abrir o menu de ações.
    if (cardOnField) {
      this.onChangePositionCallback(slotIndex, event);
    }
  }

  handleOpponentMonsterZoneClick(targetSlot, event) {
    // A lógica de ataque agora é tratada pelo Drag and Drop.
    // Clicar em um monstro do oponente não faz mais nada por padrão.
  }

  highlightTributes() {
    document.querySelectorAll('.monster-zone[data-player="Você"] .card-on-field').forEach(card => {
      card.classList.add('tributable');
    });
  }

  markTribute(slotIndex, isMarked) {
    const cardElement = document.querySelector(`.monster-zone[data-player="Você"][data-slot-index="${slotIndex}"] .card-on-field`);
    if (cardElement) {
      cardElement.classList.toggle('tribute-selected', isMarked);
    }
  }

  highlightTargets(targetType = 'all') {
    document.body.classList.add('is-targeting');
    let selector = '.card-on-field'; // Padrão: todos no campo

    if (targetType === 'player_monster') {
      selector = '.monster-zone[data-player="Você"] .card-on-field';
    } else if (targetType === 'opponent_monster') {
      selector = '.monster-zone[data-player="Oponente"] .card-on-field';
    }

    document.querySelectorAll(selector).forEach(card => card.classList.add('targetable'));
  }
  
  clearHighlights() {
    document.body.classList.remove('is-targeting');
    document.querySelectorAll('.targetable').forEach(card => {
      card.classList.remove('targetable');
    });
  }

  highlightAttack(attackerOwner, attackerSlot, targetSlot) {
    const attackerPrefix = attackerOwner === 'Você' ? 'p' : 'op';    
    const attackerCardElement = document.querySelector(`#${attackerPrefix}-monster-${attackerSlot} .card-on-field`);
    if (!attackerCardElement) return;

    if (targetSlot === null) {
      // --- ANIMAÇÃO DE ATAQUE DIRETO ---
      const opponentAvatarElement = document.querySelector('.opponent-lp-container .avatar');
      if (opponentAvatarElement) {
        const startRect = attackerCardElement.getBoundingClientRect();
        const endRect = opponentAvatarElement.getBoundingClientRect();

        // Cria um clone da carta para a animação
        const cardClone = attackerCardElement.cloneNode(true);
        cardClone.classList.add('direct-attack-animation');
        document.body.appendChild(cardClone);

        // Define a posição inicial do clone
        cardClone.style.position = 'fixed';
        cardClone.style.left = `${startRect.left}px`;
        cardClone.style.top = `${startRect.top}px`;
        cardClone.style.width = `${startRect.width}px`;
        cardClone.style.height = `${startRect.height}px`;

        // Calcula a translação necessária
        const deltaX = endRect.left + (endRect.width / 2) - (startRect.left + startRect.width / 2);
        const deltaY = endRect.top + (endRect.height / 2) - (startRect.top + startRect.height / 2);

        // Aplica a animação via CSS (a classe fará o resto)
        cardClone.style.setProperty('--attack-translate-x', `${deltaX}px`);
        cardClone.style.setProperty('--attack-translate-y', `${deltaY}px`);
        cardClone.classList.add('animate');

        // Remove o clone após a animação
        setTimeout(() => cardClone.remove(), 1500);
      }
    } else {
      // Animação de ataque normal (carta vs carta)
      const targetPrefix = attackerOwner === 'Você' ? 'op' : 'p';
      const targetCard = document.querySelector(`#${targetPrefix}-monster-${targetSlot} .card-on-field`);
      if (attackerCardElement) attackerCardElement.classList.add('attacking');
      if (targetCard) targetCard.classList.add('defending');
    }
  }

  animateCardDestruction(cardElement) {
    if (!cardElement) return;

    cardElement.classList.add('card-destroyed');

    // Remove o elemento do DOM após a animação para limpar o slot
    // A duração deve corresponder à duração da animação em CSS (0.8s)
    setTimeout(() => cardElement.remove(), 800);
  }

  highlightZones(cardType) {
    // Limpa todos os destaques primeiro
    const allMonsterZones = document.querySelectorAll('.monster-zone');
    allMonsterZones.forEach(slot => slot.classList.remove('summon-highlight'));

    // Agora, apenas as zonas de magia/armadilha precisam ser destacadas,
    // pois a invocação de monstros é automática.
    if (cardType === 'spell' || cardType === 'trap') {
      document.querySelectorAll('.spell-trap-zone[id^="p-spell-"]').forEach(slot => {
        if (slot.childElementCount === 0) slot.classList.add('summon-highlight');
      });
    }
  }

  showPhaseTransition(phaseName) {
    const textElement = document.querySelector('.phase-transition-text');
    if (textElement) {
      textElement.textContent = phaseName;
      textElement.classList.add('active');
      // Remove a classe após a animação para que possa ser reutilizada
      setTimeout(() => textElement.classList.remove('active'), 2000);
    }
  }

  showFloatingDamage(damagedPlayer, amount) {
    const isPlayer = damagedPlayer.name === 'Você';
    const targetAvatarSelector = isPlayer ? '.player-lp-container .avatar' : '.opponent-lp-container .avatar';
    const targetAvatar = document.querySelector(targetAvatarSelector);

    if (!targetAvatar) return;

    const damageElement = document.createElement('div');
    damageElement.classList.add('floating-damage-number');
    damageElement.textContent = `-${amount}`;

    document.body.appendChild(damageElement);

    const rect = targetAvatar.getBoundingClientRect();
    damageElement.style.left = `${rect.left + rect.width / 2}px`;
    damageElement.style.top = `${rect.top}px`;

    // Remove o elemento após a animação para não poluir o DOM
    setTimeout(() => {
      damageElement.remove();
    }, 2000); // Duração da animação
  }

  animateSummon(handIndex, fieldSlot) {
    const handCard = document.querySelector(`.card-in-hand[data-hand-index="${handIndex}"]`);
    const targetSlot = document.querySelector(`#p-monster-${fieldSlot}`);
    if (!handCard || !targetSlot) return;

    const startRect = handCard.getBoundingClientRect();
    const endRect = targetSlot.getBoundingClientRect();

    const cardClone = handCard.cloneNode(true);
    cardClone.classList.add('summon-animation');
    document.body.appendChild(cardClone);

    cardClone.style.setProperty('--start-x', `${startRect.left}px`);
    cardClone.style.setProperty('--start-y', `${startRect.top}px`);
    cardClone.style.setProperty('--end-x', `${endRect.left}px`);
    cardClone.style.setProperty('--end-y', `${endRect.top}px`);

    // Esconde a carta original da mão imediatamente
    handCard.style.opacity = '0';

    setTimeout(() => {
      cardClone.remove();
    }, 1000); // Duração da animação
  }

  update(player, ai, gameController) {
    this.game = { player, ai, controller: gameController }; // Armazena a referência dos jogadores e do controller
    const placeCardOnSlot = (card, slotElement, owner, slotIndex, isFaceDown = false) => {
      slotElement.innerHTML = '';
      if (card) {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card-on-field');
        if (card.position === 'defense') cardElement.classList.add('defense-position');

        cardElement.dataset.player = owner; // Adiciona o dono da carta
        cardElement.dataset.slotIndex = slotIndex;
        cardElement.dataset.cardName = card.name; // **CORREÇÃO**: Adiciona o nome da carta ao elemento.
        cardElement.draggable = false; // Desabilita o drag por padrão

        if (isFaceDown) {
          cardElement.classList.add('card-back');
        } else {
          cardElement.style.backgroundImage = `url('assets/img/cards/${card.image}')`;
        }

        // Adiciona indicadores de estado para monstros
        if (card.type === 'monster') {
          if (owner === 'Você' && card.position === 'attack' && !card.hasAttacked && !isFaceDown && gameController.phase === 'Battle Phase') {
            // **NOVA LÓGICA DRAG & DROP**
            cardElement.draggable = true;
            cardElement.classList.add('can-attack');
          }
          // **NOVA LÓGICA**: Adiciona indicador visual para efeitos temporários
          if (card.tempEffects && card.tempEffects.length > 0) {
            cardElement.classList.add('has-temp-effect');
            // Adiciona um ícone específico se for um bônus de ATK
            if (card.tempEffects.some(e => e.property === 'atk' && e.value > 0)) {
              cardElement.classList.add('atk-boosted');
            }
          }

          if (card.hasAttacked) cardElement.classList.add('has-attacked');
        }
        slotElement.appendChild(cardElement);

        // Adiciona listeners de hover para o tooltip de ATK/DEF
        cardElement.addEventListener('mouseenter', (e) => {
          this.game.controller.ui.tooltip?.show(card, e);
        });
        cardElement.addEventListener('mouseleave', () => this.game.controller.ui.tooltip?.hide());

      }
    };

    const setupDragListeners = (element, owner, slotIndex) => {
      if (owner !== 'Você') return;

      element.addEventListener('dragstart', (e) => this.handleDragStart(e, slotIndex));
      element.addEventListener('dragend', (e) => this.handleDragEnd(e));
    };

    // Renderiza as cartas do jogador
    player.field.monsters.forEach((card, i) => {
      const slot = document.getElementById(`p-monster-${i}`);
      if (slot) placeCardOnSlot(card, slot, 'Você', i, card?.isFaceDown);
    });
    document.querySelectorAll('.monster-zone[data-player="Você"]').forEach((slot, i) => {
      setupDragListeners(slot, 'Você', i);
    });

    // Renderiza as magias/armadilhas do jogador
    player.field.spellTraps.forEach((card, i) => {
      const slot = document.getElementById(`p-spell-${i}`);
      if (slot) {
        slot.innerHTML = ''; // Limpa o slot primeiro
        if (card) {
          // Magias/Armadilhas baixadas sempre mostram o verso.
          const cardElement = document.createElement('div');
          cardElement.className = 'card-on-field card-back';
          slot.appendChild(cardElement);
        }
      }
    });

    // Atualiza os cemitérios
    const updateExtraZone = (playerInstance, prefix) => {
      const graveyardSlot = document.getElementById(`${prefix}-graveyard`);
      const deckSlot = document.getElementById(`${prefix}-deck`);

      if (graveyardSlot) {
        graveyardSlot.innerHTML = `<span class="card-count">${playerInstance.graveyard.length}</span>`;
        if (playerInstance.graveyard.length > 0) {
          graveyardSlot.classList.add('has-cards');
          const topCard = playerInstance.graveyard[playerInstance.graveyard.length - 1];
          graveyardSlot.style.backgroundImage = `url('assets/img/cards/${topCard.image}')`;
        } else {
          graveyardSlot.style.backgroundImage = 'none';
        }
      }

      if (deckSlot) {
        deckSlot.innerHTML = `<span class="card-count">${playerInstance.deck.length}</span>`;
      }
    };

    updateExtraZone(player, 'p');
    updateExtraZone(ai, 'op');
    // Renderiza as cartas do oponente
    ai.field.monsters.forEach((card, i) => {
      const slot = document.getElementById(`op-monster-${i}`);
      if (slot) {        
        // **REATORAÇÃO**: Remove e readiciona os listeners para garantir que sejam únicos.
        // Isso previne múltiplos listeners de 'drop' se updateUI for chamado várias vezes.
        const newSlot = slot.cloneNode(true);
        slot.parentNode.replaceChild(newSlot, slot);

        placeCardOnSlot(card, newSlot, 'Oponente', i, card?.isFaceDown); // **CORREÇÃO**: Adiciona a carta e seus listeners ao NOVO slot.

        // Adiciona os listeners de drop nos alvos
        newSlot.addEventListener('dragover', (e) => this.handleDragOver(e));
        newSlot.addEventListener('drop', (e) => this.handleDrop(e), { once: true }); // **CORREÇÃO**: Garante que o drop só dispare uma vez.
      }
    });

    // Renderiza as magias/armadilhas do oponente
    ai.field.spellTraps.forEach((card, i) => {
      const slot = document.getElementById(`op-spell-${i}`);
      if (slot) {
        slot.innerHTML = ''; // Limpa o slot primeiro
        if (card) {
          // Magias/Armadilhas baixadas sempre mostram o verso.
          const cardElement = document.createElement('div');
          cardElement.className = 'card-on-field card-back';
          slot.appendChild(cardElement);
        }
      }
    });
  }

  // --- NOVOS HANDLERS PARA DRAG & DROP ---

  handleDragStart(e, slotIndex) {
    // A verificação se pode atacar é feita na renderização ao adicionar a classe 'can-attack'
    // e a propriedade draggable=true. Se o drag começou, a carta pode atacar.
    if (!e.target.classList.contains('can-attack')) return;

    this.isDragging = true;
    this.draggedCardInfo = { attackerSlot: slotIndex };
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');

    // Mostra a linha de mira
    const rect = e.target.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const line = this.targetingLine.querySelector('line');
    line.setAttribute('x1', startX);
    line.setAttribute('y1', startY);
    line.setAttribute('x2', startX);
    line.setAttribute('y2',startY);
    this.targetingLine.classList.remove('hidden');

    document.addEventListener('drag', this.boundDragHandler);
  }

  handleDrag(e) {
    if (!this.isDragging) return;
    const line = this.targetingLine.querySelector('line');
    line.setAttribute('x2', e.clientX);
    line.setAttribute('y2', e.clientY);
  }

  handleDragOver(e) {
    e.preventDefault(); // Necessário para permitir o 'drop'
    const targetSlot = e.target.closest('.monster-zone');
    if (this.isDragging && targetSlot && targetSlot.dataset.player === 'Oponente') {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  }

  handleDragEnd(e) {
    this.isDragging = false;
    document.removeEventListener('drag', this.boundDragHandler);
    this.targetingLine.classList.add('hidden');
    e.target.classList.remove('dragging');
    this.draggedCardInfo = null;
  }

  handleDrop(e) {
    e.preventDefault();
    if (!this.isDragging) return;

    const targetSlot = e.target.closest('.monster-zone[data-player="Oponente"]');
    if (targetSlot) {
      const targetIndex = parseInt(targetSlot.dataset.slotIndex, 10);
      this.onAttackCallback(this.draggedCardInfo.attackerSlot, targetIndex);
      // **CORREÇÃO CRÍTICA**: Limpa o estado de arrastar imediatamente após o drop,
      // para prevenir que eventos de drag/drop "fantasmas" ocorram durante a
      // atualização da UI que acontece dentro de onAttackCallback.
      this.handleDragEnd(e);
    }
  }
}
