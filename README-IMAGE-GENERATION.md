# Bildgenerierung Setup

## Übersicht

Die Creative Writer App unterstützt jetzt AI-basierte Bildgenerierung über Replicate API. Das System verwendet einen Reverse Proxy, um CORS-Probleme zu lösen und die Replicate API sicher vom Frontend aus anzusprechen.

## Architektur

```
Browser -> Nginx (Port 3080) -> Replicate Proxy (Port 3001) -> Replicate API
```

- **Frontend**: Angular Service mit Ionic UI
- **Reverse Proxy**: Node.js Express Server 
- **Nginx**: Leitet `/api/replicate/*` an den Proxy weiter
- **Replicate API**: Externe AI Bildgenerierung

## Setup

### 1. Replicate API Token erstellen

1. Registriere dich bei [Replicate](https://replicate.com)
2. Gehe zu [API Tokens](https://replicate.com/account/api-tokens)
3. Erstelle einen neuen Token

### 2. Environment Variable setzen

Erstelle eine `.env` Datei im Projektverzeichnis:

```bash
REPLICATE_API_TOKEN=r8_your_token_here
```

### 3. Docker Container starten

```bash
docker-compose up -d
```

### 4. Nginx Konfiguration

Die nginx Konfiguration wird automatisch aus `nginx/nginx.conf` geladen und beinhaltet:

```nginx
# Replicate API Proxy
location /api/replicate/ {
    proxy_pass http://replicate-proxy/api/replicate/;
    # ... CORS headers und weitere Konfiguration
}
```

## Verwendung

1. Öffne die App unter `http://localhost:3080`
2. Klicke auf "Bildgenerierung" auf der Hauptseite
3. Wähle ein Modell (Standard: Unlimited XL)
4. Gib einen Prompt ein und passe Parameter an
5. Klicke "Bild Generieren"

## Unterstützte Modelle

### Unlimited XL (asiryan/unlimited-xl)
- **Beschreibung**: High-quality image generation model
- **Parameter**:
  - Prompt (Text)
  - Negative Prompt (Text)
  - Width/Height (256-2048px)
  - Inference Steps (1-50)
  - Guidance Scale (1-20)
  - Number of outputs (1-4)
  - Seed (optional)

## Neue Modelle hinzufügen

Um neue Modelle hinzuzufügen, erweitere das `models` Array in `src/app/shared/services/image-generation.service.ts`:

```typescript
{
  id: 'owner/model-name',
  name: 'Display Name',
  description: 'Model description',
  version: 'model_version_hash',
  owner: 'owner_name',
  inputs: [
    // Parameter definition
  ]
}
```

## Troubleshooting

### CORS Fehler
- Stelle sicher, dass nginx läuft und die Konfiguration korrekt ist
- Prüfe, ob der Replicate Proxy Container läuft: `docker logs creativewriter-replicate-proxy`

### API Token Fehler
- Vergewissere dich, dass `REPLICATE_API_TOKEN` in der `.env` Datei gesetzt ist
- Starte die Container neu: `docker-compose down && docker-compose up -d`

### Container läuft nicht
```bash
# Logs anzeigen
docker logs creativewriter-replicate-proxy

# Container manuell bauen
docker-compose build replicate-proxy
docker-compose up -d replicate-proxy
```

## Kosten

Beachte, dass die Replicate API kostenpflichtig ist. Die Kosten variieren je nach Modell:
- Unlimited XL: ~$0.0023 pro Bild
- Prüfe aktuelle Preise auf [Replicate](https://replicate.com/pricing)

## Sicherheit

- Der Replicate API Token wird nur im Backend verwendet
- Keine direkte Exposition des Tokens an das Frontend
- CORS ist ordnungsgemäß konfiguriert
- Alle Requests laufen über den sicheren Reverse Proxy