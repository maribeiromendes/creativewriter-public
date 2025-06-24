export interface ImageGenerationModel {
  id: string;
  name: string;
  description: string;
  version: string;
  owner: string;
  inputs: ModelInput[];
  maxBatchSize?: number;
}

export interface ModelInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'integer' | 'file' | 'array';
  description: string;
  default?: any;
  minimum?: number;
  maximum?: number;
  options?: string[];
  required?: boolean;
}

export interface ImageGenerationRequest {
  version: string;
  input: Record<string, any>;
}

export interface ImageGenerationResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
  logs?: string;
  metrics?: {
    predict_time?: number;
  };
}

export interface ImageGenerationJob {
  id: string;
  model: string;
  prompt: string;
  parameters: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  imageUrl?: string;
  imageUrls?: string[]; // For multiple images
  error?: string;
}