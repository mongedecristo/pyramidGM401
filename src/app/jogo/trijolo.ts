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
    if (Math.abs(colunaRND) > 1) {
      colunaRND = Math.ceil(colunaRND / 2);
    }
    let proximaPosicao: posicao = {
      linha: this.posicaoAtual.linha + 1,
      coluna: this.posicaoAtual.coluna + colunaRND
    };
    if (proximaPosicao.linha > 6) {
      proximaPosicao.linha = 7;
    }
    console.log("Próxima posição:", proximaPosicao);
    return proximaPosicao;
  }
}
