import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CustomerService } from '../../core/services/customer.service';
import { ProjectService, Project } from '../../core/services/project.service';
import { AuthService, User } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { InvoiceService } from '../../core/services/invoice.service';

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
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);
  private sessionService = inject(SessionService);
  private invoiceService = inject(InvoiceService);

  isLoading = true;
  invoiceCustomer: any = null;
  invoiceProject: Project | null = null;
  fromUser: User | null = null;
  invoiceNumber = '';
  invoiceDate = '';
  dueDate = '';
  placeOfSupply = 'Mumbai';
  cities: string[] = [
    'Mumbai',
    'Pune',
    'Nagpur',
    'Nashik',
    'Thane',
    'Aurangabad',
    'Solapur',
    'Amravati',
    'Navi Mumbai',
    'Kolhapur',
    'Delhi',
    'New Delhi',
    'Noida',
    'Ghaziabad',
    'Gurugram',
    'Faridabad',
    'Lucknow',
    'Kanpur',
    'Agra',
    'Varanasi',
    'Prayagraj',
    'Meerut',
    'Jaipur',
    'Jodhpur',
    'Udaipur',
    'Kota',
    'Ahmedabad',
    'Surat',
    'Vadodara',
    'Rajkot',
    'Indore',
    'Bhopal',
    'Gwalior',
    'Jabalpur',
    'Bengaluru',
    'Mysuru',
    'Mangaluru',
    'Hubballi',
    'Hyderabad',
    'Warangal',
    'Vijayawada',
    'Visakhapatnam',
    'Chennai',
    'Coimbatore',
    'Madurai',
    'Tiruchirappalli',
    'Kochi',
    'Thiruvananthapuram',
    'Kozhikode',
    'Kolkata',
    'Howrah',
    'Siliguri',
    'Patna',
    'Ranchi',
    'Jamshedpur',
    'Bhubaneswar',
    'Cuttack',
    'Guwahati',
    'Dibrugarh',
    'Shillong',
    'Aizawl',
    'Imphal',
    'Itanagar',
    'Agartala',
    'Panaji',
    'Chandigarh',
    'Amritsar',
    'Ludhiana',
    'Jalandhar',
    'Patiala',
    'Shimla',
    'Dehradun'
  ];
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
  taxRates = Array.from({ length: 18 }, (_, index) => index + 1);
  cgstPercent = 9;
  sgstPercent = 9;
  items: InvoiceItem[] = [
    { description: 'Website development and maintenance', hsn: '998314', qty: 1, rate: 44000 },
    { description: 'Project management support', hsn: '998313', qty: 1, rate: 6000 }
  ];

  get subTotal(): number {
    return this.items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  }

  get cgstAmount(): number {
    return +(this.subTotal * (this.cgstPercent / 100)).toFixed(2);
  }

  get sgstAmount(): number {
    return +(this.subTotal * (this.sgstPercent / 100)).toFixed(2);
  }

  get totalAmount(): number {
    return +(this.subTotal + this.cgstAmount + this.sgstAmount).toFixed(2);
  }

  getItemAmount(item: InvoiceItem): number {
    return +(item.qty * item.rate).toFixed(2);
  }

  get fromCompanies(): NonNullable<User['company']> {
    return this.resolveFromUser()?.company || [];
  }

  get selectedFromCompany() {
    return this.fromCompanies[this.selectedFromCompanyIndex] || null;
  }

  get fromCompanyName(): string {
    return this.selectedFromCompany?.cname || this.resolveFromUser()?.firstName || 'Project Hub Pvt. Ltd.';
  }

  get fromCompanyAddress(): string {
    return this.selectedFromCompany?.address || this.resolveFromUser()?.address || '501, Corporate Avenue';
  }

  get fromCompanyEmail(): string {
    return this.selectedFromCompany?.email || this.resolveFromUser()?.email || 'accounts@projecthub.in';
  }

  get fromCompanyMobile(): string {
    return this.selectedFromCompany?.mobile || this.resolveFromUser()?.mobile || 'N/A';
  }

  get fromCompanyGstNo(): string {
    return this.selectedFromCompany?.gstNo || this.resolveFromUser()?.gstNo || 'Null';
  }

  selectedFromCompanyIndex = 0;

  onFromCompanyChange(index: string | number): void {
    const parsedIndex = Number(index);
    this.selectedFromCompanyIndex = Number.isNaN(parsedIndex) ? 0 : parsedIndex;
  }

  submitInvoice(): void {
    const customer = this.invoiceCustomer
      ? {
          customerId: this.invoiceCustomer._id || this.invoiceCustomer.id || null,
          name: this.invoiceCustomer.name || this.invoiceCustomer.company || '',
          address: this.invoiceCustomer.address || '',
          country: this.invoiceCustomer.country || '',
          email: this.invoiceCustomer.email || '',
          mobile: this.invoiceCustomer.mobile || ''
        }
      : null;

    const project = this.invoiceProject
      ? {
          projectId: this.invoiceProject._id || null,
          projectName: this.invoiceProject.projectName,
          dueDate: this.invoiceProject.dueDate,
          status: this.invoiceProject.status,
          cost: this.invoiceProject.cost
        }
      : null;

    const payload = {
      invoiceNumber: this.invoiceNumber,
      invoiceDate: this.invoiceDate,
      dueDate: this.dueDate,
      placeOfSupply: this.placeOfSupply,
      customer,
      project,
      company: this.selectedFromCompany
        ? {
            cid: this.selectedFromCompany.cid,
            cname: this.selectedFromCompany.cname,
            address: this.selectedFromCompany.address,
            gstNo: this.selectedFromCompany.gstNo,
            email: this.selectedFromCompany.email,
            mobile: this.selectedFromCompany.mobile
          }
        : null,
      items: this.items,
      subTotal: this.subTotal,
      cgstPercent: this.cgstPercent,
      sgstPercent: this.sgstPercent,
      cgstAmount: this.cgstAmount,
      sgstAmount: this.sgstAmount,
      totalAmount: this.totalAmount,
      bankDetails: this.bankDetails,
      notes: this.notes
    };

    this.invoiceService.createInvoice(payload).subscribe({
      next: (response) => {
        console.log('Invoice saved successfully:', response);
        this.updateInvoiceNumber();
      },
      error: (error) => console.error('Failed to save invoice:', error)
    });
  }

  addItem(): void {
    this.items.push({
      description: '',
      hsn: '',
      qty: 1,
      rate: 0
    });
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
    }
  }

  ngOnInit(): void {
    this.fromUser = this.resolveFromUser();
    const customerId = this.route.snapshot.paramMap.get('customerId')
      || this.route.snapshot.paramMap.get('id')
      || this.route.parent?.snapshot.paramMap.get('customerId')
      || this.route.parent?.snapshot.paramMap.get('id');
    const projectId = this.route.snapshot.paramMap.get('projectId')
      || this.route.parent?.snapshot.paramMap.get('projectId');

    if (customerId) {
      this.loadInvoiceForCustomer(customerId, projectId || undefined);
    } else {
      this.setDefaultDates();
      this.updateInvoiceNumber();
      this.isLoading = false;
    }
  }

  private resolveFromUser(): User | null {
    const authUser = this.authService.currentUserValue;
    const storedUser = this.sessionService.getUserInfo<User>();
    const accountData = this.getStoredAccountData();

    if (!authUser && !storedUser && !accountData) {
      return null;
    }

    return {
      ...(authUser || {}),
      ...(storedUser || {}),
      ...(accountData || {}),
      company: authUser?.company || storedUser?.company || accountData?.company || []
    } as User;
  }

  private getStoredAccountData(): User | null {
    try {
      const raw = localStorage.getItem('lms-account-data');
      return raw ? JSON.parse(raw) as User : null;
    } catch {
      return null;
    }
  }

  get fromDisplayName(): string {
    return this.fromCompanyName;
  }

  get fromAddressLines(): string[] {
    return [this.fromCompanyAddress];
  }

  private setDefaultDates(): void {
    const now = new Date();
    const due = new Date(now);
    due.setDate(now.getDate() + 15);
    this.invoiceDate = now.toLocaleDateString('en-GB');
    this.dueDate = due.toLocaleDateString('en-GB');
  }

  private updateInvoiceNumber(): void {
    const projectName = this.invoiceProject?.projectName || 'PROJECT';
    const projectPrefix = (projectName || '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((word) => word[0])
      .join('')
      .padEnd(3, 'X');

    this.invoiceNumber = `INV-${projectPrefix}-${Date.now()}`;
  }

  private loadInvoiceForCustomer(customerId: string, projectId?: string): void {
    this.setDefaultDates();
    this.customerService.getCustomerById(customerId).subscribe({
      next: (customer) => {
        this.invoiceCustomer = customer;
        if (projectId) {
          this.projectService.getProjectById(projectId).subscribe({
            next: (project) => {
              this.invoiceProject = project;
              this.updateInvoiceNumber();
              this.isLoading = false;
            },
            error: (err) => {
              console.error('Failed to load project for invoice:', err);
              this.invoiceProject = null;
              this.updateInvoiceNumber();
              this.isLoading = false;
            }
          });
        } else {
          this.invoiceProject = null;
          this.updateInvoiceNumber();
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Failed to load customer for invoice:', err);
        this.invoiceCustomer = null;
        this.invoiceProject = null;
        this.updateInvoiceNumber();
        this.isLoading = false;
      }
    });
  }
}
