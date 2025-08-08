import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BeatAIModalService {
  isVisible = false;
  content = '';
  
  private closeSubject = new Subject<void>();
  private generateSubject = new Subject<void>();
  private copySubject = new Subject<void>();
  
  close$ = this.closeSubject.asObservable();
  generate$ = this.generateSubject.asObservable();
  copy$ = this.copySubject.asObservable();
  
  show(content: string) {
    this.content = content;
    this.isVisible = true;
  }
  
  close() {
    if (this.isVisible) {
      this.isVisible = false;
      this.closeSubject.next();
    }
  }
  
  onGenerate() {
    if (this.isVisible) {
      this.isVisible = false;
      this.generateSubject.next();
    }
  }
  
  onCopy() {
    this.copySubject.next();
  }
}