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
  beatGenerationTemplate: `<messages>
<message role="system">{systemMessage}</message>
<message role="user">Take into account the following glossary of characters/locations/items/lore... when writing your response:
{codexEntries}

The story so far:
{storySoFar}</message>
<message role="assistant"># {storyTitle}

{sceneFullText}</message>
<message role="user">Write {wordCount} words that continue the story, using the following instructions:
<instructions>
{pointOfView}

{prompt}

{writingStyle}
</instructions></message>
</messages>`,
  useFullStoryContext: false,
  beatInstruction: 'continue'
};