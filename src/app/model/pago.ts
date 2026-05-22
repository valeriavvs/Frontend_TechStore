export interface Pago {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  description: string;
  payer: {
    email: string;
  };
}

export interface CheckoutConfirmarRequest extends Pago {
  carritoId: number;
}

export interface RespuestaPago {
  id?: string;
  status: string;
  paymentStatus?: string;
  status_detail?: string;
  transaction_amount?: number;
  description?: string;
  carritoId?: number;
  pedidoId?: number;
  payer?: {
    email: string;
  };
}

