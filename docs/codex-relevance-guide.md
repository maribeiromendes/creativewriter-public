# Codex Relevance System Guide

## Überblick

Das neue Codex Relevance System optimiert die Beat-Generierung, indem es nur die relevantesten Codex-Einträge an die AI sendet. Dies reduziert Kosten und verbessert die Qualität der generierten Texte.

## Wie funktioniert es?

### 1. Automatische Relevanzbewertung

Das System analysiert automatisch:
- **Direkte Erwähnungen**: Namen und Aliase in Szenentext und Beat-Prompt
- **Schlüsselwörter**: Thematische Übereinstimmungen
- **Nähe zum Text**: Kürzlich erwähnte Einträge erhalten Bonus
- **Wichtigkeit**: Protagonisten und Hauptorte werden bevorzugt
- **Prompt-spezifische Relevanz**: Charaktere bei Dialog-Prompts, Orte bei Szenen-Beschreibungen

### 2. Kategorielimits

Pro Beat werden maximal einbezogen:
- **Charaktere**: 5 Einträge
- **Orte**: 3 Einträge  
- **Gegenstände**: 3 Einträge
- **Lore/Hintergrund**: 2 Einträge
- **Sonstiges**: 2 Einträge

### 3. Token-Optimierung

Das System respektiert ein Token-Limit (~1000 Tokens für Codex-Inhalt) und priorisiert:
1. Global markierte Einträge (immer eingeschlossen)
2. Hohe Relevanzbewertung
3. Wichtigkeitsstufe (Protagonist > Nebencharakter > Hintergrund)

## Konfiguration

### Globale Einträge

Markiere wichtige Einträge als "global", die immer an die AI gesendet werden sollen:
- Hauptcharakter/Protagonist
- Primärer Schauplatz
- Zentrale magische Objekte

### Aliase definieren

Füge Aliase zu Codex-Einträgen hinzu, um bessere Erkennung zu ermöglichen:
- **Emma Steinberg**: "Emma", "Dr. Steinberg", "die Archäologin"
- **Schloss Falkenstein**: "das Schloss", "die Burg", "Falkenstein"

### Schlüsselwörter

Verwende thematische Tags:
- **Charaktere**: Beruf, Persönlichkeitsmerkmale
- **Orte**: Atmosphäre, geografische Merkmale
- **Objekte**: Material, Funktion, magische Eigenschaften

## Best Practices

### Für Autoren

1. **Sparsam mit globalen Einträgen**: Nur wirklich essenzielle Informationen
2. **Gute Aliase verwenden**: Wie wird der Charakter/Ort im Text genannt?
3. **Wichtigkeitsstufen richtig setzen**:
   - **Major**: Protagonist, Antagonist, Hauptschauplätze
   - **Minor**: Nebencharaktere, wichtige Orte
   - **Background**: Statisten, unwichtige Details

### Für Beat-Prompts

Je spezifischer der Prompt, desto besser die Auswahl:
- ❌ "Schreibe weiter"
- ✅ "Emma findet das Amulett in der Bibliothek"
- ✅ "Dialog zwischen Emma und Professor Weber"

## Technische Details

### Relevanzbewertung

Das System berechnet für jeden Codex-Eintrag einen Score basierend auf:

```
Score = (Namens-Treffer × 1.0) + 
        (Alias-Treffer × 0.9) + 
        (Schlüsselwort-Treffer × 0.7) + 
        (Nähe-Bonus × 0.8) + 
        (Prompt-spezifische Relevanz)

Finaler Score = Score × Wichtigkeits-Multiplier
- Major: ×1.5
- Minor: ×1.0  
- Background: ×0.5
```

### Beispiel-Analyse

**Szenentext**: "Emma betritt das verlassene Schloss..."
**Beat-Prompt**: "Beschreibe Emmas Gefühle beim Erkunden"

**Ausgewählte Einträge**:
1. **Emma Steinberg** (Score: 3.5) - Name 2× erwähnt, Protagonist
2. **Das verlassene Schloss** (Score: 2.8) - Name erwähnt, Major Location
3. **Professor Weber** (Score: 0.7) - Mentor, aber nicht im Kontext

**Nicht ausgewählt**:
- **Dorfbewohner** (Score: 0.2) - Zu geringer Score, Background-Charakter

## Debugging

### Relevanz testen

Verwende die Codex Relevance Demo-Komponente um zu verstehen:
- Welche Einträge ausgewählt werden
- Warum bestimmte Scores vergeben werden
- Wie Token-Limits angewendet werden

### Häufige Probleme

1. **Wichtige Charaktere fehlen**: Aliase hinzufügen oder als global markieren
2. **Zu wenige Einträge**: Kategorielimits erhöhen oder Wichtigkeit anpassen
3. **Zu viele Token**: Codex-Inhalte kürzen oder mehr Background-Einträge verwenden

## Migration

### Bestehende Projekte

Das System ist rückwärtskompatibel:
- Bestehende Codex-Einträge funktionieren weiterhin
- Neue Features sind optional aktivierbar
- Graduelle Migration möglich

### Empfohlene Schritte

1. Aliase zu wichtigen Einträgen hinzufügen
2. Wichtigkeitsstufen korrekt setzen
3. 2-3 wichtigste Einträge als global markieren
4. Mit Relevanz-Demo testen und optimieren

## Erweiterte Features

### Mention Tracking (Experimentell)

Das System kann verfolgen:
- Wo Charaktere zuletzt erwähnt wurden
- Häufigkeit von Erwähnungen
- Automatische Relevanz-Anpassung

### Prompt-Pattern Erkennung

Spezielle Behandlung für:
- Dialog-Szenen (bevorzugt beteiligte Charaktere)
- Orts-Beschreibungen (bevorzugt Location-Einträge)  
- Action-Szenen (bevorzugt relevante Objekte)

## FAQ

**Q: Wird mein bestehender Codex gelöscht?**
A: Nein, alle Daten bleiben erhalten. Das System fügt nur neue Funktionen hinzu.

**Q: Kann ich das alte Verhalten wiederherstellen?**
A: Ja, markiere alle Einträge als "global" um das alte Verhalten zu simulieren.

**Q: Wie viele Token spart das System?**
A: Typischerweise 40-70% der Codex-Tokens, abhängig von der Projektgröße.

**Q: Funktioniert es mit allen AI-Providern?**
A: Ja, das System ist provider-unabhängig und funktioniert mit Google Gemini, OpenRouter, etc.