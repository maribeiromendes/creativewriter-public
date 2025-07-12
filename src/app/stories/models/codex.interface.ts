export interface CodexEntry {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  tags?: string[];
  imageUrl?: string;
  metadata?: Record<string, any>;
  customFields?: CustomField[];
  storyRole?: StoryRole | '';
  alwaysInclude?: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export type StoryRole = 'Protagonist' | 'Nebencharakter' | 'Antagonist' | 'Love-Interest' | 'Hintergrundcharakter';

export const STORY_ROLES: { value: StoryRole; label: string }[] = [
  { value: 'Protagonist', label: 'Protagonist' },
  { value: 'Nebencharakter', label: 'Nebencharakter' },
  { value: 'Antagonist', label: 'Antagonist' },
  { value: 'Love-Interest', label: 'Love-Interest' },
  { value: 'Hintergrundcharakter', label: 'Hintergrundcharakter' }
];

export interface CustomField {
  id: string;
  name: string;
  value: string;
}

export interface CodexCategory {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  entries: CodexEntry[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Codex {
  id: string;
  storyId: string;
  title: string;
  categories: CodexCategory[];
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_CODEX_CATEGORIES: Partial<CodexCategory>[] = [
  {
    title: 'Charaktere',
    description: 'Hauptfiguren und Nebenfiguren der Geschichte',
    icon: '👤',
    entries: []
  },
  {
    title: 'Orte',
    description: 'Schauplätze und Lokationen',
    icon: '🏰',
    entries: []
  },
  {
    title: 'Gegenstände',
    description: 'Wichtige Objekte und Artefakte',
    icon: '⚔️',
    entries: []
  },
  {
    title: 'Notizen',
    description: 'Allgemeine Notizen und Ideen',
    icon: '📝',
    entries: []
  }
];