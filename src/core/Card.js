export class Card {
  constructor(cardData) {
    this.name = cardData.name;
    this.effect = cardData.effect;
    this.image = cardData.image;
    this.atk = cardData.atk;
    this.def = cardData.def;
    this.type = cardData.type;
    this.attribute = cardData.attribute;
    this.level = cardData.level;
  }

  render() {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card');
    cardEl.innerHTML = `
      <img src="assets/img/cards/${this.image}" alt="${this.name}">
      <h3>${this.name}</h3>
      <p>${this.effect}</p>
      <div class="stats">
        <span>ATK ${this.atk}</span> | <span>DEF ${this.def}</span>
      </div>
    `;
    return cardEl;
  }
}
