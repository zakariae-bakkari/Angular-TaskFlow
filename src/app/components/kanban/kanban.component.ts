import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProjectService } from '../../services/project.service';
import { HttpClient } from '@angular/common/http';
import { Task } from '../../task.model';
import { Project } from '../../project.model';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './kanban.component.html',
  styleUrl: './kanban.component.css'
})
export class KanbanComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly projectService = inject(ProjectService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // States
  protected readonly projectId = signal<number | null>(null);
  protected readonly project = signal<Project | null>(null);
  protected readonly userRole = signal<string | null>(null);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);

  // Computed columns
  protected readonly todoTasks = computed(() => this.tasks().filter(t => t.status === 'todo'));
  protected readonly inProgressTasks = computed(() => this.tasks().filter(t => t.status === 'in-progress'));
  protected readonly doneTasks = computed(() => this.tasks().filter(t => t.status === 'done'));

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('projectId');
    if (idParam) {
      const pId = Number(idParam);
      this.projectId.set(pId);
      this.fetchProjectDetails(pId);
      this.fetchUserRole(pId);
      this.fetchTasks(pId);
    } else {
      this.router.navigate(['/projects']);
    }
  }

  fetchProjectDetails(pId: number): void {
    this.projectService.getProjectById(pId).subscribe({
      next: (data) => this.project.set(data),
      error: () => this.error.set('Impossible de charger les détails du projet.')
    });
  }

  fetchUserRole(pId: number): void {
    const user = this.authService.currentUser();
    if (user) {
      this.projectService.getUserRoleInProject(pId, user.id).subscribe({
        next: (role) => this.userRole.set(role),
        error: (err) => {
          console.error('Failed to fetch user role:', err.message);
          this.userRole.set(null);
        }
      });
    }
  }

  fetchTasks(pId: number): void {
    this.isLoading.set(true);
    this.error.set(null);

    // Fetch tasks for this project
    this.http.get<Task[]>(`/api/tasks?projectId=${pId}`).subscribe({
      next: (data) => {
        this.tasks.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les tâches du projet.');
        this.isLoading.set(false);
      }
    });
  }

  // Check if current user can add/edit tasks
  get canEdit(): boolean {
    const role = this.userRole();
    return role === 'Owner' || role === 'Admin' || role === 'Collaborator';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
