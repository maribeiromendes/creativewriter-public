export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isGenerating?: boolean;
}

export interface SceneChat {
  id: string;
  sceneId: string;
  storyId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatRequest {
  message: string;
  sceneContent: string;
  storyContext?: string;
  previousMessages?: ChatMessage[];
}