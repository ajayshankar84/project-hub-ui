import { inject, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { FeaturesComponent } from './features.component';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';
import { AccountStateService } from '../core/services/account-state.service';

const routes: Routes = [
  {
    path: '',
    component: FeaturesComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => {
          const accountService = inject(AccountStateService);
          const data = accountService.getStoredAccountData();
          return data?.role?.toLowerCase() === 'admin' ? 'customer' : 'client-detail';
        }
      },

      {
        path: 'client-detail',
        loadChildren: () => import('./client-detail/client-detail.module').then((m) => m.ClientDetailModule),
      },

      {
        path: 'dashboard-v1',
        loadChildren: () => import('./dashboard-v1/dashboard-v1.module').then((m) => m.DashboardV1Module),
      },
      {
        path: 'dashboard-v2',
        loadChildren: () => import('./dashboard-v2/dashboard-v2.module').then((m) => m.DashboardV2Module),
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      },





      {
        path: 'customer',
        loadChildren: () => import('./customer/customer.module').then((m) => m.CustomerModule),
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      }, {
        path: 'document-detail/:id',
        loadChildren: () => import('./document-detail/customer.module').then((m) => m.DocumentDetailModule),
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      },
       {
        path: 'user',
        loadChildren: () => import('./users/users.module').then((m) => m.UsersModule),
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      },
      {
        path: 'invoice-detail/:id',
        loadChildren: () => import('./invoice-details/invoice-details.module').then((m) => m.InvoiceDetailsModule),
        canActivate: [roleGuard],
        data: { roles: ['admin'] }
      },
    ]
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)], // ✅ Lazy loaded feature uses forChild
})
export class FeaturesRoutingModule { }
