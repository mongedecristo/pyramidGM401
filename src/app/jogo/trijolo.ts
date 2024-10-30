import { ElementRef } from "@angular/core";
import { posicao } from "./jogo.component";

export class Trijolo {

  id!: number;
  colisao!: boolean;
  fixo!: boolean;
  posicaoAtual!: posicao;
  triangulo!: ElementRef<SVGElement>;

  constructor(init?: Partial<Trijolo>) {
    Object.assign(this, init);
  }

  public avancaPosicao(ref: ElementRef<SVGElement>[]): void {
    let q = 'queops_' + this.posicaoAtual.linha.toString() + '_' +
      (this.posicaoAtual.coluna < 10 ? '0' : '') +
      this.posicaoAtual.coluna.toString();
    this.triangulo= <NonNullable<ElementRef<SVGElement>>> (ref.find(
      (queops) => queops.nativeElement.id == q)
    );
    this.triangulo.nativeElement.classList.remove('fil3');
    this.triangulo.nativeElement.classList.add('fil_none');

    this.posicaoAtual = this.posicaoFutura;
    q = 'queops_' + this.posicaoAtual.linha.toString() + '_' +
      (this.posicaoAtual.coluna < 10 ? '0' : '') +
      this.posicaoAtual.coluna.toString();
    this.triangulo= <NonNullable<ElementRef<SVGElement>>> (ref.find(
      (queops) => queops.nativeElement.id == q)
    );
    this.triangulo.nativeElement.classList.remove('fil_none');
    this.triangulo.nativeElement.classList.add('fil3');
  }

  get posicaoFutura(): posicao {
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
    let proximaPosicao: posicao = {
      linha: proximaLinha,
      coluna: proximaColuna
    };
    console.log("Próxima posição:", proximaPosicao);
    return proximaPosicao;
  }
}
