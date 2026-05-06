import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Pedido } from '../model/pedido';

@Injectable({
  providedIn: 'root',
})
export class PedidoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly endpoint = `${this.apiUrl}/pedido`;

  // POST /api/pedido
  registrar(pedido: Pedido): Observable<Pedido> {
    return this.http.post<Pedido>(this.endpoint, pedido);
  }

  // GET /api/pedidos
  listar(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.apiUrl}/pedidos`);
  }

  // PUT /api/pedido/{id}/estado?estado=...
  actualizarEstado(id: number, estado: string): Observable<Pedido> {
    const estadoNormalizado = this.normalizarEstadoParaBackend(estado);

    return this.http.put<Pedido>(`${this.endpoint}/${id}/estado`, null, {
      params: { estado: estadoNormalizado },
    });
  }

  // GET /api/mis-pedidos/usuario/{id}
  listarMisPedidos(idUsuario: number): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.apiUrl}/mis-pedidos/usuario/${idUsuario}`);
  }

  // Alias útil si prefieres nombres en español similares al resto del proyecto.
  listarPorUsuario(idUsuario: number): Observable<Pedido[]> {
    return this.listarMisPedidos(idUsuario);
  }

  private normalizarEstadoParaBackend(estado: string): string {
    const clave = (estado ?? '').trim().toUpperCase();
    const mapa: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      CONFIRMADO: 'Confirmado',
      ENTREGADO: 'Entregado',
      CANCELADO: 'Cancelado',
      ENVIADO: 'Enviado',
    };

    return mapa[clave] ?? estado;
  }
}
