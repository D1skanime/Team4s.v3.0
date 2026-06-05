# Phase 79: Medien-Ownership in UI durchsetzen — Research

**Recherchiert:** 2026-06-06
**Domain:** Frontend Upload-Surfaces / Status-Mapping / Contract-Erweiterung / Gemeinsame Pflichtfeld-Komponente
**Confidence:** HIGH (alle Kernaussagen direkt aus Quellcode verifiziert)

---

<user_constraints>
## User Constraints (aus CONTEXT.md)

### Locked Decisions

- **D-01:** Ein einzelnes „Status"-Dropdown mit 6 fachlichen Werten in der UI: *intern / in Prüfung / öffentlich / abgelehnt / archiviert / entfernt*.
- **D-02:** Festes Mapping der 6 Labels auf die zwei DB-Achsen (`visibilities` + `review_statuses`).
- **D-03:** Sicherer Default für jeden neuen Upload = „in Prüfung" + nicht-öffentlich. Berechtigte dürfen im selben Flow direkt freigeben.
- **D-04:** Freigeben/Öffentlich-Setzen bleibt primär der Phase-78-Review-Fläche vorbehalten.
- **D-05:** Owner-Typ + Owner-ID als read-only Hinweis-Chip/Banner im Upload-Bereich — folgt fix aus der Fläche.
- **D-06:** Upload hart blockieren, wenn Owner-Typ/-ID nicht auflösbar ist (verständliche Fehlermeldung).
- **D-07:** Eine gemeinsame, wiederverwendbare Pflichtfeld-/Owner-Kontext-Komponente für alle 5 Surfaces.
- **D-08:** Bestehendes Kategorie-Vokabular je Surface beibehalten, nur pflichtig + sichtbar machen — kein neues Quermodell.
- **D-09:** Zweiklassiges Modell: Identity-/Branding-Slots (sofort sichtbar/freigegeben), Prozessmedien (vollständiges Pflichtfeld-Formular + Default „in Prüfung").

### Claude's Discretion

- Exakte Mapping-Tabelle/Feldform für D-01/D-02 (ein Dropdown vs. interne Repräsentation).
- Ob es neue Spalten/Migrationen braucht oder das Bestehende ausreicht — Default-Erwartung ist **schema-leicht**.
- CSS-Modul-Struktur, exakte Label-/Toast-/Empty-State-Texte, Capability-Feinauflösung pro Surface, genaue Platzierung des Owner-Chips.

### Deferred Ideas (AUSSERHALB DES SCOPE)

- Edit/Delete-Lifecycle eigener scoped Uploads (Contributor-Workspace).
- Zentrale gruppenübergreifende Medien-/Owner-Übersicht (`/admin/users` / Phase 80).
- Owner-Typ-Umhängen/Re-Kategorisieren als Review-Aktion.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Beschreibung | Research-Befund |
|----|-------------|-----------------|
| Lock G | Ownership-Matrix: Owner-Typ + Owner-ID + Kategorie + Sichtbarkeit + Reviewstatus werden beim Upload erzwungen | Keine dieser Felder wird derzeit bei `media_assets` beim Upload gesetzt — dies ist das zentrale Gap |
| Lock I | Rechte sind auf Owner-Scope beschränkt, keine pauschalen Medienrechte | Permissions-System mit `CanForFansubGroup` / `CanForReleaseVersion` existiert bereits; Owner-Scope im Junction-Kontext |
| Lock K | Contract/API-Disziplin: OpenAPI + admin-content.yaml + DTO + Repo + api.ts gemeinsam ändern | Upload-Request-Bodies fehlen aktuell `visibility_id`/`review_status_id` in Schema + Backend + api.ts |
| Lock A | Keine Parallelmodelle / kein neues Medienmodell | Schema ist schema-leicht erweiterbar; `visibility_id`/`review_status_id` existieren bereits auf `media_assets` (Migration 0097) |

</phase_requirements>

---

## Summary

Phase 79 baut eine gemeinsame fachliche Pflichtfeld-Schicht über alle 5 kanonischen Upload-Surfaces. Der `authorizedUploadXhr`-Transport bleibt unverändert. Was fehlt, ist eine einheitliche UI-Schicht (D-07) und die Durchleitung von `visibility_id`/`review_status_id` (sowie ggf. `owner_member_id`) an den Backend-Endpunkten.

Die Schema-Arbeit ist bereits geleistet: `media_assets.visibility_id` und `media_assets.review_status_id` existieren seit Migration 0097. Die Lookup-Tabellen `review_statuses` (5 Codes: `in_review`, `approved`, `rejected`, `archived`, `removed`) und `visibilities` (5 Werte: `public`, `registered`, `fansubber`, `staff`, `private`) sind befüllt. Kein neues Schema ist nötig.

Die 6 fachlichen UI-Labels (D-02) mappen vollständig auf diese zwei Achsen. Die Backend-Handler (`UploadFansubMedia`, `UploadReleaseVersionMedia`, `UploadReleaseThemeAsset`) schreiben `visibility_id`/`review_status_id` jedoch noch nicht. Die Frontend-Upload-Helfer (`uploadFansubMedia`, `uploadReleaseVersionMedia`, `uploadAdminReleaseThemeAsset`) übermitteln diese Felder ebenfalls nicht. Dies ist der Lock-K-konforme Erweiterungspfad: openapi.yaml → Backend-Handler → models → api.ts → gemeinsame Komponente.

`MediaUpload.tsx` hat aktuell 540 Zeilen (über dem 450-Zeilen-Limit) und muss beim Einbinden der gemeinsamen Komponente gesplittet werden.

**Primäre Empfehlung:** Gemeinsame Komponente `MediaOwnershipContext` bauen (D-07), alle 5 Surfaces einbinden, Backend-Upload-Endpunkte um `visibility_id`/`review_status_id` erweitern (Lock K), `MediaUpload.tsx` auf ≤450 Zeilen splitten.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Owner-Kontext-Ableitung (Owner-Typ/ID aus Route/Props) | Frontend — Surface-Komponente | — | Owner folgt fix aus dem Kontext der jeweiligen Fläche (D-05); kein API-Aufruf nötig |
| Status-Default setzen (D-03/D-09) | Frontend — gemeinsame Pflichtfeld-Komponente | Backend (serverseitig absichern) | Default sollte frontend-seitig vorbefüllt werden, aber Backend muss Invariante halten |
| Blockier-Logik bei fehlendem Owner (D-06) | Frontend — vor `authorizedUploadXhr` | — | Verhindert sinnlose Netzwerk-Calls |
| Sichtbarkeit/Reviewstatus persistieren | Backend — Upload-Handler + Repository | Frontend (Übermittlung via FormData) | `media_assets.visibility_id`/`review_status_id` werden serverseitig gesetzt |
| Kategorie-Erzwingung | Backend — bestehende CHECK-Constraints | Frontend (Dropdown/read-only) | DB-seitig bereits durchgesetzt (Migration 0059) |
| Branding-Slot: Sofort-Freigabe (D-09) | Backend — Handler für Fansub-/Member-Media | — | Handler setzt `review_status = approved`, `visibility = public` für Branding-Slots |
| Prozessmedien: in-Prüfung-Default (D-03) | Backend — RVM-Handler | Frontend (UI-Default) | RVM-Handler setzt `review_status = in_review` + nicht-öffentliche Sichtbarkeit |

---

## Standard Stack

### Core (keine neuen Abhängigkeiten)

| Komponente | Version | Zweck | Warum Standard |
|-----------|---------|-------|---------------|
| `@/components/ui` — `Select`, `FormField`, `Button`, `Card` | Projekt-intern | Gemeinsame Pflichtfeld-Komponente (D-07) | CLAUDE.md-Pflicht; ESLint-Enforcement |
| `authorizedUploadXhr` (`frontend/src/lib/api.ts` ≈Z. 2178) | Projekt-intern | Transport-Layer — wird wiederverwendet (Lock G) | Kein neuer Transport |
| Phase-72-Schema (`visibility_id` + `review_status_id` auf `media_assets`) | Migration 0097 | Status-Persistenz | Bereits im DB-Schema |
| `review_statuses` Lookup-Tabelle | Migration 0097 | 5 Review-Codes + deutsche Labels | Befüllt: `in_review`, `approved`, `rejected`, `archived`, `removed` |
| `visibilities` Lookup-Tabelle | Migration 0037 | 5 Sichtbarkeits-Werte | Befüllt: `public`, `registered`, `fansubber`, `staff`, `private` |

**Installation:** Keine neuen Pakete erforderlich. [VERIFIED: direkte Codebase-Analyse]

---

## Package Legitimacy Audit

Keine externen Pakete werden in dieser Phase installiert. Die Phase ist reine Frontend-Komponenten + Backend-Erweiterung auf bestehendem Stack.

**Packages removed due to slopcheck [SLOP] verdict:** keine
**Packages flagged as suspicious [SUS]:** keine

---

## Architecture Patterns

### System Architecture Diagram

```
[Surface-Komponente]
  ├── Leitet Owner-Typ + Owner-ID aus Route-Param / Prop ab
  ├── Bindet <MediaOwnershipContext> ein (D-07)
  │     ├── Owner-Chip (read-only): "Upload für: Gruppe X · Owner-Typ: fansub_group"
  │     ├── Kategorie (read-only Chip ODER Dropdown — je Surface-Klasse)
  │     ├── Status-Dropdown (6 Labels, D-01) ODER Sofort-Freigabe-Hinweis (Branding-Slots, D-09)
  │     └── Blockier-Logik: fehlendem Owner → Fehlermeldung, kein Upload (D-06)
  │
  ├── [Eigene Upload-Logik der Surface]
  │     └── Ruft vorhandenen api.ts-Helfer auf (z.B. uploadFansubMedia, uploadReleaseVersionMedia)
  │         + übergibt visibility_id + review_status_id aus <MediaOwnershipContext>
  │
  └── authorizedUploadXhr (unveränderter Transport)

[Backend-Handler]
  ├── Nimmt visibility_id + review_status_id aus FormData entgegen
  ├── Branding-Slots: setzt approved + public (D-09)
  ├── Prozessmedien: setzt in_review + private (D-03)
  └── Schreibt in media_assets.visibility_id / review_status_id
```

### Empfohlene Projekt-Struktur (neue Dateien)

```
frontend/src/components/admin/media/
├── MediaOwnershipContext.tsx      # D-07: gemeinsame Pflichtfeld-Komponente
├── MediaOwnershipContext.module.css
└── mediaStatusMapping.ts          # D-02: 6-Label ↔ visibility+review_status Mapping

frontend/src/components/admin/
├── MediaUpload.tsx                 # Surface 1: wird gesplittet (540Z → ≤450Z)
└── MediaUploadCore.tsx            # ausgelagerter Upload-Kern (nach Split)
```

### Pattern 1: `MediaOwnershipContext`-Komponente (D-07)

**Was:** Eine einheitliche Pflichtfeld-/Owner-Kontext-Komponente, die alle 5 Surfaces einbinden.
**Wann:** Immer vor dem Auslösen von `authorizedUploadXhr`.

```tsx
// Quelle: Designableitung aus D-05/D-06/D-07/D-08 (CONTEXT.md)
interface MediaOwnershipContextProps {
  ownerType: 'fansub_group' | 'anime' | 'release_theme' | 'release_version' | 'member'
  ownerID: number | null
  ownerLabel: string // z.B. "Gruppe «SubTeam»"
  categoryMode: 'slot' | 'dropdown' // slot = read-only Chip, dropdown = echte Auswahl
  categoryValue?: string // für slot-Surfaces: fix aus der Surface
  categoryOptions?: Array<{ value: string; label: string }> // für dropdown-Surfaces
  statusPolicy: 'immediate' | 'in_review' // immediate = Branding (D-09), in_review = Standard (D-03)
  disabled?: boolean
  onContextChange: (ctx: MediaOwnershipContextValue) => void
}

interface MediaOwnershipContextValue {
  ownerResolved: boolean        // false → Upload blockieren (D-06)
  visibilityID: number | null   // aus D-02-Mapping
  reviewStatusID: number | null // aus D-02-Mapping
  categoryValue: string
}
```

**Verwendetes UI-Primitive:** `Select` (für Status-Dropdown), `FormField` (Wrapper), `Badge`/`Card` (Owner-Chip) aus `@/components/ui`.

### Pattern 2: D-02 Status-Mapping (TypeScript-Konstante)

```ts
// Quelle: D-02 (CONTEXT.md) + Migration 0097 + Migration 0037 (verifiziert)
// IDs werden zur Laufzeit per Lookup-Abfrage aufgelöst ODER als seedbare Konstanten gehalten

// review_statuses.code → ID (aus Migration 0097):
// in_review, approved, rejected, archived, removed

// visibilities.name → ID (aus Migration 0037):
// public, registered, fansubber, staff, private

export type StatusLabel =
  | 'öffentlich'
  | 'intern'
  | 'in Prüfung'
  | 'abgelehnt'
  | 'archiviert'
  | 'entfernt'

export interface StatusAxes {
  visibilityCode: string   // 'public' | 'private' | ...
  reviewStatusCode: string // 'approved' | 'in_review' | ...
}

export const STATUS_LABEL_MAPPING: Record<StatusLabel, StatusAxes> = {
  'öffentlich':   { visibilityCode: 'public',   reviewStatusCode: 'approved' },
  'intern':       { visibilityCode: 'private',   reviewStatusCode: 'approved' },
  'in Prüfung':   { visibilityCode: 'private',   reviewStatusCode: 'in_review' },
  'abgelehnt':    { visibilityCode: 'private',   reviewStatusCode: 'rejected' },
  'archiviert':   { visibilityCode: 'private',   reviewStatusCode: 'archived' },
  'entfernt':     { visibilityCode: 'private',   reviewStatusCode: 'removed' },
}
```

**Lookup-ID-Auflösung:** Die IDs aus `visibilities` und `review_statuses` sind nicht konstant (BIGSERIAL). Der Planner muss entscheiden: (a) GET-Endpoint für Lookup-Daten oder (b) Backend-seitig Code-basierte Auflösung (Code → SELECT id FROM review_statuses WHERE code = $1). Option (b) ist schema-leichter und konsistenter mit dem bisherigen Muster in den Projektions-Repos. [ASSUMED: ID-Auflösungsstrategie — Planner wählt]

### Pattern 3: Blockier-Logik (D-06)

```tsx
// Vor authorizedUploadXhr-Aufruf in MediaOwnershipContext (oder aufrufender Surface):
if (!ownerID || ownerID <= 0) {
  // Zeigt verständliche Fehlermeldung — kein technischer Error
  setError('Upload nicht möglich: Dieser Upload-Bereich hat keinen gültigen Owner-Kontext.')
  return
}
```

### Anti-Patterns vermeiden

- **Native `<select>` oder `<input>` direkt verwenden:** verboten per CLAUDE.md; `Select`/`FormField` aus `@/components/ui` sind Pflicht.
- **`visibility_id`/`review_status_id` im Frontend als Roh-IDs fest eincodieren:** Die IDs kommen aus BIGSERIAL — immer über Code-Lookup auflösen.
- **Neuen Upload-Transport bauen:** Lock G verbietet das explizit; `authorizedUploadXhr` bleibt der einzige Transport.
- **`review_status_id` nur im Frontend setzen, nicht im Backend absichern:** Lock K erfordert vollständige Durchleitung bis zum Repository; Frontend-Default allein ist nicht genug.
- **`MediaUpload.tsx` direkt erweitern ohne Split:** Datei hat bereits 540 Zeilen — über dem 450-Zeilen-Limit. Split ist Pflicht.

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|-------------------|-------------|-------|
| Visibility-/Reviewstatus-Dropdown | Eigenen `<select>` | `Select` + `FormField` aus `@/components/ui` | CLAUDE.md-Pflicht; ESLint-Enforcement |
| Upload-Transport | Neuen XHR/fetch | `authorizedUploadXhr` (`api.ts` ≈Z. 2178) | Lock G; 401-Retry, Auth-Header already built in |
| Status-Mapping | Eigene String-Vergleiche ohne Typen | `STATUS_LABEL_MAPPING`-Konstante + TypeScript-Union | Typsicherheit, zentraler Änderungsort |
| Owner-ID-Validierung | Eigene Null-Checks verstreut | Zentralisierung in `MediaOwnershipContext.onContextChange` | Drift-Prävention (SC5) |

---

## Surfaces: Code-Befunde

### Surface 1 — Fansub Branding (MediaUpload.tsx)

| Dimension | Befund |
|-----------|--------|
| Trigger | Dropzone-Click / Drag-Drop → `submitUpload(file)` |
| Transport | `uploadFansubMedia({ fansubID, kind, file })` → POST `/api/v1/admin/fansubs/:id/media` |
| Owner-Typ/-ID | `fansubID: number` als Prop; Owner-Typ = `fansub_group` (implizit) |
| Kategorie | `type: FansubMediaKind` als Prop (`logo` | `banner`) — read-only Slot |
| visibility_id/review_status_id | **Werden NICHT gesetzt** — weder in FormData noch im Handler |
| Zeilen | **540 Zeilen** — über dem 450-Zeilen-Limit; Split erforderlich |
| FormData-Felder heute | `kind`, `file` |
| OpenAPI-Contract | `POST /api/v1/admin/fansubs/{id}/media` — request body nur `kind` + `file`; keine Status-Felder |

[VERIFIED: direkte Codeanalyse `MediaUpload.tsx`, `fansub_media_upload.go`, `openapi.yaml` Z. 3473]

### Surface 2 — Anime Assets (AnimeJellyfinAssetUploadControls.tsx + createAssetUploadPlan.ts)

| Dimension | Befund |
|-----------|--------|
| Trigger | `handleCoverUpload`, `handleBannerUpload` etc. in `AnimeJellyfinAssetUploadControls.tsx` |
| Transport | `uploadAdminAnimeMedia({ animeID, assetType, file })` → POST `/api/v1/admin/upload` |
| Owner-Typ/-ID | `animeID: number` als Prop; Owner-Typ = `anime` |
| Kategorie | `assetType: AdminAnimeUploadAssetType` (`poster`/`banner`/`logo`/`background_video`) — read-only Slot per Upload-Aktion |
| visibility_id/review_status_id | **Werden NICHT gesetzt** |
| FormData-Felder heute | `entity_type`, `entity_id`, `asset_type`, `file` |

[VERIFIED: direkte Codeanalyse `AnimeJellyfinAssetUploadControls.tsx`, `api.ts` ≈Z. 4090]

### Surface 3 — Release Theme Assets (ReleaseThemeAssetsSection.tsx)

| Dimension | Befund |
|-----------|--------|
| Trigger | `handleUpload()` → `uploadAdminReleaseThemeAsset` |
| Transport | POST `/api/v1/admin/fansubs/:fansubId/anime/:animeId/theme-assets` |
| Owner-Typ/-ID | `fansubID + animeID` als Props; kein direkter Owner-Typ-Wert als String |
| Kategorie | `themeID` aus `themes[0].id` — Slot (kein Dropdown) |
| visibility_id/review_status_id | **Werden NICHT gesetzt** |
| FormData-Felder heute | `theme_id`, `file` |

[VERIFIED: direkte Codeanalyse `ReleaseThemeAssetsSection.tsx`, `api.ts` ≈Z. 4301]

### Surface 4 — Release-Version Process Media (ReleaseVersionMediaSection.tsx + useReleaseVersionMedia.ts)

| Dimension | Befund |
|-----------|--------|
| Trigger | `handleUploadClick()` → `media.startUpload(selectedCategory, selectedFiles, ...)` → `uploadReleaseVersionMedia` |
| Transport | POST `/api/v1/admin/release-versions/:versionId/media` |
| Owner-Typ/-ID | `versionId: number` als Prop; Owner-Typ = `release_version` |
| Kategorie | `selectedCategory: ReleaseVersionMediaCategory` als State — **echtes Dropdown** (`screenshot`/`typesetting_karaoke`/`fun_outtake`/`other`) |
| visibility_id/review_status_id | **Werden NICHT gesetzt** — weder im Frontend noch im Backend-Handler |
| FormData-Felder heute | `category`, `files[]` (OpenAPI bestätigt) |
| Backend-Handler | `processOneRVMFile` → `CreateMediaAssetWithStatusTx(ctx, tx, createInput, "processing")` — keine visibility/review_status |

[VERIFIED: direkte Codeanalyse `ReleaseVersionMediaSection.tsx`, `useReleaseVersionMedia.ts`, `admin_content_release_version_media.go` Z. 388–426, `openapi.yaml` Z. 5139]

### Surface 5 — Member Media (MemberAvatarCard.tsx + ProfileBackgroundCard.tsx)

| Dimension | Befund |
|-----------|--------|
| Trigger | `onAvatarSelected` / `onBackgroundSelected` — Callbacks von `page.tsx` aus |
| Transport | Nicht sichtbar in den Cards selbst; `uploadOwnProfileStoryImage` existiert für Story-Bilder; Avatar-Upload läuft über `AvatarCropDialog` → `onAvatarSelected` → aufrufende Page |
| Owner-Typ/-ID | `profile.avatar.owner_member_id` (Migration 0090, `media_assets.owner_member_id`) |
| Kategorie | Slot (Avatar / Hintergrund / Story-Bild) — read-only |
| visibility_id/review_status_id | **Werden NICHT gesetzt** |
| FormData-Felder heute | Member-Avatar-Upload: `file` (per `AvatarCropDialog` → page-level Handler) |

[VERIFIED: direkte Codeanalyse `MemberAvatarCard.tsx`, `ProfileBackgroundCard.tsx`, Migration 0090]

---

## Status-Modell: vollständiges Mapping (D-02)

Verifizierte DB-Werte aus Migration 0097 (`review_statuses`) und Migration 0037 (`visibilities`):

| UI-Label (D-01) | visibility.name | review_status.code | Klasse |
|-----------------|-----------------|-------------------|--------|
| öffentlich | `public` | `approved` | Prozessmedien + Branding |
| intern | `private` | `approved` | Prozessmedien |
| in Prüfung | `private` | `in_review` | **Default Prozessmedien (D-03)** |
| abgelehnt | `private` | `rejected` | Prozessmedien |
| archiviert | `private` | `archived` | Prozessmedien |
| entfernt | `private` | `removed` | Prozessmedien |
| *(Branding-Slot-Default, D-09)* | `public` | `approved` | Branding-Slots |

**review_statuses.label_de** (für UI-Anzeige in Lesezustand): `in Prüfung`, `freigegeben`, `abgelehnt`, `archiviert`, `entfernt` — aus Migration 0097.

[VERIFIED: Migration 0097, Migration 0037, media_ownership_projection_repository.go]

---

## Contract-Disziplin (Lock K): Änderungsumfang

### Was muss erweitert werden

| Schicht | Datei | Änderung |
|---------|-------|----------|
| OpenAPI | `shared/contracts/openapi.yaml` | Request-Bodies für `uploadFansubMedia`, `uploadReleaseVersionMedia`, `uploadAdminReleaseThemeAsset`, anime-upload — neue optionale Felder `visibility_code` + `review_status_code` (Strings, nicht IDs — ID-Auflösung im Backend) |
| Backend-Handler | `fansub_media_upload.go` | Liest `visibility_code`/`review_status_code` aus FormData; löst IDs auf; schreibt in `media_assets` |
| Backend-Handler | `admin_content_release_version_media.go` | `processOneRVMFile` → Visibily/ReviewStatus per Code-Lookup + INSERT |
| Backend-Handler | `admin_content_release_theme_assets.go` | Analog |
| Models | `backend/internal/models/media.go` | `MediaAssetCreateInput` um `VisibilityCode *string` + `ReviewStatusCode *string` erweitern |
| Repository | `media_repository.go` | `CreateMediaAsset`/`CreateMediaAssetWithStatusTx` → zusätzliche ID-Lookup-Queries; INSERT mit `visibility_id`, `review_status_id` |
| api.ts | `frontend/src/lib/api.ts` | `uploadFansubMedia`, `uploadReleaseVersionMedia`, `uploadAdminReleaseThemeAsset` → Optionen um `visibilityCode`/`reviewStatusCode` erweitern |
| Neue Komponente | `frontend/src/components/admin/media/MediaOwnershipContext.tsx` | D-07 gemeinsame Pflichtfeld-Komponente |
| Neue Hilfsdatei | `frontend/src/components/admin/media/mediaStatusMapping.ts` | D-02 Mapping-Konstante |
| Split | `frontend/src/components/admin/MediaUpload.tsx` | Auf ≤450 Zeilen splitten (aktuell 540Z) |

**Kein neues Schema nötig** — `media_assets.visibility_id` + `review_status_id` existieren (Migration 0097). [VERIFIED: Migration 0097, media_repository.go (bestätigt keine Schreibpfade für diese Spalten)]

### OpenAPI-Erweiterungsmuster (Lock K)

```yaml
# Erweiterung des uploadFansubMedia request body (openapi.yaml ≈Z. 3488):
properties:
  kind:
    $ref: "#/components/schemas/FansubMediaKind"
  file:
    type: string
    format: binary
  visibility_code:           # NEU — optional; Default: 'public' für Branding (D-09)
    type: string
    nullable: true
  review_status_code:        # NEU — optional; Default: 'approved' für Branding (D-09)
    type: string
    nullable: true
```

---

## Common Pitfalls

### Pitfall 1: BIGSERIAL-IDs hardcoden

**Was schief geht:** `review_status_id = 1` (for `in_review`) im Code fest eingetragen.
**Warum:** BIGSERIAL — IDs können in verschiedenen Umgebungen abweichen, besonders wenn Migrationen nachträglich liefen.
**Vermeidung:** Immer `SELECT id FROM review_statuses WHERE code = $1` / `SELECT id FROM visibilities WHERE name = $1` — Backend löst auf. Frontend übergibt Code-Strings.

### Pitfall 2: Visibility-Default vergessen (NULL statt explicit)

**Was schief geht:** `visibility_id = NULL` auf neuen media_assets nach Phase 79 — Medien landen ohne explizite Sichtbarkeit.
**Warum:** Spalten sind nullable (Migration 0097 — kein NOT NULL).
**Vermeidung:** Backend-Handler: wenn kein Wert übergeben, Branding-Slot-Default `public/approved` bzw. Prozessmedien-Default `private/in_review` setzen. Nicht dem Frontend überlassen.

### Pitfall 3: MediaUpload.tsx-Split-Vergessenheit

**Was schief geht:** Direkt in `MediaUpload.tsx` (540Z) neue Komponente einbetten — resultiert in >600Z-Datei.
**Warum:** CLAUDE.md 450-Zeilen-Limit.
**Vermeidung:** Split _vor_ dem Hinzufügen der neuen Schicht: Upload-Kern (Dropzone, Preview, Actions) → `MediaUploadCore.tsx`; Owner-Context-Einbindung bleibt in `MediaUpload.tsx` als Koordinator.

### Pitfall 4: Owner-Chip ohne auflösbaren Owner → falscher Upload

**Was schief geht:** Surface rendert zwar den Owner-Chip, blockiert aber den Upload bei `ownerID = null` nicht — `authorizedUploadXhr` wird trotzdem ausgelöst.
**Warum:** D-06 muss explizit als Guard _vor_ dem Upload-Call platziert werden.
**Vermeidung:** `onContextChange` gibt `ownerResolved: boolean` zurück; Surface prüft diesen Wert im Submit-Handler.

### Pitfall 5: Branding-Slot-Default vs. Prozessmedien-Default vermischt

**Was schief geht:** Fansub-Logo erhält `in_review`-Default — blockiert sofortige Sichtbarkeit der Gruppen-Identität.
**Warum:** D-09 definiert zwei Klassen; ohne explizites `statusPolicy`-Prop geht der Default-Fall verloren.
**Vermeidung:** `MediaOwnershipContext` bekommt `statusPolicy: 'immediate' | 'in_review'` — jede Surface deklariert ihre Klasse explizit.

---

## Code Examples

### Aufrufen von `uploadFansubMedia` mit Status-Felder (nach Lock-K-Erweiterung)

```ts
// Quelle: Designableitung aus api.ts ≈Z. 2252 (bestehend) + D-02 (CONTEXT.md)
await uploadFansubMedia({
  fansubID,
  kind: type,
  file,
  visibilityCode: 'public',       // Branding-Slot (D-09) — sofort sichtbar
  reviewStatusCode: 'approved',   // Branding-Slot (D-09)
  onProgress: setProgress,
})
```

### Backend-Handler-Erweiterungsmuster (Go)

```go
// Quelle: Designableitung aus fansub_media_upload.go + D-02 + Migration 0097
// visibilityCode und reviewStatusCode aus FormData lesen:
visibilityCode := strings.TrimSpace(c.PostForm("visibility_code"))
reviewStatusCode := strings.TrimSpace(c.PostForm("review_status_code"))

// Defaults für Branding-Slots (D-09):
if visibilityCode == "" {
    visibilityCode = "public"      // Branding-Slot sofort sichtbar
}
if reviewStatusCode == "" {
    reviewStatusCode = "approved"  // Branding-Slot direkt freigegeben
}

// ID-Auflösung im Repository (Beispielmuster):
var visibilityID int64
err = db.QueryRow(ctx, "SELECT id FROM visibilities WHERE name = $1", visibilityCode).Scan(&visibilityID)

var reviewStatusID int64
err = db.QueryRow(ctx, "SELECT id FROM review_statuses WHERE code = $1", reviewStatusCode).Scan(&reviewStatusID)
```

---

## State of the Art

| Alter Stand | Aktueller Stand nach Phase 79 | Wann | Impact |
|-------------|-------------------------------|------|--------|
| Upload ohne visibility/review_status | Alle Uploads setzen Pflichtfelder | Phase 79 | SC1/SC2: Keine owner-losen/status-losen Medien mehr |
| Jede Surface hat eigenes Formular ohne Owner-Sichtbarkeit | Gemeinsame `MediaOwnershipContext`-Komponente in allen 5 Surfaces | Phase 79 | SC5: Konsistenz, weniger Drift |
| `media_assets.visibility_id/review_status_id` = NULL bei neuen Uploads | Explizit gesetzt bei jedem Upload | Phase 79 | SC2 erfüllt |

**Deprecated/überholt nach Phase 79:**
- Direktes Aufrufen von `uploadFansubMedia`/`uploadReleaseVersionMedia` ohne Status-Felder: durch erweiterte Signaturen ersetzt.

---

## Assumptions Log

| # | Claim | Abschnitt | Risiko wenn falsch |
|---|-------|-----------|-------------------|
| A1 | ID-Auflösungsstrategie: Backend löst `visibility_code`/`review_status_code` per SELECT auf — kein GET-Endpoint für Lookup-IDs nötig | Contract-Disziplin, Code Examples | Niedriges Risiko — beide Strategien funktionieren; Backend-seitige Auflösung ist konsistenter mit bestehendem Projektions-Muster |
| A2 | `uploadAdminAnimeMedia` (Anime-Assets) wird ebenfalls um Status-Felder erweitert — auch wenn Anime-Assets technisch Branding-ähnlich sind | Surface 2 | Medium — wenn Anime-Assets eine andere Sofort-Freigabe-Regel erhalten, braucht Surface 2 eigene `statusPolicy`-Konfiguration |
| A3 | Member-Avatar-Upload-Pfad läuft über page-level Handler (nicht direkt in `MemberAvatarCard.tsx`) — Erweiterung muss in `page.tsx` oder `me/profile`-Seiten-Logik erfolgen | Surface 5 | Medium — genaue Stellen für Status-Erweiterung müssen beim Planen der Surface-5-Tasks verifiziert werden |

**Wenn diese Tabelle erweitert wird:** Alle Annahmen wurden so minimal wie möglich gehalten; Kernaussagen zu Schema, Handlers und Frontend-Code sind direkt verifiziert.

---

## Open Questions

1. **Lookup-Endpoint für Status-Optionen**
   - Was wir wissen: Die Review-Status-Codes sind konstant (5 Werte aus Migration 0097), die Visibility-Codes ebenfalls (5 Werte aus Migration 0037).
   - Unklar: Ob die Frontend-Komponente die Lookup-IDs vom Server abfragt oder ob die Codes (Strings) ausreichen und die ID-Auflösung komplett im Backend bleibt.
   - Empfehlung: Backend löst auf — Frontend übergibt nur Code-Strings. Kein neuer GET-Endpoint nötig.

2. **Member-Avatar-Upload-Pfad für Status-Erweiterung**
   - Was wir wissen: `MemberAvatarCard.tsx` triggert über Callback `onAvatarSelected` — die eigentliche Upload-Logik liegt in der aufrufenden Page.
   - Unklar: Genaue Datei/Zeile in `me/profile/page.tsx` wo `uploadOwnMemberAvatar`-ähnlicher Aufruf stattfindet.
   - Empfehlung: Planner verifiziert beim Surface-5-Plan.

---

## Environment Availability

Keine externen Abhängigkeiten über den bestehenden Stack hinaus. PostgreSQL (Lookup-Tabellen) und Docker-Compose-Umgebung vorausgesetzt (aus CLAUDE.md bekannt).

**Step 2.6: SKIPPED (keine neuen externen Abhängigkeiten identifiziert — alle erforderlichen Services laufen bereits).**

---

## Validation Architecture

### Test Framework

| Eigenschaft | Wert |
|-------------|------|
| Framework | Vitest 3 (`frontend/vitest.config.ts`) |
| Config-Datei | `frontend/vitest.config.ts` — vorhanden |
| Schnell-Run | `cd frontend && npx vitest run --reporter=verbose` |
| Full-Suite | `cd frontend && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Verhalten | Test-Typ | Automatisierter Befehl | Datei vorhanden? |
|--------|-----------|---------|----------------------|----------------|
| Lock G / D-05 | Owner-Chip zeigt korrekten Owner-Typ + Owner-ID | unit | `npx vitest run --reporter=verbose src/components/admin/media/MediaOwnershipContext.test.tsx` | ❌ Wave 0 |
| Lock G / D-06 | Upload wird blockiert wenn ownerID null | unit | wie oben | ❌ Wave 0 |
| D-01/D-02 | STATUS_LABEL_MAPPING deckt alle 6 Labels korrekt ab | unit | `npx vitest run --reporter=verbose src/components/admin/media/mediaStatusMapping.test.ts` | ❌ Wave 0 |
| D-03 | Default für Prozessmedien = in_review + private | unit | `npx vitest run --reporter=verbose src/components/admin/media/MediaOwnershipContext.test.tsx` | ❌ Wave 0 |
| D-09 | Branding-Slot: statusPolicy='immediate' → approved + public | unit | wie oben | ❌ Wave 0 |
| SC5 | MediaUpload.tsx nach Split: Dateigröße ≤450 Zeilen | static | `wc -l frontend/src/components/admin/MediaUpload.tsx` | ✅ (bestehende Datei — nach Split prüfen) |
| Lock K | Upload-Request enthält visibility_code + review_status_code | smoke | manuell: Browser-DevTools → Network-Tab beim Fansub-Logo-Upload | manuell |

### Sampling Rate

- **Pro Task-Commit:** `cd frontend && npx vitest run src/components/admin/media/ --reporter=verbose`
- **Pro Wave-Merge:** `cd frontend && npx vitest run`
- **Phase Gate:** Full Suite grün vor `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `frontend/src/components/admin/media/MediaOwnershipContext.test.tsx` — deckt D-05, D-06, D-03, D-09
- [ ] `frontend/src/components/admin/media/mediaStatusMapping.test.ts` — deckt D-01/D-02 Mapping-Vollständigkeit

---

## Security Domain

### Applicable ASVS Categories

| ASVS-Kategorie | Applies | Standard-Kontrolle |
|----------------|---------|-------------------|
| V2 Authentication | ja | `authorizedUploadXhr` mit 401-Retry + Token-Refresh — bereits implementiert |
| V4 Access Control | ja | `CanForFansubGroup`/`CanForReleaseVersion` im Backend; Owner-Scoping via Junction |
| V5 Input Validation | ja | `CHECK`-Constraints auf `category` (Migration 0059); Code-Validierung in Backend-Handlers |
| V6 Cryptography | nein | — |

### Known Threat Patterns

| Pattern | STRIDE | Standardmäßige Absicherung |
|---------|--------|--------------------------|
| Upload ohne Owner-Kontext → öffentliche Medien | Tampering | D-06-Blockier-Logik im Frontend + Backend-Default |
| Manipulation von `visibility_code` im Request | Tampering | Backend akzeptiert nur valide Code-Strings (Whitelist per DB-Lookup) |
| Übernahme fremder Medien (falscher owner_member_id) | Elevation of Privilege | `CanForFansubGroup`/`requireMeIdentity`-Gates bereits implementiert |

---

## Sources

### Primary (HIGH confidence)

- Direkte Codeanalyse: `frontend/src/components/admin/MediaUpload.tsx` — Surface 1 vollständiger Code-Stand
- Direkte Codeanalyse: `backend/internal/handlers/fansub_media_upload.go` — Backend-Handler Surface 1
- Direkte Codeanalyse: `backend/internal/handlers/admin_content_release_version_media.go` — Backend-Handler Surface 4
- Direkte Codeanalyse: `database/migrations/0097_v12_status_foundation.up.sql` — Schema-Grundlage Phase 72
- Direkte Codeanalyse: `database/migrations/0037_add_release_decomposition_tables.up.sql` — `visibilities` Lookup
- Direkte Codeanalyse: `database/migrations/0059_release_version_media_schema.up.sql` — RVM Kategorie-Constraint
- Direkte Codeanalyse: `database/migrations/0090_member_story_images.up.sql` — `owner_member_id`
- Direkte Codeanalyse: `backend/internal/models/media.go` — `MediaAssetCreateInput`
- Direkte Codeanalyse: `backend/internal/repository/media_ownership_projection_repository.go` — Projektion bestätigt keine Schreibpfade
- Direkte Codeanalyse: `shared/contracts/openapi.yaml` — Upload-Request-Bodies und MediaOwnershipRow-Schema
- Direkte Codeanalyse: `frontend/src/lib/api.ts` — `authorizedUploadXhr`, alle 6 Upload-Helfer
- Direkte Codeanalyse: `frontend/src/components/ui/index.ts` — verfügbare Primitives
- `.planning/phases/79-medien-ownership-in-ui-durchsetzen/79-CONTEXT.md` — alle D-01..D-09

### Secondary (MEDIUM confidence)

- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` — Surface 4 UI-Code
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx` — Surface 3 UI-Code
- `frontend/src/app/me/profile/components/MemberAvatarCard.tsx` + `ProfileBackgroundCard.tsx` — Surface 5

---

## Metadata

**Confidence Breakdown:**
- Standard Stack: HIGH — direkt aus Codebase verifiziert, keine externen Pakete
- Architecture: HIGH — alle 5 Surfaces konkret verifiziert; Erweiterungspfad klar
- Pitfalls: HIGH — aus direkter Code-Analyse des bestehenden Backend-Handler-Musters abgeleitet
- Status-Mapping: HIGH — aus Migration 0097 direkt verifiziert

**Research-Datum:** 2026-06-06
**Gültig bis:** 2026-07-06 (stabiler Stack, keine Fast-Moving-Dependencies)
