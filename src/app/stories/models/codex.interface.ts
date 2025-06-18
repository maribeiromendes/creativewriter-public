export interface CodexEntry {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  tags?: string[];
  imageUrl?: string;
  metadata?: Record<string, any>;
  order: number;
  createdAt: Date;
  updatedAt: Date;
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