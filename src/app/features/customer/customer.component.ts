import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomerService } from '../../core/services/customer.service';
import { AuthService, User } from '../../core/services/auth.service';

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer.component.html',
  styleUrl: './customer.component.scss'
})
export class CustomerComponent implements OnInit {
  insurances: any[] = [];
  isLoading = true;
  currentPage = 1;
  pageSize = 10;
  totalElements = 0;
  searchTerm = '';
  isSortDropdownOpen = false;
  isStatusDropdownOpen = false;
  isEditModalOpen = false;
  isDeleteModalOpen = false;
  selectedInsurance: any = null;
  isAddModalOpen = false;
  newCustomer = {
    name: '',
    email: '',
    mobile: '',
    company: '',
    category: 'Silver',        // default to Silver
    address: '',
    country: 'India',
    status: 'active',
    bankName: '',
    acNo: '',
    ifscCode: '',
    branchName: '',
    gstNo: ''
  };
  insuranceToDelete: any = null;
  filters = {
    name: '',
    company: '',
    mobile: '',
    email: '',
    country: '',
    status: ''
  };
  sortField = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  errorMessage: string | null = null;

  toastVisible = false;
  toastMessage = '';
  toastVariant: 'success' | 'danger' = 'success';
  private toastTimer: any;

  constructor(
    private customerService: CustomerService,
    private authService: AuthService,
    private router: Router,
    private el: ElementRef
  ) { }

  ngOnInit(): void {
    this.loadInsurances();
  }

  loadInsurances(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.customerService.getPagedCustomer(this.currentPage, this.pageSize, this.searchTerm, this.sortField, this.sortDirection, this.filters).subscribe({
      next: (response: any) => {
        this.insurances = response.data || [];
        this.totalElements = response.total || 0;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading insurances:', err);
        this.errorMessage = 'Failed to load insurance records. Please check your connection and try again.';
        this.isLoading = false;
      }
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalElements / this.pageSize));
  }

  get pages(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    if (current <= 4) {
      for (let i = 1; i <= 6; i++) pages.push(i);
      pages.push('...');
      pages.push(total);
    } else if (current >= total - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = total - 5; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = current - 2; i <= current + 2; i++) pages.push(i);
      pages.push('...');
      pages.push(total);
    }
    return pages;
  }

  onPageChange(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.loadInsurances();
    }
  }

  onSearch(): void {
    const isInvalid = (val: string) => val.length > 0 && val.length < 3;
    const textFilters = [this.searchTerm, this.filters.name, this.filters.company, this.filters.mobile, this.filters.email, this.filters.country];
    if (textFilters.some(isInvalid)) {
      return;
    }
    this.currentPage = 1;
    this.loadInsurances();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1;
    this.loadInsurances();
  }

  toggleSortDropdown(event: Event): void {
    event.stopPropagation();
    this.isSortDropdownOpen = !this.isSortDropdownOpen;
  }

  toggleStatusDropdown(event: Event): void {
    event.stopPropagation();
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isSortDropdownOpen = false;
      this.isStatusDropdownOpen = false;
    }
  }

  onSort(field: string, direction?: 'asc' | 'desc'): void {
    if (direction) {
      this.sortField = field;
      this.sortDirection = direction;
    } else if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.isSortDropdownOpen = false;
    this.currentPage = 1;
    this.loadInsurances();
  }

  openAddModal(): void {
    this.newCustomer = {
      name: '',
      email: '',
      mobile: '',
      company: '',
      category: 'Silver',        // reset to Silver
      address: '',
      country: 'India',
      status: 'active',
      bankName: '',
      acNo: '',
      ifscCode: '',
      branchName: '',
      gstNo: ''
    };
    this.isAddModalOpen = true;
  }

  addCustomer(): void {
    if (!this.newCustomer.name || !this.newCustomer.email || !this.newCustomer.mobile) {
      this.showToast('Please fill all required fields', 'danger');
      return;
    }
    this.isLoading = true;
    if (!this.newCustomer.company) {
      this.newCustomer.company = 'Individual';
    }
    if (!this.newCustomer.country) {
      this.newCustomer.country = 'India';
    }
    // Category is already set, no extra action needed.

    this.customerService.createCustomer(this.newCustomer).subscribe({
      next: (res: any) => {
        const createdCustomer = res?.data || res;
        const createdId = createdCustomer?._id || createdCustomer?.id || (createdCustomer && typeof createdCustomer === 'string' ? createdCustomer : null);

        const [firstName, ...lastNameParts] = (this.newCustomer.name || '').trim().split(' ');
        const lastName = lastNameParts.join(' ') || 'Customer';
        const userPayload: User = {
          firstName: firstName || 'Customer',
          lastName,
          email: this.newCustomer.email,
          mobile: this.newCustomer.mobile,
          role: 'user',
          password: this.generateDefaultPassword(this.newCustomer.mobile)
        };

        this.authService.createUser(userPayload).subscribe({
          next: () => {
            this.closeAddModal();
            this.showToast('Customer and user added successfully', 'success');
            this.isLoading = false;
            if (createdId) {
              this.router.navigate(['/features/document-detail', createdId]);
            } else {
              this.loadInsurances();
            }
          },
          error: (userErr: any) => {
            console.error('Error creating linked user:', userErr);
            this.closeAddModal();
            this.showToast('Customer added but failed to create linked user', 'danger');
            this.isLoading = false;
            if (createdId) {
              this.router.navigate(['/features/document-detail', createdId]);
            } else {
              this.loadInsurances();
            }
          }
        });
      },
      error: (err: any) => {
        console.error('Error adding customer:', err);
        this.errorMessage = 'Failed to add customer. Please try again.';
        this.isLoading = false;
      }
    });
  }

  private generateDefaultPassword(mobile: string): string {
    const digits = mobile.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `Cust@${digits.slice(-4)}`;
    }
    return 'Cust@1234';
  }

  openEditModal(insurance: any): void {
    this.selectedInsurance = {
      ...insurance,
      bankName: insurance.bankName ?? '',
      acNo: insurance.acNo ?? '',
      ifscCode: insurance.ifscCode ?? '',
      branchName: insurance.branchName ?? '',
      gstNo: insurance.gstNo ?? '',
      category: insurance.category ?? 'Silver'   // fallback to Silver if missing
    };
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.selectedInsurance = null;
  }

  saveInsurance(): void {
    if (this.selectedInsurance) {
      this.isLoading = true;
      if (!this.selectedInsurance.company) {
        this.selectedInsurance.company = 'individual';
      }
      if (!this.selectedInsurance.country) {
        this.selectedInsurance.country = 'India';
      }
      // Category is already present, no extra action needed.

      this.customerService.updateCustomer(this.selectedInsurance._id, this.selectedInsurance).subscribe({
        next: () => {
          this.closeEditModal();
          this.showToast('Customer record updated successfully', 'success');
          setTimeout(() => {
            this.loadInsurances();
          }, 2000);
        },
        error: (err: any) => {
          console.error('Error updating insurance:', err);
          this.errorMessage = 'Failed to update insurance record.';
          this.isLoading = false;
        }
      });
    }
  }

  confirmDelete(insurance: any): void {
    this.insuranceToDelete = insurance;
    this.isDeleteModalOpen = true;
  }

  cancelDelete(): void {
    this.isDeleteModalOpen = false;
    this.insuranceToDelete = null;
  }

  executeDelete(): void {
    if (this.insuranceToDelete?._id) {
      this.isLoading = true;
      this.customerService.deleteCustomer(this.insuranceToDelete._id).subscribe({
        next: () => {
          this.loadInsurances();
          this.cancelDelete();
          this.showToast('Insurance record deleted successfully', 'success');
        },
        error: (err: any) => {
          console.error('Error deleting insurance:', err);
          this.errorMessage = 'Failed to delete insurance record.';
          this.isLoading = false;
        }
      });
    }
  }

  private showToast(message: string, variant: 'success' | 'danger'): void {
    this.toastMessage = message;
    this.toastVariant = variant;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible = false, 3000);
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.filters = {
      name: '',
      company: '',
      mobile: '',
      email: '',
      country: '',
      status: ''
    };
    this.pageSize = 10;
    this.sortField = 'createdAt';
    this.sortDirection = 'desc';
    this.currentPage = 1;
    this.isSortDropdownOpen = false;
    this.isStatusDropdownOpen = false;
    this.loadInsurances();
  }

  closeAddModal(): void {
    this.isAddModalOpen = false;
    this.newCustomer = {
      name: '',
      email: '',
      mobile: '',
      company: '',
      category: 'Silver',
      address: '',
      country: 'India',
      status: 'active',
      bankName: '',
      acNo: '',
      ifscCode: '',
      branchName: '',
      gstNo: ''
    };
  }

  openInvoiceDetail(customer: any): void {
    if (customer?._id) {
      this.router.navigate(['/features/invoice-detail', customer._id]);
    }
  }

  viewDocument(customer: any): void {
    if (customer?._id) {
      this.router.navigate(['/features/document-detail', customer._id]);
    }
  }
}