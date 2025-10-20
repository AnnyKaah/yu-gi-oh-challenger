export class DeckBuilderScreen {
  constructor(allCards, onExit) {
    this.allCards = allCards;
    this.onExit = onExit;
    this.element = document.createElement('div');
    this.element.classList.add('deck-builder-overlay', 'hidden');
    document.body.appendChild(this.element);

    this.deck = JSON.parse(localStorage.getItem('cyberNexusPlayerDeck') || '[]');
    this.selectedCardName = null;
    this.filters = {
      name: '',
      type: 'all',
      level: 'all'
    };
  }

  show(allCards) {
    if (allCards) this.allCards = allCards;
    this.render();
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
    if (this.onExit) this.onExit();
  }

  getCollectionWithCounts() {
    const collection = JSON.parse(localStorage.getItem('cyberNexusPlayerCollection') || '[]');
    const counts = {};
    collection.forEach(cardName => {
      counts[cardName] = (counts[cardName] || 0) + 1;
    });
    return counts;
  }

  addCardToDeck(cardName) {
    const deckCount = this.deck.filter(c => c === cardName).length;
    const collectionCount = this.getCollectionWithCounts()[cardName] || 0;

    if (this.deck.length >= 20) {
      alert('Seu deck já atingiu o limite de 20 cartas.');
      return;
    }
    if (deckCount >= 3) {
      alert('Você não pode ter mais de 3 cópias da mesma carta no deck.');
      return;
    }
    if (deckCount >= collectionCount) {
      alert('Você não tem mais cópias desta carta na sua coleção.');
      return;
    }

    this.deck.push(cardName);
    this.render();
  }

  removeCardFromDeck(index) {
    this.deck.splice(index, 1);
    this.render();
  }

  saveDeck() {
    if (this.deck.length < 20) {
      alert('Seu deck precisa ter exatamente 20 cartas para ser salvo.');
      return;
    }
    localStorage.setItem('cyberNexusPlayerDeck', JSON.stringify(this.deck));
    alert('Deck salvo com sucesso!');
    this.hide();
  }

  updateDetailPane(cardName) {
    const detailPane = this.element.querySelector('.detail-pane');
    if (!detailPane) return;

    detailPane.innerHTML = '<h3>Detalhes da Carta</h3>'; // Limpa e adiciona o título

    const cardData = this.allCards.find(c => c.name === cardName);
    if (!cardData) {
      detailPane.innerHTML += '<p class="detail-placeholder">Passe o mouse sobre uma carta para ver os detalhes.</p>';
      return;
    }

    // Usa o novo painel de detalhes tático, consistente com a Biblioteca
    const isMonster = cardData.type === 'monster';
    const playerFacingEffect = cardData.effect.replace(/\s?\(.*\)/, '').trim();
    detailPane.innerHTML += `
      <div class="tactical-panel-new" style="transform: scale(0.8); transform-origin: top center;">
        <div class="tactical-art-viewport">
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
  }

  render() {
    const collectionCounts = this.getCollectionWithCounts();
    const sortedCollection = Object.keys(collectionCounts).sort();

    // Aplica os filtros
    if (this.filters.name) {
      sortedCollection = sortedCollection.filter(cardName =>
        cardName.toLowerCase().includes(this.filters.name.toLowerCase())
      );
    }
    if (this.filters.type !== 'all') {
      sortedCollection = sortedCollection.filter(cardName => {
        const card = this.allCards.find(c => c.name === cardName);
        return card && card.type === this.filters.type;
      });
    }
    if (this.filters.level !== 'all') {
      sortedCollection = sortedCollection.filter(cardName => {
        const card = this.allCards.find(c => c.name === cardName);
        return card && card.type === 'monster' && card.level == this.filters.level;
      });
    }

    this.element.innerHTML = `
      <div class="deck-builder-modal">
        <h2 class="deck-builder-title">Montador de Deck</h2>
        <div class="filter-pane">
          <input type="text" id="filter-name" placeholder="Buscar por nome..." value="${this.filters.name}">
          <select id="filter-type">
            <option value="all" ${this.filters.type === 'all' ? 'selected' : ''}>Todos os Tipos</option>
            <option value="monster" ${this.filters.type === 'monster' ? 'selected' : ''}>Monstro</option>
            <option value="spell" ${this.filters.type === 'spell' ? 'selected' : ''}>Magia</option>
            <option value="trap" ${this.filters.type === 'trap' ? 'selected' : ''}>Armadilha</option>
          </select>
        </div>
        <div class="deck-builder-content">
          <div class="collection-pane">
            <h3>Sua Coleção</h3>
            <div class="card-list">
              ${sortedCollection.map(cardName => `
                <div class="card-list-item" data-card-name="${cardName}">
                  <span>${cardName}</span>
                  <span>x${collectionCounts[cardName]}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="detail-pane">
            <!-- O conteúdo será preenchido por updateDetailPane -->
          </div>
          <div class="deck-pane">
            <h3>Seu Deck (${this.deck.length} / 20)</h3>
            <div class="card-list">
              ${this.deck.map((cardName, index) => `
                <div class="card-list-item deck-card" data-card-index="${index}">
                  <span>${cardName}</span>
                  <span class="remove-card-btn">&times;</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="deck-builder-actions">
          <button class="btn" id="save-deck-btn">Salvar Deck</button>
          <button class="btn" id="exit-deck-builder-btn">Voltar ao Menu</button>
        </div>
      </div>
    `;

    // Adiciona listeners para os filtros
    this.element.querySelector('#filter-name').addEventListener('input', (e) => {
      this.filters.name = e.target.value;
      this.render();
    });
    this.element.querySelector('#filter-type').addEventListener('change', (e) => {
      this.filters.type = e.target.value;
      this.render();
    });

    this.element.querySelectorAll('.collection-pane .card-list-item').forEach(item => {
      const cardName = item.dataset.cardName;
      item.addEventListener('click', () => this.addCardToDeck(cardName));
      item.addEventListener('mouseenter', () => this.updateDetailPane(cardName));
    });

    this.element.querySelectorAll('.deck-pane .card-list-item').forEach(item => {
      const cardName = item.querySelector('span:first-child').textContent;
      item.addEventListener('mouseenter', () => this.updateDetailPane(cardName));
      item.addEventListener('click', (e) => {
        // Clicar no 'x' remove, clicar no nome não faz nada por enquanto
        if (e.target.classList.contains('remove-card-btn')) {
          this.removeCardFromDeck(parseInt(e.currentTarget.dataset.cardIndex, 10));
        }
      });
    });

    this.element.querySelector('#save-deck-btn').addEventListener('click', () => this.saveDeck());
    this.element.querySelector('#exit-deck-builder-btn').addEventListener('click', () => this.hide());

    this.updateDetailPane(this.selectedCardName); // Renderiza o detalhe da carta selecionada (ou o placeholder)
  }
}