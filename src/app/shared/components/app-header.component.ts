import { Component, Input, Output, EventEmitter, TemplateRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { VersionService } from '../../core/services/version.service';
import { VersionTooltipComponent } from './version-tooltip.component';

export interface HeaderAction {
  icon: string;
  label?: string;
  color?: string;
  action: () => void;
  disabled?: boolean;
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
  chipContent?: string;
  chipColor?: string;
  showVersionTooltip?: boolean;
}

export interface BurgerMenuItem {
  icon: string;
  label: string;
  action: () => void;
  color?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, IonicModule, VersionTooltipComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <!-- Left Actions -->
        <ion-buttons slot="start">
          <ion-button *ngIf="showBackButton" (click)="handleBackAction()">
            <ion-icon name="arrow-back" slot="icon-only"></ion-icon>
          </ion-button>
          
          <ng-container *ngFor="let action of leftActions">
            <ion-button 
              [class.desktop-only]="!action.showOnMobile"
              [class.mobile-only]="!action.showOnDesktop"
              [disabled]="action.disabled"
              [color]="action.color"
              (click)="action.action()">
              <ion-icon [name]="action.icon" slot="icon-only"></ion-icon>
            </ion-button>
          </ng-container>
        </ion-buttons>

        <!-- Title -->
        <ion-title>
          <ng-container *ngIf="titleTemplate; else staticTitle">
            <ng-container *ngTemplateOutlet="titleTemplate"></ng-container>
          </ng-container>
          <ng-template #staticTitle>
            <span class="app-title">{{ title }}</span>
          </ng-template>
        </ion-title>

        <!-- Right Actions -->
        <ion-buttons slot="end">
          <!-- User Info (Desktop Only) -->
          <div class="desktop-only user-info" *ngIf="showUserInfo && userGreeting">
            <span class="user-greeting">{{ userGreeting }}</span>
            <ng-content select="[slot=user-status]"></ng-content>
          </div>

          <!-- Action Buttons -->
          <ng-container *ngFor="let action of rightActions">
            <ion-button 
              [class.desktop-only]="!action.showOnMobile"
              [class.mobile-only]="!action.showOnDesktop"
              [disabled]="action.disabled"
              [color]="action.color"
              (click)="action.action()">
              <ion-icon [name]="action.icon" slot="start" *ngIf="action.label"></ion-icon>
              <ion-icon [name]="action.icon" slot="icon-only" *ngIf="!action.label"></ion-icon>
              <span *ngIf="action.label">{{ action.label }}</span>
            </ion-button>
          </ng-container>

          <!-- Status Chips -->
          <ng-container *ngFor="let action of rightActions">
            <app-version-tooltip *ngIf="action.chipContent && action.showVersionTooltip">
              <ion-chip 
                [color]="action.chipColor || 'medium'"
                [class.desktop-only]="!action.showOnMobile"
                [class.mobile-only]="!action.showOnDesktop"
                (click)="action.action()"
                class="clickable-chip">
                <ion-icon [name]="action.icon" *ngIf="action.icon"></ion-icon>
                <ion-label>{{ action.chipContent }}</ion-label>
              </ion-chip>
            </app-version-tooltip>
            
            <ion-chip 
              *ngIf="action.chipContent && !action.showVersionTooltip"
              [color]="action.chipColor || 'medium'"
              [class.desktop-only]="!action.showOnMobile"
              [class.mobile-only]="!action.showOnDesktop"
              (click)="action.action()"
              class="clickable-chip">
              <ion-icon [name]="action.icon" *ngIf="action.icon"></ion-icon>
              <ion-label>{{ action.chipContent }}</ion-label>
            </ion-chip>
          </ng-container>

          <!-- Burger Menu Button -->
          <ion-button *ngIf="showBurgerMenu" (click)="toggleBurgerMenu()">
            <ion-icon [name]="burgerMenuOpen ? 'close' : 'menu'" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Secondary Toolbar -->
      <ion-toolbar *ngIf="showSecondaryToolbar && secondaryContent">
        <ng-container *ngTemplateOutlet="secondaryContent"></ng-container>
      </ion-toolbar>
    </ion-header>

    <!-- Burger Menu -->
    <div class="burger-menu-overlay" *ngIf="burgerMenuOpen && showBurgerMenu" (click)="closeBurgerMenu()"></div>
    
    <div class="burger-menu" [class.open]="burgerMenuOpen" *ngIf="showBurgerMenu">
      <div class="burger-menu-content">
        <div class="burger-menu-header">
          <h3>{{ burgerMenuTitle || 'Navigation' }}</h3>
          <ion-button fill="clear" color="medium" (click)="toggleBurgerMenu()">
            <ion-icon name="close" slot="icon-only"></ion-icon>
          </ion-button>
        </div>
        
        <div class="burger-menu-items">
          <ion-button 
            fill="clear" 
            expand="block" 
            *ngFor="let item of burgerMenuItems"
            [color]="item.color || 'medium'"
            (click)="item.action(); closeBurgerMenu()">
            <ion-icon [name]="item.icon" slot="start"></ion-icon>
            {{ item.label }}
          </ion-button>
        </div>
        
        <!-- Burger Menu Footer Content -->
        <div class="burger-menu-footer" *ngIf="burgerMenuFooterContent">
          <ng-container *ngTemplateOutlet="burgerMenuFooterContent"></ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Base Header Styling */
    ion-header {
      backdrop-filter: blur(15px);
      background: rgba(45, 45, 45, 0.3);
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
      position: relative;
      z-index: 100;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    /* Mobile header height fix for scroll calculation */
    @media (max-width: 768px) {
      ion-header {
        height: auto;
        min-height: 56px;
      }
    }
    
    ion-toolbar {
      --background: transparent;
      --color: #f8f9fa;
      --padding-start: 16px;
      --padding-end: 16px;
    }

    /* Title Styling */
    .app-title {
      background: linear-gradient(135deg, #f8f9fa 0%, #8bb4f8 50%, #4776e6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-shadow: 0 2px 10px rgba(139, 180, 248, 0.3);
    }

    /* Button Styling */
    ion-button {
      --color: #f8f9fa;
      --background: rgba(255, 255, 255, 0.1);
      --background-hover: rgba(255, 255, 255, 0.2);
      --border-radius: 8px;
      margin: 0 4px;
      transition: all 0.2s ease;
    }
    
    ion-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    ion-icon {
      font-size: 1.2rem;
    }

    /* User Info */
    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-right: 1rem;
    }
    
    .user-greeting {
      color: #f8f9fa;
      font-size: 0.9rem;
      font-weight: 500;
    }

    /* Responsive Classes */
    .desktop-only {
      display: block;
    }
    
    .mobile-only {
      display: none;
    }

    @media (max-width: 768px) {
      .desktop-only {
        display: none;
      }
      
      .mobile-only {
        display: block;
      }
      
      .app-title {
        font-size: 1.2rem;
      }
    }

    /* Burger Menu Styles */
    .burger-menu-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      backdrop-filter: blur(2px);
    }
    
    .burger-menu {
      position: fixed;
      top: 0;
      right: -260px;
      width: 260px;
      height: 100%;
      background: 
        /* Enhanced dark overlay with gradient for depth */
        linear-gradient(135deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 20, 0.98) 50%, rgba(20, 20, 35, 0.98) 100%),
        /* Main anime image */
        url('/assets/cyberpunk-anime-girl.png'),
        /* Fallback dark background */
        #1a1a2e;
      background-size: cover, cover, auto;
      background-position: center, center, center;
      background-repeat: no-repeat, no-repeat, repeat;
      border-left: 1px solid rgba(139, 180, 248, 0.3);
      z-index: 9999;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    
    .burger-menu.open {
      right: 0;
    }
    
    .burger-menu-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 0;
      overflow: hidden;
    }
    
    .burger-menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid rgba(139, 180, 248, 0.15);
      background: linear-gradient(135deg, rgba(15, 15, 25, 0.9) 0%, rgba(10, 10, 20, 0.9) 100%);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      position: relative;
    }
    
    .burger-menu-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(139, 180, 248, 0.05) 0%, rgba(71, 118, 230, 0.05) 100%);
      z-index: -1;
    }
    
    .burger-menu-header h3 {
      margin: 0;
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    
    .burger-menu-header ion-button {
      --color: rgba(255, 255, 255, 0.7);
      --background: transparent;
      --background-hover: rgba(255, 255, 255, 0.1);
      --border-radius: 6px;
      --padding-start: 4px;
      --padding-end: 4px;
      --min-height: 28px;
      --min-width: 28px;
      transition: all 0.2s ease;
    }
    
    .burger-menu-header ion-button:hover {
      transform: scale(1.1) rotate(90deg);
      --background: rgba(255, 107, 107, 0.2);
      --color: #ff6b6b;
    }
    
    .burger-menu-items {
      flex: 1 1 auto;
      padding: 0.5rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      overflow-y: auto;
      min-height: 0;
    }
    
    .burger-menu-items ion-button {
      --color: rgba(255, 255, 255, 0.95);
      --background: rgba(255, 255, 255, 0.04);
      --background-hover: rgba(139, 180, 248, 0.15);
      --background-focused: rgba(139, 180, 248, 0.2);
      --ripple-color: rgba(139, 180, 248, 0.3);
      margin: 0 0.5rem;
      height: 32px;
      font-size: 0.8rem;
      font-weight: 500;
      justify-content: flex-start;
      text-align: left;
      border: 1px solid rgba(139, 180, 248, 0.2);
      border-radius: 6px;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      --padding-top: 0;
      --padding-bottom: 0;
      --padding-start: 0.75rem;
      --padding-end: 0.75rem;
    }
    
    .burger-menu-items ion-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(139, 180, 248, 0.1), transparent);
      transition: left 0.5s ease;
      z-index: 1;
    }
    
    .burger-menu-items ion-button:hover {
      --background: rgba(139, 180, 248, 0.15);
      border-color: rgba(139, 180, 248, 0.4);
      transform: translateX(4px) scale(1.02);
      box-shadow: 0 2px 8px rgba(139, 180, 248, 0.2);
    }
    
    .burger-menu-items ion-button:hover::before {
      left: 100%;
    }
    
    .burger-menu-items ion-button ion-icon {
      margin-right: 8px;
      font-size: 0.9rem;
      min-width: 0.9rem;
    }
    
    .burger-menu-footer {
      border-top: 1px solid rgba(139, 180, 248, 0.15);
      padding: 0.25rem 0.5rem 0.2rem 0.5rem;
      margin-top: auto;
      background: rgba(15, 15, 25, 0.95);
      position: relative;
      flex-shrink: 0;
    }
    
    .burger-menu-footer::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(139, 180, 248, 0.05) 0%, rgba(71, 118, 230, 0.05) 100%);
      z-index: -1;
    }

    /* Clickable chips */
    .clickable-chip {
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .clickable-chip:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      --background: rgba(255, 255, 255, 0.15);
    }

    /* Desktop optimizations */
    /* Kompakte Status-Chips im Footer */
    .burger-menu-footer ion-chip {
      --background: rgba(255, 255, 255, 0.08);
      height: 22px;
      font-size: 0.7rem;
      margin: 0.15rem;
      --padding-start: 6px;
      --padding-end: 6px;
    }
    
    .burger-menu-footer ion-chip ion-icon {
      font-size: 0.75rem;
      margin-right: 4px;
    }
    
    .burger-menu-footer ion-chip ion-label {
      margin: 0;
      padding: 0;
    }
    
    .burger-menu-footer ion-button {
      height: 26px;
      font-size: 0.7rem;
      margin: 0.15rem 0;
      --padding-start: 0.4rem;
      --padding-end: 0.4rem;
      border: 1px solid rgba(139, 180, 248, 0.2);
      border-radius: 6px;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    
    .burger-menu-footer ion-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(139, 180, 248, 0.1), transparent);
      transition: left 0.5s ease;
      z-index: 1;
    }
    
    .burger-menu-footer ion-button:hover {
      border-color: rgba(139, 180, 248, 0.4);
      transform: scale(1.02);
      box-shadow: 0 2px 6px rgba(139, 180, 248, 0.15);
    }
    
    .burger-menu-footer ion-button:hover::before {
      left: 100%;
    }
    
    .burger-menu-footer ion-button ion-icon {
      font-size: 0.8rem;
      margin-right: 4px;
      position: relative;
      z-index: 2;
    }
    
    .burger-menu-status {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    
    .status-detail {
      display: flex;
      gap: 0.15rem;
      flex-wrap: wrap;
    }
    
    .logout-button {
      --background: rgba(255, 107, 107, 0.15);
      --color: #ff8a8a;
      border: 1px solid rgba(255, 107, 107, 0.3) !important;
      border-radius: 6px;
    }
    
    .logout-button:hover {
      border-color: rgba(255, 107, 107, 0.5) !important;
      --background: rgba(255, 107, 107, 0.25);
      box-shadow: 0 2px 6px rgba(255, 107, 107, 0.2);
    }
    
    .logout-button::before {
      background: linear-gradient(90deg, transparent, rgba(255, 107, 107, 0.1), transparent) !important;
    }
    
    @media (min-width: 768px) {
      ion-header {
        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
      }
      
      ion-toolbar {
        --min-height: 44px;
        --padding-top: 4px;
        --padding-bottom: 4px;
      }
    }
  `]
})
export class AppHeaderComponent implements OnInit {
  @Input() title: string = '';
  @Input() titleTemplate?: TemplateRef<any>;
  @Input() showBackButton: boolean = false;
  @Input() backAction?: () => void;
  @Input() leftActions: HeaderAction[] = [];
  @Input() rightActions: HeaderAction[] = [];
  @Input() showBurgerMenu: boolean = false;
  @Input() burgerMenuTitle: string = 'Navigation';
  @Input() burgerMenuItems: BurgerMenuItem[] = [];
  @Input() burgerMenuFooterContent?: TemplateRef<any>;
  @Input() showSecondaryToolbar: boolean = false;
  @Input() secondaryContent?: TemplateRef<any>;
  @Input() showUserInfo: boolean = false;
  @Input() userGreeting: string = '';

  @Output() burgerMenuToggle = new EventEmitter<boolean>();

  burgerMenuOpen = false;

  constructor(public versionService: VersionService) {}

  ngOnInit() {
    // Version service loads automatically on initialization
  }

  handleBackAction(): void {
    if (this.backAction) {
      this.backAction();
    } else {
      // Default back navigation
      window.history.back();
    }
  }

  toggleBurgerMenu(): void {
    this.burgerMenuOpen = !this.burgerMenuOpen;
    this.burgerMenuToggle.emit(this.burgerMenuOpen);
  }

  closeBurgerMenu(): void {
    this.burgerMenuOpen = false;
    this.burgerMenuToggle.emit(false);
  }
}