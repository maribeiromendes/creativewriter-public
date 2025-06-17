export interface Scene {
  id: string;
  title: string;
  content: string;
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

export interface Story {
  id: string;
  title: string;
  chapters: Chapter[];
  createdAt: Date;
  updatedAt: Date;
  // Legacy support for old stories
  content?: string;
}