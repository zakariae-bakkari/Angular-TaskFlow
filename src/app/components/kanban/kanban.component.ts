import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Task } from '../../task.model';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kanban.component.html',
  styleUrl: './kanban.component.css'
})
export class KanbanComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);

  // Computed properties for Kanban columns
  protected readonly todoTasks = computed(() => this.tasks().filter(t => t.status === 'todo'));
  protected readonly inProgressTasks = computed(() => this.tasks().filter(t => t.status === 'in-progress'));
  protected readonly doneTasks = computed(() => this.tasks().filter(t => t.status === 'done'));

  ngOnInit(): void {
    this.fetchTasks();
  }

  fetchTasks(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    this.isLoading.set(true);
    this.error.set(null);

    // Fetch tasks assigned to the current user
    this.http.get<Task[]>(`http://localhost:3000/tasks?assigneeId=${user.id}`).subscribe({
      next: (data) => {
        this.tasks.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Impossible de charger les tâches.');
        this.isLoading.set(false);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
