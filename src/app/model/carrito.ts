import {CarritoItem} from './carrito-item';

export class Carrito {
  id?: number;
  idUsuario!: number;
  items?: CarritoItem[];
  total?: number;

}
