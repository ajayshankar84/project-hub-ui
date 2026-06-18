import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { DashboardV1Component } from './dashboard-v1.component';
import { ImagePathPipe } from '../../shared/pipes/image-path.pipe';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: '',
        component: DashboardV1Component,
      },
     
    ]),
    DashboardV1Component,
    ImagePathPipe
  ],
})
export class DashboardV1Module {}
