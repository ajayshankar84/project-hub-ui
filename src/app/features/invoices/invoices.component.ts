import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CustomerService } from '../../core/services/customer.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { AuthService, User } from '../../core/services/auth.service';

interface Company {
  cid: string;
  cname: string;
  address: string;
  gstNo: string;
  email: string;
  mobile: string;
}

interface Customer {
  _id: string;
  customerId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  mobile: string;
  email?: string;
  companyId?: string;
  // ... other fields as needed
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  invoiceString?: string;
  subTotal?: string;
  totalAmount?: string;
  cgstAmount?: string;
  cgstPercent?: string;
  sgstAmount?: string;
  sgstPercent?: string;
  placeOfSupply?: string;
  notes?: any[];
  items?: any[];
  bankDetails?: any;
  company?: {
    cname?: string;
    gstNo?: string;
    address?: string;
    mobile?: string;
    email?: string;
  };
  customer?: {
    name?: string;
    mobile?: string;
    email?: string;
    address?: string;
    gstNo?: string;
  };
  project?: { name?: string; projectName?: string };
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss'
})
export class InvoicesComponent implements OnInit, OnDestroy {
  private customerService = inject(CustomerService);
  private invoiceService = inject(InvoiceService);
  private authService = inject(AuthService);
  private subscription = new Subscription();

  // Company
  companies: Company[] = [];
  selectedCompanyId: string | null = null;

  // Customer
  customers: Customer[] = [];
  selectedCustomerId: string | null = null;
  isLoadingCustomers = false;

  // Invoices
  invoices: Invoice[] = [];
  isLoadingInvoices = false;
  selectedInvoice: Invoice | null = null;
  isDeletingId: string | null = null;

  ngOnInit(): void {
    // Listen for user changes (login/logout/profile update)
    this.subscription.add(
      this.authService.currentUser.subscribe((user: User | null) => {
        if (user?.company?.length) {
          this.companies = user.company;
          // Auto-select first company if none selected
          if (!this.selectedCompanyId && this.companies.length > 0) {
            this.selectedCompanyId = this.companies[0].cid;
            this.loadCustomersForCompany(this.selectedCompanyId);
          } else if (this.selectedCompanyId) {
            // If a company was already selected (e.g., on profile update), reload its customers
            this.loadCustomersForCompany(this.selectedCompanyId);
          }
        } else {
          // No companies available
          this.companies = [];
          this.selectedCompanyId = null;
          this.customers = [];
          this.selectedCustomerId = null;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /** Open the invoice PDF preview modal. */
  viewInvoice(invoice: Invoice): void {
    this.selectedInvoice = invoice;
  }

  /** Close the invoice PDF preview modal. */
  closeInvoice(): void {
    this.selectedInvoice = null;
  }

  /** Trigger browser print on the invoice preview. */
  printInvoice(): void {
    window.print();
  }

  /** Delete an invoice after confirmation. */
  deleteInvoice(invoice: Invoice): void {
    if (!confirm(`Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    this.isDeletingId = invoice._id;
    this.invoiceService.deleteInvoice(invoice._id).subscribe({
      next: () => {
        this.invoices = this.invoices.filter(inv => inv._id !== invoice._id);
        this.isDeletingId = null;
      },
      error: (err) => {
        console.error('Failed to delete invoice:', err);
        this.isDeletingId = null;
      }
    });
  }

  /**
   * Called when the user selects a different company.
   */
  onCompanyChange(companyId: string): void {
    // Reset customer and invoices
    this.selectedCustomerId = null;
    this.invoices = [];
    // Load customers for the new company
    this.loadCustomersForCompany(companyId);
  }

  /**
   * Called when the user selects a different customer.
   */
  onCustomerChange(customerId: string): void {
    console.log('customerId', customerId)
    if (!customerId || !this.selectedCompanyId) {
      this.invoices = [];
      return;
    }
    const company = this.companies.find(c => c.cid === this.selectedCompanyId);
    //console.log(this.customers, customerId);
    const customer = this.customers.find(c => c.customerId === customerId);
    // console.log('company', company)
    // console.log('customer', customer)
    if (!company || !customer) {
      this.invoices = [];
      return;
    }
    const customerName = customer.name ||
      (customer.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : '');

    this.loadInvoices(company.cname, customerName);
  }

  /**
   * Fetch invoices for the given company and customer names.
   */
  private loadInvoices(companyName: string, customerName: string): void {
    console.log('companyName', companyName)
    console.log('customerName', customerName)
    if (!companyName || !customerName) {
      this.invoices = [];
      return;
    }
    this.isLoadingInvoices = true;
    this.subscription.add(
      this.invoiceService
        .getInvoicesByCompanyAndCustomer(companyName, customerName)
        .subscribe({
          next: (response) => {
            this.invoices = Array.isArray(response) ? response : (response.data || []);
            //   console.log('Invoices loaded:', this.invoices);
            this.isLoadingInvoices = false;
          },
          error: (error) => {
            console.error('Failed to load invoices:', error);
            this.invoices = [];
            this.isLoadingInvoices = false;
          }
        })
    );
  }

  /**
   * Fetch customers that belong to the given company.
   * Uses the paged endpoint with a companyId filter.
   */
  private loadCustomersForCompany(companyId: string): void {
    if (!companyId) {
      this.customers = [];
      return;
    }

    const company = this.companies.find(c => c.cid === companyId);
    if (!company || !company.cname) {
      this.customers = [];
      return;
    }

    this.isLoadingCustomers = true;
    this.subscription.add(
      this.invoiceService
        .getCustomersByCompany(company.cname)
        .subscribe({
          next: (response) => {
            // Adjust based on your actual API response structure.
            this.customers = Array.isArray(response) ? response : (response.data || []);
            //   console.log('customers', this.customers)
            this.isLoadingCustomers = false;
          },
          error: (error) => {
            console.error('Failed to load customers for company:', error);
            this.customers = [];
            this.isLoadingCustomers = false;
          }
        })
    );
  }
}