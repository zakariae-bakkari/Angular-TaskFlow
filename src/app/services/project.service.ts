import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Project, ProjectMember } from '../project.model';
import { NotificationService } from './notification.service';
import { User } from '../user.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  private readonly projectsUrl = '/api/projects';
  private readonly membersUrl = '/api/projectMembers';
  private readonly usersUrl = '/api/users';

  // Get all projects where the user is a member
  getProjectsForUser(userId: number): Observable<Project[]> {
    return this.http.get<ProjectMember[]>(`${this.membersUrl}?userId=${userId}`).pipe(
      switchMap(memberships => {
        if (memberships.length === 0) {
          return of([]);
        }
        // Fetch details of all projects the user is in
        const projectRequests = memberships.map(m =>
          this.http.get<Project>(`${this.projectsUrl}/${m.projectId}`).pipe(
            catchError(() => of(null)) // Ignore deleted/not found projects
          )
        );
        return forkJoin(projectRequests).pipe(
          map(projects => projects.filter((p): p is Project => p !== null))
        );
      })
    );
  }

  // Get project by ID
  getProjectById(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.projectsUrl}/${id}`);
  }

  // Create project and automatically add the creator as Owner
  createProject(name: string, description: string, ownerId: number): Observable<Project> {
    const newProject = { name, description, ownerId };
    return this.http.post<Project>(this.projectsUrl, newProject).pipe(
      switchMap(project => {
        const ownerMembership = {
          projectId: project.id,
          userId: ownerId,
          role: 'Owner'
        };
        return this.http.post<ProjectMember>(this.membersUrl, ownerMembership).pipe(
          map(() => project)
        );
      })
    );
  }

  // Update project
  updateProject(id: number, name: string, description: string): Observable<Project> {
    return this.http.patch<Project>(`${this.projectsUrl}/${id}`, { name, description });
  }

  // Delete project and remove all its tasks and memberships
  deleteProject(id: number): Observable<void> {
    // 1. Delete project from server
    return this.http.delete<void>(`${this.projectsUrl}/${id}`).pipe(
      switchMap(() => {
        // 2. Fetch memberships for this project to delete them
        return this.http.get<ProjectMember[]>(`${this.membersUrl}?projectId=${id}`).pipe(
          switchMap(members => {
            const deleteMembers = members.map(m => this.http.delete<void>(`${this.membersUrl}/${m.id}`));
            return deleteMembers.length > 0 ? forkJoin(deleteMembers) : of([]);
          })
        );
      }),
      // We could also delete project tasks here, but json-server doesn't cascade delete.
      // So cascade deleting memberships is already extremely helpful.
      map(() => undefined)
    );
  }

  // Get all members of a project with populated user details
  getProjectMembers(projectId: number): Observable<ProjectMember[]> {
    return this.http.get<ProjectMember[]>(`${this.membersUrl}?projectId=${projectId}`).pipe(
      switchMap(memberships => {
        if (memberships.length === 0) return of([]);

        const userRequests = memberships.map(m =>
          this.http.get<User>(`${this.usersUrl}/${m.userId}`).pipe(
            map(user => ({
              ...m,
              userName: user.name,
              userEmail: user.email
            })),
            catchError(() => of({ ...m, userName: 'Utilisateur Inconnu', userEmail: '' }))
          )
        );
        return forkJoin(userRequests);
      })
    );
  }

  // Add member to project by email
  addMemberByEmail(projectId: number, email: string, role: ProjectMember['role']): Observable<ProjectMember> {
    // 1. Find user by email
    return this.http.get<User[]>(`${this.usersUrl}?email=${encodeURIComponent(email.toLowerCase())}`).pipe(
      switchMap(users => {
        if (users.length === 0) {
          return throwError(() => new Error('Utilisateur non trouvé avec cette adresse email.'));
        }
        const user = users[0];

        // 2. Check if user is already a member
        return this.http.get<ProjectMember[]>(`${this.membersUrl}?projectId=${projectId}&userId=${user.id}`).pipe(
          switchMap(existing => {
            if (existing.length > 0) {
              return throwError(() => new Error('Cet utilisateur fait déjà partie du projet.'));
            }

            // 3. Create membership
            const newMember: Omit<ProjectMember, 'id'> = {
              projectId,
              userId: user.id,
              role
            };
            return this.http.post<ProjectMember>(this.membersUrl, newMember).pipe(
              switchMap(member => {
                // Fetch project name and notify invited user that they were added to a project
                return this.getProjectById(projectId).pipe(
                  map(proj => {
                    try {
                      const projName = proj?.name ?? String(projectId);
                      this.notificationService.addNotification(user.id, 'Invitation au projet', `Vous avez été invité au projet "${projName}" en tant que ${role}`);
                    } catch (e) {
                      // ignore
                    }
                    return {
                      ...member,
                      userName: user.name,
                      userEmail: user.email
                    };
                  }),
                  catchError(() => of({
                    ...member,
                    userName: user.name,
                    userEmail: user.email
                  }))
                );
              })
            );
          })
        );
      })
    );
  }

  // Update member role
  updateMemberRole(memberId: number, role: ProjectMember['role']): Observable<ProjectMember> {
    return this.http.patch<ProjectMember>(`${this.membersUrl}/${memberId}`, { role });
  }

  // Remove member from project
  removeMember(memberId: number): Observable<void> {
    return this.http.delete<void>(`${this.membersUrl}/${memberId}`);
  }

  // Get current user's role in a project
  getUserRoleInProject(projectId: number, userId: number): Observable<ProjectMember['role'] | null> {
    return this.http.get<ProjectMember[]>(`${this.membersUrl}?projectId=${projectId}&userId=${userId}`).pipe(
      map(memberships => memberships.length > 0 ? memberships[0].role : null)
    );
  }
}
