# Phase 180: Einheitliche Upload-Oberfläche (F-15 Teil 2) — Research

**Researched:** 2026-10-11
**Domain:** Frontend React/Next.js UI-Komponenten-Konsolidierung (Upload-Flows), kein Backend-/Rechte-Umbau
**Confidence:** HIGH (alle Kernaussagen gegen Live-Code verifiziert, inkl. Backend-Response-Shapes)

## Summary

Diese Phase baut einen wiederverwendbaren Upload-Baustein nach Vorbild von Weg 1
(`ReleaseVersionMediaSection.tsx` + `ReleaseVersionMediaUploadQueue.tsx` +
`useReleaseVersionMedia.ts`) und stellt funktional nur Weg 1 und Weg 2 (Gruppenmedien) darauf um
(D-01). Zusätzlich bekommen alle acht Upload-Wege eine gemeinsame **Präsentations**-Primitives-Schicht
unter `frontend/src/components/ui` (D-13) — reine Optik, keine fachliche Verschmelzung.

Der Baustein hat zwei klar zu trennende Schichten, weil `/dev/ui-system` selbst die Regel
„Keine Team4s-Fachlogik in `src/components/ui`" explizit als aktive Spielregel führt (siehe
Pitfall 1): (1) **präsentationale Primitives** (Dropzone, Datei-Auswahl-Button, Pro-Datei-
Fortschritts-/Fehler-Zeile) ohne API-Aufrufe, geeignet für `/dev/ui-system` und alle 8 Wege; (2)
ein **geteilter Orchestrierungs-Hook** (Merge, Upload-Request, Retry, Patch-Nachlauf) mit API-
Aufrufen, der NICHT unter `components/ui` gehört, sondern wie der bestehende
`useCancellableSlugState` unter `frontend/src/hooks/` liegen sollte, parametrisiert über einen
kleinen Adapter (welche Upload-/Patch-API-Funktion wird aufgerufen), damit Weg 1 und Weg 2 ihn
beide nutzen können, ohne dass er App-Routen-spezifisch wird.

Eine kritische, nur durch Backend-Code-Lektüre auffindbare Einschränkung: Der Weg-2-Backend-
Endpoint (`POST /admin/fansubs/:id/media`) liefert in seiner Ready-Antwort **keine**
Beziehungs-ID der neu erzeugten `fansub_group_media`-Zeile zurück (nur `media_asset_id`) — anders
als Weg 1, dessen Antwort `release_version_media_id` direkt mitliefert. D-11 (optionale Pro-Datei-
Titel/Caption für Weg 2) und D-12 (Einzel-Retry nach Weg-1-Muster) setzen beide voraus, dass die
neue Zeile unmittelbar nach dem Upload adressierbar ist. Ohne eine kleine additive
Backend-Antwort-Erweiterung (neues Feld `fansub_group_media_id`, analog zu
`release_version_media_id`) ist der Weg-1-Patch-Nachlauf-Pfad für Weg 2 nicht 1:1 übertragbar — nur
ein fragiles Nachlade-und-Zuordnen-Workaround wäre rein frontend-seitig möglich. Siehe Pitfall 2 und
Offene Frage 1.

**Primary recommendation:** Baue die Präsentations-Primitives (`UploadDropzone`, `UploadFileRow`)
als reine, API-freie Komponenten unter `frontend/src/components/ui` mit Showcase unter
`/dev/ui-system`; baue den Orchestrierungs-Hook (`useUploadQueue`, generalisiert aus
`useReleaseVersionMedia.ts`s `runUpload`/`retryUpload`/`patchUploadedItem`) unter
`frontend/src/hooks/`; kläre vor Planung, ob die additive Backend-Antwort-Erweiterung für Weg 2
(`fansub_group_media_id` im Upload-Response) Teil dieser Phase ist oder per Nutzerentscheidung
explizit ausgeschlossen wird.

## User Constraints (from CONTEXT.md)

> 180-CONTEXT.md verwendet keine Abschnittsüberschriften „Decisions/Claude's Discretion/Deferred
> Ideas" im GSD-Standardformat, sondern `<decisions>`, `<open_questions>` (alle beantwortet) und
> eine „Explizit außerhalb des Umfangs"-Passage im `<domain>`-Block. Die folgenden Blöcke sind
> wörtlich aus 180-CONTEXT.md übernommen und bilden den verbindlichen Rahmen dieser Phase.

### Locked Decisions (D-01 bis D-13, verbindlich)

- **D-01:** Nur Weg 1 (Release-Medien) und Weg 2 (Gruppenmedien) werden auf den gemeinsamen
  Upload-Baustein umgestellt. Weg 6 (Release-Theme-Assets), obwohl in der Roadmap-Vorlage
  ursprünglich vorgesehen und obwohl Phase 179 dafür bereits `ActionReleaseThemeAssetUpload"
  geschaffen hat, bleibt wie 3/4/5/7/8 außerhalb des funktionalen Umbau-Umfangs — nur
  Konvertierbarkeits-Prüfung (Dokumentation), keine Code-Änderung an Weg 6 in dieser Phase.
- **D-02 (Nutzerregel, verbindlich):** „Globalen Uploader wiederverwenden" — kein neuer Uploader
  und kein neuer Upload-Endpunkt wird gebaut. Vorbild ist der bestehende Release-Medien-Upload.
  Der gemeinsame Baustein entsteht als Primitive unter `frontend/src/components/ui` (bzw. dort, wo
  der bestehende Uploader liegt) und nutzt die globalen Primitives/Tokens (`Button`, `Input`,
  `Textarea`, `FormField` u. a.) statt Eigen-Markup.
- **D-03 (Nutzerregel, verbindlich):** Keine doppelten Oberflächen — die durch den gemeinsamen
  Baustein abgelöste Upload-Logik wird vollständig entfernt, insbesondere
  `GroupMediaReviewUploadPanel.tsx`s Replace-statt-Merge-Logik
  (`GroupMediaReviewSection.tsx:340-342`) und die batch-weite Fehlerbehandlung ohne Einzel-Retry
  (`useGroupMediaReviewActions.ts:158-186`). Kein Nebeneinander von altem und neuem Code nach
  Migration.
- **D-04 (Projektregel):** Deutscher UI-Text verwendet durchgängig echte Umlaute (ä, ö, ü, Ä, Ö,
  Ü, ß) — keine ASCII-Ersetzungen in user-facing Strings.
- **D-05 (Teststil-Regel, aus CLAUDE.md):** Auswahl-Merge, Retry-Zustände und Validierung werden
  als reine, testbare Funktionen extrahiert und direkt getestet (keine Quelltext-Grep-Tests).
  UI-Verhalten (Drag&Drop, Drawer-Öffnen, visuelles Feedback) wird per Live-UAT geprüft.
- **D-06 (Projektregel):** 450-Zeilen-Limit gilt für den neuen Upload-Baustein und alle dabei neu
  entstehenden Dateien. Bereits bestehende Überschreitungen
  (`ReleaseVersionMediaSection.tsx` 826, `GroupMediaReviewSection.tsx` 632,
  `useReleaseVersionMedia.ts` 553 Zeilen) werden durch diese Phase nicht automatisch behoben, aber
  jede Datei, die im Zuge der Migration bearbeitet wird, darf nicht über das Limit hinaus weiter
  wachsen — bei Bedarf wird aufgeteilt. *(Hinweis: Der Nutzer-Forschungsauftrag für diese Phase
  verlangt zusätzlich explizit, dass diese drei Dateien nach der Migration tatsächlich unter 450
  Zeilen liegen — das ist ambitionierter als der wörtliche D-06-Text. Siehe Abschnitt „450-Zeilen
  Split-Plan" unten für einen konkreten Weg, der beides erfüllt.)*
- **D-07 (Projektregel):** Ein Commit je fachlich abgeschlossener Änderung auf `main`; kein
  `git stash` bei offenen Änderungen; nicht pushen.
- **D-08 (Phasengrenze):** Phase 181 ist nicht Teil dieser Phase. Der gemeinsame Upload-Baustein
  muss aber so entworfen sein (Props/API), dass Phase 181 ihn unverändert einsetzen kann.
- **D-09:** Drag&Drop wird in den gemeinsamen Baustein übernommen (eine Implementierung statt
  zwei getrennter Dropzone-Implementierungen in Weg 1 und Weg 2).
- **D-10:** Upload startet erst per Klick auf „Upload starten" — kein Sofort-Upload bei
  Dateiauswahl.
- **D-11:** Keine Pflichtfelder pro Datei — Titel/Bildunterschrift bleiben freiwillig, auch bei
  Weg 2 nach der Migration.
- **D-12:** Einzel-Retry pro Datei bei Teil-Fehlschlag für beide migrierten Wege, inklusive Weg 2
  (ersetzt dort die zusammengefasste Sammel-Fehlermeldung ohne Einzel-Retry).
- **D-13 (Scope-Erweiterung):** Optische Vereinheitlichung ALLER acht Upload-Wege über eine
  gemeinsame Präsentations-Primitives-Schicht unter `frontend/src/components/ui`, gezeigt in
  `/dev/ui-system`: Ablagefläche/Dropzone inkl. Klick-Auswahl, Datei-Auswahl-Button,
  Pro-Datei-Fortschrittsanzeige, Fehler-/Erneut-versuchen-Zeile. Fachliche Abläufe der Wege
  3–8 bleiben unverändert getrennt — nur die Darstellung wird angeglichen. D-01 bleibt für die
  funktionale Abgrenzung unverändert gültig.

### Claude's Discretion

Nicht explizit als eigener Abschnitt in 180-CONTEXT.md benannt. Implizit im Ermessen liegen laut
Formulierung von D-02/D-13: exakte Dateinamen/Dateiorte der neuen Primitives und des
Orchestrierungs-Hooks („bzw. dort, wo der bestehende Uploader liegt" lässt Spielraum), die genaue
Aufteilung der drei überlangen Dateien (D-06: „bei Bedarf wird aufgeteilt" ohne konkrete
Dateigrenzen vorzugeben), sowie ob/wie Wege 3–8 die Primitives technisch einbinden (z. B. ob
`UploadFileRow`s Titel-/Caption-Felder bei Single-Slot-Wegen wie Weg 3/5/7 überhaupt gerendert
werden oder per Prop ausgeblendet bleiben).

### Deferred Ideas (OUT OF SCOPE)

- **Phase 181** (Release-Bearbeitung zusammenführen, `/me`-Workspace entfällt) — läuft sequenziell
  nach 180, nicht parallel. Der Baustein muss so gebaut sein, dass 181 ihn unverändert einsetzen
  kann, ohne erneute Schnittstellen-Überarbeitung.
- **Funktionale Umstellung von Weg 3 (Fansub-Logo/Banner), Weg 4 (Anime-Assets), Weg 5
  (Segment-Assets), Weg 6 (Release-Theme-Assets), Weg 7 (Profil-Avatar/-Hintergrund/-Story), Weg 8
  (Medien-Vorschläge)** — bewusst getrennt laut Inventur, bleibt fachlich unangetastet. Nur die
  **Darstellung** wird über die D-13-Primitives angeglichen.
- **Neuer Rechte-Mechanismus** — Phase 179s Basis wird unverändert übernommen, diese Phase baut
  keine neue Permission-Logik.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Datei-Auswahl (Klick + Drag&Drop) | Browser/Client | — | Reine DOM-Events, kein Server-Zustand nötig |
| Auswahl-Merge (neue Dateien zur bestehenden Auswahl ergänzen) | Browser/Client | — | Pure Funktion über lokalen State, kein Netzwerk |
| Pro-Datei-Titel/Caption-Eingabe | Browser/Client | API/Backend (Persistenz) | UI-State bis zum Upload-Klick; persistiert über denselben PATCH-Mechanismus wie heute |
| Upload-Transport (Multipart-Request) | Browser/Client → API/Backend | — | Ruft bestehende `uploadReleaseVersionMedia`/`uploadFansubGroupMedia` auf; kein neuer Endpunkt (D-02) |
| Einzel-Retry pro Datei | Browser/Client | API/Backend | Re-Invoke derselben Upload-/Patch-Funktion für genau eine Datei |
| Rechte-/Capability-Prüfung | API/Backend | — | Phase-179-Basis, unverändert (D-01) |
| Review-Status-Setzung (`in_pruefung` etc.) | API/Backend | Browser (Anzeige) | Backend berechnet/speichert; Frontend rendert nur das Badge |
| Präsentations-Primitives (Dropzone, Datei-Auswahl-Button, Fortschritts-/Fehlerzeile) | Browser/Client (`components/ui`) | — | Reine UI-Bibliothekskomponenten ohne API-Aufrufe, von allen 8 Wegen konsumierbar |
| Orchestrierungs-Hook (Merge+Upload+Retry+Patch-Sequenzierung) | Browser/Client (`frontend/src/hooks/`) | API/Backend (Aufrufer) | Enthält Fachlogik/API-Aufrufe — gehört laut Projekt-Eigenregel NICHT unter `components/ui` (siehe Pitfall 1) |

## Standard Stack

Keine neuen externen Pakete. Der Baustein nutzt ausschließlich bereits vorhandene
Projekt-Abhängigkeiten:

### Core (bereits im Projekt, keine neue Installation)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | Komponentenmodell | Bereits Projektstandard (`frontend/package.json`) |
| Next.js | 16 (App Router) | Routing/SSR | Bereits Projektstandard |
| `@/components/ui` (intern) | — | Button, Input, Textarea, FormField, Drawer, Badge, Card, Select | D-02 verlangt explizit Wiederverwendung, kein neues Eigen-Markup |
| `lucide-react` | bereits installiert | Icons (UploadCloud, RefreshCw, Trash2, X) | Projektkonvention für Icons |
| Vitest 3 + `@testing-library/react` | bereits installiert | Tests für UI-Primitives und Hook-Logik | Projektstandard, siehe `Modal.test.tsx`/`ReleaseVersionMediaSection.helpers.test.ts` als Vorbild |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Eigene `useUploadQueue`-Implementierung je Weg | Externe Upload-Library (z. B. react-dropzone, uppy) | Verstößt gegen D-02 („globalen Uploader wiederverwenden", kein neuer Uploader); vorhandene Projektlösung ist bereits funktional äquivalent (Drag&Drop, Progress, Retry) |

**Installation:** Keine — reine interne Refactoring-/Komponentenarbeit, keine `npm install`-Schritte.

## Package Legitimacy Audit

**Nicht anwendbar.** Diese Phase installiert keine neuen externen Pakete; sie konsolidiert
bestehenden internen Code. Der Package-Legitimacy-Gate-Prozess entfällt vollständig — kein
`slopcheck`-Lauf nötig, keine neuen Registry-Einträge zu prüfen.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌───────────────────────────────────────────────┐
                    │  components/ui  (reine Präsentation, D-13)      │
                    │  ┌─────────────┐  ┌──────────────────────────┐ │
                    │  │UploadDropzone│  │UploadFileRow              │ │
                    │  │(Klick+Drop)  │  │(Preview, Titel/Caption,   │ │
                    │  │              │  │ Progress, Fehler+Retry)   │ │
                    │  └──────┬───────┘  └──────────┬───────────────┘ │
                    │         │ onFilesSelected      │ onChange/onRetry│
                    └─────────┼──────────────────────┼─────────────────┘
                              ▼                       ▼
                 ┌─────────────────────────────────────────────────┐
                 │  Weg-spezifische Seiten-Komponente                │
                 │  (ReleaseVersionMediaUploadDrawer /                │
                 │   GroupMediaReviewUploadPanel, schlank)            │
                 └─────────────────────┬───────────────────────────┘
                                       │ ruft auf
                                       ▼
          ┌─────────────────────────────────────────────────────────┐
          │  frontend/src/hooks/useUploadQueue.ts  (Fachlogik, NICHT  │
          │  unter components/ui, D-13-Pitfall 1)                     │
          │                                                           │
          │  mergeFileSelection() ──▶ Queue-State                     │
          │       │                                                   │
          │       ▼                                                   │
          │  startUpload(adapter) ──▶ adapter.uploadFiles(files) ─┐   │
          │       │                                                │   │
          │       ▼                                                ▼   │
          │  pro Datei: status idle→uploading→processing→ready/failed │
          │       │                                                │   │
          │       ▼                                                │   │
          │  adapter.patchMetadata(resultId, {title,caption}) ◀────┘   │
          │       │                                                   │
          │       ▼                                                   │
          │  retryUpload(fileIndex) ──▶ gleiche Pipeline, nur 1 Datei │
          └────────────────────┬──────────────────────────────────────┘
                                │ adapter-Implementierung je Weg
              ┌─────────────────┴─────────────────┐
              ▼                                    ▼
   Weg 1: uploadReleaseVersionMedia         Weg 2: uploadFansubGroupMedia
   + patchReleaseVersionMediaItem           + patchFansubMediaReview
   (resultId = release_version_media_id,    (resultId = media_asset_id — KEIN
    direkt in Response vorhanden)            fansub_group_media_id in Response,
                                              siehe Pitfall 2!)
```

### Recommended Project Structure

```
frontend/src/
├── components/ui/
│   ├── UploadDropzone.tsx          # neu — Klick+Drag&Drop-Fläche, keine API-Aufrufe
│   ├── UploadDropzone.module.css   # neu
│   ├── UploadFileRow.tsx           # neu — Pro-Datei-Zeile: Preview, Titel/Caption (optional
│   │                                #       über Prop ausblendbar für Single-Slot-Wege),
│   │                                #       Fortschrittsbalken, Fehler+Retry-Button
│   ├── UploadFileRow.module.css    # neu
│   ├── UploadDropzone.test.tsx     # neu — @vitest-environment jsdom, Testing-Library
│   ├── UploadFileRow.test.tsx      # neu
│   └── index.ts                    # ergänzt um die beiden neuen Exporte
├── hooks/
│   ├── useUploadQueue.ts           # neu — generalisierter Orchestrierungs-Hook (Merge,
│   │                                #       Upload, Retry, Patch-Nachlauf), API-Adapter-Pattern
│   ├── useUploadQueue.helpers.ts   # neu — reine Funktionen: mergeFileSelection, fileKey,
│   │                                #       isTerminalUploadStatus, statusLabel/-ClassName
│   ├── useUploadQueue.helpers.test.ts  # neu — D-05-konform, Vorbild:
│   │                                #       ReleaseVersionMediaSection.helpers.test.ts
│   └── useCancellableSlugState.ts  # bereits vorhanden — Präzedenzfall für Hook-Ort
├── app/admin/episode-versions/[versionId]/edit/
│   ├── ReleaseVersionMediaSection.tsx       # schrumpft: delegiert an die 3 neuen Dateien unten
│   ├── ReleaseVersionMediaUploadDrawer.tsx  # neu — Upload-Drawer-JSX + useUploadQueue-Aufruf
│   ├── ReleaseVersionMediaGrid.tsx          # neu (oder toten ReleaseVersionMediaGallery.tsx
│   │                                        #   nach Audit reaktivieren, siehe Pitfall 3) —
│   │                                        #   bestehende Medien-Kartenliste
│   ├── ReleaseVersionMediaEditDrawer.tsx    # neu — Bearbeiten/Ansehen-Drawer-JSX
│   └── useReleaseVersionMedia.ts            # schrumpft: delegiert Upload-Teil an useUploadQueue
└── app/admin/fansubs/[id]/edit/
    ├── GroupMediaReviewSection.tsx      # schrumpft: delegiert Filter/Pagination an neuen Hook
    ├── useGroupMediaReviewFilters.ts    # neu — extrahierte Filter-/Sortier-/Pagination-Memos
    ├── GroupMediaReviewUploadPanel.tsx  # umgebaut: nutzt UploadDropzone/UploadFileRow +
    │                                    #   useUploadQueue statt eigener Replace-Logik
    └── useGroupMediaReviewActions.ts    # schrumpft: handleUpload delegiert an useUploadQueue
```

### Pattern 1: Adapter-parametrisierter Orchestrierungs-Hook

**What:** `useUploadQueue` kennt keine konkrete API-Funktion. Er bekommt einen Adapter übergeben:
`{ uploadFiles: (files, onProgress) => Promise<PerFileResult[]>, patchMetadata?: (resultId, patch) => Promise<unknown> }`.
Weg 1 und Weg 2 bauen jeweils ihren eigenen Adapter aus bestehenden `lib/api`-Funktionen.

**When to use:** Immer wenn zwei oder mehr Konsumenten dieselbe Zustandsmaschine
(idle→uploading→processing→ready/failed, Merge, Retry) brauchen, aber unterschiedliche
Backend-Endpunkte aufrufen.

**Example (Quelle: generalisiert aus `useReleaseVersionMedia.ts:157-269`, Live-Code):**
```typescript
// frontend/src/hooks/useUploadQueue.ts (Skizze)
export interface UploadAdapter<TResult> {
  uploadFiles: (files: File[], onProgress: (percent: number) => void) => Promise<TResult[]>
  readyResultId: (result: TResult) => number | null
  patchMetadata?: (resultId: number, patch: { title?: string; caption?: string }) => Promise<unknown>
}

export function useUploadQueue<TResult>(adapter: UploadAdapter<TResult>) {
  // State-Maschine identisch zu useReleaseVersionMedia.ts's runUpload/retryUpload,
  // aber adapter.uploadFiles()/adapter.patchMetadata() statt hartkodierter API-Calls.
}
```

### Pattern 2: Präsentations-Primitive ohne Fachlogik

**What:** `UploadDropzone` kennt nur `onFilesSelected(files: File[])`, `accept`, `multiple`,
`disabled`, `dropHintLabel` — keine Kenntnis von Kategorien, Rechten oder Review-Status.

**When to use:** Für alle 8 Wege (D-13) — auch für Wege, die KEINE Mehrfachauswahl/Merge brauchen
(Weg 3/5/7 nutzen `multiple={false}`, Weg 4 rendert mehrere `UploadDropzone`-Instanzen je Slot).

**Example (Vorbild Weg 1, `ReleaseVersionMediaSection.tsx:654-697`, Live-Code):**
```tsx
<UploadDropzone
  accept="image/*"
  multiple
  disabled={!canChooseFiles}
  dropHintLabel={`Alle Dateien landen in „${categoryLabel(uploadCategory)}".`}
  onFilesSelected={handleFiles}
/>
```

### Anti-Patterns to Avoid

- **API-Aufrufe in `components/ui`:** `/dev/ui-system/page.tsx` führt „Keine Team4s-Fachlogik in
  `src/components/ui`" als aktive Spielregel. Der Orchestrierungs-Hook darf dort NICHT landen.
- **Zwei-Wege-Divergenz durch versteckte Annahmen:** Weg 2s Upload-Response liefert keine
  Beziehungs-ID zurück (siehe Pitfall 2) — ein naiv aus Weg 1 kopierter `patchUploadedItem`-Aufruf
  würde dort mit `resultId: null` auf den falschen Pfad laufen (Fallback-Retry-Branch in
  `useReleaseVersionMedia.ts:257`, `if (queueItem.resultId === null) return runUpload(...)` —
  würde die ganze Datei erneut hochladen statt nur die Metadaten zu patchen).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Drag&Drop-Dateiauswahl | Neue, dritte eigenständige `onDrop`/`onDragOver`-Implementierung | `UploadDropzone` (ein Bausatz für alle 8 Wege) | Weg 1 und Weg 2 haben heute je eine eigene, fast identische Implementierung (`ReleaseVersionMediaSection.tsx:283-306` vs. `GroupMediaReviewUploadPanel.tsx:87-95`) — dritte Variante wäre eine weitere Duplizierung |
| Per-Datei-Fortschritt/Fehler-Anzeige | Eigene Progress-/Error-Komponente je Weg | `UploadFileRow` | `ReleaseVersionMediaUploadQueue.tsx` hat dieses Muster bereits poliert (Status-Badge, `<progress>`, Retry-Button) — als Primitive extrahieren statt neu zu bauen |
| Status-Label/-Klassen-Mapping | Eigene switch-Anweisung je Weg | `statusLabel`/`statusClassName` aus `useUploadQueue.helpers.ts` (generalisiert aus `ReleaseVersionMediaSection.helpers.tsx:115-143`) | Bereits als reine Funktion vorhanden, nur Re-Export nötig |

**Key insight:** Der teuerste Fehler in dieser Phase wäre, den Orchestrierungs-Hook und die
Präsentations-Primitives in einer Datei zu vermischen — das würde D-13 (alle 8 Wege nutzen die
Primitives rein optisch, OHNE ihre fachlichen Abläufe zu teilen) technisch unmöglich machen, weil
jede Fachlogik im geteilten Code sofort alle 8 Konsumenten koppeln würde.

## Common Pitfalls

### Pitfall 1: Fachlogik versehentlich unter `components/ui` ablegen

**What goes wrong:** D-02 sagt „Baustein entsteht als Primitive unter `frontend/src/components/ui`"
— das lässt sich leicht so lesen, dass der GESAMTE Baustein (inkl. Upload-API-Aufrufe,
Retry-Zustandsmaschine) dort hinkommt.
**Why it happens:** Die Dropzone/FileRow-Optik UND die Merge-/Retry-Logik fühlen sich wie „ein
Baustein" an, obwohl sie unterschiedliche Verantwortlichkeiten haben.
**How to avoid:** `/dev/ui-system/page.tsx` führt explizit (als sichtbare Spielregel im UI) „Keine
Team4s-Fachlogik in `src/components/ui`" — bestätigt durch den Showcase-Codetext selbst. Nur die
Dropzone/FileRow-Komponenten (keine API-Importe, keine `lib/api`-Aufrufe) gehören dorthin. Der
Merge-/Upload-/Retry-Hook gehört nach `frontend/src/hooks/` (Präzedenzfall:
`useCancellableSlugState.ts`).
**Warning signs:** Eine neue Datei unter `components/ui/` importiert etwas aus `@/lib/api`.

### Pitfall 2: Weg 2s Upload-Response hat keine Beziehungs-ID für den Patch-Nachlauf

**What goes wrong:** Der Weg-1-Patch-Nachlauf (`patchUploadedItem` in `useReleaseVersionMedia.ts:127-155`)
setzt voraus, dass die Upload-Response direkt die neue Relations-ID zurückgibt
(`result.release_version_media_id`, siehe `admin_content_release_version_media_upload.go:33`).
Weg 2s Backend-Handler (`fansub_media_upload.go:297-307`, `uploadFansubGroupMedia` Zeilen 322-412)
liefert in `fansubGroupMediaFileResult` nur `MediaAssetID` zurück — **keine** ID der
`fansub_group_media`-Zeile (verifiziert in `CreateFansubGroupMediaAsset`-Aufruf Zeile 511-520, der
die neue ID nicht an den Ergebnis-Struct zurückgibt). `patchFansubMediaReview(fansubId, item.id, ...)`
braucht aber genau diese Relations-ID (`FansubGroupMediaItem.id`), nicht `media_asset_id`.
**Why it happens:** Weg 1 und Weg 2 sehen auf UI-Ebene identisch aus (Upload → optional Metadaten
nachreichen), haben aber unterschiedliche Backend-Response-Contracts — das fällt erst beim
Lesen des Go-Handlers auf, nicht beim Lesen des Frontend-Codes.
**How to avoid:** Vor der Plan-Erstellung klären, ob eine additive Backend-Änderung
(`fansub_group_media_id` zusätzlich zu `media_asset_id` in `fansubGroupMediaFileResult`, analog zur
bestehenden `release_version_media_id`-Konvention) Teil dieser Phase ist. Alternative ohne
Backend-Änderung: nach Upload `loadMedia()` aufrufen und die zuletzt erzeugten Items über
`sort_order` (deterministisch `maxSortOrder + (i+1)*10` in Datei-Reihenfolge, siehe
`fansub_media_upload.go:390-393`) den hochgeladenen Entwürfen zuordnen — fragil, aber ohne
Backend-Touch machbar. Siehe Offene Frage 1.
**Warning signs:** Ein Plan-Task zu Weg-2-Pro-Datei-Metadaten, der `patchFansubMediaReview` direkt
nach dem Upload-Response aufruft, ohne vorher zu klären, woher die Item-ID kommt.

### Pitfall 3: Toter Code `ReleaseVersionMediaGallery.tsx` mit überlappender Absicht

**What goes wrong:** Im selben Verzeichnis wie `ReleaseVersionMediaSection.tsx` liegt bereits eine
383-Zeilen-Komponente `ReleaseVersionMediaGallery.tsx` (+ `.module.css`, + `.test.tsx`), die laut
Phase-175-Befund (`STATE.md` Phase-175-Eintrag: „3 tote Parallel-Implementierungen
(segmenteTabUtils.ts, ReleaseVersionMediaGallery.tsx, MessageToast.tsx)") **nirgendwo importiert
wird** (verifiziert: `grep -rln "ReleaseVersionMediaGallery"` findet nur die Datei selbst + ihren
Test). Sie hat vermutlich genau die Absicht, die der 450-Zeilen-Split für die Medien-Kartenliste
jetzt bräuchte (siehe Split-Plan unten), ist aber möglicherweise veraltet/inkompatibel mit dem
aktuellen Datenmodell (Story-Items, Kara-Segmente).
**Why it happens:** Ein früherer Extraktionsversuch wurde nicht zu Ende geführt oder abgelöst,
aber nie gelöscht.
**How to avoid:** Vor dem Bau einer neuen `ReleaseVersionMediaGrid.tsx` zuerst `ReleaseVersionMediaGallery.tsx`
inhaltlich prüfen — entweder reaktivieren (falls kompatibel) oder explizit als Teil dieser Phase
löschen (verhindert, dass zwei ähnliche, aber unterschiedliche Grid-Implementierungen koexistieren).
**Warning signs:** Ein Plan-Task, der eine neue Grid-Komponente baut, ohne die bestehende tote
Datei zu erwähnen.

### Pitfall 4: `UploadFileRow`s Pro-Datei-Felder für Single-Slot-Wege fälschlich erzwingen

**What goes wrong:** D-13 verlangt, dass auch Weg 3/4/5/7 (Single-Slot-Replace, kein
Mehrfachauswahl-Charakter) die neuen Primitives nutzen. Wenn `UploadFileRow` Titel-/Caption-Felder
IMMER rendert, bekommen diese Wege plötzlich Formularfelder, die ihr Backend nicht konsumiert
(Weg 3/5/7 haben keine Titel-/Caption-Spalte im jeweiligen Datenmodell für diesen Slot).
**Why it happens:** Die Felder sind bei Weg 1/2 Kernbestandteil des Bausteins, aber bei den
präsentational-only-Wegen fachlich sinnlos.
**How to avoid:** `UploadFileRow` braucht eine Prop wie `showMetadataFields?: boolean` (Default
`true`), die Wege 3/4/5/7 explizit auf `false` setzen — nur Preview + Status + Retry, keine
Titel-/Caption-Eingabe.
**Warning signs:** Live-UAT bei Weg 4 (Anime-Cover-Upload) zeigt ein Titel-Eingabefeld, das beim
Speichern nirgendwo ankommt.

### Pitfall 5: `review_status`-Semantik bei der Merge-Migration vermischen

**What goes wrong:** Weg 1 hat kein Review-Gate, Weg 2 löst beim Upload `review_status=in_pruefung`
aus. Der geteilte `useUploadQueue`-Hook darf diese Semantik nicht im Hook selbst festlegen (sonst
wird eine der beiden Review-Verhaltensweisen versehentlich für beide Wege erzwungen).
**Why it happens:** Der Hook kennt nur Upload-Erfolg/-Fehler, nicht Review-Zustände — das
Review-Verhalten entsteht serverseitig automatisch beim Insert, nicht durch einen expliziten
Hook-Parameter. Das Risiko liegt eher darin, dass ein Entwickler versehentlich einen
`reviewStatusCode`-Parameter im Adapter hartcodiert, statt ihn aus dem jeweiligen Weg-Adapter zu
übernehmen (Weg 2 sendet aktuell `reviewStatusCode: 'in_review'` explizit in
`useGroupMediaReviewActions.ts:168`, Weg 1 sendet keinen solchen Parameter).
**How to avoid:** Der Adapter je Weg (nicht der Hook) legt per-Weg-Parameter wie
`reviewStatusCode`/`visibilityCode` fest; der Hook selbst bleibt review-status-agnostisch.
**Warning signs:** Ein neu hochgeladenes Gruppenmedium erscheint ohne „In Prüfung"-Status, oder ein
neues Release-Medium bekommt plötzlich einen Review-Gate-Status, den es vorher nicht hatte.

## Code Examples

### Bestehender Merge-Mechanismus (Weg 1, als Vorbild für `mergeFileSelection`)
```typescript
// Quelle: ReleaseVersionMediaSection.tsx:240-253 (Live-Code)
function handleFiles(nextFiles: File[]) {
  if (!canChooseFiles) return
  setSelectedDrafts((current) => {
    const merged = [...current]
    const seen = new Set(current.map((draft) => fileKey(draft.file)))
    for (const file of nextFiles) {
      const key = fileKey(file)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({ file, title: '', caption: '' })
    }
    return merged
  })
}
```
Als reine Funktion generalisierbar: `mergeFileSelection(current: Draft[], incoming: File[], keyFn) => Draft[]`.

### Bestehender Einzel-Retry-Mechanismus (Weg 1, Vorbild für den geteilten Hook)
```typescript
// Quelle: useReleaseVersionMedia.ts:250-269 (Live-Code)
const retryUpload = useCallback(
  async (fileIndex: number): Promise<UploadRunResult> => {
    const config = lastUploadConfigRef.current
    const queueItem = uploadItems[fileIndex]
    if (!config || config.versionId !== versionId || !queueItem || queueItem.status !== 'failed') {
      return { items: [], allSucceeded: false }
    }
    if (queueItem.resultId === null) return runUpload([fileIndex], [queueItem], config)
    // Nur Metadaten erneut patchen, Datei nicht erneut hochladen:
    const outcome = await patchUploadedItem(queueItem)
    // ...
  },
  [patchUploadedItem, reload, runUpload, uploadItems, versionId],
)
```
Dieser Verzweigungspunkt (`resultId === null` → komplett erneut hochladen, sonst → nur patchen)
ist genau die Stelle, an der Weg 2 heute scheitert (Pitfall 2), weil `resultId` dort nie gesetzt
werden kann, solange die Backend-Antwort keine Relations-ID liefert.

### Testmuster für reine Funktionen (D-05, bereits im Projekt etabliert)
```typescript
// Quelle: ReleaseVersionMediaSection.helpers.test.ts (Live-Code, 1:1 übertragbares Vorbild)
import { describe, expect, it } from 'vitest'
import { moveStoryItem } from './ReleaseVersionMediaSection.helpers'

describe('moveStoryItem', () => {
  const items = [/* ... */]
  it('moves an item to every requested position without an off-by-one', () => {
    expect(moveStoryItem(items, 0, 1).map(/* ... */)).toEqual([2, 1, 3])
  })
})
```
Für `mergeFileSelection`, `isTerminalUploadStatus`, `statusLabel`/`statusClassName` ist exakt
dieses Muster zu übernehmen: kein DOM, kein Mock, direkter Funktionsimport.

### Testmuster für UI-Primitives (DOM-Interaktion statt Quelltext-Grep)
```typescript
// Quelle: Modal.test.tsx (Live-Code, Vorbild für UploadDropzone.test.tsx/UploadFileRow.test.tsx)
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
// render(<UploadDropzone onFilesSelected={fn} ... />)
// fireEvent.drop(screen.getByRole('button'), { dataTransfer: { files: [...] } })
// expect(fn).toHaveBeenCalledWith([...])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Weg 2: Mehrfachauswahl ersetzt statt ergänzt (`setSelectedFiles(files.filter(...))`) | Weg 1-Muster: Mehrfachauswahl wird gemergt | Diese Phase (D-01/D-03) | Admins verlieren beim erneuten Datei-Dialog nicht mehr ihre vorherige Auswahl |
| Weg 2: Batch-Fehlermeldung ohne Einzel-Retry | Pro-Datei-Status + Einzel-Retry-Button (D-12) | Diese Phase | Erfolgreiche Dateien einer Batch-Uploads bleiben erfolgreich sichtbar, nur fehlgeschlagene müssen wiederholt werden |
| 6 getrennte Dropzone-/Upload-Button-Implementierungen über Wege 3–8 | Eine gemeinsame `UploadDropzone`/`UploadFileRow`-Optik (D-13) | Diese Phase | Visuelle Konsistenz über alle Admin-/Self-Service-Upload-Flächen, ohne Backend-Verträge zu ändern |

**Deprecated/outdated:**
- `GroupMediaReviewUploadPanel.tsx`s eigene Dropzone-Implementierung (Zeilen 75-125) wird durch
  `UploadDropzone` ersetzt und vollständig entfernt (D-03).
- `useGroupMediaReviewActions.ts`s `handleUpload` (Zeilen 158-186, Batch-only ohne Einzel-Retry)
  wird durch den Aufruf des geteilten `useUploadQueue`-Hooks ersetzt.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Der Orchestrierungs-Hook sollte unter `frontend/src/hooks/` statt unter `components/ui` liegen | Architecture Patterns, Pitfall 1 | Falls der Nutzer/Planner D-02 wörtlich als „alles inkl. Hook unter components/ui" lesen will, widerspricht das der verifizierten „keine Fachlogik"-Projektregel — sollte vor Planung einmal explizit bestätigt werden, ist aber durch Live-Code-Beleg (Pitfall 1) stark untermauert, daher nicht als offene Frage, sondern als empfohlene Leitplanke markiert |
| A2 | Eine additive Backend-Antwort-Erweiterung (`fansub_group_media_id`) ist der bessere Weg für D-11/D-12 bei Weg 2 als das Nachlade-Workaround | Pitfall 2, Open Questions | Falls der Nutzer eine reine Frontend-Lösung ohne jede Backend-Berührung verlangt, muss das fragilere Sortierungs-Zuordnungs-Workaround gewählt werden — höheres Fehlerrisiko bei gleichzeitigen Uploads mehrerer Admins derselben Gruppe |
| A3 | `ReleaseVersionMediaGallery.tsx` ist tatsächlich tote, nicht wiederverwendbare Altlast und keine versehentlich falsch verlinkte Produktivkomponente | Pitfall 3 | Falls doch irgendwo dynamisch importiert (nicht per statischem Import, daher von `grep` nicht erfasst), würde ihre Löschung/Änderung eine unbeabsichtigte Regression auslösen — sollte vor Umsetzung noch einmal per Laufzeit-Check (nicht nur grep) bestätigt werden |

## Open Questions

1. **Soll Weg 2s Backend-Upload-Antwort additiv um die Beziehungs-ID (`fansub_group_media_id`)
   erweitert werden, um den Weg-1-Patch-Nachlauf-Mechanismus 1:1 zu übertragen?**
   - Was wir wissen: Weg 1s Response liefert `release_version_media_id` direkt
     (`admin_content_release_version_media_upload.go:33`); Weg 2s Response liefert nur
     `media_asset_id` (`fansub_media_upload.go:297-307`), die `fansub_group_media`-Zeilen-ID wird
     beim Insert erzeugt (`fansub_media_upload.go:511-520`), aber nie zurückgegeben.
   - Was unklar ist: Ob eine solche additive, nicht-rechte-relevante Backend-Änderung noch im
     Rahmen von „Phase 180 ist reiner Frontend-/Workflow-Anteil, Phase 179 hat das Backend bereits
     abgeschlossen" liegt, oder ob der Nutzer das als Scope-Verstoß werten würde.
   - Recommendation: Vor Plan-Erstellung kurz beim Nutzer rückfragen (eine additive Response-Feld-
     Erweiterung am bestehenden Endpunkt verstößt nicht gegen D-02 „kein neuer Upload-Endpunkt",
     ist aber ein Backend-Touch). Falls nein: Sortierungs-basiertes Zuordnungs-Workaround
     (Pitfall 2) als Fallback einplanen und als bekanntes Risiko dokumentieren.

2. **Soll `ReleaseVersionMediaGallery.tsx` (toter Code, Pitfall 3) im Zuge dieser Phase gelöscht
   oder für die neue `ReleaseVersionMediaGrid.tsx`-Extraktion wiederverwendet werden?**
   - Was wir wissen: Datei existiert, wird nirgendwo statisch importiert, 383 Zeilen, hat eigene
     `.module.css` und `.test.tsx`.
   - Was unklar ist: Ob ihr internes Datenmodell (Props-Shape) mit dem aktuellen
     `ReleaseVersionAdminStoryItem`/Kara-Segment-Modell kompatibel ist, ohne das hier im Detail
     gegengelesen zu haben.
   - Recommendation: Erster Plan-Task im Split-Arbeitspaket sollte diese Datei kurz gegenlesen und
     explizit entscheiden (reaktivieren vs. löschen), statt sie zu ignorieren.

3. **Wie weit sollen die Präsentations-Primitives bei Weg 4 (Anime-Assets, 5 unabhängige Slots:
   Cover/Banner/Logo/Hintergrund/Segment-Video) eingesetzt werden — pro Slot eine eigene
   `UploadDropzone`-Instanz, oder bleibt der bestehende Klick-zu-Datei-Dialog (kein Drag&Drop
   heute, siehe Research-Beleg unten) unangetastet und nur `UploadFileRow`-Fortschrittsoptik
   übernommen?**
   - Was wir wissen: Weg 4 hat heute (verifiziert per grep) KEIN Drag&Drop, nur
     `<input type="file">` mit verstecktem Ref-Trigger je Slot.
   - Was unklar ist: Ob D-13 implizit auch Drag&Drop für Weg 4 einführen will (Feature-Zugewinn,
     nicht nur Optik) oder nur Button-/Fortschritts-Optik ohne Drag&Drop-Fähigkeit.
   - Recommendation: `UploadDropzone` so bauen, dass Drag&Drop optional per Prop deaktivierbar ist
     (`allowDrop?: boolean`, Default `true`), damit Weg 4 bewusst entscheiden kann, ohne die
     Primitive-API zu sprengen.

## Environment Availability

Übersprungen — reine Frontend-Code-Konsolidierung ohne neue externe Abhängigkeiten, Dienste oder
CLI-Werkzeuge. Node/npm/Docker-Compose-Verfügbarkeit ist bereits durch den laufenden
Team4s-Stack (`docker compose ps` auf `team4s-linux`) gegeben und wird durch diese Phase nicht
verändert.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3 (`frontend/package.json`) |
| Config file | `frontend/vitest.config.ts` (jsdom via `@vitest-environment`-Kommentar je Datei, nicht global) |
| Quick run command | `npm --prefix frontend run test -- <pfad-zur-datei>` |
| Full suite command | `npm --prefix frontend run test` |

### Phase Requirements → Test Map

> Phase 180 hat keine zugeordneten `REQ-`/`P1NN-`-IDs (`phase_req_ids: null` laut Orchestrator) —
> die Entscheidungen D-01 bis D-13 in 180-CONTEXT.md sind der verbindliche, nachverfolgte Vertrag
> statt formaler Requirement-IDs. Die folgende Tabelle bildet D-NN auf konkrete Testarten ab.

| Decision | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|--------------------|-------------|
| D-01/D-03 | Weg 2 merged statt ersetzt Auswahl | unit (pure fn) | `npx vitest run src/hooks/useUploadQueue.helpers.test.ts` | ❌ Wave 0 |
| D-05 | Merge/Retry/Validierung als reine Funktionen getestet | unit (pure fn) | `npx vitest run src/hooks/useUploadQueue.helpers.test.ts` | ❌ Wave 0 |
| D-09 | Dropzone unterstützt Klick + Drag&Drop | component (jsdom) | `npx vitest run src/components/ui/UploadDropzone.test.tsx` | ❌ Wave 0 |
| D-11 | Titel/Caption optional, kein Pflichtfeld-Fehler bei leerem Submit | component (jsdom) | `npx vitest run src/components/ui/UploadFileRow.test.tsx` | ❌ Wave 0 |
| D-12 | Einzel-Retry pro Datei bei Teil-Fehlschlag (beide Wege) | unit (hook, bereits etabliertes Muster wie `useReleaseVersionMedia.test.ts`) | `npx vitest run src/hooks/useUploadQueue.test.ts` | ❌ Wave 0 |
| D-13 | Alle 8 Wege rendern über die neuen Primitives (visuell) | manual-only (Live-UAT, kein automatisierter Visual-Diff im Projekt etabliert) | — | n/a |

### Sampling Rate
- **Per task commit:** gezielte `npx vitest run <datei>` für die gerade bearbeitete Datei
- **Per wave merge:** `npm --prefix frontend run test` (volle Suite) + `npm --prefix frontend run typecheck` + `npm --prefix frontend run lint`
- **Phase gate:** Volle Suite grün vor `/gsd:verify-work`, plus Live-UAT für D-13s optische
  Angleichung aller 8 Wege (automatisiert nicht sinnvoll abbildbar, da reine visuelle Angleichung)

### Wave 0 Gaps
- [ ] `frontend/src/hooks/useUploadQueue.helpers.test.ts` — deckt `mergeFileSelection`,
  `isTerminalUploadStatus`, `statusLabel`/`statusClassName` ab
- [ ] `frontend/src/hooks/useUploadQueue.test.ts` — deckt Adapter-Pattern, Retry-Verzweigung
  (`resultId === null` vs. Patch-Nachlauf) ab, Vorbild: `useReleaseVersionMedia.test.ts`
- [ ] `frontend/src/components/ui/UploadDropzone.test.tsx` — Klick + Drag&Drop + Keyboard
  (Enter/Space), Vorbild: `Modal.test.tsx`
- [ ] `frontend/src/components/ui/UploadFileRow.test.tsx` — Metadaten-Felder optional ein-/
  ausblendbar (Pitfall 4), Progress-Anzeige, Fehler+Retry-Button
- Framework-Install: keiner nötig — Vitest 3 bereits vollständig konfiguriert

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | nein | Unverändert, Phase 179s Basis bleibt bestehen |
| V3 Session Management | nein | Unverändert |
| V4 Access Control | nein (nur Konsum) | Rechte-Prüfung bleibt serverseitig in Phase-179-Endpunkten; diese Phase ändert keine Permission-Logik |
| V5 Input Validation | ja (client-seitig, NICHT als alleinige Kontrolle) | `accept="image/*"`-Browser-Filter bleibt rein UX-Hinweis; echte Validierung (Dateigröße max 15 MB, MIME-Type) bleibt serverseitig in `fansub_media_upload.go`/`admin_content_release_version_media_upload.go` — diese Phase darf keine neue client-only-Sicherheitsannahme einführen |
| V6 Cryptography | nein | Nicht betroffen |

### Known Threat Patterns for diesen Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Client-seitiger `accept`-Filter als einzige Typkontrolle missverstanden | Tampering | Bereits heute serverseitig per `rvmMaxFileSizeBytes`/MIME-Sniffing abgesichert (`fansub_media_upload.go:430-436`) — diese Phase darf diese Prüfung nicht umgehen oder dupliziert client-seitig „strenger" nachbauen, da das Backend die kanonische Quelle bleibt |
| Rechte-Umgehung durch neue UI-Zustände (z. B. Retry-Button sichtbar trotz fehlender Capability) | Elevation of Privilege | `UploadFileRow`s Retry-Button darf nur rendern, wenn der aufrufende Weg bereits `canUploadMedia`/äquivalent geprüft hat — die Primitive selbst prüft keine Rechte, das bleibt Aufgabe der Seiten-Komponente (wie heute) |

**Hinweis:** Diese Phase führt keine neue Rechte-Oberfläche ein und ändert keine
Authentifizierungs-/Autorisierungs-Pfade — das Sicherheitsrisiko dieser Phase ist strukturell
niedrig, solange die oben genannte Trennung (Primitive = keine Rechte-Prüfung, Seite = Rechte-
Prüfung wie heute) eingehalten wird.

## Sources

### Primary (HIGH confidence — Live-Code-Lektüre dieser Session)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` (826 Zeilen, vollständig gelesen)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaUploadQueue.tsx` (vollständig gelesen)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` (553 Zeilen, vollständig gelesen)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx` (vollständig gelesen)
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewUploadPanel.tsx` (vollständig gelesen)
- `frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewActions.ts` (vollständig gelesen)
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` (Kernabschnitte gelesen)
- `frontend/src/components/ui/index.ts`, `Drawer.tsx`, `Button.tsx`, `FormField.tsx`, `Modal.test.tsx` (Primitive-/Test-Konventionen)
- `frontend/src/app/dev/ui-system/page.tsx`, `showcase/DrawerShowcase.tsx` (Showcase-Registrierungsmuster, inkl. explizit sichtbarer Regel „Keine Team4s-Fachlogik in `src/components/ui`")
- `backend/internal/handlers/fansub_media_upload.go` (Zeilen 297-548, vollständig gelesen — Beleg für Pitfall 2)
- `backend/internal/handlers/admin_content_release_version_media_upload.go` (Zeile 33, Beleg für Response-Shape-Asymmetrie)
- `frontend/src/lib/api/admin/fansub-media.ts` (Zeilen 60-178, Response-Typdefinitionen)
- `frontend/src/lib/api/releases.ts` (Zeilen 197-221, Response-Typdefinitionen)

### Secondary (MEDIUM confidence)
- `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/175-INVENTORY.md`
  Fachaufgabe 1 (Datei:Zeile-Belege, teils vor dieser Session erstellt — Zeilennummern in dieser
  Session punktuell nachverifiziert, einige leicht verschoben wie erwartet)
- `.planning/STATE.md` Phase-175-Eintrag zu `ReleaseVersionMediaGallery.tsx` als toter Code
  (Behauptung in dieser Session per `grep -rln` nachverifiziert → HIGH, aber ursprüngliche
  Entdeckung war Phase 175, nicht diese Session)

### Tertiary (LOW confidence)
- Keine — alle Kernaussagen dieser Research wurden gegen Live-Code verifiziert, nicht nur aus
  Trainingsdaten übernommen.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — keine neuen Abhängigkeiten, reine interne Wiederverwendung, vollständig
  gegen `package.json` und bestehenden Code verifiziert.
- Architecture: HIGH — Orchestrierungs-Hook-vs-Primitive-Trennung basiert auf explizit im Code
  sichtbarer Projektregel, nicht auf Vermutung; Weg-2-Response-Lücke ist durch Go-Quelltext belegt.
- Pitfalls: HIGH für Pitfall 1-3 (direkt im Code verifiziert), MEDIUM für Pitfall 4-5 (logisch aus
  Code-Struktur abgeleitet, aber nicht durch einen bereits aufgetretenen Bug belegt).

**Research date:** 2026-10-11
**Valid until:** ca. 2026-11-10 (30 Tage — stabiler interner Code, kein schnell bewegliches externes
Ökosystem; bei Backend-Änderungen an den Upload-Endpunkten vor Planungsbeginn erneut prüfen)
