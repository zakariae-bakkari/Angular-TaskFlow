import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
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
  protected readonly draggingTaskId = signal<number | null>(null);

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
      this.fetchProjectMembers(pId);
      this.fetchTasks(pId);
    } else {
      this.router.navigate(['/projects']);
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
    this.projectService.getProjectMembers(pId).subscribe({
      next: (members) => {
        console.log('Project members for', pId, members);
        this.projectMembers.set(members || []);
      },
      error: (err: any) => {
        console.error('Error fetching project members:', err);
        this.projectMembers.set([]);
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
      console.log('Kanban.fetchUserRole currentUser:', user);
      this.projectService.getUserRoleInProject(pId, user.id).subscribe({
        next: (role) => {
          console.log('Kanban.fetchUserRole role for project', pId, 'user', user.id, ':', role);
          this.userRole.set(role);
        },
        error: (err: any) => console.error('Error fetching user role:', err)
      });
    } else {
      console.log('Kanban.fetchUserRole: no current user');
    }
  }

  fetchTasks(pId: number): void {
    this.isLoading.set(true);
    this.error.set(null);

    // Fetch tasks for this project
     console.log('Fetching tasks for projectId via TaskService:', pId);
     this.taskService.getTasksForProject(pId).subscribe({
       next: (data: Task[] | null) => {
         console.log('Tasks fetched via TaskService:', data);
         this.tasks.set(data || []);
         this.isLoading.set(false);
       },
       error: (err: any) => {
         console.error('Error fetching tasks via TaskService:', err);
         this.error.set('Impossible de charger les tâches du projet.');
         this.isLoading.set(false);
       }
     });
  }

  // Create task flow (only Owner)
  openCreateModal(): void {
    const role = this.userRole();
    if (!(role === 'Owner' || role === 'Admin')) return;
    this.editingTaskId.set(null);
    this.taskForm.reset({ title: '', description: '', priority: 'medium', dueDate: '', assignee: null });
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  onCreateTask(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const pId = this.projectId();
    if (!pId) return;

    this.isSaving.set(true);

    const { title, description, priority, dueDate, assignee } = this.taskForm.value;

    // Prevent submitting a past due date
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
      // Update existing task
      const updates: Partial<Task> = {
        title,
        description,
        priority,
        dueDate,
        assigneeId: assignee || undefined
      };
      this.taskService.updateTask(editingId, updates).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showCreateModal.set(false);
          this.editingTaskId.set(null);
          this.fetchTasks(pId);
        },
        error: (err: any) => {
          console.error('Error updating task:', err);
          this.error.set('Erreur lors de la mise à jour de la tâche.');
          this.isSaving.set(false);
        }
      });
    } else {
      // Create new task
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
        },
        error: (err: any) => {
          console.error('Error creating task:', err);
          this.error.set('Erreur lors de la création de la tâche.');
          this.isSaving.set(false);
        }
      });
    }
  }

  // Open modal to edit a task (prefill form)
  openEditModal(task: Task): void {
    const role = this.userRole();
    // only Owner/Admin can edit
    if (!(role === 'Owner' || role === 'Admin')) return;
    this.editingTaskId.set(task.id);
    this.taskForm.reset({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate || '',
      assignee: task.assigneeId || null
    });
    this.showCreateModal.set(true);
  }

  // Return display name for assignee id
  getAssigneeName(assigneeId?: number): string {
    if (!assigneeId) return 'Non assignée';
    const member = this.projectMembers().find(m => m.userId === assigneeId);
    return member ? `${member.userName}` : 'Utilisateur inconnu';
  }

  // Whether current user can edit a given task
  canEditTaskLocal(task: Task): boolean {
    const user = this.authService.currentUser();
    const userId = user ? user.id : -1;
    return this.taskService.canEditTask(task, this.userRole(), userId);
  }

  // Whether current user can submit changes for the currently editing task
  canSubmitEditing(): boolean {
    const editingId = this.editingTaskId();
    if (!editingId) return true;
    const task = this.tasks().find(t => t.id === editingId);
    if (!task) return false;
    const user = this.authService.currentUser();
    const userId = user ? user.id : -1;
    const role = this.userRole();
    return role === 'Owner' || role === 'Admin';
  }

  // Delete a task (Owner/Admin only)
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

  // Drag & Drop handlers
  canDragTaskLocal(task: Task): boolean {
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
    } catch (e) {
      // ignore
    }
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
    const data = event.dataTransfer?.getData('text/plain');
    if (!data) return;
    const taskId = Number(data);
    const task = this.tasks().find(t => t.id === taskId);
    if (!task) return;
    if (task.status === newStatus) return;

    // optimistic update
    const oldTasks = this.tasks();
    const updatedTasks = oldTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    this.tasks.set(updatedTasks);

    this.taskService.updateTaskStatus(taskId, newStatus).subscribe({
      next: (updated) => {
        // replace task with updated from server
        this.tasks.set(this.tasks().map(t => t.id === updated.id ? updated : t));
      },
      error: (err: any) => {
        console.error('Error updating task status:', err);
        this.error.set('Erreur lors du déplacement de la tâche.');
        // revert
        this.tasks.set(oldTasks);
      }
    });
    this.draggingTaskId.set(null);
  }

  // Helper to compute CSS class for a task (avoid inline concatenation in template)
  getTaskClass(task: Task): string {
    return `priority-${task.priority || 'medium'}`;
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
