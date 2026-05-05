---
task_id: 260423qpn
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/internal/config/config.go
  - backend/internal/handlers/jellyfin_client.go
  - .env.example
autonomous: true
requirements: []

must_haves:
  truths:
    - "Wenn JELLYFIN_ALLOWED_LIBRARY_IDS nicht gesetzt ist, verhält sich die App exakt wie vorher"
    - "Wenn JELLYFIN_ALLOWED_LIBRARY_IDS gesetzt ist, liefern searchJellyfinSeries und listJellyfinEpisodes nur Treffer aus den angegebenen Bibliotheken"
    - "Duplikate (selbe ID aus mehreren Bibliotheks-Requests) werden dedupliziert"
  artifacts:
    - path: "backend/internal/config/config.go"
      provides: "JellyfinAllowedLibraryIDs []string Feld und Parsing"
    - path: "backend/internal/handlers/jellyfin_client.go"
      provides: "Bibliotheksfilterung in searchJellyfinSeries und listJellyfinEpisodes"
    - path: ".env.example"
      provides: "Optionalen Kommentareintrag JELLYFIN_ALLOWED_LIBRARY_IDS="
  key_links:
    - from: "config.go"
      to: "jellyfin_client.go"
      via: "h.cfg.JellyfinAllowedLibraryIDs (AdminContentHandler trägt Config)"
      pattern: "JellyfinAllowedLibraryIDs"
---

<objective>
Optionale Filterung von Jellyfin-Suchergebnissen auf konfigurierte Bibliotheks-IDs.

Purpose: Admins mit mehreren Jellyfin-Bibliotheken (z. B. Anime + Live-Action) sollen Suchergebnisse auf relevante Bibliotheken einschränken können, ohne Code-Änderungen.
Output: config.go mit neuem Feld, jellyfin_client.go mit gefilterten Queries, .env.example mit Hinweis-Eintrag.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@backend/internal/config/config.go
@backend/internal/handlers/jellyfin_client.go
@.env.example
</context>

<tasks>

<task type="auto">
  <name>Task 1: JellyfinAllowedLibraryIDs in config.go ergänzen</name>
  <files>backend/internal/config/config.go</files>
  <action>
Zwei Änderungen in config.go:

1. Neues Feld im Config-Struct nach JellyfinStreamPathTemplate einfügen:
   ```go
   JellyfinAllowedLibraryIDs []string // Optionale Whitelist von Jellyfin-Bibliotheks-IDs (JELLYFIN_ALLOWED_LIBRARY_IDS, kommagetrennt)
   ```

2. In der Load()-Funktion nach der JellyfinStreamPathTemplate-Zeile befüllen:
   ```go
   JellyfinAllowedLibraryIDs: getEnvStringList("JELLYFIN_ALLOWED_LIBRARY_IDS"),
   ```

3. Neue Hilfsfunktion getEnvStringList am Ende der Datei einfügen (nach getEnvInt64List, gleiche Struktur):
   ```go
   // getEnvStringList parst eine kommagetrennte Umgebungsvariable als String-Slice.
   // Leerstrings und Einträge, die nur Whitespace enthalten, werden übersprungen.
   // Gibt nil zurück wenn die Variable nicht gesetzt oder leer ist.
   func getEnvStringList(key string) []string {
       value := strings.TrimSpace(os.Getenv(key))
       if value == "" {
           return nil
       }
       parts := strings.Split(value, ",")
       items := make([]string, 0, len(parts))
       for _, part := range parts {
           trimmed := strings.TrimSpace(part)
           if trimmed != "" {
               items = append(items, trimmed)
           }
       }
       if len(items) == 0 {
           return nil
       }
       return items
   }
   ```

Keine Duplikat-Deduplizierung nötig hier — IDs sind frei wählbare Strings ohne numerische Validierung. Nil (nicht gesetzt) ist semantisch "kein Filter", leeres Slice käme nicht vor wegen der nil-Rückgabe.
  </action>
  <verify>
    <automated>cd /c/Users/admin/Documents/Team4s/backend && go build ./internal/config/...</automated>
  </verify>
  <done>go build schlägt nicht fehl, JellyfinAllowedLibraryIDs ist im Struct und wird aus der Env-Var befüllt.</done>
</task>

<task type="auto">
  <name>Task 2: Bibliotheksfilterung in jellyfin_client.go</name>
  <files>backend/internal/handlers/jellyfin_client.go</files>
  <action>
Zwei Funktionen anpassen. Die Config-Felder sind über h.cfg erreichbar (AdminContentHandler hat bereits ein cfg-Feld; falls der Zugriff anders heißt, grep nach `jellyfinBaseURL` — das Feld daneben ist cfg oder analog direkt gesetzt).

**Vorab prüfen wie AllowedLibraryIDs erreichbar ist:**
`grep -n "jellyfinBaseURL\|jellyfinAPIKey\|cfg\b" backend/internal/handlers/jellyfin_client.go backend/internal/handlers/admin_content_handler.go 2>/dev/null | head -30`

Die Felder h.jellyfinBaseURL und h.jellyfinAPIKey sind direkte Handler-Felder (keine cfg-Wrapper). Das neue Feld muss entsprechend als `h.jellyfinAllowedLibraryIDs []string` im Handler-Struct ergänzt werden — ODER es wird direkt aus cfg übergeben. Prüfe admin_content_handler.go (oder wo AdminContentHandler definiert ist) um zu sehen ob cfg existiert oder ob jedes Feld einzeln gesetzt ist. Passe die Implementierung entsprechend an.

**searchJellyfinSeries anpassen:**

Aktuell: eine einzelne `/Items`-Anfrage ohne ParentId.

Neue Logik — nach dem `values.Set("Fields", ...)` Block:

```go
allowedIDs := h.jellyfinAllowedLibraryIDs // oder h.cfg.JellyfinAllowedLibraryIDs

if len(allowedIDs) == 0 {
    // Bestehende Logik unverändert: eine globale Anfrage
    var payload jellyfinSeriesListResponse
    if _, err := h.fetchJellyfinJSON(ctx, "/Items", values, &payload); err != nil {
        return nil, err
    }
    items := make([]jellyfinSeriesItem, 0, len(payload.Items))
    for _, item := range payload.Items {
        if strings.TrimSpace(item.ID) == "" {
            continue
        }
        items = append(items, item)
    }
    return items, nil
}

// Gefilterte Logik: pro Bibliotheks-ID eine separate Anfrage, Ergebnisse dedupliziert zusammenführen
seen := make(map[string]struct{})
var allItems []jellyfinSeriesItem
for _, libraryID := range allowedIDs {
    libValues := url.Values{}
    for k, v := range values {
        libValues[k] = v
    }
    libValues.Set("ParentId", libraryID)
    var payload jellyfinSeriesListResponse
    if _, err := h.fetchJellyfinJSON(ctx, "/Items", libValues, &payload); err != nil {
        return nil, err
    }
    for _, item := range payload.Items {
        itemID := strings.TrimSpace(item.ID)
        if itemID == "" {
            continue
        }
        if _, exists := seen[itemID]; exists {
            continue
        }
        seen[itemID] = struct{}{}
        allItems = append(allItems, item)
    }
}
return allItems, nil
```

**listJellyfinEpisodes anpassen:**

listJellyfinEpisodes ruft `/Shows/{seriesID}/Episodes` auf — dieser Endpunkt ist serien-gebunden, nicht bibliotheks-gebunden. Eine Bibliotheksfilterung macht hier semantisch keinen Sinn (Episoden gehören immer zu einer bestimmten Serie). Diese Funktion bleibt unverändert.

Hinweis: Die Spec nennt listJellyfinEpisodes, aber da der Endpunkt `/Shows/{id}/Episodes` keinen ParentId-Parameter sinnvoll nutzt, reicht die Filterung in searchJellyfinSeries — dort werden nur Serien aus erlaubten Bibliotheken gefunden, und nachfolgende Episode-Lookups arbeiten dann automatisch nur auf diesen Serien.

**Handler-Struct und Konstruktor:**

Wenn `jellyfinAllowedLibraryIDs` als direktes Handler-Feld nötig ist (analog zu jellyfinBaseURL), füge es im Struct und im Konstruktor ein, befüllt aus cfg.JellyfinAllowedLibraryIDs.
  </action>
  <verify>
    <automated>cd /c/Users/admin/Documents/Team4s/backend && go build ./...</automated>
  </verify>
  <done>go build ./... läuft fehlerfrei durch. searchJellyfinSeries iteriert über AllowedLibraryIDs wenn gesetzt, fällt sonst auf bestehende Logik zurück.</done>
</task>

<task type="auto">
  <name>Task 3: .env.example Eintrag ergänzen</name>
  <files>.env.example</files>
  <action>
Nach dem Block mit JELLYFIN_STREAM_PATH_TEMPLATE einen neuen optionalen Eintrag einfügen:

```
# Optional: comma-separated Jellyfin library IDs to restrict anime search to specific libraries.
# Leave empty to search across all libraries.
# JELLYFIN_ALLOWED_LIBRARY_IDS=
```

Der Block soll direkt nach `JELLYFIN_STREAM_PATH_TEMPLATE=/Videos/%s/stream` stehen (Zeile 17 in der aktuellen Datei), sodass alle Jellyfin-Einträge beieinander bleiben.
  </action>
  <verify>
    <automated>grep -n "JELLYFIN_ALLOWED_LIBRARY_IDS" /c/Users/admin/Documents/Team4s/.env.example</automated>
  </verify>
  <done>grep findet den Eintrag, er steht im Jellyfin-Block, ist auskommentiert.</done>
</task>

</tasks>

<verification>
Nach allen drei Tasks:

```bash
cd /c/Users/admin/Documents/Team4s/backend && go build ./...
```

Muss fehlerfrei laufen. Kein bestehender Test darf brechen:

```bash
cd /c/Users/admin/Documents/Team4s/backend && go test ./...
```

Rauchtest ohne gesetzte Variable (Rückwärtskompatibilität): Server startet normal, Jellyfin-Suche funktioniert wie zuvor.
</verification>

<success_criteria>
- go build ./... in backend/ ist fehlerfrei
- go test ./... in backend/ zeigt keine neuen Fehler
- JELLYFIN_ALLOWED_LIBRARY_IDS nicht gesetzt → searchJellyfinSeries macht eine globale /Items-Anfrage (bestehende Logik)
- JELLYFIN_ALLOWED_LIBRARY_IDS=lib1,lib2 → searchJellyfinSeries macht zwei /Items-Anfragen je mit ParentId, dedupliziert Ergebnisse
- .env.example enthält auskommentierten Hinweiseintrag im Jellyfin-Block
</success_criteria>

<output>
Kein SUMMARY.md erforderlich — Quick Task, kein Phase-Plan.
</output>
