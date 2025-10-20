import { Player } from './Player.js';

export class AIController extends Player {
  constructor(name, difficulty, allCards) {
    super(name, allCards);
    this.difficulty = difficulty;
  }

  // **REATORAÇÃO**: O método agora é assíncrono.
  async makeMove(opponent, gameController) {
    console.log(`${this.name} está pensando...`);
    let actionTaken = false;

    // --- LÓGICA DE ATIVAÇÃO DE ARMADILHAS E MAGIAS ---
    // A IA verifica se tem alguma carta poderosa para ativar
    const setPulso = this.field.spellTraps.findIndex(c => c?.name === 'Pulso Eletromagnético Global');
    if (setPulso !== -1) {
      const opponentSpellTrapCount = opponent.field.spellTraps.filter(c => c !== null).length;
      const aiSpellTrapCount = this.field.spellTraps.filter(c => c !== null).length;

      // Estratégia: Ativar se o oponente tiver mais magias/armadilhas
      if (opponentSpellTrapCount > aiSpellTrapCount) {
        gameController.logAction({ type: 'effect', message: `${this.name} ativa <strong>Pulso Eletromagnético Global</strong>` });
        const card = this.field.spellTraps[setPulso];
        card.isFaceDown = false; // Vira para cima
        
        this.graveyard.push(card);
        this.field.spellTraps[setPulso] = null;

        gameController.resolveEffect(card, this, opponent);
        actionTaken = true;
        gameController.updateUI();
        // A IA encerra sua fase principal após uma jogada tão impactante
        return actionTaken;
      }
    }

    // --- LÓGICA DE ATIVAÇÃO DE MAGIAS (REFINADA) ---
    // Nos modos Normal e Difícil, a IA é mais esperta com suas magias.
    if (this.difficulty !== 'easy') {
      // **NOVA LÓGICA DE IA PARA MAGIAS**
      const spellsInHand = this.hand.map((card, index) => ({ card, index })).filter(item => item.card.type === 'spell');
      for (const spellInfo of spellsInHand) {
        const { card, index } = spellInfo;
        let spellUsed = false;

        switch (card.name) {
          case 'Acessar Arquivos':
          case 'Recuperação de Dados':
            // Usa magias de busca/recuperação se a mão não estiver cheia
            if (this.hand.length < 7) {
              gameController.logAction({ type: 'effect', message: `${this.name} ativou <strong>${card.name}</strong>` });
              this.graveyard.push(this.hand.splice(index, 1)[0]);
              gameController.resolveEffect(card, this, opponent);
              spellUsed = true;
            }
            break;

          case 'Protocolo Overclock':
          case 'Sobrecarga de Plasma':
            // Lógica para usar magias de boost de forma inteligente
            const boostAmount = card.name === 'Protocolo Overclock' ? 1000 : 700;
            const bestBoostTarget = this.findBestBoostTarget(opponent, boostAmount);
            if (bestBoostTarget !== null) { // **CORREÇÃO**: bestBoostTarget pode ser 0, que é um índice válido.
              gameController.logAction({ type: 'effect', message: `${this.name} ativa <strong>${card.name}</strong> em <strong>${this.field.monsters[bestBoostTarget].name}</strong>` });
              this.graveyard.push(this.hand.splice(index, 1)[0]);
              // **CORREÇÃO**: A função de efeito está no EffectEngine, não no GameController.
              gameController.effectEngine.effect_boost(this, boostAmount, bestBoostTarget);
              spellUsed = true;
            }
            break;

          case 'Onda de Controle Neural':
            // Rouba o monstro mais forte do oponente se tiver espaço
            const strongestOpponentMonster = opponent.field.monsters.filter(m => m).sort((a, b) => b.atk - a.atk)[0];
            const emptyAISlot = this.field.monsters.findIndex(s => s === null);
            if (strongestOpponentMonster && emptyAISlot !== -1) {
              gameController.logAction({ type: 'effect', message: `${this.name} ativa <strong>${card.name}</strong>!` });
              this.graveyard.push(this.hand.splice(index, 1)[0]);
              gameController.resolveEffect(card, this, opponent);
              spellUsed = true;
            }
            break;

          case 'Distorção de Realidade':
            // Usa para enfraquecer um monstro forte do oponente e permitir um ataque vantajoso
            const bestWeakenTarget = this.findBestWeakenTarget(opponent);
            if (bestWeakenTarget && bestWeakenTarget.atk > 1000) { // Evita usar em alvos já fracos
              gameController.logAction({ type: 'effect', message: `${this.name} ativa <strong>${card.name}</strong>!` });
              this.graveyard.push(this.hand.splice(index, 1)[0]);
              gameController.resolveEffect(card, this, opponent); // O efeito já mira no mais forte
              spellUsed = true;
            }
            break;

          case 'Enxame de Reparo Nanobots':
            // Revive um monstro se tiver espaço e um alvo válido no cemitério
            const gyTargets = this.graveyard.filter(c => c.type === 'monster' && c.level <= 4);
            const emptySlotForRevive = this.field.monsters.findIndex(s => s === null);
            if (gyTargets.length > 0 && emptySlotForRevive !== -1) {
              gameController.logAction({ type: 'effect', message: `${this.name} ativa <strong>${card.name}</strong>!` });
              this.graveyard.push(this.hand.splice(index, 1)[0]);
              gameController.resolveEffect(card, this, opponent);
              spellUsed = true;
            }
            break;
        }

        if (spellUsed) {
          actionTaken = true;
          gameController.updateUI();
          // Após usar uma magia, a IA pode reavaliar a situação, então podemos sair do loop por agora.
          // Para uma IA mais complexa, poderíamos continuar o loop.
          break;
        }
      }
    }

    // --- LÓGICA DE ATIVAÇÃO DE EFEITOS DE MONSTROS ---
    // A IA verifica se pode usar o efeito de um monstro no campo.
    if (this.difficulty === 'hard') {
      this.field.monsters.forEach((monster, index) => {
        if (!monster) return;

        // Estratégia: Usar Core Guardian para buscar uma carta se a mão não estiver cheia
        if (monster.name === 'Core Guardian' && this.hand.length < 7) {
          // A IA ainda não tem como saber se já usou o efeito, mas para simplificar, vamos assumir que não.
          gameController.checkForAndResolveEffect(monster, 'onSummon', this, { from: 'ai' });
          actionTaken = true;
          gameController.updateUI();
        }
      });
      if (actionTaken) return this.makeMove(opponent, gameController); // Reavalia jogadas
    }

    // 1. Fase Principal: Invocar um monstro (se ainda não o fez)
    if (!this.hasNormalSummoned) {
      const monstersInHand = this.hand
        .map((card, index) => ({ card, index }))
        .filter(item => item.card.type === 'monster');

      if (monstersInHand.length > 0) {
        // Ordena por ATK para encontrar o mais forte que a IA pode invocar
        monstersInHand.sort((a, b) => b.card.atk - a.card.atk);

        // Tenta invocar o monstro mais forte possível com os recursos atuais
        for (const monsterToSummonInfo of monstersInHand) {
          const card = monsterToSummonInfo.card;
          const requiredTributes = card.level >= 7 ? 2 : (card.level >= 5 ? 1 : 0);
          const availableMonstersOnField = this.field.monsters.map((m, i) => ({ monster: m, index: i })).filter(item => item.monster);

          if (availableMonstersOnField.length >= requiredTributes) {
            // A IA tem monstros suficientes para o tributo
            const emptyFieldIndex = this.field.monsters.findIndex(slot => slot === null);
            if (emptyFieldIndex === -1) continue; // Não há espaço no campo

            // Seleciona os monstros mais fracos como tributo
            let tributesToUse = [];
            if (this.difficulty === 'easy') {
              // No fácil, a IA é menos inteligente e pode tributar qualquer monstro.
              tributesToUse = availableMonstersOnField.slice(0, requiredTributes).map(item => item.index);
            } else {
              // No Normal/Difícil, a IA é mais esperta e tributa seus monstros mais fracos.
              const sortedByWeakest = [...availableMonstersOnField].sort((a, b) => a.monster.atk - b.monster.atk);
              tributesToUse = sortedByWeakest.slice(0, requiredTributes).map(item => item.index);
            }

            // Estratégia de Posição: Decidir entre invocar em ataque ou baixar em defesa.
            let setInDefense = false;
            if (this.difficulty !== 'easy') {
              // Normal/Hard: Se o monstro tem defesa maior que o ataque, ou se o ataque é baixo, baixa em defesa.
              if (card.def > card.atk + 500 || card.atk < 1200) {
                setInDefense = true;
              }
            }

            const originalHandIndex = this.hand.indexOf(card);
            if (setInDefense) {
              actionTaken = this.setMonster(originalHandIndex, emptyFieldIndex);
              if (actionTaken) gameController.logAction({ type: 'system', message: `${this.name} baixou um monstro.` });
            } else {
              if (requiredTributes > 0) {
                gameController.logAction({ type: 'summon', message: `${this.name} tributa ${requiredTributes} e invoca <strong>${card.name}</strong>` });
              } else {
                gameController.logAction({ type: 'summon', message: `${this.name} invoca <strong>${card.name}</strong>` });
              }
              actionTaken = this.summonMonster(originalHandIndex, emptyFieldIndex, tributesToUse);
            }
            if (actionTaken) break; // Sai do loop pois já invocou/baixou neste turno
          }
        }
      }
    }

    // 3. Fase Principal: Baixar uma carta de armadilha
    // A IA pode baixar uma carta de magia/armadilha mesmo que já tenha invocado um monstro.
    if (this.field.spellTraps.filter(c => c !== null).length < 5) { // Verifica se há espaço
      const trapCardInHand = this.hand.find(card => card.type === 'trap');
      if (trapCardInHand) {
        const emptySpellTrapSlot = this.field.spellTraps.findIndex(slot => slot === null);
        if (emptySpellTrapSlot !== -1) {
          const originalHandIndex = this.hand.indexOf(trapCardInHand);
          this.setSpellTrap(originalHandIndex, emptySpellTrapSlot);
          gameController.logAction({ type: 'system', message: `${this.name} baixou uma carta` });
        }
      }
    }

    // 2. Fase de Batalha: Atacar com todos os monstros possíveis
    let attackMade = false;
    // Regra: Não pode atacar no primeiro turno do jogo.
    if (gameController.turn > 1) {
      // **REATORAÇÃO**: A IA agora solicita a entrada na Fase de Batalha,
      // em vez de executá-la diretamente. O GameController cuidará do resto.
      gameController.enterBattlePhase();
      attackMade = true; // Assume que se entrou na fase de batalha, alguma ação de ataque será tentada.
    }
    if (attackMade) {
      actionTaken = true;
    }

    return actionTaken;
  }

  // **REATORAÇÃO**: O método agora é assíncrono.
  async executeBattlePhase(opponent, gameController) {
    let hasAttackedThisTurn = false;
    const availableAttackers = this.field.monsters
      .map((monster, index) => ({ monster, index }))
      .filter(item => item.monster && item.monster.position === 'attack' && !item.monster.cannotAttack)
      .sort((a, b) => b.monster.atk - a.monster.atk); // Começa com os mais fortes
  
    const opponentMonsters = opponent.field.monsters
      .map((monster, index) => ({ monster, index }))
      .filter(item => item.monster);
  
    if (opponentMonsters.length === 0) {
      // Ataque direto se o campo estiver vazio
      for (const attackerInfo of availableAttackers) {
        await gameController.aiAttack(attackerInfo.index, null); // **REATORAÇÃO**: Aguarda cada ataque.
        hasAttackedThisTurn = true;
      }
    } else {
      // Lógica de ataque baseada na dificuldade
      for (const attackerInfo of availableAttackers) {
        const targetInfo = this._findBestTarget(attackerInfo, opponentMonsters, gameController);
  
        if (targetInfo) {
          await gameController.aiAttack(attackerInfo.index, targetInfo.index); // **REATORAÇÃO**: Aguarda o ataque.
          hasAttackedThisTurn = true;
          // Remove o alvo da lista para não ser atacado novamente no mesmo turno
          const targetIndex = opponentMonsters.indexOf(targetInfo);
          if (targetIndex > -1) {
            opponentMonsters.splice(targetIndex, 1);
          }
        }
      }
    }
  
    return hasAttackedThisTurn;
  }

  // **NOVAS FUNÇÕES DE ESTRATÉGIA**

  _findBestTarget(attackerInfo, opponentMonsters, gameController) {
    if (this.difficulty === 'easy') {
      return this._findEasyTarget(attackerInfo, opponentMonsters, gameController);
    } else if (this.difficulty === 'normal') {
      return this._findNormalTarget(attackerInfo, opponentMonsters, gameController);
    } else { // hard
      return this._findHardTarget(attackerInfo, opponentMonsters, gameController);
    }
  }

  _findEasyTarget(attackerInfo, opponentMonsters, gameController) {
    const attacker = attackerInfo.monster;

    // Prioridade 1: Encontrar qualquer monstro que possa destruir.
    const killableTargets = opponentMonsters.filter(t =>
      (t.monster.position === 'attack' && attacker.atk > t.monster.atk) ||
      (t.monster.position === 'defense' && attacker.atk > t.monster.def)
    );

    if (killableTargets.length > 0) {
      // Ataca o mais fraco que pode destruir, para garantir o sucesso.
      return killableTargets.sort((a, b) => a.monster.atk - b.monster.atk)[0];
    }

    // Prioridade 2: Se não pode destruir ninguém, ataca um monstro em modo de defesa (não sofre dano).
    const defenseTargets = opponentMonsters.filter(t => t.monster.position === 'defense');
    if (defenseTargets.length > 0) {
      return defenseTargets[0];
    }

    // Se não há alvos vantajosos, a IA Fácil não ataca para não se arriscar.
    gameController.logAction({ type: 'system', message: `${this.name} decide não atacar com <strong>${attacker.name}</strong>.` });
    return null;
  }

  _findNormalTarget(attackerInfo, opponentMonsters, gameController) {
    const attacker = attackerInfo.monster;

    // Prioridade 1: Encontrar o monstro mais forte que pode destruir.
    const killableTargets = opponentMonsters
      .filter(t => (t.monster.position === 'attack' && attacker.atk > t.monster.atk) || (t.monster.position === 'defense' && attacker.atk > t.monster.def))
      .sort((a, b) => b.monster.atk - a.monster.atk); // Prioriza destruir os mais fortes

    if (killableTargets.length > 0) {
      return killableTargets[0];
    }

    // Prioridade 2: Se não pode destruir ninguém, procura uma "troca" (ATK igual).
    const tradeTarget = opponentMonsters.find(t => t.monster.position === 'attack' && attacker.atk === t.monster.atk);
    if (tradeTarget) {
      return tradeTarget;
    }

    // Prioridade 3: Atacar monstros em defesa que não pode destruir (sem risco).
    const defenseTargets = opponentMonsters.filter(t => t.monster.position === 'defense').sort((a, b) => a.monster.def - b.monster.def);
    if (defenseTargets.length > 0) {
      return defenseTargets[0];
    }

    // Se não há alvos vantajosos, a IA Normal não arrisca um ataque suicida.
    gameController.logAction({ type: 'system', message: `${this.name} decide não atacar com <strong>${attacker.name}</strong>.` });
    return null;
  }

  _findHardTarget(attackerInfo, opponentMonsters, gameController) {
    const attacker = attackerInfo.monster;

    // A lógica para a IA Difícil é mais complexa e pode ser mantida aqui.
    // Ela já inclui a busca por alvos destrutíveis e táticas suicidas.

    // 1. Alvos que pode destruir com maior ATK
    let killableTargets = opponentMonsters
      .filter(t => (t.monster.position === 'attack' && attacker.atk > t.monster.atk) || (t.monster.position === 'defense' && attacker.atk > t.monster.def))
      .sort((a, b) => b.monster.atk - a.monster.atk);

    if (killableTargets.length > 0) {
      return killableTargets[0];
    }

    // 2. Se não pode destruir nada, a estratégia muda.
    // Estratégia suicida com a Banshee para enfraquecer o campo inimigo
    if (attacker.name === 'Banshee da Rede' && opponentMonsters.length > 1) {
      const weakestOpponent = [...opponentMonsters].sort((a, b) => a.monster.atk - b.monster.atk)[0];
      gameController.logAction({ type: 'system', message: `${this.name} prepara um ataque tático com <strong>${attacker.name}</strong>!` });
      return weakestOpponent;
    }

    // 3. Ataca o monstro com menor DEF para tentar causar dano ou se livrar de uma ameaça futura.
    const defenseTargets = opponentMonsters.filter(t => t.monster.position === 'defense').sort((a, b) => a.monster.def - b.monster.def);
    if (defenseTargets.length > 0) {
      return defenseTargets[0];
    }

    // 4. Como último recurso, 30% de chance de fazer um ataque kamikaze no monstro mais fraco para abrir o campo.
    if (Math.random() < 0.3) {
      return [...opponentMonsters].sort((a, b) => a.monster.atk - b.monster.atk)[0];
    }

    return null; // Se nenhuma estratégia se aplicar, não ataca.
  }

  findBestBoostTarget(opponent, boostAmount) {
    let bestTarget = null; // { aiMonsterIndex: number, opponentMonsterToDestroy: object }

    this.field.monsters.forEach((aiMonster, aiIndex) => {
      if (!aiMonster) return;

      // Procura o monstro mais forte do oponente que este monstro da IA pode destruir COM o boost.
      const potentialTarget = opponent.field.monsters
        .filter(oppMonster => oppMonster && aiMonster.atk < oppMonster.atk && (aiMonster.atk + boostAmount) >= oppMonster.atk)
        .sort((a, b) => b.atk - a.atk)[0]; // Prioriza destruir o mais forte

      if (potentialTarget) {
        if (!bestTarget || potentialTarget.atk > bestTarget.opponentMonsterToDestroy.atk) {
          bestTarget = { aiMonsterIndex: aiIndex, opponentMonsterToDestroy: potentialTarget };
        }
      }
    });

    // Se encontrou um bom alvo, retorna o índice do monstro da IA a ser buffado.
    // Se não, mas o campo do oponente está vazio, buffa o mais forte para ataque direto.
    if (bestTarget) {
      return bestTarget.aiMonsterIndex;
    } else if (opponent.field.monsters.every(m => m === null) && this.field.monsters.some(m => m)) {
      const strongestAI = this.field.monsters.map((m, i) => ({ m, i })).filter(item => item.m).sort((a, b) => b.m.atk - a.m.atk)[0];
      return strongestAI.i;
    }
    return null;
  }

  findBestWeakenTarget(opponent) {
    // A IA deve usar 'Distorção de Realidade' se isso permitir que um de seus monstros
    // destrua um monstro do oponente que antes não conseguiria.
    const strongestOpponent = opponent.field.monsters.filter(m => m).sort((a, b) => b.atk - a.atk)[0];
    const strongestAI = this.field.monsters.filter(m => m).sort((a, b) => b.atk - a.atk)[0];

    if (strongestOpponent && strongestAI && strongestAI.atk < strongestOpponent.atk && strongestAI.atk >= (strongestOpponent.atk / 2)) {
      return strongestOpponent; // Retorna o monstro a ser enfraquecido
    }
    return null;
  }
}
