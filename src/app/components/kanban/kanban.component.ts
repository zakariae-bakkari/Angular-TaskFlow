import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { NotificationService } from '../../services/notification.service';
import { HttpClient } from '@angular/common/http';
import { Task } from '../../task.model';
import { Project, ProjectMember } from '../../project.model';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule],
  templateUrl: './kanban.component.html',
  styleUrls: ['./kanban.component.css']
})
export class KanbanComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly projectService = inject(ProjectService);
  private readonly taskService = inject(TaskService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);

  // States
  protected readonly projectId = signal<number | null>(null);
  protected readonly project = signal<Project | null>(null);
  protected readonly userRole = signal<string | null>(null);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly isSaving = signal<boolean>(false);
  protected readonly showCreateModal = signal<boolean>(false);
  protected readonly taskForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    priority: ['medium'],
    dueDate: [''],
    assignee: [null]
  });
  protected readonly isLoading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);
  protected readonly projectMembers = signal<ProjectMember[]>([]);
  protected readonly editingTaskId = signal<number | null>(null);
  protected readonly originalAssigneeId = signal<number | null>(null);
  protected readonly draggingTaskId = signal<number | null>(null);
  
  protected readonly showNotifications = signal<boolean>(false);
  protected readonly notificationsList = signal<any[]>([]);
  protected readonly showProfileMenu = signal<boolean>(false);

  protected readonly unreadCount = computed(() => {
    return this.notificationsList().filter(n => !n.read).length;
  });

  toggleNotifications(): void {
    this.showProfileMenu.set(false);
    const user = this.authService.currentUser();
    if (!user) return;
    const next = !this.showNotifications();
    this.showNotifications.set(next);
    if (next) {
      const notes = this.notificationService.getNotificationsForUser(user.id) || [];
      this.notificationsList.set(notes);
      const idRegex = /projet\s+"(\d+)"/i;
      notes.forEach(n => {
        const m = (n.message || '').match(idRegex);
        if (m && m[1]) {
          const pid = Number(m[1]);
          this.projectService.getProjectById(pid).subscribe({
            next: proj => {
              if (proj && proj.name) {
                const updated = this.notificationsList().map(item => item.id === n.id ? { ...item, message: (n.message || '').replace(idRegex, `projet \"${proj.name}\"`) } : item);
                this.notificationsList.set(updated);
              }
            },
            error: () => { /* ignore */ }
          });
        }
      });
    }
  }

  toggleProfileMenu(): void {
    this.showNotifications.set(false);
    this.showProfileMenu.set(!this.showProfileMenu());
  }

  markNotificationRead(id: string): void {
    const user = this.authService.currentUser();
    if (!user) return;
    this.notificationsList.set(this.notificationsList().map(n => n.id === id ? { ...n, read: true } : n));
    this.notificationService.markAsRead(user.id, id);
  }

  markAllRead(): void {
    const user = this.authService.currentUser();
    if (!user) return;
    this.notificationsList.set(this.notificationsList().map(n => ({ ...n, read: true })));
    this.notificationService.markAllRead(user.id);
  }

  // Active Tab
  protected readonly activeTab = signal<'board' | 'stats' | 'team'>('board');

  // Filter States
  protected readonly selectedPriority = signal<'all' | 'low' | 'medium' | 'high'>('all');
  protected readonly selectedAssignee = signal<number | null>(null);

  // Team Invite Form States
  protected readonly inviteEmail = signal<string>('');
  protected readonly inviteRole = signal<ProjectMember['role']>('Collaborator');
  protected readonly memberErrorMessage = signal<string | null>(null);
  protected readonly isMembersLoading = signal<boolean>(false);

  // Reactive Filters
  protected readonly filteredTasks = computed(() => {
    let list = this.tasks();
    const priority = this.selectedPriority();
    const assignee = this.selectedAssignee();

    if (priority !== 'all') {
      list = list.filter(t => t.priority === priority);
    }
    if (assignee !== null) {
      list = list.filter(t => t.assigneeId === assignee);
    }
    return list;
  });

  protected readonly todoTasks = computed(() => this.filteredTasks().filter(t => t.status === 'todo'));
  protected readonly inProgressTasks = computed(() => this.filteredTasks().filter(t => t.status === 'in-progress'));
  protected readonly doneTasks = computed(() => this.filteredTasks().filter(t => t.status === 'done'));

  protected readonly totalTasksCount = computed(() => this.tasks().length);
  protected readonly completedTasksCount = computed(() => this.tasks().filter(t => t.status === 'done').length);
  protected readonly inProgressTasksCount = computed(() => this.tasks().filter(t => t.status === 'in-progress').length);
  protected readonly todoTasksCount = computed(() => this.tasks().filter(t => t.status === 'todo').length);
  protected readonly progressRate = computed(() => {
    const total = this.totalTasksCount();
    return total > 0 ? Math.round((this.completedTasksCount() / total) * 100) : 0;
  });
  protected readonly allTasksDone = computed(() => {
    const total = this.totalTasksCount();
    return total === 0 || this.completedTasksCount() === total;
  });
  protected readonly lateTasks = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.tasks().filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < today);
  });
  protected readonly mostBusyMember = computed(() => {
    const inProg = this.tasks().filter(t => t.status === 'in-progress');
    const counts: { [id: number]: number } = {};
    inProg.forEach(t => {
      if (t.assigneeId) {
        counts[t.assigneeId] = (counts[t.assigneeId] || 0) + 1;
      }
    });
    let maxId = -1;
    let maxCount = -1;
    Object.keys(counts).forEach(k => {
      const id = Number(k);
      if (counts[id] > maxCount) {
        maxCount = counts[id];
        maxId = id;
      }
    });
    if (maxId === -1) return 'Aucun';
    return this.getAssigneeName(maxId);
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('projectId');
    if (idParam) {
      const pId = Number(idParam);
      this.projectId.set(pId);
      this.fetchProjectDetails(pId);
      this.fetchUserRole(pId);
      this.fetchProjectMembers(pId);
      this.fetchTasks(pId);
    } else {
      this.router.navigate(['/projects']);
    }
    const user = this.authService.currentUser();
    if (user) {
      const notes = this.notificationService.getNotificationsForUser(user.id) || [];
      this.notificationsList.set(notes);
    }
  }

  get minDate(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  fetchProjectMembers(pId: number): void {
    this.isMembersLoading.set(true);
    this.projectService.getProjectMembers(pId).subscribe({
      next: (members) => {
        this.projectMembers.set(members || []);
        this.isMembersLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching project members:', err);
        this.projectMembers.set([]);
        this.isMembersLoading.set(false);
      }
    });
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
        next: (role) => {
          this.userRole.set(role);
        },
        error: (err: any) => console.error('Error fetching user role:', err)
      });
    }
  }

  fetchTasks(pId: number): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.taskService.getTasksForProject(pId).subscribe({
      next: (data: Task[] | null) => {
        this.tasks.set(data || []);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching tasks:', err);
        this.error.set('Impossible de charger les tâches du projet.');
        this.isLoading.set(false);
      }
    });
  }

  setPriorityFilter(prio: 'all' | 'low' | 'medium' | 'high'): void {
    this.selectedPriority.set(prio);
  }

  clearFilters(): void {
    this.selectedPriority.set('all');
    this.selectedAssignee.set(null);
  }

  onToggleCompletion(): void {
    const proj = this.project();
    if (!proj) return;
    if (!proj.completed && !this.allTasksDone()) {
      this.error.set("Toutes les tâches doivent être terminées pour clore le projet.");
      return;
    }
    const newState = !proj.completed;
    this.projectService.toggleProjectCompletion(proj.id, newState).subscribe({
      next: (updated) => {
        this.project.set(updated);
        this.error.set(null);
      },
      error: () => this.error.set('Erreur lors de la mise à jour du statut du projet.')
    });
  }

  openCreateModal(): void {
    if (this.project()?.completed) return;
    const role = this.userRole();
    if (!(role === 'Owner' || role === 'Admin' || role === 'Collaborator')) return;
    this.editingTaskId.set(null);
    this.originalAssigneeId.set(null);
    this.taskForm.reset({ title: '', description: '', priority: 'medium', dueDate: '', assignee: null });
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  onCreateTask(): void {
    if (this.taskForm.invalid || this.project()?.completed) {
      this.taskForm.markAllAsTouched();
      return;
    }
    const pId = this.projectId();
    if (!pId) return;
    this.isSaving.set(true);
    const { title, description, priority, dueDate, assignee } = this.taskForm.value;
    if (dueDate) {
      const selected = new Date(dueDate);
      selected.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        this.error.set("La date d'échéance ne peut pas être dans le passé.");
        this.isSaving.set(false);
        return;
      }
    }
    const editingId = this.editingTaskId();
    if (editingId) {
      const updates: Partial<Task> = { title, description, priority, dueDate, assigneeId: assignee || undefined };
      this.taskService.updateTask(editingId, updates).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showCreateModal.set(false);
          this.editingTaskId.set(null);
          this.fetchTasks(pId);
          const newAssignee = assignee || null;
          const oldAssignee = this.originalAssigneeId();
          if (newAssignee && newAssignee !== oldAssignee) {
            try {
              const projName = this.project()?.name ?? String(pId);
              this.notificationService.addNotification(newAssignee, 'Nouvelle tâche assignée', `Une tâche vous a été assignée dans le projet "${projName}"`);
            } catch (e) { /* ignore */ }
          }
        },
        error: (err: any) => {
          console.error('Error updating task:', err);
          this.error.set('Erreur lors de la mise à jour de la tâche.');
          this.isSaving.set(false);
        }
      });
    } else {
      this.taskService.createTask({
        projectId: pId,
        title,
        description,
        priority,
        dueDate,
        assigneeId: assignee || undefined,
        status: 'todo'
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showCreateModal.set(false);
          this.fetchTasks(pId);
          if (assignee && this.authService.currentUser()?.id !== assignee) {
            try {
              const projName = this.project()?.name ?? String(pId);
              this.notificationService.addNotification(assignee, 'Tâche assignée', `Une nouvelle tâche vous a été assignée dans le projet "${projName}"`);
            } catch (e) { /* ignore */ }
          }
        },
        error: (err: any) => {
          console.error('Error creating task:', err);
          this.error.set('Erreur lors de la création de la tâche.');
          this.isSaving.set(false);
        }
      });
    }
  }

  openEditModal(task: Task): void {
    const role = this.userRole();
    if (!(role === 'Owner' || role === 'Admin' || role === 'Collaborator')) return;
    this.editingTaskId.set(task.id);
    this.originalAssigneeId.set(task.assigneeId || null);
    this.taskForm.reset({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate || '',
      assignee: task.assigneeId || null
    });
    this.showCreateModal.set(true);
  }

  getAssigneeName(assigneeId?: number): string {
    if (!assigneeId) return 'Non assignée';
    const member = this.projectMembers().find(m => m.userId === assigneeId);
    return member ? `${member.userName}` : 'Utilisateur inconnu';
  }

  getAssigneeInitials(assigneeId?: number): string {
    if (!assigneeId) return '--';
    const member = this.projectMembers().find(m => m.userId === assigneeId);
    if (!member || !member.userName) return 'U';
    const parts = member.userName.trim().split(/\s+/);
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  canEditTaskLocal(task: Task): boolean {
    const user = this.authService.currentUser();
    const userId = user ? user.id : -1;
    return this.taskService.canEditTask(task, this.userRole(), userId);
  }

  canSubmitEditing(): boolean {
    const editingId = this.editingTaskId();
    if (!editingId) return true;
    const task = this.tasks().find(t => t.id === editingId);
    if (!task) return false;
    const user = this.authService.currentUser();
    const userId = user ? user.id : -1;
    return this.taskService.canEditTask(task, this.userRole(), userId);
  }

  deleteTask(taskId: number): void {
    const role = this.userRole();
    if (!(role === 'Owner' || role === 'Admin')) {
      this.error.set('Vous n\'êtes pas autorisé à supprimer cette tâche.');
      return;
    }
    this.isSaving.set(true);
    this.taskService.deleteTask(taskId).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showCreateModal.set(false);
        this.editingTaskId.set(null);
        const pId = this.projectId();
        if (pId) this.fetchTasks(pId);
      },
      error: (err: any) => {
        console.error('Error deleting task:', err);
        this.error.set('Erreur lors de la suppression de la tâche.');
        this.isSaving.set(false);
      }
    });
  }

  onAddMember(): void {
    const pId = this.projectId();
    const email = this.inviteEmail();
    const role = this.inviteRole();
    if (!pId || !email) return;
    this.isMembersLoading.set(true);
    this.memberErrorMessage.set(null);
    this.projectService.addMemberByEmail(pId, email, role).subscribe({
      next: () => {
        this.inviteEmail.set('');
        this.fetchProjectMembers(pId);
      },
      error: (err) => {
        this.memberErrorMessage.set(err.message || "Erreur lors de l'ajout du membre.");
        this.isMembersLoading.set(false);
      }
    });
  }

  onChangeRole(member: ProjectMember, newRole: ProjectMember['role']): void {
    if (member.role === 'Owner') {
      alert("Le rôle du propriétaire du projet ne peut pas être modifié.");
      return;
    }
    this.projectService.updateMemberRole(member.id, newRole).subscribe({
      next: () => {
        const pId = this.projectId();
        if (pId) this.fetchProjectMembers(pId);
      }
    });
  }

  onRemoveMember(member: ProjectMember): void {
    if (member.role === 'Owner') {
      alert("Le propriétaire du projet ne peut pas être retiré.");
      return;
    }
    if (!confirm(`Retirer ${member.userName || member.userEmail} du projet ?`)) return;
    this.projectService.removeMember(member.id).subscribe({
      next: () => {
        const pId = this.projectId();
        if (pId) this.fetchProjectMembers(pId);
      }
    });
  }

  isOwner(): boolean {
    const user = this.authService.currentUser();
    const proj = this.project();
    return (user && proj) ? proj.ownerId === user.id : false;
  }

  canDragTaskLocal(task: Task): boolean {
    if (this.project()?.completed) return false;
    const role = this.userRole();
    return role === 'Owner' || role === 'Admin' || role === 'Collaborator';
  }

  onDragStart(event: DragEvent, task: Task): void {
    if (!this.canDragTaskLocal(task)) {
      event.preventDefault();
      return;
    }
    this.draggingTaskId.set(task.id);
    try {
      event.dataTransfer?.setData('text/plain', String(task.id));
      event.dataTransfer!.effectAllowed = 'move';
    } catch (e) {}
  }

  onDragEnd(_event: DragEvent): void {
    this.draggingTaskId.set(null);
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    const el = (event.currentTarget as HTMLElement);
    if (el) el.classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    const el = (event.currentTarget as HTMLElement);
    if (el) el.classList.remove('drag-over');
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onDrop(event: DragEvent, newStatus: Task['status']): void {
    event.preventDefault();
    const el = (event.currentTarget as HTMLElement);
    if (el) el.classList.remove('drag-over');
    if (this.project()?.completed) return;
    const data = event.dataTransfer?.getData('text/plain');
    if (!data) return;
    const taskId = Number(data);
    const task = this.tasks().find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;
    const oldTasks = this.tasks();
    const updatedTasks = oldTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    this.tasks.set(updatedTasks);
    this.taskService.updateTaskStatus(taskId, newStatus).subscribe({
      next: (updated) => {
        this.tasks.set(this.tasks().map(t => t.id === updated.id ? updated : t));
      },
      error: (err: any) => {
        console.error('Error updating task status:', err);
        this.error.set('Erreur lors du déplacement de la tâche.');
        this.tasks.set(oldTasks);
      }
    });
    this.draggingTaskId.set(null);
  }

  getTaskClass(task: Task): string {
    return `priority-${task.priority || 'medium'}`;
  }

  get canEdit(): boolean {
    if (this.project()?.completed) return false;
    const role = this.userRole();
    return role === 'Owner' || role === 'Admin' || role === 'Collaborator';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
