import { Component, ElementRef, inject,
          AfterViewInit, OnInit,  OnDestroy,
          Renderer2, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Trijolo } from './trijolo';
import { Andar, Colocado, Piramide } from './piramide';

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
  /**
   * Cada pessoa fica exatamente sob um triângulo de vértice pra cima, e entre
   * dois desses cabe um triângulo de vértice pra baixo. Logo, uma pessoa vale
   * duas colunas da matriz de triângulos. `x` conta pessoas, `piramide.eixoX`
   * conta colunas: a conversão entre as duas escalas é sempre este fator.
   *
   * Consequência crítica: `eixoX` tem de ser SEMPRE par. Numa coluna par a
   * linha 7 tem um triângulo de vértice pra cima; numa coluna ímpar, de vértice
   * pra baixo. Deslocar `eixoX` de 1 inverteria a orientação de todos os
   * encaixes da pirâmide e a desmontaria.
   */
  private readonly COLUNAS_POR_PESSOA = 2;

  /** 1 ponto por trijolo com vértice pra cima, 2 por vértice pra baixo. */
  private readonly PONTOS_PARA_CIMA = 1;
  private readonly PONTOS_PARA_BAIXO = 2;

  /**
   * Bônus por andar completo. O quarto andar não aparece aqui de propósito:
   * empilhar o último trijolo é obrigatório para fechar a pirâmide, então ele
   * não rende bônus de andar. Valores livres para calibrar.
   */
  private readonly BONUS_ANDAR: Partial<Record<Andar, number>> = {
    terreo: 10,
    segundoAndar: 20,
    terceiroAndar: 30,
  };
  /** Pirâmide vazada: os 10 trijolos de vértice pra cima, nenhum pra baixo. */
  private readonly BONUS_SO_PARA_CIMA = 50;
  /** O maior de todos: os 16 encaixes preenchidos. */
  private readonly BONUS_PIRAMIDE_COMPLETA = 100;

  /** Cada bônus é concedido uma única vez por pirâmide. */
  private bonusConcedidos = new Set<string>();

  @ViewChild('tabuleiro') meuTabuleiroSVG!: ElementRef<SVGSVGElement>;
  public router = inject(Router);
  public score: number = 0;
  public y: number = 0;
  public x: number = 2; // Posição inicial da pirâmide, em pessoas (0 a 4)
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

  /**
   * Converte um índice (ou um delta) da escala de pessoas para a escala de
   * colunas da matriz de triângulos. O resultado é sempre par para índices
   * absolutos, o que preserva a orientação de todos os encaixes da pirâmide.
   */
  private colunaDaPessoa(indicePessoa: number): number {
    return indicePessoa * this.COLUNAS_POR_PESSOA;
  }

  public comecaJogo() {
    // não iniciar lógica de jogo se não houver DOM (ex.: SSR)
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    this.trijolo = new Trijolo();
    this.piramide = new Piramide({ eixoX: this.colunaDaPessoa(this.x) });
    this.renderer2.listen(document, 'keydown', (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') {
        // só permite mover para a esquerda se houver espaço
        if (this.x > 0) {
          const oldX = this.x;
          this.x--;
          this.piramide.eixoX = this.colunaDaPessoa(this.x);
          this.atualizaVisibilidadePessoas();
          // reposiciona triângulo ativo (se estiver apoiado na plataforma)
          this.moveTrianguloAtivoParaDelta(this.colunaDaPessoa(this.x - oldX));
          this.mostraTriangulosDaPiramide();
        }
      }
      if (e.code === 'ArrowRight') {
        // só permite mover para a direita se houver espaço
        if (this.x < 4) {
          const oldX = this.x;
          this.x++;
          this.piramide.eixoX = this.colunaDaPessoa(this.x);
          this.atualizaVisibilidadePessoas();
          this.moveTrianguloAtivoParaDelta(this.colunaDaPessoa(this.x - oldX));
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
    if (this.avancaQueda()) {
      this.trijolo = new Trijolo();
      this.caiUmNovoTriangulo();
    }
  }

  private detectaColisao(proximaPosicao: Posicao): boolean {
    // O teste ocorre antes de desenhar o trijolo na próxima célula. Assim, ele
    // para no primeiro nível que possa sustentá-lo (linhas 4 a 7).
    if (proximaPosicao.linha < 4 || proximaPosicao.linha > 7) return false;

    // Mesmo se estiver ligeiramente fora da área, o trijolo pode deslizar para
    // dentro de um encaixe válido. A própria pirâmide valida os limites.
    for (const deslocamento of this.ordemDeDeslize()) {
      const candidata: Posicao = {
        linha: proximaPosicao.linha,
        coluna: proximaPosicao.coluna + deslocamento,
      };

      if (!this.piramide.podeColocar(candidata)) continue;

      this.trijolo.posicaoAtual = candidata;
      return true;
    }

    return false;
  }

  /**
   * Ordem em que o trijolo tenta deslizar para achar encaixe: primeiro a
   * própria coluna, depois uma coluna para cada lado, depois duas. A distância
   * continua sendo o critério principal — deslizar 2 quando 1 resolve pareceria
   * um salto —, mas o LADO é sorteado a cada tentativa. A lista fixa
   * `[0, -1, 1, -2, 2]` fazia o trijolo preferir sempre a esquerda, o que
   * enviesava visivelmente a formação da pirâmide.
   */
  private ordemDeDeslize(): number[] {
    const ordem: number[] = [0];
    for (const distancia of [1, 2]) {
      const primeiro = Math.random() < 0.5 ? -distancia : distancia;
      ordem.push(primeiro, -primeiro);
    }
    return ordem;
  }

  /**
   * Processa um passo de queda. Retorna true quando o trijolo atual foi
   * fixado ou saiu do tabuleiro e, portanto, deve ser substituído.
   */
  private avancaQueda(): boolean {
    const proximaPosicao = this.trijolo.posicaoFutura;

    if (this.detectaColisao(proximaPosicao)) {
      console.log(`Triângulo ${this.trijolo.id} colidiu na posição linha ${this.trijolo.posicaoAtual.linha}, coluna ${this.trijolo.posicaoAtual.coluna}`);
      this.trijoloColidiu();
      return true;
    }

    this.trijolo.avancaPosicao(this.triangulos);
    this.y = this.trijolo.posicaoAtual.linha;
    return this.trijolo.destruir;
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

    // Pontuação do trijolo, pela orientação do encaixe em que ele ficou.
    this.score += result.paraCima ? this.PONTOS_PARA_CIMA : this.PONTOS_PARA_BAIXO;
    this.somaBonus(result.layer!);

    // Registra posição ocupada (informativo)
    this.posicoesOcupadas.push(result.posicao!);
    this.trijolo.fixo = true;
    this.trijolo.colisao = true;
    this.trijolo.destruir = true; // sinaliza que o trijolo atual pode ser substituído
    this.piramide.colisao = true;

    // Sincroniza a visualização da pirâmide (mostra o triângulo fixado)
    this.mostraTriangulosDaPiramide();

    console.log('Score: ', this.score);
    console.log('Posições ocupadas: ', this.posicoesOcupadas);
  }

  /**
   * Confere os bônus depois de fixar um trijolo. Como os andares só ganham
   * trijolos (nunca perdem), conferir logo após a colocação pega cada conclusão
   * no exato momento em que ela acontece.
   */
  private somaBonus(andar: Andar) {
    const bonusDoAndar = this.BONUS_ANDAR[andar];
    if (bonusDoAndar && this.piramide.andarCompleto(andar)) {
      this.concedeBonus(`andar:${andar}`, bonusDoAndar);
    }
    // A vazada deixa de ser verdadeira no instante em que entra um trijolo de
    // vértice pra baixo, por isso ela é testada a cada colocação.
    if (this.piramide.cheiaVazada) {
      this.concedeBonus('vazada', this.BONUS_SO_PARA_CIMA);
    }
    if (this.piramide.cheia) {
      this.concedeBonus('completa', this.BONUS_PIRAMIDE_COMPLETA);
    }
  }

  private concedeBonus(chave: string, pontos: number) {
    if (this.bonusConcedidos.has(chave)) return;
    this.bonusConcedidos.add(chave);
    this.score += pontos;
    console.log(`Bônus ${chave}: +${pontos}`);
  }

  public quedaCompleta() {
    if (this.nIntervaloId) {
      clearInterval(this.nIntervaloId);
    }
    while (!this.avancaQueda()) {
      // A queda completa usa exatamente a mesma detecção antecipada da queda normal.
    }

    this.trijolo = new Trijolo();
    this.caiUmNovoTriangulo();

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

    // A geometria de cada andar (linha, offset e largura) vive só em
    // Piramide.ANDARES. Repeti-la aqui foi a origem do desalinhamento entre a
    // pirâmide e as pessoas.
    for (const def of Piramide.ANDARES) {
      for (let i = 0; i < def.largura; i++) {
        if (!this.piramide.ocupado(def.andar, i)) continue;
        const posicao = this.piramide.posicaoDe(def.andar, i);
        const tri = this.acessarTriangulo(this.triangulos, posicao.linha, posicao.coluna);
        if (tri && tri.nativeElement && tri.nativeElement.id > '') {
          tri.nativeElement.classList.remove('fil_none');
          tri.nativeElement.classList.add('fil3');
          // A rotina de queda esconde células via `style.visibility`; sem
          // limpar isso, um trijolo fixado numa célula já usada ficaria
          // invisível apesar da classe correta.
          tri.nativeElement.style.visibility = 'visible';
        }
      }
    }
    if (this.piramide.cheia) {
      console.log('PIRÂMIDE CHEIA!!!');
    }
    if (this.piramide.cheiaVazada) {
      console.log('PIRÂMIDE CHEIA VAZADA!!!');
    }
  }

  /**
   * Esconde todos os triângulos que compõem a pirâmide em qualquer posição.
   *
   * Como `eixoX` percorre as colunas pares 0..8 e o térreo ocupa `eixoX+6`, a
   * pirâmide pode ocupar qualquer coluna de 0 a 14 nas linhas 4 a 7 — por isso
   * a limpeza varre a faixa inteira. O trijolo que está caindo é preservado:
   * ele não pertence à pirâmide e é redesenhado pela rotina de queda.
   */
  private escondeTriangulosDaPiramide() {
    const ativa = this.trijolo && !this.trijolo.fixo ? this.trijolo.posicaoAtual : undefined;

    for (let linha = 4; linha <= 7; linha++) {
      for (let coluna = 0; coluna < 15; coluna++) {
        if (ativa && ativa.linha === linha && ativa.coluna === coluna) continue;
        const tri = this.acessarTriangulo(this.triangulos, linha, coluna);
        if (tri && tri.nativeElement && tri.nativeElement.id > '') {
          tri.nativeElement.classList.remove('fil3');
          tri.nativeElement.classList.add('fil_none');
        }
      }
    }
  }
}
