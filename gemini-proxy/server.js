const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3002;

// API key can come from environment variable (legacy) or from request headers
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test endpoint
app.get('/api/gemini/test', (req, res) => {
  const apiKeyFromHeader = req.headers['x-api-key'];
  res.json({ 
    status: 'ok',
    message: 'Gemini proxy is running',
    apiKeyConfigured: !!(GEMINI_API_KEY || apiKeyFromHeader),
    apiKeySource: apiKeyFromHeader ? 'header' : (GEMINI_API_KEY ? 'environment' : 'none'),
    timestamp: new Date().toISOString()
  });
});

// Proxy all requests to Gemini API
app.all('/api/gemini/*', async (req, res) => {
  const requestId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  const startTime = Date.now();
  
  try {
    const path = req.params[0];
    const queryString = req.url.split('?')[1] || '';
    
    // Get API key from header or fall back to environment variable
    const apiKey = req.headers['x-api-key'] || GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error(`[${requestId}] No API key provided in header or environment`);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'API key is required. Please provide it in X-API-Key header or configure GEMINI_API_KEY environment variable' 
      });
    }
    
    // Ensure API key is included in URL
    let apiKeyParam = `key=${apiKey}`;
    if (queryString && queryString.includes('key=')) {
      // API key already in query string, don't add it again
      apiKeyParam = '';
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/${path}${queryString || apiKeyParam ? '?' : ''}${apiKeyParam}${queryString && apiKeyParam ? '&' : ''}${queryString || ''}`;
    
    console.log(`[${requestId}] Proxying ${req.method} request to: ${url.replace(apiKey, '[REDACTED]')}`);
    console.log(`[${requestId}] Request body size: ${JSON.stringify(req.body || {}).length} bytes`);
    console.log(`[${requestId}] API Key source: ${req.headers['x-api-key'] ? 'header' : 'environment'}`);
    
    // Check if this is a streaming request
    const isStreaming = url.includes('streamGenerateContent') && url.includes('alt=sse');
    
    if (isStreaming) {
      // Handle streaming requests
      console.log('Handling streaming request...');
      
      // Use native fetch for streaming support (Node.js 18+)
      console.log(`[${requestId}] Making streaming request with native fetch`);
      
      const streamingHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'User-Agent': 'NovelCrafter/1.0',
        'X-Client-Name': 'NovelCrafter',
        'X-Client-Version': '1.0'
      };
      
      console.log(`[${requestId}] Streaming headers:`, streamingHeaders);
      
      const response = await fetch(url, {
        method: req.method,
        headers: streamingHeaders,
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const duration = Date.now() - startTime;
        
        console.error(`[${requestId}] Streaming request failed:`, {
          status: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`,
          headers: Object.fromEntries(response.headers.entries()),
          errorBody: errorText.substring(0, 1000) // Log first 1000 chars of error
        });
        
        let parsedError = null;
        try {
          parsedError = JSON.parse(errorText);
          console.error(`[${requestId}] Parsed Google API error:`, JSON.stringify(parsedError, null, 2));
        } catch (e) {
          console.error(`[${requestId}] Could not parse error response as JSON`);
        }
        
        return res.status(response.status).send(errorText);
      }
      
      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering if present
      
      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
            
            // Log chunk details for debugging (only first few chunks to avoid spam)
            if (Math.random() < 0.1) { // Log 10% of chunks
              console.log(`[${requestId}] Streaming chunk: ${chunk.length} bytes`);
            }
          }
        } catch (error) {
          const duration = Date.now() - startTime;
          console.error(`[${requestId}] Streaming error after ${duration}ms:`, {
            name: error.name,
            message: error.message,
            stack: error.stack?.substring(0, 500)
          });
          res.end();
        }
      };
      
      pump();
      
      // Handle client disconnect
      req.on('close', () => {
        const duration = Date.now() - startTime;
        console.log(`[${requestId}] Client disconnected streaming request after ${duration}ms`);
        reader.cancel();
      });
      
      // Log successful streaming start
      console.log(`[${requestId}] Streaming request started successfully`);
      
    } else {
      // Handle non-streaming requests with axios as before
      const config = {
        method: req.method,
        url,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NovelCrafter/1.0',
          'X-Client-Name': 'NovelCrafter',
          'X-Client-Version': '1.0',
          ...req.headers,
        },
        data: req.body,
      };
      
      console.log(`[${requestId}] Non-streaming headers:`, config.headers);
      
      // Remove host header and other headers that might cause conflicts
      delete config.headers.host;
      delete config.headers['content-length'];
      delete config.headers.authorization; // Remove since we use API key in URL
      delete config.headers['x-api-key']; // Remove our custom header
      
      const response = await axios(config);
      const duration = Date.now() - startTime;
      
      console.log(`[${requestId}] Non-streaming request completed successfully in ${duration}ms:`, {
        status: response.status,
        responseSize: JSON.stringify(response.data).length + ' bytes',
        model: req.body?.generationConfig ? 'configured' : 'default',
        hasPromptFeedback: !!response.data.promptFeedback,
        promptFeedbackBlockReason: response.data.promptFeedback?.blockReason,
        safetyRatingsInPromptFeedback: response.data.promptFeedback?.safetyRatings?.length || 0
      });
      
      // Log prompt feedback if present
      if (response.data.promptFeedback) {
        console.log(`[${requestId}] 🛡️ Prompt Feedback present:`, {
          blockReason: response.data.promptFeedback.blockReason,
          safetyRatings: response.data.promptFeedback.safetyRatings
        });
      }
      
      // Forward response
      res.status(response.status).json(response.data);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error(`[${requestId}] Proxy error after ${duration}ms:`, {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      stack: error.stack?.substring(0, 500)
    });
    
    if (error.response) {
      console.error(`[${requestId}] Detailed Google API error response:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: JSON.stringify(error.response.data, null, 2)
      });
      
      // Extract and log specific error details
      if (error.response.data?.error) {
        const apiError = error.response.data.error;
        console.error(`[${requestId}] Google API error details:`, {
          code: apiError.code,
          message: apiError.message,
          status: apiError.status,
          details: apiError.details
        });
      }
      
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error(`[${requestId}] Network connectivity error - cannot reach Google API`);
      res.status(503).json({ 
        error: 'Service unavailable', 
        message: 'Cannot connect to Google API',
        code: error.code
      });
    } else if (error.code === 'ETIMEDOUT') {
      console.error(`[${requestId}] Request timeout - Google API did not respond in time`);
      res.status(504).json({ 
        error: 'Gateway timeout', 
        message: 'Google API request timed out',
        code: error.code
      });
    } else {
      console.error(`[${requestId}] Unknown proxy error:`, error);
      res.status(500).json({ 
        error: 'Proxy error', 
        message: error.message,
        requestId: requestId
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Gemini proxy server running on port ${PORT}`);
});