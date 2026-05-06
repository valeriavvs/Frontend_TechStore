import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  private http: HttpClient = inject(HttpClient);

  constructor() { }

  login(requestDto: RequestDto): Observable<ResponseDto> {
    const payload = {
      email: requestDto.email,
      password: requestDto.password,
      username: requestDto.email,
    };

    return this.http.post<ResponseDto>(this.authUrl, payload, { observe: 'response' }).pipe(
      map((response) => {
        const body = response.body ?? {};
        const headerAuth = response.headers.get('Authorization') ?? '';
        const headerToken = headerAuth.startsWith('Bearer ') ? headerAuth.replace('Bearer ', '') : '';
        const bodyToken = body.jwt ?? body.token ?? '';

        return {
          ...body,
          jwt: bodyToken || headerToken,
        };
      })
    );
  }

  getToken(){
    return localStorage.getItem('token');
  }
}

