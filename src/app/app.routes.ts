import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'projects',
    loadComponent: () => import('./components/projects/projects.component').then(m => m.ProjectsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'projects/:projectId/kanban',
    loadComponent: () => import('./components/kanban/kanban.component').then(m => m.KanbanComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: 'projects',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'projects'
  }
];
