# Refactor-Plan: `fansubs/[id]/edit/page.tsx` aufteilen (Ziel ≤ 450 Zeilen/Datei, 1000 nur Notausnahme)

**Ziel:** Die monolithische `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` (aktuell **4018 Zeilen**)
in saubere Module aufteilen.

**Limit-Politik (wichtig):** Das **450-Zeilen-Limit aus `CLAUDE.md` gilt weiter als Regel.** Für
**diesen einen Refactor** ist **1000 Zeilen nur die absolute Obergrenze (Notausnahme)** — falls ein
Bereich partout nicht sauber unter 450 zu schneiden ist. **Zielvorgabe ist ≤ 450** für jede neue
Datei; die 1000er-Ausnahme soll möglichst gar nicht gebraucht werden und darf **nicht** zum neuen
Normalmaß werden.

**Safety-Netz:** 25 Vitest-Dateien / 125 Tests im Verzeichnis (`src/app/admin/fansubs/`), plus
`tsc` und ESLint (`no-restricted-syntax` für native Form-Controls). Nach **jeder** Wave: voller
Suite-Lauf + `tsc` + Lint, dann committen. Reines Verschieben, **kein** Verhaltens-Change.

---

## Ist-Struktur von `page.tsx`

| Bereich | Zeilen (ca.) | Inhalt |
|---|---|---|
| Imports | 1–119 | next/react/lucide/api/types/ui + 20 lokale Sibling-Komponenten |
| Lokale Types | 136–212 | 12 `type`-Definitionen (FormState, ReleaseSegmentCard, ReleaseDrawerContext …) |
| Pure Helper | 214–851 | ~46 reine Funktionen (Formatter, Release-Helfer, Form-Mapping, Access-Predikate) |
| `FansubEditAccessGate` | 862–975 | Access-Gate-Komponente |
| `YearSelectField` | 977–1004 | kleine Feld-Komponente |
| **`AdminFansubEditContent`** | **1006–4002** | **~2996 Zeilen Monolith** (70+ `useState`, Loader, Handler, gesamtes JSX) |
| `AdminFansubEditPage` (default) | 4003–4018 | dünner Suspense-Wrapper |

Interne Gliederung von `AdminFansubEditContent`:
- **State/Refs** ~1024–1204 (70+ `useState`, 8 `useRef` Request-Sequence-Guards)
- **Memos/Effects/Loader/Handler** ~1105–2520 (Daten-Loader, Drawer-open/close, `save`, Upload/Delete)
- **Haupt-`return` JSX** ~2540–4002:
  - Details-/Stammdaten-Formular (`<form onSubmit={save}>`) ~2540–2853
  - Releases-Cockpit (`activeMainTab === "releases"`) 2854–3563 (FilterBar, CoverageMatrix, Anime-/Release-Zeilen, Theme-Segmente)
  - Notes / Vorschläge / Readiness Tabs 3564–3582 (rufen bereits ausgelagerte Tab-Komponenten)
  - Modals/Drawer am Ende: `AnimeContributionModal` (3584), Release-Media-Drawer details (3659) + media (3736), `ReleaseContributionDrawer` (3986)

---

## Ziel-Modulschnitt (alle ≤ 1000 Zeilen)

Alle neuen Dateien co-located unter `frontend/src/app/admin/fansubs/[id]/edit/`.

### Pure Extraktionen (kein State, kein Hook) — Risiko: minimal
| Neue Datei | Quelle (Zeilen) | ≈ Zeilen | Inhalt |
|---|---|---|---|
| `fansubEditTypes.ts` | 136–212 | ~95 | alle lokalen `type`s + `FansubEditAccessContext` |
| `fansubEditFormatters.ts` | slugify…errMessage (279–662 selektiv) | ~260 | Parse/Format/Label-Helfer |
| `fansubEditReleaseHelpers.ts` | 414–520, 663–851 selektiv | ~210 | Release/Segment-Helfer (`mapReleaseSegmentCards`, `groupContributionMembersByRole`, …) |
| `fansubEditFormMapping.ts` | 520–653, 746–795 | ~200 | `mapGroupToForm/Media/Links`, `formToPayload`, `syncFansubLinks` |
| `fansubEditAccess.ts` | 214–278, 797–860 | ~130 | `canUseMainTab`, `visibleMainTabs`, `can*`-Predikate, `readFansubIDFromParams` |
| `FansubEditAccessGate.tsx` | 862–975 | ~120 | Access-Gate-Komponente |
| `YearSelectField.tsx` | 977–1004 | ~30 | Feld-Komponente |

→ Entfernt ~**715 Zeilen** aus `page.tsx` bei nahezu null Risiko (nur Imports umbiegen).

### Custom Hooks (State + Logik) — Risiko: mittel — **Ziel je ≤ 450**
| Neuer Hook | extrahierte State-Domäne | ≈ Zeilen |
|---|---|---|
| `useFansubDetailsForm.ts` | `form/initialForm/aliases/links/media/slug` + `save`, Alias-/Link-Handler, Slug-Check-Effect | ~440 |
| `useReleaseMediaDrawer.ts` | Release-/Theme-Drawer-State + `handleDrawerUpload/Click/Delete`, `openReleaseDrawer/closeReleaseDrawer`, Theme-Drawer + Sequence-Refs | ~440 |
| `useFansubReleaseData.ts` | `releaseGroups/animeCoverageMap/releasesByContext/pagination/expanded*` + `loadAnimeReleases`, `refreshAnimeCoverage`, `toggleAnime/toggleRelease`, `handleReleaseRowsScroll` + zugehörige Sequence-Refs | ~400 |
| `useReleaseContributions.ts` | Theme-Segmente (`loadReleaseSegmentCards`) + Contribution-Modal (`loadAnimeContributionRows`, `openAnimeContributions`) **und** Phase-83-`contributionDrawer*` (`openContributionDrawer`) | ~350 |

> `useFansubReleaseCockpit` (~700) wäre über 450 → bewusst in **zwei** Hooks geteilt
> (`useFansubReleaseData` + `useReleaseContributions`), damit beide ≤ 450 bleiben.

### View-Komponenten (JSX) — Risiko: mittel — **Ziel je ≤ 450**
| Neue Komponente | Quelle (Zeilen) | ≈ Zeilen |
|---|---|---|
| `FansubDetailsTab.tsx` | Details-Form-JSX + `communityLinksList` (~2540–2853 + 2208-Fragment) | ~430 |
| `AnimeReleasesCockpit.tsx` | Cockpit-Rahmen: FilterBar + CoverageMatrix + Anime-Liste/-Zeilen 2854–~3130 | ~380 |
| `ReleaseRowDetails.tsx` | Release-Zeilen-Render inkl. Theme-Segment-Karten ~3130–3563 | ~430 |
| `ReleaseMediaDrawer.tsx` | Release-Drawer details+media 3659–3985 | ~330 |

> `AnimeReleasesCockpit` (~750) wäre über 450 → in **Rahmen** + **`ReleaseRowDetails`** geteilt.

### Ergebnis `page.tsx`
`AdminFansubEditContent` schrumpft zum **Orchestrator**: ruft die Hooks, rendert
`<FansubDetailsTab>`, `<AnimeReleasesCockpit>` (mit `<ReleaseRowDetails>`), die Tab-Sektionen und
die Modals/Drawer. + `AdminFansubEditPage`-Wrapper + Imports → **~350–420 Zeilen**.

**Mit dieser feineren Teilung liegt jede Datei ≤ 450** — die 1000er-Notausnahme wird voraussichtlich
gar nicht gebraucht. Sollte ein Bereich beim Umsetzen doch nicht sauber ≤ 450 zu kriegen sein, gilt
1000 als harte Obergrenze und wird im Commit kurz begründet.

---

## Ausführungs-Wellen (test-guarded, je 1 Commit)

- **Wave 0 — Pure Extraktionen** (`fansubEditTypes/Formatters/ReleaseHelpers/FormMapping/Access` +
  `FansubEditAccessGate` + `YearSelectField`). Mechanisch, keine Logikänderung. `page.tsx` → ~3300.
- **Wave 1 — Details-Domäne**: `useFansubDetailsForm` + `FansubDetailsTab`. Self-contained
  (Form/Aliasse/Links/Medien/Slug/`save`).
- **Wave 2 — Drawer-Domäne**: `useReleaseMediaDrawer` + `ReleaseMediaDrawer`.
- **Wave 3 — Cockpit-Domäne (größte, zuletzt)**: `useFansubReleaseCockpit` + `AnimeReleasesCockpit`.
  Inklusive der Phase-83-`contributionDrawer*`-Verdrahtung. Danach `page.tsx` ≤ ~450.

Reihenfolge bewusst: die am wenigsten verflochtene Domäne (Details) zuerst, die am stärksten
verflochtene (Cockpit) zuletzt — dann ist die Restdatei schon klein und übersichtlich.

---

## Risiken / Fallstricke

1. **Cross-cutting State** bleibt im Parent und wird per Props/Callbacks gereicht (nicht in einen
   Hook ziehen): `group`, `capabilities`, `activeMainTab`, `loading/saving`, `toast`, `error`,
   `selectedAnimeId`, `isMobile`. Alternativ ein schlankes `FansubEditContext` — nur falls die
   Prop-Drilling-Tiefe unangenehm wird.
2. **Request-Sequence-Refs** (`releaseRequestSeqRef`, `releaseSegmentRequestByReleaseRef`, …) müssen
   **mit ihrem Loader** in denselben Hook wandern, sonst brechen die Stale-Response-Guards.
3. **Effekte mit Domänen-übergreifenden Deps** (z. B. Reset bei Gruppenwechsel) zuerst kartieren;
   ggf. im Parent belassen und Setter aus den Hooks aufrufen.
4. **`AnimeContributionModal` / `ReleaseContributionDrawer`** bleiben eigene Dateien; nur ihr
   State+Open-Handler (Phase 83) ziehen in `useFansubReleaseCockpit`.
5. **ESLint `no-restricted-syntax`**: bestehende native Controls beim Verschieben **nicht** neu
   einführen; vorhandene 2 Checkbox-Warnungen in `AnimeContributionModal` sind separat (kein
   `Checkbox`-Primitiv vorhanden) und nicht Teil dieses Refactors.

## Definition of Done

- `page.tsx` und jede neue Datei **≤ 450 Zeilen** (Regel). 1000 nur als begründete Notausnahme,
  möglichst ungenutzt.
- `npx vitest run src/app/admin/fansubs/` → 125/125 grün nach jeder Wave.
- `tsc` exit 0, ESLint ohne neue Verstöße.
- Kein Verhaltens-/UI-Change (reines Strukturieren).
