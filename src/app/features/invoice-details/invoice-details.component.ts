import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CustomerService } from '../../core/services/customer.service';

interface InvoiceItem {
  description: string;
  hsn: string;
  qty: number;
  rate: number;
}

@Component({
  selector: 'app-invoice-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoice-details.component.html',
  styleUrl: './invoice-details.component.scss'
})
export class InvoiceDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private customerService = inject(CustomerService);

  isLoading = true;
  invoiceCustomer: any = null;
  invoiceNumber = 'INV-2026-001';
  invoiceDate = '';
  dueDate = '';
  placeOfSupply = 'Maharashtra';
  bankDetails = {
    bank: 'HDFC Bank',
    account: '123456789012',
    ifsc: 'HDFC0001234',
    branch: 'BKC, Mumbai'
  };
  notes = [
    'Goods once supplied will not be taken back.',
    'Payment is due within 15 days from invoice date.',
    'Subject to Mumbai jurisdiction only.'
  ];
  items: InvoiceItem[] = [
    { description: 'Website development and maintenance', hsn: '998314', qty: 1, rate: 44000 },
    { description: 'Project management support', hsn: '998313', qty: 1, rate: 6000 }
  ];

  get subTotal(): number {
    return this.items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  }

  get cgstAmount(): number {
    return +(this.subTotal * 0.09).toFixed(2);
  }

  get sgstAmount(): number {
    return +(this.subTotal * 0.09).toFixed(2);
  }

  get totalAmount(): number {
    return +(this.subTotal + this.cgstAmount + this.sgstAmount).toFixed(2);
  }

  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (routeId) {
      this.loadInvoiceForCustomer(routeId);
    } else {
      this.setDefaultDates();
      this.isLoading = false;
    }
  }

  private setDefaultDates(): void {
    const now = new Date();
    const due = new Date(now);
    due.setDate(now.getDate() + 15);
    this.invoiceDate = now.toLocaleDateString('en-GB');
    this.dueDate = due.toLocaleDateString('en-GB');
  }

  private loadInvoiceForCustomer(customerId: string): void {
    this.setDefaultDates();
    this.customerService.getCustomerById(customerId).subscribe({
      next: (customer) => {
        this.invoiceCustomer = customer;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load customer for invoice:', err);
        this.invoiceCustomer = null;
        this.isLoading = false;
      }
    });
  }
}
