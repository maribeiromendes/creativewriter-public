export interface Scene {
  id: string;
  title: string;
  content: string;
  summary?: string;
  summaryGeneratedAt?: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  scenes: Scene[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StorySettings {
  systemMessage: string;
  beatTemplate: string;
  useFullStoryContext: boolean; // true = full story, false = summaries only
  beatInstruction: 'continue' | 'stay'; // continue = "Setze die Geschichte fort", stay = "Bleibe im Moment"
}

export interface Story {
  id: string;
  title: string;
  chapters: Chapter[];
  settings?: StorySettings;
  codexId?: string;
  createdAt: Date;
  updatedAt: Date;
  // Legacy support for old stories
  content?: string;
}

export const DEFAULT_STORY_SETTINGS: StorySettings = {
  systemMessage: 'Du bist ein kreativer Schreibassistent, der beim Verfassen von Geschichten hilft. Behalte den Stil und Ton der bisherigen Geschichte bei.',
  beatTemplate: 'Schreibe den nächsten Beat der Geschichte basierend auf folgendem Prompt: {prompt}\n\nAchte darauf, dass der Beat nahtlos an die vorherige Handlung anknüpft und die Charaktere konsistent bleiben. Schreibe {wordcount} Wörter.',
  useFullStoryContext: false,
  beatInstruction: 'continue'
};