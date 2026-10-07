# Fachaufgabe 4: Prüfen & Freigeben — Rechte-Konsistenz je Review-Aktion

**Quelle:** 174-FOLLOWUPS.md F-17 → 175-CONTEXT.md D-02 #4, mit Schwerpunkt D-05 (Rechte-Konsistenz zuerst). Direkte Fortsetzung von BUG-174-02 (Dashboard kündigt Gruppenbild-Prüfung ohne Prüfrecht an) und BUG-174-04 (Leitung kann fremde Release-Bilder nicht speichern).
**Methode:** Für jede der vier Review-Flächen (Gruppenmedien, Release-Bilder, Release-Notizen, Beiträge/Vorschläge) wurde je EIN Datei:Zeile-Beleg für die Anzeige-Rechte-Aktion (Button/Dashboard-Hinweis) und EIN Beleg für die Durchsetzungs-Rechte-Aktion (Server-Handler beim Ausführen) gelesen und wörtlich verglichen. BUG-174-02/BUG-174-04 wurden gegen den aktuellen Code-Stand (nicht nur gegen 174-BUGS.md) nachgeprüft.

Spalten gemäß D-03: (a) UI-Fläche, (b)/(c) Frontend-API/Backend-Handler, (d) Rechte-Aktion Anzeige vs. Durchsetzung, (e) Datenhaltung, (f) beobachtbares Verhalten.

---

## Übersicht der vier Review-Flächen

| Review-Fläche | UI-Komponente | Entscheidungs-Endpunkt | Dashboard-Hinweis? |
|---|---|---|---|
| Gruppenmedien (Bilder/Galerie der Fansub-Gruppe) | `GroupMediaReviewSection.tsx` (`frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx`) | `PATCH /api/v1/admin/fansubs/:id/media/:mediaId/review` → `FansubMediaReviewHandler.PatchFansubMediaReview` | Ja — `attachPendingGroupMediaReviewAttention` |
| Release-Bilder (Screenshots/Typesetting/Fun-Outtake je Release-Version) | `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx` + `ReleaseReviewsSection.tsx` (Typ `image`) | `POST /api/v1/admin/fansubs/:id/reviews/:reviewId/decide` → `ReleaseReviewHandler.Decide` | Ja — `attachPendingReleaseReviewAttention` (ImageCount) |
| Release-Notizen (Release-Version-Notizen) | dieselbe Prüfseite/-liste, Typ `text` | derselbe `Decide`-Endpunkt, `ReviewKindText` | Ja — `attachPendingReleaseReviewAttention` (TextCount) |
| Beiträge/Vorschläge (Mitwirkungs-Vorschläge einer Gruppe) | `ContributionsReviewSection.tsx` (`frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx`), UI-Baustein geteilt mit `ReviewQueue.tsx` | `POST /api/v1/admin/fansubs/:id/contribution-proposals/:cid/confirm`\|`/reject` → `ContributionReviewHandler.ConfirmProposal`/`RejectProposal` | **Nein** — kein `attachPending*`-Pendant existiert für Beiträge (siehe (f)) |

Alle vier Flächen sind fachlich dieselbe Grundaufgabe ("eingereichter Inhalt wird von einer berechtigten Person bestätigt oder abgelehnt"), aber mit vier unabhängigen Backend-Pfaden (zwei generische `ReviewDecisionService`-Adapter für Release-Bilder/-Notizen, zwei eigenständige Legacy-Handler für Gruppenmedien und Beiträge). D-04: **Variante mit Duplikat-Rest** — Release-Bilder/-Notizen sind bereits auf einen gemeinsamen Resolver (`review_service.go`) konsolidiert; Gruppenmedien und Beiträge sind noch eigenständige, strukturell ähnliche Patch-Handler (Rechte-Prüfung → Status-Update → Audit-Log), die dieselbe Grundform dreimal unabhängig implementieren.

---

## (d) Rechte: Anzeige vs. Durchsetzung je Review-Aktion — mit Gegenprobe

### 1. Gruppenmedien-Review — BUG-174-02 Gegenprobe: **konsistent nach Fix: JA**

- **(d1) Anzeige:** `canReview = isPlatformAdmin || Boolean(capabilities?.can_review_group_media)` — `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx:172`. `can_review_group_media` wird vom Backend geliefert als `CanReviewGroupMedia: canEditGroup.Allowed` — `backend/internal/handlers/app_auth_capabilities.go:259`, wobei `canEditGroup` aus `CanForFansubGroup(..., permissions.ActionFansubGroupEdit, fansubID)` stammt (`app_auth_capabilities.go:56`).
- **(d1) Dashboard-Hinweis:** `attachPendingGroupMediaReviewAttention` prüft pro Kandidat `h.permissionSvc.CanForFansubGroup(ctx, actor, permissions.ActionFansubGroupEdit, item.FansubGroupID)` — `backend/internal/handlers/dashboard_me_handler.go:226-227`.
- **(d2) Durchsetzung:** `PatchFansubMediaReview` prüft für eine `review_status`-Änderung explizit `h.permissionSvc.CanForFansubGroup(ctx, actor, permissions.ActionFansubGroupEdit, fansubID)` und setzt `authorizationAction = permissions.ActionFansubGroupEdit` — `backend/internal/handlers/fansub_media_review_handler.go:382,397`.
- **Vergleich:** Anzeige (Capability-Feld + Dashboard) UND Durchsetzung verwenden identisch `ActionFansubGroupEdit`. **Konsistent.** Dies ist exakt der im Zuge von BUG-174-02 vorgenommene Fix (`143-09` nutzte vorher `ActionReviewImageDecide` für die Anzeige, siehe Codekommentar `dashboard_me_handler.go:206-209`); die Gegenprobe am aktuellen Code bestätigt: der Fix ist sowohl im Dashboard-Hinweis als auch in der Medien-Review-Sektion selbst wirksam — beide Anzeige-Stellen wurden auf dieselbe Aktion umgestellt, nicht nur eine.

### 2. Release-Bilder-Review — verwandtes Muster zu BUG-174-04 (Edit-Pfad), **konsistent: JA**

- **(d1) Anzeige (Listen-/Button-Ebene, "kann ich dieses Bild bearbeiten"):** `items[i].CanUpdate` wird über `evaluateReleaseVersionMediaRelationMutation(..., permissions.ActionReleaseVersionMediaUpdate, ...)` berechnet — `backend/internal/handlers/admin_content_release_version_media_permissions.go:228-231` (Batch-Pfad) bzw. `:147-150` (Einzel-Pfad), beide mit `updateResult` aus `permissions.ActionReleaseVersionMediaUpdate`.
- **(d2) Durchsetzung:** `PatchReleaseVersionMedia` prüft `h.permissionSvc.CanForReleaseVersionMedia(ctx, actor, permissions.ActionReleaseVersionMediaUpdate, relationID)` — `backend/internal/handlers/admin_content_release_version_media_patch.go:79`.
- **Vergleich:** identische Aktion `ActionReleaseVersionMediaUpdate` auf beiden Seiten. **Konsistent.**
- **BUG-174-04-Gegenprobe (Wiedereinreichung bei Fremd-Edit):** Die Durchsetzung UND die Wiedereinreichungs-Entscheidung hängen beide an derselben Helper-Funktion `isReleaseVersionMediaUploader(relationMeta.UploadedByUserID, identity.UserID)` — aufgerufen in `admin_content_release_version_media_patch.go:208` (Patch) UND `admin_content_release_version_media_replace.go:432` (Datei-Ersetzen). Da beide Aufrufer dieselbe Funktion nutzen, kann die Wiedereinreichungs-Logik nicht zwischen Patch- und Replace-Pfad divergieren. **Konsistent nach Fix: JA** — bestätigt am aktuellen Code, nicht nur aus `174-BUGS.md` übernommen.
- **Entscheidungs-Endpunkt (Freigeben/Ablehnen eines eingereichten Release-Bilds):** Anzeige = Seite lädt nur, wenn `ReleaseReviewHandler.Detail` erfolgreich lädt, was intern `authorizedKinds(c, actor, groupID, "")` mit `permissions.ActionReviewImageDecide` prüft (`release_review_handler_authz.go:15-26`); Durchsetzung = `Decide` ruft **dieselbe** `authorizedKinds`-Funktion vor jeder Entscheidung auf (`release_review_handler.go:185`). Da Anzeige-Laden und Durchsetzung dieselbe Go-Funktion aufrufen, ist eine Divergenz zwischen beiden strukturell ausgeschlossen (nicht nur zufällig gleich).

### 3. Release-Notizen-Review — bislang nicht in Phase 174 geprüft, **konsistent: JA**

- **(d1)/(d2):** Identischer Mechanismus wie Release-Bilder-Review (derselbe `ReleaseReviewHandler`, `ReviewKindText` statt `ReviewKindImage`, `permissions.ActionReviewTextDecide` statt `ActionReviewImageDecide` in derselben `authorizedKinds`-Tabelle, `release_review_handler_authz.go:25`). Für den Dashboard-Hinweis: `attachPendingReleaseReviewAttention` nullt `item.TextCount`, wenn `!authorization[permissions.ActionReviewTextDecide].Allowed` — `backend/internal/handlers/dashboard_me_handler.go:275-276`, mit derselben `ResolveReviewGroupAuthorization`-Quelle wie die Queue selbst (`permissions/review_group_authorization.go:35`).
- **Zusätzliches Capability-Feld:** `CanReviewText: canReviewText.Allowed` mit `canReviewText` aus `ActionReviewTextDecide` — `app_auth_capabilities.go:171,260`. Konsistent mit (d2).
- **Eigenständiger Edit-Rechte-Abgleich:** Die Review-Detailseite zeigt zusätzlich `detail.can_edit_release`, berechnet in `ReleaseReviewHandler.Detail` mit `editAction := permissions.ActionReleaseVersionNotesWrite` für `ReviewKindText` (sonst `ActionReleaseVersionMediaUpdate`) — `release_review_handler.go:126-137`. Dies ist eine ANDERE Aktion als die Entscheidungs-Aktion (`ActionReviewTextDecide`/`ActionReviewImageDecide`) und bewusst getrennt: "kann ich den zugrundeliegenden Release-Inhalt bearbeiten" vs. "kann ich DIESE Prüfung entscheiden" sind zwei fachlich unterschiedliche Rechte — **legitim getrennt**, keine Verwechslungsgefahr, da beide Felder unter unterschiedlichen Namen (`can_edit_release` vs. implizite Decide-Buttons) im UI erscheinen.

### 4. Beiträge/Vorschläge-Review — bislang nicht in Phase 174 geprüft, **konsistent: JA**

- **(d1) Anzeige:** Die gesamte Sektion ist gated über `if (!capabilities.can_manage_members) return null` — `frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.tsx:49`. `can_manage_members` kommt von `CanManageMembers: canManageMembers.Allowed` mit `canManageMembers` aus `ActionFansubGroupMembersManage` — `app_auth_capabilities.go:86,249`.
- **(d2) Durchsetzung:** `ConfirmProposal` UND `RejectProposal` prüfen beide identisch `h.permissionSvc.CanForFansubGroup(ctx, actor, permissions.ActionFansubGroupMembersManage, fansubID)` — `backend/internal/handlers/contribution_review_handler.go:139` (Confirm), `:199` (Reject). `ListProposals` (lädt die Warteschlange selbst) prüft ebenfalls dieselbe Aktion (`:91`).
- **Vergleich:** Anzeige-Gate, Listen-Endpunkt und beide Entscheidungs-Endpunkte verwenden durchgehend `ActionFansubGroupMembersManage`. **Konsistent — keine Abweichung.**

---

## Zusammenfassung (d): keine neue Anzeige/Durchsetzung-Abweichung gefunden

Von 4 untersuchten Review-Flächen × (Anzeige-Gate + Dashboard-Hinweis + Entscheidungs-Endpunkt) ergeben sich **9 geprüfte Einzel-Rechte-Vergleiche** (Gruppenmedien: Anzeige+Dashboard+Durchsetzung = 3; Release-Bilder: Anzeige+Dashboard+Durchsetzung = 3; Release-Notizen: Anzeige+Dashboard+Durchsetzung = 3; Beiträge: Anzeige+Durchsetzung = 2, kein Dashboard-Hinweis vorhanden — insgesamt 11 Vergleichspunkte, siehe Skript). **0 Abweichungen.** BUG-174-02 und BUG-174-04 sind beide am aktuellen Code bestätigt behoben; das in BUG-174-02 gefundene Muster (Anzeige nutzt eine andere aktionale Konstante als die Durchsetzung) liegt bei KEINER der vier Flächen heute noch vor.

**Einordnung:** Dies ist ein Negativbefund, kein Freibrief — er zeigt, dass die bereits in Phase 174 behobenen Fälle korrekt und vollständig (nicht nur punktuell) gefixt wurden, und dass dasselbe Muster bei den bisher ungeprüften Flächen (Release-Notizen, Beiträge) nicht eigenständig neu aufgetreten ist.

---

## (e) Datenhaltung — vier getrennte review_status-Speicherorte

| Review-Fläche | Tabelle/Spalte | Werte |
|---|---|---|
| Gruppenmedien | `media_assets.review_status_id` → FK auf gemeinsame `review_statuses`-Lookup-Tabelle (Migration 0097) | `in_review`/`approved`/`rejected`/`archived`/`removed` (DB-Codes), API-seitig `in_pruefung`/`freigegeben`/`abgelehnt`/`archiviert`/`entfernt` (`fansub_media_review_handler.go:28-35`, Mapping `media_repository.go:84`) |
| Release-Bilder | `release_version_media_review_lifecycle.review_state` (Migration 0135, eigene Lifecycle-Tabelle, NICHT die gemeinsame `review_statuses`-Tabelle) | `pending`/`confirmed`/`rejected`/`tombstoned` |
| Release-Notizen | `release_version_note_review_lifecycle.review_state` (Migration 0135, strukturell identisch zur Bilder-Lifecycle-Tabelle) | `pending`/`confirmed`/`rejected`/`tombstoned` |
| Beiträge | `anime_contributions.status` (Migration 0086, Legacy-Enum-Spalte) | `draft`/`proposed`/`confirmed`/`disputed`/`hidden` |

**Nebenbefund (Datenredundanz, kein Rechte-Befund):** `anime_contributions` besitzt seit Migration 0097 ZUSÄTZLICH eine `review_status_id`-Spalte (FK auf dieselbe `review_statuses`-Lookup-Tabelle wie `media_assets`). `ContributionReviewRepository.Confirm`/`Reject` (`backend/internal/repository/anime_contributions_proposal_repository.go:207-247`) aktualisieren beim Bestätigen/Ablehnen ausschließlich die Legacy-Spalte `status` — `review_status_id` wird nirgends geschrieben oder gelesen außer einem reinen Kopier-Befehl bei einer unabhängigen Sichtbarkeits-Aktualisierung (`contributions_me_handler.go:365,389`, kopiert den vorhandenen Wert unverändert weiter). Die Spalte ist damit faktisch tot/ungenutzt für den Review-Fluss. Kein Rechte-Risiko (keine Stelle liest sie für eine Zugriffsentscheidung), aber ein Beleg für denselben "zwei parallele Status-Repräsentationen" -Charakter, den 175-CONTEXT.md als Phasenmotivation nennt — vorgemerkt für `175-ROADMAP-PROPOSAL.md`, nicht in dieser Phase behoben (D-01).

---

## (f) Beobachtbares Verhalten — Abweichungen zwischen den vier Flächen

| Aspekt | Gruppenmedien | Release-Bilder/-Notizen | Beiträge |
|---|---|---|---|
| **Bulk-Aktion** | Ja — `GroupMediaReviewBulkActionBar.tsx` erlaubt Mehrfachauswahl + "Freigeben"/"Ablehnen" für die gesamte Selektion (`handleBulkReview`, feuert pro Element denselben PATCH-Endpunkt) | **Nein** — nur Einzel-Entscheidung über die Detailseite, kein Bulk-Endpunkt in `ReleaseReviewHandler` | **Nein** — `ConfirmProposal`/`RejectProposal` sind Einzel-Endpunkte ohne Bulk-Variante |
| **Dashboard-Hinweis** | Ja (`attachPendingGroupMediaReviewAttention`) | Ja (`attachPendingReleaseReviewAttention`, getrennt nach Text/Bild-Zähler) | **Nein** — kein `attachPending*`-Äquivalent für offene Beitrags-Vorschläge existiert; ein Fansub-Lead mit offenen Vorschlägen bekommt dafür KEINEN Dashboard-Hinweis, nur beim direkten Öffnen der Fansub-Edit-Seite sichtbar. Beobachtung, kein Rechte-Fehler — vorgemerkt für `175-ROADMAP-PROPOSAL.md` als mögliche Lücke. |
| **Ablehnungsgrund** | Kein strukturierter Ablehnungsgrund (nur Statuswechsel) | Strukturiert: `rejection_category` (5 feste Werte) + `rejection_reason` (10-1000 Zeichen Pflichttext), serverseitig validiert (`validateReleaseReviewDecisionRequest`, `release_review_handler.go:390-421`) | Freitext-optional (`review_note`, `rejectRequest.ReviewNote`, kein Pflichtfeld) |
| **Konflikt-Schutz** | Kein Revisions-Check | `expected_revision`-Pflichtfeld + 409-Konflikt bei Abweichung (`release_review_handler.go:209-215`) | Kein Revisions-Check (`WHERE id = $1 AND status = 'proposed'` — betroffene-Zeilen-Zählung als impliziter Schutz, aber kein expliziter Revisions-Vergleich) |

**D-04-Einordnung:** Bulk vs. Einzel und Ablehnungsgrund-Strenge sind **legitime Varianten** (unterschiedliche Reife/Anforderung je Inhaltstyp, kein Rechte-Risiko). Der fehlende Dashboard-Hinweis für Beiträge ist eine **Vollständigkeits-Lücke**, kein Duplikat-Befund.

---

## Zusammenfassung (reproduzierbar per `scripts/count-04-pruefen-freigeben.sh`)

- **Review-Flächen: 4** (Gruppenmedien, Release-Bilder, Release-Notizen, Beiträge)
- **Geprüfte Rechte-Vergleichspunkte (Anzeige vs. Durchsetzung): 11**
- **Gefundene Abweichungen: 0** (BUG-174-02/BUG-174-04 bestätigt behoben, kein neues Muster an den bisher ungeprüften Flächen)
- **review_status-Speicherorte: 4** (`media_assets.review_status_id`, `release_version_media_review_lifecycle.review_state`, `release_version_note_review_lifecycle.review_state`, `anime_contributions.status`)
- **Flächen mit Dashboard-Hinweis: 3 von 4** (Beiträge fehlt)
- **Flächen mit Bulk-Aktion: 1 von 4** (nur Gruppenmedien)
