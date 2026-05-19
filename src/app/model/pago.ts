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

export interface RespuestaPago {
  id?: string;
  status: string;
  status_detail?: string;
  transaction_amount?: number;
  description?: string;
  payer?: {
    email: string;
  };
}

