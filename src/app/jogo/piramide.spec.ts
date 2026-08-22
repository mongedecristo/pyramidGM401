import {} from 'jasmine';
import { Piramide } from './piramide';
import { Andar } from '../shared/types';

/**
 * As regras de encaixe da pirâmide, exercitadas sem DOM. São elas que definem
 * o jogo: apoio (quem sustenta quem), soterramento (o que ainda é alcançável) e
 * os estados de pirâmide cheia, que encerram a partida.
 */
describe('Piramide', () => {
  const EIXO = 4; // par, como o componente garante

  type Encaixe = [Andar, number];

  /** Os 10 encaixes de vértice pra cima, na ordem em que podem ser montados. */
  const SO_PARA_CIMA: Encaixe[] = [
    ['terreo', 0], ['terreo', 2], ['terreo', 4], ['terreo', 6],
    ['segundoAndar', 0], ['segundoAndar', 2], ['segundoAndar', 4],
    ['terceiroAndar', 0], ['terceiroAndar', 2],
    ['quartoAndar', 0],
  ];

  const todos = (): Encaixe[] => Piramide.ANDARES.flatMap((def) =>
    Array.from({ length: def.largura }, (_, i) => [def.andar, i] as Encaixe));

  let p: Piramide;
  beforeEach(() => { p = new Piramide({ eixoX: EIXO }); });

  const poe = (andar: Andar, i: number) => p.colocar(p.posicaoDe(andar, i));
  const pode = (andar: Andar, i: number) => p.podeColocar(p.posicaoDe(andar, i));
  const poeTodos = (encaixes: Encaixe[]) => encaixes.forEach(([a, i]) => poe(a, i));

  it('tem 16 encaixes, 10 de vértice pra cima e 6 pra baixo', () => {
    const cima = todos().filter(([, i]) => Piramide.paraCima(i));
    expect(todos().length).toBe(16);
    expect(cima.length).toBe(10);
    expect(todos().length - cima.length).toBe(6);
  });

  it('deriva a orientação do encaixe igual à célula do SVG', () => {
    // Na matriz, vértice pra cima ⟺ (linha + coluna) ímpar. Dentro de um andar,
    // isso tem de coincidir com "índice par".
    for (const [andar, i] of todos()) {
      const pos = p.posicaoDe(andar, i);
      expect((pos.linha + pos.coluna) % 2 !== 0)
        .withContext(`${andar}[${i}]`).toBe(Piramide.paraCima(i));
    }
  });

  it('mantém todo encaixe dentro da matriz para eixoX par de 0 a 8', () => {
    for (const eixo of [0, 2, 4, 6, 8]) {
      p.eixoX = eixo;
      for (const [andar, i] of todos()) {
        const coluna = p.posicaoDe(andar, i).coluna;
        expect(coluna).toBeGreaterThanOrEqual(0);
        expect(coluna).toBeLessThanOrEqual(14);
      }
    }
  });

  it('preserva a orientação dos encaixes ao deslocar eixoX de 2 em 2', () => {
    const assinatura = () => todos()
      .map(([andar, i]) => {
        const pos = p.posicaoDe(andar, i);
        return (pos.linha + pos.coluna) % 2 !== 0 ? '^' : 'v';
      }).join('');
    const referencia = assinatura();
    for (const eixo of [0, 2, 6, 8]) {
      p.eixoX = eixo;
      expect(assinatura()).withContext(`eixoX=${eixo}`).toBe(referencia);
    }
  });

  describe('apoio', () => {
    it('aceita qualquer vértice pra cima do térreo, sustentado pelas pessoas', () => {
      expect(pode('terreo', 0)).toBeTrue();
      expect(pode('terreo', 6)).toBeTrue();
    });

    it('recusa vértice pra baixo sem os dois vizinhos do mesmo andar', () => {
      expect(pode('terreo', 1)).toBeFalse();
      poe('terreo', 0);
      expect(pode('terreo', 1)).toBeFalse();
      poe('terreo', 2);
      expect(pode('terreo', 1)).toBeTrue();
    });

    it('recusa andar superior sem os dois vértices pra cima que o flanqueiam', () => {
      expect(pode('segundoAndar', 0)).toBeFalse();
      poe('terreo', 0);
      expect(pode('segundoAndar', 0)).toBeFalse();
      poe('terreo', 2);
      expect(pode('segundoAndar', 0)).toBeTrue();
    });

    it('não aceita nada flutuando numa pirâmide vazia, fora do térreo', () => {
      for (const [andar, i] of todos()) {
        if (andar === 'terreo' && Piramide.paraCima(i)) continue;
        expect(pode(andar, i)).withContext(`${andar}[${i}]`).toBeFalse();
      }
    });
  });

  describe('soterramento', () => {
    it('fecha um vão que tem apoio mas ficou coberto pelo andar de cima', () => {
      [0, 2, 4, 6].forEach((i) => poe('terreo', i));
      expect(pode('terreo', 1)).toBeTrue();
      poe('segundoAndar', 0); // assenta exatamente sobre terreo[1]
      expect(p.soterrado('terreo', 1)).toBeTrue();
      expect(pode('terreo', 1)).toBeFalse();
      expect(pode('terreo', 3)).toBeTrue();
    });

    it('nunca soterra um vértice pra cima que ainda falta', () => {
      poeTodos(SO_PARA_CIMA.slice(0, 9)); // tudo menos o topo
      expect(p.cheia).toBeFalse();
      expect(p.travada).toBeFalse();
      expect(pode('quartoAndar', 0)).toBeTrue();
    });
  });

  describe('estados de pirâmide cheia', () => {
    it('trata a vazada pura como cheia, travada e digna do bônus de vazada', () => {
      poeTodos(SO_PARA_CIMA);
      expect(p.cheia).toBeTrue();
      expect(p.cheiaSoParaCima).toBeTrue();
      expect(p.cheiaVazada).toBeTrue();
      expect(p.cheiaCompleta).toBeFalse();
      expect(p.travada).toBeTrue();
      expect(p.quantidadeParaBaixo).toBe(0);
      expect(p.faltamParaBaixo).toBe(6);
    });

    it('trata a vazada com alguns vértices pra baixo como cheia vazada sem bônus', () => {
      [0, 2, 4, 6].forEach((i) => poe('terreo', i));
      poe('terreo', 1); // um único vértice pra baixo
      poeTodos(SO_PARA_CIMA.slice(4));
      expect(p.cheia).toBeTrue();
      expect(p.cheiaVazada).toBeTrue();
      expect(p.cheiaSoParaCima).toBeFalse(); // não leva bônus de vazada
      expect(p.cheiaCompleta).toBeFalse();
      expect(p.travada).toBeTrue();
      expect(p.quantidadeParaBaixo).toBe(1);
    });

    it('fecha os 16 encaixes quando cada andar é completado antes do de cima', () => {
      let colocados = 0;
      for (const def of Piramide.ANDARES) {
        // Os vértices pra baixo do andar ANTES dos pra cima do andar de cima,
        // senão eles soterram.
        for (const paraCima of [true, false]) {
          for (let i = 0; i < def.largura; i++) {
            if (Piramide.paraCima(i) !== paraCima) continue;
            expect(poe(def.andar, i).colocado).withContext(`${def.andar}[${i}]`).toBeTrue();
            colocados++;
          }
        }
        expect(p.andarCompleto(def.andar)).withContext(def.andar).toBeTrue();
      }
      expect(colocados).toBe(16);
      expect(p.cheiaCompleta).toBeTrue();
      expect(p.cheia).toBeTrue();
      expect(p.travada).toBeTrue();
      expect(p.cheiaVazada).toBeFalse();
      expect(p.cheiaSoParaCima).toBeFalse();
    });

    it('não aceita mais nenhum trijolo depois de completa', () => {
      for (const def of Piramide.ANDARES) {
        for (const paraCima of [true, false]) {
          for (let i = 0; i < def.largura; i++) {
            if (Piramide.paraCima(i) === paraCima) poe(def.andar, i);
          }
        }
      }
      for (const [andar, i] of todos()) {
        expect(pode(andar, i)).withContext(`${andar}[${i}]`).toBeFalse();
      }
    });
  });

  it('sempre trava com o contorno de vértices pra cima fechado, em 300 partidas', () => {
    for (let partida = 0; partida < 300; partida++) {
      const jogo = new Piramide({ eixoX: EIXO });
      let colocados = 0;
      for (;;) {
        const livres = todos().filter(([andar, i]) => jogo.livreParaReceber(andar, i));
        if (livres.length === 0) break;
        const [andar, i] = livres[Math.floor(Math.random() * livres.length)];
        expect(jogo.colocar(jogo.posicaoDe(andar, i)).colocado).toBeTrue();
        colocados++;
        expect(colocados).toBeLessThanOrEqual(16);
      }
      // A partida acaba entre a vazada pura (10) e a completa (16), e sempre com
      // todos os vértices pra cima presentes — daí `travada` implicar `cheia`.
      expect(jogo.travada).toBeTrue();
      expect(jogo.cheia).toBeTrue();
      expect(colocados).toBeGreaterThanOrEqual(10);
      expect(colocados).toBeLessThanOrEqual(16);
      for (const [andar, i] of todos()) {
        if (Piramide.paraCima(i)) expect(jogo.ocupado(andar, i)).withContext(`${andar}[${i}]`).toBeTrue();
      }
    }
  });
});
