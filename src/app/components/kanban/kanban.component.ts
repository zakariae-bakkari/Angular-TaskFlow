import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProjectService } from '../../services/project.service';
import { HttpClient } from '@angular/common/http';
import { Task } from '../../task.model';
import { Project, ProjectMember } from '../../project.model';
import { FilterBarComponent, TaskPriority } from './filter-bar/filter-bar.component';

type KanbanTab = 'board' | 'stats' | 'team';

interface MemberStat {
  member: ProjectMember;
  total: number;
  todo: number;
  inProgress: number;
  done: number;
}

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, RouterLink, FilterBarComponent],
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
  protected readonly members = signal<ProjectMember[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);

  // Navigation tabs
  protected readonly activeTab = signal<KanbanTab>('board');

  // Filters
  protected readonly selectedPriorities = signal<TaskPriority[]>([]);
  protected readonly selectedAssignee = signal<number | 'all'>('all');

  protected readonly hasActiveFilters = computed(
    () => this.selectedPriorities().length > 0 || this.selectedAssignee() !== 'all'
  );

  // Tasks after applying the active filters
  protected readonly filteredTasks = computed(() => {
    const priorities = this.selectedPriorities();
    const assignee = this.selectedAssignee();
    return this.tasks().filter(task => {
      const matchesPriority =
        priorities.length === 0 || priorities.includes((task.priority ?? 'medium') as TaskPriority);
      const matchesAssignee = assignee === 'all' || task.assigneeId === assignee;
      return matchesPriority && matchesAssignee;
    });
  });

  // Computed columns (filtered)
  protected readonly todoTasks = computed(() => this.filteredTasks().filter(t => t.status === 'todo'));
  protected readonly inProgressTasks = computed(() =>
    this.filteredTasks().filter(t => t.status === 'in-progress')
  );
  protected readonly doneTasks = computed(() => this.filteredTasks().filter(t => t.status === 'done'));

  // Statistics (based on all project tasks, not the filtered view)
  protected readonly totalTasks = computed(() => this.tasks().length);
  protected readonly completedTasks = computed(
    () => this.tasks().filter(t => t.status === 'done').length
  );
  protected readonly completionRate = computed(() => {
    const total = this.totalTasks();
    return total === 0 ? 0 : Math.round((this.completedTasks() / total) * 100);
  });

  protected readonly statusBreakdown = computed(() => {
    const all = this.tasks();
    return [
      { key: 'todo', label: 'À faire', count: all.filter(t => t.status === 'todo').length },
      { key: 'in-progress', label: 'En cours', count: all.filter(t => t.status === 'in-progress').length },
      { key: 'done', label: 'Terminé', count: all.filter(t => t.status === 'done').length }
    ];
  });

  protected readonly priorityBreakdown = computed(() => {
    const all = this.tasks();
    return [
      { key: 'high', label: 'Haute', count: all.filter(t => (t.priority ?? 'medium') === 'high').length },
      { key: 'medium', label: 'Moyenne', count: all.filter(t => (t.priority ?? 'medium') === 'medium').length },
      { key: 'low', label: 'Basse', count: all.filter(t => (t.priority ?? 'medium') === 'low').length }
    ];
  });

  // Per-member task statistics, used by both the stats and team tabs
  protected readonly memberStats = computed<MemberStat[]>(() => {
    const all = this.tasks();
    return this.members().map(member => {
      const memberTasks = all.filter(t => t.assigneeId === member.userId);
      return {
        member,
        total: memberTasks.length,
        todo: memberTasks.filter(t => t.status === 'todo').length,
        inProgress: memberTasks.filter(t => t.status === 'in-progress').length,
        done: memberTasks.filter(t => t.status === 'done').length
      };
    });
  });

  // Member with the most in-progress tasks
  protected readonly mostActiveMember = computed<MemberStat | null>(() => {
    const stats = this.memberStats().filter(s => s.inProgress > 0);
    if (stats.length === 0) return null;
    return stats.reduce((max, current) => (current.inProgress > max.inProgress ? current : max));
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('projectId');
    if (idParam) {
      const pId = Number(idParam);
      this.projectId.set(pId);
      this.fetchProjectDetails(pId);
      this.fetchUserRole(pId);
      this.fetchMembers(pId);
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
        next: (role) => this.userRole.set(role)
      });
    }
  }

  fetchMembers(pId: number): void {
    this.projectService.getProjectMembers(pId).subscribe({
      next: (data) => this.members.set(data)
    });
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

  // --- Tabs ---
  selectTab(tab: KanbanTab): void {
    this.activeTab.set(tab);
  }

  // --- Filters ---
  togglePriority(priority: TaskPriority): void {
    this.selectedPriorities.update(current =>
      current.includes(priority)
        ? current.filter(p => p !== priority)
        : [...current, priority]
    );
  }

  clearPriorities(): void {
    this.selectedPriorities.set([]);
  }

  setAssignee(assignee: number | 'all'): void {
    this.selectedAssignee.set(assignee);
  }

  resetFilters(): void {
    this.selectedPriorities.set([]);
    this.selectedAssignee.set('all');
  }

  // --- Helpers ---
  memberName(userId?: number): string | null {
    if (userId == null) return null;
    const member = this.members().find(m => m.userId === userId);
    return member?.userName ?? null;
  }

  initials(name?: string | null): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
