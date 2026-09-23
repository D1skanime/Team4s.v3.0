# Requirements: Team4s v1.4 Capability-, Review- und Benutzerverwaltung

**Defined:** 2026-08-20
**Core Value:** Team4s presents fansub history and collaboration credibly while keeping identity, visibility, ownership, and permissions correct.

## v1.4 Requirements

### Effektive Rechte und Capability-Verwaltung

- [x] **CAP-01**: Ein autorisierter Admin kann für einen Benutzer und eine Fansubgruppe die vollständige Liste seiner effektiven Capabilities sehen.
- [x] **CAP-02**: Ein autorisierter Admin kann für jede effektive Capability alle gewährenden Rollen, direkten Allows, direkten Denies und den entscheidenden Grund nachvollziehen.
- [x] **CAP-03**: Für normale Gruppenmitglieder gilt serverseitig dieselbe dokumentierte Präzedenz in Anzeige und Enforcement: Benutzer-Deny vor Benutzer-Allow vor rollenbasiertem Allow.
- [x] **CAP-04**: Der Plattform-Admin-Bypass bleibt oberhalb der gruppenbezogenen Präzedenz erhalten und wird als IdP-verwaltete, durch Gruppen-Toggles nicht veränderbare Herkunft erklärt.
- [x] **CAP-05**: Ein autorisierter Admin kann für einen aktiven Benutzer eine einzelne Capability ausschließlich innerhalb einer konkreten Fansubgruppe erlauben oder verweigern.
- [x] **CAP-06**: Override-Mutationen validieren Zielmitgliedschaft, Fansubgruppe und zulässige Capability serverseitig und lehnen gruppenfremde oder unzulässige Ziele neutral ab.
- [x] **CAP-07**: Grant und Revoke eines Benutzer-Overrides sind idempotent, atomar und mit Actor, Ziel, Kontext, Capability sowie Vorher-/Nachher-Zustand auditiert.
- [x] **CAP-08**: Ein geführter Entzugs-Flow zeigt alle Quellen eines Rechts und empfiehlt den gezielten Benutzer-Deny, bevor breitere Rollen- oder Matrixänderungen angeboten werden.
- [x] **CAP-09**: Vor einer Rolle-zu-Capability-Änderung sieht der Admin betroffene Rolleninhaber und die tatsächliche effektive Änderung, einschließlich Benutzer ohne Änderung wegen weiterer Quellen.
- [x] **CAP-10**: Nach einer Rollenmatrix-Mutation unterscheidet die Oberfläche zwischen persistiert, im Permission-Cache aktiviert, ausstehend und fehlgeschlagen; sie meldet keinen falschen Enderfolg.
- [x] **CAP-11**: Rollen-Zuweisbarkeit wird aus genau einer kanonischen Quelle gelesen und in Rollen-Pickern, API-Projektionen und Admin-Badges konsistent dargestellt.
- [x] **CAP-12**: Capability-Kategorie, Reihenfolge, Bezeichnung und Hilfetext stammen aus einem kanonischen Katalog, der auch Review-Capabilities vollständig abbildet.
- [x] **CAP-13**: Aktive zuweisbare Rollen besitzen fachlich bestätigte Capability-Zuordnungen oder werden ausdrücklich als Rollen ohne operative Rechte gekennzeichnet.
- [x] **CAP-14**: Capability-Reverse-Lookups für Herkunft und Impact bleiben mit repräsentativen Daten performant und werden durch passende Datenbankindizes unterstützt.

### Benutzer-Administration

- [x] **UADM-01**: Die vorhandene Gruppenrechte-Ansicht im Benutzer-Detail ist die kanonische Oberfläche für Inspektion und Änderung effektiver Gruppenrechte.
- [x] **UADM-02**: Beiträge eines Benutzers werden serverseitig nach Anime und Projekt gruppiert und zeigen den Projektstandard als kompakte Zusammenfassung.
- [x] **UADM-03**: Release-Versionen werden nur dann als Override bezeichnet und hervorgehoben, wenn sie tatsächlich vom Projektstandard abweichen.
- [x] **UADM-04**: Identische Release-Version-Zuweisungen werden zu verständlichen Bereichen wie „Version 1–13 entspricht dem Projektstandard“ zusammengefasst.
- [x] **UADM-05**: Medien eines Benutzers werden nach Anime, Projekt und Release-Kontext gruppiert und verlinken zielgenau zur bestehenden kanonischen Arbeitsfläche.
- [x] **UADM-06**: Große Rechte-, Beitrags- und Medienbestände lassen sich serverseitig filtern und stabil paginieren; Zähler beziehen sich auf denselben gefilterten Datenbestand.
- [x] **UADM-07**: Jeder Benutzer-Tab erklärt seinen Zweck und bietet passende nächste Aktionen oder kennzeichnet bewusst rein informative Daten eindeutig.
- [x] **UADM-08**: Die berührten Admin-Oberflächen nutzen ein gemeinsames Desktop-first-Layoutmuster mit CSS-/Container-Queries, Tastaturbedienung und schmaler Graceful Degradation ohne Seitenoverflow.

### Review-Delegation

- [x] **RDEL-01**: Ein autorisierter Gruppenleiter kann die bestehenden Review-Delegationen eines realen Fansubgruppen-Mitglieds über eine dokumentierte API lesen.
- [x] **RDEL-02**: Ein autorisierter Gruppenleiter kann die delegierbaren Rechte für Medien/Bilder, Notizen/Texte und Mitwirkungen einzeln gewähren und entziehen.
- [x] **RDEL-03**: Die Review-Delegation wird im vorhandenen Mitglieder-Editor unter „Prüf-/Freigabe-Rechte“ bedient und bleibt fachlich von Rollen und allgemeinen Benutzer-Overrides getrennt.
- [x] **RDEL-04**: Delegationsmutationen verwenden die vorhandenen transaktionalen Review-Service- und Audit-Seams und sind idempotent.
- [x] **RDEL-05**: Eine entzogene Delegation verliert unmittelbar und konsistent ihre Wirkung auf Entscheidung, Review-Liste und Zähler, ohne dem Mitglied eine breitere Leiterrolle zu entziehen.

### Entscheidbare Review-Arbeit

- [x] **RQUE-01**: Die offene Review-Liste enthält serverseitig nur Einträge, deren Review-Art der aktuelle Benutzer in der betreffenden Fansubgruppe entscheiden darf.
- [x] **RQUE-02**: Eigene Einreichungen erscheinen nicht in der entscheidbaren Review-Liste und erhöhen deren Actionable-Zähler nicht.
- [x] **RQUE-03**: Eigene offene Einreichungen können getrennt als „wartet auf Fremdprüfung“ angezeigt werden und besitzen dort keine Entscheidungsaktion.
- [x] **RQUE-04**: Review-Liste, Typ-Zähler, Detailzugriff und „Nächster Eintrag“ verwenden dieselben Actor-, Capability-, Gruppen- und Self-Review-Prädikate.
- [x] **RQUE-05**: Direkter Zugriff und Entscheidungsversuche bleiben serverseitig geschützt, selbst wenn ein Eintrag durch manipulierte URL oder veralteten Clientzustand geöffnet wird.
- [x] **RQUE-06**: Mitwirkungsprüfungen verwenden ihren bestehenden kanonischen Review-Workflow und werden nicht künstlich in die Text-/Bild-Release-Queue verschoben.

### Verträge, Sicherheit und Rollout

- [x] **QUAL-01**: Neue oder geänderte Permission-, Override-, Delegations- und Queue-Verträge sind in OpenAPI, Backend-DTOs, Frontend-Typen und zentralen API-Helfern synchron.
- [x] **QUAL-02**: Geschützte v1.4-Ansichten und Aktionen funktionieren bei fehlendem oder abgelaufenem Access Token mit gültiger Refresh-Session über den zentralen API-Client.
- [x] **QUAL-03**: Automatisierte Negativtests decken Deny-Präzedenz, gruppenfremde Overrides, unzulässige Capability-Codes, BOLA/IDOR, Self-Review und Direktzugriffe ab.
- [x] **QUAL-04**: Erforderliche Schemaänderungen verwenden neue reversible Migrationen mit Fresh-Up/Down-Nachweis und ohne Kompatibilitäts- oder Backfill-Code für disposable Testdaten.
- [x] **QUAL-05**: Reproduzierbare v1.4-Fixtures decken Mehrrollen-OR, Allow, Deny, Plattform-Admin, Cache-Fehler, Review-Grant/Revoke, Self-Review und große Benutzer-Projektionen ab.
- [x] **QUAL-06**: Query- und UI-Gates verhindern N+1-Abfragen, ungebundene Flachlisten, inkonsistente Pagination sowie Client-only-Sicherheitsfilter.
- [x] **QUAL-07**: Live-UAT prüft die echten Benutzer-, Gruppenmitglieder-, Capability- und Review-Routen bei 390×844, 768×1024 und 1440×900 sowie Tastaturbedienung und 400-%-Zoom.
- [x] **QUAL-08**: Die Implementierung bewahrt Keycloak-verwaltete globale Rollen, den Plattform-Admin-Bypass, kanonische Medien-/Mitwirkungs-Eigentümer und das bestehende Review-Audit ohne parallele Systeme.

## Future Requirements

### Plattform-Dokumente

- **PDOC-01**: Plattform-Admins können gruppenübergreifende Dokumente und Community-Initiativen mit PDF und Metadaten verwalten.
- **PDOC-02**: Benutzer können eine plattformweite Dokumentenbibliothek mit Vorschau, Download und Versionen verwenden.

### Badge-Darstellung

- **BGUI-01**: Alle Badge-Fortschrittsfamilien verwenden nach Aufbau repräsentativer Daten dieselbe responsive Fortschrittskarte.

### Spätere Rechte-Evolution

- **CAPF-01**: Das Rollenmodell kann nach gesonderter Fachentscheidung in eine neue mehrstufige Taxonomie überführt werden.
- **CAPF-02**: Autorisierte Admins können Rechte mehrerer Benutzer in einem gesondert abgesicherten Bulk-Flow bearbeiten.
- **CAPF-03**: Das System kann hypothetische Organisationsänderungen simulieren und Rollenempfehlungen erzeugen.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Plattformweite Dokumenten-/Initiativen-Bibliothek (#33) | Eigener Plattform-Produkttrack mit Upload, Versionierung und Zugriff; ausdrücklich auf später verschoben |
| Einheitliche Badge-Fortschritts-UI (#34) | Erst nach Aufbau repräsentativer Daten aller betroffenen Badge-Familien |
| Zweite Capability-Registry oder paralleles Permission-System | Die DB-getriebene Registry und der zentrale Permission-Service sind bereits kanonisch |
| Globale Benutzer-Overrides | v1.4 beschränkt Overrides bewusst auf eine konkrete Fansubgruppe |
| Vollständiger Rollenmodell-Rework | Verwandt, aber ohne gesonderte Fachentscheidung nicht Voraussetzung für Findings #29–#32 |
| Umbau von Medien-, Mitwirkungs- oder Release-Eigentum | v1.4 projiziert und verlinkt bestehende kanonische Domain-Seams |
| Mobile-first-Neudesign der Admin-Flächen | Desktop-first mit verpflichtender Graceful Degradation genügt für den Back-Office-Anwendungsfall |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAP-01 | Phase 137 | Complete |
| CAP-02 | Phase 137 | Complete |
| CAP-03 | Phase 137 | Complete |
| CAP-04 | Phase 136 | Complete |
| CAP-05 | Phase 137 | Complete |
| CAP-06 | Phase 137 | Complete |
| CAP-07 | Phase 137 | Complete |
| CAP-08 | Phase 138 | Complete |
| CAP-09 | Phase 138 | Complete |
| CAP-10 | Phase 138 | Complete |
| CAP-11 | Phase 136 | Complete |
| CAP-12 | Phase 136 | Complete |
| CAP-13 | Phase 136 | Complete |
| CAP-14 | Phase 136 | Complete |
| UADM-01 | Phase 138 | Complete |
| UADM-02 | Phase 139 | Complete |
| UADM-03 | Phase 139 | Complete |
| UADM-04 | Phase 139 | Complete |
| UADM-05 | Phase 139 | Complete |
| UADM-06 | Phase 139 | Complete |
| UADM-07 | Phase 139 | Complete |
| UADM-08 | Phase 139 | Complete |
| RDEL-01 | Phase 140 | Complete |
| RDEL-02 | Phase 140 | Complete |
| RDEL-03 | Phase 140 | Complete |
| RDEL-04 | Phase 140 | Complete |
| RDEL-05 | Phase 141 | Complete |
| RQUE-01 | Phase 141 | Complete |
| RQUE-02 | Phase 141 | Complete |
| RQUE-03 | Phase 141 | Complete |
| RQUE-04 | Phase 141 | Complete |
| RQUE-05 | Phase 141 | Complete |
| RQUE-06 | Phase 141 | Complete |
| QUAL-01 | Phase 136 | Complete |
| QUAL-02 | Phase 142 | Complete |
| QUAL-03 | Phase 137 | Complete |
| QUAL-04 | Phase 136 | Complete |
| QUAL-05 | Phase 142 | Complete |
| QUAL-06 | Phase 139 | Complete |
| QUAL-07 | Phase 142 | Complete |
| QUAL-08 | Phase 142 | Complete |

**Coverage:**
- v1.4 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0
- Duplicated: 0

---
*Requirements defined: 2026-08-20*
*Last updated: 2026-09-01 after Phase 142 final-gate reconciliation*


## Phase 151 — Additive scope (2026-09-07)

Source: `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-USER-REQUEST.md`. Existing v1.4 requirements remain complete.

- [ ] **P151-01**: Aktuellen Phase-150-Code, CSS-Kaskade, Artwork, Rollen, Karussell und Query-Pfade vor Implementierung analysieren und dokumentieren.
- [ ] **P151-02**: Bestehende Backend-Threshold-Autorität und Badge-Deduplizierung ohne neue Frontend-Business-Registry erhalten.
- [ ] **P151-03**: Gemeinsame zentrierte Badge-Bühne mit contain, konsistentem Padding und erhaltenem Seitenverhältnis; bestehende Quellassets unverändert scharf erhalten.
- [ ] **P151-04**: Kleinere Mobile-First-Größen, begrenzte Maximalgröße, konsolidierte Container Queries ohne konkurrierende Größen-Overrides; alle sechs Viewportklassen, Einbettung und Zoom prüfen.
- [ ] **P151-05**: Karussell mit eindeutiger aktiver Karte, ohne Pumpen oder größere Nachbarn; Maus, Trackpad, Touch, Tastatur und Reduced Motion zuverlässig.
- [ ] **P151-06**: Karaoke FX Entry, Bronze, Silber, Gold und Platin in bestehender visueller Sprache und regulärem Artwork-Resolver integrieren.
- [ ] **P151-07**: Explizite testbare Artwork-Metadaten mit Rollen-Katalog-Abdeckung, klaren Erweiterungsschritten und bewusst deklarierten Ausnahmen; keine spekulativen Dateipfade.
- [ ] **P151-08**: Aggregierte Datenbeschaffung erhalten, keine Abfragen pro Badge/Rollenkarte; Query-Pfade und unveränderte Query-Anzahl bzw. erforderliche Änderungen dokumentieren.
- [ ] **P151-09**: Frontend-Tests für Resolver, alle Rollen, Duplikate, responsive Darstellung, aktive Karte, Karussell und Reduced Motion; relevante bestehende Seitenregressionen prüfen.
- [ ] **P151-10**: Backend-Threshold-/Deduplizierungsregressionen sowie relevante Frontend-Tests, Typecheck, Lint, Build und git diff --check ausführen und getrennt dokumentieren.
- [ ] **P151-11**: Jedes verfügbare Achievement-Artwork einzeln visuell prüfen; reproduzierbare Linux-Browser-Screenshots und robuste strukturelle/visuelle Regression mit Badge-Inventar und Abnahmeprotokoll.
- [ ] **P151-12**: GSD Research, geprüfte Wave-Pläne, Execute, Gap-Behebung und unabhängige Abschlussprüfung abschließen; nur Phase151 auf main committen und origin/main ohne Force pushen.

| Requirement | Phase | Status |
|-------------|-------|--------|
| P151-01 | Phase 151 | Pending |
| P151-02 | Phase 151 | Pending |
| P151-03 | Phase 151 | Pending |
| P151-04 | Phase 151 | Pending |
| P151-05 | Phase 151 | Pending |
| P151-06 | Phase 151 | Pending |
| P151-07 | Phase 151 | Pending |
| P151-08 | Phase 151 | Pending |
| P151-09 | Phase 151 | Pending |
| P151-10 | Phase 151 | Pending |
| P151-11 | Phase 151 | Pending |
| P151-12 | Phase 151 | Pending |

## Phase 152 — Additive scope (2026-09-08)

Source: `.planning/ROADMAP.md` lines 1239-1258 (Phase 152 roadmap entry), grounded in
`.planning/phases/152-public-fansub-gruppenseite-konsolidierung-und-modernisierung/152-USER-REQUEST.md`.
Existing v1.4 requirements remain complete.

- [x] **P152-01**: `/history-event-badges-transparent/**` fuer die Next-Image-Pipeline freigeben; `/_next/image` liefert 200 statt 400, WebP, srcset, Lazy Loading; Master-PNGs unveraendert.
- [x] **P152-02**: `FansubHistorySection` rendert Artwork ueber den Phase-151-`AchievementArtwork`-Slot; Timeline, eigene Assets und eigene Registry bleiben; kein Member-Badge-Resolver.
- [x] **P152-03**: `--history-badge-size`, zugehoerige Badge-Groessen-Breakpoints, die `releases_10000`-Sondergroesse, achievement-spezifische Groessenlogik und unnoetige Pixel-Shifts sind entfernt.
- [x] **P152-04**: `achievementEventStyle`/harte `eventType`-If-Ketten sind durch additive Felder in `GROUP_HISTORY_EVENT_OPTIONS` ersetzt; keine zweite Registry.
- [x] **P152-05**: `publicDomainTerms` entfernt; statische Public-Labels in der Registry; Admin-Freitext nachweislich unveraendert.
- [x] **P152-06**: Bildperformance vorher/nachher dokumentiert (History; Hero falls umgestellt), inkl. Initial-Payload-Differenz und prozentualer Reduktion.
- [x] **P152-07**: Public-spezifischer Gruppenladepfad hydratisiert nur benoetigte Felder; doppelte Link-Ladung beseitigt; andere Konsumenten unbeschaedigt; keine Monster-Query.
- [x] **P152-08**: Ungenutzte Contributors-Projektion geprueft und Entscheidung belegt; `public-profile` und `domain-projection` bleiben fachlich getrennt.
- [x] **P152-09**: Query-Budget-Test auf Basis der vorhandenen Query-Counter-Infrastruktur; konstantes Budget, kein Wachstum mit Projekten/Mitgliedern/History/Media; neuer Sollwert dokumentiert.
- [x] **P152-10**: Totes History-CSS entfernt, angefasste Breakpoints/Hex-Farben konsolidiert, Initialenlogik entschieden, `CATEGORY_TAG_CLASS` typisiert, `Promise.allSettled([single])` vereinfacht.
- [x] **P152-11**: Tiptap-Link-Contract zwischen Editor und Backend konsistent, mit Regressionstest; Sanitizer-Haertung (`class`-Muster, `h1`) geprueft und wo ohne Seiteneffekt umgesetzt.
- [x] **P152-12**: Accessibility-Findings behoben (kein doppeltes Jahr im A11y-Tree, keine Doppelbeschriftung der Medien-Thumbnails); axe-Abdeckung ueber die vorhandene Infrastruktur ergaenzt.
- [x] **P152-13**: Page-Kompositionstests fuer Sektionsbedingungen, Leerzustaende, Projektions-Fallback und Fehlerzustand; History-Tests verhaltensbasiert statt Klassennamen-Assertions.
- [x] **P152-14**: Viewport-Sichtabnahme 320/390/520/768/1024/1440/1920/2560 ueber Hero, Story, Projekte, Team, History, Media; Build und relevante Front-/Backend-Tests PASS; unabhaengige Abschlussverifikation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| P152-01 | Phase 152 | Complete |
| P152-02 | Phase 152 | Complete |
| P152-03 | Phase 152 | Complete |
| P152-04 | Phase 152 | Complete |
| P152-05 | Phase 152 | Complete |
| P152-06 | Phase 152 | Complete |
| P152-07 | Phase 152 | Complete |
| P152-08 | Phase 152 | Complete |
| P152-09 | Phase 152 | Complete |
| P152-10 | Phase 152 | Complete |
| P152-11 | Phase 152 | Complete |
| P152-12 | Phase 152 | Complete |
| P152-13 | Phase 152 | Complete |
| P152-14 | Phase 152 | Complete |

## Phase 155 — Additive scope (2026-09-11)

Source: `.planning/phases/155-fansub-projektseite-read-model-und-query-budget/155-USER-REQUEST.md`,
grounded in `155-CONTEXT.md`/`155-RESEARCH.md`. Existing v1.4 requirements remain complete. This
section closes a phase-crossing tracking-artifact gap flagged in every one of the phase's other six
plan SUMMARY.md files (`grep -c "P155"` returned 0 across all six prior executions) — added here by
the phase's closing plan (155-07) rather than invented mid-phase by an individual plan executor.

- [x] **P155-01**: `groupSlug + animeSlug` wird ueber einen gezielten Resolver auf `groupID`, `animeID`, Projekt-Identitaet und kanonischen Pfad aufgeloest, ohne das vollstaendige Public Fansub Profile zu laden.
- [x] **P155-02**: Kein doppelter Public-Fansub-Profile-Load im normalen Projekt-Request; Previous/Next-Projekt fallen nur ohne nennenswerte Zusatzlast aus derselben Aufloesung.
- [x] **P155-03**: Die Contributor-Projektion enthaelt ausschliesslich sichtbare Uebersichtsfelder; keine Member-Texte, Medien, Beteiligungslisten, Historien oder Badges.
- [x] **P155-04**: Kein Request-Fan-out pro Mitwirkendem; ein Lasttest mit 30-50 Mitwirkenden belegt, dass danach keine Member-Detaildaten nachgeladen werden.
- [x] **P155-05**: Jeder Member-Klick im Projektkontext fuehrt kanonisch auf die Projekt-Member-Route, nicht auf `/members/[slug]`.
- [x] **P155-06**: Die Projekt-Member-Seite bleibt unveraendert und laedt Texte/Medien/Beteiligungen selbst; das globale Profil bleibt als sekundaere Navigation erreichbar.
- [x] **P155-07**: Latest Release Preview und Release History sind getrennte, jeweils bounded Projektionen ohne doppelten Abruf derselben Daten.
- [x] **P155-08**: Counts/Flags stammen aus Count-/Query-Metadaten statt aus einer `per_page:100`-Vollliste; die oeffentlich sichtbare Zahl bleibt byte-identisch.
- [x] **P155-09**: Getrennte Projektionen fuer Latest Preview und History sind zulaessig; kein Universal-DTO aus reiner Bequemlichkeit.
- [x] **P155-10**: Keine initialen Fetches ohne sichtbaren Consumer (Themes, Release-Media, tote Flags); entfernte Felder verschwinden auch aus dem Loader-Vertrag.
- [x] **P155-11**: Die bestehende Informationsarchitektur inklusive „Neuestes Fansub-Release"-Block bleibt vollstaendig erhalten; kein Redesign.
- [x] **P155-12**: Keine neue Tabelle, keine Materialisierung, keine Datenduplikation; Indizes nur mit Query-Plan-Beleg.
- [x] **P155-13**: Resolver und Summary liefern ausschliesslich oeffentliche Daten; bestehende Visibility-Filter bleiben unveraendert; Not-Found-Faelle sind belegt.
- [x] **P155-14**: Eine Vorher/Nachher-Messung von Requests, Queries, Payload und TTFB liegt als eigenstaendiges Auditdokument unter `docs/audits/` vor.
- [x] **P155-15**: Backend-/Frontend-Tests sind gruen, Vertragsparitaet Go-DTO/OpenAPI/TS/`api.ts` ist gewahrt, Working Tree ist sauber.

| Requirement | Phase | Status |
|-------------|-------|--------|
| P155-01 | Phase 155 | Complete |
| P155-02 | Phase 155 | Complete |
| P155-03 | Phase 155 | Complete |
| P155-04 | Phase 155 | Complete |
| P155-05 | Phase 155 | Complete |
| P155-06 | Phase 155 | Complete |
| P155-07 | Phase 155 | Complete |
| P155-08 | Phase 155 | Complete |
| P155-09 | Phase 155 | Complete |
| P155-10 | Phase 155 | Complete |
| P155-11 | Phase 155 | Complete |
| P155-12 | Phase 155 | Complete |
| P155-13 | Phase 155 | Complete |
| P155-14 | Phase 155 | Complete |
| P155-15 | Phase 155 | Complete |

## Phase 158 — Additiver Anime-Scope (2026-09-13)

Quelle: .planning/phases/158-public-anime-detail-reparatur/158-USER-REQUEST.md und 158-CONTEXT.md. Alle neuen Anforderungen sind offen; bestehende IDs und Status bleiben unverändert. Human-UAT156/157 wird hierdurch nicht geschlossen.

- [x] **P158-01**: Episodentitel auf weißen Karten und Contributionüberschrift auf dunkler Fläche lesbar; vorhandene globale Tokens.
- [x] **P158-02**: Hero ohne horizontalen Dokumentoverflow; lokale Begrenzung, Fokus/Slider/Controls erhalten.
- [x] **P158-03**: Access- oder Refreshsession mit Reaktion nach Mount; ausschließlich zentrale Session-/Refreshseam.
- [x] **P158-04**: Contributions: Laden/leer/Fehler; Watchlistunknown blockiert Mutationen; Aktionsfehler auch bei Custom-Styling sichtbar.
- [x] **P158-05**: Vollständig positive sichere Integer-ID; echte Next404; konsistente Metadaten ohne doppelten Animefetch.
- [x] **P158-06**: Keine erfundene7.8-Bewertung oder0Views; vorhandenes Anime22-/Emby-Mapping unverändert.
- [x] **P158-07**: Gruppenbereich über Pretty-Link aus autoritativen Slugs; gezielter Vertragsfix; numeric Compatibility erhalten.
- [x] **P158-08**: Relationsprüfung ohne Vollreload; Semantik aktiv/unbekannt/deaktiviert erhalten; höchstens zwei Datenstatements im Erfolgsfall.
- [x] **P158-09**: Vollständige technische Nutzermatrix, frische Gates und Browser-/HTTP-/Request-/SQLbelege; keine neue Regression; Alt-UAT offen.

| Requirement | Phase | Status |
|---|---|---|
| P158-01 | Phase 158 | Complete (technical; human UAT pending) |
| P158-02 | Phase 158 | Complete (technical; human UAT pending) |
| P158-03 | Phase 158 | Complete (technical; human UAT pending) |
| P158-04 | Phase 158 | Complete (technical; human UAT pending) |
| P158-05 | Phase 158 | Complete (technical; human UAT pending) |
| P158-06 | Phase 158 | Complete (technical; human UAT pending) |
| P158-07 | Phase 158 | Complete (technical; human UAT pending) |
| P158-08 | Phase 158 | Complete (technical; human UAT pending) |
| P158-09 | Phase 158 | Complete (technical; human UAT pending) |

## Phase 159 — Additiver Anime-Scope (2026-09-13)

Quelle: .planning/phases/159-public-anime-detail-konsolidierung/159-USER-REQUEST.md und 159-CONTEXT.md. Alle acht Anforderungen sind unabhängig technisch verifiziert; Nachweise in 159-INDEPENDENT-VERIFICATION.md und RESULTS.md. Bestehende IDs und historische Status bleiben unverändert. Human-UAT 156/157/158/159 bleibt offen.

- [x] **P159-01**: Ein SSR-deterministischer Clientbesitzer für Story/Filter/Versionen; sichere Persistierung/Multitabs; kein Poll oder Wechselrefetch.
- [x] **P159-02**: Gridnachbarn mit Zielanime und Gridseite; erster asynchroner Klick; Abort/Ignore; kein Initialrequest ohne Interaktion.
- [x] **P159-03**: Reales Coverbudget mobil/desktop über bestehende Medienmechanismen; lokale und Providerbilder; keine Scheintransformation.
- [x] **P159-04**: Ein geteilter Manifestrequest; begrenzte Lebensdauer/Größe; Consumerabort, Retry und SPA-Aktualisierung.
- [x] **P159-05**: Feld-/Consumer-Matrix und isolierte Fixtures vor riskanten Änderungen; neutrale Episodenfallbacks erhalten.
- [x] **P159-06**: Assignmentautorität bei Segmentbedarf; fansub_groups-Parität; eindeutige IDs; kontrollierte Streamcompatibility.
- [x] **P159-07**: Belegte Payload-/Rowgrenze oder passender Abrufmechanismus; keine Query pro Episode/Variante/Gruppe/Contributor.
- [x] **P159-08**: Volle Matrix für Storage/Multitab/Grid/Media/Cache/Kollision/Assignmentdivergenz und frische Gesamtgates.

| Requirement | Phase | Status |
|---|---|---|
| P159-01 | Phase 159 | Complete (technical; human UAT pending) |
| P159-02 | Phase 159 | Complete (technical; human UAT pending) |
| P159-03 | Phase 159 | Complete (technical; human UAT pending) |
| P159-04 | Phase 159 | Complete (technical; human UAT pending) |
| P159-05 | Phase 159 | Complete (technical; human UAT pending) |
| P159-06 | Phase 159 | Complete (technical; human UAT pending) |
| P159-07 | Phase 159 | Complete (technical; human UAT pending) |
| P159-08 | Phase 159 | Complete (technical; human UAT pending) |

## Phase 161 — Jellyfin 12 compatibility (2026-09-15)

Source: `161-USER-REQUEST.md`, with decisions D-01 through D-16 in 161-CONTEXT.md. All six requirements are technically complete and independently verified (16/16, no open gaps). 161-VERIFICATION.md retains human_needed for unperformed live import/relink/rescan/playback checks; no human UAT sign-off is inferred.

- [x] **P161-AUTH**: Every actual Jellyfin request uses header authentication without secret leakage; Fanart and Emby retain their own authentication.
- [x] **P161-API**: All used Jellyfin endpoints are inventoried and checked against the running version 12 contract; confirmed incompatibilities are corrected.
- [x] **P161-ITEMS**: GetItems filtering, direct versus recursive scope, exact identity and pagination are semantically verified.
- [x] **P161-SOURCE**: Deterministic item/source binding remains coherent through import, playback, subtitles and render identity, including the real 11eyes case.
- [x] **P161-METADATA**: Selected-source container and consumer-backed audio/subtitle fields persist and render coherently; ordinary editing preserves technical identity. Per D-16, only unknown audio language displays Japanisch as a fallback, while provider facts and subtitle languages remain unchanged.
- [x] **P161-REGRESSION**: Focused unit/integration/contract tests, live read-only evidence, request budgets and existing-regression comparison support the final compatibility report.

| Requirement | Phase | Status |
|---|---|---|
| P161-AUTH | Phase 161 | Complete (technical; human live checks pending) |
| P161-API | Phase 161 | Complete (technical; human live checks pending) |
| P161-ITEMS | Phase 161 | Complete (technical; human live checks pending) |
| P161-SOURCE | Phase 161 | Complete (technical; human live checks pending) |
| P161-METADATA | Phase 161 | Complete (technical; human live checks pending) |
| P161-REGRESSION | Phase 161 | Complete (technical; human live checks pending) |

## Phase 162 — Öffentliche Anime-Seite: Fansub-Gruppenauswahl, Kurzgeschichte, Navigation (2026-09-17)

Source: `162-USER-REQUEST.md` §1–§17, decisions D-01 through D-14 in `162-CONTEXT.md`, requirement IDs derived in `162-RESEARCH.md`. Plan 162-01 closes REQ-162-10/16/17 (the backend/contract foundation: additive `story_preview` field, unchanged group ordering, N+1-free bundled query). The remaining requirements are frontend/UX work for later plans in this phase (162-02ff.).

- [x] **REQ-162-01**: 0 Gruppen: kein Gruppenbereich, kein Platzhalter.
- [x] **REQ-162-02**: Genau 1 Gruppe: kein „Alle"-Chip, Gruppe automatisch aktiv.
- [x] **REQ-162-03**: 2+ Gruppen: „Alle" als Default, „Alle" nur ab 2 Gruppen sichtbar.
- [x] **REQ-162-04**: Filter-Chips: Logo 20px wenn vorhanden, reiner Text sonst, kein Dummy-Icon.
- [x] **REQ-162-05**: Aktiver Zustand nicht nur über Farbe: Hintergrund+Rahmen+Fontgewicht+Fokusring.
- [ ] **REQ-162-06**: Responsive: Wrap statt Pflicht-Scrollleiste, keine Layout-Sprengung.
- [x] **REQ-162-07**: Chips sind reine Auswahl, keine Navigation.
- [x] **REQ-162-08**: „Alle": alle gruppenspezifischen Elemente vollständig ausgeblendet, nicht disabled.
- [x] **REQ-162-09**: Konkrete Gruppe: Name, ~3 Zeilen Geschichte, „Mehr lesen →", 2 Navigationsziele.
- [x] **REQ-162-10**: Geschichte: bestehende `fansub_group_notes`-Quelle, `body_text`, `line-clamp:3`, „Mehr lesen →" zu `/fansubs/<slug>#geschichte`.
- [x] **REQ-162-11**: Gruppe ohne Geschichte: kein Platzhaltertext, nur Name + 2 Navigationsziele.
- [x] **REQ-162-12**: Navigation: „Zur Fansub-Gruppe", „Zum Projekt", echte Routen/Slugs aus Code ermitteln.
- [x] **REQ-162-13**: Begriff „Gruppenbereich" nicht weiterverwenden; explizite Beschriftungen.
- [x] **REQ-162-14**: Coop: keine künstliche Gruppe/Filter, bestehende Mehrgruppen-Zuordnung.
- [x] **REQ-162-15**: URL-Zustand: `?fansub=<slug>`, Regeln für fehlenden/gültigen/ungültigen Parameter, Back/Forward.
- [x] **REQ-162-16**: Sortierung: bestehende fachliche Reihenfolge nicht überschreiben.
- [x] **REQ-162-17**: Datenfluss/Performance: kein N+1, kein Einzelrequest pro Gruppe, kein volles Profil laden, additive kleinste Contract-Erweiterung.
- [x] **REQ-162-18**: Accessibility: Tastatur, sichtbarer Fokus, Active State nicht nur Farbe, Accessible Names, echte Links, Chips/Links semantisch getrennt.
- [x] **REQ-162-19**: Entfernen redundanter Alt-UI: `fansubRow`, Story-Titel-Link, Umschalt-Buttons, „Gruppenbereich"-CTA.
- [x] **REQ-162-20**: Tests A–L automatisiert abgedeckt.
- [ ] **REQ-162-21**: Browser-Verifikation Desktop/Mobile über alle Datenkonstellationen.

| Requirement | Phase | Status |
|---|---|---|
| REQ-162-01 | Phase 162 | Complete |
| REQ-162-02 | Phase 162 | Complete |
| REQ-162-03 | Phase 162 | Complete |
| REQ-162-04 | Phase 162 | Complete |
| REQ-162-05 | Phase 162 | Complete |
| REQ-162-06 | Phase 162 | Pending |
| REQ-162-07 | Phase 162 | Complete |
| REQ-162-08 | Phase 162 | Complete |
| REQ-162-09 | Phase 162 | Complete |
| REQ-162-10 | Phase 162 | Complete |
| REQ-162-11 | Phase 162 | Complete |
| REQ-162-12 | Phase 162 | Complete |
| REQ-162-13 | Phase 162 | Complete |
| REQ-162-14 | Phase 162 | Complete |
| REQ-162-15 | Phase 162 | Complete |
| REQ-162-16 | Phase 162 | Complete |
| REQ-162-17 | Phase 162 | Complete |
| REQ-162-18 | Phase 162 | Complete |
| REQ-162-19 | Phase 162 | Complete |
| REQ-162-20 | Phase 162 | Complete |
| REQ-162-21 | Phase 162 | Pending |

## Phase 163 — Öffentliche Anime-Seite: Episoden nach Fansub-Gruppe und vorhandenen Releases filtern (2026-09-17)

Source: `163-USER-REQUEST.md` §1–§17 (Pflichtfälle A–J in §15), decisions D-01 through D-19 in `163-CONTEXT.md`, verified live against `team4s_v2` (read-only) in `163-RESEARCH.md`. Depends on Phase 162's `?fansub=<slug>` URL state.

- [x] **REQ-163-01**: Episode ist öffentlich nur sichtbar mit ≥1 öffentlicher Release-Version (Grundregel bei „Alle").
- [x] **REQ-163-02**: „Alle" zeigt alle Episoden mit ≥1 öffentlicher Version, keine Episoden ganz ohne Release.
- [x] **REQ-163-03**: Konkrete Gruppe aktiv: nur Episoden mit ≥1 passender Version dieser Gruppe (Coop inklusive).
- [x] **REQ-163-04**: Ebene B — innerhalb der Episode nur die zur aktiven Gruppe passenden Versionen; `version_count`/`default_version_id` bezogen auf die gefilterte Menge.
- [x] **REQ-163-05**: Coop-Version gehört jeder beteiligten Gruppe; keine Primärgruppe; bestehende Mehrgruppen-Zuordnung verwenden.
- [x] **REQ-163-06**: Gruppenfilter ist serverseitig in die Cursor-Pagination integriert; kein clientseitiges Scheinfiltern über bereits geladene Teilmengen.
- [x] **REQ-163-07**: Additiver Query-Parameter (Gruppen-Slug) an bestehendem Public-Episoden-Endpoint, in Strict-Allowlist aufgenommen; Frontend (`getGroupedEpisodes`), Handler, OpenAPI und TS-Typen synchron.
- [x] **REQ-163-08**: Filterkontext ist Teil des Cursor-Scope; ein Cursor aus Filter A wird bei Filter B oder „Alle" abgelehnt (`ErrValidation`/400).
- [x] **REQ-163-09**: Überschrift „Episoden (N)" zeigt die Trefferzahl über alle Seiten im aktuellen Filter, im selben Read (kein Zusatzquery); Gesamtzahl am Poster bleibt unverändert.
- [x] **REQ-163-10**: Nur nach bestehender Public-Visibility-Logik sichtbare Release-Versionen berücksichtigen (fail closed; keine internen/versteckten Versionen).
- [x] **REQ-163-11**: Kein N+1; Query-Kosten bleiben stabil bei vielen Episoden/Gruppen/Versionen (Naruto-Fall geprüft).
- [x] **REQ-163-12**: Bestehende fachliche Episodenreihenfolge bleibt unverändert (`episode_number, episode_id, variant_id`).
- [x] **REQ-163-13**: Ein gemeinsamer URL-Zustand (Phase-162 `?fansub=`) steuert Gruppenauswahl, Geschichte/Navigation UND Episodenfilterung — keine zweite unabhängige Gruppenauswahl.
- [x] **REQ-163-14**: Konkrete Gruppe ohne Treffer: kompakter neutraler Hinweis, keine leeren Episodenkarten, kein technischer Fehlertext.
- [x] **REQ-163-15**: Pflichtfälle A–J aus §15 automatisiert abgedeckt (Backend-Integrationstests mit echter Query + Frontend-Tests).
- [x] **REQ-163-16**: Browser-Verifikation live über :3300/:3000 mit Naruto (AnimeOwnage/Project Messiah/Alle/Coop-Fall).
- [x] **REQ-163-17**: Bestehender Code vor Umsetzung dokumentiert: Endpoint, Pagination, Release-Version-Zuordnung, Public-Visibility-Bedingungen, SQL-Query-Anzahl, `EXPLAIN (ANALYZE)` für Naruto vorher.
- [x] **REQ-163-18**: Gruppenwechsel per `history.pushState` ohne RSC-/Seiten-Reload; alte Liste bleibt sichtbar, gedimmt und nicht interaktiv (`aria-busy`); kein Skeleton, kein Layoutsprung.
- [x] **REQ-163-19**: Browser Zurück/Vor lädt immer neu (kein Cache pro Gruppe); laufende Requests werden bei Wechsel abgebrochen; nur die letzte Auswahl darf Daten setzen.
- [x] **REQ-163-20**: Fehler beim Neuladen: kompakter Hinweis mit „Erneut versuchen"-Button; keine Altdaten der vorherigen Gruppe; Chip/URL bleiben auf neuer Gruppe.
- [x] **REQ-163-21**: `noVersionHint` und clientseitige Gruppenfilterung in `FansubVersionBrowser.tsx` entfernt (nicht parallel); `getSummaryVersion` wählt nur aus bereits gefilterten Versionen.
- [x] **REQ-163-22**: Notfall-Fallback-Liste in `page.tsx` zeigt keine releaselosen Episoden mehr; ersetzt durch neutralen Fehlerhinweis.
- [x] **REQ-163-23**: Loading-/Fehler-/Leer-/Retry-Elemente nutzen `@/components/ui`-Primitives und globale Design-Tokens; deutsche UI-Texte mit echten Umlauten.
- [x] **REQ-163-24**: Keine Datenänderungen an `team4s_v2` durch Agenten; alle Pflichtfall-Tests laufen gegen Fixtures in einer separaten Test-Datenbank.

| Requirement | Phase | Status |
|---|---|---|
| REQ-163-01 | Phase 163 | Complete |
| REQ-163-02 | Phase 163 | Complete |
| REQ-163-03 | Phase 163 | Complete |
| REQ-163-04 | Phase 163 | Complete |
| REQ-163-05 | Phase 163 | Complete |
| REQ-163-06 | Phase 163 | Complete |
| REQ-163-07 | Phase 163 | Complete |
| REQ-163-08 | Phase 163 | Complete |
| REQ-163-09 | Phase 163 | Complete |
| REQ-163-10 | Phase 163 | Complete |
| REQ-163-11 | Phase 163 | Complete |
| REQ-163-12 | Phase 163 | Complete |
| REQ-163-13 | Phase 163 | Complete |
| REQ-163-14 | Phase 163 | Complete |
| REQ-163-15 | Phase 163 | Complete |
| REQ-163-16 | Phase 163 | Complete |
| REQ-163-17 | Phase 163 | Complete |
| REQ-163-18 | Phase 163 | Complete |
| REQ-163-19 | Phase 163 | Complete |
| REQ-163-20 | Phase 163 | Complete |
| REQ-163-21 | Phase 163 | Complete |
| REQ-163-22 | Phase 163 | Complete |
| REQ-163-23 | Phase 163 | Complete |
| REQ-163-24 | Phase 163 | Complete |

## Phase 164 — Öffentliche Anime-Seite: Episode-/Release-UI, performantes Public Read-Model und Infinite Scroll (2026-09-17)

Source: `164-USER-REQUEST.md` §1–§53, decisions D-01 through D-48 in `164-CONTEXT.md`, live-measured findings in
`164-RESEARCH.md`, exact file/line analogs in `164-PATTERNS.md`, approved visual contract in `164-UI-SPEC.md`.
One requirement per decision (D-NN → REQ-164-NN) for full traceability. Depends on Phase 163's server-side
group filter, cursor v2, and `episode_count`. **Planning-only phase** — execution requires explicit operator
sign-off before `/gsd:execute-phase 164` runs.

- [x] **REQ-164-01**: Episoden bleiben aufklappbar; keine separate Episode-Detailseite (D-01).
- [x] **REQ-164-02**: Episode zeigt mindestens Episodennummer, Episodentitel, Filler-/Canon-Klassifikation, Episodentyp, Anzahl sichtbarer Release-Versionen (D-02).
- [x] **REQ-164-03**: Filler-/Canon-Werte (canon/filler/mixed/recap/unknown) und ihre öffentlichen Bezeichnungen sind fix; keine neue Klassifikationsheuristik (D-03).
- [x] **REQ-164-04**: Episodentyp ist eine zweite, unabhängige Dimension und zusätzlich sichtbar (D-04).
- [x] **REQ-164-05**: Glasiger Episodenstil mit subtilem Tint pro Klassifikation ersetzt die weißen Cards (D-05).
- [x] **REQ-164-06**: Farbe ist ausschließlich der Klassifikations-Kanal; der Episodentyp bekommt keine eigene Farbe (D-06).
- [x] **REQ-164-07**: Geöffnete Episode bleibt visuell übergeordnet; Releases erscheinen als kompakte neutrale glassige Unterelemente (D-07).
- [x] **REQ-164-08**: Release-Vorschau zeigt Gruppe(n)/Logo(s), Release-Version/Label, Auflösung, Container, Video-Codec, Softsub/Hardsub, Release-Datum (falls gepflegt), Zusatzinhalte-Hinweise, „Zum Release →"-Button (D-08).
- [x] **REQ-164-09**: Gruppe steht visuell vor den technischen Daten (D-09).
- [x] **REQ-164-10**: Gruppenlogo nur bei vorhandenem Bestand, keine neue Logo-Struktur, kein Dummy-Icon ohne Logo (D-10).
- [x] **REQ-164-11**: Coop zeigt alle beteiligten Gruppenlogos/-namen plus COOP-Kennzeichnung, keine erfundene Primärgruppe (D-11).
- [x] **REQ-164-12**: Technische Eckdaten als dezenter `·`-getrennter Fließtext, keine Chips/Badges (D-12).
- [x] **REQ-164-13**: Audio-Codec, Dateigröße, CRC32, Dauer, Provider, Media-/interne IDs, technische Vollmetadaten erscheinen nicht auf der Anime-Seite (D-13).
- [x] **REQ-164-14**: Release-Datum nur wenn gepflegt, Format „Fansub-Release vom DD.MM.YYYY" (Wortlaut per GAP-14, Live-UAT 18.09.2026, an die ursprüngliche D-14-Vorgabe „Veröffentlicht am" angepasst), sonst Zeile vollständig weglassen (D-14).
- [x] **REQ-164-15**: Zusatzinhalte-Hinweise (📷/📝/♪) als dezenter Text nur bei vorhandenem Inhalt, Boolean-Flags statt teurer Zusatzqueries (D-15).
- [x] **REQ-164-16**: Keine Screenshots/Thumbnails auf der Anime-Seite, nur Text „📷 Bilder" (D-16).
- [x] **REQ-164-17**: Release-Card ist nicht klickbar; expliziter Button „Zum Release →" (D-17).
- [x] **REQ-164-18**: Kein zusätzliches Details-Dropdown auf der Anime-Seite (D-18).
- [x] **REQ-164-19**: Kein Play-Button-zentriertes Design (D-19).
- [x] **REQ-164-20**: Mobile-First-Reihenfolge (Mobile → Tablet → Desktop → Breitbild) mit den in §21 genannten Verhaltensregeln (D-20).
- [x] **REQ-164-21**: Bestehendes Public-Read-Model wird additiv erweitert, keine parallele Domain-Struktur (D-21).
- [x] **REQ-164-22**: Datenfluss vor Umsetzung gemessen (SQL-Anzahl, Requests, Response-Größe), nicht geschätzt (D-22).
- [x] **REQ-164-23**: Kein N+1; Query-Anzahl bleibt weitgehend konstant pro Page-Request (2–6 Queries) (D-23).
- [x] **REQ-164-24**: `has_images`/`has_notes`/`has_karaoke` werden batched aufgelöst, keine Einzelquery pro Release (D-24).
- [x] **REQ-164-25**: Gruppen/Logos werden gesammelt aufgelöst, Coop korrekt aggregiert (D-25).
- [x] **REQ-164-26**: Preview-Response enthält keine schweren Detaildaten (Rich-Text, Screenshots, Segmentdetails, Vollmetadaten, volle Profile) (D-26).
- [x] **REQ-164-27**: Infinite Scroll ersetzt „Mehr anzeigen"/„Nächste Seite" (D-27).
- [x] **REQ-164-28**: Kein aggressives Prefetching; nur die unmittelbar nächste Page (D-28).
- [x] **REQ-164-29**: Page Size aus Code/Messung abgeleitet, nicht blind auf 24 festgeschrieben (D-29).
- [x] **REQ-164-30**: Begrenztes aktives Fenster; kein append-only-Wachstum auf alle Episoden (D-30).
- [x] **REQ-164-31**: Rückwärts Lazy Loading stellt entfernte frühere Pages beim Hochscrollen wieder her (D-31).
- [x] **REQ-164-32**: Windowing-Strategie ohne neue Virtualization-Library, kleinstmögliche robuste Lösung (D-32).
- [x] **REQ-164-33**: Kleiner begrenzter Client-Cache mit begründeter Größe/Eviction (D-33).
- [x] **REQ-164-34**: Scroll-Stabilität mit konkret benannter Technik (Spacer/gemessene Höhen/Anchor) (D-34).
- [x] **REQ-164-35**: Ladetrigger via IntersectionObserver-Sentinel, kein Scroll-Event-Polling (D-35).
- [x] **REQ-164-36**: Dezente Lade-UI beim Nachladen, kein Fullscreen-Spinner (D-36).
- [x] **REQ-164-37**: Kompakter Fehlerzustand beim Nachladen mit „Erneut versuchen", bestehende Episoden bleiben sichtbar (D-37).
- [x] **REQ-164-38**: Ende der Liste erzeugt keinen weiteren Request (D-38).
- [x] **REQ-164-39**: Geöffnete Episoden bleiben über Windowing/Eviction hinweg durch stabile ID-Keys erhalten (D-39).
- [x] **REQ-164-40**: Filterwechsel bricht laufende Requests ab, leert das Fenster, setzt Cursor zurück, lädt Page 1 des neuen Filters (D-40).
- [x] **REQ-164-41**: Serverseitige Filterung bleibt bestehen; kein Client-seitiges Nachfiltern (D-41).
- [x] **REQ-164-42**: Cursor-Scope aus Phase 163 bleibt mit dem Windowing-Zustand konsistent (D-42).
- [x] **REQ-164-43**: Aufklappen einer bereits geladenen Episode erzeugt 0 zusätzliche API-Requests (D-43).
- [x] **REQ-164-44**: Browser Back/Forward und Rückkehr von der Release-Seite stellen Filter/Scrollposition/Page(s) sinnvoll wieder her (D-44).
- [x] **REQ-164-45**: Mobile Performance (DOM-Nodes, Hydration, Blur-Flächen) wird konkret bewertet (D-45). DOM-Node-Count real gemessen (835 Elemente/70 li, siehe `docs/audits/164-performance-gates.md` Gate 6); Mobile-Frame-/Paint-Profil (Blur-Kosten) NICHT gemessen — vom Auftraggeber am 2026-09-18 ausdrücklich trotz dieser offenen Messung abgenommen ("1 passt, 2 löschen").
- [x] **REQ-164-46**: Alle 12 Performance-Gates aus §47 sind konkret verifizierbar (Testfall/Messmethode/Codeassertion) (D-46).
- [x] **REQ-164-47**: Naruto (`anime_id=4`) ist der primäre Referenzfall; der §48-Testablauf ist die UAT-Blaupause, ergänzt um eine isolierte Fixture-DB für nicht real erreichbare Skalierungsfälle (D-47).
- [x] **REQ-164-48**: Der visuelle Testfall-Katalog aus `164-UI-SPEC.md` (Klassifikationen, Episodentypen, Release-Varianten, Infinite-Scroll-Zustände, Breakpoints) ist vollständig abgedeckt (D-48).

| Requirement | Phase | Status |
|---|---|---|
| REQ-164-01 | Phase 164 | Complete |
| REQ-164-02 | Phase 164 | Complete |
| REQ-164-03 | Phase 164 | Complete |
| REQ-164-04 | Phase 164 | Complete |
| REQ-164-05 | Phase 164 | Complete |
| REQ-164-06 | Phase 164 | Complete |
| REQ-164-07 | Phase 164 | Complete |
| REQ-164-08 | Phase 164 | Complete |
| REQ-164-09 | Phase 164 | Complete |
| REQ-164-10 | Phase 164 | Complete |
| REQ-164-11 | Phase 164 | Complete |
| REQ-164-12 | Phase 164 | Complete |
| REQ-164-13 | Phase 164 | Complete |
| REQ-164-14 | Phase 164 | Complete |
| REQ-164-15 | Phase 164 | Complete |
| REQ-164-16 | Phase 164 | Complete |
| REQ-164-17 | Phase 164 | Complete |
| REQ-164-18 | Phase 164 | Complete |
| REQ-164-19 | Phase 164 | Complete |
| REQ-164-20 | Phase 164 | Complete |
| REQ-164-21 | Phase 164 | Complete |
| REQ-164-22 | Phase 164 | Complete |
| REQ-164-23 | Phase 164 | Complete |
| REQ-164-24 | Phase 164 | Complete |
| REQ-164-25 | Phase 164 | Complete |
| REQ-164-26 | Phase 164 | Complete |
| REQ-164-27 | Phase 164 | Complete |
| REQ-164-28 | Phase 164 | Complete |
| REQ-164-29 | Phase 164 | Complete |
| REQ-164-30 | Phase 164 | Complete |
| REQ-164-31 | Phase 164 | Complete |
| REQ-164-32 | Phase 164 | Complete |
| REQ-164-33 | Phase 164 | Complete |
| REQ-164-34 | Phase 164 | Complete |
| REQ-164-35 | Phase 164 | Complete |
| REQ-164-36 | Phase 164 | Complete |
| REQ-164-37 | Phase 164 | Complete |
| REQ-164-38 | Phase 164 | Complete |
| REQ-164-39 | Phase 164 | Complete |
| REQ-164-40 | Phase 164 | Complete |
| REQ-164-41 | Phase 164 | Complete |
| REQ-164-42 | Phase 164 | Complete |
| REQ-164-43 | Phase 164 | Complete |
| REQ-164-44 | Phase 164 | Complete |
| REQ-164-45 | Phase 164 | Complete |
| REQ-164-46 | Phase 164 | Complete |
| REQ-164-47 | Phase 164 | Complete |
| REQ-164-48 | Phase 164 | Complete |

## Phase 165 — Library Discovery und Assisted Anime Creation (Serien) (2026-09-21)

Source: `165-USER-REQUEST.md` §1–§16, §25–§31, §33–§36 (Serien-Teil), decisions D-01 through D-22 in
`165-CONTEXT.md`, live-measured findings in `165-RESEARCH.md`, exact file/line analogs in `165-PATTERNS.md`,
approved visual contract in `165-UI-SPEC.md`. One requirement per decision (D-NN → REQ-165-NN, in CONTEXT.md's
own order D-01..D-15, D-17..D-22, D-16) for full traceability — see `ROADMAP.md` "Coverage — Phase 165" for the
plan-level mapping. **Planning-only phase** — execution requires `/gsd:execute-phase 165`; REQ-165-15 (D-15) was
additionally gated behind a human checkpoint (165-11-PLAN.md) before any schema/implementation work could run.
That checkpoint resolved 2026-09-21 with Auftraggeber-Entscheidung Option C — D-15 zurückgestellt, kein
Schema/Implementierungscode für die Mehrstaffel-Zuordnung; siehe 165-CONTEXT.md D-15-Nachtrag and
`165-11-SUMMARY.md`.
Film-Content-Flow (§17–§24, §32) is out of scope — that is Phase 166.

- [x] **REQ-165-01**: Auftrag auf zwei Phasen verteilt; Filme sind in der Discovery sichtbar/anlegbar, Übergangsregel führt bis Phase 166 auf die bestehende Edit-/Episoden-Seite (D-01).
- [x] **REQ-165-02**: Zustand „Zuordnung prüfen" wird nicht per Titel-/Pfad-/Fuzzy-Abgleich in der Liste erkannt, sondern erst nach der AniSearch-Auswahl über die bestehende Dublettenprüfung (D-02).
- [x] **REQ-165-03**: Liste unterscheidet „bereits vorhanden"/„offen" ausschließlich über exakte technische Referenzen (`source`/`source_links`/`folder_name`) (D-03).
- [x] **REQ-165-04**: Filter „Offen" (inkl. „teilweise")/„Bereits vorhanden"/„Ignoriert"/„Alle"; kein separater „Zuordnung prüfen"-Filter (D-04).
- [x] **REQ-165-05**: Ein Anime kann mehrere Jellyfin-Ordner haben; „Verbinden" ergänzt additiv in `anime_source_links`, ohne `source`/`folder_name` zu überschreiben (D-05).
- [x] **REQ-165-06**: Schlanke Series+Movie-Snapshot-Abfrage aus Jellyfin je erlaubter Library, Status per einmaliger Batch-DB-Abfrage, bestehendes Cursor-Muster für Pagination (D-06).
- [x] **REQ-165-07**: Budget-Gate: ≤1 DB-Query pro Discovery-Seite für die Existenzprüfung, Jellyfin-Requests unabhängig von der Seitenzahl (nur beim Cache-Aufbau), 0 Detailrequests vor Auswahl (D-07).
- [x] **REQ-165-08**: Auswahl übergibt in den bestehenden Create-Draft (Jellyfin-ID/Name/Path/Typ-Hint/Jahr/Assets) (D-08).
- [x] **REQ-165-09**: AniSearch-Suche mit dem Jellyfin-Namen vorbelegt, nie automatische Auswahl auch nicht bei genau einem Treffer (D-09).
- [x] **REQ-165-10**: Nur der Assisted-/Discovery-Flow leitet nach erfolgreichem Create weiter (Serie → Episoden, Film → bestehende Edit-Seite bis 166); manuelle Create-Wege bleiben unverändert (D-10).
- [x] **REQ-165-11**: Discovery-Kontext (Filter/Suche/Cursor) über die URL erhalten, „Zurück zur Bibliothek"-Rücksprung durch Create- und Episoden-Schritt (D-11).
- [x] **REQ-165-12**: Kein Provider-Framework, kein Source-Domain-Refactor, keine neue Fansub-Jellyfin-Kopplung; bestehende Flows regressieren nicht (D-12).
- [x] **REQ-165-13**: Globale UI-Primitives/Design-Tokens Pflicht, keine nativen `<button>/<input>/<select>`, deutsche Umlaute, Produktionsdateien ≤450 Zeilen, kein N+1 (D-13).
- [x] **REQ-165-14**: Episoden-Import-Ordnerauswahl bei mehreren verbundenen Jellyfin-Ordnern, mit serverseitiger fail-closed Prüfung, dass nur verbundene Jellyfin-IDs angenommen werden (D-14).
- [ ] **REQ-165-15** — **ZURÜCKGESTELLT** (Auftraggeber-Entscheidung 2026-09-21, Option C am 165-11-Checkpoint; siehe 165-CONTEXT.md D-15-Nachtrag und `165-11-SUMMARY.md`): Mehrstaffel-Ordner erhalten Status „teilweise"; das Schema für die Staffel→Anime-Zuordnung erfordert einen dem Auftraggeber vorgelegten Checkpoint vor jeder Umsetzung (D-15). Der Checkpoint wurde vorgelegt und beantwortet — die Antwort ist "zurückstellen", keine Umsetzung. Bleibt für eine künftige eigenständige Phase „Mehrstaffel-Ordner" vorgemerkt.
- [x] **REQ-165-16**: „Ignorieren"/„Nicht mehr ignorieren" pro Bibliothekseintrag, eigener Filter, Status-Priorität bereits vorhanden > ignoriert > teilweise > offen (D-17).
- [x] **REQ-165-17**: Anime-Bearbeitungsseite zeigt alle verbundenen Jellyfin-Ordner; Zusatz-Ordner sind lösbar, der Haupt-Ordner bleibt über den bestehenden Weg verwaltet (D-18).
- [x] **REQ-165-18**: Kurzlebiger serverseitiger Bibliotheks-Cache plus „Aktualisieren"-Button; Status nach Aktionen kommt sofort korrekt aus der DB-Prüfung, nicht aus dem Cache (D-19).
- [x] **REQ-165-19**: Unmittelbar vor dem Anlegen erneuter serverseitiger Dublettencheck auf `anisearch:<id>`, dieselbe Verbinden/Neu-Wahl statt stillem Doppelanlegen (D-20).
- [x] **REQ-165-20**: Verbinden, Ordner lösen, Ignorieren und Entignorieren sind Admin-Aktionen mit Audit-Attribution per `user_id` über den bestehenden Audit-Mechanismus (D-21).
- [x] **REQ-165-21**: Neue Tabellen aus dieser Phase tragen eine Server-Kennung (`server_key`, vorerst fest „default") zur Vorbereitung künftiger Mehrserver-Fähigkeit, ohne das bestehende `jellyfin:<id>`-Referenzformat zu ändern (D-22).
- [x] **REQ-165-22**: Ein Ordner mit neuer Jellyfin-ID nach Umbenennen/Verschieben ist über den bestehenden Verbinden-Weg lösbar; Aufräumen verwaister alter Verbindungen ist deferred (D-16).

| Requirement | Phase | Status |
|---|---|---|
| REQ-165-01 | Phase 165 | Planned |
| REQ-165-02 | Phase 165 | Planned |
| REQ-165-03 | Phase 165 | Planned |
| REQ-165-04 | Phase 165 | Planned |
| REQ-165-05 | Phase 165 | Planned |
| REQ-165-06 | Phase 165 | Planned |
| REQ-165-07 | Phase 165 | Planned |
| REQ-165-08 | Phase 165 | Planned |
| REQ-165-09 | Phase 165 | Planned |
| REQ-165-10 | Phase 165 | Planned |
| REQ-165-11 | Phase 165 | Planned |
| REQ-165-12 | Phase 165 | Planned |
| REQ-165-13 | Phase 165 | Planned |
| REQ-165-14 | Phase 165 | Planned |
| REQ-165-15 | Phase 165 | Deferred (Auftraggeber-Entscheidung 2026-09-21, Option C — Checkpoint beantwortet, keine Umsetzung) |
| REQ-165-16 | Phase 165 | Planned |
| REQ-165-17 | Phase 165 | Planned |
| REQ-165-18 | Phase 165 | Planned |
| REQ-165-19 | Phase 165 | Planned |
| REQ-165-20 | Phase 165 | Planned |
| REQ-165-21 | Phase 165 | Planned |
| REQ-165-22 | Phase 165 | Planned |

## Phase 167 — Fansub-Gruppenerkennung beim Episoden-Import (2026-09-23)

Source: `167-USER-REQUEST.md` §A–§E, decisions D-01 through D-11 in `167-CONTEXT.md`, verified findings in
`167-RESEARCH.md` (including the 13-filename measurement table trace and the live-DB inventory), exact
file/line analogs in `167-PATTERNS.md`, approved visual contract in `167-UI-SPEC.md`. One requirement per
distinct behavior derived from D-01..D-11/§A–§E plus the phase's explicit test/scope requirements — see
`.planning/phases/167-fansub-gruppenerkennung-beim-import/167-0{1..8}-PLAN.md` for the plan-level mapping.
Scopegrenze aus `167-CONTEXT.md`/ROADMAP.md: keine Änderung der Episodenzuordnung (Doppelfolgen nur
prüfen/dokumentieren, REQ-167-21), kein Umbenennen von Dateien, keine rückwirkende Zuordnung bereits
importierter Releases, keine Fuzzy-Automatik (Vorschläge werden nie automatisch übernommen).

- [x] **REQ-167-01**: Der Parser wertet ausschließlich den Dateinamen aus; der Pfad dient nur als Rückfallebene bei leerem Dateinamen (D-05).
- [x] **REQ-167-02**: Hex-Prüfsummen (8-stellig), Auflösungen, Codecs/Container, Sprachkennungen, Jahreszahlen und reine Zahlen gelten nie als Gruppenname — die Sperrliste gilt für jede Kandidaten-Klammer, nicht nur den Fallback-Zweig (D-06).
- [x] **REQ-167-03**: Das Szene-Schema `gruppe-titel.sXXeYY…` wird als neues Muster erkannt (D-07).
- [x] **REQ-167-04**: Die vier bereits funktionierenden Muster (Klammer-Präfix mit/ohne Leerzeichen, Jellyfin-S01E01-Suffix, Klammer am Ende) regressieren nicht (D-07).
- [x] **REQ-167-05**: Ist kein Kürzel sicher erkennbar, liefert der Parser leer statt zu raten (D-06).
- [x] **REQ-167-06**: Tabellentests mit allen 13 realen Dateinamen aus der Messtabelle (inkl. beider Fehlerfälle) existieren in `internal/importutil` (D-10).
- [x] **REQ-167-07**: Das erkannte Kürzel wird gebündelt (eine Abfrage je Vorschau) gegen `fansub_groups.name`/`.slug`/`fansub_group_aliases.normalized_alias`, normalisiert, abgeglichen (D-08).
- [x] **REQ-167-08**: Bei eindeutigem Treffer ist die Gruppe im Mapping vorausgewählt, mit sichtbarem Herkunftshinweis („erkannt aus Dateiname: X → Y (Alias/Name/Slug)") (D-08).
- [x] **REQ-167-09**: Der Admin kann die Vorauswahl jederzeit ändern; nichts wird ohne sichtbaren Hinweis automatisch gesetzt.
- [ ] **REQ-167-10**: Der bestehende Auto-Upsert aus Dateinamen entfällt; eine unaufgelöste Zeile erzeugt beim Anwenden keine neue `fansub_groups`-Zeile mehr (D-03).
- [x] **REQ-167-11**: Bei fehlendem Treffer werden ähnliche Gruppen über den vorhandenen Trigram-Index nur vorgeschlagen, nie automatisch übernommen (D-03).
- [x] **REQ-167-12**: Ohne Treffer bleibt die Gruppenauswahl leer; der Admin wählt manuell.
- [ ] **REQ-167-13**: Ordnet der Admin ein erkanntes, bisher unbekanntes Kürzel einer bestehenden Gruppe zu, wird es automatisch als weiterer Alias dieser Gruppe gespeichert (D-01).
- [x] **REQ-167-14**: Mehrere Aliase pro Gruppe sind erlaubt; ein Alias gehört systemweit genau einer Gruppe, durchgesetzt über die bestehende `UNIQUE(normalized_alias)`-Constraint (D-01).
- [x] **REQ-167-15**: Gehört das Kürzel bereits einer anderen Gruppe, erscheint ein sichtbarer Hinweis „Kürzel gehört bereits zu <Gruppe>"; Umhängen geschieht ausschließlich über eine ausdrückliche, bestätigte Aktion, nie still (D-02).
- [x] **REQ-167-16**: Alias-Pflege (anlegen, umhängen, löschen) ist in der Gruppenverwaltung sichtbar und bedienbar (D-09).
- [x] **REQ-167-17**: Alle Alias-Mutationen (angelegt, gelöscht, umgehängt, automatisch gelernt) sind mit Audit-Attribution per `user_id` protokolliert und in der bestehenden Gruppen-Änderungshistorie lesbar (D-09).
- [x] **REQ-167-18**: Eine Versionskennung `v2`/`v3`/`v4` am Dateinamen-Ende (auch direkt nach Prüfsumme/Klammer ohne Trennzeichen) wird als Release-Version statt `v1` vorgeschlagen und bleibt änderbar (D-04).
- [x] **REQ-167-19**: Integrationstests gegen eine echte, isolierte Test-Datenbank (`testsupport.OpenPhase167Postgres`) beweisen den Alias-Schreibpfad und die Eindeutigkeitsregel (D-10).
- [x] **REQ-167-20**: Ein Query-Budget-Test belegt eine konstante Abfragezahl für die Gruppen-Zuordnung unabhängig von der Dateianzahl in der Vorschau (D-08).
- [ ] **REQ-167-21**: Doppelfolgen (`Naruto_026-027`-Schema) werden im bestehenden Import-Verhalten geprüft und dokumentiert; die Episodenzuordnung selbst ändert sich durch diese Phase nicht (Scopegrenze).
- [ ] **REQ-167-22**: Neue/angefasste UI-Elemente nutzen ausschließlich `@/components/ui`-Primitives, deutsche Texte mit echten Umlauten; die bereits übergroßen Dateien (`admin_episode_import.go`, `page.tsx`) wachsen durch diese Phase nicht weiter (D-11).
- [x] **REQ-167-23**: Handler-Verhalten für neue/erweiterte Endpunkte (Batch-Match, Alias-Lernen, Umhängen) ist mit `httptest` gegen ein Fake-Repository über eine schmale Interface-Abstraktion getestet, nicht per Quelltext-Inspektion (CLAUDE.md Teststil).

| Requirement | Phase | Status |
|---|---|---|
| REQ-167-01 | Phase 167 | Planned |
| REQ-167-02 | Phase 167 | Planned |
| REQ-167-03 | Phase 167 | Planned |
| REQ-167-04 | Phase 167 | Planned |
| REQ-167-05 | Phase 167 | Planned |
| REQ-167-06 | Phase 167 | Planned |
| REQ-167-07 | Phase 167 | Planned |
| REQ-167-08 | Phase 167 | Planned |
| REQ-167-09 | Phase 167 | Planned |
| REQ-167-10 | Phase 167 | Planned |
| REQ-167-11 | Phase 167 | Planned |
| REQ-167-12 | Phase 167 | Planned |
| REQ-167-13 | Phase 167 | Planned |
| REQ-167-14 | Phase 167 | Planned |
| REQ-167-15 | Phase 167 | Planned |
| REQ-167-16 | Phase 167 | Planned |
| REQ-167-17 | Phase 167 | Planned |
| REQ-167-18 | Phase 167 | Planned |
| REQ-167-19 | Phase 167 | Planned |
| REQ-167-20 | Phase 167 | Planned |
| REQ-167-21 | Phase 167 | Planned |
| REQ-167-22 | Phase 167 | Planned |
| REQ-167-23 | Phase 167 | Planned |
