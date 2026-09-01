# Phase 143 Context — Evidenz und Fundstellen

**Quelle:** Externe Codeprüfung der Phase-142-Umsetzung vom 2026-09-01, Bereich `4891109a..fedb593e`
(24 Commits, 228 Codedateien, +6318/−1606, Migrationen 0153–0158). Jeder Punkt unten wurde gegen
Code, laufende Tests und die Live-DB `team4s_v2` verifiziert.

Die Success Criteria stehen in `ROADMAP.md` unter „Phase 143". Dieses Dokument liefert die
Fundstellen dazu, damit Discuss und Plan nicht neu suchen müssen.

## Kriterium 1 — Testsuite-Triage

`npx vitest run` auf HEAD: **17 Testdateien rot, 59 Tests, 11 Uncaught Errors** von 2150 Tests.

Fünf der roten Dateien wurden im Phase-142-Zeitraum selbst angefasst:

| Datei | Commits im Zeitraum |
|---|---|
| `me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx` | 2 |
| `admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx` | 1 |
| `admin/fansubs/[id]/edit/page.test.tsx` | 1 |
| `members/[slug]/page.test.tsx` | 1 |
| `types/__tests__/v12-projection-contract.test.ts` | 1 |

Die übrigen zwölf: `admin/episode-versions/[versionId]/edit/page.test.tsx`,
`admin/fansubs/[id]/edit/useGroupMembersTab.test.ts`,
`anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx`,
`fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx`,
`components/contributions/ContributionCard.test.tsx`,
`components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx`,
`components/profile/MembershipsSection.test.tsx`, `components/public/PublicNoteCard.test.tsx`,
`components/ui/ResponsiveImage.config.test.ts`, `lib/api.no-token-boundary.test.ts` — plus zwei
Dateien, die bereits beim Collect scheitern und deshalb keine Summenzeile ausgeben.

Zwei Fehlerbilder dominieren:

- **Contract-Drift.** `v12-projection-contract.test.ts:276` erwartet
  `enum: [bronze, silver, gold]`; `shared/contracts/openapi.yaml` hat bei
  `PublicMemberBadge.next_tier` `enum: [bronze, silver, gold, platinum]`.
  Entscheiden, welche Seite recht hat — der Test wurde von `c3f47e53 test: restore validation gates`
  angefasst, aber nicht in Ordnung gebracht.
- **Fehlender Provider im Testbaum.** `Error: useRoleCatalog must be used within RoleCatalogProvider`,
  vierzehnmal in einem Lauf, ausgelöst über `FansubAppMembersOverview.tsx:154`.

Nebenbefund, nicht Teil dieser Phase: `TestPhase136NarrowRoleDefaultsSeedToHandlerContract` ist
dauerhaft rot, weil es `backend/database/migrations/0146_…` liest, die Migrationen aber unter
`database/migrations/` liegen. Scheitert auch bei `4891109a`, also keine Regression dieser Phase —
aber ein Kandidat für einen eigenen Quick-Task.

## Kriterium 2 — Migration 0154

`database/migrations/0154_role_capability_defaults_snapshot.up.sql`:

```sql
-- Reset snapshot of all role capability defaults configured in the admin UI.
BEGIN;
DELETE FROM role_capabilities;
INSERT INTO role_capabilities (role_code, action_code) VALUES
    ('co_leader', 'fansub_group.edit'),
    -- 232 Zeilen, 15 Rollen
COMMIT;
```

`0154_role_capability_defaults_snapshot.down.sql` ist vollständig `BEGIN;` + `COMMIT;`.

`0153_techadmin_default_capabilities.up.sql` fügt zwölf `techadmin`-Rechte ein, die 0154 unmittelbar
danach löscht und neu setzt. Live-DB steht auf Migration 158, `role_capabilities` hat 259 Zeilen.

0154 bleibt als angewandte Migration stehen (append-only); die neue Migration stellt den Zielzustand
her.

## Kriterium 3 — Roh-SQL im Handler

`backend/internal/handlers/dashboard_me_handler.go`, in Phase 142 um 221 Zeilen gewachsen. Drei
Methoden mit Queries direkt über `h.db.Query(...)`:

- `attachPendingClaimAttention` — nutzt immerhin `MemberClaimsRepository`, memoisiert Permissions
  per `allowedByGroup`-Map.
- `attachPendingGroupMediaReviewAttention` — Roh-SQL, prüft
  `permissions.ActionFansubGroupEdit` statt einer Review-Action, keine Memoisierung.
- `attachPendingReleaseReviewAttention` — Roh-SQL, keine Memoisierung.

Die letzte repliziert den JOIN-Baum und die Selbstausschluss-Regel von
`releaseReviewQueueBaseSQL` bzw. `ReleaseReviewQueryRepository.Counts()` in
`backend/internal/repository/release_review_query_repository.go` — dieselbe Regel, die Phase 141
(RQUE-02 / D15) bewusst im Repository verankert hat:

```sql
WHERE lifecycle.review_state = 'pending'
  AND lifecycle.submitter_app_user_id <> $1
  AND NOT EXISTS (SELECT 1 FROM member_claims own_claim
                  WHERE own_claim.app_user_id = $1
                    AND own_claim.claim_status = 'verified'
                    AND own_claim.member_id = lifecycle.submitter_member_id)
```

Keine der drei Methoden hat heute einen Test. Diese Welle schafft die Aggregation, die Kriterium 7
wiederverwenden muss.

## Kriterium 4 — ungetestete neue Logik

- `backend/internal/services/release_metadata_credit_service.go` — vergibt Punkte über
  `PointService.CreditInTx`, hat keine Testdatei. Die Ladequery ist mehrdeutig:

  ```sql
  FROM release_variants rv
  JOIN release_versions rev ON rev.id = rv.release_version_id
  WHERE rv.id = $1 OR rev.id = $1
  ORDER BY rv.id LIMIT 1
  ```

  Dieselbe ID wird gegen zwei Tabellen geprüft; bei kollidierenden ID-Räumen wird still die falsche
  Zeile gewählt. Erst Test, dann entscheiden, ob die Query eindeutig werden muss.
  Aufrufer: `handlers/episode_version_update.go:74` (Fehler wird nur geloggt).
- `repository.FansubNotesRepository.UpdateAnimeFansubProjectTimeline` in
  `anime_fansub_project_timeline_repository.go` — Datumsvalidierung inklusive der Regel „Ende nicht
  vor einem bereits abgeschlossenen Release", ungetestet. Kontextprüfung und `UPDATE` laufen ohne
  gemeinsame Transaktion.
- Der einzige vorhandene Handler-Test
  `TestUpdateAnimeFansubProjectTimelineDeniesQualityChecker` prüft nur 403 und benutzt die falsche
  Route `/project-timeline` statt `/timeline`.

## Kriterium 5 — abgelehnte Notiz zählt als „Erledigt"

`backend/internal/repository/anime_contributions_member_project_repository.go:139-145`:

```sql
EXISTS (SELECT 1 FROM release_version_notes rvn
        WHERE rvn.release_version_id = rv.id
          AND rvn.member_id = $1
          AND rvn.deleted_at IS NULL) AS has_own_notes
```

Kein Review-State-Filter. Im Frontend
`frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx:53`:

```ts
function isDone(release: MeProjectReleaseVersion): boolean {
  return release.has_own_notes || release.has_own_media
}
```

Folge: eine abgelehnte Notiz macht die Folge „Erledigt"; der Zähler „X offen · Y erledigt"
(Zeile 172/173, angezeigt Zeile 284) ist falsch, und der Filter „Offen" verbirgt die Folge.

`tombstoned` braucht hier keine Sonderbehandlung: das Cleanup in
`release_review_cleanup_repository.go` setzt `deleted_at`, die Notiz fällt also bereits aus
`has_own_notes` heraus.

## Kriterium 6 — UI zurück auf das Design-System

- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMetadataFields.tsx` (neu):
  native `<input>` für Release-Name, Auflösung und Gesamtdauer, natives `<select>` für
  Untertitel-Typ — neben `Input` (CRC32) und `DatePicker` in derselben Datei.
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx` (neu): drei
  Inline-`style`-Blöcke statt CSS-Modul; doppeltes Label (natives `<label htmlFor>` plus
  `label`-Prop des DatePickers).
- `frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css`: `.metadataError` und
  `.metadataSuccess` nutzen `#a4262c` / `#fff1f0` / `#176b44` / `#edfbf2` und `padding: 10px 12px;
  border-radius: 8px` statt der Design-Tokens.
- Danach `no-restricted-syntax` in `frontend/eslint.config.mjs` von `warn` auf `error`.

## Kriterium 7 — Dashboard-Lane für abgelehnte Notizen

Lifecycle-Zustände laut Check-Constraint auf `release_version_note_review_lifecycle`:
`pending | confirmed | rejected | tombstoned`.

Heute filtert die Dashboard-Query doppelt gegen eigene abgelehnte Notizen
(`review_state = 'pending'` **und** `submitter_app_user_id <> $1`) — sie erscheinen nirgends.

Vorhandene Bausteine, die wiederverwendet und nicht neu gebaut werden:

- `ReleaseVersionNotesRepository.ListReleaseVersionNotesForMember` liefert bereits `ReviewState`,
  `RejectionCategory` und `RejectionReason` (join auf `review_decisions` +
  `review_audit_events.event_code = 'review.rejected'` + `review_reason_texts`).
- `groupAttentionContributions` in
  `frontend/src/app/me/dashboard/components/attentionHelpers.ts` ist das vorhandene
  Gruppierungsmuster der Attention-Sektion.
- Die Route `/me/releases/{versionId}/workspace?tab=notes` existiert; `parseWorkspaceTab` akzeptiert
  `'notes'`.
- Der Update-Zweig von `BulkUpsertReleaseVersionNotes` ruft `SubmitNote` erneut auf — die
  Überarbeitung einer abgelehnten Notiz ist also bereits möglich.

## Ausdrücklich NICHT in dieser Phase

- **`membershipBaselineActions`** in `backend/internal/permissions/effective_rights.go`: eine
  hartkodierte Go-Slice mit `fansub_group.members.view`, `fansub_group_media.view` und
  `fansub_group_media.upload` als neue Präzedenzstufe *über* `role_grant`. Dieselben Rechte stehen
  zusätzlich in Migration 0154. Ob die Baseline daten-getrieben nach `role_capabilities` wandert
  oder bewusst im Code bleibt, ist eine Design-Entscheidung und gehört in eine eigene
  Discuss-Runde — dort muss auch die Doppelung aufgelöst werden. Nebeneffekt heute:
  `DecisiveSource` ist für diese drei Actions immer `membership_baseline`, nie die tatsächlich
  gewährende Rolle, wodurch die Provenienz-Anzeige aus Phase 138 für sie ihre Aussage verliert.
- **Nachträgliches Erfassen der ~5300 ungeplanten Zeilen aus Commit `0481b671`** als Requirements.
  Ohne das fehlen sie in jeder künftigen Gap-Analyse — aber es ist Doku-Arbeit, keine Nacharbeit.
