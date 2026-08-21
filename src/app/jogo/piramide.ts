import { Posicao } from './jogo.component';

export type Andar = 'terreo' | 'segundoAndar' | 'terceiroAndar' | 'quartoAndar';

export interface DefinicaoAndar {
  andar: Andar;
  linha: number;
  offset: number;
  largura: number;
}

export interface Colocado {
  colocado: boolean;
  layer?: Andar;
  index?: number;
  posicao?: Posicao;
  paraCima?: boolean;
}

interface Encaixe {
  andar: Andar;
  index: number;
}

export class Piramide {

  /**
   * Os andares, do térreo ao topo. Cada andar é uma linha da matriz, começa uma
   * coluna à direita do andar de baixo e perde dois encaixes.
   *
   * Dentro de qualquer andar, índice PAR é sempre um triângulo de vértice pra
   * cima e índice ÍMPAR de vértice pra baixo. Isso decorre de `eixoX` ser
   * sempre par e de a matriz alternar a orientação a cada coluna e a cada
   * linha (verificado no SVG: `queops_7_00` e `queops_6_01` têm o vértice pra
   * cima; `queops_7_01` e `queops_6_00`, pra baixo). Daí os 16 encaixes se
   * distribuírem em 10 com vértice pra cima e 6 pra baixo.
   */
  public static readonly ANDARES: readonly DefinicaoAndar[] = [
    { andar: 'terreo',        linha: 7, offset: 0, largura: 7 },
    { andar: 'segundoAndar',  linha: 6, offset: 1, largura: 5 },
    { andar: 'terceiroAndar', linha: 5, offset: 2, largura: 3 },
    { andar: 'quartoAndar',   linha: 4, offset: 3, largura: 1 },
  ];

  colisao: boolean = false;
  eixoX!: number;
  quartoAndar: boolean =                   false;
  terceiroAndar: boolean[] =       [false, false, false];
  segundoAndar: boolean[] = [false, false, false, false, false];
  terreo: boolean[] = [false, false, false, false, false, false, false];

  constructor(init?: Partial<Piramide>) {
    Object.assign(this, init);
  }

  /** Índice par de um andar é sempre o triângulo de vértice pra cima. */
  public static paraCima(index: number): boolean {
    return index % 2 === 0;
  }

  /**
   * Verifica se uma posição (coluna) pertence horizontalmente à área da pirâmide.
   */
  public isColumnInside(coluna: number): boolean {
    return coluna >= this.eixoX && coluna <= (this.eixoX + 6);
  }

  /**
   * A base visual possui quatro pessoas e sustenta os sete encaixes da base da
   * pirâmide (dois extremos e cinco intervalos entre elas).
   */
  public isSupportedByPeople(posicao: Posicao): boolean {
    return posicao.linha === 7 && this.isColumnInside(posicao.coluna);
  }

  /** Célula da matriz correspondente a um encaixe do andar. */
  public posicaoDe(andar: Andar, index: number): Posicao {
    const def = Piramide.definicaoDe(andar);
    return { linha: def.linha, coluna: this.eixoX + def.offset + index };
  }

  /** Índices fora da faixa do andar contam como vazios. */
  public ocupado(andar: Andar, index: number): boolean {
    switch (andar) {
      case 'terreo':        return this.terreo[index] === true;
      case 'segundoAndar':  return this.segundoAndar[index] === true;
      case 'terceiroAndar': return this.terceiroAndar[index] === true;
      case 'quartoAndar':   return index === 0 && this.quartoAndar;
    }
  }

  public andarCompleto(andar: Andar): boolean {
    const def = Piramide.definicaoDe(andar);
    for (let i = 0; i < def.largura; i++) {
      if (!this.ocupado(andar, i)) return false;
    }
    return true;
  }

  /**
   * Verifica sem alterar o estado se um trijolo na posição informada pode ser
   * colocado no nível correto da pirâmide de acordo com a linha do SVG.
   */
  public podeColocar(posicao: Posicao): boolean {
    const encaixe = this.encaixeDe(posicao);
    if (!encaixe) return false;
    return this.livreParaReceber(encaixe.andar, encaixe.index);
  }

  /**
   * Um encaixe só aceita trijolo se estiver vazio, tiver apoio e ainda for
   * alcançável de cima. É o soterramento que cria as pirâmides travadas: o
   * trijolo desce interstício a interstício, então um vão coberto pelo
   * triângulo de cima nunca mais recebe nada, mesmo tendo apoio.
   */
  public livreParaReceber(andar: Andar, index: number): boolean {
    if (this.ocupado(andar, index)) return false;
    if (this.soterrado(andar, index)) return false;
    return this.temSuporte(andar, index);
  }

  /**
   * O encaixe imediatamente acima (mesma coluna, andar de cima) é o de índice
   * `index - 1`, porque cada andar começa uma coluna à direita do de baixo.
   * Ele tem sempre a orientação oposta: um vão de vértice pra baixo é soterrado
   * pelo triângulo de vértice pra cima que se apoia sobre ele.
   */
  public soterrado(andar: Andar, index: number): boolean {
    const acima = Piramide.andarAcima(andar);
    return acima !== undefined && this.ocupado(acima, index - 1);
  }

  /**
   * Tenta colocar o trijolo na pirâmide. Se conseguir, atualiza o estado interno
   * e retorna o nível e índice onde foi colocado.
   */
  public colocar(posicao: Posicao): Colocado {
    const encaixe = this.encaixeDe(posicao);
    if (!encaixe || !this.podeColocar(posicao)) return { colocado: false };

    this.marcar(encaixe.andar, encaixe.index);
    return {
      colocado: true,
      layer: encaixe.andar,
      index: encaixe.index,
      posicao: this.posicaoDe(encaixe.andar, encaixe.index),
      paraCima: Piramide.paraCima(encaixe.index),
    };
  }

  /**
   * As duas regras de apoio, que são as mesmas em todos os andares:
   *
   * - Vértice pra baixo: encunha-se no interstício entre os dois vizinhos de
   *   vértice pra cima do MESMO andar. Sem os dois, cairia pelo vão.
   * - Vértice pra cima: equilibra-se sobre os ápices dos dois triângulos de
   *   vértice pra cima que o flanqueiam no andar de baixo. Note que NÃO exige o
   *   triângulo de vértice pra baixo entre eles — é justamente isso que torna
   *   alcançável a pirâmide vazada, feita só de vértices pra cima.
   */
  private temSuporte(andar: Andar, index: number): boolean {
    if (!Piramide.paraCima(index)) {
      return this.ocupado(andar, index - 1) && this.ocupado(andar, index + 1);
    }
    const abaixo = Piramide.andarAbaixo(andar);
    if (!abaixo) return true; // térreo: sustentado pelas quatro pessoas
    return this.ocupado(abaixo, index) && this.ocupado(abaixo, index + 2);
  }

  private marcar(andar: Andar, index: number): void {
    switch (andar) {
      case 'terreo':        this.terreo[index] = true; break;
      case 'segundoAndar':  this.segundoAndar[index] = true; break;
      case 'terceiroAndar': this.terceiroAndar[index] = true; break;
      case 'quartoAndar':   this.quartoAndar = true; break;
    }
  }

  /** Traduz uma célula da matriz no encaixe da pirâmide que ela representa. */
  private encaixeDe(posicao: Posicao): Encaixe | undefined {
    for (const def of Piramide.ANDARES) {
      if (def.linha !== posicao.linha) continue;
      const index = posicao.coluna - this.eixoX - def.offset;
      if (index < 0 || index >= def.largura) return undefined;
      return { andar: def.andar, index };
    }
    return undefined;
  }

  private static definicaoDe(andar: Andar): DefinicaoAndar {
    return Piramide.ANDARES.find((def) => def.andar === andar)!;
  }

  private static andarAbaixo(andar: Andar): Andar | undefined {
    const i = Piramide.ANDARES.findIndex((def) => def.andar === andar);
    return i > 0 ? Piramide.ANDARES[i - 1].andar : undefined;
  }

  private static andarAcima(andar: Andar): Andar | undefined {
    const i = Piramide.ANDARES.findIndex((def) => def.andar === andar);
    return i < Piramide.ANDARES.length - 1 ? Piramide.ANDARES[i + 1].andar : undefined;
  }

  /** Percorre todos os encaixes da pirâmide, do térreo ao topo. */
  private *encaixes(): Generator<Encaixe> {
    for (const def of Piramide.ANDARES) {
      for (let index = 0; index < def.largura; index++) {
        yield { andar: def.andar, index };
      }
    }
  }

  /** Quantidade de trijolos de vértice pra baixo já encaixados. */
  get quantidadeParaBaixo(): number {
    let total = 0;
    for (const e of this.encaixes()) {
      if (!Piramide.paraCima(e.index) && this.ocupado(e.andar, e.index)) total++;
    }
    return total;
  }

  /** Quantidade de encaixes de vértice pra baixo ainda vazios. */
  get faltamParaBaixo(): number {
    let total = 0;
    for (const e of this.encaixes()) {
      if (!Piramide.paraCima(e.index) && !this.ocupado(e.andar, e.index)) total++;
    }
    return total;
  }

  /**
   * Pirâmide cheia: todos os triângulos de vértice pra cima estão presentes. Os
   * de vértice pra baixo podem faltar — quando todo o contorno de vértices pra
   * cima fecha, os vãos restantes ficam todos soterrados e nada mais entra.
   */
  get cheia(): boolean {
    for (const e of this.encaixes()) {
      if (Piramide.paraCima(e.index) && !this.ocupado(e.andar, e.index)) return false;
    }
    return true;
  }

  /** Cheia com os 16 encaixes preenchidos: leva o bônus máximo. */
  get cheiaCompleta(): boolean {
    return Piramide.ANDARES.every((def) => this.andarCompleto(def.andar));
  }

  /**
   * Cheia com pelo menos um vão de vértice pra baixo faltando. Basta um para a
   * pirâmide ser considerada vazada — mas o bônus de vazada exige que não haja
   * nenhum vértice pra baixo (ver `cheiaSoParaCima`).
   */
  get cheiaVazada(): boolean {
    return this.cheia && this.faltamParaBaixo > 0;
  }

  /** Vazada pura: os 10 de vértice pra cima e nenhum de vértice pra baixo. */
  get cheiaSoParaCima(): boolean {
    return this.cheia && this.quantidadeParaBaixo === 0;
  }

  /**
   * Nenhum encaixe da pirâmide aceita mais trijolo, em qualquer estado — é a
   * condição de fim de partida. Com as regras de apoio e soterramento isto
   * equivale a `cheia`, mas a verificação é feita encaixe por encaixe para não
   * depender dessa demonstração.
   */
  get travada(): boolean {
    for (const e of this.encaixes()) {
      if (this.livreParaReceber(e.andar, e.index)) return false;
    }
    return true;
  }

}
