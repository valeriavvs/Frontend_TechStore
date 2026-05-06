import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Producto } from '../model/producto';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductoService {
  private readonly url = environment.apiUrl;
  private http: HttpClient = inject(HttpClient);

  constructor() {}

  // POST /api/producto
  registrar(producto: Producto): Observable<Producto> {
    return this.http.post<Producto>(`${this.url}/producto`, producto);
  }

  // PUT /api/producto/{id}
  actualizar(id: number, producto: Producto): Observable<Producto> {
    return this.http.put<Producto>(`${this.url}/producto/${id}`, producto);
  }

  // PUT /api/producto/{id}/disminuir-stock
  disminuirStock(id: number): Observable<Producto> {
    return this.http.put<Producto>(`${this.url}/producto/${id}/disminuir-stock`, {});
  }

  // PUT /api/producto/{id}/disminuir-stock/{cantidad}
  disminuirStockCantidad(id: number, cantidad: number): Observable<Producto> {
    return this.http.put<Producto>(`${this.url}/producto/${id}/disminuir-stock/${cantidad}`, {});
  }

  // DELETE /api/producto/{id}
  eliminar(id: number): Observable<string> {
    return this.http.delete(`${this.url}/producto/${id}`, { responseType: 'text' });
  }

  // GET /api/productos
  listar(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.url}/productos`);
  }

  // GET /api/productos/activos
  listarActivos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.url}/productos/activos`);
  }

}
