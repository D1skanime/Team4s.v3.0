# Quick Task 261029-d3k: Team4S Storybook einführen und /dev/ui-system vollständig ablösen - Context

**Gathered:** 2026-10-29
**Status:** Ready for planning

<domain>
## Task Boundary

Storybook für das Next.js-16/React-18-Frontend einrichten, mit Stories für alle
globalen Primitives aus `frontend/src/components/ui` (Standard-, Disabled-,
Fehler-, Lade-, Leer-, Lang-Inhalt- und Fokus-Zustände, soweit zutreffend),
globalen Design-Tokens/Styles, Hell/Dunkel-Umschalter und den drei
Pflicht-Viewports (390×844, 768×1024, 1440×900). Danach die In-App-Showcase
`/dev/ui-system` (inkl. `/admin/dev/ui-system`) vollständig entfernen und alle
Verweise (CLAUDE.md, AGENTS.md, `docs/FRONTEND_ARCHITEKTUR.md`,
`frontend/eslint.config.mjs`) auf Storybook umstellen. Neue Pflichtregel in
CLAUDE.md/AGENTS.md: Stories ziehen bei jeder UI-Änderung im selben Auftrag mit.
`npm run build-storybook` wird in die Projekt-Prüfungen aufgenommen.

Diese autonome Ausführung läuft ohne Zwischenfreigaben (ki-run-Auftrag
261029-27a5). Interaktive Rückfragen (AskUserQuestion) werden nicht gestellt;
technische Grauzonen werden hier als Annahmen dokumentiert statt erfragt.

</domain>

<decisions>
## Implementation Decisions

### Vom Menschen bereits entschieden (28.10.2026, bindend, nicht erneut diskutieren)
- Storybook ERSETZT `/dev/ui-system` komplett; die Route inkl. gesamtem
  Showcase-Code unter `frontend/src/app/dev/ui-system/` wird entfernt — keine
  zweite Seite für dieselbe Aufgabe.
- Start mit den globalen Primitives aus `@/components/ui`; größere
  domänenspezifische Kompositionen folgen später schrittweise.

### Storybook-Technologie (Claude's Discretion, per npm-Registry-Check am 2026-10-29 verifiziert)
- Paket: `storybook@^10.6.5` (aktuelle stabile Core-Version) mit dem
  offiziellen Framework-Adapter `@storybook/nextjs` (Webpack-basiert, peer
  deps bestätigt: `next: ^14.1.0 || ^15.0.0 || ^16.0.0`, `react/react-dom:
  ...^18.0.0...`). Kein `@storybook/nextjs-vite`, da das Projekt sonst
  nirgends Vite als Next.js-Build-Tool nutzt (Vitest ist nur der Testrunner,
  nicht der Next-Bundler) — der Webpack-Adapter passt besser zu den
  bestehenden Next-Build-Konventionen.
- Zusatz-Addons: `@storybook/addon-themes` (Hell/Dunkel- bzw.
  Hintergrund-Umschalter), `@storybook/addon-a11y` (Fokus-/Kontrast-Zustände
  prüfbar machen, deckt die geforderte "Fokus"-Zustandsabdeckung ab),
  `@storybook/addon-docs` für Autodocs. Essentials/Viewport/Actions/Controls
  sind in Storybook 10 bereits im Core-Paket enthalten und müssen nicht
  separat installiert werden.
- Installation läuft NICHT auf dem Host, sondern über den Frontend-Container
  (z. B. `docker compose exec` bzw. ein Rebuild-Zyklus), analog zu den
  bestehenden `npm`-Scripts in `frontend/package.json`. `package-lock.json`
  wird im selben Commit mitgezogen.

### Hell/Dunkel-Umschalter (Claude's Discretion)
- Team4s hat aktuell KEIN eigenes dunkles Farbthema (`frontend/src/styles/globals.css`
  definiert nur ein helles Farbschema, keine `--color-*-dark`-Tokens, kein
  `data-theme`-Mechanismus im Code). Ein eigenes App-Dark-Theme zu erfinden
  wäre Scope-Creep weit über diesen Auftrag hinaus.
- Umsetzung: Der Hell/Dunkel-Umschalter wird über die Storybook-eigene
  `backgrounds`/`addon-themes`-Vorschau realisiert (heller vs. dunkler
  Bühnenhintergrund hinter den Komponenten), nicht über ein neues
  Produkt-Farbthema. Das erfüllt den Zweck — Komponenten auf beiden
  Hintergründen auf Kontrast/Lesbarkeit prüfen — ohne ein nicht
  existierendes Dark-Theme zu simulieren.

### Umfang der migrierten Showcases (Claude's Discretion — löst einen
Ziel-Widerspruch zwischen "ersetzt /dev/ui-system komplett" und "Start nur mit
globalen Primitives" auf)
- ALLE bisher unter `/dev/ui-system` sichtbaren Inhalte (Design-Token-Vorschau,
  alle `@/components/ui`-Primitives, UND die vorhandenen domänenspezifischen
  Showcase-Komponenten wie `AccordionShowcase`, `SwitchShowcase`,
  `DrawerShowcase`, `UploadPrimitivesShowcase`, `CompositionShowcase`,
  `PublicFansubSurfacesShowcase`, `PublicReleaseSurfacesShowcase`,
  `AppShellDrawerDemoSection`, die Achievement-Badge-Galerie) werden nach
  Storybook migriert, damit nach der Entfernung von `/dev/ui-system` nichts an
  Sichtbarkeit verloren geht (Vorgabe: "mindestens gleichwertig sichtbar").
- Die TIEFE der Zustandsabdeckung (Standard/disabled/Fehler/Laden/leer/lange
  Inhalte/Fokus) ist nur für die global zählenden Primitives aus
  `@/components/ui` (Button, Select, FormField, Modal, Input, Textarea, Tabs,
  Drawer, Card, Table, Badge, EmptyState/LoadingState/ErrorState, Pagination,
  PageHeader/SectionHeader, Switch, Accordion, Toolbar u. a.) Pflicht. Die
  domänenspezifischen Showcase-Kompositionen werden als vorhandene,
  funktionierende React-Komponenten 1:1 in je eine Story überführt (Sichtbarkeit
  erhalten), ohne zusätzliche neue Zustands-Varianten zu erfinden — das
  entspricht "größere Komponenten folgen später schrittweise".
- Organisation in Storybook: zwei Kategorien, z. B. `UI/*` für die globalen
  Primitives (mit vollständiger Zustandsabdeckung) und `Showcases/*` für die
  migrierten domänenspezifischen Kompositionen (1:1-Übernahme).

### Docker/Port/Zugriff (Claude's Discretion)
- Storybook läuft im Frontend-Container, Port intern UND extern `6006`
  (Storybook-Standardport, in `docker-compose.yml` noch nicht belegt;
  `3000` ist bereits durch den Next-Dev-Server reserviert).
- Zugriff für die Live-Abnahme über Windows: analog zum bestehenden
  SSH-Tunnel-Muster `127.0.0.1:3300 → 192.168.235.196:3000` richtet der
  Mensch einen zusätzlichen lokalen Tunnel auf Port 6006 ein (z. B.
  `127.0.0.1:6006 → 192.168.235.196:6006`). Das SSH-Tunnel-Mapping selbst
  liegt auf der Windows-Seite außerhalb dieses Linux-Checkouts und wird hier
  nicht verändert — der Abschlussbericht dokumentiert nur den benötigten Port.

### Projekt-Prüfungen / CI-Gate (Claude's Discretion)
- `npm run build-storybook` wird als neues `package.json`-Script ergänzt und
  in die bestehenden Root-Prüfungen (dort, wo `lint`/`typecheck`/`test`/`build`
  bereits für `frontend/` aufgerufen werden) als zusätzlicher Schritt
  aufgenommen, damit ein kaputter Story-Build auffällt. Der Check wird erst
  als letzter inhaltlicher Task aktiviert, wenn alle `UI/*`- und
  `Showcases/*`-Stories existieren — ein vorzeitig aktivierter Build-Check
  gegen eine unvollständige Migration wäre nur Lärm (Ergebnis aus RESEARCH.md).

### Docker-Prozess-Topologie für Port 6006 (RESEARCH.md-Empfehlung übernommen)
- `docker-compose.override.yml` belegt den Vordergrundprozess von
  `team4sv30-frontend` bereits fest mit `npm run dev -- --webpack` (Port 3000)
  — ein zweiter Vordergrundprozess (Storybook) kann in Docker Compose nicht
  einfach „nebenbei“ im selben Service laufen (ein Hauptprozess pro Service).
- Entscheidung: Neuer, zusätzlicher Dev-only Compose-Service
  `team4sv30-storybook` in `docker-compose.yml`/`docker-compose.override.yml`,
  mit identischem Build-Context (`./frontend`) und denselben Bind-Mounts/
  Volumes wie `team4sv30-frontend` (insbesondere `frontend_node_modules`,
  damit installierte Pakete sichtbar sind), aber eigenem
  `command: npm run storybook` und `ports: ["6006:6006"]`. Das ist additiv
  (kein Eingriff in bestehende Volumes/Datenbanken/Services) und reversibel.

### Install-Vorgehen (RESEARCH.md-Empfehlung übernommen)
- KEIN `npx storybook init` (interaktiver Wizard, riskiert Default-Vite-Builder
  und erzeugt Beispiel-Stories, die wieder entfernt werden müssten). Statt
  dessen: Pakete manuell als `devDependencies` in `frontend/package.json`
  eintragen, per `docker compose exec team4sv30-frontend npm install`
  installieren (Bind-Mount hält `package.json`/`package-lock.json` synchron
  zum Host; `node_modules` liegt im Volume `frontend_node_modules` und muss
  im Container aktualisiert werden), `.storybook/main.ts` + `preview.tsx` +
  `preview.css` von Hand schreiben.

### Doku-Korrektur außerhalb des eigentlichen Scopes (nur dokumentiert, nicht behoben)
- `docs/frontend/ui-system.md` existiert NICHT im Repo, obwohl AGENTS.md es an
  zwei Stellen als "kanonischen Responsive-Standard" referenziert
  (unabhängig vom `/dev/ui-system`-Showcase-Code — eine bereits bestehende,
  bloße Namensähnlichkeit). Diese fehlende Datei zu erstellen ist fachlich ein
  eigenständiges Thema (Responsive-Regelwerk) und liegt außerhalb dieses
  Auftrags; sie wird NICHT angelegt. Nur die tatsächlichen Showcase-Referenzen
  (CLAUDE.md "Referenz/Showcase", `docs/FRONTEND_ARCHITEKTUR.md`,
  `frontend/eslint.config.mjs`) werden auf Storybook umgestellt.
- `frontend/scripts/capture-phase151-badge-evidence.mjs` navigiert testweise zu
  `/dev/ui-system/achievements` (historische Evidence-Capture aus einer
  abgeschlossenen Phase). Da die Achievement-Galerie eine domänenspezifische
  Showcase ist (keine Pflicht-Primitive) und das Skript bereits archivierte,
  abgeschlossene Arbeit betrifft, wird es nicht auf Storybook umgeschrieben;
  es bleibt als historisches Artefakt bestehen und würde bei erneutem Lauf
  fehlschlagen. Das wird im Abschlussbericht als bekannte Einschränkung
  genannt statt stillschweigend repariert.

</decisions>

<specifics>
## Specific Ideas

- Volles Inventar der bisherigen `/dev/ui-system`-Seite (für "mindestens
  gleichwertig sichtbar"): Design-Token-Preview (Radius/Schatten/Spacing/
  Typografie-Muster, Avatar-/Tag-/Community-Link-Farbfamilien), Button-,
  Card-, Badge-, Form-, Header/Tabellen/Feedback-, Overlay/Navigations- und
  Switch/Accordion-Showcase-Blöcke, dazu die separaten Showcase-Komponenten
  `AccordionShowcase`, `SwitchShowcase`, `DrawerShowcase`,
  `UploadPrimitivesShowcase`, `PublicFansubSurfacesShowcase`,
  `PublicReleaseSurfacesShowcase`, `CompositionShowcase`,
  `AppShellDrawerDemoSection` sowie die separate Route
  `/dev/ui-system/achievements` (Achievement-Badge-Galerie).
- `frontend/src/app/dev/` und `frontend/src/app/admin/dev/` enthalten
  AUSSCHLIESSLICH `ui-system/*` — beide Verzeichnisse können beim Entfernen
  vollständig gelöscht werden, es bleibt kein anderweitig genutzter Code
  zurück.
- npm-Registry-Check (2026-10-29) bestätigt: `storybook@10.6.5`,
  `@storybook/nextjs@10.6.5`, `@storybook/addon-themes@10.6.5`,
  `@storybook/addon-a11y@10.6.5`, `@storybook/addon-docs@10.6.5` erklären
  übereinstimmend `storybook: ^10.6.5` als Peer und unterstützen
  `next: ^16.0.0`, `react/react-dom: ^18.0.0`. `@storybook/test` ist mit
  `8.6.15` veraltet (in v8+ durch den Bare-Import `storybook/test` aus dem
  Core-Paket ersetzt) — wird für diesen Auftrag nicht benötigt (keine
  Interaction-Tests im Scope).
- Bestehende Root-Projekt-Prüfungen für `frontend/` laufen über
  `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (siehe
  `frontend/package.json`); `build-storybook` wird dort als gleichwertiger
  zusätzlicher Schritt eingereiht.

[Keine weiteren spezifischen Referenzen über den Auftragstext hinaus.]

</specifics>

<canonical_refs>
## Canonical References

- CLAUDE.md, Abschnitt "Frontend-UI (globales Design-System)" (Zeile mit
  `Referenz/Showcase: Route /dev/ui-system.`)
- AGENTS.md, Abschnitt "Dokumentation wächst mit dem Code (Pflicht bei jeder
  Änderung)" (neue Pflichtregel wird dort ergänzt) und Abschnitt "Team4s UI
  Implementation Contract"
- `docs/FRONTEND_ARCHITEKTUR.md`, Abschnitte 5 (Verzeichnisbaum/Routentabelle)
  und 8 (Showcase/Referenz-Absatz zu `@/components/ui`)
- `frontend/eslint.config.mjs` (drei `no-restricted-syntax`-Meldungstexte, die
  aktuell auf `/dev/ui-system` verweisen)

</canonical_refs>
