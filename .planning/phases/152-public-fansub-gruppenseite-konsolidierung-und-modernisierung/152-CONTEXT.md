# Phase 152: Public-Fansub-Gruppenseite — Konsolidierung und Modernisierung

Gathered: 2026-09-08. Source: `152-USER-REQUEST.md` (verbindlicher vollständiger Auftrag) und der
unmittelbar vorangegangene technische Audit derselben Seite (read-only, live auf dieser VM gemessen).
Status: bereit für Planung. Kein Code vor verifizierten Wave-Plänen.

## Execution baseline

- Branch: `main`, Working Tree **sauber** vor Phasenbeginn.
- START-HEAD: `5e896cd2e24d470c0e685857a155b2de11ba927e`
- `main...origin/main` synchron, keine parallelen GSD-Writer aktiv (geprüft via `ps`).
- Compose: backend/frontend/db/keycloak/keycloak-db/redis/mailpit laufen.
  Host-Ports: Frontend **3000**, Backend **18092**, DB **5433**, Keycloak **18081**, Mailpit **8025**.
- `use_worktrees: false` — alle Executor-Agenten arbeiten sequenziell im Haupt-Working-Tree auf `main`.

## Locked decisions

- **D01** Alles auf der Linux-VM `/home/d1sk/team4s`, Branch `main`. Windows nur Steuerung.
  Keine History-Rewrites, keine Force-Pushes, keine fremden Änderungen überschreiben.
- **D02** Kein Rewrite. Gezielte Konsolidierung belegter Probleme. Bestehende funktionierende
  Architektur respektieren.
- **D03** Phase 150 (Schwellen-Autorität) und Phase 151 (gemeinsamer Artwork-Slot) werden
  **wiederverwendet, nicht umgangen**. Keine zweite Badge-Architektur, keine zweite Registry.
- **D04** Keine neue Library (UI, State, Data-Fetching, Carousel, Modal, Rich-Text, CSS-Framework).
  Modernisierung = vorhandene Team4s-/React-/Next-Funktionen konsequenter nutzen.
- **D05** Timeline bleibt Timeline. Gruppen-History ist eine **eigene Domäne**: eigene Assets,
  eigene Registry (`GROUP_HISTORY_EVENT_OPTIONS`), eigener Tone-Mechanismus. Geteilt wird
  **ausschließlich die Artwork-/Presentation-Schicht** (`AchievementArtwork` + dessen CSS).
  Der Member-Badge-Code-Resolver (`profile/badgeArtwork.ts`) wird **nicht** übernommen.
- **D06** Admin-Freitexte werden **nie** umgeschrieben. Statische Public-Labels gehören in die Registry.
- **D07** `public-profile` und `domain-projection` bleiben fachlich **getrennte** Endpunkte.
  Keine Endpoint-Verschmelzung, keine Monster-Query. Nur nachweislich ungenutzte Daten vermeiden.
- **D08** Pixel-Shifts werden **entfernt, nicht verschoben**. Nur bei objektiv falsch zentriertem
  Asset (nach visueller Prüfung) Root Cause sauber lösen und begründen.
- **D09** Backend-/Query-Änderungen und UI-Änderungen laufen in **getrennten Waves/Plänen**.
  Tiptap wird separat abgesichert. Visual QA ist ein eigener Abschlussblock.
  Keine zwei Agenten gleichzeitig auf derselben Datei.
- **D10** Explizit ausgeschlossen: repo-weites `useMediaQuery`; `marked`-Entfernung (falls Backend-
  Markdownpfade untersucht werden müssten); kompletter CSS-Breakpoint-Reset der Public-Seite;
  Media-Pipeline aller Team4s-Seiten; neue große Performance-Fixture-Infrastruktur; UI-Neudesign;
  Public/Edit-Vergleich oder -Angleichung.
- **D11** Ablauf: Plan → Waves → Execute → Tests → Visual QA → Gaps → unabhängige Abschluss-
  verifikation → Commit/Push auf `origin/main`. Keine Diskussionspause angefordert.

## Verifizierte Audit-Befunde (technische Grundlage, live gemessen)

Alle folgenden Angaben wurden auf **dieser** VM am HEAD `5e896cd2` verifiziert. Der Planner soll sie
als Ausgangswissen nutzen und **nicht** neu erheben — aber vor dem Ändern jeweils am Code
gegenprüfen (die Messwerte sind Belege, keine Blankoschecks).

### Datenfluss und Query-Budget (Ist-Zustand)

Ein Seitenaufruf `/fansubs/[slug]` löst **zwei sequentielle** SSR-Fetches aus (Wasserfall: der zweite
braucht `group.id` aus dem ersten), beide mit `cache: "no-store"`:

| Pfad | Queries | Beleg |
|---|---|---|
| `GET /api/v1/fansub-slugs/:slug/public-profile` | **12 statisch** | Code-Analyse |
| — davon `GetGroupBySlug` Basis-SELECT | 1 | `fansub_repository.go` |
| — davon `hydrateFansubGroup` → `attachGroupCounts` (5× `populateCountMap`) | 5 | **4 davon ungenutzt** |
| — davon `hydrateFansubGroup` → `attachGroupLinks` | 1 | **dupliziert `ListGroupLinks`** |
| — `listPublicFansubStories/Projects/History/Media` | 4 | je 1, kein N+1 |
| — `ListGroupLinks` | 1 | Duplikat von `attachGroupLinks` |
| `GET /api/v1/fansubs/:id/domain-projection` | **3 statisch** | `listProjectionMembers/Historical/Contributors` |
| **Gesamt** | **15 statisch** | |

**Live gemessen** (`pg_stat_database.xact_commit`-Delta, aggregiert über 100 Requests je Endpunkt,
3 s Settle-Zeit, Overhead kalibriert): `public-profile` = **13,01 Queries/Request**,
`domain-projection` = **3,15 Queries/Request**. Übereinstimmung mit der statischen Analyse bestätigt
beide Verfahren.

**Kein N+1** — verifiziert für alle neun Repository-Pfade: Jede `for rows.Next()`-Schleife ist reine
Zeilen-Iteration ohne DB-Zugriff im Rumpf. `listPublicFansubProjects` löst das Banner-pro-Projekt über
`LEFT JOIN LATERAL … LIMIT 1`. Query-Anzahl wächst **nicht** mit Projekten/Mitgliedern/History/Media.

**Nachweislich ungenutzt von der Public-Seite:**
- `anime_relations_count`, `projects_count`, `members_count`, `aliases_count` — die Seite nutzt nur
  `release_versions_count` (Hero-Kennzahl); Projektzahl kommt aus `profile.projects.length`,
  Mitgliederzahl aus `countVisibleTeamMembers(...)`.
- `group.links` ist **inhaltlich identisch** mit `community_links` (doppelte Query + doppelte Payload).
- `domainProjection.contributors` wird von `page.tsx` **nie gelesen**.

⚠️ **Wichtig für B1/B2:** `GetGroupBySlug` / `hydrateFansubGroup` / `attachGroupLinks` haben **weitere
Konsumenten** außerhalb des Public-Pfades. Die Reduktion muss über einen **public-spezifischen
Ladepfad** erfolgen, nicht durch Beschneiden der geteilten Funktionen. Vor der Änderung alle Aufrufer
ermitteln.

### History-/Badge-Präsentation (Ist-Zustand)

**`frontend/src/components/fansubs/FansubHistorySection.tsx`** (139 Zeilen, `'use client'`):
- Z. 117: rohes `<img src={presentation.imageSrc} alt="" className={styles.historyTimelineImage} />`
  — **kein** `next/image`, **kein** `loading="lazy"`, **kein** `srcset`.
- Z. 18–29 `achievementStyle(eventType)`: if-Kette über `presentation.tone` → Tone-Klasse.
  (Datengetrieben über die Registry, nur mechanisch umständlich — **kein** Hardcoding von Codes.)
- Z. 31–38 `achievementEventStyle(eventType)`: **harte If-Kette mit fünf fachlichen Codes**
  `projects_500`, `releases_500`, `releases_1000`, `releases_5000`, `releases_10000` → A4.
- Z. 44–59 `publicDomainTerms(text)`: 13-stufige `replaceAll`-Kette mit Sentinel-Platzhaltern
  und defensiver `Fansub-Fansub-`-Nachkorrektur. Wird über `publicHistoryTitle` **auch auf
  admin-eingegebene `item.title`** angewandt → verfälscht Freitext ("Projektor gekauft" →
  "Fansub-Projektor gekauft") → A5.
- Z. 115 + Z. 120: Jahreszahl wird **zweimal** gerendert (`historyTimelineAxisYear` und
  `historyTimelineYear`); **keine** der beiden ist per CSS aus dem Accessibility-Tree entfernt
  (verifiziert: kein `display:none`/`visibility`/Clip) → D3.
- `INITIAL_VISIBLE_HISTORY = 6` (legitime, benannte Designkonstante — **beibehalten**).

**`frontend/src/components/fansubs/FansubPublicSections.module.css`** (883 Zeilen, 15 Media Queries):
- `--history-badge-size` wird an **9 Stellen** definiert, über **5 Breakpoints**:
  Basis Z. 281 `clamp(152px, 15vw, 210px)`; Z. 485 (`min-width:1200`), Z. 496 (`min-width:1500`),
  Z. 512 (`max-width:1100`), Z. 562 (`max-width:760`);
  dann **`releases_10000` als eigene Größenfamilie**: Z. 614 `clamp(168px,16vw,230px)` plus vier
  eigene Media Queries Z. 652/658/664/670 → A3.
- Achievement-spezifische Pixel-Shifts `--history-image-x/y` für `releases_500`, `releases_1000`,
  `releases_5000`, `releases_10000` (Z. 598–616) → A3/D08.
- Hardcodierte Hex-/rgba-Farben in den Emphasis-Regeln (Z. 572–648): `#7c3aed`, `#facc15`,
  `rgba(124,58,237,…)`, `rgba(250,204,21,…)`, `rgba(34,211,238,…)`, `rgba(236,72,153,…)`,
  `rgba(167,139,250,…)` → C2. Der Rest der Datei nutzt korrekt `color-mix(… var(--ach-color) …)`.

**Tote CSS-Klassen** — systematisch verifiziert (statische **und** dynamische Referenzpfade geprüft):
`ach`, `achGrid`, `achImage`, `achBody`, `achNote`, `achType`, `achYear`, `historyEntry`, `medal`,
`milestoneEntry`, `projectYear` (11 Stück) + zugehörige Media-Query-Blöcke (Z. 428–460).

⚠️ **NICHT tot und nicht anfassen** (werden dynamisch über `styles[variable]` referenziert):
- Tone-Klassen `achGold/achAccent/achGreen/achPink/achMuted/achBlue/achViolet/achRed/achLegendary`
  → `styles[style]` in `FansubHistorySection.tsx:107`
- `historyTimelineEventProjects500/Releases500/1000/5000/10000` → `styles[eventStyle]` Z. 108
- `tagGallery/tagHistory/tagOldweb/tagForum/tagIrc/tagEvent/tagArtwork/tagOther`
  → `styles[categoryTagClass(item.category)]` in `FansubGroupMediaBlock.tsx:124`

`FansubPublicSections.module.css` wird von **6** Komponenten importiert (`FansubStoryBlock`,
`FansubHighlightsSection`, `FansubContributorsSection`, `FansubDeepDiveSection`,
`FansubHistorySection`, `FansubGroupMediaBlock`) — Löschungen müssen gegen **alle sechs** geprüft werden.

### Bildauslieferung (Ist-Zustand, live gemessen)

| Messung | Wert |
|---|---|
| `GET :3000/history-event-badges-transparent/founding.png` | **200, 840.090 Bytes, `image/png`** |
| Darstellungsgröße | `clamp(152px, 15vw, 210px)` → max. **210 px** |
| `GET :3000/_next/image?url=%2Fhistory-event-badges-transparent%2Ffounding.png&w=256&q=75` | **400** |
| Ursache | `/history-event-badges-transparent/**` fehlt in `next.config` → `images.localPatterns` |
| Bestand `public/history-event-badges-transparent/` | 24 Dateien, **17 MB**, ~627×627 px |
| Initial sichtbar (6 Einträge), alle **eager** | **~4,8 MB** |
| **Referenzmessung erlaubter Pfad**, gleiche Bildklasse (`member-achievement-badges`) | 3.265.818 B → **22.496 B** WebP @ w=256 = **−99,3 %**; @ w=640 = 86.310 B |

**Hero-Assets** (über Backend `:18092`, aktuell `unoptimized`):
`logo_…png` = **350.460 B** (dargestellt 132×132), `banner_…png` = **499.682 B** (dargestellt 1200×200).

**`next.config`** ist bereits korrekt vorbereitet: `formats: ['image/webp']`,
`deviceSizes: [640,1080,1480,1920]`, `imageSizes: [64,96,128,160,192,256,512]`,
`localPatterns` mit u. a. `/member-achievement-badges/**`, `/covers/**`, `/media/anime|profile|release-version/**`,
`remotePatterns` inkl. `configuredApiMediaPatterns()` für `NEXT_PUBLIC_API_URL` + `/api/v1/media/**`.

⚠️ **Bekannte Falle (Memory `reference_next_image_localpatterns`):** Ein `next/image` auf einen Pfad
**ohne** `localPatterns`-Match wirft E426 und **crasht die ganze Seite**. A1 (`localPatterns`-Eintrag)
ist daher **harte Vorbedingung** für A2 und muss vor der Komponentenmigration landen und verifiziert sein.

### Phase-151-Infrastruktur (wiederzuverwenden)

`frontend/src/components/profile/AchievementArtwork.tsx` (93 Z.) + `AchievementArtwork.module.css` (131 Z.):
- `descriptor: { kind: 'direct'; src } | { kind: 'layered'; motifSrc; frameSrc }` —
  History-Badges sind einschichtig ⇒ **`direct`** ist der passende Fall.
- `size: 'hero' | 'stage'`; Größen **ausschließlich** im Modul deklariert:
  Hero 192 / 216 / 240, Stage 64 / 80, 8 px Inset.
- **Container-Queries** `achievement-card`, Stufen **562** und **658** — keine Viewport-Breakpoints.
- Rendert über `components/ui/ResponsiveImage` (`'use client'`): `next/image` mit Optimizer-Versuch
  und einmaligem `unoptimized`-Retry bei `onError`; `sizes` mit nativem `auto`-Lazy-Sizing,
  `loading="lazy"` außer bei `priority`.
- `decorative`-Prop setzt `alt=""` + `aria-hidden` — passend für die Timeline-Badges.
- `AchievementArtwork.module.css` enthält `.container { container: achievement-card / inline-size }`
  — der Konsument muss diesen Container-Kontext bereitstellen, sonst greifen die Stufen nicht.
  ⚠️ Beim Einbau in die Timeline prüfen, ob der Slot einen Container-Kontext bekommt oder ob die
  Basisgröße (192 px) korrekt ist. **Keine** eigenen Breakpoints ergänzen.

Phase-151-Verifikation hält ausdrücklich fest: *"Die Größen 192/216/240 (Hero) und 64/80 (Marker) samt
8 px Inset sind ausschließlich dort deklariert"* und *"Es existiert keine familienspezifische Größen-
oder Breakpoint-Logik."* Phase 152 darf diese Aussage **nicht** verletzen.

### Registry (zu erweitern, nicht zu ersetzen)

`frontend/src/lib/group-history-events.ts` (51 Z.): `GROUP_HISTORY_EVENT_OPTIONS` mit **23 Einträgen**
`{ value, label, category, imageSrc, tone }`, plus `GROUP_HISTORY_EVENT_VALUES`,
`GROUP_HISTORY_EVENT_BY_VALUE`, `getGroupHistoryEventPresentation(eventType)` mit
`milestone`-Fallback. `BADGE_BASE_PATH = '/history-event-badges-transparent'`.

Erweiterung für A4/A5: **`emphasis`** (z. B. `'none' | 'rare' | 'legendary'`) und **`publicLabel`**.
⚠️ Vor Änderung prüfen, welche **anderen** Konsumenten diese Registry hat (Admin-Formulare nutzen
`GROUP_HISTORY_EVENT_OPTIONS` sehr wahrscheinlich für Auswahllisten) — additive Felder wählen.

### Tiptap / Rich-Text

**Gut und unangetastet lassen:** `components/editor/RichTextRenderer.tsx` (19 Z., **Server-Komponente**,
kein Tiptap-Import, `dangerouslySetInnerHTML` nur mit serverseitig sanitisiertem `body_html`).
Genau **ein** Renderer und **ein** Prose-CSS (`RichTextRenderer.module.css`) im gesamten Frontend,
12 Konsumenten. Die Public-Seite lädt **null Byte** Tiptap (Importgraph verifiziert).

**Contract-Drift (D1):**
- `components/editor/RichTextEditor.tsx:446` — `StarterKit.configure({ codeBlock:false, code:false,
  strike:false, hardBreak:false })`; **`link` wird nicht deaktiviert**.
- `@tiptap/extension-link` ist in `node_modules` installiert; StarterKit v3 registriert es
  standardmäßig (`link: Partial<LinkOptions> | false` in `starter-kit/dist/index.d.ts`);
  `autolink` ist eine aktive Default-Option der Extension.
- `backend/internal/services/tiptap_service.go:47-49` —
  `allowedTipTapMarks = { bold, italic, textStyle }`; **`link` fehlt**.
  `applyMarks` (Z. 369) behandelt `link` nicht; bluemonday erlaubt **kein** `<a>`.
- Folge: Autolink beim Tippen einer URL erzeugt einen `link`-Mark → `ValidateJSON` lehnt ab →
  **HTTP 400 beim Speichern einer Gruppen-Geschichte**.
- ⚠️ Dieser Pfad ist **auf Code-Ebene belegt, aber nicht live reproduziert** (Schreib-Endpunkt ist
  admin-authentifiziert; der Audit war read-only). **Erster Schritt in D1 muss die Reproduktion sein**
  — als Backend-Test gegen `ValidateJSON` mit einem Link-Mark-JSON (kein Live-Login nötig).

**Sanitizer-Härtung (D2), beide ohne bekannten Seiteneffekt:**
- `p.AllowAttrs("class").OnElements("span","td","th")` **ohne** `Matching()` — der einzige beabsichtigte
  Fall sind die von `applyMarks` erzeugten `color-token-<token>`-Klassen bei bereits über
  `allowedColorTokens` validierten Tokens. Regex `^color-token-[a-z]+$` schließt die Lücke.
- `h1` ist in `AllowElements` — die Seite hat bereits ein `h1` (Gruppenname im Hero) und Story-Titel
  sind `h3`; ein Rich-Text-`h1` bricht die Heading-Hierarchie.

### Weitere belegte Kleinbefunde

- `FansubHeroSection.tsx:28` `buildInitials` — dupliziert `fansubTeamInitials.getMemberInitials`
  **mit abweichender Logik**: `buildInitials` nimmt die ersten Buchstaben der ersten zwei Wörter;
  `getMemberInitials` nimmt bei einem Wort die ersten zwei Zeichen und sonst erstes+letztes Wort.
  ⚠️ **Fachlich nicht identisch** → C3 verlangt hier explizit die Entscheidung
  „konsolidieren **oder** Unterschied dokumentieren und belassen".
- `FansubGroupMediaBlock.tsx:24` `CATEGORY_TAG_CLASS: Record<string, string>` — neue Kategorie fällt
  still auf `tagOther`, kein Compilerfehler → C4.
- `app/fansubs/[slug]/page.tsx:64` `Promise.allSettled([<einzelner Promise>])` → C5.
- `app/fansubs/[slug]/page.test.tsx` enthält **genau einen** Test (Projekt-Routing) → D5.
- `components/fansubs/__tests__/FansubHistorySection.test.tsx` (6 Tests) prüft überwiegend
  **CSS-Klassennamen als Strings** (`toMatch(/achGold/)`, `toContain('historyTimelinePair')`,
  `toContain('historyTimelineAxisYear')`) → **bricht bei A2/A3 zwangsläufig** → D6 ist Pflichtteil
  der Migration, nicht optional.
- Kein Query-Budget-Test für die Fansub-Public-Seite, obwohl Harness existiert:
  `backend/internal/repository/query_counter.go` (pgx `QueryTracer`, test-only) mit den Vorlagen
  `member_profile_query_budget_test.go` und `admin_users_query_budget_test.go`
  (Muster: dedizierte Throwaway-DB per Env-DSN, fail-closed DB-Namens-Guard, skip-if-unset) → B4.
- Keine axe-Abdeckung für Public-Fansub-Komponenten, obwohl `axe-core ^4.13.0`, `jest-axe ^11.0.0`
  und `src/test/axeSetup.ts` vorhanden sind und von `FocalCarousel` sowie `MemberProfileHero`
  genutzt werden → D4.
- `FansubGroupMediaBlock.tsx:98/104` — Button `aria-label={title}` **und** inneres Image `alt={title}`
  → doppelte Ansage → D3.

## Betriebliche Randbedingungen (aus dem Projektgedächtnis)

- **Frontend-Verifikation im Container:** vitest/typecheck/eslint über
  `docker compose exec -T team4sv30-frontend sh -c "cd /app && …"`. Host-`node_modules` ist ein leerer
  Mountpoint; **kein** Host-`npm install`.
- **Frontend-Prod-Build:** `docker compose build team4sv30-frontend` ist maßgeblich.
  `exec … npm run build` liefert wegen verschmutztem `.next`-Volume falsche Prerender-Fehler.
- **Live-Test :3000** ist Dev-Modus, aber **HMR greift nicht**: nach Frontend-Edits
  `docker restart team4sv30-frontend` + Hard-Reload. Kein `--build` nötig für reine Frontend-Edits.
- **Backend:** neue Go-Routen/Änderungen erscheinen erst nach
  `docker compose up -d --build team4sv30-backend`.
- **Go-Tests ohne Host-Go:** `golang:1.25-alpine`-Container im Netz `team4s_default`, PATH explizit
  setzen; DSN aus der `DATABASE_URL` des Backend-Containers ableiten und den DB-Namen auf eine
  dedizierte Throwaway-DB (`team4s_phase152_test`) tauschen. `.env`-`POSTGRES_PASSWORD` stimmt nicht.
  Guarded Budget-Tests brauchen ein **Schema-only**-Abbild der echten Struktur.
- **DB-Zugriff:** `docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2`.
- **Datenlage:** Live-DB enthält **eine** Gruppe (`new-subs`, id 1) mit 1 Projekt, 6 Mitgliedern,
  **1** History-Eintrag (`founding`, 2012) und 3 Medien. Für Badge-/Timeline-Visual-QA reicht das
  **nicht** — Testdaten für mehrere History-Einträge inkl. `releases_10000` müssen für die visuelle
  Prüfung bereitgestellt werden (temporär und wieder entfernen, **kein** dauerhafter Fixture-Aufbau;
  D10 schließt neue große Fixture-Infrastruktur aus).
- **Playwright-Collector:** Zombie-Chromiums im Frontend-Container hängen den nächsten Lauf —
  vor dem Lauf `docker restart` und Image-Cache per curl wärmen.

## Discretion

Die konkrete Slot-Einbettung in die Timeline, die genaue Form der Registry-Erweiterung, der Zuschnitt
des public-spezifischen Ladepfads und der Testzuschnitt folgen dem Befund am realen Code und der
Live-Verifikation. Keine neuen Produkt-/Domänenentscheidungen.
