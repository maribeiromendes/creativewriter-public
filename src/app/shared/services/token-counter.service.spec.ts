import { TestBed } from '@angular/core/testing';
import { TokenCounterService, SupportedModel } from './token-counter.service';

describe('TokenCounterService', () => {
  let service: TokenCounterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenCounterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('countTokens', () => {
    it('should return token count for simple text', () => {
      const result = service.countTokens('Hello world', 'claude-3-sonnet');
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.model).toBe('claude-3-sonnet');
      expect(result.method).toBe('estimation');
    });

    it('should handle empty string', () => {
      const result = service.countTokens('', 'claude-3-sonnet');
      expect(result.tokens).toBe(0);
    });

    it('should handle long text', () => {
      const longText = 'Lorem ipsum '.repeat(100);
      const result = service.countTokens(longText, 'claude-3-sonnet');
      expect(result.tokens).toBeGreaterThan(100);
    });

    it('should count special characters as additional tokens', () => {
      const textWithSpecial = 'Hello <world> {test} [array]';
      const textWithout = 'Hello world test array';
      
      const resultWith = service.countTokens(textWithSpecial, 'claude-3-sonnet');
      const resultWithout = service.countTokens(textWithout, 'claude-3-sonnet');
      
      expect(resultWith.tokens).toBeGreaterThan(resultWithout.tokens);
    });

    it('should handle code blocks', () => {
      const textWithCode = '```\nfunction test() {\n  return true;\n}\n```';
      const result = service.countTokens(textWithCode, 'claude-3-sonnet');
      expect(result.tokens).toBeGreaterThan(10);
    });

    it('should use different ratios for different models', () => {
      const text = 'This is a test prompt for token counting';
      const claudeResult = service.countTokens(text, 'claude-3-opus');
      const gptResult = service.countTokens(text, 'gpt-4');
      
      // Different models should produce different token counts
      expect(claudeResult.tokens).not.toBe(gptResult.tokens);
    });
  });

  describe('estimateTokensAdvanced', () => {
    it('should provide advanced estimation', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const result = service.estimateTokensAdvanced(text, 'claude-3-sonnet');
      
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.method).toBe('estimation');
    });

    it('should handle multi-line text', () => {
      const multiLineText = `Line one
      Line two
      Line three`;
      
      const result = service.estimateTokensAdvanced(multiLineText);
      expect(result.tokens).toBeGreaterThan(5);
    });
  });

  describe('getModelTokenLimit', () => {
    it('should return correct limits for Claude models', () => {
      expect(service.getModelTokenLimit('claude-3-opus')).toBe(200000);
      expect(service.getModelTokenLimit('claude-3-sonnet')).toBe(200000);
      expect(service.getModelTokenLimit('claude-2.0')).toBe(100000);
    });

    it('should return correct limits for GPT models', () => {
      expect(service.getModelTokenLimit('gpt-4')).toBe(8192);
      expect(service.getModelTokenLimit('gpt-4-turbo')).toBe(128000);
      expect(service.getModelTokenLimit('gpt-3.5-turbo')).toBe(4096);
    });
  });

  describe('isWithinLimit', () => {
    it('should return true for small prompts', () => {
      const smallPrompt = 'This is a small prompt';
      expect(service.isWithinLimit(smallPrompt, 'gpt-3.5-turbo')).toBe(true);
    });

    it('should handle model limits correctly', () => {
      const text = 'a'.repeat(40000); // ~10k tokens for GPT-4
      expect(service.isWithinLimit(text, 'gpt-4')).toBe(false);
      expect(service.isWithinLimit(text, 'claude-3-sonnet')).toBe(true);
    });
  });

  describe('getUsagePercentage', () => {
    it('should calculate usage percentage correctly', () => {
      const text = 'Short text';
      const percentage = service.getUsagePercentage(text, 'gpt-3.5-turbo');
      
      expect(percentage).toBeGreaterThan(0);
      expect(percentage).toBeLessThan(1); // Should be less than 1% for short text
    });

    it('should return 0 for empty text', () => {
      const percentage = service.getUsagePercentage('', 'claude-3-sonnet');
      expect(percentage).toBe(0);
    });
  });
});