# Phase 112: Member-Punkt-Meilenstein-Badges - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 112 zeigt **automatische Punkt-Meilenstein-Badges** auf Basis der persistierten
Gesamtpunktzahl (Phase 109). Ausschließlich **Badge-Typ 2 (Punkt-Meilensteine)** — die
rollenbezogenen Einstiegs-Badges (Typ 1) bleiben Phase 110.

Kein neuer Backend-Buchungspfad; die Punktsumme existiert bereits. Anzeige in der bestehenden
Profil-Badge-Sektion (`MemberBadgeChain`, aus Phase 110). Badge-Bilder liefert der Nutzer
später — vorerst Platzhalter.

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

### D-03 Anzeige (OFFEN — vom Nutzer zu bestätigen)
- **Vorschlag/Default:** nur der **höchste erreichte Meilenstein** als aktueller Rang (Einzahl,
  passend zu „erhält den Badge"). Alternative: alle bisher erreichten als Kette.
- Anzeigeort: bestehende Profil-Badge-Sektion (`MemberBadgeChain`), kein neuer UI-Ort.
- Badge-Bilder später vom Nutzer; vorerst Platzhalter/Dummy (Lucide-Icons), tauschbar ohne
  Logikänderung.

### Claude's Discretion
- Exakte Badge-Codes/Labels/Icons/Palette im Stil des vorhandenen Katalogs
  (`memberBadgeLabels.ts`).
- Ob die Meilenstein-Ableitung im Frontend aus der bereits geladenen Punktzahl erfolgt oder ein
  schmaler Backend-Read sie mitliefert — solange D-01/D-02 gelten.

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

- Weitere Badge-Typen (3+) — vom Nutzer später zu definieren.
- Endgültige Anzeige-Variante (höchster Meilenstein vs. Kette) — als D-03 offen, kurz zu
  bestätigen.

</deferred>

---

*Phase: 112-member-punkt-meilenstein-badges*
*Context gathered: 2026-07-27*
