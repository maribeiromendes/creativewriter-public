import { ErrorHandler, Injectable, inject } from '@angular/core';
import { AIRequestLoggerService } from './ai-request-logger.service';

@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  private readonly aiLogger = inject(AIRequestLoggerService);

  handleError(error: unknown): void {
    const timestamp = new Date().toISOString();
    
    // Log comprehensive error information
    console.group(`🚨 Global Error Handler - ${timestamp}`);
    console.error('Original error:', error);
    
    let errorMessage = 'Unknown global error';
    let errorContext: Record<string, unknown> = {};

    try {
      // Extract error details based on error type
      if ((error as any)?.rejection) {
        // Promise rejection
        errorMessage = `Unhandled Promise Rejection: ${(error as any).rejection?.message || (error as any).rejection}`;
        errorContext = {
          type: 'promise_rejection',
          reason: (error as any).reason,
          promise: (error as any).promise,
          stack: (error as any).rejection?.stack
        };
      } else if (error instanceof Error) {
        // Standard JavaScript Error
        errorMessage = `${error.name}: ${error.message}`;
        errorContext = {
          type: 'javascript_error',
          name: error.name,
          message: error.message,
          stack: error.stack,
          fileName: (error as Error & { fileName?: string }).fileName,
          lineNumber: (error as Error & { lineNumber?: number }).lineNumber,
          columnNumber: (error as Error & { columnNumber?: number }).columnNumber
        };
      } else if ((error as any)?.error) {
        // HTTP Error or wrapped error
        errorMessage = `HTTP/API Error: ${(error as any).error?.message || (error as any).message || 'Unknown'}`;
        errorContext = {
          type: 'http_error',
          status: (error as any).status,
          statusText: (error as any).statusText,
          url: (error as any).url,
          error: (error as any).error
        };
      } else if (typeof error === 'string') {
        errorMessage = `String Error: ${error}`;
        errorContext = {
          type: 'string_error',
          value: error
        };
      } else {
        // Unknown error type
        errorMessage = `Unknown Error Type: ${JSON.stringify(error).substring(0, 200)}`;
        errorContext = {
          type: 'unknown',
          value: error
        };
      }

      console.error('Processed error message:', errorMessage);
      console.error('Error context:', errorContext);

      // Log to AI logger for tracking API-related errors
      if (this.isApiRelatedError(error, errorMessage)) {
        console.log('This appears to be an API-related error, logging to AI request logger');
        
        // Create a synthetic log entry for global errors
        const logId = this.aiLogger.logRequest({
          endpoint: 'GLOBAL_ERROR',
          model: 'unknown',
          wordCount: 0,
          maxTokens: 0,
          prompt: `Global error: ${errorMessage}`
        });

        this.aiLogger.logError(logId, errorMessage, 0);
      }

      // Additional context logging
      console.error('Error occurred at:', timestamp);
      console.error('User agent:', navigator.userAgent);
      console.error('URL:', window.location.href);
      
    } catch (processingError) {
      console.error('Error in error handler:', processingError);
      errorMessage = `Error Handler Failed: ${error}`;
    }

    console.groupEnd();

    // Don't rethrow - we want to handle it gracefully
    // In a production app, you might send this to an error reporting service
  }

  private isApiRelatedError(error: unknown, errorMessage: string): boolean {
    // Check if error is related to API calls
    const apiKeywords = ['api', 'gemini', 'openrouter', 'http', 'fetch', 'network', 'timeout', 'cors', 'content', 'filter', 'safety', 'blocked', 'harm'];
    const messageContainsApi = apiKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword)
    );

    const hasApiContext = (error as any)?.url || 
                         (error as any)?.status || 
                         (error as any)?.error?.error || // Google API error structure
                         ((error as Error)?.stack && (error as Error).stack?.includes('HttpClient'));

    // Check for content filter specific errors
    const isContentFilterError = this.isContentFilterError(error, errorMessage);

    return messageContainsApi || hasApiContext || isContentFilterError;
  }

  private isContentFilterError(error: unknown, errorMessage: string): boolean {
    // Content filter keywords
    const contentFilterKeywords = [
      'safety rating',
      'blocked',
      'content filter',
      'harm category',
      'safety threshold',
      'recitation',
      'finish_reason',
      'other',
      'safety'
    ];

    const messageContainsFilter = contentFilterKeywords.some(keyword =>
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );

    // Check Google API response structure for safety-related blocking
    const hasSafetyBlock = (error as any)?.error?.error?.message?.includes('blocked') ||
                          (error as any)?.candidates?.[0]?.finishReason === 'SAFETY' ||
                          (error as any)?.candidates?.[0]?.finishReason === 'OTHER' ||
                          (error as any)?.promptFeedback?.blockReason;

    // Check for safety ratings that might indicate content filtering
    const hasSafetyRatings = (error as any)?.candidates?.[0]?.safetyRatings ||
                            (error as any)?.promptFeedback?.safetyRatings;

    return messageContainsFilter || hasSafetyBlock || hasSafetyRatings;
  }
}