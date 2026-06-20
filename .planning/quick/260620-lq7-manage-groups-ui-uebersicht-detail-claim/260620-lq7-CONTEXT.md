# Quick Task 260620-lq7: Manage-Groups-UI Claim-Copy verschlanken + nutzerfreundlich - Context

**Gathered:** 2026-06-20
**Status:** Ready for planning

<domain>
## Task Boundary

Die „Meine Gruppen"-Route (user-facing `/manage/groups`) und ihre Detailseite nutzerfreundlicher machen: die übertriebene, juristisch/technisch klingende Claim-/Rechte-/Historik-Copy aggressiv verschlanken und das UI ruhiger/intuitiver gestalten. Globales Design-System (`@/components/ui`) sicherstellen. Keine funktionalen Flows entfernen — nur Copy verschlanken und ggf. handgebautes Markup auf Primitives umstellen.
</domain>

<decisions>
## Implementation Decisions

### Scope (Seiten)
- **Übersicht + Detailseite.**
  - `frontend/src/app/admin/my-groups/page.tsx` (= user-facing `/manage/groups`, Übersicht)
  - `frontend/src/app/admin/my-groups/[id]/page.tsx` (Gruppen-Detail)
  - Zugehörige CSS-Module / lokale Komponenten dieser Seiten nach Bedarf.

### Copy-Härte
- **Aggressiv kürzen.** Erklärende Rechte-/Historik-/„Anspruch"-Sätze raus; nur knappe, freundliche Titel und Labels behalten. Konkrete Kandidaten zum Streichen/Kürzen (Übersicht):
  - „Gruppen, bei denen dein Konto aktiv mitwirkt oder historisch verknüpft ist. Historische Links sind Kontext und geben keine Rechte."
  - „Team4s lädt Mitgliedschaften, historische Links und Gruppenrechte." (Loading)
  - „Diese Werte werden aus eigenen Gruppen und historischen Links zusammengezogen." (Gruppenkontext)
  - „Direkte Wege zu deinem Profil und den Gruppen, für die aktive Rechte vorliegen." (Schnellzugriff)
  - „Nur Gruppen mit aktiven Rechten öffnen Detailbereiche. Historische Beteiligungen bleiben als Kontext sichtbar."
  - „Für diesen Account sind noch keine App-Mitgliedschaften oder historischen Gruppenlinks sichtbar." (Empty)
- Detailseite analog: Rechte-/Historik-/Berechtigungs-Jargon entschärfen, freundliche knappe Sprache.
- Funktionale Klarheit erhalten (Buttons/Aktionen bleiben verständlich), aber ohne erklärende Absätze und ohne juristischen Ton.

### Design-System
- Sicherstellen, dass `@/components/ui`-Primitives genutzt werden; handgebautes Markup für vorhandene Primitiv-Typen ersetzen. Reine Layout-Container (div Flex/Grid) bleiben erlaubt.
- Hinweis: Die Seiten nutzen Primitives bereits teilweise (Card/Badge/Button/SectionHeader/EmptyState/LoadingState/ErrorState) — Hauptarbeit ist Copy + UX-Politur, nicht zwingend ein voller Rebuild.

### Claude's Discretion
- Konkreter Wortlaut der gekürzten/freundlicheren Labels (knapp, neutral, korrekte Umlaute).
- Welche Layout-divs bleiben vs. durch Primitives ersetzt werden.
</decisions>

<specifics>
## Specific Ideas

- CLAUDE.md: `@/components/ui`-Primitives Pflicht; korrekte Umlaute ä/ö/ü/ß; Produktionsdateien ≤450 Zeilen.
- Bestehende Tests dieser Seiten (page.test.tsx falls vorhanden) müssen grün bleiben bzw. an Copy-Änderungen angepasst werden.
- Funktionalität (Gruppen öffnen, Release-Buttons, History-Bereich) NICHT verändern.
</specifics>

<canonical_refs>
## Canonical References

- `frontend/src/components/ui/` — Primitives; Route `/dev/ui-system` — Showcase
- CLAUDE.md „Sprachqualität" + „Frontend-UI (globales Design-System)"
</canonical_refs>
