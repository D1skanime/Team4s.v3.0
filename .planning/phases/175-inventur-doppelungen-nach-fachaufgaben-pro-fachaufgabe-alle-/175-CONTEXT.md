# Phase 175: Inventur „Doppelungen nach Fachaufgaben“ — Context

**Gathered:** 2026-10-06
**Status:** Ready for planning
**Quelle:** Nutzerauftrag 2026-10-06 („GSD-Plan für die Inventur, danach die Bugs“) auf Basis von 174-FOLLOWUPS F-17. Ersetzt discuss-phase; Entscheidungen sind locked.

<domain>
## Phase Boundary

Reine Analyse-Phase. Phase 174 hat gezeigt: Die Welle-1-Analyse (D-07) fand nur doppelte *Funktionen*. Doppelte *Systeme* — zwei Release-Bearbeitungsseiten (F-13), zwei Upload-Systeme (F-15), sieben Einzel-Suchfilter (F-16), 5+ Bildanzeigen (F-18), Rechte, die Anzeige und Server unterschiedlich prüfen (BUG-174-02) — fielen erst in der Live-Abnahme auf. Phase 175 erfasst systematisch, pro Fachaufgabe, alle Umsetzungen und schneidet daraus die Zusammenführungs-Phasen zu.

Keine Produkt-Code-Änderungen, keine Migrationen, keine UI-Änderungen. Ergebnis sind Dokumente + reproduzierbare Analyse-Skripte.
</domain>

<decisions>
## Implementation Decisions (alle locked)

- **D-01 Nur Analyse:** Keine Änderungen an `frontend/`, `backend/`, `database/`, `shared/`. Analyse-Skripte und Rohdaten liegen im Phasenverzeichnis (z. B. `.planning/phases/175-*/scripts/`, `.../data/`). Live-Prüfungen nur lesend (GET-Requests, SELECT), keine schreibenden Aktionen gegen den Live-Stack.
- **D-02 Fachaufgaben-Katalog:** Mindestens diese Aufgaben werden inventarisiert; weitere, die bei der Analyse auffallen, werden ergänzt und begründet:
  1. Medien hochladen (alle Upload-Wege: Release-Medien, Gruppenmedien, Fansub-Logo/Banner, Anime-Assets, Segment-Assets, Release-Theme-Assets, Profil-Avatar/-Hintergrund/-Story, Medien-Vorschläge)
  2. Bild ansehen (Viewer/Lightbox/Detaildialoge, öffentlich und Admin)
  3. Release bearbeiten (Admin-Editor vs. /me-Workspace und weitere Einstiege)
  4. Prüfen & Freigeben (Review von Bildern, Notizen, Beiträgen, Gruppenmedien; Review-Queue, Dashboard-Hinweise)
  5. Mitglieder einladen / Claims / Mitgliedsanfragen
  6. Notizen schreiben (Release-, Projekt-, Gruppen-Notizen, Story)
  7. Suchen & Filtern (globale Suchbibliothek vs. Browser-Filter)
  8. Löschen / Aufräumen (Soft-Delete, Cleanup-Jobs, Tombstones)
  9. Anime anlegen / importieren (manuell, Jellyfin, AniSearch, Episoden-Import)
  10. Rechte anzeigen vs. Rechte durchsetzen (Capabilities-Endpunkte vs. Server-Prüfung je Aktion)
  11. Status-/Label-Darstellung (Review-Status, Kategorien, Rollenlabels)
  12. Benachrichtigung/Hinweise (Dashboard-Attention, Toasts, Mails)
- **D-03 Je Fachaufgabe erfassen:** (a) UI-Flächen (Route + Komponente, Datei:Zeile), (b) Frontend-API-Funktionen, (c) Backend-Endpunkte/Handler, (d) Rechte-Aktionen für Anzeige UND für Durchsetzung, (e) Datenhaltung (Tabellen/Speicherpfade), (f) beobachtbares Verhalten, das sich je Einstieg unterscheidet. Alles mit Fundstelle belegt; Zählungen per Skript reproduzierbar.
- **D-04 Klassifikation je Fund:** **Duplikat** (gleiche Aufgabe, getrennt gebaut → zusammenführen), **Variante** (legitimer Kontextunterschied, gemeinsame Basis sinnvoll), **legitim getrennt** (fachlich verschieden, begründet). Bei Duplikaten: welche Umsetzung ist Vorbild, welche wird Altlast und muss entfernt werden.
- **D-05 Rechte-Konsistenz zuerst:** Für jede Aktion prüfen, ob die Anzeige (Capability/Buttons/Dashboard) und die Server-Durchsetzung dieselbe Rechte-Aktion verwenden. Jede Abweichung wird als eigener Befund mit Schwere geführt (Muster BUG-174-02/BUG-174-04). Befunde werden nur dokumentiert, nicht behoben (D-01).
- **D-06 Grundsatz des Nutzers:** „Doppelte Seiten/Parallelimplementierungen für dieselbe Fachaufgabe sind Unsinn“ — Ziel jeder Zusammenführung ist EINE rechtebasierte Umsetzung, alte Umsetzungen werden entfernt (kein Nebeneinander).
- **D-07 Ergebnisartefakte:** `175-INVENTORY.md` (pro Fachaufgabe Tabelle + Klassifikation + Belege), `175-PERMISSION-MATRIX.md` (Aktion → Anzeige-Recht vs. Durchsetzungs-Recht, Abweichungen markiert), `175-ROADMAP-PROPOSAL.md` (zugeschnittene Folgephasen mit Ziel, Umfang, Reihenfolge, Abhängigkeiten, Risiko, Aufwandsklasse; verbindet F-13/F-15/F-16/F-18 und neue Funde; nennt pro Phase, welche Altlast entfernt wird).
- **D-08 Eingangsmaterial:** `174-FOLLOWUPS.md` (F-01..F-24), `174-BUGS.md`, `174-REPORT.md` (inkl. Abschlussaudit), `174-HOTSPOTS.md` (D-07-Verdicts), Sketch `.planning/sketches/010-galerie-detailansicht` (nur lesen; uncommitted, fremd — nicht verändern, nicht committen).
- **D-09 Abschluss mit Nutzer:** Am Ende steht ein Checkpoint, an dem der Nutzer den Phasenzuschnitt (`175-ROADMAP-PROPOSAL.md`) bestätigt; erst danach werden Folgephasen angelegt. Phase 175 legt selbst keine Roadmap-Phasen an.
- **D-10 Git-Disziplin:** auf `main`, nur exakte eigene Pfade committen, nie `git add .`, nie `git stash`; `.planning/sketches/` nicht anfassen.

### Claude's Discretion
- Reihenfolge der Fachaufgaben, Skript-Werkzeuge (grep/Python/AST), Detailtiefe je Aufgabe nach Fundlage.
</decisions>

<deferred>
## Deferred
- Umsetzung jeder Zusammenführung → eigene Folgephasen nach D-09.
- Bugfix-Sammelphase aus 174-FOLLOWUPS (F-02..F-06, F-14, F-19, F-21..F-24) → eigene Phase direkt nach 175 (Nutzerwunsch); Rechte-Befunde aus D-05 können dort einfließen.
</deferred>
