# Phase 181: Release-Bearbeitung zusammenführen (F-13) - Research

**Researched:** 2026-10-13
**Domain:** Next.js 16 App Router route consolidation + Go/Gin ownership-gate relaxation
**Confidence:** HIGH (all load-bearing claims verified against this repo's own source or official Next.js docs; no external package research needed)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 Kanonische Adresse:** neutraler Pfad `/releases/[versionId]/edit` ist kollisionsfrei
  (kein Top-Level-`/releases`-Ordner existiert, nur `app/me/releases/` und `app/api/releases/`,
  keine Kollision mit `anime/[id]/group/[groupId]/releases/[releaseVersionId]/`). Beide alten
  Adressen leiten dorthin weiter (`/admin/episode-versions/[versionId]/edit` und
  `/me/releases/[versionId]/workspace`), Query-Parameter bleiben erhalten (Pass-through). Alle
  11 externen Einstiegspunkte (6 Admin, 5 Workspace) zeigen direkt auf die neue Route. Der
  fragwürdige Pfad in `EpisodeEditForm.tsx:289` wird vor Umbau verifiziert (erreichbar ja/nein).
  Tab-Query-Parameter-Konvention wird vereinheitlicht (Ableitung aus D-02).
- **D-02 Tabs für Mitglieder ohne Admin-Rechte:** wie heute im Workspace — nur 4
  rechtegesteuerte Tabs (Basisdaten, Medien, Segmente, Notizen), gesteuert durch
  `ReleaseVersionCapabilities`. Admin-exklusive Tabs (Dateien/Jellyfin, Änderungsverlauf) sind
  für Nicht-Admins nicht sichtbar — keine ausgegrauten Tabs, kein Hinweis auf deren Existenz.
- **D-03 Vor/Zurück-Blättern:** kontextabhängig nach Einstieg, kein Umschalter. Projekt-Kontext
  (`return_to=/me/projects/{animeId}/group/{groupId}` oder direkt aus
  `/me/projects/.../page.tsx`) → Blättern innerhalb des Anime+Gruppe-Projekts (Datenquelle
  `getMyProjectDetail(...).release_versions`). Episoden-Kontext
  (`return_to=/admin/fansubs/{id}/edit` oder aus Episoden-/Versionen-Listen) → Blättern durch
  alle Episoden der Anime (Datenquelle `getGroupedEpisodes(animeId)`). Beide Navigationsmodi
  bleiben als Code bestehen; die Seite wählt zur Laufzeit, welcher aktiv ist.
- **D-04 Weiterleitung der alten Workspace-Adresse:** dauerhaft, kein Entfernungstermin, kein
  Cutover.
- **D-05 Plattform-Admin ohne Mitgliederprofil:** `ContributionsMeHandler.GetMyProjectDetail`
  (`contributions_me_project_handler.go:13-35`) antwortet künftig graceful statt mit 404, wenn
  kein verifizierter `member_claim` existiert — analog zum `GetOwnDashboard`-Muster
  (`dashboard_me_handler.go:90-120`, "D-09-Kontrast"). Betrifft NUR diesen einen Handler, nicht
  die übrigen 9 `/me`-Handler mit Pflicht-`member_claim`.

### Pflicht-Constraints (gelten für Planung und Umsetzung)

- Globale UI-Primitives (`@/components/ui`) ausschließlich — keine handgebauten nativen
  `<select>/<input>/<textarea>/<button>`.
- Globale Design-Tokens statt neuer Ad-hoc-Werte.
- Korrekte Umlaute in jedem user-facing deutschen String — keine ASCII-Ersetzungen.
- Modularität: Produktionsdateien ≤ 450 Zeilen. `EpisodeVersionEditorPage.tsx` (966 Zeilen) wird
  aufgeteilt, nicht 1:1 kopiert.
- Teststil: Tests führen den geprüften Code tatsächlich aus (Capability-Berechnung,
  Redirect-Ziel-Auflösung, kontextabhängige Navigationswahl) — keine Render-/
  Klick-Simulationstests, keine Quelltext-Inspektionstests.
- Live-UAT: Redirects, Tab-Sichtbarkeit je Rolle, Vor/Zurück-Navigation je Kontext werden in der
  Live-UAT abgenommen, nicht nur durch automatisierte Tests.

### Claude's Discretion

- Interne Benennung von Dateien/Hooks (z. B. `buildWorkspaceHref` → rollenneutraler Name) ist
  Executor-Entscheidung, keine UI-Auswirkung (UI-SPEC §4).
- Konkrete Datei-Aufteilung von `EpisodeVersionEditorPage.tsx` (966 Zeilen) auf mehrere Dateien,
  solange ≤ 450 Zeilen pro Datei und globale Primitives verwendet werden.
- Ob `EpisodeNavigationControls` durch `AdjacentNavigation` ersetzt wird oder als begründete
  Ausnahme erhalten bleibt (UI-SPEC §4, abhängig davon, ob die Positions-Anzeige "Folge X / Y"
  verlustfrei abbildbar ist).

### Deferred Ideas (OUT OF SCOPE)

- **F-01** (alter Bildspeicher entfernen) — unabhängiges Thema.
- **F-18** (einheitlicher Bild-Viewer/Lightbox) — eigene Phase; `ReleaseVersionMediaSection`
  bleibt unverändert.
- Status-/Label-Konsolidierung (z. B. F-02 `getTypeBadgeLabel`) — nicht Teil dieser Phase.
- **F-15** (globaler Upload-Baustein) — Release-Medien-Upload bleibt funktional wie heute.
- Die übrigen 9 `/me`-Handler mit Pflicht-`member_claim` (siehe Liste in CONTEXT.md, Punkte
  2–10) — nur `GetMyProjectDetail` wird angefasst.
</user_constraints>

<phase_requirements>
## Phase Requirements

Keine formalen REQ-IDs in `.planning/REQUIREMENTS.md` sind dieser Phase zugeordnet — F-13 ist
eine additive Phase aus der Phase-175-Inventur (FOLLOWUPS), nicht aus dem v1.4-Requirements-Satz.
`.planning/REQUIREMENTS.md` wurde durchsucht (v1.4 CAP/UADM/RDEL/RQUE/QUAL-Serie sowie alle
Phase-151-bis-180-Zusatzabschnitte); keine inhaltlich passenden offenen Einträge gefunden, die
Phase 181 abdecken müsste. `.planning/STATE.md` (Zeile 420-424) bestätigt den Phase-181-Eintrag
als reinen Roadmap-Zusatz ohne REQ-ID-Bindung. Traceability für diese Phase läuft daher über die
Entscheidungen D-01 bis D-05, nicht über REQ-IDs:

| Decision | Research Support |
|----------|------------------|
| D-01 | Next.js `next.config.js` `redirects()` mit Query-Pass-through (CITED, siehe Architecture Patterns #1); vollständige Einstiegspunkt-Inventur bestätigt/korrigiert (siehe Pitfall 1) |
| D-02 | Capability-Matrix bereits 1:1 aus Workspace übernehmbar (UI-SPEC §1); `buildReleaseEditorTabs()`-Entwurf (siehe Architecture Patterns #3) |
| D-03 | `useReleaseEditorNavigation`-Entwurf, der beide bestehenden Datenquellen kapselt ohne sie zu vermischen (siehe Architecture Patterns #2) |
| D-04 | identischer Redirect-Mechanismus wie D-01, nur andere Quelle |
| D-05 | Exakte Fundstelle des Blockers (`JOIN own_roles ON true`) plus Handler-Fix-Entwurf (siehe Architecture Patterns #4 und Pitfall 2) |
</phase_requirements>

---

## Summary

Diese Phase ist eine reine Frontend-Routing-/Struktur-Konsolidierung plus ein chirurgischer
Backend-Fix — **keine neuen externen Pakete** werden benötigt (Package Legitimacy Audit entfällt
daher inhaltlich; siehe eigener Abschnitt). Die Kernarbeit gliedert sich in vier technisch
unabhängige, aber im selben Plan zu koordinierende Stränge:

1. **Redirects für die zwei Altadressen** — am saubersten über `redirects()` in
   `frontend/next.config.mjs` (nicht über eine Server-Component-Seite pro Route), weil Next.js
   16 Query-Parameter bei Config-Redirects automatisch und vollständig durchreicht, dynamische
   Pfadsegmente (`:versionId`) nativ unterstützt und `permanent: true` exakt den geforderten
   308-Statuscode liefert, ohne eine einzige Zeile React-Code oder einen sichtbaren
   Zwischenzustand zu benötigen.
2. **Eine neue Seite** unter `app/releases/[versionId]/edit/`, zusammengesetzt aus dem bisherigen
   Workspace-Seiten-Skelett (PageHeader/Tabs/AdjacentNavigation — bereits primitive-konform) und
   den admin-exklusiven Inhalten aus `EpisodeVersionEditorPage.tsx` (Dateien-Tab,
   Fansub-Gruppen-Zuweisung, Episoden-Klassifikation, Löschen), aufgeteilt in mehrere Dateien
   ≤ 450 Zeilen.
3. **Eine kontextabhängige Navigations-Komposition** (D-03), die die zwei bestehenden,
   unveränderten Datenquellen (`getMyProjectDetail` vs. `getGroupedEpisodes` +
   `useEpisodeNeighborNavigation`) über eine gemeinsame, zur Laufzeit wählende Fassade
   ansteuert, statt sie zu vermischen.
4. **Ein Zwei-Zeilen-Backend-Fix** (D-05): der Blocker liegt NICHT nur im Handler
   (`contributions_me_project_handler.go:27-33`, der bei fehlendem Claim fest 404 zurückgibt),
   sondern auch in der Repository-SQL selbst (`anime_contributions_member_project_repository.go:91`,
   `JOIN own_roles ON true` statt `LEFT JOIN`) — ohne den SQL-Fix würde ein Sentinel-`memberID`
   im Handler die 404 nur verschieben, nicht beheben.

**Primary recommendation:** `next.config.js` `redirects()` für beide Altadressen, eine neue
Seite unter `app/releases/[versionId]/edit/` mit 7-9 Dateien ≤ 450 Zeilen statt einer
966-Zeilen-Monolith-Kopie, geteilte Tab-Inhalts-Komponenten in einen neutralen, nicht
routen-gebundenen Ordner verschoben (nicht in der neuen Seite "vergraben" — sonst wiederholt sich
exakt das Muster, das diese Phase gerade auflöst), und der D-05-Fix als SQL+Handler-Paar, nicht
als reiner Handler-Shortcut.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Alte-URL-Weiterleitung (D-01/D-04) | Frontend Server (Next.js Routing-Layer, `next.config.js`) | — | Config-Redirects laufen vor dem Filesystem-Routing, brauchen keine Seiten-Logik und keinen API-Call |
| Rechtebasierte Tab-/Aktions-Sichtbarkeit (D-02) | Browser/Client (React-Rendering anhand bereits geladener Capabilities) | API/Backend (`ReleaseVersionCapabilities`-Endpunkt als Quelle der Wahrheit) | Das Frontend liest nur, es erzwingt nichts — `isReleaseMetadataOnlyPatch` im Backend bleibt die echte Durchsetzung |
| Kontextabhängige Vor/Zurück-Navigation (D-03) | Browser/Client (Next.js Client-Komponente, zwei bestehende API-Reads) | API/Backend (`GetMyProjectDetail`, `GetGroupedEpisodes` liefern die Rohdaten) | Die Entscheidung "welcher Modus" ist reine URL-Parsing-Logik im Client, keine neue Backend-Fachlogik nötig |
| Plattform-Admin ohne Mitgliederprofil (D-05) | API/Backend (Handler + Repository-SQL) | Database (bestehende `member_claims`/`anime_contributions`-Tabellen, keine Schema-Änderung) | Der 404 entsteht ausschließlich serverseitig; Frontend kann hier nichts kompensieren |
| Primitive-Fixes (Tabs/Header/Buttons) | Browser/Client | — | Reines Rendering, kein Datenfluss betroffen |

---

## Standard Stack

Keine neuen Abhängigkeiten. Diese Phase arbeitet ausschließlich mit bereits im Projekt
vorhandenen Versionen:

| Library | Version (verifiziert) | Rolle in dieser Phase |
|---------|------------------------|------------------------|
| `next` | `^16.1.6` (`frontend/package.json`) [VERIFIED: package.json] | App-Router-Routing, `redirects()` in `next.config.js`, Server-Component-`redirect()`-Präzedenz |
| `react` / `react-dom` | `18.3.1` [VERIFIED: package.json] | unverändert |
| `typescript` | `^5.7.2` [VERIFIED: package.json] | unverändert |
| intern: `@/components/ui` (`Tabs`, `PageHeader`, `AdjacentNavigation`, `Button`, `Card`, `Badge`, `ErrorState`, `LoadingState`, `useConfirmDialog`) | projekteigen, kein Registry-Paket | Pflicht-Primitives für die neue Seite (CLAUDE.md) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next.config.js` `redirects()` für die zwei Altadressen | Server-Component-`redirect()` pro Route (bestehendes Repo-Muster, siehe `app/admin/role-capabilities/page.tsx`) | Funktioniert ebenfalls, erfordert aber manuelles Nachbauen der Query-Pass-through-Logik (das bestehende Muster allowlistet nur `role`/`tab`, hier bräuchte man generisches `URLSearchParams`-Rebuilding) und zwei zusätzliche Dateien + Tests. `next.config.js` bekommt Query-Pass-through automatisch vom Framework (siehe Pattern 1) |
| Repository-SQL-Fix (`LEFT JOIN own_roles`) | Reiner Handler-Shortcut, der bei fehlendem Claim sofort eine leere `MeProjectDetail`-Struktur zurückgibt, ohne das Repository überhaupt aufzurufen (exakt wie `emptyOwnDashboardData()`) | Niedrigeres Diff-Risiko (keine SQL-Änderung an produktivem Code), aber liefert dann IMMER `release_versions: []` für Plattform-Admins ohne Profil — die projektbezogene Vor/Zurück-Navigation bleibt in diesem Fall strukturell leer, auch wenn echte Release-Versionen für Anime+Gruppe existieren. UI-SPEC akzeptiert das explizit als Minimalanforderung ("AdjacentNavigation erhält previous=null, next=null"), aber die SQL-Fix-Variante liefert echte Daten und ist nicht aufwendiger als der reine Shortcut (ein Wort: `LEFT`) |

**Installation:** nicht erforderlich — keine neuen Pakete.

**Version verification:** `next` `^16.1.6` und `react` `18.3.1` direkt aus `frontend/package.json`
gelesen [VERIFIED: package.json]; `redirects()`-Verhalten gegen die offizielle Next.js-16-
Dokumentation geprüft (`lastUpdated: 2026-06-30`, Next.js `16.4.0`) [CITED: nextjs.org/docs/app/api-reference/config/next-config-js/redirects].

## Package Legitimacy Audit

Nicht anwendbar — diese Phase installiert keine externen Pakete. Keine `npm install`-Zeile,
kein `slopcheck`-Lauf erforderlich. Alle verwendeten Bausteine (`next.config.js` `redirects()`,
`@/components/ui`-Primitives, bestehende Hooks/API-Funktionen) sind bereits im Repo vorhanden.

---

## Architecture Patterns

### System Architecture Diagram

```
Alte Adressen (Browser/Bookmark/11 Einstiegspunkte)
  /admin/episode-versions/{id}/edit?return_to=...&animeId=...        \
  /me/releases/{id}/workspace?return_to=...&tab=...                   \
                                                                        v
                         Next.js Routing-Layer (next.config.js redirects())
                         -- läuft VOR Filesystem-Routing, matched source
                         -- :versionId wird in destination wiederverwendet
                         -- ALLE Query-Parameter werden automatisch durchgereicht
                         -- permanent:true -> HTTP 308
                                                                        |
                                                                        v
                         /releases/{id}/edit?return_to=...&tab=...&animeId=...
                                                                        |
                         +----------------------------------------------+
                         |         ReleaseEditorPage (Client Component) |
                         |                                              |
                         |  1. Lädt parallel:                           |
                         |     getEpisodeVersionEditorContext(id)       |
                         |     getReleaseVersionCapabilities(id)        |
                         |     getCurrentUser() / getOwnProfile()       |
                         |                                              |
                         |  2. releaseEditorRouting.ts (pure):          |
                         |     resolveNavigationContext(return_to, qs)  |
                         |        -> 'project' | 'episode'              |
                         |                                              |
                         |  3. useReleaseEditorNavigation(context, ...) |
                         |     -- context === 'project'                 |
                         |          -> getMyProjectDetail(animeId,grp)  |
                         |     -- context === 'episode'                 |
                         |          -> getGroupedEpisodes(animeId)      |
                         |             + computeNeighborNavigation()    |
                         |     -- liefert IMMER nur EINEN aktiven Satz  |
                         |        {previous, next} an <AdjacentNavigation>|
                         |                                              |
                         |  4. releaseEditorTabs.ts (pure):             |
                         |     buildTabItems({isPlatformAdmin, caps})   |
                         |        -> TabItem[] für <Tabs items=... />   |
                         +----------------------------------------------+
                                        |
                 +----------------------+----------------------+
                 v                      v                      v
     ReleaseEditorMetadataTab   ReleaseEditorFilesTab   SegmenteTab / ReleaseVersionMediaSection /
     (Basisdaten + admin-only   (admin-only, Jellyfin-    ReleaseVersionNotesTab (unverändert,
      Klassifikation/Gruppen)   Scan-Stub)                 bereits geteilt, aus neutralem Ordner)
                 |                      |                      |
                 +----------------------+----------------------+
                                        v
                         PATCH /api/v1/episode-versions/:id (unverändert)
                         -- isReleaseMetadataOnlyPatch erzwingt weiterhin
                            serverseitig, was Nicht-Admins patchen dürfen
```

### Pattern 1: Redirects mit Query-Pass-through über `next.config.js`

**What:** `redirects()` in `frontend/next.config.mjs` statt einer Server-Component pro Altroute.

**Why (verifiziert, nicht angenommen):** Offizielle Next.js-16-Dokumentation
[CITED: https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects,
lastUpdated 2026-06-30, Next.js 16.4.0]:
- "When a redirect is applied, any query values provided in the request will be passed through
  to the redirect destination." — Beispiel dort: `/old-blog/post-1?hello=world` →
  `/blog/post-1?hello=world`. Das deckt `return_to`, `tab`, `animeId`, `episodeId` automatisch ab,
  ohne eine Zeile Pass-through-Code.
- "Redirects are checked before the filesystem which includes pages and `/public` files." —
  ein eventuell liegen gebliebenes altes `page.tsx` würde NIE gerendert, der Config-Redirect
  gewinnt immer zuerst (wichtig für die Reihenfolge der Lösch-Schritte, siehe Pitfall 3).
- `permanent: true` → HTTP 308 (die von D-01/D-04/UI-SPEC geforderte "dauerhafte" Weiterleitung
  mit Cache-Semantik), `permanent: false` → 307.
- Pfadparameter-Wiederverwendung ist das dokumentierte Standardbeispiel
  (`/old-blog/:slug` → `/news/:slug`), exakt die hier benötigte Form.

**Code Example:**
```js
// frontend/next.config.mjs — Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects
async function redirects() {
  return [
    {
      source: '/admin/episode-versions/:versionId/edit',
      destination: '/releases/:versionId/edit',
      permanent: true, // 308, D-01
    },
    {
      source: '/me/releases/:versionId/workspace',
      destination: '/releases/:versionId/edit',
      permanent: true, // 308, D-04 (dauerhaft, kein Entfernungstermin)
    },
  ]
}

const nextConfig = {
  // ...bestehende images/turbopack-Konfiguration unverändert
  redirects,
}
```
Query-Parameter (`?return_to=...&tab=...&animeId=...`) müssen hier NICHT manuell behandelt
werden — sie werden laut obiger Dokumentationsstelle automatisch durchgereicht.

**Testbarkeit (Teststil-Pflicht):** `redirects` ist eine exportierte, aufrufbare Funktion — ein
Vitest-Test kann sie direkt importieren und das zurückgegebene Array auf `source`/`destination`/
`permanent` prüfen, ohne Next.js selbst zu starten:
```ts
// Beispiel-Teststruktur, kein Rendering nötig
import { describe, expect, it } from 'vitest'
// next.config.mjs exportiert die redirects-Funktion nicht direkt als Named Export heute --
// entweder redirects() als eigene, exportierte Funktion in next.config.mjs behalten (wie oben
// skizziert) oder in ein separates, importierbares Modul auslagern (z. B. releaseEditorRedirects.ts),
// das next.config.mjs dann nur noch re-exportiert. Letzteres ist robuster für Tests, weil es
// next.config.mjs selbst nicht als Testziel behandelt.
```
**Offene Design-Frage für den Planner:** Next.js lädt `next.config.mjs` normalerweise nicht in
Vitest. Die sauberste Lösung ist, die `redirects()`-Logik (das Array der beiden Einträge) in ein
eigenständiges Modul zu extrahieren (z. B. `frontend/src/lib/releaseEditorRedirects.ts`, exportiert
`buildReleaseEditorRedirects(): RedirectRule[]`), das `next.config.mjs` nur importiert und
zurückgibt. So bleibt die Logik direkt testbar (Teststil-Pflicht: der geprüfte Code wird real
ausgeführt, kein `os.ReadFile`-String-Match auf `next.config.mjs`).

**Anti-Pattern to Avoid:** Keine zweite, parallele Redirect-Implementierung über Middleware
(`middleware.ts`/Proxy) zusätzlich zu `next.config.js` — würde zwei Wahrheiten für dieselbe
Weiterleitung schaffen. Dieses Repo hat aktuell keine `middleware.ts`-Datei im Frontend
[VERIFIED: `find frontend/src -iname "middleware.ts"` liefert keinen Treffer] — es muss auch
keine für diese Phase neu entstehen.

### Pattern 2: Kontextabhängige Navigation ohne Datenvermischung (D-03)

**What:** Eine einzige Fassade `useReleaseEditorNavigation(params)`, die zur Laufzeit GENAU EINEN
der zwei bestehenden, unveränderten Navigationspfade aktiviert — niemals beide gleichzeitig,
niemals eine gemeinsame Datenstruktur, die beide Quellen mischt.

**Bestehende Bausteine (unverändert wiederverwendbar):**
- Projekt-Kontext: `getMyProjectDetail(animeId, fansubGroupId)` liefert
  `release_versions: MeProjectReleaseVersion[]`; aktueller Index via
  `release_versions.findIndex(r => r.release_version_id === currentVersionId)`, Nachbarn
  `[idx-1]`/`[idx+1]` — exakt der Code aus
  `frontend/src/app/me/releases/[versionId]/workspace/page.tsx:189-229` (unverändert portierbar).
- Episoden-Kontext: `useEpisodeNeighborNavigation({ animeId, currentVersionId, groupId, releaseVersion })`
  aus `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts`
  (ruft intern `getGroupedEpisodes(animeId)` + `computeNeighborNavigation()` aus
  `episodeNeighborNavigation.ts` auf) — unverändert portierbar.

**Empfohlene Fassade:**
```ts
// releaseEditorNavigation.ts (neu, pure Entscheidung + dünner Wrapper)
export type NavigationContext = 'project' | 'episode'

export function resolveNavigationContext(params: {
  returnTo: string | null
  animeIdQuery: number | null
  episodeIdQuery: number | null
}): NavigationContext {
  // Projekt-Kontext: return_to passt auf /me/projects/\d+/group/\d+
  if (params.returnTo && /^\/me\/projects\/\d+\/group\/\d+$/.test(params.returnTo)) {
    return 'project'
  }
  // Episoden-Kontext: return_to passt auf /admin/fansubs/\d+/edit ODER animeId+episodeId vorhanden
  if (params.returnTo && /^\/admin\/fansubs\/\d+\/edit$/.test(params.returnTo)) {
    return 'episode'
  }
  if (params.animeIdQuery != null && params.episodeIdQuery != null) {
    return 'episode'
  }
  // Fallback: ohne jeden Hinweis — projektbezogen, da das der restriktivere, "sicherere" Default ist
  // (zeigt im Zweifel weniger statt mehr Nachbar-Versionen) -- ASSUMED, zur Bestätigung in der Planung.
  return 'project'
}
```
Jeder der beiden Unterhooks wird mit einem `enabled`-Flag versehen und meldet `{previous: null,
next: null}` zurück, solange er nicht der aktive Kontext ist — so wird NIE ein Request für den
inaktiven Pfad ausgelöst (kein unnötiger `getGroupedEpisodes`-Call im Projekt-Kontext und
umgekehrt).

**Pitfall:** `EpisodeNavigationControls.tsx:30` navigiert aktuell hart zu
`/admin/episode-versions/${targetVersionId}/edit?tab=${activeTab}` mit den ALTEN Admin-Tab-IDs
(`uebersicht/dateien/informationen/...`). Dieser Link-Builder MUSS auf die neue Route
(`/releases/${id}/edit`) und die neuen, vereinheitlichten Tab-IDs (`metadata/files/segments/
media/changelog/notes`, siehe UI-SPEC §1) umgestellt werden — sonst entsteht ein funktionierender,
aber sofort wieder redirecteter Navigationsklick (Extra-Request-Runde durch den 308).

**Open Question für den Planner:** `EpisodeNavigationControls` zeigt zusätzlich "Folge X / Y"
(Positionsanzeige). Die globale `AdjacentNavigationProps` (siehe
`frontend/src/components/ui/AdjacentNavigation.tsx`) kennt nur `previous`/`next`/`ariaLabel`/
`variant`, KEINE Positionsanzeige. Entweder (a) die Positionsanzeige entfällt beim Wechsel auf die
globale Primitive (UI-SPEC lässt das explizit offen: "Annahme ... zur Bestätigung"), oder (b)
`EpisodeNavigationControls` bleibt für den Episoden-Kontext als begründete Ausnahme erhalten und
nur der Projekt-Kontext nutzt `AdjacentNavigation` (wie im heutigen Workspace) — was dann zwei
visuell unterschiedliche Navigationsleisten je Kontext ergibt. Dies ist in UI-SPEC §4 bereits als
offene Frage markiert und braucht eine explizite Entscheidung vor der Planung, kein Raten.

### Pattern 3: Capability-Matrix als reine Funktion (D-02)

**What:** `buildReleaseEditorTabs()` — eine reine Funktion statt der heutigen 144 Zeilen
handgebauter `<button>`-Blöcke in `EpisodeVersionEditorPage.tsx:402-545` — liefert direkt ein
`TabItem[]` für die globale `Tabs`-Primitive (`frontend/src/components/ui/Tabs.tsx`, Props:
`items: TabItem[]`, `defaultTabId?`, `activeId?`, `onActiveIdChange?`).

**Sichtbarkeits-Matrix (aus UI-SPEC §1, bereits verbindlich):**
```ts
interface ReleaseEditorTabInputs {
  isPlatformAdmin: boolean
  canEditMetadata: boolean      // capabilities.can_edit_metadata (admin: immer true)
  canManageSegments: boolean    // capabilities.can_manage_segments
  canUseMedia: boolean          // capabilities.can_view_media
  canUseNotes: boolean          // capabilities.can_edit_notes && memberId != null (Admin: true, memberIdFilter=null)
}

function buildReleaseEditorTabIds(input: ReleaseEditorTabInputs): string[] {
  const ids: string[] = []
  if (input.isPlatformAdmin || input.canEditMetadata) ids.push('metadata')
  if (input.isPlatformAdmin) ids.push('files')
  if (input.isPlatformAdmin || input.canManageSegments) ids.push('segments')
  if (input.isPlatformAdmin || input.canUseMedia) ids.push('media')
  if (input.isPlatformAdmin) ids.push('changelog')
  if (input.isPlatformAdmin || input.canUseNotes) ids.push('notes')
  return ids
}
```
Diese Funktion ist pur, braucht keinen DOM, keinen Render-Pass — exakt der Teststil, den
CLAUDE.md verlangt ("Capability-Berechnung" als Logik-Test statt Render-Simulation).

### Pattern 4: D-05-Backend-Fix — SQL-Join plus Handler-Sentinel

**Der eigentliche Blocker liegt an ZWEI Stellen, nicht nur im Handler:**

1. **Handler** `contributions_me_project_handler.go:27-33`: `resolveVerifiedMemberID` gibt bei
   fehlendem Claim `repository.ErrNotFound` zurück, der Handler antwortet sofort mit 404
   `"kein verifizierter Member-Account verknüpft"`, OHNE das Repository je aufzurufen.
2. **Repository** `anime_contributions_member_project_repository.go:91`:
   `FROM anime a JOIN fansub_groups fg ON fg.id = $3 JOIN own_roles ON true WHERE a.id = $2 ...` —
   `own_roles` ist eine CTE, die bei `memberID=0` (oder jeder nicht existierenden `member_id`)
   **null Zeilen** liefert. Ein `JOIN ... ON true` gegen eine 0-Zeilen-Tabelle ergibt ein leeres
   Gesamtergebnis → `pgx.ErrNoRows` → `repository.ErrNotFound` → der zweite, tiefere 404-Pfad im
   selben Handler (`notFound(c, "projekt nicht gefunden")`). **Ein reiner Handler-Sentinel
   (`memberID = 0`) würde den 404 also nur eine Ebene tiefer verschieben, nicht beheben.**

   Die per-Release-Version-Abfrage (`listMemberProjectReleaseVersions`,
   `anime_contributions_member_project_repository.go:184-205`) hat dieses Problem NICHT — sie
   nutzt bereits `LEFT JOIN LATERAL (...) own ON true` und liefert bei `memberID=0` korrekt
   `has_own_* = false` + leere Rollen-Arrays zurück, ohne die Gesamtzeile zu verwerfen.

**Empfohlener Fix (zwei Zeilen, kein Schema-Change):**
```diff
--- backend/internal/repository/anime_contributions_member_project_repository.go
   FROM anime a
   JOIN fansub_groups fg ON fg.id = $3
-  JOIN own_roles ON true
+  LEFT JOIN own_roles ON true
   WHERE a.id = $2
```
```diff
--- backend/internal/handlers/contributions_me_project_handler.go
   memberID, err := h.resolveVerifiedMemberID(c.Request.Context(), identity.AppUserID)
+  if errors.Is(err, repository.ErrNotFound) {
+      memberID = 0 // Sentinel: members.id ist BIGSERIAL, startet bei 1 (verifiziert in
+                    // database/migrations/0044_add_db_schema_v2_target_tables.up.sql:128) --
+                    // 0 matcht garantiert keinen echten Member, own_roles bleibt leer,
+                    // has_own_* wird korrekt false (D-09-analoges Graceful-Verhalten).
+  } else if err != nil { ... }
-  if errors.Is(err, repository.ErrNotFound) {
-      c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "kein verifizierter Member-Account verknüpft"}})
-      return
-  }
```
Nach diesem Fix liefert `GetMemberProjectDetail` für einen Plattform-Admin ohne Member-Profil
die ECHTEN `anime_title`/`fansub_group_name`/`backdrop_url` sowie eine ECHTE
`release_versions`-Liste (mit `has_own_* = false` für alle Einträge, `role_codes: []`) — die
projektbezogene Vor/Zurück-Navigation funktioniert dann tatsächlich mit echten Nachbar-Releases,
statt strukturell leer zu bleiben. Das übertrifft die UI-SPEC-Minimalanforderung ("previous=null,
next=null" ist nur der worst case, kein Zielzustand) und ist nicht aufwendiger als der reine
Shortcut.

**Verbleibender echter 404-Fall (unverändert korrekt):** existiert die Kombination
`animeID`/`fansubGroupID` selbst nicht (ungültige IDs), liefert die Query nach dem Fix weiterhin
0 Zeilen (weil `a.id = $2` oder `fg.id = $3` nicht matcht) → `ErrNotFound` → der bestehende
`notFound(c, "projekt nicht gefunden")`-Pfad bleibt für diesen Fall unverändert zuständig.

**Contract-Konsequenz:** `shared/contracts/contributions.yaml:250-251` dokumentiert aktuell einen
kombinierten 404 `"Kein verifizierter Member-Account verknüpft oder kein eigenes Projekt"`. Nach
dem Fix deckt der 404 nur noch den zweiten Fall ab — die Beschreibung in `contributions.yaml`
UND `openapi.yaml:9288ff` sollte entsprechend präzisiert werden (reine Textkorrektur, kein
Schema-Bruch, da `200`-Schema unverändert bleibt).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query-Parameter-Pass-through bei Redirect | Eigenes `URLSearchParams`-Rebuilding in einer Server-Component pro Altroute | `next.config.js` `redirects()` | Next.js übernimmt den Pass-through nachweislich automatisch (siehe Pattern 1); eigenes Rebuilding ist zusätzlicher Code mit Encoding-Fallstricken (siehe bestehender Kommentar in `role-capabilities/page.tsx:13-16` zu `URLSearchParams.toString()` und `+` statt `%20`) |
| Tab-Sichtbarkeit je Rolle | Zwei komplette, parallele JSX-Blöcke wie heute (`shouldRenderAdminTabs`/`shouldRenderContributorTabs` mit dupliziertem Markup) | Eine additive `buildReleaseEditorTabIds()`-Funktion + globale `Tabs`-Primitive | Genau dieses Duplizieren ist der Grund, warum die Phase überhaupt existiert — nicht reproduzieren |
| Kontext-Erkennung "woher kommt der Nutzer" | Ein neuer Query-Parameter/Toggle | Bestehende `return_to`-Musterprüfung (zwei Regex, bereits in beiden Altimplementierungen vorhanden) | D-03 verlangt explizit "kein neuer Parameter nötig" |
| Graceful-Leerzustand für fehlendes Member-Profil | Eine zweite, eigene "ist leer"-Fallback-Struktur nur für `GetMyProjectDetail` | Dasselbe Resolver-Fehlerbild (`repository.ErrNotFound`) wie `GetOwnDashboard` bereits etabliert hat | Ein zweites paralleles Graceful-Pattern würde zukünftige `/me`-Handler verwirren, welches das "richtige" Vorbild ist |

**Key insight:** Diese Phase hat auffällig wenig "neue" Logik — fast jeder Baustein existiert
bereits einmal in jeder der beiden Altimplementierungen. Das eigentliche Risiko ist nicht fehlende
Fachlogik, sondern das Vermischen/Verlieren der bereits korrekten, aber getrennten Implementierungen
beim Zusammenführen.

---

## Common Pitfalls

### Pitfall 1: CONTEXT.md-Inventur ist an zwei Stellen unvollständig/falsch — vor Planung korrigieren

**Was falsch/unvollständig ist:**
- **Zusätzlicher, nicht in CONTEXT.md gelisteter Admin-Einstiegspunkt:**
  `frontend/src/app/admin/fansubs/[id]/edit/ReleaseMediaDrawer.tsx:7` importiert
  `ReleaseVersionMediaSection` aus dem Admin-Editor-Ordner — das ist aber ein reiner
  Komponenten-Import, kein Navigations-Link, also KEIN zusätzlicher Einstiegspunkt im Sinne von
  D-01's "11 Einstiegspunkte", sondern ein zusätzlicher Cross-Import, der beim Verschieben der
  geteilten Komponenten aktualisiert werden muss (siehe Pitfall 4).
- **`EpisodeEditForm.tsx:289` ist NICHT tote-Code-verdächtig, sondern tatsächlich tot — aber
  über eine tiefere Kette als CONTEXT.md vermutet hat:** `EpisodeEditForm` wird als
  `EpisodeEditor` re-exportiert (`EpisodeEditor.tsx:1`) und von `EpisodeManager.tsx:341`
  importiert. `EpisodeManager.tsx` selbst wird aber NIRGENDS in `frontend/src/app/` importiert
  oder gerendert [VERIFIED: `grep -rn "EpisodeManager/EpisodeManager\|from './EpisodeManager'\|<EpisodeManager " frontend/src` liefert 0 Treffer]. Die Komponente ist über die gesamte Kette
  unerreichbar — CONTEXT.md's Verdacht ("vermutlich toter Code") ist damit BESTÄTIGT, nicht nur
  vermutet. Kann als toter Code entfernt werden, ohne eine zusätzliche Linkziel-Umstellung
  einzuplanen.

**How to avoid:** Vor Task-Zuschnitt beide Punkte in den Plan übernehmen: `ReleaseMediaDrawer.tsx`
gehört in die Liste der Dateien, deren Import-Pfad beim Verschieben der geteilten Komponenten
aktualisiert werden muss (nicht in die 11-Einstiegspunkte-Liste); `EpisodeEditForm.tsx:289` kann
ersatzlos entfernt werden (bestätigt toter Code, kein Umstellungs-Task nötig).

### Pitfall 2: Reiner Handler-Fix ohne SQL-Fix behebt D-05 nicht

Siehe Pattern 4 oben — `JOIN own_roles ON true` lässt die komplette Abfrage leerlaufen, sobald
`memberID` keinen echten Member trifft. Ein Sentinel-`memberID=0` im Handler allein würde den
404 nur von "kein verifizierter Member-Account verknüpft" zu "projekt nicht gefunden" verschieben
— der Admin sieht weiterhin einen 404, nur mit anderem Text. **Warning sign:** ein Regressionstest,
der nur den Handler mit einem Fake-Repository testet, würde diesen Fehler NICHT aufdecken (das
Fake-Repository hätte das `JOIN`-Problem gar nicht) — der Test MUSS gegen eine echte,
schema-isolierte Postgres-Fixture laufen (siehe Validation Architecture unten), exakt wie der
`GetOwnDashboard`-Test es bereits tut (`testsupport.OpenPhase107Postgres`).

### Pitfall 3: Alte Route-Dateien überleben den Redirect unsichtbar, aber nicht harmlos

Da Next.js Config-Redirects "vor dem Filesystem" geprüft werden [CITED: nextjs.org], würde ein
liegen gebliebenes `app/admin/episode-versions/[versionId]/edit/page.tsx` NIE mehr gerendert —
funktional unsichtbar, aber es bleibt als verwaister Code mit eigenen Tests (`page.test.tsx`,
582 Zeilen) im Repo, der bei jedem `npm test`/`tsc`-Lauf weiterhin mitläuft und bei künftigen
Refactorings fälschlich als "noch aktiver Code" missverstanden werden kann. **How to avoid:**
Reihenfolge im Plan: (1) geteilte Komponenten in einen neutralen Ordner verschieben, (2) neue Seite
unter `app/releases/[versionId]/edit/` bauen und gegen die verschobenen Komponenten verdrahten,
(3) `next.config.js`-Redirects aktivieren, (4) ALTE route-spezifische Dateien (die NICHT
verschoben wurden, siehe Pitfall 4 für die Abgrenzung) explizit löschen, nicht nur unverlinkt
liegen lassen.

### Pitfall 4: Geteilte Tab-Inhalte liegen heute in einem Routen-Ordner, der verschwindet

`frontend/src/app/admin/episode-versions/[versionId]/edit/` ist aktuell NICHT nur die
Admin-Editor-Seite, sondern auch die De-facto-Bibliothek für `ReleaseVersionMediaSection.tsx`
(+ Grid/Drawer/Upload-Helfer), `ReleaseVersionNotesTab.tsx`, `SegmenteTab.tsx` (+ Helfer),
`ReleaseVersionMetadataFields.tsx`, `EpisodeClassificationSection.tsx`,
`useReleaseVersionMedia.ts`, `episodeVersionEditorUtils.ts` — importiert nicht nur von der
Workspace-Seite, sondern auch von vier Dateien AUSSERHALB beider betroffenen Routen
[VERIFIED: `grep -rln "app/admin/episode-versions/\[versionId\]/edit" frontend/src | grep -v "^frontend/src/app/admin/episode-versions/\[versionId\]/edit/"`]:
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseMediaDrawer.tsx:7` (`ReleaseVersionMediaSection`)
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx:4` (`useReleaseVersionMedia`)
- `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx:7,150` (`useReleaseVersionMedia`-Typ + Mock)
- `frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.test.tsx:10` (`EpisodeClassificationSection`)

**Warning sign:** wenn der Plan die admin-exklusiven UND die geteilten Dateien unverändert in die
neue Seite "mitnimmt" (`app/releases/[versionId]/edit/ReleaseVersionMediaSection.tsx` usw.), bleibt
exakt das Muster erhalten, das diese Phase eigentlich auflösen soll — eine Routen-Seite als
versteckte Komponentenbibliothek für andere Features. **How to avoid:** geteilte, nicht
routen-spezifische Dateien in einen neutralen Ordner verschieben (z. B.
`frontend/src/components/releaseEditor/`, konsistent mit bestehenden Geschwister-Ordnern wie
`frontend/src/components/episodes/`, `frontend/src/components/media/`), dann sowohl die neue
`/releases/[versionId]/edit/`-Seite als auch die vier oben genannten externen Importer auf den
neuen Pfad umstellen. Dies ist ein rein mechanischer Importpfad-Umzug ohne Verhaltensänderung —
`tsc --noEmit` deckt jeden übersehenen Altpfad sofort auf.

### Pitfall 5: `AdminMainNav` ist KEIN Verlust beim Verlassen des `/admin/*`-Namensraums (entwarnt, nicht angenommen)

Vermutung vor der Prüfung: die neue Seite verliert die globale Admin-Hauptnavigation
(`app/admin/layout.tsx` rendert `<AdminMainNav />` um jede `/admin/*`-Seite). **Tatsächlich
verifiziert:** `AdminMainNav.tsx:14-16` rendert über `belongsToRightsModule()` NUR für
`/admin/users`, `/admin/groups`, `/admin/roles`, `/admin/claims`, `/admin/changes` — für
`/admin/episode-versions/[versionId]/edit` liefert die Funktion bereits heute `null`
[VERIFIED: `frontend/src/components/admin/AdminMainNav.tsx:14-20`]. Der Umzug auf
`/releases/[versionId]/edit` verliert also visuell NICHTS — kein zusätzlicher UI-Task nötig, um
eine Navigationsleiste "nachzubauen", die auf der heutigen Admin-Editor-Seite gar nicht sichtbar
war.

---

## Code Examples

### `getSafeReturnPath` — vereinheitlicht aus beiden Altimplementierungen

```ts
// Source: Zusammenführung aus
// frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx:71-93
// (akzeptiert /admin/fansubs/\d+/edit ODER /me/projects/\d+/group/\d+) und
// frontend/src/app/me/releases/[versionId]/workspace/workspaceHelpers.ts:26-30
// (akzeptiert NUR exakt /me/projects/{animeId}/group/{fansubGroupId}).
// Die zusammengeführte Version muss BEIDE Muster weiterhin akzeptieren (D-03 braucht beide
// Kontexte unverändert erkennbar), unterscheidet sich vom Admin-Original nur darin, dass sie
// nicht mehr versionId-spezifisch ist, sondern generisch für die neue Seite gilt.
export function getSafeReturnPath(value: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null
  if (trimmed.includes('\\') || trimmed.includes('://')) return null

  try {
    const parsed = new URL(trimmed, 'http://team4s.local')
    if (parsed.origin !== 'http://team4s.local') return null

    const isAdminFansubWorkspace = /^\/admin\/fansubs\/\d+\/edit$/.test(parsed.pathname)
    const isMemberProjectWorkspace = /^\/me\/projects\/\d+\/group\/\d+$/.test(parsed.pathname)
    if (!isAdminFansubWorkspace && !isMemberProjectWorkspace) return null

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}
```

### Tab-ID-Vereinheitlichung — alte vs. neue Query-Parameter-Werte

```ts
// Alt (Admin): uebersicht | dateien | informationen | segmente | media | changelog | notizen
// Alt (Workspace): metadata | media | segments | notes
// Neu (UI-SPEC §1, verbindlich): metadata | files | segments | media | changelog | notes
// "uebersicht" entfällt ersatzlos (Platzhalter ohne Inhalt/Einstiegspunkt, UI-SPEC §1 Fußnote).
const RELEASE_EDITOR_TAB_IDS = ['metadata', 'files', 'segments', 'media', 'changelog', 'notes'] as const
type ReleaseEditorTabId = (typeof RELEASE_EDITOR_TAB_IDS)[number]
```

---

## Datei-Aufteilung von `EpisodeVersionEditorPage.tsx` (966 Zeilen) — konkreter Vorschlag

Gemessene Blockgrößen im Original (`EpisodeVersionEditorPage.tsx`):
- Zeilen 1-94: Imports/Typen/`parsePositiveInt`/`parseActiveTab`/`getSafeReturnPath` (~94 Zeilen,
  bereits pur, sofort als eigenes Modul extrahierbar)
- Zeilen 95-294: State/Effects/berechnete Flags (Breadcrumbs, Hrefs) (~200 Zeilen)
- Zeilen 402-545: handgebaute Tab-Buttons, zwei parallele JSX-Blöcke (~144 Zeilen,
  entfällt vollständig durch `<Tabs items={...} />`)
- Zeilen 598-741: "Dateien"-Tab-Inhalt, admin-exklusiv (~144 Zeilen)
- Zeilen 744-862: "Informationen"/Basisdaten-Tab-Inhalt inkl. admin-exklusiver
  Klassifikation/Speicherort/Gruppen-Zuweisung (~119 Zeilen)
- Zeilen 926-959: Action-Bar (Zurück/Speichern/Löschen) (~34 Zeilen)

**Empfohlene Zieldateien (alle ≤ 450 Zeilen):**

| Datei | Geschätzte Zeilen | Inhalt |
|-------|---------------------|--------|
| `app/releases/[versionId]/edit/page.tsx` | ~10 | dünner Routen-Entry-Point, rendert nur die Client-Komponente (analog heutigem `admin/episode-versions/[versionId]/edit/page.tsx`, 5 Zeilen) |
| `app/releases/[versionId]/edit/ReleaseEditorPage.tsx` | ~250-300 | orchestrierende Client-Komponente: Daten laden, `PageHeader`, `AdjacentNavigation`, `Tabs` zusammensetzen |
| `app/releases/[versionId]/edit/releaseEditorRouting.ts` | ~100-140 | pure Funktionen: `getSafeReturnPath`, `resolveNavigationContext`, Breadcrumb-Label-Builder, `parsePositiveInt` |
| `app/releases/[versionId]/edit/releaseEditorTabs.ts` | ~80-120 | `buildReleaseEditorTabIds()`, Capability-Flag-Ableitung |
| `app/releases/[versionId]/edit/useReleaseEditorNavigation.ts` | ~90-130 | Fassade über Projekt- vs. Episoden-Navigation (Pattern 2) |
| `app/releases/[versionId]/edit/useReleaseEditorData.ts` | ~400-420 | umbenannter/minimal angepasster `useEpisodeVersionEditor.ts` (bereits 416 Zeilen, knapp unter dem Limit — keine weitere Logik hier ergänzen, neue Logik gehört in Geschwister-Dateien) |
| `app/releases/[versionId]/edit/ReleaseEditorMetadataTab.tsx` | ~150-180 | Basisdaten-Tab inkl. admin-exklusiver Unterblöcke |
| `app/releases/[versionId]/edit/ReleaseEditorFilesTab.tsx` | ~150-180 | admin-exklusiver Dateien/Jellyfin-Scan-Block (heute Zeilen 598-741) |
| `app/releases/[versionId]/edit/ReleaseEditorChangelogTab.tsx` | ~30 | admin-exklusiver Platzhalter |
| `frontend/src/components/releaseEditor/*` (verschoben, siehe Pitfall 4) | unverändert | `ReleaseVersionMediaSection.tsx` + Helfer, `ReleaseVersionNotesTab.tsx`, `SegmenteTab.tsx` + Helfer, `ReleaseVersionMetadataFields.tsx`, `EpisodeClassificationSection.tsx`, `useReleaseVersionMedia.ts`, `useReleaseSegments.ts`, `episodeVersionEditorUtils.ts`, `JellyfinEnrichmentNotice.tsx` |

**Nicht verschobene, aber weiterhin benötigte Datei:** `episodeNeighborNavigation.ts` +
`useEpisodeNeighborNavigation.ts` (pure Nachbar-Berechnung über `getGroupedEpisodes`) wandern am
besten direkt in die neue Seite oder ebenfalls nach `components/releaseEditor/`, je nachdem ob
sie außerhalb dieser Phase auch von anderen Features gebraucht werden
[VERIFIED: aktuell keine externen Importer außer der Admin-Editor-Seite selbst —
`grep -rln "useEpisodeNeighborNavigation" frontend/src | grep -v "episode-versions/\[versionId\]/edit"`
liefert 0 Treffer].

**Ausdrücklich NICHT in dieser Phase zu bearbeiten:** `ReleaseVersionNotesTab.tsx` ist mit
743 Zeilen bereits heute über dem 450-Zeilen-Limit [VERIFIED: `wc -l`]. Das ist bestehende
Altlast, nicht durch diese Phase verursacht, und die Komponente wird laut CONTEXT.md unverändert
wiederverwendet ("identische Komponenten"). Ein Split dieser Datei ist NICHT Teil von F-13 — sie
wird nur verschoben (siehe Pitfall 4), nicht umgebaut. Falls der Plan sie trotzdem anfasst
(z. B. weil der Umzug einen Import anpasst), darf der Umzug selbst keine Zeilenzahl-Reduktion
vortäuschen, die eigentlich ein separates Refactoring bräuchte.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Zwei parallele Seiten mit eigenem Rechtemodell (`isPlatformAdmin`-Zweiebenen vs. reine Capabilities) | Eine Seite, additive Capability-Matrix (`isPlatformAdmin \|\| capability`) | diese Phase | Rechte-Anzeige und Rechte-Durchsetzung fallen nicht mehr auseinander — das Backend (`isReleaseMetadataOnlyPatch`) war schon immer die echte Grenze, das Frontend zieht jetzt nach |
| Hartes 404 bei fehlendem Member-Claim in `GetMyProjectDetail` | Graceful 200 analog `GetOwnDashboard` (D-09-Muster) | diese Phase | zweiter `/me`-Handler im Repo, der dieses Muster nutzt — spätere Phasen könnten die übrigen 9 Handler (siehe CONTEXT.md) nach demselben Vorbild umstellen, falls fachlich gewünscht (explizit NICHT Teil von F-13) |

**Deprecated/outdated:** `/admin/episode-versions/[versionId]/edit` und
`/me/releases/[versionId]/workspace` als eigenständige Seiten — ab dieser Phase nur noch
Redirect-Quellen, dauerhaft (D-04), nicht nur übergangsweise.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Fallback-Navigationskontext ist "project", wenn `return_to` fehlt UND `animeId`/`episodeId` fehlen (z. B. direkter Lesezeichen-Aufruf ohne jeden Kontext) | Pattern 2 (`resolveNavigationContext`) | Falscher Default könnte in seltenen Fällen (direkter Link ohne Query-Parameter) die falsche Nachbar-Liste laden; betrifft nur den Rand-/Fehlerfall, nicht den Normalbetrieb über die 11 Einstiegspunkte, die alle einen erkennbaren Kontext mitbringen |
| A2 | `EpisodeNavigationControls`-Positionsanzeige ("Folge X / Y") entfällt beim Wechsel auf die globale `AdjacentNavigation`-Primitive, statt die Komponente als Ausnahme zu erhalten | Pattern 2 (Open Question), UI-SPEC §4 selbst markiert dies bereits als offene Annahme | Falls die Positionsanzeige fachlich wichtig ist, müsste `EpisodeNavigationControls` für den Episoden-Kontext doch erhalten bleiben — reine UI-Entscheidung, kein technisches Risiko, aber beeinflusst die Dateiaufteilung |
| A3 | Die neutrale Zielordner-Konvention für verschobene geteilte Komponenten ist `frontend/src/components/releaseEditor/` (abgeleitet aus Geschwister-Konvention `components/episodes/`, `components/media/`) | Pitfall 4 / Dateiaufteilungs-Tabelle | Falscher Ordnername hat keine funktionalen Folgen, nur Konsistenz-Kosmetik — leicht in der Planungsrunde zu bestätigen oder umzubenennen |
| A4 | Header-Kontrakt-Annahmen aus UI-SPEC (Eyebrow "Administrator", entfallende "Übersicht"-Tab, Error-State-Titel "Release-Version nicht verfügbar") sind bereits durch den UI-Checker bestätigt oder offen — diese Research-Datei übernimmt sie unverändert, prüft sie aber nicht erneut fachlich | gesamte UI-SPEC-Bezüge | Falls der UI-Checker diese Annahmen noch nicht final abgezeichnet hat, muss die Planung auf den UI-SPEC-Status (`Approval: pending` laut Kopfzeile) Rücksicht nehmen, nicht auf diese Research-Datei als zusätzliche Quelle |

---

## Open Questions

1. **Soll `EpisodeNavigationControls` (mit Positionsanzeige) erhalten bleiben oder vollständig
   durch `AdjacentNavigation` ersetzt werden?**
   - What we know: UI-SPEC §4 markiert dies explizit als offene Annahme; die globale Primitive
     unterstützt keine Positionsanzeige.
   - What's unclear: ob "Folge X / Y" fachlich benötigt wird oder reines Nice-to-have war.
   - Recommendation: in der Planungsrunde (nicht in dieser Research-Phase) klären, bevor
     `useReleaseEditorNavigation`s Rückgabeform final festgelegt wird — die Antwort entscheidet,
     ob die Fassade zusätzlich `currentIndex`/`totalCount` mit zurückgeben muss.

2. **Fallback-Navigationskontext ohne jeden Hinweis (A1) — ist "project" wirklich die richtige
   Default-Wahl?**
   - What we know: alle 11 bekannten Einstiegspunkte liefern immer entweder `return_to` oder
     `animeId`+`episodeId`.
   - What's unclear: ob es reale Zugriffe ganz ohne Query-Parameter gibt (z. B. manuell
     eingegebene URL `/releases/42/edit` ohne jeden Zusatz).
   - Recommendation: Default auf "project" (konservativer, zeigt im Zweifel weniger statt
     potenziell falsche Nachbarn) belassen, aber als expliziten Testfall in der Validation
     Architecture führen (siehe unten), nicht stillschweigend offenlassen.

3. **Contract-Textkorrektur für den 404 in `contributions.yaml`/`openapi.yaml` — eigener Task
   oder Teil des D-05-Tasks?**
   - What we know: die Beschreibung ist nach dem Fix nicht mehr falsch, nur ungenau (deckt noch
     den jetzt nicht mehr existierenden Fall ab).
   - What's unclear: ob das Projekt eine separate Spur für reine Doku-Textkorrekturen pflegt
     oder das im selben Plan mit dem Code-Fix erledigt.
   - Recommendation: im selben Plan wie der D-05-Fix erledigen (ein Task, zwei Zeilen Text in
     zwei YAML-Dateien, kein Schema-Bruch).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Frontend-Framework | Vitest 3 (`frontend/vitest.config.ts`), bereits eingerichtet |
| Backend-Framework | Go `testing` + `testify` (`stretchr/testify`), bereits eingerichtet |
| Config-Datei (Frontend) | `frontend/vitest.config.ts` |
| Quick-Run (Frontend, betroffene Dateien) | `cd frontend && npx vitest run src/app/releases` (nach Verschieben) bzw. aktuell `src/app/admin/episode-versions src/app/me/releases` |
| Quick-Run (Backend, betroffene Pakete) | `cd backend && go test ./internal/handlers/... ./internal/repository/... -run "ProjectDetail"` |
| Full Suite (Frontend) | `cd frontend && npm test` (`vitest run`) |
| Full Suite (Backend) | `cd backend && go test ./...` |
| Typecheck | `cd frontend && npm run typecheck` (`tsc --noEmit`) — einziger verlässlicher, automatisierter Nachweis, dass ALLE Importpfad-Umzüge (Pitfall 4) vollständig sind |
| Lint | `cd frontend && npm run lint` (`eslint .`) |

### Decision → Test Map

| Decision | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|---------------------|--------------|
| D-01/D-04 | `/admin/episode-versions/42/edit?return_to=X` → 308 → `/releases/42/edit?return_to=X` (Query erhalten) | unit (Redirect-Regelwerk, kein Next.js-Server nötig) | `npx vitest run src/lib/releaseEditorRedirects.test.ts` | ❌ Wave 0 — neues Modul `releaseEditorRedirects.ts` + Test |
| D-01/D-04 | `/me/releases/42/workspace?tab=media` → 308 → `/releases/42/edit?tab=media` | unit | dieselbe Testdatei wie oben | ❌ Wave 0 |
| D-02 | Nicht-Admin mit nur `can_view_media=true` sieht ausschließlich den `media`-Tab, kein `files`/`changelog` | unit (`buildReleaseEditorTabIds`) | `npx vitest run src/app/releases/\[versionId\]/edit/releaseEditorTabs.test.ts` | ❌ Wave 0 |
| D-03 | `return_to=/me/projects/5/group/3` → `resolveNavigationContext` liefert `'project'`; `return_to=/admin/fansubs/5/edit` → `'episode'` | unit | `npx vitest run src/app/releases/\[versionId\]/edit/releaseEditorRouting.test.ts` | ❌ Wave 0 (Logik existiert bereits zweimal getrennt, siehe `EpisodeVersionEditorPage.tsx:71-93` und `workspaceHelpers.ts:26-30` als Testvorbilder) |
| D-05 | App-User ohne verifizierten `member_claims`-Eintrag, aber mit Platform-Admin-Flag → `GET /api/v1/me/projects/:animeId?fansub_group_id=:id` liefert 200 mit echten `release_versions`, nicht 404 | integration (echter `*pgxpool.Pool`, `testsupport.OpenPhase107Postgres`) | `go test ./internal/handlers/... -run TestGetMyProjectDetailGracefulWithoutMemberProfile` | ❌ Wave 0 — kein existierendes Testfile `contributions_me_project_handler_test.go` [VERIFIED: `find backend/internal/handlers -iname "*contributions_me_project*"` findet nur die Produktionsdatei] |
| D-05 (SQL-Ebene) | `GetMemberProjectDetail(ctx, memberID=0, appUserID, animeID, fansubGroupID)` gegen reale Fixture-Daten liefert `role_codes=[]`, aber korrekte `anime_title`/`release_versions`, kein `ErrNotFound` | integration (`testsupport.OpenPhase107Postgres`, dieselbe Fixture-Familie wie bereits für `contributions_me_handler`/`dashboard_me_handler` genutzt) | `go test ./internal/repository/... -run TestGetMemberProjectDetailWithSentinelMemberID` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** jeweils die betroffenen Vitest-/Go-Testdateien gezielt (`npx vitest run <pfad>`, `go test ./internal/handlers/... -run <Pattern>`)
- **Per wave merge:** volle Frontend-Suite (`npm test`) + volle Backend-Suite (`go test ./...`) + `tsc --noEmit` + `eslint .`
- **Phase gate:** alle vier grün, plus Live-UAT für Redirects/Tab-Sichtbarkeit/Navigation (explizite Pflicht laut CONTEXT.md, nicht durch Automatisierung ersetzbar)

### Wave 0 Gaps
- [ ] `frontend/src/lib/releaseEditorRedirects.ts` + Test — extrahierte, testbare Redirect-Regelliste für `next.config.mjs` (siehe Pattern 1, offene Design-Frage)
- [ ] `app/releases/[versionId]/edit/releaseEditorRouting.ts` + Test — vereinheitlichtes `getSafeReturnPath` + `resolveNavigationContext`
- [ ] `app/releases/[versionId]/edit/releaseEditorTabs.ts` + Test — `buildReleaseEditorTabIds`
- [ ] `backend/internal/handlers/contributions_me_project_handler_test.go` — existiert noch gar nicht, erster Test für diesen Handler überhaupt
- [ ] `backend/internal/repository/anime_contributions_member_project_repository_test.go` — Sentinel-`memberID`-Fall gegen reale Postgres-Fixture

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | nein (unverändert, `useAuthSession`/Bearer-Token bleibt wie heute) | — |
| V3 Session Management | nein | — |
| V4 Access Control | **ja** | Bestehender `permissions.CanForReleaseVersion` (Backend) bleibt alleinige Durchsetzung; Frontend-Tab-Sichtbarkeit (`buildReleaseEditorTabIds`) ist reine Darstellung, kein Access-Control-Mechanismus — PATCH-Endpunkt bleibt durch `isReleaseMetadataOnlyPatch` geschützt, unabhängig davon, welche Tabs das Frontend zeigt |
| V5 Input Validation | nein (keine neuen Eingabefelder, bestehende Formulare unverändert übernommen) | — |
| V6 Cryptography | nein | — |

### Known Threat Patterns for diese Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Client-seitige Tab-Sichtbarkeit wird mit echter Autorisierung verwechselt (z. B. ein Nicht-Admin manipuliert `?tab=files` direkt in der URL) | Elevation of Privilege | Bereits vorhandene Backend-Grenze bleibt unverändert: `isReleaseMetadataOnlyPatch` (`episode_version_update.go:92-99`) blockt `FansubGroups`/`MediaProvider`/`MediaItemID`/`StreamURL` im PATCH für Nicht-Admins mit 403, unabhängig vom angezeigten Tab. Die neue Seite darf den `files`-Tab-Inhalt zwar rendern, wenn `?tab=files` erzwungen wird (`visibleActiveTab`-Fallback-Logik übernehmen, siehe `EpisodeVersionEditorPage.tsx:241-249`), aber jeder Speicherversuch bleibt serverseitig blockiert |
| D-05-Sentinel-`memberID=0` wird versehentlich für eine echte Autorisierungsentscheidung verwendet statt nur für die Graceful-Datenanzeige | Elevation of Privilege | `memberID=0` wird AUSSCHLIESSLICH innerhalb von `GetMemberProjectDetail` zur Rollen-/Notizen-Abfrage verwendet (liefert dort bewusst "keine Rolle"/"keine eigenen Beiträge") — es fließt nirgendwo in eine Schreib-Autorisierung ein; `identity.AppUserID` (die echte, token-abgeleitete ID) bleibt für alle `has_own_media`-Vergleiche unverändert in Verwendung |
| Redirect-Ziel-Manipulation über `return_to` (Open-Redirect) | Tampering/Spoofing | Bereits bestehende, strikte Allowlist-Regex (`getSafeReturnPath`, nur `/admin/fansubs/\d+/edit` oder `/me/projects/\d+/group/\d+`, kein externes Protokoll/Host) bleibt unverändert übernommen — keine Lockerung bei der Zusammenführung |

---

## Sources

### Primary (HIGH confidence)
- `frontend/package.json` — Next.js `^16.1.6`, React `18.3.1` [VERIFIED]
- `frontend/next.config.mjs` — bestehende Konfiguration, keine `redirects()` bisher [VERIFIED]
- `frontend/src/app/admin/role-capabilities/page.tsx` + `page.test.tsx` — bestehendes
  Server-Component-Redirect-Muster mit Query-Parametern [VERIFIED]
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` (966
  Zeilen, vollständig gelesen) [VERIFIED]
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` (416
  Zeilen, vollständig gelesen) [VERIFIED]
- `frontend/src/app/me/releases/[versionId]/workspace/page.tsx` + `workspaceHelpers.ts`
  (vollständig gelesen) [VERIFIED]
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts` +
  `episodeNeighborNavigation.ts` + `EpisodeNavigationControls.tsx` [VERIFIED]
- `frontend/src/components/ui/Tabs.tsx`, `PageHeader.tsx`, `AdjacentNavigation.tsx` [VERIFIED]
- `backend/internal/handlers/contributions_me_project_handler.go` (vollständig gelesen) [VERIFIED]
- `backend/internal/handlers/dashboard_me_handler.go` (D-09-Graceful-Muster) [VERIFIED]
- `backend/internal/handlers/me_identity_helpers.go` (`resolveVerifiedMemberIDForAppUser`) [VERIFIED]
- `backend/internal/repository/anime_contributions_member_project_repository.go` (vollständig
  gelesen, `JOIN own_roles ON true`-Blocker identifiziert) [VERIFIED]
- `database/migrations/0044_add_db_schema_v2_target_tables.up.sql:128` — `members.id BIGSERIAL`
  bestätigt Sentinel-Sicherheit von `memberID=0` [VERIFIED]
- `shared/contracts/contributions.yaml:211-252` — bestehender 404-Vertrag für
  `GET /api/v1/me/projects/{animeId}` [VERIFIED]
- https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects (abgerufen
  2026-10-13, `lastUpdated: 2026-06-30`, Next.js `16.4.0`) — Query-Pass-through,
  Filesystem-Präzedenz, `permanent`/Statuscode-Semantik [CITED]
- `frontend/src/components/admin/AdminMainNav.tsx` — Modul-Scoping, das `/admin/episode-versions/...` bereits heute ausschließt [VERIFIED]

### Secondary (MEDIUM confidence)
— (keine; alle Kernaussagen dieser Phase waren direkt im Repo oder in der offiziellen Next.js-
Dokumentation verifizierbar)

### Tertiary (LOW confidence)
— keine unverifizierten Quellen verwendet.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — keine neuen Pakete, alle Versionen direkt aus `package.json` gelesen
- Architecture (Redirects): HIGH — offizielle, aktuelle Next.js-16-Dokumentation zitiert, exakt
  passendes Standardbeispiel gefunden
- Architecture (Navigation/Tabs/Dateiaufteilung): HIGH — jeder Baustein existiert bereits
  lauffähig im Repo, nur die Zusammensetzung ist neu
- D-05-Backend-Fix: HIGH — Blocker im SQL-Code direkt gelesen und durch
  `BIGSERIAL`-Migrationsbeleg abgesichert; kein Rätselraten nötig
- Pitfalls (Einstiegspunkt-Inventur-Korrektur, AdminMainNav-Entwarnung): HIGH — beide per
  gezieltem `grep` über den gesamten `frontend/src`-Baum verifiziert, nicht nur stichprobenhaft

**Research date:** 2026-10-13
**Valid until:** ~30 Tage (reine Binnen-Architektur-Phase ohne externe Abhängigkeiten, die sich
schnell ändern könnten — die Next.js-Dokumentations-Zitate sind an Next.js `16.4.0` gebunden, bei
einem größeren Next.js-Versionssprung vor Planungsbeginn erneut prüfen)
