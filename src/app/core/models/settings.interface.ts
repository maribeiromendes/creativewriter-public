export interface Settings {
  openRouter: OpenRouterSettings;
  replicate: ReplicateSettings;
  updatedAt: Date;
}

export interface OpenRouterSettings {
  apiKey: string;
  model: string;
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
    model: '',
    temperature: 0.7,
    topP: 1.0,
    enabled: false
  },
  replicate: {
    apiKey: '',
    model: '',
    version: '',
    enabled: false
  },
  updatedAt: new Date()
};