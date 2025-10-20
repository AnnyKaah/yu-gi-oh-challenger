export class AudioController {
  constructor() {
    this.sounds = {
      'random-tick': new Audio('sounds/random-tick.mp3'),
      'choice-reveal': new Audio('sounds/choice-reveal.mp3'),
      'start-duel': new Audio('sounds/start-duel.mp3'),
      'attack': new Audio('sounds/attack.mp3'),
      'damage': new Audio('sounds/damage.mp3'),
      'click': new Audio('sounds/click.mp3'),
      'win': new Audio('sounds/win.mp3'),
      'lose': new Audio('sounds/lose.mp3'),
    };
    this.sounds['random-tick'].loop = true;
    this.sounds['random-tick'].volume = 0.5;
  }

  play(soundName) {
    if (this.sounds[soundName]) {
      this.sounds[soundName].currentTime = 0;
      this.sounds[soundName].play();
    }
  }

  stop(soundName) {
    if (this.sounds[soundName]) {
      this.sounds[soundName].pause();
      this.sounds[soundName].currentTime = 0;
    }
  }
}