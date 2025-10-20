// src/ui/CardDetailModal.js (Novo Arquivo)
export class CardDetailModal {
  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('library-overlay', 'hidden'); // Reutiliza o estilo do overlay da biblioteca
    document.body.appendChild(this.element);

    this.element.addEventListener('click', (e) => {
      // Fecha o modal se clicar no overlay (fora do conteúdo)
      if (e.target === this.element) {
        this.hide();
      }
    });
  }

  show(cardData) {
    if (!cardData) return;

    const isMonster = cardData.type === 'monster';
    // Remove os handlers do texto do efeito para uma leitura mais limpa
    const playerFacingEffect = cardData.effect.replace(/\s?\(Handler:.*\)/, '').trim();

    this.element.innerHTML = `
      <div class="tactical-panel-new" style="max-width: 400px;">
        <button class="detail-close-btn">&times;</button>
        <div class="tactical-art-viewport" style="height: 250px;">
          <img src="assets/img/cards/${cardData.image}" alt="Artwork for ${cardData.name}">
        </div>
        <h3 class="tactical-name-new">${cardData.name}</h3>
        <div class="tactical-info-grid">
          ${isMonster ? `
            <div class="info-box">
              <span class="info-label">Nível</span>
              <span class="info-value">${cardData.level}</span>
            </div>
            ${cardData.level >= 5 ? `
            <div class="info-box">
              <span class="info-label">Tributos</span>
              <span class="info-value">${cardData.level >= 7 ? 2 : 1}</span>
            </div>
            ` : ''}
            <div class="info-box">
              <span class="info-label">ATK / DEF</span>
              <span class="info-value">${cardData.atk} / ${cardData.def}</span>
            </div>`
          : `<div class="info-box full-width"><span class="info-label">Tipo</span><span class="info-value">${cardData.type === 'spell' ? 'Magia' : 'Armadilha'}</span></div>`
          }
        </div>
        <div class="tactical-effect-box-new">
          <h4>Efeito</h4>
          <p>${playerFacingEffect}</p>
        </div>
      </div>
    `;

    this.element.querySelector('.detail-close-btn').addEventListener('click', () => this.hide());
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }
}