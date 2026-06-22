import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountStateService, AccountSubmissionPayload } from '../../core/services/account-state.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
})
export class AccountComponent implements OnInit {
  accountForm!: FormGroup;
  submitted = false;
  strengthText = 'Weak';
  strengthPercent = 20;
  strengthClass = 'bg-danger';
  isSubmitting = false;
  submissionMessage = '';

  constructor(
    private fb: FormBuilder,
    private accountStateService: AccountStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.accountForm = this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        mobile: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10), Validators.pattern(/^[1-9][0-9]{9}$/)]],
        address: ['', [Validators.required, Validators.minLength(5)]],
        // role: [''],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      
      {
        validators: this.passwordsMatchValidator,
      }
    );

    this.accountForm.get('password')?.valueChanges.subscribe(() => {
      this.updatePasswordStrength();
    });

    this.updatePasswordStrength();
  }

  get f(): { [key: string]: AbstractControl } {
    return this.accountForm.controls;
  }

  passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  updatePasswordStrength(): void {
    const password = this.accountForm.get('password')?.value || '';
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    }
    if (/[A-Z]/.test(password)) {
      score += 1;
    }
    if (/[0-9]/.test(password)) {
      score += 1;
    }
    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    }

    if (score <= 1) {
      this.strengthText = 'Weak';
      this.strengthPercent = 20;
      this.strengthClass = 'bg-danger';
    } else if (score === 2) {
      this.strengthText = 'Fair';
      this.strengthPercent = 45;
      this.strengthClass = 'bg-warning';
    } else if (score === 3) {
      this.strengthText = 'Good';
      this.strengthPercent = 70;
      this.strengthClass = 'bg-info';
    } else {
      this.strengthText = 'Strong';
      this.strengthPercent = 100;
      this.strengthClass = 'bg-success';
    }
  }

  onSubmit(): void {
    this.submitted = true;
    this.submissionMessage = '';

    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }

    const payload = this.accountForm.value as AccountSubmissionPayload & { confirmPassword: string };
    const { confirmPassword, ...submitPayload } = payload;

    this.isSubmitting = true;
    this.accountStateService.submitAccount(submitPayload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.submissionMessage = response?.message || 'Account submitted successfully.';
        this.accountForm.reset({
          firstName: '',
          lastName: '',
          email: '',
          mobile: '',
          address: '',
          role: '',
          password: '',
          confirmPassword: '',
        });
        this.submitted = false;
        this.updatePasswordStrength();
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.isSubmitting = false;
        this.submissionMessage = 'Unable to submit account data right now. Please try again.';
      },
    });
  }
}
