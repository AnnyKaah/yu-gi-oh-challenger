export class InfoCardPanel {
  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('info-card-panel', 'hidden');
    document.body.appendChild(this.element);
  }

  show(card) {
    if (!card || card.isFaceDown) {
      this.hide();
      return;
    }

    this.element.innerHTML = `
      <h3 class="info-card-name">${card.name}</h3>
      ${card.type === 'monster' ? `
      <div class="info-card-stats">
          <div class="stat-box">
              <span class="stat-label">ATK</span>
              <span class="stat-value">${card.atk}</span>
          </div>
          <div class="stat-box">
              <span class="stat-label">DEF</span>
              <span class="stat-value">${card.def}</span>
          </div>
      </div>
      ` : `<div class="info-card-type">${card.type.charAt(0).toUpperCase() + card.type.slice(1)}</div>`}
      <div class="info-card-effect">${card.effect}</div>
    `;
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }
}