import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data['roles'] as string[];
  const currentUser = authService.currentUserValue;

  // Check if user exists and has the required role
  if (currentUser && allowedRoles.includes(currentUser.role)) {
    return true;
  }

  if (currentUser) {
    // User is logged in but lacks the required role (Unauthorized admin route access)
    authService.logout();
    return router.createUrlTree(['/login']);
  } else {
    // User is not logged in
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
};


// import { Injectable } from '@angular/core';
// import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
// import { AccountStateService } from '../services/account-state.service';
// import { map, take } from 'rxjs/operators';

// @Injectable({ providedIn: 'root' })
// export class RoleGuard implements CanActivate {
//   constructor(private accountService: AccountStateService, private router: Router) {}

//   canActivate(route: ActivatedRouteSnapshot) {
//     const expectedRole = route.data['expectedRole'];
    
//     // Assuming accountStateService has an observable for accountData
//     return this.accountService.accountData$.pipe(
//       take(1),
//       map(user => {
//         if (!user || user.role !== expectedRole) {
//           this.router.navigate(['/auth/login']);
//           return false;
//         }
//         return true;
//       })
//     );
//   }
// }