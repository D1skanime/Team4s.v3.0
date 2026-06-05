# Phase 79: Medien-Ownership in UI durchsetzen - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 79-medien-ownership-in-ui-durchsetzen
**Areas discussed:** Sichtbarkeit & Default-Politik, Owner-Kontext-Darstellung, Medienkategorie pro Surface, Durchsetzungstiefe je Surface

---

## Sichtbarkeit & Default-Politik

### Statusmodell
| Option | Description | Selected |
|--------|-------------|----------|
| Zwei Achsen, 1:1 zu Phase 72 | Getrennt: Sichtbarkeit (public/registered/fansubber/staff/private) + Reviewstatus (in Prüfung/freigegeben/abgelehnt/archiviert/entfernt). Ehrlich zum Datenmodell. | |
| Vereinfachte fachliche Status-Auswahl | Eine Auswahl mit 6 fachlichen Labels; UI mappt intern auf die zwei Phase-72-Achsen. | ✓ |

### Default
| Option | Description | Selected |
|--------|-------------|----------|
| Immer 'in Prüfung' + nicht-öffentlich | Jeder Upload startet in_review + nicht-öffentlich; öffentlich erst nach Freigabe. | |
| Default in Prüfung, Berechtigte dürfen direkt freigeben | Default in Prüfung, aber Capability-Träger können im Flow sofort freigeben. | ✓ |
| Uploader wählt Sichtbarkeit frei | Sichtbarkeit frei wählbar inkl. öffentlich. | |

### Freigabe-Ort
| Option | Description | Selected |
|--------|-------------|----------|
| Upload erzwingt Felder, Freigabe über Review | Upload erzwingt Felder mit sicherem Default; Öffentlich-Freigabe primär über Phase-78-Review. | ✓ |
| Upload-Flow darf auch direkt freigeben | Ein Status-Setter, an Upload und Review nutzbar. | |
| Du entscheidest | Kopplung dem Planner überlassen. | |

### Mapping (Folgefrage)
| Option | Description | Selected |
|--------|-------------|----------|
| Ein Dropdown, 6 Werte, festes Mapping | Ein Feld 'Status' mit 6 Werten; festes UI-Mapping auf visibility + review_status. | ✓ |
| Review-Dropdown + separater 'Öffentlich'-Schalter | Reviewstatus-Dropdown + Schalter 'öffentlich sichtbar'. | |
| Du entscheidest | Planner legt Mapping-Tabelle fest. | |

**User's choice:** Vereinfachtes 6-Werte-Dropdown mit festem Mapping; Default „in Prüfung" + nicht-öffentlich, Berechtigte dürfen direkt freigeben; reguläre Freigabe über Phase-78-Review.
**Notes:** Erkannte Spannung zwischen flacher LOCKED-Liste und der Phase-72-Zwei-Achsen-Implementierung — bewusst zugunsten einfacher UI bei ehrlichem Datenmodell aufgelöst.

---

## Owner-Kontext-Darstellung

### Owner-UI
| Option | Description | Selected |
|--------|-------------|----------|
| Read-only Kontext-Hinweis (Banner/Chip) | Kompakter, nicht editierbarer Hinweis; Owner folgt fix aus der Fläche. | ✓ |
| Vorbelegte, gesperrte Formularfelder | Owner-Typ/-ID als gesperrte Felder im Pflichtfeld-Block. | |
| Expliziter Bestätigungsschritt vor Save | Kurzer Bestätigungsschritt vor Speichern. | |

### Kein Owner
| Option | Description | Selected |
|--------|-------------|----------|
| Upload hart blockieren | Kein Upload ohne aufgelösten Owner; verständliche Meldung. | ✓ |
| Upload erlauben, aber owner-los flaggen | Upload durch, als 'ohne Owner / in Prüfung' geflaggt. | |

### Konsistenz
| Option | Description | Selected |
|--------|-------------|----------|
| Gemeinsame wiederverwendbare Komponente | Eine geteilte Owner-/Pflichtfeld-Komponente für alle Surfaces. | ✓ |
| Pro Surface nach gemeinsamem Spec | Jede Fläche lokal nach Spec. | |
| Du entscheidest | Planner/Researcher entscheidet. | |

**User's choice:** Read-only Hinweis-Chip; Upload hart blockieren bei unauflösbarem Owner; gemeinsame wiederverwendbare Komponente.
**Notes:** Konsistent mit Vorentscheidung [72-03] (Owner pro Junction komponiert, kein zentrales owner_type-Feld). Zwischenfrage des Nutzers zum Begriff „Surface" und zur bestehenden Uploader-Wiederverwendung am Code geklärt: geteilter Transport (`authorizedUploadXhr`), aber je Surface eigene fachliche Wrapper/Formulare.

---

## Medienkategorie pro Surface

### Kategorie
| Option | Description | Selected |
|--------|-------------|----------|
| Bestehendes Vokabular je Surface, nur pflichtig | Kein neues Taxonomie-Modell; bestehende Felder pflichtig + sichtbar. | ✓ |
| Einheitliche surface-übergreifende Kategorie-Enum | Gemeinsame Kategorie-Liste, alle Surfaces mappen darauf. | |

### Slot-Kategorie
| Option | Description | Selected |
|--------|-------------|----------|
| Slot = Kategorie, fix/read-only | Slot ist die Kategorie; Dropdown nur bei echten Mehrfach-Kategorien. | ✓ |
| Alle Surfaces zeigen ein Kategorie-Feld | Auch Slot-Surfaces zeigen ein vorbelegtes Feld. | |
| Du entscheidest | Planner wählt pro Surface. | |

**User's choice:** Bestehendes Vokabular je Surface, nur pflichtig; Slot = Kategorie (read-only) bei Branding/Identity-Slots.
**Notes:** Konsistent mit Lock A (keine Parallelmodelle / kein neues Medienmodell).

---

## Durchsetzungstiefe je Surface

### Tiefe
| Option | Description | Selected |
|--------|-------------|----------|
| Reduziert für Branding, voll für Prozessmedien | Branding-Slots leicht (Owner+Kategorie implizit), volles Formular nur für Prozessmedien. | ✓ |
| Volles Pflichtfeld-Set überall gleich | Auch Avatar/Logo/Banner mit vollem Formular. | |

### Branding-Status
| Option | Description | Selected |
|--------|-------------|----------|
| Durch Eigentümer/Berechtigte sofort sichtbar | Avatar/Hintergrund/Logo/Banner nach Upload sofort freigegeben/sichtbar. | ✓ |
| Auch Branding-Slots starten 'in Prüfung' | Strikt einheitlich, jedes Medium in Prüfung. | |
| Du entscheidest | Planner legt Default je Owner-Typ fest. | |

**User's choice:** Reduziertes Formular für Branding/Identity-Slots, volles Formular für Prozessmedien; Branding-Slots durch Eigentümer/Berechtigte sofort sichtbar.
**Notes:** Nutzer ließ sich Option 1 zunächst ausführlich erklären (zweiklassiges Modell A=Branding / B=Prozessmedien), dann bestätigt. SC2 bleibt gewahrt, weil Owner-Kontext zwingend aufgelöst ist.

---

## Claude's Discretion

- Exakte Mapping-Tabelle/Feldform für das 6-Werte-Status-Dropdown.
- Ob Phase 79 neue Spalten/Migrationen braucht oder das Phase-72-Bestehende ausreicht (Erwartung: schema-leicht).
- CSS-Modul-Struktur, Label-/Toast-/Empty-State-Texte, Capability-Feinauflösung pro Surface, genaue Platzierung des Owner-Chips.

## Deferred Ideas

- Edit/Delete-Lifecycle eigener scoped Uploads (Contributor-Workspace) — eigener späterer Slice.
- Zentrale gruppenübergreifende Medien-/Owner-Übersicht — `/admin/users` / Phase 80.
- Owner-Typ-Umhängen/Re-Kategorisieren als echter Review-Flow — bleibt Flagging (Phase 78 D-05).
