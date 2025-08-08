# Running Multiple CreativeWriter Instances

This guide explains how to run multiple instances of CreativeWriter on the same host (e.g., NAS).

## Quick Start - Single Instance

1. Copy `docker-compose.yml` and `.env.example` to your deployment directory
2. Rename `.env.example` to `.env` and configure:
   ```bash
   PORT=3080
   DATA_PATH=/share/Docker/creativewriter/data
   COUCHDB_PASSWORD=your_secure_password
   COUCHDB_SECRET=your_secure_secret
   ```
3. Run: `docker compose up -d`
4. Access at: `http://your-nas:3080`

## Running Multiple Instances

### Method 1: Using Docker Compose Project Names (Recommended)

Create separate directories for each instance:

```bash
# Instance 1 - Personal Writing
mkdir -p /share/Docker/creativewriter-personal
cd /share/Docker/creativewriter-personal
# Copy docker-compose.yml here
# Create .env with:
#   PORT=3080
#   DATA_PATH=/share/Docker/creativewriter-personal/data
docker compose -p writer-personal up -d

# Instance 2 - Work Projects  
mkdir -p /share/Docker/creativewriter-work
cd /share/Docker/creativewriter-work
# Copy docker-compose.yml here
# Create .env with:
#   PORT=3081
#   DATA_PATH=/share/Docker/creativewriter-work/data
docker compose -p writer-work up -d
```

### Method 2: Using Different Compose Files

Create multiple compose files with different names:
- `docker-compose-personal.yml`
- `docker-compose-work.yml`

Each with unique:
- Port mappings
- Volume paths
- Network names (optional)

### Container Naming

With `container_name` removed from docker-compose.yml, Docker Compose automatically creates unique names:
- Project "writer-personal": `writer-personal-nginx-1`, `writer-personal-couchdb-1`, etc.
- Project "writer-work": `writer-work-nginx-1`, `writer-work-couchdb-1`, etc.

## Environment Variables

### Required for Each Instance
- `PORT`: Unique port for each instance (3080, 3081, 3082, etc.)
- `DATA_PATH`: Separate data directory for each instance
- `COUCHDB_PASSWORD`: Unique password for each CouchDB instance
- `COUCHDB_SECRET`: Unique secret for each CouchDB instance

### Optional
- `TZ`: Timezone (default: Europe/Berlin)
- `COUCHDB_USER`: CouchDB admin user (default: admin)
- `REPLICATE_API_TOKEN`: Only if using Replicate proxy for image generation
- `GEMINI_API_KEY`: Only if using Gemini proxy

## Managing Instances

### View running instances
```bash
docker compose -p writer-personal ps
docker compose -p writer-work ps
```

### Stop an instance
```bash
docker compose -p writer-personal down
```

### Update an instance
```bash
docker compose -p writer-personal pull
docker compose -p writer-personal up -d
```

### View logs
```bash
docker compose -p writer-personal logs -f
```

## Data Isolation

Each instance has completely separate:
- CouchDB database
- User accounts and settings  
- Stories and content
- Uploaded images
- API configurations

## Network Isolation (Optional)

By default, all instances use separate networks. If you need instances to communicate, you can use external networks in docker-compose.yml.

## Resource Considerations

Each instance runs:
- 1x Nginx reverse proxy
- 1x Angular application
- 1x CouchDB database
- 2x API proxies (if enabled)

Plan resources accordingly:
- RAM: ~500MB-1GB per instance
- Storage: Depends on content, start with 5-10GB per instance
- CPU: Minimal, scales with usage

## Backup

Backup each instance's data directory separately:
```bash
# Stop instance before backup
docker compose -p writer-personal down

# Backup data
tar -czf writer-personal-backup-$(date +%Y%m%d).tar.gz /share/Docker/creativewriter-personal/data

# Restart instance
docker compose -p writer-personal up -d
```

## Troubleshooting

### Port conflicts
Ensure each instance uses a unique PORT in its .env file.

### Container name conflicts
This shouldn't happen with project names, but if it does, ensure you're using unique project names with `-p`.

### Network issues
Check that service names in nginx.conf match docker-compose.yml service names (not container names).

### Database connection issues
Each instance needs its own CouchDB with unique credentials.