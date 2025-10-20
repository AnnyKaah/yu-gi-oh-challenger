export class ShopScreen {
  constructor(allCards, onExit) {
    this.allCards = allCards;
    this.onExit = onExit; // Callback para retornar ao menu principal
    this.element = document.createElement('div');
    this.element.classList.add('shop-overlay', 'hidden');
    document.body.appendChild(this.element);
  }

  show(allCards) {
    if (allCards) this.allCards = allCards;
    this.render();
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
    this.onExit();
  }

  render() {
    const credits = parseInt(localStorage.getItem('cyberNexusCredits') || '0', 10);
    this.element.innerHTML = `
      <div class="shop-modal">
        <button class="shop-close-btn">&times;</button>
        <h2 class="shop-title">Loja de Dados</h2>
        <div class="shop-credits">
          <span>Seus Créditos:</span>
          <span class="credit-amount">${credits}</span>
        </div>
        <div class="shop-content">
          <div class="pack-item">
            <h3>Pacote de Dados Alfa</h3>
            <p>Contém 5 cartas aleatórias do Nexus.</p>
            <button class="btn buy-pack-btn" data-cost="100">Comprar (100 Créditos)</button>
          </div>
        </div>
      </div>
    `;

    this.element.querySelector('.shop-close-btn').addEventListener('click', () => this.hide());
    this.element.querySelector('.buy-pack-btn').addEventListener('click', (e) => this.buyPack(e));
  }

  buyPack(event) {
    const cost = parseInt(event.target.dataset.cost, 10);
    let credits = parseInt(localStorage.getItem('cyberNexusCredits') || '0', 10);

    if (credits >= cost) {
      credits -= cost;
      localStorage.setItem('cyberNexusCredits', credits);

      // Gera 5 cartas aleatórias
      const pack = [...this.allCards].sort(() => 0.5 - Math.random()).slice(0, 5);
      const packNames = pack.map(card => card.name);

      // Adiciona as cartas à coleção do jogador
      const collection = JSON.parse(localStorage.getItem('cyberNexusPlayerCollection') || '[]');
      collection.push(...packNames);
      localStorage.setItem('cyberNexusPlayerCollection', JSON.stringify(collection));

      alert(`Você comprou um pacote e obteve:\n- ${packNames.join('\n- ')}`);
      this.render(); // Re-renderiza a loja para atualizar os créditos
    } else {
      alert('Créditos de Dados insuficientes!');
    }
  }
}