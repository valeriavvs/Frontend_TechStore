const DRIVE_VIEW_BASE = 'https://lh3.googleusercontent.com/d/';
const PLACEHOLDER = '/img/placeholder-techstore.svg';

//Encuentra el id del link del drive
function extraerIdDrive(valor: string): string | null {
  const limpio = valor.trim();
  if (!limpio) {
    return null;
  }

  const patronIdPlano = /^[a-zA-Z0-9_-]{20,}$/;
  if (patronIdPlano.test(limpio)) {
    return limpio;
  }

  const matchDriveU = limpio.match(/\/u\/\d+\/[^?]*[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchDriveU?.[1]) {
    return matchDriveU[1];
  }

  const matchFilePath = limpio.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFilePath?.[1]) {
    return matchFilePath[1];
  }

  const matchDPath = limpio.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchDPath?.[1]) {
    return matchDPath[1];
  }

  const matchParametro = limpio.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchParametro?.[1]) {
    return matchParametro[1];
  }

  return null;
}

//Contruye la url final -> lh3
function construirUrlDrive(id: string): string {
  return `${DRIVE_VIEW_BASE}${encodeURIComponent(id)}=w1000`;
}

//Validacion final de la imagen antes de ser guardadas
export function esImagenDriveValida(valor: string | null | undefined): boolean {
  return !!extraerIdDrive(valor ?? '');
}

export function normalizarImagenDrive(valor: string | null | undefined): string {
  const id = extraerIdDrive(valor ?? '');
  return id ? construirUrlDrive(id) : '';
}

export function resolverImagenProducto(valor: string | null | undefined): string {
  const limpio = (valor ?? '').trim();
  const normalizada = normalizarImagenDrive(limpio);

  if (normalizada) {
    return normalizada;
  }

  // Si no existe retorna la imagen PLACEHOLDER
  if (limpio.startsWith('http://') || limpio.startsWith('https://') || limpio.startsWith('data:') || limpio.startsWith('/')) {
    return limpio;
  }

  return PLACEHOLDER;
}

//“Usamos lh3.googleusercontent.com porque es la URL de entrega de imagen de Google optimizada para <img>, mientras que el enlace normal de Drive es un visor web y no siempre funciona como recurso embebido directo.”


