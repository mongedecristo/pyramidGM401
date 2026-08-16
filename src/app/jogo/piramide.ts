import { Posicao } from './jogo.component';
import { Trijolo } from "./trijolo";

export interface Colocado {
  colocado: boolean;
  layer?: string;
  index?: number;
}

export class Piramide {

  colisao: boolean = false;
  eixoX!: number;
  triangulo!: Trijolo;
  quartoAndar: boolean = false;
  terceiroAndar: boolean[] = [false, false, false];
  segundoAndar: boolean[] = [false, false, false, false, false];
  // Os sete espaços do térreo começam vazios. Eles são sustentados pela base
  // formada pelas quatro pessoas, não por trijolos já existentes.
  terreo: boolean[] = [false, false, false, false, false, false, false];

  constructor(init?: Partial<Piramide>) {
    Object.assign(this, init);
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

  /**
   * Verifica sem alterar o estado se um trijolo na posição informada pode ser colocado
   * no nível correto da pirâmide de acordo com a linha do SVG.
   */
  public podeColocar(posicao: { linha: number, coluna: number }): boolean {
    const colIndex = posicao.coluna - this.eixoX; // índice relativo 0..6
    if (colIndex < 0 || colIndex > 6) return false;
    switch (posicao.linha) {
      case 7:
        return this.isSupportedByPeople(posicao) && !this.terreo[colIndex];
      case 6: {
        const segundoIndex = colIndex - 1;
        return segundoIndex >= 0 && segundoIndex <= 4 && !this.segundoAndar[segundoIndex] && this.terreo[segundoIndex] && this.terreo[segundoIndex + 1];
      }
      case 5: {
        const terceiroIndex = colIndex - 2;
        return terceiroIndex >= 0 && terceiroIndex <= 2 && !this.terceiroAndar[terceiroIndex] && this.segundoAndar[terceiroIndex] && this.segundoAndar[terceiroIndex + 1];
      }
      case 4:
        return colIndex === 3 && !this.quartoAndar && this.terceiroAndar[0] && this.terceiroAndar[1];
      default:
        return false;
    }
  }

  /**
   * Tenta colocar o trijolo na pirâmide. Se conseguir, atualiza o estado interno
   * e retorna o nível e índice onde foi colocado.
   */
  public colocar(posicao: { linha: number, coluna: number }): Colocado {
    const colIndex = posicao.coluna - this.eixoX;
    const colocado: Colocado = { colocado: false };
    if (colIndex < 0 || colIndex > 6) return colocado;
    switch (posicao.linha) {
      case 7:
        if (this.isSupportedByPeople(posicao) && !this.terreo[colIndex]) {
          this.terreo[colIndex] = true;
          colocado.colocado = true;
          colocado.layer = 'terreo';
          colocado.index = colIndex;
        }
        return colocado;
      case 6: {
        const segundoIndex = colIndex - 1;
        if (segundoIndex >= 0 && segundoIndex <= 4 && !this.segundoAndar[segundoIndex] && this.terreo[segundoIndex] && this.terreo[segundoIndex + 1]) {
          this.segundoAndar[segundoIndex] = true;
          colocado.colocado = true;
          colocado.layer = 'segundoAndar';
          colocado.index = segundoIndex;
        }
        return colocado;
      }
      case 5: {
        const terceiroIndex = colIndex - 2;
        if (terceiroIndex >= 0 && terceiroIndex <= 2 && !this.terceiroAndar[terceiroIndex] && this.segundoAndar[terceiroIndex] && this.segundoAndar[terceiroIndex + 1]) {
          this.terceiroAndar[terceiroIndex] = true;
          colocado.colocado = true;
          colocado.layer = 'terceiroAndar';
          colocado.index = terceiroIndex;
        }
        return colocado;
      }
      case 4:
        if (colIndex === 3 && !this.quartoAndar && this.terceiroAndar[0] && this.terceiroAndar[1]) {
          this.quartoAndar = true;
          colocado.colocado = true;
          colocado.layer = 'quartoAndar';
          colocado.index = 0;
        }
        return colocado;
      default:
        return colocado;
    }
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


  get cheia(): boolean {
    const estadoTerreo = this.terreo.every(value => value === true);
    const estadoSegundoAndar = this.segundoAndar.every(value => value === true);
    const estadoTerceiroAndar = this.terceiroAndar.every(value => value === true);
    const estadoQuartoAndar = this.quartoAndar === true;
    return estadoTerreo && estadoSegundoAndar && estadoTerceiroAndar && estadoQuartoAndar;
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
