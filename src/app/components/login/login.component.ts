import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { handleFormSubmission } from '../../shared/utils/form-submission.utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isLoading = signal<boolean>(false);

  onSubmit(): void {
    const { email, password } = this.loginForm.value;

    handleFormSubmission({
      form: this.loginForm,
      isLoading: this.isLoading,
      errorMessage: this.errorMessage,
      request: () => this.authService.login(email, password),
      onSuccess: () => this.router.navigate(['/projects']),
      defaultErrorMessage: 'Une erreur est survenue lors de la connexion.'
    });
  }
}
