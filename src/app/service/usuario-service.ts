import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { UsuarioDto } from '../model/usuario-dto';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listarUsuarios(): Observable<UsuarioDto[]> {
    return this.http.get<unknown>(`${this.apiUrl}/usuarios`).pipe(
      map((respuesta) => this.normalizarUsuarios(respuesta))
    );
  }

  buscarPorEmail(email: string): Observable<UsuarioDto | null> {
    const correo = encodeURIComponent(email.trim());
    const rutas = [
      `${this.apiUrl}/usuario/email/${correo}`,
      `${this.apiUrl}/usuarios/email/${correo}`,
      `${this.apiUrl}/usuario/por-email/${correo}`,
      `${this.apiUrl}/auth/usuario/email/${correo}`,
    ];

    return this.probarRutasGet(rutas);
  }

  actualizar(usuario: UsuarioDto): Observable<UsuarioDto> {
    if (!usuario.id || usuario.id <= 0) {
      return throwError(() => new Error('ID de usuario invalido'));
    }

    const payload: Record<string, string> = {
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    };

    if ((usuario.password ?? '').trim()) {
      payload['password'] = usuario.password;
    }

    const rutas = [
      `${this.apiUrl}/usuario/${usuario.id}`,
      `${this.apiUrl}/usuarios/${usuario.id}`,
      `${this.apiUrl}/auth/usuario/${usuario.id}`,
      `${this.apiUrl}/auth/usuarios/${usuario.id}`,
    ];

    return this.probarRutasPut(rutas, payload).pipe(
      map((respuesta) => this.normalizarUsuario(respuesta)),
      switchMap((normalizado) => {
        if (!normalizado) {
          return throwError(() => new Error('No se pudo normalizar la respuesta de actualizacion'));
        }

        return of(normalizado);
      })
    );
  }

  private probarRutasGet(rutas: string[]): Observable<UsuarioDto | null> {
    if (rutas.length === 0) {
      return of(null);
    }

    const [rutaActual, ...resto] = rutas;

    return this.http.get<unknown>(rutaActual).pipe(
      map((respuesta) => this.normalizarUsuario(respuesta)),
      catchError(() => this.probarRutasGet(resto))
    );
  }

  private probarRutasPut(rutas: string[], payload: unknown): Observable<unknown> {
    if (rutas.length === 0) {
      return throwError(() => new Error('No existe endpoint de actualizacion disponible'));
    }

    const [rutaActual, ...resto] = rutas;

    return this.http.put<unknown>(rutaActual, payload).pipe(
      catchError(() => this.probarRutasPut(resto, payload))
    );
  }

  private normalizarUsuario(respuesta: unknown): UsuarioDto | null {
    const objeto = this.comoObjeto(respuesta);
    if (!objeto) {
      return null;
    }

    const candidato = this.comoObjeto(objeto['usuario'])
      ?? this.comoObjeto(objeto['data'])
      ?? this.comoObjeto(objeto['payload'])
      ?? this.comoObjeto(objeto['result'])
      ?? objeto;

    const id = Number(candidato['id']);
    const nombre = this.comoTexto(candidato['nombre']);
    const email = this.comoTexto(candidato['email']);
    const password = this.comoTexto(candidato['password']);
    const rol = this.comoTexto(candidato['rol']);

    if (Number.isNaN(id) || id <= 0) {
      return null;
    }

    return {
      id,
      nombre,
      email,
      password,
      rol,
    };
  }

  private normalizarUsuarios(respuesta: unknown): UsuarioDto[] {
    if (Array.isArray(respuesta)) {
      return respuesta
        .map((item) => this.normalizarUsuario(item))
        .filter((item): item is UsuarioDto => item !== null);
    }

    const objeto = this.comoObjeto(respuesta);
    if (!objeto) {
      return [];
    }

    const posiblesListas = [
      objeto['usuarios'],
      objeto['data'],
      objeto['payload'],
      objeto['result'],
    ];

    for (const posible of posiblesListas) {
      if (!Array.isArray(posible)) {
        continue;
      }

      return posible
        .map((item) => this.normalizarUsuario(item))
        .filter((item): item is UsuarioDto => item !== null);
    }

    return [];
  }

  private comoObjeto(valor: unknown): Record<string, unknown> | null {
    return valor && typeof valor === 'object' && !Array.isArray(valor)
      ? (valor as Record<string, unknown>)
      : null;
  }

  private comoTexto(valor: unknown): string {
    return typeof valor === 'string' ? valor : '';
  }
}
