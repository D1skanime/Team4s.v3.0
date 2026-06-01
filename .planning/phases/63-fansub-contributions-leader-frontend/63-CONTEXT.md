# Phase 63: Fansub Contributions Leader-Frontend — Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Moderierte Produktdiskussion (Fansub Contributions & Gruppenhistorie, 2026-06-01)
**Depends on:** Phase 62 (Admin-API)

<domain>
## Phase Boundary

Admin-Frontend für Fansub-Leader. Kein neues Design-System, keine neuen globalen Komponenten.
Bestehende Admin-UI-Patterns und bestehende Komponenten wiederverwenden.

Ziel: Leader kann Mitglieder, Rollen/Leader-Zeiträume und Anime-Contributions pflegen — so wenig Aufwand wie möglich.

**Kernprinzip:** Mitglieder werden EINMAL auf Gruppenebene eingetragen. Bei jedem Anime dann nur aus dieser Liste auswählen — kein erneutes Eingeben. Das ist der zentrale Effizienz-Gewinn für Gruppen wie Tomo-ni Fansubs mit 7+ Anime und 8+ Mitgliedern.

</domain>

<decisions>
## Implementation Decisions

### Tab-Navigation (LOCKED)

Die bestehende Fansub-Admin-Seite (z.B. `/admin/fansubs/[id]/edit`) bekommt neue Tabs:
```
Übersicht | Mitglieder | Rollen/Timeline | Anime-Beiträge | [spätere Tabs]
```

Kein eigenes neues Routing für diese Tabs — bestehende Tab-Komponente der Admin-UI nutzen.

### Kein neues Design-System (LOCKED)

- Bestehende MemberSelector-Komponente für App-User-Auswahl wiederverwenden
- Bestehende Role-Chips/Role-Select-Komponente wiederverwenden
- Bestehende Status-/Sichtbarkeits-Toggles wiederverwenden
- Bestehende Tabellen-/Listen-Patterns aus anderen Admin-Seiten übernehmen

### Mitglieder-Tab (LOCKED)

```
[Mitglieder-Tab]
  Liste aller Gruppenmitglieder (Name/Nick, Zeitraum, Status, App-User verknüpft ja/nein)
  [+ Mitglied hinzufügen]
    → Name / Nick (Freitext, kein App-User nötig)
    → Beitrittsjahr / Austrittsjahr (optional, nur Jahr)
    → App-User verknüpfen (optional, bestehender MemberSelector)
    → Status: aktiv / alumni
```

### Rollen/Timeline-Tab (LOCKED)

```
[Rollen/Timeline-Tab]
  Pro Mitglied: aufklappbare Rollen-Liste
  [+ Rolle hinzufügen]
    → Mitglied auswählen (Dropdown aus Gruppenmitgliedern)
    → Rolle (Dropdown: Founder, Leader, Co-Leader, Translator, ...)
    → Von [Jahr] bis [Jahr] (optional)
    → Quelle/Notiz (Freitext, optional)
    → Status: historisch / bestätigt
```

### Anime-Beiträge-Tab (LOCKED — Kerneffizienz)

```
[Anime-Beiträge-Tab]
  Liste aller Anime der Gruppe (aus bestehender anime_fansub_groups-Verknüpfung)
  Pro Anime: Anzahl Mitwirkende + [Bearbeiten]-Button
  
  [Bearbeiten]-Modal/Drawer:
    → Multi-Select: Mitglieder aus Gruppenmitglieder-Liste (KEIN Freitext)
    → Pro Mitglied: Rollen-Chips (Mehrfachauswahl, bestehende Komponente)
    → Sichtbarkeit: intern / auf Anime-Seite / im Member-Profil
    → Status: Entwurf / Bestätigt
    → [Speichern]
```

**Wichtig:** Kein Bulk-Edit im MVP. Aber Multi-Select bei Mitgliederzuweisung pro Anime ist MVP.

### Sichtbarkeit und Status (LOCKED)

Beide Felder sind pro Contribution einstellbar. Defaults:
- `is_public_on_anime_page = false`
- `is_public_on_member_profile = false`
- `status = draft`

Leader muss explizit auf "öffentlich" und "bestätigt" setzen.

### Code-Wiederverwendung (LOCKED)

Vor dem Schreiben jeder neuen Komponente: bestehende Admin-Seiten prüfen (Fansub-Admin, Member-Admin, Release-Admin) ob eine ähnliche Komponente bereits existiert.

Neue Komponenten dürfen erstellt werden, wenn keine passende Vorlage existiert — aber nicht mit globalen Abstraktionen, die andere Admin-Seiten nicht brauchen.

### Dateigröße (LOCKED)

Max 450 Zeilen pro Datei (CLAUDE.md). Größere Tabs müssen in Unterkomponenten aufgeteilt werden.

### Fehlerzustände (LOCKED)

Jeder Tab hat einen leeren Zustand mit erklärendem Text:
- Mitglieder-Tab leer: "Noch keine Mitglieder eingetragen. Füge das erste Mitglied hinzu."
- Rollen-Tab leer: "Noch keine Rolleneinträge vorhanden."
- Anime-Tab: Anime ohne Mitwirkende zeigen "(keine Mitwirkenden eingetragen)"

### Sprache (LOCKED)

Alle user-facing Strings auf Deutsch mit korrekten Umlauten (ä, ö, ü, Ä, Ö, Ü, ß). Keine ASCII-Ersetzungen.

### Claude's Discretion

- Genaue Dateistruktur der neuen Tab-Komponenten (analog zu bestehenden Admin-Tabs)
- Ob Modal oder Drawer für Anime-Contribution-Bearbeitung (bestehenden Stil prüfen)
- Exakte API-Hook-Implementierung (analog zu bestehenden Admin-Seiten)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MÜSSEN diese Dateien lesen, bevor sie planen oder implementieren.**

### Phase 62 API (Routen für diese Phase)
- `.planning/phases/62-fansub-contributions-admin-api/62-CONTEXT.md` — alle Routen und Request/Response-Strukturen

### Bestehende Admin-Seiten als Pattern-Referenz
- `frontend/src/app/admin/fansubs/` — bestehende Fansub-Admin-Seite und Tabs
- `frontend/src/components/` — bestehende wiederverwendbare Komponenten
- `frontend/src/lib/api.ts` — bestehende API-Calls

### Projektkonventionen
- `CLAUDE.md` — max 450 Zeilen, korrekte Umlaute, bestehende UI-Patterns

</canonical_refs>

<specifics>
## Specific Ideas

### Anime-Beiträge-Tab Leerstand

Wenn eine Gruppe Anime hat aber noch keine Contributions eingetragen wurden:
```
[Death Note]
  Keine Mitwirkenden eingetragen  [Bearbeiten]

[Naruto Shippuuden]
  3 Mitwirkende eingetragen       [Bearbeiten]
```

### Rollen-Timeline visuell

Die Rollen/Timeline zeigt Leader-Wechsel als chronologische Liste, nicht als Tabelle:
```
2001–2005  Sora     Gründer/in, Leader
2006–2009  Mika     Leader
2007–2008  Nora     Co-Leader
```

Keine SVG-Timeline — einfache strukturierte Liste ist ausreichend für MVP.

</specifics>

<deferred>
## Deferred Ideas

- NFO/Textlisten-Import — Phase 65 oder später
- Bulk-Edit für alle Anime gleichzeitig — Post-MVP
- Vorschläge-Review-Tab — Phase 65
- Einladungslinks für historische Members — Phase 66

</deferred>

---

*Phase: 63-fansub-contributions-leader-frontend*
*Context gathered: 2026-06-01 aus moderierter Produktdiskussion*
