import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Producto } from '../../../model/producto';
import { ProductoService } from '../../../service/producto-service';
import { NotificacionService } from '../../../service/notificacion-service';
import { esImagenDriveValida, normalizarImagenDrive } from '../../../utils/imagen-drive.util';

@Component({
  selector: 'app-producto-registrar-component',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './producto-registrar-component.html',
  styleUrl: './producto-registrar-component.css',
})
export class ProductoRegistrarComponent implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly notificacionService = inject(NotificacionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  guardando = false;

  rol: string = '';
  esAdmin = false;

  editandoId: number | null = null;
  productoForm: Producto = this.crearProductoVacio();

  ngOnInit(): void {
    this.rol = localStorage.getItem('rol') ?? '';
    this.esAdmin = this.rol === 'ADMIN' || this.rol === 'ROLE_ADMIN';

    if (!this.esAdmin) {
      this.notificacionService.warning('Solo administradores pueden gestionar productos');
      return;
    }

    this.route.queryParamMap.subscribe((params) => {
      const id = Number(params.get('id'));

      if (!Number.isNaN(id) && id > 0) {
        this.editandoId = id;
        this.cargarProductoParaEdicion(id);
        return;
      }

      this.prepararNuevo();
    });
  }

  private cargarProductoParaEdicion(id: number): void {
    const productoState = this.router.getCurrentNavigation()?.extras.state?.['producto'] as Producto | undefined;

    if (productoState?.id === id) {
      this.editandoId = id;
      this.productoForm = { ...productoState };
      return;
    }

    this.productoService.listar().subscribe({
      next: (productos) => {
        const producto = productos.find((p) => p.id === id);

        if (!producto) {
          this.notificacionService.warning('No se encontro el producto para editar');
          return;
        }

        this.editandoId = id;
        this.productoForm = { ...producto };
      },
      error: () => {
        this.notificacionService.error('No se pudo cargar el producto a editar');
      },
    });
  }

  private crearProductoVacio(): Producto {
    return {
      nombre: '',
      descripcion: '',
      precio: 0,
      stock: 0,
      imagenUrl: '',
      activo: true,
    };
  }

  prepararNuevo(): void {
    this.editandoId = null;
    this.productoForm = this.crearProductoVacio();
  }

  guardar(): void {
    const imagenIngresada = (this.productoForm.imagenUrl ?? '').trim();

    if (imagenIngresada && !esImagenDriveValida(imagenIngresada)) {
      this.notificacionService.warning('La imagen debe ser un enlace o ID valido de Google Drive');
      return;
    }

    const payload: Producto = {
      nombre: (this.productoForm.nombre ?? '').trim(),
      descripcion: (this.productoForm.descripcion ?? '').trim(),
      precio: Number(this.productoForm.precio),
      stock: Number(this.productoForm.stock),
      imagenUrl: normalizarImagenDrive(imagenIngresada),
      activo: this.productoForm.activo,
    };

    if (!payload.nombre || Number.isNaN(payload.precio) || Number.isNaN(payload.stock) || payload.precio < 0 || payload.stock < 0) {
      this.notificacionService.warning('Completa nombre, precio y stock con valores validos');
      return;
    }

    this.guardando = true;

    const request$ = this.editandoId
      ? this.productoService.actualizar(this.editandoId, payload)
      : this.productoService.registrar(payload);

    request$.subscribe({
      next: () => {
        this.notificacionService.success(this.editandoId ? 'Producto actualizado' : 'Producto registrado');
        this.guardando = false;
        this.router.navigate(['/productos']);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 500) {
          this.notificacionService.error('Error interno del servidor al guardar producto');
        } else if (error.status === 403) {
          this.notificacionService.error('No tienes permisos ADMIN para registrar productos');
        } else {
          this.notificacionService.error(`No se pudo guardar el producto (${error.status})`);
        }
        this.guardando = false;
      },
    });
  }

  get tituloFormulario(): string {
    return this.editandoId ? 'Editar producto' : 'Nuevo producto';
  }
}
