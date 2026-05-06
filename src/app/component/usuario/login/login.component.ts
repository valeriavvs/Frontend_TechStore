import {Component, inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import { LoginService } from '../../../service/login-service';
import { NotificacionService } from '../../../service/notificacion-service';
import {RequestDto} from '../../../model/request-dto';
import {ResponseDto} from '../../../model/response-dto';

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

          const rol = data.rol ?? data.roles?.[0] ?? '';
          const nombreUsuario = data.usuario?.nombre ?? data.nombre ?? data.usuario?.email ?? data.email ?? requestDto.email;
          const idUsuario = data.idUsuario ?? data.id ?? data.usuario?.id;
          const token = data.jwt ?? data.token ?? '';

          console.log('[Login] Token recibido', token ? 'SI' : 'NO', token);
          console.log('[Login] Usuario detectado', { rol, nombreUsuario, idUsuario });

          if (token) {
            localStorage.setItem('token', token);
          }
          localStorage.setItem('rol', rol);
          localStorage.setItem('username', nombreUsuario);
          localStorage.setItem('emailUsuario', data.email ?? data.usuario?.email ?? requestDto.email);

          if (idUsuario) {
            localStorage.setItem('idUsuario', String(idUsuario));
            console.log('[Login] idUsuario guardado', idUsuario);
            this.irAProductos();
          } else {
            console.warn('[Login] No llegó idUsuario en el login. Intentando recuperarlo con /auth/me...');

            this.loginService.obtenerPerfilAutenticado().subscribe({
              next: (perfil: ResponseDto) => {
                console.log('[Login] Respuesta de /auth/me', perfil);

                const idRecuperado = perfil.idUsuario ?? perfil.id ?? perfil.usuario?.id;
                const emailRecuperado = perfil.email ?? perfil.usuario?.email ?? requestDto.email;
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

  private irAProductos(): void {
    console.log('[Login] Navegando a /productos');
    this.notificacionService.success('Login correcto');

    void this.router.navigate(['/productos'], { replaceUrl: true }).then((navego: boolean) => {
      console.log('[Login] Resultado navegación /productos', navego);
    });
  }
}
