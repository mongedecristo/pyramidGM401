
export type Andar = 'terreo' | 'segundoAndar' | 'terceiroAndar' | 'quartoAndar';

export interface Posicao {
  linha: number;
  coluna: number;
}

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

export interface Encaixe {
  andar: Andar;
  index: number;
}

