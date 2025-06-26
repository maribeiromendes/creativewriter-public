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
  try {
    const path = req.params[0];
    const url = `https://generativelanguage.googleapis.com/v1beta/${path}?key=${GEMINI_API_KEY}`;
    
    console.log(`Proxying ${req.method} request to: ${url.replace(GEMINI_API_KEY, '[REDACTED]')}`);
    
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