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
  beatGenerationTemplate: string; // Advanced template for beat generation
  useFullStoryContext: boolean; // true = full story, false = summaries only
  beatInstruction: 'continue' | 'stay'; // continue = "Setze die Geschichte fort", stay = "Bleibe im Moment"
}

export interface Story {
  _id?: string;
  _rev?: string;
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
  beatGenerationTemplate: `{SystemMessage}

Beziehe den folgenden Glossar von Charakteren/Orten/Gegenständen/Überlieferungen mit ein:
{codexEntries}

Was bisher passiert ist:
{summariesOfScenesBefore}

Was gerade passiert ist:
{sceneFullText}

Schrebeibe {wordCount} Wörter welche die Geschichte fortsetzen mit folgenden Aufgaben:
{prompt}

{writingStyle}`,
  useFullStoryContext: false,
  beatInstruction: 'continue'
};