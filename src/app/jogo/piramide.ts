import { Posicao } from './jogo.component';

export type Andar = 'terreo' | 'segundoAndar' | 'terceiroAndar' | 'quartoAndar';

export interface DefinicaoAndar {
  andar: Andar;
  /** Linha da matriz de triângulos em que o andar é desenhado. */
  linha: number;
  /** Deslocamento da primeira coluna do andar em relação a `eixoX`. */
  offset: number;
  /** Quantidade de encaixes do andar. */
  largura: number;
}

export interface Colocado {
  colocado: boolean;
  layer?: Andar;
  index?: number;
  /** Célula da matriz onde o trijolo ficou fixado. */
  posicao?: Posicao;
  /** true quando o trijolo colocado tem o vértice pra cima. */
  paraCima?: boolean;
}

/** Encaixe da pirâmide correspondente a uma célula da matriz de triângulos. */
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
  quartoAndar: boolean = false;
  terceiroAndar: boolean[] = [false, false, false];
  segundoAndar: boolean[] = [false, false, false, false, false];
  // Os sete espaços do térreo começam vazios. Eles são sustentados pela base
  // formada pelas quatro pessoas, não por trijolos já existentes.
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
    if (this.ocupado(encaixe.andar, encaixe.index)) return false;
    return this.temSuporte(encaixe.andar, encaixe.index);
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

  get cheia(): boolean {
    return Piramide.ANDARES.every((def) => this.andarCompleto(def.andar));
  }

  get cheiaVazada(): boolean {
    const estadoTerreo = this.arraysIguais(this.terreo, [true, false, true, false, true, false, true]);
    const estadoSegundoAndar = this.arraysIguais(this.segundoAndar, [true, false, true, false, true]);
    const estadoTerceiroAndar = this.arraysIguais(this.terceiroAndar, [true, false, true]);
    const estadoQuartoAndar = this.quartoAndar === true;
    return estadoTerreo && estadoSegundoAndar && estadoTerceiroAndar && estadoQuartoAndar;
  }

  private arraysIguais(arr1: boolean[], arr2: boolean[]): boolean {
    return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
  }

}
