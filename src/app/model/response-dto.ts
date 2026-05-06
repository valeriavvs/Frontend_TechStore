import { UsuarioDto } from './usuario-dto';

export class ResponseDto {
  jwt?: string;
  token?: string;
  roles?: string[];
  rol?: string;
  nombre?: string;
  email?: string;
  id?: number;
  idUsuario?: number;
  usuario?: UsuarioDto;
}
