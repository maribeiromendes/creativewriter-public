const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

if (!REPLICATE_API_TOKEN) {
  console.error('REPLICATE_API_TOKEN environment variable is required');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Proxy all requests to Replicate
app.all('/api/replicate/*', async (req, res) => {
  try {
    const path = req.params[0];
    const url = `https://api.replicate.com/v1/${path}`;
    
    console.log(`Proxying ${req.method} request to: ${url}`);
    
    const config = {
      method: req.method,
      url,
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...req.headers,
      },
      data: req.body,
    };
    
    // Remove host header to avoid conflicts
    delete config.headers.host;
    delete config.headers['content-length'];
    
    const response = await axios(config);
    
    // Forward response
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Proxy error', message: error.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Replicate proxy server running on port ${PORT}`);
});