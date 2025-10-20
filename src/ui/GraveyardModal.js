// src/ui/GraveyardModal.js (Novo Arquivo)
export class GraveyardModal {
  constructor(tooltip) {
    this.tooltip = tooltip; // Referência ao tooltip global
    this.element = document.createElement('div');
    this.element.classList.add('graveyard-overlay', 'hidden');
    document.body.appendChild(this.element);

    this.element.addEventListener('click', (e) => {
      // Fecha o modal se clicar no overlay (fora do conteúdo)
      if (e.target === this.element) {
        this.hide();
      }
    });
  }

  /**
   * Mostra o modal do cemitério.
   * @param {string} title - O título para o modal (e.g., "Seu Cemitério").
   * @param {Array<Object>} cards - O array de cartas no cemitério.
   */
  show(title, cards) {
    if (!cards || cards.length === 0) return;

    this.element.innerHTML = `
      <div class="graveyard-modal">
        <button class="graveyard-close-btn">&times;</button>
        <h2 class="graveyard-title">${title} (${cards.length})</h2>
        <div class="graveyard-card-grid">
          ${cards.map(card => `
            <div class="graveyard-card-item" style="background-image: url('assets/img/cards/${card.image}')"></div>
          `).join('')}
        </div>
      </div>
    `;

    this.element.querySelector('.graveyard-close-btn').addEventListener('click', () => this.hide());

    // Adiciona listeners de hover para o tooltip em cada carta
    const cardElements = this.element.querySelectorAll('.graveyard-card-item');
    cardElements.forEach((cardEl, index) => {
      const cardData = cards[index];
      cardEl.addEventListener('mouseenter', (e) => this.tooltip?.show(cardData, e));
      cardEl.addEventListener('mouseleave', () => this.tooltip?.hide());
    });

    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }
}