import { Component, ElementRef, inject,
          AfterViewInit, OnInit,  OnDestroy,
          Renderer2, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Trijolo } from './trijolo';
import { Colocado, Piramide } from './piramide';

export interface Posicao {
  linha: number;
  coluna: number;
}

@Component({
  selector: 'app-jogo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jogo.component.html',
  styleUrls: ['./jogo.component.css'],
})
export class JogoComponent implements AfterViewInit, OnDestroy {
  @ViewChild('tabuleiro') meuTabuleiroSVG!: ElementRef<SVGSVGElement>;
  public router = inject(Router);
  public score: number = 0;
  public y: number = 0;
  public x: number = 2; // Posição inicial da pirâmide (0 a 4)
  public triangulo!: ElementRef<SVGElement>;
  public trijolo!: Trijolo;
  public contador: number = 0;
  public triangulos!: ElementRef<SVGElement>[];
  public visibilidade: string[] = ["hidden", "hidden", "visible", "visible", "visible", "visible", "hidden", "hidden"];
  public pessoas: ElementRef<SVGElement>[] = [];
  public piramide!: Piramide;
  public nIntervaloId: any;
  public posicoesOcupadas: Posicao[] = []; // Adicionado para rastrear a pirâmide

  constructor(private renderer2: Renderer2) {}

  public comecaJogo() {
    // não iniciar lógica de jogo se não houver DOM (ex.: SSR)
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    this.trijolo = new Trijolo();
    this.piramide = new Piramide({ eixoX: this.x });
    this.renderer2.listen(document, 'keydown', (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') {
        // só permite mover para a esquerda se houver espaço
        if (this.x > 0) {
          const oldX = this.x;
          this.x--;
          this.piramide.eixoX = this.x;
          this.atualizaVisibilidadePessoas();
          // reposiciona triângulo ativo (se estiver apoiado na plataforma)
          this.moveTrianguloAtivoParaDelta(this.x - oldX);
          this.mostraTriangulosDaPiramide();
        }
      }
      if (e.code === 'ArrowRight') {
        // só permite mover para a direita se houver espaço
        if (this.x < 4) {
          const oldX = this.x;
          this.x++;
          this.piramide.eixoX = this.x;
          this.atualizaVisibilidadePessoas();
          this.moveTrianguloAtivoParaDelta(this.x - oldX);
          this.mostraTriangulosDaPiramide();
        }
      }
      if (e.code === 'Space') {
        this.quedaCompleta();
      }
      e.preventDefault();
    });
    this.caiUmNovoTriangulo();
    this.nIntervaloId = setInterval(() => {
      this.jogo();
    }, 500);
  }

  /**
   * Move o triângulo que está ativo (caindo/apoia­do) horizontalmente quando
   * a plataforma `pessoas` se desloca. Delta é em unidades de colunas (-1, +1).
   */
  private moveTrianguloAtivoParaDelta(delta: number) {
    if (!this.trijolo || !this.trijolo.posicaoAtual) return;
    // só mover se o triângulo ainda existir na tela e estiver na base (apoiado)
    const linha = this.trijolo.posicaoAtual.linha;
    if (linha < 6) return; // acima da base — não deve seguir a plataforma

    // calcula nova coluna e limita ao intervalo válido
    let novaCol = this.trijolo.posicaoAtual.coluna + delta;
    if (novaCol < 0) novaCol = 0;
    if (novaCol > 14) novaCol = 14;

    try {
      // esconde o triângulo na coluna antiga
      if (this.trijolo.triangulo && this.trijolo.triangulo.nativeElement) {
        this.trijolo.triangulo.nativeElement.classList.remove('fil3');
        this.trijolo.triangulo.nativeElement.classList.add('fil_none');
        this.trijolo.triangulo.nativeElement.style.visibility = 'hidden';
      }
    } catch (err) {
      // ignora
    }

    // atualiza a posição e o elemento SVG associado
    this.trijolo.posicaoAtual.coluna = novaCol;
    const novoTri = this.acessarTriangulo(this.triangulos, this.trijolo.posicaoAtual.linha, novaCol);
    if (novoTri && novoTri.nativeElement && novoTri.nativeElement.id > '') {
      this.trijolo.triangulo = novoTri;
      this.trijolo.triangulo.nativeElement.classList.remove('fil_none');
      this.trijolo.triangulo.nativeElement.classList.add('fil3');
      this.trijolo.triangulo.nativeElement.style.visibility = 'visible';
    }
  }

  public jogo() {
    this.trijolo.avancaPosicao(this.triangulos);
    this.y++;
    if (this.y >= 7) {
      if (this.detectaColisao(this.trijolo.posicaoAtual)) {
        console.log(`Triângulo ${this.trijolo.id} colidiu na posição linha ${this.trijolo.posicaoAtual.linha}, coluna ${this.trijolo.posicaoAtual.coluna}`);
        this.trijoloColidiu();
      }
      if (this.trijolo.destruir) {
        this.trijolo = new Trijolo();
        this.caiUmNovoTriangulo();
      }
    }
  }

  private detectaColisao(proximaPosicao: Posicao): boolean {
    // Só faz sentido detectar colisão se estiver horizontalmente sobre a área da pirâmide
    if (!this.piramide.isColumnInside(proximaPosicao.coluna)) return false;

    // A pirâmide ocupa as linhas 4..7 (quartoAndar..terreo).
    // Quando o triângulo chega em qualquer uma dessas linhas, verificar se pode ser
    // colocado naquela coluna. Se não couber exatamente, tentar deslizar para
    // colunas adjacentes próximas (esquerda/direita) para simular o "deslizar".
    if (proximaPosicao.linha >= 4) {
      // tenta na própria coluna
      if (this.piramide.podeColocar(proximaPosicao)) return true;

      // tenta deslizar para colunas próximas (ordem: esquerda, direita, mais longe)
      const shifts = [-1, 1, -2, 2];
      for (const s of shifts) {
        const col = proximaPosicao.coluna + s;
        if (!this.piramide.isColumnInside(col)) continue;
        const testPos: Posicao = { linha: proximaPosicao.linha, coluna: col };
        if (this.piramide.podeColocar(testPos)) {
          // atualiza a posição atual do trijolo para refletir o deslize
          if (this.trijolo && this.trijolo.posicaoAtual) {
            this.trijolo.posicaoAtual.coluna = col;
          }
          return true;
        }
      }
    }

    return false;
  }

  public trijoloColidiu() {
    // Esconder o triângulo que estava caindo antes de tudo (evita duplicatas visuais)
    try {
      if (this.trijolo && this.trijolo.triangulo && this.trijolo.triangulo.nativeElement) {
        this.trijolo.triangulo.nativeElement.classList.remove('fil3');
        this.trijolo.triangulo.nativeElement.classList.add('fil_none');
        this.trijolo.triangulo.nativeElement.style.visibility = 'hidden';
      }
    } catch (err) {
      console.warn('Não foi possível esconder triângulo caindo:', err);
    }

    // Tenta colocar o trijolo na pirâmide (atualiza estruturas internas)
    const result: Colocado = this.piramide.colocar(this.trijolo.posicaoAtual);
    if (!result.colocado) {
      // Não coube na pirâmide: marcar para destruir
      this.trijolo.destruir = true;
      return;
    }

    // Determina a posição real (linha/coluna) onde o triângulo foi fixado
    let colocadaLinha = 7;
    let colocadaColuna = this.piramide.eixoX + (result.index ?? 0);
    switch (result.layer) {
      case 'terreo':
        colocadaLinha = 7;
        colocadaColuna = this.piramide.eixoX + (result.index ?? 0);
        this.score += 1; // base: 1 ponto
        break;
      case 'segundoAndar':
        colocadaLinha = 6;
        colocadaColuna = this.piramide.eixoX + 1 + (result.index ?? 0);
        this.score += 2;
        break;
      case 'terceiroAndar':
        colocadaLinha = 5;
        colocadaColuna = this.piramide.eixoX + 2 + (result.index ?? 0);
        this.score += 3;
        break;
      case 'quartoAndar':
        colocadaLinha = 4;
        colocadaColuna = this.piramide.eixoX + 3;
        this.score += 4;
        break;
    }

    // Registra posição ocupada (informativo)
    this.posicoesOcupadas.push({ linha: colocadaLinha, coluna: colocadaColuna });
    this.trijolo.fixo = true;
    this.trijolo.colisao = true;
    this.trijolo.destruir = true; // sinaliza que o trijolo atual pode ser substituído
    this.piramide.colisao = true;

    // Sincroniza a visualização da pirâmide (mostra o triângulo fixado)
    this.mostraTriangulosDaPiramide();

    console.log('Score: ', this.score);
    console.log('Posições ocupadas: ', this.posicoesOcupadas);
  }

  public quedaCompleta() {
    if (this.nIntervaloId) {
      clearInterval(this.nIntervaloId);
    }
    while (!this.trijolo.destruir) {
      this.trijolo.avancaPosicao(this.triangulos);
      this.y++;
    }
    if (this.detectaColisao(this.trijolo.posicaoAtual)) {
      console.log(`Triângulo ${this.trijolo.id} colidiu na posição linha ${this.trijolo.posicaoAtual.linha}, coluna ${this.trijolo.posicaoAtual.coluna}`);
      this.trijoloColidiu();
    }

    // Reinicia o intervalo de queda lenta para o próximo trijolo
    this.nIntervaloId = setInterval(() => {
      this.jogo();
    }, 500);
  }

  public caiUmNovoTriangulo() {
    this.y = 0;
    const colunaRND = Math.round(14 * Math.random());
    const posicaoInicial: Posicao = { linha: this.y, coluna: colunaRND };
    this.trijolo.id = ++this.contador;
    this.trijolo.triangulo = this.acessarTriangulo(this.triangulos, this.y, colunaRND);
    this.trijolo.posicaoAtual = posicaoInicial;
    const fil3 = this.trijolo.triangulo.nativeElement.classList.contains('fil3');
    if (!fil3) {
      this.trijolo.triangulo.nativeElement.classList.add('fil3');
    }
    console.log('Quantidade de triângulos: ', this.contador);
  }


  ngAfterViewInit(): void {
    // Não executar lógica dependente de DOM quando em ambiente sem window/document (SSR)
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    let timeoutID = undefined;
    if (typeof timeoutID === 'number') {
      clearTimeout(timeoutID);
    }
    timeoutID = setTimeout(() => {
      this.resetTabuleiro();
    }, 1000);
    this.triangulos = Array
      .from(this.meuTabuleiroSVG.nativeElement.getElementsByTagName('polygon'))
      .map((polygon) => new ElementRef(polygon));
    for (let i = 0; i < 8; i++) {
      this.pessoas[i] = this.triangulos[120 + i];
    }
    this.deixaPiramideTransparente();
    this.comecaJogo();
  }

  ngOnDestroy(): void {
    this.renderer2.destroy();
    if (this.nIntervaloId) {
      clearInterval(this.nIntervaloId);
    }
  }

  public irParaPagina(uri: string) {
    this.router.navigate([uri]);
  }

  private deixaPiramideTransparente() {
    for (let index = 0; index < this.pessoas.length; index++) {
      this.pessoas[index].nativeElement.style.visibility = this.visibilidade[index];
    }
    for (let i = 4; i < 8; i++) {
      for (let j = 0; j < 15; j++) {
        this.triangulo = this.acessarTriangulo(this.triangulos, i, j);
        if (this.triangulo !== null && this.triangulo.nativeElement.id > '') {
          this.triangulo.nativeElement.classList.remove('fil3');
          this.triangulo.nativeElement.classList.add('fil_none')
        }
      }
    }
  }

  /**
   * Atualiza o array `visibilidade` de acordo com a posição `x`.
   * Mostra 4 pessoas contíguas começando em `x` (índices x..x+3).
   */
  private atualizaVisibilidadePessoas() {
    const vis = new Array<string>(8).fill('hidden');
    const start = Math.max(0, Math.min(4, this.x));
    for (let i = start; i < start + 4; i++) {
      vis[i] = 'visible';
    }
    this.visibilidade = vis;
    // aplica imediatamente
    for (let index = 0; index < this.pessoas.length; index++) {
      this.pessoas[index].nativeElement.style.visibility = this.visibilidade[index];
    }
  }

  public mostraScore(): string {
    const zero: number = this.score > 0 ? 4 - Math.floor(Math.log10(this.score)) : 4;
    const zeros: string = '00000'.slice(0, zero);
    return zeros + this.score;
  }

  private acessarTriangulo(svgElement: ElementRef<SVGElement>[], linha: number, coluna: number): ElementRef<SVGElement> {
    const q = 'queops_' + linha.toString() + '_' + (coluna < 10 ? '0' : '') + coluna.toString();
    return <NonNullable<ElementRef<SVGElement>>> (svgElement.find((queops) => queops.nativeElement.id == q));
  }

  private resetTabuleiro() {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 15; j++) {
        this.triangulo = this.acessarTriangulo(this.triangulos, i, j);
        if (this.triangulo !== null && this.triangulo.nativeElement.id > '') {
          this.triangulo.nativeElement.classList.remove('fil0');
          this.triangulo.nativeElement.classList.add('fil_none')
        }
      }
    }
  }

  public mostraTriangulosDaPiramide() {
    // Esconde todos os triângulos da pirâmide em qualquer posição antes de mostrar a nova
    this.escondeTriangulosDaPiramide();

    for (let i = 0; i < 7; i++) {
      this.triangulo = this.acessarTriangulo(this.triangulos, 7, this.piramide.eixoX + i);
      if (this.triangulo !== null && this.triangulo.nativeElement.id > '' && this.piramide.terreo[i]) {
        this.triangulo.nativeElement.classList.remove('fil_none');
        this.triangulo.nativeElement.classList.add('fil3');
      }
    }
    for (let i = 0; i < 5; i++) {
      this.triangulo = this.acessarTriangulo(this.triangulos, 6, this.piramide.eixoX + 1 + i);
      if (this.triangulo !== null && this.triangulo.nativeElement.id > '' && this.piramide.segundoAndar[i]) {
        this.triangulo.nativeElement.classList.remove('fil_none');
        this.triangulo.nativeElement.classList.add('fil3');
      }
    }
    for (let i = 0; i < 3; i++) {
      this.triangulo = this.acessarTriangulo(this.triangulos, 5, this.piramide.eixoX + 2 + i);
      if (this.triangulo !== null && this.triangulo.nativeElement.id > '' && this.piramide.terceiroAndar[i]) {
        this.triangulo.nativeElement.classList.remove('fil_none');
        this.triangulo.nativeElement.classList.add('fil3');
      }
    }
    this.triangulo = this.acessarTriangulo(this.triangulos, 4, this.piramide.eixoX + 3);
    if (this.triangulo !== null && this.triangulo.nativeElement.id > '' && this.piramide.quartoAndar) {
      this.triangulo.nativeElement.classList.remove('fil_none');
      this.triangulo.nativeElement.classList.add('fil3');
    }
    if (this.piramide.cheia) {
      console.log('PIRÂMIDE CHEIA!!!');
    }
    if (this.piramide.cheiaVazada) {
      console.log('PIRÂMIDE CHEIA VAZADA!!!');
    }
  }

  /**
   * Esconde todos os triângulos que compõem a pirâmide em qualquer posição
   */
  private escondeTriangulosDaPiramide() {
    // Esconde todos os possíveis triângulos da pirâmide para todas as posições de x (0-4)
    for (let x = 0; x <= 4; x++) {
      // Terreo (linha 7, 7 colunas)
      for (let i = 0; i < 7; i++) {
        const tri = this.acessarTriangulo(this.triangulos, 7, x + i);
        if (tri && tri.nativeElement && tri.nativeElement.id > '') {
          tri.nativeElement.classList.remove('fil3');
          tri.nativeElement.classList.add('fil_none');
        }
      }
      // Segundo andar (linha 6, 5 colunas)
      for (let i = 0; i < 5; i++) {
        const tri = this.acessarTriangulo(this.triangulos, 6, x + 1 + i);
        if (tri && tri.nativeElement && tri.nativeElement.id > '') {
          tri.nativeElement.classList.remove('fil3');
          tri.nativeElement.classList.add('fil_none');
        }
      }
      // Terceiro andar (linha 5, 3 colunas)
      for (let i = 0; i < 3; i++) {
        const tri = this.acessarTriangulo(this.triangulos, 5, x + 2 + i);
        if (tri && tri.nativeElement && tri.nativeElement.id > '') {
          tri.nativeElement.classList.remove('fil3');
          tri.nativeElement.classList.add('fil_none');
        }
      }
      // Quarto andar (linha 4, 1 coluna)
      const triQuarto = this.acessarTriangulo(this.triangulos, 4, x + 3);
      if (triQuarto && triQuarto.nativeElement && triQuarto.nativeElement.id > '') {
        triQuarto.nativeElement.classList.remove('fil3');
        triQuarto.nativeElement.classList.add('fil_none');
      }
    }
  }
}
