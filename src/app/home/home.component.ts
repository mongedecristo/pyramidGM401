import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  router = inject(Router);

  constructor() { }

  ngOnInit() {
  }

  irParaPagina(uri: string) {
    this.router.navigate([uri]);
  }

}
