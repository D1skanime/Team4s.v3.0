# Phase 164 – Auftrag des Auftraggebers (wörtlich, 2026-09-17)

Phase 164 – Öffentliche Anime-Seite:
Episode-/Release-UI + performantes Public Read-Model + Infinite Scroll

Die fachlichen Entscheidungen sind bereits getroffen. Nicht erneut diskutieren. Nicht alternative UX-Konzepte vorschlagen. Nicht automatisch ausführen.

Ziel dieser Phase ist die konkrete technische Planung auf Basis des aktuellen Team4s-Codes auf der VM.

## 1. ZIEL

Die öffentliche Anime-Seite `/anime/[id]` soll eine modernisierte Episode-/Release-Darstellung erhalten, die:
- klar als Fansub-/Release-Archiv funktioniert,
- nicht wie eine Streaming-Plattform wirkt,
- Mobile First aufgebaut ist,
- bei großen Anime mit 220+ Episoden performant bleibt,
- keine N+1-Strukturen erzeugt,
- keine unnötigen Daten vorlädt,
- Infinite Scroll statt „Mehr anzeigen“ nutzt,
- alte Pages aus dem aktiven DOM entfernen kann,
- beim Zurückscrollen vorherige Pages wieder nachlädt bzw. aus einem begrenzten Cache wiederherstellt,
- Scrollposition stabil hält.

Referenzfall: Naruto mit ca. 220 Episoden.

## 2. EPISODEN BLEIBEN AUFKLAPPBAR

Das bestehende Interaktionsprinzip bleibt: Episode geschlossen → kompakte Episode-Übersicht; Episode geöffnet → zugehörige Release-Versionen sichtbar. Keine separate Episode-Detailseite nur für diese Ansicht.

## 3. EPISODEN – SICHTBARE DATEN

Eine Episode soll mindestens zeigen: Episodennummer, Episodentitel, Filler-/Canon-Klassifikation, Episodentyp, Anzahl sichtbarer Release-Versionen.

Beispiel:

```
Folge 23
Der nächste Gegner

Filler · Episode

1 Version                                  >
```

Die konkrete Typografie und Anordnung aus dem bestehenden Team4s-Design ableiten.

## 4. FILLER-/CANON-KLASSIFIKATION

Vorhandene Werte: canon, filler, mixed, recap, unknown.

Öffentliche Bezeichnungen: canon → Haupthandlung; filler → Filler; mixed → Gemischt; recap → Rückblick; unknown → neutral / keine prominente Klassifikation.

Keine neue Klassifikationsheuristik in dieser Phase einführen.

## 5. EPISODENTYP

Vorhandene Typen u. a.: episode, special, ova, ona, movie, recap, preview, prologue, epilogue, bonus.

Der Episodentyp soll ebenfalls sichtbar sein. Beispiele: „Haupthandlung · Episode“, „Filler · Episode“, „Gemischt · OVA“, „Rückblick · Special“.

Filler-Klassifikation und Episodentyp sind zwei unterschiedliche Dimensionen.

## 6. GLASIGER EPISODENSTIL

Die aktuellen stark weißen Episode-Cards sollen ersetzt werden. Gewünscht: echter Glass-/Layered-Look, halbtransparente Flächen, Anime-Hintergrund leicht sichtbar, weiche Border, dezente Blur-Wirkung, ruhige Typografie, keine massiven weißen Karten, keine übertriebenen Neon-Effekte.

Farbton nach Klassifikation: Haupthandlung → leicht bläulich transparent; Filler → leicht rötlich transparent; Gemischt → leicht violett transparent; Rückblick → leicht amber/gelb transparent; Unknown → neutrales Glas.

WICHTIG: Nur subtiler Tint. Keine kräftigen vollflächigen Farben.

## 7. FARBE NUR FÜR EPISODENKLASSIFIKATION

Der Episodentyp bleibt visuell neutral (Episode / OVA / Special / Movie etc. nicht zusätzlich farbcodieren). Farbsemantik: Farbe = Haupthandlung/Filler/Mixed/Recap.

## 8. AUFGEKLAPPTE EPISODE

Beim Öffnen einer Episode erscheinen die zugehörigen relevanten Release-Versionen. Die Episode bleibt die visuell übergeordnete Einheit. Releases erscheinen als kompakte neutrale glassige Unterelemente. Keine zweite große weiße Kartenwelt.

## 9. RELEASE – SICHTBARE INFORMATIONEN

Pro Release-Version unmittelbar sichtbar: Fansub-Gruppe(n), Gruppenlogo(s) falls vorhanden, Release-Version / Label falls sinnvoll gepflegt, Auflösung, Container, Video-Codec, Softsub/Hardsub, Release-Datum falls gepflegt, Hinweise auf zusätzliche Inhalte, klarer Button „Zum Release“.

## 10. GRUPPE IST PRIMÄRE INFORMATION

Die Gruppe steht visuell zuerst:

```
[Logo] AnimeOwnage
1080p · MKV · x264 · Softsub
```

Nicht: `1080p · MKV · x264 · AnimeOwnage`. Team4s ist ein Fansub-/Release-Archiv; die Gruppe ist fachlich wichtiger als der Codec.

## 11. GRUPPENLOGO

Wenn vorhanden: bestehendes Gruppenlogo verwenden, keine neue parallele Logo-Datenstruktur, kompakte gut erkennbare Größe. Wenn kein Logo vorhanden: nur Gruppenname, kein Dummy-Icon, kein leerer Platzhalter.

## 12. COOP

Bei Coop: alle beteiligten Gruppenlogos, alle Gruppennamen, kleine COOP-Kennzeichnung.

```
[AO] [PM]
AnimeOwnage × Project Messiah      COOP
```

Keine Primärgruppe erfinden.

## 13. TECHNISCHE DATEN – DEZENTER TEXT

Technische Eckdaten ausdrücklich NICHT als Chips oder Badges. Nicht `[1080p] [MKV] [x264] [Softsub]`, sondern `1080p · MKV · x264 · Softsub`. Gestaltung: kleinere Schrift, dezente Textfarbe, keine Pills, keine Rahmen, keine Badge-Optik.

## 14. TECHNISCHE DATEN AUF DER ANIME-SEITE

Direkt sichtbar: Auflösung, Container, Video-Codec, Softsub/Hardsub.

Nicht direkt anzeigen: Audio-Codec, Dateigröße, CRC32, Dauer, Provider, Media IDs, Produktionsbeginn, Produktionsende, interne IDs, technische Vollmetadaten. Diese gehören später auf die Release-Seite in einen eigenen technischen Bereich.

## 15. RELEASE-DATUM

Nur anzeigen, wenn tatsächlich gepflegt. Darstellung: „Veröffentlicht am 12.04.2012“, nicht „12.04.2012“. Wenn kein Datum: Zeile vollständig weglassen, kein „Unbekannt“, kein Platzhalter, keine leere Höhe.

## 16. HINWEISE AUF ZUSÄTZLICHE INHALTE

Die Anime-Seite soll neugierig auf die Release-Seite machen. Wenn vorhanden, dezent anzeigen: 📷 Bilder, 📝 Notizen, ♪ Karaoke. Keine Chips, keine Badges, nur dezenter Text mit Symbol. Nur vorhandene Inhalte anzeigen; wenn nichts vorhanden, Zeile vollständig weglassen.

Counts nur, wenn praktisch kostenlos verfügbar (z. B. „📷 3 Bilder“), aber keine zusätzlichen teuren Queries nur für Counts. Boolean-Flags reichen.

## 17. SCREENSHOTS

Episoden selbst besitzen keine Bilder. Screenshots gehören zu Release-Versionen und entstehen nur durch Uploads. Auf der Anime-Seite: keine Screenshots laden, keine Thumbnails, keine Platzhalterbilder – nur „📷 Bilder“. Die eigentlichen Screenshots werden erst auf der Release-Seite geladen.

## 18. „ZUM RELEASE“

Die gesamte Release-Card ist NICHT klickbar. Es gibt einen klaren Button „Zum Release →“. Desktop/Breitbild: Button rechts innerhalb der Release-Card, Card möglichst flach.

```
[Logo] AnimeOwnage                         [ Zum Release → ]
1080p · MKV · x264 · Softsub
📷 Bilder   📝 Notizen   ♪ Karaoke
Veröffentlicht am 12.04.2012
```

Mobile: Wenn seitlich zu wenig Platz, Button unter die Metadaten verschieben.

## 19. KEIN TECHNISCHES DETAIL-DROPDOWN

Kein zusätzliches „Details ▾“ auf der Anime-Seite. Die Anime-Seite ist Preview; vollständige technische und redaktionelle Informationen gehören auf die Release-Seite.

## 20. STREAMING

Team4s ist primär kein Streaming-Frontend. Die Release-Preview darf nicht um einen Play-Button herum designt werden. Falls bestehende Berechtigungslogik später einen Stream-Button vorsieht: nur bei Streamquelle, nur bei Berechtigung, nicht zentrales Designmerkmal.

## 21. MOBILE FIRST

Planung und Umsetzung in der Reihenfolge Mobile → Tablet → Desktop → Breitbild.

Mobile: kein horizontaler Overflow, Gruppenname lesbar, Technikzeile darf umbrechen, Extras-Zeile darf umbrechen, Button mit ausreichend großer Touch-Fläche, Release-Card darf höher werden, keine gequetschten Logos.

Tablet: erste horizontale Verdichtung, Button ggf. bereits rechts.

Desktop/Breitbild: linke Hauptspalte (Gruppe, Technik, Extras, Datum), rechte Aktionsspalte („Zum Release →“), möglichst geringe vertikale Höhe.

## 22. PUBLIC READ PROJECTION

Die Anime-Seite darf nicht pro Episode/Release zusätzliche Daten einzeln nachladen. Prüfen, ob die bestehende Public Projection erweitert werden kann.

Sinngemäß benötigt die UI:

EpisodePreview: id, number, title, filler_type, episode_type, visible_version_count, versions[]

ReleasePreview: id, release_version/label, fansub_groups[] (id, name, slug, logo), resolution, container, video_codec, subtitle_type, release_date, has_images, has_notes, has_karaoke, release route / stable public identifier

Tatsächlich vorhandene Typen/Feldnamen aus dem Code verwenden. Keine parallele Domain-Struktur erfinden.

## 23. PERFORMANCE IST KERNBESTANDTEIL

Vor Planung aktuellen Datenfluss analysieren, insbesondere: Public Anime Endpoint, Episode Endpoint, Repository Queries, Release-Version-Auflösung, Gruppenauflösung, Logos, Assets, Notes, Karaoke/Segmente, Public Visibility, aktuelle Pagination, Frontend State, aktuelle DOM-Struktur.

Vorher messen/nachvollziehen: SQL-Anzahl, API-Requests, Response-Größe, eager/lazy geladene Daten.

## 24. KEIN N+1

Nicht zulässig: Episode → Releases Query; pro Release → Gruppen Query; pro Gruppe → Logo Query; pro Release → Bilder/Notes/Karaoke Query.

Ziel: Query-Anzahl weitgehend konstant pro Page-Request, nicht linear wachsend mit Episoden oder Releases. 2–6 saubere Queries sind akzeptabel. Keine Monsterquery erzwingen, wenn dadurch Wartbarkeit leidet.

## 25. FLAGS EFFIZIENT AUFLÖSEN

Für has_images, has_notes, has_karaoke keine Einzelquery pro Release. Geeignete Strategie prüfen: EXISTS, aggregierte Query, Batch-Auflösung über sichtbare release_version_ids, vorhandene Resolver.

## 26. GRUPPEN / LOGOS EFFIZIENT AUFLÖSEN

Keine Einzelanfrage pro Gruppe. Gruppeninformationen und Logo-Referenzen gesammelt auflösen. Bei Coop mehrere Gruppen korrekt aggregieren.

## 27. KEINE SCHWEREN DETAILDATEN

Preview-Response darf NICHT enthalten: vollständige Rich-Text-Notizen, Screenshots, Segmentdetails, Karaoke-Detailinhalte, technische Vollmetadaten, vollständige Fansub-Profile. Nur kompakte Preview-Daten.

## 28. INFINITE SCROLL STATT „MEHR ANZEIGEN“

Keine „Mehr anzeigen“- oder „Nächste Seite“-Interaktion. Die Episodenliste soll Infinite Scroll / Lazy Loading verwenden: beim Scrollen Richtung Ende der aktuell geladenen Page automatisch die nächste Page nachladen (geladen 1–24, User nähert sich 20–24 → 25–48 laden; nicht 49–72 vorladen).

## 29. KEIN AGGRESSIVES PREFETCHING

Nur die unmittelbar nächste benötigte Page laden. Keine stillen Requests für Seite 2, Seite 3 oder restliche Episoden beim Initial Load.

## 30. PAGE SIZE

Bestehende Pagination analysieren, geeignete Page Size aus aktuellem Code/Messungen bestimmen. Erwartungsbereich ca. 20–24 Episoden, aber nicht blind festschreiben, wenn der aktuelle Stack eine bessere Größe nahelegt.

## 31. BOUNDED WINDOW

Infinite Scroll darf NICHT append-only wachsen (nicht alle 220 Episoden dauerhaft im DOM). Stattdessen begrenztes aktives Fenster: ist z. B. 25–72 relevant, dürfen weit entfernte ältere Pages aus dem aktiven DOM entfernt werden.

## 32. RÜCKWÄRTS LAZY LOADING

Wenn frühere Pages aus dem aktiven Window entfernt wurden und der Benutzer wieder nach oben scrollt, vorherige Page automatisch wieder bereitstellen (aktiv 49–96 → beim Hochscrollen 25–48 wieder einfügen, weiter hoch 1–24).

## 33. WINDOWING-STRATEGIE

Planer soll auf Basis des aktuellen Frontends prüfen: klassische Pagination, bidirektionales Infinite Loading, bounded page window, Virtualisierung, Kombination aus Cursor Pagination + Windowing.

Keine zusätzliche Virtualization-Library automatisch einführen. Zuerst vorhandene Dependencies, DOM-Kosten und Card-Struktur prüfen. Die kleinstmögliche robuste Lösung planen.

## 34. CLIENT-CACHE

Ein kleiner begrenzter Cache ist erlaubt (z. B. aktuelle, vorherige, nächste Page oder kleiner LRU-Cache). Aber kein unbegrenzter Cache aller 220 Episoden. Planer soll Cache-Größe und Eviction begründen.

## 35. SCROLL-STABILITÄT

Wenn alte Pages aus dem DOM entfernt oder wieder eingefügt werden: keine sichtbaren Sprünge. Besonders kritisch: obere Page entfernen, obere Page wieder einfügen, Episode öffnen/schließen, Release-Liste verändert Höhe, Mobile mit variabler Card-Höhe.

Plan muss konkret erklären, wie Scroll Anchoring / Height Preservation gelöst wird. Mögliche Techniken prüfen: Spacer, gemessene Page-Höhen, Anchor Element, vorhandene Virtualization-Mechanismen, Browser Scroll Anchoring. Keine vage Aussage.

## 36. LADETRIGGER

Geeigneten Mechanismus verwenden, bevorzugt IntersectionObserver mit Sentinel am unteren Ende. Nicht unnötig Scroll-Event-Polling verwenden. Für Rückwärtsladen: oberer Sentinel / geeignete Windowing-Logik prüfen.

## 37. LOADING UI

Nachladen soll dezent sein: kleiner Skeleton-/Loader-Bereich am Listenende bzw. Listenanfang. Nicht: gesamte Seite blockieren, Fullscreen Spinner, bereits sichtbare Episoden sperren.

## 38. FEHLER BEIM NACHLADEN

Wenn weitere Episoden nicht geladen werden können, bleiben bereits geladene Episoden sichtbar. Am betroffenen Listenende kompakter Fehlerzustand: „Weitere Episoden konnten nicht geladen werden. [ Erneut versuchen ]“. Kein kompletter Seitenfehler.

## 39. ENDE DER LISTE

Wenn keine weitere Page existiert: kein weiterer Request. Kein großer Endblock notwendig, optional sehr dezente Endemarkierung.

## 40. GEÖFFNETE EPISODEN + WINDOWING

Planen, wie geöffnete Episode-Cards mit Windowing zusammenspielen (geöffnete Episoden können deutlich höher sein). Prüfen: Open State, Height Changes, Scroll Anchoring, Wiederherstellung beim Zurückladen, ob geöffneter Zustand erhalten werden soll. Bestehenden State-Ansatz analysieren.

## 41. FILTERWECHSEL

Die in Phase 163 geplante Gruppenfilterung muss vollständig mit Pagination und Infinite Scroll zusammenspielen. Bei Filterwechsel: laufende Requests abbrechen oder Ergebnisse ignorieren, aktives Window leeren, Cursor zurücksetzen, Cache für alten Filter nicht unkontrolliert weiterverwenden, erste Page des neuen Resultsets laden, Scrollposition sinnvoll auf Listenanfang setzen. Keine alten Resultate in neue Filter mischen.

## 42. SERVERSEITIGE FILTERUNG

Nicht 24 Episoden laden und im Frontend nach Gruppe filtern, sondern: AnimeOwnage aktiv → Backend liefert die nächsten passenden AnimeOwnage-Episoden. Pagination arbeitet auf dem gefilterten Resultset.

## 43. CURSOR-SCOPE

Cursor muss Filterkontext berücksichtigen. Ein Cursor aus AnimeOwnage darf nicht für Project Messiah oder Alle verwendet werden.

## 44. EPISODE AUFKLAPPEN OHNE REQUEST-WASSERFALL

Wenn die Episode bereits geladen ist, soll das Öffnen idealerweise 0 zusätzliche API-Requests erzeugen. Die Preview-Daten der Releases müssen bereits im Page-Response enthalten sein – nicht erst beim Aufklappen Releases, Gruppen, Logos, has_images, has_notes, has_karaoke laden.

## 45. BACK / FORWARD / RELEASE-RÜCKSPRUNG

Planer soll prüfen, wie Browser History und Rückkehr von der Release-Seite mit Infinite Scroll zusammenspielen. Wünschenswert: Anime → Release → Zurück stellt möglichst aktiven Gruppenfilter, ungefähre Scrollposition und relevante Page(s) wieder her. Keine unbegrenzte Persistenz erzwingen, aber vorhandene Next.js-/Browser-Mechanismen sinnvoll nutzen.

## 46. MOBILE PERFORMANCE

Nicht nur Desktop messen. Besonders prüfen: DOM Nodes, React Component Count, Hydration, große Listen, viele Glass-Effekte, backdrop-filter, mehrere geöffnete Episoden. Glassmorphism darf nicht hunderte GPU-intensive Blur-Flächen dauerhaft rendern. Planer soll die CSS-Kosten bewerten.

## 47. PERFORMANCE-GATES

Der Plan muss konkrete verifizierbare Gates enthalten, mindestens:
1. Initial Load lädt nur erste Episode-Page.
2. Keine weiteren Episode-Pages werden vorab geladen.
3. Nächste Page erst bei Scroll-Bedarf.
4. Query-Anzahl wächst nicht linear mit Episodenanzahl.
5. Episode-Aufklappen erzeugt keinen Request-Wasserfall.
6. DOM wächst nicht unbegrenzt.
7. Frühere Pages können beim Zurückscrollen wieder erscheinen.
8. Scrollposition bleibt stabil.
9. Gruppenfilter + Cursor bleiben konsistent.
10. Response enthält keine schweren Release-Detaildaten.
11. Mobile bleibt performant.
12. Keine Race Conditions bei schnellem Scrollen / Filterwechsel.

## 48. REFERENZFALL NARUTO

Naruto mit 220 Episoden als primärer Last-/UAT-Fall. Testablauf: Anime-Seite öffnen, erste Page prüfen, keine weiteren Pages im Network, nach unten scrollen, nächste Page lazy laden, mehrere Pages weitergehen, prüfen dass alte Pages aus aktivem DOM verschwinden, zurückscrollen, alte Pages wiederherstellen, mehrere Episoden öffnen/schließen, AnimeOwnage auswählen, weiter scrollen, Project Messiah auswählen, Race Conditions prüfen, SQL/API/DOM/Memory beobachten.

## 49. VISUELLE TESTFÄLLE

Mindestens: Haupthandlung, Filler, Mixed, Recap, Unknown; Episode, Special, OVA, Movie; Release mit Logo, ohne Logo, mit Datum, ohne Datum, mit Bildern, Notizen, Karaoke, ohne Extras, Coop, mehrere Releases in einer Episode.

## 50. PLANUNGSAUFTRAG

1. Aktuellen Code auf der VM lesen. 2. Phase-160/162/163-Artefakte berücksichtigen. 3. Public Episode-/Release-Datenfluss dokumentieren. 4. Bestehende SQL-Queries messen. 5. API-Requests messen. 6. Response-Größe messen. 7. Frontend State analysieren. 8. Aktuelle Pagination analysieren. 9. Vorhandene Design-Tokens / Glass-Styles analysieren. 10. Mobile-First-UI planen. 11. Public Read Projection planen. 12. Query-/Resolver-Optimierung planen. 13. Infinite Scroll planen. 14. Bounded bidirectional window planen. 15. Scroll-Stabilität konkret planen. 16. Filter-/Cursor-Integration planen. 17. Tests und Performance-Gates planen. 18. Pläne durch Checker prüfen lassen.

Keine erneute Produktdiskussion. Keine Ausführung.

## 51. ERWARTETE PLANSTRUKTUR

Phase in sinnvolle Pläne/Wellen zerlegen. Mögliche Themenblöcke: Public Read Projection, Repository/Query Optimization, Release Preview Aggregation, Pagination/Cursor, Infinite Scroll, Bidirectional Windowing, Episode Glass UI, Release Preview UI, Responsive Mobile → Breitbild, Browser/Performance UAT. Die tatsächliche Aufteilung aus dem Codebefund ableiten.

## 52. CHECKER MUSS BESONDERS PRÜFEN

N+1, Query-Wachstum, unnötiges Prefetching, Response-Größe, unbegrenzter Client-State, unbegrenzter DOM, Scroll-Sprünge, Rückwärtsladen, Filterwechsel, Cursor-Scope, Race Conditions, Mobile Performance, Glass-/Blur-GPU-Kosten, Episode-Open-State, Back/Forward-Verhalten. Wenn einer dieser Punkte nur vage beschrieben ist: Plan zurück an den Planer.

## 53. ABSCHLUSSBERICHT DER PLANUNG

Nach fertiger Planung nur berichten: Anzahl Pläne, Anzahl Wellen, gewählte Public-Read-Architektur, erwartetes Query-Budget, erwartete API-Request-Struktur, Pagination-/Cursor-Strategie, Infinite-Scroll-Trigger, Windowing-Strategie, Cache-Strategie, Umgang mit alten Pages, Rückwärtsladen, Scroll-Stabilität, Episode-Aufklappen / Request-Verhalten, Mobile-First-Plan, geplante Performance-Gates, Checker-Befund, Commits.

Danach NICHT automatisch ausführen. Auf Freigabe warten.
