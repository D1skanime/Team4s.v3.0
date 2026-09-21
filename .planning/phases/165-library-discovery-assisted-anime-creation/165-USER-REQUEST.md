# Auftrag des Auftraggebers (wörtlich, 2026-09-21) – gilt für Phase 165 und 166

> Hinweis des Auftraggebers: Der Text wurde mit ChatGPT formuliert; „ich kann nicht mit Sicherheit sagen, ob alle seine Vorschläge richtig und passend sind“. Maßgeblich sind deshalb die Entscheidungen in 165-CONTEXT.md, die Abweichungen vom Text begründen. Aufteilung: Phase 165 = Discovery + Create-Handoff + Serien-Flow (Filme erscheinen in der Discovery), Phase 166 = Film-Content-Flow (§17–§24, §32).

GSD Auftrag – Library Discovery, Assisted Anime Creation & Film Flow

## Ziel

Der bestehende Anime-Anlegeprozess soll erweitert werden, damit der Benutzer nicht mehr wissen oder erraten muss, welche Anime bereits in seiner Library vorhanden sind und welche davon in Team4s noch fehlen.

Wichtig: bestehender Create-Flow bleibt erhalten; bestehende AniSearch-Logik bleibt erhalten; bestehende Jellyfin-Logik bleibt erhalten; keine automatische AniSearch-Zuordnung; keine neue parallele Importarchitektur; kein großer Source-/Provider-Refactor; Film-Support muss vollständig mitgedacht werden.

## 1. Aktuellen Flow zuerst prüfen

Vor Umsetzung den tatsächlichen aktuellen Codepfad nachvollziehen. Mindestens prüfen: `/admin/anime/create`, AniSearch-Suche, AniSearch-Crawl, Jellyfin-Suche, Jellyfin Preview, Draft/Merge-Verhalten, Anime Create, `source`, `source_links`, `folder_name`, Jellyfin `Path`, Existing-Detection, Edit-Seite, Episoden-Tab, Episode Crawl/Apply, Film-Mapping `film -> movie`.

Besonders wichtig: `folder_name`, `Path`, `source`, `source_links`. Nicht aufgrund der Feldnamen Annahmen treffen. Vor Änderungen dokumentieren: wer schreibt diese Felder? wer liest diese Felder? wo werden sie verglichen? welche Semantik haben sie heute tatsächlich? Keine neue Path-Semantik festschreiben, bevor diese Leser/Writer geprüft wurden.

## 2. Neues Kernfeature: Library Discovery

Der Benutzer soll auf der Anime-Anlege-Seite einen zusätzlichen Einstieg erhalten:

```
Anime hinzufügen
[Aus meiner Bibliothek]
bestehende Alternativen:
- AniSearch direkt
- Jellyfin direkt
- manuell
```

Die bestehenden Wege dürfen nicht entfernt oder verändert werden.

## 3. Discovery-Datenquelle

Für diese Phase ist Jellyfin die Discovery-Quelle. Jellyfin liefert heute bereits Name, Path, Jahr, Typ, Poster, weitere technische Metadaten. Diese Informationen sollen genutzt werden. Aber: Jellyfin ist nur technische Discovery-/Media-Quelle. AniSearch bleibt die fachliche Wahrheit für den Anime.

## 4. Discovery muss Series UND Movies liefern

Aktuell scheint der Jellyfin-Code hauptsächlich `IncludeItemTypes = Series` zu verwenden. Für Discovery müssen mindestens Series und Movie unterstützt werden. Filme dürfen nicht aus der Discovery herausfallen.

## 5. Discovery-Liste

Standardansicht: noch nicht abgearbeitete Library-Einträge. Beispiel:

```
[Poster] Frieren – Series · 2023 – /media/anime/Frieren – [Prüfen / Anime anlegen]
[Poster] Kimi no Na wa – Movie · 2016 – /media/anime/Kimi no Na wa/Kimi no Na wa.mkv – [Prüfen / Anime anlegen]
```

UI schlicht halten. Benötigte Informationen: Poster, Name, Typ, Jahr, Path, Status, Aktion. Keine große Reporting-Oberfläche bauen.

## 6. Discovery darf nicht blind „unbekannt = neuer Anime“ setzen

Drei Zustände:
- A. bereits korrekt zugeordnet (Jellyfin Item bereits eindeutig mit Team4s-Anime verbunden) → Status „bereits vorhanden“, kein neues Anime Create.
- B. Team4s-Anime existiert möglicherweise bereits, aber Jellyfin-Verbindung fehlt (z. B. Team4s enthält „Naruto“, Jellyfin enthält /anime/Naruto, aber keine eindeutige technische Zuordnung) → Team4s darf nicht automatisch einen neuen Anime erzeugen. Status „Zuordnung prüfen“. Benutzer entscheidet: [Mit bestehendem Anime verbinden] [Als neuen Anime anlegen]. Keine automatische Titel-/Path-/Fuzzy-Zuordnung.
- C. offenbar noch nicht vorhanden → [Anime anlegen].

## 7. Keine Fuzzy-Automatik

Verboten: Naruto ≈ Naruto Shippuden; Steins Gate ≈ Steins;Gate 0; ähnlicher Pfad → automatisch bekannt. Automatische „already known“-Erkennung nur über konkrete bestehende technische Referenzen, die im aktuellen Code nachweislich dafür geeignet sind (z. B. exakte bestehende Jellyfin-Referenz, exakter normalisierter gespeicherter Path) – aber nur, wenn der aktuelle Code diese Semantik wirklich trägt.

## 8. Discovery performant bauen

Bei ca. 1500 Einträgen darf nicht entstehen: 1500 Jellyfin-Detailrequests oder 1500 einzelne DB-Queries. Die Discovery-Liste benötigt nur Lightweight-Daten (item id, name, type, year, path, poster, status). Detaildaten erst laden, wenn ein Item gewählt wird. Batchweise Existing-Detection verwenden. Kein API-Fan-out pro Listeneintrag.

## 9. Pagination / Lazy Loading

Keine 1500 Cards auf einmal rendern. Bestehendes Pagination-/Cursor-Muster verwenden, falls vorhanden (z. B. limit = 50, cursor = …).

## 10. Filter

Standard: nur noch nicht eindeutig abgearbeitete Items. Zusätzlich sinnvoll: Alle, Offen, Bereits vorhanden, Zuordnung prüfen. Kein Zwang für komplexe UI. Mindestens muss intern nachvollziehbar sein, warum ein Item nicht in der Standardliste erscheint.

## 11. Auswahl aus Discovery

Bei [Anime anlegen] soll kein neuer Create-Prozess entstehen. Der bestehende Anime-Create-Draft wird vorbereitet. Übernommen werden dürfen: Jellyfin Item ID, Name, Path, Typ-Hint, Jahr, Poster, andere heute bereits genutzte Jellyfin-Assets. Danach weiter im bestehenden Create-Flow.

## 12. AniSearch-Suche vorbereiten

Die AniSearch-Suche soll mit sinnvollen vorhandenen Informationen vorbelegt werden: primär Jellyfin-Name; optional Jahr, alternative vorhandene Titel, Folder Name – aber nur als Suchhilfe.

## 13. Keine automatische AniSearch-Zuordnung

Der Benutzer wählt immer selbst den richtigen AniSearch-Eintrag – auch bei nur einem Treffer, auch bei scheinbar 100 % passendem Namen. Erlaubt: Vorschlag. Nicht erlaubt: automatisch übernommen.

## 14. AniSearch bleibt fachliche Wahrheit

Nach Benutzerwahl wird der bestehende AniSearch-Crawl verwendet. AniSearch bestimmt weiterhin Anime-Typ, Titel, Episoden, Jahr, Beschreibung, Genres, Tags, Relationen, sonstige Anime-Metadaten. Jellyfin bleibt technische Quelle für Path, Bilder, Dateien, MediaInfos, Streaming. Bestehendes Merge-Verhalten nicht unbegründet ändern.

## 15. Post-Create Flow verbessern

Aktuell: Anime speichern → Liste → Anime erneut suchen → Edit → Episoden. Das soll im Assisted-Flow entfallen. Nach erfolgreichem Create direkt zum nächsten fachlichen Schritt: Serien → Episoden-Tab; Filme → Movie-/Content-Flow. Nicht global jeden Anime-Create umleiten; nur der Assisted-/Discovery-Flow behält seinen „next step“. Bestehende manuelle Create-Navigation nicht unnötig verändern.

## 16. Discovery-Kontext erhalten

Discovery → Anime anlegen → Content anlegen → zurück: nicht wieder ganz oben bei 1500 Items anfangen. Mindestens erhalten: Filter, Suchbegriff, Cursor/Page-Kontext oder sinnvoller Rücksprung. Ziel: nächsten offenen Anime bearbeiten ohne neue Suche.

## 17. Film-Flow separat und sauber behandeln

Filme sind kein Sonderfall, der ignoriert werden darf. Jellyfin `Movie` muss in derselben Discovery erscheinen.

## 18. Film: AniSearch

Benutzer wählt den passenden AniSearch-Film. Danach `anime.type = film`.

## 19. Film: Canonical Content

Prüfen, wo die bestehende Architektur sinnvollerweise die kanonische Movie-Unit erzeugt. Nicht automatisch beim Anime-Create erzeugen, wenn das nicht zum bestehenden Modell passt. Zielinvariante: film → canonical content unit #1 → episode_type = movie. Diese Unit muss spätestens im Content-/Episode-Import zuverlässig existieren.

## 20. Film ohne AniSearch-Episodenliste

Wenn AniSearch keine Episoden liefert (EpisodeCount = null/0), darf der Film nicht ohne Content-Unit bleiben. Für anime.type = film muss die Movie-Unit explizit erzeugt werden.

## 21. Film ohne Jellyfin EpisodeNumber

Ein Jellyfin Movie hat typischerweise keine SeasonNumber/EpisodeNumber. Das darf die Zuordnung nicht verhindern; die Movie-Datei muss zur Movie-Unit zuordenbar sein. Aber: keine Blindzuordnung jeder nummernlosen Datei.

## 22. Film mit mehreren Dateien

Beispiel Movie.mkv, Trailer.mkv, Interview.mkv, MakingOf.mkv: Nur der Hauptfilm darf sinnvoll vorgeschlagen werden. Unklare Zusatzdateien bleiben reviewpflichtig. Keine „alles → movie unit 1“-Automatik.

## 23. Film-Titel

Für Filme dürfen öffentliche/adminseitige Fallbacks nicht unnötig „Folge 1“ / „Episode 1“ anzeigen, wenn ein Filmtitel vorhanden ist. Für episode_type = movie Titel-Fallback prüfen.

## 24. Path bei Filmen nicht vorschnell definieren

Ein Jellyfin Movie kann Path liefern als /media/anime/Kimi no Na wa/Kimi no Na wa.mkv oder direkt in einem gemeinsamen Movie-Ordner liegen. Nicht pauschal „parent directory = Anime folder“ setzen. Zuerst prüfen: Jellyfin Path, ParentId, Collection Folder, Library Root, heutige folder_name-Semantik. Danach klare Regel implementieren.

## 25. Kein Provider-Framework bauen

Kein neuer generischer LibrarySource/ProviderRegistry/FilesystemProvider/MediaProvider-Unterbau. Jellyfin ist aktuell die konkrete Quelle. Nur vermeiden, dass neue UI-/Domainlogik unnötig hart an Jellyfin gebunden wird. Filesystem-Discovery ist spätere Arbeit.

## 26. Bestehende Source-Semantik nicht umbauen

source, source_links, folder_name nur ändern, wenn zwingend notwendig. Kein Source-Domain-Refactor in dieser Phase.

## 27. Zukünftige Release-Anforderung nur als Constraint

Später müssen Fansub-Releases auch ohne Jellyfin/MediaSource anlegbar sein. Deshalb keine neue Abhängigkeit einführen, die Fansub-Releases zwingend an Jellyfin oder vorhandene MediaSources koppelt. Kein Release-Mapping in dieser Phase.

## 28. Bestehende Flows müssen weiter funktionieren

AniSearch direkt suchen; Jellyfin direkt suchen; Anime manuell anlegen; bestehenden Anime editieren; Episoden importieren; Jellyfin Streaming; MediaSource Handling.

## 29. Pflicht-Tests Discovery

- A unbekannte Series (Naruto, keine bestehende eindeutige Zuordnung) → Status offen.
- B bekannte Series (konkrete bestehende technische Zuordnung) → Status bereits vorhanden.
- C kein Fuzzy Match (Team4s Naruto, Jellyfin Naruto Shippuden) → nicht automatisch gleichsetzen.
- D möglicher bestehender Anime ohne technische Zuordnung → Zuordnung prüfen, kein automatischer neuer Create.
- E Movie Discovery → sichtbar.
- F Pagination viele Items → korrekte Cursor/Pagination, keine doppelten Items, kein API-Fan-out, kein DB-N+1.

## 30. Create-Handoff-Tests

- G Discovery → Draft: bestehender Draft genutzt, Jellyfin-Daten vorhanden, Path vorhanden, Assets verfügbar, AniSearch-Suche vorbereitet.
- H keine Auto-Auswahl: AniSearch liefert einen einzigen Treffer → Benutzer muss trotzdem aktiv bestätigen.
- I AniSearch Merge: Jellyfin zuerst, AniSearch danach → AniSearch bleibt fachlich maßgeblich.
- J alter direkter AniSearch-Flow unverändert.
- K alter Jellyfin-Direktflow unverändert.

## 31. Post-Create-Tests

- L Assisted Series: Discovery → Create → direkt Episoden, kein erneutes manuelles Suchen.
- M Discovery-Kontext: nach Rückkehr Filter erhalten, Suchkontext erhalten, sinnvoller nächster Eintrag erreichbar.

## 32. Film-Tests

- N film → movie: anime.type = film führt spätestens im Content-Import zu episode_type = movie.
- O Film ohne AniSearch Episodes (EpisodeCount = null, Episodes = []) → Movie Unit #1 vorhanden.
- P Movie ohne EpisodeNumber → zu Movie Unit zuordenbar.
- Q Extra Files (Movie.mkv, Trailer.mkv) → keine automatische Zuordnung beider Dateien.
- R Movie-Titel: kein „Folge 1“, wenn ein sinnvoller Filmtitel existiert.

## 33. Technische Invarianten

AniSearch-Zuordnung wird nie automatisch bestätigt; Discovery erzeugt keinen zweiten Create-Flow; Series und Movie werden unterstützt; keine Fuzzy-Dublettenlogik; keine N+1-DB-Queries; kein Jellyfin-Detailrequest pro Listenitem; bestehende Create-Flows bleiben funktional; Assisted Create führt direkt weiter; Movie funktioniert ohne klassische EpisodeNumber.

## 34. Nicht Teil dieser Phase

Filesystem Scanner, eigener Streamer, Provider Framework, Source Domain Rewrite, Fansub Release Mapping, Public Anime Redesign, Release-Seite, Projektseite, Member-Seite, Phase-164-Infinite-Scroll-Umbau, allgemeine Jellyfin Streaming Migration.

## 35. Erwartetes Endergebnis

```
Anime hinzufügen → Aus meiner Bibliothek → offene Library Items → Item auswählen
→ prüfen: bereits vorhanden? Zuordnung prüfen? wirklich neu?
→ bei neu: bestehender Jellyfin Draft → AniSearch-Suche vorbereitet
→ BENUTZER wählt AniSearch Anime → bestehender Crawl → Anime speichern
→ direkt weiter: Series → Episoden, Movie → Movie Content
→ Content anlegen → zurück zur Discovery → nächster offener Anime
```

Ziel ist ein schneller, sicherer Abarbeitungsworkflow für eine Library mit ca. 1500 Anime, ohne dass der Benutzer vorher wissen muss, welche Titel noch fehlen.

Skizze des Auftraggebers:

```
                    ANIME HINZUFÜGEN
             ┌─────────────┴─────────────┐
       Bibliothek                     Direkt
       Jellyfin heute             AniSearch-Suche
       Filesystem später           ID / manuell
    unbekannte Ordner → Nutzer wählt → Jellyfin Preview (Path + Bilder + Technik)
    → AniSearch-Titel vorausfüllen → AniSearch suchen → NUTZER WÄHLT
    → AniSearch Crawl → bestehender Draft → prüfen + erstellen
```

## 36. Abschlussbericht

Konkret dokumentieren: wiederverwendete Komponenten; wie die drei Zustände (bereits vorhanden / Zuordnung prüfen / neu) unterschieden werden; welche konkreten Referenzen die Existing Detection nutzt (tatsächliche Codepfade); wie garantiert wird, dass keine automatische AniSearch-Zuordnung erfolgt; Performance (DB-Queries pro Discovery-Page, Jellyfin-Requests pro Discovery-Page, ob Detailrequests nur nach Auswahl stattfinden); Series-Flow End-to-End; Movie-Flow End-to-End; Regression der bestehenden Create-/Jellyfin-/AniSearch-/Episode-Flows; offene Folgearbeit nur dokumentieren (Filesystem Discovery, eigener Streaming-Pfad, source-unabhängiges Fansub-Release-Mapping).
