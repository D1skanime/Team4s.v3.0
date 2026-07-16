---
status: diagnosed
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
  root_cause: "Die Release-Seite lädt ausschließlich AnimeDetail.cover_image und reicht es als fallbackPosterUrl weiter; der vorhandene AnimeBackdropManifest.logo_url wird nicht gelesen."
  artifacts:
    - path: "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx"
      issue: "Verwendet cover_image als einzigen Fallback und lädt den vorhandenen Logo-Manifest-Vertrag nicht."
    - path: "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx"
      issue: "Fallback-Reihenfolge ist Release-Preview zu Anime-Poster statt Release-Preview zu Anime-Logo zu text-only."
  missing:
    - "Anime-Logo über den bestehenden getAnimeBackdrops-Seam nur zur Darstellung laden."
    - "Fallback-Reihenfolge und text-only-Fall mit fokussierten Tests absichern."
  debug_session: ".planning/debug/103-release-anime-logo-fallback.md"

- truth: "Ein Fansubber mit Release-Version-Media-Update-Berechtigung kann bei fehlendem Preview einen zulässigen Screenshot oder ein Typesetting-/Karaoke-Bild als Preview markieren; der Max-one-Preview-Vertrag bleibt atomar erhalten."
  status: failed
  reason: "User reported: Sheppert kann bei Release 1 kein Preview festlegen, obwohl die Datenbank keinen vorhandenen Preview-Kandidaten zeigt."
  severity: major
  test: 9
  root_cause: "Die aktive ReleaseVersionMediaSection versteckt Preview-Auswahl im generischen Bearbeitungs-Drawer, koppelt sie an den breiten canEditSelectedItem-Gate und sendet sie erst beim allgemeinen Speichern; der vorhandene enge togglePreview-Pfad ist nicht eingebunden."
  artifacts:
    - path: "database:release_version_media/release_version_id=1"
      issue: "Alle vorhandenen Relationen haben is_preview_candidate=false; die UI erlaubt Sheppert trotzdem keine Auswahl."
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx"
      issue: "Preview ist keine auffindbare Bildaktion und hängt von generischem Caption-/Status-Edit-State ab."
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx"
      issue: "Besitzt bereits einen engen Preview-Patch, wird von der aktiven Oberfläche aber nicht genutzt."
  missing:
    - "Auffindbare Preview-Aktion für berechtigte, zulässige Release-Version-Medien wiederverwenden/einbinden."
    - "Preview allein patchen und lokalen Max-one-Zustand nach Erfolg abgleichen."
    - "Owned-Fansubber-Berechtigungsform und Kandidatenwechsel testen."
  debug_session: ".planning/debug/103-release-preview-selection.md"

- truth: "Ein eingeloggter Platform Admin sieht bei einer Release-Version mit bereiter Streamquelle die sekundäre Aktion 'Episode abspielen'; Access-Projektion und Relay erkennen die aktive beziehungsweise refreshbare Admin-Session."
  status: failed
  reason: "User reported: Als eingeloggter Platform Admin fehlt der Streambutton bei Release-Version 1, obwohl release_streams/stream_sources eine Jellyfin-Quelle enthalten."
  severity: major
  test: 5
  root_cause: "Browser-UI und Next-Relay besitzen divergierende Auth-Sichten: Der Client erkennt die Session, der server-cookie-basierte Relay sieht weder Access- noch Refresh-Cookie, antwortet lokal 401 und der Player behandelt jede Nicht-2xx-Antwort still wie available=false."
  artifacts:
    - path: "database:release_versions/1"
      issue: "Release-Version 1 besitzt Variant 1, Release-Stream 1 und eine Jellyfin-Streamquelle, aber die UI zeigt dem Platform Admin keine Abspielaktion."
    - path: "frontend/src/app/api/releases/[releaseVersionId]/playback-access/route.ts"
      issue: "Relay bricht vor Backend-Resolver mit 401 ab, wenn seine Cookie-Sicht leer ist."
    - path: "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.tsx"
      issue: "Nicht-2xx wird zu null/unsichtbarer Aktion kollabiert und verdeckt den Auth-Handoff-Fehler."
  missing:
    - "Eine zentrale, refreshfähige Auth-Seam für den geschützten Playback-Access-Abruf verwenden."
    - "Realen Cookie-/Refresh-Handoff bis zum Backend-Resolver integrieren testen."
    - "Auth-Fehler von legitimer Nichtverfügbarkeit unterscheidbar behandeln."
  debug_session: ".planning/debug/103-full-episode-admin-action.md"

- truth: "Der Kara-Bereich bleibt für Gäste und eingeloggte Nutzer sichtbar; eine aktive oder per Refresh wiederhergestellte Session ergänzt bei verfügbaren Segmenten nur die Abspielaktion und blendet den öffentlichen Abschnitt niemals aus."
  status: failed
  reason: "User reported: Als Gast ist Kara sichtbar, als eingeloggter Fansubber Sheppert verschwindet der gesamte Kara-Bereich."
  severity: major
  test: 4
  root_cause: "ThemeTimeline blendet sich bei leerem, einmaligem Server-Snapshot vollständig aus; öffentliche Segmentdaten werden unnötig über authorizedFetch geladen, während die clientseitige Session nur Controls aktivieren, aber die öffentlichen Segmente nicht neu laden kann."
  artifacts:
    - path: "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx"
      issue: "segments.length === 0 entfernt den gesamten öffentlichen Abschnitt; Auth-Änderungen können den Snapshot nicht reparieren."
    - path: "frontend/src/lib/api.ts"
      issue: "Der öffentliche Release-Detailabruf nutzt einen auth-abhängigen Fetch-Pfad ohne gemeinsame Browser-Session im Serverkontext."
  missing:
    - "Öffentliche Release-/Kara-Daten session-neutral laden."
    - "Playback-Fähigkeit und Grant getrennt über die zentrale refreshfähige Auth-Seam ergänzen."
    - "Gast zu Refresh-only/Login-Übergang testen, ohne die öffentliche Timeline auszublenden."
  debug_session: ".planning/debug/103-karaoke-auth-visibility.md"

- truth: "Rollenbasierte Release-Texte nutzen auf Desktop ein responsives Zwei-Spalten-Grid mit spaltenfüllenden Karten; Tablet und Mobil bleiben gut lesbar einspaltig."
  status: failed
  reason: "User reported: Die fachliche Darstellung passt, aber auf Desktop bleibt neben den schmalen Textkarten sehr viel ungenutzte weiße Fläche."
  severity: cosmetic
  test: 3
  root_cause: "Die Zwei-Spalten-Regel liegt auf der inneren Kartenliste jeder Rolle statt auf einem Wrapper der Rollenblöcke; bei einem Text belegt die Karte nur die linke 50-Prozent-Spalte."
  artifacts:
    - path: "C:/Users/admin/AppData/Local/Temp/codex-clipboard-644efa92-9bb3-49c9-97ff-ba84365efed5.png"
      issue: "Schmale einspaltige Rollen-/Textkarten nutzen auf Desktop nur etwa die linke Hälfte der Inhaltsfläche."
    - path: "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.module.css"
      issue: "repeat(2, ...) ist auf .list statt auf der Sammlung der .roleGroup-Geschwister definiert."
  missing:
    - "Rollenblöcke in ein responsives Desktop-Zwei-Spalten-Grid legen."
    - "Innere Kartenlisten einspaltig und spaltenfüllend halten; Tablet/Mobil einspaltig testen."
  debug_session: ".planning/debug/103-release-text-grid.md"

- truth: "Alle Release-Bilder erscheinen in einem gemeinsamen responsiven Grid, sind über die bestehende Public-Fansub-Lightbox anklickbar, laden das Original mit vollständiger Beschreibung und zeigen Kategorie sowie Uploader; die Kartenbeschreibung ist gekürzt und es erscheint kein wirkungsloser 'Weitere 0 Bilder anzeigen'-Button."
  status: failed
  reason: "User reported: Der Mehr-anzeigen-Button funktioniert nicht, Bilder sind nicht anklickbar und die Kategorie-Kapitel entsprechen nicht mehr der gewünschten gemeinsamen Grid-Darstellung."
  severity: major
  test: 2
  root_cause: "ReleaseGallery codiert vier Kategorie-Kapitel und eine zu breite Button-Bedingung fest, berechnet den Rest immer gegen Desktop-Limit 6 und rendert reine figure-Elemente ohne Auswahl-/Lightbox-Zustand; die vorhandene FansubMediaLightbox wurde nicht wiederverwendet."
  artifacts:
    - path: "C:/Users/admin/AppData/Local/Temp/codex-clipboard-d4a1fcdd-8c29-4ca2-b144-c477f8f8142a.png"
      issue: "Getrenntes Kategorie-Kapitel mit nicht funktionierendem 'Weitere 0 Bilder anzeigen'-Button und nicht anklickbaren Bildern."
    - path: "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx"
      issue: "Kategorie-Mapping, feste 6er-Arithmetik und fehlende semantische Bildaktionen erzwingen das fehlerhafte Verhalten."
    - path: "frontend/src/components/fansubs/FansubMediaLightbox.tsx"
      issue: "Bestehender Original-/Beschreibung-/Keyboard-Lightbox-Seam wurde nicht genutzt."
  missing:
    - "Ein gemeinsames dedupliziertes Release-Bilder-Grid mit Kategorie- und Uploader-Metadaten."
    - "Bestehende Public-Fansub-Lightbox über einen kleinen gemeinsamen Item-Vertrag wiederverwenden."
    - "Reveal-Zustand ohne Null-Restwert und mit responsiven Tests neu ausrichten."
  debug_session: ".planning/debug/103-release-image-gallery.md"

- truth: "Die Release-Seite verwendet dieselbe öffentliche Fansub-/Projekt-Designsprache mit Hintergrundatmosphäre, weichen Glass-/Kartenoberflächen, Typografie, Radien, Schatten, Abständen und blauen Akzenten, behält aber einen eigenständigen Release-Hero ohne Projekt-Banner-Aufbau."
  status: failed
  reason: "User reported: Das aktuelle Release-UI sieht visuell nicht wie die öffentliche Fansub-Projektseite aus."
  severity: major
  test: 1
  root_cause: "Phase 103 nutzte einzelne globale Primitives/Tokens, aber weder die Datenprojektion noch die Seitenkomposition der öffentlichen Fansub-/Projektseiten: Atmosphäreninput, Full-Bleed-Backdrop, Vordergrundebene und Glass-Shell fehlen."
  artifacts:
    - path: "C:/Users/admin/AppData/Local/Temp/codex-clipboard-1b8be792-e0ec-4e87-bfdc-a1ee087b37e4.png"
      issue: "Aktuelle Release-Seite mit hellem, flachem Zweispalten-Hero."
    - path: "C:/Users/admin/AppData/Local/Temp/codex-clipboard-3efc45b6-a0f1-4b0c-9999-f066aa57ead3.png"
      issue: "Stilreferenz der öffentlichen Fansub-Projektseite; der Banner-Aufbau selbst soll nicht übernommen werden."
    - path: "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css"
      issue: "Nur zentriertes Standard-Grid; keine öffentliche Atmosphären-/Glass-Komposition."
    - path: "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx"
      issue: "Generischer Zweispalten-Hero ohne eigenständige editoriale Glass-Oberfläche."
  missing:
    - "Vorhandene öffentliche Backdrop-/Theming-Seams in die Release-Komposition übernehmen."
    - "Eigenständigen Release-Hero als Glass-/Editorial-Surface umsetzen, ohne Projektbanner zu kopieren."
    - "Desktop- und Mobilvergleich gegen beide UAT-Referenzen."
  debug_session: ".planning/debug/103-release-visual-language.md"

- truth: "Öffentliche Release-Links bleiben innerhalb der Pretty Fansub-Projekt-Route; technische ID-Routen sind nur Kompatibilitätsrouten."
  status: failed
  reason: "User reported: Der Absprung vom Pretty Fansub-Projekt führt auf die technische Route /anime/{id}/group/{groupId}/releases/{releaseVersionId}."
  severity: major
  test: 7
  root_cause: "Es existiert weder die verschachtelte Pretty-Release-Route noch ein gemeinsamer slug-basierter Release-Link-Builder; die Pretty-Projektseite verwirft die aufgelösten Slugs und mehrere Komponenten hardcodieren unabhängig technische ID-URLs."
  artifacts:
    - path: "frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.tsx"
      issue: "Die kanonische öffentliche Release-Route fehlt vollständig."
    - path: "frontend/src/app/anime/[id]/group/[groupId]/sections/LatestReleaseSection.tsx"
      issue: "Erzeugt wie weitere Release-Linkquellen eine technische ID-URL."
    - path: "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNavigation.tsx"
      issue: "Vorher/Weiter besitzt keinen kanonischen Pretty-Route-Kontext."
  missing:
    - "Dünnen Pretty-Route-Adapter mit gemeinsamer Release-Seitenkomposition ergänzen."
    - "Zentralen slug-basierten Release-Path-Builder und kanonischen Route-Kontext durchreichen."
    - "Technische Route als Kompatibilitätsroute erhalten und öffentliche Links/Navigation testen."
  debug_session: ".planning/debug/103-pretty-release-route.md"

- truth: "Öffentlich geschaltete Release-Bilder bleiben für Nutzer mit Update-Berechtigung erneut öffnungs- und beschreibbar."
  status: failed
  reason: "User reported: Nach Upload, Veröffentlichung und erneutem Öffnen kann kein Text mehr eingegeben werden; die Bearbeitung wirkt gesperrt."
  severity: major
  test: 8
  root_cause: "Die Listen-API annotiert can_update/can_delete, die PATCH-Antwort lädt das Medium jedoch ohne Actor-Permission-Annotation neu; Go serialisiert false, der Hook ersetzt den berechtigten Eintrag damit und die UI sperrt beim Wiederöffnen alle Felder."
  artifacts:
    - path: "backend/internal/handlers/admin_content_release_version_media.go"
      issue: "PatchReleaseVersionMedia nutzt einen Response-Loader ohne dieselbe Berechtigungsannotation wie ListReleaseVersionMedia."
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts"
      issue: "Ersetzt das korrekt annotierte Item unverändert durch die PATCH-Antwort mit can_update=false."
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx"
      issue: "Ein explizites false verhindert den Fallback auf die weiterhin gültige Aggregate-Capability."
  missing:
    - "PATCH-Antwort durch denselben actor-spezifischen Permission-Annotation-Seam wie die Liste führen."
    - "Backend-Vertragstest für öffentlich setzen und can_update=true beibehalten."
    - "Frontend-Regression für veröffentlichen, schließen, öffnen, Beschreibung bearbeiten."
  debug_session: ".planning/debug/103-public-image-description-edit.md"
