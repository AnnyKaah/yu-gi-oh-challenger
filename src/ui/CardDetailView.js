export class CardDetailView {
  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('card-detail-view', 'hidden');
  }

  render() {
    return this.element;
  }

  update(card) {
    if (!card) {
      this.hide();
      return;
    }

    const isMonster = card.type === 'monster';

    this.element.innerHTML = `
      <button class="detail-close-btn">X</button>
      <img class="detail-card-image" src="assets/img/cards/${card.image}" alt="${card.name}" />
      <h3 class="detail-card-name">${card.name}</h3>
      <p class="detail-card-attribute">[${card.attribute.toUpperCase()} / ${card.type.toUpperCase()}]</p>
      ${isMonster ? `<p class="detail-card-stats">ATK / ${card.atk} &nbsp;&nbsp; DEF / ${card.def}</p>` : ''}
      <div class="detail-card-effect"><p>${card.effect}</p></div>
    `;

    // Adiciona o listener para o novo botão de fechar
    this.element.querySelector('.detail-close-btn').addEventListener('click', () => this.hide());

    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }
}