---
phase: quick-261029-d3k
plan: 01
subsystem: frontend-ui-tooling
tags: [storybook, ui-system, dev-tooling, design-system, docs]
dependency-graph:
  requires: []
  provides:
    - frontend/.storybook/* (Storybook-10-Konfiguration, @storybook/nextjs Webpack-Adapter)
    - 38 UI/*-Stories unter frontend/src/components/ui/
    - 10 Showcases/*-Komponenten+Stories unter frontend/src/components/showcases/
    - team4sv30-storybook Compose-Service (Port 6006)
    - npm run build-storybook als Pflicht-Validation-Schritt (AGENTS.md)
  affects:
    - CLAUDE.md, AGENTS.md, docs/FRONTEND_ARCHITEKTUR.md, frontend/eslint.config.mjs
    - docker-compose.yml, docker-compose.override.yml
tech-stack:
  added:
    - storybook@10.6.5
    - "@storybook/nextjs@10.6.5 (Webpack-Adapter)"
    - "@storybook/addon-themes@10.6.5"
    - "@storybook/addon-a11y@10.6.5"
    - "@storybook/addon-docs@10.6.5"
  patterns:
    - "Stories ziehen bei UI-Aenderungen mit (neue Pflichtregel CLAUDE.md/AGENTS.md)"
    - "UI/* (globale Primitives, volle Zustandsabdeckung) vs. Showcases/* (1:1-migrierte Kompositionen)"
key-files:
  created:
    - frontend/.storybook/main.ts
    - frontend/.storybook/preview.tsx
    - frontend/.storybook/preview.css
    - "frontend/src/components/ui/*.stories.tsx (38 Dateien)"
    - frontend/src/components/showcases/ (neues Verzeichnis, 10 Komponenten + Stories)
    - frontend/src/components/showcases/DesignTokensShowcase.tsx (neu, vormals nur inline)
    - frontend/src/components/showcases/AchievementBadgeShowcase.sourceFiles.fixture.ts
  modified:
    - frontend/package.json, frontend/package-lock.json
    - docker-compose.yml, docker-compose.override.yml, .gitignore, frontend/eslint.config.mjs
    - CLAUDE.md, AGENTS.md, docs/FRONTEND_ARCHITEKTUR.md
decisions:
  - "TsconfigPathsPlugin-Extensions-Luecke per webpackFinal gefixt statt ResponsiveImage.tsx's Import-Stil zu aendern (Produktionscode bleibt unberuehrt)."
  - "npm run build ueber docker compose exec braucht NODE_ENV=production (geerbtes NODE_ENV=development aus dem Dev-Container bricht sonst das Prerendering) -- dokumentiert, nicht am Compose-Setup geaendert."
metrics:
  duration: "~2.5h"
  completed: "2026-10-29"
---

# Phase quick-261029-d3k Plan 01: Storybook einführen und /dev/ui-system ablösen Summary

Storybook 10 (`@storybook/nextjs`, Webpack-Adapter) ersetzt die In-App-Showcase-Route
`/dev/ui-system` vollständig: 38 globale UI-Primitives mit voller Zustandsabdeckung unter
`UI/*`, 10 domänenspezifische Kompositionen 1:1 migriert unter `Showcases/*`, eigener
`team4sv30-storybook`-Compose-Service auf Port 6006, `npm run build-storybook` als neue
Pflichtprüfung in `AGENTS.md`.

## Was wurde gebaut

**Grundgerüst (Task 1):** `storybook@^10.6.5` + `@storybook/nextjs` (Webpack-Adapter) +
`@storybook/addon-themes`/`-a11y`/`-docs` manuell als `devDependencies` eingetragen (kein
`npx storybook init`). `frontend/.storybook/main.ts` definiert den Stories-Glob über
`components/ui/**/*.stories.tsx` und `components/showcases/**/*.stories.tsx`.
`preview.tsx`/`preview.css` importieren `globals.css` (dieselbe Token-Quelle wie die App),
definieren die drei Pflicht-Viewports (390×844/768×1024/1440×900) und einen
`withThemeByClassName`-Decorator für einen Hell/Dunkel-Bühnenhintergrund (KEIN eigenes
Produkt-Dark-Theme — Team4s hat keines). Neuer Compose-Service `team4sv30-storybook`
(Port 6006, `command: npm run storybook`).

**38 `UI/*`-Stories (Tasks 1-8):** Jede globale Primitive aus `@/components/ui/index.ts`
hat eine eigene `<Name>.stories.tsx` mit mindestens Standard- plus allen tatsächlich
angebotenen Zustandsvarianten (disabled/invalid/Fehler/Laden/leer/lange Inhalte/Fokus).
Button diente als früher empirischer Test, dass CSS-Module unter dem Webpack-Adapter ohne
Zusatzkonfiguration greifen (bestätigt).

**10 `Showcases/*`-Kompositionen (Tasks 9-11):** Neues Verzeichnis
`frontend/src/components/showcases/` nimmt alle vormals unter `/dev/ui-system` sichtbaren
domänenspezifischen Showcase-Komponenten auf (AccordionShowcase, SwitchShowcase,
DrawerShowcase, UploadPrimitivesShowcase, AppShellDrawerDemoSection,
PublicFansubSurfacesShowcase, PublicReleaseSurfacesShowcase, CompositionShowcase + drei
verschachtelte Unterkomponenten, AchievementBadgeShowcase-Galerie). Zusätzlich neue,
eigenständige `DesignTokensShowcase`-Komponente für die vormals nur inline in `page.tsx`
vorhandene Design-Tokens-/Farbfamilien-Vorschau — ohne sie wäre diese Vorschau beim
Löschen der Route ersatzlos verschwunden.

**Route entfernt + Doku umgestellt (Tasks 12-14):** `frontend/src/app/dev/` und
`frontend/src/app/admin/dev/` vollständig gelöscht. `CLAUDE.md`, `AGENTS.md`,
`docs/FRONTEND_ARCHITEKTUR.md`, `frontend/eslint.config.mjs` zeigen jetzt auf Storybook
statt auf die entfernte Route; neue Pflichtregel "Stories ziehen bei UI-Änderungen mit" in
beiden `CLAUDE.md` und `AGENTS.md`. `npm run build-storybook` läuft fehlerfrei über alle 48
Story-Dateien (193 Storybook-Einträge) und ist in `AGENTS.md` "## Validation" als
Pflichtprüfung verankert.

## Verifikation (empirisch geprüft)

- `docker compose up -d team4sv30-storybook` startet erfolgreich; Storybook unter
  `http://127.0.0.1:6006` erreichbar. `index.json` zeigt live genau **38 `UI/*`-Titel**
  und **10 `Showcases/*`-Titel** (193 Einträge inkl. Autodocs-Seiten und Einzel-Stories).
- `npm run build-storybook` im Frontend-Container: **Exit 0**, "Storybook build completed
  successfully".
- `npm run typecheck`: Exit 0 (repo-weit, keine Fehler).
- `npm test -- --run`: **418 Testdateien, 3856 Tests, alle grün** (1 Datei bewusst
  geskippt, bereits vor diesem Auftrag so).
- `npm run build` (mit `NODE_ENV=production`, siehe Deviations): Exit 0, alle Routen
  generiert.
- `npm run lint`: **4 Fehler, aber alle vier bereits vor diesem Auftrag auf `main`
  vorhanden** (verifiziert per `git show main:<datei>` — byte-identisch zu den jeweiligen
  Dateien vor diesem Quick-Task). Keine neuen Lint-Fehler durch diesen Auftrag. Details
  in `deferred-items.md`.
- `grep -rn "dev/ui-system" frontend/src --include=*.ts --include=*.tsx`: keine Treffer
  mehr. `grep -rn "dev/ui-system" CLAUDE.md AGENTS.md docs/FRONTEND_ARCHITEKTUR.md
  frontend/eslint.config.mjs`: keine Treffer mehr.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] `components/showcases/`-Verzeichnis musste schon in Task 1 angelegt werden**
- **Gefunden in:** Task 1
- **Problem:** `main.ts`s Stories-Glob referenziert `../src/components/showcases/**/*.stories.tsx`, das Verzeichnis wurde laut Plan erst in Task 9 angelegt — Storybook brach beim ersten Start mit "Can't resolve './src/components/showcases'" ab, bevor überhaupt ein Showcase existierte.
- **Fix:** Leeres Verzeichnis mit `.gitkeep` bereits in Task 1 angelegt (in Task 9 durch echten Inhalt ersetzt, `.gitkeep` entfernt).
- **Commit:** `2394d50d4`

**2. [Rule 3 - Blocker] Storybook-Dev-Server band nur an 127.0.0.1 im Container**
- **Gefunden in:** Task 1
- **Problem:** `storybook dev -p 6006` ohne Host-Flag war von außerhalb des Containers nicht erreichbar (`Connection reset by peer`) — Docker-Portmapping leitet an die Container-Netzwerkschnittstelle (eth0), nicht an `lo`.
- **Fix:** `package.json`-Script auf `storybook dev -p 6006 -h 0.0.0.0` korrigiert.
- **Commit:** `2394d50d4`

**3. [Rule 1 - Bug] `@storybook/nextjs`s `TsconfigPathsPlugin` kennt `.mjs`/`.mts` nicht**
- **Gefunden in:** Task 14 (finaler Vollständigkeits-Check)
- **Problem:** `npm run build-storybook` brach mit "Module not found: Can't resolve
  '@/lib/images/publicImagePatterns'" ab, sobald eine Story (ThumbnailStrip,
  ArtworkHero) transitiv `ResponsiveImage.tsx` einbindet. Ursache per Debug-Tracing
  empirisch isoliert (nicht in RESEARCH.md vorhergesehen): `resolve.extensions`
  enthielt `.mjs` korrekt, aber der von `@storybook/nextjs` automatisch eingehängte
  `TsconfigPathsPlugin` (einzig zuständig für die `@/*`-Alias-Auflösung) hat eine
  eigene, davon unabhängige Default-Extensions-Liste (`.js/.jsx/.ts/.tsx`), die `.mjs`
  nicht enthält. `publicImagePatterns` existiert bewusst nur als `.mjs` (von
  `next.config.mjs` mitgenutzt).
- **Fix:** `webpackFinal` in `frontend/.storybook/main.ts` ergänzt die Extensions-Liste
  des gefundenen `TsconfigPathsPlugin`-Instanz um `.mjs`/`.mts` — Produktionscode
  (`ResponsiveImage.tsx`, `publicImagePatterns.mjs`) bleibt unverändert.
- **Commit:** `62f9e49ee`

**4. [Rule 2 - Dokumentationslücke] Migrations-Provenienz-Kommentare verletzten Task 12s eigene Grep-Reinheit**
- **Gefunden in:** Task 12
- **Problem:** Mehrere in Task 1/9-11 geschriebene Story-/Fixture-Kommentare erklärten
  die Migrationsherkunft mit dem wörtlichen String `/dev/ui-system` — das hätte Task 12s
  eigene Verifikation (`! grep -rn "dev/ui-system" frontend/src`) scheitern lassen.
- **Fix:** Alle betroffenen Kommentare umformuliert ("frühere In-App-Showcase-Route"
  statt der konkreten Pfadangabe), fachliche Aussage bleibt erhalten.
- **Commit:** `ee34344c5`

### Nicht behobene, dokumentierte Funde (ausserhalb des Scopes)

Siehe `deferred-items.md` im selben Verzeichnis für vollständige Details:
1. `npm run lint` hat vier bereits vor diesem Auftrag auf `main` vorhandene Fehler
   (`capture-responsive.cjs`, `useReleaseVersionMedia.ts`, `ReleasesFilterBar.tsx`) —
   unabhängig von Storybook, nicht behoben (Scope-Grenze).
2. `npm run build` über `docker compose exec team4sv30-frontend` erbt
   `NODE_ENV=development` aus dem Dev-Container und bricht deshalb ohne explizites
   `NODE_ENV=production`-Override ab — Container-Umgebungs-Eigenheit, unabhängig vom
   Storybook-Code, nur dokumentiert.

## Known Stubs

Keine. Alle Stories rendern mit echten (Mock-)Daten, keine `=[]`/`={}`/`=null`-Platzhalter,
die UI-Rendering verhindern.

## Threat Flags

Keine neue sicherheitsrelevante Oberfläche. Storybook zeigt ausschließlich
Mockdaten-Komponenten ohne API-Aufrufe, Auth- oder Permission-Seams (identisches
Sicherheitsprofil wie die entfernte `/dev/ui-system`-Route, siehe Plan-Threat-Model
T-261029-01).

## Bekannte, bewusst nicht behobene Einschränkungen

1. **`frontend/scripts/capture-phase151-badge-evidence.mjs`** navigiert weiterhin zur
   jetzt entfernten Route `/dev/ui-system/achievements` und schlägt bei einem erneuten
   Lauf fehl. Historisches, bereits abgeschlossenes Evidence-Skript aus einer
   abgeschlossenen Phase — bewusst nicht auf Storybook umgeschrieben (außerhalb des
   Scopes dieses Auftrags, Plan-Entscheidung aus CONTEXT.md).
2. **`docs/frontend/ui-system.md`** existiert weiterhin nicht, obwohl `AGENTS.md` es an
   zwei Stellen als "kanonischen Responsive-Standard" referenziert — themenfremde,
   bereits vor diesem Auftrag bestehende Lücke (Responsive-Regelwerk, keine
   Namensüberschneidung mit der entfernten Showcase-Route), bewusst nicht angelegt.

## Notwendiger externer Folgeschritt (außerhalb des erlaubten Arbeitsbereichs)

Das Verdrahten von `npm run build-storybook` als aktiver Schritt im tatsächlich von
`ki-run` ausgeführten Quality-Gate-Lauf liegt unter `/home/d1sk/ki-run/gates/team4s.ini`
— außerhalb von `/home/d1sk/team4s`, dem einzigen für diesen Auftrag erlaubten
Arbeitsbereich. **Kein Task dieses Plans hat diese Datei gelesen oder geschrieben.**
Vorgeschlagener Diff (von der Person anzuwenden, die die `ki-run`-Gate-Konfiguration
pflegt), einzufügen nach `[step:frontend-unit]` und vor `[step:backend]`:

```ini
[step:frontend-storybook]
cmd = docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run build-storybook"
paths = frontend/
timeout = 1200
```

Begründung für die Platzierung: läuft nach den günstigeren Frontend-Prüfungen
(typecheck/lint/unit), aber vor dem Backend-Schritt, analog zum bestehenden
`[step:frontend-unit]`-Muster.

## Self-Check

**Dateien:**
```
FOUND: frontend/.storybook/main.ts
FOUND: frontend/.storybook/preview.tsx
FOUND: frontend/.storybook/preview.css
FOUND: frontend/src/components/ui/Button.stories.tsx
FOUND: frontend/src/components/showcases/DesignTokensShowcase.tsx
FOUND: frontend/src/components/showcases/AchievementBadgeShowcase.sourceFiles.fixture.ts
MISSING: frontend/src/app/dev/ui-system/page.tsx (erwartet — geloescht in Task 12)
MISSING: frontend/src/app/admin/dev/ui-system/page.tsx (erwartet — geloescht in Task 12)
```

**Commits (alle auf Branch `ki/team4s-261029-27a5`):**
```
FOUND: 2394d50d4 feat(quick-261029-d3k): Storybook-Grundgeruest ...
FOUND: c64ecd13f feat(quick-261029-d3k): UI/*-Stories fuer Formulareingaben
FOUND: 71f3fbc56 feat(quick-261029-d3k): UI/*-Stories fuer Status & Feedback
FOUND: df06ca1eb feat(quick-261029-d3k): UI/*-Stories fuer Layout & Struktur
FOUND: c249e3d80 feat(quick-261029-d3k): UI/*-Stories fuer Navigation
FOUND: e7f32a6b8 feat(quick-261029-d3k): UI/*-Stories fuer Overlays
FOUND: 3999cf225 feat(quick-261029-d3k): UI/*-Stories fuer Medien, Hero & Avatar
FOUND: be00211b7 feat(quick-261029-d3k): UI/*-Stories fuer Tabellen & Toggle
FOUND: 3080c8482 feat(quick-261029-d3k): Showcases/*-Migration Batch 1 ...
FOUND: 38c0ecd77 feat(quick-261029-d3k): Showcases/*-Migration Batch 2 ...
FOUND: d520413fc feat(quick-261029-d3k): Showcases/*-Migration Batch 3 ...
FOUND: ee34344c5 feat(quick-261029-d3k): /dev/ui-system ... entfernen + Regression
FOUND: e1e48bc85 docs(quick-261029-d3k): Doku-/ESLint-Referenzen auf Storybook ...
FOUND: 62f9e49ee feat(quick-261029-d3k): build-storybook als Pflichtpruefung verankern ...
```

## Nachbesserung durch unabhängige Code-Review (nach Task 14)

Eine unabhängige Review des gesamten Diffs (`9533a2140..HEAD`) fand drei Befunde und
bestätigte alle übrigen Plan-Annahmen empirisch (Storybook-Container gestartet,
`build-storybook` erneut geprüft, Achievement-Badge-Fixture-Liste byte-genau gegen das
echte Verzeichnis abgeglichen). Behoben, Commit `6300f1470`:

1. **ASCII-Umlautersetzungen in neuen Kommentaren** (`fuer`→`für`, `ueber`→`über`,
   `Buehnenhintergrund`→`Bühnenhintergrund` usw.) in `frontend/.storybook/main.ts`,
   `preview.tsx`, `preview.css` und mehreren `*.stories.tsx`/`*.fixtures.ts`-Dateien —
   verstößt gegen die CLAUDE.md-Pflichtregel "Sprachqualität". Alle gefundenen Stellen
   korrigiert (per Scan über alle vom Plan geänderten Dateien, nicht nur die von der
   Review namentlich genannten).
2. **Vier `UI/*`-Stories luden Bilder von `picsum.photos`** (externe CDN) statt lokaler
   Mockdaten (`ArtworkHero`, `FocalCarousel`, `MediaSlot`, `ThumbnailStrip`) — widerspricht
   der aus `/dev/ui-system` migrierten Playground-Regel "keine API-/Netzwerk-Aufrufe".
   Auf lokale Platzhalterbilder aus `frontend/public/covers/placeholder.jpg` umgestellt.
   Bewusst NICHT angefasst: `AppShellDrawerDemoSection.tsx`s `picsum.photos`-Avatar-URL —
   die war bereits vor diesem Auftrag auf `main` so vorhanden (1:1-Migration, kein neuer
   Code dieses Auftrags).
3. **`TsconfigPathsPlugin`-Patch in `main.ts` hätte bei einer künftigen Storybook-Version
   lautlos keine Wirkung mehr gehabt**, falls das Plugin nicht mehr gefunden wird. Jetzt
   mit explizitem `console.warn`-Diagnosehinweis statt stillem No-Op.

**Bewusst nicht behoben:** Die Review merkte zusätzlich an, dass der neue
`team4sv30-storybook`-Service dieselben `NEXT_PUBLIC_AUTH_*`/`NEXT_PUBLIC_KEYCLOAK_*`
Build-Args wie `team4sv30-frontend` erbt, obwohl keine Story sie nutzt. Nicht entfernt,
weil (a) es sich um `NEXT_PUBLIC_*`-Variablen handelt, die im bestehenden Frontend-Service
ohnehin bereits öffentlich im Client-Bundle landen — keine neue Geheimnis-Exposition —, und
(b) `frontend/Dockerfile`s `builder`-Stage `npm run build` unbedingt ausführt; Entfernen der
Args wäre ungetestet gegenüber dem erprobten, bereits für `team4sv30-frontend` funktionierenden
Rezept und hätte das Risiko, den Image-Build ohne Not zu brechen.

Nach der Nachbesserung erneut empirisch bestätigt: `npm run typecheck` (0 Fehler),
`npm run build-storybook` (Exit 0), `npm run lint` (weiterhin exakt die 4 vorbestehenden
Fehler, keine neuen), `npm test -- --run` (418 Testdateien, 3856 Tests, alle grün),
Storybook-`index.json` weiterhin exakt 38 `UI/*` + 10 `Showcases/*` Titel.

## Self-Check: PASSED
