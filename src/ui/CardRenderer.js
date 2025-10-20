/**
 * Cria um elemento HTML completo para uma carta TCG a partir dos dados fornecidos.
 * @param {object} cardData - O objeto de dados da carta, vindo de cards.json.
 * @returns {HTMLElement} O elemento div da carta totalmente renderizado.
 */
export function createCardElement(cardData) {
  const cardContainer = document.createElement('div');
  cardContainer.classList.add('card-render-container', cardData.type); // Adiciona a classe do tipo (monster, spell, trap)

  // Nome da Carta
  const cardName = document.createElement('div');
  cardName.classList.add('card-render-name');
  cardName.textContent = cardData.name;

  // Nível (Apenas para monstros)
  const levelStars = document.createElement('div');
  levelStars.classList.add('card-render-level-stars');
  if (cardData.type === 'monster') {
    for (let i = 0; i < cardData.level; i++) {
      // Usando um emoji de estrela como fallback para a imagem ausente
      const star = document.createElement('span');
      star.textContent = '⭐';
      levelStars.appendChild(star);
    }
  }

  // Arte da Carta
  const cardArt = document.createElement('div');
  cardArt.classList.add('card-render-art');
  const artImg = document.createElement('img');
  // Assumindo que a arte está em uma pasta separada para não confundir com as imagens de cartas completas
  artImg.src = `assets/img/images_cards/${cardData.image}`; 
  cardArt.appendChild(artImg);

  // Descrição / Efeito
  const cardDescription = document.createElement('div');
  cardDescription.classList.add('card-render-description');
  
  const typeLine = document.createElement('p');
  typeLine.classList.add('type-line');
  if (cardData.type === 'monster') {
    // Verifica se 'tags' existe antes de usar.
    const monsterType = cardData.tags?.find(t => 
      ['dragon', 'warrior', 'beast', 'guardian', 'reptile', 'phantom', 'runner', 'colossus'].includes(t)
    ) || 'Ciberso';
    typeLine.textContent = `[ ${monsterType.charAt(0).toUpperCase() + monsterType.slice(1)} / Efeito ]`;
  }
  
  const effectText = document.createElement('p');
  effectText.classList.add('effect-text');
  effectText.textContent = cardData.effect.replace(/\s?\(.*\)/, '').trim();

  cardDescription.appendChild(typeLine);
  cardDescription.appendChild(effectText);

  // ATK/DEF (Apenas para monstros)
  const cardStats = document.createElement('div');
  cardStats.classList.add('card-render-stats');
  if (cardData.type === 'monster') {
    cardStats.innerHTML = `
      <span>ATK / ${cardData.atk}</span>
      <span>DEF / ${cardData.def}</span>
    `;
  }

  // Monta a carta
  cardContainer.append(cardName, levelStars, cardArt, cardDescription, cardStats);

  return cardContainer;
}