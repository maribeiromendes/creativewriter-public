import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of, forkJoin } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { 
  OpenRouterModelsResponse, 
  ReplicateModelsResponse, 
  ModelOption,
  OpenRouterModel,
  ReplicateModel 
} from '../models/model.interface';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class ModelService {
  private readonly OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
  private readonly REPLICATE_API_URL = 'https://api.replicate.com/v1';
  private readonly USD_TO_EUR_RATE = 0.92; // Approximate rate, you might want to fetch this dynamically

  private openRouterModelsSubject = new BehaviorSubject<ModelOption[]>([]);
  private replicateModelsSubject = new BehaviorSubject<ModelOption[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public openRouterModels$ = this.openRouterModelsSubject.asObservable();
  public replicateModels$ = this.replicateModelsSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private settingsService: SettingsService
  ) {}

  loadOpenRouterModels(): Observable<ModelOption[]> {
    const settings = this.settingsService.getSettings();
    
    if (!settings.openRouter.enabled || !settings.openRouter.apiKey) {
      return of([]);
    }

    this.loadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${settings.openRouter.apiKey}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<OpenRouterModelsResponse>(`${this.OPENROUTER_API_URL}/models`, { headers })
      .pipe(
        map(response => this.transformOpenRouterModels(response.data)),
        tap(models => {
          this.openRouterModelsSubject.next(models);
          this.loadingSubject.next(false);
        }),
        catchError(error => {
          console.error('Failed to load OpenRouter models:', error);
          this.loadingSubject.next(false);
          return of([]);
        })
      );
  }

  loadReplicateModels(): Observable<ModelOption[]> {
    const settings = this.settingsService.getSettings();
    
    if (!settings.replicate.enabled || !settings.replicate.apiKey) {
      return of([]);
    }

    this.loadingSubject.next(true);

    const headers = new HttpHeaders({
      'Authorization': `Token ${settings.replicate.apiKey}`,
      'Content-Type': 'application/json'
    });

    // Load popular language models from Replicate
    // We'll focus on text generation models
    return this.http.get<ReplicateModelsResponse>(`${this.REPLICATE_API_URL}/models?cursor=&search=llama`, { headers })
      .pipe(
        map(response => this.transformReplicateModels(response.results)),
        tap(models => {
          this.replicateModelsSubject.next(models);
          this.loadingSubject.next(false);
        }),
        catchError(error => {
          console.error('Failed to load Replicate models:', error);
          this.loadingSubject.next(false);
          return of([]);
        })
      );
  }

  loadAllModels(): Observable<{ openRouter: ModelOption[], replicate: ModelOption[] }> {
    return forkJoin({
      openRouter: this.loadOpenRouterModels(),
      replicate: this.loadReplicateModels()
    });
  }

  private transformOpenRouterModels(models: OpenRouterModel[]): ModelOption[] {
    console.log('Total OpenRouter models received:', models.length);
    
    // No filtering - show ALL models, let user search/filter in UI
    return models
      .map(model => {
        const promptCostUsd = parseFloat(model.pricing.prompt || '0');
        const completionCostUsd = parseFloat(model.pricing.completion || '0');
        
        return {
          id: model.id,
          label: model.name,
          description: model.description,
          costInputEur: promptCostUsd > 0 ? this.formatCostInEur(promptCostUsd * 1000000) : 'N/A', // Per 1M tokens
          costOutputEur: completionCostUsd > 0 ? this.formatCostInEur(completionCostUsd * 1000000) : 'N/A', // Per 1M tokens
          contextLength: model.context_length || 0,
          provider: 'openrouter' as const
        };
      })
      .sort((a, b) => {
        // Sort by popularity/brand first, then alphabetically
        const getPopularityScore = (label: string) => {
          const lowerLabel = label.toLowerCase();
          if (lowerLabel.includes('claude')) return 1;
          if (lowerLabel.includes('gpt-4')) return 2;
          if (lowerLabel.includes('gpt-3.5')) return 3;
          if (lowerLabel.includes('gemini')) return 4;
          if (lowerLabel.includes('llama')) return 5;
          return 10;
        };
        
        const scoreA = getPopularityScore(a.label);
        const scoreB = getPopularityScore(b.label);
        
        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }
        
        return a.label.localeCompare(b.label);
      });
  }

  private transformReplicateModels(models: ReplicateModel[]): ModelOption[] {
    // No filtering - show ALL public models, let user search/filter in UI
    return models
      .filter(model => model.visibility === 'public') // Only exclude private models
      .map(model => {
        // Replicate doesn't provide detailed pricing info via API
        // We'll show estimated costs based on typical Replicate pricing
        const estimatedCost = this.estimateReplicateCost(model.name);
        
        return {
          id: `${model.owner}/${model.name}`,
          label: `${model.owner}/${model.name}`,
          description: model.description,
          costInputEur: this.formatCostInEur(estimatedCost),
          costOutputEur: this.formatCostInEur(estimatedCost),
          contextLength: this.estimateContextLength(model.name),
          provider: 'replicate' as const
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  private formatCostInEur(costUsdPer1M: number): string {
    const costEurPer1M = costUsdPer1M * this.USD_TO_EUR_RATE;
    if (costEurPer1M < 0.01) {
      return '< 0.01 €';
    }
    return `${costEurPer1M.toFixed(2)} €`;
  }

  private estimateReplicateCost(modelName: string): number {
    // Rough estimates based on model size and typical Replicate pricing
    const lowerName = modelName.toLowerCase();
    
    if (lowerName.includes('70b') || lowerName.includes('65b')) {
      return 50; // ~50 USD per 1M tokens for large models
    } else if (lowerName.includes('13b') || lowerName.includes('7b')) {
      return 20; // ~20 USD per 1M tokens for medium models
    } else if (lowerName.includes('3b') || lowerName.includes('1b')) {
      return 5; // ~5 USD per 1M tokens for small models
    }
    
    return 25; // Default estimate
  }

  private estimateContextLength(modelName: string): number {
    const lowerName = modelName.toLowerCase();
    
    if (lowerName.includes('32k')) return 32000;
    if (lowerName.includes('16k')) return 16000;
    if (lowerName.includes('8k')) return 8000;
    if (lowerName.includes('4k')) return 4000;
    
    // Default context lengths based on model families
    if (lowerName.includes('llama-2')) return 4000;
    if (lowerName.includes('llama-3')) return 8000;
    if (lowerName.includes('mistral')) return 8000;
    if (lowerName.includes('code')) return 16000;
    
    return 4000; // Default
  }

  getCurrentOpenRouterModels(): ModelOption[] {
    return this.openRouterModelsSubject.value;
  }

  getCurrentReplicateModels(): ModelOption[] {
    return this.replicateModelsSubject.value;
  }
}