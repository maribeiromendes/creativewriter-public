import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CodexEntry {
  id: string;
  title: string;
  category: 'character' | 'location' | 'object' | 'lore' | 'other';
  content: string;
  aliases: string[];
  keywords: string[];
  importance: 'major' | 'minor' | 'background';
  globalInclude?: boolean;
  lastMentioned?: number; // Position in text where last mentioned
  mentionCount?: number;
}

export interface RelevanceScore {
  entryId: string;
  score: number;
  reasons: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CodexRelevanceService {
  // Configurable parameters
  private readonly CONTEXT_WINDOW_SIZE = 2000; // Characters to look back
  private readonly MAX_ENTRIES_PER_CATEGORY = {
    character: 5,
    location: 3,
    object: 3,
    lore: 2,
    other: 2
  };
  private readonly RECENCY_DECAY = 0.8; // How much recency matters
  private readonly KEYWORD_WEIGHT = 1.0;
  private readonly ALIAS_WEIGHT = 0.9;
  private readonly SEMANTIC_WEIGHT = 0.7;

  /**
   * Identifies relevant codex entries for the current beat based on context
   */
  getRelevantEntries(
    allEntries: CodexEntry[],
    currentText: string,
    beatPrompt: string,
    maxTokens = 1000
  ): Observable<CodexEntry[]> {
    return of(allEntries).pipe(
      map(entries => {
        // Step 1: Always include global entries
        const globalEntries = entries.filter(e => e.globalInclude);
        
        // Step 2: Calculate relevance scores for non-global entries
        const scoredEntries = entries
          .filter(e => !e.globalInclude)
          .map(entry => ({
            entry,
            score: this.calculateRelevanceScore(entry, currentText, beatPrompt)
          }))
          .filter(item => item.score.score > 0);

        // Step 3: Sort by score and category limits
        const selectedEntries = this.selectTopEntries(scoredEntries);

        // Step 4: Combine and respect token limit
        const finalEntries = this.optimizeForTokenLimit(
          [...globalEntries, ...selectedEntries],
          maxTokens
        );

        return finalEntries;
      })
    );
  }

  private calculateRelevanceScore(
    entry: CodexEntry,
    currentText: string,
    beatPrompt: string
  ): RelevanceScore {
    const score: RelevanceScore = {
      entryId: entry.id,
      score: 0,
      reasons: []
    };

    // Get recent context window
    const contextWindow = currentText.slice(-this.CONTEXT_WINDOW_SIZE);
    const combinedContext = (contextWindow + ' ' + beatPrompt).toLowerCase();

    // 1. Check for exact name/alias matches
    const nameMatches = this.countMatches(combinedContext, entry.title.toLowerCase());
    if (nameMatches > 0) {
      score.score += nameMatches * this.KEYWORD_WEIGHT;
      score.reasons.push(`Name mentioned ${nameMatches} times`);
    }

    // 2. Check aliases
    for (const alias of entry.aliases) {
      const aliasMatches = this.countMatches(combinedContext, alias.toLowerCase());
      if (aliasMatches > 0) {
        score.score += aliasMatches * this.ALIAS_WEIGHT;
        score.reasons.push(`Alias "${alias}" mentioned ${aliasMatches} times`);
      }
    }

    // 3. Check keywords/tags with improved matching
    for (const keyword of entry.keywords) {
      const keywordLower = keyword.toLowerCase();
      
      // Exact word match gets higher score
      const exactMatches = this.countMatches(combinedContext, keywordLower);
      if (exactMatches > 0) {
        score.score += exactMatches * this.KEYWORD_WEIGHT;
        score.reasons.push(`Tag "${keyword}" matched ${exactMatches} times`);
      } else if (combinedContext.includes(keywordLower)) {
        // Partial match gets lower score
        score.score += this.SEMANTIC_WEIGHT * 0.5;
        score.reasons.push(`Tag "${keyword}" partially matched`);
      }
    }

    // 4. Recency bonus (if tracked)
    if (entry.lastMentioned !== undefined) {
      const recencyBonus = this.calculateRecencyBonus(
        entry.lastMentioned,
        currentText.length
      );
      score.score += recencyBonus;
      if (recencyBonus > 0) {
        score.reasons.push(`Recently mentioned (bonus: ${recencyBonus.toFixed(2)})`);
      }
    }

    // 5. Importance multiplier
    const importanceMultiplier = {
      major: 1.5,
      minor: 1.0,
      background: 0.5
    }[entry.importance];
    score.score *= importanceMultiplier;

    // 6. Special beat prompt analysis
    score.score += this.analyzePromptRelevance(entry, beatPrompt);

    return score;
  }

  private countMatches(text: string, searchTerm: string): number {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${this.escapeRegex(searchTerm)}\\b`, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private calculateRecencyBonus(lastPosition: number, textLength: number): number {
    const distance = textLength - lastPosition;
    const normalizedDistance = distance / this.CONTEXT_WINDOW_SIZE;
    
    // Exponential decay: closer = higher bonus
    return Math.max(0, this.RECENCY_DECAY * Math.exp(-normalizedDistance));
  }

  private analyzePromptRelevance(entry: CodexEntry, beatPrompt: string): number {
    let score = 0;
    const promptLower = beatPrompt.toLowerCase();

    // Character-specific prompt patterns
    if (entry.category === 'character') {
      const characterPatterns = [
        /describe\s+\w+/,  // "describe [character]"
        /dialog\s+with\s+\w+/, // "dialog with [character]"
        /\w+\s+(sagt|spricht|antwortet|fragt)/, // character actions
      ];
      
      for (const pattern of characterPatterns) {
        if (pattern.test(promptLower) && promptLower.includes(entry.title.toLowerCase())) {
          score += 2.0;
          break;
        }
      }
    }

    // Location-specific prompt patterns
    if (entry.category === 'location') {
      const locationPatterns = [
        /(in|bei|am|im)\s+\w+/,  // prepositions indicating location
        /scene\s+(in|at|by)/, // "scene in/at/by"
        /describe\s+(the)\s+\w+/, // "describe the [location]"
      ];
      
      for (const pattern of locationPatterns) {
        if (pattern.test(promptLower) && promptLower.includes(entry.title.toLowerCase())) {
          score += 1.5;
          break;
        }
      }
    }

    return score;
  }

  private selectTopEntries(
    scoredEntries: { entry: CodexEntry; score: RelevanceScore }[]
  ): CodexEntry[] {
    // Sort by score descending
    scoredEntries.sort((a, b) => b.score.score - a.score.score);

    const selected: CodexEntry[] = [];
    const categoryCounts: Record<string, number> = {};

    for (const { entry, score } of scoredEntries) {
      const category = entry.category;
      const currentCount = categoryCounts[category] || 0;
      const maxCount = this.MAX_ENTRIES_PER_CATEGORY[category] || 2;

      if (currentCount < maxCount) {
        selected.push(entry);
        categoryCounts[category] = currentCount + 1;

        // Log relevance reasoning for debugging
        console.log(`Selected ${entry.title} (${category}):`, {
          score: score.score.toFixed(2),
          reasons: score.reasons
        });
      }
    }

    return selected;
  }

  private optimizeForTokenLimit(entries: CodexEntry[], maxTokens: number): CodexEntry[] {
    const estimatedTokensPerChar = 0.25; // Rough estimate
    let currentTokens = 0;
    const optimized: CodexEntry[] = [];

    // Prioritize by importance and global status
    const prioritized = [...entries].sort((a, b) => {
      if (a.globalInclude && !b.globalInclude) return -1;
      if (!a.globalInclude && b.globalInclude) return 1;
      
      const importanceOrder = { major: 3, minor: 2, background: 1 };
      return importanceOrder[b.importance] - importanceOrder[a.importance];
    });

    for (const entry of prioritized) {
      const entryTokens = entry.content.length * estimatedTokensPerChar;
      
      if (currentTokens + entryTokens <= maxTokens) {
        optimized.push(entry);
        currentTokens += entryTokens;
      } else {
        console.warn(`Skipping ${entry.title} due to token limit`);
      }
    }

    return optimized;
  }

  /**
   * Updates mention tracking for codex entries based on generated text
   */
  updateMentionTracking(
    entries: CodexEntry[],
    generatedText: string,
    textPosition: number
  ): CodexEntry[] {
    return entries.map(entry => {
      const mentions = this.countMatches(generatedText.toLowerCase(), entry.title.toLowerCase());
      
      // Also check aliases
      let totalMentions = mentions;
      for (const alias of entry.aliases) {
        totalMentions += this.countMatches(generatedText.toLowerCase(), alias.toLowerCase());
      }

      if (totalMentions > 0) {
        return {
          ...entry,
          lastMentioned: textPosition,
          mentionCount: (entry.mentionCount || 0) + totalMentions
        };
      }
      
      return entry;
    });
  }

  /**
   * Formats selected codex entries for inclusion in AI prompt
   */
  formatEntriesForPrompt(entries: CodexEntry[]): string {
    if (entries.length === 0) return '';

    const grouped = entries.reduce((acc, entry) => {
      const category = entry.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(entry);
      return acc;
    }, {} as Record<string, CodexEntry[]>);

    let formatted = '## Relevant Information from Codex:\n\n';

    const categoryLabels = {
      character: 'Characters',
      location: 'Locations',
      object: 'Objects',
      lore: 'Background',
      other: 'Other'
    };

    for (const [category, categoryEntries] of Object.entries(grouped)) {
      formatted += `### ${categoryLabels[category as keyof typeof categoryLabels] || category}:\n\n`;
      
      for (const entry of categoryEntries) {
        formatted += `**${entry.title}**\n${entry.content}\n\n`;
      }
    }

    return formatted;
  }
}