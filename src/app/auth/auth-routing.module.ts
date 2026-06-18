import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthComponent } from './auth.component';

const routes: Routes = [{
  path: '',
  component: AuthComponent,
  children: [
    {
      path: 'login',
      loadChildren: () =>
        import('./login/login.module').then(m => m.LoginModule),
    },
    {
      path: 'account',
      loadChildren: () =>
        import('./account/account.module').then(m => m.AccountModule),
    },
     {
      path: 'forget-password',
      loadChildren: () =>
        import('./forget-password/forget-password.module').then(m => m.ForgetPasswordModule),
    },
    {
      path: '',
      redirectTo: 'login',
      pathMatch: 'full',
    },
  ]
}

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class AuthRoutingModule { }
