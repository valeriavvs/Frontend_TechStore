import { Component, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { CommonModule } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterOutlet,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  @ViewChild('drawer') drawer?: MatSidenav;

  mostrarNavbar = true;
  rol: string | null = null;
  username: string | null = null;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.mostrarNavbar = this.router.url !== '/login' && this.router.url !== '/';
        this.rol = localStorage.getItem('rol');
        this.username = localStorage.getItem('username');
      });

    this.mostrarNavbar = this.router.url !== '/login' && this.router.url !== '/';
    this.rol = localStorage.getItem('rol');
    this.username = localStorage.getItem('username');
  }

  toggleDrawer(): void {
    this.drawer?.toggle();
  }

  closeDrawer(): void {
    this.drawer?.close();
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('username');
    localStorage.removeItem('idUsuario');
    localStorage.removeItem('carrito');
    this.router.navigate(['/login']);
  }
}
