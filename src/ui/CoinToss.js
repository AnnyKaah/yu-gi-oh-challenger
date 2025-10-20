export class CoinToss {
  constructor(audioController, playerAvatarSrc, aiAvatarSrc, onComplete) {
    this.audio = audioController;
    this.playerAvatarSrc = playerAvatarSrc;
    this.aiAvatarSrc = aiAvatarSrc;
    this.onComplete = onComplete;
    this.element = document.createElement('div');
    this.element.classList.add('cointoss-overlay');
  }

  render() {
    this.element.innerHTML = `
      <div class="cointoss-wrapper">
        <div class="cointoss-container">
          <div class="cointoss-avatar" id="cointoss-player">
            <img src="${this.playerAvatarSrc}" alt="Player">
            <span>VOCÊ</span>
          </div>
          <div class="cointoss-vs">VS</div>
          <div class="cointoss-avatar" id="cointoss-ai">
            <img src="${this.aiAvatarSrc}" alt="Opponent">
            <span>OPONENTE</span>
          </div>
        </div>
        <p class="cointoss-text">Decidindo quem começa...</p>
      </div>
    `;
    return this.element;
  }

  start() {
    this.audio.play('random-tick');

    const playerAvatar = this.element.querySelector('#cointoss-player');
    const aiAvatar = this.element.querySelector('#cointoss-ai');
    let toggle = true;

    const interval = setInterval(() => {
      playerAvatar.classList.toggle('selected', toggle);
      aiAvatar.classList.toggle('selected', !toggle);
      toggle = !toggle;
    }, 150);

    setTimeout(() => {
      clearInterval(interval);
      this.audio.stop('random-tick');
      this.audio.play('choice-reveal');

      const winner = Math.random() < 0.5 ? 'player' : 'ai';
      playerAvatar.classList.toggle('selected', winner === 'player');
      aiAvatar.classList.toggle('selected', winner === 'ai');
      playerAvatar.classList.toggle('loser', winner !== 'player');
      aiAvatar.classList.toggle('loser', winner !== 'ai');
      this.element.querySelector('.cointoss-text').textContent = `${winner === 'player' ? 'VOCÊ' : 'O OPONENTE'} COMEÇA!`;

      // Aguarda um momento para o jogador ver o resultado, depois inicia o fade-out
      setTimeout(() => {
        this.element.classList.add('screen-fade-out');
        setTimeout(() => this.onComplete(winner), 500); // Chama o onComplete após o fade-out
      }, 2000);
    }, 3000);
  }
}