import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Pago, RespuestaPago } from '../model/pago';

@Injectable({
  providedIn: 'root'
})
export class PagoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/payments`;

  procesarPago(pago: Pago): Observable<RespuestaPago> {
    return this.http.post<RespuestaPago>(this.apiUrl, pago);
  }
}


