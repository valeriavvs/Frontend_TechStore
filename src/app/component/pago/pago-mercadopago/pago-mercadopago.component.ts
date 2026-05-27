import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PagoService } from '../../../service/pago-service';
import { NotificacionService } from '../../../service/notificacion-service';
import { CheckoutConfirmarRequest, RespuestaPago } from '../../../model/pago';
import { environment } from '../../../environments/environment';

declare const MercadoPago: any;

@Component({
  selector: 'app-pago-mercadopago',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pago-mercadopago.component.html',
  styleUrl: './pago-mercadopago.component.css',
})
export class PagoMercadopagoComponent implements OnInit {
  @Input() monto: number = 0;
  @Input() email: string = '';
  @Input() descripcion: string = 'Compra TechStore';
  @Input() carritoId: number | null = null;
  @Output() pagoExitoso = new EventEmitter<RespuestaPago>();
  @Output() pagoCancelado = new EventEmitter<void>();

  private readonly pagoService = inject(PagoService);
  private readonly notificacionService = inject(NotificacionService);
  private cardFormInstance: any = null;
  private readonly publicKey = environment.mercadoPagoPublicKey;

  procesando = false;
  mostrarFormulario = false;

  ngOnInit(): void {
    console.log('[MercadoPago] componente inicializado');
  }

  abrirFormularioPago(): void {
    if (this.monto <= 0) {
      this.notificacionService.warning('No hay un total válido para pagar');
      return;
    }

    this.mostrarFormulario = true;
    this.procesando = false;

    setTimeout(() => {
      this.inicializarCardForm();
    }, 0);
  }

  cerrarFormularioPago(): void {
    this.destruirCardForm();
    this.mostrarFormulario = false;
    this.procesando = false;
    this.pagoCancelado.emit();
  }

  private inicializarCardForm(): void {
    if (!this.mostrarFormulario) {
      return;
    }

    // Esperar a que MercadoPago esté disponible
    this.esperarMercadoPago(0);
  }

  private esperarMercadoPago(intentos: number): void {
    if (typeof MercadoPago === 'undefined') {
      if (intentos > 50) { // máximo 50 intentos = 5 segundos
        console.error('[MercadoPago] No se cargó después de múltiples intentos');
        this.notificacionService.error('No se pudo cargar Mercado Pago. Intenta de nuevo.');
        this.cerrarFormularioPago();
        return;
      }
      setTimeout(() => this.esperarMercadoPago(intentos + 1), 100);
      return;
    }

    try {
      this.destruirCardForm();
      console.log('[MercadoPago] SDK cargado, inicializando CardForm');

      const mp = new MercadoPago(this.publicKey, { locale: 'es-PE' });
      this.cardFormInstance = mp.cardForm({
        amount: String(this.monto.toFixed(2)),
        // Mercado Pago monta los campos seguros dentro de los contenedores con iframe.
        iframe: true,
        form: {
          id: 'payment-form',
          cardholderName: {
            id: 'mp-cardholder-name',
            placeholder: 'Nombre como aparece en la tarjeta',
          },
          cardNumber: {
            id: 'mp-card-number',
            placeholder: '0000 0000 0000 0000',
          },
          cardExpirationDate: {
            id: 'mp-card-expiration',
            placeholder: 'MM/AA',
          },
          securityCode: {
            id: 'mp-card-security',
            placeholder: 'CVV',
          },
          installments: {
            id: 'mp-card-installments',
            placeholder: 'Cuotas',
          },
          issuer: {
            id: 'mp-card-issuer',
            placeholder: 'Emisor',
          },
          identificationType: {
            id: 'mp-card-identification-type',
            placeholder: 'Tipo de documento',
          },
          identificationNumber: {
            id: 'mp-card-identification-number',
            placeholder: 'Número de documento',
          },
        },
        callbacks: {
          onFormMounted: (error: unknown) => {
            if (error) {
              console.error('[MercadoPago] error al montar CardForm', error);
              this.notificacionService.error('No se pudo iniciar el formulario de pago');
              return;
            }

            console.log('[MercadoPago] CardForm montado correctamente');
            setTimeout(() => this.verificarMontajeCardForm(), 0);
          },
          onSubmit: async (event: Event) => {
            event.preventDefault();
            console.log('[MercadoPago] onSubmit disparado');
            await this.enviarPago();
          },
          onFetching: (resource: unknown) => {
            console.log('[MercadoPago] onFetching', resource);
          },
          onError: (error: unknown) => {
            console.error('[MercadoPago] onError', error);
            this.notificacionService.error('Mercado Pago no pudo validar la tarjeta');
          },
        },
      });
    } catch (error) {
      console.error('[MercadoPago] error inicializando CardForm', error);
      this.notificacionService.error('Error al preparar el pago con tarjeta');
    }
  }

  private async enviarPago(): Promise<void> {
    if (!this.cardFormInstance) {
      this.notificacionService.error('El formulario de pago todavía no está listo');
      return;
    }

    if (!this.carritoId) {
      this.notificacionService.error('No se encontró un carrito válido para confirmar el pago');
      return;
    }

    const datosCardForm = this.cardFormInstance.getCardFormData?.() ?? {};
    const token = datosCardForm.token ?? datosCardForm.cardToken ?? '';
    const paymentMethodId = datosCardForm.paymentMethodId ?? datosCardForm.payment_method_id ?? '';
    const issuerId = datosCardForm.issuerId ?? datosCardForm.issuer_id ?? '';
    const installments = Number(datosCardForm.installments ?? 1);

    if (!token || !paymentMethodId || !issuerId) {
      console.error('[MercadoPago] datos incompletos del CardForm', datosCardForm);
      this.notificacionService.error('No se pudo obtener la información de la tarjeta');
      return;
    }

    const datoPago: CheckoutConfirmarRequest = {
      carritoId: this.carritoId,
      token,
      issuer_id: String(issuerId),
      payment_method_id: String(paymentMethodId),
      transaction_amount: Number(this.monto.toFixed(2)),
      installments: installments > 0 ? installments : 1,
      description: this.descripcion,
      payer: {
        email: this.email || 'usuario@techstore.com',
      },
    };

    console.log('[MercadoPago] Enviando pago al backend', datoPago);
    this.procesando = true;

    this.pagoService.procesarPago(datoPago).subscribe({
      next: (respuesta: RespuestaPago) => {
        this.procesando = false;
        const estado = this.normalizarEstadoPago(respuesta);

        console.log('[MercadoPago] Respuesta del backend', respuesta);

        if (estado === 'approved') {
          this.notificacionService.success('Pago aprobado exitosamente');
          this.pagoExitoso.emit(respuesta);
          this.cerrarSoloFormulario();
          return;
        }

        if (estado === 'pending') {
          this.notificacionService.warning('Tu pago quedó pendiente de confirmación. Tu carrito no fue vaciado.');
          return;
        }

        this.notificacionService.error(
          `Pago rechazado: ${respuesta.status_detail || respuesta.status || 'estado desconocido'}`
        );
      },
      error: (error: HttpErrorResponse) => {
        this.procesando = false;
        console.error('[MercadoPago] error al procesar pago', error);

        if (error.status === 402) {
          const cuerpo = error.error as { paymentStatus?: string; status?: string; message?: string; detalle?: string; status_detail?: string } | string | null;
          const estado = typeof cuerpo === 'object' && cuerpo ? String(cuerpo.paymentStatus ?? cuerpo.status ?? '').toLowerCase() : '';
          const mensajeBase = estado === 'pending'
            ? 'Tu pago quedó pendiente. Tu carrito se mantiene intacto.'
            : estado === 'rejected'
              ? 'Tu pago fue rechazado. Tu carrito se mantiene intacto.'
              : 'Tu pago quedó pendiente o fue rechazado. Tu carrito se mantiene intacto.';

          this.notificacionService.warning(this.obtenerMensajeErrorPago(error, mensajeBase));
          return;
        }

        if (error.status === 500) {
          this.notificacionService.error('Ocurrió un problema en el servidor. Vuelve a intentar o contacta soporte.');
          return;
        }

        this.notificacionService.error(this.obtenerMensajeErrorPago(error, 'Error al procesar el pago'));
      },
    });
  }

  private normalizarEstadoPago(respuesta: RespuestaPago): string {
    return String(respuesta.paymentStatus ?? respuesta.status ?? '').toLowerCase();
  }

  private verificarMontajeCardForm(): void {
    const campos = ['mp-card-number', 'mp-card-expiration', 'mp-card-security'];

    campos.forEach((id) => {
      const elemento = document.getElementById(id);
      console.log('[MercadoPago] verificación de montaje', {
        id,
        tagName: elemento?.tagName,
        childElementCount: elemento?.childElementCount,
        innerHTML: elemento?.innerHTML,
      });

      if (!elemento || elemento.childElementCount === 0) {
        console.warn(`[MercadoPago] el campo ${id} no tiene contenido montado todavía`);
      }
    });
  }

  private cerrarSoloFormulario(): void {
    this.destruirCardForm();
    this.mostrarFormulario = false;
    this.procesando = false;
  }

  private destruirCardForm(): void {
    this.cardFormInstance?.unmount?.();
    this.cardFormInstance = null;
  }

  cancelar(): void {
    this.destruirCardForm();
    this.mostrarFormulario = false;
    this.procesando = false;
    this.pagoCancelado.emit();
  }

  private obtenerMensajeErrorPago(error: HttpErrorResponse, mensajeDefault: string): string {
    const body = error.error as { message?: string; detalle?: string; status_detail?: string; paymentStatus?: string; status?: string } | string | null;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body === 'object') {
      return body.message || body.detalle || body.status_detail || mensajeDefault;
    }

    return mensajeDefault;
  }
}


