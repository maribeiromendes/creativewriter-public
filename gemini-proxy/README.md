# Gemini Proxy Server

A Node.js proxy server that forwards requests to the Google Gemini API with support for real-time streaming.

## Features

- **Full API Proxy**: Forwards all requests to Google Gemini API
- **Real SSE Streaming**: Supports Server-Sent Events for streaming responses
- **Non-Streaming Fallback**: Handles regular requests with axios
- **CORS Support**: Configured for cross-origin requests
- **Large Payloads**: Supports up to 50MB request bodies

## Requirements

- Node.js 14+ (Node.js 18+ recommended for native fetch support)
- Google Gemini API Key

## Installation

```bash
npm install
```

## Configuration

Set your Gemini API key as an environment variable:

```bash
export GEMINI_API_KEY=your_api_key_here
```

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server runs on port 3002 by default. You can change this with the `PORT` environment variable.

## API Endpoints

- **Health Check**: `GET /health`
- **Gemini API Proxy**: `/api/gemini/*` - All requests are forwarded to `https://generativelanguage.googleapis.com/v1beta/`

## Streaming Support

The proxy automatically detects streaming requests when:
1. The URL contains `streamGenerateContent`
2. The query parameter `alt=sse` is present

For streaming requests, the proxy:
- Uses native fetch API for true streaming support
- Sets proper SSE headers (`text/event-stream`)
- Streams chunks directly without buffering
- Handles client disconnections gracefully

## Example Usage

### Non-Streaming Request
```javascript
POST /api/gemini/models/gemini-1.5-flash:generateContent
```

### Streaming Request
```javascript
POST /api/gemini/models/gemini-1.5-flash:streamGenerateContent?alt=sse
```

## Implementation Details

The server uses:
- **Express.js** for the web framework
- **node-fetch** for streaming support
- **axios** for non-streaming requests
- **cors** for CORS handling

The streaming implementation reads chunks from the Gemini API response and immediately writes them to the client, enabling real-time text generation display.