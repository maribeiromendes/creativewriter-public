import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, switchMap, takeWhile, map, catchError, of } from 'rxjs';
import { 
  ImageGenerationModel, 
  ImageGenerationRequest, 
  ImageGenerationResponse,
  ImageGenerationJob
} from '../models/image-generation.interface';

@Injectable({
  providedIn: 'root'
})
export class ImageGenerationService {
  private readonly apiUrl = '/api/replicate';
  private jobsSubject = new BehaviorSubject<ImageGenerationJob[]>([]);
  public jobs$ = this.jobsSubject.asObservable();

  // Predefined models configuration
  private models: ImageGenerationModel[] = [
    {
      id: 'asiryan/unlimited-xl',
      name: 'Unlimited XL',
      description: 'High-quality image generation model',
      version: '1a98916be7897ab4d9fbc30d2b20d070c237674148b00d344cf03ff103eb7082',
      owner: 'asiryan',
      inputs: [
        {
          name: 'prompt',
          type: 'string',
          description: 'Input prompt for image generation',
          required: true
        },
        {
          name: 'negative_prompt',
          type: 'string',
          description: 'Negative prompt to avoid certain elements',
          default: ''
        },
        {
          name: 'width',
          type: 'integer',
          description: 'Width of output image',
          default: 1024,
          minimum: 256,
          maximum: 2048
        },
        {
          name: 'height',
          type: 'integer',
          description: 'Height of output image',
          default: 1024,
          minimum: 256,
          maximum: 2048
        },
        {
          name: 'num_inference_steps',
          type: 'integer',
          description: 'Number of denoising steps',
          default: 20,
          minimum: 1,
          maximum: 50
        },
        {
          name: 'guidance_scale',
          type: 'number',
          description: 'Scale for classifier-free guidance',
          default: 7.5,
          minimum: 1,
          maximum: 20
        },
        {
          name: 'num_outputs',
          type: 'integer',
          description: 'Number of images to output',
          default: 1,
          minimum: 1,
          maximum: 4
        },
        {
          name: 'seed',
          type: 'integer',
          description: 'Random seed for reproducibility',
          minimum: 0
        }
      ]
    }
  ];

  constructor(private http: HttpClient) {}

  getAvailableModels(): ImageGenerationModel[] {
    return this.models;
  }

  getModel(modelId: string): ImageGenerationModel | undefined {
    return this.models.find(model => model.id === modelId);
  }

  generateImage(modelId: string, input: Record<string, any>): Observable<ImageGenerationJob> {
    const model = this.getModel(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const job: ImageGenerationJob = {
      id: this.generateJobId(),
      model: modelId,
      prompt: input['prompt'] || '',
      parameters: input,
      status: 'pending',
      createdAt: new Date()
    };

    // Add job to the list
    const currentJobs = this.jobsSubject.value;
    this.jobsSubject.next([...currentJobs, job]);

    const request: ImageGenerationRequest = {
      model: `${model.owner}/${model.id}:${model.version}`,
      input
    };

    return this.http.post<ImageGenerationResponse>(`${this.apiUrl}/predictions`, request)
      .pipe(
        switchMap(response => {
          // Update job status
          this.updateJobStatus(job.id, 'processing');
          
          // Poll for completion
          return this.pollPrediction(response.id).pipe(
            map(finalResponse => {
              if (finalResponse.status === 'succeeded') {
                const imageUrl = Array.isArray(finalResponse.output) 
                  ? finalResponse.output[0] 
                  : finalResponse.output;
                
                this.updateJob(job.id, {
                  status: 'completed',
                  completedAt: new Date(),
                  imageUrl: imageUrl
                });
                
                return { ...job, status: 'completed', imageUrl: imageUrl } as ImageGenerationJob;
              } else if (finalResponse.status === 'failed') {
                this.updateJob(job.id, {
                  status: 'failed',
                  completedAt: new Date(),
                  error: finalResponse.error || 'Generation failed'
                });
                
                throw new Error(finalResponse.error || 'Generation failed');
              }
              
              return job;
            })
          );
        }),
        catchError(error => {
          this.updateJob(job.id, {
            status: 'failed',
            completedAt: new Date(),
            error: error.message
          });
          
          throw error;
        })
      );
  }

  private pollPrediction(predictionId: string): Observable<ImageGenerationResponse> {
    return interval(2000).pipe(
      switchMap(() => this.http.get<ImageGenerationResponse>(`${this.apiUrl}/predictions/${predictionId}`)),
      takeWhile(response => 
        response.status === 'starting' || response.status === 'processing', 
        true
      ),
      map(response => {
        console.log('Prediction status:', response.status);
        return response;
      })
    );
  }

  private updateJobStatus(jobId: string, status: ImageGenerationJob['status']): void {
    const currentJobs = this.jobsSubject.value;
    const updatedJobs = currentJobs.map(job => 
      job.id === jobId ? { ...job, status } : job
    );
    this.jobsSubject.next(updatedJobs);
  }

  private updateJob(jobId: string, updates: Partial<ImageGenerationJob>): void {
    const currentJobs = this.jobsSubject.value;
    const updatedJobs = currentJobs.map(job => 
      job.id === jobId ? { ...job, ...updates } : job
    );
    this.jobsSubject.next(updatedJobs);
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getJobs(): ImageGenerationJob[] {
    return this.jobsSubject.value;
  }

  clearJobs(): void {
    this.jobsSubject.next([]);
  }
}