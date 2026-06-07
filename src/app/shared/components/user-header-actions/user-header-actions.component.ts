import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-user-header-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-header-actions.component.html',
  styleUrl: './user-header-actions.component.css'
})
export class UserHeaderActionsComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
