# Phase 36: Release-Version Media - Frontend Upload UI und Galerie - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 36-release-version-media-frontend-upload-ui-und-galerie
**Areas discussed:** Primärer UI-Ort, Aufbau der großen Verwaltungsansicht, Bildbearbeitung, Upload-Refresh-Verhalten

---

## Primärer UI-Ort

| Option | Description | Selected |
|--------|-------------|----------|
| Fansub-Release-Drawer als Vollverwaltung | Upload, Galerie und Bearbeitung komplett im bestehenden Drawer | |
| Fansub-Release-Drawer als Einstieg, große Verwaltung später im Editor | Drawer bleibt kompakt; vollständige Media-Verwaltung lebt in größerer Arbeitsfläche | ✓ |
| Episode-Version-Editor als alleiniger Einstieg | Media-Verwaltung nur im globaleren Admin-Editor, kein spezifischer Drawer-Einstieg | |

**User's choice:** Fansub-Release-Drawer als Einstieg; große Verwaltung im Episode-Version-Editor.
**Notes:** Der Nutzer will den echten Fansub-/Gruppenkontext am Einstieg behalten, aber keinen doppelten Codepfad bauen. Viele Bilder, Kategorien und Kommentare würden den Drawer überladen.

---

## Drawer-Tiefe

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Übersicht + Einstieg | Counts, Mini-Vorschau, Status, Button `Media verwalten` | ✓ |
| Kleiner Upload + Übersicht | Drawer darf bereits Upload anstoßen, Verwaltung bleibt großteils extern | |
| Fast volle Funktion | Upload und kleinere Bearbeitung im Drawer, nur große Galerie ausgelagert | |

**User's choice:** Nur Übersicht + Einstieg.
**Notes:** Bei vier Kategorien und potenziell vielen Bildern pro Kategorie wird der Drawer sonst schnell unübersichtlich.

---

## Große Verwaltungsansicht

| Option | Description | Selected |
|--------|-------------|----------|
| Kategorien als Abschnitte untereinander | Alle Kategorien gleichzeitig sichtbar | ✓ |
| Kategorien als Tabs | Immer nur eine Kategorie gleichzeitig sichtbar | |
| Standard-Galerie + Extras-Bereiche | Zusammengelegte Hauptkategorien plus getrennte Extras | |

**User's choice:** Kategorien als Abschnitte untereinander.
**Notes:** Der Nutzer möchte Überblick statt versteckte Zustände; das passt besser für eine Admin-/Pflegefläche.

---

## Bildbearbeitung

| Option | Description | Selected |
|--------|-------------|----------|
| Voll inline auf jeder Karte | Caption, Preview, Sortierung, Delete direkt auf jeder Kartenansicht | |
| Kompakte Karte + Detailfläche | Galerie bleibt kompakt; Bearbeitung öffnet Detail- oder Edit-Fläche | ✓ |

**User's choice:** Kompakte Karte + Detailfläche.
**Notes:** Ruhigere Galerie bei vielen Bildern.

---

## Upload-Refresh-Verhalten

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistisch lokal anzeigen | Erfolgreiche Dateien sofort lokal einblenden, Server-Refresh im Hintergrund | |
| Erst nach bestätigter Server-Antwort/Refetch anzeigen | Nur `ready`-bestätigte Assets sichtbar machen | ✓ |

**User's choice:** Erst nach bestätigter Server-Antwort/Refetch anzeigen.
**Notes:** Der Nutzer akzeptiert die ehrlichere, robustere Admin-Erfahrung statt optimistischem Sofort-Feedback.

---

## the agent's Discretion

- Feinausgestaltung der Drawer-Summary-Komponente.
- Konkrete Form der Detailbearbeitung pro Asset.
- Visuelle Form der Kategorie-Abschnitte in der großen Verwaltungsansicht.

## Deferred Ideas

- Eine dedizierte separate Media-Seite außerhalb des Episode-Version-Editors wurde vorerst nicht gewählt.
- Vollverwaltung direkt im Drawer wurde bewusst verworfen.
