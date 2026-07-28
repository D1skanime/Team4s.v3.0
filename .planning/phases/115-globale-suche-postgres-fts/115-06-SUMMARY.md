---
phase: 115-globale-suche-postgres-fts
plan: 06
subsystem: frontend
tags: [search, combobox, ui-primitives, accessibility, url-state, debounce]
status: complete
requires:
  - "Plan 115-05 (types/search.ts, api.ts getSearch/getSearchSuggestions, useDebouncedSearch-Hook, AppShell-Nav)"
provides:
  - "Route /suche: schlanke Server-Shell (force-dynamic) mit PageHeader + URL-Zustand-Bootstrap (q)"
  - "SearchField: zentrales @/components/ui Input mit Search-as-you-type (>=2 Zeichen, 250ms) + Combobox-Tastatur (Pfeil/Enter/Esc) + aria-activedescendant"
  - "SuggestionList: gruppierte Vorschlaege (Anime/Fansubgruppen) als role=listbox mit Trefferzahl-Badge je Gruppe + 'Alle Treffer anzeigen'-Zeile"
  - "suggestionHref(item): Anime -> /anime/:id, Fansubgruppe -> /fansubs/:slug"
affects:
  - "Plan 115-07 (Ergebnis-/Filterbereich erweitert diese page.tsx; Slot bereits vorgesehen)"
  - "Plan 115-08 (Live-UAT: visuelle/Interaktions-Abnahme des Suchfelds + Vorschlaege)"
tech-stack:
  added: []
  patterns:
    - "Server-Shell (force-dynamic) resolved searchParams (Promise-faehig) -> initialer Empty-State-Gate; interaktive UX in Client-Component(en) darunter (Analog anime/page.tsx)"
    - "Combobox-Muster: Input role=combobox + aria-activedescendant zeigt auf role=option-Zeilen der Listbox; flache Navigationsindizes (Anime, dann Fansubgruppen, dann 'Alle Treffer'-Zeile)"
    - "Vorschlagszeilen sind div role=option (kein natives Markup); die 'Alle Treffer'-Aktion ist der Button-Primitiv (variant ghost) mit role=option — Grep-/ESLint-Gate fuer native <input>/<button>/<select> bleibt bei 0"
    - "onMouseDown preventDefault auf Optionen verhindert Input-Blur vor dem Klick (Dropdown bleibt bis zur Aktivierung offen)"
    - "suppressFocusOpenRef: Esc schliesst mit Fokusrueckgabe, ohne dass onFocus das Dropdown sofort wieder oeffnet"
key-files:
  created:
    - frontend/src/app/suche/page.tsx
    - frontend/src/app/suche/page.module.css
    - frontend/src/app/suche/SearchField.tsx
    - frontend/src/app/suche/SearchField.module.css
    - frontend/src/app/suche/SearchField.test.tsx
    - frontend/src/app/suche/SuggestionList.tsx
    - frontend/src/app/suche/SuggestionList.module.css
  modified: []
decisions:
  - "SearchField komponiert SuggestionList als Kind (Combobox-Container haelt den Hook), statt beide als Geschwister unter der Server-Page zu setzen — so kann der useDebouncedSearch-Zustand ohne 4. Wrapper-Datei geteilt werden (Plan nannte nur page/SearchField/SuggestionList)"
  - "Initial-Empty-State lebt in der Server-Page und wird ueber die URL (q) gated; da useDebouncedSearch q per router.replace spiegelt und die Seite force-dynamic ist, reagiert der Slot auf Zustandswechsel. Der dynamische Ergebnis-/Kein-Treffer-Zustand folgt in 115-07"
  - "'Alle Treffer'-Zeile navigiert per router.push('/suche?q=...') zur Vollsuche; die eigentliche Ergebnisliste rendert 115-07"
  - "Suggestion-Detail-Links: Anime ueber numerische /anime/:id (Analog buildAnimeDetailHref), Fansubgruppe ueber /fansubs/:slug (Analog fansubs-Seite)"
metrics:
  duration: "~35 min"
  completed: 2026-07-29
  tasks: 3
  files: 7
---

# Phase 115 Plan 06: Sucheingabefläche (Route /suche + SearchField + SuggestionList) Summary

Die interaktive Sucheingabefläche steht: Die Route `/suche` ist eine schlanke Server-Shell
(`force-dynamic`) mit `PageHeader` „Suche", die den URL-Suchzustand (`q`) als Initialwert
bootstrappt und den Initial-Leerzustand „Wonach suchst du?" als Ergebnis-Slot zeigt (der
Ergebnis-/Filterbereich folgt in Plan 115-07). Darunter sitzt das `SearchField` — das zentrale
`@/components/ui` `Input` als visueller Anker der Seite — mit Search-as-you-type über den
`useDebouncedSearch`-Hook (≥ 2 Zeichen, 250 ms Debounce, AbortController-Abbruch) und voller
Combobox-Tastaturbedienung (↓/↑ navigiert, Enter aktiviert, Esc schließt mit Fokusrückgabe) samt
`aria-activedescendant`. Die `SuggestionList` rendert die Vorschläge als `role="listbox"`, getrennt
in die Gruppen „Anime" und „Fansubgruppen" (je `SectionHeader` + Trefferzahl-`Badge`, serverseitig
begrenzt) plus eine „Alle Treffer für „{query}" anzeigen"-Zeile zur Vollsuche. Ausschließlich
`@/components/ui`-Primitives, korrekte Umlaute, jede Datei ≤ 450 Zeilen. Alles lokal grün:
typecheck, lint (0 Errors), Vitest (10/10 im `suche`-Verzeichnis).

## Was umgesetzt wurde

### Task 1 — Route-Shell /suche (page.tsx) · Commit 427d9b66
- `frontend/src/app/suche/page.tsx` (58 Z.): Server-Component mit `export const dynamic =
  'force-dynamic'`, Promise-fähiger `searchParams`-Auflösung (`firstValue`-Helfer), `PageHeader`
  Titel „Suche", eingebettetem `SearchField` im `searchAnchor`-Slot und dem Initial-`EmptyState`
  („Wonach suchst du?") als Ergebnis-Slot, gated über die URL-`q`. Nur Primitives, keine nativen
  Elemente.
- `page.module.css`: Canvas-Hintergrund (`--surface-canvas`), Suchfeld dominiert das obere Drittel
  (zentriert, `max-width: 720px`, `z-index` über dem Slot) — visueller Anker gemäß UI-SPEC Color.

### Task 2 — SearchField Combobox (tdd) · Commit 9282a9f0
- `frontend/src/app/suche/SearchField.tsx` (181 Z., Client): `Input` mit inline `Search`-Icon,
  Placeholder „Anime oder Fansubgruppe suchen …", `aria-label` „Suchbegriff eingeben",
  `role="combobox"`, `aria-expanded`/`aria-controls`/`aria-autocomplete`/`aria-activedescendant`.
  Zustand über `useDebouncedSearch`; flache Optionsliste (Anime → Fansubgruppen → „Alle
  Treffer"-Zeile) mit Modulo-Navigation für ↓/↑; Enter aktiviert den markierten Vorschlag
  (`router.push(suggestionHref)`) bzw. löst die Vollsuche aus; Esc schließt mit Fokusrückgabe.
- `SearchField.module.css`: Anker-Größe (`--control-height-lg`, 18px), Icon-Overlay, Accent-Fokus
  (`--color-primary` + `--focus-ring`) nur für das aktive Feld.
- `SearchField.test.tsx` (140 Z., jsdom): 5 Tests — Placeholder/`aria-label`, `<2`-Zeichen-Guard
  (kein Such-/Vorschlags-Request, kein Dropdown), Vorschläge ab 2 Zeichen + ↓ markiert die erste
  Option (`aria-activedescendant` → `role=option`, `aria-selected=true`), Weiter-Navigation zur
  zweiten Option, Esc schließt das Dropdown. Alle 5 grün.

### Task 3 — gruppierte SuggestionList · Commit a87033ea
- `frontend/src/app/suche/SuggestionList.tsx` (153 Z., Client): `Card`-Dropdown mit
  `role="listbox"`; zwei Gruppen `SectionHeader` „Anime"/„Fansubgruppen" mit Trefferzahl-`Badge
  variant="neutral"` (`trefferLabel` Singular „1 Treffer"); Zeilen als `div role="option"`
  (`SuggestionRow`, `aria-selected`, `onMouseDown`-preventDefault); abschließende „Alle Treffer für
  „{query}" anzeigen"-Zeile als `Button variant="ghost"` mit `role="option"`; `LoadingState`
  während der Abfrage bei noch leeren Gruppen (kein Layout-Shift).
- `SuggestionList.module.css`: Absolutes Dropdown unter dem Feld (`--shadow-md`), Zeilen-Hover,
  Accent-Kante (`inset ... --color-primary`) nur für die aktive Option.

## Abweichungen vom Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Esc öffnete das Dropdown sofort wieder**
- **Gefunden in:** Task 2 (Esc-Test im RED-Lauf rot)
- **Problem:** Die Fokusrückgabe bei Esc (`inputRef.current.focus()`) feuerte den `onFocus`-Handler,
  der das gerade geschlossene Dropdown bei vorhandener Query erneut öffnete — der Esc-Test schlug fehl.
- **Fix:** `suppressFocusOpenRef` wird bei Esc gesetzt und im `onFocus` einmalig konsumiert, sodass die
  Fokusrückgabe das Dropdown nicht wieder öffnet. Genuines Re-Fokussieren öffnet weiterhin.
- **Dateien:** frontend/src/app/suche/SearchField.tsx
- **Commit:** 9282a9f0

Sonst keine Rule-2/3/4-Eingriffe.

## Sicherheit (Threat-Register)

- **T-115-06-01 (XSS über q/Ergebnistext):** mitigiert — ausschließlich React-Textknoten
  (auto-escaped); kein `dangerouslySetInnerHTML` in SearchField/SuggestionList/page.
- **T-115-06-02 (DoS / Request-Flut):** mitigiert — Debounce (250 ms) + AbortController-Abbruch +
  `>=2`-Zeichen-Guard aus `useDebouncedSearch` (Plan 115-05); der `<2`-Zeichen-Test beweist, dass
  kein Request ausgelöst wird.
- **T-115-06-03 (Info Disclosure):** akzeptiert — Client rendert nur gelieferte Items; Sichtbarkeit
  erzwingt der Server (Plan 03/04). Keine clientseitige Filterung von Rohdaten.
- **T-115-06-SC (npm-Installs):** keine neuen Pakete; nur vorhandene Deps.

## Verifikation

- `cd frontend && npm run typecheck` — grün.
- `cd frontend && npm run lint` — 0 Errors (323 vorbestehende Warnungen, keine in den neuen Dateien).
- `cd frontend && npx vitest run src/app/suche/` — 10/10 grün (SearchField 5, useDebouncedSearch 5).
- Grep-/Zeilen-Gates: native `<input|<button|<select>` in page/SearchField/SuggestionList = 0;
  `PageHeader`=2, `aria-label "Suchbegriff eingeben"`=1, `role="listbox"`=1, „Anime"/„Fansubgruppen"
  vorhanden; alle Dateien ≤ 450 Zeilen (page 58, SearchField 181, SuggestionList 153, Test 140).
- Docker war down (Umgebungsvorgabe) — keine Runtime-/Browser-Verifikation, nichts fabriziert. Die
  visuelle/Interaktions-Abnahme (Fokusführung, Accent-Nutzung, mobile Touch-Targets, echte Daten)
  ist in den gebündelten Phase-115-Live-UAT (Plan 115-08) verschoben.

## Known Stubs

Keine im Sinne toter Daten. Der Ergebnis-/Filterbereich ist bewusst noch nicht vorhanden — die
Server-Page zeigt den Initial-Empty-State als Slot; der dynamische Ergebnis-/Kein-Treffer-/Fehler-
Zustand und die Filterleiste sind explizit Gegenstand von Plan 115-07 (im Objective so definiert).
Die „Alle Treffer anzeigen"-Zeile navigiert bereits korrekt zur `/suche?q=…`-Vollsuche; deren
Ergebnisliste rendert 115-07.

## Self-Check: PASSED
- FOUND: frontend/src/app/suche/page.tsx (+ page.module.css)
- FOUND: frontend/src/app/suche/SearchField.tsx (+ .module.css)
- FOUND: frontend/src/app/suche/SearchField.test.tsx
- FOUND: frontend/src/app/suche/SuggestionList.tsx (+ .module.css)
- FOUND: .planning/phases/115-globale-suche-postgres-fts/115-06-SUMMARY.md
- FOUND commit: 427d9b66 (Task 1 page-shell)
- FOUND commit: 9282a9f0 (Task 2 SearchField)
- FOUND commit: a87033ea (Task 3 SuggestionList)
