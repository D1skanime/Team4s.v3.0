# Phase 176 (Entwurf): Bug- und Altlasten-Sammelphase aus Phase 174 — Context

> **Übernommen in `.planning/phases/176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-/176-CONTEXT.md` (2026-10-07).**
> Dieser Entwurf ist das Ausgangsmaterial; die finale CONTEXT.md ergänzt ihn um die
> verbindlichen Punkte aus `175-ROADMAP-PROPOSAL.md` (Nutzer-Bestätigung) und
> `175-USER-DECISIONS.md` (u. a. Member-Group-Story-Entfernung, Rechte-/Sicherheitsfixes
> 5.3/6.1/6.2/8.4, Ausführungsregeln). Für die Planung bitte die finale CONTEXT.md verwenden,
> nicht diesen Entwurf.

**Stand:** Entwurf 2026-10-07, wird nach Abschluss von Phase 175 angelegt und um deren Rechte-Befunde ergänzt.
**Quelle:** Nutzerauftrag 2026-10-06/07; Einträge aus `174-FOLLOWUPS.md`.

<domain>
## Phase Boundary

Gezielte Fehler- und Altlasten-Behebung. Keine neuen Features, keine Zusammenführung von Parallelsystemen (das sind eigene Phasen aus 175-ROADMAP-PROPOSAL: Bildanzeige, Suche, Uploader, Release-Bearbeitung). Jeder Fix klein, einzeln committet, mit Logik-Test (D-25) oder Live-Abnahme bei UI.
</domain>

<decisions>
## Implementation Decisions

- **D-01 F-02 OUTRO-Label (Nutzer 2026-10-07):** „Outro“ bleibt ein eigener Theme-Typ (id 9, aktuell 0 Segmente) mit Kürzel `OUT`. Das Kürzel wird nicht mehr per Namens-Raten (`includes('OP')` …) abgeleitet, sondern als festes Feld beim Typ in der Datenbank geführt (analog Phase 163/164 „Labels aus DB“): OP Kara → `OP`, ED Kara → `ED`, Insert Kara → `IN`, Outro → `OUT`. Die beiden Rate-Funktionen (`SegmenteTab.helpers.tsx`, `segmenteTabUtils.ts`) werden entfernt bzw. durch das DB-Kürzel ersetzt; der Test, der `Outro → PV` festschreibt, wird auf das fachlich richtige Verhalten umgestellt (bewusste Verhaltenskorrektur, kein Grünbiegen). Farben/Spuren (`getTypeColor`, `isUpperSpur`) ebenfalls vom Typ statt vom Namen ableiten, soweit dafür Daten vorhanden sind.
- **D-02 F-05 doppelte Projekt-Einträge (Nutzer: „Ursache finden“):** Ursache ermitteln, warum `anime_contributions` für Mitglied `timer` (Anime 1 / Gruppe 1) 9-fach mit gleichen Rollen existiert (Erzeugungsweg, fehlende Eindeutigkeit, Import/Backfill?). Ergebnis dokumentieren und die Ursache im Code/Schema beheben (z. B. Eindeutigkeit + idempotentes Anlegen). **Bestandsdaten nur nach ausdrücklicher Nutzerfreigabe bereinigen** (Backup vorher).
- **D-03 F-03 Umlaute:** ASCII-Ersetzungen in User-Strings der Fansub-Anlegeseite (z. B. „Tag hinzugefuegt.“) auf echte Umlaute; dabei repo-weit nach weiteren ASCII-Umlauten in User-Strings suchen und mitbeheben (CLAUDE.md-Sprachregel).
- **D-04 F-04 native Felder:** 9 native `<input>/<select>` auf der Fansub-Anlegeseite durch `@/components/ui`-Primitives ersetzen; Aussehen per Live-Abnahme.
- **D-05 F-06 bekannte rote Tests:** die 6 Frontend-Baseline-Fehler (cssCustomProperties-Guard ×2, PublicReleaseSurfacesShowcase, EpisodeImportEpisodeGroup ×2, mitwirkende/page „Vollständiges Memberprofil“), die tsc-Fehler in `ReleaseDetailHero.test.tsx`, den doppelten `description`-Key in `shared/contracts/openapi.yaml` (~Zeile 2205) beheben. Jeweils prüfen, ob Test oder Code falsch ist — Tests nicht nur „grün biegen“.
- **D-06 F-14 Test-DB:** Phase-107-Test-Fixture-Schema nachziehen (u. a. `user_group_capability_overrides`), damit die 8 RVM-Handler-Tests und die Review-Decision-Tests wieder echt laufen; Revisionsschutz für Nicht-Hochlader-Metadaten-Edits an Release-Medien prüfen und ggf. ergänzen.
- **D-07 F-19 Mobil-Speichern:** sticky „Speichern“ auf `/admin/fansubs/[id]/edit` darf auf ~375 px keine Felder verdecken; Live-Abnahme Mobil.
- **D-08 F-21 `getAdminTagTokens`:** Semantik der zwei Fassungen klären, eine behalten, die andere entfernen, Aufrufer umstellen.
- **D-09 F-22 Quelltext-Tests:** Tests mit `os.ReadFile`+`strings.Contains` auf Produktionsdateien durch Verhaltenstests ersetzen (mindestens die in F-22 genannten).
- **D-10 F-23 Display-Namensregel:** `displayVariantFileName` und `rvmReplaceDisplayPath` auf eine Stelle zusammenführen.
- **D-11 F-24 wackeliger Test:** `AnimeProjectNotesSection.test.tsx` deterministisch machen.
- **D-12 F-12 CSS-Spread-Muster:** die 16 `{ ...shared, ...own }`-Stellen im Fansub-Edit auf das robuste Muster aus 174-23 umstellen.
- **D-13 Rechte-Befunde aus Phase 175:** jede in `175-PERMISSION-MATRIX.md` als Abweichung markierte Stelle (Anzeige-Recht ≠ Durchsetzungs-Recht) wird hier behoben, sofern sie keine Produktentscheidung braucht; Entscheidungsfälle werden dem Nutzer vorgelegt.
- **D-14 Prüfkette:** nach jedem Fix betroffene Tests; am Ende volle Suiten vorher/nachher-Vergleich aus vollständiger Repo-Kopie, Prod-Build ohne Cache, Live-Abnahme der UI-Punkte. Ziel: die Baseline-Fehlerliste wird kürzer, nicht länger.
- **D-15 Git:** auf `main`, exakte Pfade, ein Commit je Fix.

### Nicht in dieser Phase
- F-01, F-13, F-15, F-16, F-18, F-20 (größere Umbauten → eigene Phasen nach 175)
- F-07/F-08/F-09/F-10/F-11/F-17 (Wartbarkeit, README, Inventur)
</decisions>
