import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Task } from '../task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly tasksUrl = '/api/tasks';

  // Get all tasks for a project
  getTasksForProject(projectId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.tasksUrl}?projectId=${projectId}`);
  }

  // Get task by ID
  getTaskById(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.tasksUrl}/${id}`);
  }

  // Create task
  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Observable<Task> {
    const newTask = {
      ...task,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return this.http.post<Task>(this.tasksUrl, newTask);
  }

  // Update task
  updateTask(id: number, updates: Partial<Task>): Observable<Task> {
    const updatedTask = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return this.http.patch<Task>(`${this.tasksUrl}/${id}`, updatedTask);
  }

  // Update task status
  updateTaskStatus(id: number, status: Task['status']): Observable<Task> {
    return this.updateTask(id, { status });
  }

  // Update task priority
  updateTaskPriority(id: number, priority: Task['priority']): Observable<Task> {
    return this.updateTask(id, { priority });
  }

  // Assign task to user
  assignTask(id: number, assigneeId: number): Observable<Task> {
    return this.updateTask(id, { assigneeId });
  }

  // Unassign task
  unassignTask(id: number): Observable<Task> {
    return this.updateTask(id, { assigneeId: undefined });
  }

  // Delete task
  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.tasksUrl}/${id}`);
  }

  // Check if user can edit task based on role and ownership
  canEditTask(task: Task, userRole: string | null, userId: number): boolean {
    if (!userRole) return false;
    
    // Owner and Admin can edit all tasks
    if (userRole === 'Owner' || userRole === 'Admin') {
      return true;
    }
    
    // Collaborator can edit their own tasks
    if (userRole === 'Collaborator') {
      return task.assigneeId === userId;
    }
    
    // Viewer cannot edit
    return false;
  }

  // Check if user can delete task
  canDeleteTask(task: Task, userRole: string | null, userId: number): boolean {
    return this.canEditTask(task, userRole, userId);
  }

  // Check if user can assign task
  canAssignTask(userRole: string | null): boolean {
    return userRole === 'Owner' || userRole === 'Admin';
  }
}
