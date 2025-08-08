const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test endpoint
app.get('/api/replicate/test', (req, res) => {
  const apiTokenFromHeader = req.headers['x-api-token'];
  res.json({ 
    status: 'ok',
    message: 'Replicate proxy is running',
    apiTokenConfigured: !!apiTokenFromHeader,
    apiTokenSource: apiTokenFromHeader ? 'header' : 'none',
    timestamp: new Date().toISOString()
  });
});

// Proxy all requests to Replicate
app.all('/api/replicate/*', async (req, res) => {
  try {
    const path = req.params[0];
    const url = `https://api.replicate.com/v1/${path}`;
    
    // Get API token from header only
    const apiToken = req.headers['x-api-token'];
    
    if (!apiToken) {
      console.error('No API token provided in X-API-Token header');
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'API token is required. Please provide it in X-API-Token header' 
      });
    }
    
    console.log(`Proxying ${req.method} request to: ${url}`);
    console.log(`API Token source: header`);
    
    const config = {
      method: req.method,
      url,
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json',
        ...req.headers,
      },
      data: req.body,
    };
    
    // Remove host header and our custom headers to avoid conflicts
    delete config.headers.host;
    delete config.headers['content-length'];
    delete config.headers['x-api-token']; // Remove our custom header
    
    const response = await axios(config);
    
    // Forward response
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    if (error.response) {
      console.error('Replicate API error response:', JSON.stringify(error.response.data, null, 2));
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Proxy error', message: error.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Replicate proxy server running on port ${PORT}`);
});