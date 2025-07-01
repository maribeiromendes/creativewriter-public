const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3002;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Proxy all requests to Gemini API
app.all('/api/gemini/*', async (req, res) => {
  const requestId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  const startTime = Date.now();
  
  try {
    const path = req.params[0];
    const queryString = req.url.split('?')[1] || '';
    const url = `https://generativelanguage.googleapis.com/v1beta/${path}?key=${GEMINI_API_KEY}${queryString ? '&' + queryString : ''}`;
    
    console.log(`[${requestId}] Proxying ${req.method} request to: ${url.replace(GEMINI_API_KEY, '[REDACTED]')}`);
    console.log(`[${requestId}] Request body size: ${JSON.stringify(req.body || {}).length} bytes`);
    
    // Check if this is a streaming request
    const isStreaming = url.includes('streamGenerateContent') && url.includes('alt=sse');
    
    if (isStreaming) {
      // Handle streaming requests
      console.log('Handling streaming request...');
      
      // Use native fetch for streaming support (Node.js 18+)
      const response = await fetch(url, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
        },
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
          ...req.headers,
        },
        data: req.body,
      };
      
      // Remove host header and other headers that might cause conflicts
      delete config.headers.host;
      delete config.headers['content-length'];
      delete config.headers.authorization; // Remove since we use API key in URL
      
      const response = await axios(config);
      const duration = Date.now() - startTime;
      
      console.log(`[${requestId}] Non-streaming request completed successfully in ${duration}ms:`, {
        status: response.status,
        responseSize: JSON.stringify(response.data).length + ' bytes',
        model: req.body?.generationConfig ? 'configured' : 'default'
      });
      
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