import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Producto } from '../../../model/producto';
import { ProductoService } from '../../../service/producto-service';
import { NotificacionService } from '../../../service/notificacion-service';
import { CarritoService } from '../../../service/carrito-service';
import { resolverImagenProducto } from '../../../utils/imagen-drive.util';

@Component({
  selector: 'app-producto-listar-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
  ],
  templateUrl: './producto-listar-component.html',
  styleUrl: './producto-listar-component.css',
})
export class ProductoListarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly productoService = inject(ProductoService);
  private readonly notificacionService = inject(NotificacionService);
  private readonly carritoService = inject(CarritoService);

  productos: Producto[] = [];
  terminoBusqueda = '';
  cargando = false;
  cantidadesSeleccionadas: Record<number, number> = {};
  agregandoPorProducto: Record<number, boolean> = {};

  rol: string = '';
  esAdmin = false;

  ngOnInit(): void {
    this.rol = localStorage.getItem('rol') ?? '';
    this.esAdmin = this.rol === 'ADMIN' || this.rol === 'ROLE_ADMIN';
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.cargando = true;

    const request$ = this.esAdmin
      ? this.productoService.listar()
      : this.productoService.listarActivos();

    request$.subscribe({
      next: (data) => {
        this.productos = data;
        this.sincronizarCantidades();
        this.cargando = false;
      },
      error: () => {
        this.notificacionService.error('No se pudieron cargar los productos');
        this.cargando = false;
      },
    });
  }

  get etiquetaRol(): string {
    return this.esAdmin ? 'Vista administrador' : 'Catalogo disponible';
  }

  get productosFiltrados(): Producto[] {
    const termino = this.normalizarTexto(this.terminoBusqueda);
    if (!termino) {
      return this.productos;
    }

    return this.productos.filter((producto) => this.normalizarTexto(producto.nombre).includes(termino));
  }

  get hayFiltrosActivos(): boolean {
    return this.normalizarTexto(this.terminoBusqueda).length > 0;
  }

  actualizarBusqueda(valor: string): void {
    this.terminoBusqueda = valor;
  }

  getOpcionesCantidad(stock: number): number[] {
    if (stock <= 0) {
      return [];
    }

    return Array.from({ length: stock }, (_, i) => i + 1);
  }

  getCantidadSeleccionada(producto: Producto): number {
    if (!producto.id) {
      return 0;
    }

    if (producto.stock <= 0) {
      return 0;
    }

    const actual = this.cantidadesSeleccionadas[producto.id];
    if (actual === undefined) {
      this.cantidadesSeleccionadas[producto.id] = 0;
      return 0;
    }

    return Math.min(Math.max(actual, 0), producto.stock);
  }

  actualizarCantidadSeleccionada(producto: Producto, valor: string): void {
    if (!producto.id || producto.stock <= 0) {
      return;
    }

    const cantidad = Number(valor);
    if (Number.isNaN(cantidad)) {
      return;
    }

    this.cantidadesSeleccionadas[producto.id] = Math.min(Math.max(cantidad, 0), producto.stock);
  }

  agregarAlCarrito(producto: Producto): void {
    if (this.esAdmin) {
      this.notificacionService.info('La compra desde catalogo esta disponible solo para usuarios');
      return;
    }

    const idUsuario = this.obtenerIdUsuario();
    if (!idUsuario) {
      this.notificacionService.warning('Tu sesion no tiene usuario activo. Vuelve a iniciar sesion');
      return;
    }

    if (!producto.id) {
      this.notificacionService.error('El producto no tiene identificador valido');
      return;
    }

    if (producto.stock <= 0) {
      this.notificacionService.warning('Producto sin stock');
      return;
    }

    const cantidad = this.getCantidadSeleccionada(producto);
    if (cantidad <= 0) {
      this.notificacionService.warning('Selecciona una cantidad primero');
      return;
    }

    this.agregandoPorProducto[producto.id] = true;
    this.carritoService.agregarProducto(idUsuario, producto, cantidad).subscribe({
      next: () => {
        this.cantidadesSeleccionadas[producto.id!] = 0;
        this.agregandoPorProducto[producto.id!] = false;
        this.notificacionService.success(`${producto.nombre} x${cantidad} agregado al carrito`);
      },
      error: () => {
        this.agregandoPorProducto[producto.id!] = false;
        this.notificacionService.error('No se pudo agregar el producto al carrito');
      },
    });
  }

  estaAgregando(producto: Producto): boolean {
    return !!producto.id && this.agregandoPorProducto[producto.id] === true;
  }

  toggleActivo(producto: Producto): void {
    if (!this.esAdmin || !producto.id) {
      return;
    }

    const payload: Producto = {
      ...producto,
      activo: !producto.activo,
    };

    this.productoService.actualizar(producto.id, payload).subscribe({
      next: (actualizado) => {
        producto.activo = actualizado.activo;
        this.notificacionService.success(actualizado.activo ? 'Producto activado' : 'Producto desactivado');
      },
      error: () => this.notificacionService.error('No se pudo actualizar el estado del producto'),
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('username');
    localStorage.removeItem('idUsuario');
    localStorage.removeItem('emailUsuario');
    this.router.navigate(['/login']);
  }

  private sincronizarCantidades(): void {
    const idsActuales = new Set<number>();

    for (const producto of this.productos) {
      if (!producto.id) {
        continue;
      }

      idsActuales.add(producto.id);
      this.ajustarCantidadSeleccionada(producto);
    }

    for (const id of Object.keys(this.cantidadesSeleccionadas).map(Number)) {
      if (!idsActuales.has(id)) {
        delete this.cantidadesSeleccionadas[id];
      }
    }
  }

  private ajustarCantidadSeleccionada(producto: Producto): void {
    if (!producto.id) {
      return;
    }

    if (producto.stock <= 0) {
      delete this.cantidadesSeleccionadas[producto.id];
      return;
    }

    const actual = this.cantidadesSeleccionadas[producto.id];
    this.cantidadesSeleccionadas[producto.id] = actual === undefined
      ? 0
      : Math.min(Math.max(actual, 0), producto.stock);
  }

  getImagenProducto(producto: Producto): string {
    return resolverImagenProducto(producto.imagenUrl);
  }

  onErrorImagen(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src.endsWith('/img/placeholder-techstore.svg')) {
      return;
    }

    img.src = '/img/placeholder-techstore.svg';
  }

  private obtenerIdUsuario(): number | null {
    const posiblesKeys = ['idUsuario', 'usuarioId', 'userId'];

    for (const key of posiblesKeys) {
      const valor = localStorage.getItem(key);
      if (!valor) {
        continue;
      }

      const id = Number(valor);
      if (!Number.isNaN(id) && id > 0) {
        return id;
      }
    }

    return null;
  }

  private normalizarTexto(valor: string | null | undefined): string {
    return (valor ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
