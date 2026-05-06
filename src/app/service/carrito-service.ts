import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Carrito } from '../model/carrito';
import { CarritoItem } from '../model/carrito-item';
import { Producto } from '../model/producto';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CarritoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly endpoint = `${this.apiUrl}/carrito`;
  private readonly endpointItem = `${this.apiUrl}/carrito-item`;
  private readonly endpointItems = `${this.apiUrl}/carrito-items`;

  guardar(carrito: Carrito): Observable<Carrito> {
    return this.http.post<Carrito>(this.endpoint, this.prepararPayload(carrito));
  }

  listar(): Observable<Carrito[]> {
    return this.http.get<Carrito[]>(`${this.apiUrl}/carritos`);
  }

  buscarPorId(id: number): Observable<Carrito> {
    return this.http.get<Carrito>(`${this.endpoint}/${id}`);
  }

  buscarPorUsuario(idUsuario: number): Observable<Carrito> {
    return this.http.get<Carrito>(`${this.endpoint}/usuario/${idUsuario}`);
  }

  // POST /api/carrito/{idCarrito}/confirmar
  confirmarPedido(idCarrito: number): Observable<unknown> {
    return this.http.post(`${this.endpoint}/${idCarrito}/confirmar`, {});
  }

  actualizar(id: number, carrito: Carrito): Observable<Carrito> {
    return this.http.put<Carrito>(`${this.endpoint}/${id}`, this.prepararPayload(carrito));
  }

  eliminar(id: number): Observable<string> {
    return this.http.delete(`${this.endpoint}/${id}`, { responseType: 'text' });
  }

  obtenerItemsPorUsuario(idUsuario: number): Observable<CarritoItem[]> {
    return this.buscarPorUsuario(idUsuario).pipe(
      map((carrito) => carrito.items ?? []),
      catchError(() => of([]))
    );
  }

  agregarProducto(idUsuario: number, producto: Producto, cantidad = 1): Observable<Carrito> {
    const stock = producto.stock ?? 0;
    const cantidadSolicitada = Math.max(1, cantidad);
    const cantidadValida = Math.min(cantidadSolicitada, stock);

    return this.buscarPorUsuario(idUsuario).pipe(
      // Si el backend responde error cuando no existe carrito, se crea uno nuevo.
      catchError(() => this.guardar({ idUsuario, items: [] } as Carrito)),
      switchMap((carrito) => {
        if (!carrito.id || !producto.id) {
          return of(carrito);
        }

        return this.http.get<CarritoItem[]>(`${this.endpointItems}/carrito/${carrito.id}`).pipe(
          catchError(() => of([])),
          switchMap((items) => {
            const existente = (items ?? []).find((item) => item.idProducto === producto.id);

            if (existente?.id) {
              const nuevaCantidad = Math.min((existente.cantidad ?? 0) + cantidadValida, stock);
              const precio = existente.precio ?? producto.precio;

              const payload: CarritoItem = {
                ...existente,
                idCarrito: carrito.id,
                idProducto: producto.id,
                cantidad: nuevaCantidad,
                nombreProducto: existente.nombreProducto ?? producto.nombre,
                precio,
                imagen: existente.imagen ?? producto.imagen,
                subtotal: precio * nuevaCantidad,
              };

              return this.http.put<CarritoItem>(`${this.endpointItem}/${existente.id}`, payload).pipe(
                map(() => carrito)
              );
            }

            const payload: CarritoItem = {
              idCarrito: carrito.id,
              idProducto: producto.id,
              cantidad: cantidadValida,
              nombreProducto: producto.nombre,
              precio: producto.precio,
              imagen: producto.imagen,
              subtotal: producto.precio * cantidadValida,
            };

            return this.http.post<CarritoItem>(this.endpointItem, payload).pipe(
              map(() => carrito)
            );
          })
        );
      })
    );
  }

  actualizarCantidad(idUsuario: number, productoId: number, nuevaCantidad: number): Observable<Carrito> {
    return this.buscarPorUsuario(idUsuario).pipe(
      switchMap((carrito) => {
        const items = carrito.items ?? [];
        const item = items.find((i) => i.idProducto === productoId);

        if (!item) {
          return of(carrito);
        }

        item.cantidad = Math.max(1, nuevaCantidad);
        item.subtotal = (item.precio ?? item.precioUnitario ?? 0) * item.cantidad;
        const payload: Carrito = { ...carrito, items };
        return payload.id ? this.actualizar(payload.id, payload) : this.guardar(payload);
      })
    );
  }

  eliminarProducto(idUsuario: number, productoId: number): Observable<Carrito> {
    return this.buscarPorUsuario(idUsuario).pipe(
      switchMap((carrito) => {
        const items = (carrito.items ?? []).filter((i) => i.idProducto !== productoId);
        const payload: Carrito = { ...carrito, items };
        return payload.id ? this.actualizar(payload.id, payload) : this.guardar(payload);
      })
    );
  }

  limpiarCarrito(idUsuario: number): Observable<Carrito> {
    return this.buscarPorUsuario(idUsuario).pipe(
      switchMap((carrito) => {
        const payload: Carrito = { ...carrito, items: [] };
        return payload.id ? this.actualizar(payload.id, payload) : this.guardar(payload);
      })
    );
  }

  private construirItem(producto: Producto, cantidad: number): CarritoItem {
    const stock = producto.stock ?? 0;
    const cantidadValida = Math.max(1, Math.min(cantidad, stock));
    return {
      idProducto: producto.id,
      cantidad: cantidadValida,
      nombreProducto: producto.nombre,
      precio: producto.precio,
      imagen: producto.imagen,
      precioUnitario: producto.precio,
      subtotal: producto.precio * cantidadValida,
      producto,
    };
  }

  private prepararPayload(carrito: Carrito): Carrito {
    return {
      ...carrito,
      items: (carrito.items ?? []).map((item) => this.toDtoItem(item, carrito.id)),
    };
  }

  private toDtoItem(item: CarritoItem, idCarrito?: number): CarritoItem {
    const precio = item.precio ?? item.precioUnitario ?? item.producto?.precio ?? 0;
    const nombreProducto = item.nombreProducto ?? item.producto?.nombre ?? '';
    const imagen = item.imagen ?? item.producto?.imagen ?? '';
    const idProducto = item.idProducto ?? item.producto?.id;

    return {
      id: item.id,
      idCarrito: item.idCarrito ?? idCarrito,
      idProducto,
      cantidad: item.cantidad,
      nombreProducto,
      precio,
      imagen,
      subtotal: item.subtotal ?? precio * item.cantidad,
    };
  }
}
