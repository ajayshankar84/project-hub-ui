import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AccountStateService } from '../services/account-state.service';

export const authGuard: CanActivateFn = (route, state) => {
  const accountService = inject(AccountStateService);
  const router = inject(Router);

  if (accountService.getStoredAccountData()) {
    return true;
  }

  // Redirect to login page if no account data is found
  return router.createUrlTree(['/auth/login']);
};