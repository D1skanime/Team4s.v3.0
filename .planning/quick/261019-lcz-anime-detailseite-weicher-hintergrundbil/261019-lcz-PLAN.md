---
phase: 261019-lcz-anime-detailseite-weicher-hintergrundbil
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/anime/AnimeBackdropRotator.logic.ts
  - frontend/src/components/anime/AnimeBackdropRotator.logic.test.ts
  - frontend/src/components/anime/AnimeBackdropRotator.tsx
  - frontend/src/components/anime/AnimeBackdropRotator.module.css
autonomous: false
requirements: []
must_haves:
  truths:
    - "Beim periodischen Bildwechsel (alle 9s) ist zu keinem Zeitpunkt eine leere/dunkle Flaeche sichtbar -- das neue Bild blendet weich ueber das alte, nicht hart dagegen ausgetauscht"
    - "Schlaegt das Vorladen (new Image()+.decode()) des naechsten Bildes fehl, bleibt das aktuell sichtbare Bild stehen, die Rotation haengt sich aber nicht auf (naechster Versuch beim folgenden Intervall-Tick)"
    - "Das allererste Bild beim Laden der Seite (inkl. Fallback-Cover) blendet sanft ein statt abrupt zu erscheinen; das Fallback-Cover-Verhalten selbst (wann es angezeigt wird) aendert sich nicht"
    - "Am natuerlichen Ende des Theme-Videos blendet das Video weich zum Bild ueber statt hart zu verschwinden"
    - "Der sofortige Stopp des Theme-Videos bei Navigation/Unmount/pagehide (Quick 261019-kq9) bleibt unveraendert sofort und ohne Ausblenden -- nur das natuerliche Video-Ende bekommt den weichen Uebergang"
    - "Bei prefers-reduced-motion: reduce ist der Ken-Burns-Zoom komplett aus und die Crossfade-/Fade-Dauer ist stark verkuerzt (nahezu instant)"
    - "Die Rotationsintervall-Dauer bleibt 9 Sekunden"
  artifacts:
    - path: "frontend/src/components/anime/AnimeBackdropRotator.logic.ts"
      provides: "Reine, DOM-freie Funktionen: naechster Rotations-Index, Vorlade-Erfolg-Entscheidung, Slot-Swap-Resultat nach Vorladen (inkl. Fehlerfall-Fallback)"
      exports: ["getNextBackdropIndex", "canSwapInPreloadedBackdrop", "resolveBackdropSlotsAfterPreload"]
    - path: "frontend/src/components/anime/AnimeBackdropRotator.logic.test.ts"
      provides: "Direkte Vitest-Unit-Tests auf den drei reinen Funktionen, keine Render-/Klick-Simulation"
    - path: "frontend/src/components/anime/AnimeBackdropRotator.tsx"
      provides: "Zwei persistente Bild-Ebenen (Slot a/b) mit Opacity-Crossfade + Preload/Decode + Ken-Burns-Zoom + weicher Video-Ende-Uebergang"
    - path: "frontend/src/components/anime/AnimeBackdropRotator.module.css"
      provides: "CSS fuer Crossfade-Opacity, Ken-Burns-Keyframes, Video-Fade-Out, prefers-reduced-motion-Override"
  key_links:
    - from: "frontend/src/components/anime/AnimeBackdropRotator.tsx"
      to: "frontend/src/components/anime/AnimeBackdropRotator.logic.ts"
      via: "import { getNextBackdropIndex, canSwapInPreloadedBackdrop, resolveBackdropSlotsAfterPreload }"
      pattern: "resolveBackdropSlotsAfterPreload"
    - from: "frontend/src/components/anime/AnimeBackdropRotator.tsx"
      to: "frontend/src/components/anime/AnimeBackdropRotator.module.css"
      via: "data-backdrop-visible / data-backdrop-slot / data-theme-video-state Attribute"
      pattern: "data-backdrop-visible"
    - from: "frontend/src/components/anime/AnimeBackdropRotator.tsx"
      to: "frontend/src/components/anime/themeVideoAudio.ts"
      via: "bestehender Import stopThemeVideoPlayback/isNavigationTriggerEvent bleibt unveraendert bestehen"
      pattern: "stopThemeVideoPlayback"
---

<objective>
Die Hintergrundbild-Rotation auf `/anime/<id>` wechselt aktuell hart: eine einzige `.image`-Ebene tauscht per State-Update ihr `background-image` aus, `transition: background-image 0.5s` greift nicht zuverlaessig (background-image ist keine zuverlaessig interpolierbare CSS-Eigenschaft), das naechste Bild wird nie vorgeladen (kurze leere/dunkle Flaeche beim Tausch moeglich), und am Ende des Theme-Videos verschwindet das Video synchron mit dem React-Re-Render, ohne jeden Uebergang.

Dieser Plan ersetzt das in der BESTEHENDEN Komponente `AnimeBackdropRotator.tsx` durch: zwei persistente Bild-Ebenen (Slot a/b) mit Opacity-Crossfade (~1,5s), verpflichtendem Vorladen+Decode vor jedem Einblenden, einem dezenten Ken-Burns-Zoom auf der sichtbaren Ebene, und einem weichen Opacity-Uebergang vom Video zum Bild NUR am natuerlichen Video-Ende (der gestrige sofortige Navigations-Stopp bleibt unangetastet). Zeitsteuerungs-/Auswahllogik wird in reine Funktionen in eine neue Datei `AnimeBackdropRotator.logic.ts` ausgelagert und direkt unit-getestet.

Purpose: Nutzerwahrnehmbares Flackern beim Hintergrundbild-Wechsel beseitigen, ohne das Rotationsintervall (9s) oder das Fallback-Cover-Verhalten zu aendern.
Output: Erweiterte `AnimeBackdropRotator.tsx`/`.module.css`, neue `AnimeBackdropRotator.logic.ts` + Tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/components/anime/AnimeBackdropRotator.tsx
@frontend/src/components/anime/AnimeBackdropRotator.module.css
@frontend/src/components/anime/themeVideoAudio.ts
@frontend/src/components/anime/themeVideoAudio.test.ts
</context>

<interfaces>
Ist-Zustand `AnimeBackdropRotator.tsx` (191 Zeilen) -- relevante Ausschnitte, die dieser Plan veraendert:

```typescript
const ROTATION_INTERVAL_MS = 9000

// State heute:
const [backdropUrls, setBackdropUrls] = useState<string[]>([])
const [activeIndex, setActiveIndex] = useState(0)
// Theme-Video-States unveraendert: activeThemeVideoUrl, showThemeVideo, isThemeVideoMuted, audioToggleError, themeVideoRef

// Manifest-Resolve-Effekt setzt backdropUrls (geshuffelt) + zufaelligen activeIndex -- bleibt als Quelle der
// URL-Liste bestehen, NUR die Reaktion darauf (sofortiges hartes Anzeigen) wird durch Preload+Swap ersetzt.

// Rotations-Effekt heute (ersetzen durch Preload-vor-Swap-Variante, Intervall bleibt 9000ms):
useEffect(() => {
  if (showThemeVideo || backdropUrls.length < 2) return undefined
  const timer = window.setInterval(() => {
    setActiveIndex((current) => (current + 1) % backdropUrls.length)
  }, ROTATION_INTERVAL_MS)
  return () => window.clearInterval(timer)
}, [backdropUrls, showThemeVideo])

// Rendering heute (EIN Bild, hart getauscht):
const activeBackdrop = backdropUrls[activeIndex] || fallbackImageURL
// <div className={styles.image} style={{ backgroundImage: `url("${activeBackdrop}")` }} />

// Video-Ende heute (hart, kein Uebergang):
function finishThemeVideo(): void {
  setShowThemeVideo(false)
  setActiveThemeVideoURL(null)
  setThemeVideoMuted(true)
  setAudioToggleError(null)
}
// <video ... onEnded={finishThemeVideo} onError={finishThemeVideo} />
```

Aus `themeVideoAudio.ts` (bleibt UNVERAENDERT, nur weiterhin importiert/genutzt):

```typescript
export function isNavigationTriggerEvent(eventType: 'pointerdown' | 'keydown', target: unknown, key: string | undefined, currentHref: string): boolean
export function stopThemeVideoPlayback(video: StoppableVideo): void
export function shouldRenderEnableAudioButton(showThemeVideo: boolean, activeThemeVideoUrl: string | null, isThemeVideoMuted: boolean): boolean
```

Der separate Navigations-Stopp-Effekt (ruft `stopThemeVideoPlayback` direkt auf dem Ref bei `pointerdown`/`keydown`/`pagehide` auf, UNABHAENGIG von `onEnded`) bleibt strukturell unveraendert -- er greift NICHT ueber `finishThemeVideo`/`onEnded`, sondern direkt auf den Video-Ref, und ist daher vom neuen Fade-Mechanismus (der nur in `onEnded` ansetzt) nicht betroffen. NICHT anfassen, nur verifizieren dass er nach den Aenderungen weiterhin greift.

Ist-Zustand `AnimeBackdropRotator.module.css` (relevante Klasse):

```css
.image {
  position: absolute; inset: 0;
  background-position: center; background-repeat: no-repeat; background-size: cover;
  transform: scale(1.06); filter: saturate(1.05);
  transition: background-image 0.5s ease-in-out; /* wirkungslos -- wird entfernt */
}
.video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
```

Farb-/Token-Nutzung im Projekt beschraenkt sich auf `var(--color-primary)`, `var(--color-white)`, `var(--color-border)`, `var(--color-text-primary)` etc. -- fuer Timing/Transitions gibt es im Projekt KEINE vorhandenen CSS-Variablen (verifiziert: kein `--duration-*`/`--transition-*`/`--ease-*` in `globals.css`); literale ms-Werte fuer neue Transitions/Animations sind daher zulaessig, es werden dabei aber KEINE neuen Farb-Variablen erfunden. Bestehendes `prefers-reduced-motion`-Muster im Projekt (z.B. `frontend/src/components/ui/FocalCarousel.module.css`): eigener `@media (prefers-reduced-motion: reduce) { ... }`-Block, der betroffene `transition`/`animation` auf `none` bzw. eine sehr kurze Dauer setzt -- dieses Muster uebernehmen.
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Reine Rotations-/Preload-Entscheidungslogik in AnimeBackdropRotator.logic.ts + Tests</name>
  <files>frontend/src/components/anime/AnimeBackdropRotator.logic.ts, frontend/src/components/anime/AnimeBackdropRotator.logic.test.ts</files>
  <behavior>
    - `getNextBackdropIndex(currentIndex: number, totalCount: number): number`
      - totalCount 3, currentIndex 0 -> 1; currentIndex 2 (letzter) -> 0 (wrap-around)
      - totalCount 0 oder negativ -> 0 (Guard, kein NaN/Infinity)
      - totalCount 1 -> immer 0
    - `canSwapInPreloadedBackdrop(preloadSucceeded: boolean): boolean`
      - true -> true
      - false -> false
      (trivialer, aber benannter Entscheidungspunkt -- dokumentiert die Regel "nur bei erfolgreichem Vorladen einblenden" als eigene, testbare Einheit)
    - `resolveBackdropSlotsAfterPreload(params: { preloadSucceeded: boolean; currentSlots: [string, string]; visibleSlotIndex: 0 | 1; nextUrl: string }): { slots: [string, string]; visibleSlotIndex: 0 | 1 }`
      - preloadSucceeded=false -> gibt currentSlots/visibleSlotIndex UNVERAENDERT zurueck (Fehlerfall-Fallback: aktuelles Bild bleibt stehen)
      - preloadSucceeded=true, visibleSlotIndex=0 -> schreibt nextUrl in Slot 1 (den verdeckten Slot), neues visibleSlotIndex=1, Slot 0 (alter Inhalt) bleibt im Array stehen (wird erst beim naechsten erfolgreichen Zyklus ueberschrieben)
      - preloadSucceeded=true, visibleSlotIndex=1 -> symmetrisch: schreibt nextUrl in Slot 0, neues visibleSlotIndex=0
      - nextUrl identisch zu einem bereits vorhandenen Slot-Inhalt -> Funktion verhaelt sich identisch (kein Sonderfall, reiner Wertevergleich irrelevant fuer die Slot-Mechanik)
  </behavior>
  <action>
    Neue Datei `AnimeBackdropRotator.logic.ts` anlegen, ausschliesslich mit den drei oben spezifizierten, synchronen, DOM-freien Funktionen (keine Imports von React/DOM-APIs). Alle drei Funktionen benannt exportieren exakt mit diesen Signaturen. Keine Seiteneffekte, keine `Math.random()`-Nutzung in dieser Datei (das bestehende, unveraenderte `shuffle()` in `AnimeBackdropRotator.tsx` bleibt dort, da es nicht zu den drei benannten Entscheidungspunkten gehoert und nicht Teil dieses Auftrags ist).

    Neue Datei `AnimeBackdropRotator.logic.test.ts` mit `describe`-Bloecken je Funktion, die exakt die oben in `<behavior>` gelisteten Faelle pruefen. Keine Render-/Klick-Simulation, kein `@vitest-environment jsdom`-Pragma noetig -- reine Funktionsaufrufe mit Plain-Objects/Arrays/Primitives als Ein- und Ausgabe.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/anime/AnimeBackdropRotator.logic.test.ts"</automated>
  </verify>
  <done>Alle Tests in AnimeBackdropRotator.logic.test.ts sind GREEN; die drei Funktionen sind exportiert, typisiert ohne `any`, und haben keine DOM-/React-Abhaengigkeit.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Zwei-Ebenen-Crossfade + Preload + Ken-Burns + weicher Video-Uebergang in AnimeBackdropRotator.tsx/.module.css</name>
  <files>frontend/src/components/anime/AnimeBackdropRotator.tsx, frontend/src/components/anime/AnimeBackdropRotator.module.css</files>
  <action>
    Zuerst verifizieren (bevor etwas geaendert wird): mit `wc -l` die aktuelle Zeilenzahl beider Dateien pruefen und den Ist-Code gegen die in `<interfaces>` zitierten Ausschnitte abgleichen -- falls die echte Datei an diesen Stellen abweicht, die Aenderung an den TATSAECHLICHEN Code anpassen statt die Spezifikation blind draufzupressen.

    1. Imports erweitern in `AnimeBackdropRotator.tsx`: `getNextBackdropIndex`, `canSwapInPreloadedBackdrop`, `resolveBackdropSlotsAfterPreload` aus `./AnimeBackdropRotator.logic` ergaenzen (neben dem bestehenden Import aus `./themeVideoAudio`, der UNVERAENDERT bleibt).

    2. Neues State-Modell fuer die Bild-Ebenen (ersetzt `activeIndex`-basiertes direktes Rendering; `backdropUrls` und die Manifest-Resolve-Logik fuer die Liste bleiben wie bisher bestehen):
    - `pointerIndexRef = useRef(0)` -- haelt den Rotations-Zeiger (muss kein State sein, da er nur innerhalb des Intervall-Callbacks gelesen/geschrieben wird und keinen eigenen Re-Render ausloesen muss)
    - `const [slots, setSlots] = useState<[string, string]>([fallbackImageURL, fallbackImageURL])`
    - `const [visibleSlotIndex, setVisibleSlotIndex] = useState<0 | 1>(0)`
    - `const [slotGenerations, setSlotGenerations] = useState<[number, number]>([0, 0])` -- erhoeht sich fuer den jeweils NEU befuellten Slot, genutzt als React-`key` auf dem inneren Ken-Burns-Element, um die CSS-Zoom-Animation bei jedem neuen Bild zuverlaessig neu zu starten (auch wenn dieselbe URL erneut in denselben Slot geschrieben wird)
    - `const preloadTokenRef = useRef(0)` -- Race-Guard: jeder Preload-Aufruf erhoeht den Token vor dem Start; wenn beim Abschluss `preloadTokenRef.current` nicht mehr dem eigenen Token entspricht (ein neuerer Preload lief inzwischen an ODER die Komponente ist unmounted -- siehe Cleanup unten), wird das Ergebnis verworfen (kein `setState` nach Unmount/Veralten)

    3. `preloadImage(url: string): Promise<boolean>` als kleine, bewusst UNGETESTETE (Browser-API-abhaengige, nicht-pure) Hilfsfunktion direkt in `AnimeBackdropRotator.tsx` (NICHT in `.logic.ts`, da sie `new Image()`/`.decode()` nutzt und damit kein reiner Entscheidungscode ist): erzeugt `new Image()`, setzt `.src = url`, ruft `await img.decode()` in try/catch auf, gibt `true` bei Erfolg, `false` bei jedem Fehler zurueck (nie werfen).

    4. `preloadAndSwap(targetUrl: string)` als `useCallback`: zieht den Token via `preloadTokenRef.current += 1; const token = preloadTokenRef.current`, wartet `const preloadSucceeded = await preloadImage(targetUrl)` ab, aktualisiert dann -- nur bei `preloadTokenRef.current === token` (sonst verwerfen) -- `setSlots`/`setVisibleSlotIndex` ueber `resolveBackdropSlotsAfterPreload({ preloadSucceeded, currentSlots: slots, visibleSlotIndex, nextUrl: targetUrl })` (funktionale `setState`-Form mit `prev` nutzen, um stale closures bei `slots`/`visibleSlotIndex` zu vermeiden) und erhoeht bei `preloadSucceeded` zusaetzlich `slotGenerations` fuer den gerade befuellten (verdeckten) Slot-Index.

    5. Manifest-Resolve-Effekt: sobald `backdropUrls` erstmals nicht-leer ist (neuer, zusaetzlicher `useEffect` mit Dependency `[backdropUrls]`, der nur beim UEBERGANG von leer zu nicht-leer feuert, z.B. via Ref-Flag `hasInitializedBackdropRef`), den initial zufaellig gewaehlten Index als `pointerIndexRef.current` setzen und `void preloadAndSwap(backdropUrls[pointerIndexRef.current])` aufrufen -- dadurch blendet das allererste echte Bild aus dem Fallback-Cover-Zustand heraus sanft ein, OHNE eine Sonderbehandlung zu benoetigen (gleicher Mechanismus wie jede spaetere Rotation). Die Fallback-Cover-ANZEIGEBEDINGUNG (wann `fallbackImageURL` statt eines echten Backdrops gezeigt wird) bleibt dadurch unangetastet -- es aendert sich nur, DASS der Uebergang weg vom Fallback weich ist.

    6. Rotations-Intervall-Effekt (ersetzt den bestehenden, Dependencies bleiben `[backdropUrls, showThemeVideo]`, Intervall bleibt `ROTATION_INTERVAL_MS = 9000` UNVERAENDERT): bei jedem Tick `const nextIndex = getNextBackdropIndex(pointerIndexRef.current, backdropUrls.length); pointerIndexRef.current = nextIndex; void preloadAndSwap(backdropUrls[nextIndex])` aufrufen statt direkt `setActiveIndex`.

    7. Unmount-Cleanup: in einem `useEffect` mit leerer Dependency-Liste (oder im Cleanup des Rotations-Effekts) `preloadTokenRef.current` beim Unmount weiter erhoehen/auf einen nie wieder erreichbaren Wert setzen, damit ein spaet aufloesender Preload nach Unmount garantiert keinen `setState` mehr ausloest.

    8. Rendering der Bild-Ebenen (ersetzt die einzelne `<div className={styles.image} .../>`): zwei persistente `<div>`s mit stabilen React-Keys `key="a"`/`key="b"` (NICHT indexbasiert, damit sie nie remounten), jeweils mit `className={styles.backdropLayer}`, `data-backdrop-slot="a"` bzw. `"b"`, `data-backdrop-visible={visibleSlotIndex === 0 ? 'true' : 'false'}` (Slot a) bzw. dem Gegenteil (Slot b), und einem inneren Wrapper-`<div>` mit `key={slotGenerations[0]}` (bzw. `[1]`), `className={styles.backdropLayerZoom}` und `style={{ backgroundImage: 'url(' + JSON.stringify(slots[0]) + ')' }}` (bzw. `slots[1]`) -- der wechselnde `key` erzwingt den Ken-Burns-Animations-Neustart bei jedem neuen Bild in diesem Slot. Die alte `activeBackdrop`-Konstante und das alte `.image`-Rendering entfernen.

    9. Video-Ende weich statt hart: neuen State `const [isThemeVideoEnding, setIsThemeVideoEnding] = useState(false)` ergaenzen. `onEnded`-Handler des `<video>`-Elements von `finishThemeVideo` auf einen neuen `handleThemeVideoNaturalEnd` umstellen, der `setIsThemeVideoEnding(true)` setzt und per `window.setTimeout(finishThemeVideo, VIDEO_TO_IMAGE_FADE_MS)` (neue Konstante, z.B. `600`) den tatsaechlichen Ausbau aus dem DOM verzoegert; die Timeout-ID in einem Ref halten und in einem `useEffect`-Cleanup per `clearTimeout` aufraeumen, damit bei zwischenzeitlichem Unmount/Navigations-Stopp kein verspaetetes `finishThemeVideo` mehr feuert. `onError` bleibt UNVERAENDERT direkt auf `finishThemeVideo` (Fehlerfall -- kein Grund fuer einen weichen Uebergang von einem bereits kaputten Video). Das `<video>`-Element erhaelt zusaetzlich `data-theme-video-state={isThemeVideoEnding ? 'ending' : 'playing'}`. Der bestehende, separate Navigations-Stopp-Effekt (direkter `stopThemeVideoPlayback`-Aufruf auf dem Ref bei `pointerdown`/`keydown`/`pagehide`) bleibt komplett unangetastet -- er setzt `isThemeVideoEnding` NICHT, daher bleibt der sofortige Stopp bei Navigation ohne jede Ausblend-Verzoegerung erhalten.

    10. CSS in `AnimeBackdropRotator.module.css`: `.image`-Klasse (inkl. der wirkungslosen `transition: background-image ...`-Zeile) entfernen, ersetzen durch: `.backdropLayer` (`position: absolute; inset: 0; opacity: 0; overflow: hidden; transition: opacity 1500ms ease-in-out;`) plus `.backdropLayer[data-backdrop-visible="true"] { opacity: 1; }`; `.backdropLayerZoom` (`position: absolute; inset: 0; background-position: center; background-repeat: no-repeat; background-size: cover; filter: saturate(1.05); transform: scale(1.06); animation: backdropKenBurns 9000ms ease-out forwards;`) plus `@keyframes backdropKenBurns { from { transform: scale(1.06); } to { transform: scale(1.12); } }`; `.video` ergaenzen um `transition: opacity 600ms ease-in-out;` (Basiswert `opacity: 1` beibehalten/ergaenzen) plus neuem Selektor `.video[data-theme-video-state="ending"] { opacity: 0; }`; am Dateiende einen `@media (prefers-reduced-motion: reduce) { ... }`-Block (Muster wie `FocalCarousel.module.css`) ergaenzen, der `.backdropLayer`/`.video` auf `transition-duration: 150ms` setzt und `.backdropLayerZoom` auf `animation: none`. Es werden dabei KEINE neuen Farb-/Design-Token-Variablen eingefuehrt -- nur Timing-Literale und bestehende Werte (`scale(1.06)`, `filter: saturate(1.05)`) aus der alten `.image`-Klasse wiederverwendet.

    11. Datei-Laenge: nach allen Aenderungen `wc -l` auf beide Dateien pruefen. Falls `AnimeBackdropRotator.tsx` ueber 450 Zeilen waechst, MUSS in diesem Zug weiter aufgeteilt werden (z.B. die Preload/Slot-State-Verwaltung in einen eigenen Hook `useBackdropRotation.ts` auslagern) -- nicht die Grenze ignorieren.

    12. Bestehende Tests nicht anfassen: `themeVideoAudio.ts`/`.test.ts` bleiben unveraendert. Falls ein bestehender Test fuer `AnimeBackdropRotator.tsx` existiert (aktuell keiner gefunden), diesen nur minimal anpassen und die Abweichung exakt begruenden -- Produktverhalten NICHT aendern, um Tests kuenstlich gruen zu machen.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/anime" and docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit" and docker compose exec -T team4sv30-frontend sh -c "cd /app && wc -l src/components/anime/AnimeBackdropRotator.tsx src/components/anime/AnimeBackdropRotator.module.css"</automated>
  </verify>
  <done>Alle bestehenden Tests unter src/components/anime (inkl. themeVideoAudio.test.ts, unveraendert) bleiben GREEN; tsc --noEmit ist clean; beide geaenderten Dateien bleiben <= 450 Zeilen; die Komponente rendert zwei persistente Bild-Ebenen mit den dokumentierten data-Attributen und nutzt die drei Funktionen aus AnimeBackdropRotator.logic.ts.</done>
</task>

<task type="auto">
  <name>Task 3: Volle Checks im Container, Container-Neustart, Commits</name>
  <files>keine neuen Dateien (Verifikations- und Commit-Schritt)</files>
  <action>
    1. Volle Testsuite, Typecheck und Lint im Frontend-Container ausfuehren: `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run test"`, `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run typecheck"`, `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run lint"`. Alle drei muessen GREEN sein (bzw. nur vorbestehende, unabhaengige Befunde aus `deferred-items.md` zeigen); bei neuen Fehlschlaegen die Ursache im eigenen Code beheben, NICHT das Produktverhalten aendern um Tests kuenstlich gruen zu machen.
    2. `docker restart team4sv30-frontend` ausfuehren, nachdem alle Code-Aenderungen abgeschlossen sind; danach kurz pruefen dass der Container gesund ist (z.B. `curl -sI http://192.168.235.196:3000/` -> 200).
    3. Atomare, pfadbezogene Commits erzeugen (kein `git add -A`, kein `git stash`, KEINE Co-Authored-By-Zeile): mindestens ein Commit fuer die neue reine Logik+Tests (Task 1) und ein Commit fuer die Komponenten-/CSS-Aenderung (Task 2), jeweils nur mit den tatsaechlich betroffenen Dateien `git add`-en.
    4. Mindestens eine Anime-ID mit mehreren hinterlegten Hintergrundbildern (fuer die Rotation) und mindestens eine Anime-ID mit einem Theme-Video (fuer den Video-Ende-Uebergang) ermitteln -- z.B. per `/api/v1/anime/:id/backdrops` oder per Grep ueber das `media`-Verzeichnis -- und in der SUMMARY.md fuer die Live-Pruefung des Nutzers notieren.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run test" 2>&1 | tail -20</automated>
  </verify>
  <done>Test/Typecheck/Lint sind GREEN im Container; Frontend-Container wurde neu gestartet und antwortet mit 200; Commits sind pfadbezogen und atomar; mindestens eine testbare Anime-ID fuer Rotation und eine fuer Theme-Video sind in SUMMARY.md genannt.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Live-Checkpoint -- Crossfade, Ken-Burns und Video-Ende-Uebergang im Browser bestaetigen</name>
  <files>none (manuelle Verifikation, keine Dateiaenderungen erwartet)</files>
  <action>
    Die unten stehenden how-to-verify-Schritte dem Nutzer vorlegen und auf explizite Bestaetigung
    (oder eine Problem-Beschreibung) warten, bevor dieser Plan und die Quick-Task als abgeschlossen
    markiert werden.
  </action>
  <what-built>Weicher Crossfade (opacity, ~1.5s) zwischen Hintergrundbildern statt hartem Umspringen, Vorladen vor jedem Bildwechsel, dezenter Ken-Burns-Zoom, und ein weicher Opacity-Uebergang vom Theme-Video zum Bild am natuerlichen Video-Ende. Der sofortige Audio-Stopp bei Navigation (gestriger Fix) ist unveraendert.</what-built>
  <how-to-verify>
    1. Im Browser (ueber den SSH-Tunnel `http://127.0.0.1:3300`) eine der in SUMMARY.md genannten Anime-Detailseiten mit mehreren Hintergrundbildern oeffnen und ca. 30-40 Sekunden beobachten: der Bildwechsel alle 9s soll weich ueberblenden (kein hartes Umspringen, keine kurze leere/dunkle Flaeche), und das sichtbare Bild soll sich sehr langsam leicht vergroessern (Ken-Burns).
    2. Falls eine Anime-ID mit Theme-Video vorhanden ist: Seite mit laufendem Theme-Video oeffnen und das natuerliche Ende abwarten (oder ein kurzes Theme-Video waehlen) -- der Uebergang zum Bild soll weich sein, nicht hart.
    3. Regressionscheck (gestriger Fix): "Ton aktivieren" klicken, dann auf eine andere Anime-Karte/Relation klicken, WAEHREND das Video noch laeuft -- der Ton muss sofort stoppen, OHNE auszublenden (kein verzoegertes Ausklingen beim Navigations-Stopp).
    4. In den Browser-DevTools (Elements-Tab) die zwei `div[data-backdrop-slot]`-Elemente und deren `data-backdrop-visible`-Attribut beobachten, um den Opacity-Wechsel nachzuvollziehen, falls gewuenscht.
    5. Optional: unter DevTools -> Rendering -> "Emulate CSS prefers-reduced-motion: reduce" pruefen, dass der Zoom komplett verschwindet und der Uebergang nahezu instant wird.
  </how-to-verify>
  <resume-signal>Antworte mit "approved" oder beschreibe das beobachtete Problem (z.B. "immer noch Flackern bei X" oder "Zoom zu stark").</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Browser DOM/Timer-Events -> Komponente | `setInterval`/`setTimeout`/`Image().decode()` sind rein clientseitig, kein neuer Server-Trust-Boundary betroffen |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-261019lcz-01 | Denial of Service (Client) | `preloadAndSwap`/`preloadImage` in AnimeBackdropRotator.tsx | accept | Rein clientseitige, bereits vorhandene Bild-URLs aus dem Manifest werden lediglich zusaetzlich per `new Image()` vorgeladen statt direkt als `background-image` gesetzt -- kein neuer Netzwerk-Endpunkt, keine zusaetzliche Angriffsflaeche; Race-Guard per Token verhindert veraltete `setState`-Aufrufe nach Unmount |
</threat_model>

<verification>
- `AnimeBackdropRotator.logic.test.ts`: alle Tests GREEN (reine Funktionsaufrufe, keine Render-Simulation)
- Bestehende `themeVideoAudio.test.ts` bleibt unveraendert und GREEN
- Volle Frontend-Testsuite, Typecheck, Lint GREEN im Container
- `AnimeBackdropRotator.tsx`/`.module.css` bleiben <= 450 Zeilen
- Blockierender Live-Checkpoint durch den Nutzer: Crossfade ohne Flackern, Ken-Burns sichtbar, weicher Video-Ende-Uebergang, sofortiger Navigations-Stopp weiterhin ohne Ausblenden
</verification>

<success_criteria>
- Bildwechsel alle 9s ueberblendet weich (Opacity-Crossfade), nie eine leere/dunkle Flaeche
- Naechstes Bild wird vor dem Einblenden vorgeladen+decodiert; Ladefehler blockieren die Rotation nicht, lassen aber das aktuelle Bild stehen
- Erstes Bild (inkl. Fallback-Cover-Uebergang) blendet sanft ein
- Theme-Video blendet am natuerlichen Ende weich zum Bild ueber; der sofortige Navigations-Stopp (gestriger Fix) bleibt unveraendert ohne Ausblenden
- Ken-Burns-Zoom ist dezent und bei `prefers-reduced-motion: reduce` vollstaendig deaktiviert (Crossfade/Fade dann stark verkuerzt)
- Rotationsintervall bleibt 9 Sekunden
- Tests/Typecheck/Lint GREEN im Docker-Container; Frontend-Container neu gestartet; Nutzer hat den Live-Checkpoint "approved"
</success_criteria>

<output>
Create `.planning/quick/261019-lcz-anime-detailseite-weicher-hintergrundbil/261019-lcz-SUMMARY.md` when done, inklusive der recherchierten Anime-IDs zum Live-Testen (Rotation + Theme-Video).
</output>
