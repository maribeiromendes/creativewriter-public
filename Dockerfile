# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci --prefer-offline --no-audit

# Copy source code (separate layer for better caching)
COPY src/ ./src/
COPY angular.json tsconfig*.json ./
COPY public/ ./public/ 2>/dev/null || true

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application from build stage
COPY --from=build /app/dist/creativewriter2 /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]