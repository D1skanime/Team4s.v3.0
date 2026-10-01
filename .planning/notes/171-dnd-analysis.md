# Phase 171 – Analyse: Drag-and-drop der Story-Reihenfolge (Release-Media-Editseite)

**Erstellt:** 2026-10-01 · **Stand:** `main` @ `cb430d7d` (VM `team4s-linux`)
**Route:** `/admin/episode-versions/27/edit?tab=media`
**Zweck:** Grundlage für einen neuen GSD-Auftrag (Gap-Closure Phase 171 oder Quick-Task), um die Reihenfolge-Bearbeitung von Medien und Kara neu und belastbar umzusetzen.

---

## 1. Kurzfazit

Das Backend speichert die gemischte Story-Reihenfolge korrekt (alle `POST …/media/reorder` im Log liefern 200, die Tabelle `release_version_story_order` für Release 27 ist konsistent: 10 Medien + 3 Kara = 13 Zeilen).
**Das Problem liegt im Frontend.** Drag-and-drop ist dort als Mischung aus nativem HTML5-DnD und selbstgebautem Pointer-Tracking in einer 845-Zeilen-Komponente umgesetzt. Die zwei Mechanismen sabotieren sich gegenseitig. Seit Commit `375b362f` kann **kein Drag mehr zu einer Umsortierung führen** (siehe 2.1, per Playwright nachgewiesen). Dazu kommen ein Off-by-one-Fehler in der Einfügelogik, fehlendes visuelles Feedback, null Testabdeckung und ein Rechte-Pfad, der für Nicht-Admins immer mit 409 scheitert.

Die vier letzten Codex-Commits (`9aac95e9`, `375b362f`, `cb430d7d`) sind Symptom-Patches, die neue Event-Handler hinzufügen, ohne das Modell zu klären. **Empfehlung: nicht weiter patchen, sondern die Sortier-Interaktion als eigene, getestete Einheit neu bauen** (Abschnitt 6).

---

## 2. Warum der Drag-and-drop nicht funktioniert (Ursachen, nach Schwere)

### 2.1 BLOCKER – `pointercancel` löscht den Drag-Zustand sofort nach `dragstart`

Datei: `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`, Z. 504–531 (Kara) und 562–588 (Medien)

```tsx
onDragStart={(e) => handleMediaDragStart(e, id)}         // setDraggedMediaId(id)
onPointerDown={(e) => handleMediaPointerStart(e, id)}    // setDraggedMediaId(id)
onPointerCancel={() => { setDraggedMediaId(null); setDragOverMediaId(null) }}
onDrop={() => handleMediaDrop(id)}                       // prüft draggedMediaId == null → Abbruch
```

Der Browser feuert nach Pointer-Events-Spezifikation **`pointercancel`, sobald ein nativer Drag beginnt**. Nachgewiesen mit Playwright/Chromium im Frontend-Container (2026-10-01), echte Mausbewegung:

```
pointerdown@a > dragstart@a > pointercancel@a > dragover@a > dragover@b > drop@b > dragend@a
```

Ablauf in der Komponente: `dragstart` setzt `draggedMediaId = X` → `pointercancel` setzt `draggedMediaId = null` → `drop` ruft `handleMediaDrop`, das bei `draggedMediaId == null` sofort abbricht. **Ergebnis: Jeder Drag endet ohne Reorder-Request.** Eingeführt durch `375b362f fix(171): support pointer dragging for story cards`.

### 2.2 BLOCKER – zwei konkurrierende Drag-Modelle gleichzeitig

Pro Karte hängen **neun Drag-/Pointer-Handler auf zwei verschachtelten Elementen**:

| Element | Handler |
|---|---|
| Äußere Karte (`.mediaCard`) | `draggable`, `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd`, `onPointerEnter`, `onPointerMove`, `onPointerUp`, `onPointerCancel` |
| Innere Fläche (`.mediaCardOpen`) | `draggable`, `onDragStart` (mit `stopPropagation`), `onPointerDown` |

- Das Pointer-Modell funktioniert mit der Maus nie: Sobald sich die Maus bewegt, übernimmt nativer DnD, und `pointerup`/`pointermove` kommen nicht mehr an.
- Mit Touch funktioniert es ebenfalls nicht: Touch-Pointer haben **implizites Pointer-Capture**, `pointerup` landet immer auf der Startkarte (→ Drop auf sich selbst = No-op). Ohne `touch-action: none` scrollt der Browser stattdessen und feuert `pointercancel`.
- Verschachteltes `draggable` außen + innen ist redundant und macht unklar, welches Element den Drag besitzt.

### 2.3 HOCH – Off-by-one: Nach unten/rechts verschieben ist unmöglich

`handleMediaDrop` (Z. 194–230) entfernt das gezogene Element und fügt es **vor** dem Ziel ein:

```
[A, B, C]  A auf B ziehen  → ohne A: [B, C], Ziel B = Index 0 → [A, B, C]   (keine Änderung!)
[A, B, C]  A auf C ziehen  → [B, A, C]                                     (landet VOR C)
```

Auf den rechten Nachbarn ziehen ist ein No-op, und **an die letzte Position kommt kein Element**. Selbst wenn 2.1 behoben wird, wirkt der DnD dadurch „kaputt“.

### 2.4 HOCH – Für Nicht-Plattform-Admins scheitert jede Umsortierung mit 409

- `ListReleaseVersionMedia` filtert die Medien pro Akteur (`filterReleaseVersionMediaItemsForActor`, `admin_content_release_version_media.go`), `story_order` wird aber **ungefiltert** mitgeliefert.
- Das Frontend (`useReleaseVersionMedia.ts` Z. 495–502) vergleicht `persistedStoryItems.length === items.length + segments.length`. Bei Abweichung verwirft es die gespeicherte Reihenfolge und baut eine **synthetische** (Medien nach `rvm.sort_order`, Kara hinten angehängt).
- Der Reorder-Endpunkt verlangt die **vollständige** Liste (`ReorderReleaseVersionStoryOrder`: `len(items) != len(current)` → 409 „die vollständige story-liste ist erforderlich“).
- Folge: Wer nicht alle Medien sieht (z. B. Projektleiter mit fremden Pending-Uploads), sieht eine falsche Reihenfolge, und jede Umsortierung springt nach dem Rollback zurück.
- Zusätzlich filtert das Frontend `visibleItems` (Pending ohne `can_update`), **`storyItems` aber nicht**: Die Liste zeigt dann Einträge, die laut Zähler/Kategorie-Badges nicht existieren.

### 2.5 MITTEL – Kein visuelles Feedback

- `data-drop-target` wird gesetzt, aber **keine CSS-Regel nutzt es** (weder in `ReleaseVersionMediaSection.module.css` noch global).
- Es gibt keinen Dragging-Zustand, keinen Einfügemarker und keinen Drag-Handle. `.mediaCardOpen` hat `cursor: pointer` statt `grab`.
- Die tote Alt-Komponente `ReleaseVersionMediaGallery.tsx` hatte `cardDragging`/`cardDropTarget` – das wurde beim Umbau nicht übernommen.
- Der Hinweis „Per Drag-and-drop verschieben“ steht nur auf Kara-Karten und wird auch ohne `can_reorder_media` angezeigt.

### 2.6 MITTEL – Keine Tastatur-/Mobile-Alternative, keine Tests

- Es gibt keine „Nach oben/Nach unten“-Steuerung, keine Tastaturbedienung und keine Live-Region. Auf Mobile (iOS Safari: kein natives HTML5-DnD auf Touch) ist Sortieren damit unmöglich.
- `ReleaseVersionMediaSection.test.tsx` (862 Zeilen) enthält **keinen einzigen Drag-/Drop-/Reorder-Interaktionstest**, `can_reorder_media` ist in allen Fixtures `false`. Die UAT-Angabe „149 Admin-Tests grün“ sagt über DnD nichts aus.
- Die Codex-Fixes wurden ohne reproduzierenden Test committet. Deshalb blieb 2.1 unbemerkt.

### 2.7 Historie (warum es „immer schlimmer“ wurde)

| Commit | Änderung | Wirkung |
|---|---|---|
| `8e306850` | Kara in Admin-Liste integriert | Admin-Liste ignorierte gespeicherte `story_order` → nach Reload war die Reihenfolge „weg“ |
| `47451ea0` | `story_order` im List-Response | Laden behoben, aber mit Count-Fallback (→ 2.4) |
| `9aac95e9` | `setData`, inneres `draggable`, `onMouseDown/Up` | Mouse-Handler wirkungslos (kein `mouseup` nach nativem Drag) |
| `375b362f` | Pointer-Handler + `onPointerCancel`-Reset | **Bricht nativen Drag vollständig (2.1)** |
| `cb430d7d` | `preventDefault` im Pointerdown entfernt | `dragstart` feuert wieder – wird aber weiterhin sofort durch 2.1 neutralisiert |

---

## 3. Was hartcodiert bzw. fragil ist

### Frontend
| Stelle | Hartcodierung / Problem |
|---|---|
| `ReleaseVersionMediaSection.tsx` Z. 98, 202–206, 505 ff. | Kara-Identität als **negative Zahl** (`-segment.id`) im selben `number`-State wie Media-IDs. Die String-Keys `'media:'+id`/`'kara:'+id` werden inline dreifach neu gebaut, obwohl `storyItemKey()` in den Helpers existiert. |
| `…Section.tsx` Z. 493 | Sortierung im Render (`.sort()` auf jedem Render) mit Fallback `visibleItems.map(...)`, der nie greift (`storyItems` ist immer ein Array, `??` greift nicht). |
| `…helpers.tsx` `getKaraCategoryLabel` | Kategorie per Substring-Heuristik: `includes('op')` → Opening, `includes('ed')` → Ending usw. Jeder Typname mit „op“ wird zu Opening. „Ending“ trifft `'ed'` nicht und fällt nur zufällig richtig durch. Labels gehören aus der DB (vgl. Migration 0169, Theme-Labels aus DB). |
| `…Section.module.css` `.karaCard[data-kara-category=…]` | Farb-Mapping hängt am **deutschen/englischen Anzeige-Label lowercased** (`insert`/`ending`/`outro`) statt an einem stabilen Typ-Code. |
| `…helpers.tsx` `createKaraStoryItem` | Kara-Vorschaubild = erstes Preview-/beliebiges Release-Bild (nicht Kara-spezifisch, kein echtes Default-Asset). |
| `useReleaseVersionMedia.ts` Z. 495–502 | Count-basierter Fallback mit synthetischer Ordnung `(lastMedia.sort_order) + (i+1)*10` → verdeckt Inkonsistenzen still. |
| `useReleaseVersionMedia.ts` Z. 438–448, 478 | Kara kommt nicht vom Media-Endpunkt, sondern aus `getAnimeSegments(animeId, groupId, version, …)` plus Client-Filter `assigned_release_version_ids.includes(versionId)`. Damit gibt es zwei Quellen für eine Liste, die das Backend als Ganzes validiert. |
| `buildStoryReorderRequest` / `handleMediaDrop` | Schrittweite `(index+1)*10` an zwei Stellen (das Backend überschreibt sie ohnehin). |
| Texte | „Kara-Segment · nur Orientierung“, „Per Drag-and-drop verschieben“ fest im Markup; Hinweis ohne Rechteprüfung. |

### Backend / DB
| Stelle | Problem |
|---|---|
| `admin_content_release_version_media_reorder.go` | Fehlerklassifikation per `strings.Contains(err.Error(), "complete" / "unsupported" / "more than once")` statt Sentinel-Errors. |
| `release_version_story_order_repository.go` `ListReleaseVersionStoryOrder` | **GET mit Schreib-Seiteneffekt**: normalisiert per DELETE/INSERT bei jedem Lesen. Im Reorder-Handler wird es zusätzlich vor der Transaktion aufgerufen (redundant, Race-anfällig). |
| Migration 0174 vs. Laufzeit-DB | **Schema-Drift:** Die Laufzeit-Tabelle hat andere Constraints (FK auf `theme_segments` statt auf `theme_segment_assignments`, `created_at`/`updated_at`, Trigger `release_version_story_order_target_trg`, andere Unique-Keys). 0175/0176 sind Laufzeit-Reparaturen. Eine frische DB aus den Migrationen hätte ein anderes Schema als `team4s_v2`. |
| `release_version_media.sort_order` | Wird beim Story-Reorder nicht mehr gepflegt. Zwei Wahrheiten für die Reihenfolge, die nur zufällig übereinstimmen. |

### Struktur
- `ReleaseVersionMediaSection.tsx` = **845 Zeilen** (Limit 450), `useReleaseVersionMedia.ts` = 541, Handler-Datei = 1298. Upload-Drawer, Edit-Drawer, Kartenrendering und DnD stecken in einer Komponente. Jeder DnD-Patch fasst diese Datei an.
- `ReleaseVersionMediaGallery.tsx` (383 Zeilen) ist **toter Code** (nirgends importiert), enthält aber eine alternative DnD-Implementierung. Agenten verwechseln die beiden leicht.

---

## 4. Was funktioniert (nicht anfassen)
- Endpunkt `POST /api/v1/admin/release-versions/:id/media/reorder` mit typisierten Items (`media`/`kara`), Rechteprüfung `ActionReleaseVersionMediaReorder`, Transaktion, Audit-Log.
- Persistenz in `release_version_story_order`; Public-Story liest dieselbe Tabelle (`release_detail_public_repository_helpers.go`).
- Optimistisches Update mit Rollback in `reorderItems` (Hook).

---

## 5. Live-Befund Release 27 (2026-10-01)
- `release_version_story_order`: 13 Zeilen, Reihenfolge `M3, M25, M9, K7, M8, M1, M23, K9, M5, M4, M7, M24, K8`.
- Backend-Log 12:36–12:45: 7× `POST …/27/media/reorder` → 200 (teils doppelt in derselben Sekunde, `12:45:21` – Hinweis auf doppelte Drop-Auslösung aus Testläufen).
- Zum Analysezeitpunkt lief eine Codex-Session auf der VM (pts/3). Vor dem neuen Auftrag prüfen, ob dort noch uncommittete Änderungen an `ReleaseVersionMediaSection.tsx` liegen.

---

## 6. Empfehlung für den GSD-Auftrag

### Ziel
Admins (und berechtigte Projektleiter) können Medien und Kara in der gemeinsamen Story-Liste per Maus, Touch und Tastatur zuverlässig umsortieren. Die Reihenfolge bleibt nach dem Reload erhalten und erscheint identisch in der Public Story.

### Lösungsansatz (Entscheidung im Discuss-Schritt treffen)
1. **Bibliothek statt Eigenbau:** `@dnd-kit/core` + `@dnd-kit/sortable` (React-18-kompatibel, Pointer-, Touch- und Keyboard-Sensoren, Screenreader-Ansagen, `arrayMove` ohne Off-by-one). Alternative ohne neue Abhängigkeit: **nur** natives HTML5-DnD (kein Pointer-Code) plus Pfeil-Buttons für Touch/Tastatur. Das ist schwächer auf Mobile.
2. **Neues globales Primitive** `SortableList`/`SortableGrid` unter `frontend/src/components/ui/` (Design-System-Pflicht laut CLAUDE.md, Showcase in `/dev/ui-system`). Die Release-Media-Seite konsumiert es nur.
3. **Ein Identitätsmodell:** `StoryItemKey = 'media:<id>' | 'kara:<id>'` als String überall. Keine negativen IDs.
4. **Einfügesemantik:** `arrayMove(from, to)` (Ziel-Index = Position des Ziels) statt „vor Ziel einfügen“.
5. **Eine Datenquelle:** Der Admin-Media-List-Endpunkt liefert die fertige, **für den Akteur gefilterte** Story-Liste (Medien + Kara mit Anzeigefeldern). Das Frontend baut nichts mehr aus `getAnimeSegments` zusammen und kennt keinen Count-Fallback.
6. **Reorder bei Teilsicht:** Das Backend akzeptiert die Reihenfolge der sichtbaren Items und mischt unsichtbare Items an ihren relativen Positionen wieder ein, **oder** der Reorder wird nur für Akteure mit Vollsicht angeboten (`can_reorder_media` entsprechend). Fachlich entscheiden.
7. **Komponenten-Split** von `ReleaseVersionMediaSection.tsx` unter 450 Zeilen: `MediaStoryList` (Sortierung), `MediaCard`, `KaraStoryCard`, `MediaUploadDrawer`, `MediaEditDrawer`. Toten Code `ReleaseVersionMediaGallery.tsx` (+ CSS/Test) entfernen.
8. **Visuelles Feedback:** Drag-Handle (`GripVertical`, `cursor: grab`), Dragging-Opacity, Einfügemarker, `aria-live`-Ansage „Element X an Position N verschoben“, Toast bei Fehler. Nur globale Design-Tokens verwenden.
9. **Backend-Aufräumen (optional, eigener Plan):** Sentinel-Errors statt `strings.Contains`; Normalisierung aus dem GET in Schreibpfade (Upload/Delete/Assign) verlegen; Migration für Schema-Drift zwischen 0174 und Laufzeit-DB (kanonisches Schema festschreiben).

### Akzeptanzkriterien (müssen als Tests existieren, bevor UAT startet)
- [ ] Unit: `moveStoryItem([A,B,C], A→B)` = `[B,A,C]`; `A→C` = `[B,C,A]`; `C→A` = `[C,A,B]`.
- [ ] Komponententest mit `can_reorder_media: true`: Drag (bzw. Keyboard-Sensor: Space, ArrowDown, Space) ruft `reorderItems` mit **vollständiger** Liste in neuer Reihenfolge auf.
- [ ] Komponententest: Kara zwischen zwei Medien verschieben → Request enthält `{type:'kara', theme_segment_id}` an der richtigen Position.
- [ ] Ohne `can_reorder_media`: kein Handle, kein Hinweistext, keine Drag-Handler.
- [ ] Backend-Test: Reorder durch Projektleiter mit Teilsicht → kein 409, unsichtbare Items behalten relative Position (oder Reorder ist korrekt deaktiviert, je nach Entscheidung 6).
- [ ] **Playwright-E2E im Frontend-Container** gegen echte Route (Release 27): Element per echter Mausbewegung verschieben → Reload → neue Reihenfolge sichtbar → Public-Route zeigt dieselbe Reihenfolge. *(Pflicht. Genau dieser Pfad ist bisher nie automatisiert geprüft worden.)*
- [ ] Mobile-Viewport (375 px): Sortieren per Touch oder Pfeil-Buttons möglich.
- [ ] `ReleaseVersionMediaSection.tsx` und neue Dateien ≤ 450 Zeilen; nur `@/components/ui`-Primitives; deutsche UI-Texte mit Umlauten.

### Vorgeschlagener Auftrag (Copy-Paste)
> Gap-Closure Phase 171 auf team4s-linux: Drag-and-drop der gemischten Story-Reihenfolge auf `/admin/episode-versions/[id]/edit?tab=media` neu umsetzen. Grundlage: `.planning/notes/171-dnd-analysis.md`. Bestehenden Pointer-/HTML5-Hybrid in `ReleaseVersionMediaSection.tsx` vollständig ersetzen (nicht patchen), globales Sortable-Primitive unter `@/components/ui` einführen, Off-by-one-Einfügelogik beheben, Story-Liste serverseitig akteur-gefiltert ausliefern und den 409-Pfad für Teilsicht klären, Komponente unter 450 Zeilen splitten, toten `ReleaseVersionMediaGallery` entfernen. Akzeptanzkriterien aus Abschnitt 6 sind Pflicht, inklusive Playwright-E2E mit echter Mausbewegung und Reload-Prüfung, bevor Live-UAT angefragt wird.
