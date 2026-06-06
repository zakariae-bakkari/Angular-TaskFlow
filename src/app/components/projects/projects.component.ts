import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { Project, ProjectMember } from '../../project.model';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  // Lists
  protected readonly projects = signal<Project[]>([]);
  protected readonly projectMembers = signal<ProjectMember[]>([]);

  // States
  protected readonly isLoading = signal<boolean>(false);
  protected readonly isMembersLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly memberErrorMessage = signal<string | null>(null);

  // Active items for modals
  protected activeProject = signal<Project | null>(null);

  // Modals Visibility
  protected readonly showCreateModal = signal<boolean>(false);
  protected readonly showEditModal = signal<boolean>(false);
  protected readonly showMembersModal = signal<boolean>(false);
  protected readonly showNotifications = signal<boolean>(false);
  protected readonly showProfileMenu = signal<boolean>(false);
  protected readonly notificationsList = signal<any[]>([]);
  
  protected readonly unreadCount = computed(() => this.notificationsList().filter(n => !n.read).length);

  // Forms
  protected readonly projectForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.maxLength(500)]]
  });

  protected readonly editProjectForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.maxLength(500)]]
  });

  // Member invitation fields
  protected inviteEmail = '';
  protected inviteRole: ProjectMember['role'] = 'Collaborator';
  protected readonly confirmDialog = signal<{
    title: string;
    message: string;
    confirmLabel: string;
    action: () => void;
  } | null>(null);

  ngOnInit(): void {
    this.loadProjects();
    const user = this.authService.currentUser();
    if (user) {
      const notes = this.notificationService.getNotificationsForUser(user.id) || [];
      this.notificationsList.set(notes);
    }
  }

  loadProjects(): void {
    const user = this.authService.currentUser();
    if (!user) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.projectService.getProjectsForUser(user.id).subscribe({
      next: (data) => {
        this.projects.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger vos projets.');
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.projectForm.reset();
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  onCreateProject(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }
    const { name, description } = this.projectForm.value;
    const exists = this.projects().some(p => p.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      this.projectForm.get('name')?.setErrors({ duplicateName: true });
      return;
    }
    const user = this.authService.currentUser();
    if (!user) return;
    this.isLoading.set(true);
    this.projectService.createProject(name, description, user.id).subscribe({
      next: () => {
        this.loadProjects();
        this.closeCreateModal();
      },
      error: () => {
        this.errorMessage.set('Erreur lors de la création du projet.');
        this.isLoading.set(false);
      }
    });
  }

  openEditModal(project: Project, event: Event): void {
    event.stopPropagation();
    this.activeProject.set(project);
    this.editProjectForm.setValue({
      name: project.name,
      description: project.description || ''
    });
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.activeProject.set(null);
  }

  onEditProject(): void {
    const active = this.activeProject();
    if (!active || this.editProjectForm.invalid) {
      this.editProjectForm.markAllAsTouched();
      return;
    }
    const { name, description } = this.editProjectForm.value;
    const exists = this.projects().some(p => 
      p.id !== active.id && p.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      this.editProjectForm.get('name')?.setErrors({ duplicateName: true });
      return;
    }
    this.isLoading.set(true);
    this.projectService.updateProject(active.id, name, description).subscribe({
      next: () => {
        this.loadProjects();
        this.closeEditModal();
      },
      error: () => {
        this.errorMessage.set('Erreur lors de la modification du projet.');
        this.isLoading.set(false);
      }
    });
  }

  onDeleteProject(projectId: number, event: Event): void {
    event.stopPropagation();
    const project = this.projects().find(item => item.id === projectId);
    this.confirmDialog.set({
      title: 'Supprimer ce projet ?',
      message: `Le projet "${project?.name || 'sélectionné'}" et ses membres seront supprimés définitivement.`,
      confirmLabel: 'Supprimer',
      action: () => this.deleteProject(projectId)
    });
  }

  private deleteProject(projectId: number): void {
    this.isLoading.set(true);
    this.projectService.deleteProject(projectId).subscribe({
      next: () => {
        this.loadProjects();
      },
      error: () => {
        this.errorMessage.set('Erreur lors de la suppression du projet.');
        this.isLoading.set(false);
      }
    });
  }

  onToggleCompletion(project: Project, event: Event): void {
    event.stopPropagation();
    const newState = !project.completed;
    this.projectService.toggleProjectCompletion(project.id, newState).subscribe({
      next: () => {
        this.loadProjects();
      },
      error: () => {
        this.errorMessage.set('Erreur lors de la mise à jour du statut du projet.');
      }
    });
  }

  openMembersModal(project: Project, event: Event): void {
    event.stopPropagation();
    this.activeProject.set(project);
    this.inviteEmail = '';
    this.inviteRole = 'Collaborator';
    this.memberErrorMessage.set(null);
    this.loadMembers(project.id);
    this.showMembersModal.set(true);
  }

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

  closeMembersModal(): void {
    this.showMembersModal.set(false);
    this.activeProject.set(null);
  }

  loadMembers(projectId: number): void {
    this.isMembersLoading.set(true);
    this.projectService.getProjectMembers(projectId).subscribe({
      next: (members) => {
        this.projectMembers.set(members);
        this.isMembersLoading.set(false);
      },
      error: () => {
        this.memberErrorMessage.set('Impossible de charger les membres du projet.');
        this.isMembersLoading.set(false);
      }
    });
  }

  onAddMember(): void {
    const project = this.activeProject();
    if (!project || !this.inviteEmail) return;
    this.isMembersLoading.set(true);
    this.memberErrorMessage.set(null);
    this.projectService.addMemberByEmail(project.id, this.inviteEmail, this.inviteRole).subscribe({
      next: () => {
        this.inviteEmail = '';
        this.loadMembers(project.id);
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
        const project = this.activeProject();
        if (project) this.loadMembers(project.id);
      }
    });
  }

  onRemoveMember(member: ProjectMember): void {
    if (member.role === 'Owner') {
      alert("Le propriétaire du projet ne peut pas être retiré du projet.");
      return;
    }
    this.confirmDialog.set({
      title: 'Retirer ce membre ?',
      message: `${member.userName || member.userEmail} perdra son accès à ce projet.`,
      confirmLabel: 'Retirer',
      action: () => this.removeMember(member)
    });
  }

  private removeMember(member: ProjectMember): void {
    this.projectService.removeMember(member.id).subscribe({
      next: () => {
        const project = this.activeProject();
        if (project) this.loadMembers(project.id);
      }
    });
  }

  closeConfirmDialog(): void {
    this.confirmDialog.set(null);
  }

  confirmDestructiveAction(): void {
    const dialog = this.confirmDialog();
    if (!dialog) return;
    this.confirmDialog.set(null);
    dialog.action();
  }

  isOwner(project: Project): boolean {
    const user = this.authService.currentUser();
    return user ? project.ownerId === user.id : false;
  }

  navigateToBoard(projectId: number): void {
    this.router.navigate(['/projects', projectId, 'kanban']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
