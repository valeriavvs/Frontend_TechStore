import { Producto } from './producto';

export interface CarritoItem {
  id?: number;
  idCarrito?: number;
  idProducto?: number;
  cantidad: number;
  nombreProducto?: string;
  precio?: number;
  imagen?: string;
  precioUnitario?: number;
  subtotal?: number;
  producto?: Producto;
}
