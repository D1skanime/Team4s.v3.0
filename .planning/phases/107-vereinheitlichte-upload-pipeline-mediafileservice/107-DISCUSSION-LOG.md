# Phase 107: Vereinheitlichte Upload-Pipeline (MediaFileService) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-21
**Phase:** 107-vereinheitlichte-upload-pipeline-mediafileservice
**Areas discussed:** Übergang Phase 107 → 108, Deduplizierung und Uploader-Credit, Fehler/Rollback/Wiederaufnahme, Varianten und Upload-Grenzen

---

## Übergang Phase 107 → 108

### Funktionsfähiger Stand nach Phase 107

| Option | Description | Selected |
|--------|-------------|----------|
| Temporärer Kompatibilitätsadapter | Alle sechs Uploads verwenden sofort den neuen Kern; ein enger Adapter hält alte Relationspfade ohne doppelte Dateiverarbeitung funktionsfähig. | ✓ |
| Umschaltung erst in Phase 108 | Phase 107 baut nur den Service; die Upload-Flächen bleiben bis Phase 108 vollständig auf dem alten Pfad. | |
| Relationsminimum vorziehen | Teile des für Phase 108 geplanten Relationsmodells werden bereits in Phase 107 umgesetzt. | |

**User's choice:** Temporärer Kompatibilitätsadapter.
**Notes:** Die Phasengrenze 107/108 soll bestehen bleiben, aber nach 107 müssen die realen Upload-Flows weiterhin funktionieren.

### Fehlersemantik des Adapters

| Option | Description | Selected |
|--------|-------------|----------|
| Alles oder nichts | Neuer Medienkern und alter Relationspfad müssen gemeinsam erfolgreich sein; andernfalls werden DB und Dateien bereinigt. | ✓ |
| Neuer Medienkern ist führend | Das neue Medium bleibt bei einem Fehler im alten Relationspfad bestehen und kann später repariert werden. | |
| Konfigurierbare Umschaltung | Der Betreiber entscheidet per Konfiguration, welcher Pfad führend ist. | |

**User's choice:** Alles oder nichts.
**Notes:** Für Nutzer darf kein scheinbar erfolgreicher, aber fachlich nicht zugeordneter Upload entstehen.

### Reihenfolge der sechs Upload-Einstiege

| Option | Description | Selected |
|--------|-------------|----------|
| Inkrementell innerhalb Phase 107 | Service zuerst, danach jeden Einstieg separat migrieren und testen; am Ende sind alle sechs umgestellt. | ✓ |
| Ein großer Schnitt | Alle Upload-Einstiege werden gemeinsam in einem umfangreichen Umbau migriert. | |
| Nur Pilot-Upload | Phase 107 migriert zunächst einen Pfad; der Rest folgt in späteren Phasen. | |

**User's choice:** Inkrementell, aber innerhalb derselben Phase vollständig.
**Notes:** Jeder Zwischenstand soll funktionsfähig bleiben.

### Lebensdauer des Adapters

| Option | Description | Selected |
|--------|-------------|----------|
| Verpflichtend in Phase 108 entfernen | Übergangscode wird markiert und ein Gate verhindert verbleibende Legacy-Schreibzugriffe. | ✓ |
| Bis Phase 110 behalten | Adapter bleibt bis zum Reset-/E2E-Abschluss aktiv. | |
| Dauerhafter Fallback | Adapter bleibt als Rückfallpfad im Produktionscode. | |

**User's choice:** Verpflichtend in Phase 108 entfernen.
**Notes:** Der Adapter darf nicht zu einer dauerhaften zweiten Architektur werden.

---

## Deduplizierung und Uploader-Credit

### Eigentümer bei gleichem Dateiinhalt

| Option | Description | Selected |
|--------|-------------|----------|
| Erster Uploader bleibt Eigentümer | `media.owner_user_id` bleibt stabil; spätere Nutzer erhalten Credit an ihrer konkreten Verwendung. | ✓ |
| Medium wird neutral | Bei Mehrfachnutzung verliert das globale Medium die persönliche Eigentümerzuordnung. | |
| Eigenes Medium je Uploader | Gleiche Bytes erzeugen für unterschiedliche Nutzer getrennte Medienzeilen. | |

**User's choice:** Erster Uploader bleibt globaler Eigentümer.
**Notes:** Spätere Beiträge müssen trotzdem über `relation.added_by_user_id` sichtbar bleiben.

### Wiederholter Upload

| Option | Description | Selected |
|--------|-------------|----------|
| Idempotent nach Kontext und Slot | Medium wird wiederverwendet; eine identische Verwendung wird nicht dupliziert und antwortet mit `reused=true`. | ✓ |
| Relation immer neu anlegen | Medium wird wiederverwendet, aber jeder Request erzeugt eine neue Relation. | |
| Duplikat ablehnen | Ein Wiederholungsversuch endet als Konflikt. | |

**User's choice:** Idempotent nach Kontext und Slot.
**Notes:** Andere Kontexte oder Slots dürfen dasselbe Medium verwenden.

### Metadaten bei Wiederverwendung

| Option | Description | Selected |
|--------|-------------|----------|
| Erster Upload maßgeblich | Globale Metadaten werden nicht automatisch überschrieben; Änderungen benötigen eine berechtigte Bearbeitung. | ✓ |
| Spätester Upload gewinnt | Jeder neue Upload darf Eigentümer- und Quellenmetadaten ersetzen. | |
| Leere Felder ergänzen | Spätere Uploads dürfen nur bisher leere globale Felder auffüllen. | |

**User's choice:** Erster Upload bleibt maßgeblich.
**Notes:** Nach einer versehentlichen Eingabe `q` wurde die Frage erneut geklärt und Option 1 bestätigt.

### Reichweite der Deduplizierung

| Option | Description | Selected |
|--------|-------------|----------|
| Global über alle Quellen | Gleiche gespeicherte Bytes sollen langfristig über Upload, Jellyfin und Provider dieselbe Medienidentität besitzen. | ✓ |
| Nur manuelle Uploads | Deduplizierung bleibt auf Browser-/Admin-Uploads begrenzt. | |
| Getrennt pro Quelle | Jede Quelle besitzt einen eigenen Hash-Namensraum. | |

**User's choice:** Global über alle Quellen.
**Notes:** Phase 107 implementiert zunächst die Upload-Seite; Provider werden später an denselben Kern angeschlossen.

---

## Fehler, Rollback und Wiederaufnahme

### Zustand nach fehlgeschlagenem Upload

| Option | Description | Selected |
|--------|-------------|----------|
| Keine Medienreste | Dateien und Nutzdatenzeilen werden bereinigt; Audit und Logs behalten die Diagnose. | ✓ |
| Fehlgeschlagenes Medium behalten | Eine `failed`-Medienzeile bleibt für spätere Reparatur sichtbar. | |
| Hybrid | Bestimmte Fehler bleiben bestehen, andere werden bereinigt. | |

**User's choice:** Keine Medienreste.
**Notes:** Ein Upload gilt erst nach Original, Varianten, neuen DB-Daten und Adapter als erfolgreich.

### Prozessabsturz zwischen Dateisystem und DB

| Option | Description | Selected |
|--------|-------------|----------|
| Staging plus automatische Bereinigung | Nicht öffentlich vorverarbeiten, nach Erfolg atomar verschieben und alte Staging-Reste kontrolliert entfernen. | ✓ |
| Nur unmittelbare Fehlerbereinigung | Keine spätere Aufräumroutine; Cleanup nur im Request-Prozess. | |
| Direkt in Zielpfad | Upload und Verarbeitung erfolgen sofort im endgültigen Storage-Pfad. | |

**User's choice:** Staging plus automatische Bereinigung.
**Notes:** Die Aufräumlogik soll klein, kontrolliert und projektowned bleiben.

### Ungültige Datei im Mehrfach-Upload

| Option | Description | Selected |
|--------|-------------|----------|
| Pro Datei atomar | Gültige Dateien bleiben erfolgreich; nur die ungültige Datei wird vollständig zurückgerollt. | ✓ |
| Gesamter Stapel atomar | Eine ungültige Datei rollt alle Dateien des Requests zurück. | |
| Beim ersten Fehler abbrechen | Bereits verarbeitete Dateien bleiben, spätere werden nicht mehr geprüft. | |

**User's choice:** Jede Datei ist einzeln atomar.
**Notes:** Die Antwort muss den Status jeder Datei ausweisen.

### Wiederholung nach verlorener Antwort

| Option | Description | Selected |
|--------|-------------|----------|
| Automatisch per Hash wiederaufnehmen | Bestehendes Medium und identische Relation werden wiederverwendet; Antwort ist Erfolg mit `reused=true`. | ✓ |
| Zusätzlicher Idempotency-Key | Der Client muss einen separaten Schlüssel erzeugen und wiederverwenden. | |
| Konflikt melden | Wiederholung endet mit einem Duplicate-/Conflict-Fehler. | |

**User's choice:** Automatisch über den Hash wiederaufnehmen.
**Notes:** Der normale Wiederholungsfall soll keine spezielle Nutzeraktion benötigen.

---

## Varianten und Upload-Grenzen

### Grenzwerte je Medienart

| Option | Description | Selected |
|--------|-------------|----------|
| Gemeinsamer Kern mit Profilen | Einheitlicher Prüfkern, aber zentrale Bild-, Video- und Audio-Profile mit passenden Limits und MIME-Typen. | ✓ |
| Ein Limit für alles | Bilder, Video und Audio teilen exakt dieselben Größen- und Strukturgrenzen. | |
| Limits je Oberfläche | Jeder Upload-Handler behält eigene Regeln. | |

**User's choice:** Ein gemeinsamer Prüfkern mit Profilen pro Medienart.
**Notes:** Für Bilder wurden 15 MB, 8000 × 8000, 40 MP und maximal 300 GIF-Frames festgelegt.

### Bedeutung von `original`

| Option | Description | Selected |
|--------|-------------|----------|
| Sicher und visuell unverändert | Keine Skalierung oder Formatänderung; Animation und Transparenz bleiben, sensible Metadaten werden entfernt. | ✓ |
| Exakte Eingangsbytes | Die hochgeladenen Bytes werden ohne Sanitizing gespeichert und gehasht. | |
| Normalisierte Originalvariante | Auch das Original wird in ein Standardformat konvertiert oder skaliert. | |

**User's choice:** Sicheres, visuell unverändertes Original.
**Notes:** Der Hash wird aus der tatsächlich gespeicherten, bereinigten Datei berechnet.

### Animation und Transparenz

| Option | Description | Selected |
|--------|-------------|----------|
| Nur statische Varianten | Thumbnail und Preview verwenden jeweils ein einzelnes Standbild. | |
| Animierte Preview | Thumbnail ist statisch; Preview bewahrt die vollständige GIF-Animation; Alpha bleibt erhalten. | ✓ |
| Quellformat für alle Varianten | Jede Variante behält stets Format und Animation der Quelle. | |

**User's choice:** Animierte Preview.
**Notes:** Die größere Ansicht soll Animation zeigen, ohne das kleine Thumbnail unnötig teuer zu machen.

### Varianten je Medienart

| Option | Description | Selected |
|--------|-------------|----------|
| Nur sinnvolle Varianten | Bild: original/thumbnail/preview; Video: original plus Vorschaubilder; Audio: nur original. | ✓ |
| Immer drei Zeilen | Jede Medienart erhält unabhängig vom Nutzen original/thumbnail/preview. | |
| Nur Bild und Video in Phase 107 | Audio bleibt auf der alten Upload-Pipeline. | |

**User's choice:** Nur technisch sinnvolle Varianten erzeugen.
**Notes:** Keine leeren Variantenzeilen und keine nutzlosen Dateikopien.

---

## Agent's Discretion

- Interne Paket- und Dateiaufteilung unter Beachtung der vorhandenen Services, Repositories und des 450-Zeilen-Limits.
- Konkrete zentrale Video-/Audio-Grenzwerte und MIME-Whitelists, ohne bestehende strengere Sicherheitsgrenzen still zu lockern.
- Konkrete Abmessungen und Encoder-Einstellungen der Varianten innerhalb der festgelegten Animations-/Transparenzregeln.
- Audit-Ereignisnamen und maschinenlesbare Fehlercodes im bestehenden Projektstil.

## Deferred Ideas

- Endgültiges Relations- und Berechtigungsmodell sowie Entfernung des Adapters: Phase 108.
- Frontend-Vertragsumstellung: Phase 109.
- Reset, Seeds und vollständiger E2E-Nachweis: Phase 110.
- Providerseitige Nutzung der globalen Hash-Deduplizierung: spätere zuständige Provider-/Folgephase.
- Neun automatisch gefundene UI-, Profil-, Credits-, Review-, Kollaborations- und Badge-Todos wurden geprüft und nicht in Phase 107 aufgenommen.
