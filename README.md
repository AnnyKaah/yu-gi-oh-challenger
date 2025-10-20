# Cyber Nexus

![License](https://img.shields.io/badge/license-MIT-blue.svg)

> Um jogo de cartas estratégico inspirado em Yu-Gi-Oh!, construído com JavaScript puro e uma IA desafiadora, como parte de um desafio de bootcamp.

---

<p align="center">
  <a href="#-sobre-o-projeto">Sobre</a> •
  <a href="#-demonstracao">Demonstração</a> •
  <a href="#-funcionalidades-principais">Funcionalidades</a> •
  <a href="#-destaques-técnicos">Destaques Técnicos</a> •
  <a href="#-o-que-aprendi">O Que Aprendi</a> •
  <a href="#-como-executar-o-projeto">Como Executar</a> •
  <a href="#-tecnologias-utilizadas">Tecnologias</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

---

## 🚀 Sobre o Projeto

**Cyber Nexus** é um jogo de cartas colecionáveis (TCG) totalmente funcional, desenvolvido do zero com JavaScript, HTML e CSS. O projeto mergulha em um universo cyberpunk onde "Executores" duelam contra IAs renegadas pelo controle de uma realidade digital fraturada.

O objetivo principal foi criar uma experiência de duelo completa, com um motor de jogo robusto, uma interface de usuário interativa e uma inteligência artificial que oferece um desafio real em diferentes níveis de dificuldade.

---

## 🎥 Demonstração

*Um GIF de alta qualidade mostrando o gameplay: a tela inicial, o cara-ou-coroa, uma invocação, um ataque e a tela de vitória/derrota.*

![Gameplay GIF](assets/img/gameplay.gif)

**[🔗 Link para a demonstração ao vivo](https://annykaah.github.io/yu-gi-oh-challenger/)**

---

## 💡 Destaques Técnicos

-   **Motor de Jogo Modular:** O núcleo do jogo é desacoplado da interface. O `GameController` orquestra as regras, enquanto classes como `Player`, `AIController` e `EffectEngine` gerenciam suas próprias responsabilidades, facilitando a manutenção e expansão.
-   **IA com Estratégia Adaptativa:** A inteligência artificial não se baseia em jogadas aleatórias. Ela analisa o campo, prioriza alvos com base na dificuldade e utiliza cartas de efeito de forma tática para criar um desafio real.
-   **Sistema de Efeitos Dinâmico:** O `EffectEngine` interpreta strings do `cards.json` para invocar funções específicas. Isso permite adicionar novas cartas e efeitos complexos sem precisar alterar o motor principal do jogo.
-   **Gerenciamento de Estado e Sincronização:** O projeto lida com desafios de sincronia entre a lógica do jogo, animações e atualizações da UI. O uso de `requestAnimationFrame` foi crucial para resolver *race conditions* e garantir que o tutorial e as animações ocorram na ordem correta, após a renderização do navegador.
-   **UI Reativa sem Frameworks:** Toda a interface, do tabuleiro à mão do jogador, é renderizada e atualizada dinamicamente através de manipulação direta do DOM, demonstrando um controle profundo sobre o ciclo de vida dos componentes visuais.

---

## 🧠 O Que Aprendi

Desenvolver o Cyber Nexus foi uma jornada de aprendizado intenso, solidificando conceitos cruciais:

-   **Gerenciamento de Estado Complexo:** Aprendi a controlar um estado de jogo com múltiplas variáveis (fases do turno, pontos de vida, cartas na mão, monstros no campo, efeitos ativos) usando apenas JavaScript puro, sem bibliotecas de gerenciamento de estado.
-   **Programação Assíncrona na Prática:** Lidar com animações (`setTimeout`, `async/await`) e o ciclo de renderização do navegador (`requestAnimationFrame`) me ensinou a importância de sincronizar a lógica para evitar bugs e garantir uma experiência de usuário fluida.
-   **Arquitetura de Software e Modularização:** A necessidade de separar a lógica do jogo (`core`) da sua apresentação visual (`ui`) tornou-se evidente. Criar classes com responsabilidades únicas, como o `GameController` e o `EffectEngine`, foi fundamental para manter o código organizado e escalável.
-   **Design de Algoritmos para IA:** Desenvolvi algoritmos para a tomada de decisão da IA, desde a escolha do melhor monstro para atacar até o uso estratégico de cartas de magia, aprendendo a balancear a dificuldade e a "inteligência" do oponente.

---

## ✨ Funcionalidades Principais

-   🎮 **Motor de Jogo Completo:** Ciclo de jogo baseado em fases (Draw, Main 1, Battle, Main 2, End) com regras de Invocação-Normal e por Tributo.
-   🤖 **IA com Múltiplas Dificuldades:** Três níveis de IA (Fácil, Normal, Difícil) que adaptam suas estratégias, desde jogadas simples até o uso tático de cartas.
-   🃏 **Sistema de Cartas e Efeitos:** Implementação de efeitos de monstros, magias e armadilhas com gatilhos específicos (invocação, ataque, destruição).
-   🎨 **UI Interativa e Animações:** Interface dinâmica com feedback visual claro para todas as ações, incluindo animações de ataque, destruição, dano e compra de cartas.
-   📚 **Gerenciamento de Coleção:** Funcionalidades de Loja para comprar pacotes de cartas e um Montador de Deck para personalizar sua estratégia.
-   🎓 **Tutorial Interativo:** Um guia passo a passo que ensina as mecânicas básicas do jogo para novos jogadores.
-   🔊 **Áudio Imersivo:** Efeitos sonoros para ações importantes que enriquecem a experiência de jogo.

---

## 🛠️ Tecnologias Utilizadas

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)

O projeto foi construído utilizando apenas tecnologias web fundamentais, sem o uso de frameworks, para demonstrar um profundo conhecimento de JavaScript, manipulação do DOM e gerenciamento de estado.

### Tecnologias Detalhadas

-   **JavaScript (ES6+):** Utilizado para toda a lógica do jogo, incluindo o motor de regras, a inteligência artificial, a manipulação do DOM e o gerenciamento de estado da aplicação.
-   **HTML5:** Estruturação semântica do tabuleiro, dos menus e de todos os componentes da interface do usuário.
-   **CSS3:** Responsável por todo o design visual, layout responsivo (Flexbox), e pelas animações complexas (ataques, destruição de cartas, transições de fase) que dão vida ao jogo.

### Estrutura do Código

O código-fonte é organizado de forma modular para separar as responsabilidades:

-   `src/core/`: Contém a lógica central do jogo, como `GameController.js`, `Player.js`, e `AIController.js`.
-   `src/ui/`: Responsável por todos os componentes visuais e a manipulação do DOM, como `Board.js` e `HUD.js`.
-   `src/EffectEngine.js`: Um motor dedicado que interpreta e executa os efeitos das cartas, desacoplando essa lógica do `GameController`.
-   `cards.json`: Um arquivo de dados que serve como "banco de dados" para todas as cartas, permitindo fácil adição e modificação de cartas sem alterar o código principal.

---

## ⚙️ Como Executar o Projeto

Como este projeto é construído com tecnologias web puras, não há necessidade de um processo de build complexo.

1. Clone o repositório:
   ```bash
   git clone https://github.com/AnnyKaah/yu-gi-oh-challenger.git
   ```
2. Navegue até o diretório do projeto:
   ```bash
   cd cyber-nexus
   ```
3. Abra o arquivo `index.html` em seu navegador de preferência.
   - Para uma melhor experiência, recomenda-se usar uma extensão como o **Live Server** no VS Code para servir os arquivos localmente.

---

## 🗺️ Roadmap

- [ ] **Expandir o Motor de Efeitos:** Implementar um sistema de "chain" (corrente) para resolução de efeitos múltiplos e adicionar mais gatilhos.
- [ ] **Aprimorar a IA:** Ensinar a IA a usar efeitos de monstros de forma estratégica e a reconhecer combos.
- [ ] **Salvar Estado do Jogo:** Utilizar o `localStorage` para salvar o progresso de um duelo em andamento.
- [ ] **Modo Multiplayer (P2P):** Explorar tecnologias como WebRTC para permitir duelos entre jogadores.

---

## 🎯 Contexto do Projeto

Este projeto foi desenvolvido como parte do desafio final do bootcamp **"Front-end do Zero #2"** da **Digital Innovation One (DIO)** em parceria com a **Ri Happy**. O objetivo era criar um jogo de cartas inspirado em Yu-Gi-Oh!, aplicando os conceitos de desenvolvimento front-end aprendidos durante o curso.

---

## 👨‍💻 Autor

**Anny Karoline**

- LinkedIn: `https://www.linkedin.com/in/annykarolinedecarvalhomartins/`
- GitHub: `https://github.com/AnnyKaah/`

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

---