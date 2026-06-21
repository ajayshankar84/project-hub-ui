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
    this.selectedUser = { ...user }; // Create a copy to avoid immediate mutation
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
      this.authService.createUser(this.selectedUser).subscribe({
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
      // Create a copy to sanitize the payload
      const userToUpdate = { ...this.selectedUser };
      
      // If the password field is empty during an update, remove it so it's not sent
      if (!userToUpdate.password) {
        delete userToUpdate.password;
      }

      this.authService.updateUser(userToUpdate).subscribe({
        next: () => {
          this.loadUsers(); // Refresh the list
          this.closeModal();
        },
        error: (err) => console.error('Error updating user:', err)
      });
    }
  }

  confirmDelete(user: User): void {
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
