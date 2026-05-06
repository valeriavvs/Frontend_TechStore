export interface DetallePedido {
  id?: number;
  pedidoId?: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  subTotal: number;
  nombreProducto: string;
}
