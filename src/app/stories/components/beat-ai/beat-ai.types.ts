// Shared types for Beat AI components
export interface SceneContext {
  chapterId: string;
  sceneId: string;
  chapterTitle: string;
  sceneTitle: string;
  content: string;
  selected: boolean;
}

export interface BeatTypeOption {
  value: 'story' | 'scene';
  label: string;
  description: string;
}

export interface WordCountOption {
  value: number | string;
  label: string;
}

export interface GenerationOptions {
  beatType: 'story' | 'scene';
  wordCount: number;
  model: string;
}

export interface PreviewModalData {
  isOpen: boolean;
  content: string;
}

export interface GenerationStatus {
  isGenerating: boolean;
  progress?: number;
  statusMessage?: string;
  canStop: boolean;
}