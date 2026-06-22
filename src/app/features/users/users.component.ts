import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../core/services/auth.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  private authService = inject(AuthService);
  users: User[] = [];
  searchTerm: string = '';
  roleFilter: 'all' | 'admin' | 'user' = 'all';
  visiblePasswords: Set<string> = new Set();
  isAddModalOpen = false;
  isEditModalOpen = false;
  selectedUser: User | null = null;
  confirmPassword = '';
  isPasswordVisible = false;
  isConfirmPasswordVisible = false;
  isDeleteModalOpen = false;
  userToDelete: User | null = null;

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    console.log('Fetching users...');
    this.authService.getAllUsers().subscribe({
      next: (data) => (this.users = data),
      error: (err) => console.error('Error fetching users:', err)
    });
  }

  get filteredUsers(): User[] {
    const term = this.searchTerm.toLowerCase().trim();
    let results = this.users;

    // 1. Apply Role Filter
    if (this.roleFilter !== 'all') {
      results = results.filter(user => user.role === this.roleFilter);
    }

    // 2. Apply Search Filter
    if (!term) {
      return results;
    }

    return results.filter(user => 
      user.firstName.toLowerCase().includes(term) ||
      user.lastName.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  }

  setRoleFilter(role: 'all' | 'admin' | 'user'): void {
    this.roleFilter = role;
  }

  togglePasswordVisibility(userId: string): void {
    if (this.visiblePasswords.has(userId)) {
      this.visiblePasswords.delete(userId);
    } else {
      this.visiblePasswords.add(userId);
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  private createCompanyDefaults() {
    return {
      cid: this.generateCompanyId(),
      cname: '',
      address: '',
      gstNo: '',
      email: '',
      mobile: ''
    };
  }

  private generateCompanyId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.random() * 16 | 0;
      const value = char === 'x' ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  onRoleChange(role: User['role']): void {
    if (!this.selectedUser) {
      return;
    }

    this.selectedUser.role = role;
    if (role === 'admin') {
      this.selectedUser.company = this.selectedUser.company?.length ? this.selectedUser.company : [this.createCompanyDefaults()];
    } else {
      this.selectedUser.company = undefined;
    }
  }

  addUser(): void {
    this.selectedUser = {
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      role: 'user',
      password: ''
    };
    this.confirmPassword = '';
    this.isAddModalOpen = true;
  }

  editUser(user: User): void {
    this.selectedUser = {
      ...user,
      company: user.role === 'admin'
        ? (user.company?.length
            ? user.company.map((company) => ({
                cid: company.cid || this.generateCompanyId(),
                cname: company.cname || '',
                address: company.address || '',
                gstNo: company.gstNo || '',
                email: company.email || '',
                mobile: company.mobile || ''
              }))
            : [this.createCompanyDefaults()])
        : undefined
    }; // Create a copy to avoid immediate mutation
    this.isEditModalOpen = true;
  }

  closeModal(): void {
    this.isAddModalOpen = false;
    this.isEditModalOpen = false;
    this.selectedUser = null;
    this.confirmPassword = '';
    this.isPasswordVisible = false;
    this.isConfirmPasswordVisible = false;
  }

  saveUser(): void {
    if (this.selectedUser) {
      if (this.isAddModalOpen) {
        this.executeCreate();
      } else {
        this.executeUpdate();
      }
    }
  }

  private executeCreate(): void {
    if (this.selectedUser) {
      const userToCreate = this.buildUserPayload(this.selectedUser, true);
      console.log('Create user payload:', userToCreate);

      this.authService.createUser(userToCreate).subscribe({
        next: () => {
          this.loadUsers(); // Refresh the list
          this.closeModal();
        },
        error: (err) => console.error('Error creating user:', err)
      });
    }
  }

  private executeUpdate(): void {
    if (this.selectedUser) {
      const userToUpdate = this.buildUserPayload(this.selectedUser, false);
      console.log('Update user payload:', userToUpdate);

      this.authService.updateUser(userToUpdate).subscribe({
        next: () => {
          this.loadUsers(); // Refresh the list
          this.closeModal();
        },
        error: (err) => console.error('Error updating user:', err)
      });
    }
  }

  private buildUserPayload(user: User, includePassword: boolean): User {
    const companyCollection = user.role === 'admin'
      ? (user.company?.length
          ? user.company.map((companyItem) => ({
              cid: companyItem.cid || this.generateCompanyId(),
              cname: companyItem.cname || '',
              address: companyItem.address || '',
              gstNo: companyItem.gstNo || '',
              email: companyItem.email || '',
              mobile: companyItem.mobile || ''
            }))
          : [this.createCompanyDefaults()])
      : undefined;

    const payload: User = {
      id: user.id,
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      mobile: user.mobile,
      role: user.role,
      company: companyCollection,
      password: user.password
    };

    if (!includePassword || !payload.password) {
      delete payload.password;
    }

    if (user.role !== 'admin') {
      delete payload.company;
    }

    return payload;
  }

  addCompany(): void {
    if (!this.selectedUser) {
      return;
    }

    this.selectedUser.company = [...(this.selectedUser.company || []), this.createCompanyDefaults()];
  }

  removeCompany(index: number): void {
    if (!this.selectedUser?.company) {
      return;
    }

    this.selectedUser.company = this.selectedUser.company.filter((_, currentIndex) => currentIndex !== index);
    if (this.selectedUser.company.length === 0 && this.selectedUser.role === 'admin') {
      this.selectedUser.company = [this.createCompanyDefaults()];
    }
  }

  confirmDelete(user: User): void {
    // Ensure only one modal is open at a time, then show delete confirmation.
    this.isAddModalOpen = false;
    this.isEditModalOpen = false;
    this.selectedUser = null;
    this.userToDelete = user;
    this.isDeleteModalOpen = true;
  }

  cancelDelete(): void {
    this.isDeleteModalOpen = false;
    this.userToDelete = null;
  }

  executeDelete(): void {
    if (this.userToDelete?._id) {
      this.authService.deleteUser(this.userToDelete._id).subscribe({
        next: () => {
          this.loadUsers();
          this.cancelDelete();
        },
        error: (err) => console.error('Error deleting user:', err)
      });
    }
  }
}
