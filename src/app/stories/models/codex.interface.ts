import { FirestoreDocument } from '../../core/services/firestore.service';

export interface CodexEntry extends FirestoreDocument {
  categoryId: string;
  storyId: string; // Add storyId for easier querying
  title: string;
  content: string;
  tags?: string[];
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  customFields?: CustomField[];
  storyRole?: StoryRole | '';
  alwaysInclude?: boolean;
  order: number;
}

export type StoryRole = 'Protagonist' | 'Supporting Character' | 'Antagonist' | 'Love Interest' | 'Background Character';

export const STORY_ROLES: { value: StoryRole; label: string }[] = [
  { value: 'Protagonist', label: 'Protagonist' },
  { value: 'Supporting Character', label: 'Supporting Character' },
  { value: 'Antagonist', label: 'Antagonist' },
  { value: 'Love Interest', label: 'Love Interest' },
  { value: 'Background Character', label: 'Background Character' }
];

export interface CustomField {
  id: string;
  name: string;
  value: string;
}

export interface CodexCategory extends FirestoreDocument {
  storyId: string; // Add storyId for easier querying
  title: string;
  description?: string;
  icon?: string;
  order: number;
}

export interface Codex extends FirestoreDocument {
  storyId: string;
  title: string;
}

export const DEFAULT_CODEX_CATEGORIES: Partial<CodexCategory>[] = [
  {
    title: 'Characters',
    description: 'Main characters and supporting characters of the story',
    icon: '👤'
  },
  {
    title: 'Locations',
    description: 'Places and settings in the story',
    icon: '🏰'
  },
  {
    title: 'Objects',
    description: 'Important objects and artifacts',
    icon: '⚔️'
  },
  {
    title: 'Notes',
    description: 'General notes and ideas',
    icon: '📝'
  }
];