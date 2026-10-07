# Fachaufgabe 12: Benachrichtigung/Hinweise — Inventur

**Quelle:** 175-CONTEXT.md D-02 #12, mit Schwerpunkt D-05. Direkte Fortsetzung von BUG-174-02 (Dashboard-Attention-Rechte-Fehlabgleich, Anzeige nutzte `review.image.decide`, Durchsetzung verlangte `fansub_group.edit`). Diese Fachaufgabe prüft, ob die analogen `attachPending*`-Funktionen dasselbe Muster NICHT behoben haben, und erfasst zusätzlich Toast- und Mail-Benachrichtigungswege.
**Methode:** Alle `attachPending*Attention`-Funktionen in `dashboard_me_handler.go` vollständig gelesen (nicht nur `174-BUGS.md` vertraut) und gegen die zugehörigen Durchsetzungs-Handler verglichen. Toast-Infrastruktur per `grep -rln "useToast\|ToastProvider\|pushToast\|addToast"` (0 Treffer) sowie Breitensuche nach dem tatsächlich genutzten Inline-Muster (`errorBox`/`successBox`-CSS-Klassen). Mail-Versand per `grep -rn "MailMessage{"` über `backend/internal/` (1 Treffer).

Spalten gemäß D-03: (a) UI-Fläche, (b) Frontend-API, (c) Backend-Endpunkt/-Funktion, (d) Anzeige- vs. Durchsetzungs-Recht (Schwerpunkt), (e) Datenhaltung, (f) beobachtbares Verhalten.

---

## Teil 1: Dashboard-Attention — 4 `attachPending*`-Funktionen, 0 neue Anzeige/Durchsetzung-Abweichungen

### Übersicht

| # | Funktion | Fundstelle | Rechte-geprüft? | Analoge Durchsetzung | Konsistent? |
|---|---|---|---|---|---|
| 1 | `attachPendingClaimAttention` | `backend/internal/handlers/dashboard_me_handler.go:156-201` | Ja — `ActionFansubGroupHistoricalMembersLink`, pro Fansub-Gruppe gecacht (Zeile 180-187) | `MemberClaimsHandler.ListClaims/VerifyClaim/RejectClaim/ActivateClaim` — alle über `requireFansubPermission(c, permissions.ActionFansubGroupHistoricalMembersLink, ...)` (`member_claims_handler.go:118,142,167,192`) | **Ja** |
| 2 | `attachPendingGroupMediaReviewAttention` | `dashboard_me_handler.go:212-241` | Ja — `ActionFansubGroupEdit` (Zeile 226-227) | `FansubMediaReviewHandler.PatchFansubMediaReview` prüft identisch `ActionFansubGroupEdit` (`fansub_media_review_handler.go:382,397`) | **Ja — BUG-174-02-Fix am aktuellen Code bestätigt** |
| 3 | `attachPendingReleaseReviewAttention` | `dashboard_me_handler.go:249-283` | Ja — `ResolveReviewGroupAuthorization` (Zeile 265), nullt `ImageCount`/`TextCount` getrennt nach `ActionReviewImageDecide`/`ActionReviewTextDecide` | `ReleaseReviewHandler.Decide` ruft **dieselbe** `ResolveReviewGroupAuthorization`-Kette (über `authorizedKinds`, `release_review_handler_authz.go:15-26`) vor jeder Entscheidung (`release_review_handler.go:185`) — strukturell identisch, da eine Funktion beide Seiten bedient | **Ja** |
| 4 | `attachPendingOwnNoteRevisionAttention` | `dashboard_me_handler.go:293-313` | **Absichtlich KEIN Rechte-Check** — Kommentar Zeile 285-292: "permission-check-free — it is the actor's own data, gated only by the verified memberID" | n/a — zeigt nur die EIGENEN abgelehnten Notizen des Actors, keine Fremddaten, daher kein Rechte-Risiko möglich | **Ja (strukturell, kein Rechte-Pfad vorhanden)** |

**Ergebnis: 0 von 4 Attention-Funktionen zeigen eine Anzeige/Durchsetzung-Abweichung.** Das BUG-174-02-Muster (Anzeige nutzt eine andere Action-Konstante als die Durchsetzung) ist bei KEINER der heute existierenden vier Funktionen erneut aufgetreten — bestätigt unabhängig von `data/04-pruefen-freigeben.md` (dort bereits für #2/#3 belegt; hier zusätzlich #1 und das neue #4 aus Phase 143 nachgeprüft).

**Beiträge/Vorschläge — weiterhin KEINE Attention-Funktion (Gap, kein Rechte-Fehler):** Wie bereits in `data/04-pruefen-freigeben.md` dokumentiert, existiert für offene Beitrags-Vorschläge kein `attachPending*`-Äquivalent. Da nichts angezeigt wird, kann hier auch kein Anzeige/Durchsetzung-Mismatch entstehen — dies ist eine Vollständigkeits-Lücke (Dashboard informiert nicht über wartende Beitrags-Entscheidungen), kein BUG-174-02-Muster. Für `175-ROADMAP-PROPOSAL.md` vorgemerkt.

### (a) UI-Fläche
`AttentionSection.tsx` (`frontend/src/app/me/dashboard/components/AttentionSection.tsx:36-...`) ist die EINZIGE UI-Fläche für alle vier Attention-Lanes — rendert `pendingGroupMediaReviews` (Zeile 60), `pendingReleaseReviews` (Zeile 86), `pendingClaims` (Zeile 116), `pendingOwnNoteRevisions` (Zeile 139) als vier separate Abschnitte innerhalb EINER Komponente. Eingebunden von `frontend/src/app/me/dashboard/page.tsx:144-157`. Kein Duplikat — ein zentraler Konsument für alle vier Backend-Funktionen (korrektes Muster, kein Befund).

### (b)/(c) Frontend-API und Backend-Endpunkt
- `getOwnDashboard()` — `frontend/src/lib/api/projects.ts:22` → `GET /api/v1/me/dashboard` → `DashboardMeHandler.GetOwnDashboard` — `dashboard_me_handler.go:94-153`, Route registriert `backend/cmd/server/main.go:631`. EIN Endpunkt liefert alle vier Attention-Arrays in einer Antwort (kein Pro-Lane-Fächer, bereits korrekt gebündelt).
- Datenquellen je Funktion: `claimsRepo.ListPendingClaimAttentionCandidates` (`backend/internal/repository/member_claims_repository.go:82`), `reviewQueryRepo.PendingGroupMediaReviewAttention` (`backend/internal/repository/release_review_query_repository.go:321`), `reviewQueryRepo.PendingReleaseReviewAttention` (`release_review_query_repository.go:362`), `reviewQueryRepo.PendingOwnNoteRevisionAttention` (`backend/internal/repository/release_review_query_own_note_revisions.go:39`).

### (e) Datenhaltung
Keine eigene Attention-Tabelle — jede Funktion liest aus den bereits in `data/04-*.md`/`data/10-*.md` dokumentierten Fach-Tabellen (`fansub_group_member_historical_links`/Claims-Entität, `media_assets`, `release_version_media_review_lifecycle`, `release_version_note_review_lifecycle`) und filtert zur Anzeigezeit nach Rechten — keine materialisierte "Benachrichtigungs"-Tabelle, kein Lesen/Schreiben eines separaten Notification-Stores.

### (f) Beobachtbares Verhalten
Alle vier Lanes werden bei jedem `/me/dashboard`-Aufruf frisch berechnet (kein Caching, kein Dismiss-Zustand, kein "als gelesen markieren") — ein Hinweis verschwindet ausschließlich, wenn die zugrundeliegende Bedingung selbst nicht mehr zutrifft (z. B. Claim entschieden, Medium geprüft). Dies ist für alle vier Lanes identisch (legitime Einheitlichkeit, kein Befund).

---

## Teil 2: Toast-Benachrichtigungen — kein zentrales System, 48 Datei-lokale Ad-hoc-Implementierungen

### (a)/(b) UI-Fläche und Infrastruktur-Suche

- `grep -rln "useToast\|ToastProvider\|pushToast\|addToast" frontend/src/` → **0 Treffer außerhalb von Tests.** Es existiert KEIN zentraler Toast-Hook/-Provider/-Container in `@/components/ui` (vollständige Dateiliste von `frontend/src/components/ui/` geprüft — kein `Toast.tsx`, kein `Notification.tsx`).
- Eine einzige Komponente trägt "Toast" im Namen: `MessageToast.tsx` (`frontend/src/app/admin/anime/components/MessageToast.tsx:20-39`) — **aber auch diese ist totes Produktionscode:** `grep -rn "MessageToast" frontend/src/` findet AUSSCHLIESSLICH die Datei selbst, keinen einzigen Importeur. Eine dritte vollständig ausgearbeitete, aber nie verdrahtete Komponente (zusätzlich zu `segmenteTabUtils.ts` und `ReleaseVersionMediaGallery.tsx` aus `data/11-*.md`) — bestätigt das wiederkehrende Muster "Paralleldesign, nie produktiv verdrahtet".
- Tatsächlich genutztes Muster: **48 Dateien** (`grep -rl "styles\.errorBox\|styles\.successBox" frontend/src/` ohne Tests) implementieren Erfolgs-/Fehlermeldungen jeweils selbst über eine lokale `errorBox`/`successBox`-CSS-Klasse und lokalen `useState`-Fehler-/Erfolgstext — u. a. `AdminAnimeOverviewClient.tsx:185-195`, `AdminAnimeEditPageClient.tsx:114-115`, `admin/fansubs/page.tsx`, `admin/episodes/page.tsx`, `me/profile/page.tsx` und 43 weitere (vollständige Liste reproduzierbar per Skript).

### (c) Backend
n/a — Toasts sind ein reines Frontend-Konzept, keine Backend-Beteiligung (im Gegensatz zu Dashboard-Attention und Mail).

### (d) Rechte-Bezug
n/a — Toasts zeigen das Ergebnis einer bereits durchgeführten (oder fehlgeschlagenen) Aktion, kein eigener Anzeige/Durchsetzung-Rechte-Pfad.

### (f) Beobachtbares Verhalten — Dismiss/Auto-Hide weicht zwischen den 48 Implementierungen ab

- **Manuelles Schließen (Mehrheit):** `grep -c "setTimeout" frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx frontend/src/app/admin/anime/components/AnimeEditPage/AdminAnimeEditPageClient.tsx` → **0 Treffer in beiden** — diese Meldungen bleiben stehen, bis die Seite neu geladen/verlassen wird oder (falls vorhanden) ein eigener Schließen-Button geklickt wird.
- **Auto-Dismiss nach 4000ms:** `frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentPreviewImageHandlers.ts:16,77` — benannte Konstante `SUCCESS_MESSAGE_TIMEOUT_MS = 4000`.
- **Auto-Dismiss nach 1800ms:** `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx:230` — hartkodierter Wert `window.setTimeout(() => setSuccessMessage(null), 1800)`, keine geteilte Konstante mit der ersten Implementierung.
- **Einordnung:** Von den 48 betroffenen Dateien nutzen mindestens 2 einen Auto-Dismiss-Timer (mit UNTERSCHIEDLICHER Dauer: 4000ms vs. 1800ms, keine gemeinsame Konstante), die übrigen (mindestens die beiden stichprobenhaft geprüften Anime-Admin-Dateien) verlassen sich ausschließlich auf manuelles Wegklicken/Navigieren. Dies ist dieselbe Eingabe-Klasse ("Erfolgsmeldung nach einer Aktion") mit beobachtbar unterschiedlichem Verhalten je Einstieg — exakt D-03(f)'s Zielkriterium. **D-04-Klassifikation: Variante mit hohem Konsolidierungspotenzial** — kein Rechte-Risiko wie bei BUG-174-02, aber eine der am breitesten gestreuten UI-Inkonsistenzen dieser gesamten Inventur-Phase (48 Fundstellen).

---

## Teil 3: Mail-Benachrichtigungen — genau 1 Mail-Typ, bereits gehärtet (Phase 135), kein älterer ungehärteter Typ gefunden

### (a)/(b)/(c) Vollständige Suche

- `grep -rn "MailMessage{" backend/internal/` → **genau 1 Treffer**, zusätzliche Suche nach alternativen Versandmustern (`SendMail`, `sendEmail`, `NotifyByEmail`, `EmailService`) → **0 weitere Treffer.** Es existiert im gesamten Backend NUR EIN Mail-Typ: die Fansub-Gruppen-Einladungsmail.
- **UI-Fläche:** Mitglieder-Einladen-Dialog im Fansub-Editor (siehe `data/05-mitglieder-einladen-claims.md` für die vollständige Einstiegs-Dokumentation).
- **Backend:** `AppAuthHandler`-Einladungs-Handler, Mail-Versand-Block `backend/internal/handlers/app_auth_invitations.go:140-212` — ruft `h.mailer.Send(mailCtx, services.MailMessage{...})` (Zeile 190-195), `Mailer`-Interface/`SMTPMailer` in `backend/internal/services/mailer.go:27-55`.

### (d) Rechte-Bezug
n/a für den Mailinhalt selbst; das Erzeugen der zugrundeliegenden Einladung ist bereits rechte-geprüft (`ActionFansubGroupInvitationsCreate`, Audit-Eintrag bei Erfolg UND bei Mail-Fehlschlag — Zeile 213-227).

### (e) Datenhaltung
`fansub_group_invitations`-Tabelle (Token, Ablaufdatum, E-Mail) — der Mailinhalt wird NICHT persistiert, nur zur Versandzeit aus Einladungs-/Gruppendaten zusammengebaut.

### (f) Beobachtbares Verhalten — Härtungsstandard bereits einheitlich, kein zweiter unhärterer Typ

- **HTML-Eskaping:** `html.EscapeString(inviterName)`, `html.EscapeString(groupName)` vor Einbettung in `bodyHTML` (`app_auth_invitations.go:172-179`) — verhindert HTML-Injection über Nutzer-/Gruppennamen.
- **CRLF-Header-Injection-Schutz:** `containsCRLF(to)`-Prüfung + `mail.ParseAddress`-Validierung in `MailerConfig.Send` (`mailer.go:63-70`, WR-02-Kommentar).
- **Fail-closed bei Versandfehler:** Einladung wird bei `mailErr != nil` sofort stornieren (`invitationRepo.Cancel`, Zeile 191-193) und ein Audit-Eintrag mit Outcome `"error"` geschrieben (Zeile 194-206) — kein stiller, unvollständiger Zustand (kein "Einladung besteht, aber Mail kam nie an").
- **Kein Token im Audit-Log** (D-11, Kommentar Zeile 205).
- **Ergebnis:** Da nur EIN Mail-Typ im gesamten Backend existiert und dieser bereits in Phase 135 gehärtet wurde (wie 175-CONTEXT.md D-08 vorab bekannt war), gibt es **keinen** "älteren, nicht gehärteten Mail-Typ" zu finden — dies ist ein expliziter Negativbefund (keine Lücke übersehen, weil es schlicht keine zweite Mail-Implementierung gibt, die hätte abweichen können).

---

## Zusammenfassung (reproduzierbar per `scripts/count-12-benachrichtigung-hinweise.sh`)

- **Untersuchte Attention-Funktionen: 4** (`attachPendingClaimAttention`, `attachPendingGroupMediaReviewAttention`, `attachPendingReleaseReviewAttention`, `attachPendingOwnNoteRevisionAttention`)
- **Gefundene Anzeige/Durchsetzung-Abweichungen (Dashboard): 0** (BUG-174-02 bestätigt behoben, kein neues Vorkommen bei den drei weiteren rechte-geprüften Funktionen; die vierte ist strukturell rechte-check-frei, da reine Eigendaten)
- **Fehlende Attention-Lane (Vollständigkeits-Lücke, kein Rechte-Fehler): 1** (Beiträge/Vorschläge — bereits aus `data/04-*.md` bekannt, hier bestätigt unverändert)
- **Zentrale Toast-Infrastruktur gefunden: 0** — `grep`-Nachweis für `useToast`/`ToastProvider`/`pushToast`/`addToast`: 0 Treffer
- **Datei-lokale Ad-hoc-Erfolg/Fehler-Implementierungen (`errorBox`/`successBox`-Muster): 48**
- **Tote, nie verdrahtete "Toast"-Komponente: 1** (`MessageToast.tsx` — drittes Beispiel für das Paralleldesign-Muster aus `data/11-*.md`)
- **Beobachtete Auto-Dismiss-Varianten: 2 unterschiedliche Timer-Werte** (4000ms benannte Konstante, 1800ms hartkodiert) **+ mindestens 2 stichprobenhaft geprüfte Implementierungen ganz ohne Auto-Dismiss**
- **Mail-Typen im Backend: 1** (Fansub-Gruppen-Einladung, bereits Phase-135-gehärtet)
- **Ältere, nicht gehärtete Mail-Typen gefunden: 0** (Negativbefund — es existiert kein zweiter Mail-Pfad)
