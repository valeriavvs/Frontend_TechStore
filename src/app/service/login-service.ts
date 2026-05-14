import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { environment } from '../environments/environment';
import { map, Observable } from 'rxjs';
import { RequestDto } from '../model/request-dto';
import { ResponseDto } from '../model/response-dto';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private readonly apiUrl = environment.apiUrl;
  private readonly authUrl = `${this.apiUrl}/auth/authenticate`;
  private readonly authGoogleUrl = `${this.apiUrl}/auth/google`;
  private http: HttpClient = inject(HttpClient);

  constructor() { }

  login(requestDto: RequestDto): Observable<ResponseDto> {
    const payload = {
      email: requestDto.email,
      password: requestDto.password,
      username: requestDto.email,
    };

    return this.http.post<ResponseDto>(this.authUrl, payload, { observe: 'response' }).pipe(
      map((response: HttpResponse<ResponseDto>) => this.normalizarRespuestaAuth(response))
    );
  }

  loginConGoogle(idToken: string): Observable<ResponseDto> {
    return this.http.post<ResponseDto>(this.authGoogleUrl, { idToken }, { observe: 'response' }).pipe(
      map((response: HttpResponse<ResponseDto>) => this.normalizarRespuestaAuth(response))
    );
  }

  obtenerPerfilAutenticado(): Observable<ResponseDto> {
    return this.http.get<ResponseDto>(`${this.apiUrl}/auth/me`);
  }

  private normalizarRespuestaAuth(response: HttpResponse<ResponseDto>): ResponseDto {
    const body = response.body ?? {};
    const headerAuth = response.headers.get('Authorization') ?? '';
    const headerToken = headerAuth.startsWith('Bearer ') ? headerAuth.replace('Bearer ', '') : '';
    const bodyToken = body.jwt ?? body.token ?? '';

    return {
      ...body,
      jwt: bodyToken || headerToken,
    };
  }
}

