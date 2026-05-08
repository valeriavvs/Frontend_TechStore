import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, switchMap } from 'rxjs';
import { CarritoItem } from '../../../model/carrito-item';
import { CarritoService } from '../../../service/carrito-service';
import { CarritoItemService } from '../../../service/carrito-item-service';
import { NotificacionService } from '../../../service/notificacion-service';
import { resolverImagenProducto } from '../../../utils/imagen-drive.util';

@Component({
  selector: 'app-carrito-listar-component',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './carrito-listar-component.html',
  styleUrl: './carrito-listar-component.css',
})
export class CarritoListarComponent implements OnInit {
  private readonly carritoService = inject(CarritoService);
  private readonly carritoItemService = inject(CarritoItemService);
  private readonly notificacionService = inject(NotificacionService);

  items: CarritoItem[] = [];
  idUsuario: number | null = null;
  idCarrito: number | null = null;
  cargando = false;
  procesando = false;
  error = '';

  ngOnInit(): void {
    this.idUsuario = this.obtenerIdUsuario();

    if (!this.idUsuario) {
      this.error = 'No se encontro el usuario en sesion. Inicia sesion nuevamente.';
      return;
    }

    this.cargarCarrito();
  }

  get total(): number {
    return this.items.reduce((acc, item) => {
      const precio = item.precio ?? item.precioUnitario ?? 0;
      const subtotal = item.subtotal ?? precio * item.cantidad;
      return acc + subtotal;
    }, 0);
  }

  disminuir(item: CarritoItem): void {
    const cantidad = Math.max(1, item.cantidad - 1);
    this.cambiarCantidad(item, cantidad);
  }

  aumentar(item: CarritoItem): void {
    this.cambiarCantidad(item, item.cantidad + 1);
  }

  cambiarCantidadDesdeInput(item: CarritoItem, valor: string): void {
    const nuevaCantidad = Number(valor);
    if (Number.isNaN(nuevaCantidad) || nuevaCantidad < 1) {
      this.notificacionService.warning('La cantidad minima es 1');
      return;
    }

    this.cambiarCantidad(item, nuevaCantidad);
  }

  confirmarPedido(): void {
    if (this.items.length === 0) {
      this.notificacionService.warning('Tu carrito esta vacio');
      return;
    }

    if (!this.idCarrito) {
      this.notificacionService.error('No se encontro un carrito valido para confirmar');
      return;
    }

    this.procesando = true;

    this.carritoService.confirmarPedido(this.idCarrito).subscribe({
      next: () => {
        this.procesando = false;
        this.cargarCarrito();
        this.notificacionService.success('Te enviamos un correo donde te estaremos contactando');
      },
      error: (error: HttpErrorResponse) => {
        this.procesando = false;
        this.notificacionService.error(this.obtenerMensajeError(error));
      },
    });
  }

  eliminarItem(item: CarritoItem): void {
    if (!item.id) {
      this.notificacionService.error('No se puede eliminar este item');
      return;
    }

    this.procesando = true;
    this.carritoItemService.eliminar(item.id).subscribe({
      next: () => {
        this.cargarCarrito();
        this.procesando = false;
        this.notificacionService.success('Producto eliminado del carrito');
      },
      error: () => {
        this.procesando = false;
        this.notificacionService.error('No se pudo eliminar el producto');
      },
    });
  }

  getImagen(item: CarritoItem): string {
    return resolverImagenProducto(item.imagenUrl ?? item.imagen);
  }

  onErrorImagen(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src.endsWith('/img/placeholder-techstore.svg')) {
      return;
    }

    img.src = '/img/placeholder-techstore.svg';
  }

  private cargarCarrito(): void {
    if (!this.idUsuario) {
      return;
    }

    this.cargando = true;
    this.error = '';

    this.carritoService.buscarPorUsuario(this.idUsuario).pipe(
      switchMap((carrito) => {
        this.idCarrito = carrito.id ?? null;
        if (!this.idCarrito) {
          this.items = [];
          this.cargando = false;
          return of([]);
        }

        return this.carritoItemService.listarPorCarrito(this.idCarrito);
      })
    ).subscribe({
      next: (items) => {
        this.items = (items ?? []).map((item) => ({
          ...item,
          idCarrito: item.idCarrito ?? this.idCarrito ?? undefined,
        }));
        this.cargando = false;
      },
      error: (error: HttpErrorResponse) => {
        this.cargando = false;

        // Algunos backends devuelven 500 cuando aun no existe carrito del usuario.
        if (error.status === 404 || error.status === 500) {
          this.idCarrito = null;
          this.items = [];
          this.error = '';
          return;
        }

        this.items = [];
        this.error = 'No se pudo cargar tu carrito';
      },
    });
  }

  private cambiarCantidad(item: CarritoItem, nuevaCantidad: number): void {
    if (!item.id) {
      this.notificacionService.error('No se puede actualizar este item');
      return;
    }

    this.procesando = true;

    const payload: CarritoItem = {
      ...item,
      idCarrito: item.idCarrito ?? this.idCarrito ?? undefined,
      cantidad: nuevaCantidad,
      subtotal: (item.precio ?? item.precioUnitario ?? 0) * nuevaCantidad,
    };

    this.carritoItemService.actualizar(item.id, payload).subscribe({
      next: () => {
        this.cargarCarrito();
        this.procesando = false;
      },
      error: () => {
        this.procesando = false;
        this.notificacionService.error('No se pudo actualizar la cantidad');
      },
    });
  }

  private obtenerIdUsuario(): number | null {
    const valor = localStorage.getItem('idUsuario');
    if (!valor) {
      return null;
    }

    const id = Number(valor);
    return Number.isNaN(id) || id <= 0 ? null : id;
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const body = error.error as { message?: string; detalle?: string } | string | null;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body === 'object') {
      if (body.message) {
        return body.message;
      }

      if (body.detalle) {
        return body.detalle;
      }
    }

    if (error.status === 409) {
      return 'No hay stock suficiente para confirmar tu pedido.';
    }

    if (error.status === 404) {
      return 'Uno o mas productos ya no existen.';
    }

    if (error.status === 400) {
      return 'La cantidad de uno de los productos es invalida.';
    }

    if (error.status === 403) {
      return 'No tienes permisos para confirmar este pedido.';
    }

    return 'No se pudo confirmar el pedido';
  }
}
