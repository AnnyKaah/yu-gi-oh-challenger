export class Background {
  constructor(type) {
    this.type = type;
  }

  render() {
    const svg = document.createElement('img');
    svg.src = `assets/svg/${this.type}.svg`;
    svg.alt = `${this.type} background`;
    svg.classList.add('background-svg');
    return svg;
  }
}
