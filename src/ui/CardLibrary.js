export class CardLibrary {
  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('library-overlay', 'hidden');
    this.allCards = [];
    this.selectedCard = null;
    this.filters = {
      name: '',
      type: 'all',
      sortBy: 'name'
    };
    document.body.appendChild(this.element);

    // Fecha ao clicar no fundo
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) this.hide();
    });
  }

  async loadCards() {
    if (this.allCards.length === 0) {
      const response = await fetch('./cards.json');
      this.allCards = await response.json();
      this.allCards.sort((a, b) => a.name.localeCompare(b.name)); // Ordena alfabeticamente
    }
  }

  async show(title = 'Biblioteca de Cartas', cardsToShow = null, onActivateCallback = null) {
    await this.loadCards();
    // Reseta os filtros ao abrir a biblioteca
    this.filters = { name: '', type: 'all', sortBy: 'name' };
    const cardList = cardsToShow || this.allCards;
    this.render(title, cardList, null, onActivateCallback);
    this.element.classList.remove('hidden');
  }

  getCollectionCounts() {
    const collection = JSON.parse(localStorage.getItem('cyberNexusPlayerCollection') || '[]');
    const counts = {};
    collection.forEach(cardName => {
      counts[cardName] = (counts[cardName] || 0) + 1;
    });
    return counts;
  }

  hide() {
    this.element.classList.add('hidden');
  }

  render(title, cardList, selectedCardName = null, onActivateCallback = null) {
    const collectionCounts = this.getCollectionCounts();
    let filteredAndSortedCards = [...cardList];

    // Aplicar filtros
    if (this.filters.name) {
      filteredAndSortedCards = filteredAndSortedCards.filter(card =>
        card.name.toLowerCase().includes(this.filters.name.toLowerCase())
      );
    }
    if (this.filters.type !== 'all') {
      filteredAndSortedCards = filteredAndSortedCards.filter(card => card.type === this.filters.type);
    }

    // Aplicar ordenação
    filteredAndSortedCards.sort((a, b) => {
      switch (this.filters.sortBy) {
        case 'atk':
          return (b.atk || 0) - (a.atk || 0);
        case 'level':
          return (b.level || 0) - (a.level || 0);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    const selectedCard = filteredAndSortedCards.find(c => c.name === selectedCardName) || filteredAndSortedCards[0];

    this.element.innerHTML = `
      <div class="library-modal">
        <button class="library-close-btn">X</button>
        <h2>${title}</h2>
        <div class="library-filter-pane">
          <input type="text" id="library-filter-name" placeholder="Buscar por nome..." value="${this.filters.name}">
          <select id="library-filter-type">
            <option value="all" ${this.filters.type === 'all' ? 'selected' : ''}>Todos os Tipos</option>
            <option value="monster" ${this.filters.type === 'monster' ? 'selected' : ''}>Monstro</option>
            <option value="spell" ${this.filters.type === 'spell' ? 'selected' : ''}>Magia</option>
            <option value="trap" ${this.filters.type === 'trap' ? 'selected' : ''}>Armadilha</option>
          </select>
          <select id="library-sort-by">
            <option value="name" ${this.filters.sortBy === 'name' ? 'selected' : ''}>Ordenar por Nome</option>
            <option value="atk" ${this.filters.sortBy === 'atk' ? 'selected' : ''}>Ordenar por ATK</option>
            <option value="level" ${this.filters.sortBy === 'level' ? 'selected' : ''}>Ordenar por Nível</option>
          </select>
        </div>
        <div class="library-content">
          <div class="library-list">
            ${filteredAndSortedCards.map(card => `
              <div class="library-card-item ${card.name === selectedCard?.name ? 'active' : ''} ${!collectionCounts[card.name] ? 'unowned' : ''}" data-card-name="${card.name}">
                <span class="library-card-name">${card.name}</span>
                <span class="library-card-count">x${collectionCounts[card.name] || 0}</span>
              </div>
            `).join('')}
          </div>
          <div class="library-detail"></div>
        </div>
      </div>
    `;

    // Renderiza a carta de detalhe e o botão de ativação
    const detailContainer = this.element.querySelector('.library-detail');    
    const isMonster = selectedCard.type === 'monster';
    const playerFacingEffect = selectedCard.effect.replace(/\s?\(.*\)/, '').trim();

    // Usa o novo painel de detalhes tático
    detailContainer.innerHTML = `
      <div class="tactical-panel-new">
        <div class="tactical-art-viewport">
          <img src="assets/img/cards/${selectedCard.image}" alt="Artwork for ${selectedCard.name}">
        </div>
        <h3 class="tactical-name-new">${selectedCard.name}</h3>
        <div class="tactical-info-grid">
          ${isMonster ? `
            <div class="info-box">
              <span class="info-label">Nível</span>
              <span class="info-value">${selectedCard.level}</span>
            </div>
            ${selectedCard.level >= 5 ? `
            <div class="info-box">
              <span class="info-label">Tributos</span>
              <span class="info-value">${selectedCard.level >= 7 ? 2 : 1}</span>
            </div>
            ` : ''}
            <div class="info-box">
              <span class="info-label">ATK / DEF</span>
              <span class="info-value">${selectedCard.atk} / ${selectedCard.def}</span>
            </div>`
          : `<div class="info-box full-width"><span class="info-label">Tipo</span><span class="info-value">${selectedCard.type === 'spell' ? 'Magia' : 'Armadilha'}</span></div>`
          }
        </div>
        <div class="tactical-effect-box-new">
          <h4>Efeito</h4>
          <p>${playerFacingEffect}</p>
        </div>
      </div>
    `;

    // Adiciona o botão de ativação se a função de callback for fornecida e a carta tiver um efeito de cemitério
    if (onActivateCallback && selectedCard.effect.includes('onGraveyardEffect')) {
      const activateBtn = document.createElement('button');
      activateBtn.classList.add('btn');
      activateBtn.textContent = 'Ativar Efeito';
      activateBtn.style.marginTop = '1rem';
      activateBtn.addEventListener('click', () => onActivateCallback(selectedCard));
      detailContainer.appendChild(activateBtn);
    }

    this.element.querySelector('.library-close-btn').addEventListener('click', () => this.hide());

    // Adiciona listeners para os filtros
    this.element.querySelector('#library-filter-name').addEventListener('input', (e) => {
      this.filters.name = e.target.value;
      this.render(title, cardList, selectedCardName, onActivateCallback);
    });
    this.element.querySelector('#library-filter-type').addEventListener('change', (e) => {
      this.filters.type = e.target.value;
      this.render(title, cardList, selectedCardName, onActivateCallback);
    });
    this.element.querySelector('#library-sort-by').addEventListener('change', (e) => {
      this.filters.sortBy = e.target.value;
      this.render(title, cardList, selectedCardName, onActivateCallback);
    });

    this.element.querySelectorAll('.library-card-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const cardName = e.currentTarget.dataset.cardName;
        this.render(title, cardList, cardName, onActivateCallback); // Re-renderiza com a nova carta selecionada
      });
    });
  }
}