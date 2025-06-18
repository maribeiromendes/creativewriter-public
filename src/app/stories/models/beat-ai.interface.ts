export interface BeatAI {
  id: string;
  prompt: string;
  generatedContent: string;
  isGenerating: boolean;
  isEditing: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BeatAIGenerationEvent {
  beatId: string;
  chunk: string;
  isComplete: boolean;
}

export interface BeatAIPromptEvent {
  beatId: string;
  prompt: string;
  action: 'generate' | 'regenerate';
  wordCount?: number;
  model?: string;
}

export interface BeatContentInsertEvent {
  beatId: string;
  content: string;
  isComplete: boolean;
}