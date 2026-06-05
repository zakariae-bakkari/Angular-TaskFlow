import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, throwError, of } from 'rxjs';
import { User } from '../user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:3000/users';

  // Session signal
  private readonly _currentUser = signal<User | null>(null);
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isLoggedIn = computed(() => this._currentUser() !== null);

  constructor() {
    this.loadSession();
  }

  private loadSession(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const storedUser = localStorage.getItem('taskflow_user');
      if (storedUser) {
        try {
          this._currentUser.set(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem('taskflow_user');
        }
      }
    }
  }

  login(email: string, password: string): Observable<User> {
    return this.http.get<User[]>(`${this.apiUrl}?email=${encodeURIComponent(email)}`).pipe(
      switchMap(users => {
        if (users.length === 0) {
          return throwError(() => new Error('Utilisateur non trouvé.'));
        }
        const user = users[0];
        if (user.password !== password) {
          return throwError(() => new Error('Mot de passe incorrect.'));
        }
        this.saveSession(user);
        return of(user);
      })
    );
  }

  register(name: string, email: string, password: string): Observable<User> {
    return this.http.get<User[]>(`${this.apiUrl}?email=${encodeURIComponent(email)}`).pipe(
      switchMap(users => {
        if (users.length > 0) {
          return throwError(() => new Error('Cet email est déjà utilisé.'));
        }
        const newUser: Omit<User, 'id'> = { name, email, password };
        return this.http.post<User>(this.apiUrl, newUser).pipe(
          map(user => {
            this.saveSession(user);
            return user;
          })
        );
      })
    );
  }

  logout(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('taskflow_user');
    }
    this._currentUser.set(null);
  }

  private saveSession(user: User): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('taskflow_user', JSON.stringify(user));
    }
    this._currentUser.set(user);
  }
}
