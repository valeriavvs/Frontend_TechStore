import { Routes } from '@angular/router';
import {Register} from './component/usuario/register/register';
import { LoginComponent } from './component/usuario/login/login.component';
import {ProductoListarComponent} from './component/producto/producto-listar-component/producto-listar-component';
import { ProductoRegistrarComponent } from './component/producto/producto-registrar-component/producto-registrar-component';
import { CarritoListarComponent } from './component/carrito/carrito-listar-component/carrito-listar-component';
import { PedidoListarComponent } from './component/pedido/pedido-listar-component/pedido-listar-component';
import { UsuarioActualizarComponent } from './component/usuario/usuario-actualizar-component/usuario-actualizar-component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'register', component: Register, pathMatch: 'full' },
  { path: 'login', component: LoginComponent, pathMatch: 'full' },
  { path: 'productos', component: ProductoListarComponent },
  { path: 'productos/registrar', component: ProductoRegistrarComponent },
  { path: 'usuarios/actualizar', component: UsuarioActualizarComponent },
  { path: 'carrito', component: CarritoListarComponent },
  { path: 'pedidos', component: PedidoListarComponent },
  { path: 'mis-pedidos', component: PedidoListarComponent },
  //{ path: '**', redirectTo: 'login' },

];
