export class Tutorial {
  constructor(onStartGame, onStartTutorial) {
    this.onStartGame = onStartGame;
    this.onStartTutorial = onStartTutorial; // For future implementation
    this.element = document.createElement('div');
    this.element.classList.add('help-menu-overlay'); // CORREÇÃO: Usa a classe de overlay correta
  }

  render() {
    this.element.innerHTML = `
      <div class="tutorial-modal">
        <h2>Bem-vindo ao Cyber Nexus!</h2>
        <p class="tutorial-subtitle">Sua jornada como Executor começa agora.</p>
        <p>Recomendamos um rápido tutorial para aprender os comandos básicos do campo de batalha digital.</p>
        <div class="tutorial-actions">
          <button class="btn tutorial-start">Iniciar Tutorial</button>
          <button class="btn tutorial-skip">Pular Tutorial</button>
        </div>
      </div>
    `;

    this.element.querySelector('.tutorial-start').addEventListener('click', () => {
      // For now, starting the tutorial will just start a normal game.
      this.onStartTutorial();
    });

    this.element.querySelector('.tutorial-skip').addEventListener('click', () => {
      // **REATORAÇÃO**: Apenas inicia o jogo normal, sem confirmação ou localStorage.
      this.onStartGame();
    });

    return this.element;
  }

  destroy() {
    this.element.remove();
  }
}