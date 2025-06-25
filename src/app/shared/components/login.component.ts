import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container" *ngIf="!isLoggedIn">
      <div class="login-card">
        <h2>Creative Writer</h2>
        <p class="login-subtitle">Melde dich an, um deine Geschichten zu synchronisieren</p>
        
        <form (ngSubmit)="onLogin()" #loginForm="ngForm">
          <div class="form-group">
            <label for="username">Benutzername</label>
            <input 
              type="text" 
              id="username" 
              name="username"
              [(ngModel)]="username" 
              required 
              minlength="2"
              maxlength="20"
              pattern="[a-zA-Z0-9_-]+"
              placeholder="dein-username"
              #usernameField="ngModel">
            <div class="field-help" *ngIf="usernameField.invalid && usernameField.touched">
              <small *ngIf="usernameField.errors?.['required']">Benutzername ist erforderlich</small>
              <small *ngIf="usernameField.errors?.['minlength']">Mindestens 2 Zeichen</small>
              <small *ngIf="usernameField.errors?.['pattern']">Nur Buchstaben, Zahlen, _ und - erlaubt</small>
            </div>
          </div>
          
          <div class="form-group">
            <label for="displayName">Anzeigename (optional)</label>
            <input 
              type="text" 
              id="displayName" 
              name="displayName"
              [(ngModel)]="displayName" 
              maxlength="50"
              placeholder="Dein Name">
          </div>
          
          <button 
            type="submit" 
            class="login-btn"
            [disabled]="loginForm.invalid || isLoading">
            <span *ngIf="!isLoading">Anmelden</span>
            <span *ngIf="isLoading">Wird angemeldet...</span>
          </button>
          
          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>
        </form>
        
        <div class="login-info">
          <h3>ℹ️ Hinweise:</h3>
          <ul>
            <li>Keine Registrierung erforderlich - einfach Benutzername eingeben</li>
            <li>Deine Geschichten werden automatisch mit allen deinen Geräten synchronisiert</li>
            <li>Ohne Anmeldung werden Daten nur lokal gespeichert</li>
            <li>Der Benutzername wird für die Datenbank verwendet (nur a-z, 0-9, _, -)</li>
          </ul>
        </div>
        
        <button class="skip-btn" (click)="skipLogin()">
          Ohne Anmeldung fortfahren (nur lokal)
        </button>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .login-card {
      background: #2d2d2d;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }
    
    h2 {
      margin: 0 0 0.5rem 0;
      color: #f8f9fa;
      text-align: center;
    }
    
    .login-subtitle {
      text-align: center;
      color: #adb5bd;
      margin-bottom: 2rem;
      font-size: 0.9rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #e0e0e0;
    }
    
    input {
      width: 100%;
      padding: 0.75rem;
      background-color: #1a1a1a;
      color: #e0e0e0;
      border: 1px solid #404040;
      border-radius: 4px;
      font-size: 1rem;
      box-sizing: border-box;
    }
    
    input:focus {
      outline: none;
      border-color: #4CAF50;
      box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
    }
    
    input.ng-invalid.ng-touched {
      border-color: #f44336;
    }
    
    .field-help {
      margin-top: 0.5rem;
    }
    
    .field-help small {
      color: #f44336;
      font-size: 0.875rem;
    }
    
    .login-btn {
      width: 100%;
      padding: 0.75rem;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .login-btn:hover:not(:disabled) {
      background: #45a049;
    }
    
    .login-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .skip-btn {
      width: 100%;
      padding: 0.5rem;
      background: transparent;
      color: #adb5bd;
      border: 1px solid #404040;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 1rem;
      font-size: 0.9rem;
    }
    
    .skip-btn:hover {
      background: #383838;
    }
    
    .error-message {
      color: #ff6b6b;
      text-align: center;
      margin-top: 1rem;
      padding: 0.5rem;
      background: rgba(248, 81, 73, 0.1);
      border: 1px solid rgba(248, 81, 73, 0.3);
      border-radius: 4px;
      font-size: 0.9rem;
    }
    
    .login-info {
      margin: 2rem 0;
      padding: 1rem;
      background: #1a1a1a;
      border-radius: 4px;
      border-left: 4px solid #4CAF50;
      border: 1px solid rgba(76, 175, 80, 0.3);
    }
    
    .login-info h3 {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      color: #e0e0e0;
    }
    
    .login-info ul {
      margin: 0;
      padding-left: 1.2rem;
      font-size: 0.85rem;
      color: #adb5bd;
    }
    
    .login-info li {
      margin-bottom: 0.3rem;
    }
  `]
})
export class LoginComponent implements OnInit {
  username = '';
  displayName = '';
  isLoading = false;
  errorMessage = '';
  isLoggedIn = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
    });
  }

  async onLogin() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      await this.authService.login(this.username, this.displayName || undefined);
      // Login successful - component will hide automatically
    } catch (error: any) {
      this.errorMessage = error.message || 'Anmeldung fehlgeschlagen';
    } finally {
      this.isLoading = false;
    }
  }

  skipLogin() {
    // Just hide the login - user will work with anonymous/local storage
    this.isLoggedIn = true;
  }
}