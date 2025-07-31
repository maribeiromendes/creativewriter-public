import { Injectable } from '@angular/core';

export interface TokenCountResult {
  tokens: number;
  model: string;
  method: 'exact' | 'estimation';
}

export type SupportedModel = 
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'
  | 'claude-2.1'
  | 'claude-2.0'
  | 'claude-instant'
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'custom';

@Injectable({
  providedIn: 'root'
})
export class TokenCounterService {
  
  private readonly CHARS_PER_TOKEN_ESTIMATES: Record<SupportedModel, number> = {
    'claude-3-opus': 3.5,
    'claude-3-sonnet': 3.5,
    'claude-3-haiku': 3.5,
    'claude-2.1': 3.8,
    'claude-2.0': 3.8,
    'claude-instant': 4.0,
    'gpt-4': 4.0,
    'gpt-4-turbo': 4.0,
    'gpt-3.5-turbo': 4.0,
    'custom': 4.0
  };

  countTokens(prompt: string, model: SupportedModel = 'claude-3-sonnet'): TokenCountResult {
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
  estimateTokensAdvanced(prompt: string, model: SupportedModel = 'claude-3-sonnet'): TokenCountResult {
    const words = prompt.split(/\s+/).filter(word => word.length > 0);
    const avgTokensPerWord = model.startsWith('claude') ? 1.3 : 1.4;
    
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
      'claude-3-opus': 200000,
      'claude-3-sonnet': 200000,
      'claude-3-haiku': 200000,
      'claude-2.1': 200000,
      'claude-2.0': 100000,
      'claude-instant': 100000,
      'gpt-4': 8192,
      'gpt-4-turbo': 128000,
      'gpt-3.5-turbo': 4096,
      'custom': 4096
    };
    
    return tokenLimits[model];
  }

  // Check if prompt exceeds model limit
  isWithinLimit(prompt: string, model: SupportedModel = 'claude-3-sonnet'): boolean {
    const result = this.countTokens(prompt, model);
    const limit = this.getModelTokenLimit(model);
    return result.tokens <= limit;
  }

  // Get percentage of limit used
  getUsagePercentage(prompt: string, model: SupportedModel = 'claude-3-sonnet'): number {
    const result = this.countTokens(prompt, model);
    const limit = this.getModelTokenLimit(model);
    return (result.tokens / limit) * 100;
  }
}