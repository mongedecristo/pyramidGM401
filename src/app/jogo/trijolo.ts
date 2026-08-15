import { ElementRef } from "@angular/core";
import { Posicao } from "./jogo.component";

export class Trijolo {

  id!: number;
  colisao: boolean = false;
  fixo: boolean = false;
  destruir: boolean = false;
  posicaoAtual!: Posicao;
  triangulo!: ElementRef<SVGElement>;
  orientacao: 'up' | 'down' = 'up'; // up = vértice pra cima, down = vértice pra baixo

  constructor(init?: Partial<Trijolo>) {
    Object.assign(this, init);
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
