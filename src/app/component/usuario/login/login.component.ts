import {Component, inject} from '@angular/core';
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
export class LoginComponent {
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
    if (this.loginForm.valid) {
      const requestDto: RequestDto = new RequestDto();
      requestDto.email = this.loginForm.value.email;
      requestDto.password = this.loginForm.value.password;

      this.loginService.login(requestDto).subscribe({
        next: (data: ResponseDto): void => {
          const rol = data.rol ?? data.roles?.[0] ?? '';
          const nombreUsuario = data.usuario?.nombre ?? data.nombre ?? data.usuario?.email ?? data.email ?? requestDto.email;
          const idUsuario = data.idUsuario ?? data.id ?? data.usuario?.id;

          if (data.jwt) {
            localStorage.setItem('token', data.jwt);
          }
          localStorage.setItem('rol', rol);
          localStorage.setItem('username', nombreUsuario);
          if (idUsuario) {
            localStorage.setItem('idUsuario', String(idUsuario));
          } else {
            this.notificacionService.error('No se recibio idUsuario en el login. Vuelve a iniciar sesion.');
            return;
          }

          this.notificacionService.success('Login correcto');
          this.router.navigate(['/productos']);
        },
        error: () => {
          this.notificacionService.error('Correo o contrasena incorrectos');
        }
      });
    } else {
      this.notificacionService.warning('Formulario no valido');
    }
  }
}
