import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InvoiceDetailsComponent } from './invoice-details.component';

const routes: Routes = [
  { path: ':customerId/:projectId', component: InvoiceDetailsComponent },
  { path: '', component: InvoiceDetailsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InvoiceDetailsRoutingModule { }
