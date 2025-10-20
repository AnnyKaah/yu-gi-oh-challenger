export class ActionLog {
  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('action-log-panel');
    this.logContent = document.createElement('div');
    this.logContent.classList.add('action-log');
    this.element.appendChild(this.logContent);
    this.currentTurn = 0;
  }

  render() {
    return this.element;
  }

  add(data) {
    // Se o turno mudou, adiciona um divisor
    if (data.turn && data.turn !== this.currentTurn) {
      this.currentTurn = data.turn;
      const turnDivider = document.createElement('div');
      turnDivider.classList.add('log-entry', 'log-turn-divider');
      turnDivider.innerHTML = `<span>— TURNO ${this.currentTurn} —</span>`;
      this.logContent.appendChild(turnDivider);
      requestAnimationFrame(() => turnDivider.classList.add('visible'));
    }

    const logEntry = document.createElement('div');
    logEntry.classList.add('log-entry', `log-${data.type}`);

    const icons = {
      turn_start: '▶',
      turn_end: '■',
      draw: '🃏',
      summon: '✨',
      attack: '⚔️',
      destruction: '💥',
      damage: '💔',
      effect: '🔮',
      system: '⚙️'
    };

    const icon = icons[data.type] || '⚙️';
    let messageHTML = '';

    if (data.type === 'damage') {
      messageHTML = `<span class="log-message-main">${data.message}</span><span class="log-message-sub">LP: ${data.lp_before} ➔ ${data.lp_after}</span>`;
    } else {
      messageHTML = `<span class="log-message-main">${data.message}</span>`;
    }

    logEntry.innerHTML = `<span class="log-icon">${icon}</span> <div class="log-message-content">${messageHTML}</div>`;

    // Adiciona a nova entrada no topo
    this.logContent.appendChild(logEntry);

    // Anima a entrada
    requestAnimationFrame(() => {
      logEntry.classList.add('visible');
    });
    // Garante que o log role para a mensagem mais recente
    this.logContent.scrollTop = this.logContent.scrollHeight;
  }
}