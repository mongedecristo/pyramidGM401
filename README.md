# 🛸 Pyramid GM401

Uma versão web, feita em Angular, do **Pyramid** do relógio Casio GM-401. A ideia é simples e gostosa de jogar: mova a base de quatro pessoas, receba os triângulos que caem do céu e tente montar a maior pirâmide possível. ⏱️🔺

Os OVNIs estão ali pelo clima — eles não alteram as regras. 👽

## 🎮 Como jogar

| Tecla | Faz o quê? |
| --- | --- |
| `←` | Move a base e a pirâmide para a esquerda |
| `→` | Move a base e a pirâmide para a direita |
| `Espaço` | Faz o triângulo atual cair de uma vez |

Os triângulos (carinhosamente chamados no código de **trijolos**) caem em posições aleatórias. Quando encontram um encaixe válido, eles podem deslizar um pouco para o lado e se acomodar na pirâmide. Se caírem fora, você perde uma vida.

Você começa com **3 vidas**. A partida acaba quando elas chegam a zero ou quando não existe mais nenhum encaixe possível na pirâmide.

## 🧱 A missão

A pirâmide tem quatro andares e **16 encaixes** no total:

| Andar | Trijolos |
| --- | ---: |
| Base | 7 |
| 2º andar | 5 |
| 3º andar | 3 |
| Topo | 1 |

Os triângulos alternam entre ponta para cima e ponta para baixo. Os que apontam para baixo precisam dos vizinhos certos para ter apoio; os de ponta para cima formam a estrutura que permite subir de andar. Dá para fechar uma pirâmide completa ou terminar com uma versão “vazada”.

## 🏆 Pontuação

| Evento | Pontos |
| --- | ---: |
| Trijolo com ponta para cima | +1 |
| Trijolo com ponta para baixo | +2 |
| Base completa | +10 |
| 2º andar completo | +20 |
| 3º andar completo | +30 |
| Pirâmide vazada só com pontas para cima | +50 |
| Pirâmide completa | +100 |

Os bônus são concedidos uma única vez por partida. Boa sorte para chegar ao topo! ✨

## 🚀 Rodando o projeto

Você vai precisar do [Node.js](https://nodejs.org/) (de preferência uma versão LTS compatível com Angular 18) e do npm.

```bash
npm install
npm start
```

Depois, abra [http://localhost:4200](http://localhost:4200) no navegador. As alterações no código recarregam a aplicação automaticamente.

### Outros comandos úteis

```bash
# Gerar a versão de produção em dist/pyramid-gm401
npm run build

# Rodar os testes unitários
npm test

# Acompanhar builds de desenvolvimento
npm run watch

# Servir a versão SSR após gerar o build
npm run serve:ssr:PyramidGM401
```

## 🧰 Feito com

- [Angular 18](https://angular.dev/) e TypeScript;
- SVG para o tabuleiro, os trijolos, as pessoas e os OVNIs;
- Bootstrap 5 para a interface;
- Angular SSR + Express;
- Karma e Jasmine nos testes.

## 🗂️ Onde fica cada coisa?

- [`src/app/jogo/jogo.component.ts`](src/app/jogo/jogo.component.ts): controla teclado, queda, vidas, placar e o ciclo da partida.
- [`src/app/jogo/piramide.ts`](src/app/jogo/piramide.ts): concentra as regras dos encaixes, do apoio entre trijolos e dos estados da pirâmide.
- [`src/app/jogo/trijolo.ts`](src/app/jogo/trijolo.ts): representa o triângulo que está caindo.
- [`src/app/jogo/jogo.component.html`](src/app/jogo/jogo.component.html): contém o tabuleiro SVG.

## 🤝 Contribuições

Ideias, correções e melhorias são bem-vindas! Antes de enviar uma mudança, rode `npm run build` e, quando fizer sentido, `npm test`. 🎯
