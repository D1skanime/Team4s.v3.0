# Phase 112: Member-Punkt-Meilenstein-Badges - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 112 fügt zwei abgeleitete Badge-Familien in die (in Phase 110 gebaute) erweiterbare
„Auszeichnungen"-Sektion ein:

- **Typ 2 — Punkt-Meilensteine:** automatische Stufen aus der persistierten Gesamtpunktzahl
  (Phase 109), Gruppe „Fortschritt".
- **Typ 3 — Rollen-Volumen:** Bronze/Silber/Gold/Platin pro Rolle nach Anzahl der Release-
  Version-Credits in dieser Rolle; reiht sich in die „Rollen"-Gruppe neben den Typ-1-Einstieg.

Die rollenbezogenen **Einstiegs-Badges (Typ 1)** bleiben Phase 110. **Kein neuer Backend-
Buchungspfad** — sowohl Gesamtpunktzahl als auch Rollen-Credits existieren bereits als
`point_ledger_entries` (`release_role_work`). Typ 3 ist reine **Zähl-Projektion** über diese
Buchungen, gefiltert nach Rolle. Badge-Bilder liefert der Nutzer später — vorerst Platzhalter/
Dummy.

</domain>

<decisions>
## Implementation Decisions

### D-01 Punkt-Meilenstein-Badges (Schwellen = Stufen)
- Automatische Badges, abgeleitet aus der **Netto-Gesamtpunktzahl** (Phase 109 / `member_point_totals`).
- Die **Punktschwellen sind selbst die Stufen** — kein zusätzliches Bronze/Silber/Gold:

  | Punkte | Badge |
  |---|---|
  | 1 | Erster Beitrag |
  | 50 | Aktiver Mitwirkender |
  | 200 | Erfahrener Mitwirkender |
  | 500 | Engagierter Mitwirkender |
  | 1 000 | Veteran |
  | 2 500 | Archiv-Legende |

- **Eindeutig, keine zweite Bedingung:** 200 Punkte → „Erfahrener Mitwirkender".

### D-02 Live-Projektion (wie Typ 1)
- Rein abgeleitet aus der aktuellen Gesamtsumme; **keine Punkte fürs Haben** eines Badges.
- Fällt die Summe durch Storno unter eine Schwelle, **stuft das Badge zurück** (kein „einmal
  erreicht, bleibt für immer").

### D-03 Anzeige Typ 2
- **Nur der höchste erreichte Meilenstein** als aktueller Rang (Einzahl, passend zu „erhält den
  Badge") — keine Kette aller erreichten Stufen.
- Anzeigeort: Gruppe **„Fortschritt"** in der „Auszeichnungen"-Sektion (Phase 110).

### D-04 Typ 3 — Rollen-Volumen-Auszeichnungen
- **Basis: Anzahl der Release-Version-Credits pro Rolle** (nicht Episoden — die punktfähige
  Einheit ist die Release-Version). Aussage: „in N Releases in dieser Rolle dokumentiert" —
  ausdrücklich **keine** Gesamtpunktzahl.
- Datenquelle: dieselben `release_role_work`-Buchungen wie die Punkte, **gefiltert nach Rolle
  und gezählt** (netto: storniert zählt nicht). Es sind KEINE zusätzlichen/neuen Punkte — eine
  Quelle, zwei Sichten (Typ 2 summiert → Gesamtpunktzahl; Typ 3 zählt pro Rolle).
- **Stufen pro Rolle, einheitlich (an realen Fansub-Volumina geeicht, Referenz Cookie-Subs):**

  | Stufe | Release-Credits in der Rolle |
  |---|---|
  | Bronze | 12 |
  | Silber | 108 |
  | Gold | 320 |
  | Platin | 510 |

- **Live-Projektion:** Fällt die Zahl durch Storno unter eine Schwelle, **stuft das Badge zurück**.
- Gilt für **jede punktfähige Rolle**; keine hartcodierte Rollenliste.
- **Anzeige:** in der „Rollen"-Gruppe der „Auszeichnungen"-Sektion, **pro Rolle eine Zeile**, die
  Typ-1-Einstieg und Typ-3-Volumenstufe zusammenführt (z. B. „Übersetzung: Erste Übersetzung ·
  Gold · 320+").

### Claude's Discretion
- Exakte Badge-Codes/Labels/Icons/Palette im Stil des vorhandenen Katalogs
  (`memberBadgeLabels.ts`); Bronze/Silber/Gold/Platin-Farbgebung.
- Ob Meilenstein-/Volumen-Ableitung im Frontend aus geladenen Daten erfolgt oder ein schmaler
  Backend-Read sie mitliefert (für Typ 3 wird eine rollen-gefilterte Zählung der
  `release_role_work`-Buchungen gebraucht) — solange D-01…D-04 gelten.
- Badge-Bilder: vorerst Platzhalter/Dummy (Lucide-Icons), tauschbar ohne Logikänderung, da der
  Nutzer echtes Artwork nachliefert.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md` — Phase-112-Grenze.
- `.planning/REQUIREMENTS.md` — GAM-04 (Badges als getrennte, abgeleitete Projektion; keine
  Punkte für Selbstpflege).
- `.planning/phases/109-ranglisten-und-punkteprojektionen/109-CONTEXT.md` — persistierte
  Punktsumme (`member_point_totals`), Datenbasis der Meilensteine.
- `.planning/phases/110-member-badges-ranglisten-ui-und-e2e-abnahme/110-CONTEXT.md` — Profil-
  Badge-Sektion, Badge-Typ 1 (Abgrenzung), Platzhalter-Bild-Entscheidung.
- `./CLAUDE.md` — globale UI-Primitives Pflicht, Umlaute in user-facing Strings, 450-Zeilen-Limit.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/components/profile/MemberBadgeChain.tsx` + `memberBadgeLabels.ts` — vorhandene
  Badge-Anzeige/-Katalog; um die 6 Meilenstein-Einträge erweitern.
- Gesamtpunktzahl bereits verfügbar (Phase 109 / Phase-110-Hero) — direkt für die
  Schwellen-Ableitung nutzbar.

### Integration Points
- Phase 112 hängt an der Profil-Badge-Sektion aus Phase 110 — sinnvollerweise NACH 110 umsetzen.

</code_context>

<specifics>
## Specific Ideas

- Nutzer-Zitat: „Hier braucht es eigentlich kein zusätzliches Bronze, Silber und Gold. Die
  unterschiedlichen Punktgrenzen sind bereits die Stufen." / „Ein Benutzer mit 200 Punkten
  erhält eindeutig den Badge ‚Erfahrener Mitwirkender'."

</specifics>

<deferred>
## Deferred Ideas

- **Weitere Badge-Kategorien** (über Typ 1–3 hinaus) — vom Nutzer später der Reihe nach zu
  definieren. Dank der erweiterbaren „Auszeichnungen"-Sektion (110-CONTEXT D-04) andockbar ohne
  Umbau. Kandidaten: bereits vorhandene Katalog-Badges (`Gründungsmitglied`, `5+ Jahre Mitglied`,
  `Historische Leitung`, `Allrounder`, `Verifiziert`) nur einsortieren; neue Familien (z. B.
  Events/Saison, Moderation/Review) als eigene kleine Folgeschritte.
- **Echte Episoden-Granularität** für Typ 3 (statt Release-Versionen) — nur falls später
  gewünscht; braucht andere Datenbasis.

</deferred>

---

*Phase: 112-member-punkt-meilenstein-badges*
*Context gathered: 2026-07-27*
