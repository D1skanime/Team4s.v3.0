# Phase 64: Fansub Contributions Member-Dashboard & Public Pages — Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Moderierte Produktdiskussion (Fansub Contributions & Gruppenhistorie, 2026-06-01)
**Depends on:** Phase 63 (Leader-Frontend)

<domain>
## Phase Boundary

Zwei getrennte Bereiche:

1. **Member-Dashboard** `/me/...`: Member sieht eigene Contributions, kann bestätigen/ablehnen und Sichtbarkeit steuern.
2. **Public Pages**: Öffentliche Timelines auf Gruppen-Profil, Member-Profil und Anime-Seite. Einfache abgeleitete Badges.

Kein neues Backend in dieser Phase — alle Routen wurden in Phase 62 gebaut.

</domain>

<decisions>
## Implementation Decisions

### Member-Dashboard (LOCKED)

Bereich "Meine Beiträge" auf `/me/...` (bestehende Member-Dashboard-Seite erweitern, nicht neu erstellen):

```
Bestätigte Beiträge (N)
  → Karte: Anime-Titel, Gruppe, Rollen-Chips, [Sichtbarkeit ▾]

Ausstehend — noch nicht bestätigt (N)
  → Karte: Anime-Titel, Gruppe, Rollen-Chips, eingetragen von: Leader X
  → [Bestätigen] [Ablehnen] [Rolle melden]

Eigene Vorschläge (N)
  → (leer im MVP — kommt in Phase 65)
```

Bei "Ablehnen": Eintrag bleibt intern erhalten, `is_public_on_member_profile = false`. Der Leader sieht: "Mitglied X hat abgelehnt."
Bei "Bestätigen": Eintrag bleibt wie er ist, Member kann danach Sichtbarkeit steuern.

### Sichtbarkeits-Steuerung (LOCKED)

Pro bestätigter Contribution: Dropdown `[Öffentlich ▾]` mit Optionen:
- Öffentlich im Member-Profil
- Nur intern sichtbar

Das steuert `is_public_on_member_profile`. Kein Einfluss auf `is_public_on_anime_page` (das steuert der Leader).

### Public Gruppenprofil (LOCKED)

Bestehende Gruppenprofil-Seite `/fansubs/[slug]` (falls vorhanden) oder neue Route erweitern.

```
[Gruppen-Header: Logo, Name, Aktiv 2001–2009]
[Badges: Gründungsgruppe · 500+ Episoden]

Leader-Timeline
  2001 ─── Sora (Gründer/in, Leader)
  2006 ─── Mika übernimmt Gruppenleitung
  2009 ─── Gruppe inaktiv

Anime-Projekte (N)
  [Anime-Kacheln]

Mitglieder (N)
  [Avatar-Reihe]
```

Leader-Timeline ist das wichtigste Element — muss prominent ganz oben stehen.
Unverifizierte Einträge mit kleinem `(historisch)`-Label.

### Public Member-Profil (LOCKED)

Bestehende Member-Profil-Seite `/members/[slug]` (wurde in Phase 59 gebaut) um Contributions-Bereich erweitern:

```
[bestehender Hero-Bereich aus Phase 59]

Rollen-Timeline
  2001  SubStars — Gründer/in, Leader
  2004  Anime: Death Note — Projektleitung
  2006  Gruppenleitung an Mika übergeben

⚠ Einige Angaben historisch ungeprüft
```

**Wichtig:** Die bestehenden Phase-59-Komponenten (`MemberProfileHero`, etc.) bleiben unberührt. Nur ein neuer Abschnitt wird hinzugefügt.

### Public Anime-Seite (LOCKED)

Bestehende Anime-Detailseite um Contributions-Bereich erweitern:

```
Fansub-Releases

SubStars                    Aktiv: 2004–2006
─────────────────────────────────────────────
Mitwirkende:
  Lisa      [Übersetzung] [Editing]
  Sora      [Projektleitung]
  (1 weiteres Mitglied — nicht öffentlich)
```

Rollen als kleine Chips. Nicht öffentliche Members werden aggregiert ("N weitere nicht öffentlich") — sie werden NICHT namentlich genannt.

### Badges (LOCKED)

Drei abgeleitete Badges im MVP:

| Badge-Code | Ableitung |
|---|---|
| `founding_member` | `hist_fansub_group_members.joined_year = fansub_groups.founded_year` |
| `historical_leader` | `hist_group_member_roles.role_code IN ('leader', 'founder')` vorhanden |
| `long_term_member` | `left_year - joined_year >= 5` oder `joined_year` vorhanden und `left_year` NULL |

Badges werden beim Speichern von Contributions/Rollen durch den Backend-Service berechnet und in `member_badges` gespeichert (`badge_category = 'historical_achievement'`).

Member kann jeden Badge ausblenden (`visibility = 'hidden'`).

Badges erscheinen im Member-Profil als kleine Label-Chips. Kein eigener Badge-Tab im MVP.

### Nicht verifizierte Angaben (LOCKED)

Historisch ungeprüfte Einträge (`status = 'historical'` oder unverifizierter Member) werden mit `(historisch)` in kleinerer Schrift markiert. Kein roter Warnkasten — nur sanfte Kennzeichnung.

### Progressive Disclosure (LOCKED)

Public-Seiten zeigen zuerst den kompakten Überblick. Detailansicht (z.B. vollständige Mitgliederliste) hinter "Alle anzeigen"-Link.

### Sprache (LOCKED)

Alle user-facing Strings auf Deutsch mit korrekten Umlauten.

### Claude's Discretion

- Ob Badge-Berechnung im Handler oder in einem eigenen Badge-Service erfolgt
- Genaue Dateistruktur der neuen Abschnitte (analog zu bestehenden Profil-Komponenten aus Phase 59)
- Performance: ob Contributions für öffentliche Seiten gecacht werden (Redis) oder direkt aus DB

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MÜSSEN diese Dateien lesen, bevor sie planen oder implementieren.**

### Phase 62 API (Routen für diese Phase)
- `.planning/phases/62-fansub-contributions-admin-api/62-CONTEXT.md` — Public-Routen und Me-Routen

### Phase 59 Member-Profil (wird erweitert, nicht ersetzt)
- `.planning/phases/59-ffentliches-fansub-member-profil/` — bestehende Member-Profil-Komponenten

### Phase 61 Datenmodell (für Badge-Ableitungslogik)
- `.planning/phases/61-fansub-contributions-datenmodell/61-CONTEXT.md` — member_badges Tabellenstruktur

### Bestehende Komponenten
- `frontend/src/components/profile/` — Profil-Komponenten aus Phase 59
- `frontend/src/app/members/` — bestehende Member-Routen
- `frontend/src/app/fansubs/` (falls vorhanden) — Gruppen-Public-Seite

### Projektkonventionen
- `CLAUDE.md` — max 450 Zeilen, korrekte Umlaute

</canonical_refs>

<specifics>
## Specific Ideas

### Badge-Chip-Design

```
★ Gründungsmitglied    (badge_code: founding_member)
♦ Historischer Leader  (badge_code: historical_leader)
◆ 5+ Jahre Mitglied    (badge_code: long_term_member)
```

Einfache Inline-Chips, keine eigene Badge-Seite.

### Leerer Zustand Member-Profil (wenn keine Contributions)

```
Noch keine Contributions eingetragen.
Du warst früher in einer Fansub-Gruppe aktiv?
Bitte deinen ehemaligen Leader, dich einzutragen.
```

### Leerer Zustand Gruppenhistorie

```
Noch keine Gruppenhistorie eingetragen.
Als Leader kannst du die Historie unter [Gruppen-Admin] pflegen.
```

</specifics>

<deferred>
## Deferred Ideas

- Vorschläge-Sektion im Member-Dashboard ("Beitrag vorschlagen") — Phase 65
- Claiming-Banner im Member-Profil — Phase 66
- Vollständige Badge-Engine mit mehr Badge-Typen — Phase 68
- Gruppen-Medien-Upload (alte Screenshots, Logos) — Phase 68

</deferred>

---

*Phase: 64-fansub-contributions-member-dashboard-public-pages*
*Context gathered: 2026-06-01 aus moderierter Produktdiskussion*
