import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { CarritoItem } from '../model/carrito-item';

type CarritoItemPayload = Omit<CarritoItem, 'producto' | 'precioUnitario'>;

@Injectable({
  providedIn: 'root',
})
export class CarritoItemService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly url = environment.apiUrl;

  // POST /api/carrito-item
  guardar(item: CarritoItem): Observable<CarritoItem> {
    return this.http.post<CarritoItem>(`${this.url}/carrito-item`, this.toPayload(item));
  }

  // GET /api/carrito-items
  listar(): Observable<CarritoItem[]> {
    return this.http.get<CarritoItem[]>(`${this.url}/carrito-items`);
  }

  // GET /api/carrito-items/carrito/{idCarrito}
  listarPorCarrito(idCarrito: number): Observable<CarritoItem[]> {
    return this.http.get<CarritoItem[]>(`${this.url}/carrito-items/carrito/${idCarrito}`);
  }

  // PUT /api/carrito-item/{id}
  actualizar(id: number, item: CarritoItem): Observable<CarritoItem> {
    return this.http.put<CarritoItem>(`${this.url}/carrito-item/${id}`, this.toPayload(item));
  }

  // DELETE /api/carrito-item/{id}
  eliminar(id: number): Observable<string> {
    return this.http.delete(`${this.url}/carrito-item/${id}`, { responseType: 'text' });
  }

  private toPayload(item: CarritoItem): CarritoItemPayload {
    const precio = item.precio ?? item.precioUnitario ?? item.producto?.precio ?? 0;

    return {
      id: item.id,
      idCarrito: item.idCarrito,
      idProducto: item.idProducto ?? item.producto?.id,
      cantidad: item.cantidad,
      nombreProducto: item.nombreProducto ?? item.producto?.nombre ?? '',
      precio,
      imagen: item.imagen ?? item.producto?.imagenUrl ?? '',
      subtotal: item.subtotal ?? precio * item.cantidad,
    };
  }
}
