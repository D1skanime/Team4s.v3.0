# Phase 83: Pro-Release-Mitwirkenden-Zuordnung (release_version_id) im Cockpit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 83-pro-release-mitwirkenden-zuordnung-release-version-id-im-coc
**Areas discussed:** Permissions-Kopplung, Cockpit-Einstieg & Scoping (inkl. Absenz-Modellierung & Rollen-Override)

---

## Todo-Folding (cross_reference_todos)

| Todo | Gefoldet |
|------|----------|
| Credits-UI konsolidieren + Permission-Brücke (Design) | ✓ |
| Contribution-UI auf @/components/ui-Primitives umstellen | ✓ |
| Member-Profil-Seite UI + params.id-Bug | (nicht gefoldet — separater Bereich) |

---

## Permissions-Kopplung

| Option | Description | Selected |
|--------|-------------|----------|
| Reine Credit-Anzeige | anime_contributions bleibt Attribution; CanForReleaseVersion unverändert (gruppenbasiert) | |
| Mapping steuert Rechte | Pro-Release-Rollen-Zuordnung fließt in Edit-Rechte ein | ✓ |
| Credit + optionale separate Brücke | Mapping = Credit; zusätzlich expliziter, widerrufbarer Grant | |

**User's choice:** Mapping steuert Rechte.
**Notes:** Mentales Modell des Nutzers ausführlich erklärt: Projektebene = Default für alle Releases (Credit + Recht); pro Release kann der Leader abweichen (Person raus / Rollen anders), dann gilt für genau dieses Release nur der abweichende Satz, andere Releases bleiben beim Projekt-Team.

### Auflösung Release-Rolle vs. Gruppen-Rolle

| Option | Description | Selected |
|--------|-------------|----------|
| Release-Rolle ersetzt | Bei explizitem Release-Satz gilt nur dieser | (zwischenzeitlich gewählt, dann neu aufgerollt) |
| Release-Rolle additiv | Release-Rollen zusätzlich zu Gruppen-Rollen | |
| Default anime-weit, Override pro Release | Ohne Override gilt Projekt-Default; expliziter Release-Satz übersteuert nur dort | ✓ |

**User's choice:** Default anime-weit (Projektebene), Override pro Release ersetzt nur dort.
**Notes:** Nutzer hatte sich bei der ersten Runde verklickt und beide Permissions-Fragen neu diskutiert. Endmodell per Freitext bestätigt: „nur für die eine Releaseversion gilt das … für Episode 2 ist wieder das Projekt-Team".

### Absenz „nicht dabei" → Rechte

| Option | Description | Selected |
|--------|-------------|----------|
| Verliert Rechte für dieses Release | Ausschluss aus Release-Roster entzieht Edit-Rechte dort | ✓ |
| Behält Rechte (nur Credit weg) | Nur Anzeige entfernt, Rechte über Gruppen-Rolle bleiben | |

**User's choice:** Verliert Rechte — aber nur für dieses Release; andere Releases unberührt.

### App-Member ohne Projekt-Contribution

| Option | Description | Selected |
|--------|-------------|----------|
| Keine Edit-Rechte ohne Contribution | Contribution = alleinige Wahrheit; reine Gruppen-Mitgliedschaft reicht nicht | ✓ |
| Gruppen-Rolle bleibt Baseline | Grund-Rechte aus Gruppen-Rolle, Contributions additiv | |
| Gruppen-Rolle nur für Leadership | Nur Leads behalten Gruppen-Rollen-Rechte | |

**User's choice:** Keine Edit-Rechte ohne Contribution.
**Notes (Freitext):** „jemand, der einfach nur die Rolle hat, ein Member der Fansub-Gruppe ist, aber nicht dem Projekt zugeordnet ist, kann da auch nichts schreiben oder hochladen oder machen."

### Leader-Kante

| Option | Description | Selected |
|--------|-------------|----------|
| Leader immer ausgenommen | Leadership behält Verwaltungs-/Edit-Rechte ohne eigene Contribution | ✓ |
| Auch Leader muss gemappt sein | Strikt: selbst Leader braucht Contribution | |

**User's choice:** Leader immer ausgenommen.
**Notes (Freitext):** Leader kann in seiner Gruppe immer alles bearbeiten/steuern/moderieren (alle Beiträge ansehen/editieren/löschen). Projektleiter wird pro Projekt angesetzt (oft Leader selbst). Löschen durch Leader = Soft-Delete; physisch löschen nur Plattform-Admin.

---

## Cockpit-Einstieg & Scoping

### Editor-Ort

| Option | Description | Selected |
|--------|-------------|----------|
| Inline im Cockpit (aufklappen) | Mitwirkenden-Block je Release im aufgeklappten Projekt | |
| Im Release-/Version-Editor | Override im episode-versions/[versionId]/edit | |
| Beides: Übersicht + Tiefe | Cockpit-Status-Übersicht + voller Editor | ✓ |

**User's choice:** Übersicht + Tiefe, mit konkreter Drawer-Vorstellung.
**Notes (Freitext):** Klick auf „Mitwirkende" bei Episode 2 → rechts Panel: „Vom Projekt geerbtes Team" oben, darunter Rollen für genau diese Episode; pro Rolle Person mit Entfernen/Neu-Vergeben; Person aus Fansub-Gruppe hinzufügen + Rolle geben; Rolle umhängen erst nach Entfernen; unten Speichern/Abbrechen.

### Override-Modell (Materialisierung)

| Option | Description | Selected |
|--------|-------------|----------|
| Expliziter Roster-Snapshot | Geerbtes Team beim Override „eingefroren"; Projekt-Änderungen erreichen Release nicht mehr | ✓ (sinngemäß) |
| Nur Abweichungen (Deltas) | Nur Diffs gespeichert; Rest erbt live | |

**User's choice (Freitext):** „nur für die eine Releaseversion gilt das … für Episode 2 ist wieder das Projekt-Team." → Override = eigener Satz pro Release; nicht-überschriebene Releases ziehen mit dem Projekt-Team. Storage-Detail (Snapshot vs. Delta) an Researcher/Planner delegiert, solange das Verhalten erfüllt ist.

### Rollen-Anzahl pro Release

| Option | Description | Selected |
|--------|-------------|----------|
| Mehrere pro Rolle erlaubt | z.B. zwei Übersetzer; passt zu anime_contribution_roles | ✓ |
| Rolle exklusiv (eine Person) | Jede Rolle genau einer Person; Umhängen erst nach Entfernen | |

**User's choice:** Mehrere pro Rolle erlaubt.

### Kandidaten-Pool (Collab-Scoping)

| Option | Description | Selected |
|--------|-------------|----------|
| Nur beteiligte Gruppe(n) | Mitglieder aller am Release beteiligten Gruppen | |
| Nur die aktuelle Gruppe | Nur Mitglieder der Gruppe, deren Cockpit man nutzt | ✓ |
| Alle Personen (members) | Beliebige members | |

**User's choice:** Nur die aktuelle Gruppe (Collab-Partner in V1 nicht zuordenbar — bewusste Grenze).

### Notizen/Media-Konsistenz

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, konsistent gekoppelt | Maske zeigt genau den gültigen Mitwirkenden-Satz; nur diese dürfen schreiben/hochladen | ✓ |
| Anzeige getrennt | Maske unabhängig vom Mapping | |

**User's choice:** Ja, konsistent gekoppelt.

---

## Claude's Discretion

- Konkretes Storage-/Auflösungsmodell des Overrides (Snapshot vs. Delta), solange D-10/D-11-Verhalten erfüllt ist.
- Genaue `CanForReleaseVersion`-Refaktorierung (Query/Joins über anime_contributions + release_version_groups), Caching, Backfill-Reihenfolge.
- Exakte Badge-Texte/Layout der Cockpit-Übersicht.

## Deferred Ideas

- Schicht B — member-zentrischer `/me`-Einstieg (Folge-Phase).
- Collab-übergreifende Zuordnung (Partner-Gruppen an Collab-Releases) — über V1 hinaus.
- Soft-Delete/Hard-Delete-Infrastruktur, falls im Pfad noch nicht vorhanden — eigene Folgearbeit.
