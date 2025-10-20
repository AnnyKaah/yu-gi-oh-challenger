export class EndGameScreen {
  constructor(result, onReturnToMenu, reward = 0, stats = {}) {
    this.result = result; // 'win' ou 'lose'
    this.reward = reward;
    this.onReturnToMenu = onReturnToMenu;
    this.stats = stats;
    this.element = document.createElement('div');
    this.element.classList.add('endgame-overlay');
  }

  render() {
    const title = this.result === 'win' ? 'VITÓRIA' : 'DERROTA';
    const message = this.result === 'win'
      ? 'Você provou sua supremacia no Nexus!'
      : 'Seus dados foram corrompidos. Tente novamente.';

    const rewardDisplay = this.result === 'win'
      ? `<p class="endgame-reward">Recompensa: <strong>+${this.reward}</strong> Créditos de Dados</p>`
      : '';

    const mvpCardDisplay = this.stats.mvpCard ? `
      <div class="endgame-mvp">
        <h4 class="mvp-title">Carta Chave</h4>
        <div class="mvp-card" style="background-image: url('assets/img/cards/${this.stats.mvpCard.image}')"></div>
        <p class="mvp-name">${this.stats.mvpCard.name}</p>
      </div>
    ` : '';

    this.element.innerHTML = `
      <div class="endgame-modal ${this.result}">
        <div class="endgame-main-content">
          <div class="endgame-player-display">
            <img src="assets/img/avatars/player-avatar.png" class="endgame-avatar ${this.result === 'win' ? 'winner' : 'loser'}">
            <span class="endgame-player-name">Você</span>
          </div>
          <div class="endgame-result-info">
            <h2 class="endgame-title">${title}</h2>
            <p class="endgame-message">${message}</p>
            <div class="endgame-stats">
              <span>Turnos: <strong>${this.stats.turns}</strong></span>
              <span>Seus LP: <strong>${this.stats.playerFinalLP}</strong></span>
              <span>LP Oponente: <strong>${this.stats.aiFinalLP}</strong></span>
            </div>
            ${rewardDisplay}
            <button class="btn endgame-btn">Voltar ao Menu</button>
          </div>
          <div class="endgame-player-display">
            <img src="assets/img/avatars/ai-avatar.png" class="endgame-avatar ${this.result === 'lose' ? 'winner' : 'loser'}">
            <span class="endgame-player-name">Oponente</span>
          </div>
        </div>
        ${mvpCardDisplay}
      </div>
    `;

    this.element.querySelector('.endgame-btn').addEventListener('click', this.onReturnToMenu);

    return this.element;
  }
}