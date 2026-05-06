import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmDialogComponent } from '../component/shared/confirm-dialog/confirm-dialog.component';

type TipoNotificacion = 'success' | 'error' | 'info' | 'warning';

@Injectable({
  providedIn: 'root',
})
export class NotificacionService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  success(mensaje: string): void {
    this.mostrarSnack(mensaje, 'success');
  }

  error(mensaje: string): void {
    this.mostrarSnack(mensaje, 'error');
  }

  info(mensaje: string): void {
    this.mostrarSnack(mensaje, 'info');
  }

  warning(mensaje: string): void {
    this.mostrarSnack(mensaje, 'warning');
  }

  confirm(mensaje: string, titulo: string = 'Confirmar accion'): Observable<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      disableClose: true,
      data: { titulo, mensaje },
    });

    return ref.afterClosed().pipe(map((resultado) => resultado === true));
  }

  private mostrarSnack(mensaje: string, tipo: TipoNotificacion): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`popup-${tipo}`],
    });
  }
}

