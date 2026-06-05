# Phase 78: Leader Workspace – Review & Pflege - Research

**Recherchiert:** 2026-06-05
**Domäne:** Admin-Workspace `/admin/fansubs/[id]/edit` — Claim-Review, Contribution-Review, Medienprüfung, Phase-76-Vorschläge
**Konfidenz:** HOCH

---

<user_constraints>
## Nutzer-Constraints (aus CONTEXT.md)

### Gesperrte Entscheidungen (LOCKED)

- **D-01:** Bestehende Domänen-Tabs erweitern (Reuse), KEIN neuer Review-Tab.
  Offene Claims im `claims`-Tab (`ClaimManagementPanel`), offene Contributions im
  Contribution-Review-Seam, Medienprüfung an der jeweiligen Owner-Fläche.
- **D-02:** Externe Mitwirkende = nur Review (bestätigen/ablehnen) über bestehende
  Contribution-Seams (`AnimeContributionModal`/`ReviewQueue`), NICHT über Member-Tabs.
- **D-03:** Routing nach Typ in den zuständigen Domänen-Tab, KEIN generischer Sammel-Eingang.
- **D-04:** Eingang strikt auf die aktuell geöffnete Gruppe gescoped, capability-gated.
- **D-05:** Aktionsumfang = Sichtbarkeit + Reviewstatus setzen; Owner-Korrektheit nur
  sichtbar machen/flaggen, NICHT umhängen.
- **D-06:** Medienprüfung an der jeweiligen Owner-Fläche, KEIN zentraler Medienprüf-Tab.
- **D-07:** „Offen zuerst" + „nur offene"-Filter-Toggle in den erweiterten Review-Listen.
- **D-08:** Capability-Gating aus bestehenden `FansubGroupCapabilities`, kein neues
  Contract-Feld.
- **D-09:** Alle Mutationen auditiert mit Akteur-Attribution, Reuse bestehender Audit-Seams.

### Ermessenspielraum (Claude's Discretion)
- Contribution-Review-Ort: `<ReviewQueue>` im `vorschlaege`-Tab ausbauen vs. dedizierte
  Fläche — solange getrennt von Claims (SC1) und nicht im Anime-Modal vergraben.
- Readiness-Sprungmarken-Tiefe: nur Tab öffnen vs. zusätzlich Deep-Link-Filter — solange
  bestehende `MainTab`/`?tab=`-Navigation genutzt, nicht dupliziert.
- Tab-Beschriftung/Filter-UI/Empty-States/Toast-Texte/CSS-Modul-Struktur/Capability-Feinauflösung.

### Zurückgestellte Ideen (AUSSERHALB SCOPE)
- Owner-Typ-Umhängen / Re-Kategorisierung von Medien → Phase 79.
- Zentrale gruppenübergreifende Medienprüf-Ansicht → Phase 80+.
- Generischer Review-Posteingang/Überblick-Tab → verworfen (Lock H).

### Meilenstein-Locks (v1.2, LOCKED)
- **F:** Leader arbeitet in `/admin/fansubs/[id]/edit`, NICHT in `/admin/my-groups/[id]`.
- **G:** Medien folgen strikt der Ownership-Matrix.
- **H:** Claims, Requests und Contributions bleiben getrennt.
- **I:** Rechte scoped; keine Rechte aus Contributions; alle Änderungen auditierbar.
- **K:** Contract/API-Regeln Pflicht; kein ad-hoc-Fetch; OpenAPI + DTO + Repo + `api.ts` gemeinsam.

</user_constraints>

---

## Zusammenfassung

Phase 78 macht die von Phase 77 read-only dargestellten „offenen Posten" im Leader-Workspace aktionierbar. Die zentrale Herausforderung ist nicht neues Bauen, sondern präzises Erweitern bestehender Seams bei einem bereits 3.800-Zeilen-schweren `page.tsx`.

Die wichtigste Korrektur zur CONTEXT.md-Annahme: `AnimeContributionsTab.tsx` ist tatsächlich gelöscht (bestätigt durch git status). Der kanonische Contribution-Review-Seam lebt jetzt ausschließlich im `vorschlaege`-Tab über `<ReviewQueue fansubId={fansubID} />` (page.tsx:3492) und im modalen `AnimeContributionModal` (page.tsx:3494–3503), das aus dem `releases`-Tab über `openAnimeContributions` geöffnet wird. Diese beiden Seams sind getrennt: `ReviewQueue` zeigt User-Proposals (`status='proposed'`), `AnimeContributionModal` pflegt Leader-eingetragene Contributions pro Anime.

Phase 76 (registrierte-User-Vorschläge) ist laut ROADMAP/CONTEXT noch nicht implementiert — es gibt heute kein Backend-/DB-Modell für Typ-Vorschläge (Story/Fehler/Medien). Phase 78 kann den Phase-76-Eingang in Domänen-Tabs routen (D-03/D-04), muss aber mit einem Stub/leeren State beginnen bis Phase 76 ausgeliefert ist, oder Phase 76 muss zuerst completed werden.

Die `FansubGroupCapabilities` haben heute 12 Felder — keine explizite `can_review_contributions`- oder `can_review_claims`-Capability. Für D-08 gilt: `can_manage_members` (ActionFansubGroupMembersManage) deckt Claim-Bestätigung und Contribution-Review bereits ab; `can_edit_group` deckt Medien-Tab. Feinere Capability-Ableitung ist ohne neues Contract-Feld (Lock K) möglich durch Komposition bestehender Felder.

**Primärempfehlung:** Claim-Review-Erweiterung (D-07: „offen zuerst"-Filter) und Contribution-Review-Erweiterung (`vorschlaege`-Tab ausbauen) sind sofort realisierbar auf bestehenden Seams. Medienprüfung braucht neue Endpoints für Sichtbarkeits-/Reviewstatus-Update auf `fansub_group_media` (dort fehlt heute ein PATCH-Endpoint). Phase-76-Vorschlagseingang ist erst nach Phase 76 vollständig verdrahtbar.

---

## Architektonische Verantwortungsmatrix

| Capability | Primär-Tier | Sekundär-Tier | Rationale |
|------------|-------------|---------------|-----------|
| Claim-Review (bestätigen/ablehnen) | API/Backend | Frontend-Admin-UI | `member_claims`/`member_claim_invitations`-Mutations bereits im Backend; Frontend verdrahtet über ClaimManagementPanel |
| Contribution-Proposal-Review | API/Backend | Frontend-Admin-UI | `contribution_review_handler.go` bereits vollständig; Frontend `ReviewQueue` vollständig verdrahtet |
| Historische Member-Pflege | API/Backend | Frontend-Admin-UI | `hist_fansub_group_members`-CRUD bereits via `GroupMembersTab` |
| Medienprüfung Sichtbarkeit/Reviewstatus | API/Backend (NEU) | Frontend-Admin-UI | Heute nur Upload/Delete; PATCH für Visibility/ReviewStatus fehlt für `fansub_group_media` |
| Release-Version-Media Prüfung | API/Backend | Frontend-Admin-UI | `PatchReleaseVersionMedia` existiert; deckt caption/is_preview_candidate, aber kein visibility/review_status |
| Phase-76-Vorschlagseingang routing | Frontend-Admin-UI | — | Typ-Routing D-03 ist UI-Logik; Backend produziert Phase 76 |
| Capability-Gating | Frontend-Admin-UI | Backend | `canUseMainTab`-Pattern; Backend liefert `FansubGroupCapabilities` |
| Audit | API/Backend | — | `AuditLogRepository.Write` pro Mutation; kein Frontend-Bypass |

---

## Befund 1: Contribution-Review-Seam (gelöschter Tab + aktueller Stand)

### Ist-Zustand (verifiziert)

`AnimeContributionsTab.tsx` ist **gelöscht** — bestätigt in git status. Es existiert keine Datei mehr unter diesem Namen. [VERIFIED: git status + Codebase-Grep]

Der aktuelle kanonische Contribution-Review-Seam gliedert sich in **zwei getrennte Surfaces**:

**A. `<ReviewQueue fansubId={fansubID} />` im `vorschlaege`-Tab**
- Datei: `frontend/src/components/contributions/ReviewQueue.tsx`
- Verdrahtung in `page.tsx:3492`: `{activeMainTab === "vorschlaege" ? <ReviewQueue fansubId={fansubID} /> : null}`
- Was es tut: Lädt alle `status='proposed'` Contributions einer Gruppe via `listGroupProposals` (`GET /api/v1/admin/fansubs/{id}/contribution-proposals`), zeigt Bestätigen/Ablehnen per Karte.
- Gating heute: `vorschlaege`-Tab erfordert `capabilities.can_manage_members` (page.tsx:240–241).
- Problem heute: Nutzt native `<textarea>` und `<button>` statt `@/components/ui` — verstößt gegen CLAUDE.md-Primitive-Pflicht (UI-Schuld, Deferred-Todo).
- Audit: `contribution_review_handler.go` schreibt `anime_contribution.confirmed` / `anime_contribution.rejected` ins Audit-Log (Lines 142–151, 213–223).

**B. `AnimeContributionModal` (Leader-eigene Contributions pro Anime)**
- Datei: `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx`
- Öffnung: Aus dem `releases`-Tab über `openAnimeContributions(anime)` (page.tsx:3031), nicht aus dem `vorschlaege`-Tab.
- Was es tut: Upsert von Leader-eingetragenen Contributions für ein spezifisches Anime (Mitglieder-Multi-Select + Rollen + Sichtbarkeit + Status + Release-Version-Zuordnung). Schreibt in `anime_contributions` direkt via `upsertAnimeContribution`.
- Kein eigenständiges Review-Modal — es ist ein Edit-Modal für Leader-eingetragene Contributions.
- Externe Mitwirkende (Nicht-App-Member, historisch aus `hist_fansub_group_members`) werden hier als Member-Auswahl dargestellt.

**Gap zur CONTEXT.md-Annahme:** Die CONTEXT.md referenziert `AnimeContributionModal` als „Reuse für externe Mitwirkende, D-02". Das stimmt — aber der Öffnungspunkt ist der `releases`-Tab, nicht der `vorschlaege`-Tab. Für Phase 78 D-02 (externe Mitwirkende = Review über Contribution-Seams) ist `AnimeContributionModal` der richtige Seam, ABER er wird heute aus dem Releases-Kontext heraus geöffnet. Ein dedizierter „Externe Mitwirkende Review"-Einstieg im `vorschlaege`-Tab müsste `openAnimeContributions` auch von dort aus aufrufen können — oder eine separate lightweight Review-Ansicht als neue Komponente bereitstellen.

**Planungsimplikation:** Der Planner muss entscheiden (Claude's Discretion): entweder (a) `<ReviewQueue>` um Typ-Filterung erweitern (Proposals vs. Leader-Contributions mit `status!='confirmed'`) oder (b) eine neue `OpenContributionsReviewSection`-Komponente im `vorschlaege`-Tab neben `<ReviewQueue>` platzieren. Option (a) ist Reuse; Option (b) ist klarer getrennt aber braucht mehr neue Dateien. In beiden Fällen muss die neue Komponente `≤450 Zeilen` sein und alle UI-Primitives nutzen.

---

## Befund 2: Claim-Review-Seam (`ClaimManagementPanel`)

### Ist-Zustand (verifiziert)

`ClaimManagementPanel.tsx` existiert und ist vollständig funktional. [VERIFIED: Codebase-Read]

**Was es heute tut (ClaimManagementPanel.tsx:73–349):**
1. **Claim-Einladungslinks generieren** — für hist. Member `generateClaimInvitation` + Anzeige + Kopieren.
2. **Aktive Einladungen zurückziehen** — `cancelClaimInvitation`.
3. **Offene Claims bestätigen** — `verifyMemberClaim(groupId, claimId)` → Claim aus Liste entfernen (page.tsx:3491: `{activeMainTab === "claims" ? <ClaimManagementPanel groupId={fansubID} /> : null}`).
4. **Offene Claims ablehnen** — `rejectMemberClaim(groupId, claimId)`.
5. **Neuanlage-Anträge (MemberRequests) bestätigen/ablehnen** — `approveMemberRequest`/`rejectMemberRequest`.

**Gating heute:** `claims`-Tab erfordert `can_view_invitations || can_create_invitation || can_cancel_invitation` (page.tsx:235–239). Kein explizites Gate pro Aktion innerhalb des Panels — alle Aktionen werden bei Tab-Zugang gezeigt.

**D-07-Anforderung: „Offen zuerst" + Filter-Toggle**

Heute zeigt der `pendingClaims`-Bereich bereits nur offene Claims (die API `listPendingMemberClaims` liefert ausschließlich pending). Allerdings fehlt ein "erledigte anzeigen"-Toggle für Claims-Historizität. Der `members`-Bereich zeigt alle `HistFansubGroupMember` ohne offen/erledigt-Filterung.

**Was Phase 78 ergänzen muss:**
- `ClaimManagementPanel` um einen „Nur Offene"-Toggle erweitern (für die Members-Tabelle: historische Mitglieder ohne aktiven/pending Claim oben vs. unten gruppieren).
- Optional: Erledigte Claims (status='verified'/'rejected') aus einer separaten Query laden und einblendbar machen.
- `ClaimManagementPanel.tsx` ist heute 349 Zeilen — bleibt unter 450, hat Spielraum für D-07.

**Wichtig:** `ClaimManagementPanel` nutzt bereits alle `@/components/ui`-Primitives korrekt (Badge, Button, Card, EmptyState, Input, SectionHeader, Table, Toolbar — kein natives select/input/button).

**Planungsimplikation:** D-07-Erweiterung ist inkrementell auf vorhandenem Seam realisierbar. Kein Neubau notwendig. Der „Nur Offene"-Toggle kann als `useState<boolean>` in der vorhandenen Komponente leben.

---

## Befund 3: Capability-Gating (D-08)

### Ist-Zustand (verifiziert)

`FansubGroupCapabilities` hat heute **12 Felder** (frontend/src/types/fansub.ts:163–176): [VERIFIED: Codebase-Read]

```typescript
interface FansubGroupCapabilities {
  can_edit_group: boolean;
  can_manage_links: boolean;
  can_view_members: boolean;
  can_manage_members: boolean;
  can_edit_notes: boolean;
  can_view_invitations: boolean;
  can_create_invitation: boolean;
  can_cancel_invitation: boolean;
  can_view_releases: boolean;
  can_view_release_media: boolean;
  can_upload_release_media: boolean;
  can_edit_release_notes: boolean;
}
```

Backend-Pendant: `fansubGroupCapabilitiesResponse` in `app_auth.go:22–34` — identisch.

**Capability-Ableitung für Phase 78 (ohne neues Contract-Feld, D-08/Lock K):**

| Review-Aktion | Vorhandene Capability | Begründung |
|---------------|----------------------|------------|
| Claim bestätigen/ablehnen | `can_create_invitation` (heute für claims-Tab) | Claim-Verwaltung = Invitation-Rights |
| Contribution-Proposal bestätigen/ablehnen | `can_manage_members` | `contribution_review_handler.go` prüft `ActionFansubGroupMembersManage` |
| Historische Member-Pflege | `can_manage_members` | `fansub_hist_group_members_handler.go` prüft `ActionFansubGroupMembersManage` |
| Medien-Tab Sichtbarkeit/Reviewstatus | `can_edit_group` | Heute gated `media`-Tab; Medien-Owner-Update = Gruppe editieren |
| Release-Drawer Medienprüfung | `can_upload_release_media` oder `can_view_release_media` | Release-Version-Media-Updates prüfen `ActionReleaseVersionMediaUpdate` |

**Ergebnis:** Kein neues Contract-Feld notwendig für Phase 78. Alle Review-Aktionen können aus existierenden Capabilities abgeleitet werden. Lock K bleibt gewahrt.

**Backend-Aktionen ohne Frontend-Capability-Entsprechung:** Der `contribution_review_handler.go` prüft serverseitig `ActionFansubGroupMembersManage` — das entspricht `can_manage_members` im Frontend. Dieser Mapping ist korrekt und konsistent.

**Planungsimplikation:** Capability-Ableitung per Komposition (kein neues API-Feld). Die `canUseMainTab`-Logik in `page.tsx` wird für die neuen Review-Aktions-Gates auf Komponenten-Ebene übernommen. Alle neuen Review-Komponenten erhalten `capabilities: FansubGroupCapabilities` als Props und leiten daraus ab.

---

## Befund 4: Medienprüfung (D-05/D-06)

### Ownership-Matrix (verifiziert aus CONTEXT.md + current-system-inventory.md)

| Owner-Fläche | UI/Seam | DB-Tabelle | Existierender Update-Endpunkt |
|--------------|---------|------------|-------------------------------|
| Gruppenmedien | `media`-Tab (page.tsx) | `fansub_group_media`, `fansub_groups.logo_id/banner_id` | Upload: `POST /admin/fansubs/:id/media` — DELETE: `DELETE /admin/fansubs/:id/media/:kind` |
| Release-Version-Medien | Release-Drawer (`ReleaseVersionMediaDrawerSummary`) | `release_version_media` | `PATCH /api/v1/admin/release-versions/:versionId/media/:relationId` |
| Theme-Assets | Release-Drawer/Theme-Bereich | `release_theme_assets` | Delete: `deleteAdminReleaseThemeAsset`; kein PATCH für Sichtbarkeit/Status |

**Gap — kein Visibility/ReviewStatus-Update für `fansub_group_media`:**
`fansub_media_upload.go` und `fansub_media_delete.go` decken nur Upload und Delete. Ein PATCH-Endpoint für Sichtbarkeit/Reviewstatus auf `fansub_group_media` existiert **nicht**. [VERIFIED: Codebase-Grep + Handler-Read]

**Gap — `PatchReleaseVersionMedia` deckt nur caption + is_preview_candidate:**
`admin_content_release_version_media.go:548–700` — der existierende PATCH-Handler akzeptiert `caption` und `is_preview_candidate`, aber **kein `visibility` oder `review_status`**. (line 600–606: `category`-Änderung wird explizit abgelehnt; visibility/review_status werden nicht geparst.) [VERIFIED: Codebase-Read]

**Sichtbarkeits-Datenmodell:**
- `visibilities`-Lookup-Tabelle (Migration 0037) — Phase-72-Basis für Achse 1 (intern/öffentlich).
- `media_assets`/`media_files` Status-Spalten aus Phase 34/35 — Achse 2 (in Prüfung/freigegeben/abgelehnt/archiviert/entfernt).
- Konkrete Spalten: `media_assets.status` (text; Werte: 'pending'?/'approved'?/'rejected'?) — müssen via Schema/Migration 0037-0096 verifiziert werden.

**Owner-Korrektheit: nur Flaggen, kein Umhängen (D-05):**
Phase 78 soll Owner-Korrektheit nur sichtbar machen. Das bedeutet: kein `UPDATE fansub_group_media SET owner_id=...` oder ähnliches. Lock G (Ownership-Matrix) gilt unverletzt, da kein Owner-Typ-Wechsel stattfindet.

**Planungsimplikation:**
- Für Gruppenmedien-Prüfung (Sichtbarkeit/Reviewstatus): **Neuer PATCH-Endpoint** nötig (`PATCH /admin/fansubs/:id/media/:mediaId/visibility` o.ä.) — Lock K erzwingt OpenAPI + DTO + Repo + api.ts gemeinsam.
- Für Release-Version-Media-Prüfung: **PatchReleaseVersionMedia erweitern** um `visibility`/`review_status`-Felder — bestehender PATCH-Handler, additiver Request-Body.
- Theme-Asset-Prüfung (Sichtbarkeit): Falls Phase 78 Theme-Assets umfasst, ist ebenfalls ein PATCH nötig. Priorität nach Scope klären.
- Alle neuen Mutations brauchen Audit-Log-Eintrag (D-09).

---

## Befund 5: Phase-76-Vorschläge (D-03/D-04)

### Ist-Zustand (verifiziert)

**Phase 76 ist noch nicht implementiert.** [VERIFIED: ROADMAP + Codebase-Glob — kein Phase-76-Handler/Tabelle gefunden]

Der Phase-76-Scope (registrierte-User-Vorschläge: Fehler/Story/Medien/Contribution melden) ist in `76-CONTEXT.md` geplant, aber es gibt:
- Kein Backend-Modell für Typ-Vorschläge (Story/Fehler/Medien) — nur `anime_contributions`-Proposals existieren.
- Keine neue Tabelle für generische User-Vorschläge.
- Keine neuen API-Endpunkte.

**Was Phase 76 produzieren wird (aus 76-CONTEXT.md):**
Jeder Vorschlag trägt: Submitter, Zielkontext, Typ (Fehler/Story/Medien/Contribution), Text/Medium, Status, Reviewzuständigkeit, Audit. Der genaue Zielkontext-Scope (Gruppe vs. Gruppe + Anime/Releases) ist Planner-Ermessen unter D-04-Prinzip.

**Folgen für Phase 78:**
- D-03 (Routing nach Typ in zuständigen Domänen-Tab) und D-04 (Scope auf Gruppe) können als **leere Routing-Slots** in Phase 78 eingebaut werden — Skeleton-Komponenten die „Noch keine Vorschläge vorhanden" zeigen und auf Phase-76-Outcomes warten.
- Alternativ: Phase 76 vor Phase 78 completieren.
- Eine Phase-78-Dependency auf Phase 76 muss im Plan explizit markiert werden.

**Planungsimplikation:** Der Planner muss entscheiden: Phase-76-Eingang in Phase 78 als Stub-Platzhalter (leere Slots) oder Phase 76 als Vorbedingung. Beides ist valide. Stub-Ansatz vermeidet Blockierung, erfordert aber später einen Follow-Up-Task in Phase 78/79.

---

## Befund 6: Audit-Seam (D-09)

### Ist-Zustand (verifiziert)

`AuditLogRepository.Write(ctx, AuditLogEntry{...})` in `backend/internal/repository/audit_logs.go` — universeller Audit-Seam. [VERIFIED: Codebase-Read]

Bereits existierende Audit-Einträge pro Domäne:

| Aktion | EventType (audit_logs) | Handler |
|--------|----------------------|---------|
| Contribution bestätigen | `anime_contribution.confirmed` | `contribution_review_handler.go:142` |
| Contribution ablehnen | `anime_contribution.rejected` | `contribution_review_handler.go:213` |
| Claim-Einladung erstellt/cancel | audit via `auditPermissionDenied` | `app_auth.go:317`, `app_auth.go:354` |
| Claim verifyMemberClaim | via Handler + permission-check | `member_claims_handler.go:202` |
| Fansub-Media Upload/Delete | `fansub_group_media.upload.denied` / `.delete.denied` | `fansub_media_upload.go:34`, `fansub_media_delete.go:32` |
| Release-Version-Media Update | `release_version_media.update.denied` | `admin_content_release_version_media.go:576` |

**Neue Audit-Einträge für Phase 78** (Anforderung D-09):
- `fansub_group_media.visibility_updated` (neuer PATCH-Endpoint für Gruppenmedien)
- `release_version_media.visibility_updated` (PatchReleaseVersionMedia-Erweiterung)
- Ggf. `hist_group_member.status_updated` (falls historische Member-Status-Updates in Phase 78)

Das Pattern ist: `auditLogRepo.Write(ctx, repository.AuditLogEntry{ActorAppUserID: &identity.AppUserID, EventType: "...", ScopeType: "group", ScopeID: &fansubID, ...})`. Alle neuen Mutations müssen dieses Muster übernehmen.

**Planungsimplikation:** Jeder neue Backend-Endpoint in Phase 78 muss einen `auditLogRepo.Write`-Aufruf enthalten. Das ist kein optionales Feature — Lock I/D-09 erzwingen es.

---

## Befund 7: `?tab=`-Routing + Readiness-Deep-Links (Phase-77-Integration)

### Ist-Zustand (verifiziert)

```typescript
// page.tsx:199–210
const MAIN_TABS: Array<{ key: MainTab; label: string }> = [
  { key: "basic", label: "Grunddaten" },
  { key: "notes", label: "Gruppengeschichte" },
  { key: "media", label: "Medien" },
  { key: "collaboration", label: "App-Mitglieder" },
  { key: "mitglieder", label: "Hist. Mitglieder" },
  { key: "rollen", label: "Historische Rollen" },
  { key: "claims", label: "Claims" },
  { key: "vorschlaege", label: "Vorschläge" },
  { key: "releases", label: "Anime & Veröffentlichungen" },
  { key: "anime-projekte", label: "Anime-Einblicke" },
];
```

`parseMainTab` (page.tsx:212–214) akzeptiert `?tab=`-Parameter und fällt auf `"basic"` zurück. `resolveMainTabForAccess` (page.tsx:261–268) korrigiert den Tab auf den ersten zugänglichen wenn Capability fehlt.

**Deep-Link-Filter (Claude's Discretion):**
Heute gibt es nur `?tab=`-Parameter, keinen zweiten URL-Parameter für einen Filter-Vorauswahl. Für Phase-77-Sprungmarken (z. B. „3 offene Claims" → Claims-Tab) reicht `?tab=claims` aus. Falls ein Deep-Link den „Nur Offene"-Filter vorauswählen soll (z.B. `?tab=claims&filter=open`), müsste `parseMainTab` um einen zweiten URL-Parameter-Read erweitert werden — das ist Planner-Ermessen.

**Planungsimplikation:** Tab-Navigation ist vollständig vorhanden. Deep-Link-Filter ist optionaler Enhancement — Planner entscheidet, ob `?tab=X` genügt oder ob `?tab=X&filter=open` gebaut wird.

---

## Standardstack

### Core (vorhanden, kein Neubau)
| Komponente | Version | Zweck | Status |
|------------|---------|-------|--------|
| `ClaimManagementPanel.tsx` | — | Claim-Review-Seam | Vollständig, 349 Zeilen |
| `ReviewQueue.tsx` | — | Contribution-Proposal-Review-Seam | Vollständig, 348 Zeilen; UI-Schuld (native Elemente) |
| `AnimeContributionModal.tsx` | — | Leader-Contribution-Edit-Modal | Vollständig; Öffnung aus Releases-Tab |
| `contribution_review_handler.go` | — | Backend-Review-Endpoints | Vollständig mit Audit |
| `AuditLogRepository` | — | Audit-Seam | Universell, alle Handler nutzen es |
| `FansubGroupCapabilities` | — | Capability-Contract | 12 Felder, kein Neubau nötig |
| `canUseMainTab`/`visibleMainTabs` | — | Tab-Gating-Pattern | Reuse für neue Review-Gates |

### Neu zu bauen (Aufwand-Analyse)
| Komponente | Typ | Begründung |
|------------|-----|------------|
| `ClaimsReviewSection` o.ä. Wrapper | Frontend-Komponente | D-07-Filter-Toggle; ClaimManagementPanel erweitern oder wrappen |
| `ContributionsReviewSection` | Frontend-Komponente | Ausbau/Ersatz `ReviewQueue` mit UI-Primitives + „offen zuerst" |
| Fansub-Media-Prüfsektion | Frontend-Komponente | Sichtbarkeit/Reviewstatus-UI im `media`-Tab |
| `PATCH /admin/fansubs/:id/media/:mediaId` | Backend-Endpoint | Sichtbarkeit/Reviewstatus für `fansub_group_media` (neu) |
| PatchReleaseVersionMedia-Erweiterung | Backend-Handler-Erweiterung | `visibility`/`review_status`-Felder im Body |

### UI-Primitives (CLAUDE.md-Pflicht)
Alle neuen Komponenten MÜSSEN nutzen: `Button`, `Card`, `FormField`, `Modal`, `Input`, `Select`, `Badge`, `Table`, `EmptyState`, `SectionHeader`, `Toolbar` aus `@/components/ui`. Native `<select>`, `<input>`, `<textarea>`, `<button>` sind verboten.

**Bekannte UI-Schuld in vorhandenen Seams:**
- `ReviewQueue.tsx` nutzt native `<button>` (Lines 256–280, 302–321, 326–339) und native `<textarea>` (Line 239) — muss in Phase 78 auf globale Primitives migriert werden (CLAUDE.md-Pflicht + Deferred-Todo aus Phase-77-Kontext).

---

## Architektur-Patterns

### Empfohlene Projektstruktur (neue Dateien Phase 78)

```
frontend/src/app/admin/fansubs/[id]/edit/
├── ClaimManagementPanel.tsx         # vorhanden — D-07-Filter ergänzen
├── ContributionsReviewSection.tsx   # NEU — ReviewQueue ersetzen/wrappen, UI-Primitives
├── GroupMediaReviewSection.tsx      # NEU — Sichtbarkeit/Status für fansub_group_media
├── [AnimeContributionModal.tsx]     # vorhanden, kein Umbau in Phase 78
├── [GroupMembersTab.tsx]            # vorhanden, separat halten
└── [MemberRolesTab.tsx]             # vorhanden, separat halten

backend/internal/handlers/
├── contribution_review_handler.go   # vorhanden — kein Umbau in Phase 78
├── fansub_media_review_handler.go   # NEU — PATCH Sichtbarkeit/Reviewstatus für Gruppenmedien
└── admin_content_release_version_media.go  # vorhanden — erweitern (visibility/review_status)
```

### Pattern 1: Capability-gegatete Review-Komponente

```typescript
// Muster aus ClaimManagementPanel.tsx (bereits korrekt)
// Neue Komponenten folgen diesem Muster:
interface ReviewSectionProps {
  groupId: number
  capabilities: FansubGroupCapabilities
}

export function ContributionsReviewSection({ groupId, capabilities }: ReviewSectionProps) {
  if (!capabilities.can_manage_members) {
    return null // oder EmptyState "Keine Berechtigung"
  }
  // ...
}
```

### Pattern 2: Audit-Pflicht in jedem neuen Mutation-Handler

```go
// Aus contribution_review_handler.go:142–151 — Muster für alle neuen Endpoints
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
    ActorAppUserID: &identity.AppUserID,
    EventType:      "fansub_group_media.visibility_updated",
    ScopeType:      permissions.ScopeTypeGroup,
    ScopeID:        &fansubID,
    TargetType:     "fansub_group_media",
    TargetID:       &mediaID,
    Action:         string(permissions.ActionFansubGroupEdit),
    Outcome:        "allowed",
})
```

### Pattern 3: Lock-K-Contract-Sequenz für neue Endpoints

Pflicht-Reihenfolge: OpenAPI/admin-content YAML → Handler-DTO → Repository-Methode → `api.ts`-Helper → Frontend-Typ.

### Anti-Patterns zu vermeiden

- **Anti-Pattern:** `page.tsx` direkt um weitere Review-Logik ergänzen — `page.tsx` ist bereits ~3.800 Zeilen. Jede neue Fläche muss als eigene Datei extrahiert werden.
- **Anti-Pattern:** Contribution-Review in den `claims`-Tab integrieren oder umgekehrt — Entscheidung 10 / Lock H erzwingen strikte Trennung.
- **Anti-Pattern:** `AnimeContributionModal` als generisches Review-Modal umfunktionieren — es ist ein Leader-Edit-Modal, kein Review-Modal.
- **Anti-Pattern:** Neue Capabilities in `FansubGroupCapabilities` einführen — Lock K; stattdessen Komposition aus vorhandenen Feldern.
- **Anti-Pattern:** `ReviewQueue.tsx` unverändert lassen (UI-Schuld native Elemente) — CLAUDE.md erzwingt Migration.

---

## Nicht selbst bauen

| Problem | Nicht bauen | Nutzen statt | Warum |
|---------|-------------|-------------|-------|
| Audit-Persistenz | eigener Audit-Mechanismus | `repository.AuditLogRepository.Write` | Vollständig, universell, alle Handler nutzen es |
| Permission-Check | eigene Rollen-/Mitgliedschaftsprüfung | `permissionSvc.CanForFansubGroup` | Permissions-Engine bereits vollständig; Bypass erzeugt Sicherheitslücke |
| Capability-Mapping | neue API-Felder für Review-Gating | Komposition aus `FansubGroupCapabilities` | Lock K; 12 Felder decken alle Phase-78-Fälle ab |
| Tab-Navigation | neue Router/Navigation | `MAIN_TABS`/`parseMainTab`/`?tab=`-System | Vollständig, konsistent mit Phase 77 |
| Claim-Mutations | neue Claim-Endpunkte | `verifyMemberClaim`/`rejectMemberClaim` aus `lib/api.ts` | Bereits vollständig verdrahtet |
| Contribution-Proposal-Mutations | neue Review-Endpunkte | `confirmProposal`/`rejectProposal` aus `lib/api.ts` | `contribution_review_handler.go` vollständig mit Audit |

---

## Häufige Fallstricke

### Fallstrick 1: `page.tsx` weiter wachsen lassen
**Was schiefläuft:** Neue Review-Flächen direkt in `page.tsx` einbauen.
**Warum:** `page.tsx` hat bereits ~3.800 Zeilen — weit über dem 450-Zeilen-Limit.
**Lösung:** Alle neuen Review-Flächen als eigenständige Komponenten-Dateien; `page.tsx` importiert und rendert sie per Tab-Bedingung.
**Warnsignal:** Jede Edit-Aktion in `page.tsx`, die mehr als 10 Zeilen neuen Code hinzufügt.

### Fallstrick 2: `ReviewQueue.tsx` native Elemente nicht migrieren
**Was schiefläuft:** `ReviewQueue.tsx` wird ausgebaut aber native `<button>`, `<textarea>` bleiben.
**Warum:** CLAUDE.md-Pflicht (`no-restricted-syntax`-ESLint-Regel) und Konsistenz.
**Lösung:** Beim Umbau auf `Button`, `Textarea`/`Input`, globale Primitives aus `@/components/ui` migrieren.

### Fallstrick 3: Phase-76-Seam ohne Abhängigkeit verdrahten
**Was schiefläuft:** Phase-76-Vorschlagseingang in Phase 78 implementieren ohne Phase 76 completed zu haben.
**Warum:** Kein Backend-Modell, keine Tabelle, keine API für neue Vorschlagstypen vorhanden.
**Lösung:** Entweder Phase 76 als Vorbedingung markieren, oder Phase-76-Slots als leere Platzhalter mit EmptyState-Komponenten einbauen.

### Fallstrick 4: `fansub_group_media`-Prüfung ohne neuen Endpoint
**Was schiefläuft:** Frontend versucht Sichtbarkeit/Reviewstatus für Gruppenmedien über vorhandene Upload-Endpoints zu schreiben.
**Warum:** `fansub_media_upload.go` ist nur Upload; kein PATCH-Endpoint für Visibility/Status.
**Lösung:** Neuer PATCH-Endpoint + OpenAPI-Contract-Eintrag, bevor Frontend implementiert wird (Lock K).

### Fallstrick 5: Contribution und Claim in derselben Review-Fläche vermischen
**Was schiefläuft:** `ReviewQueue` zeigt sowohl Claims als auch Contributions.
**Warum:** Entscheidung 10 / Lock H verbieten jede Vermischung. Eine Contribution macht niemanden zum Mitglied.
**Lösung:** Claim-Tab bleibt `ClaimManagementPanel`, Vorschläge-Tab bleibt Contribution-Review. Separate Komponenten, separate Datenpipelines.

---

## Laufzeit-Zustandsinventar

> Phase 78 ist keine Rename-/Refactor-Phase. Dieser Abschnitt ist auf Datenmigrations-relevante Aspekte beschränkt.

| Kategorie | Befund | Aktion |
|-----------|--------|--------|
| Gespeicherte Daten | `anime_contributions` mit `status='proposed'` — bestehende Proposals landen sofort in der neuen ReviewQueue | Keine Migration; vorhandene Proposals erscheinen sofort in Phase-78-UI |
| Gespeicherte Daten | `member_claims` mit `status='pending'` — bestehende offene Claims erscheinen in ClaimManagementPanel (heute bereits) | Keine Migration |
| Medien-Sichtbarkeitsfelder | `media_assets.status`-Werte und `visibilities`-Lookup — Achse 1/2 aus Phase 72; Phase 78 liest diese Felder | Abhängig von Phase 72 Execute-Stand; Enum-Werte prüfen |
| Build-Artefakte | Keine package-name-relevanten Build-Artefakte betroffen | — |

**Wichtig:** Phase 72 (Status-Fundament) muss vor Phase 78 ausgeführt sein, damit die Sichtbarkeits-/Reviewstatus-Felder auf `media_assets` und `anime_contributions` in der DB vorhanden sind.

---

## Umgebungsverfügbarkeit

Phase 78 ist eine reine Code-/Config-Erweiterung innerhalb des bestehenden Stacks. Keine neuen externen Abhängigkeiten.

| Abhängigkeit | Benötigt von | Verfügbar | Version | Fallback |
|-------------|-------------|-----------|---------|----------|
| PostgreSQL | Backend | ✓ | 16 (Docker Compose) | — |
| Go 1.25 | Backend | ✓ | 1.25 | — |
| Next.js 16 | Frontend | ✓ | 16 | — |
| Vitest 3 | Frontend-Tests | ✓ | 3 | — |
| Phase 72 (Schema) | Medienprüfung visibility/status Felder | Geplant, nicht executed | — | Phase 78 Medienprüfung blockiert ohne Phase 72 |
| Phase 76 (Vorschlagsmodell) | D-03/D-04 Phase-76-Eingang | Nicht implementiert | — | Stub-Platzhalter oder Phase 76 als Vorbedingung |

**Blockierende fehlende Abhängigkeiten:**
- Phase 72 (Status-Fundament): Medienprüfung (D-05/D-06) ist teilweise blockiert bis die Sichtbarkeits-/Reviewstatus-Spalten in der DB existieren.
- Phase 76: D-03/D-04 vollständig verdrahtbar erst nach Phase 76.

**Nicht blockierend (Stub-Ansatz möglich):**
- Claim-Review (D-07) und Contribution-Proposal-Review (`vorschlaege`-Tab) sind heute sofort realisierbar.

---

## Validierungsarchitektur

### Test-Framework
| Eigenschaft | Wert |
|-------------|------|
| Framework | Vitest 3 |
| Config | `frontend/vitest.config.ts` |
| Schnellstart | `cd frontend && npx vitest run` |
| Vollständig | `cd frontend && npx vitest run --reporter=verbose` |
| Backend | `cd backend && go test ./...` |

### Phase-Anforderungen → Test-Mapping

| Anforderung | Verhalten | Test-Typ | Automatisierter Befehl | Datei vorhanden? |
|-------------|-----------|----------|----------------------|-----------------|
| SC1: Offene Claims / Contributions getrennt | ClaimManagementPanel zeigt nur Claims; ContributionsReview zeigt nur Proposals | unit | `npx vitest run src/.../ClaimManagementPanel.test.tsx` | ✅ (ClaimManagementPanel.test.tsx) |
| SC1: Capability-Gating bestätigt/abgelehnt | Aktionen bei fehlender Capability nicht gezeigt | unit | `npx vitest run src/.../ContributionsReviewSection.test.tsx` | ❌ Wave 0 |
| SC2: Historische Member getrennt von App-Mitgliedern | GroupMembersTab zeigt nur hist. Member | unit (bestehend) | `npx vitest run src/.../GroupMembersTab.test.tsx` | ❌ prüfen |
| SC3: Medienprüfung schreibt korrekte Owner-Tabelle | PATCH auf `fansub_group_media` vs. `release_version_media` | unit (Backend) | `go test ./backend/internal/handlers/... -run TestFansubMediaReview` | ❌ Wave 0 |
| SC4: Phase-76-Vorschläge im Gruppenkontext | Nur Vorschläge der aktuellen Gruppe sichtbar | unit | `npx vitest run src/.../ContributionsReviewSection.test.tsx` | ❌ Wave 0 |
| SC5: Keine Duplikation in /admin/my-groups | — | manuell | Browser-Inspektion | — |
| D-09: Alle Mutationen auditiert | audit_log-Einträge bei Mutation | unit (Backend) | `go test ./backend/internal/handlers/... -run TestContributionReview` | ✅ (contribution_review_handler_test.go) |

### Sampling-Rate
- **Pro Task-Commit:** `cd frontend && npx vitest run` + `cd backend && go test ./internal/handlers/...`
- **Pro Wave-Merge:** `cd frontend && npx vitest run --reporter=verbose` + `cd backend && go test ./...`
- **Phase-Gate:** Vollständige Suite grün vor `/gsd:verify-work`

### Wave-0-Lücken
- [ ] `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.test.tsx` — SC1, SC4
- [ ] `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx` — SC3
- [ ] `backend/internal/handlers/fansub_media_review_handler_test.go` — SC3, D-09 Audit
- [ ] Prüfen ob `GroupMembersTab.test.tsx` existiert — SC2

---

## Sicherheitsdomäne

### Anwendbare ASVS-Kategorien

| ASVS-Kategorie | Anwendbar | Standardkontrolle |
|----------------|-----------|-------------------|
| V4 Access Control | ja | `CanForFansubGroup` + Capability-Gating; kein direkter Rollenbezug |
| V5 Input Validation | ja | Backend-Handler validiern Body-Felder; Enum-Prüfung für visibility/status |
| V2 Authentication | ja (vorhanden) | `permissionActorFromContext` in allen Handlern |
| V6 Cryptography | nein | Keine neuen kryptografischen Operationen |

### Bekannte Bedrohungsmuster

| Muster | STRIDE | Standard-Mitigation |
|--------|--------|---------------------|
| Capability-Bypass (Tab direkt aufrufen) | Elevation of Privilege | `canUseMainTab` im Frontend + serverseitige `CanForFansubGroup`-Prüfung in jedem Endpoint |
| Audit-Bypass (Mutation ohne Log) | Repudiation | Pflicht-Audit-Aufruf in jedem neuen Handler; `auditLogRepo.Write` nach jeder erfolgreichen Mutation |
| Owner-Mismatch (Medien fremder Gruppe patchen) | Tampering | Backend prüft `fansubID`-Zugehörigkeit vor Update; `CanForFansubGroup`-Scope |
| Cross-Domain-Leak (Contribution als Claim darstellen) | Information Disclosure | Separate Datenpipelines pro Domain; kein gemeinsamer Endpoint |

---

## Quellen

### Primär (HOCH)
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — MAIN_TABS, canUseMainTab, visibleMainTabs, openAnimeContributions, Tab-Rendering (lines 199–250, 3480–3503)
- `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` — vollständige Claim-Review-Implementierung
- `frontend/src/components/contributions/ReviewQueue.tsx` — vollständige Proposal-Review-Implementierung
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` — Leader-Contribution-Edit-Modal
- `frontend/src/types/fansub.ts:163–176` — FansubGroupCapabilities
- `backend/internal/handlers/contribution_review_handler.go` — Backend-Review-Endpoints mit Audit
- `backend/internal/handlers/admin_content_release_version_media.go:548–700` — PatchReleaseVersionMedia
- `backend/internal/handlers/fansub_media_upload.go` — Fansub-Media-Upload (kein Visibility/Review-Update)
- `backend/internal/permissions/permissions.go` — Action-Konstanten, roleMatrix
- `backend/internal/repository/audit_logs.go` — AuditLogEntry, AuditLogRepository
- `backend/internal/repository/anime_contributions_proposal_repository.go` — Confirm/Reject mit Audit-Attributen
- `.planning/milestones/v1.2-DISCUSSION.md` — LOCKED Entscheidungen A–K
- `.planning/phases/78-leader-workspace-review-pflege/78-CONTEXT.md` — Phasen-Entscheidungen D-01..D-09

### Sekundär (MITTEL)
- `docs/architecture/current-system-inventory.md` — Ownership-Matrix, Media-Ownership, Duplication-Traps
- `.planning/phases/77-leader-workspace-public-preview-readiness/77-CONTEXT.md` — Schwester-Phase, Readiness-Sprungmarken
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-CONTEXT.md` — Sichtbarkeit/Review-Achsen
- `.planning/phases/76-me-contributions-dashboard-registrierte-user-vorschl-ge/76-CONTEXT.md` — Phase-76-Vorschlagsmodell

### Tertiär (NIEDRIG — noch nicht implementiert)
- Phase 76: Registrierte-User-Vorschläge (Typ/Zielkontext/Status-Modell) — noch kein Code vorhanden

---

## Offene Fragen

1. **Phase-72-Execute-Stand: Welche Spalten existieren genau?**
   - Was bekannt ist: Phase 72 führt `visibilities`-Lookup + separaten Review-Status + `dispute_state` ein.
   - Was unklar ist: Die genauen Spalten-/Enum-Namen auf `media_assets`, `anime_contributions` — sie sind Phase-72-Planner-Entscheidung.
   - Empfehlung: Phase 78 Medienprüfungs-Implementierung erst nach Phase 72 Execute beginnen; vorher prüfen via `SHOW COLUMNS FROM media_assets`.

2. **Phase-76-Reihenfolge: Vorbedingung oder Stub?**
   - Was bekannt ist: Phase 76 ist nicht implementiert; D-03/D-04 hängt daran.
   - Was unklar ist: User-Priorität — Phase 76 zuerst, oder Phase 78 mit Stubs?
   - Empfehlung: Phase-76-Eingang als `<EmptyState>` in Domänen-Tabs einbauen, mit TODO-Kommentar. Vollständige Verdrahtung als separater Wave nach Phase 76.

3. **`fansub_group_media`-Visibility/ReviewStatus: Welche Felder?**
   - Was bekannt ist: `media_assets` hat Status-Spalten (Phase 34/35); `visibilities`-Lookup existiert (Phase 72/Migration 0037).
   - Was unklar ist: Ob `fansub_group_media` einen direkten Visibility-/Status-Join braucht oder via `media_assets`-Felder.
   - Empfehlung: Schema-Query nach Phase-72-Execute; neuer PATCH-Endpoint auf Basis dieser Erkenntnis designen.

4. **`ReleaseVersionMediaDrawerSummary` — Erweiterung auf Prüf-Aktionen?**
   - Was bekannt ist: Heute nur Summary (read-only). Phase 78 D-06 sagt Release-Medienprüfung im Release-Drawer.
   - Was unklar ist: Ob der Drawer selbst erweitert wird oder eine neue `ReleaseMediaReviewSection` eingehängt wird.
   - Empfehlung: Neue Komponente `ReleaseVersionMediaReviewSection` im Drawer; `ReleaseVersionMediaDrawerSummary` bleibt read-only.

---

## Annahmen-Log

| # | Aussage | Abschnitt | Risiko bei Falschheit |
|---|---------|-----------|----------------------|
| A1 | `media_assets` hat nach Phase 72 eine `visibility`-FK-Spalte (via `visibilities`-Lookup) und eine `review_status`-Text-Spalte | Befund 4, Befund 7 | Neuer PATCH-Endpoint braucht andere Felder; Schema-Abweichung |
| A2 | Phase 76 ist noch nicht implementiert (kein Backend-Modell für neue Vorschlagstypen) | Befund 5 | Falls Phase 76 doch implemented ist, kann D-03/D-04 sofort verdrahtet werden |
| A3 | `canUseMainTab`-Komposition aus vorhandenen Capabilities deckt alle Phase-78-Review-Aktionen ab ohne neues Contract-Feld | Befund 3 | Falls ein feineres Gating nötig ist, müsste ein neues Capability-Feld + Contract-Erweiterung erfolgen (Lock K) |

**Falls diese Tabelle leer wäre:** Alle Aussagen in diesem Research wären verifiziert oder zitiert — was nicht der Fall ist. A1–A3 müssen vor der Plan-Finalisierung bestätigt werden.

---

## Metadaten

**Konfidenz-Aufschlüsselung:**
- Claim-Review-Seam: HOCH — vollständig codebasiert verifiziert
- Contribution-Review-Seam: HOCH — vollständig codebasiert verifiziert; gelöschter Tab bestätigt
- Capability-Gating: HOCH — alle 12 Felder gelesen, Mapping verifiziert
- Medienprüfung: MITTEL — Ownership-Matrix und vorhandene Endpoints verifiziert; fehlende PATCH-Endpoints sind Befund, nicht Annahme; Phase-72-Felder noch [ASSUMED] da Phase 72 nicht executed
- Phase-76-Seam: NIEDRIG — noch nicht implementiert; nur CONTEXT.md als Quelle

**Research-Datum:** 2026-06-05
**Gültig bis:** 2026-07-05 (30 Tage; stable brownfield stack)
