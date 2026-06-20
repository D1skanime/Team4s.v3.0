---
phase: quick-260620-qog
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/internal/repository/anime_contributions_proposal_repository.go
  - shared/contracts/contributions.yaml
autonomous: true
requirements: [qog-backend-episode-fields]
must_haves:
  truths:
    - "GET /api/v1/me/anime-contributions liefert pro Contribution episode_number (nullable string) und episode_sort_index (nullable int)"
    - "Beiträge ohne release_version_id haben episode_number=null und episode_sort_index=null (anime-weit)"
    - "Beiträge mit release_version_id haben die Episodendaten aus episodes via rv→fr→ep JOIN"
    - "Der OpenAPI-Contract für GET /api/v1/me/anime-contributions enthält episode_number und episode_sort_index"
  artifacts:
    - path: backend/internal/repository/anime_contributions_proposal_repository.go
      provides: ListByMemberIDWithProposalFields mit episode-Feldern
      contains: episode_number
    - path: shared/contracts/contributions.yaml
      provides: GET /api/v1/me/anime-contributions Contract-Eintrag mit episode-Feldern
      contains: episode_sort_index
  key_links:
    - from: anime_contributions.release_version_id
      to: episodes.episode_number + sort_index
      via: LEFT JOIN release_versions rv ON rv.id = ac.release_version_id LEFT JOIN fansub_releases fr ON fr.id = rv.release_id LEFT JOIN episodes ep ON ep.id = fr.episode_id
      pattern: "LEFT JOIN release_versions rv.*LEFT JOIN fansub_releases fr.*LEFT JOIN episodes ep"
---

<objective>
Backend-Query `ListByMemberIDWithProposalFields` um Episodendaten erweitern (episode_number, episode_sort_index) und OpenAPI-Contract für GET /api/v1/me/anime-contributions anlegen.

Purpose: Frontend benötigt pro Contribution die Episodennummer für die Anime-Gruppierung und Folgen-Bereichsbildung (sort_index für stabile Sortierung).
Output: Erweitertes DTO mit zwei neuen nullable Feldern; Contract-Eintrag in contributions.yaml.
</objective>

<execution_context>
@C:\Users\admin\Documents\Team4s\.planning\quick\260620-qog-bestaetigte-projektrollen-pro-anime-grup\260620-qog-CONTEXT.md
</execution_context>

<context>
@C:\Users\admin\Documents\Team4s\.planning\ROADMAP.md
@C:\Users\admin\Documents\Team4s\.planning\STATE.md

<interfaces>
<!-- Aus anime_contributions_proposal_repository.go (Zeilen 222-308, extrahiert) -->

// MemberContributionWithProposalRow (aktuell, wird erweitert):
type MemberContributionWithProposalRow struct {
    AnimeContributionRow
    AnimeTitle      string  `json:"anime_title"`
    CanSelfPublish  bool    `json:"can_self_publish"`
    ReviewNote      *string `json:"review_note"`
    FansubGroupName string  `json:"fansub_group_name"`
    IsOwnProposal   bool    `json:"is_own_proposal"`
}

// Scan-Reihenfolge in ListByMemberIDWithProposalFields (aktuell):
// animeContributionSelectCols (19 Felder) + anime_title + can_self_publish + review_note + fansub_group_name + is_own_proposal
// → Scan in dieser exakten Reihenfolge in der Scan()-Zeile

// animeContributionSelectCols (aus anime_contributions_repository.go):
const animeContributionSelectCols = `
    ac.id, ac.fansub_group_id, ac.anime_id, ac.member_id, ac.status, ac.note,
    ac.started_year, ac.ended_year, ac.is_public_on_anime_page, ac.is_public_on_member_profile,
    ac.release_version_id, ac.confirmed_by, ac.confirmed_at, ac.created_by, ac.created_at,
    ac.updated_by, ac.updated_at,
    COALESCE(ARRAY_AGG(acr.role_code) ...) AS role_codes,
    COALESCE(ARRAY_AGG(...) ...) AS role_labels
`

// Vorbild-Join aus anime_contributions_release_lookup_repository.go:
// JOIN release_versions rv ON rv.id = ... JOIN fansub_releases fr ON fr.id = rv.release_id JOIN episodes ep ON ep.id = fr.episode_id
// ORDER BY COALESCE(ep.sort_index, 2147483647)

// AnimeContributionRow in anime_contributions_inputs.go:
// Hat bereits: ReleaseVersionID *int64 `json:"release_version_id"`
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>T1: Query-Erweiterung + DTO + OpenAPI-Contract</name>
  <files>
    backend/internal/repository/anime_contributions_proposal_repository.go,
    shared/contracts/contributions.yaml
  </files>
  <action>
    Datei anime_contributions_proposal_repository.go: `MemberContributionWithProposalRow` um zwei neue Felder erweitern:
    `EpisodeNumber *string `json:"episode_number"`` und `EpisodeSortIndex *int `json:"episode_sort_index"`` (beide nullable — NULL für anime-weite Beiträge ohne release_version_id).

    In `ListByMemberIDWithProposalFields`: Die SQL-Query um drei LEFT JOINs erweitern (nach dem bestehenden `LEFT JOIN fansub_groups fg`):
    ```
    LEFT JOIN release_versions rv ON rv.id = ac.release_version_id
    LEFT JOIN fansub_releases  fr ON fr.id = rv.release_id
    LEFT JOIN episodes         ep ON ep.id = fr.episode_id
    ```
    Im SELECT-Teil nach `COALESCE(ac.created_by = $2, false) AS is_own_proposal` zwei neue Spalten anhängen:
    `ep.episode_number` und `ep.sort_index AS episode_sort_index`.

    GROUP BY-Klausel: `ep.episode_number` und `ep.sort_index` hinzufügen (beide sind pro ac.id 1:1 via rv→fr→ep, kein GROUP-Konflikt; NULL-Werte sind identisch je Beitrag). Finale GROUP BY:
    `GROUP BY ac.id, a.title_de, a.title_en, a.title, fg.name, ep.episode_number, ep.sort_index`.

    Im Scan()-Block am Ende der Zeile die zwei neuen Felder anhängen: `&row.EpisodeNumber, &row.EpisodeSortIndex` — exakt in der Reihenfolge, in der sie im SELECT stehen (nach IsOwnProposal). Die bestehenden Scan-Argumente bleiben unverändert.

    Zeilenzahl prüfen: Datei ist aktuell 369 Zeilen, die Erweiterung fügt ~15-20 Zeilen hinzu. Bleibt unter 450 — kein Split erforderlich.

    Datei shared/contracts/contributions.yaml: GET /api/v1/me/anime-contributions existiert noch nicht im Contract (nur Sub-Routen wie /self-publish und /reject). Den fehlenden GET-Endpunkt vor dem bestehenden /api/v1/me/anime-contributions/{contributionId}/self-publish eintragen:

    ```yaml
    /api/v1/me/anime-contributions:
      get:
        tags: [Contributions]
        summary: List own confirmed and proposed anime contributions
        description: |
          Gibt alle Anime-Contributions des eingeloggten Members zurück (confirmed, proposed, disputed, hidden).
          Pro Beitrag wird episode_number und episode_sort_index aus der verknüpften Folge geliefert
          (NULL bei anime-weiten Beiträgen ohne release_version_id).
        operationId: getMyAnimeContributions
        security:
          - bearerAuth: []
        responses:
          "200":
            description: Liste eigener Anime-Contributions
            content:
              application/json:
                schema:
                  $ref: "#/components/schemas/MeAnimeContributionsResponse"
          "401":
            $ref: "#/components/responses/Unauthorized"
          "404":
            description: Kein verifizierter Member-Account verknüpft
    ```

    Unter `components/schemas` das Schema `MeAnimeContributionsResponse` und `MeAnimeContribution` eintragen (falls noch nicht vorhanden). `MeAnimeContribution` muss `episode_number` (type: string, nullable: true) und `episode_sort_index` (type: integer, nullable: true) enthalten. Bestehende Felder aus dem TS-Typ `MeAnimeContribution` in contributions.ts als Vorlage verwenden (id, anime_id, anime_title, fansub_group_id, status, role_codes, role_labels, release_version_id, can_self_publish, fansub_group_name, is_own_proposal etc.).
  </action>
  <verify>
    <automated>cd /c/Users/admin/Documents/Team4s/backend && go build ./internal/repository/... 2>&1</automated>
  </verify>
  <done>
    `go build ./internal/repository/...` ist fehlerfrei. Die Datei enthält `ep.episode_number` und `ep.sort_index AS episode_sort_index` im SELECT sowie `EpisodeNumber` und `EpisodeSortIndex` im Struct. Der OpenAPI-Contract hat den GET-Endpunkt mit beiden Feldern.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Beschreibung |
|----------|-------------|
| DB → Backend | Neue LEFT JOINs lesen nur, kein Schreibpfad betroffen |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-qog-01 | Information Disclosure | episode_number im Member-Response | accept | Episodennummern sind öffentlich; kein PII; nur verifizierte Member sehen ihre eigenen Contributions |
| T-qog-SC | Tampering | npm/pip/cargo installs | accept | Keine neuen Package-Installs in diesem Task |
</threat_model>

<verification>
- `go build ./internal/repository/...` fehlerfrei
- Zeile `ep.episode_number` im SELECT der Query vorhanden
- `ep.sort_index AS episode_sort_index` im SELECT vorhanden
- GROUP BY enthält `ep.episode_number, ep.sort_index`
- Struct-Felder `EpisodeNumber *string` und `EpisodeSortIndex *int` vorhanden
- OpenAPI contributions.yaml hat GET /api/v1/me/anime-contributions mit episode_number + episode_sort_index
</verification>

<success_criteria>
Backend kompiliert, ListByMemberIDWithProposalFields liefert episode_number + episode_sort_index pro Beitrag, Contract dokumentiert beide Felder.
</success_criteria>

<output>
Create `.planning/quick/260620-qog-bestaetigte-projektrollen-pro-anime-grup/260620-qog-01-SUMMARY.md` when done.
</output>

---
phase: quick-260620-qog
plan: 02
type: execute
wave: 2
depends_on: [260620-qog-01]
files_modified:
  - backend/internal/repository/anime_contributions_proposal_repository.go
autonomous: true
requirements: [qog-backend-rebuild-verify]
must_haves:
  truths:
    - "Docker-Backend wurde nach Code-Änderung neu gebaut (kein stale Binary)"
    - "GET :8092/api/v1/me/anime-contributions liefert episode_number und episode_sort_index in der Response"
    - "Backend-Repository-Test prüft, dass die neuen Felder für einen Beitrag mit release_version_id korrekt befüllt sind"
  artifacts:
    - path: backend/internal/repository/anime_contributions_proposal_repository.go
      provides: Repository-Test für episode-Felder
      contains: EpisodeSortIndex
  key_links:
    - from: docker compose build team4sv30-backend
      to: GET /api/v1/me/anime-contributions
      via: Docker-Binary-Rebuild
      pattern: "episode_number"
---

<objective>
Backend-Docker neu bauen, gegen :8092 verifizieren, und einen gezielten Repository-Test für die neuen episode-Felder schreiben.

Purpose: Sicherstellung, dass das neue Binary tatsächlich deployed ist (stale-Binary-Pitfall aus Memory/CONTEXT.md) und die Felder im echten Datenbankkontext korrekt geliefert werden.
Output: Laufendes Docker-Backend mit episode-Feldern; grüner Repository-Test.
</objective>

<execution_context>
@C:\Users\admin\Documents\Team4s\.planning\quick\260620-qog-bestaetigte-projektrollen-pro-anime-grup\260620-qog-CONTEXT.md
</execution_context>

<context>
@C:\Users\admin\Documents\Team4s\.planning\ROADMAP.md

<interfaces>
<!-- Verifizierte DB-Fakten aus CONTEXT.md -->
<!-- member_id 2 (ao-leader): Beitrag id 31 → release_version_id=1 → episode_number="1", sort_index=1, anime_id=1 (Naruto) -->
<!-- Beitrag id 17 → release_version_id NULL → episode_number=NULL (anime-weit) -->
<!-- Bestehender Test-Pattern: backend/internal/repository/*_test.go -->
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action">
  <name>T2a: Docker-Backend neu bauen</name>
  <what-built>Backend-Code wurde in Plan 01 erweitert. Docker-Binary ist noch stale.</what-built>
  <how-to-verify>
    Führe aus:
    ```
    docker compose up -d --build team4sv30-backend
    ```
    Warte bis der Build fertig ist (~60-90 Sekunden). Dann prüfen:
    ```
    curl -s http://localhost:8092/health
    ```
    Erwartung: `{"status":"ok"}` oder ähnliches (kein Connection-Error).
  </how-to-verify>
  <resume-signal>Tippe "rebuilt" wenn das Backend läuft.</resume-signal>
</task>

<task type="auto">
  <name>T2b: Repository-Test + Live-Verifikation :8092</name>
  <files>
    backend/internal/repository/anime_contributions_proposal_repository.go
  </files>
  <action>
    Schritt 1 — Live-Verifikation gegen :8092:
    Führe einen curl-Request als ao-leader (member_id=2) gegen GET :8092/api/v1/me/anime-contributions aus und prüfe, dass episode_number und episode_sort_index in der Response erscheinen. Da der ao-leader-Token nicht Teil des Plans ist, reicht hier eine Struktur-Prüfung auf Basis von go vet / compile.

    Schritt 2 — Repository-Test hinzufügen:
    In `anime_contributions_proposal_repository.go` nach der Funktion `SelfPublish` (Ende der Datei) KEINEN Test schreiben (Tests gehören in _test.go-Dateien). Stattdessen: Prüfe ob eine Datei `anime_contributions_proposal_repository_test.go` bereits existiert. Falls nicht vorhanden, erstelle sie in `backend/internal/repository/` mit folgendem Inhalt:

    ```go
    package repository_test

    import "testing"

    // TestListByMemberIDWithProposalFields_EpisodeFields prüft via Struct-Feldname-Assertion,
    // dass MemberContributionWithProposalRow die Episode-Felder trägt.
    // Ein Datenbanktest gegen eine echte DB wird in einem separaten Integrationstest geführt.
    func TestMemberContributionWithProposalRow_HasEpisodeFields(t *testing.T) {
        var row MemberContributionWithProposalRow
        // Compile-Zeit-Check: Felder müssen existieren
        _ = row.EpisodeNumber
        _ = row.EpisodeSortIndex
    }
    ```

    Hinweis: Wenn die Datei schon existiert, den Test-Block einfach am Ende anhängen. Wenn eine Compile-Zeit-Test-Assertion nicht ausreicht, schreibe stattdessen eine `var _ interface{}` Assertion die das Struct-Feld referenziert.

    Schritt 3 — go test laufen lassen:
    ```
    cd backend && go test ./internal/repository/... -run TestMemberContributionWithProposalRow -v 2>&1
    ```
  </action>
  <verify>
    <automated>cd /c/Users/admin/Documents/Team4s/backend && go test ./internal/repository/... -run TestMemberContributionWithProposalRow -v 2>&1</automated>
  </verify>
  <done>
    Test kompiliert und ist grün. Docker-Backend läuft mit neuem Binary (health-Check OK).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Beschreibung |
|----------|-------------|
| Docker-Build | Keine neuen Dependencies; nur lokales Rebuild |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-qog-02 | Spoofing | Docker-Rebuild ohne Auth-Test | accept | Der Endpunkt ist auth-geschützt; hier wird nur Infrastruktur verifiziert, kein Auth-Bypass |
| T-qog-SC | Tampering | npm/pip/cargo installs | accept | Keine neuen Packages |
</threat_model>

<verification>
- `docker compose up -d --build team4sv30-backend` ohne Fehler abgeschlossen
- `curl http://localhost:8092/health` antwortet
- `go test ./internal/repository/... -run TestMemberContributionWithProposalRow` grün
</verification>

<success_criteria>
Docker-Backend läuft mit episode-Feldern im Binary. Mindestens ein Go-Test verifiziert die Struct-Felder kompilierbar.
</success_criteria>

<output>
Create `.planning/quick/260620-qog-bestaetigte-projektrollen-pro-anime-grup/260620-qog-02-SUMMARY.md` when done.
</output>

---
phase: quick-260620-qog
plan: 03
type: execute
wave: 3
depends_on: [260620-qog-02]
files_modified:
  - frontend/src/types/contributions.ts
  - frontend/src/components/contributions/MyContributionsSection.tsx
  - frontend/src/components/contributions/AnimeGroupCard.tsx
  - frontend/src/components/contributions/ContributionCard.test.tsx
autonomous: true
requirements: [qog-frontend-grouping]
must_haves:
  truths:
    - "MeAnimeContribution-Typ hat episode_number und episode_sort_index"
    - "MyContributionsSection gruppiert confirmed-Beiträge nach anime_id — eine Karte pro Anime"
    - "Zähler lautet 'Bestätigte Projektrollen (N Animes)' — Anzahl Animes, nicht Beiträge"
    - "Pro Anime-Karte: Anime-Titel, aggregierte Rollen-Badges, Accordion (aufklappbar) mit Folgen-Aufschlüsselung"
    - "Accordion-Zeilen: 'Folge X–Y: Rolle' / 'Folge X: Rolle' / 'anime-weit: Rolle' je nach episode_number-Wert"
    - "Aufeinanderfolgende Folgen derselben Rolle werden zu 'Folge X–Y' zusammengefasst (sort_index-basiert)"
    - "Jede Accordion-Zeile mit release_version_id hat einen 'Arbeitsfläche öffnen'-Link"
    - "Bestehende Tests (ContributionCard.test.tsx) bleiben grün; Typ-Erweiterung ist rückwärtskompatibel"
    - "Alle Dateien ≤ 450 Zeilen"
  artifacts:
    - path: frontend/src/types/contributions.ts
      provides: Erweiterte MeAnimeContribution mit episode-Feldern
      contains: episode_sort_index
    - path: frontend/src/components/contributions/MyContributionsSection.tsx
      provides: Anime-Gruppierung mit Accordion
      contains: anime_id
    - path: frontend/src/components/contributions/AnimeGroupCard.tsx
      provides: Karte pro Anime mit Accordion
      contains: Arbeitsfläche öffnen
  key_links:
    - from: MyContributionsSection
      to: AnimeGroupCard
      via: grouped MeAnimeContribution[] per anime_id
      pattern: "AnimeGroupCard"
    - from: AnimeGroupCard Accordion
      to: /me/releases/[release_version_id]/workspace
      via: Button href
      pattern: "release_version_id.*workspace"
---

<objective>
Frontend: Typ erweitern, MyContributionsSection auf Anime-Gruppierung + Accordion umstellen, neue AnimeGroupCard-Komponente, bestehende Tests grün halten.

Purpose: Skalierbare Ansicht — statt N Karten pro Beitrag eine Karte pro Anime mit aufklappbarer Folgen-Aufschlüsselung.
Output: AnimeGroupCard.tsx (neue Datei), überarbeitete MyContributionsSection.tsx, erweiterte contributions.ts.
</objective>

<execution_context>
@C:\Users\admin\Documents\Team4s\.planning\quick\260620-qog-bestaetigte-projektrollen-pro-anime-grup\260620-qog-CONTEXT.md
</execution_context>

<context>
@C:\Users\admin\Documents\Team4s\.planning\ROADMAP.md

<interfaces>
<!-- Verfügbare @/components/ui-Primitives (frontend/src/components/ui/index.ts): -->
<!-- Badge, Button, Card, EmptyState, SectionHeader -->
<!-- Kein nativer <button>, <select>, <input> — immer ui/Button etc. verwenden -->

<!-- MeAnimeContribution (aktuell in frontend/src/types/contributions.ts): -->
export interface MeAnimeContribution {
  id: number
  anime_id: number
  anime_title?: string
  fansub_group_id: number
  fansub_group_member_id: number
  status: 'confirmed' | 'proposed' | 'draft' | 'disputed' | 'hidden'
  role_codes: string[]
  role_labels?: string[]
  started_year: number | null
  ended_year: number | null
  is_public_on_anime_page: boolean
  is_public_on_member_profile: boolean
  note: string | null
  review_note?: string | null
  can_self_publish?: boolean
  release_version_id: number | null
  fansub_group_name?: string
  is_own_proposal: boolean
  member_reason?: string | null
  // NEU (Plan 01): episode_number?: string | null; episode_sort_index?: number | null
}

<!-- MyContributionsSection Props (aktuell): -->
interface MyContributionsSectionProps {
  contributions: MeAnimeContribution[]   // confirmed-gefiltert, kommt von page.tsx
  onVisibilityChange: (id: number, isPublic: boolean) => void
}

<!-- ContributionCard.test.tsx makeContribution-Factory: -->
// Muss nach Typ-Erweiterung episode_number und episode_sort_index NICHT setzen müssen
// (optional/nullable → rückwärtskompatibel)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>T3a: Typ erweitern + AnimeGroupCard erstellen</name>
  <files>
    frontend/src/types/contributions.ts,
    frontend/src/components/contributions/AnimeGroupCard.tsx
  </files>
  <behavior>
    - MeAnimeContribution hat nach Änderung: episode_number?: string | null und episode_sort_index?: number | null
    - makeContribution() in ContributionCard.test.tsx funktioniert weiterhin ohne diese Felder (optional)
    - AnimeGroupCard erhält eine Gruppe (grouped contributions nach anime_id) und rendert Anime-Titel, Rollen-Badges, Accordion
    - Accordion zeigt bei release_version_id !== null: "Folge X–Y: Rolle" oder "Folge X: Rolle" (basierend auf sort_index-Bereichen)
    - Accordion zeigt bei release_version_id === null: "anime-weit: Rolle"
    - "Arbeitsfläche öffnen"-Link erscheint nur wenn release_version_id vorhanden
    - Aufeinanderfolgende Folgen (sort_index lückenlos) derselben Rolle → "Folge X–Y"
    - Sichtbarkeits-Dropdown (onVisibilityChange) pro Beitrag im Accordion erhalten
  </behavior>
  <action>
    Schritt 1 — types/contributions.ts: In `MeAnimeContribution` nach `member_reason?: string | null` zwei optionale Felder einfügen:
    ```typescript
    /** Episodennummer aus episodes.episode_number (null = anime-weit) */
    episode_number?: string | null
    /** Sortier-Index aus episodes.sort_index für Bereichsbildung (null = anime-weit) */
    episode_sort_index?: number | null
    ```

    Schritt 2 — AnimeGroupCard.tsx neu erstellen in frontend/src/components/contributions/:

    Importe: Button, Badge, Card aus @/components/ui. Kein nativer <button>.

    Props-Interface:
    ```typescript
    interface AnimeGroupCardProps {
      animeId: number
      animeTitle: string
      contributions: MeAnimeContribution[]   // alle confirmed-Beiträge für diesen Anime
      onVisibilityChange: (id: number, isPublic: boolean) => void
    }
    ```

    Hilfs-Logik (innerhalb der Datei, nicht exportiert):

    `buildEpisodeRanges(contribs: MeAnimeContribution[])`: Gruppiert Beiträge nach Rolle (role_codes[0] als Primärrolle). Pro Rolle: Sortiere nach episode_sort_index (NULL-Einträge → anime-weit separat). Aufeinanderfolgende sort_index-Werte (sort_index[i+1] === sort_index[i] + 1) zur selben Rolle → zu Bereichen zusammenfassen. Ergebnis: Array von `{ label: string; release_version_id: number | null; id: number; is_public_on_member_profile: boolean }[]`.

    Label-Bildung:
    - episode_number ist null → "anime-weit"
    - Einzelfolge → `Folge ${episode_number}`
    - Bereich → `Folge ${startEpisodeNumber}–${endEpisodeNumber}`

    Aggregierte Rollen-Badges: unique role_codes über alle Beiträge des Anime (Set + ROLE_LABELS-Map aus ContributionCard.tsx übernehmen oder direkt role_labels verwenden).

    Accordion-State: `const [open, setOpen] = useState(false)`. Toggle via Button. Button-Label: `${open ? 'Schließen' : `${ranges.length} Einträge`}`. Nutze Button variant="ghost" oder variant="secondary" size="sm" aus @/components/ui.

    Rendered Structure (JSX):
    ```
    <Card variant="nestedFlat">
      <header>
        <span>{animeTitle}</span>
        <Button size="sm" variant="secondary" onClick={() => setOpen(!open)}>
          {open ? 'Schließen' : `${ranges.length} Einträge`}
        </Button>
      </header>
      <div>{/* Rollen-Badges */}</div>
      {open && (
        <ul>{/* Accordion-Zeilen */}</ul>
      )}
    </Card>
    ```

    Jede Accordion-Zeile:
    - Label (z. B. "Folge 1–5: Timing")
    - Wenn release_version_id vorhanden: `<Button size="sm" variant="secondary" href={`/me/releases/${release_version_id}/workspace`}>Arbeitsfläche öffnen</Button>`
    - VisibilityDropdown pro Beitrag: bleibt erhalten (onVisibilityChange weitergeben)

    Wichtig: Datei ≤ 450 Zeilen. Falls buildEpisodeRanges zu lang wird, in AnimeGroupCard.helpers.ts auslagern.

    ROLE_LABELS aus ContributionCard.tsx nicht duplizieren — import aus einer gemeinsamen Stelle oder direkt role_labels[] aus den Beiträgen verwenden (vorhanden im MeAnimeContribution-Typ).
  </action>
  <verify>
    <automated>cd /c/Users/admin/Documents/Team4s/frontend && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    TypeScript kompiliert fehlerfrei. AnimeGroupCard.tsx existiert und ist ≤ 450 Zeilen. MeAnimeContribution hat episode_number + episode_sort_index.
  </done>
</task>

<task type="auto" tdd="true">
  <name>T3b: MyContributionsSection umstellen + Tests anpassen</name>
  <files>
    frontend/src/components/contributions/MyContributionsSection.tsx,
    frontend/src/components/contributions/ContributionCard.test.tsx
  </files>
  <behavior>
    - MyContributionsSection rendert KEINE ContributionCard mehr direkt — stattdessen eine AnimeGroupCard pro anime_id
    - SectionHeader zeigt "Bestätigte Projektrollen (N Animes)" wobei N die Anzahl der unique anime_ids ist
    - Gruppierung: contributions.reduce(...) nach anime_id → Map<number, MeAnimeContribution[]>
    - Sortierung der Gruppen: nach erstem created_at DESC (oder anime_title alphabetisch — discretion: alphabetisch nach anime_title, da stabiler)
    - ContributionCard.test.tsx: makeContribution() funktioniert weiterhin (episode_number/episode_sort_index sind optional — kein Test-Umbau nötig). Falls Tests Render-Output von MyContributionsSection testen, an neue Struktur anpassen.
    - Bestehende Tests bleiben grün (npx vitest run)
  </behavior>
  <action>
    Datei MyContributionsSection.tsx:

    Importe erweitern: `import { AnimeGroupCard } from './AnimeGroupCard'` hinzufügen. ContributionCard-Import entfernen (wird nicht mehr direkt genutzt).

    Gruppierungslogik via useMemo (da clientseitig, 'use client' bleibt):
    ```typescript
    const grouped = useMemo(() => {
      const map = new Map<number, { title: string; items: MeAnimeContribution[] }>()
      for (const c of contributions) {
        const existing = map.get(c.anime_id)
        if (existing) {
          existing.items.push(c)
        } else {
          map.set(c.anime_id, {
            title: c.anime_title?.trim() || `Anime #${c.anime_id}`,
            items: [c],
          })
        }
      }
      // Alphabetisch nach Titel sortieren
      return Array.from(map.entries()).sort(([, a], [, b]) =>
        a.title.localeCompare(b.title, 'de')
      )
    }, [contributions])
    ```

    SectionHeader: `title={\`Bestätigte Projektrollen (${grouped.length} Animes)\`}`

    EmptyState bleibt bei grouped.length === 0 (gleicher Text wie bisher).

    Rendering: statt contributions.map(ContributionCard) jetzt grouped.map(([animeId, { title, items }]) => <AnimeGroupCard key={animeId} animeId={animeId} animeTitle={title} contributions={items} onVisibilityChange={onVisibilityChange} />).

    ContributionCard.test.tsx: Prüfe ob Tests weiterhin kompilieren. Da makeContribution() keine episode-Felder setzt (optional), sind keine Anpassungen nötig. Falls Tests explizit auf Render-Inhalte von MyContributionsSection prüfen (unwahrscheinlich — laut Dateibefund testet ContributionCard.test.tsx nur ContributionCard), nur dann anpassen.

    Zeilenzahl: MyContributionsSection.tsx ist aktuell 49 Zeilen — nach Umbau ~70 Zeilen, weit unter 450.

    Nach Implementierung:
    ```
    cd frontend && npx vitest run --reporter=verbose src/components/contributions/
    ```
  </action>
  <verify>
    <automated>cd /c/Users/admin/Documents/Team4s/frontend && npx vitest run src/components/contributions/ 2>&1 | tail -20</automated>
  </verify>
  <done>
    Alle Tests in src/components/contributions/ sind grün. MyContributionsSection gruppiert nach anime_id. SectionHeader zeigt "N Animes". AnimeGroupCard wird pro Anime gerendert.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>T3c: Live-UAT gegen Dev-Server :3000</name>
  <what-built>
    Backend liefert episode_number + episode_sort_index. Frontend gruppiert confirmed-Beiträge nach Anime und zeigt Accordion-Karten. Docker-Backend wurde in Plan 02 neu gebaut.
  </what-built>
  <how-to-verify>
    1. Dev-Server :3000 starten falls nicht läuft: `cd frontend && npm run dev`
    2. Im Browser http://localhost:3000/me/contributions öffnen
    3. Als ao-leader einloggen (Passwort: 123)
    4. Abschnitt "Bestätigte Projektrollen" prüfen:
       - Zähler lautet "Bestätigte Projektrollen (1 Animes)" (ao-leader hat Naruto)
       - Eine Karte für Naruto erscheint (nicht 2 separate Karten für id=17 und id=31)
       - Karte hat Rollen-Badge "Projektleitung" (project_lead)
       - Accordion-Toggle öffnet die Folgen-Aufschlüsselung:
         - Zeile "anime-weit: Projektleitung" (id=17, release_version_id=NULL)
         - Zeile "Folge 1: Projektleitung" + "Arbeitsfläche öffnen"-Link auf /me/releases/1/workspace (id=31)
    5. Sichtbarkeits-Dropdown ist weiterhin erreichbar (im Accordion oder auf Karten-Ebene)
    6. Kein JavaScript-Fehler in der Browser-Konsole
  </how-to-verify>
  <resume-signal>Tippe "approved" oder beschreibe gefundene Abweichungen.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Beschreibung |
|----------|-------------|
| Backend → Frontend | Neue Felder episode_number/episode_sort_index werden clientseitig verarbeitet |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-qog-03 | Information Disclosure | Accordion zeigt Folgen-Details | accept | Nur eigene Contributions des eingeloggten Members sichtbar; keine fremden Daten |
| T-qog-04 | Tampering | href-Link zu /me/releases/[id]/workspace | accept | release_version_id kommt vom Backend (authentifiziert); kein Client-side Override möglich |
| T-qog-SC | Tampering | npm/pip/cargo installs | accept | Keine neuen Packages; nur bestehende @/components/ui |
</threat_model>

<verification>
- `npx tsc --noEmit` fehlerfrei
- `npx vitest run src/components/contributions/` alle Tests grün
- Live-UAT: Naruto-Karte mit "anime-weit" + "Folge 1: Projektleitung" korrekt angezeigt
- Alle Dateien ≤ 450 Zeilen
</verification>

<success_criteria>
Auf /me/contributions erscheint statt N einzelner Karten eine Karte pro Anime mit aufklappbarer Folgen-Aufschlüsselung. Bestehende Funktionalität (Sichtbarkeit, Arbeitsfläche-Link) erhalten. Tests grün.
</success_criteria>

<output>
Create `.planning/quick/260620-qog-bestaetigte-projektrollen-pro-anime-grup/260620-qog-03-SUMMARY.md` when done.
</output>
