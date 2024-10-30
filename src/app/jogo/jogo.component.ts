import { Component, ElementRef, inject,
          AfterViewInit, OnInit,  OnDestroy,
          Renderer2, ViewChild} from '@angular/core';
import { Router } from '@angular/router';
import { Trijolo } from './trijolo';
import { Piramide } from './piramide';

export interface posicao {
  linha: number;
  coluna: number;
}

@Component({
  selector: 'app-jogo',
  templateUrl: './jogo.component.html',
  styleUrls: ['./jogo.component.css'],
})
export class JogoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('tabuleiro') meuTabuleiroSVG!: ElementRef<SVGSVGElement>;
  public router = inject(Router);
  public score: number = 0;
  public triangulo!: ElementRef<SVGElement>;
  public trijolo: Trijolo = new Trijolo();
  public contador: number = 0;
  public triangulos!: ElementRef<SVGElement>[];
  public visibilidade: string[] = ["hidden","hidden","visible","visible","visible","visible","hidden","hidden"];
  public pessoas: ElementRef<SVGElement>[] = [];
  public piramide: Piramide = new Piramide();

  constructor(private renderer2: Renderer2) {}

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    let timeoutID = undefined;
    if (typeof timeoutID === "number") {
      clearTimeout(timeoutID);
    }
    timeoutID = setTimeout(() => {
      this.resetTabuleiro();
    }, 1000);
    this.triangulos = Array.from(
      this.meuTabuleiroSVG.nativeElement.getElementsByTagName('polygon')
    ).map((polygon) => new ElementRef(polygon));
    for (let i = 0; i < 8; i++) {
      this.pessoas[i] = this.triangulos[120 + i];
    }
    this.renderer2.listen(document, 'keydown', (e: KeyboardEvent) => {
      if (e.code == "ArrowLeft") {
        const cabe: boolean = (this.visibilidade[0] == "hidden");
        if (cabe) {
          let primeiroItem = "";
          primeiroItem += this.visibilidade.shift();
          this.visibilidade.push(primeiroItem);
          this.deixaAsPessoasTransparentes();
        }
      }
      if (e.code == "ArrowRight") {
        const ultimoItem = this.visibilidade[7];
        const cabe: boolean = (ultimoItem == "hidden");
        if (cabe) {
          const item0 = this.visibilidade[0];
          const item1 = this.visibilidade[1];
          const item2 = this.visibilidade[2];
          const item3 = this.visibilidade[3];
          const item4 = this.visibilidade[4];
          const item5 = this.visibilidade[5];
          const item6 = this.visibilidade[6];
          const item7 = this.visibilidade[7];
          this.visibilidade = [item7, item0, item1, item2, item3, item4, item5, item6];
          this.deixaAsPessoasTransparentes();
        }
      }
      if (e.code == "Space") {
        console.log('Você clicou na Barra de Espaço');
      }
      e.preventDefault();
    });
    this.deixaAsPessoasTransparentes();
    this.caiUmTriangulo();

    for (let linha = 0; linha < 8; linha++) {
      let timeoutQuedaID = undefined;
      if (typeof timeoutQuedaID === "number") {
        clearTimeout(timeoutQuedaID);
      }
      timeoutQuedaID = setTimeout(() => {
        this.trijolo.avancaPosicao(this.triangulos);
      }, 500);
    }
  }

  ngOnDestroy(): void {
    this.renderer2.destroy();
  }

  public irParaPagina(uri: string) {
    this.router.navigate([uri]);
  }

  private deixaAsPessoasTransparentes() {
    for (let index = 0; index < this.pessoas.length; index++) {
      this.pessoas[index].nativeElement.style.visibility = this.visibilidade[index];
    }
  }

  public mostraScore(): string {
    const zero: number =
      this.score > 0 ? 4 - Math.ceil(Math.log10(this.score)) : 4;
    const zeros: string = '00000'.slice(0, zero);
    return zeros + this.score;
  }

  public caiUmTriangulo() {
    const colunaRND = Math.round(14*Math.random());
    const posicaoInicial: posicao = { linha: 0, coluna: colunaRND };

    this.trijolo = new Trijolo({
      id: ++this.contador,
      triangulo: this.acessarTriangulo(this.triangulos, 0, colunaRND),
      posicaoAtual: posicaoInicial
    });
    this.trijolo.triangulo.nativeElement.classList.add('fil3');
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
}
