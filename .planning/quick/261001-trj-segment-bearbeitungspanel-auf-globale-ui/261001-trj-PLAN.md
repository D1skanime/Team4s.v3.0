# Quick Plan 261001-trj

Reiner UI-Umbau des Segment-Bearbeitungspanels (Segmente-Tab im Release-Editor,
`frontend/src/app/admin/episode-versions/[versionId]/edit/`) auf die globalen
UI-Primitives (`Drawer`, `Button`, `Input`, `Select`, `Textarea`, `FormField`) und
auf globale Farb-Tokens. Keine Verhaltens-, API- oder Datenänderung. Deutsche
Texte bleiben exakt wie bisher (korrekte Umlaute bereits vorhanden, nicht
umformulieren).

**Betroffene Dateien (ausschließlich diese):**
- `frontend/src/components/ui/Drawer.tsx`
- `frontend/src/components/ui/ui.module.css`
- `frontend/src/app/dev/ui-system/showcase/DrawerShowcase.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentAssetSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentsListSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentBasicFieldsSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css`

Nicht anfassen: `SegmenteTab.tsx`, `SegmentOverrideField.tsx`,
`SegmentContributorsField.tsx`, `SegmentAssignmentsRow.tsx`,
`SegmentPlaybackPreviewSection.tsx`, `SegmenteTab.helpers.tsx` — diese nutzen
weiterhin bestehende Klassen aus `SegmenteTab.module.css` (`addButton`,
`saveNotice`, `tabContent`, `toolbar`, `toolbarSubtitle`, `toolbarTitle`,
`panelField`, `sourceHelpText`, `assetSectionHeader`, `previewSection`,
`previewStatus`, `previewVideo`, `badge*`, `timeline*`) — diese Klassen bleiben
erhalten (nur Farbwerte darin werden in Task 3 auf Tokens umgestellt, siehe
unten), sie werden NICHT gelöscht.

Nicht anfassen (bewusst außerhalb des Scopes): die vorhandenen Inline-`style={{
color: '#...' }}`-Werte in `SegmentAssetSection.tsx` und `SegmentsListSection.tsx`
(z. B. Reuse-Kandidaten-Karte, Tabellenzellen-Metatext). Punkt 3 der Aufgabe
bezieht sich ausschließlich auf `SegmenteTab.module.css`.

## Task 1 — Drawer-Primitive + Größen-Prop

1. `frontend/src/components/ui/Drawer.tsx`: `DrawerProps` um optionales
   `size?: 'md' | 'lg'` erweitern (Default unverändert `'md'`, bestehendes
   Verhalten/Breite bleibt bei `'md'` identisch). Auf dem `<aside
   className={classNames(styles.drawerPanel, variant === 'responsiveSheet' &&
   styles.drawerPanelSheet)}>` zusätzlich `size === 'lg' && styles.drawerPanelLg`
   anhängen (nur relevant für die Standard-`side`-Variante, die hier verwendet
   wird).
2. `frontend/src/components/ui/ui.module.css`: direkt nach dem bestehenden
   `.drawerPanel { ... }`-Block (vor `.drawerPanel::before`) eine neue Regel
   `.drawerPanelLg { width: min(760px, 100vw); }` ergänzen. Keine neue
   CSS-Variable erfinden, nur feste Pixelwerte wie im Rest der Datei üblich.
3. `frontend/src/app/dev/ui-system/showcase/DrawerShowcase.tsx`: lokalen State
   `const [size, setSize] = useState<'md' | 'lg'>('md')` ergänzen und zwei
   `Button`-Umschalter oberhalb des `<Tabs .../>`-Inhalts einfügen (z. B.
   "Normal (620px)" / "Groß (760px)", `variant={size === 'md' ? 'secondary' :
   'ghost'}` bzw. umgekehrt, `onClick={() => setSize('md' | 'lg')}`). `size={size}`
   an die bestehende `<Drawer ...>`-Instanz übergeben. Keine neue Komponente,
   nur die bestehende Datei erweitern.
4. `SegmentEditPanel.tsx`:
   - Import ergänzen: `Drawer` und `Button` zum bestehenden
     `import { FormField, Select, useConfirmDialog } from '@/components/ui'`
     hinzufügen. `import { X } from 'lucide-react'` entfernen (wird nicht mehr
     direkt gebraucht — der Drawer bringt seinen eigenen Schließen-Button mit).
   - Das bisherige Markup
     ```
     <div className={styles.panelOverlay} onClick={onClose} />
     <div className={styles.panel}>
       <div className={styles.panelHeader}>...<button className={styles.panelCloseButton}>...</div>
       {formError ? ... : null}
       ...kompletter Formularinhalt...
       <div className={styles.panelActions}>
         <button className={styles.panelCancelButton}>Abbrechen</button>
         <button className={styles.panelSaveButton}>...</button>
       </div>
     </div>
     ```
     durch `Drawer` ersetzen:
     - `open` (immer `true` — der Elternteil `SegmenteTab.tsx` mountet
       `SegmentEditPanel` bereits nur bei `panelOpen` bedingt, siehe
       `{panelOpen ? <SegmentEditPanel ... /> : null}`; am Mount/Unmount-Gate
       ändert sich nichts),
     - `onClose={onClose}`,
     - `size="lg"` (behält die bisherige 760px-Breite statt der Drawer-Default-620px),
     - `title={editingSegment ? 'Segment bearbeiten' : 'Neues Segment hinzufügen'}`,
     - `footer={<><Button type="button" variant="secondary" onClick={onClose}>Abbrechen</Button><Button type="button" variant="primary" onClick={handleSaveClick} disabled={saveDisabled}>{isSaving || isSavingOverride ? 'Speichert...' : 'Speichern'}</Button></>}`.
   - Der komplette bisherige Formularinhalt (der `formError`-Hinweis als erstes
     Kind, danach `SegmentBasicFieldsSection`, `SegmentOverrideField`, die
     Origin-Select-/Info-Blöcke, `SegmentContributorsField`,
     `SegmentPlaybackPreviewSection`, `SegmentPreviewImageSection`,
     `SegmentAssetSection`) wird unverändert zu Kindern von `<Drawer>`.
   - `{confirmDialog}` bleibt als Geschwister-Element nach `</Drawer>` im
     zurückgegebenen Fragment (unverändertes Verhalten von `useConfirmDialog`).
5. `SegmenteTab.module.css`: folgende jetzt toten Regeln vollständig löschen
   (alle Selektoren inkl. `:hover`-Varianten): `.panelOverlay`, `.panel`,
   `.panelHeader`, `.panelTitle`, `.panelCloseButton`,
   `.panel :global(.sectionDescription)`, `.panelActions`, `.panelSaveButton`,
   `.panelCancelButton`. Im `@media (max-width: 640px)`-Block am Dateiende die
   drei Unterregeln für `.panel`, `.panelHeader`, `.panelActions` ebenfalls
   löschen — die restlichen `.tableWrapper`-Mobil-Regeln in diesem Block
   bleiben unverändert (werden weiterhin von `SegmentsListSection.tsx`
   gebraucht).
6. Verifizieren:
   ```
   docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/Segment'"
   ```

## Task 2 — Native Formularelemente durch globale Primitives ersetzen

In den folgenden drei Dateien jedes native `<button>`, `<input>`, `<select>`
durch `Button` / `Input` / `Select` aus `@/components/ui` ersetzen (Importe
entsprechend ergänzen). `id`/`htmlFor`-Paare, `value`/`onChange`-Logik,
`disabled`-Bedingungen, `title`/`aria-label` und sichtbare Texte unverändert
übernehmen — nur das Element selbst wird ausgetauscht.

**`SegmentAssetSection.tsx`:**
- `<select id="seg-source-type" ...>` → `<Select id="seg-source-type" ...>`.
- Reuse-Kandidat-Button ("Dieses Library-Asset verwenden") →
  `<Button type="button" variant="secondary" size="sm" leftIcon={<FileVideo size={13} />} disabled={isAttachingReuse} onClick={() => onAttachReuseCandidate(candidate)}>...</Button>`.
- "Datei entfernen"-Button → `<Button type="button" variant="danger" size="sm" leftIcon={<XCircle size={13} />} disabled={isDeletingAsset} onClick={() => onAssetDelete()}>...</Button>`.
- Beide Datei-Upload-Blöcke (bestehendes Segment: `id="segment-asset-file"`;
  Neuanlage: `id="segment-asset-file-create"`) nach dem Muster aus
  `SegmentPreviewImageSection.tsx` umbauen: natives `<input type="file">` +
  `<label>` (die als Button gestylt war) ersetzen durch ein verstecktes
  `<Input ref={fileInputRef} type="file" accept={...dieselbe accept-Liste...} hidden aria-label="..." disabled={...} onChange={(e) => { const file = e.target.files?.[0]; if (file) { ...bisherige onAssetUpload/onPendingUploadFileChange-Logik...; e.target.value = '' } }} />`
  plus einen sichtbaren `<Button type="button" variant="secondary" size="sm" leftIcon={<Upload size={13} />} disabled={...} onClick={() => fileInputRef.current?.click()}>...bisheriger Button-/Label-Text...</Button>`.
  Der bestehende `fileInputRef` (ein `useRef<HTMLInputElement>`) wird dafür
  weiterverwendet.
- "Auswahl entfernen"-Button (pendingUploadFile) → `<Button type="button" variant="danger" size="sm" leftIcon={<XCircle size={13} />} disabled={isSaving} onClick={() => onPendingUploadFileChange(null)}>Auswahl entfernen</Button>`.
- Import ergänzen: `import { Button, Input, Select } from '@/components/ui'`.
- In `SegmenteTab.module.css` die dadurch toten Klassen löschen:
  `.assetFileInput`, `.assetUploadButton` (inkl. `:hover`),
  `.assetUploadButtonBusy`, `.assetDeleteButton` (inkl. `:hover`, `:disabled`).

**`SegmentBasicFieldsSection.tsx`:**
- `<select id="segment-type" ...>` → `<Select id="segment-type" ...>`.
- `<input id="segment-name" type="text" ...>` → `<Input id="segment-name" type="text" ...>`.
- `<input id="seg-ep-start" type="number" min="1" ...>` und
  `<input id="seg-ep-end" type="number" min="1" ...>` → jeweils `<Input ... type="number" min="1" ...>`.
- `<input id="seg-time-start" type="text" inputMode="numeric" ... style={isStartTimeError ? { borderColor: '#c0392b' } : undefined} />`
  → `<Input id="seg-time-start" type="text" inputMode="numeric" ... invalid={isStartTimeError} />`
  (die `invalid`-Prop von `Input` ersetzt den Inline-Hex-Style vollständig —
  `style`-Prop entfernen).
- `<input id="seg-time-end" ...>` analog mit `invalid={isEndTimeError}`.
- Import ergänzen: `Input` zum bestehenden `import { Select } from '@/components/ui'` hinzufügen.

**`SegmentsListSection.tsx`:**
- "Übernehmen"-Button (Vorschläge-Leiste) → `<Button type="button" variant="success" size="sm" onClick={() => onAdoptSuggestion(s)}>Übernehmen</Button>`.
- Zuweisungs-Disclosure-Button (aria-label "Zugewiesene Folgen
  anzeigen/ausblenden") → `<Button type="button" variant="ghost" size="sm" iconOnly aria-label="Zugewiesene Folgen anzeigen/ausblenden" onClick={...unverändert...}><DisclosureIndicator open={assignmentsOpen} variant="button" size="sm" /></Button>`.
- "Segment vorbereiten"-Button (RefreshCw) → `<Button type="button" variant="ghost" size="sm" iconOnly title="Segment vorbereiten" disabled={...unverändert...} onClick={() => onRenderSegment(segment)}><RefreshCw size={14} /></Button>`.
- "Bearbeiten"-Button (Pencil) → `<Button type="button" variant="ghost" size="sm" iconOnly title="Bearbeiten" onClick={() => onEditSegment(segment)}><Pencil size={14} /></Button>`.
- "Segment löschen"-Button (Trash2) → `<Button type="button" variant="danger" size="sm" iconOnly title="Segment löschen" aria-label="Segment löschen" onClick={() => onDeleteSegment(segment)}><Trash2 size={14} /></Button>`.
- Import ergänzen: `Button` zum bestehenden `@/components/ui`-Import-Block hinzufügen.
- In `SegmenteTab.module.css` die dadurch toten Klassen löschen:
  `.actionButton` (inkl. `:hover`, `:disabled`), `.actionButtonDanger` (inkl.
  `:hover`), `.suggestionAdoptButton` (inkl. `:hover`).

Verifizieren (gleicher Befehl wie Task 1):
```
docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/Segment'"
```

## Task 3 — Farbwerte in `SegmenteTab.module.css` auf globale Tokens umstellen

Nach den Löschungen aus Task 1+2 verbleiben in `SegmenteTab.module.css` die
folgenden Farbstellen. Jede davon exakt wie in der Tabelle ersetzen (Werte aus
`frontend/src/styles/globals.css`, ausschließlich bereits vorhandene
Variablen, keine neue erfinden):

| Selektor | Alter Wert → Neuer Wert |
|---|---|
| `.toolbarSubtitle` color | `#6b6b70` → `var(--text-muted)` |
| `.addButton` background | `var(--color-success, #16a34a)` → `var(--color-success)` (Hex-Fallback entfernen) |
| `.addButton` color | `#ffffff` → `var(--surface-card)` |
| `.addButton:hover` background | `#e85a2d` → `var(--accent-deep)` |
| `.tableWrapper` border | `#e1e1e6` → `var(--color-border)` |
| `.tableWrapper` background | `#ffffff` → `var(--surface-card)` |
| `.tableHeader` background | `#f9f9f9` → `var(--surface-sunken)` |
| `.tableHeader th` color | `#6b6b70` → `var(--text-muted)` |
| `.tableHeader th` border-bottom | `#e1e1e6` → `var(--color-border)` |
| `.tableRow td` border-bottom | `#f0f0f3` → `var(--color-border)` |
| `.tableRow:hover td` background | `#fafafa` → `var(--surface-sunken)` |
| `.badgeOp/.badgeEd/.badgeIn/.badgePv/.badgeDefault` background | **unverändert lassen** (Kategorie-Farbcodierung je Segment-Typ, kein passendes Token vorhanden — kurzen CSS-Kommentar direkt über `.badgeOp` ergänzen, der das begründet) |
| `.badgeOp/.badgeEd/.badgeIn/.badgePv/.badgeDefault` color | `#ffffff` → `var(--surface-card)` |
| `.emptyState` color | `#6b6b70` → `var(--text-muted)` |
| `.panelField label` color | `#1c1c1e` → `var(--text-primary)` |
| `.panelField input, .panelField select { ... }` (inkl. `:focus`-Variante und `.panelField > select { width: min(100%, 360px); }`) | **komplett löschen** — tote Tag-Selektoren, die jetzt mit der globalen `Input`/`Select`-Box-Styling (`.control`/`.selectControl` aus `ui.module.css`) kollidieren würden. Die `Input`/`Select`-Primitives liefern bereits volle Breite/Border/Focus; der Wegfall der festen `360px`-Breite bei `segment-type`/`segment-origin-select` ist eine akzeptierte, rein visuelle Nebenwirkung der Primitive-Übernahme, keine Verhaltensänderung. |
| `.panelError` border | `#dc3545` → `var(--color-error)` |
| `.panelError` color | `#dc3545` → `var(--color-error)` |
| `.suggestionsBar` border | `#d1fae5` → `color-mix(in srgb, var(--color-success) 35%, var(--color-border))` |
| `.suggestionsBar` background | `#f0fdf4` → `color-mix(in srgb, var(--color-success) 10%, var(--surface-card))` |
| `.suggestionsLabel` color | `#166534` → `var(--color-success)` |
| `.suggestionItem` border | `#bbf7d0` → `color-mix(in srgb, var(--color-success) 35%, var(--color-border))` |
| `.suggestionItem` background | `#ffffff` → `var(--surface-card)` |
| `.suggestionMeta` color | `#374151` → `var(--text-muted)` |
| `.tableRowActive td` background | `#f0fdf4 !important` → `color-mix(in srgb, var(--color-success) 10%, var(--surface-card)) !important` |
| `.sourceHelpText` color | `#6b6b70` → `var(--text-muted)` |
| `.assetSection` border | `#e1e1e6` → `var(--color-border)` |
| `.assetSection` background | `#f9f9f9` → `var(--surface-sunken)` |
| `.assetSectionHeader` color | `#1c1c1e` → `var(--text-primary)` |
| `.renderStatus` border | `#d8e0f0` → `var(--color-border)` |
| `.renderStatus` background | `#f7f9fd` → `var(--surface-sunken)` |
| `.renderStatus` color | `#374151` → `var(--text-muted)` |
| `.previewSection` border | `#d8e0f0` → `var(--color-border)` |
| `.previewSection` background | `#f7f9fd` → `var(--surface-sunken)` |
| `.previewVideo` background | `#111111` → `var(--text-strong)` (dunkelster vorhandener Token, kein echtes Schwarz definiert) |
| `.previewStatus` border | `#d8e0f0` → `var(--color-border)` |
| `.previewStatus` background | `#ffffff` → `var(--surface-card)` |
| `.previewStatus` color | `#374151` → `var(--text-muted)` |
| `.assetExistingLabel` color | `#1c1c1e` → `var(--text-primary)` |
| `.assetExistingPath` color | `#6b6b70` → `var(--text-muted)` |
| `.assetUploadFormats` color | `#6b6b70` → `var(--text-muted)` |
| `.assetHintSave` color | `#6b6b70` → `var(--text-muted)` |
| `.assetError` border | `#dc3545` → `var(--color-error)` |
| `.assetError` color | `#dc3545` → `var(--color-error)` |
| `.timelineContainer` border | `#e1e1e6` → `var(--color-border)` |
| `.timelineContainer` background | `#ffffff` → `var(--surface-card)` |
| `.timelineHeader` color | `#1c1c1e` → `var(--text-primary)` |
| `.timelineLabels` color | `#6b6b70` → `var(--text-muted)` |
| `.timelineSpurLabel` color | `#6b6b70` → `var(--text-muted)` |
| `.timelineTrack` background | `#f0f0f3` → `var(--surface-sunken)` |
| `.timelineBlock` color | `#ffffff` → `var(--surface-card)` |
| `.timelineMainContent` background | `#d1d5db` → `var(--surface-sunken)` |
| `.timelineMainContent` color | `#6b7280` → `var(--text-muted)` |
| `.timelineUntimedLabel` color | `#6b6b70` → `var(--text-muted)` |
| `.timelineUntimedChip` border | `#d8d8df` → `var(--color-border)` |
| `.timelineUntimedChip` background | `#ffffff` → `var(--surface-card)` |
| `.tableWrapper tr` (Mobil-Media-Block) border | `#e1e1e6` → `var(--color-border)` |
| `.tableWrapper tr` (Mobil-Media-Block) background | `#ffffff` → `var(--surface-card)` |
| `.tableWrapper td[data-label]::before` color | `#6b6b70` → `var(--text-muted)` |

Nach dieser Tabelle darf `grep -c '#[0-9a-fA-F]\{3,8\}' SegmenteTab.module.css`
nur noch die 5 absichtlich belassenen Badge-Hintergrundfarben
(`badgeOp`/`badgeEd`/`badgeIn`/`badgePv`/`badgeDefault`) zurückgeben — kein
Treffer sonst.

Abschließende Verifikation (exakt dieser Befehl, tsc-Fehler unter `.next/` sind
vorbestehend und zu ignorieren):
```
docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/Segment' && npx tsc --noEmit -p tsconfig.json && npx eslint <geänderte Dateien>"
```
`<geänderte Dateien>` = alle 8 oben gelisteten Pfade (relativ zu `frontend/`,
ohne `frontend/`-Präfix, wie im Container üblich).

Danach:
```
docker restart team4sv30-frontend
```

## Commit-Disziplin

- Commits ausschließlich mit exakten Dateipfaden (`git add <pfad1> <pfad2> ...`),
  niemals `git add -A` oder `git add .`.
- Niemals `git stash` bei offenen Änderungen.
- Je Task ein eigener, klein gehaltener Commit ist erlaubt, aber nicht
  verpflichtend — mindestens ein Commit am Ende mit allen 8 geänderten
  Dateien.
- Keine Rückfragen stellen.

## Akzeptanzkriterien

- Das Segment-Bearbeitungspanel ist ein `Drawer` aus `@/components/ui` (kein
  eigenes `.panelOverlay`/`.panel`-Markup, kein eigener `z-index` mehr in
  `SegmenteTab.module.css`), 760px breit (`size="lg"`).
- `Drawer` unterstützt `size?: 'md' | 'lg'` mit unverändertem Default-Verhalten
  bei `'md'`; `/dev/ui-system` zeigt beide Größen.
- In `SegmentEditPanel.tsx`, `SegmentAssetSection.tsx`,
  `SegmentsListSection.tsx`, `SegmentBasicFieldsSection.tsx` kommen keine
  nativen `<button>`, `<input>`, `<select>`, `<textarea>` mehr vor (nur noch
  `Button`/`Input`/`Select`/`Textarea`/`FormField` aus `@/components/ui`).
- `SegmenteTab.module.css` enthält keine festen Hex-/rgba-Farbwerte mehr außer
  den 5 bewusst belassenen, kommentierten Badge-Hintergrundfarben.
- Alle bestehenden Segment-Tests laufen unverändert grün (Assertions nicht
  abgeschwächt), `tsc --noEmit` und `eslint` sind sauber (abgesehen von
  vorbestehenden `.next/`-Fehlern), und `team4sv30-frontend` wurde neu
  gestartet.
