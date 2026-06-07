import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout();
        router.navigate(['/login']);
      }

      const message = resolveErrorMessage(error);
      return throwError(() => new Error(message));
    })
  );
};

function resolveErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Impossible de contacter le serveur. Vérifiez votre connexion réseau.';
  }
  if (error.error?.message) {
    return error.error.message;
  }
  switch (error.status) {
    case 400: return 'Requête invalide.';
    case 403: return 'Accès interdit.';
    case 404: return 'Ressource introuvable.';
    case 500: return 'Erreur interne du serveur.';
    default: return `Erreur inattendue (code ${error.status}).`;
  }
}
