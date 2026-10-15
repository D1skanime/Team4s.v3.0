# Jellyfin-Timeout-Diagnose

## Zweck
Bietet einen wiederholbaren Triage-Pfad, wenn Operatoren `server nicht erreichbar` in Jellyfin-Admin-Abläufen sehen.

## Hinzugefügte Signale (2026-03-03)
Jellyfin-HTTP-Aufrufe geben bei Fehlern jetzt strukturierte Backend-Logs aus:
- `admin_content jellyfin_http: request failed (...)`
- `admin_content jellyfin_http: upstream status (...)`
- `admin_content jellyfin_http: read response failed (...)`
- `admin_content jellyfin_http: decode response failed (...)`

Erfasste Felder:
- `path`
- `elapsed_ms`
- `category` (`timeout`, `connectivity`, `transport`)

## Triage-Workflow
1. Fehlschlagende Admin-Aktion reproduzieren:
   - Suche, Vorschau, Sync oder Einzelepisoden-Sync
2. Backend-Logs auf `jellyfin_http`-Einträge prüfen.
3. Nach Kategorie klassifizieren:
   - `timeout`: Anfrage hat das erlaubte Zeitbudget überschritten
   - `connectivity`: Problem bei Host/DNS/Port/Erreichbarkeit
   - `transport`: sonstiger Fehler auf Anfrage-Ebene
4. Mit der Antwort-Payload korrelieren:
   - `error.code`
   - `error.details`
5. Gezielte Maßnahme ergreifen:
   - timeout: Last/Netzwerklatenz des Jellyfin-Servers prüfen
   - connectivity: Basis-URL, DNS, Routing, Firewall prüfen
   - Auth-Fehler (`401/403`): API-Key/Berechtigungen prüfen

## Schnelle Laufzeitprüfungen
```powershell
docker compose ps
Invoke-RestMethod -Method GET -Uri http://localhost:8092/health
docker compose exec -T team4sv30-backend ./migrate status
```

## Eskalations-Schwelle
Eskalieren, wenn eine der folgenden Bedingungen über mehrere Versuche hinweg bestehen bleibt:
- Kategorie `timeout` tritt für dieselbe Route/denselben Pfad konsistent auf.
- Kategorie `connectivity` tritt trotz bestätigter Netzwerkverfügbarkeit auf.

## Nächste Verbesserung
- Dedizierte Integrationsfixture für das Timeout-Verhalten hinzufügen, um die Regressionsabdeckung für das Diagnose-Mapping abzusichern.
