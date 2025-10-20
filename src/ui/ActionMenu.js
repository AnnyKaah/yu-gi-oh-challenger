// src/ui/ActionMenu.js (Novo Arquivo)
export class ActionMenu {
  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('action-menu', 'hidden');
    document.body.appendChild(this.element);

    // Adiciona um listener para fechar o menu ao clicar fora dele
    document.addEventListener('click', (e) => {
      if (this.isVisible() && !this.element.contains(e.target)) {
        this.hide();
      }
    });
  }

  /**
   * Mostra o menu de ação com opções específicas.
   * @param {Array<{label: string, callback: function, disabled?: boolean}>} options - As opções a serem exibidas.
   * @param {MouseEvent} event - O evento de clique que acionou o menu, para posicionamento.
   */
  show(options, event) {
    // Impede que o clique que abriu o menu o feche imediatamente
    event.stopPropagation();

    this.element.innerHTML = '';

    if (!options || options.length === 0) {
      this.hide();
      return;
    }

    options.forEach(option => {
      const button = document.createElement('button');
      button.textContent = option.label;
      if (option.disabled) {
        button.disabled = true;
      }
      button.addEventListener('click', (e) => {
        e.stopPropagation(); // Impede que o clique no botão se propague para outros elementos
        if (option.callback) {
          option.callback();
        }
        this.hide();
      });
      this.element.appendChild(button);
    });

    this.element.classList.remove('hidden');
    this.positionMenu(event);
  }

  positionMenu(event) {
    // Posiciona o menu perto do cursor do mouse
    const menuWidth = this.element.offsetWidth;
    const menuHeight = this.element.offsetHeight;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let left = event.clientX + 10;
    let top = event.clientY + 10;

    // Ajusta para não sair da tela
    if (left + menuWidth > screenWidth) {
      left = event.clientX - menuWidth - 10;
    }
    if (top + menuHeight > screenHeight) {
      top = event.clientY - menuHeight - 10;
    }

    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
  }

  hide() {
    this.element.classList.add('hidden');
  }

  isVisible() {
    return !this.element.classList.contains('hidden');
  }
}
