export interface Settings {
  openRouter: OpenRouterSettings;
  replicate: ReplicateSettings;
  updatedAt: Date;
}

export interface OpenRouterSettings {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  enabled: boolean;
}

export interface ReplicateSettings {
  apiKey: string;
  model: string;
  version: string;
  enabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  openRouter: {
    apiKey: '',
    model: 'anthropic/claude-3-opus',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1.0,
    enabled: false
  },
  replicate: {
    apiKey: '',
    model: 'meta/llama-2-70b-chat',
    version: '',
    enabled: false
  },
  updatedAt: new Date()
};