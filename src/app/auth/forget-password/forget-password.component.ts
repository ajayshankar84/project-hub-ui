import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.component.html',
  styleUrls: ['./forget-password.component.scss'],
})
export class ForgetPasswordComponent {
  forgotForm: FormGroup;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/)]]
    });
  }

  onSubmit() {
    if (this.forgotForm.invalid) return;
    
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const email = this.forgotForm.get('email')?.value;
 console.log(email);
    this.authService.sendResetLink(email).subscribe({
      next: () => {
        this.successMessage = 'If an account exists for this email, you will receive a reset link shortly.';
        this.loading = false;
        this.forgotForm.reset();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Unable to process request. Please try again later.';
        this.loading = false;
      }
    });
  }
}
