import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ForgetPasswordComponent } from './forget-password.component';

@NgModule({
  declarations: [ForgetPasswordComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: ForgetPasswordComponent,
      },
    ]),
  ],
})
export class ForgetPasswordModule {}
