export class HelpMenu {
  constructor(libraryComponent) {
    this.library = libraryComponent;
    this.element = document.createElement('div');
    this.element.classList.add('help-menu-overlay', 'hidden');
    this.element.innerHTML = `
      <div class="help-menu-modal">
        <button class="help-menu-close-btn">&times;</button>
        <h2 class="help-menu-title">Menu de Ajuda</h2>
        <div class="help-menu-content"></div>
      </div>
    `;
    document.body.appendChild(this.element);

    this.contentElement = this.element.querySelector('.help-menu-content');
    
    this.element.querySelector('.help-menu-close-btn').addEventListener('click', () => this.hide());
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.hide();
      }
    });
  }

  show() {
    this.showMainView();
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }

  showMainView() {
    this.element.querySelector('.help-menu-title').textContent = 'Menu de Ajuda';
    this.contentElement.innerHTML = `
      <button class="btn help-menu-btn" data-action="library">Consultar Biblioteca de Cartas</button>
      <button class="btn help-menu-btn" data-action="faq">Dúvidas Frequentes (FAQ)</button>
    `;
    this.contentElement.querySelector('[data-action="library"]').addEventListener('click', () => {
      this.hide();
      this.library.show();
    });
    this.contentElement.querySelector('[data-action="faq"]').addEventListener('click', () => {
      this.showFaqView();
    });
  }

  showFaqView() {
    this.element.querySelector('.help-menu-title').textContent = 'Dúvidas Frequentes';
    this.contentElement.innerHTML = `
      <div class="faq-section accordion">
        <div class="faq-item">
          <div class="faq-question">
            <span>Como eu invoco monstros de Nível 5 ou maior?</span>
            <i data-feather="chevron-down"></i>
          </div>
          <div class="faq-answer">
            <p>A Invocação-Normal é uma ação que você pode fazer <strong>uma vez por turno</strong>. Para invocar um monstro de Nível 5 ou 6, você precisa ter 1 monstro no campo para usar como tributo. Para um de Nível 7 ou maior, como o <strong>Colosso de Batalha</strong>, você precisa de 2. A estratégia é construir seu campo turno após turno, protegendo seus monstros para usá-los como sacrifício para suas cartas mais poderosas.</p>
          </div>
        </div>
        <div class="faq-item">
          <div class="faq-question">
            <span>Quando posso atacar?</span>
            <i data-feather="chevron-down"></i>
          </div>
          <div class="faq-answer">
            <p>Você pode entrar na Fase de Batalha e atacar a partir do seu <strong>segundo turno</strong>. O jogador que começa o duelo não pode atacar no seu primeiro turno.</p>
          </div>
        </div>
        <div class="faq-item">
          <div class="faq-question">
            <span>O que acontece quando monstros com o mesmo ATK batalham?</span>
            <i data-feather="chevron-down"></i>
          </div>
          <div class="faq-answer">
            <p>Se dois monstros em Posição de Ataque batalham e seus valores de ATK são idênticos, <strong>ambos são destruídos</strong>. Neste cenário, nenhum jogador sofre dano nos Pontos de Vida. É uma "troca" no campo onde ambos os lados perdem um recurso.</p>
          </div>
        </div>
        <div class="faq-item">
          <div class="faq-question">
            <span>Como mudo a posição de um monstro?</span>
            <i data-feather="chevron-down"></i>
          </div>
          <div class="faq-answer">
            <p>Durante a sua Fase Principal, clique em um monstro que você controla no campo. Um menu de ações aparecerá, permitindo que você escolha a opção para mudar sua posição entre Ataque e Defesa. Lembre-se que você só pode mudar a posição de cada monstro uma vez por turno.</p>
          </div>
        </div>
        <div class="faq-item">
          <div class="faq-question">
            <span>Qual a diferença entre Cartas de Magia e Armadilha?</span>
            <i data-feather="chevron-down"></i>
          </div>
          <div class="faq-answer">
            <p><strong>Cartas de Magia (Spells)</strong>, como <strong>Acessar Arquivos</strong>, geralmente podem ser ativadas da sua mão durante a sua Fase Principal para efeitos imediatos.<br><br><strong>Cartas de Armadilha (Traps)</strong>, como <strong>Botão de Pânico</strong>, precisam ser "baixa-das" (colocadas viradas para baixo) primeiro. Elas só podem ser ativadas a partir do turno seguinte, mas têm a vantagem de poderem ser usadas durante o turno do oponente para surpreendê-lo e interromper suas jogadas.</p>
          </div>
        </div>
      </div>
      <button class="btn help-menu-btn" data-action="back">Voltar</button>
    `;
    feather.replace(); // Renderiza os ícones de seta
    this.contentElement.querySelector('[data-action="back"]').addEventListener('click', () => this.showMainView());

    // Adiciona a lógica do acordeão
    this.contentElement.querySelectorAll('.faq-question').forEach(question => {
      question.addEventListener('click', () => {
        const faqItem = question.parentElement;
        faqItem.classList.toggle('active');
      });
    });
  }
}