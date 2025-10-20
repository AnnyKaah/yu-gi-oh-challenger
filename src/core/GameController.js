import { Player } from './Player.js';
import { AIController } from './AIController.js';
import { EffectEngine } from '../EffectEngine.js';

export class GameController {
  constructor(difficulty, allCards, isTutorial = false, startingPlayer = 'player') {
    this.ui = {}; // Para armazenar referências aos componentes de UI
    this.difficulty = difficulty;
    this.allCards = allCards;
    this.isTutorial = isTutorial;
    this.player = new Player('Você', allCards);
    this.ai = new AIController('Oponente', difficulty, allCards);
    this.player.isTutorial = isTutorial; // Informa ao Player que está no modo tutorial
    this.ai.isTutorial = isTutorial;
    this.turn = 1;
    this.currentPlayer = startingPlayer === 'player' ? this.player : this.ai;
    this.phase = 'Main Phase 1';
    this.selectedHandCardIndex = null; // Rastreia a carta selecionada na mão
    this.onSummon = this.onSummon.bind(this); // Garante o 'this' correto
    this.effectEngine = new EffectEngine(this); // **NOVO**: Instancia o motor de efeitos.
    this.onAttack = this.onAttack.bind(this);
    this.onChangePosition = this.onChangePosition.bind(this);
    this.onSelectCardFromHand = this.onSelectCardFromHand.bind(this);
    this.onSelectFieldSlot = this.onSelectFieldSlot.bind(this);
    this.onSelectSpellTrapSlot = this.onSelectSpellTrapSlot.bind(this);
    this.onSelectAttacker = this.onSelectAttacker.bind(this);
    this.onActivateFieldCard = this.onActivateFieldCard.bind(this);
    this.isResolvingAttack = false; // **NOVO**: Trava para impedir ataques múltiplos.
    this.exitGame = this.exitGame.bind(this);
    this.gameEnded = false; // **NOVO**: Trava para impedir múltiplos fins de jogo.
    this.reorderHand = this.reorderHand.bind(this); // Novo método para reordenar a mão
  }

  start() {
    console.log(`Iniciando duelo em dificuldade: ${this.difficulty}`);

    // Cada jogador constrói seu deck
    if (this.isTutorial) {
      this.player.buildDeck(['Colosso de Batalha', 'Net Runner Enigmático', 'Core Guardian', 'Lagarto Corrompido por Glitch', 'Botão de Pânico']); // Adiciona um monstro extra para o tributo
      this.ai.buildDeck(['Lagarto Corrompido por Glitch']); // Oponente tem um monstro fraco
    } else {
      this.player.buildDeck(); // O jogador usa o deck salvo ou o inicial padrão

      // A IA usa um deck diferente com base na dificuldade
      if (this.difficulty === 'easy') {
        const easyDeck = [
          'Lagarto Corrompido por Glitch', 'Lagarto Corrompido por Glitch', 'Lagarto Corrompido por Glitch',
          'Net Runner Enigmático', 'Net Runner Enigmático',
          'Core Guardian', 'Core Guardian',
          'Sobrecarga de Plasma', 'Sobrecarga de Plasma'
        ];
        this.ai.buildDeck(easyDeck);
      } else {
        this.ai.buildDeck(); // IA usa o deck inicial padrão nos modos Normal e Difícil
      }
    }

    // Cada jogador compra a mão inicial
    if (this.isTutorial) {
      this.player.drawInitialHand(); // Jogador compra 5 cartas
      // No tutorial, a IA não compra uma mão, ela já começa com uma carta no campo, que é adicionada abaixo.
      const cardIndex = this.ai.deck.findIndex(c => c.name === 'Lagarto Corrompido por Glitch');
      if (cardIndex !== -1) {
        const [cardToPlace] = this.ai.deck.splice(cardIndex, 1); // Remove a carta do deck
        this.ai.field.monsters[2] = { ...cardToPlace, position: 'attack', hasAttacked: false, canChangePosition: false, isFaceDown: false };
        this.logAction({ type: 'summon', message: `Oponente começa com <strong>${cardToPlace.name}</strong> no campo.` });
      }
    } else {
      this.player.drawInitialHand();
      this.ai.drawInitialHand();
    }
    this.logAction({ type: 'turn_start', message: `<strong>${this.currentPlayer.name}</strong> começa o duelo!` });

    console.log('Mão do Jogador:', this.player.hand);
    console.log('Mão do Oponente:', this.ai.hand);
  }

  // Método chamado para executar a invocação
  onSummon(handIndex, fieldSlot, tributes = []) {
    // Impede o jogador de jogar fora do seu turno
    if (this.currentPlayer !== this.player) return;
    
    const success = this.player.summonMonster(handIndex, fieldSlot, tributes);
    if (success) {
      const summonedCard = this.player.field.monsters[fieldSlot];
      this.logAction({ type: 'summon', message: `Você invocou <strong>${summonedCard.name}</strong>` });

      // **CORREÇÃO**: Verifica e ativa o efeito da carta recém-invocada (ex: Core Guardian, Cavaleiro Imponente)
      this.effectEngine.checkForAndResolveEffect(summonedCard, 'onSummon', this.player);

      // **CORREÇÃO CRÍTICA**: A ordem das operações é crucial para evitar condições de corrida.
      // 1. Resetamos a seleção, o que fecha o menu de ação e chama updateUI().
      //    Isso renderiza a carta no campo imediatamente, resolvendo o bug do "segundo clique".
      this.resetSelection();

      // **SOLUÇÃO DEFINITIVA**: Usa requestAnimationFrame para sincronizar com a renderização do navegador.
      // Isso garante que a UI esteja visualmente atualizada antes de notificar o tutorial.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.ui.tutorialController?.onActionCompleted('summon');
        });
      });
    }
  }

  onSelectCardFromHand(index, event) {
    if (this.currentPlayer !== this.player || this.phase.startsWith('Battle')) return;

    const card = this.player.hand[index];
    if (!card) return;

    const options = [];
    const canNormalSummon = !this.player.hasNormalSummoned || this.isTutorial;

    options.push({
      label: 'Inspecionar',
      callback: () => this.ui.cardDetailModal.show(card)
    });

    if (card.type === 'monster') {
      options.push({
        label: 'Invocar em Ataque',
        disabled: !canNormalSummon,
        callback: () => { // **LÓGICA DE INVOCAR AUTOMÁTICA**
          const emptySlotIndex = this.player.field.monsters.findIndex(slot => slot === null);
          if (emptySlotIndex === -1) {
            this.logAction({ type: 'system', message: 'Não há espaço no campo para invocar.' });
            return;
          }

          const cardToSummon = this.player.hand[index];
          const requiredTributes = cardToSummon.level >= 7 ? 2 : (cardToSummon.level >= 5 ? 1 : 0);
          const availableMonsters = this.player.field.monsters.filter(m => m !== null).length;

          if (requiredTributes > 0) {
            if (availableMonsters < requiredTributes) {
              this.logAction({ type: 'system', message: `Tributos insuficientes para <strong>${cardToSummon.name}</strong>` });
              return;
            }
            // **LÓGICA DE TRIBUTO AUTOMÁTICO**
            // Seleciona os monstros mais fracos do jogador como tributo.
            const availableMonstersOnField = this.player.field.monsters
              .map((monster, i) => ({ monster, index: i }))
              .filter(item => item.monster);
            
            const sortedByWeakest = availableMonstersOnField.sort((a, b) => a.monster.atk - b.monster.atk);
            const tributesToUse = sortedByWeakest.slice(0, requiredTributes).map(item => item.index);

            this.logAction({ type: 'system', message: `Tributando automaticamente os monstros mais fracos...` });
            
            // **CORREÇÃO**: A notificação 'tribute_start' deve ser feita ANTES da invocação.
            this.ui.tutorialController?.onActionCompleted('tribute_start');

            this.onSummon(index, emptySlotIndex, tributesToUse);
            
            // **CORREÇÃO**: A notificação 'tribute_start' foi movida para dentro de onSummon
            // para ser chamada apenas quando um tributo realmente ocorrer.
            // A notificação 'summon' já é tratada dentro de onSummon.
          } else {
            // Invocação normal sem tributo
            this.onSummon(index, emptySlotIndex); // onSummon já notifica o tutorial ('summon')
          }
        }
      });
      options.push({
        label: 'Baixar em Defesa',
        disabled: !canNormalSummon,
        callback: () => { // **LÓGICA DE BAIXAR AUTOMÁTICA**
          const emptySlotIndex = this.player.field.monsters.findIndex(slot => slot === null);
          if (emptySlotIndex === -1) {
            this.logAction({ type: 'system', message: 'Não há espaço no campo para baixar a carta.' });
            return;
          }

          const success = this.player.setMonster(index, emptySlotIndex);
          if (success) {
            this.logAction({ type: 'system', message: 'Você baixou um monstro.' });            
            this.resetSelection();

            // **CORREÇÃO DE SINCRONIZAÇÃO**: Aplica o mesmo padrão de `requestAnimationFrame`
            // para garantir que a UI seja renderizada antes de avançar o tutorial.
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                this.ui.tutorialController?.onActionCompleted('set_monster');
              });
            });
          }
        }
      });
    } else if (card.type === 'spell') {
      options.push({
        label: 'Ativar Magia',
        callback: () => {
          this.effectEngine.activateSpellTrap(index, true);
        }
      });
    } else if (card.type === 'trap') {
      options.push({
        label: 'Baixar Armadilha',
        callback: () => {
          // **LÓGICA DE BAIXAR ARMADILHA AUTOMÁTICA**
          const emptySlotIndex = this.player.field.spellTraps.findIndex(slot => slot === null);
          if (emptySlotIndex === -1) {
            this.logAction({ type: 'system', message: 'Não há espaço para baixar esta carta.' });
            return;
          }
          // Chama onSelectSpellTrapSlot diretamente, simulando o clique no slot vazio.
          this.selectedHandCardIndex = index; // Define a carta a ser baixada
          this.onSelectSpellTrapSlot(emptySlotIndex);
        }
      });
    }

    this.ui.actionMenu.show(options, event);

    // Atualiza a UI para mostrar a carta como 'selecionada' enquanto o menu está aberto
    this.selectedHandCardIndex = index;
    this.ui.hud.update(this.player, this); // Re-renderiza a mão com a carta selecionada

    // **CORREÇÃO DO TUTORIAL**: Notifica o tutorial que o menu foi aberto a partir de uma carta na mão.
    // Usa requestAnimationFrame para garantir que o menu seja renderizado antes do próximo passo do tutorial.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.ui.tutorialController?.onActionCompleted('open_menu');
      });
    });

  }

  onSelectFieldSlot(slotIndex) {
    // **REATORAÇÃO**: A lógica de seleção de alvo agora é tratada pelo EffectEngine.
    if (this.effectEngine.targetingState) {
      this.effectEngine.handleTargetSelection(slotIndex);
    } 
  }

  onSelectSpellTrapSlot(slotIndex) {
    if (this.selectedHandCardIndex !== null) {
      const success = this.player.setSpellTrap(this.selectedHandCardIndex, slotIndex);
      if (success) {
        this.logAction({ type: 'system', message: `Você baixou uma carta` });        
        this.showTemporaryGameMessage('Carta Baixada!');
      }
    } 
  }
  
  onActivateFieldCard(slotIndex) {
    const card = this.player.field.spellTraps[slotIndex];
    // Por enquanto, só permite ativar no próprio turno. A lógica de resposta virá depois.
    if (card && card.isFaceDown && this.currentPlayer === this.player) {
      this.effectEngine.activateSpellTrap(null, false, slotIndex);
    }
  }

  showTemporaryGameMessage(message, duration = 1500) {
    if (this.ui.contextualInfo && !this.isTutorial) { // Não mostra mensagens temporárias durante o tutorial
      this.ui.contextualInfo.element.innerHTML = `<p>${message}</p>`;
      setTimeout(() => {
        this.updateUI(); // Restaura a mensagem contextual padrão
      }, duration);
    }
  }

  activateGraveyardEffect(card) {
    if (!card || !card.effect.includes('onGraveyardEffect')) return;

    const owner = this.player; // Por enquanto, só o jogador pode ativar do cemitério
    const cardInGYIndex = owner.graveyard.findIndex(c => c.name === card.name);
    if (cardInGYIndex === -1) return;

    owner.graveyard.splice(cardInGYIndex, 1); // Remove a carta do cemitério (como custo)
    this.effectEngine.resolveEffect(card, owner, this.ai);
  }

  resetSelection() {
    this.selectedHandCardIndex = null;
    this.effectEngine.targetingState = null;
    this.ui.board.highlightZones(null);
    this.ui.actionMenu.hide();
    this.updateUI(); // Garante que a UI seja atualizada após o reset.
  }

  enterBattlePhase() {
    // Regra: Não pode entrar na Fase de Batalha no primeiro turno do jogo.
    if (this.turn === 1 && !this.isTutorial) {
      this.logAction({ type: 'system', message: "Você não pode atacar no primeiro turno" });
      return;
    }

    if (this.phase === 'Main Phase 1') {
      this.phase = 'Battle Phase';
      this.ui.board.showPhaseTransition('FASE DE BATALHA');
      console.log('--- Fase de Batalha ---');
      
      this.ui.tutorialController?.onActionCompleted('enter_battle');

      // **REATORAÇÃO**: Se for a vez da IA, executa a fase de batalha dela.
      if (this.currentPlayer === this.ai) {
        this.ai.executeBattlePhase(this.player, this).then(() => {
          // Após a fase de batalha da IA, avança para a Main Phase 2.
          this.phase = 'Main Phase 2';
          this.updateUI();
        });
      }

      this.updateUI();
    } else if (this.phase === 'Battle Phase' && this.currentPlayer === this.player) {
      // Apenas o jogador pode avançar manualmente para a Main Phase 2.
      this.phase = 'Main Phase 2';
      this.ui.board.showPhaseTransition('FASE PRINCIPAL 2');
      this.updateUI();
    } else if (this.phase === 'Main Phase 2' && this.currentPlayer === this.player) {
      // O botão agora encerra o turno.
      this.updateUI();
    }
  }

  // **REATORAÇÃO**: A função agora é assíncrona e tem uma trava.
  async onAttack(attackerSlot, targetSlot) {
    if (this.phase !== 'Battle Phase' || this.currentPlayer !== this.player || this.isResolvingAttack) {
      return;
    }

    const attacker = this.player.field.monsters[attackerSlot];
    const opponent = this.ai;

    // **CORREÇÃO**: Adiciona verificação de `cannotAttack` e `hasAttacked`.
    if (!attacker || attacker.hasAttacked || attacker.cannotAttack) {
      console.log("Este monstro não pode atacar.");
      return;
    }

    this.isResolvingAttack = true; // Ativa a trava.

    // **CORREÇÃO CRÍTICA**: Marca o monstro como tendo atacado IMEDIATAMENTE.
    attacker.hasAttacked = true;
    // Atualiza a UI para que o monstro perca o brilho de "pode atacar" e não seja mais arrastável.
    this.updateUI(false); // Atualiza a UI sem verificar o fim do jogo ainda.

    // Adiciona o destaque visual e a pausa para o ataque
    this.ui.board.highlightAttack('Você', attackerSlot, targetSlot);

    // Usa uma Promise para esperar a animação, em vez de setTimeout.
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verifica se o jogo não terminou durante a pausa (ex: por um efeito).
    if (!this.gameEnded) {
      const triggerType = targetSlot === null ? 'direct_attack_declaration' : 'attack_declaration';
      if (this.effectEngine.checkForTrapResponse(triggerType)) {
        this.updateUI();
      } else {
        this._resolveBattle(attacker, attackerSlot, this.player, opponent, targetSlot);
        this.updateUI();
      }
    }

    // Notifica o tutorial que o ataque foi concluído.
    this.ui.tutorialController?.onActionCompleted('attack');

    this.isResolvingAttack = false; // Desativa a trava após a resolução.
  }

  onSelectAttacker(attackerSlot) {
    // Esta função não é mais necessária com a nova lógica de ataque,
    // mas a mantemos para não quebrar outras partes do código que possam chamá-la.
    // O avanço do tutorial agora acontece no callback do menu de ataque.
  }

  // **REATORAÇÃO**: A função agora é assíncrona e retorna uma Promise.
  aiAttack(attackerSlot, targetSlot) {
    return new Promise(resolve => {
      const attacker = this.ai.field.monsters[attackerSlot];
      const opponent = this.player;
      const attackerOwner = this.ai;
   
      if (!attacker || attacker.hasAttacked) {
        resolve(); // Resolve a promise imediatamente se o ataque for inválido.
        return;
      }
   
      const targetName = targetSlot !== null ? `<strong>${opponent.field.monsters[targetSlot].name}</strong>` : 'diretamente';
      this.logAction({ type: 'attack', message: `${attackerOwner.name} ataca ${targetName} com <strong>${attacker.name}</strong>` });
   
      this.ui.board.highlightAttack('Oponente', attackerSlot, targetSlot);
   
      setTimeout(() => {
        const triggerType = targetSlot === null ? 'direct_attack_declaration' : 'attack_declaration';
        if (!this.effectEngine.checkForTrapResponse(triggerType)) {
          this._resolveBattle(attacker, attackerSlot, attackerOwner, opponent, targetSlot);
        }
        this.updateUI();
        resolve(); // Resolve a promise APÓS a batalha e a atualização da UI.
      }, 1500);
    });
  }

  onChangePosition(fieldSlot, event) {
    // **REATORAÇÃO**: A verificação de seleção de alvo agora tem prioridade máxima.
    // Se o jogo está esperando um alvo, resolve o efeito e para a execução aqui.
    if (this.effectEngine.targetingState) {
      this.effectEngine.handleTargetSelection(fieldSlot);
      return; // Impede que o menu de ações seja aberto.
    }

    const monster = this.player.field.monsters[fieldSlot];
    // **CORREÇÃO**: Impede a abertura do menu de ações durante a Fase de Batalha.
    // O clique na Fase de Batalha é gerenciado pelo Board.js para seleção de ataque.
    if (!monster || this.currentPlayer !== this.player || this.phase === 'Battle Phase') {
      // Se estiver na Fase de Batalha, o clique é para atacar, não para abrir menu.
      if (this.effectEngine.targetingState) {
        this.logAction({ type: 'system', message: 'Não é possível selecionar alvos durante a Fase de Batalha.' });
      }
      return;
    }

    const options = [];

    options.push({
      label: 'Inspecionar',
      callback: () => this.ui.cardDetailModal.show(monster)
    });

    options.push({
      label: `Mudar para Posição de ${monster.position === 'attack' ? 'Defesa' : 'Ataque'}`,
      disabled: !monster.canChangePosition,
      callback: () => {
        const success = this.player.changeMonsterPosition(fieldSlot);
        if (success) {
          this.logAction({ type: 'system', message: `<strong>${monster.name}</strong> agora está em Posição de ${monster.position}` });
          this.ui.tutorialController?.onActionCompleted('change_position');
          this.updateUI();
        }
      }
    });

    this.ui.actionMenu.show(options, event);

    // **CORREÇÃO DO TUTORIAL**: Notifica o tutorial que o menu foi aberto a partir de uma carta no campo.
    this.ui.tutorialController?.onActionCompleted('open_menu');
  }

  _resolveBattle(attacker, attackerSlot, attackerOwner, defender, defenderSlot) {
    const target = defenderSlot !== null ? defender.field.monsters[defenderSlot] : null;
    this.ui.audioController.play('attack');

    // Lógica especial para o ataque final do tutorial.
    if (this.isTutorial && attacker.name === 'Colosso de Batalha' && target?.name === 'Lagarto Corrompido por Glitch') {
      // **REATORAÇÃO**: Apenas registra a ação e notifica o tutorial.
      // O tutorial controlará o que acontece a seguir, sem acionar a tela de vitória padrão.
      this.logAction({ type: 'destruction', message: `<strong>${target.name}</strong> foi destruído` });
      this.logAction({ type: 'damage', message: `Oponente sofre <strong>${attacker.atk}</strong> de dano` });
      
      // Remove o monstro do campo visualmente
      this._destroyCard(target, defender, defenderSlot, { attacker: attacker });
      return; // Impede a execução da lógica de batalha normal.
    }

    if (target) {
      // Ataque a um monstro
      if (target.position === 'attack') {
        if (attacker.atk > target.atk) {
          const damage = attacker.atk - target.atk;          
          this._applyDamage(defender, damage);
          this._destroyCard(target, defender, defenderSlot, { attacker: attacker });
        } else if (attacker.atk < target.atk) {
          const damage = target.atk - attacker.atk;
          this._applyDamage(attackerOwner, damage);
          this._destroyCard(attacker, attackerOwner, attackerSlot, { trigger: 'onThisCardDestroyed' });
        } else { // ATK igual
          // **REATORAÇÃO DA LÓGICA DE DESTRUIÇÃO MÚTUA**
          this.logAction({ type: 'destruction', message: `<strong>${attacker.name}</strong> e <strong>${target.name}</strong> foram destruídos` });

          // 1. Anima a destruição de ambas as cartas primeiro.
          this.ui.board.animateCardDestruction(document.querySelector(`#${attackerOwner.name === 'Você' ? 'p' : 'op'}-monster-${attackerSlot} .card-on-field`));
          this.ui.board.animateCardDestruction(document.querySelector(`#${defender.name === 'Você' ? 'p' : 'op'}-monster-${defenderSlot} .card-on-field`));

          // 2. Resolve os efeitos enquanto ambas as cartas ainda são consideradas no campo.
          this.effectEngine.checkForAndResolveEffect(attacker, 'onThisCardDestroyed', attackerOwner, { attacker: target });
          this.effectEngine.checkForAndResolveEffect(target, 'onSentToGY', defender, { attacker: attacker });

          // 3. Move ambas as cartas para o cemitério APÓS os efeitos serem resolvidos.
          attackerOwner.graveyard.push(attacker);
          attackerOwner.field.monsters[attackerSlot] = null;
          defender.graveyard.push(target);
          defender.field.monsters[defenderSlot] = null;
        }
      } else { // Alvo em Posição de Defesa
        if (attacker.atk > target.def) {
          this._destroyCard(target, defender, defenderSlot, { attacker: attacker, destructionMessage: `<strong>${attacker.name}</strong> destrói <strong>${target.name}</strong> em defesa` });

          // **NOVO: Lógica de Dano Perfurante**
          if (attacker.effect.includes('applyPiercing')) {
            const piercingDamage = attacker.atk - target.def;
            if (piercingDamage > 0) {
              this._applyDamage(defender, piercingDamage, 'Dano perfurante!');
            }
          }
        } else if (attacker.atk < target.def) {
          const damage = target.def - attacker.atk;
          this._applyDamage(attackerOwner, damage, 'Defesa não superada.');
        }
        // Se attacker.atk == target.def, nada acontece.
      }
      this.checkEndGame();
      return; // **CORREÇÃO CRÍTICA**: Garante que a função termine após uma batalha de monstros.
    } else {
      // Ataque direto
      this._applyDamage(defender, attacker.atk, 'Ataque direto!');
    }

    this.checkEndGame(); // Verifica o fim do jogo para o caso de ataque direto.
  }

  // **NOVO MÉTODO AUXILIAR**: Centraliza a aplicação de dano.
  _applyDamage(player, amount, customMessagePrefix = '') {
    if (amount <= 0) return;
    const lpBefore = player.lifePoints;
    player.takeDamage(amount);
    const message = `${customMessagePrefix} ${player.name} sofre <strong>${amount}</strong> de dano`;
    this.logAction({ type: 'damage', message: message.trim(), lp_before: lpBefore, lp_after: player.lifePoints });
    this.triggerDamageEffects(player, amount);
  }

  // **NOVO MÉTODO AUXILIAR**: Centraliza a lógica de destruição de cartas.
  _destroyCard(card, owner, slot, options = {}) {
    const { 
      trigger = 'onSentToGY', 
      attacker = null,
      destructionMessage = `<strong>${card.name}</strong> foi destruído`
    } = options;

    if (!card) return;

    this.logAction({ type: 'destruction', message: destructionMessage });

    // Animação
    const prefix = owner.name === 'Você' ? 'p' : 'op';
    const cardElement = document.querySelector(`#${prefix}-monster-${slot} .card-on-field`);
    this.ui.board.animateCardDestruction(cardElement);

    // Resolve efeitos e move para o cemitério
    this.effectEngine.checkForAndResolveEffect(card, trigger, owner, { attacker });
    owner.graveyard.push(card);
    owner.field.monsters[slot] = null;
  }

  triggerDamageEffects(damagedPlayer, amount) {
    this.ui.audioController?.play('damage');

    // Mostra o número de dano flutuante
    this.ui.board.showFloatingDamage(damagedPlayer, amount); 
    
    // Ativa o tremor de ecrã
    document.body.classList.add('screen-shake');
    setTimeout(() => document.body.classList.remove('screen-shake'), 500);

    // Ativa o efeito de dano no avatar
    const avatarSelector = damagedPlayer.name === 'Você' ? '.player-lp-container .avatar' : '.opponent-lp-container .avatar';
    const avatarElement = document.querySelector(avatarSelector);
    avatarElement?.classList.add('avatar-damage');
    setTimeout(() => avatarElement?.classList.remove('avatar-damage'), 600);
  }

  checkEndGame() {
    // **CORREÇÃO**: Se o jogo já terminou, não faz mais nada.
    if (this.gameEnded) return true;

    const createMatchStats = () => {
      // Encontra a carta "MVP" do jogador (monstro com maior ATK original que ele usou)
      const allPlayerMonsters = [...this.player.field.monsters, ...this.player.graveyard] 
        .filter(c => c && c.type === 'monster');
      const mvpCard = allPlayerMonsters.sort((a, b) => (b.atk - (b.tempEffects?.find(e=>e.property==='atk')?.value || 0)) - (a.atk - (a.tempEffects?.find(e=>e.property==='atk')?.value || 0)))[0] || null;

      return {
        turns: this.turn,
        playerFinalLP: this.player.lifePoints,
        aiFinalLP: this.ai.lifePoints,
        mvpCard: mvpCard,
      };
    };

    if (this.player.hasLost()) {
      this.gameEnded = true; // Ativa a trava
      this.logAction({ type: 'system', message: 'Você perdeu' });
      this.ui.showEndGameScreen(false, 0, createMatchStats());
      return true;
    }
    if (this.ai.hasLost()) {
      this.logAction({ type: 'system', message: 'Você venceu' });
      this.gameEnded = true; // Ativa a trava
      const reward = this.handleVictory();
      this.ui.showEndGameScreen(true, reward, createMatchStats());
      return true;
    }
    return false;
  }

  handleVictory() {
    if (this.isTutorial) return 0; // Não dá recompensa no tutorial
    const currentCredits = parseInt(localStorage.getItem('cyberNexusCredits') || '0', 10);
    const reward = 100; // Recompensa padrão por vitória
    localStorage.setItem('cyberNexusCredits', currentCredits + reward);
    this.logAction({ type: 'system', message: `Você ganhou <strong>${reward}</strong> Créditos de Dados` });
    return reward;
  }

  onTargetSelected(targetOwner, targetSlot, targetType) {
    if (!this.effectToResolve) return;

    const { type, continueAttack } = this.effectToResolve;

    if (type === 'destroy' && targetType === 'monster') {
      const targetPlayer = targetOwner === 'Você' ? this.player : this.ai;
      const cardToDestroy = targetPlayer.field.monsters[targetSlot];

      if (cardToDestroy) {
        this.logAction({ type: 'destruction', message: `Efeito resolvido: <strong>${cardToDestroy.name}</strong> foi destruído` });
        targetPlayer.graveyard.push(cardToDestroy);
        
        const prefix = targetOwner === 'Você' ? 'p' : 'op';
        const cardElement = document.querySelector(`#${prefix}-monster-${targetSlot} .card-on-field`);
        this.ui.board.animateCardDestruction(cardElement);
        targetPlayer.field.monsters[targetSlot] = null;
      }
    }

    // Limpa o estado do efeito e continua o jogo
    this.effectToResolve = null;
    this.ui.board.clearHighlights();
    this.updateUI();

    // Continua a ação original (o ataque)
    if (continueAttack) continueAttack();
  }

  endTurn() {
    this.ui.board.showPhaseTransition('FIM DO TURNO');
    this.logAction({ type: 'turn_end', message: `Fim do turno de <strong>${this.currentPlayer.name}</strong>` });
    console.log(`--- Fim do turno de ${this.currentPlayer.name} ---`);

    // Reseta o estado dos monstros para o próximo turno
    this.effectEngine.processEndOfTurnEffects(this.currentPlayer);
    // **CORREÇÃO**: Reseta explicitamente o estado de ataque de todos os monstros do jogador atual.
    this.currentPlayer.field.monsters.forEach(monster => {
      if (monster) {
        monster.hasAttacked = false;
        monster.cannotAttack = false; // Reseta também os efeitos que impedem o ataque
        monster.canChangePosition = true; // Permite mudar de posição no próximo turno
      }
    });

    this.currentPlayer.hasNormalSummoned = false; // Reseta a Invocação-Normal para o próximo jogador

    this.currentPlayer = (this.currentPlayer === this.player) ? this.ai : this.player;
    this.turn++;    
    this.ui.tutorialController?.onActionCompleted('end_turn');
    this.phase = 'Main Phase 1';

    console.log(`--- Início do turno de ${this.currentPlayer.name} (Turno ${this.turn}) ---`);
    // O primeiro jogador não compra no primeiro turno
    if (this.turn > 1) {
      // Anima a compra da carta se for o jogador
      if (this.currentPlayer === this.player && this.player.deck.length > 0) {
        const cardToDraw = this.player.deck[this.player.deck.length - 1];
        this.ui.hud.animateDrawCard(cardToDraw);
      }
      this.currentPlayer.drawCard();
      this.logAction({ type: 'draw', message: `${this.currentPlayer.name} comprou uma carta` });
    }
    this.updateUI();

    if (this.currentPlayer === this.ai) {
      // Se for a vez da IA, espera um pouco e depois executa a sua jogada.
      setTimeout(async () => { // **REATORAÇÃO**: A função agora é async
        this.logAction({ type: 'turn_start', message: `Início do turno de <strong>${this.ai.name}</strong>` });
        await this.ai.makeMove(this.player, this); // **REATORAÇÃO**: Espera a IA terminar
        this.updateUI();
        this.endTurn(); // **REATORAÇÃO**: Encerra o turno imediatamente após a jogada da IA.
      }, 1000); // Pausa para simular o pensamento da IA.
    }
  }

  reorderHand(draggedIndex, droppedOnIndex) {
    if (this.currentPlayer !== this.player) return;

    // Remove o item arrastado e o insere na nova posição
    const [draggedItem] = this.player.hand.splice(draggedIndex, 1);
    this.player.hand.splice(droppedOnIndex, 0, draggedItem);

    // Reseta a seleção para evitar bugs e atualiza a UI
    this.resetSelection();
    this.updateUI();
  }

  // Centraliza a atualização da interface e verifica o fim do jogo
  updateUI(checkEnd = true) {
    this.ui.hud.update(this.player, this);
    this.ui.board.update(this.player, this.ai, this);
    this.ui.contextualInfo?.update(this);
    // Após cada atualização, verifica se o jogo terminou, a menos que seja desabilitado
    if (checkEnd && this.checkEndGame()) {
      // Se o jogo terminou, não faz mais nada.
    }
  }

  exitGame() {
    // Centraliza a lógica de saída.
    // Se o tutorial estiver ativo, ele precisa ser finalizado primeiro para limpar seus elementos.
    if (this.isTutorial && this.ui.tutorialController) {
      this.ui.tutorialController.end();
    } else {
      this.ui.onReturnToMenu(); // Se não for tutorial, apenas volta ao menu.
    }
  }

  logAction(data) {
    console.log(data.message); // Keep console log for debugging
    if (this.ui.actionLog) {
      // Adiciona o número do turno atual aos dados do log
      const logData = { ...data, turn: this.turn };
      this.ui.actionLog.add(logData);
    }
  }
}
