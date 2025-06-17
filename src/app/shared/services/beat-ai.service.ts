import { Injectable } from '@angular/core';
import { Observable, Subject, delay, map, scan, timer } from 'rxjs';
import { BeatAI, BeatAIGenerationEvent, BeatAIPromptEvent } from '../../stories/models/beat-ai.interface';

@Injectable({
  providedIn: 'root'
})
export class BeatAIService {
  private generationSubject = new Subject<BeatAIGenerationEvent>();
  public generation$ = this.generationSubject.asObservable();

  generateBeatContent(prompt: string, beatId: string): Observable<string> {
    // Simulate AI content generation and return only the final result
    const sampleContent = this.generateSampleContent(prompt);
    
    // Emit generation start
    this.generationSubject.next({
      beatId,
      chunk: '',
      isComplete: false
    });
    
    // Simulate generation delay and return final content
    return timer(2000).pipe(
      map(() => {
        // Emit generation complete
        this.generationSubject.next({
          beatId,
          chunk: sampleContent,
          isComplete: true
        });
        
        return sampleContent;
      })
    );
  }

  private generateSampleContent(prompt: string): string {
    // This would be replaced with actual AI API call
    const templates = [
      `Der Protagonist ${this.getRandomName()} betritt den Raum und bemerkt sofort die angespannte Atmosphäre. Die Luft scheint zu knistern vor unausgesprochenen Worten und unterdrückten Emotionen.`,
      
      `Mit einem tiefen Atemzug sammelt ${this.getRandomName()} Mut und tritt vor. Was als einfache Begegnung begann, entwickelt sich schnell zu einem Wendepunkt, der alles verändern wird.`,
      
      `Die Stille wird durchbrochen, als ${this.getRandomName()} endlich die Worte ausspricht, die schon so lange auf der Zunge lagen. Ein Moment der Wahrheit, der keine Rückkehr zulässt.`,
      
      `Plötzlich wird ${this.getRandomName()} klar, dass nichts mehr so sein wird wie zuvor. Die Realität bricht über sie herein wie eine kalte Welle, die alles mit sich reißt.`,
      
      `In diesem entscheidenden Augenblick muss ${this.getRandomName()} eine Wahl treffen. Links oder rechts, vorwärts oder zurück - jede Entscheidung wird Konsequenzen haben.`
    ];
    
    // Simple keyword matching for more relevant content
    const keywords = prompt.toLowerCase();
    if (keywords.includes('konfrontation') || keywords.includes('streit')) {
      return `Der Konflikt eskaliert, als ${this.getRandomName()} nicht länger schweigen kann. Die aufgestauten Emotionen brechen sich Bahn und verwandeln das Gespräch in eine hitzige Auseinandersetzung, bei der keine Seite bereit ist nachzugeben.`;
    } else if (keywords.includes('entdeckung') || keywords.includes('geheimnis')) {
      return `${this.getRandomName()} stößt auf etwas Unerwartetes. Was zunächst wie ein belangloser Fund aussieht, entpuppt sich als Schlüssel zu einem gut gehüteten Geheimnis, das alles in Frage stellt.`;
    } else if (keywords.includes('flucht') || keywords.includes('entkommen')) {
      return `Die Zeit drängt. ${this.getRandomName()} muss schnell handeln, denn die Gelegenheit zur Flucht wird nicht lange bestehen. Jeder Herzschlag zählt, jeder Schritt könnte der letzte sein.`;
    }
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private getRandomName(): string {
    const names = ['Sarah', 'Michael', 'Lisa', 'David', 'Anna', 'Thomas', 'Julia', 'Martin', 'Sophie', 'Alex'];
    return names[Math.floor(Math.random() * names.length)];
  }

  private splitIntoChunks(text: string): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      if (i === 0) {
        chunks.push(words[i]);
      } else {
        chunks.push(' ' + words[i]);
      }
    }
    
    return chunks;
  }

  createNewBeat(): BeatAI {
    return {
      id: this.generateId(),
      prompt: '',
      generatedContent: '',
      isGenerating: false,
      isEditing: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private generateId(): string {
    return 'beat-' + Math.random().toString(36).substr(2, 9);
  }
}