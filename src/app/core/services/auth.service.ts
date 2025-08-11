import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  username: string;
  displayName?: string;
  lastLogin: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor() {
    // Check for existing session on startup
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    const stored = localStorage.getItem('creative-writer-user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        user.lastLogin = new Date(user.lastLogin);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.warn('Invalid stored user data:', error);
        this.logout();
      }
    }
  }

  private saveCurrentUser(user: User): void {
    localStorage.setItem('creative-writer-user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  login(username: string, displayName?: string): Promise<User> {
    return new Promise((resolve, reject) => {
      // Basic validation
      if (!username || username.length < 2) {
        reject(new Error('Benutzername muss mindestens 2 Zeichen lang sein'));
        return;
      }

      // Sanitize username for database naming
      const sanitizedUsername = username
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .substring(0, 20);

      if (!sanitizedUsername) {
        reject(new Error('Invalid username'));
        return;
      }

      const user: User = {
        username: sanitizedUsername,
        displayName: displayName || username,
        lastLogin: new Date()
      };

      this.saveCurrentUser(user);
      resolve(user);
    });
  }

  logout(): void {
    localStorage.removeItem('creative-writer-user');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  getUserDatabaseName(): string | null {
    const user = this.getCurrentUser();
    if (!user) return null;
    return `creative-writer-stories-${user.username}`;
  }
}