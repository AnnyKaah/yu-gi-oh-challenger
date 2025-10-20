export class EffectEngine {
  constructor(gameController) {
    this.game = gameController;
    this.targetingState = null;
  }

  // O Novo Motor de Efeitos
  resolveEffect(card, owner, opponent, extraParams = {}) {
    this.game.logAction({ type: 'effect', message: `${owner.name} ativa <strong>${card.name}</strong>` });

    const effectHandlers = {
      'search': ((tag) => this.effect_searchByTag(owner, tag)).bind(this),
      'weakenAll': (() => this.effect_weakenAll(opponent, 500)).bind(this),
      'negateAndEndPhase': (() => this.effect_negateAndEndPhase(owner)).bind(this),
      'applyPiercing': (() => { /* Lógica já está em _resolveBattle */ }).bind(this),
      'draw': (() => { owner.drawCard(); owner.drawCard(); }).bind(this),
      'revive': (() => this.effect_revive(owner)).bind(this),
      'acessarArquivos': (() => this.effect_acessarArquivos(owner)).bind(this),
      'boost': (() => this.effect_boost(owner, 1000)).bind(this),
      'halveAtk': (() => this.effect_halveAtk(opponent)).bind(this),
      'stealControl': (() => this.effect_stealControl(owner, opponent)).bind(this),
      'resetHands': (() => this.effect_resetHands()).bind(this),
      'recoverMonsterFromGY': (() => this.effect_recoverMonsterFromGY(owner)).bind(this),
      'preventAttack': (() => this.effect_preventAttack(opponent)).bind(this),
      'checkTribute': (() => this.effect_checkTribute(card, owner)).bind(this),
      'negateAndDestroy': (() => this.effect_negateAndDestroy()).bind(this),
      'massDestroySpellsTraps': (() => this.effect_massDestroySpellsTraps()).bind(this),
      'weakenAttacker': ((params) => this.effect_weakenAttacker(params.attacker, 800)).bind(this),
    };

    const handlerMatch = card.effect.match(/->\s*(\w+)/);
    if (handlerMatch) {
      const handlerKey = handlerMatch[1];
      if (effectHandlers[handlerKey]) {
        const paramMatch = card.effect.match(/\((\w+)\)/) || card.effect.match(/\('(\w+)'\)/);
        const param = paramMatch ? paramMatch[1] : undefined;

        const effectParams = { param, ...extraParams };
        // **CORREÇÃO CRÍTICA**: Desestrutura os parâmetros para passá-los corretamente
        // para as funções de handler, que esperam argumentos individuais em vez de um objeto.
        const { param: p, attacker } = effectParams;
        effectHandlers[handlerKey](p || attacker);
      } else {
        console.warn(`Handler não implementado: ${handlerKey}`);
      }
    }
  }

  checkForAndResolveEffect(card, trigger, owner, extraParams = {}) {
    if (card?.effect?.includes(`(Handler: ${trigger}`)) {
      console.log(`[EffectEngine] Trigger '${trigger}' detectado para a carta '${card.name}'. Resolvendo efeito...`);
      const opponent = (owner === this.game.player) ? this.game.ai : this.game.player;
      this.resolveEffect(card, owner, opponent, extraParams);
    }
  }

  activateSpellTrap(cardIndex, isFromHand = true, fieldSlot = null) {
    const card = isFromHand ? this.game.player.hand[cardIndex] : this.game.player.field.spellTraps[fieldSlot];
    if (!card || this.targetingState) return;

    this.game.selectedHandCardIndex = isFromHand ? cardIndex : null;

    if (card.name === 'Protocolo Overclock') {
      this.game.logAction({ type: 'system', message: `Ativando <strong>${card.name}</strong>. Escolha um monstro seu como alvo.` });
      this.targetingState = {
        card: card,
        isFromHand: isFromHand,
        originalIndex: cardIndex,
        onTarget: (targetSlot) => {
          const targetMonster = this.game.player.field.monsters[targetSlot];
          if (targetMonster) {
            this.game.logAction({ type: 'effect', message: `<strong>${card.name}</strong> fortalece <strong>${targetMonster.name}</strong>!` });
            this.effect_boost(this.game.player, 1000, targetSlot);
          }
        }
      };
      this.game.ui.board.highlightTargets('player_monster');
      return;
    }

    this.game.logAction({ type: 'effect', message: `Você ativou <strong>${card.name}</strong>` });
    this.game.ui.audioController.play('click');

    if (isFromHand) {
      this.game.player.graveyard.push(card);
      this.game.player.hand.splice(cardIndex, 1);
    } else {
      card.isFaceDown = false;
      this.game.player.graveyard.push(card);
      this.game.player.field.spellTraps[fieldSlot] = null;
    }

    this.resolveEffect(card, this.game.player, this.game.ai);
    this.game.updateUI();
  }

  handleTargetSelection(slotIndex) {
    if (!this.targetingState) return;

    const targetMonster = this.game.player.field.monsters[slotIndex];
    if (targetMonster) {
      const { card, isFromHand, originalIndex, onTarget } = this.targetingState;

      if (isFromHand) {
        this.game.player.graveyard.push(card);
        this.game.player.hand.splice(originalIndex, 1);
      }

      onTarget(slotIndex);
      this.game.resetSelection();
      this.game.updateUI();
    } else {
      this.game.logAction({ type: 'system', message: 'Alvo inválido. A ação foi cancelada.' });
      this.game.resetSelection();
    }
  }

  checkForTrapResponse(trigger) {
    const opponent = (this.game.currentPlayer === this.game.player) ? this.game.ai : this.game.player;
    const trapIndex = opponent.field.spellTraps.findIndex(card => {
        if (!card || !card.isFaceDown || card.type !== 'trap') return false;
        if (trigger === 'direct_attack_declaration' && card.name === 'Botão de Pânico') return true;
        if (trigger === 'special_summon' && card.name === 'Vórtice de Desintegração') return true;
        if (trigger === 'spell_target' && card.name === 'Firewall de Emergência') return true;
        if (trigger === 'summon' && card.name === 'Rede de Contenção de Dados') return true;
        return false;
    });

    if (trapIndex !== -1) {
      const trapCard = opponent.field.spellTraps[trapIndex];
      this.game.logAction({ type: 'effect', message: `${opponent.name} revela <strong>${trapCard.name}</strong>`});
      
      opponent.graveyard.push(trapCard);
      this.resolveEffect(trapCard, opponent, this.game.currentPlayer);
      opponent.field.spellTraps[trapIndex] = null; 
      return true;
    }
    return false;
  }

  processEndOfTurnEffects(player) {
    player.field.monsters.forEach(monster => {
      if (monster?.tempEffects?.length > 0) {
        monster.tempEffects = monster.tempEffects.filter(effect => {
          if (effect.duration === 'end_of_turn') {
            if (effect.property === 'atk') {
              monster.atk -= effect.value;
            }
            this.game.logAction({ type: 'system', message: `O bônus de ATK em <strong>${monster.name}</strong> terminou.` });
            return false;
          }
          return true;
        });
      }
    });
  }

  // --- MÉTODOS DE EFEITO (MOVIMOS DO GAMECONTROLLER) ---

  effect_searchByTag(owner, tag) {
    const cardIndex = owner.deck.findIndex(c => c.tags?.includes(tag));
    if (cardIndex !== -1) {
      const foundCard = owner.deck.splice(cardIndex, 1)[0];
      owner.hand.push(foundCard);
      this.game.logAction({ type: 'effect', message: `${owner.name} adicionou <strong>${foundCard.name}</strong> à mão` });
    } else {
      this.game.logAction({ type: 'system', message: `Nenhuma carta '${tag}' encontrada no deck de ${owner.name}.` });
    }
  }

  effect_acessarArquivos(owner) {
    const tag = 'nucleo';
    const cardIndex = owner.deck.findIndex(c => c.tags?.includes(tag));
    if (cardIndex !== -1) {
      const foundCard = owner.deck.splice(cardIndex, 1)[0];
      owner.hand.push(foundCard);
      this.game.logAction({ type: 'effect', message: `${owner.name} adicionou <strong>${foundCard.name}</strong> à mão` });
    } else {
      this.game.logAction({ type: 'system', message: `Nenhuma carta '${tag}' encontrada. ${owner.name} compra 1 carta.` });
      owner.drawCard();
      this.game.logAction({ type: 'draw', message: `${owner.name} comprou uma carta como fallback.` });
    }
  }

  effect_massDestroySpellsTraps() {
    [this.game.player, this.game.ai].forEach(p => {
      const prefix = (p === this.game.player) ? 'p' : 'op';
      p.field.spellTraps.forEach((card, index) => {
        if (card) {
          const cardElement = document.querySelector(`#${prefix}-spell-${index} .card-on-field`);
          this.game.ui.board.animateCardDestruction(cardElement);
          p.graveyard.push(card);
          p.field.spellTraps[index] = null;
          this.game.logAction({ type: 'destruction', message: `<strong>${card.name}</strong> foi destruído` });
        }
      });
    });
  }

  effect_negateAndEndPhase() {
    this.game.phase = 'Main Phase 2';
    this.game.logAction({ type: 'system', message: `O ataque foi negado e a Fase de Batalha terminou.` });
    this.game.updateUI();
  }

  effect_revive(owner) {
    const targets = owner.graveyard.filter(c => c.type === 'monster' && c.level <= 4).sort((a, b) => b.atk - a.atk);
    if (targets.length > 0) {
      const cardToRevive = targets[0];
      const emptySlot = owner.field.monsters.findIndex(s => s === null);
      if (emptySlot !== -1) {
        owner.graveyard.splice(owner.graveyard.indexOf(cardToRevive), 1);
        owner.field.monsters[emptySlot] = { ...cardToRevive, position: 'defense' };
        this.game.logAction({ type: 'effect', message: `${owner.name} reviveu <strong>${cardToRevive.name}</strong> em Posição de Defesa` });
      }
    }
  }

  effect_halveAtk(opponent) {
    const strongestOpponentMonster = opponent.field.monsters
      .map((monster, index) => ({ monster, index }))
      .filter(item => item.monster)
      .sort((a, b) => b.monster.atk - a.monster.atk)[0];

    if (strongestOpponentMonster) {
      strongestOpponentMonster.monster.atk = Math.floor(strongestOpponentMonster.monster.atk / 2);
      this.game.logAction({ type: 'effect', message: `O ATK de <strong>${strongestOpponentMonster.monster.name}</strong> foi reduzido pela metade!` });
    }
  }

  effect_stealControl(owner, opponent) {
    const strongestOpponentMonster = opponent.field.monsters
      .map((monster, index) => ({ monster, index }))
      .filter(item => item.monster)
      .sort((a, b) => b.monster.atk - a.monster.atk)[0];

    const emptyOwnerSlot = owner.field.monsters.findIndex(s => s === null);

    if (strongestOpponentMonster && emptyOwnerSlot !== -1) {
      const stolenMonster = opponent.field.monsters[strongestOpponentMonster.index];
      opponent.field.monsters[strongestOpponentMonster.index] = null;
      owner.field.monsters[emptyOwnerSlot] = stolenMonster;
      this.game.logAction({ type: 'effect', message: `${owner.name} tomou controle de <strong>${stolenMonster.name}</strong>!` });
    }
  }

  effect_resetHands() {
    [this.game.player, this.game.ai].forEach(p => {
      p.graveyard.push(...p.hand);
      p.hand = [];
      for (let i = 0; i < 4; i++) p.drawCard();
    });
    this.game.logAction({ type: 'effect', message: `Ambos os jogadores descartaram suas mãos e compraram 4 novas cartas.` });
  }

  effect_recoverMonsterFromGY(owner) {
    const strongestInGY = owner.graveyard.filter(c => c.type === 'monster').sort((a, b) => b.atk - a.atk)[0];
    if (strongestInGY) {
      const cardIndex = owner.graveyard.findIndex(c => c.name === strongestInGY.name);
      if (cardIndex !== -1) {
        const recoveredCard = owner.graveyard.splice(cardIndex, 1)[0];
        owner.hand.push(recoveredCard);
        this.game.logAction({ type: 'effect', message: `${owner.name} recuperou <strong>${recoveredCard.name}</strong> do cemitério.` });
      }
    }
  }

  effect_preventAttack(opponent) {
    const lastSummoned = opponent.field.monsters.filter(m => m).pop();
    if (lastSummoned) {
      lastSummoned.cannotAttack = true;
      this.game.logAction({ type: 'effect', message: `<strong>${lastSummoned.name}</strong> não pode atacar no próximo turno.` });
    }
  }

  effect_checkTribute(card, owner) {
    if (card.level >= 5) card.atk += 300;
  }

  effect_negateAndDestroy() {
    this.game.logAction({ type: 'system', message: 'Efeito de negação ativado!' });
  }

  effect_weakenAttacker(attacker, amount) {
    if (attacker) {
      attacker.atk -= amount;
      this.game.logAction({ type: 'effect', message: `O ATK de <strong>${attacker.name}</strong> foi reduzido em ${amount}!` });
    }
  }

  effect_boost(owner, amount, targetSlot) {
    const targetMonster = owner.field.monsters[targetSlot];
    if (targetMonster) {
      targetMonster.atk += amount;
      if (!targetMonster.tempEffects) {
        targetMonster.tempEffects = [];
      }
      targetMonster.tempEffects.push({
        property: 'atk',
        value: amount,
        duration: 'end_of_turn'
      });
    }
  }
}