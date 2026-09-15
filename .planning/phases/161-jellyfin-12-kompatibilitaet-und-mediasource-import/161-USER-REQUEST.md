# GSD-Auftrag: Jellyfin 12 Kompatibilität, Authentifizierung und MediaSource-Import

## Ausgangslage

Team4s kommuniziert serverseitig mit Jellyfin. Seit dem Wechsel auf Jellyfin 12 schlagen bestimmte Requests fehl.

Ein konkreter Fehler ist bereits reproduziert:

Aktuell wird in

`backend/internal/handlers/jellyfin_client.go`

unter anderem der Jellyfin API-Key als URL-Parameter gesetzt:

```go
values.Set("api_key", apiKey)
```

Auf dem aktuellen Jellyfin-12-Server wurde mit demselben API-Key und demselben Endpoint gemessen:

* Übergabe per `api_key` URL-Parameter → **HTTP 401**
* Übergabe per Header

```http
Authorization: MediaBrowser Token="<apiKey>"
```

→ **HTTP 200**

Jellyfin 12 deaktiviert Legacy-Authentifizierungsverfahren standardmäßig.

Wichtig: Es existieren in Team4s mehrere Stellen mit `api_key`. Nicht jede davon gehört zu Jellyfin. Beispielsweise verwendet auch die separate Fanart-Anbindung diesen Parameternamen.

Daher ist **kein globales Suchen-und-Ersetzen erlaubt**.

---

# Ziel der Phase

Team4s soll hinsichtlich der tatsächlich verwendeten Jellyfin-Funktionen gegen Jellyfin 12 geprüft und gezielt kompatibel gemacht werden.

Dabei sind drei Bereiche getrennt zu behandeln:

1. Jellyfin-Authentifizierung
2. Jellyfin-12-API-Kompatibilität
3. korrekte MediaSource-, Container-, Audio- und Subtitle-Zuordnung beim Import

Der Auftrag ist ausdrücklich **kein pauschaler Jellyfin-Refactor**.

Zuerst muss dokumentiert und bewiesen werden, welche Team4s-Aufrufer betroffen sind und welche Annahmen im aktuellen Code unter Jellyfin 12 nicht mehr stimmen.

---

# 1. Jellyfin-Aufrufer vollständig inventarisieren

Suche alle Stellen im Backend, die direkt oder indirekt HTTP-Requests an Jellyfin senden.

Mindestens prüfen:

* zentraler Jellyfin-Client
* Backdrop-/Bildzugriffe
* Gruppenmedien
* Untertitel
* Bibliotheks-/Item-Abfragen
* Metadatenimport
* Release-/Episode-Zuordnung
* weitere direkte HTTP-Aufrufer außerhalb des zentralen Clients

Dokumentiere pro Aufrufer:

| Bereich | Datei/Funktion | Jellyfin Endpoint | HTTP-Methode | Authentifizierung | Relevante Queryparameter |
| ------- | -------------- | ----------------- | ------------ | ----------------- | ------------------------ |

Zusätzlich alle Treffer von:

```text
api_key
```

klassifizieren:

* Jellyfin
* Fanart
* andere externe API
* nicht relevant

Kein globales Ersetzen.

---

# 2. Authentifizierung auf Jellyfin 12 korrigieren

Für sämtliche echten Jellyfin-Requests prüfen, wie der API-Key übertragen wird.

Die bestätigte Zielvariante für serverseitige Team4s-Aufrufe ist:

```http
Authorization: MediaBrowser Token="<apiKey>"
```

Nicht mehr:

```text
?api_key=<apiKey>
```

Die Authentifizierung möglichst zentral implementieren, sofern der bestehende Aufbau dies sinnvoll erlaubt.

Keine unnötigen Parallelimplementierungen erzeugen.

## Nachweis

Vor bzw. nach der Änderung mindestens mit realen Requests beweisen:

### Kontrollrequest

z. B.:

```text
/System/Info
```

oder ein anderer harmloser, tatsächlich verwendeter Jellyfin-Endpoint.

Erwartung:

```text
alt:
api_key URL-Parameter -> 401

neu:
Authorization Header -> 200
```

Zusätzlich mindestens einen real von Team4s verwendeten `/Items`- oder Metadatenrequest testen.

---

# 3. Jellyfin-12-API-Audit

Alle von Team4s verwendeten Jellyfin-Endpunkte gegen die Jellyfin-12-API bzw. OpenAPI prüfen.

Besonders prüfen:

* entfernte Endpoints
* obsolete Endpoints
* entfernte Queryparameter
* geänderte Defaultwerte
* geänderte Response-Strukturen
* geänderte Filtersemantik

Keine theoretische Vollprüfung der gesamten Jellyfin-API.

Nur die Endpoints prüfen, die Team4s tatsächlich verwendet.

---

# 4. `GetItems` besonders untersuchen

Jellyfin 12 hat das Verhalten von `GetItems` bei bestimmten Filterkombinationen geändert.

Alle Team4s-Aufrufe von `GetItems` suchen.

Besonders Kombinationen prüfen aus:

```text
recursive
includeItemTypes
parentId
fields
mediaTypes
filters
sortBy
sortOrder
startIndex
limit
```

Für jeden produktiv relevanten Aufruf prüfen:

* liefert Jellyfin 12 dieselbe fachlich erwartete Datenmenge?
* fehlen Items?
* kommen zusätzliche Items zurück?
* funktionieren rekursive Abfragen noch wie angenommen?
* sind Filterkombinationen noch korrekt?
* stimmen Pagination und TotalRecordCount?

Hier reichen **HTTP 200 Antworten nicht als Beweis**.

Es muss geprüft werden, ob die Resultate fachlich korrekt und vollständig sind.

---

# 5. MediaSource-Modell analysieren

Der aktuell besonders wichtige fachliche Bereich ist die Zuordnung einer Jellyfin-Episode bzw. eines Items zu einer konkreten Mediendatei.

Jellyfin kann mehrere Versionen bzw. MediaSources eines Items besitzen.

Prüfe deshalb, welche Annahme Team4s aktuell verwendet.

Insbesondere:

```text
Jellyfin Item
    |
    +-- MediaSource A
    |     +-- Container
    |     +-- Audio Streams
    |     +-- Subtitle Streams
    |
    +-- MediaSource B
          +-- Container
          +-- Audio Streams
          +-- Subtitle Streams
```

Team4s darf nicht Container aus Quelle A und Audio-/Subtitle-Daten aus Quelle B kombinieren.

---

# 6. Ist-Zuordnung nachvollziehen

Dokumentiere den aktuellen Datenfluss:

```text
Jellyfin Response
      ↓
Team4s Jellyfin DTO
      ↓
Mapping
      ↓
Import/Repository
      ↓
DB
      ↓
Release-/Projektanzeige
```

Dabei konkret feststellen:

### Wie wird aktuell entschieden,

* welches Jellyfin Item verwendet wird?
* welche MediaSource verwendet wird?
* welcher Container gespeichert wird?
* welche AudioStreams gespeichert werden?
* welche SubtitleStreams gespeichert werden?
* welche Sprachen gespeichert werden?
* wie mehrere Versionen unterschieden werden?

Wenn aktuell einfach

```go
MediaSources[0]
```

oder eine vergleichbar implizite Auswahl verwendet wird, muss geprüft werden, ob diese Annahme fachlich zulässig ist.

---

# 7. Verlorene Containerwerte untersuchen

Es wurde bereits beobachtet, dass Containerinformationen verloren gehen.

Ursache feststellen.

Prüfen:

```text
Jellyfin liefert Container
        ↓
DTO enthält Container?
        ↓
Mapping übernimmt Container?
        ↓
DB-Spalte vorhanden?
        ↓
Repository schreibt Wert?
        ↓
Read-Model liest Wert?
        ↓
API liefert Wert?
```

Nicht nur das Symptom reparieren.

Die Stelle bestimmen, an der die Information verloren geht.

---

# 8. Audio- und Subtitle-Daten untersuchen

Prüfen, weshalb Sprach- bzw. Spurdaten teilweise fehlen.

Mindestens:

### Audio

* StreamIndex
* Codec
* Language
* DisplayTitle
* Channels
* ChannelLayout
* IsDefault
* IsForced, falls relevant

### Subtitle

* StreamIndex
* Codec
* Language
* DisplayTitle
* IsDefault
* IsForced
* External/Internal, sofern Team4s dies benötigt

Prüfen, welche Felder Team4s tatsächlich fachlich benötigt.

Keine Daten nur deshalb persistieren, weil Jellyfin sie anbietet.

---

# 9. MediaSource → Team4s Release-Variante definieren

Wenn mehrere Jellyfin-MediaSources vorhanden sind, muss die Auswahl deterministisch sein.

Zuerst analysieren, welches Identifikationsmerkmal sich dafür eignet.

Mögliche Kandidaten prüfen:

* MediaSource ID
* Path
* Name
* Version
* Container
* Size
* Jellyfin Item ID + MediaSource ID

Nicht einfach anhand Array-Reihenfolge auswählen.

Die Auswahl muss auch nach einem erneuten Bibliotheksscan stabil bleiben.

---

# 10. Bestehendes Team4s-Datenmodell prüfen

Vor Schemaänderungen zunächst feststellen, ob die vorhandenen Tabellen/DTOs bereits genügend Informationen aufnehmen können.

Keine neue Tabelle oder breite Migration nur zur Sicherheit einführen.

Falls das bestehende Modell nicht reicht, dokumentieren:

```text
fehlendes Konzept
bestehende Tabelle
vorgeschlagene minimale Erweiterung
Migration
Backward Compatibility
```

---

# 11. Regressionen vermeiden

Die Änderungen dürfen bestehende Bereiche nicht unbeabsichtigt verändern.

Besonders prüfen:

* Fanart API
* öffentliche Projektseiten
* Release-Seiten
* Gruppenmedien
* Backdrops
* vorhandene Jellyfin-Mappings
* bestehende Imports
* bereits gespeicherte Releases

`api_key` für Fanart darf durch die Jellyfin-Änderung beispielsweise nicht entfernt werden.

---

# 12. Tests

Tests gezielt dort ergänzen, wo Verhalten bislang nur implizit war.

Mindestens erwünscht:

### Authentication

Jellyfin-Request enthält:

```http
Authorization: MediaBrowser Token="..."
```

und API-Key erscheint nicht in der Jellyfin-URL.

### Multiple MediaSources

Fixture:

```text
Episode
 ├─ Source A: MKV
 │   ├─ ja Audio
 │   └─ de Subtitle
 │
 └─ Source B: MP4
     ├─ de Audio
     └─ en Subtitle
```

Beweisen, dass Team4s nicht Streams unterschiedlicher Sources vermischt.

### Container

Containerwert aus der gewählten Source bleibt bis zur Persistenz erhalten.

### Languages

Audio-/Subtitle-Sprachen werden korrekt aus derselben Source übernommen.

### GetItems

Mindestens ein realistischer Team4s-Importrequest gegen die erwartete Response-Struktur absichern.

---

# 13. Keine Performance-Verschlechterung

Beim Import keine N+1-Struktur erzeugen.

Insbesondere keine Architektur wie:

```text
Get Items

für jedes Item:
    Get MediaSources

für jeden Stream:
    weiterer Request
```

wenn Jellyfin die benötigten Daten bereits in sinnvoll gebündelter Form liefern kann.

Bestehende Requestanzahl vor und nach der Änderung dokumentieren.

---

# 14. Keine Secrets loggen

API-Key darf weder

* in URLs,
* Logs,
* Error-Messages,
* Debug-Ausgaben,
* Test-Snapshots

auftauchen.

Falls aktuell komplette Request-URLs inklusive `api_key` geloggt werden können, diesen Sicherheitsaspekt ausdrücklich berücksichtigen.

Der Wechsel zum Header verbessert damit zusätzlich die Secret-Hygiene.

---

# 15. Implementierungsstrategie

Bitte nicht direkt einen großen Umbau starten.

Reihenfolge:

## A. Discovery

1. Jellyfin-Aufrufer inventarisieren
2. Endpoints auflisten
3. Authentifizierung dokumentieren
4. Jellyfin-12-Abweichungen bestimmen
5. aktuellen MediaSource-Datenfluss nachvollziehen

## B. Findings

Befunde priorisieren:

```text
P0 = verhindert Jellyfin-Kommunikation
P1 = falsche importierte Mediendaten
P2 = unvollständige Metadaten
P3 = technische Schuld / Cleanup
```

## C. Umsetzung

Danach nur die belegten Probleme korrigieren.

---

# 16. Erwartete Priorisierung

Voraussichtlich:

### P0

Jellyfin-12-Authentifizierung:

```text
api_key Query Parameter
→ Authorization Header
```

### P1

falsche oder implizite MediaSource-Auswahl

### P1

Streams verschiedener MediaSources werden potenziell vermischt

### P1/P2

verlorene Containerwerte

### P2

fehlende Audio-/Subtitle-Sprachinformationen

### P2

GetItems-Verhalten unter Jellyfin 12

### P3

Duplikate / unnötige Jellyfin-HTTP-Helfer

Priorisierung aber anhand der tatsächlichen Codeanalyse korrigieren.

---

# 17. Abgrenzung

Nicht Bestandteil dieser Phase:

* vollständiger Rewrite der Jellyfin-Integration
* UI-Redesign
* allgemeine Release-Seiten-Überarbeitung
* Änderung der Fanart-API
* Migration auf ein anderes Media-System
* pauschale Datenbanknormalisierung
* Optimierungen ohne belegten Zusammenhang zu Jellyfin 12

---

# 18. Abschlussbericht

Zum Abschluss bitte einen kompakten technischen Bericht erstellen:

```text
## Jellyfin-12 Compatibility Result

### Auth
Vorher:
Nachher:

### Jellyfin callers
Anzahl:
Fundstellen:

### API compatibility
Geprüfte Endpoints:
Gefundene Abweichungen:

### GetItems
Geprüfte Aufrufe:
Ergebnis:

### MediaSource mapping
Vorher:
Nachher:

### Container
Ursache:
Fix:

### Audio / Subtitles
Ursache:
Fix:

### Requests
Vorher:
Nachher:

### Tests
Backend:
Integration:
Regression:

### Offene Punkte
...
```

Für jeden Fix bitte angeben:

* Datei
* Funktion
* Ursache
* Änderung
* Testbeweis

---

# Definition of Done

Die Phase ist erst abgeschlossen, wenn:

* alle tatsächlichen Team4s-Jellyfin-Aufrufer inventarisiert wurden,
* Jellyfin-Requests keine `api_key`-Query-Authentifizierung mehr verwenden,
* Fanart und andere APIs unbeeinflusst bleiben,
* verwendete Jellyfin-Endpunkte gegen Jellyfin 12 geprüft wurden,
* relevante `GetItems`-Aufrufe fachlich verifiziert wurden,
* die MediaSource-Auswahl nachvollziehbar und deterministisch ist,
* Container aus der gewählten MediaSource erhalten bleibt,
* Audio- und Subtitle-Daten aus derselben MediaSource stammen,
* fehlende Sprachen/Spurdaten nachvollzogen und gegebenenfalls korrigiert wurden,
* keine neuen N+1-Requests entstehen,
* der API-Key nicht geloggt wird,
* relevante Tests vorhanden und grün sind,
* verbleibende Jellyfin-12-Risiken explizit dokumentiert sind.

## Wichtig

Nicht davon ausgehen, dass der Auth-Fix automatisch Jellyfin-12-Kompatibilität bedeutet.

Der bereits reproduzierte 401→200-Unterschied beweist nur den ersten Fehler.

Ziel ist eine belegte Aussage:

> Die von Team4s tatsächlich verwendeten Jellyfin-Zugriffe funktionieren unter Jellyfin 12 und importieren die fachlich richtige MediaSource einschließlich der zugehörigen Container-, Audio- und Subtitle-Metadaten.

Erst danach die Phase als abgeschlossen markieren.
