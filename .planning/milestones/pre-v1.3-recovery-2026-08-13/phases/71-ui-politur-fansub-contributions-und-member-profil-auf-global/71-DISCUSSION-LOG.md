# Phase 71: UI-Politur Fansub-Contributions und Member-Profil auf globales Design-System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 71-ui-politur-fansub-contributions-und-member-profil-auf-global
**Areas discussed:** Permission-Bruecke, Credits-IA & Benennung, Anzeige vs. Bearbeiten, ESLint-Guard & Umfang, Mitwirkende-Editier-Einstieg, Rollen-Timeline, Benennungs-Reichweite, Mitwirkende Empty-State, Badge-Optik, Mitwirkenden-Sortierung, Medienbild Aspect-Ratio, Alte Tab-Deeplinks

---

## Permission-Bruecke — Umfang

| Option | Description | Selected |
|--------|-------------|----------|
| Nur dokumentieren | SC2 verlangt woertlich "geklaert und dokumentiert"; keine Grant-UI, entkoppelt Permission-Feature | ✓ |
| Modell + UI-Hook bauen | UI schlaegt beim Credit-Anlegen sofort separaten Grant vor; zieht Backend-Arbeit in UI-Phase | |
| Komplett verschieben | Permission-Bruecke ganz aus P71 herausnehmen | |

**User's choice:** Nur dokumentieren
**Notes:** Haelt die UI-Politur-Phase schlank; Umsetzung als eigene Phase.

## Permission-Bruecke — Modell

| Option | Description | Selected |
|--------|-------------|----------|
| Vorschlag + expliziter Grant | Optionaler Vorschlag, separater, explizit bestaetigter, widerrufbarer Grant; Credit bleibt Attribution | ✓ |
| Nur manueller Grant, kein Vorschlag | Komplett getrennte Workflows, keine Verknuepfung | |
| Nur fuer bestimmte Rollen vorschlagen | Grant-Vorschlag nur bei handlungsrelevanten Rollen | |

**User's choice:** Vorschlag + expliziter Grant ("Bruecke statt Vermischung")
**Notes:** Baut auf Phase-69-Entscheidung Credit != Permission auf.

---

## Credits-IA

| Option | Description | Selected |
|--------|-------------|----------|
| Tab aufloesen, Credits integrieren | "Anime-Beitraege"-Tab entfaellt; Credits in "Anime & Veroeffentlichungen" | ✓ |
| Tabs behalten, nur verlinken | Beide Tabs bleiben, Verlinkung | |
| Integrieren + Tab als Verknuepfung lassen | Integrieren, alter Tab als Sprungmarke | |

**User's choice:** Tab aufloesen, Credits integrieren

## Benennung

| Option | Description | Selected |
|--------|-------------|----------|
| Mitwirkende | Passt zu oeffentlich "X Mitwirkende", deutsch | ✓ |
| Credits | Kuerzer, fachsprachlich, aber Anglizismus | |
| Team & Rollen | Betont Rollenstruktur, laenger | |

**User's choice:** Mitwirkende

## Platzierung

| Option | Description | Selected |
|--------|-------------|----------|
| Anime-weit + optional pro Version | Folgt Phase-67-D-10 "global zuerst", kein Datenmodell-Umbau | ✓ |
| Nur pro Release-Version | Strikt an Version gekoppelt | |
| Du entscheidest beim Planen | Planner legt fest | |

**User's choice:** Anime-weit + optional pro Version

---

## Anzeige vs. Bearbeiten — Badge-Verwaltung

| Option | Description | Selected |
|--------|-------------|----------|
| Nach /me/profile | Sichtbarkeit im bestehenden Edit-Bereich; Profilseite zeigt nur an | ✓ |
| Owner-Edit-Modus auf der Profilseite | Expliziter Bearbeiten-Umschalter auf der Anzeigeseite | |
| Inline lassen, nur entschaerfen | "Ausblenden" bleibt, nur dezenter | |

**User's choice:** Nach /me/profile
**Notes:** /admin/my-groups ist bereits display-only/global-UI — nur Verifikation.

---

## Migrations-Umfang

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Phase-71-Flaechen | Begrenzt auf die 3 Todos; uebrige Altfaelle bleiben warn | ✓ |
| Alle Altfaelle projektweit | Alle ~17 native Elemente migrieren | |
| Phase-71-Flaechen + Inventur | Nur P71 migrieren, Rest inventarisieren | |

**User's choice:** Nur Phase-71-Flaechen

## Guard-Status

| Option | Description | Selected |
|--------|-------------|----------|
| Auf warn lassen | Anhebung erst nach vollstaendiger Migration | ✓ |
| Jetzt auf error anheben | Nur konsistent bei vollstaendiger Migration | |
| Du entscheidest beim Planen | Planner entscheidet | |

**User's choice:** Auf warn lassen

---

## Mitwirkende-Editier-Einstieg

| Option | Description | Selected |
|--------|-------------|----------|
| Button pro Anime + Modal | Aktion je Anime oeffnet bestehendes AnimeContributionModal | ✓ |
| Inline-Sektion pro Anime | Direkt aufgeklappt, kein Modal | |
| Drawer aus der Anime-Zeile | Globaler Drawer statt Modal | |

**User's choice:** Button pro Anime + Modal

## Rollen-Timeline

| Option | Description | Selected |
|--------|-------------|----------|
| Fix + Empty-State ausblenden | Styling fixen, bei fehlenden Rollen Sektion ausblenden | ✓ |
| Fix + erklaerender Empty-Text | Styling fixen, "Noch keine Rollen erfasst" zeigen | |
| Nur Styling-Fix | Empty-State dem Planner ueberlassen | |

**User's choice:** Fix + Empty-State ausblenden

## Benennungs-Reichweite

| Option | Description | Selected |
|--------|-------------|----------|
| Ueberall konsistent | Admin + oeffentliche Anime-/Gruppen-/Member-Profile + alle Zaehler | ✓ |
| Nur Admin + Anime-Seite | Oeffentliche Profile spaeter | |
| Du entscheidest beim Planen | Planner ermittelt alle Vorkommen | |

**User's choice:** Ueberall konsistent

## Mitwirkende Empty-State (oeffentlich)

| Option | Description | Selected |
|--------|-------------|----------|
| Sektion ausblenden | Keine Mitwirkende -> Sektion erscheint nicht | ✓ |
| "Noch keine Mitwirkenden" | Hinweistext sichtbar | |
| Nur fuer Admins sichtbar | Oeffentlich aus, Admins "ergaenzen"-Hinweis | |

**User's choice:** Sektion ausblenden

---

## Badge-Optik

| Option | Description | Selected |
|--------|-------------|----------|
| Icon + Farbe pro Badge-Code | lucide-react-Symbol + Farb-Variante je badge_code, Frontend-Mapping | ✓ |
| Nur Token-Angleichung, kein Icon | Chips nur an Badge-Tokens, weiter reiner Text | |
| Icon + Farbe + Kategorie-Gruppierung | Zusaetzlich nach badge_category gruppieren | |

**User's choice:** Icon + Farbe pro Badge-Code

## Badge-Upload-Idee

| Option | Description | Selected |
|--------|-------------|----------|
| Als Roadmap-Idee notieren | Custom-Artwork-Upload + Verwaltung als eigene Phase | ✓ |
| Verwerfen | Nicht notieren | |

**User's choice:** Als Roadmap-Idee notieren

---

## Mitwirkenden-Sortierung

| Option | Description | Selected |
|--------|-------------|----------|
| Nach Rolle, Lead zuerst | Rollen-Hierarchie, intern alphabetisch | ✓ |
| Alphabetisch nach Name | Neutrale Sortierung | |
| Du entscheidest beim Planen | Planner waehlt | |

**User's choice:** Nach Rolle, Lead zuerst

## Medienbild

| Option | Description | Selected |
|--------|-------------|----------|
| Feste Ratio + object-fit cover | Einheitliche Ratio, beide Dimensionen gesetzt, URL pruefen | ✓ |
| Natuerliches Seitenverhaeltnis | Originalproportionen, kein Crop | |
| Du entscheidest beim Planen | Planner waehlt | |

**User's choice:** Feste Ratio + object-fit cover

## Alte Tab-Deeplinks

| Option | Description | Selected |
|--------|-------------|----------|
| Ersatzlos entfernen | Tab-Key entfernen, Default-Fallback | ✓ |
| Auf "Anime & Veroeffentlichungen" umleiten | Alten Key abfangen + redirecten | |

**User's choice:** Ersatzlos entfernen

---

## Claude's Discretion

- Modal-/Drawer-Innengestaltung, Spacing/Token-Details der Primitive-Migration und genaue
  Icon-Auswahl pro badge_code — im Rahmen `@/components/ui` + `/dev/ui-system`.

## Deferred Ideas

- Custom-Badge-Artwork-Upload (SVG/PNG) + Badge-Verwaltungs-Oberflaeche — eigene Phase.
- Projektweite Migration aller ~17 nativen Altfaelle + ESLint-Guard `warn` -> `error`.
- Implementierung der Permission-Bruecke (Grant-Vorschlag-UI + Permission-Engine-Grant).
