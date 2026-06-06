import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly projectService = inject(ProjectService);
  private readonly taskService = inject(TaskService);
  private readonly notificationService = inject(NotificationService);

  protected readonly user = signal<any>(null);
  protected readonly projects = signal<any[]>([]);
  protected readonly myTasks = signal<any[]>([]);
  protected readonly notifications = signal<any[]>([]);
  protected readonly isLoading = signal<boolean>(false);

  protected readonly totalProjects = computed(() => this.projects().length);
  protected readonly tasksByStatus = computed(() => {
    const counts = { todo: 0, 'in-progress': 0, done: 0 } as any;
    for (const t of this.myTasks()) counts[t.status] = (counts[t.status] || 0) + 1;
    return counts;
  });
  protected readonly tasksByPriority = computed(() => {
    const counts: any = { low: 0, medium: 0, high: 0 };
    for (const t of this.myTasks()) counts[t.priority || 'medium'] = (counts[t.priority || 'medium'] || 0) + 1;
    return counts;
  });

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.user.set(user || null);
    if (!user) return;
    this.isLoading.set(true);
    this.projectService.getProjectsForUser(user.id).subscribe({
      next: (projects) => this.projects.set(projects || []),
      error: () => this.projects.set([])
    });

    this.taskService.getTasksAssignedToUser(user.id).subscribe({
      next: (tasks) => this.myTasks.set(tasks || []),
      error: () => this.myTasks.set([])
    });

    const notes = this.notificationService.getNotificationsForUser(user.id);
    this.notifications.set(notes || []);
    this.isLoading.set(false);
  }

  markRead(id: string) {
    const user = this.user();
    if (!user) return;
    this.notificationService.markAsRead(user.id, id);
    this.notifications.set(this.notificationService.getNotificationsForUser(user.id));
  }

  markAllRead() {
    const user = this.user();
    if (!user) return;
    this.notificationService.markAllRead(user.id);
    this.notifications.set(this.notificationService.getNotificationsForUser(user.id));
  }
}
