import {Component, inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import { LoginService } from '../../../service/login-service';
import { NotificacionService } from '../../../service/notificacion-service';
import {RequestDto} from '../../../model/request-dto';
import {ResponseDto} from '../../../model/response-dto';
import { environment } from '../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  router: Router = inject(Router);
  loginForm: FormGroup;
  fb = inject(FormBuilder);
  loginService: LoginService = inject(LoginService);
  notificacionService: NotificacionService = inject(NotificacionService);
  private googleInicializado = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    })
  }

  ngOnInit() {
    console.log('[Login] ngOnInit');
    localStorage.removeItem('idUsuario');
    if (localStorage.getItem('token') != null) {
      localStorage.removeItem('token');
      //localStorage.removeItem('username');
      console.log("Token eliminado");
    }
    this.loadForm()
    this.configurarGoogleIdentityServices();
  }

  loadForm(): void {
    console.log("Form");
  }

  onSubmit() {
    console.log('[Login] onSubmit', this.loginForm.value);

    if (this.loginForm.valid) {
      const requestDto: RequestDto = new RequestDto();
      requestDto.email = this.loginForm.value.email;
      requestDto.password = this.loginForm.value.password;

      console.log('[Login] Enviando credenciales', { email: requestDto.email });

      this.loginService.login(requestDto).subscribe({
        next: (data: ResponseDto): void => {
          console.log('[Login] Respuesta exitosa del backend', data);
          this.guardarSesionYRedirigir(data, requestDto.email, 'login normal');
        },
        error: (error: unknown) => {
          console.error('[Login] Error en login', error);
          this.notificacionService.error('Correo o contrasena incorrectos');
        }
      });
    } else {
      console.warn('[Login] Formulario inválido', this.loginForm.errors, this.loginForm.value);
      this.notificacionService.warning('Formulario no valido');
    }
  }

  // Eliminado el flujo con prompt. Google renderButton() se usa para mostrar
  // el botón oficial y el callback manejará la credencial.

  private configurarGoogleIdentityServices(): void {
    if (this.googleInicializado) {
      return;
    }

    this.esperarGoogleDisponible(3000).then((disponible) => {
      if (!disponible) {
        console.warn('[Login] Google Identity Services no estuvo disponible en el tiempo esperado');
        return;
      }

      const googleClientId = (environment as { googleClientId?: string }).googleClientId ?? '';
      if (!googleClientId) {
        console.warn('[Login] Falta googleClientId en environment');
        return;
      }

      // Inicializa la librería y renderiza el botón oficial dentro del contenedor #googleButton
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: { credential?: string }) => {
          console.log('[Login] Credential recibido desde Google', response ? 'SI' : 'NO');
          this.procesarCredentialGoogle(response);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      const container = document.getElementById('googleButton');
      try {
          if (container) {
              // Renderizamos el botón oficial con tema más acorde a la UI
              google.accounts.id.renderButton(container, {
                theme: 'filled_blue', // botón con fondo azul
                size: 'large',
                type: 'standard',
                text: 'continue_with',
                shape: 'pill',
                logo_alignment: 'left'
              });
            } else {
          console.warn('[Login] Contenedor #googleButton no encontrado para renderButton');
        }
      } catch (err) {
        console.error('[Login] Error al renderizar el botón de Google', err);
      }

      this.googleInicializado = true;
      console.log('[Login] Google Identity Services inicializado y botón renderizado');
    });
  }

  private esperarGoogleDisponible(timeoutMs: number): Promise<boolean> {
    const intervalo = 100;
    const max = Math.ceil(timeoutMs / intervalo);
    let contador = 0;
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (typeof (window as any).google !== 'undefined' && (window as any).google?.accounts?.id) {
          clearInterval(timer);
          resolve(true);
          return;
        }
        contador++;
        if (contador >= max) {
          clearInterval(timer);
          resolve(false);
        }
      }, intervalo);
    });
  }

  private procesarCredentialGoogle(response: { credential?: string }): void {
    const idToken = response?.credential ?? '';
    console.log('[Login] idToken de Google', idToken ? 'SI' : 'NO');

    if (!idToken) {
      this.notificacionService.error('No se recibió la credencial de Google');
      return;
    }

    this.loginService.loginConGoogle(idToken).subscribe({
      next: (data: ResponseDto): void => {
        console.log('[Login] Respuesta exitosa del backend por Google', data);
        this.guardarSesionYRedirigir(data, data.email ?? '', 'Google');
      },
      error: (error: unknown) => {
        console.error('[Login] Error en login con Google', error);
        this.notificacionService.error('No se pudo ingresar con Google');
      }
    });
  }

  private guardarSesionYRedirigir(data: ResponseDto, emailFallback: string, origen: string): void {
    const rol = data.rol ?? data.roles?.[0] ?? '';
    const nombreUsuario = data.usuario?.nombre ?? data.nombre ?? data.usuario?.email ?? data.email ?? emailFallback;
    const idUsuario = data.idUsuario ?? data.id ?? data.usuario?.id;
    const token = data.jwt ?? data.token ?? '';
    const emailUsuario = data.email ?? data.usuario?.email ?? emailFallback;

    console.log(`[Login] Normalizando respuesta de ${origen}`, { rol, nombreUsuario, idUsuario, token: !!token, emailUsuario });

    if (token) {
      localStorage.setItem('token', token);
    }

    localStorage.setItem('rol', rol);
    localStorage.setItem('username', nombreUsuario);
    localStorage.setItem('emailUsuario', emailUsuario);

    if (idUsuario) {
      localStorage.setItem('idUsuario', String(idUsuario));
      console.log('[Login] idUsuario guardado', idUsuario);
      this.irAProductos();
      return;
    }

    console.warn('[Login] No llegó idUsuario. Intentando recuperarlo con /auth/me...');

    this.loginService.obtenerPerfilAutenticado().subscribe({
      next: (perfil: ResponseDto) => {
        console.log('[Login] Respuesta de /auth/me', perfil);

        const idRecuperado = perfil.idUsuario ?? perfil.id ?? perfil.usuario?.id;
        const emailRecuperado = perfil.email ?? perfil.usuario?.email ?? emailFallback;
        const nombreRecuperado = perfil.usuario?.nombre ?? perfil.nombre ?? emailRecuperado;

        if (idRecuperado) {
          localStorage.setItem('idUsuario', String(idRecuperado));
          localStorage.setItem('emailUsuario', emailRecuperado);
          localStorage.setItem('username', nombreRecuperado);
          console.log('[Login] idUsuario recuperado desde /auth/me', idRecuperado);
        } else {
          console.warn('[Login] /auth/me tampoco devolvió idUsuario. Se navegará igualmente para no bloquear la sesión.');
        }

        this.irAProductos();
      },
      error: (error: unknown) => {
        console.error('[Login] Error al consultar /auth/me', error);
        this.irAProductos();
      },
    });
  }

  private irAProductos(): void {
    console.log('[Login] Navegando a /productos');
    this.notificacionService.success('Login correcto');

    void this.router.navigate(['/productos'], { replaceUrl: true }).then((navego: boolean) => {
      console.log('[Login] Resultado navegación /productos', navego);
    });
  }
}
