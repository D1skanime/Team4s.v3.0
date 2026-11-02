# Quick Task 261101-q79: Team4S Storybook Runde 6 – Bausteinqualität - Research

**Researched:** 2026-11-01
**Domain:** Frontend-Design-System (`frontend/src/components/ui/`), React/Next.js 16, CSS Modules mit globalen Design-Tokens
**Confidence:** HIGH (fast ausschließlich per `Read`/`grep` am tatsächlichen Code verifiziert, keine externen Bibliotheken betroffen)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dialog-/Overlay-Kern (neuer "Grundbaustein")**
- Kein eigenständiges sichtbares UI-Element → kein eigener Storybook-Katalog-Eintrag unter
  "Grundbausteine". Umsetzung als gemeinsamer interner Hook/Helfer (z. B. `useOverlaySurface`
  oder gleichwertig benannt) unter `frontend/src/components/ui/`, der Portal-Rendering,
  Escape-Handling, Fokusführung/-rückgabe und Hintergrund-Overlay kapselt. Modal und Drawer
  nutzen ihn beide; dokumentiert wird er in `docs/FRONTEND_ARCHITEKTUR.md` als gemeinsamer
  Baustein, damit er bei künftigen Overlays wiederverwendet statt neu gebaut wird.
- Modal ist bereits das barrierefreiere Vorbild (Portal, Escape, Fokus) → dessen Verhalten wird
  in den gemeinsamen Kern extrahiert, Drawer wird darauf umgestellt (nicht umgekehrt).

**Status-Ton-Tokens für Badge/Button**
- Fünf Töne wie in Badge bereits vorhanden: `success`, `warning`, `danger`, `info`, `neutral`.
  Je Ton drei Tokens: `--badge-<ton>-bg`, `--badge-<ton>-fg`, `--badge-<ton>-border` (analog
  `--button-*`). Button übernimmt dieselben Ton-Tokens für seine tonalen Varianten, statt eigene
  Hex-Werte zu pflegen.
- Die bestehende `muted`-Variante von Badge (aktuell nur über von außen gesetzte
  `--badge-muted-*` auf Bild-Hintergründen nutzbar, siehe
  `fansubs/[slug]/page.module.css:117-118`) wird zur offiziellen Variante `onMedia` (Badge auf
  Bild/dunklem Hintergrund) mit eigenen Tokens – keine von außen injizierten CSS-Variablen mehr.

**Label (neuer Grundbaustein)**
- Eigenständige Komponente `Label` unter `components/ui/Label.tsx`: Feldbeschriftung mit
  optionaler Pflicht-Markierung (`*`, `aria-hidden`, Pflicht-Hinweis für Screenreader separat im
  `aria-label`/begleitenden Text). Wird von FormField intern genutzt und steht zusätzlich als
  eigener Grundbaustein für Fälle ohne FormField zur Verfügung (z. B. Switch- oder
  Checkbox-Gruppen, die aktuell keine standardisierte Beschriftung haben).

**Text Fehler-Ton**
- `Text` bekommt eine offizielle `tone="error"`-Option (WCAG-geprüfter Kontrast gegen den
  Kartenhintergrund). MediaSlot und FormField-Fehlertext nutzen diese Option statt eigener
  `color`-Regeln.

**Umfang / Aufteilung**
- Der Auftrag ist deutlich größer als ein typischer Quick-Task (zehn Bausteinbereiche). Die
  Planung erfolgt als EIN Plan mit so vielen Tasks wie fachlich nötig (Richtwert: ein Task je
  Bausteinbereich aus dem Auftrag), nicht als künstlich auf 1–3 Tasks verkleinerter Umfang. Jeder
  Task bleibt in sich atomar committ-bar.
- Für jeden Befund gilt: zuerst grep/Read am aktuellen Code, dann entweder umsetzen oder (mit
  Nachweis Datei:Zeile) als "bereits erledigt" im Abschluss-Bericht vermerken.

### Claude's Discretion
- Genaue CSS-Variablennamen für neue Tokens, exakte Dateiaufteilung beim Überschreiten des
  450-Zeilen-Limits, Reihenfolge der Tasks.
- Ob ThumbnailStrip-Kachel als neue Button-Zustandsvariante ("aktuell") oder als eigene, auf
  Button aufbauende Komposition umgesetzt wird – Entscheidung fällt der Planer/Executor anhand
  des bestehenden Button-API-Zuschnitts. **Hinweis aus der Recherche:** Dieser Punkt ist bereits
  erledigt, siehe ThumbnailStrip-Abschnitt unten – ThumbnailStrip nutzt bereits `IconButton`s
  `media`-Variante mit `aria-current`, kein Button-Zustand nötig.

### Deferred Ideas (OUT OF SCOPE)
- Keine gesondert aufgeführt – die Originalbefunde selbst grenzen den Umfang ab (siehe
  `<specifics>` in CONTEXT.md).
</user_constraints>

## Summary

Seit dem Vorgänger-Auftrag 261029-27a5 (gemergt `69ef25071`) wurde eine **vollständige, repo-weite
Tokenisierungs-Runde** durchgeführt, die durch einen bereits aktiven Regressionswächter
(`foreignVariableOverrides.regression.test.ts`) erzwingt, dass `components/ui/*.module.css` keine
festen px-/rem-Werte, Hex-Farben oder rgba-Literale mehr enthalten darf (Ausnahmen: `0`, `1px`
Haarlinien, Prozentwerte, Werte innerhalb von `@media`/`@container`-Bedingungen). Dadurch sind
**die meisten reinen CSS-Tokenisierungs-Befunde aus dem Originalauftrag bereits erledigt**
(Badge, Button, Modal, Drawer, FocalCarousel, ThumbnailStrip sind vollständig tokenisiert).

Was dagegen **noch offen** ist, sind die strukturellen/funktionalen Befunde, die kein CSS-Test
automatisch abdeckt:

1. **Drawer hat weiterhin keinen Portal, kein Escape-Handling, keine Fokusführung/-rückgabe** und
   keinen generierten `titleId` (`Drawer.tsx:1-66`, kein `Drawer.test.tsx` vorhanden). Der von
   CONTEXT.md geforderte gemeinsame Dialog-Kern existiert noch nicht – `grep` nach
   `useOverlaySurface`/`usePortal`/`useFocusTrap`/`useDialog` findet nichts in
   `components/ui/`.
2. **Button `iconOnly` ist noch in 18 Dateien / 26 Aufrufstellen** im Einsatz (plus
   `Button.stories.tsx`), dupliziert `IconButton`.
3. **ReleaseMediaDrawer.tsx und ReleaseThemeDrawerSection.tsx sind vollständig handgebaute
   Overlays** (eigenes `<div onClick>`-Backdrop, eigener nativer Schließen-`<button>`, kein
   Escape, kein Portal, kein Fokus-Trap, rohe `<h2>`/`<p>`) – deutlich größerer Umbau als nur
   "Drawer-Baustein einsetzen", da aktuell praktisch keine der Drawer-Eigenschaften genutzt wird.
4. **FormField**: Label/Hinweis/Fehler sind bereits tokenisiert (keine Hex-/px-Literale mehr),
   aber weiterhin handgebaute `<label>`/`<p>`-Markup statt des geforderten `Label`-Bausteins;
   `required` wird nicht ans Kind weitergereicht; `aria-disabled` auf einem `<div>` ohne Rolle ist
   wirkungslos; Fehlertext hat kein `aria-live`/`role`; DatePicker/YearPicker/Switch fehlen in den
   Stories; alte Stories setzen weiterhin `invalid`/`htmlFor` manuell doppelt.
5. **MediaSlot/EmptyState/LoadingState** haben teils bereits echte Verbesserungen erhalten
   (MediaSlot-Fehlertext hat bereits `role="alert"`), brauchen aber weiterhin die
   `Text tone="error"`-Umstellung, fehlende Stories und (LoadingState) eine Spinner-Farbton-Option
   statt eines reinen Farb-Wrappers.
6. **Badge "muted"→"onMedia"**: Die Umbenennung darf NICHT die 35 bestehenden
   `variant="muted"`-Aufrufer auf hellem Hintergrund verändern – "onMedia" muss eine zusätzliche,
   neue Variante sein, kein Rename der bestehenden.
7. **ConfirmDialog, FocalCarousel, ThumbnailStrip, Accordion/DisclosureTrigger**: CSS ist fertig
   tokenisiert, offene Punkte sind ausschließlich Story-Abdeckung, Jargon-Kommentare und
   Katalog-Einordnung (DisclosureTrigger steht noch unter "Zusammengesetzte Bausteine").

**Primäre Empfehlung:** Den gemeinsamen Dialog-Kern (`useOverlaySurface` o. ä.) zuerst bauen und
aus Modal extrahieren (Modal bleibt verhaltensidentisch), dann Drawer darauf umstellen und dabei
`Drawer.test.tsx` neu anlegen (existiert aktuell gar nicht) – das ist das Fundament, auf dem auch
die Migration von ReleaseMediaDrawer/ReleaseThemeDrawerSection aufbauen sollte (diese beiden
Dateien sollten auf `Drawer` umgestellt werden, nicht nur punktuell nachgebessert).

## Architekturzuordnung

| Capability | Tier | Rationale |
|---|---|---|
| Alle elf Bausteinbereiche | Frontend / React-Komponenten-Bibliothek (`frontend/src/components/ui/`) | Reine Client-seitige Präsentationsschicht, keine Backend-/API-Berührung |
| ReleaseMediaDrawer/ReleaseThemeDrawerSection | Admin-Feature-Komponenten (`frontend/src/app/admin/fansubs/[id]/edit/`), die globale UI-Bausteine konsumieren sollen statt eigene zu bauen | Konsument, nicht Baustein-Definition |

---

## Baustein für Baustein: Status + Umsetzungsskizze

### 1. Badge

**Datei:** `frontend/src/components/ui/Badge.tsx` (30 Zeilen), `Badge.module.css` (56 Zeilen),
Tokens in `frontend/src/styles/tokens/components.css:133-157`.

| Originalbefund | Status | Beleg |
|---|---|---|
| Keine Tokens, feste Werte | **ERLEDIGT** | `Badge.module.css` nutzt ausschließlich `var(--badge-*)`; alle Werte (Radius, Padding, Gap, Farben je Ton) liegen in `components.css:133-157` |
| Status-Ton-Tokens `--badge-<ton>-bg/-fg/-border` für success/warning/danger/info/neutral | **ERLEDIGT** | Exakt dieses Schema existiert bereits: `--badge-success-bg/-text/-border` usw. (Token heißt `-text`, nicht `-fg` – siehe Namenshinweis unten) |
| `muted`-Variante wird extern via `fansubs/[slug]/page.module.css` überschrieben | **NOCH OFFEN** | `page.module.css:117-118`: `--badge-muted-bg: rgba(255,255,255,0.18); --badge-muted-fg: #ffffff;` – wird in `.heroBodyOnBanner`-Scope gesetzt und von `Badge.module.css:52-54` per `var(--badge-muted-bg, var(--badge-muted-bg-default))` gelesen |
| Stories: nur Variantennamen als Text, kein Icon-Beispiel | **NOCH OFFEN** | `Badge.stories.tsx` nutzt überall `children: 'Neutral'/'Erfolg'/...` statt realistischer Texte; kein Beispiel mit Icon-Kind |

**Umsetzungsskizze:**
- **Namenshinweis für die neue `onMedia`-Variante:** Bestehende Tokens heißen
  `--badge-<ton>-bg` / `--badge-<ton>-text` / `--badge-<ton>-border` (nicht `-fg`). Für
  Konsistenz `--badge-onmedia-bg` / `--badge-onmedia-text` / `--badge-onmedia-border` verwenden
  (CSS-Variablennamen sind case-insensitiv, aber bestehende Konvention ist durchgehend
  klein-mit-Bindestrich, kein CamelCase in den Tokens selbst – nur die TS-Variante
  `BadgeVariant` nutzt `onMedia` als CamelCase-Wert).
- **WICHTIG – Umfang der Migration:** `grep -rln 'variant="muted"' frontend/src --include="*.tsx"`
  ergibt **35 Dateien**. NUR der eine Aufrufer in `FansubHeroSection.tsx` (gerendert via
  `fansubs/[slug]/page.module.css:117-118`) nutzt die Override-Variante auf dunklem Hintergrund.
  Die neue `onMedia`-Variante ist eine **zusätzliche** sechste Variante (`neutral | success |
  warning | danger | info | muted | onMedia`), KEIN Ersatz für `muted`. Nur dieser eine Aufrufer
  wechselt von `variant="muted"` + CSS-Override auf `variant="onMedia"` ohne Override.
- Nach der Migration muss `page.module.css:109-118` (die `--badge-muted-bg`/`-fg`-Deklaration im
  `.heroBodyOnBanner`-Scope) entfernt werden.
- **Regressionstests, die mitgezogen werden müssen:**
  - `foreignVariableOverrides.regression.test.ts:63-64` registriert `--badge-muted-bg` und
    `--badge-muted-fg` explizit als erlaubte "Override-Hook"-Variablen – nach der Migration gibt
    es keinen externen Override mehr, dieser Eintrag kann entfernt werden (oder bleibt
    dokumentiert, falls `muted` grundsätzlich override-fähig bleiben soll – Planer-Entscheidung).
  - `FansubHeroSection.accessibility.test.ts:213-232` prüft per Regex exakt das Muster
    `var(--badge-muted-bg, var(--...)))` in `page.module.css`/`Badge.module.css` – nach der
    Migration auf `onMedia` muss dieser Test auf die neuen Token-Namen angepasst werden (oder
    ersetzt werden durch einen Test gegen die neue `onMedia`-Fläche ohne Override-Mechanismus).
- Für die Story-Qualität: `Badge.stories.tsx` auf realistische deutsche Beispieltexte umstellen
  (z. B. "Veröffentlicht", "Ausstehend", "Entwurf", "Archiviert" statt der Variantennamen) und
  eine Story mit Icon-Kind ergänzen (Badge ist ein reines `inline-flex`-Span mit `gap`, ein Icon
  als zusätzliches Kind neben Text funktioniert bereits ohne Code-Änderung an `Badge.tsx`).

### 2. Button

**Datei:** `frontend/src/components/ui/Button.tsx` (146 Zeilen), `Button.module.css` (258 Zeilen).

| Originalbefund | Status | Beleg |
|---|---|---|
| Feste Werte (gap/Padding/Radien/Schrift/Hex/rgba) | **ERLEDIGT** | Vollständig tokenisiert, `components.css:72-106` |
| `iconOnly` dupliziert IconButton (18 Dateien) | **NOCH OFFEN** | Bestätigt per grep: genau 18 Produktionsdateien, 26 Aufrufstellen (Liste unten) + `Button.stories.tsx` |
| Kommentar englisch + Historie (`Button.module.css:139 "GAP-03 F2 (157-15)"`) | **NOCH OFFEN** (Zeile jetzt 149) | `Button.module.css:149-150`: `/* GAP-03 F2 (157-15): a permanent, hover-independent affordance -- ... */` – englisch, Plan-Verweis `(157-15)`. **Wird NICHT vom bestehenden `processHistory.regression.test.ts` erkannt** (Pattern-Liste kennt `Plan \d+-\d+`, `D-\d{2}`, `Befund \d+` etc., aber kein `GAP-\d+`-Muster) – manuell umformulieren |
| Story-Kommentar "In-App-Showcase" | **ERLEDIGT** | `grep -rn "In-App-Showcase" frontend/src/components/ui/` findet nur noch die Test-Definition selbst (`processHistory.regression.test.ts:25`), kein Treffer mehr in `Button.stories.tsx` |
| Stories: Jargon; fehlen leftIcon/rightIcon, Link (href), Varianten text/floating | **TEILWEISE OFFEN** | `Button.stories.tsx`: keine Story nutzt `leftIcon`/`rightIcon` oder `href`; `text`/`floating` tauchen NUR in der Sammel-Story "Größen und Varianten" auf (Zeile 136-167), nicht als eigenständige Einzel-Story wie `Sekundaer`/`Dezent` |

**18 Dateien mit `iconOnly` (26 Aufrufstellen, Button.tsx/Button.stories.tsx ausgenommen):**
```
4  frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentsListSection.tsx
3  frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewGrid.tsx
2  frontend/src/components/groups/GroupHistorySection.tsx
2  frontend/src/components/editor/RichTextEditor.tsx
2  frontend/src/components/admin/MediaUploadCore.tsx
2  frontend/src/app/admin/fansubs/[id]/edit/FansubCommunityLinksList.tsx
1  frontend/src/components/fansubs/FansubMediaLightbox.tsx
1  frontend/src/components/contributions/AnimeGroupCard.tsx
1  frontend/src/app/suche/SearchFilters.tsx
1  frontend/src/app/me/profile/page.tsx
1  frontend/src/app/me/profile/components/RegistrationCompletionBanner.tsx
1  frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx
1  frontend/src/app/me/profile/components/MemberAvatarCard.tsx
1  frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx
1  frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx
1  frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx
1  frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx
1  frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentAssignmentsRow.tsx
```

**Umsetzungsskizze (Migration `iconOnly` → `IconButton`):**
- Typisches Aufrufmuster (Beleg `frontend/src/app/me/profile/page.tsx:130-140`):
  `<Button variant="secondary" size="sm" iconOnly aria-label="..." leftIcon={<Pencil .../>} onClick={...} />`
  → wird zu `<IconButton variant="..." size="sm" icon={<Pencil .../>} aria-label="..." onClick={...} />`.
  `IconButton` nimmt `icon` statt `leftIcon`/`children`, erzwingt `aria-label` als Pflichtprop
  (TypeScript-Fehler, falls vergessen – guter Migrationshebel).
- `IconButtonVariant` (`'default' | 'ghost' | 'onImage' | 'field' | 'tile' | 'accent' | 'media'`)
  deckt NICHT 1:1 `ButtonVariant` (`'primary' | 'secondary' | 'ghost' | ...`) ab – jede Aufrufstelle
  einzeln auf die passende `IconButton`-Variante/-Ton abbilden (meist `variant="ghost"` oder
  `variant="default"` als Entsprechung zu Buttons `secondary`/`ghost`, siehe
  `IconButton.tsx:7-16` Dokumentationskommentar für die Bedeutung jeder Variante).
- Nach der Migration `iconOnly`/`buttonIcon` aus `Button.tsx`/`Button.module.css` entfernen
  (CommonButtonProps:30, Zeile 60/88 in `Button.tsx`; `.buttonIcon`-Klasse in
  `Button.module.css:183-187`) und `Button.stories.tsx`s `NurSymbol`-Story löschen (ersetzt durch
  eine neue `IconButton`-Story, falls dort noch eine Lücke besteht – `IconButton.stories.tsx`
  existiert bereits und deckt vermutlich den Fall ab, kurz prüfen statt duplizieren).
- Für die fehlenden Stories: `leftIcon`/`rightIcon` sowie `href`(Link) und eigenständige
  `text`/`floating`-Einzel-Stories nach dem Muster der bestehenden `Primaer`/`Sekundaer`-Stories
  ergänzen.

### 3. ConfirmDialog

**Datei:** `frontend/src/components/ui/ConfirmDialog.tsx` (74 Zeilen).

| Originalbefund | Status | Beleg |
|---|---|---|
| Ergebnis "Bestätigt/Abgebrochen" nicht sichtbar in Story | **NOCH OFFEN** | `ConfirmDialog.stories.tsx`: `StandardDemo`/`DangerDemo` rufen `await confirm(...)` aber rendern das Promise-Ergebnis nirgends sichtbar |
| Jargon in Beschreibung | **NOCH OFFEN** | `ConfirmDialog.stories.tsx:14-17`: "`useConfirmDialog()` ist ein Hook+Komponenten-Verbund (kein reines Props-Rendering)" – technischer Jargon für eine Storybook-Doku-Beschreibung |
| Fokus per `getElementById`+`setTimeout` statt Modal-Fokuspfad | **NOCH OFFEN** | `ConfirmDialog.tsx:28-34`: eigener `useEffect` mit `window.setTimeout(() => document.getElementById(cancelButtonId)?.focus(), 0)` – nutzt NICHT Modals eingebauten `closeButtonRef`/Fokus-Mechanismus (`Modal.tsx:82-96`) |

**Umsetzungsskizze:**
- Story um sichtbaren Ergebnis-Zustand ergänzen (z. B. `useState<'offen'|'bestätigt'|'abgebrochen'>`
  und Text-Ausgabe nach Dialog-Schluss).
- Beschreibung auf fachliche, jargon-freie Sprache umformulieren.
- Fokus-Pfad: `Modal` akzeptiert aktuell keinen "fokussiere den Abbrechen-Button statt des
  Schließen-Kreuzes"-Mechanismus (`closeButtonRef` in `Modal.tsx` ist intern an den
  `DialogHeader`-Schließen-Button gebunden, nicht an das `footer`). Entweder `Modal` um eine
  Möglichkeit erweitern, das initial fokussierte Element zu bestimmen (z. B. optionaler
  `initialFocusRef`-Prop), oder bewusst dokumentieren, warum `ConfirmDialog` weiterhin einen
  eigenen Fokus-Pfad braucht (footer-Button ist nicht Teil von `DialogHeader`). Empfehlung: Modal
  um `initialFocusRef?: RefObject<HTMLElement>` erweitern (additiv, Default-Verhalten
  unverändert), `ConfirmDialog` nutzt ihn statt `getElementById`+`setTimeout`.

### 4. Drawer / Dialog-Kern (größter struktureller Befund)

**Dateien:** `Drawer.tsx` (66 Zeilen), `Drawer.module.css` (160 Zeilen), `Modal.tsx` (193 Zeilen),
`Modal.module.css` (146 Zeilen), `DialogHeader.tsx` (57 Zeilen), `ui.module.css`.

**Existiert bereits ein gemeinsamer Dialog-Hook?** **NEIN.** `grep -rn
"useOverlaySurface\|usePortal\|useFocusTrap\|useDialog" frontend/src/` findet nichts. Die einzige
bereits geteilte Logik zwischen Modal und Drawer ist `DialogHeader.tsx` (Titel + Schließen-Button,
siehe Kommentar `DialogHeader.tsx:24-28`) und die CSS-Klassen `.overlay`/`.overlayClose` in
`ui.module.css:99-110` (per `mergeCssModules` in beide `*.module.css` eingemischt – das in den
Originalbefunden genannte "Proxy-Trick"-CSS-Duplikat ist also **bereits behoben**).

**Was tut Modal.tsx konkret (Portal/Escape/Fokus)?**
```tsx
// Modal.tsx:85-96 — Fokus setzen beim Öffnen + Fokus zurückgeben beim Schließen
useEffect(() => {
  if (!open) return
  previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const focusTarget = closeButtonRef.current ?? panelRef.current
  window.setTimeout(() => focusTarget?.focus(), 0)
  return () => {
    previouslyFocusedRef.current?.focus()
    previouslyFocusedRef.current = null
  }
}, [open])

// Modal.tsx:98-123 — Escape schließt, Tab/Shift+Tab läuft im Fokus-Trap um (getFocusableElements)
function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key === 'Escape') { event.preventDefault(); if (onEscapeKeyDown?.(event)) return; onClose(); return }
  if (event.key !== 'Tab' || !panelRef.current) return
  const focusable = getFocusableElements(panelRef.current)
  // ... zyklischer Fokus-Wechsel zwischen erstem/letztem fokussierbaren Element
}

// Modal.tsx:191-192 — Portal an document.body (entkommt isolation/z-index-Kontexten)
return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
```

**Was fehlt in Drawer.tsx konkret (alle vier Lücken bestätigt, Stand `Drawer.tsx:1-66`):**
1. **Kein Portal:** kein `createPortal`-Import, Drawer rendert inline im DOM-Baum des Aufrufers
   (kann durch `isolation`/`z-index`-Kontexte eines Elternelements verdeckt werden, genau das
   Problem, das Modals Portal-Kommentar in `Modal.tsx:191` explizit löst).
2. **Kein Escape-Handling:** kein `onKeyDown` auf dem Wrapper, kein `handleKeyDown`. Der
   Kommentar in `Drawer.tsx:39-42` behauptet fälschlich "Escape (über den umschließenden
   Dialog)" funktioniere – es gibt aber gar keinen umschließenden Dialog, der Escape abfängt,
   das ist eine **falsche Dokumentation eines nicht existierenden Verhaltens**.
3. **Keine Fokusführung/-rückgabe:** kein `useEffect`, kein `previouslyFocusedRef`, kein
   `useRef`+`.focus()` beim Öffnen/Schließen.
4. **Feste ID `"ui-drawer-title"`** (`Drawer.tsx:36,55`) statt `useId()` – bei zwei gleichzeitig
   im DOM gemounteten Drawer-Instanzen (z. B. verschachtelt oder zwei getrennte Admin-Panels auf
   derselben Seite) würde `aria-labelledby` doppelt vergeben, ein echter Bug, kein nur
   theoretischer.

Es existiert **kein** `Drawer.test.tsx` (`ls frontend/src/components/ui/Drawer*` zeigt nur
`.module.css`, `.stories.tsx`, `.tsx`) – im Gegensatz zu `Modal.test.tsx`, das bereits Escape/
Fokus-Trap/Fokus-Rückgabe testet (`Modal.test.tsx:14,27,49`). Ein neuer `Drawer.test.tsx` nach
demselben Muster ist Teil der Umsetzung, kein optionaler Zusatz.

**Umsetzungsskizze für den gemeinsamen Kern:**
- Neue Datei z. B. `frontend/src/components/ui/useOverlaySurface.ts`: extrahiert aus
  `Modal.tsx` die Funktionen `getFocusableElements`, den Fokus-`useEffect`
  (Zeilen 85-96) und den `handleKeyDown`-Escape-/Tab-Zyklus (Zeilen 98-123), plus eine
  Portal-Render-Hilfsfunktion. API-Vorschlag: `useOverlaySurface({ open, onClose,
  onEscapeKeyDown? })` liefert `{ panelRef, closeButtonRef, handleKeyDown }`; Portal-Rendering
  bleibt als separate kleine Hilfsfunktion `renderInBodyPortal(node)`, da sowohl Modal als auch
  Drawer sie 1:1 brauchen.
- `Modal.tsx` auf den Hook umstellen – **Verhalten muss byte-identisch bleiben** (bestehender
  `Modal.test.tsx` muss weiterhin grün sein, keine neuen Testfälle nötig, nur Regressionsnachweis).
- `Drawer.tsx` auf denselben Hook umstellen, zusätzlich `useId()` für den Titel statt
  `"ui-drawer-title"`.
- Neuen `Drawer.test.tsx` nach Vorbild `Modal.test.tsx` anlegen (Escape schließt, Fokus-Trap,
  Fokus-Rückgabe nach Schließen).
- `docs/FRONTEND_ARCHITEKTUR.md` um den neuen gemeinsamen Baustein ergänzen (CLAUDE.md-Pflicht:
  "Neue gemeinsame Bausteine ... werden dort kurz aufgeführt").

| Weitere Originalbefunde | Status | Beleg |
|---|---|---|
| rgba-Verläufe, `#7c3c4f`, feste Abstände 24/28/18/22px, Breiten 620/760px | **ERLEDIGT** | `Drawer.module.css` vollständig tokenisiert (`var(--space-*)`, `var(--drawer-width-*)`, `var(--radius-surface)`) |
| Breakpoints 767 vs. 759 uneinheitlich | **NOCH OFFEN** | `Drawer.module.css:100,125` nutzt weiterhin zwei verschiedene Breakpoints (`max-width: 767px` und `max-width: 759px`) ohne gemeinsamen Token – `grep` nach Breakpoint-Tokens in `styles/tokens/*.css` findet keine, es gibt noch kein `--breakpoint-*`-System im Projekt. Vereinheitlichen auf einen gemeinsamen Wert (vermutlich 767px, wie Modal es an der entsprechenden Stelle nutzt, `Modal.module.css:83`) oder beide Stellen bewusst mit Kommentar begründen, falls der Unterschied Absicht ist |
| Stories eingefroren (`open` true + leeres `onClose`) | **ERLEDIGT** | `Drawer.stories.tsx:39-56` nutzt bereits einen echten `useState`-basierten `ControlledDrawer` mit "Drawer öffnen"-Button; der eingefrorene `open:true`/`onClose:()=>{}` existiert nur noch als `meta.args`-Platzhalter, wird aber in JEDER Story überschrieben |
| Story "Normal, groß" ist `md` | **NOCH OFFEN** | `Drawer.stories.tsx:58-61`: Story-Name `'Normal, groß'` rendert `<ControlledDrawer size="md" />` – Namensinkonsistenz (heißt "groß", ist aber die Standardgröße). Umbenennen zu z. B. "Standard" |
| Fehlen `responsiveSheet` + Standard-Fußzeile "Fertig" | **TEILWEISE ERLEDIGT** | Komponente selbst hat bereits den Default-Footer `<Button variant="secondary" onClick={onClose}>Fertig</Button>` (`Drawer.tsx:61`) – aber JEDE Story überschreibt `footer` explizit mit einem eigenen "Schließen"-Button, sodass der Default nie sichtbar demonstriert wird. `variant="responsiveSheet"` wird in KEINER Story referenziert (`grep responsiveSheet Drawer.stories.tsx` → kein Treffer), obwohl die Komponente diese Variante bereits implementiert (`Drawer.tsx:22`, `Drawer.module.css:44-56,125-159`). Zwei neue Stories ergänzen: eine ohne `footer`-Prop (zeigt "Fertig"-Default), eine mit `variant="responsiveSheet"` |

### 5. ReleaseMediaDrawer.tsx / ReleaseThemeDrawerSection.tsx

**Dateien:** `frontend/src/app/admin/fansubs/[id]/edit/ReleaseMediaDrawer.tsx` (287 Zeilen),
`ReleaseThemeDrawerSection.tsx` (287 Zeilen). Einziger Aufrufer: `FansubEditClient.tsx`.

**Dies ist der größte Einzelbefund im gesamten Auftrag.** Beide Dateien sind **komplett
handgebaute** Overlays, nicht nur "könnten den Drawer-Baustein nutzen" – sie nutzen aktuell NULL
der Drawer-Eigenschaften:

- Backdrop: eigenes `<div className={styles.fansubEditReleaseDrawerOverlay} onClick={closeX}>`
  (`ReleaseMediaDrawer.tsx:100-103`, `ReleaseThemeDrawerSection.tsx:77-80`) statt `Drawer`s
  `.overlay`/`.overlayClose`.
- Schließen-Button: **nativer** `<button type="button" onClick={closeX} aria-label="...">` mit
  rohem `<X size={16} />`-Icon (`ReleaseMediaDrawer.tsx:119-126`,
  `ReleaseThemeDrawerSection.tsx:97-104`) – verstößt gegen die CLAUDE.md-Pflicht, `IconButton`
  statt eines eigenen `<button>`-Nachbaus zu nutzen (diese Dateien liegen NICHT unter
  `components/ui/**`, daher greift der ESLint-`native-button`-Guard dort nicht technisch, aber
  die globale Design-System-Pflicht gilt trotzdem).
- Kein Escape, kein Portal (`createPortal`), kein Fokus-Trap, keine Fokus-Rückgabe.
- Titel/Beschreibung: rohe `<h2>`/`<p>` statt `Heading`/`Text`.
- `role="tablist"` mit rohen `<button>`s für Release-Drawer-Tabs (`ReleaseMediaDrawer.tsx:129-152`)
  statt des bestehenden `Tabs`-Bausteins (`components/ui/Tabs.tsx`) – zusätzlicher Fund, der im
  Originalauftrag nicht explizit genannt war, aber zum selben "eigenes Overlay statt globaler
  Bausteine"-Muster gehört.
- CSS lebt in `FansubEdit.releaseDrawer.module.css` (eigene Datei, 63 Treffer für
  `fansubEditReleaseDrawer`-Präfix) – komplett eigenständig, keine Wiederverwendung von
  `Drawer.module.css`/`ui.module.css`.

**Umsetzungsskizze:**
- Beide Dateien auf `<Drawer>` umstellen: `title`/`description`/`footer`/`children` als Props
  statt eigener JSX-Struktur. Die Tabs (`details`/`media`) innerhalb des Drawer-Bodys auf den
  `Tabs`-Baustein umstellen.
- `ReleaseThemeDrawerSection.tsx` nutzt bereits den globalen `Modal`-Baustein für die
  Video-Vorschau (Zeile 260-283, `import { Button, Modal, UploadDropzone } from
  "@/components/ui"`) – das ist bereits korrekt, nur der äußere Theme-Drawer selbst ist das
  Problem.
- Da beide Komponenten mit **287 Zeilen** aktuell unter dem 450-Zeilen-Limit liegen, aber die
  Migration auf `Drawer` den JSX-Teil deutlich verkürzt (kein eigenes Backdrop/Header/Footer
  mehr), ist eine Datei-Aufteilung hier eher unwahrscheinlich nötig – aber nach der Umsetzung
  erneut mit `wc -l` prüfen.
- CSS-Aufräumen: `FansubEdit.releaseDrawer.module.css` kann nach der Migration auf einen Bruchteil
  schrumpfen (nur noch Detail-Grid/Panel-Inhalte, kein Overlay/Header/Footer/Tabs-CSS mehr nötig).

### 6. FocalCarousel

**Dateien:** `FocalCarousel.tsx` (420 Zeilen), `FocalCarouselInternals.tsx` (445 Zeilen – **nur 5
Zeilen unter dem 450-Zeilen-Limit**, Vorsicht bei weiteren Änderungen), `FocalCarousel.module.css`
(257 Zeilen).

| Originalbefund | Status | Beleg |
|---|---|---|
| Feste Werte (gap/44px/Counter/Radius) | **ERLEDIGT** | `FocalCarousel.module.css` vollständig tokenisiert, inkl. `--focal-carousel-*`-Tokens in `components.css:173-180` und `var(--control-height-md)` statt fixer 44px |
| Kommentare Historie | **ERLEDIGT** (keine Treffer mehr für Phasen-/Plan-Verweise in `.tsx`/`.module.css`, nur noch in `.test.tsx`, die vom Guard explizit ausgenommen sind) | `processHistory.regression.test.ts:38-41` schließt `.test.ts(x)`-Dateien aus – `FocalCarousel.test.tsx:303,743,1067` enthält weiterhin "Phase 119/151/120"-Verweise, das ist laut Testdesign zulässig (Verhaltens-Dokumentation in Tests, kein Produktionskommentar) |
| Stories: nur 1, fehlen full-width/grid-scroll/"Alle anzeigen"/Einzelelement | **NOCH OFFEN** | `FocalCarousel.stories.tsx` hat nur `export const Standard` (Zeile 65). `presentation?: 'focal' \| 'full-width' \| 'grid-scroll'` ist in `FocalCarouselInternals.tsx:34` bereits implementiert, aber keine Story nutzt `full-width`/`grid-scroll`. "Alle anzeigen" (expand/showAll) und eine Einzelelement-Darstellung (ein Item, `quiet`-Modus) fehlen ebenfalls |
| Beispielinhalt handgebaut statt Card/ResponsiveImage/MediaFrame/Text | **NOCH OFFEN** | `FocalCarousel.stories.tsx:18-35`: `renderItem` nutzt Inline-`style`-Objekte mit Hex-Farben (`#2d5fe8`, `#d8dce1`), ein rohes `<img>` und ein rohes `<p>` statt `Card`/`ResponsiveImage`/`MediaFrame`/`Text` |

**Umsetzungsskizze:** Da `presentation` bereits vollständig implementiert ist, sind die neuen
Stories reine Storybook-Ergänzungen ohne Code-Änderung an `FocalCarousel.tsx`/
`FocalCarouselInternals.tsx` (wichtig wegen der 445/450-Zeilen-Nähe von Internals – ausschließlich
`FocalCarousel.stories.tsx` anfassen). `renderItem`-Demo durch eine Komposition aus `Card`
(`variant="flat"`), `ResponsiveImage` und `Text` ersetzen.

### 7. ThumbnailStrip

**Dateien:** `ThumbnailStrip.tsx` (81 Zeilen), `ThumbnailStrip.module.css` (43 Zeilen).

| Originalbefund | Status | Beleg |
|---|---|---|
| Kachel = natives `<button>` mit `.thumbActive` | **ERLEDIGT** | `ThumbnailStrip.tsx:63-72` nutzt bereits `IconButton` mit `variant="media"` und `aria-current={index === activeIndex ? 'true' : undefined}` – kein natives `<button>` mehr, Kommentar `ThumbnailStrip.tsx:26-29` dokumentiert das explizit. `DisclosureTrigger.tsx`-Ausnahmeliste in `eslint.config.mjs:77-78` bestätigt: "ThumbnailStrip.tsx wurde entfernt ... Code-Review Runde 3, 2026-10-31" |
| Größe über MediaFrame, feste Werte 96/64px/8px/rgba/12px | **ERLEDIGT** | `ThumbnailStrip.module.css` nutzt nur noch `var(--space-*)`; die 96×64px-Kachelmaße kommen jetzt aus `IconButton`s `media`-Variante (`--icon-button-media-width/-height` in `components.css:41-42`) |
| Zähler `<span>` → `Text meta` | **NOCH OFFEN** | `ThumbnailStrip.tsx:76-78`: weiterhin rohes `<span className={styles.counter}>` statt `<Text as="span" variant="meta">` |
| Kommentar/Stories mit Historie | **ERLEDIGT** | Keine Phasen-/Plan-Verweise mehr in `ThumbnailStrip.tsx`/`.module.css`/`.stories.tsx` |
| Alle Story-Einträge gleiches Bild | **NOCH OFFEN** | `ThumbnailStrip.stories.tsx:9-14`: `demoItems()` nutzt für ALLE Einträge dieselbe `thumbnailUrl: '/covers/placeholder.jpg'` |

**Umsetzungsskizze:** `<span className={styles.counter}>` → `<Text as="span" variant="meta"
className={styles.counter}>` (die bestehende `.counter`-CSS-Klasse bleibt für Farbe/Größe
erhalten, `Text` übernimmt nur das Element/die Rolle – ggf. `.counter`-Regeln reduzieren, falls
`Text variant="meta"` bereits dieselbe Optik liefert, dann nur noch Layout-Overrides lassen).
Für Stories: 3-4 unterschiedliche lokale Platzhalterbilder nutzen, falls im Repo vorhanden
(`find frontend/public -iname "*placeholder*"` prüfen) oder unterschiedliche
`objectFit`/Farbfilter-Varianten eines einzigen Bildes als Behelf, falls keine weiteren
Platzhalter existieren.

### 8. EmptyState / LoadingState / ErrorState

**Dateien:** `EmptyState.tsx` (51 Zeilen), `LoadingState.tsx` (33 Zeilen), `ErrorState.tsx`
(74 Zeilen), jeweils `.module.css`.

| Originalbefund | Status | Beleg |
|---|---|---|
| Proxy-Trick (`EmptyState.tsx:11-13`, `LoadingState.tsx:8-10`) | **NOCH OFFEN** | Beide Dateien nutzen weiterhin exakt dieses Muster: `const styles = new Proxy({} as Record<string,string>, { get: (_t, prop) => ownStyles[prop] ?? sharedStyles[prop] })`. `ErrorState.tsx` nutzt dagegen bereits direkt `import styles from './ui.module.css'` (Zeile 8) – kein Proxy nötig, da `ErrorState` kein eigenes `.module.css` mehr hat |
| `.stateTitle`/`.stateDescription` überschreiben margin/line-height von außen | **Teilweise – architektonisch beabsichtigt** | `ui.module.css:93-97` dokumentiert explizit per Kommentar, dass dies ein bewusst geteiltes Override-Muster ist ("Farbe kommt jetzt von Text ... nur Zeilenabstand bleibt hier als Override"), kein Rückfall. Kein Handlungsbedarf, nur zur Kenntnis |
| EmptyState `inline`-Variante natives `<p>` | **NOCH OFFEN** | `EmptyState.tsx:34-40`: `if (variant === 'inline') return <p className={styles.stateInline}>...` statt `<Text as="p">` |
| `withAction` wirkungslos | **NOCH OFFEN** | `EmptyState.tsx:48`: `{variant === 'withAction' || action ? action : null}` – die Bedingung rendert `action` bereits bei jedem vorhandenen `action`-Wert unabhängig von `variant`; `variant === 'withAction'` ist tote Logik (ohne gesetztes `action` rendert sie `undefined`, ändert also nichts) |
| Kein `role=status`/`aria-live` | **NOCH OFFEN** | Kein `role`/`aria-live`-Attribut irgendwo in `EmptyState.tsx` |
| Stories compact/inline fehlen | **NOCH OFFEN** | `EmptyState.stories.tsx` hat `Standard`/`InfoVariante`/`OhneAction`, aber keine `compact`- oder `inline`-Story |
| LoadingState Standardtext Jargon | **TEILWEISE OFFEN** | Aktueller Default: `title = 'Inhalt wird vorbereitet'`, `description = 'Die Datenstruktur und die zugehörigen Oberflächen werden geladen.'` (`LoadingState.tsx:20-21`) – Titel ist bereits nutzerfreundlich, aber die Default-**Beschreibung** nutzt weiterhin Entwickler-Jargon ("Datenstruktur", "Oberflächen") |
| Beschreibung immer gerendert (leerer Absatz) | **NOCH OFFEN** | `LoadingState.tsx:30`: `<Text variant="soft" ...>{description}</Text>` wird UNBEDINGT gerendert; `LoadingState.stories.tsx:30-36` Story "Ohne Beschreibung" übergibt explizit `description: ''` → rendert einen leeren `<p>` |
| Keine `className`-Prop | **NOCH OFFEN** | `LoadingStateProps` (`LoadingState.tsx:12-17`) hat kein `className`-Feld |
| `compact` ohne Story | **NOCH OFFEN** | Keine Story in `LoadingState.stories.tsx` setzt `compact: true` |
| Wrapper nur für Farbe → Spinner-Farbton-Option | **NOCH OFFEN** | `LoadingState.module.css:1-4`: `.stateSpinnerWrap { color: var(--accent-primary); display: inline-flex; }` – reiner Farb-Wrapper, da `Spinner` (`Spinner.module.css:9-10`) `currentColor` nutzt. `Spinner.tsx` hat keine `tone`-Prop |
| `ErrorState` kein `role=alert` | **NOCH OFFEN** | Kein `role`-Attribut in `ErrorState.tsx` |
| Keine kompakte Variante/`className` | **NOCH OFFEN** | `ErrorStateProps` (`ErrorState.tsx:10-14`) hat weder `compact` noch `className` |
| Story-Texte Verhalten statt Beispiel | **NOCH OFFEN** | `ErrorState.stories.tsx:15-18`: Komponenten-Beschreibung redet über `getErrorStateCopy`/`getStatusAwareMessage` als Code-Identifier, nicht über den sichtbaren Baustein |
| `"Status403"` → `"Keine Berechtigung"` | **TEILWEISE ERLEDIGT** | Der tatsächliche Komponenten-Code (`ErrorState.tsx:47-53`, `getErrorStateCopy`) liefert bereits `title: 'Keine Berechtigung'` für den 403-Fall – **DAS ist bereits erledigt**. Aber der Storybook-Story-EXPORT heißt weiterhin `Status403` (`ErrorState.stories.tsx:38`, auch als sichtbarer `name: 'Status403'`) – reiner Code-Jargon im Katalog, sollte auf z. B. "Keine Berechtigung" umbenannt werden |

**Umsetzungsskizze:**
- `EmptyState`/`LoadingState`: Proxy-Pattern durch `mergeCssModules` ersetzen (identisches Utility
  wird bereits in `Modal.tsx:8,17` und `Drawer.tsx:5,13` genutzt: `import { mergeCssModules }
  from '@/lib/mergeCssModules'` – spart die Proxy-Indirektion und ist das bereits etablierte
  Idiom für genau diesen Fall).
- `variant === 'withAction'` aus `EmptyStateVariant` entfernen (zusammen mit allen Aufrufstellen,
  `grep -rn 'variant="withAction"' frontend/src` vor dem Entfernen prüfen).
- `role="status" aria-live="polite"` auf `EmptyState`/`LoadingState`-Wurzel ergänzen,
  `role="alert"` auf `ErrorState`-Wurzel (Analogie: `MediaSlot.tsx:188` setzt bereits
  `role="alert"` auf seinem Fehlertext – gleiches Muster).
- `LoadingState`: `description` nur rendern, wenn nicht-leer (`{description ? <Text ...>
  {description} </Text> : null}`), `className`-Prop ergänzen (additiv, analog zu anderen
  Komponenten), Default-Beschreibung auf nutzerverständlichen Text umformulieren (z. B. "Bitte
  einen Moment warten." statt "Datenstruktur"/"Oberflächen").
- Spinner-Farbton: `Spinner.tsx` um eine `tone`-Prop erweitern (analog zu `IconButtonTone`-Muster)
  statt `.stateSpinnerWrap`, dann `LoadingState` nutzt `<Spinner tone="accent" />` direkt ohne
  Wrapper-`<span>`.
- `ErrorState`: `compact`/`className`-Props analog zu `EmptyState`/`LoadingState` ergänzen.
- `ErrorState.stories.tsx`: Story `Status403` umbenennen (z. B. `KeineBerechtigung`/"Keine
  Berechtigung"), Komponentenbeschreibung auf fachliche statt Code-Identifier-lastige Sprache
  umschreiben.

### 9. FormField (+ neuer `Label`-Baustein)

**Dateien:** `FormField.tsx` (163 Zeilen), `FormField.module.css` (38 Zeilen).

| Originalbefund | Status | Beleg |
|---|---|---|
| Picker-Trigger setzen eigenes `aria-label` → überdeckt sichtbares Label | **NOCH OFFEN** | `DatePicker.tsx:215`/`YearPicker.tsx:149`: Trigger setzt `aria-label={`${label} auswählen`}` mit `DatePicker`s EIGENEM `label`-Prop (Pflichtprop, `DatePickerProps.label`), völlig unabhängig vom sichtbaren `FormField`-Label-Text. `FormField.tsx`s `injectedProps`/`triggerSafeProps` (Zeilen 97-109) injizieren NUR `id`/`disabled`/`invalid`/`aria-describedby` – kein `label`/`aria-labelledby` wird an DatePicker/YearPicker durchgereicht |
| Optik nachgebaut: Label/Hinweis/Fehler eigene `<label>`/`<p>` mit Hex, gap, px | **TEILWEISE ERLEDIGT** | `FormField.module.css` ist bereits VOLLSTÄNDIG tokenisiert (`var(--form-field-*)` in `components.css:236-242`) – keine Hex-/px-Literale mehr. Aber strukturell sind es weiterhin rohe `<label>`/`<p>`-Elemente (`FormField.tsx:144,152,157`), kein `Label`-Baustein |
| Pflicht-* für Screenreader stumm, `required` nicht ans Feld weitergereicht | **NOCH OFFEN** | `FormField.tsx:147`: `<span className={styles.fieldRequired}>*</span>` hat kein `aria-hidden`; `injectedProps` (Zeilen 97-103) enthält kein `required`/`aria-required`, daher bekommt z. B. `Input` nie das `required`-Attribut vom `FormField.required`-Prop |
| `aria-disabled` auf `div` wirkungslos | **NOCH OFFEN** | `FormField.tsx:141`: `<div className={styles.fieldset} aria-disabled={disabled}>` – ein `<div>` ohne ARIA-Rolle gibt `aria-disabled` nicht an Screenreader weiter |
| Fehlertext ohne Live-Ansage | **NOCH OFFEN** | `FormField.tsx:156-160`: `<p id={errorId} className={styles.fieldError}>` ohne `role="alert"`/`aria-live` |
| Stories mit DatePicker/YearPicker/Switch fehlen | **NOCH OFFEN** | `FormField.stories.tsx` deckt nur `Input`/`Select`/`Textarea` ab (import-Zeile 5-8), keine Story mit `DatePicker`/`YearPicker`/`Switch` als Kind |
| Alte Stories setzen `invalid`/`htmlFor` doppelt | **NOCH OFFEN** | `FormField.stories.tsx` Stories `Standard`/`MitFehler`/`Pflichtfeld`/`Disabled` (Zeilen 33-86) setzen weiterhin manuell `htmlFor`+Kind-`id` (identisch) und bei `MitFehler` zusätzlich `invalid` direkt am `Input` UND `error` am `FormField` – redundant zur bereits vorhandenen Auto-Verknüpfung, die in den NEUEREN Stories `AutomatischVerknuepft*` (Zeilen 88-169) demonstriert wird |
| Fehlender Grundbaustein: Label mit Pflichtmarkierung | **NOCH OFFEN (CONTEXT-Entscheidung)** | Kein `Label.tsx` im Verzeichnis |

**Umsetzungsskizze:**
- **Neuer Baustein `Label.tsx`:** Props mindestens `{ htmlFor?: string; required?: boolean;
  children: ReactNode; id?: string; className?: string }`. Rendert `<label htmlFor={htmlFor}
  id={id}><span>{children}</span>{required ? <span aria-hidden="true"
  className={styles.labelRequired}> *</span> : null}{required ? <VisuallyHidden> (Pflichtfeld)
  </VisuallyHidden> : null}</label>` – nutzt das bereits vorhandene `VisuallyHidden`-Primitiv
  (`components/ui/VisuallyHidden.tsx` existiert bereits) für den Screenreader-Pflicht-Hinweis.
  CSS-Klassen aus `FormField.module.css:13-23` (`.fieldLabel`/`.fieldRequired`) in
  `Label.module.css` verschieben, Tokens bleiben identisch (`--form-field-label-font-size` etc. –
  ggf. umbenennen zu `--label-*`, da jetzt kein FormField-spezifischer Baustein mehr, aber auch
  Beibehaltung ist möglich, Planer-Entscheidung laut CONTEXT "Claude's Discretion").
- `FormField.tsx` nutzt intern `<Label>` statt der eigenen `<label>`/`<span>`-Kombination.
- **`required` ans Feld durchreichen:** `injectedProps` um `required: required ||
  Boolean(childProps.required)` sowie `aria-required: required || undefined` erweitern (analog
  zum bestehenden `disabled`-Merge-Muster in `FormField.tsx:83`).
- **`aria-disabled` auf `div` entfernen oder durch `role="group" aria-disabled`** ersetzen – da
  `fieldset` bereits der CSS-Klassenname ist, ggf. gleich auf ein natives `<fieldset
  disabled={disabled}>` umstellen (natives HTML-Element, deaktiviert ALLE enthaltenen Formular-
  Elemente automatisch über die Browser-eigene Fieldset-Disabled-Vererbung – eleganter als
  manuelles Durchreichen). **Vorsicht:** `<fieldset>` ändert das Standard-Rendering (Border/
  Padding), müsste per CSS zurückgesetzt werden – Aufwand gegen Nutzen abwägen, alternative
  Lösung: `role="group" aria-disabled={disabled}` auf dem `<div>` beibehalten.
- **Fehlertext:** `role="alert"` auf dem `<p id={errorId}>` ergänzen (gleiches Muster wie
  `MediaSlot.tsx:188`).
- **Picker-`aria-label`-Problem:** `FormField` müsste bei bekannten bekannten Feldtypen mit
  eigenem Label-Bedarf (`DatePicker`/`YearPicker`) den sichtbaren `FormField.label`-Text als
  `label`-Prop injizieren, statt dass der Aufrufer ihn doppelt an beiden Stellen tippen muss –
  ODER (einfacher, geringeres Risiko): `DatePicker`/`YearPicker` so erweitern, dass sie
  `aria-labelledby` statt eines separaten `label`-Textes akzeptieren können, wenn sie innerhalb
  eines `FormField` gerendert werden. Die zweite Option passt besser zum "aria-labelledby statt
  aria-label"-Vorschlag aus dem Originalbefund, erfordert aber Änderungen an drei Dateien
  (`FormField.tsx`, `DatePicker.tsx`, `YearPicker.tsx`) statt nur einer – als eigener Task
  einplanen, nicht nebenbei.
- Neue FormField-Stories für `DatePicker`/`YearPicker`/`Switch` als Kind ergänzen (Props-Muster
  wie bei den bestehenden `AutomatischVerknuepft*`-Stories).
- Alte redundante Stories (`Standard`/`MitFehler`/`Pflichtfeld`/`Disabled`) auf das
  Auto-Verknüpfungs-Muster umstellen (kein manuelles `htmlFor`/`invalid` mehr, nur FormField-Props).

### 10. Accordion / DisclosureTrigger

**Dateien:** `DisclosureTrigger.tsx` (41 Zeilen), `Accordion.tsx` (106 Zeilen), beide `.module.css`.

| Originalbefund | Status | Beleg |
|---|---|---|
| DisclosureTrigger unter "Zusammengesetzte Bausteine" statt "Grundbausteine" | **NOCH OFFEN** | `DisclosureTrigger.stories.tsx:11`: `title: 'Zusammengesetzte Bausteine/DisclosureTrigger'` |
| Titel-Typografie nicht selbst setzen, sondern über Heading/Text | **NOCH OFFEN** | `DisclosureTrigger.module.css`: `.disclosureTrigger` setzt direkt `font-size: var(--font-size-h3); font-weight: var(--font-weight-heading);` (bereits tokenisiert, aber weiterhin eigene Typografie statt `<Heading>`/`<Text>` im JSX) |
| Nativer `<button>` bleibt dokumentierte Ausnahme | **ERLEDIGT – keine Änderung nötig** | `eslint.config.mjs:92`: `'DisclosureTrigger.tsx'` steht bereits in `UI_DIR_NATIVE_ELEMENT_EXEMPT_FILES` mit ausführlicher Begründung (Zeilen 85-91) |
| Accordion-Panel setzt eigene Schrift | **NOCH OFFEN (Code widerspricht eigenem Kommentar!)** | `Accordion.module.css:14-19`: Kommentar behauptet "keine eigene Typografie: font-size/color kommen aus globalen Tokens, keine fremde Text-Variable mehr referenziert", aber die Regel direkt darunter setzt `color: var(--text-body); font-size: var(--accordion-panel-font-size); line-height: 1.55;` auf `.accordionPanel` – das IST eigene Typografie (nur die Werte kommen aus Tokens, die Entscheidung "Panel bestimmt die Schrift" bleibt bestehen) |
| Showcase "Im Einsatz/Accordion mit AvatarStack": AvatarStack nur darunter | **NOCH OFFEN** | `AccordionShowcase.tsx:44-51`: `<AvatarStack>` steht als eigenständiges Element NACH dem `<Accordion>`, keine inhaltliche Verzahnung (z. B. als Teil eines Panel-Headers oder -Inhalts) |
| Nackte `<p>` statt `Text` | **NOCH OFFEN** | `AccordionShowcase.tsx:18,28,38`: `<p>Dieser Bereich zeigt...</p>` etc., rohes `<p>`, kein `<Text>` |
| Card-Titel "Accordion-Primitiv" korrigieren | **NOCH OFFEN** | `AccordionShowcase.tsx:9`: `<Card variant="flat" title="Accordion-Primitiv" ...>` |

**Wichtiger technischer Hinweis für die Katalog-Umstellung:** `catalogTaxonomy.test.ts` prüft
AUSSCHLIESSLICH Stories unter `"Grundbausteine/*"` darauf, dass sie keine andere, selbst
katalogisierte `components/ui`-Komponente importieren (`catalogTaxonomy.test.ts:95`). Sobald
`DisclosureTrigger` nach "Grundbausteine" verschoben wird, würde dieser Test **fehlschlagen**,
weil `DisclosureTrigger.tsx:6` `DisclosureIndicator` importiert, das selbst unter
`'Grundbausteine/DisclosureIndicator'` katalogisiert ist (`DisclosureIndicator.stories.tsx:7`).
**Erforderlich:** `catalogTaxonomy.test.ts:20-45`s `EXCEPTIONS`-Map um einen neuen Eintrag
`DisclosureTrigger: ['DisclosureIndicator']` ergänzen, mit Begründung analog zu `Avatar:
['ResponsiveImage', 'VisuallyHidden']` (DisclosureIndicator ist nur das interne Öffner-Symbol,
kein vom Aufrufer sichtbar komponierter Baustein-Verbund).

**Umsetzungsskizze:**
- `DisclosureTrigger.stories.tsx:11` Titel auf `'Grundbausteine/DisclosureTrigger'` ändern +
  `catalogTaxonomy.test.ts` EXCEPTIONS-Eintrag ergänzen (siehe oben).
- Titel-Span (`DisclosureTrigger.tsx:37`) auf `<Heading level={?} size={3}>` oder `<Text
  variant="body" as="span">` umstellen – **Vorsicht:** `title` ist laut Typ `ReactNode`
  (beliebiger Inhalt inkl. Badge-Kombinationen), ein hartes Wrapping in `Heading` könnte
  bestehende Aufrufer mit eigenem Markup brechen. Sauberste Lösung: die Typografie bleibt auf
  dem `<span className={styles.disclosureTriggerTitle}>`-Wrapper, aber als `<Text as="span"
  variant="body">`-Komponente gerendert (gleiche Semantik, nur über den Text-Baustein statt
  eigenem CSS) – Text akzeptiert aber keine beliebige Schriftgröße/-gewicht-Kombination wie
  `--font-size-h3`/`--font-weight-heading`; ggf. muss Text um eine passende Variante erweitert
  werden oder die Entscheidung fällt bewusst für "CSS-Tokens sind bereits die geforderte
  Abstraktion, kein zusätzlicher Text-Wrapper nötig" – als offene Frage an den Planer markiert.
- `Accordion.module.css:14-19`: entweder die Panel-Typografie-Regel entfernen (Inhalt wird
  wirklich neutral, jeder Aufrufer bestimmt seine eigene Typografie) ODER den irreführenden
  Kommentar korrigieren, der das Gegenteil der tatsächlichen Regel behauptet. Originalbefund
  fordert "Inhalt typografisch neutral lassen" → Regel entfernen ist die konsistente Umsetzung.
- `AccordionShowcase.tsx`: `<p>` → `<Text variant="body">`; `AvatarStack` sinnvoll integrieren
  (z. B. als Teil des ersten Panel-Inhalts statt als separates Element danach, oder als
  Kopfzeilen-Zusatz neben dem Accordion-Titel über eine zusammengesetzte Row); Card-`title` auf
  z. B. "Capability-Übersicht je Rolle" o. ä. (nicht mehr "Primitiv", da dies eine Komposition,
  kein Primitiv zeigt).

### 11. MediaSlot

**Dateien:** `MediaSlot.tsx` (194 Zeilen), `MediaSlot.module.css` (43 Zeilen).

| Originalbefund | Status | Beleg |
|---|---|---|
| Fehlertext per eigener CSS-Regel eingefärbt → `Text tone="error"` | **NOCH OFFEN** | `MediaSlot.module.css:41-43`: `.mediaSlotError { color: var(--color-error); }` wird per `className` an `<Text variant="body" role="alert" className={styles.mediaSlotError}>` (`MediaSlot.tsx:188`) angehängt – funktional identisch zum Originalbefund, nur dass `role="alert"` bereits vorhanden ist (das war ein separater, bereits erledigter FormField-ähnlicher Punkt) |
| Hinweis-/Fehler-Stories fehlen | **NOCH OFFEN** | `MediaSlot.stories.tsx` hat KEINE Story mit `hint`- oder `error`-Prop gesetzt (geprüft: `grep -n "hint:\|error:" MediaSlot.stories.tsx` → kein Treffer in den `args`) |
| "Ersetzen-Overlay" → "Ersetzen-Überlagerung" | **NOCH OFFEN** | `MediaSlot.stories.tsx:93-94`: Story-Export `ReplaceOverlay`, sichtbarer `name: 'Ersetzen-Overlay'` – englisches Lehnwort "Overlay" in deutschem UI-Text, verstößt gegen die "korrekte Umlaute"/Sprachqualitäts-Konvention bzw. die allgemeine Erwartung an deutsche Storybook-Beschriftungen |

**Umsetzungsskizze:**
- `Text`-Komponente (`components/ui/Text.tsx`) um `tone="error"` erweitern: `TextTone = 'default'
  | 'onScrim' | 'error'`, neue CSS-Klasse `.textToneError { color: var(--color-error); }` NACH
  den Variant-Klassen (gleiches Reihenfolge-Muster wie `.textToneOnScrim`, `Text.module.css:29-35`).
  `--color-error: #dc3545` existiert bereits als globaler Token (`styles/tokens/palette.css:21`) –
  **kein neuer Token nötig**, nur die Text-Variante selbst ist neu.
  **Offener Punkt für WCAG-Kontrastprüfung (CONTEXT fordert "WCAG-geprüfter Kontrast gegen den
  Kartenhintergrund"):** `--color-error: #dc3545` gegen `--card-bg: #e6ebf3`
  (`components.css:16`) ergibt ein Kontrastverhältnis von ca. 3.3:1 – das unterschreitet WCAG AA
  für normalen Fließtext (4.5:1 nötig), reicht aber für "large text"/UI-Komponenten (3:1). Da
  Fehlertext meist in normaler Textgröße (14px) läuft, **ist dieser Token in der aktuellen Form
  vermutlich NICHT ausreichend kontrastreich** – vor der Umsetzung mit einem dunkleren Rotton
  nachrechnen oder einen dedizierten `--text-error`-Token mit höherem Kontrast definieren, statt
  `--color-error` direkt für Text zu verwenden (siehe Analogie: `--badge-danger-text: #7b2941`
  ist deutlich dunkler als `--color-error: #dc3545` und für genau diesen Zweck – Text auf hellem
  Hintergrund – bereits vorhanden; ggf. `--badge-danger-text` bzw. ein neuer `--text-error`-Token
  mit ähnlichem Wert wiederverwenden statt `--color-error`).
- `MediaSlot.module.css:41-43` (`.mediaSlotError { color: ... }`) entfernen, `MediaSlot.tsx:188`
  auf `<Text variant="body" tone="error" role="alert" ...>` umstellen.
- `FormField.tsx:156-160`s Fehlertext (`<p className={styles.fieldError}>`) ebenfalls auf
  `<Text as="p" tone="error">` umstellen statt der eigenen `--form-field-error-color`-Regel
  (`FormField.module.css:32-37`) – konsolidiert zwei bisher getrennte Fehlertext-Implementierungen
  auf einen Baustein, wie von CONTEXT.md explizit gefordert ("MediaSlot und FormField-Fehlertext
  nutzen diese Option").
- Zwei neue Stories in `MediaSlot.stories.tsx` ergänzen: "Mit Hinweis" (`hint`-Prop gesetzt) und
  "Mit Fehler" (`error`-Prop gesetzt).
- `ReplaceOverlay`-Story-Name (`name: 'Ersetzen-Overlay'`) auf `'Ersetzen-Überlagerung'` ändern
  (Export-Bezeichner `ReplaceOverlay` kann als Code-Identifier bleiben, nur der sichtbare
  `name:`-String ändert sich).

---

## Bestehende CSS-Tokens (zur Wiederverwendung, keine Neuerfindung nötig)

Alle Tokens liegen in `frontend/src/styles/tokens/`, eingebunden über `globals.css` (siehe
`frontend/src/styles/globals.css:11-17`). Relevante bereits vorhandene Tokens für diesen Auftrag:

- **Spacing:** `--space-1` (4px) bis `--space-9` (80px) – `layout.css:21-29`.
- **Control-Höhen:** `--control-height-sm` (36px), `-md` (44px), `-lg` (52px) – `layout.css:31-33`.
- **Badge:** vollständiger Satz `--badge-gap/-min-height/-padding-x/-radius/-font-size/-shadow`
  plus je Ton `--badge-<ton>-bg/-text/-border` für `neutral/success/warning/danger/info` sowie
  `--badge-muted-bg-default/-fg-default/-border` – `components.css:133-157`.
- **Button:** vollständiger Satz `--button-gap/-padding-x(-sm/-lg)/-radius(-sm/-lg/-floating)/
  -font-size(-sm/-lg/-prose)` plus Verlaufs-/Schatten-Tokens je Variante – `components.css:72-106`.
- **FormField:** `--form-field-gap/-label-font-size/-label-color/-required-color/-hint-font-size/
  -hint-color/-error-color` – `components.css:236-242`.
- **Drawer:** `--drawer-accent-rail-width/-sheet-max-height/-header-bg/-body-bg/-footer-bg/
  -footer-shadow` sowie `--drawer-width-md/-lg` (vermutlich in `layout.css`, nicht einzeln
  geprüft, aber von `Drawer.module.css:21,33,51` referenziert) – `components.css:195-201`.
- **Farben:** `--color-error: #dc3545` (`palette.css:21`), `--text-body`, `--text-soft`,
  `--text-strong`, `--accent-primary`, `--accent-deep` (in `colors.css`, nicht einzeln zitiert).
- **Radius/Shadow/Overlay:** `--radius-surface`, `--overlay-scrim-bg`, `--overlay-scrim-blur`
  (`components.css:232-233`), `--focus-ring`.

**Fehlende Tokens, die für diesen Auftrag neu angelegt werden müssen:**
- `--badge-onmedia-bg/-text/-border` (neue Badge-Variante).
- Ggf. `--text-error-color` oder äquivalent für `Text tone="error"`, falls `--color-error` sich
  als nicht kontrastreich genug erweist (siehe MediaSlot-Abschnitt oben).
- Ggf. `--label-*`-Tokens, falls die `FormField.module.css`-Label-Tokens beim Extrahieren von
  `Label.tsx` umbenannt werden (Diskretion laut CONTEXT.md).
- Kein neuer Breakpoint-Token-Satz zwingend erforderlich, aber empfehlenswert, um die
  767-vs-759-Inkonsistenz in `Drawer.module.css` sauber zu lösen (aktuell gibt es GAR KEIN
  Breakpoint-Token-System im Projekt – `grep -rn "breakpoint" styles/tokens/` liefert nichts;
  falls kein Token eingeführt wird, reicht es, den Wert auf 767 zu vereinheitlichen).

## Regressionswächter, die beim Ändern grün bleiben müssen

| Test/Guard | Datei | Relevanz für diesen Auftrag |
|---|---|---|
| CSS-Literal-Verbot in `components/ui/*.module.css` | `foreignVariableOverrides.regression.test.ts` | JEDE neue CSS-Regel (Label.tsx, Badge onMedia, Text tone=error) MUSS Tokens nutzen, sonst schlägt dieser Test fehl. Punkt 1 des Tests erkennt zusätzlich fremd gesetzte CSS-Variablen – bei der Badge-`onMedia`-Migration das `--badge-muted-bg/-fg`-Registrierungspaar (Zeilen 63-64) entsprechend anpassen/entfernen |
| Grundbausteine-Katalog-Reinheit | `catalogTaxonomy.test.ts` | Beim Verschieben von `DisclosureTrigger` nach "Grundbausteine" MUSS die `EXCEPTIONS`-Map um `DisclosureTrigger: ['DisclosureIndicator']` ergänzt werden, sonst schlägt der Test fehl |
| Verbot von Planungs-/Prozess-Jargon in Kommentaren/Stories | `processHistory.regression.test.ts` | Erkennt NICHT automatisch `GAP-\d+`-Muster (Button.module.css:149) – dort trotzdem manuell nachbessern, auch wenn der Test grün bleibt |
| Typografie-Konsistenz (PageHeader/SectionHeader/DialogHeader/Card) | `typography.regression.test.ts` | Nicht direkt von diesem Auftrag betroffen, aber bei Änderungen an `DialogHeader`/`Card` (z. B. im Rahmen der Dialog-Kern-Extraktion) gegenprüfen |
| Natives `<button>`-Verbot in `components/ui/**` | ESLint `no-restricted-syntax`, `eslint.config.mjs:68-93` | `UI_DIR_NATIVE_ELEMENT_EXEMPT_FILES` ist eine RATCHET-Liste, die nur SCHRUMPFEN darf. Für diesen Auftrag: KEINE neue Datei muss dort eingetragen werden (Drawer/Modal nutzen bereits `IconButton`); falls `Label.tsx` ein natives `<label>` enthält, ist das UNKRITISCH, da `<label>` kein von diesem Guard erfasstes Element ist (nur `select/input/textarea/button` sind reguliert, siehe `uiPrimitiveGuardOptions`) |
| Natives `<button>`/`<select>`/`<input>`/`<textarea>` in `src/app/**` | ESLint, gleiche Datei | Betrifft `ReleaseMediaDrawer.tsx`/`ReleaseThemeDrawerSection.tsx` NICHT direkt (deren Verstoß ist ein natives `<button>`, das aber NICHT unter `components/ui/**` liegt und daher technisch nicht vom aktuellen Guard erfasst wird – die Migration auf `Drawer`/`IconButton` ist trotzdem CLAUDE.md-Pflicht, nur nicht automatisiert erzwungen) |
| `Modal.test.tsx` (Escape/Fokus-Trap/Fokus-Rückgabe) | `Modal.test.tsx` | Muss nach der `useOverlaySurface`-Extraktion UNVERÄNDERT grün bleiben (reiner Verhaltenserhalt) |
| Kein `Drawer.test.tsx` vorhanden | — | Muss in diesem Auftrag NEU angelegt werden, sonst bleibt die Dialog-Kern-Migration für Drawer ungetestet |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | `--color-error` (#dc3545) ist gegen den Card-Hintergrund (#e6ebf3) NICHT WCAG-AA-konform für normalen Fließtext (~3.3:1 statt 4.5:1) | MediaSlot / Text tone="error" | Falls die Berechnung falsch ist oder Fehlertext als "large text" gilt, wäre kein neuer Token nötig – vor Umsetzung mit einem Kontrast-Tool nachrechnen (z. B. per Browser-DevTools oder WebAIM-Rechner), nicht nur dieser Handrechnung vertrauen |
| A2 | Die Zuordnung von `Button`-Varianten (`secondary`/`ghost`/...) zu `IconButton`-Varianten bei der `iconOnly`-Migration ist nicht 1:1 definiert, Empfehlung basiert auf Interpretation der `IconButton`-Dokumentationskommentare | Button / iconOnly-Migration | Falsche Varianten-Zuordnung könnte optische Abweichungen in den 18 betroffenen Produktionsdateien erzeugen – jede Migration sollte per Storybook/visuellem Vergleich geprüft werden, nicht blind automatisiert |
| A3 | Der Fix für "Picker-Trigger aria-label überdeckt sichtbares FormField-Label" erfordert Änderungen an drei Dateien (FormField, DatePicker, YearPicker) – als separater, größerer Task eingeplant statt nebenbei im FormField-Task miterledigt | FormField | Falls als zu groß für diesen Auftrag eingeschätzt, könnte der Planer diesen Teilpunkt bewusst zurückstellen (dokumentiert, nicht stillschweigend übersehen) |

**Risiko-Hinweis statt Tabellen-Eintrag:** Keine der obigen Annahmen betrifft Paketabhängigkeiten
oder externe Bibliotheken (reine interne Codebase-Recherche) – der Package-Legitimacy-Abschnitt
entfällt, da dieser Auftrag keine neuen npm-Pakete installiert.

## Offene Fragen für den Planer

1. **Breakpoint-Vereinheitlichung (767 vs. 759 in Drawer.module.css):** Soll ein neues
   `--breakpoint-*`-Token-System eingeführt werden (größerer, über diesen Auftrag hinausgehender
   Schritt) oder reicht eine lokale Vereinheitlichung auf 767px? Empfehlung: lokale
   Vereinheitlichung, kein neues Token-System in diesem Auftrag.
2. **`<fieldset>` vs. `<div role="group">` für FormField-Wurzel:** `<fieldset disabled>` wäre die
   semantisch sauberste Lösung für das `aria-disabled`-Problem, erfordert aber CSS-Reset-Arbeit
   (Browser-Standard-Styling von `<fieldset>`/`<legend>`). Empfehlung: `role="group"
   aria-disabled` als pragmatischere, risikoärmere Lösung, da `FormField` aktuell in sehr vielen
   Stellen verwendet wird (Breiten-Suche zeigt FormField/Input/Select in zahlreichen Admin-Formularen).
3. **DisclosureTrigger-Titeltypografie:** Bleibt die Entscheidung "eigene, tokenisierte
   font-size/-weight direkt auf dem `<button>`" bestehen, oder wird zwingend ein `<Text>`/
   `<Heading>`-Wrapper innerhalb verlangt? CONTEXT.md fordert explizit "über Heading/Text" – falls
   `Text`/`Heading` keine passende Stufe für `--font-size-h3`/`--font-weight-heading` als
   Kombination bieten, müsste ggf. `Heading` um eine entsprechende Options-Kombination erweitert
   werden (zusätzlicher Scope).

## Sources

Alle Quellen sind interne Repository-Dateien, per `Read`/`Bash(grep/wc)` in dieser
Recherche-Session direkt geprüft (keine externen Web-Quellen, da reine Codebase-Analyse):

- `frontend/src/components/ui/{Badge,Button,Modal,Drawer,DialogHeader,ConfirmDialog,FocalCarousel,
  FocalCarouselInternals,ThumbnailStrip,EmptyState,LoadingState,ErrorState,FormField,Accordion,
  DisclosureTrigger,DisclosureIndicator,MediaSlot,Text,Spinner,IconButton}.{tsx,module.css,
  stories.tsx,test.tsx}`
- `frontend/src/styles/tokens/{layout,components,palette,colors,fields,typography,roleCatalog}.css`
- `frontend/src/components/ui/{catalogTaxonomy,foreignVariableOverrides,processHistory,
  typography}.test.ts` (Regressionswächter)
- `frontend/eslint.config.mjs` (native-Element-Guards, `UI_DIR_NATIVE_ELEMENT_EXEMPT_FILES`)
- `frontend/src/app/admin/fansubs/[id]/edit/{ReleaseMediaDrawer,ReleaseThemeDrawerSection,
  FansubEditClient}.tsx`, `FansubEdit.releaseDrawer.module.css`
- `frontend/src/app/fansubs/[slug]/page.module.css`, `frontend/src/components/fansubs/
  FansubHeroSection.accessibility.test.ts`
- `frontend/src/components/showcases/{AccordionShowcase.tsx,AccordionShowcase.stories.tsx}`
- `.planning/quick/261101-q79-team4s-storybook-runde-6-bausteinqualita/261101-q79-CONTEXT.md`
- `./CLAUDE.md`

## Metadata

**Confidence breakdown:**
- Status "erledigt vs. offen" je Befund: HIGH – jeder Befund wurde per `Read`/`grep` am
  tatsächlichen aktuellen Code verifiziert, nicht aus dem Originalauftrag übernommen.
- Umsetzungsskizzen (Tokennamen, Dateipfade, Testauswirkungen): HIGH für bereits existierende
  Muster (Token-Referenzen, Testverhalten), MEDIUM für neue Design-Entscheidungen (z. B. genaue
  Variant-Zuordnung bei iconOnly-Migration, Label-API-Form) – diese bleiben laut CONTEXT.md
  bewusst in der Diskretion des Planers/Executors.
- WCAG-Kontrastrechnung (A1): MEDIUM – Handrechnung, keine Tool-Verifikation in dieser Session.

**Research date:** 2026-11-01
**Valid until:** Bis zum nächsten Merge in `components/ui/**` (Codebase ändert sich schnell in
diesem Bereich – vor Planungsbeginn `git log --oneline -5 -- frontend/src/components/ui/` prüfen,
falls zwischen Recherche und Planung Zeit vergangen ist).
