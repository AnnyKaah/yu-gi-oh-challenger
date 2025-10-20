export class ContextualInfo {
  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('contextual-info');
  }

  render() {
    return this.element;
  }

  update(gameController) {
    let message = '';

    // Se o tutorial estiver ativo, ele tem prioridade sobre as dicas contextuais.
    if (gameController.isTutorial && gameController.ui.tutorialController?.currentStep < gameController.ui.tutorialController?.steps.length) {
      // **CORREÇÃO CRÍTICA**: Durante o tutorial, a caixa de informações contextuais
      // é controlada exclusivamente pelo TutorialController. Retornamos imediatamente
      // para impedir que a lógica de dicas abaixo sobrescreva a mensagem do tutorial.
      // Este era o bug que fazia o tutorial "travar".
      return;
    }

    // PRIORIDADE MÁXIMA: Mensagem de tributo
    if (gameController.tributeState) {
      const required = gameController.tributeState.required;
      const selected = gameController.tributeState.selected.length;
      message = `Selecione <strong>${required - selected}</strong> monstro(s) para tributar.`;
      this.element.innerHTML = `<p>${message}</p>`;
      this.element.classList.remove('hidden'); // Garante que está visível
      this.element.classList.add('tribute-mode'); // Adiciona classe para estilo especial
      return; // Sai da função para não ser sobrescrito
    } else {
      this.element.classList.remove('tribute-mode');
    }

    const hintsEnabled = localStorage.getItem('cyberNexusHintsEnabled') !== 'false'; // Default é true

    // Esconde as dicas nos modos Normal e Difícil, ou no modo Fácil se o jogador desativou.
    if (gameController.difficulty !== 'easy' || !hintsEnabled) {
      this.element.classList.add('hidden');
      return;
    } else {
      this.element.classList.remove('hidden');
    }

    if (gameController.currentPlayer.name !== 'Você') {
      message = 'Turno do Oponente...';
    } else {
      message = this.generateSmartHint(gameController);
    }
    this.element.innerHTML = `<p>${message}</p>`;
  }

  /**
   * Gera uma dica inteligente com base no estado atual do jogo, usando um sistema de prioridades.
   * @param {GameController} gameController 
   * @returns {string} A melhor dica para a situação atual.
   */
  generateSmartHint(gameController) {
    const player = gameController.player;
    const opponent = gameController.ai;
    const phase = gameController.phase;

    // Lista de geradores de dicas, em ordem de prioridade.
    const hintGenerators = [
      // --- Dicas de Fase de Batalha ---
      () => {
        if (phase !== 'Battle Phase') return null;
        const availableAttackers = player.field.monsters.filter(m => m && m.position === 'attack' && !m.hasAttacked);
        if (availableAttackers.length === 0) return 'Você não tem monstros para atacar. Avance para a próxima fase.';
        
        // Dica para ataque letal (vitória)
        const opponentLP = opponent.lifePoints;
        const directAttackers = availableAttackers.filter(() => opponent.field.monsters.every(m => m === null));
        if (directAttackers.length > 0) {
          const totalDamage = directAttackers.reduce((sum, a) => sum + a.atk, 0);
          if (totalDamage >= opponentLP) return `Ataque diretamente com seus monstros para <strong>vencer o duelo</strong>!`;
        }

        // Dica para o melhor ataque possível
        for (const attacker of availableAttackers.sort((a, b) => b.atk - a.atk)) {
          const bestTarget = opponent.field.monsters
            .map((monster, index) => ({ monster, index }))
            .filter(t => t.monster && t.monster.position === 'attack' && attacker.atk > t.monster.atk)
            .sort((a, b) => b.monster.atk - a.monster.atk)[0];
          if (bestTarget) return `Ataque <strong>${bestTarget.monster.name}</strong> com seu <strong>${attacker.name}</strong> para limpar o campo inimigo!`;
        }

        // Dica para ataque direto
        if (opponent.field.monsters.every(m => m === null)) {
          const strongestAttacker = availableAttackers.sort((a, b) => b.atk - a.atk)[0];
          return `O campo inimigo está livre! Ataque diretamente com <strong>${strongestAttacker.name}</strong>!`;
        }
        return 'Fase de Batalha! Escolha seu melhor ataque ou avance para a Main Phase 2.';
      },

      // --- Dicas de Fase Principal ---
      () => {
        if (!phase.startsWith('Main Phase')) return null;

        // Dica de jogada defensiva se a vida estiver baixa
        if (player.lifePoints <= 2000) {
          const monsterToSet = player.hand.find(c => c.type === 'monster' && c.def > 1500);
          if (monsterToSet && !player.hasNormalSummoned) {
            return `Sua vida está baixa! Considere baixar <strong>${monsterToSet.name}</strong> em defesa para se proteger.`;
          }
        }

        // Dica para Invocação-Tributo (alta prioridade)
        if (!player.hasNormalSummoned) {
          const highLevelMonster = player.hand.find(c => c.type === 'monster' && c.level >= 5);
          if (highLevelMonster) {
            const requiredTributes = highLevelMonster.level >= 7 ? 2 : 1;
            const availableTributes = player.field.monsters.filter(m => m !== null).length;
            if (availableTributes >= requiredTributes) {
              return `Você pode invocar <strong>${highLevelMonster.name}</strong>! Clique nele e escolha a opção para invocar.`;
            }
          }
        }

        // Dica para usar uma Magia de remoção ou controle
        const powerfulSpell = player.hand.find(c => c.name === 'Onda de Controle Neural' || c.name === 'Distorção de Realidade');
        if (powerfulSpell && opponent.field.monsters.some(m => m !== null)) {
          return `Use <strong>${powerfulSpell.name}</strong> para neutralizar uma ameaça inimiga.`;
        }

        // Dica para invocar o monstro com maior ATK
        if (!player.hasNormalSummoned) {
          const summonableMonsters = player.hand.filter(c => c.type === 'monster' && c.level <= 4);
          if (summonableMonsters.length > 0) {
            summonableMonsters.sort((a, b) => b.atk - a.atk);
            return `Considere invocar <strong>${summonableMonsters[0].name}</strong> para aplicar pressão no oponente.`;
          }
        }

        // Dica para baixar uma Armadilha
        const trapCard = player.hand.find(c => c.type === 'trap');
        if (trapCard) {
          return `Prepare uma defesa! Baixe sua <strong>${trapCard.name}</strong> para surpreender o oponente.`;
        }

        // Dica genérica atualizada
        return `Clique em uma carta na sua mão para ver as ações disponíveis.`;
      },
    ];

    // Itera sobre os geradores e retorna a primeira dica válida encontrada.
    for (const generator of hintGenerators) {
      const hint = generator();
      if (hint) return hint;
    }

    // Dica de fallback final
    return 'Planeje sua próxima jogada ou avance para a próxima fase.';
  }
}