import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { Project, ProjectMember } from '../../project.model';
import { CommonModule } from '@angular/common';

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

  ngOnInit(): void {
    this.loadProjects();
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

  // --- CREATE ---
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

    const user = this.authService.currentUser();
    if (!user) return;

    this.isLoading.set(true);
    const { name, description } = this.projectForm.value;

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

  // --- EDIT ---
  openEditModal(project: Project, event: Event): void {
    event.stopPropagation(); // Avoid navigating to board
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

    this.isLoading.set(true);
    const { name, description } = this.editProjectForm.value;

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

  // --- DELETE ---
  onDeleteProject(projectId: number, event: Event): void {
    event.stopPropagation(); // Avoid navigating
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce projet et ses membres ?')) {
      return;
    }

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

  // --- MEMBERS ---
  openMembersModal(project: Project, event: Event): void {
    event.stopPropagation();
    this.activeProject.set(project);
    this.inviteEmail = '';
    this.inviteRole = 'Collaborator';
    this.memberErrorMessage.set(null);
    this.loadMembers(project.id);
    this.showMembersModal.set(true);
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
    if (!confirm(`Retirer ${member.userName || member.userEmail} du projet ?`)) {
      return;
    }
    this.projectService.removeMember(member.id).subscribe({
      next: () => {
        const project = this.activeProject();
        if (project) this.loadMembers(project.id);
      }
    });
  }

  // Helper: check if logged-in user is Owner of the project
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
