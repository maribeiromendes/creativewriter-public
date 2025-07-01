import { ErrorHandler, Injectable } from '@angular/core';
import { AIRequestLoggerService } from './ai-request-logger.service';

@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  constructor(private aiLogger: AIRequestLoggerService) {}

  handleError(error: any): void {
    const timestamp = new Date().toISOString();
    
    // Log comprehensive error information
    console.group(`🚨 Global Error Handler - ${timestamp}`);
    console.error('Original error:', error);
    
    let errorMessage = 'Unknown global error';
    let errorContext: any = {};

    try {
      // Extract error details based on error type
      if (error?.rejection) {
        // Promise rejection
        errorMessage = `Unhandled Promise Rejection: ${error.rejection?.message || error.rejection}`;
        errorContext = {
          type: 'promise_rejection',
          reason: error.reason,
          promise: error.promise,
          stack: error.rejection?.stack
        };
      } else if (error instanceof Error) {
        // Standard JavaScript Error
        errorMessage = `${error.name}: ${error.message}`;
        errorContext = {
          type: 'javascript_error',
          name: error.name,
          message: error.message,
          stack: error.stack,
          fileName: (error as any).fileName,
          lineNumber: (error as any).lineNumber,
          columnNumber: (error as any).columnNumber
        };
      } else if (error?.error) {
        // HTTP Error or wrapped error
        errorMessage = `HTTP/API Error: ${error.error?.message || error.message || 'Unknown'}`;
        errorContext = {
          type: 'http_error',
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error
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

  private isApiRelatedError(error: any, errorMessage: string): boolean {
    // Check if error is related to API calls
    const apiKeywords = ['api', 'gemini', 'openrouter', 'http', 'fetch', 'network', 'timeout', 'cors', 'content', 'filter', 'safety', 'blocked', 'harm'];
    const messageContainsApi = apiKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword)
    );

    const hasApiContext = error?.url || 
                         error?.status || 
                         error?.error?.error || // Google API error structure
                         (error?.stack && error.stack.includes('HttpClient'));

    // Check for content filter specific errors
    const isContentFilterError = this.isContentFilterError(error, errorMessage);

    return messageContainsApi || hasApiContext || isContentFilterError;
  }

  private isContentFilterError(error: any, errorMessage: string): boolean {
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
    const hasSafetyBlock = error?.error?.error?.message?.includes('blocked') ||
                          error?.candidates?.[0]?.finishReason === 'SAFETY' ||
                          error?.candidates?.[0]?.finishReason === 'OTHER' ||
                          error?.promptFeedback?.blockReason;

    // Check for safety ratings that might indicate content filtering
    const hasSafetyRatings = error?.candidates?.[0]?.safetyRatings ||
                            error?.promptFeedback?.safetyRatings;

    return messageContainsFilter || hasSafetyBlock || hasSafetyRatings;
  }
}