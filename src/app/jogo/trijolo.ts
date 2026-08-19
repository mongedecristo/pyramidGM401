import { ElementRef } from "@angular/core";
import { Posicao } from "./jogo.component";

/**
 * Orientação de uma célula da matriz de triângulos. A matriz alterna a
 * orientação a cada coluna E a cada linha, então ela é determinada pela
 * paridade da soma. Verificado no SVG: `queops_7_00` e `queops_6_01` têm o
 * vértice pra cima; `queops_7_01` e `queops_6_00`, pra baixo.
 */
export function orientacaoDaPosicao(posicao: Posicao): 'up' | 'down' {
  return (posicao.linha + posicao.coluna) % 2 !== 0 ? 'up' : 'down';
}

export class Trijolo {

  id!: number;
  colisao: boolean = false;
  fixo: boolean = false;
  destruir: boolean = false;
  posicaoAtual!: Posicao;
  triangulo!: ElementRef<SVGElement>;

  constructor(init?: Partial<Omit<Trijolo, 'orientacao'>>) {
    Object.assign(this, init);
  }

  /**
   * A orientação não é intrínseca ao trijolo: ela vem da célula que ele ocupa.
   * Como a queda desloca a coluna em -1, 0 ou +1 a cada linha, o trijolo troca
   * de orientação enquanto cai — igual ao LCD do relógio, em que "o triângulo
   * que cai" é só a próxima célula acesa.
   */
  get orientacao(): 'up' | 'down' {
    return orientacaoDaPosicao(this.posicaoAtual);
  }

  /**
   * String referente aos id's
   * dos polygons do SVG (triângulos)
   */
  public queops(posicao: Posicao): string {
    return 'queops_' + posicao.linha.toString() +
      '_' + (posicao.coluna < 10 ? '0' : '') +
      posicao.coluna.toString();
  }

  public avancaPosicao(ref: ElementRef<SVGElement>[]): void {
    let q = this.queops(this.posicaoAtual);
    this.triangulo= <NonNullable<ElementRef<SVGElement>>> (ref.find(
      (queops) => queops.nativeElement.id == q)
    );
    this.triangulo.nativeElement.classList.remove('fil3');
    this.triangulo.nativeElement.classList.add('fil_none');

    if (this.posicaoAtual.linha >= 7) {
      this.triangulo.nativeElement.classList.remove('fil3');
      this.triangulo.nativeElement.classList.add('fil_none');
      console.log(`Triângulo ${this.id} bateu no fundo.`)
      this.triangulo.nativeElement.style.visibility = 'hidden';
      this.destruir = true;
    } else {
      this.posicaoAtual = this.posicaoFutura;
      q = this.queops(this.posicaoAtual);
      this.triangulo= <NonNullable<ElementRef<SVGElement>>> (ref.find((queops) => queops.nativeElement.id == q));
      this.triangulo.nativeElement.classList.remove('fil_none');
      this.triangulo.nativeElement.classList.add('fil3');
      this.destruir = false;
    }
  }

  get posicaoFutura(): Posicao {
    let proximaPosicao: Posicao = {} as Posicao;
    let colunaRND = Math.floor(7*Math.random());
    colunaRND = 3 - colunaRND;
    const abs = Math.abs(colunaRND);
    const sgn = Math.sign(colunaRND);
    if (abs > 1) {
      colunaRND = sgn;
    }
    let proximaColuna = this.posicaoAtual.coluna + colunaRND;
    let proximaLinha = this.posicaoAtual.linha + 1;
    if (proximaColuna < 0) {
      proximaColuna = 0;
    }
    if (proximaColuna > 14) {
      proximaColuna = 14;
    }
    if (proximaLinha > 6) {
      proximaLinha = 7;
    }
    proximaPosicao.linha = proximaLinha;
    proximaPosicao.coluna = proximaColuna;
    return proximaPosicao;
  }

  public toString(): string {
    return `Triângulo ${this.id} - ${this.queops(this.posicaoAtual)} - classes: [${this.triangulo.nativeElement.classList}]`;
  }
}
