import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {environment} from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {

  nombre: string = '';
  email: string = '';
  password: string = '';

  mensaje: string = '';
  error: string = '';

  constructor(private http: HttpClient) {}

  registrar() {
    this.mensaje = '';
    this.error = '';

    const body = {
      nombre: this.nombre,
      email: this.email,
      password: this.password
    };

    this.http.post(`${environment.apiUrl}/auth/usuario`, body)
      .subscribe({
        next: () => {
          this.mensaje = 'Cuenta creada correctamente';
          this.nombre = '';
          this.email = '';
          this.password = '';
        },
        error: (err) => {
          console.error(err);
          this.error = err?.error?.message || 'Error al registrar tu cuenta';
        }
      });
  }
}
