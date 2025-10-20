export class CardNameTooltip {
  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('card-name-tooltip', 'hidden');
    document.body.appendChild(this.element);

    this.boundMouseMove = this.onMouseMove.bind(this);
  }

  onMouseMove(e) {
    // Posiciona o tooltip perto do cursor do mouse
    this.element.style.left = `${e.clientX + 15}px`;
    this.element.style.top = `${e.clientY + 15}px`;
  }

  show(card, e) {
    if (!card) return;

    // Lógica para decidir o que mostrar
    if (card.position && card.type === 'monster') {
      // Se a carta está no campo (tem 'position') e é um monstro
      this.element.innerHTML = `ATK ${card.atk} / DEF ${card.def}`;
    } else {
      // Se está na mão ou não é um monstro
      const levelDisplay = card.type === 'monster' ? `[Lvl ${card.level}] ` : '';
      this.element.textContent = `${levelDisplay}${card.name}`;
    }

    this.element.classList.remove('hidden');
    this.onMouseMove(e); // Posição inicial
    document.addEventListener('mousemove', this.boundMouseMove);
  }

  hide() {
    this.element.classList.add('hidden');
    document.removeEventListener('mousemove', this.boundMouseMove);
  }
}