export class TutorialController {
  constructor(gameController, uiComponents) {
    this.game = gameController;
    this.ui = uiComponents; // { contextualInfo }
    this.highlightRing = null;
    this.clickBlocker = null; // Elemento para bloquear cliques indesejados
    this.lastHighlightedElements = []; // Guarda referência dos últimos elementos destacados para limpeza
    this.currentStep = 0;
    this.steps = [
      {
        message: "Bem-vindo ao tutorial! Vamos aprender o básico. Clique em 'Próximo' para começar.",
        highlight: null, // REMOVIDO: Não vamos mais destacar o painel inteiro.
        action: 'next'
      },
      {
        message: "Para jogar uma carta, clique nela para ver as opções. Clique no seu 'Core Guardian'.",
        highlight: '.card-in-hand[data-card-name="Core Guardian"]',
        action: 'open_menu'
      },
      {
        message: "Agora, escolha a ação 'Invocar em Ataque' no menu que apareceu.",
        highlight: '.action-menu',
        action: 'summon'
      },
      {
        message: "Excelente! Agora vamos 'Baixar' um monstro. Isso o coloca em defesa, virado para baixo. Clique no 'Net Runner Enigmático' na sua mão.",
        highlight: '.card-in-hand[data-card-name="Net Runner Enigmático"]',
        action: 'open_menu'
      },
      {
        message: "Diferente de 'Invocar', escolha a opção 'Baixar em Defesa' para esconder sua carta do oponente.",
        highlight: '.action-menu',
        action: 'set_monster'
      },
      {
        message: "Para invocar monstros fortes, você precisa de tributos. Clique no 'Colosso de Batalha' (Nível 7) na sua mão.",
        highlight: '.card-in-hand[data-card-name="Colosso de Batalha"]',
        action: 'open_menu'
      },
      {
        message: "Escolha 'Invocar em Ataque'. O sistema irá tributar automaticamente 2 monstros para invocar esta carta poderosa.",
        highlight: '.action-menu',
        action: 'tribute_start'
      },
      {
        message: "Ótimo! Agora, vamos para a Fase de Batalha. Clique no botão 'Ir para Batalha'.",
        highlight: '.hud-btn[data-phase-action="battle"]',
        action: 'enter_battle'
      },
      {
        message: "Para atacar, clique e segure no seu 'Colosso de Batalha' e arraste-o até o monstro inimigo para desferir o golpe final!",
        highlight: '.card-on-field[data-card-name="Colosso de Batalha"]',
        action: 'attack'
      },
      {
        message: "Parabéns! Você concluiu o tutorial! Se tiver mais dúvidas, consulte o menu de 'Ajuda' e o FAQ a qualquer momento. Clique em 'Continuar' para voltar ao menu principal.",
        highlight: '#tutorial-continue-btn', // **NOVO**: O alvo do destaque é o próprio botão de continuar.
        action: 'finish' // Ação para o passo final
      }
    ];
    // Mapeia ações do tutorial para funções que as disparam
    this.actionHandlers = {
    };
  }

  // **NOVO MÉTODO**: Centraliza a lógica de avanço do tutorial baseada em ações do jogo.
  onActionCompleted(actionType) {
    if (!this.game.isTutorial) return;

    const currentStepAction = this.steps[this.currentStep]?.action;
    if (currentStepAction === actionType) {
      console.log(`[Tutorial] Ação '${actionType}' recebida e CORRESPONDE à ação esperada. Avançando...`);
      this.nextStep();
    } else {
      console.warn(`[Tutorial] Ação '${actionType}' recebida, mas a ação esperada era '${currentStepAction}'. O tutorial não avançará.`);
    }
  }

  start() {
    localStorage.setItem('cyberNexusTutorialSkipped', 'true');
    // **CORREÇÃO DEFINITIVA**: Adiciona uma classe para elevar o z-index da mensagem.
    // E move o elemento para o body para garantir que ele esteja no topo do stacking context.
    document.body.appendChild(this.ui.contextualInfo.element);
    this.ui.contextualInfo.element.classList.add('tutorial-active');
    this.showStep();
  }

  nextStep() {
    this.cleanupStep(); // Limpa elementos visuais e listeners do passo anterior
    this.currentStep++;
    if (this.currentStep < this.steps.length) {      
      this.showStep();
    } else {
      this.end();
    }
  }

  cleanupStep() {
    // Limpa listeners antigos para evitar acúmulo
    if (this.cleanupListener) {
      this.cleanupListener();
      this.cleanupListener = null;
    }
    // **CORREÇÃO CRÍTICA**: Reseta os estilos do elemento anterior para evitar bloqueio de cliques.
    if (this.lastHighlightedElements.length > 0) {
      this.lastHighlightedElements.forEach(el => {
        el.style.pointerEvents = '';
        el.style.zIndex = '';
      });
      this.lastHighlightedElements = [];
    }

    // Remove destaques e setas anteriores
    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
    if (this.highlightRing) {
      this.highlightRing.remove();
      this.highlightRing = null;
    }
    if (this.clickBlocker) {
      this.clickBlocker.remove();
      this.clickBlocker = null;
    }
  }

  showStep() {
    this.cleanupStep(); // Garante que a tela esteja limpa antes de mostrar o novo passo
    const step = this.steps[this.currentStep];
    const progressIndicator = `<div class="tutorial-progress">Passo ${this.currentStep + 1} de ${this.steps.length}</div>`;
    // Garante que a mensagem seja renderizada antes de qualquer outra lógica
    this.ui.contextualInfo.element.innerHTML = `<div class="tutorial-message-box"><p>${progressIndicator}${step.message}</p></div>`;

    // **CORREÇÃO**: Move a caixa de mensagem para baixo durante o passo de ataque para não cobrir o alvo.
    if (step.action === 'attack') {
      this.ui.contextualInfo.element.classList.add('tutorial-bottom');
    } else {
      this.ui.contextualInfo.element.classList.remove('tutorial-bottom');
    }

    this.highlightElement(step.highlight);

    // Usa o novo sistema de handlers para ações que precisam de um clique do usuário para avançar
    const handler = this.actionHandlers[step.action];
    if (handler) {
      handler(step);
    } else if (step.action === 'finish') { // **LÓGICA REATORADA PARA O PASSO FINAL**
      this.showVictoryEffects(); // Mostra os confetes.
      const messageBox = this.ui.contextualInfo.element.querySelector('.tutorial-message-box');
      // Adiciona um botão "Continuar" diretamente na caixa de mensagem do tutorial.
      messageBox.innerHTML += `<button id="tutorial-continue-btn" class="btn btn-tutorial-next">Continuar</button>`;
      const continueButton = document.getElementById('tutorial-continue-btn');
      continueButton.addEventListener('click', () => this.end(), { once: true });
    } else if (step.action === 'next') {
      // Lógica para o botão "Próximo" movida para cá para maior clareza
      const messageBox = this.ui.contextualInfo.element.querySelector('.tutorial-message-box');
      messageBox.innerHTML += `<button id="tutorial-next-btn" class="btn btn-tutorial-next">Próximo</button>`;
      const nextButton = document.getElementById('tutorial-next-btn');
      this.highlightElement('#tutorial-next-btn'); // Usa a função de destaque padrão
      nextButton.addEventListener('click', () => this.nextStep(), { once: true });
    }
  }

  highlightElement(selector) {
    // **CORREÇÃO**: Se o seletor for nulo, não faz nada.
    if (!selector) {
      return;
    }

    // Usa um pequeno timeout para garantir que o DOM foi atualizado (especialmente para menus dinâmicos)
    setTimeout(() => {
      // **CORREÇÃO**: Usa querySelectorAll para encontrar todos os alvos válidos.
      const targetElements = document.querySelectorAll(selector);
      if (targetElements.length === 0) {
        console.warn(`Elemento do tutorial não encontrado: ${selector}`);
        return;
      }

      // Guarda a referência dos elementos que serão modificados
      this.lastHighlightedElements = Array.from(targetElements);

      // Cria o anel de destaque
      this.highlightRing = document.createElement('div');
      this.highlightRing.className = 'tutorial-highlight-ring';
      document.body.appendChild(this.highlightRing);

      // Posiciona o anel sobre o PRIMEIRO elemento alvo (para o efeito visual)
      const rect = targetElements[0].getBoundingClientRect();
      this.highlightRing.style.top = `${rect.top - 10}px`; // 10px de padding
      this.highlightRing.style.left = `${rect.left - 10}px`;
      this.highlightRing.style.width = `${rect.width + 20}px`;
      this.highlightRing.style.height = `${rect.height + 20}px`;
      
      // O anel de destaque fica em uma camada superior para garantir a visibilidade.
      this.highlightRing.style.zIndex = '1002';

    }, 150); // **CORREÇÃO**: Aumenta o delay para 150ms para garantir que a renderização da UI da ação anterior seja concluída.
  }

  showVictoryEffects() {
    // Dispara o confete!
    if (typeof confetti === 'function') {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }
    this.game.ui.audioController?.play('win');
    // A atualização da UI após o ataque já mostrará o dano.
  }

  end() {
    // **CORREÇÃO**: Remove explicitamente o elemento de informação contextual do corpo do documento.
    // Isso impede que ele persista após a saída do tutorial.
    // **CORREÇÃO CRÍTICA**: Garante que o elemento seja removido ANTES de qualquer outra ação de limpeza.
    this.ui.contextualInfo.element?.remove();

    // Reseta o estado do objeto de dicas, embora o elemento já tenha sido removido.
    this.ui.contextualInfo.update(this.game);
    this.cleanupStep(); // Limpa todos os elementos visuais do tutorial

    this.game.ui.onReturnToMenu(); // Retorna ao menu principal
  }
}