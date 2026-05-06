import { DetallePedido } from './detalle-pedido';

export interface Pedido {
  id?: number;
  usuarioId: number;
  fecha?: string;
  estado: string;
  total: number;
  nombreCliente: string;
  direccion: string;
  celular: string;
  detalles?: DetallePedido[];
}
