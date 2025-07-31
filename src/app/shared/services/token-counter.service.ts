import { Injectable } from '@angular/core';

export interface TokenCountResult {
  tokens: number;
  model: string;
  method: 'exact' | 'estimation';
}

export type SupportedModel = 
  | 'claude-3.5-sonnet'
  | 'claude-3.7-sonnet'
  | 'gemini-1.5-pro'
  | 'gemini-2.5-pro'
  | 'grok-3'
  | 'custom';

@Injectable({
  providedIn: 'root'
})
export class TokenCounterService {
  
  private readonly CHARS_PER_TOKEN_ESTIMATES: Record<SupportedModel, number> = {
    'claude-3.5-sonnet': 3.5,
    'claude-3.7-sonnet': 3.5,
    'gemini-1.5-pro': 4.0,
    'gemini-2.5-pro': 4.0,
    'grok-3': 3.8,
    'custom': 4.0
  };

  countTokens(prompt: string, model: SupportedModel = 'claude-3.7-sonnet'): TokenCountResult {
    const cleanedPrompt = this.preprocessText(prompt);
    
    // For now, we use character-based estimation
    // In a real implementation, you would integrate with actual tokenizer APIs
    const tokens = this.estimateTokens(cleanedPrompt, model);
    
    return {
      tokens,
      model,
      method: 'estimation'
    };
  }

  private preprocessText(text: string): string {
    // Remove excessive whitespace while preserving structure
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, '    ')
      .trim();
  }

  private estimateTokens(text: string, model: SupportedModel): number {
    const charsPerToken = this.CHARS_PER_TOKEN_ESTIMATES[model];
    const baseTokens = Math.ceil(text.length / charsPerToken);
    
    // Add special token considerations
    const specialTokensCount = this.countSpecialTokens(text);
    
    return baseTokens + specialTokensCount;
  }

  private countSpecialTokens(text: string): number {
    let count = 0;
    
    // Count newlines (often tokenized separately)
    count += (text.match(/\n/g) || []).length;
    
    // Count punctuation clusters
    count += (text.match(/[.!?]{2,}/g) || []).length;
    
    // Count code blocks (triple backticks)
    count += (text.match(/```/g) || []).length * 2;
    
    // Count special characters that often create separate tokens
    count += (text.match(/[<>{}[\]()]/g) || []).length * 0.5;
    
    return Math.ceil(count);
  }

  // Advanced estimation with word-based approach
  estimateTokensAdvanced(prompt: string, model: SupportedModel = 'claude-3.7-sonnet'): TokenCountResult {
    const words = prompt.split(/\s+/).filter(word => word.length > 0);
    const avgTokensPerWord = model.startsWith('claude') ? 1.3 : model.startsWith('gemini') ? 1.2 : 1.4;
    
    const wordBasedTokens = Math.ceil(words.length * avgTokensPerWord);
    const charBasedTokens = this.estimateTokens(prompt, model);
    
    // Use weighted average of both methods
    const tokens = Math.ceil((wordBasedTokens * 0.4) + (charBasedTokens * 0.6));
    
    return {
      tokens,
      model,
      method: 'estimation'
    };
  }

  // Get token limit for a model
  getModelTokenLimit(model: SupportedModel): number {
    const tokenLimits: Record<SupportedModel, number> = {
      'claude-3.5-sonnet': 200000,
      'claude-3.7-sonnet': 200000,
      'gemini-1.5-pro': 2000000,
      'gemini-2.5-pro': 1000000,
      'grok-3': 131072,
      'custom': 4096
    };
    
    return tokenLimits[model];
  }

  // Check if prompt exceeds model limit
  isWithinLimit(prompt: string, model: SupportedModel = 'claude-3.7-sonnet'): boolean {
    const result = this.countTokens(prompt, model);
    const limit = this.getModelTokenLimit(model);
    return result.tokens <= limit;
  }

  // Get percentage of limit used
  getUsagePercentage(prompt: string, model: SupportedModel = 'claude-3.7-sonnet'): number {
    const result = this.countTokens(prompt, model);
    const limit = this.getModelTokenLimit(model);
    return (result.tokens / limit) * 100;
  }

  // Get output token limit for a model
  getModelOutputLimit(model: SupportedModel): number {
    const outputLimits: Record<SupportedModel, number> = {
      'claude-3.5-sonnet': 4096,
      'claude-3.7-sonnet': 128000, // With extended output API header
      'gemini-1.5-pro': 8192,
      'gemini-2.5-pro': 64000,
      'grok-3': 8192,
      'custom': 4096
    };
    
    return outputLimits[model];
  }

  // Get model information
  getModelInfo(model: SupportedModel): {
    name: string;
    contextWindow: number;
    outputLimit: number;
    provider: string;
    releaseDate: string;
  } {
    const modelInfo: Record<SupportedModel, { name: string; provider: string; releaseDate: string }> = {
      'claude-3.5-sonnet': { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', releaseDate: '2024' },
      'claude-3.7-sonnet': { name: 'Claude 3.7 Sonnet', provider: 'Anthropic', releaseDate: 'February 2025' },
      'gemini-1.5-pro': { name: 'Gemini 1.5 Pro', provider: 'Google', releaseDate: '2024' },
      'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', provider: 'Google', releaseDate: '2025' },
      'grok-3': { name: 'Grok-3', provider: 'xAI', releaseDate: '2025' },
      'custom': { name: 'Custom Model', provider: 'Unknown', releaseDate: 'Unknown' }
    };
    
    return {
      ...modelInfo[model],
      contextWindow: this.getModelTokenLimit(model),
      outputLimit: this.getModelOutputLimit(model)
    };
  }
}