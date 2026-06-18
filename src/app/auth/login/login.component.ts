import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountStateService } from '../../core/services/account-state.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  form: FormGroup;
  isSubmitting = false;
  loginMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private accountStateService: AccountStateService
  ) {
    this.form = this.fb.group({
      mobile: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10), Validators.pattern(/^[1-9][0-9]{9}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false],
    });
  }

  get mobile() {
    return this.form.get('mobile');
  }

  get password() {
    return this.form.get('password');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.loginMessage = '';

    const { mobile, password } = this.form.value;

    this.accountStateService.loginWithMobile(mobile, password).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.loginMessage = 'Login successful.';

        const role = this.accountStateService.getStoredAccountData()?.role?.toLowerCase();
        console.log('User role:', role);
        const targetRoute = role === 'admin' ? '/features/customer' : '/features/client-detail';

        this.router.navigate([targetRoute]);
      },
      error: () => {
        this.isSubmitting = false;
        this.loginMessage = 'Invalid mobile number or password.';
      },
    });
  }
}
