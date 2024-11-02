import { Posicao } from './jogo.component';
import { Trijolo } from "./trijolo";

export class Piramide {

  colisao!: boolean;
  cheio: boolean = false;
  eixoX!: number;
  triangulo!: Trijolo;
  quartoAndar!: Trijolo;
  terceiroAndar!: Trijolo[];
  segundoAndar!: Trijolo[];
  terreo!: Trijolo[];

  constructor(init?: Partial<Piramide>) {
    Object.assign(this, init);
  }

  public isOntoPyramid(posicao: Posicao): boolean {
    if (posicao.coluna == this.eixoX ||
        posicao.coluna == (this.eixoX + 1) ||
        posicao.coluna == (this.eixoX + 2) ||
        posicao.coluna == (this.eixoX + 3) ||
        posicao.coluna == (this.eixoX + 4) ||
        posicao.coluna == (this.eixoX + 5) ||
        posicao.coluna == (this.eixoX + 6)) {
          return true;
    } else {
          return false;
    }
  }



}
