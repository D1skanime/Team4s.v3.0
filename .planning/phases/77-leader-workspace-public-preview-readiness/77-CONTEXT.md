# Phase 77: Leader Workspace – Public Preview & Readiness - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Der kanonische Leader/Admin-Workspace `/admin/fansubs/[id]/edit` wird um drei
Dinge erweitert, **capability-gated** und **ohne zweiten Workspace**:

1. **Public-Preview** der öffentlichen Fansub-Seite — damit Leader nicht „blind"
   pflegen.
2. **Public-Readiness-Check** — eine Checkliste des Pflegezustands
   (Logo/Banner/Kurzbeschreibung/Story vorhanden, Mitglieder/Mitwirkende geprüft,
   Medien kategorisiert, offene Claims/Contributions, Vorschau verfügbar).
3. **Pflege von Story-/Projekt-/Release-Kontext** im Workspace, schreibend in die
   **korrekten Owner-Tabellen** — über bestehende Seams, nicht als Parallelmodell.

**Explizit NICHT in Phase 77:**
- Keine Review-/Auflösungs-Aktionen für Claims/Contributions/Medien → **Phase 78**.
  Phase 77 zeigt offene Posten nur als read-only Zähler mit Sprungmarke.
- Keine zweite Medien-/Claim-/Contribution-Verwaltung; alles über bestehende
  Seams/Contracts (Lock A/H/K).
- Keine Leader-Review-Logik in `/admin/my-groups/[id]` (Lock F).
- Kein neuer Publish-/Sichtbarkeits-Toggle (Readiness ist Leitfaden, kein Gate —
  siehe D-05).
- Keine neuen Kontext-Editierfelder über das hinaus, was die Owner-Tabellen
  bereits editierbar machen (D-07).

**Abhängigkeit:** Depends on Phase 72 (Projektionen/Status-Fundament). Phase 73
liefert die öffentlichen Section-Komponenten, die Phase 77 als Inline-Preview
wiederverwendet — Phase 77 ist deren erster Admin-seitiger Konsument.

</domain>

<decisions>
## Implementation Decisions

### Public-Preview
- **D-01:** **Inline-Rendering der Phase-73-Section-Komponenten** (read-only)
  direkt im Workspace. KEIN `<iframe>` der echten Seite, KEIN reiner
  „Vorschau öffnen"-Link in neuen Browser-Tab. Begründung: kein Kontextwechsel,
  konsistente In-Workspace-Vorschau, Reuse statt Duplizierung. Koppelt bewusst
  an die in Phase 73 gebauten Sektionen.
- **D-02:** Die Preview zeigt die **exakte Besucher-Sicht** — nur öffentlich +
  freigegebene Inhalte gemäß den Phase-72-Achsen (Sichtbarkeit + Review). Klares
  mentales Modell „so sieht es draußen aus". (Interne/in-Prüfung-Marker bewusst
  nicht in der Preview; was fehlt, sagt stattdessen der Readiness-Check.)

### Public-Readiness-Check
- **D-03:** **Eigener Tab** im Workspace (z. B. „Veröffentlichung" / „Readiness"),
  der **Preview UND Checkliste bündelt**. Nicht als Panel auf Grunddaten, nicht als
  globales Sidebar-Widget. Fügt sich in die bestehende `MAIN_TABS`-Struktur ein.
- **D-04:** Checklisten-Punkte sind **klickbare Sprungmarken** auf den jeweils
  zuständigen Tab/Abschnitt zum Beheben (z. B. „Logo fehlt" → Medien-Tab,
  „3 offene Claims" → Claims-Tab). Nutzt die vorhandene Tab-Navigation
  (`MainTab`/`?tab=`-Routing).
- **D-05:** Readiness ist ein **reiner Leitfaden, kein Gate.** Die öffentliche
  Seite ist ohnehin live (Phase 73); Readiness blockiert nichts und führt **keinen
  neuen Publish-Toggle** ein. Zeigt nur, was noch fehlt/zu pflegen ist.
- **D-06:** **Offene Claims/Contributions = nur informative Zähler** mit
  Sprungmarke (read-only). Sie zählen **NICHT** gegen „bereit" und lösen keine
  Review-Aktion aus — Review/Auflösung bleibt **Phase 78** (Lock: keine
  Logik-Duplizierung, keine Parallel-Queue).

### Story-/Projekt-/Release-Kontext-Pflege
- **D-07:** **Nur Reuse/Bündeln** der bestehenden Pflege — „Gruppengeschichte"
  (`notes`/`AnimeProjectNotesSection`-Umfeld), „Anime-Einblicke" (`anime-projekte`)
  und den Release-Drawer/Theme-Assets. Phase 77 macht diese Pflege im Readiness-/
  Workspace-Kontext erreichbar und **verifiziert, dass sie in die korrekten
  Owner-Tabellen** schreibt (Ownership-Matrix, Decision G). **Keine neuen
  Editierfelder** als Default. Falls der Researcher eine echte, bereits in einer
  Owner-Tabelle vorhandene-aber-nicht-editierbare Lücke findet, darf sie minimal
  geschlossen werden — ohne Phase-78-Review anzufassen.

### Capability-Gating
- **D-08:** Zugang zu den neuen Flächen (Preview/Readiness/Kontext) wird **aus den
  bestehenden `FansubGroupCapabilities` abgeleitet** (z. B. sichtbar, wenn eine
  relevante Manage-/Edit-Capability vorhanden ist; analog zu `canUseMainTab`/
  `visibleMainTabs`). **Kein neues Contract-Feld** — erfüllt Lock K ohne
  OpenAPI-/Backend-Änderung. Gruppenmitgliedschaft allein genügt nicht
  (Success Criterion 4 / Decision F).

### Claude's Discretion
- Exakte Tab-Benennung/-Position in `MAIN_TABS`, konkrete Readiness-Kriterienliste
  und Schwellwerte, Empty-State-Texte, CSS-Modul-Struktur, ob Preview als
  Sub-Panel im selben Tab oder als eigener Sub-Reiter — Planner/Executor, solange
  D-01..D-08 und die v1.2-Locks eingehalten werden.
- Welche genaue Ableitung aus `FansubGroupCapabilities` die neuen Flächen gated
  (Composite vs. einzelne Capability) — Planner unter Lock K.
- Ob die Phase-73-Sektionen direkt importiert oder über einen schlanken
  Preview-Wrapper konsumiert werden — Planner, solange read-only Besucher-Sicht
  gewahrt bleibt.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Meilenstein-Entscheidungen (LOCKED — gelten für alle v1.2-Phasen)
- `.planning/milestones/v1.2-DISCUSSION.md` — verbindliche Entscheidungen A–K,
  insb. **Entscheidung 7 (Fansub Leader Workspace)** und Locks **F, I, K**;
  Media-Ownership-Matrix (Decision 8/G), Nicht-Ziele. **MUST read.**

### Vorgänger-/Konsum-Phasen
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-CONTEXT.md` —
  Sichtbarkeit + Review als zwei Achsen (D-03), Auto-Freigabe eigener Uploads
  (D-04), Read-Projektionen, die die Besucher-Sicht/Readiness speisen.
- `.planning/phases/73-public-fansub-page-fansubs-slug-erweitern/73-CONTEXT.md` —
  liefert die öffentlichen Section-Komponenten + Reihenfolge (Hero → Story →
  Highlights → Projekte → Team → Mitwirkende → Medien → Timeline → Deep-Dive),
  die Phase 77 inline als Preview wiederverwendet (dort D-14 = Preview erst hier).

### Systeminventar / Ownership / Runtime-Authority
- `docs/architecture/current-system-inventory.md` — Routen/API/DB/Ownership-Karte,
  Media-Ownership-Matrix, Duplication Traps.
- `docs/architecture/db-runtime-authority-map.md` — keine Read-Umstellung ohne
  Authority-Entscheid.
- `docs/architecture/db-schema-fansub-domain.md` — Domänenregeln Fansub/Release.

### Contracts (Lock K — Pflicht vor Endpoint-/DTO-Änderungen)
- `shared/contracts/openapi.yaml` — Umbrella-Contract.
- `shared/contracts/admin-content.yaml` — falls admin-content-Projektionen betroffen.
- `docs/api/api-contracts.md` — Contract-Regeln.
- `frontend/src/lib/api.ts` — zentraler API-Client/Typen (kein ad-hoc-Fetch, Lock K).

### Bestehende Workspace-Flächen (Reuse statt Neubau)
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — `MAIN_TABS`,
  `canUseMainTab`/`visibleMainTabs`/`resolveMainTabForAccess`,
  `getFansubGroupCapabilities`; hier docken Preview-/Readiness-Tab und Gating an.
- `frontend/src/types/fansub.ts` (`FansubGroupCapabilities`, ab Zeile 163) —
  vorhandene Capability-Felder für die Ableitung (D-08).
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx`,
  `GroupMembersTab.tsx`, `ReleaseThemeAssetsSection.tsx`,
  `ReleaseVersionMediaDrawerSummary.tsx` — bestehende Story-/Projekt-/Release-
  Kontext-Pflege, die Phase 77 bündelt/verifiziert (D-07).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`MAIN_TABS` + Capability-Gating** in `page.tsx`: bestehende Tab-Liste,
  `canUseMainTab`, `visibleMainTabs`, `resolveMainTabForAccess` — der neue
  Readiness/Preview-Tab reiht sich hier ein und leitet sein Gating aus
  `FansubGroupCapabilities` ab (D-03, D-08).
- **Phase-73-Section-Komponenten** (`/fansubs/[slug]`): read-only inline als
  Preview wiederverwenden (D-01) — bei Planung Phase-73-Ausführungsstand prüfen.
- **Bestehende Kontext-Pflege-Sektionen** (Gruppengeschichte/Anime-Einblicke/
  Release-Drawer/Theme-Assets) — nur bündeln/erreichbar machen, nicht neu bauen
  (D-07).
- **Phase-72-Projektionen** (Sichtbarkeit + Review-Achse) speisen sowohl die
  Besucher-Sicht-Filterung der Preview (D-02) als auch die Readiness-Kriterien.

### Established Patterns
- `?tab=`-Routing über `MainTab`/`parseMainTab` — Readiness-Sprungmarken (D-04)
  nutzen dieses bestehende Navigationsmuster statt eigener Links.
- Capability-Ableitung statt direkter Rollen-/Mitgliedschaftsprüfung
  (`canUseMainTab`-Stil) — konsistent für D-08.
- Lock K / Contract-zuerst: OpenAPI + DTO + Repo + `api.ts`-Typen gemeinsam,
  kein ad-hoc-Fetch.
- 450-Zeilen-Limit (Modularity-Constraint): `page.tsx` ist bereits weit darüber
  (~3,8k Zeilen) — neue Flächen als eigene Komponentendateien, nicht weiter in
  `page.tsx` stapeln.

### Integration Points
- Neuer Readiness/Preview-Tab → in `MAIN_TABS` + Gating-Funktionen einhängen.
- Readiness-Zähler (offene Claims/Contributions) → bestehende List-Seams
  (`listGroupMembers`, `listAnimeContributions`, Claim-Listen) read-only nutzen,
  keine neuen Endpunkte (D-06, Lock K).
- Kontext-Pflege → bestehende Update-Seams gegen Owner-Tabellen (D-07,
  Ownership-Matrix G).

</code_context>

<specifics>
## Specific Ideas

- Readiness-Check-Punkte orientieren sich 1:1 an der Liste aus
  v1.2-DISCUSSION Entscheidung 7 / Success Criterion 2: Logo? Banner?
  Kurzbeschreibung? Story? Mitglieder geprüft? externe Mitwirkende geprüft?
  Medien korrekt kategorisiert? offene Claims? offene Contributions?
  öffentliche Vorschau?
- Mentales Modell der Preview: „Genau das, was ein anonymer Besucher auf
  `/fansubs/[slug]` sieht" — Abweichungen davon gehören in den Readiness-Check,
  nicht in die Preview.

</specifics>

<deferred>
## Deferred Ideas

- **Hartes Readiness-Gate / Publish-Toggle:** bewusst verworfen (D-05). Falls je
  ein echter Sichtbarkeits-/Veröffentlichungs-Schalter gewünscht ist, eigene
  spätere Phase.
- **Besucher-Sicht + interne Marker in der Preview:** verworfen zugunsten exakter
  Besucher-Sicht (D-02); „was fehlt" liefert der Readiness-Check.

### Reviewed Todos (not folded)
Folgende offene Todos matchten Phase 77 per Keyword, gehören aber thematisch zu
anderen Phasen (UI-Konsolidierung Contributions/Credits/Member-Profil) und wurden
NICHT in Phase 77 gefaltet:
- `2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md` —
  Contribution-UI auf globale `components/ui`-Primitives (Phase-67-Folgearbeit) →
  eigener UI-Konsolidierungs-Track.
- `2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md` — Credits-UI in
  „Anime & Veröffentlichungen" konsolidieren + Permission-Brücke → Credits-Track.
- `2026-06-03-member-profil-ui-und-params-bug.md` — Member-Profil UI + params.id-Bug
  → Member-Profil-Phase (74-Umfeld).
- `2026-05-28-contributor-owned-media-note-edit-delete.md` — Contributor-eigene
  Medien/Notizen edit/delete → Medien-/Phase-79-Umfeld.
- `2026-05-28-profile-hub-content-activity-redesign.md` — Profile-Hub Redesign →
  Member-Profil-Track.

</deferred>

---

*Phase: 77-leader-workspace-public-preview-readiness*
*Context gathered: 2026-06-05*
