import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { DashboardV2Component } from './dashboard-v2.component';

@NgModule({
  declarations: [DashboardV2Component],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: '',
        component: DashboardV2Component,
      },
     
    ]),
  ],
})
export class DashboardV2Module {}
