import { Card } from './Card.js';

export class Player {
  constructor(name, allCards) {
    this.name = name;
    this.cardPool = allCards; // O conjunto de cartas a partir do qual o deck é construído
    this.lifePoints = 8000;
    this.deck = [];
    this.hasNormalSummoned = false; // Rastreia a Invocação-Normal do turno
    this.hand = [];
    this.graveyard = [];
    this.field = {
      monsters: [null, null, null, null, null],
      spellTraps: [null, null, null, null, null],
    };
  }

  buildDeck(forcedCards = null) {
    if (forcedCards) {
      // Modo Tutorial: usa cartas específicas
      this.deck = forcedCards.map(cardName => {
        const cardData = this.cardPool.find(c => c.name === cardName);
        return new Card(cardData);
      });
    } else {
      const savedDeck = localStorage.getItem('cyberNexusPlayerDeck');
      if (savedDeck) {
        // Se houver um deck salvo, usa ele
        const deckList = JSON.parse(savedDeck);
        this.deck = deckList.map(cardName => {
          const cardData = this.cardPool.find(c => c.name === cardName);
          return new Card(cardData);
        });
      } else {
        // Se não, cria um "Deck Inicial" equilibrado como fallback
        const starterDeckList = [
          // Monstros de Nível Baixo (10)
          'Core Guardian', 'Core Guardian',
          'Net Runner Enigmático', 'Net Runner Enigmático',
          'Lagarto Corrompido por Glitch', 'Lagarto Corrompido por Glitch',
          'Banshee da Rede', 'Banshee da Rede',
          'Phantom Sentinel', 'Phantom Sentinel',
          // Monstros de Nível Médio (4)
          'Golem Protetor de Dados', 'Golem Protetor de Dados',
          'Entidade Invasora Vortex', 'Entidade Invasora Vortex',
          // Monstros de Nível Alto (2)
          'Colosso de Batalha', 'Colosso de Batalha',
          // Magias (4)
          'Protocolo Overclock', 'Protocolo Overclock',
          'Recuperação de Dados', 'Acessar Arquivos',
          // Armadilhas (2)
          'Botão de Pânico', 'Firewall de Emergência'
        ];
        this.deck = starterDeckList.map(cardName => new Card(this.cardPool.find(c => c.name === cardName)));
      }
    }
    // **CORREÇÃO**: Embaralha o deck apenas se não for um deck forçado (tutorial).
    if (!forcedCards) {
      this.deck.sort(() => Math.random() - 0.5);
    }

    console.log(`${this.name} montou o deck.`);
  }

  drawInitialHand() {
    for (let i = 0; i < 5; i++) {
      this.drawCard();
    }
    console.log(`${this.name} comprou a mão inicial.`);
  }

  drawCard() {
    if (this.deck.length > 0) {
      this.hand.push(this.deck.pop());
    } else {
      console.log(`${this.name} não tem mais cartas para comprar!`);
      // Lógica de derrota por deck out
    }
  }

  summonMonster(cardIndex, fieldSlot, tributes = []) {
    // Regra: Apenas uma Invocação-Normal por turno
    if (this.hasNormalSummoned && !this.isTutorial) { // Ignora a regra durante o tutorial
      console.log("Você já realizou sua Invocação-Normal neste turno.");
      return false;
    }

    const card = this.hand[cardIndex];
    if (!card) return false;

    // Regra de Tributo
    const requiredTributes = card.level >= 7 ? 2 : (card.level >= 5 ? 1 : 0);
    if (tributes.length < requiredTributes) {
      console.log(`São necessários ${requiredTributes} tributos para invocar ${card.name}.`);
      return false;
    }

    // Envia os tributos para o cemitério
    tributes.forEach(tributeSlot => {
      this.graveyard.push(this.field.monsters[tributeSlot]);
      this.field.monsters[tributeSlot] = null;
    });

    // Verifica se o slot do campo está vazio
    if (this.field.monsters[fieldSlot] === null) {
      if (card && card.type === 'monster') {
        // Adiciona propriedades de estado ao monstro no campo
        const monsterOnField = {
          ...card,
          hasAttacked: false,
          canChangePosition: false, // Regra correta: não pode mudar de posição no turno em que foi invocado.
          position: 'attack', // Por padrão, invoca em modo de ataque
        };
        this.field.monsters[fieldSlot] = monsterOnField; // Move a carta para o campo
        this.hand.splice(cardIndex, 1); // Remove a carta da mão
        this.hasNormalSummoned = true; // Marca que a Invocação-Normal foi usada
        // A notificação agora será feita pelo GameController
        return true; // Invocação bem-sucedida
      }
    }
    console.log(`Não foi possível invocar na zona ${fieldSlot}.`);
    return false; // Falha na invocação
  }

  setMonster(cardIndex, fieldSlot) {
    // Regra: Baixar um monstro também conta como sua Invocação-Normal do turno.
    if (this.hasNormalSummoned && !this.isTutorial) { // Ignora a regra durante o tutorial
      console.log("Você já realizou sua Invocação-Normal neste turno.");
      return false;
    }
    if (this.field.monsters[fieldSlot] === null) {
      const card = this.hand[cardIndex];
      if (card && card.type === 'monster') {
        const monsterOnField = { 
          ...card, 
          isFaceDown: true, 
          position: 'defense',
          canChangePosition: false, // Regra correta: não pode mudar de posição no turno em que foi baixado.
        };
        this.field.monsters[fieldSlot] = monsterOnField;
        this.hand.splice(cardIndex, 1);
        this.hasNormalSummoned = true;
        return true;
      }
    }
    return false;
  }

  setSpellTrap(cardIndex, fieldSlot) {
    if (this.field.spellTraps[fieldSlot] === null) {
      const card = this.hand[cardIndex];
      if (card && (card.type === 'spell' || card.type === 'trap')) {
        const cardOnField = {
          ...card,
          isFaceDown: true,
        };
        this.field.spellTraps[fieldSlot] = cardOnField;
        this.hand.splice(cardIndex, 1);
        return true;
      }
    }
    return false;
  }

  takeDamage(amount) {
    this.lifePoints -= amount;
    if (this.lifePoints <= 0) {
      this.lifePoints = 0;
    }
    console.log(`${this.name} tomou ${amount} de dano. LP restantes: ${this.lifePoints}`);
  }

  hasLost() {
    return this.lifePoints <= 0;
  }

  changeMonsterPosition(fieldSlot) {
    const monster = this.field.monsters[fieldSlot];
    if (monster && monster.canChangePosition) {
      monster.position = (monster.position === 'attack') ? 'defense' : 'attack';
      monster.canChangePosition = false; // Só pode mudar uma vez por turno
      return true;
    }
    console.log(`Não foi possível mudar a posição de ${monster?.name}.`);
    return false;
  }
}
