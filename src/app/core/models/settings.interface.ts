export interface Settings {
  openRouter: OpenRouterSettings;
  replicate: ReplicateSettings;
  googleGemini: GoogleGeminiSettings;
  sceneTitleGeneration: SceneTitleGenerationSettings;
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

export interface GoogleGeminiSettings {
  apiKey: string;
  model: string;
  temperature: number;
  topP: number;
  enabled: boolean;
  contentFilter: {
    harassment: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
    hateSpeech: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
    sexuallyExplicit: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
    dangerousContent: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
    civicIntegrity: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
  };
}

export interface SceneTitleGenerationSettings {
  maxWords: number;
  style: 'descriptive' | 'concise' | 'action' | 'emotional';
  language: 'german' | 'english';
  includeGenre: boolean;
  temperature: number;
  customInstruction: string;
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
  googleGemini: {
    apiKey: '',
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    topP: 1.0,
    enabled: false,
    contentFilter: {
      harassment: 'BLOCK_NONE',
      hateSpeech: 'BLOCK_NONE',
      sexuallyExplicit: 'BLOCK_NONE',
      dangerousContent: 'BLOCK_NONE',
      civicIntegrity: 'BLOCK_NONE'
    }
  },
  sceneTitleGeneration: {
    maxWords: 3,
    style: 'concise',
    language: 'german',
    includeGenre: false,
    temperature: 0.3,
    customInstruction: ''
  },
  updatedAt: new Date()
};