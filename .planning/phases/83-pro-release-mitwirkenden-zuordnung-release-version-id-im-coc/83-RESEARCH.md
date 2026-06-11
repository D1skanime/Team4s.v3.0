# Phase 83: Pro-Release-Mitwirkenden-Zuordnung (release_version_id) im Cockpit — Research

**Recherchiert:** 2026-06-11
**Domain:** Permission-Umbau · Override-Drawer · Contribution-Auflösung · Cockpit-Integration
**Gesamtvertrauen:** HIGH (alle Kernbefunde aus Codebase verifiziert; keine externen Pakete)

---

<user_constraints>
## User Constraints (aus CONTEXT.md)

### Locked Decisions
- **D-01:** `CanForReleaseVersion` steuert Bearbeitungsrechte für Notizen/Media — ausschließlich über Contribution-Auflösung, nicht mehr Gruppenrolle.
- **D-02:** Ohne expliziten Release-Satz gelten anime-weite Contributions (`release_version_id IS NULL`) als Credit + Recht. Existiert ein expliziter Satz (`release_version_id` gesetzt), gilt nur dieser.
- **D-03:** Absenz im Override-Satz = Person fehlt in der Liste. Kein „nicht dabei"-Marker im UI.
- **D-04:** Reine Gruppen-Mitgliedschaft (`fansub_group_member_roles`) reicht nicht. Edit-Rechte entstehen ausschließlich aus einer Contribution-Zuordnung.
- **D-05:** `fansub_lead` kann in seiner Gruppe immer alles. `project_lead` ist projektbezogene Ausnahme. Nur operative Rollen brauchen Contribution.
- **D-06:** Einstieg pro Release-Version-Zeile → Drawer/Side-Panel rechts, staged mit explizitem Speichern/Abbrechen.
- **D-07:** Panel-Aufbau: Rollen-Liste vorbefüllt mit geerbtem Projektteam; kein geerbtes-Team-Block; pro Zeile Rolle+Avatar+Zeilenaktionen (Rolle ändern, Entfernen).
- **D-08:** Cockpit-Übersicht zeigt Mitwirkenden-Status als Badge/Kurzliste; Tiefe im Drawer.
- **D-09:** Mehrere Personen pro Rolle erlaubt.
- **D-10:** Override-Geltung = genau eine Release-Version.
- **D-11:** Override = eigener expliziter Satz; spätere Projekt-Team-Änderungen fließen nicht automatisch in überschriebene Releases.
- **D-12:** Kandidaten-Pool = nur Mitglieder der aktuellen Fansub-Gruppe.
- **D-13:** Notizen-/Media-Maske zeigt genau den dort gültigen Mitwirkenden-Satz.
- **D-14:** Ausschließlich `@/components/ui`-Primitives; `AnimeContributionModal.tsx` natives `<select>` ersetzen; `ReleaseVersionBreakdown.tsx` angleichen.
- **D-15:** Benennung „Mitwirkende" UI-weit konsistent.
- **D-16:** Leader-Löschen = Soft-Delete-Semantik (zu verifizieren, ob bereits vorhanden).

### Claude's Discretion
- Konkretes Storage-/Auflösungs-Modell des Overrides (materialisierter Snapshot vs. Delta-Auflösung), solange D-10/D-11 erfüllt.
- Genaue `CanForReleaseVersion`-Refaktorierung (Query-/Join-Struktur), Caching, Backfill-Reihenfolge.
- Exakte Badge-Texte/Layout der Cockpit-Übersicht.

### Deferred Ideas (AUSSER SCOPE)
- Schicht B — member-zentrischer `/me`-Einstieg
- Collab-übergreifende Zuordnung (Mitglieder fremder Gruppen an Collab-Releases)
- Soft-Delete/Hard-Delete-Infrastruktur-Vollausbau (falls nicht bereits vorhanden)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Beschreibung | Research-Unterstützung |
|----|-------------|------------------------|
| D-01 | `CanForReleaseVersion` auf Contribution-Auflösung umbauen | Vollständig analysiert — Umbau-Strategie dokumentiert |
| D-02 | Auflösung Default anime-weit ↔ Release-Override | Datenmodell verifiziert (0091), Auflösungslogik designed |
| D-03 | Absenz wirkt ohne UI-Indikator | UX-Constraint in UI-SPEC bereits fixiert |
| D-04 | Reine Gruppenmitgliedschaft reicht nicht | `ListActorGroupRoles` → Contribution-Lookup beschrieben |
| D-05 | Leader immer ausgenommen | `roleMatrix` analysiert — Leader-Bypass klar |
| D-06 | Drawer pro Release-Version-Zeile | Cockpit-Rendering-Einstieg lokalisiert (~Z.3080ff) |
| D-07 | Drawer-Aufbau (Rollen-Liste, Avatar, Zeilenaktionen) | Primitives vorhanden; `ContributorAvatar` muss gebaut werden |
| D-08 | Cockpit-Übersicht mit Badge/Kurzliste | `ProjectCockpitBadges` als Vorlage; neue Badge-Slots |
| D-09 | Mehrere Personen pro Rolle | 4-Spalten-UNIQUE erlaubt das bereits |
| D-10/D-11 | Override = eigener Satz, isoliert | `CreateOrUpdate` ON CONFLICT bereits korrekt |
| D-12 | Kandidaten-Pool = aktuelle Gruppe | `listUnifiedGroupMembers(fansubId)` deckt das ab |
| D-13 | Notizen/Media konsistent gekoppelt | `GetMemberRolesForVersion` muss migriert werden — kritische Lücke |
| D-14 | UI-Primitives, natives `<select>` ersetzen | `Select`+`FormField` vorhanden; Drawer vorhanden |
| D-15 | Benennung „Mitwirkende" | In UI-SPEC bereits definiert |
| D-16 | Soft-Delete-Prüfung | Hard-Delete für Contributions verifiziert — Risiko dokumentiert |
</phase_requirements>

---

## Summary

Phase 83 baut auf einem vollständig vorhandenen Daten-Fundament auf: `anime_contributions.release_version_id` (Migration 0091), die 4-Spalten-UNIQUE-Constraint mit `NULLS NOT DISTINCT`, und die bestehende `CreateOrUpdate`-Logik im Repository unterstützen bereits das Override-Modell. Der Kern der Phase besteht aus **drei gleichgewichtigen Arbeitssträngen**:

**Strang 1 — Permission-Umbau (sicherheitskritisch):** `CanForReleaseVersion` liest heute ausschließlich `fansub_group_member_roles` via `ListActorGroupRoles`. Nach dem Umbau muss für jede eingehende Anfrage der *aufgelöste Contribution-Satz* ermittelt werden: Gibt es für die Release-Version explizite Contributions → diese Satz gilt; sonst anime-weite Contributions. Aus dem aufgelösten Satz werden die `role_codes` extrahiert und gegen `roleMatrix` geprüft. `fansub_lead`-/`project_lead`-Einträge in `roleMatrix` behalten ihren privilegierten Status (D-05). Der Umbau erweitert das `Resolver`-Interface um eine neue Methode `ResolveContributionsForReleaseVersion`.

**Strang 2 — Override-Drawer (Frontend):** Im Cockpit-Releases-Tab erhält jede Release-Versions-Zeile einen „Mitwirkende"-Button. Dieser öffnet den bestehenden `Drawer`-Primitive (rechts, staged). Der Drawer lädt beim Öffnen den aufgelösten Mitwirkenden-Satz (Override oder Projekt-Default) und zeigt ihn als Rollen-Liste. Staged Änderungen werden als vollständiger Override-Satz per POST/DELETE auf den Contributions-Endpoint gespeichert. Kein Avatar-Primitive vorhanden → kleines `ContributorAvatar`-Inlinekkomponent.

**Strang 3 — Notizen/Media-Konsistenz (D-13):** `GetMemberRolesForVersion` in `release_version_notes_repository.go` liest heute aus `release_member_roles` (alter Phase-44-Table), NICHT aus `anime_contributions`. Diese Tabelle ist ein Legacy-Datenmodell ohne Verbindung zu `anime_contributions`. Die Migration muss die Query auf die neue Auflösungslogik (`anime_contributions` + `anime_contribution_roles`) umstellen, damit Notizen-/Media-Masken denselben aufgelösten Satz zeigen wie der Permission-Check.

**Empfehlung:** Delta-Auflösung (implizit) bevorzugen — kein Materialisieren. Backend berechnet den effektiven Satz on-the-fly aus der DB: erst nach versions-spezifischen Einträgen suchen; falls keine → anime-weite verwenden. Kein Caching in V1 nötig (Contribution-Tabellen sind klein).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Permission-Auflösung (D-01..D-05) | API/Backend | — | Sicherheitskritisch; niemals im Browser |
| Override-Satz schreiben/lesen | API/Backend | — | Datenmutation gegen Contributions-Endpoint |
| Effektiver Mitwirkenden-Satz für Drawer-Anzeige | API/Backend | Frontend (Anzeige) | Backend löst auf; Frontend rendert |
| Kandidaten-Pool (Gruppen-Mitglieder) | API/Backend | — | Bereits via `listUnifiedGroupMembers` |
| Override-Drawer (Staged-Editor) | Frontend/Client | — | Lokale staged-State bis Speichern |
| Cockpit-Badge-Übersicht (Override vs. Default) | API/Backend | Frontend | Backend liefert `has_override`-Flag; Frontend wählt Badge |
| Notizen/Media-Mitwirkenden-Anzeige | API/Backend | — | `GetMemberRolesForVersion` — auf neue Logik umstellen |

---

## Standard Stack

### Core (keine neuen Pakete — alles vorhanden)

| Bibliothek | Version | Zweck | Bemerkung |
|-----------|---------|-------|-----------|
| `github.com/gin-gonic/gin` | in go.mod | HTTP-Routing | Keine Änderung |
| `github.com/jackc/pgx/v5` | in go.mod | PostgreSQL | Neue Queries |
| `lucide-react` | in package.json | Icons (Trash2, MoreHorizontal, Plus, UserMinus) | Bereits Abhängigkeit |
| `@/components/ui` | Projekt-intern | Drawer, Button, Select, FormField, Badge, Card, EmptyState, LoadingState, ErrorState | Alles vorhanden |

**Keine neuen npm- oder Go-Pakete erforderlich.** [VERIFIED: codebase-grep]

---

## Package Legitimacy Audit

Keine externen Pakete werden installiert — alle benötigten Bibliotheken sind bereits in `go.mod` und `frontend/package.json` vorhanden.

| Package | Status |
|---------|--------|
| Keine neuen Pakete | — |

---

## Architecture Patterns

### System Architecture Diagram

```
Cockpit (page.tsx)
  └─ Release-Zeile: [Mitwirkende]-Button
       │
       ▼
  ReleaseContributionDrawer.tsx   ← NEU (Drawer + staged State)
       │  lädt beim Öffnen
       ▼
  GET /api/v1/admin/release-versions/:versionId/contributions/effective
       │  (NEU) gibt aufgelösten Satz zurück (Override oder Projekt-Default)
       │
       └─ Backend: resolveEffectiveContributions(versionID, fansubGroupID)
            1. SELECT ac WHERE release_version_id = $versionID AND fansub_group_id = $fansubID
            2. Falls leer → SELECT ac WHERE release_version_id IS NULL AND anime_id = $animeID AND fansub_group_id = $fansubID
            3. Gibt Rows + flag "is_override" zurück

  Speichern (Drawer Footer):
  POST/DELETE /api/v1/admin/fansubs/:id/anime/:animeId/contributions
       │  (bereits vorhanden, mit release_version_id)
       │
       ▼
  anime_contributions (4-Spalten-UNIQUE NULLS NOT DISTINCT)

Permission-Pfad (bei Notizen/Media-Requests):
  CanForReleaseVersion(actor, action, versionID)
       │  UMBAU: nicht mehr nur ListActorGroupRoles
       ▼
  ResolveContributionsForReleaseVersion(versionID, appUserID)
       │  → JOIN anime_contributions + anime_contribution_roles
       │  → Auflösung Override ↔ Default wie oben
       │  → gibt role_codes des actors zurück
       ▼
  roleMatrix-Check(role_codes, action)
  + Leader-Bypass (fansub_lead via ListActorGroupRoles bleibt)
```

### Empfohlene Dateistruktur (neue/geänderte Dateien)

```
backend/internal/
├── permissions/
│   └── permissions.go               ← CanForReleaseVersion umbauen; Resolver-Interface erweitern
├── repository/
│   ├── authz_permissions.go         ← ResolveContributionsForReleaseVersion (neue Methode)
│   ├── release_version_notes_repository.go  ← GetMemberRolesForVersion auf anime_contributions migrieren
│   └── admin_content_fansub_releases_contributions_repository.go  ← NEU: Effective-Contributions-Query
├── handlers/
│   └── admin_content_fansub_releases_contributions_handlers.go     ← NEU: GET effective contributions endpoint

frontend/src/app/admin/fansubs/[id]/edit/
├── ReleaseContributionDrawer.tsx    ← NEU: Override-Drawer-Komponente
├── ReleaseContributionDrawer.test.tsx ← NEU
├── ContributorAvatar.tsx            ← NEU: Mini-Avatar (Initialen + optionales Bild)
├── page.tsx                         ← Einstiegspunkt: „Mitwirkende"-Button pro Release-Zeile
├── AnimeContributionModal.tsx       ← natives <select> ersetzen (D-14)
└── FansubEdit.module.css            ← ggf. neue CSS-Klassen

shared/contracts/admin-content.yaml
└── Neuer Endpoint: GET /release-versions/:versionId/contributions/effective
```

### Pattern 1: Permission — Contribution-getriebene Auflösung

**Was:** `CanForReleaseVersion` erweitert das `Resolver`-Interface um eine neue Methode, die den aufgelösten Rollen-Satz des Actors für eine Release-Version zurückgibt. Der bestehende `canForContext`-Flow bleibt erhalten, `ListActorGroupRoles` wird NICHT entfernt (wird weiterhin für Leader-Check benötigt).

**Neue Resolver-Methode:**
```go
// Source: codebase (backend/internal/permissions/permissions.go, authz_permissions.go)
// ListActorContributionRolesForVersion gibt die role_codes des Actors für eine Release-Version zurück.
// Auflösungsreihenfolge:
//   1. Versions-spezifische anime_contributions (release_version_id = versionID)
//   2. Fallback: anime-weite Contributions (release_version_id IS NULL, anime_id aus Release ermittelt)
// Gibt leere Liste zurück, wenn der Actor für diese Release keine Contribution hat.
ListActorContributionRolesForVersion(ctx context.Context, appUserID int64, releaseVersionID int64) ([]string, error)
```

**Umbau `canForContext` für ReleaseVersion:**
```go
// In CanForReleaseVersion (permissions.go) — nach Leader-Check via ListActorGroupRoles:
//
// 1. Leader-Check: ListActorGroupRoles → hat Actor fansub_lead/project_lead? → sofort allow
// 2. Sonst: ListActorContributionRolesForVersion → gibt []role_code
// 3. roleMatrix[role_code] enthält die Action? → allow
// 4. Sonst: denied(ReasonNoMembership/ReasonInsufficientRole)
```

**Query (Auflösung in authz_permissions.go):**
```sql
-- Schritt 1: Versions-spezifische Contribution des Actors
SELECT DISTINCT acr.role_code
FROM anime_contributions ac
JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
JOIN members m ON m.id = ac.member_id
JOIN fansub_group_members fgm ON fgm.member_id = m.id
  AND fgm.fansub_group_id = ac.fansub_group_id
  AND fgm.app_user_id = $appUserID  -- actors app_user_id
WHERE ac.release_version_id = $versionID
  AND fgm.status = 'active'

-- Schritt 2 (nur wenn Schritt 1 leer): anime-weite Contributions des Actors
SELECT DISTINCT acr.role_code
FROM anime_contributions ac
JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
JOIN release_versions rv ON rv.release_id = (
    SELECT fr.id FROM release_versions rv2
    JOIN fansub_releases fr ON fr.id = rv2.release_id
    WHERE rv2.id = $versionID
)
JOIN members m ON m.id = ac.member_id
JOIN fansub_group_members fgm ON fgm.member_id = m.id
  AND fgm.fansub_group_id = ac.fansub_group_id
  AND fgm.app_user_id = $appUserID
WHERE ac.release_version_id IS NULL
  AND ac.anime_id = <anime_id aus rv>
  AND fgm.status = 'active'
```

**Hinweis für Planner:** Die Query muss in zwei Schritten implementiert werden (Schritt 2 nur ausgeführt, wenn Schritt 1 keine Zeilen liefert), oder als UNION mit einem `EXISTS`-Filter. Eine einzelne Abfrage mit COALESCE/UNION ist möglich, aber schwerer testbar. Zwei separate Aufrufe sind einfacher zu testen.

### Pattern 2: Effective-Contributions-Endpoint

**Was:** Neuer GET-Endpoint, der den aufgelösten Mitwirkenden-Satz für eine Release-Version zurückgibt — für den Drawer.

```
GET /api/v1/admin/release-versions/:versionId/contributions/effective?fansub_group_id=N
Response: {
  data: EffectiveContributionRow[],
  meta: { is_override: bool, source: "release_version" | "anime_default" }
}

EffectiveContributionRow:
  member_id, member_display_name, member_avatar_url, role_codes[]
```

**Auflösung im Repository:**
```go
// admin_content_fansub_releases_contributions_repository.go (NEU)
// ListEffectiveContributionsForVersion:
//  1. Lade alle anime_contributions WHERE release_version_id = $versionID AND fansub_group_id = $groupID
//  2. Falls leer → lade alle WHERE release_version_id IS NULL AND anime_id = $animeID AND fansub_group_id = $groupID
//  3. Aggregiere role_codes pro member_id (JOIN anime_contribution_roles)
//  4. Gib is_override=true wenn Schritt 1 Ergebnisse lieferte
```

### Pattern 3: Override-Satz schreiben (Staged Drawer → Speichern)

**Was:** Wenn der Leader im Drawer auf „Speichern" klickt, werden die staged Änderungen als vollständiger Override-Satz persistiert.

```
Algorithmus (Frontend → Backend):
1. Vergleiche staged-State mit geladenen Daten
2. Zu löschende Contributions: DELETE /fansubs/:id/anime/:animeId/contributions/:id
3. Zu erstellende/ändernde: POST /fansubs/:id/anime/:animeId/contributions (mit release_version_id gesetzt)
4. ON CONFLICT DO UPDATE übernimmt Aktualisierungen (bereits in CreateOrUpdate vorhanden)

Wichtig: release_version_id MUSS gesetzt sein (nicht null) für Release-Override-Einträge.
```

Der bestehende `upsertAnimeContribution` in `api.ts` akzeptiert bereits `release_version_id`. **Kein neuer Backend-Endpoint für das Schreiben nötig.**

### Pattern 4: GetMemberRolesForVersion — Migration auf anime_contributions

**Was:** Der aktuelle `GetMemberRolesForVersion`-Query in `release_version_notes_repository.go` liest aus `release_member_roles` (Phase-44-Legacy-Tabelle, `fansub_releases → release_member_roles → members + contributor_roles`). Diese Tabelle ist nicht mit `anime_contributions` verbunden.

**Neue Query:**
```sql
-- Aufgelöster Satz via anime_contributions (analog zu Effective-Contributions):
-- Schritt 1: versions-spezifisch
SELECT DISTINCT ac.member_id, m.nickname, acr.role_code, rd.label_de AS role_label
FROM anime_contributions ac
JOIN members m ON m.id = ac.member_id
JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
JOIN role_definitions rd ON rd.code = acr.role_code
WHERE ac.release_version_id = $versionID
  AND ac.fansub_group_id IN (
      SELECT fansub_group_id FROM release_version_groups WHERE release_version_id = $versionID
  )
-- Schritt 2 (Fallback, wenn Schritt 1 leer): anime-weit
SELECT DISTINCT ac.member_id, m.nickname, acr.role_code, rd.label_de AS role_label
FROM anime_contributions ac
JOIN members m ON m.id = ac.member_id
JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
JOIN role_definitions rd ON rd.code = acr.role_code
JOIN release_versions rv ON ...  -- anime_id aus versionID ermitteln
WHERE ac.release_version_id IS NULL
  AND ac.anime_id = $animeID
```

**Konsequenz:** Die Validierungslogik in `loadValidMemberRoleKeysForVersion` (verwendet für BulkUpsert) muss analog umgestellt werden — sie prüft heute gegen `release_member_roles`, muss gegen den aufgelösten `anime_contributions`-Satz prüfen.

### Anti-Patterns to Avoid

- **`ListActorGroupRoles` komplett entfernen:** Nein — der Leader-Bypass (D-05) braucht weiterhin die Gruppen-Rolle. Leader-Check via Gruppenrolle bleibt als erster Schritt in `CanForReleaseVersion`.
- **Materialisierter Snapshot-Ansatz:** Jede Änderung am Projekt-Team müsste in alle überschriebenen Releases propagiert werden → Nicht-überschriebene Releases würden riskant divergieren. Delta-Auflösung (on-the-fly) ist einfacher und korrekt.
- **Frontend-seitige Permission-Bestimmung:** Kein `roleMatrix`-Lookup im Browser. Capabilities kommen ausschließlich vom `GetReleaseVersionCapabilities`-Endpoint.
- **Natives `<select>` in `AnimeContributionModal.tsx` behalten:** D-14 fordert Ersatz durch `Select`+`FormField`. Die bestehenden `Select`-Calls mit `event.currentTarget.value` sind nah, aber die nativen `<option>` innerhalb des `Select`-Primitive müssen überprüft werden (je nach Implementierung des Primitives).

---

## Don't Hand-Roll

| Problem | Nicht bauen | Stattdessen nutzen | Warum |
|---------|-------------|-------------------|-------|
| Sidebar-/Panel-Overlay | Eigenes `<aside>` | `Drawer` aus `@/components/ui/Drawer.tsx` | Bereits right-anchored, hat `footer`-Slot, overlay, ARIA-Labels |
| Person-Dropdown im Drawer | Eigenes `<select>` | `Select` + `FormField` | D-14 Hard Constraint; ESLint warnt bereits |
| Rollen-Auswahl-Dropdown | Eigenes `<select>` | `Select` + `FormField` mit `role_definitions`-Daten | Wie oben |
| Leer-/Lade-/Fehlerzustand | Custom-Markup | `EmptyState`, `LoadingState`, `ErrorState` aus `@/components/ui` | Alle drei bereits im Primitive-Set |
| Avatar mit Initialen | Eigene Lösung | Neues `ContributorAvatar`-Inlinekkomponent mit `--surface-sunken`/`--text-soft`/`--radius-md` | Kein Avatar-Primitive vorhanden laut UI-SPEC — lokales Inlinekkomponent ist die genehmigte Lösung |
| Permission-Auflösung | Client-seitig | `CanForReleaseVersion` (Backend) + `GetReleaseVersionCapabilities`-Endpoint | Sicherheitskritisch — nur Backend entscheidet |
| Override-Satz-Persistenz | Neuer Bulk-Endpoint | Bestehender POST/DELETE `/contributions` mit `release_version_id` | `CreateOrUpdate` mit ON CONFLICT bereits vorhanden |

---

## Runtime State Inventory

> Nur relevant für Rename/Refactor-Phasen — HIER NICHT ANWENDBAR.
> Phase 83 ist kein Rename; keine Runtime-State-Migration erforderlich.

---

## Common Pitfalls

### Pitfall 1: Leader-Check muss VOR Contribution-Check laufen

**Was schief geht:** Wenn `CanForReleaseVersion` zuerst `ListActorContributionRolesForVersion` aufruft und keine Contributions findet, wird der Leader fälschlicherweise abgelehnt — weil `fansub_lead` oft keine eigene Contribution hat.

**Ursache:** D-05 definiert Leader als Ausnahme von D-04. Die Reihenfolge im Code ist entscheidend.

**Vermeidung:** Im neuen `CanForReleaseVersion` zuerst `ListActorGroupRoles` → hat Actor `fansub_lead` oder `project_lead` + entsprechende Action erlaubt? → Sofort allow. Danach erst Contribution-Auflösung für operative Rollen.

**Warnsignal:** Tests für `fansub_lead`-Action auf `ActionReleaseVersionMediaUpload` schlagen fehl.

### Pitfall 2: `NULLS NOT DISTINCT` — Upsert-Konflikt-Target

**Was schief geht:** Standard-PostgreSQL-`INSERT ... ON CONFLICT (col1, col2, col3, col4) DO UPDATE` funktioniert mit `NULLS NOT DISTINCT`-UNIQUE nur in PG15+. Das Projekt nutzt PG16 → kein Problem, aber die Constraint-Benennung muss exakt `uq_anime_contribution_member` heißen (wie in 0091 definiert).

**Bestätigung:** `anime_contributions_upsert_repository.go` Z.70 nutzt bereits `ON CONFLICT (fansub_group_id, anime_id, member_id, release_version_id)` — korrekt. [VERIFIED: codebase]

**Warnsignal:** Upsert-Test schlägt mit `duplicate key violates unique constraint` fehl.

### Pitfall 3: `GetMemberRolesForVersion` liest Legacy-Tabelle

**Was schief geht:** `GetMemberRolesForVersion` in `release_version_notes_repository.go` joint auf `release_member_roles` (Migration 0044 — alte Tabelle, Phase 44). Diese Tabelle ist von `anime_contributions` völlig getrennt. Ohne Umbau zeigt die Notizen-/Media-Maske einen veralteten/falschen Satz und die Validierung in `loadValidMemberRoleKeysForVersion` lehnt gültige Members ab.

**Ursache:** `GetMemberRolesForVersion` wurde nie auf `anime_contributions` migriert — die Notizen-Maske wurde vor Migration 0086 gebaut.

**Vermeidung:** `GetMemberRolesForVersion` und `loadValidMemberRoleKeysForVersion` MÜSSEN auf die neue Auflösungslogik (anime_contributions + anime_contribution_roles) umgestellt werden. Kein optionaler Schritt.

**Warnsignal:** Notizen-Maske zeigt nach Phase-83-Deploy keine Mitwirkenden, obwohl Contributions existieren.

### Pitfall 4: DELETE-Logik beim Override-Speichern

**Was schief geht:** Wenn der Leader im Drawer Mitglieder entfernt und speichert, müssen GENAU die `release_version_id`-spezifischen Contributions gelöscht werden — NICHT die anime-weiten (release_version_id IS NULL). Der bestehende `Delete`-Handler (`DELETE FROM anime_contributions WHERE id = $1 AND fansub_group_id = $2 AND anime_id = $3`) löscht nach ID — korrekt, solange die IDs der versions-spezifischen Einträge im Frontend bekannt sind.

**Vermeidung:** Die Effective-Contributions-API muss die Contribution-IDs zurückgeben (`contribution_id` pro Zeile), damit das Frontend beim Speichern exakt die richtigen IDs löscht.

### Pitfall 5: Soft-Delete für anime_contributions existiert NICHT

**Was schief geht:** Die `Delete`-Methode in `anime_contributions_member_repository.go` führt ein Hard-DELETE aus (`DELETE FROM anime_contributions WHERE id = ...`). Es gibt kein `deleted_at`-Feld.

**Konsequenz (D-16):** Die Anforderung „Leader-Löschen = Soft-Delete" ist für Contributions NICHT erfüllt. Da D-16 keinen Vollausbau in dieser Phase fordert, ist dies ein dokumentiertes Risiko → Folgearbeit. Keine Breaking-Change in Phase 83.

**Warnsignal:** Audit-Logs für gelöschte Contributions enthalten keine Tombstone-Records.

### Pitfall 6: Cockpit-Badge-Berechnung braucht neuen Datenpunkt

**Was schief geht:** `ProjectCockpitBadges` wird aktuell mit `contributionCount` und `hasProjectNote` gespeist. Für die neue Badges „Projektteam" / „Eigene Besetzung" / „Mitwirkende fehlen" pro Release-Zeile wird ein neues Flag benötigt (`has_override: bool`), das nicht im bestehenden `AdminFansubReleaseSummary` vorhanden ist.

**Vermeidung:** `ListFansubAnimeReleasesPage`-Query erweitern um ein `has_override`-Subquery auf `anime_contributions WHERE release_version_id = rv.id`. Alternativ: Separate API oder `has_override` im Effective-Contributions-Response übermitteln und im State cachen.

### Pitfall 7: `AnimeContributionModal.tsx` — `<Select>` vs. `<option>` inside

**Was schief geht:** Das bestehende `AnimeContributionModal.tsx` nutzt `Select` (Primitive), übergibt aber native `<option>` als `children`. Die `Select`-Komponente aus `@/components/ui` kapselt ein natives `<select>` — `<option>` als Kinder sind daher korrekt und kein CLAUDE.md-Verstoß. Das Problem ist das separate `<select>` in der Focused-Role-Ansicht (Z.231ff), das `event.currentTarget.value` verwendet. Dieses muss durch `Select`+`FormField` ersetzt werden, wobei `onChange` weiterhin `event.currentTarget.value` lesen kann (Select-Primitive ist ein nativer select-Wrapper).

---

## Soft-Delete-Pfad — Verifikation (D-16)

| Pfad | Soft-Delete vorhanden? | Fundstelle |
|------|----------------------|------------|
| `release_version_notes` löschen | **Ja** — `deleted_at` + `deleted_by_user_id` in Schema 0064 | [VERIFIED: codebase] |
| `release_version_media` löschen | **Ja** — `SoftDeleteReleaseVersionMedia` ruft `deleted_at = NOW()` | [VERIFIED: media handler Z.824] |
| `anime_contributions` löschen | **Nein** — Hard-DELETE, kein `deleted_at` | [VERIFIED: `anime_contributions_member_repository.go` Z.42-43] |

**Fazit D-16:** Für Notizen und Media ist Soft-Delete bereits vorhanden. Für Contributions (das Entfernen aus dem Override-Drawer) existiert kein Soft-Delete. Da D-16 keinen Vollausbau fordert und die Contributions-Tabelle kein `deleted_at`-Schema-Slot hat, ist dies ein **Constraint/Risiko für Folgearbeit**. Der Phase-83-Planner soll keinen `deleted_at`-Slot hinzufügen (schlägt neue Migration vor, die out-of-scope ist).

---

## Kandidaten-Pool — API-Analyse (D-12)

`listUnifiedGroupMembers(fansubId: number)` in `api.ts` (Z.7284) ruft `GET /api/v1/admin/fansubs/:id/unified-members` auf und gibt `UnifiedGroupMember[]` zurück. Jede Zeile enthält `member_id`, `display_name`, `source` ("hist"|"app"), `has_app_account`, `group_roles[]`.

**Für den Drawer:** Beim Öffnen wird `listUnifiedGroupMembers(fansubId)` parallel zum Effective-Contributions-Aufruf geladen. Der Person-Picker im Drawer zeigt `display_name` als Label, `member_id` als Value. Bereits im Drawer angezeigte Members können im Picker ausgeblendet oder als „bereits zugewiesen" markiert werden (UX-Detail für Planner).

**Kein neuer Endpoint nötig** — `listUnifiedGroupMembers` deckt D-12 vollständig ab.

---

## Frontend Override-Drawer — Primitive-Inventar

Alle benötigten Primitives aus `@/components/ui/index.ts` sind vorhanden: [VERIFIED: codebase]

| UI-Element | Primitive | Status |
|-----------|-----------|--------|
| Rechtes Slide-Panel | `Drawer` (`open`, `onClose`, `title`, `description`, `footer`) | Vorhanden |
| Speichern/Abbrechen-Footer | `Button variant="primary"` / `Button variant="ghost"` | Vorhanden |
| Zeilen-Entfernen-Button | `Button variant="danger" iconOnly size="sm"` | Vorhanden (variant="danger" prüfen) |
| Zeilen-Rolle-ändern-Button | `Button variant="ghost" iconOnly` + `MoreHorizontal` | Vorhanden |
| Person-Picker | `Select` + `FormField` | Vorhanden |
| Rollen-Picker | `Select` + `FormField` | Vorhanden |
| Hinzufügen-Button | `Button variant="secondary"` + `Plus`-Icon | Vorhanden |
| Badges (Cockpit-Übersicht) | `Badge` (variant="muted"/"info"/"warning") | Vorhanden |
| Leer-/Lade-/Fehlerstatus | `EmptyState`, `LoadingState`, `ErrorState` | Vorhanden |
| Avatar | **Kein Avatar-Primitive** | Mini-Inlinekkomponent `ContributorAvatar` bauen |

**Drawer-Implementierung:**
```tsx
// Source: frontend/src/components/ui/Drawer.tsx (verifiziert)
// Drawer nimmt: open, onClose, title, description, children, footer
// footer-Slot: Button variant="primary" (Speichern) + Button variant="ghost" (Abbrechen)
// Sidebar ist bereits right-anchored (aside.drawerPanel), overlay mit onClose
<Drawer
  open={drawerOpen}
  onClose={handleClose}
  title="Mitwirkende"
  description={`Rollen für ${releaseTitle}`}
  footer={
    <>
      <Button variant="ghost" onClick={handleClose}>Abbrechen</Button>
      <Button variant="primary" onClick={handleSave} loading={saving}>Speichern</Button>
    </>
  }
>
  {/* Rollen-Liste */}
</Drawer>
```

**Hinweis:** `Drawer`-Primitive rendert `null` wenn `open=false` — kein Mount-/Unmount-Problem. Staged-State im `useState` der Elternkomponente.

---

## API-Contracts — Neue und geänderte Endpoints

### Neuer Endpoint (muss in `admin-content.yaml` und Handler ergänzt werden)

```yaml
# shared/contracts/admin-content.yaml — NEU
- name: admin-release-version-contributions-effective
  method: GET
  path: /api/v1/admin/release-versions/:versionId/contributions/effective
  auth:
    required: true
    permission: release_version.view für die adressierte Release-Version
  query_params:
    - name: fansub_group_id
      type: int64
      required: true
  response:
    status: 200
    type: EffectiveContributionsResponse
  notes:
    - Liefert den aufgelösten Mitwirkenden-Satz (Override oder Projekt-Default).
    - meta.is_override=true wenn versions-spezifische Contributions existieren.
    - meta.source: "release_version" | "anime_default"
```

### Bestehende Endpoints (keine Breaking Changes)

| Endpoint | Änderung |
|----------|----------|
| `POST /fansubs/:id/anime/:animeId/contributions` | Keine Änderung — `release_version_id` bereits unterstützt |
| `DELETE /fansubs/:id/anime/:animeId/contributions/:id` | Keine Änderung |
| `GET /fansubs/:id/anime/:animeId/release-versions` | Bereits vorhanden (Dropdown-Pool für Phase-67-04) |
| `GET /release-versions/:versionId/capabilities` | Keine Breaking Change — Verhalten ändert sich durch Permission-Umbau |

---

## Modularitäts-Analyse (≤450 Zeilen)

| Datei | Aktuell | Einschätzung |
|-------|---------|-------------|
| `backend/internal/permissions/permissions.go` | 346 Zeilen | Sicher — Umbau fügt ~30-50 Zeilen hinzu |
| `backend/internal/repository/authz_permissions.go` | 189 Zeilen | Sicher — neue Methode ~40 Zeilen |
| `backend/internal/repository/release_version_notes_repository.go` | ~280 Zeilen (geschätzt, vollständig gelesen bis Z.219) | Sicher |
| `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` | >3200 Zeilen | **ÜBERSCHREITET 450 ZEILEN BEREITS** — neues `ReleaseContributionDrawer.tsx` als separate Datei ist Pflicht |

**Split-Empfehlung:** `ReleaseContributionDrawer.tsx` als eigene Datei im `edit/`-Verzeichnis. `ContributorAvatar.tsx` als eigene Mini-Komponente. `page.tsx` erhält nur den Einstiegspunkt (Button + `drawerOpen`-State + Handler).

---

## State of the Art

| Alter Ansatz | Neuer Ansatz | Seit | Impact |
|--------------|-------------|------|--------|
| Permission via `fansub_group_member_roles` | Permission via `anime_contributions`-Auflösung | Phase 83 | Grundlegende Sicherheits-Refaktorierung |
| `GetMemberRolesForVersion` via `release_member_roles` | via `anime_contributions` + `anime_contribution_roles` | Phase 83 | D-13-Konsistenz |
| Kein Override-Drawer | Override-Drawer pro Release-Version | Phase 83 | D-06..D-08 |
| Gruppe-nur-Mitgliedschaft = Edit-Recht | Contribution = Edit-Recht | Phase 83 | D-04 |

**Deprecated (in Phase 83 ersetzen):**
- `release_member_roles`-Joins in `GetMemberRolesForVersion` und `loadValidMemberRoleKeysForVersion` → auf `anime_contributions` umstellen.
- Gruppenrollen-basierter `CanForReleaseVersion`-Pfad für operative Rollen → durch Contribution-Auflösung ersetzen.

---

## Environment Availability

> Nur Code/Schema-Änderungen; keine neuen externen Tools.

| Abhängigkeit | Benötigt von | Verfügbar | Fallback |
|-------------|-------------|-----------|----------|
| PostgreSQL 16 | NULLS NOT DISTINCT (0091) | Vorhanden (docker-compose) | — |
| Alle npm-Pakete | Frontend | Vorhanden | — |
| Alle Go-Module | Backend | Vorhanden | — |

**Keine fehlenden Abhängigkeiten.**

---

## Validation Architecture

### Test Framework

| Eigenschaft | Wert |
|-------------|------|
| Go-Framework | `github.com/stretchr/testify` + Go testing |
| Go-Schnellbefehl | `go test ./backend/internal/permissions/... -v -run TestCanForReleaseVersion` |
| Frontend-Framework | Vitest 3 |
| Frontend-Schnellbefehl | `npm --prefix frontend run test -- --reporter=dot ReleaseContributionDrawer` |
| Vollständige Suite | `go test ./backend/... && npm --prefix frontend run test` |

### Phase Requirements → Test Map

| Req-ID | Verhalten | Test-Typ | Automatisierter Befehl | Datei vorhanden? |
|--------|-----------|----------|----------------------|-----------------|
| D-01/D-04 | `CanForReleaseVersion` erlaubt nur Actors mit Contribution | Unit | `go test ./backend/internal/permissions/... -run TestCanForReleaseVersion` | Teilweise (permissions_test.go) — ❌ neue Fälle |
| D-01/D-05 | `fansub_lead` immer erlaubt (Leader-Bypass) | Unit | `go test ./backend/internal/permissions/... -run TestCanForReleaseVersionLeaderBypass` | ❌ Wave 0 |
| D-02 | Fallback auf anime-weite Contributions wenn kein Override | Unit | `go test ./backend/internal/repository/... -run TestListActorContributionRolesForVersion` | ❌ Wave 0 |
| D-03 | Absenz im Override = abgelehnt für dieses Release | Unit | `go test ./backend/internal/permissions/... -run TestCanForReleaseVersionAbsenceInOverride` | ❌ Wave 0 |
| D-13 | `GetMemberRolesForVersion` liefert anime_contributions-Daten | Unit | `go test ./backend/internal/repository/... -run TestGetMemberRolesForVersion` | Vorhanden in notes_repository_test.go — ❌ neue Assertions |
| D-06..D-08 | Drawer öffnet bei Klick, zeigt Rollen-Liste | Unit/Integration | `npm --prefix frontend run test -- --reporter=dot ReleaseContributionDrawer` | ❌ Wave 0 |
| D-14 | Kein natives `<select>` in `AnimeContributionModal` | ESLint | `npm --prefix frontend run lint` | Vorhanden (ESLint-Regel) |

### Wave 0 Gaps

- [ ] `backend/internal/permissions/permissions_test.go` — neue Testfälle für contribution-getriebene Auflösung
- [ ] `backend/internal/repository/authz_permissions_test.go` — `ListActorContributionRolesForVersion` (NEU)
- [ ] `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.test.tsx` — NEU
- [ ] `frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.test.tsx` — NEU (optional, minimal)

---

## Security Domain

### Anwendbare ASVS-Kategorien

| ASVS Kategorie | Anwendbar | Standard-Kontrolle |
|----------------|----------|-------------------|
| V2 Authentication | Nein | Bestehende Auth-Middleware unverändert |
| V3 Session Management | Nein | Bestehend |
| V4 Access Control | **Ja — Kernumbau** | `CanForReleaseVersion` + `roleMatrix` |
| V5 Input Validation | Ja | `release_version_id` als int64, `role_codes` gegen `role_definitions` validiert |
| V6 Kryptografie | Nein | — |

### Bekannte Bedrohungsmuster

| Muster | STRIDE | Standard-Mitigation |
|--------|--------|-------------------|
| Cross-Group-Contribution-Tampering | Tampering | `GroupParticipatesInReleaseVersion` prüft `release_version_groups` — bereits vorhanden |
| Permission-Elevation via fehlender Contribution-Check | Elevation | Leader-Bypass VOR Contribution-Check (Pitfall 1) |
| Injiziertes `release_version_id` einer fremden Gruppe | Tampering | `GroupParticipatesInReleaseVersion` + Gruppen-Check in Contribution-Write-Handler |
| Override-Satz für falsche `release_version_id` | Tampering | `fansub_group_id`-Filter in Effective-Contributions-Query |

**Wichtiger Sicherheits-Hinweis:** Der neue `ListActorContributionRolesForVersion`-Join muss `fansub_group_id`-scoped sein. Ein Actor könnte in einer anderen Gruppe dieselbe `member_id` haben — der Join über `fansub_group_members.app_user_id = $appUserID` MUSS durch den `fansub_group_id`-Kontext der Release-Version (via `release_version_groups`) begrenzt werden.

---

## Assumptions Log

Alle Kernbefunde wurden direkt aus dem Codebase verifiziert. Keine `[ASSUMED]`-Einträge.

| # | Claim | Abschnitt | Risiko bei Fehler |
|---|-------|-----------|------------------|
| — | — | — | — |

**Diese Tabelle ist leer: Alle Claims in dieser Research wurden aus dem Codebase verifiziert.**

---

## Open Questions

1. **`release_member_roles` — enthält sie noch aktive Daten?**
   - Was wir wissen: `GetMemberRolesForVersion` liest diese Tabelle. Migration 0065 hat sie im Seed geleert (CASCADE).
   - Unklar: Hat die Tabelle produktive Daten, die die Notizen-Validierung in `loadValidMemberRoleKeysForVersion` nutzt?
   - Empfehlung: Vor dem Umstellen auf `anime_contributions` prüfen, ob `release_member_roles` Zeilen enthält. Falls ja: Die Notizen-Validierung würde nach Umbau für bestehende Notizen fehlschlagen (falls Member in `anime_contributions` fehlen). Wenn leer: Umbau risikofrei.

2. **`has_override`-Flag im Release-Listing**
   - Was wir wissen: `ListFansubAnimeReleasesPage` gibt keinen `has_override`-Status zurück.
   - Unklar: Soll der Planner eine Subquery in die bestehende Listing-Query einbauen, oder separat via Effective-Contributions-Response abrufen (beim Drawer-Öffnen)?
   - Empfehlung: Subquery in `ListFansubAnimeReleasesPage` (oder einem neuen schlanken Endpoint für die Cockpit-Übersicht) — damit der Badge direkt beim Laden der Release-Liste sichtbar ist, ohne jeden Drawer einzeln zu laden.

3. **`Badge variant="danger"` in `@/components/ui`**
   - Was wir wissen: `Badge` in `ui/index.ts` exportiert, variant-Typen aus der Datei nicht vollständig gelesen.
   - Empfehlung: Planner soll Drawer-Button via `Button variant="danger"` (nicht `Badge`) für das Entfernen nutzen (UI-SPEC definiert das so). `Badge`-Variant "warning" für Cockpit-Status „Mitwirkende fehlen" — Planner prüft verfügbare Varianten beim Implementieren.

---

## Sources

### Primary (HIGH confidence — verifiziert aus Codebase)
- `backend/internal/permissions/permissions.go` — vollständig gelesen; `roleMatrix`, `canForContext`, `CanForReleaseVersion`, `Resolver`-Interface analysiert
- `backend/internal/repository/authz_permissions.go` — vollständig gelesen; `ListActorGroupRoles`, `ResolveReleaseVersion` analysiert
- `backend/internal/repository/anime_contributions_upsert_repository.go` — ON CONFLICT-Target verifiziert
- `backend/internal/repository/anime_contributions_member_repository.go` — Hard-DELETE verifiziert (D-16)
- `backend/internal/repository/release_version_notes_repository.go` — `GetMemberRolesForVersion`-Legacy-Query verifiziert
- `database/migrations/0091_anime_contributions_release_version.up.sql` — 4-Spalten-UNIQUE verifiziert
- `database/migrations/0086_anime_contributions.up.sql` — Basis-Schema
- `database/migrations/0059_release_version_media_schema.up.sql` — Soft-Delete-Schema für Media
- `database/migrations/0064_release_version_notes.up.sql` — Soft-Delete-Schema für Notizen
- `frontend/src/components/ui/index.ts` — Primitive-Inventar verifiziert
- `frontend/src/components/ui/Drawer.tsx` — vollständig gelesen; Props + Slot-Struktur
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — Cockpit-Einstieg Z.3080ff; `openAnimeContributions`-Pattern Z.1865ff
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` — natives `<select>` lokalisiert
- `frontend/src/types/fansub.ts` — `AnimeContribution`-Interface mit `release_version_id` verifiziert
- `backend/internal/repository/anime_contributions_release_lookup_repository.go` — `ListGroupReleaseVersionsForAnime`, `GroupParticipatesInReleaseVersion` verifiziert
- `shared/contracts/admin-content.yaml` — bestehende Contribution-Endpoints analysiert

### Secondary (MEDIUM confidence)
- Kein WebSearch genutzt — alle Befunde aus Codebase

---

## Metadata

**Konfidenzbreite:**
- Standard Stack: HIGH — alles im Codebase verifiziert, keine neuen Pakete
- Architecture: HIGH — alle Integration Points verifiziert
- Pitfalls: HIGH — Legacy-Tabellenproblem direkt im Code gefunden, Soft-Delete-Gap verifiziert

**Research-Datum:** 2026-06-11
**Gültig bis:** 2026-07-11 (stabil — kein externes Ökosystem betroffen)
