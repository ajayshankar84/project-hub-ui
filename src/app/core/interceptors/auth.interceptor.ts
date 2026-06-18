import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../services/session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);
  const token = sessionService.getSessionToken();

  // Define endpoints or keywords that should not have the Authorization header
  // We change '/create' to a more specific path to avoid excluding Attendance creation
  const excludedEndpoints = ['/login', '/auth/create', '/reset-password'];
  const isExcluded = excludedEndpoints.some(url => req.url.includes(url));

  let authReq = req;
  if (token && !isExcluded) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        sessionService.clear();
        localStorage.removeItem('lms-account-data');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};