# Phase 124: Punkte-Meilensteine als responsive Single-Family Achievement Stage - Context

**Gathered:** 2026-08-11
**Status:** Ready for planning
**Source:** PRD Express Path (`124-PRD.md`)

<domain>
## Phase Boundary

Phase 124 verändert ausschließlich die Darstellung der Punkte-Meilensteine im öffentlichen Memberprofil. Die bestehende, aus `total_points` und autoritativem `badge_progress` abgeleitete sechsstufige Familie wird aus dem äußeren `FocalCarousel` herausgelöst und als eine responsive Achievement Stage mit Hero, echtem Punktefortschritt und visuellem Thumbnail-Track dargestellt. Phase 123 liefert die Stage-Grundlage; Phase 121 liefert Breiten-, Artwork- und Qualitätsverträge; Phase 112 liefert die zentrale Read-time-Punkteableitung. Backend, API, Datenbank, Punkte-Ledger, Credit-System, Schwellenwerte und andere Badge-Familien bleiben unverändert.

</domain>

<decisions>
## Implementation Decisions

### Fachliche Wahrheit und Datenfluss
- **D-01:** Die sechs bestehenden Punkte-Meilensteine bleiben exakt: `point_milestone_first=1`, `point_milestone_active=50`, `point_milestone_experienced=200`, `point_milestone_engaged=500`, `point_milestone_veteran=1000`, `point_milestone_legend=2500`. Keine Stufe, kein Code und keine Schwelle wird ergänzt oder verändert.
- **D-02:** Die Profilseite leitet weiterhin aus `total_points` ausschließlich die höchste erreichte Punkte-Stufe ab; `resolveMemberBadgeFamilies` rekonstruiert daraus zusammen mit dem autoritativen `badge_progress` die vollständige sechsstufige Familie. Keine Persistierung zusätzlicher `member_badges`, keine zweite Threshold-Logik und keine abweichende SSR-/Client-Berechnung.
- **D-03:** Die Stage ist reine Präsentation. Echter Wert, nächste Schwelle, Restwert und Complete-Status stammen aus der bestehenden Familienprojektion. Vorschauzustand darf diese Werte niemals verändern.
- **D-04:** Das bestehende Verhalten bei 0 Punkten bleibt erhalten: Die Punktefamilie erscheint, hat keine aktuelle verdiente Stufe und zeigt die erste Stufe sichtbar, aber gesperrt. Keine neue Produktentscheidung wird für den Nullzustand eingeführt.

### Stage-Architektur und Wiederverwendung
- **D-05:** Punkte-Meilensteine verwenden kein äußeres `FocalCarousel` mehr: kein Carousel-Wrapper, keine Quiet-Konfiguration, keine Pfeile, kein Zähler, kein äußeres Swipe/Drag und kein Carousel-Skeleton in diesem Pfad.
- **D-06:** `FocalCarousel` selbst bleibt unverändert und bleibt Consumer-Seam für Rollen, Beiträge und `FansubProjectsGrid`. Phase 124 darf keine Shared-Carousel-Architektur neu entwerfen.
- **D-07:** Die uncommittete Phase-123-`AnimeProjectAchievementStage` ist die direkte technische und visuelle Grundlage. Gemeinsame Stage-Shell-, Hero-, Info-, Progress- und Responsive-Teile werden nur soweit extrahiert, wie zwei reale Single-Family-Consumer sie tatsächlich teilen.
- **D-08:** Punkte-spezifische neue Verantwortung wird auf einen kleinen Thumbnail-/Meilenstein-Track wie `PointsMilestoneTrack` oder ein gleichwertiges profil-lokales Element begrenzt. Es entsteht keine universelle Engine für Punkte, Beiträge, Mitgliedschaft, Rollen und Special Badges.
- **D-09:** Desktop und Mobile verwenden denselben Daten- und Komponentenbaum. Responsive Unterschiede werden über CSS gelöst; keine zweite Mobile-Komponente und keine viewportabhängige Fachlogik.

### Hero, Fortschritt und Maximalstatus
- **D-10:** Der Hero zeigt standardmäßig die tatsächliche aktuelle Punkte-Stufe. Er besteht aus einem stabilen quadratischen Artwork-Slot, Stufenname, echtem Punktewert, Präsentationsstatus, Progressbar, Prozentwert und nächstem Ziel.
- **D-11:** Bei einer Vorschau früherer verdienter Stufen ändern sich ausschließlich Hero-Artwork, Stufenname und Status `Vorschau`. Der echte Punktewert wird als aktuell erkennbar gehalten; Progress, nächste Schwelle und Restwert bleiben an der tatsächlichen aktuellen Stufe.
- **D-12:** Fortschritt wird gegen die nächste autoritative Schwelle dargestellt, nicht pauschal gegen 2500. Beispiele bleiben fachlich bindend: 72/200=36 %, 734/1000=73 %; ARIA-Werte und sichtbare Texte müssen dieselbe Semantik ausdrücken.
- **D-13:** Bei `Archiv-Legende` bleibt der echte Wert auch oberhalb 2500 sichtbar, die Stage zeigt `Höchste Stufe erreicht`, eine vollständige Progressbar und weder erfundene nächste Stufe noch Restanzeige.
- **D-14:** Zahlenformatierung folgt dem PRD-Zielbild mit lesbarer Tausendergruppierung (`1'287`, `2'500`, `2'733`), sofern sie mit der kanonischen vorhandenen Formatierungs-Seam umgesetzt wird; vor neuer Hilfslogik ist repository-weit nach bestehender Formatierung zu suchen.

### Sechs-stufiger visueller Track
- **D-15:** Der Punkte-Track zeigt exakt sechs geordnete Stationen. Jede Station enthält echtes kleines Badge-Artwork, verständlichen Stufennamen oder Kurzform, Schwellenwert und einen nicht nur farblich erkennbaren Status.
- **D-16:** Zustände sind `erreicht`, `aktuell`, `ausgewählt` und `gesperrt`. Aktuell wird unter anderem über Ring/Marker, sichtbares `Aktuell` und `aria-current` ausgezeichnet; Vorschau erhält eine eigenständige Markierung.
- **D-17:** Frühere verdiente Stufen sind echte auswählbare Buttons. Zukünftige gesperrte Stufen bleiben sichtbar, sind nicht auswählbar und nicht fokussierbar. Lokale Auswahl wird nicht persistiert und setzt sich bei relevanter Datenänderung sinnvoll zurück.
- **D-18:** Desktop zeigt alle sechs Thumbnails möglichst vollständig über die Stage-Breite; sie bleiben sekundäre Navigation und konkurrieren nicht mit dem Hero. Es entstehen weder sechs große Karten noch eine zweite Hero-Galerie.
- **D-19:** Mobile darf den Track lokal horizontal scrollen. Bevorzugt wird natives `overflow-x` mit optionalem CSS Snap; kein Seitenoverflow, keine zweite Carousel-Engine, kein Momentum-Code, keine Wheel-Sonderlogik, kein 140/160-ms-Settle und kein ResizeObserver nur zum künstlichen Zentrieren.

### Artwork und Geometrie
- **D-20:** Die aktive Asset-Serie bleibt `first-v2`, `active-v2`, `experienced-v2`, `engaged-v2`, `veteran-v3`, `legend-v2`. Ausschließlich die zentrale Artwork-Auflösung entscheidet; ältere Varianten werden weder reaktiviert noch in neuem JSX hart codiert.
- **D-21:** Alle sechs vollständigen PNGs verwenden im Hero und Thumbnail einen stabilen quadratischen Slot, korrektes Seitenverhältnis und `object-fit: contain`. Keine Verzerrung, Ovalisierung, unkontrollierter Hintergrundüberstand oder erfundene Layer-Komposition.
- **D-22:** Für mindestens drei visuell unterschiedliche Artworks werden Desktop und Mobile explizit auf Verzerrung, Hintergrundüberstand und saubere Zentrierung in Hero und Thumbnail geprüft. Asset-Probleme werden ursächlich analysiert, nicht durch pauschales Schrumpfen des gesamten Heros kaschiert.

### Responsive Komposition und Accessibility
- **D-23:** Desktop nutzt die Phase-121-Visualbreite kontrolliert: ungefähr 40–45 % Artwork und 55–60 % Information als Orientierung, Track darunter über gemeinsame Breite, kein schmaler zentrierter Kartenblock und kein gigantischer Hero bei 1920/2560.
- **D-24:** Mobile stapelt Hero, Name, Punktewert, Progress, Prozent, nächstes Ziel und Track kompakt; redundante Schwelleninformationen werden vermieden. Tablet wird bei 768×1024 und 1024×768 bewusst geprüft.
- **D-25:** Die Stage ist klar beschriftet; aktuelle Stufe nutzt `aria-current`; Status ist nicht nur farblich; Progressbar hat fachlich korrekte ARIA-Werte; Vorschau ist screenreader-tauglich; Fokus bleibt nachvollziehbar; Reduced Motion wird respektiert.
- **D-26:** Verbindliche Viewports sind 390×844, 768×1024, 1024×768, 1440×900, 1920×1080 und 2560×1440. Geprüft werden Hero, Info-Spalte, Thumbnail-Größen, lokaler Track, Textumbrüche, Maximalbreite und Seitenoverflow.

### Tests, Regression und Freigabe
- **D-27:** Automatisierte Tests decken die vollständige Grenzwertmatrix `0,1,49,50,199,200,499,500,999,1000,2499,2500,2733,5000` inklusive aktueller Stufe, earned/locked, nächster Schwelle, Restwert, Prozent und Complete ab.
- **D-28:** Tests decken zusätzlich Carousel-Entfernung, sechs Codes/Reihenfolge/Schwellen, aktive Assetversionen, stabile Geometrie, aktuelle/Preview/Locked-Semantik, unveränderten echten Progress, 2500/>2500, deterministische SSR-Initialstufe, gleiche responsive Datenstruktur und fehlenden Seitenoverflow ab.
- **D-29:** Shared Regression hält Phase-121-Rollen, Phase-123-Anime-Projekte, `FocalCarousel`, `FansubProjectsGrid`, öffentliche Profilseite und `memberBadgeLabels` grün. Keine andere Badge-Gruppe wird funktional verändert.
- **D-30:** Live-UAT prüft niedrige, mittlere, Veteranen- und Legend-Werte, >2500 sowie Vorschau. Pflicht-Evidence sind `points-390.png`, `points-768.png`, `points-1024.png`, `points-1440.png`, `points-1920.png`, `points-2560.png`; zusätzlich `points-preview.png` und `points-max.png`.
- **D-31:** Vor formellem Abschluss wird nach technischer Verifikation und Live-UAT mit Desktop-, Mobile-, Track-, Preview- und Maximalstatus-Evidence gestoppt. Abschluss erst nach explizitem `approved` oder nach Bearbeitung konkreter UAT-Korrekturen.
- **D-32:** Der Abschlussbericht folgt der in `124-PRD.md` festgelegten 21-teiligen Markdown-Struktur und beantwortet die fünf dort genannten Qualitätsfragen ausdrücklich.

### Scope- und Arbeitsbaum-Schutz
- **D-33:** Nicht geändert werden: Rollen, fachliche Anime-Projekte-Logik, Beiträge, Mitgliedschaft, besondere Auszeichnungen, Rollen ohne Badge-System, Backend, API, Datenbank, Punkte-Ledger, Credit-System, `FocalCarousel`-Architektur, Profil-Editor und History-Event-Badges.
- **D-34:** Der vorhandene schmutzige Arbeitsbaum ist Baseline. Phase-121-/123-Arbeit und andere fremde uncommittete Änderungen werden nicht zurückgesetzt oder überschrieben; vor jeder Umsetzung werden `git status` und relevante Diffs geprüft und nur gezielte Patches eingesetzt.

### the agent's Discretion
- Exakte profil-lokale Aufteilung zwischen gemeinsamer Stage-Shell, `AnimeProjectAchievementStage` und einem Punkte-spezifischen Track.
- Präzise CSS-Werte und Breakpoints innerhalb der gelockten Viewport-, Breiten- und Overflow-Verträge.
- Ob mobiles CSS Snap eingesetzt wird, sofern natives lokales Overflow ohne zusätzliche Scroll-Engine erhalten bleibt.
- Konkrete nicht-farbige Markerform für erreicht/aktuell/ausgewählt/gesperrt innerhalb der Accessibility-Vorgaben.
- Fachlich valide Behandlung der knapp unter einer Schwelle auf 100 % gerundeten Anzeige sowie terminaler ARIA-Werte; sichtbarer echter Count und autoritative Schwellen dürfen dabei nicht verändert werden.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase source and inherited contracts
- `.planning/phases/124-punkte-meilensteine-als-responsive-single-family-achievement/124-PRD.md` — vollständige gelockte Nutzer-Spezifikation, Scope, Tests, Evidence und Human Gate.
- `.planning/phases/124-punkte-meilensteine-als-responsive-single-family-achievement/124-RESEARCH.md` — verifizierter Datenfluss, Architektur, Pitfalls und Dirty-Tree-Risiken.
- `.planning/phases/124-punkte-meilensteine-als-responsive-single-family-achievement/124-VALIDATION.md` — Boundary-Oracle, Testmap, Wave-0-Gaps und UAT-Matrix.
- `.planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/121-CONTEXT.md` — Visualbreite, Artwork-Geometrie, Shared Regression und Dirty-Tree-Verträge.
- `.planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/121-PRD.md` — Rollen-Badge-Qualitätsbaseline und ausdrücklich ausgeschlossene Punkteänderungen.
- `.planning/phases/119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha/119-CONTEXT.md` — bestehende Badge-Familien- und Collection-Semantik.
- `.planning/phases/112-member-punkt-meilenstein-badges/112-CONTEXT.md` — geerbte Punkte-Meilenstein-/Read-time-Ableitungsentscheidungen.

### Project contracts
- `AGENTS.md` — kanonische Linux-Umgebung, Existing-seam-first, UI-, Test-, UAT- und Dirty-Tree-Regeln.
- `docs/engineering/implementation-contract.md` — Wiederverwendungs- und Anti-Duplizierungsvertrag.
- `docs/frontend/ui-system.md` — globale UI-Primitives, Tokens und Domain-Grenzen.
- `docs/agent-guidelines-ui.md` — responsive, semantische und visuelle UI-Regeln.

### Primary Phase-121/123 implementation analogs
- `frontend/src/components/profile/MemberBadgeChain.tsx` — bestehende Familien-Routing-Seam, zentrale Artwork-Auflösung, `FamilyCollectionCard` und uncommittete Phase-123-`AnimeProjectAchievementStage`.
- `frontend/src/components/profile/MemberBadgeChain.module.css` — bestehende Rollen-/Collection-Styles und uncommittete Phase-123-Stage-/Responsive-Styles.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` — Rollen-, Collection-, Artwork-, Preview-, Phase-123- und Carousel-Verträge.
- `frontend/src/components/profile/memberBadgeLabels.ts` — `POINT_MILESTONES`, `deriveMilestoneBadge`, `resolveNextPointMilestone` und `resolveMemberBadgeFamilies`.
- `frontend/src/components/profile/memberBadgeLabels.test.ts` — kanonische Resolver-/Schwellen-/Familientests.
- `frontend/src/app/members/[slug]/page.tsx` — öffentliche SSR-Ableitung des höchsten Punkt-Meilensteins aus `total_points`.
- `frontend/src/app/members/[slug]/page.test.tsx` — öffentliche Profil-/SSR-Regressionen.
- `backend/internal/repository/member_profile_progress_repository.go` — autoritative `points`-Progressprojektion; nur lesen, nicht ändern.
- `frontend/src/components/ui/ResponsiveImage.tsx` — bestehende responsive Artwork-Seam.
- `frontend/src/components/ui/FocalCarousel.tsx` und `frontend/src/components/ui/FocalCarousel.test.tsx` — unverändert zu haltende Shared-Consumer-/Regression-Seam.
- `frontend/src/components/fansubs/FansubProjectsGrid.tsx` und `frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` — verbleibender Carousel-Consumer und Pflichtregression.

</canonical_refs>

<specifics>
## Specific Ideas

- Desktop-Ziel: ein großer aktueller/ausgewählter Punkte-Hero links, Stufenname und echter Punktefortschritt rechts, sechs visuelle Meilensteine über die Breite darunter.
- Nicht-terminales Beispiel: `Veteranenstatus`, `1'287 Punkte`, `1'287 / 2'500`, `51 %`, `Noch 1'213 Punkte bis Archiv-Legende`.
- Terminales Beispiel: `Archiv-Legende`, `2'733 Punkte`, `Höchste Stufe erreicht` ohne erfundenes Ziel.
- Preview-Beispiel: Hero zeigt `Erfahrungsstufe` und `Vorschau`, während `734 Punkte aktuell`, 734/1000 und das Ziel Veteranenstatus unverändert bleiben.
- Mobile verwendet eine native lokale Thumbnail-Leiste; die sechs unterschiedlichen Motive müssen als kleine echte Artworks erkennbar bleiben.

</specifics>

<deferred>
## Deferred Ideas

- Umbau der Beiträge-, Mitgliedschafts-, Rollen- oder Special-Badge-Darstellung.
- Universelles Achievement-Framework oder generische zweite Carousel-/Scroll-Engine.
- Neue Punkte-Stufen, Schwellen, persistierte Punkte-Badges oder Änderungen an Backend/API/Datenbank/Ledger/Credit-System.
- Neuentwurf von `FocalCarousel` oder funktionale Änderung seiner verbleibenden Consumer.
- Profil-Editor-, History-Event-Badge- oder Asset-Migrationsarbeit.

</deferred>

---

*Phase: 124-punkte-meilensteine-als-responsive-single-family-achievement*
*Context gathered: 2026-08-11 via PRD Express Path*
