# Pyramid GM401

Um remake, em Angular, do jogo **Pyramid** do relógio de pulso CASIO GM401. A proposta é recriar a experiência visual do portátil com um tabuleiro em SVG: enquanto óvnis ilustrativos cruzam o céu, os triângulos caem e a base de pessoas se desloca para construir uma pirâmide.

> Os óvnis são apenas elementos de ambientação. Eles sugerem de onde vêm os triângulos, mas não interferem na jogabilidade.

## Como jogar

Controle a base formada por quatro pessoas para receber os triângulos, chamados no código de **trijolos** ("tijolos" triangulares). Use as setas do teclado para mover a base e a pirâmide já montada:

| Tecla | Ação |
| --- | --- |
| `ArrowLeft` | Move a base para a esquerda |
| `ArrowRight` | Move a base para a direita |
| `Space` | Acelera a queda do trijolo atual |

Cada trijolo cai com uma pequena variação horizontal. Ao encontrar a base ou a estrutura já formada, ele deve se fixar em um encaixe válido; se ficar fora da área útil, desaparece. A meta é preencher uma pirâmide de quatro andares, alternando triângulos com o vértice para cima e para baixo.

Uma pirâmide totalmente preenchida possui **16 trijolos**:

- 1º andar: 7 trijolos (4 para cima e 3 para baixo);
- 2º andar: 5 trijolos (3 para cima e 2 para baixo);
- 3º andar: 3 trijolos (2 para cima e 1 para baixo);
- topo: 1 trijolo.

O jogo também pode terminar antes disso quando a estrutura não comportar outro encaixe, formando uma pirâmide “vazada”.

## Pontuação planejada

A regra de pontuação desejada é:

- 1 ponto para cada trijolo apoiado diretamente sobre as pessoas, com vértice para cima;
- 2 pontos para cada trijolo encaixado na pirâmide com vértice para baixo;
- bônus para cada um dos três primeiros andares completos;
- bônus extra para uma pirâmide formada apenas por 10 trijolos com vértice para cima;
- bônus máximo para a pirâmide completa, com 16 trijolos.

## Estado atual

O deslocamento da base pelas teclas `ArrowLeft` e `ArrowRight` já está implementado. A queda dos trijolos também está simulada no tabuleiro SVG, com variação no eixo horizontal.

O principal ponto em evolução é a detecção de colisão em `detectaColisao()`: ainda é necessário aperfeiçoar o pouso na base, a fixação na pirâmide e o deslizamento lateral — tanto para um trijolo cair fora quanto para encontrar um encaixe interno. Por isso, as regras completas de orientação, fim de jogo e bônus descritas acima representam o comportamento-alvo do remake.

## Tecnologias

- [Angular 18](https://angular.dev/) e TypeScript para a aplicação;
- SVG para o tabuleiro, os trijolos, as pessoas e os óvnis;
- Bootstrap 5 para estilos e componentes de interface;
- Angular SSR com Express para renderização no servidor;
- Karma e Jasmine para testes unitários.

## Estrutura da lógica do jogo

O núcleo está em [`src/app/jogo/jogo.component.ts`](src/app/jogo/jogo.component.ts). O componente controla o ciclo de queda, eventos do teclado, visibilidade dos elementos SVG e a pontuação. A classe [`Trijolo`](src/app/jogo/trijolo.ts) representa o triângulo que está caindo, enquanto `Piramide` mantém as posições ocupadas da construção.

O tabuleiro está em [`src/app/jogo/jogo.component.html`](src/app/jogo/jogo.component.html): cada posição de triângulo é um `<polygon>` SVG previamente definido. A animação é feita ao ocultar o triângulo da posição anterior e exibir o da próxima posição na matriz do tabuleiro.

## Como executar

### Pré-requisitos

- Node.js (recomenda-se uma versão LTS compatível com Angular 18);
- npm.

### Instalação e servidor de desenvolvimento

```bash
npm install
npm start
```

Abra `http://localhost:4200/` no navegador. A aplicação é recarregada automaticamente ao alterar os arquivos-fonte.

### Outros comandos

```bash
# Gerar a versão de produção em dist/pyramid-gm401
npm run build

# Executar os testes unitários
npm test

# Acompanhar builds de desenvolvimento
npm run watch

# Servir a aplicação SSR depois de gerar o build
npm run serve:ssr:PyramidGM401
```

## Contribuições

Contribuições são bem-vindas, em especial para a física/colisão dos trijolos, os encaixes por orientação, as condições de fim de jogo e a pontuação com bônus. Antes de enviar uma mudança, execute `npm run build` e, quando aplicável, `npm test`.
