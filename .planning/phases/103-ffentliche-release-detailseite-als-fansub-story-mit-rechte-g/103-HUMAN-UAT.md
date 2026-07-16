---
status: complete
phase: 103-ffentliche-release-detailseite-als-fansub-story-mit-rechte-g
source: [103-01-SUMMARY.md, 103-02-SUMMARY.md, 103-03-SUMMARY.md, 103-04-SUMMARY.md, 103-05-SUMMARY.md]
started: 2026-07-16
updated: 2026-07-16
---

## Current Test

[testing complete]

## Tests

### 1. Hero ohne und mit Preview-Bild
expected: Ein Release ohne öffentliches Preview-Bild bleibt als textbasierter Kopf vollständig lesbar. Ist ein freigegebenes Preview-Bild gewählt, erscheint genau dieses im Hero; ein beliebiges erstes Galeriebild wird nicht automatisch hochgestuft.
result: issue
reported: "Das Release-UI gehört visuell nicht zur öffentlichen Fansub-Projektseite: heller flacher Zweispaltenaufbau statt atmosphärischem Seitenhintergrund, weichen Glass-/Kartenoberflächen, gleicher Typografie, Radien, Schatten, Abständen und blauen Akzenten. Der Release-Hero soll eigenständig bleiben und ausdrücklich keinen Projekt-Banner-Aufbau kopieren. Vergleichsscreenshots: codex-clipboard-1b8be792-e0ec-4e87-bfdc-a1ee087b37e4.png und codex-clipboard-3efc45b6-a0f1-4b0c-9999-f066aa57ead3.png."
severity: major

### 2. Vier Bildkapitel auf Desktop, Tablet und Mobil
expected: Je Kategorie sind initial 6/4/2 Bilder sichtbar; weitere Bilder werden im selben Kapitel aufgeklappt. Uploader, Kategorie und Beschreibung sind korrekt. Die Restanzahl im Button ist pro Breakpoint verständlich.
result: issue
reported: "Weitere Bilder anzeigen funktioniert nicht und zeigt 'Weitere 0 Bilder anzeigen'. Bilder sind nicht anklickbar und öffnen nicht das Original wie auf der Fansubseite. Statt separater Kategorien sollen alle Release-Bilder in einem gemeinsamen responsiven Grid stehen. Karten zeigen nur einen gekürzten Text; Klick öffnet die bestehende Lightbox mit Original und vollständigem Text. Kategorie und Uploader müssen als Badge/Metadaten am Bild erkennbar sein."
severity: major

### 3. Rollenbasierte Texte und exakte Beteiligte
expected: Texte sind nach Release-Rolle gruppiert und zeigen Autor, Rolle und Datum; die Beteiligtenliste enthält nur Personen dieser Release-Version.
result: issue
reported: "Inhalte, Rollengruppierung und Beteiligte passen, aber auf Desktop bleibt sehr viel weiße Fläche rechts neben den schmalen Rollen-/Textkarten. Die Rollenblöcke sollen auf breiten Ansichten als responsives Zwei-Spalten-Grid den verfügbaren Raum nutzen; Tablet und Mobil bleiben einspaltig."
severity: cosmetic

### 4. Kara als Gast und mit Refresh-only-Session
expected: Gäste sehen Timeline und Informationen ohne Abspielaktion. Eine eingeloggte Refresh-only-Session wird zentral erneuert und kann verfügbare Segmente starten; Segmentwechsel stoppt den vorherigen Stream. Falls Autoplay blockiert wird, bleibt eine nutzbare Play-Steuerung sichtbar.
result: issue
reported: "Als nicht eingeloggter Nutzer wird der Kara-Bereich korrekt angezeigt und ist nicht anklickbar. Als eingeloggter Fansubber Sheppert verschwindet der gesamte Kara-Teil, sodass auch kein Segment angeklickt oder abgespielt werden kann."
severity: major

### 5. Vollfolge mit und ohne Entitlement
expected: Nur berechtigte Nutzer mit bereitem Stream sehen die sekundäre Aktion. Der Dialog spielt ab und räumt beim Schließen die Quelle auf. Gäste, abgelehnte Nutzer und nicht bereite Streams sehen keine Aktion.
result: issue
reported: "Als eingeloggter Platform Admin ist bei Release-Version 1 kein Stream-/Episode-abspielen-Button sichtbar, obwohl die Datenbank für diese Version eine konkrete Jellyfin-Streamquelle besitzt."
severity: major

### 6. Kooperation und Release-Navigation
expected: Kooperationsgruppen werden korrekt angezeigt. Vorher/Weiter bleibt in der aktuellen Fansubgruppe, bevorzugt dieselbe Versionsnummer und fällt andernfalls auf die öffentliche Standardversion zurück.
result: skipped
reason: "Aktuell ist keine zweite Release-Version (zum Beispiel v2) vorhanden; die Versionspräferenz und der Fallback können erst mit passenden Testdaten geprüft werden."

### 7. Öffentliche Pretty Release-Route
expected: Der Absprung vom öffentlichen Fansub-Projekt führt auf `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]`; die technische Anime-/Gruppen-ID-Route bleibt höchstens Kompatibilitätsroute.
result: issue
reported: "Die öffentliche Release-Seite sollte unter /fansubs/c-subs/fansubprojekt/vipers-creed/releases/{releaseVersionId} liegen statt unter /anime/{id}/group/{groupId}/releases/{releaseVersionId}."
severity: major

### 8. Beschreibung öffentlich geschalteter Release-Bilder bearbeiten
expected: Ein Nutzer mit Update-Berechtigung kann ein hochgeladenes Release-Bild auch nach dem Setzen auf „öffentlich“ erneut öffnen und dessen Text/Bildbeschreibung bearbeiten; der öffentliche Status sperrt das Eingabefeld nicht unbeabsichtigt.
result: issue
reported: "Wenn ich Bilder hochgeladen und öffentlich gestellt habe und sie danach noch einmal öffne, kann ich keinen Text mehr einfügen; es wirkt wie gesperrt."
severity: major

### 9. Preview-Bild als Fansubber festlegen
expected: Ein Fansubber mit Update-Berechtigung kann bei einer Release-Version ohne Preview ein zulässiges Release-Bild als Preview markieren. Beim Wechsel bleibt höchstens ein Preview-Kandidat aktiv und die öffentliche Seite verwendet ihn nach Freigabe.
result: issue
reported: "Sheppert konnte kein Bild als Preview markieren, obwohl für Release 1 noch kein Preview-Kandidat vorhanden ist. Dadurch zeigen die Releases weiterhin denselben Anime-Poster-Fallback."
severity: major

### 10. Anime-Logo als Release-Hero-Fallback
expected: Ohne freigegebenes Release-Preview verwendet der Hero das vorhandene Anime-Logo auf der atmosphärischen Fläche; fehlt auch das Logo, bleibt der Hero textbasiert. Das Anime-Logo wird nur dargestellt und nicht als Release-Media gespeichert.
result: issue
reported: "Verbesserungsvorschlag: Wenn der Release kein Bild hat, soll das Logo des Anime als Fallback verwendet werden."
severity: minor

## Summary

total: 10
passed: 0
issues: 9
pending: 0
skipped: 1
blocked: 0

## Gaps

- truth: "Ohne freigegebenes Release-Preview zeigt der Hero das vorhandene Anime-Logo als reinen Darstellungsfallback; ohne Logo bleibt er textbasiert und hängt kein Anime-Medium an die Release-Version."
  status: failed
  reason: "User requested: Bildlose Releases sollen das Anime-Logo statt des identischen Anime-Poster-Fallbacks verwenden."
  severity: minor
  test: 10
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Ein Fansubber mit Release-Version-Media-Update-Berechtigung kann bei fehlendem Preview einen zulässigen Screenshot oder ein Typesetting-/Karaoke-Bild als Preview markieren; der Max-one-Preview-Vertrag bleibt atomar erhalten."
  status: failed
  reason: "User reported: Sheppert kann bei Release 1 kein Preview festlegen, obwohl die Datenbank keinen vorhandenen Preview-Kandidaten zeigt."
  severity: major
  test: 9
  root_cause: ""
  artifacts:
    - path: "database:release_version_media/release_version_id=1"
      issue: "Alle vorhandenen Relationen haben is_preview_candidate=false; die UI erlaubt Sheppert trotzdem keine Auswahl."
  missing: []
  debug_session: ""

- truth: "Ein eingeloggter Platform Admin sieht bei einer Release-Version mit bereiter Streamquelle die sekundäre Aktion 'Episode abspielen'; Access-Projektion und Relay erkennen die aktive beziehungsweise refreshbare Admin-Session."
  status: failed
  reason: "User reported: Als eingeloggter Platform Admin fehlt der Streambutton bei Release-Version 1, obwohl release_streams/stream_sources eine Jellyfin-Quelle enthalten."
  severity: major
  test: 5
  root_cause: ""
  artifacts:
    - path: "database:release_versions/1"
      issue: "Release-Version 1 besitzt Variant 1, Release-Stream 1 und eine Jellyfin-Streamquelle, aber die UI zeigt dem Platform Admin keine Abspielaktion."
  missing: []
  debug_session: ""

- truth: "Der Kara-Bereich bleibt für Gäste und eingeloggte Nutzer sichtbar; eine aktive oder per Refresh wiederhergestellte Session ergänzt bei verfügbaren Segmenten nur die Abspielaktion und blendet den öffentlichen Abschnitt niemals aus."
  status: failed
  reason: "User reported: Als Gast ist Kara sichtbar, als eingeloggter Fansubber Sheppert verschwindet der gesamte Kara-Bereich."
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Rollenbasierte Release-Texte nutzen auf Desktop ein responsives Zwei-Spalten-Grid mit spaltenfüllenden Karten; Tablet und Mobil bleiben gut lesbar einspaltig."
  status: failed
  reason: "User reported: Die fachliche Darstellung passt, aber auf Desktop bleibt neben den schmalen Textkarten sehr viel ungenutzte weiße Fläche."
  severity: cosmetic
  test: 3
  root_cause: ""
  artifacts:
    - path: "C:/Users/admin/AppData/Local/Temp/codex-clipboard-644efa92-9bb3-49c9-97ff-ba84365efed5.png"
      issue: "Schmale einspaltige Rollen-/Textkarten nutzen auf Desktop nur etwa die linke Hälfte der Inhaltsfläche."
  missing: []
  debug_session: ""

- truth: "Alle Release-Bilder erscheinen in einem gemeinsamen responsiven Grid, sind über die bestehende Public-Fansub-Lightbox anklickbar, laden das Original mit vollständiger Beschreibung und zeigen Kategorie sowie Uploader; die Kartenbeschreibung ist gekürzt und es erscheint kein wirkungsloser 'Weitere 0 Bilder anzeigen'-Button."
  status: failed
  reason: "User reported: Der Mehr-anzeigen-Button funktioniert nicht, Bilder sind nicht anklickbar und die Kategorie-Kapitel entsprechen nicht mehr der gewünschten gemeinsamen Grid-Darstellung."
  severity: major
  test: 2
  root_cause: ""
  artifacts:
    - path: "C:/Users/admin/AppData/Local/Temp/codex-clipboard-d4a1fcdd-8c29-4ca2-b144-c477f8f8142a.png"
      issue: "Getrenntes Kategorie-Kapitel mit nicht funktionierendem 'Weitere 0 Bilder anzeigen'-Button und nicht anklickbaren Bildern."
  missing: []
  debug_session: ""

- truth: "Die Release-Seite verwendet dieselbe öffentliche Fansub-/Projekt-Designsprache mit Hintergrundatmosphäre, weichen Glass-/Kartenoberflächen, Typografie, Radien, Schatten, Abständen und blauen Akzenten, behält aber einen eigenständigen Release-Hero ohne Projekt-Banner-Aufbau."
  status: failed
  reason: "User reported: Das aktuelle Release-UI sieht visuell nicht wie die öffentliche Fansub-Projektseite aus."
  severity: major
  test: 1
  root_cause: ""
  artifacts:
    - path: "C:/Users/admin/AppData/Local/Temp/codex-clipboard-1b8be792-e0ec-4e87-bfdc-a1ee087b37e4.png"
      issue: "Aktuelle Release-Seite mit hellem, flachem Zweispalten-Hero."
    - path: "C:/Users/admin/AppData/Local/Temp/codex-clipboard-3efc45b6-a0f1-4b0c-9999-f066aa57ead3.png"
      issue: "Stilreferenz der öffentlichen Fansub-Projektseite; der Banner-Aufbau selbst soll nicht übernommen werden."
  missing: []
  debug_session: ""

- truth: "Öffentliche Release-Links bleiben innerhalb der Pretty Fansub-Projekt-Route; technische ID-Routen sind nur Kompatibilitätsrouten."
  status: failed
  reason: "User reported: Der Absprung vom Pretty Fansub-Projekt führt auf die technische Route /anime/{id}/group/{groupId}/releases/{releaseVersionId}."
  severity: major
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Öffentlich geschaltete Release-Bilder bleiben für Nutzer mit Update-Berechtigung erneut öffnungs- und beschreibbar."
  status: failed
  reason: "User reported: Nach Upload, Veröffentlichung und erneutem Öffnen kann kein Text mehr eingegeben werden; die Bearbeitung wirkt gesperrt."
  severity: major
  test: 8
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
