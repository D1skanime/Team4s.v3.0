---
status: resolved
trigger: |
  Bereits bestaetigtes Release-Medium erscheint erneut in der Pruefliste; Bestaetigen
  liefert 409 "bereits von einer anderen Person entschieden".

  Symptom (Nutzer, live, Fansub-Leader D1sk): /admin/fansubs/1/reviews/<queue-token>
  (decodes to {"v":1,"s":"release_version_media","i":1}) zeigt Release-Medium 1
  (Buddy Complex, Ep 1, v1, Einreicher timer, Screenshot, Beitrag "Ich wollte mit dem
  timen zeigen was ich kann") als "In Pruefung". Klick auf "Bestaetigen und
  veroeffentlichen" -> POST /api/v1/admin/fansubs/1/release-reviews/<id>/decision ->
  409 "Diese Pruefung wurde bereits von einer anderen Person entschieden."

  Verbindliche Nutzerentscheidung (2026-10-12, Option B): reine Text-/Metadaten-
  Aenderungen (Titel, Bildunterschrift, ggf. Kategorie) BEHALTEN die bestehende
  Freigabe -> kein Re-Review, Medium darf NICHT erneut in der Pruefliste erscheinen.
  Nur Bilddatei-Ersatz loest erneute Pruefung aus.

  Auftrag: (1) Ursache belegen, (2) Fix fuer Metadaten-Edits an bereits bestaetigten
  Medien ueber alle Review-Quellen mit gleichem Muster, (3) Fehlermeldungen trennen
  (Fremd-Entscheid vs. veraltete Revision vs. sonstiger Konflikt, je eigene deutsche
  Meldung), (4) Bestand bereinigen nach vorherigem Freigabe-Checkpoint (Liste+Anzahl
  + Backup vor Loeschen/Update), (5) echte Verhaltenstests gegen echtes Postgres.
  Regeln: kein git stash, keine Zugangsdaten aendern, exakte Pfade committen, nicht
  pushen, Backend neu bauen und /health pruefen. Auf Deutsch berichten.
created: 2026-10-13
updated: 2026-10-13
scope: find_and_fix
---

## Nutzerfreigabe und Bestandsbereinigung (2026-10-13, nach Checkpoint)

Nutzer hat die vorgeschlagene Ein-Zeilen-Korrektur explizit freigegeben. Ausgefuehrt:

```sql
UPDATE release_version_media_review_lifecycle
SET review_state = 'confirmed',
    decided_at = '2026-08-30 00:53:50.125307+00'
WHERE release_version_media_id = 1
  AND source_revision = 3;
-- UPDATE 1, source_revision unveraendert bei 3
```

Verifikation direkt danach (psql, team4s_v2):
- Zeile zeigt release_version_media_id=1, source_revision=3, review_state='confirmed',
  decided_at='2026-08-30 00:53:50.125307+00', tombstoned_at=NULL.
- Admin-Pruefliste-Query (backend/internal/repository/release_review_query_repository.go:390,
  `WHERE lifecycle.review_state = 'pending'`) liefert fuer release_version_media_id=1 0 Zeilen --
  Medium erscheint nicht mehr in der Pruefliste. Gesamtzahl verbleibender pending-Zeilen: 0.
- Repro-Testdatei (TestZZReproMetadataEditResubmitThenDecideAgain) war bereits in der Hauptsession
  als Wegwerf-Repro entfernt worden -- kein Cleanup mehr noetig, keine Datei im Repo gefunden.
- Backend /health nach Bereinigung weiterhin {"status":"ok"} (kein Rebuild noetig, reine Datenkorrektur).

# Release-Review 409 bei bereits bestaetigtem Medium nach Metadaten-Edit

## Current Focus

status: fix implemented + verified by automated tests; BLOCKED on user approval for data cleanup (item 4) before archiving.
reasoning_checkpoint:
  hypothesis: "PatchReleaseVersionMedia (admin_content_release_version_media_patch.go) called SubmitMedia unconditionally whenever the editor was the uploader, even for pure metadata edits (title/caption/category/is_preview_candidate) with no file change -- this reset review_state to 'pending' and bumped source_revision, undoing an existing confirm decision. Additionally, the one-time submitter 'work contribution' point credit (creditReleaseReviewContribution) was not idempotent across a source's revisions, so even a legitimate second confirm (after a genuine file replace) failed with a 'point award idempotency mismatch' conflict, surfacing as a confusing, collectively-worded 409."
  confirming_evidence:
    - "Real-Postgres repro test (TestZZReproMetadataEditResubmitThenDecideAgain, run then deleted) reproduced the exact DB shape seen in production for release_version_media id=1: confirm at rev N, then SubmitMedia-driven resubmit on a pure metadata edit bumps to rev N+1 pending, confirm/decide on N+1 failed until both fixes were applied."
    - "psql against live team4s_v2 confirmed media id=1: lifecycle rev=3/pending/last_activity_at=2026-09-29 12:15:18 (exactly the metadata-edit timestamp); review_decisions has exactly one row, rev=2/confirm/2026-08-30 -- the edit, not a second reviewer, moved it back to pending."
    - "Debug printf inside services.ReviewService.Decide (removed after use) showed the second confirm attempt failing inside adapter.ApplyDecision with 'credit release review contribution ...: point award idempotency mismatch: conflict', confirming the second, independent bug."
  falsification_test: "If the hypothesis were wrong, a metadata-only PATCH on a confirmed medium would NOT touch review_state/source_revision at all (no SubmitMedia call), or a second legitimate confirm after a real file replace would succeed even without the credit-idempotency fix. Both were empirically tested and falsified the null hypothesis before the fix, and now pass after it (TestReleaseReviewMetadataEditKeepsConfirmationFileReplaceReopensReview)."
  fix_rationale: "The fix separates two previously-conflated concepts at the exact point they were conflated: BumpMediaRevisionForMetadataEdit advances source_revision for optimistic concurrency WITHOUT touching review_state/decided_at, applied uniformly to uploader and non-uploader metadata edits (previously only non-uploaders got the non-reopening path, BUG-174-04 Option 1); and the submitter's one-time work-contribution credit is now checked for existence (HasBeenCredited) before crediting, so a legitimate second confirm is never blocked by stale-EffectiveAt idempotency-mismatch logic designed for literal retries, not legitimately repeated business events."
  blind_spots: "Not covered: concurrent (true multi-request-race) metadata edits against BumpMediaRevisionForMetadataEdit were only tested sequentially, not under real parallel load. The three-way error-message split (item 3) is tested at the handler level for 2 of 3 buckets (stale revision, foreign decision); the third bucket (repository.ErrConflict from a credit-slot race on the REVIEWER's own credit) is design-reasoned but not reproduced under genuine concurrency in a test."

## Resolution Summary (see Resolution section below for final state)

## Symptoms

expected: Ein reiner Metadaten-Edit (Titel/Bildunterschrift/Kategorie) an einem bereits bestaetigten Release-Medium darf die bestehende Freigabe NICHT aufheben; das Medium bleibt bestaetigt und erscheint nicht erneut in der Pruefliste. Eine Entscheidung ueber eine veraltete Revision soll eine eigene, klare deutsche Fehlermeldung liefern (nicht die "von anderer Person entschieden"-Meldung).
actual: Nach einem Metadaten-Edit am 2026-09-29 12:15:18 an release_version_media id=1 (Titel "test", Caption geaendert) steht release_version_media_review_lifecycle fuer id=1 auf source_revision=3, review_state='pending', decided_at=NULL. Das Medium erscheint dadurch wieder in der admin Pruefliste. Klick auf "Bestaetigen und veroeffentlichen" liefert HTTP 409 mit der Meldung "Diese Pruefung wurde bereits von einer anderen Person entschieden." -- obwohl real keine zweite Person entschieden hat; review_decisions enthaelt fuer source_type release_version_media / source_key '1' genau eine Zeile: source_revision=2, decision=confirm, reviewer_app_user_id=4, decided_at=2026-08-30.
errors: "HTTP 409 Diese Pruefung wurde bereits von einer anderen Person entschieden." -- Antwort von POST /api/v1/admin/fansubs/1/release-reviews/<id>/decision. handlers/release_review_handler.go writeDecisionError mappt sowohl services.ErrReviewAlreadyDecided als auch repository.ErrConflict auf diese eine Meldung (Sammelmeldung, verschleiert die eigentliche Ursache).
reproduction: 1) Release-Medium bestaetigen (confirm-Entscheidung existiert, review_decisions Zeile mit decision=confirm, bestimmte source_revision N). 2) Spaeter nur Titel/Caption des Mediums editieren (kein Datei-Ersatz). 3) Lifecycle-Zeile zeigt danach review_state='pending', source_revision=N+1. 4) Medium erscheint wieder in /admin/fansubs/{id}/reviews Pruefliste. 5) Klick "Bestaetigen und veroeffentlichen" -> POST .../decision -> 409.
started: Beobachtet an release_version_media id=1 (Metadaten-Edit am 2026-09-29, urspruengliche Bestaetigung am 2026-08-30). Vermutlich strukturelles Verhalten seit Einfuehrung der Revision-/Lifecycle-Logik, nicht ein isolierter Datenfehler -- muss ueber den Code verifiziert werden.

## Eliminated

## Evidence

- timestamp: 2026-10-12 (Hauptsession, vor diesem Debug-Lauf)
  checked: psql team4s_v2 -- release_version_media id=1, release_version_media_review_lifecycle id=1, review_decisions (source_type release_version_media, source_key '1')
  found: release_version_media.updated_at=2026-09-29 12:15:18 (Metadaten-Edit, title/caption); Lifecycle source_revision=3, review_state='pending', decided_at=NULL, last_activity_at=2026-09-29 12:15:18; review_decisions hat genau 1 Zeile source_revision=2, decision=confirm, decided_at=2026-08-30, reviewer_app_user_id=4.
  implication: Die Revision ist seit der confirm-Entscheidung (rev 2) auf rev 3 gestiegen und der Lifecycle wurde auf pending zurueckgesetzt -- zeitlich passend zum Metadaten-Edit, nicht zu einem Datei-Ersatz. Noch nicht codeseitig bestaetigt, welcher Pfad das ausgeloest hat.
- timestamp: 2026-10-12 (Hauptsession, vor diesem Debug-Lauf)
  checked: backend/internal/handlers/release_review_handler.go writeDecisionError
  found: services.ErrReviewAlreadyDecided und repository.ErrConflict werden auf dieselbe 409-Meldung "...bereits von einer anderen Person entschieden" gemappt.
  implication: Die Fehlermeldung ist eine irrefuehrende Sammelmeldung -- der tatsaechliche Pfad (veraltete Revision durch eigenen Metadaten-Edit vs. echter Fremd-Entscheid) ist aus der Antwort nicht unterscheidbar; noch zu verifizieren, durch welchen der beiden Fehlertypen der 409 hier tatsaechlich ausgeloest wird.
- timestamp: 2026-10-13
  checked: backend/internal/handlers/admin_content_release_version_media_patch.go PatchReleaseVersionMedia (vor Fix)
  found: "if isReleaseVersionMediaUploader(...) { SubmitMedia(...) } else if expectedRevision == nil { 400 } else { CheckMediaRevisionConflict(...) }" -- nur der NICHT-Uploader-Zweig (BUG-174-04 Option 1) blieb re-review-frei; der Uploader-Zweig rief bei JEDEM Metadaten-Edit SubmitMedia auf, exakt wie bei einem echten Resubmit.
  implication: Root Cause bestaetigt -- Metadaten-Edit DURCH DEN UPLOADER SELBST setzt review_state auf 'pending' zurueck und erhoeht source_revision, obwohl kein Dateibezug besteht.
- timestamp: 2026-10-13
  checked: Echter Postgres-Repro (TestZZReproMetadataEditResubmitThenDecideAgain, temporaer) -- confirm(rev1) -> SubmitMedia-Resubmit (rev2, pending) -> confirm(rev2) erneut
  found: Zweiter confirm-Versuch schlug fehl mit services.ErrReviewTargetNotPending; Debug-Printf in adapter.ApplyDecision zeigte den echten Fehler "credit release review contribution ...: point award idempotency mismatch: conflict" aus creditReleaseReviewContribution (services/release_review_decision.go).
  implication: Zweiter, unabhaengiger Bug gefunden -- die einmalige Mitwirkungs-Gutschrift fuer den Submitter ist nicht ueber Revisionen hinweg idempotent (Idempotency-Key ohne Revision, aber EffectiveAt-Vergleich schlaegt fehl), blockiert auch LEGITIME zweite Bestaetigungen nach echtem Datei-Ersatz.
- timestamp: 2026-10-13
  checked: review_version_notes_repository.go BulkUpsertReleaseVersionNotes
  found: Jede Notiz-UPDATE ruft unconditional SubmitNote auf (kein Metadaten/Content-Split) -- aber bei Notizen IST der Titel/Body-Text selbst der geprüfte Inhalt (kein Pendant zu "nur Bildunterschrift"), ein Notiz-Edit ist inhaltlich aequivalent zu einem Datei-Ersatz bei Medien.
  implication: Gleiches Code-Muster (unconditional Resubmit bei JEDEM Update), aber KEIN Bug -- fuer Notizen ist Re-Review bei jedem Edit das korrekte, beabsichtigte Verhalten. Fix bewusst nur auf release_version_media angewendet.
- timestamp: 2026-10-13
  checked: Live-Datenbestand team4s_v2, release_version_media_review_lifecycle vs. review_decisions (siehe CHECKPOINT unten)
  found: Genau 1 betroffene Zeile (media_id=1); 0 betroffene release_version_note-Zeilen.
  implication: Kleiner, gut abgegrenzter Bereinigungsumfang; Backup (CSV + pg_dump) erstellt, Bereinigung selbst noch NICHT ausgefuehrt -- wartet auf Nutzerfreigabe (Checkpoint).

## Resolution

root_cause: |
  Zwei unabhaengige, sich verstaerkende Bugs:
  (1) backend/internal/handlers/admin_content_release_version_media_patch.go PatchReleaseVersionMedia rief bei
      JEDEM Metadaten-Edit (Titel/Caption/Kategorie/Preview-Flag) durch den UPLOADER SubmitMedia auf -- identisch
      zu einem echten Resubmit. Das setzte review_state unconditional auf 'pending' zurueck und erhoehte
      source_revision, obwohl keine Datei geaendert wurde. Nur der Nicht-Uploader-Zweig (BUG-174-04 Option 1)
      war bereits re-review-frei.
  (2) services/release_review_decision.go creditReleaseReviewContribution (die einmalige "Mitwirkungs"-Punkte-
      gutschrift fuer den urspruenglichen Submitter) war nicht idempotent ueber mehrere Revisionen eines Source
      hinweg: der Idempotency-Key enthaelt keine Revision (gewollt, da nur EINMAL pro Medium vergeben werden
      soll), aber InsertAward's Retry-Fallback vergleicht EffectiveAt striktemand verlangt exakte Uebereinstimmung
      -- ein zweiter, legitimer Confirm-Vorgang (nach echtem Datei-Ersatz ODER nach dem o.g. Bug-1-Reopen) hatte
      zwangslaeufig ein spaeteres EffectiveAt und wurde faelschlich als Konflikt gewertet. Das fuehrte zum
      vagen 409 ("Diese Pruefung ist nicht mehr offen." bzw. in der Fremd-Entscheid-Sammelmeldung).
  Zusaetzlich bündelte writeDecisionError ErrReviewAlreadyDecided und rohes repository.ErrConflict in eine
  einzige Meldung ("...bereits von einer anderen Person entschieden"), die weder einen echten Fremd-Entscheid
  noch die o.g. Konfliktarten vom tatsaechlichen Fall unterscheidbar machte.
fix: |
  1) backend/internal/repository/release_review_lifecycle_revision_guard.go: CheckMediaRevisionConflict ersetzt
     durch BumpMediaRevisionForMetadataEdit -- sperrt die Lifecycle-Zeile, prueft expectedRevision, erhoeht
     source_revision um genau 1, laesst review_state/decided_at/submitted_at/cleanup_due_at/tombstoned_at
     unangetastet.
  2) backend/internal/handlers/admin_content_release_version_media_patch.go PatchReleaseVersionMedia: der
     Uploader-Sonderzweig (SubmitMedia) entfernt; JEDER Editor (Uploader wie Nicht-Uploader) durchlaeuft jetzt
     einheitlich BumpMediaRevisionForMetadataEdit; source_revision ist jetzt fuer ALLE Editoren Pflicht (400
     SOURCE_REVISION_REQUIRED bei Fehlen).
  3) backend/internal/repository/point_ledger_repository.go: neue Methode HasAward(idempotencyKey) (reine
     Existenzpruefung). backend/internal/services/point_service.go: neue Methode HasBeenCredited(cmd), die
     genau diesen Idempotency-Key berechnet und prueft. backend/internal/services/release_review_decision.go
     creditReleaseReviewContribution: prueft HasBeenCredited VOR CreditInTx und ueberspringt die Gutschrift
     komplett, wenn bereits einmal vergeben -- unabhaengig von EffectiveAt.
  4) backend/internal/handlers/release_review_handler_decide.go (neu, aus release_review_handler.go
     ausgelagert fuer die 450-Zeilen-Grenze): writeDecisionError in drei unterscheidbare Faelle aufgeteilt --
     (a) REVIEW_ALREADY_DECIDED = "Diese Prüfung wurde bereits von einer anderen Person abschließend
     entschieden." (echter Fremd-Entscheid, InsertDecision-Unique-Constraint-Race auf derselben Revision);
     (b) REVIEW_STALE_REVISION = "Diese Prüfung basiert auf einer veralteten Version. Bitte laden Sie die
     Prüfung neu." (Decide-Handler-Vorab-Check, Client-Revision stimmt nicht mit der aktuellen ueberein -- vorher
     Teil derselben "bereits geaendert ODER von anderer Person" Sammelmeldung); (c) REVIEW_CONFLICT =
     "Bei der Prüfungsentscheidung ist ein Konflikt aufgetreten. Bitte versuchen Sie es erneut." (sonstiger,
     seltener Konflikt, z.B. Credit-Slot-Race zwischen zwei Revisionen).
  Hinweis release_version_notes: dasselbe Code-Muster (unconditional Resubmit bei jedem Edit) existiert in
  BulkUpsertReleaseVersionNotes, ist dort aber KEIN Bug -- Notiz-Titel/Body SIND der geprüfte Inhalt, ein Edit
  ist inhaltlich gleichwertig zu einem Datei-Ersatz bei Medien. Fix bewusst nur auf release_version_media
  angewendet, nicht auf Notizen uebertragen.
verification: |
  - go build ./... (Backend-Container) -- sauber.
  - go test ./internal/handlers/... ./internal/services/... (Backend-Container, echtes Postgres via
    TEAM4S_PHASE107_TEST_DSN) -- alle PASS, inkl. zweier neuer End-to-End-Tests gegen echtes Postgres:
    TestReleaseReviewMetadataEditKeepsConfirmationFileReplaceReopensReview (Metadaten-Edit auf bestaetigtem
    Medium bleibt bestaetigt + verschwindet aus /release-reviews Open-Queue; Datei-Ersatz loest Re-Review aus;
    zweiter Confirm nach Re-Review gelingt; Mitwirkungs-Gutschrift wird exakt 1x vergeben) und
    TestReleaseReviewDecisionDistinguishesStaleRevisionFromForeignDecision (REVIEW_STALE_REVISION vs.
    REVIEW_ALREADY_DECIDED echt unterscheidbar).
  - go test ./internal/repository/... -- verbleibende Fehlschlaege sind NACHWEISLICH vorbestehend und
    unabhaengig von dieser Aenderung (per A/B-Vergleich gegen einen unveraenderten HEAD-Worktree reproduziert:
    TEAM4S_PHASE128_TEST_DSN fehlt, Keycloak-Netzwerk nicht erreichbar, "au.display_name"-Spalte fehlt in
    einer anderen Testdatei-Fixture, Permission-Cache-Action "release_version_media.reorder" fehlt -- alle
    betreffen Code, den diese Session nicht veraendert hat).
  - Backend neu gestartet (docker compose restart team4sv30-backend); GIN-Routen inkl.
    POST /api/v1/admin/fansubs/:id/release-reviews/:reviewId/decision sauber registriert; GET /health ->
    {"status":"ok"} (sowohl intern im Container auf :8092 als auch extern auf 127.0.0.1:18092).
  - Bestandsbereinigung (Punkt 4 im Auftrag) nach expliziter Nutzerfreigabe ausgefuehrt: 1 betroffene Zeile
    (release_version_media_id=1) auf review_state='confirmed' / decided_at='2026-08-30 00:53:50.125307+00'
    korrigiert (source_revision unveraendert 3). Per psql verifiziert: Zeile korrekt, Medium nicht mehr in
    der pending-Pruefliste (0 Treffer gegen die reale Query aus release_review_query_repository.go:390).
    Backups liegen vor unter .planning/debug/backups/ (CSV + voller SQL-Dump der Lifecycle-Tabelle vor der
    Aenderung).
files_changed:
  - backend/internal/handlers/admin_content_release_version_media_patch.go
  - backend/internal/handlers/admin_content_release_version_media_test.go
  - backend/internal/handlers/admin_content_release_version_media_patch_review_test.go (neu)
  - backend/internal/handlers/release_review_handler.go
  - backend/internal/handlers/release_review_handler_decide.go (neu, aus release_review_handler.go ausgelagert)
  - backend/internal/repository/release_review_lifecycle_revision_guard.go
  - backend/internal/repository/point_ledger_repository.go
  - backend/internal/services/point_service.go
  - backend/internal/services/release_review_decision.go
  - .planning/debug/backups/release-review-metadata-409-affected-rows-2026-10-13.csv (neu, Backup vor Bereinigung)
  - .planning/debug/backups/release_version_media_review_lifecycle-full-backup-2026-10-13.sql (neu, Backup vor Bereinigung)
