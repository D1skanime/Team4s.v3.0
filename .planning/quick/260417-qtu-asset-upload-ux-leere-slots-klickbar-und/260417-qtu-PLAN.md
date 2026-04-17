---
phase: quick
plan: 260417-qtu
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/anime/create/CreateAssetCard.tsx
  - frontend/src/app/admin/anime/create/CreateAssetSection.tsx
  - frontend/src/app/admin/anime/create/page.module.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "Leere Asset-Slots (Cover, Banner, Logo, Background-Video) sind klickbar und loesen onOpenFileDialog aus"
    - "Das leere Slot-Div zeigt einen visuellen Hover-Effekt (Upload-Icon-Overlay) um Klickbarkeit zu signalisieren"
    - "Der Upload-Button traegt ein Text-Label (Hochladen), der Online-Suchen-Button traegt ein Text-Label (Online suchen)"
    - "Der Hintergrund-Adder-Slot bleibt unveraendert (kein onEmptyClick)"
  artifacts:
    - path: "frontend/src/app/admin/anime/create/CreateAssetCard.tsx"
      provides: "onEmptyClick prop + klickbares leeres Div mit assetCardEmptyClickable Klasse"
    - path: "frontend/src/app/admin/anime/create/CreateAssetSection.tsx"
      provides: "onEmptyClick Weitergabe fuer Cover, Banner, Logo, Background-Video Slots"
    - path: "frontend/src/app/admin/anime/create/page.module.css"
      provides: "assetCardEmptyClickable CSS-Klasse mit Hover-Upload-Overlay"
  key_links:
    - from: "CreateAssetSection.tsx"
      to: "CreateAssetCard.tsx"
      via: "onEmptyClick prop"
      pattern: "onEmptyClick.*onOpenFileDialog"
---

<objective>
Asset Upload UX verbessern: leere Slots klickbar machen und Buttons klar beschriften.

Purpose: Admins sollen sofort sehen, dass sie auf einen leeren Slot klicken koennen um ein Bild hochzuladen. Die Action-Buttons sollen mit Text-Labels eindeutig lesbar sein.
Output: CreateAssetCard bekommt onEmptyClick-Prop, leere Slots in CreateAssetSection leiten Klicks an onOpenFileDialog weiter, neue CSS-Klasse signalisiert Klickbarkeit per Hover-Overlay.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Relevante Dateien:
- frontend/src/app/admin/anime/create/CreateAssetCard.tsx — empfaengt neue onEmptyClick? Prop
- frontend/src/app/admin/anime/create/CreateAssetSection.tsx — uebergibt onEmptyClick fuer Cover/Banner/Logo/Background-Video
- frontend/src/app/admin/anime/create/page.module.css — neue CSS-Klasse assetCardEmptyClickable

Bestehende Vertraege die stabil bleiben:
- CreateAssetSectionProps-Signaturen bleiben unveraendert
- onOpenFileDialog(kind: AssetKind) ist bereits korrekt verdrahtet
- Adder-Variant bleibt unveraendert
- page.tsx wird NICHT angefasst
</context>

<tasks>

<task type="auto">
  <name>Task 1: CreateAssetCard onEmptyClick-Prop + CSS-Klasse</name>
  <files>
    frontend/src/app/admin/anime/create/CreateAssetCard.tsx
    frontend/src/app/admin/anime/create/page.module.css
  </files>
  <action>
**CreateAssetCard.tsx:**

1. Interface erweitern: `onEmptyClick?: () => void` zu `CreateAssetCardProps` hinzufuegen.

2. Im JSX: das leere Div (Zeile ~100, `className={[createStyles.assetCardEmpty, emptyClass].join(" ")}`) erhalt bei gesetztem `onEmptyClick`:
   - Zusaetzliche Klasse `createStyles.assetCardEmptyClickable`
   - `onClick={onEmptyClick}`
   - `role="button"` und `tabIndex={0}`
   - `onKeyDown` fuer Enter/Space: `(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEmptyClick(); } }`
   - Das Upload-Icon als visuelles Overlay-Element INNERHALB des Div (nicht statt dem Text): `<Upload size={20} className={createStyles.assetCardEmptyUploadIcon} />`

   Wenn `onEmptyClick` nicht gesetzt: kein Unterschied zu bisherigem Verhalten.

**page.module.css — neue Klassen nach dem `.assetCardEmptyAdder`-Block einfuegen:**

```css
.assetCardEmptyClickable {
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}

.assetCardEmptyClickable:hover {
  background: rgba(109, 74, 255, 0.07);
}

.assetCardEmptyUploadIcon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(109, 74, 255, 0.35);
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}

.assetCardEmptyClickable:hover .assetCardEmptyUploadIcon {
  opacity: 1;
}
```

Hinweis: Das Upload-Icon soll auf Hover erscheinen und den bestehenden Leertext leicht ueberlagern (absolute positioning, zentriert).
  </action>
  <verify>
    <automated>cd C:/Users/admin/Documents/Team4s/frontend && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>CreateAssetCard akzeptiert onEmptyClick-Prop, leere Slots mit gesetztem Prop sind klickbar und zeigen Upload-Icon auf Hover. TypeScript-Fehler: keine.</done>
</task>

<task type="auto">
  <name>Task 2: CreateAssetSection — onEmptyClick verdrahten</name>
  <files>
    frontend/src/app/admin/anime/create/CreateAssetSection.tsx
  </files>
  <action>
In `CreateAssetSection.tsx` fuer die vier relevanten Slots `onEmptyClick` an `CreateAssetCard` uebergeben.

**Cover-Slot** (`isEmpty={!coverPreview}`):
```tsx
onEmptyClick={!coverPreview ? () => onOpenFileDialog("cover") : undefined}
```

**Banner-Slot** (`isEmpty={!bannerPreview}`):
```tsx
onEmptyClick={!bannerPreview ? () => onOpenFileDialog("banner") : undefined}
```

**Logo-Slot** (`isEmpty={!logoPreview}`):
```tsx
onEmptyClick={!logoPreview ? () => onOpenFileDialog("logo") : undefined}
```

**Background-Video-Slot** (`isEmpty={!stagedBackgroundVideo}`):
```tsx
onEmptyClick={!stagedBackgroundVideo ? () => onOpenFileDialog("background_video") : undefined}
```

**Adder-Slot**: KEIN onEmptyClick — bleibt unveraendert. Der Adder hat bereits seinen eigenen Upload-Button in der AssetActionRow.

**AssetActionRow-Buttons** bereits korrekt beschriftet: `uploadLabel="Upload"` und `searchLabel="Online suchen"` sind die Defaults. Pruefen ob alle Slots diese Labels explizit oder per Default haben. Falls der Online-Suchen-Button aktuell nur das Pencil-Icon ohne lesbaren Span zeigt: in AssetActionRow ist `<span>{searchLabel}</span>` bereits vorhanden (Zeile 73). Sicherstellen dass der `assetActionButton`-Padding reicht um den Text zu zeigen (bereits `padding: 0 12px` in CSS — korrekt).

Keine Aenderung an `CreateAssetSectionProps`.
  </action>
  <verify>
    <automated>cd C:/Users/admin/Documents/Team4s/frontend && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>Klick auf leere Cover-, Banner-, Logo- und Background-Video-Slots oeffnet den Datei-Dialog. Adder unveraendert. TypeScript: keine Fehler.</done>
</task>

</tasks>

<verification>
Nach beiden Tasks:
- `npx tsc --noEmit` in `frontend/` — keine Fehler
- Manuell: Leerer Cover-Slot klicken → Dateidialog oeffnet sich
- Manuell: Ausgefuellter Slot (mit previewUrl) → kein Klick-Cursor auf dem Bild-Bereich
- Manuell: Hover ueber leeren Slot → Upload-Icon erscheint zentriert
- Manuell: Buttons "Hochladen" und "Online suchen" — beide Text-Labels sichtbar
</verification>

<success_criteria>
- Leere Slots (Cover, Banner, Logo, Background-Video) loesen onOpenFileDialog per Klick aus
- Hover auf leeren Slot zeigt Upload-Icon-Overlay
- Befuellte Slots haben keinen Klick-Effekt auf dem Vorschau-Bereich
- Adder-Slot bleibt unveraendert
- Keine TypeScript-Kompilierungsfehler
</success_criteria>

<output>
Nach Completion: `.planning/quick/260417-qtu-asset-upload-ux-leere-slots-klickbar-und/260417-qtu-SUMMARY.md` erstellen.
</output>
