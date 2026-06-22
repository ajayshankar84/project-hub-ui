import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CustomerService } from '../../core/services/customer.service';
import { AuthService, User } from '../../core/services/auth.service';

interface InvoiceItem {
  description: string;
  hsn: string;
  qty: number;
  rate: number;
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss'
})
export class InvoicesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private customerService = inject(CustomerService);
  private authService = inject(AuthService);

  ngOnInit(): void {
  }
}
