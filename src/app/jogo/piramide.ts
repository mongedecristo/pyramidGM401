import { Trijolo } from "./trijolo";

export class Piramide {

  colisao!: boolean;
  cheio: boolean = false;
  eixoX!: number;
  triangulo!: Trijolo;
  terreo!: Trijolo[];
  segundoAndar!: Trijolo[];
  terceiroAndar!: Trijolo[];
  quartoAndar!: Trijolo;

  constructor(init?: Partial<Piramide>) {
    Object.assign(this, init);
  }



}
