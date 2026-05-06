import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UsuarioDto } from '../../../model/usuario-dto';
import { NotificacionService } from '../../../service/notificacion-service';
import { UsuarioService } from '../../../service/usuario-service';

@Component({
  selector: 'app-usuario-actualizar-component',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuario-actualizar-component.html',
  styleUrl: './usuario-actualizar-component.css',
})
export class UsuarioActualizarComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly notificacionService = inject(NotificacionService);
  private readonly router = inject(Router);

  filtroUsuarios = '';
  usuarios: UsuarioDto[] = [];
  cargando = false;
  guardando = false;
  usuarioCargado = false;

  rol: string = '';
  esAdmin = false;

  usuarioForm: UsuarioDto = {
    id: 0,
    nombre: '',
    email: '',
    password: '',
    rol: 'USER',
  };

  ngOnInit(): void {
    this.rol = localStorage.getItem('rol') ?? '';
    this.esAdmin = this.rol === 'ADMIN' || this.rol === 'ROLE_ADMIN';

    if (!this.esAdmin) {
      this.notificacionService.warning('Solo administradores pueden actualizar usuarios');
      this.router.navigate(['/productos']);
      return;
    }

    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.cargando = true;
    this.usuarioService.listarUsuarios().subscribe({
      next: (usuarios) => {
        this.cargando = false;
        this.usuarios = usuarios.map((usuario) => ({
          ...usuario,
          rol: this.normalizarRol(usuario.rol),
        }));
      },
      error: () => {
        this.cargando = false;
        this.notificacionService.error('No se pudo listar usuarios');
      },
    });
  }

  get usuariosFiltrados(): UsuarioDto[] {
    const termino = this.normalizarTexto(this.filtroUsuarios);
    if (!termino) {
      return this.usuarios;
    }

    return this.usuarios.filter((usuario) => {
      const nombre = this.normalizarTexto(usuario.nombre);
      const correo = this.normalizarTexto(usuario.email);
      return nombre.includes(termino) || correo.includes(termino);
    });
  }

  seleccionarUsuario(usuario: UsuarioDto): void {
    this.usuarioForm = {
      ...usuario,
      password: '',
      rol: this.normalizarRol(usuario.rol),
    };
    this.usuarioCargado = true;
  }

  guardarCambios(): void {
    if (!this.usuarioCargado) {
      this.notificacionService.warning('Primero busca y carga un usuario');
      return;
    }

    const nombre = this.usuarioForm.nombre.trim();
    const email = this.usuarioForm.email.trim();
    const password = this.usuarioForm.password.trim();
    const rol = this.normalizarRol(this.usuarioForm.rol);

    if (!nombre || !email) {
      this.notificacionService.warning('Nombre y correo son obligatorios');
      return;
    }

    if (!this.esEmailValido(email)) {
      this.notificacionService.warning('El correo no tiene un formato valido');
      return;
    }

    if (password && password.length < 6) {
      this.notificacionService.warning('La contrasena debe tener al menos 6 caracteres');
      return;
    }

    this.guardando = true;
    const payload: UsuarioDto = {
      ...this.usuarioForm,
      nombre,
      email,
      password,
      rol,
    };

    this.usuarioService.actualizar(payload).subscribe({
      next: (usuarioActualizado) => {
        this.guardando = false;
        this.usuarioForm = {
          ...usuarioActualizado,
          password: '',
          rol: this.normalizarRol(usuarioActualizado.rol),
        };
        this.cargarUsuarios();
        this.notificacionService.success('Usuario actualizado correctamente');
      },
      error: () => {
        this.guardando = false;
        this.notificacionService.error('No se pudo actualizar el usuario');
      },
    });
  }

  limpiarFormulario(): void {
    this.usuarioCargado = false;
    this.usuarioForm = {
      id: 0,
      nombre: '',
      email: '',
      password: '',
      rol: 'USER',
    };
  }

  private normalizarRol(rol: string | null | undefined): string {
    const valor = (rol ?? '').toUpperCase().replace('ROLE_', '');
    return valor === 'ADMIN' ? 'ADMIN' : 'USER';
  }

  private esEmailValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private normalizarTexto(valor: string | null | undefined): string {
    return (valor ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
