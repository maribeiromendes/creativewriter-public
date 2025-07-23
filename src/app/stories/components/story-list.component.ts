import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { 
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip, IonIcon, IonButton, 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, download, settings, analytics, trash, create, image, menu, close } from 'ionicons/icons';
import { StoryService } from '../services/story.service';
import { Story } from '../models/story.interface';
import { SyncStatusComponent } from '../../shared/components/sync-status.component';
import { LoginComponent } from '../../shared/components/login.component';
import { AuthService, User } from '../../core/services/auth.service';

@Component({
  selector: 'app-story-list',
  standalone: true,
  imports: [
    CommonModule, 
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonChip, IonIcon, IonButton, 
    IonHeader, IonToolbar, IonTitle, IonButtons, IonContent,
    SyncStatusComponent, LoginComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <span class="title-gradient">Meine Geschichten</span>
        </ion-title>
        <ion-buttons slot="end">
          <div class="header-info" *ngIf="currentUser">
            <span class="user-greeting">👋 {{ currentUser.displayName || currentUser.username }}</span>
            <app-sync-status [showActions]="false" class="compact-sync-status"></app-sync-status>
          </div>
          <ion-button fill="clear" color="medium" (click)="toggleBurgerMenu()">
            <ion-icon [name]="burgerMenuOpen ? 'close' : 'menu'" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <!-- Burger Menu Overlay -->
    <div class="burger-menu-overlay" *ngIf="burgerMenuOpen" (click)="closeBurgerMenu()"></div>
    
    <!-- Burger Menu -->
    <div class="burger-menu" [class.open]="burgerMenuOpen">
      <div class="burger-menu-content">
        <div class="burger-menu-header">
          <h3>Navigation</h3>
          <ion-button fill="clear" color="medium" (click)="toggleBurgerMenu()">
            <ion-icon name="close" slot="icon-only"></ion-icon>
          </ion-button>
        </div>
        
        <div class="burger-menu-items">
          <ion-button fill="clear" expand="block" (click)="goToAILogger(); closeBurgerMenu()">
            <ion-icon name="analytics" slot="start"></ion-icon>
            AI Logs
          </ion-button>
          <ion-button fill="clear" expand="block" (click)="goToSettings(); closeBurgerMenu()">
            <ion-icon name="settings" slot="start"></ion-icon>
            Einstellungen
          </ion-button>
          <ion-button fill="clear" expand="block" (click)="goToImageGeneration(); closeBurgerMenu()">
            <ion-icon name="image" slot="start"></ion-icon>
            Bildgenerierung
          </ion-button>
          <ion-button fill="clear" expand="block" (click)="importNovelCrafter(); closeBurgerMenu()">
            <ion-icon name="download" slot="start"></ion-icon>
            NovelCrafter Import
          </ion-button>
        </div>
        
        <div class="burger-menu-footer" *ngIf="currentUser">
          <app-sync-status [showActions]="true" class="full-sync-status"></app-sync-status>
          <ion-button fill="clear" color="danger" (click)="logout(); closeBurgerMenu()">
            Abmelden
          </ion-button>
        </div>
      </div>
    </div>

    <ion-content>
      <div class="story-list-container">
      
      <!-- App Branding Header -->
      <div class="app-branding">
        <h1 class="app-title">
          <span class="app-name">Creative Writer</span>
          <span class="app-tagline">Deine Geschichten, deine Welt</span>
        </h1>
        <div class="brand-decoration"></div>
      </div>
      
      <div class="action-buttons">
        <ion-button expand="block" size="large" color="primary" (click)="createNewStory()">
          <ion-icon name="add" slot="start"></ion-icon>
          Neue Geschichte schreiben
        </ion-button>
        <ion-button expand="block" size="large" fill="outline" color="medium" (click)="importNovelCrafter()">
          <ion-icon name="download" slot="start"></ion-icon>
          NovelCrafter Import
        </ion-button>
        <ion-button expand="block" size="large" fill="outline" color="secondary" (click)="goToImageGeneration()">
          <ion-icon name="image" slot="start"></ion-icon>
          Bildgenerierung
        </ion-button>
      </div>
      
      <div class="stories-grid" *ngIf="stories.length > 0; else noStories">
        <ion-card class="story-card" *ngFor="let story of stories" (click)="openStory(story.id)" button>
          <ion-card-header>
            <div class="card-header-content">
              <ion-card-title>{{ story.title || 'Unbenannte Geschichte' }}</ion-card-title>
              <ion-button fill="clear" size="small" color="danger" (click)="deleteStory($event, story.id)">
                <ion-icon name="trash" slot="icon-only"></ion-icon>
              </ion-button>
            </div>
          </ion-card-header>
          <ion-card-content>
            <p class="story-preview">{{ getStoryPreview(story) }}</p>
            <div class="story-chips">
              <ion-chip color="medium">
                <span>{{ getWordCount(story) }} Wörter</span>
              </ion-chip>
              <ion-chip color="medium">
                <span>{{ story.updatedAt | date:'short' }}</span>
              </ion-chip>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
      
      <ng-template #noStories>
        <div class="no-stories">
          <p>Noch keine Geschichten vorhanden.</p>
          <p>Beginne mit dem Schreiben deiner ersten Geschichte!</p>
        </div>
      </ng-template>
      
      <!-- Login Modal -->
      <app-login></app-login>
      
      <!-- Mobile FAB Button -->
      <div class="mobile-fab-container">
        <button class="mobile-fab-button" (click)="toggleFabMenu()">
          <ion-icon name="add"></ion-icon>
        </button>
        <div class="mobile-fab-menu" *ngIf="fabMenuOpen">
          <button class="mobile-fab-option" (click)="createNewStory()">
            <ion-icon name="create"></ion-icon>
            <span>Neue Geschichte</span>
          </button>
          <button class="mobile-fab-option" (click)="importNovelCrafter()">
            <ion-icon name="download"></ion-icon>
            <span>Import</span>
          </button>
          <button class="mobile-fab-option" (click)="goToImageGeneration()">
            <ion-icon name="image"></ion-icon>
            <span>Bilder</span>
          </button>
        </div>
      </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      min-height: 100vh;
    }
    
    /* Clean overlay - no disturbing effects */
    :host::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: transparent;
      pointer-events: none;
      z-index: 1;
    }
    
    /* Clean after element */
    :host::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;  
      bottom: 0;
      background: transparent;
      pointer-events: none;
      z-index: 0;
    }
    
    @keyframes cyberpunkFloat {
      0%, 100% {
        transform: translateY(0px) translateX(0px);
        opacity: 0.9;
      }
      25% {
        transform: translateY(-2px) translateX(1px);
        opacity: 1;
      }
      50% {
        transform: translateY(-1px) translateX(-1px);
        opacity: 0.8;
      }
      75% {
        transform: translateY(1px) translateX(2px);
        opacity: 1;
      }
    }
    
    @keyframes subtleMovement {
      0%, 100% {
        transform: translateX(0) translateY(0);
      }
      25% {
        transform: translateX(-2px) translateY(-1px);
      }
      50% {
        transform: translateX(1px) translateY(-2px);
      }
      75% {
        transform: translateX(-1px) translateY(1px);
      }
    }
    
    /* Cyberpunk city atmosphere overlay */
    :host::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image:
        /* Neon city buildings */
        linear-gradient(0deg, transparent 70%, rgba(0, 255, 255, 0.05) 75%, transparent 85%),
        linear-gradient(0deg, transparent 65%, rgba(255, 0, 128, 0.04) 70%, transparent 80%),
        linear-gradient(0deg, transparent 60%, rgba(0, 255, 128, 0.03) 65%, transparent 75%),
        
        /* Window lights pattern */
        repeating-linear-gradient(
          45deg,
          transparent,
          transparent 15px,
          rgba(0, 255, 255, 0.02) 16px,
          rgba(0, 255, 255, 0.02) 17px
        ),
        
        /* Holographic interface elements */
        radial-gradient(ellipse 200px 100px at 90% 20%, rgba(255, 0, 128, 0.08) 0%, transparent 40%),
        radial-gradient(ellipse 150px 80px at 10% 80%, rgba(0, 255, 128, 0.06) 0%, transparent 35%),
        
        /* Ambient cyberpunk lighting */
        radial-gradient(ellipse 800px 400px at 50% 0%, rgba(0, 255, 255, 0.03) 0%, transparent 70%),
        radial-gradient(ellipse 600px 300px at 50% 100%, rgba(255, 0, 128, 0.04) 0%, transparent 60%);
        
      pointer-events: none;
      z-index: 0;
      opacity: 0.7;
      animation: cyberpunkShimmer 10s ease-in-out infinite;
    }
    
    @keyframes cyberpunkShimmer {
      0%, 100% {
        opacity: 0.7;
        filter: hue-rotate(0deg);
      }
      33% {
        opacity: 0.8;
        filter: hue-rotate(5deg);
      }
      66% {
        opacity: 0.6;
        filter: hue-rotate(-5deg);
      }
    }
    
    @keyframes fadeInOut {
      0%, 100% {
        opacity: 0.7;
      }
      50% {
        opacity: 0.4;
      }
    }
    
    ion-content {
      --background: transparent !important;
      background: transparent !important;
    }
    
    /* Make sure ion-content doesn't override our background */
    ion-content::part(background) {
      background: transparent !important;
    }
    
    /* Simple background with anime image */
    :host {
      background: 
        /* Dark overlay for text readability */
        linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)),
        /* Main anime image */
        url('/assets/cyberpunk-anime-girl.png'),
        /* Fallback dark background */
        #1a1a1a;
      
      background-size: cover, cover, auto;
      background-position: center, center, center;
      background-repeat: no-repeat, no-repeat, repeat;
      background-attachment: fixed, fixed, scroll;
    }
    
    .story-list-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background-color: transparent;
      position: relative;
      z-index: 1;
      animation: fadeInUp 0.6s ease-out;
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .title-gradient {
      background: linear-gradient(135deg, #f8f9fa 0%, #8bb4f8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    
    ion-header {
      backdrop-filter: blur(15px);
      background: rgba(45, 45, 45, 0.85);
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
      position: relative;
      z-index: 100;
    }
    
    ion-toolbar {
      --background: transparent;
      --color: #f8f9fa;
    }
    
    /* App Branding Styles */
    .app-branding {
      text-align: center;
      margin: 2rem 0 4rem 0;
      position: relative;
      animation: fadeInDown 0.8s ease-out;
    }
    
    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .app-title {
      margin: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    
    .app-name {
      font-size: 3.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #4776E6 0%, #8E54E9 50%, #FF6B6B 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -2px;
      line-height: 1;
      text-shadow: 0 4px 20px rgba(71, 118, 230, 0.3);
      position: relative;
      animation: glow 3s ease-in-out infinite alternate;
    }
    
    @keyframes glow {
      from {
        filter: brightness(1) drop-shadow(0 0 5px rgba(71, 118, 230, 0.3));
      }
      to {
        filter: brightness(1.1) drop-shadow(0 0 20px rgba(71, 118, 230, 0.5));
      }
    }
    
    .app-tagline {
      font-size: 1.1rem;
      font-weight: 300;
      color: #adb5bd;
      font-style: italic;
      letter-spacing: 1px;
      opacity: 0.8;
      text-transform: lowercase;
    }
    
    .brand-decoration {
      width: 120px;
      height: 4px;
      background: linear-gradient(90deg, transparent 0%, #4776E6 20%, #8E54E9 50%, #FF6B6B 80%, transparent 100%);
      margin: 1.5rem auto 0;
      border-radius: 2px;
      animation: shimmer 2s ease-in-out infinite;
    }
    
    @keyframes shimmer {
      0%, 100% {
        opacity: 0.5;
        transform: scaleX(1);
      }
      50% {
        opacity: 1;
        transform: scaleX(1.1);
      }
    }
    
    /* Responsive App Branding */
    @media (max-width: 768px) {
      .app-branding {
        margin: 1.5rem 0 3rem 0;
      }
      
      .app-name {
        font-size: 2.5rem;
        letter-spacing: -1px;
      }
      
      .app-tagline {
        font-size: 1rem;
      }
      
      .brand-decoration {
        width: 80px;
        height: 3px;
      }
    }
    
    @media (max-width: 480px) {
      .app-branding {
        margin: 1rem 0 2rem 0;
      }
      
      .app-name {
        font-size: 2rem;
        letter-spacing: -0.5px;
      }
      
      .app-tagline {
        font-size: 0.9rem;
      }
      
      .brand-decoration {
        width: 60px;
        height: 2px;
      }
    }
    
    
    /* Desktop optimizations for compact header */
    @media (min-width: 768px) {
      ion-header {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      ion-toolbar {
        --min-height: 44px;
        --padding-top: 4px;
        --padding-bottom: 4px;
      }
      
    }
    
    /* Header Info Styles */
    .header-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-right: 0.5rem;
    }
    
    .user-greeting {
      color: #f8f9fa;
      font-size: 0.8rem;
      font-weight: 500;
      white-space: nowrap;
    }
    
    .compact-sync-status {
      opacity: 0.8;
    }
    
    @media (max-width: 767px) {
      .header-info {
        display: none;
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
      right: -300px;
      width: 300px;
      height: 100%;
      background: #2d2d2d;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 9999;
      transition: right 0.3s ease-in-out;
      box-shadow: -4px 0 8px rgba(0, 0, 0, 0.3);
    }
    
    .burger-menu.open {
      right: 0;
    }
    
    .burger-menu-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 0;
    }
    
    .burger-menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: #343434;
    }
    
    .burger-menu-header h3 {
      margin: 0;
      color: #f8f9fa;
      font-size: 1.2rem;
      font-weight: 600;
    }
    
    .burger-menu-items {
      flex: 1;
      padding: 1rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .burger-menu-items ion-button {
      --color: #f8f9fa;
      --background: transparent;
      --background-hover: rgba(255, 255, 255, 0.1);
      --background-focused: rgba(255, 255, 255, 0.1);
      --ripple-color: rgba(255, 255, 255, 0.2);
      margin: 0 1rem;
      height: 48px;
      font-size: 1rem;
      justify-content: flex-start;
      text-align: left;
    }
    
    .burger-menu-items ion-button:hover {
      --background: rgba(255, 255, 255, 0.1);
    }
    
    .burger-menu-items ion-button ion-icon {
      margin-right: 12px;
      font-size: 1.2rem;
    }
    
    .burger-menu-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 1rem;
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .burger-menu-footer ion-button {
      --color: #ff6b6b;
      --background: transparent;
      --background-hover: rgba(255, 107, 107, 0.1);
      --background-focused: rgba(255, 107, 107, 0.1);
      --ripple-color: rgba(255, 107, 107, 0.2);
      height: 40px;
      font-size: 0.9rem;
    }
    
    .full-sync-status {
      align-self: stretch;
    }
    
    
    
    .action-buttons {
      display: flex;
      gap: 1rem;
      margin: 0 auto 3rem;
      max-width: 600px;
      flex-wrap: wrap;
    }
    
    .action-buttons ion-button {
      flex: 1;
      min-width: 200px;
      --background: linear-gradient(135deg, #4776E6 0%, #8E54E9 100%);
      --background-hover: linear-gradient(135deg, #5886F6 0%, #9E64F9 100%);
      --border-radius: 16px;
      --box-shadow: 0 6px 20px rgba(71, 118, 230, 0.3);
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-weight: 600;
      text-transform: none;
      letter-spacing: 0.5px;
      position: relative;
      overflow: hidden;
      --padding-start: 24px;
      --padding-end: 24px;
      height: 52px;
    }
    
    .action-buttons ion-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s ease;
    }
    
    .action-buttons ion-button:hover {
      transform: translateY(-3px) scale(1.02);
      --box-shadow: 0 10px 30px rgba(71, 118, 230, 0.4);
    }
    
    .action-buttons ion-button:hover::before {
      left: 100%;
    }
    
    .action-buttons ion-button[fill="outline"] {
      --background: transparent;
      --border-color: rgba(71, 118, 230, 0.6);
      --color: #8bb4f8;
      border: 2px solid rgba(71, 118, 230, 0.6);
      --box-shadow: 0 4px 15px rgba(71, 118, 230, 0.2);
    }
    
    .action-buttons ion-button[fill="outline"]:hover {
      --background: rgba(71, 118, 230, 0.1);
      --border-color: rgba(71, 118, 230, 0.8);
      --color: #a8c5f9;
      --box-shadow: 0 8px 25px rgba(71, 118, 230, 0.3);
    }
    
    /* Custom Mobile FAB */
    .mobile-fab-container {
      display: none;
    }
    
    @media (max-width: 767px) {
      .mobile-fab-container {
        display: block;
        position: fixed;
        bottom: 100px;
        right: 20px;
        z-index: 9999;
      }
    }
    
    .mobile-fab-button {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: #3880ff;
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    
    .mobile-fab-button:active {
      transform: scale(0.95);
    }
    
    .mobile-fab-menu {
      position: absolute;
      bottom: 70px;
      right: 0;
      background: var(--ion-color-dark);
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    }
    
    .mobile-fab-option {
      display: flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      color: white;
      border: none;
      padding: 12px 16px;
      width: 100%;
      text-align: left;
      cursor: pointer;
      border-radius: 4px;
    }
    
    .mobile-fab-option:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .mobile-fab-option ion-icon {
      font-size: 20px;
    }
    
    
    /* Hide action buttons on mobile, show FAB */
    @media (max-width: 767px) {
      .story-list-container {
        padding-bottom: 8rem;
      }
      
      .action-buttons {
        display: none;
      }
      
      
    }
    
    @media (max-width: 480px) {
      .story-list-container {
        padding: 1rem 0.5rem 10rem;
      }
      
      
      .stories-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
        padding: 0;
      }
    }
    
    .stories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
      padding: 0 8px;
    }
    
    .story-card {
      margin: 0;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      background: linear-gradient(135deg, rgba(42, 42, 42, 0.9) 0%, rgba(31, 31, 31, 0.9) 100%);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      position: relative;
      backdrop-filter: blur(10px);
      animation: fadeInScale 0.5s ease-out backwards;
    }
    
    .story-card:hover {
      transform: translateY(-8px) scale(1.03);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      border-color: rgba(71, 118, 230, 0.4);
      background: linear-gradient(135deg, rgba(42, 42, 42, 1) 0%, rgba(31, 31, 31, 1) 100%);
    }
    
    .story-card:nth-child(1) { animation-delay: 0.1s; }
    .story-card:nth-child(2) { animation-delay: 0.2s; }
    .story-card:nth-child(3) { animation-delay: 0.3s; }
    .story-card:nth-child(4) { animation-delay: 0.4s; }
    .story-card:nth-child(5) { animation-delay: 0.5s; }
    .story-card:nth-child(6) { animation-delay: 0.6s; }
    
    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.8) translateY(20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    .story-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #4776E6 0%, #8E54E9 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .story-card:hover::before {
      opacity: 1;
    }
    
    .card-header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
    }
    
    .card-header-content ion-card-title {
      flex: 1;
      margin-right: 8px;
      font-size: 1.3rem;
      font-weight: 700;
      color: #f8f9fa;
      line-height: 1.3;
      transition: all 0.3s ease;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .story-card:hover .card-header-content ion-card-title {
      background: linear-gradient(135deg, #8bb4f8 0%, #a8c5f9 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .story-preview {
      color: #adb5bd;
      line-height: 1.6;
      margin: 0 0 20px 0;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      font-size: 0.95rem;
      opacity: 0.9;
      transition: all 0.3s ease;
    }
    
    .story-card:hover .story-preview {
      opacity: 1;
      color: #ced4da;
      transform: translateY(-2px);
    }
    
    .story-chips {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .story-chips ion-chip {
      font-size: 0.75rem;
      --background: rgba(71, 118, 230, 0.15);
      --color: #8bb4f8;
      border: 1px solid rgba(71, 118, 230, 0.3);
      transition: all 0.3s ease;
      height: 28px;
      padding: 0 14px;
      border-radius: 14px;
      font-weight: 500;
    }
    
    .story-chips ion-chip:hover {
      --background: rgba(71, 118, 230, 0.25);
      border-color: rgba(71, 118, 230, 0.5);
      transform: scale(1.05);
      --color: #a8c5f9;
    }
    
    ion-card {
      --background: transparent;
      --color: #f8f9fa;
      box-shadow: none;
      cursor: pointer;
      margin: 0;
    }
    
    ion-card-header {
      --background: transparent;
      padding: 24px 24px 16px 24px;
      position: relative;
    }
    
    ion-card-content {
      padding: 0 24px 24px 24px;
    }
    
    .no-stories {
      text-align: center;
      padding: 4rem 2rem;
      color: #adb5bd;
      animation: fadeIn 0.6s ease-out;
      background: linear-gradient(135deg, rgba(42, 42, 42, 0.3) 0%, rgba(31, 31, 31, 0.3) 100%);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      margin: 2rem 0;
    }
    
    .no-stories p {
      margin-bottom: 2rem;
      font-size: 1.2rem;
      line-height: 1.6;
      opacity: 0.8;
    }
    
    .no-stories ion-button {
      --background: linear-gradient(135deg, #4776E6 0%, #8E54E9 100%);
      --background-hover: linear-gradient(135deg, #5886F6 0%, #9E64F9 100%);
      --border-radius: 16px;
      --box-shadow: 0 6px 20px rgba(71, 118, 230, 0.3);
      transition: all 0.3s ease;
      font-weight: 600;
      text-transform: none;
      letter-spacing: 0.5px;
      padding: 0 2rem;
      height: 48px;
    }
    
    .no-stories ion-button:hover {
      transform: translateY(-2px);
      --box-shadow: 0 8px 25px rgba(71, 118, 230, 0.4);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class StoryListComponent implements OnInit {
  stories: Story[] = [];
  currentUser: User | null = null;
  fabMenuOpen = false;
  burgerMenuOpen = false;

  constructor(
    private storyService: StoryService,
    private router: Router,
    private authService: AuthService
  ) {
    // Register Ionic icons
    addIcons({ add, download, settings, analytics, trash, create, image, menu, close });
  }

  ngOnInit(): void {
    this.loadStories();
    
    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      // Reload stories when user changes (different database)
      this.loadStories();
    });
  }

  logout(): void {
    if (confirm('Möchten Sie sich wirklich abmelden? Lokale Änderungen bleiben erhalten.')) {
      this.authService.logout();
    }
  }

  async loadStories(): Promise<void> {
    this.stories = await this.storyService.getAllStories();
  }

  toggleFabMenu(): void {
    this.fabMenuOpen = !this.fabMenuOpen;
  }

  toggleBurgerMenu(): void {
    this.burgerMenuOpen = !this.burgerMenuOpen;
  }

  closeBurgerMenu(): void {
    this.burgerMenuOpen = false;
  }

  async createNewStory(): Promise<void> {
    this.fabMenuOpen = false;
    const newStory = await this.storyService.createStory();
    this.router.navigate(['/stories/editor', newStory.id]);
  }

  openStory(storyId: string): void {
    this.router.navigate(['/stories/editor', storyId]);
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  goToAILogger(): void {
    this.router.navigate(['/logs']);
  }

  importNovelCrafter(): void {
    this.fabMenuOpen = false;
    this.router.navigate(['/stories/import/novelcrafter']);
  }

  goToImageGeneration(): void {
    this.fabMenuOpen = false;
    this.router.navigate(['/stories/image-generation']);
  }

  async deleteStory(event: Event, storyId: string): Promise<void> {
    event.stopPropagation();
    if (confirm('Möchten Sie diese Geschichte wirklich löschen?')) {
      await this.storyService.deleteStory(storyId);
      await this.loadStories();
    }
  }

  getStoryPreview(story: Story): string {
    // For legacy stories with content
    if (story.content) {
      return story.content.length > 150 ? story.content.substring(0, 150) + '...' : story.content;
    }
    
    // For new chapter/scene structure
    if (story.chapters && story.chapters.length > 0 && story.chapters[0].scenes && story.chapters[0].scenes.length > 0) {
      const firstScene = story.chapters[0].scenes[0];
      const content = firstScene.content || '';
      return content.length > 150 ? content.substring(0, 150) + '...' : content;
    }
    
    return 'Noch kein Inhalt...';
  }

  getWordCount(story: Story): number {
    // For legacy stories with content
    if (story.content) {
      return story.content.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
    
    // For new chapter/scene structure - count all scenes
    let totalWords = 0;
    if (story.chapters) {
      story.chapters.forEach(chapter => {
        if (chapter.scenes) {
          chapter.scenes.forEach(scene => {
            const content = scene.content || '';
            totalWords += content.trim().split(/\s+/).filter(word => word.length > 0).length;
          });
        }
      });
    }
    
    return totalWords;
  }
}