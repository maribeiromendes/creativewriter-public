# Troubleshooting Guide: 404 Error on /api/replicate/predictions

Diese Anleitung hilft beim Debuggen von 404 Fehlern beim Zugriff auf die Replicate API über den Nginx Reverse Proxy.

## 1. Container Status prüfen

Stelle sicher, dass alle notwendigen Container laufen:

```bash
# Alle laufenden Container anzeigen
docker ps

# Spezifisch nach dem Proxy Container suchen
docker ps | grep nginx-proxy
```

**Erwartete Ausgabe:** Der nginx-proxy Container sollte im Status "Up" sein.

## 2. Proxy Container Logs prüfen

Überprüfe die Logs des Nginx Proxy Containers:

```bash
# Letzte 50 Zeilen der Logs anzeigen
docker logs nginx-proxy --tail 50

# Logs in Echtzeit verfolgen
docker logs -f nginx-proxy

# Nach spezifischen Fehlern suchen
docker logs nginx-proxy 2>&1 | grep -E "(error|404|replicate)"
```

**Worauf zu achten ist:**
- Connection refused Fehler
- 404 Not Found Meldungen
- Upstream Fehler
- Configuration Fehler

## 3. Nginx Configuration reload

Falls die Konfiguration geändert wurde:

```bash
# Nginx Konfiguration neu laden (ohne Container Neustart)
docker exec nginx-proxy nginx -s reload

# Nginx Konfiguration testen
docker exec nginx-proxy nginx -t

# Container komplett neu starten
docker restart nginx-proxy
```

## 4. Test-Curl Befehle

Teste die API Endpoints direkt:

```bash
# Test vom Host System aus
curl -v http://localhost/api/replicate/predictions

# Test mit Headers
curl -X POST http://localhost/api/replicate/predictions \
  -H "Content-Type: application/json" \
  -d '{"version": "test", "input": {"prompt": "test"}}' \
  -v

# Test der Backend-Verbindung direkt (ohne Proxy)
curl -v http://localhost:3001/api/replicate/predictions

# Test innerhalb des Docker Netzwerks
docker exec nginx-proxy curl -v http://backend:3001/api/replicate/predictions
```

## 5. Troubleshooting für fehlende Images

### 5.1 Überprüfe Docker Images

```bash
# Alle verfügbaren Images anzeigen
docker images

# Nach spezifischen Images suchen
docker images | grep -E "(nginx|backend|creativewriter)"
```

### 5.2 Container und Images neu erstellen

Falls Images fehlen oder veraltet sind:

```bash
# Stoppe alle Container
docker-compose down

# Entferne alte Images (optional)
docker-compose down --rmi all

# Baue Images neu und starte Container
docker-compose up --build -d

# Oder nur den Proxy neu bauen
docker-compose build nginx-proxy
docker-compose up -d nginx-proxy
```

### 5.3 Docker Compose Status prüfen

```bash
# Status aller Services anzeigen
docker-compose ps

# Logs aller Services
docker-compose logs

# Logs eines spezifischen Services
docker-compose logs nginx-proxy
docker-compose logs backend
```

## 6. Zusätzliche Debugging-Schritte

### 6.1 Netzwerk-Konnektivität prüfen

```bash
# Docker Netzwerke anzeigen
docker network ls

# Inspect des Projekt-Netzwerks
docker network inspect creativewriter2_default

# Teste Verbindung zwischen Containern
docker exec nginx-proxy ping backend
```

### 6.2 Nginx Konfiguration inspizieren

```bash
# Aktuelle Nginx Konfiguration anzeigen
docker exec nginx-proxy cat /etc/nginx/nginx.conf

# Site-spezifische Konfiguration prüfen
docker exec nginx-proxy cat /etc/nginx/conf.d/default.conf
```

### 6.3 Backend Service prüfen

```bash
# Backend Container Logs
docker logs backend --tail 50

# Backend Health Check
docker exec backend curl -v http://localhost:3001/health

# Prozesse im Backend Container
docker exec backend ps aux
```

## 7. Häufige Fehlerursachen und Lösungen

### Problem: "502 Bad Gateway"
**Ursache:** Backend Service nicht erreichbar
**Lösung:** 
```bash
docker-compose restart backend
docker-compose logs backend
```

### Problem: "404 Not Found"
**Ursache:** Route nicht konfiguriert oder falscher Pfad
**Lösung:**
- Überprüfe nginx.conf für korrekte location Blöcke
- Stelle sicher, dass Backend die Route implementiert hat

### Problem: "Connection refused"
**Ursache:** Service läuft nicht oder falscher Port
**Lösung:**
```bash
docker-compose ps  # Status prüfen
docker-compose up -d  # Services starten
```

## 8. Vollständiger Reset (Last Resort)

Falls nichts funktioniert:

```bash
# Alles stoppen und entfernen
docker-compose down -v --remove-orphans

# Docker Cache leeren
docker system prune -a --volumes

# Neu bauen und starten
docker-compose build --no-cache
docker-compose up -d

# Logs beobachten
docker-compose logs -f
```

## 9. Monitoring Commands

Für kontinuierliches Monitoring:

```bash
# Watch Container Status
watch -n 2 'docker ps'

# Monitor Nginx Access Logs
docker exec nginx-proxy tail -f /var/log/nginx/access.log

# Monitor Nginx Error Logs
docker exec nginx-proxy tail -f /var/log/nginx/error.log
```

## Wichtige Dateien zum Überprüfen

1. `docker-compose.yml` - Service Definitionen
2. `nginx/nginx.conf` oder `nginx/default.conf` - Proxy Konfiguration
3. Backend API Route Definitionen
4. `.env` Dateien für Umgebungsvariablen

Bei anhaltenden Problemen, sammle die Ausgaben aller obigen Befehle und erstelle einen detaillierten Fehlerbericht.