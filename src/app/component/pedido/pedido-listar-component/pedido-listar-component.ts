import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Pedido } from '../../../model/pedido';
import { NotificacionService } from '../../../service/notificacion-service';
import { PedidoService } from '../../../service/pedido-service';

@Component({
  selector: 'app-pedido-listar-component',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pedido-listar-component.html',
  styleUrl: './pedido-listar-component.css',
})
export class PedidoListarComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  private readonly notificacionService = inject(NotificacionService);

  pedidos: Pedido[] = [];
  estadoEdicion: Record<number, string> = {};
  detallesVisibles: Record<number, boolean> = {};
  cargando = false;
  error = '';
  idUsuario: number | null = null;
  esAdmin = false;
  estadoFiltro = '';

  readonly estadosDisponibles = ['Confirmado', 'Entregado', 'Cancelado'];

  get pedidosFiltrados(): Pedido[] {
    if (!this.estadoFiltro || !this.esAdmin) {
      return this.pedidos;
    }
    return this.pedidos.filter(
      (pedido) =>
        this.normalizarEstadoComparacion(pedido.estado) ===
        this.normalizarEstadoComparacion(this.estadoFiltro)
    );
  }

  ngOnInit(): void {
    this.esAdmin = ['ADMIN', 'ROLE_ADMIN'].includes(this.obtenerRol());
    this.idUsuario = this.obtenerIdUsuario();
    this.cargarPedidos();
  }

  cargarPedidos(): void {
    this.cargando = true;
    this.error = '';

    const request$ = this.esAdmin
      ? this.pedidoService.listar()
      : this.idUsuario
        ? this.pedidoService.listarPorUsuario(this.idUsuario)
        : null;

    if (!request$) {
      this.cargando = false;
      this.error = 'No se encontro el usuario en sesion. Inicia sesion nuevamente.';
      return;
    }

    request$.subscribe({
      next: (pedidos) => {
        this.pedidos = pedidos ?? [];
        this.estadoEdicion = this.construirEstadosEdicion(this.pedidos);
        this.cargando = false;
      },
      error: () => {
        this.pedidos = [];
        this.cargando = false;
        this.error = 'No se pudieron cargar los pedidos';
      },
    });
  }

  guardarEstado(pedido: Pedido): void {
    if (!this.esAdmin || !pedido.id) {
      return;
    }

    const nuevoEstado = this.estadoEdicion[pedido.id] ?? '';
    if (!nuevoEstado) {
      this.notificacionService.warning('Selecciona un estado para actualizar el pedido');
      return;
    }

    if (this.normalizarEstadoComparacion(nuevoEstado) === this.normalizarEstadoComparacion(pedido.estado)) {
      return;
    }

    this.pedidoService.actualizarEstado(pedido.id, nuevoEstado).subscribe({
      next: (actualizado) => {
        pedido.estado = actualizado.estado;
        this.estadoEdicion[pedido.id!] = '';
        this.notificacionService.success('Estado del pedido actualizado');

        if (this.normalizarEstadoComparacion(actualizado.estado) === 'CANCELADO') {
          this.notificacionService.info('Pedido cancelado, stock actualizado');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.notificacionService.error(this.obtenerMensajeError(error));
      },
    });
  }

  toggleDetalles(pedido: Pedido): void {
    if (!pedido.id) {
      return;
    }

    this.detallesVisibles[pedido.id] = !this.detallesVisibles[pedido.id];
  }

  tieneDetallesVisibles(pedido: Pedido): boolean {
    return !!pedido.id && this.detallesVisibles[pedido.id] === true;
  }

  obtenerFecha(pedido: Pedido): string {
    if (!pedido.fecha) {
      return '-';
    }

    return new Date(pedido.fecha).toLocaleString('es-PE');
  }

  formatearDetalles(pedido: Pedido): string {
    const cantidad = pedido.detalles?.length ?? 0;
    return `${cantidad} detalle${cantidad === 1 ? '' : 's'}`;
  }

  trackByPedidoId(_: number, pedido: Pedido): number | undefined {
    return pedido.id;
  }

  private obtenerRol(): string {
    return localStorage.getItem('rol') ?? '';
  }

  private obtenerIdUsuario(): number | null {
    const valor = localStorage.getItem('idUsuario');
    if (!valor) {
      return null;
    }

    const id = Number(valor);
    return Number.isNaN(id) || id <= 0 ? null : id;
  }

  private construirEstadosEdicion(pedidos: Pedido[]): Record<number, string> {
    return pedidos.reduce((acc, pedido) => {
      if (pedido.id) {
        acc[pedido.id] = '';
      }
      return acc;
    }, {} as Record<number, string>);
  }

  private normalizarEstadoComparacion(estado: string): string {
    return (estado ?? '').trim().toUpperCase();
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

    if (error.status === 400) {
      return 'Estado invalido para este pedido.';
    }

    if (error.status === 403) {
      return 'No tienes permisos para editar pedidos.';
    }

    return 'No se pudo actualizar el estado del pedido';
  }
}
