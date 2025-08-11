import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Auth, User as FirebaseUser, onAuthStateChanged, signInAnonymously, signOut, updateProfile } from '@angular/fire/auth';

export interface User {
  uid: string;
  username: string;
  displayName?: string;
  lastLogin: Date;
  isAnonymous: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor() {
    // Listen to Firebase Auth state changes
    onAuthStateChanged(this.auth, (firebaseUser) => {
      if (firebaseUser) {
        this.handleFirebaseUser(firebaseUser);
      } else {
        this.currentUserSubject.next(null);
      }
    });
  }

  private handleFirebaseUser(firebaseUser: FirebaseUser): void {
    const user: User = {
      uid: firebaseUser.uid,
      username: this.generateUsername(firebaseUser),
      displayName: firebaseUser.displayName || undefined,
      lastLogin: new Date(),
      isAnonymous: firebaseUser.isAnonymous
    };
    
    this.currentUserSubject.next(user);
  }

  private generateUsername(firebaseUser: FirebaseUser): string {
    if (firebaseUser.displayName) {
      return firebaseUser.displayName.toLowerCase().replace(/[^a-z0-9_-]/g, '').substring(0, 20);
    }
    // For anonymous users, use a sanitized version of the uid
    return `user_${firebaseUser.uid.substring(0, 8)}`;
  }

  async login(username?: string, displayName?: string): Promise<User> {
    try {
      // Sign in anonymously with Firebase
      const credential = await signInAnonymously(this.auth);
      const firebaseUser = credential.user;
      
      // Update display name if provided
      if (displayName && !firebaseUser.isAnonymous) {
        await updateProfile(firebaseUser, { displayName });
      }
      
      // Convert to our User interface
      const user: User = {
        uid: firebaseUser.uid,
        username: username || this.generateUsername(firebaseUser),
        displayName: displayName || firebaseUser.displayName || undefined,
        lastLogin: new Date(),
        isAnonymous: firebaseUser.isAnonymous
      };
      
      this.currentUserSubject.next(user);
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUserSubject.next(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
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
    // Use Firebase UID for Firestore collection naming instead of username
    return `user_${user.uid}`;
  }

  // Additional methods for anonymous authentication management
  
  isAnonymous(): boolean {
    const user = this.getCurrentUser();
    return user?.isAnonymous || false;
  }

  canUpgradeAccount(): boolean {
    return this.isAnonymous();
  }

  // Placeholder for future account upgrade functionality
  async upgradeAccount(email: string, password: string): Promise<User> {
    // This would implement account linking in the future
    // For now, just return current user
    const user = this.getCurrentUser();
    if (!user) throw new Error('No user logged in');
    return user;
  }
}