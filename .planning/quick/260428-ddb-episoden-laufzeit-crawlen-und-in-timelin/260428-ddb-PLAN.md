---
phase: quick
plan: 260428-ddb
type: execute
wave: 1
depends_on: []
files_modified:
  - database/migrations/0052_add_duration_seconds_to_release_variants.up.sql
  - database/migrations/0052_add_duration_seconds_to_release_variants.down.sql
  - backend/internal/handlers/jellyfin_client.go
  - backend/internal/handlers/jellyfin_episode_sync_helpers.go
  - backend/internal/models/episode_version.go
  - backend/internal/repository/episode_version_repository.go
  - frontend/src/types/episodeVersion.ts
  - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Nach einem Jellyfin-Episode-Sync wird duration_seconds in release_variants gespeichert"
    - "GetByID gibt duration_seconds als Teil von EpisodeVersion zurueck"
    - "SegmentTimeline streckt Bloecke proportional zur Episodenlaufzeit wenn duration_seconds bekannt"
    - "Wenn duration_seconds fehlt, faellt die Timeline auf das alte Verhalten (maxEnd = groesstes end_time) zurueck"
  artifacts:
    - path: "database/migrations/0052_add_duration_seconds_to_release_variants.up.sql"
      provides: "Neue nullable Spalte duration_seconds INTEGER auf release_variants"
    - path: "backend/internal/models/episode_version.go"
      provides: "DurationSeconds *int32 auf EpisodeVersion"
    - path: "frontend/src/types/episodeVersion.ts"
      provides: "duration_seconds?: number | null auf EpisodeVersion interface"
  key_links:
    - from: "jellyfin_client.go jellyfinEpisodeItem"
      to: "RunTimeTicks *int64"
      via: "RunTimeTicks JSON-Feld"
    - from: "upsertJellyfinEpisodeVersion"
      to: "release_variants.duration_seconds"
      via: "EpisodeVersionCreateInput.DurationSeconds"
    - from: "EpisodeVersion.DurationSeconds"
      to: "SegmentTimeline totalDuration"
      via: "SegmenteTab prop -> SegmentTimeline prop"
---

<objective>
Episoden-Laufzeit aus Jellyfin crawlen (RunTimeTicks -> Sekunden) und in release_variants.duration_seconds
speichern. Die SegmentTimeline-Komponente nutzt diesen Wert als Gesamtdauer des Zeitstrahls, sodass
OP/ED-Bloecke proportional zur echten Episodenlange erscheinen (z.B. OP 0:00-1:30 in 24-Min-Episode = ~6%
der Leiste). Wenn duration_seconds NULL ist, faellt die Timeline auf das bisherige Verhalten zurueck.

Purpose: Proportionale Segment-Timeline macht zeitliche Verhaeltnisse sichtbar und damit sinnvoll.
Output: Migration, Backend-Durchleitung, Frontend-Nutzung in SegmentTimeline.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

Relevante Interfaces (direkt nutzbar, kein Codebase-Scanning noetig):

```go
// backend/internal/handlers/jellyfin_client.go (IST-Zustand)
type jellyfinEpisodeItem struct {
    ID                string                `json:"Id"`
    Name              string                `json:"Name"`
    Path              string                `json:"Path"`
    IndexNumber       *int                  `json:"IndexNumber"`
    ParentIndexNumber *int                  `json:"ParentIndexNumber"`
    PremiereDate      *string               `json:"PremiereDate"`
    MediaStreams      []jellyfinMediaStream `json:"MediaStreams"`
    // RunTimeTicks fehlt noch -- wird in Task 1 ergaenzt
}

// durationSecondsFromTicks existiert bereits in group_assets_jellyfin.go (packageweit sichtbar)
func durationSecondsFromTicks(value *int64) *int32  // 10_000_000 ticks = 1 Sekunde

// listJellyfinEpisodes setzt Fields="MediaStreams,Path" -- wird um RunTimeTicks erweitert

// backend/internal/models/episode_version.go (IST-Zustand, Auszug)
type EpisodeVersion struct {
    ID            int64    `json:"id"`
    AnimeID       int64    `json:"anime_id"`
    EpisodeNumber int32    `json:"episode_number"`
    SegmentCount  int32    `json:"segment_count"`
    HasSegmentAsset bool   `json:"has_segment_asset"`
    // DurationSeconds fehlt noch -- wird in Task 1 ergaenzt
}
type EpisodeVersionCreateInput struct {
    AnimeID       int64
    EpisodeNumber int32
    MediaProvider string
    MediaItemID   string
    VideoQuality  *string
    SubtitleType  *string
    ReleaseDate   *time.Time
    StreamURL     *string
    // DurationSeconds fehlt noch -- wird in Task 1 ergaenzt
}

// scanReleaseVariantAsEpisodeVersion in episode_version_repository.go
// liest Spalten in fester Reihenfolge aus dem SQL-Ergebnis -- duration_seconds muss
// ans Ende (vor fansub-Felder) und im SELECT entsprechend erwaehnt werden.

// createReleaseVariant in episode_import_repository_release_helpers.go
// INSERT INTO release_variants (...) -- braucht optionales duration_seconds
```

```typescript
// frontend/src/types/episodeVersion.ts (IST-Zustand)
export interface EpisodeVersion {
  id: number
  anime_id: number
  episode_number: number
  segment_count?: number
  has_segment_asset?: boolean
  // duration_seconds fehlt noch
}

// frontend SegmenteTab.tsx uebergibt an SegmentTimeline:
<SegmentTimeline segments={segments} />
// episodeNumber steht in SegmenteTabProps schon zur Verfuegung

// frontend SegmenteTab.helpers.tsx SegmentTimeline (IST):
interface SegmentTimelineProps {
  segments: AdminThemeSegment[]
}
// maxEnd = max(end_time) -- wird durch totalDuration ersetzt wenn bekannt
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Migration + Backend-Durchleitung duration_seconds</name>
  <files>
    database/migrations/0052_add_duration_seconds_to_release_variants.up.sql
    database/migrations/0052_add_duration_seconds_to_release_variants.down.sql
    backend/internal/handlers/jellyfin_client.go
    backend/internal/handlers/jellyfin_episode_sync_helpers.go
    backend/internal/models/episode_version.go
    backend/internal/repository/episode_version_repository.go
    backend/internal/repository/episode_import_repository_release_helpers.go
  </files>
  <action>
**Migration (0052):**
- `up.sql`: `ALTER TABLE release_variants ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;`
- `down.sql`: `ALTER TABLE release_variants DROP COLUMN IF EXISTS duration_seconds;`

**jellyfin_client.go:**
- `jellyfinEpisodeItem` Struct: Feld `RunTimeTicks *int64 \`json:"RunTimeTicks"\`` ergaenzen
- `listJellyfinEpisodes`: Fields-Parameter von `"MediaStreams,Path"` auf `"MediaStreams,Path,RunTimeTicks"` aendern

**models/episode_version.go:**
- `EpisodeVersion`: Feld `DurationSeconds *int32 \`json:"duration_seconds,omitempty"\`` ergaenzen (nach HasSegmentAsset)
- `EpisodeVersionCreateInput`: Feld `DurationSeconds *int32` ergaenzen

**episode_version_repository.go:**
- `GetByID` SQL-SELECT: `rv.duration_seconds` vor `rv.created_at` einfuegen
- `scanReleaseVariantAsEpisodeVersion`: `&item.DurationSeconds` in `dest`-Slice einfuegen (nach `&item.HasSegmentAsset`, vor `&item.CreatedAt`)
- Gleiche Ergaenzung fuer alle anderen SQL-Queries die `scanReleaseVariantAsEpisodeVersion` aufrufen
  (GetByID und ListByAnime -- suche alle Stellen mit `scanReleaseVariantAsEpisodeVersion`):
  Die SELECT-Queries die diese Scanner-Funktion fuettern muessen ebenfalls `rv.duration_seconds` enthalten.

**episode_import_repository_release_helpers.go:**
- `createReleaseVariant`: INSERT um `duration_seconds` erweitern -- aber `EpisodeImportMediaCandidate`
  hat kein DurationSeconds-Feld, daher dort NULL uebergeben (kein Umbau noetig, da Import-Pfad
  Dauer nicht kennt).
- Alternativ einfacher: INSERT bleibt unveraendert -- die Spalte ist nullable, also wird NULL
  beim Insert automatisch eingetragen.

**jellyfin_episode_sync_helpers.go:**
- `upsertJellyfinEpisodeVersion`: `EpisodeVersionCreateInput` um `DurationSeconds: durationSecondsFromTicks(targetEpisode.RunTimeTicks)` ergaenzen
- `UpsertByMediaSource`-Implementierung (`episode_version_repository.go` Zeile ~674) ist derzeit
  ein Deferred-Stub (`phase20ReleaseImportDeferred`). Da der Jellyfin-Episode-Sync den
  direkten `Create`/`Update`-Pfad nutzt (nicht `UpsertByMediaSource`), muss der tatsaechliche
  Schreibpfad gefunden werden:
  Suche nach dem eigentlichen Schreibpfad fuer `SyncEpisodeFromJellyfin` -- er geht ueber
  `h.episodeVersionRepo.UpsertByMediaSource`. Da dieser ein Stub ist, pruefe ob der Sync
  einen anderen Repo-Aufruf nutzt (es gibt auch `Create` oder direkte Transaktionen).
  Falls `UpsertByMediaSource` wirklich nur ein Stub ist, suche wo `release_variants` fuer
  Jellyfin-Sync tatsaechlich geschrieben wird (z.B. `jellyfin_sync_flow_helpers.go`) und
  ergaenze dort das UPDATE-Statement um `duration_seconds = $N`.
  Konkret: In `episode_import_repository_release_helpers.go` gibt es ein `UPDATE release_variants SET filename=...` --
  das ist der Update-Pfad beim Re-Import. Ergaenze `duration_seconds = COALESCE($N, duration_seconds)` dort.
  Das setzt duration_seconds beim ersten vollstaendigen Import. Fuer den Jellyfin-Single-Episode-Sync
  (SyncEpisodeFromJellyfin) pruefe ob er einen anderen Schreibpfad hat.

**Wichtig:** `durationSecondsFromTicks` ist bereits in `group_assets_jellyfin.go` im selben Package
(`handlers`) definiert -- kann direkt genutzt werden, kein Import noetig.
  </action>
  <verify>
    <automated>cd C:/Users/admin/Documents/Team4s && docker compose exec backend go build ./... 2>&1 | head -30</automated>
  </verify>
  <done>
    - Migration 0052 existiert mit up/down
    - `jellyfinEpisodeItem` hat `RunTimeTicks *int64`
    - `EpisodeVersion` model hat `DurationSeconds *int32`
    - `scanReleaseVariantAsEpisodeVersion` liest `duration_seconds` aus DB
    - Backend kompiliert fehlerfrei
  </done>
</task>

<task type="auto">
  <name>Task 2: Frontend -- duration_seconds in SegmentTimeline proportional nutzen</name>
  <files>
    frontend/src/types/episodeVersion.ts
    frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx
    frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx
  </files>
  <action>
**episodeVersion.ts:**
- `EpisodeVersion` interface: Feld `duration_seconds?: number | null` ergaenzen (nach `has_segment_asset`)

**SegmenteTab.helpers.tsx -- SegmentTimeline:**
- `SegmentTimelineProps` um `totalDurationSeconds?: number | null` erweitern
- In der Komponente: `const maxEnd = totalDurationSeconds ?? Math.max(...timedSegments.map((s) => parseTimeToSeconds(s.end_time!)))`
  Wenn `totalDurationSeconds` gesetzt und groesser als `maxEnd der Segmente` ist, nutze es als Gesamtdauer.
  Wenn kleiner (ungueltige Daten), fallback auf `maxEnd der Segmente` (Max-Schutz).
  Konkret:
  ```ts
  const segmentMaxEnd = Math.max(...timedSegments.map((s) => parseTimeToSeconds(s.end_time!)))
  const maxEnd = (totalDurationSeconds != null && totalDurationSeconds > segmentMaxEnd)
    ? totalDurationSeconds
    : segmentMaxEnd
  ```
  Das rechte Label aendert sich dann von `formatSeconds(maxEnd)` zu `formatSeconds(maxEnd)` --
  kein Aufwand, da maxEnd schon korrekt berechnet wird.
  Kein Aendern der visuellen Struktur oder Stile noetig.

**SegmenteTab.tsx:**
- `SegmenteTabProps` erhaelt kein neues Prop -- `duration_seconds` kommt aus dem Version-Objekt
  das der Tab bereits kennt (`version.duration_seconds` aus `EpisodeVersionEditorContext`).
  In `EpisodeVersionEditorPage.tsx` wird `SegmenteTab` mit `episodeNumber` aufgerufen.
  Die `version`-Daten stehen in `EpisodeVersionEditorPage` als `editorContext.version` zur Verfuegung.

  Pruefe wie `SegmenteTab` aufgerufen wird (EpisodeVersionEditorPage.tsx ~Zeile 359):
  ```tsx
  <SegmenteTab
    animeId={segmentAnimeId}
    groupId={segmentGroupId}
    version={segmentVersion}
    episodeNumber={episodeNumber}
  />
  ```
  `duration_seconds` aus dem version-Objekt weitergeben:
  - `SegmenteTabProps` ergaenzen: `durationSeconds?: number | null`
  - In `EpisodeVersionEditorPage.tsx` beim `<SegmenteTab>`-Aufruf:
    `durationSeconds={editorContext?.version.duration_seconds}`
  - In `SegmenteTab.tsx` den Wert an `<SegmentTimeline>` weiterleiten:
    `<SegmentTimeline segments={segments} totalDurationSeconds={durationSeconds} />`

**Datei-Limit:** `SegmenteTab.tsx` darf 450 Zeilen nicht ueberschreiten (CLAUDE.md).
Wenn der Wert nahe dran ist, ist das ein reines Prop-Weiterleitung (1-2 Zeilen Diff) -- kein Problem.

**TypeScript-Build-Pruefung vor Abschluss:**
`cd frontend && npx tsc --noEmit 2>&1 | head -30`
  </action>
  <verify>
    <automated>cd C:/Users/admin/Documents/Team4s/frontend && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    - `EpisodeVersion` hat `duration_seconds?: number | null`
    - `SegmentTimeline` akzeptiert `totalDurationSeconds?` und nutzt es als Zeitstrahl-Maximum
    - Fallback auf `maxEnd der Segmente` wenn kein Wert vorhanden
    - TypeScript-Build fehlerfrei
  </done>
</task>

<task type="auto">
  <name>Task 3: Migration ausfuehren und Smoke-Test</name>
  <files></files>
  <action>
Migration in Docker-Umgebung ausfuehren:
```bash
docker compose exec migrate ./migrate -path /migrations -database "$DATABASE_URL" up
```
Oder wenn migrate-Service einmalig laeuft:
```bash
docker compose run --rm migrate
```

Danach Smoke-Check: Spalte in DB pruefen:
```bash
docker compose exec db psql -U postgres -d team4s -c "\d release_variants" | grep duration
```

Backend neu bauen und starten:
```bash
docker compose build backend && docker compose up -d backend
```

Optionaler manueller Test: In der Admin-UI eine Episode-Version oeffnen deren Jellyfin-Sync
bereits gelaufen ist -- die Timeline sollte mit dem gleichen Verhalten erscheinen wie vorher
(duration_seconds noch NULL fuer alte Eintraege, Fallback greift). Nach einem neuen
Jellyfin-Episode-Sync fuer eine Episode sollte `duration_seconds` in der DB gesetzt sein
(via `docker compose exec db psql ... -c "SELECT id, duration_seconds FROM release_variants LIMIT 10"`).
  </action>
  <verify>
    <automated>docker compose -f C:/Users/admin/Documents/Team4s/docker-compose.yml exec db psql -U postgres -d team4s -c "SELECT column_name FROM information_schema.columns WHERE table_name='release_variants' AND column_name='duration_seconds';" 2>&1</automated>
  </verify>
  <done>
    - Spalte `duration_seconds` in `release_variants` sichtbar
    - Backend laeuft ohne Fehler
    - Bestehende Daten unberuehrt (NULL ist valide)
  </done>
</task>

</tasks>

<verification>
- `docker compose exec backend go build ./...` fehlerfrei
- `cd frontend && npx tsc --noEmit` fehlerfrei
- `release_variants.duration_seconds` Spalte in DB vorhanden
- SegmentTimeline-Komponente kompiliert mit neuem Prop
</verification>

<success_criteria>
- Jellyfin-Episode-Sync schreibt RunTimeTicks als duration_seconds in release_variants
- GetByID gibt duration_seconds in EpisodeVersion zurueck
- SegmentTimeline nutzt duration_seconds als Zeitstrahl-Total wenn > 0, sonst Fallback
- Keine TypeScript-Fehler, kein Go-Compile-Fehler
</success_criteria>

<output>
Nach Abschluss SUMMARY erstellen unter:
.planning/quick/260428-ddb-episoden-laufzeit-crawlen-und-in-timelin/260428-ddb-SUMMARY.md
</output>
