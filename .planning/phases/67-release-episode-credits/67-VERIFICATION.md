---
phase: 67-release-episode-credits
status: passed
verified: 2026-06-03
method: live-browser-uat + api + db
requirements: [P67-SC1, P67-SC2]
---

# Phase 67 — Verification (Release- und Episode-Credits)

**Verdict: PASSED** — live im Browser (Preview auf Port 3000, eingeloggt als Leader `phase43-member` / Gruppe 88 „AnimeOwnage"), via API und gegen die DB verifiziert.

## Umgebung
- Backend + Frontend neu gebaut (`docker compose build`) und deployed; Migration **0091** auf der Live-DB angewendet und verifiziert (Spalte `release_version_id`, vierspaltiger `UNIQUE NULLS NOT DISTINCT`, FK `ON DELETE SET NULL`, Index).
- Hinweis: Frontend-Dev-Server auf Port 3000 (gültige Keycloak-redirect_uri-Whitelist). Docker-Frontend (3002) für die UAT-Session bewusst gestoppt, um Keycloak-Session-Konflikte zu vermeiden.

## Ergebnisse je Erfolgskriterium

### P67-SC1 — optionale Verknüpfung an release_version_id + Konsistenz (PASSED)
- **Leader-Dropdown** (`/admin/fansubs/88/edit` → Anime-Beiträge → Bearbeiten): Feld „RELEASE-VERSION (OPTIONAL)" mit Leeroption „— anime-weit lassen —" und genau **2 gruppen-gefilterten Optionen** „Episode 1 · v1", „Episode 2 · v1" (= `release_version_groups` für Gruppe 88 @ Naruto), sortiert Episode→Version. ✓
- **Schreibpfad/Persistenz**: Nach Setzen von „Episode 1 · v1" und Speichern entstand ein **separater versions-spezifischer Eintrag** (DB: id 10, member 12, `release_version_id=41`), während der **anime-weite Eintrag erhalten blieb** (id 6, rv NULL). Beweist vierspaltigen UNIQUE `NULLS NOT DISTINCT` + ON-CONFLICT ohne Overwrite (**Pitfall 1 gelöst**). ✓
- **D-03 (Konsistenz, live)**: `POST /api/v1/admin/fansubs/88/anime/3/contributions` mit gruppen-fremder `release_version_id=43` → **HTTP 422**, Meldung „Diese Gruppe war an der gewählten Release-Version nicht beteiligt." (korrekte Umlaute). In Leader- und Member-Pfad durch Tests abgedeckt. ✓

### P67-SC2 — Anime-Seite zeigt Aufschlüsselung nach Release-Version (PASSED)
- **Backend-Query** (`GET /api/v1/anime/3/contributions`): pro Gruppe `contributors` (anime-weit, Ebene 1) UND `version_breakdown` mit `{release_version_id:41, episode_number:"1", version:"v1", contributors:[…]}` (Ebene 2). Member erscheint nicht doppelt innerhalb Ebene 1 (Filter `release_version_id IS NULL` → **Pitfall 2 gelöst**); Public-Filter (`is_public_on_anime_page` + member `visibility=public`) greifen. ✓
- **Frontend** (`/anime/3`): „Allgemein an der Serie beteiligt:" zuerst, darunter aufklappbarer Trigger „Nach Release-Version" (Progressive Disclosure, `aria-expanded` toggelt). Aufgeklappt: „Episode 1 · v1" mit Mitwirkendem „Phase Admin" und Rollen-Chip „Übersetzung". ✓

## Automatisierte Gates (begleitend)
- `go build ./...`, `go vet`, `npm run typecheck` grün; Migrations-Contract-Test (Phase67), Repo-/Handler-Tests (`ReleaseVersion`, `PublicAnimeContributions`, `CreateProposal`), Komponententest `GroupContributionBlock` grün.

## Offene/Folge-Punkte (nicht blockierend)
- **Member-Vorschlags-UI (D-08 Frontend)**: Das Member-Vorschlagsformular existiert noch nicht (`me/contributions/page.tsx` listet nur). Backend-Annahmepfad inkl. D-03 ist in 67-05 gehärtet; das gruppen-gefilterte Dropdown für Member folgt als Phase-65-Restscope, sobald das Formular existiert.
- **Concurrency**: Phase 67 lief auf `main` parallel zu einer anderen Session (Phase 66/68). Die 67-05-GREEN-Implementierung wurde dabei in deren `fix(phase65)`-Commit mit eingesammelt; funktional vollständig in HEAD (siehe 67-05-SUMMARY).
- Test-Datensatz: eine versions-spezifische Naruto-Contribution (id 10) wurde während des UAT angelegt (reine Testdaten).

**Sign-off:** 2026-06-03 — alle Erfolgskriterien live erfüllt.
