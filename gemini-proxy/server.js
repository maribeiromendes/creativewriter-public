const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fetch = require('node-fetch');

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
  try {
    const path = req.params[0];
    const queryString = req.url.split('?')[1] || '';
    const url = `https://generativelanguage.googleapis.com/v1beta/${path}?key=${GEMINI_API_KEY}${queryString ? '&' + queryString : ''}`;
    
    console.log(`Proxying ${req.method} request to: ${url.replace(GEMINI_API_KEY, '[REDACTED]')}`);
    
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
        body: JSON.stringify(req.body)
      });
      
      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).send(error);
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
          }
        } catch (error) {
          console.error('Streaming error:', error);
          res.end();
        }
      };
      
      pump();
      
      // Handle client disconnect
      req.on('close', () => {
        reader.cancel();
      });
      
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
      
      // Forward response
      res.status(response.status).json(response.data);
    }
  } catch (error) {
    console.error('Proxy error:', error.message);
    if (error.response) {
      console.error('Gemini API error response:', JSON.stringify(error.response.data, null, 2));
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Proxy error', message: error.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Gemini proxy server running on port ${PORT}`);
});