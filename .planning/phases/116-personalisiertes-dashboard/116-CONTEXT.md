# Phase 116: Personalisiertes Dashboard (eingeloggter Landing-Hub) - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning (nach 109–115)

<domain>
## Phase Boundary

Belebt den deaktivierten Nav-Eintrag **„Dashboard"** (`AppShell.tsx:123`, eingeloggtes Shell) mit
einer **read-only, personalisierten Startseite** für eingeloggte User — ein **Cockpit**, das
bereits vorhandene Daten **bündelt und verlinkt**.

**Bewusst NICHT:** keine eigene Datenhaltung/Persistenz, **kein Editieren** (das bleibt die
Verwaltungs-Konsole `/me/profile`), kein eigenes Such-UI (verlinkt nur auf Phase 115). Reiner
Aggregations-/Absprung-Hub.

**Reihenfolge:** Als Integrations-Hub verlinkt/aggregiert 116 fast alles andere → kommt **nach
109–115**, sonst zeigen Absprünge/Fortschritt ins Leere.

</domain>

<decisions>
## Implementation Decisions

### D-01 Abgrenzung Dashboard vs. `/me/profile`
- **`/me/profile` = Edit-Konsole** (Avatar/Hintergrund, Story, Sichtbarkeit, Badge-Freigabe,
  Member-Claim, Account/Security — Formulare/Uploads). **Dashboard = read-only Cockpit** (Zahlen,
  Status, Absprünge). Keine Doppelung: das Dashboard **verlinkt** nur, ändert nichts.

### D-02 „Braucht deine Aufmerksamkeit" (oben, prominent)
- Zeigt **kürzlich neu zugewiesene Projekte/Releases** (Member in einer Rolle) mit **Direktlink
  zur Arbeitsfläche** (Release-Besetzung / Projekt), neueste zuerst, dezente „neu"-Markierung.
- **Variante A (zeitbasiert, gewählt):** „neu" = Zuweisung innerhalb der letzten X Tage. Nutzt die
  vorhandenen Zeitstempel der Besetzungs-/Contribution-Daten → **kein Backend-Zusatz**. Nachteil:
  „neu" = „kürzlich", verschwindet nicht durchs Ansehen.
- **Variante B (echtes „ungelesen", `last_seen`/„gesehen"-Marker) ist deferred** — späterer Ausbau.
- Research verifiziert, dass die Zuweisungs-Zeitstempel für Variante A wirklich ausreichen.

### D-03 Kennzahlen (5 Kacheln)
- **Punkte** (aus 109), **Badges** (Anzahl), **Projekte** (Anzahl), **hochgeladene Bilder**,
  **geschriebene Beiträge**. Letzte zwei sind zugleich die Zähler hinter den Bildarchivar-/
  Chronist-Badges (Phase 113). Beitragszahl via `previous_contributions_count` bereits nachweisbar;
  Bilder-Zahl im Research verifizieren.

### D-04 Fortschritt je Badge-Kategorie (Tabelle)
- Pro Badge-Familie **„aktuelle Stufe · noch X bis nächste Stufe"**: Punkte-Meilenstein (Typ 2),
  Rollen-Volumen je Rolle (Typ 3), Bildarchivar/Chronist/dok. Projekte (Phase 113) …
- **Konsument** der Schwellen aus **Phase 112 (Typ 2/3)** und **113** — 116 definiert keine
  Schwellen selbst.

### D-05 Meine Gruppen
- Liste der Gruppen, in denen der User Mitglied ist (+ Rollenkontext), mit **Links** zu den
  Gruppen. Nutzt die vorhandene „Meine Gruppen"-Datenquelle (AppShell rendert sie bereits).

### D-06 Schnellzugriffe
- **Anime entdecken (`/anime`, erster)**, **Rangliste**, **Fansub-Gruppen (114)**,
  **Suche (→ 115-Suchseite `/suche`, fokussiertes leeres Suchfeld)**, **Mein Profil**.
- Nur Absprünge, kein eigenes UI.

### D-07 UI
- Globales UI-System Pflicht (`@/components/ui`), responsiv, barrierefrei, keine neue Designsprache.

### Claude's Discretion
- Genaue Kachel-/Sektions-Anordnung, Fenster „letzte X Tage" für Variante A, Tabellen-Layout.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` — Phase-116-Grenze + Depends-on 109–115.
- `.planning/phases/109-…/109-CONTEXT.md` (Punkte), `110-…`, `112-…`, `113-…` (Badges + Schwellen),
  `114-…` (Gruppen-Übersicht), `115-…` (Suche) — 116 konsumiert deren Ergebnisse.
- `./CLAUDE.md` — globales UI-System Pflicht, Umlaute, 450-Zeilen-Limit.

</canonical_refs>

<code_context>
## Existing Code Insights (Startpunkte — zu verifizieren)

- `frontend/src/components/layout/AppShell.tsx` — toter „Dashboard"-Eintrag (Z. 123);
  „Meine Gruppen"-Nav-Datenquelle (Z. 156) für D-05.
- `frontend/src/app/me/profile/…` — Edit-Konsole (Abgrenzung D-01); zeigt bereits Badges +
  letzte Beiträge/Medien (nicht doppeln, nur verlinken).
- `frontend/src/lib/api.ts` — `getOwnProfile`, `getMyBadges`, `getMyMemberClaim`,
  `getWatchlist` (Watchlist deferred), `getMemberPointRanking`.
- `frontend/src/app/members/[slug]/page.tsx` — `previous_contributions_count` (Beitragszahl),
  RecentMedia (Bilderquelle) als Vorlage für die Kennzahlen.
- Release-Besetzung/Contributions (`release_crew`, `anime_contributions`) mit Zeitstempeln →
  Basis für D-02 Variante A.

</code_context>

<specifics>
## Specific Ideas

- Mockup abgestimmt (v2): 5 Kennzahlen, „Fortschritt je Kategorie"-Tabelle, „Meine Gruppen",
  Schnellzugriffe inkl. „Anime entdecken" zuerst; Watchlist entfernt.
- Kernnutzen über `/me/profile` hinaus: „Braucht deine Aufmerksamkeit", Kategorie-Fortschritt,
  Discovery-Absprünge als Login-Landing.

</specifics>

<deferred>
## Deferred Ideas

- **Variante B** (echtes „ungelesen" via `last_seen`/„gesehen"-Marker) für neue Zuweisungen.
- **Watchlist**-Sektion (Feature existiert, `getWatchlist`) — vorerst raus.
- **„Neueste Releases" / „zuletzt aktualisierte Animes"**-Sektion (eigene Datenabfrage).
- **Globale Benachrichtigung** (Glocke/Zähler am Nav) — eigene spätere Phase.

</deferred>

---

*Phase: 116-personalisiertes-dashboard*
*Context gathered: 2026-07-28*
