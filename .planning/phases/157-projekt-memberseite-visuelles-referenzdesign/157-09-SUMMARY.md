# 157-09 – Banner und Beitragsvorschau poliert

Stand: 13.09.2026. Kanonische Arbeitskopie: `/home/d1sk/team4s`.

## Ergebnis

Mobil ist rechts nun ein erkennbarer Ausschnitt des Banners sichtbar. Dafür wurden der Verlauf und der Bildausschnitt angepasst: links deckend weiß, rechts bis zu 75 % Bildanteil; zusätzlicher heller Verlauf unter Kennzahlen und Actions. Der Ausschnitt verwendet 75 % horizontale Bildposition. Der breite Desktop-Hero behält seinen stärkeren Artwork-Verlauf. Die kompakte Höhe und die beiden Actions bleiben erhalten.

Notizvorschauen sind einheitlich auf maximal vier Textzeilen begrenzt. Die reine Zeichenschwelle entfällt: „Mehr anzeigen“ erscheint nur bei tatsächlichem Überlauf. Kurze Texte bleiben natürlich kurz. Plaintext und Richtext verwenden dieselbe Basistypografie; mehrzeilige Absätze bleiben vollständig aufklappbar. Die bereits vorhandene Messung aus FansubStoryBlock wurde in einen kleinen gemeinsam verwendeten Hook extrahiert.

## Geänderte Abschnitte und Dateien

Pfadwurzel: `/home/d1sk/team4s`.

- `frontend/src/components/ui/ArtworkHero.module.css`: mobiler Verlauf aus horizontaler Bildfreigabe und vertikalem Schutz der unteren Textfläche; mobiler Bildausschnitt 75 %, Desktop rechts.
- `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css`: `font-size: 1rem`, `line-height: 1.65`, `max-height: calc(4 * 1.65em)`, vierzeilige Kürzung; Klartext mit erhaltenen Umbrüchen.
- `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.tsx`: Zeichenschwelle entfernt, gemeinsamer Body-Container, gemessener Überlauf, zugängliche Verknüpfung des Toggles mit dem Body über `aria-controls`.
- `frontend/src/hooks/useClampedOverflow.ts`: aus vorhandenem Story-Code extrahierte Messung, berücksichtigt Größenänderungen und erhält den Zuklapp-Button im geöffneten Zustand.
- `frontend/src/components/fansubs/FansubStoryBlock.tsx`: verwendet dieselbe extrahierte Messung; Layout und Labels unverändert.
- `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx`: Tests für kurzen, aber hohen Richtext, lange Texte ohne Überlauf, Größenwechsel und Auf-/Zuklappen.
- `frontend/scripts/shot-projectmember.mjs`: prüft reale Vorschauhöhen, notwendige Toggles und vollständiges Auf-/Zuklappen zusätzlich zum bisherigen responsiven Hero-Check.
- `DECISIONS.md` und `157-09-PLAN.md` / `157-09-SUMMARY.md`: Scope, Wiederverwendung und Abnahme dokumentiert.

## Verifikation

- Neue Verhaltensfälle zunächst mit drei erwarteten Fehlern gegen die Zeichenschwelle ausgeführt; nach Umsetzung bestanden.
- 106 relevante Frontend-Tests bestanden (19 Dateien): Projekt-Member, Fansub-Seiten/Routes, Rollenfarben und bestehende MemberStory-Regressionen.
- `docker compose exec -T team4sv30-frontend npm run typecheck`: bestanden.
- ESLint auf geändertem Hook, Story-/Note-Komponente, Tests und Screenshot-Runner mit `--max-warnings 0`: bestanden.
- `git diff --check`: bestanden; gezielter eigener Diff-Review durchgeführt.
- Gemeinsamer In-App-Browser: mobile Note auf- und zugeklappt, danach Desktop-Breite geprüft. Anschließend normale Browserbreite und Projekt-Member-Route wiederhergestellt.
- Headless-Screenshot-Runner ergänzend bei 390×844, 768×1024 und 1440×900: jeweils HTTP 200, kein horizontaler Überlauf, keine normalen Konsolenfehler, keine Release-Listenabfrage. Hero-Axe-Prüfung ohne Verstöße. Weitere vorhandene Container-/Langtext-/Artwork-Fallback-Prüfungen bestanden.
- Mobile: alle vier längeren sichtbaren Vorschauen **105,56 px**, entsprechend vier Zeilen à 26,4 px. Beispiel Aufklappen **105,56 → 211,13 → 105,56 px**; Route bleibt erhalten, Text vollständig sichtbar. Kurzer Eintrag 26,39 px ohne Toggle.
- Tablet/Desktop: vorhandene Notizen passen in maximal drei bzw. zwei Zeilen, daher keine redundanten Mehr-Buttons.
- Hero-Höhe: Mobile/Tablet **196 px**, Desktop **212 px**. Mobile Textsektion beginnt bei **430 px**. Desktop visuell geprüft: gut sichtbares Artwork rechts, heller Textbereich links.
- Frontend-Build im isolierten `.next`-Volume: Bundling erfolgreich (19,8 s), anschließend weiterhin vorhandener Next.js-Exportfehler der Anime-Adminseite.

## Bestehende Einschränkungen

Der vollständige Frontend-Build wird unverändert durch `formatEditLoadError` in `frontend/src/app/admin/anime/[id]/edit/page.tsx` blockiert (unzulässiger Page-Export, bereits gegen HEAD bestätigt). Die vom Build erzeugte Pfadänderung in `next-env.d.ts` wurde zurückgesetzt. Der bestehende Fansubs-Test-Mock meldet die bekannte React-Warnung zu `unoptimized`, seine Tests bestehen. Globale Lint-Baseline siehe 157-08; betroffene Dateien sind sauber.

Keine API-, Backend-, Tabellen- oder Datenänderung in diesem Folgeauftrag. Vorherige Änderungen aus 157-07/08 bleiben bestehen. Kein Commit oder Push.
