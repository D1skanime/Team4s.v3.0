# Phase 163 – Auftrag des Auftraggebers (wörtlich, 2026-09-17)

Phase 163 – Öffentliche Anime-Seite:
Episoden nach Fansub-Gruppe und vorhandenen Releases filtern

## Ausgangslage

Arbeite auf dem aktuellen Stand des Team4s-Repositories auf der VM.

Betroffene öffentliche Seite: /anime/[id]

Auf der öffentlichen Anime-Seite gibt es eine Fansub-Gruppenauswahl, z. B.:
[ Alle ] [ AnimeOwnage ] [ Project Messiah ]

Aktuell ist die Filtersemantik unvollständig: Wenn z. B. AnimeOwnage ausgewählt wird, bleiben weiterhin Episoden sichtbar, für die AnimeOwnage gar kein Release besitzt.

Beispiel Naruto: Folge 23 wurde nur von Project Messiah bearbeitet. Wenn AnimeOwnage aktiv ist, darf Folge 23 deshalb nicht sichtbar bleiben.

## Ziel

Der Fansub-Gruppenfilter soll ein echter Episodenfilter sein.

Die öffentliche Anime-Seite soll grundsätzlich nur Episoden anzeigen, zu denen mindestens ein relevantes Release existiert.

Bei ausgewählter konkreter Fansub-Gruppe sollen nur die Episoden erscheinen, für die diese Gruppe mindestens eine Release-Version besitzt oder an einer Coop-Version beteiligt ist.

## 1. Grundregel für sichtbare Episoden

Eine Episode wird auf der öffentlichen Anime-Seite nur angezeigt, wenn mindestens eine öffentliche Release-Version existiert. Episoden ohne jede Release-Zuordnung sollen nicht angezeigt werden.

Beispiel: Anime besitzt 220 Episoden. Davon besitzen aktuell nur 1–15, 23, 24, 30–40 mindestens ein Fansub-Release. Dann zeigt die öffentliche Team4s-Seite nicht automatisch alle 220 Episoden, sondern nur diese Episoden mit dokumentierter Fansub-Aktivität.

Die Anime-Stammdaten dürfen natürlich weiterhin 220 Episoden als Gesamtzahl kennen. Die öffentliche Release-Übersicht ist aber keine vollständige Episoden-Enzyklopädie, sondern dokumentiert die vorhandenen Fansub-Releases.

## 2. Verhalten bei „Alle“

Wenn „Alle“ aktiv ist, werden alle Episoden angezeigt, die mindestens eine öffentliche Release-Version besitzen.

Beispiel:
- Folge 1 – AnimeOwnage, Project Messiah
- Folge 2 – AnimeOwnage
- Folge 23 – Project Messiah
- Folge 24 – AnimeOwnage + Project Messiah

Dann zeigt „Alle“: Folge 1, 2, 23, 24. Nicht anzeigen: Folgen ohne irgendein Release.

## 3. Verhalten bei konkreter Fansub-Gruppe

Wenn eine konkrete Gruppe ausgewählt ist, werden nur Episoden angezeigt, für die diese Gruppe mindestens eine passende Release-Version besitzt.

Beispiel AnimeOwnage aktiv (Daten wie in §2): sichtbar Folge 1, 2, 24; nicht sichtbar Folge 23.

Folge 23 darf nicht als leere Karte stehen bleiben und auch keinen Text wie „Keine Version dieser Gruppe verfügbar“ anzeigen. Sie wird vollständig aus der Liste entfernt.

## 4. Filterung innerhalb der Episode

Der Gruppenfilter gilt auf zwei Ebenen.

Ebene A – Episode sichtbar? Episode nur anzeigen, wenn die ausgewählte Gruppe mindestens eine relevante Version besitzt.

Ebene B – welche Releases innerhalb der Episode? Wenn die Episode geöffnet wird, ebenfalls nur die zur aktiven Gruppe passenden Release-Versionen anzeigen.

Beispiel: Folge 1 besitzt Version A – AnimeOwnage und Version B – Project Messiah. AnimeOwnage aktiv: Folge 1 bleibt sichtbar, innerhalb der Episode nur Version A. Bei „Alle“: beide Versionen.

## 5. Coop-Semantik

Eine Coop-Version gehört fachlich zu jeder beteiligten Fansub-Gruppe.

Beispiel Release-Version AnimeOwnage + Project Messiah: Episode sichtbar bei Alle, AnimeOwnage und Project Messiah. Die Coop-Version bleibt bei beiden Gruppenfiltern sichtbar.

Keine Primärgruppe erfinden. Keine Coop-Version nur einer der beteiligten Gruppen zuschlagen. Die bestehende Mehrgruppen-Zuordnung aus dem Datenmodell verwenden.

## 6. Keine clientseitige Scheinfilterung über Teilmenge

Vor der Umsetzung prüfen, wie die Episoden aktuell paginiert / begrenzt werden.

WICHTIG: Die Filterung darf nicht nur auf bereits im Browser geladenen Episoden stattfinden, wenn der Endpoint paginiert oder limitiert ist.

Beispiel: Backend liefert die ersten 24 Episoden. AnimeOwnage hat nur Releases bei Folge 30 und 31. Wenn das Frontend nur die ersten 24 Datensätze lädt und lokal filtert, würde es fälschlicherweise „Keine Episoden“ anzeigen.

Deshalb muss die Gruppenfilterung auf der Daten-/Query-Ebene korrekt in die Pagination integriert werden.

## 7. Serverseitiger Filter

Bestehenden Public-Episoden-Endpoint prüfen. Falls bereits Filtermechanismen vorhanden sind: diese erweitern. Falls nicht: kleinstmöglichen additiven Filter einführen.

Sinngemäß: `GET /api/v1/anime/{id}/episodes?projection=public&fansub_group=<stable-key>&limit=...`

Die konkrete Query-Parameter-Konvention aus dem bestehenden Projekt ableiten. Keine URL aus diesem Auftrag blind übernehmen.

Geeigneten stabilen Schlüssel prüfen: Gruppen-ID, Slug, anderer öffentlicher Key. Frontend- und Backend-Konvention müssen konsistent sein.

## 8. Pagination / Cursor

Falls Cursor-Pagination verwendet wird: Filterkontext muss Bestandteil des Cursor-Scope sein. Ein Cursor aus AnimeOwnage darf nicht bei Project Messiah oder Alle weiterverwendet werden.

Bei Wechsel des Gruppenfilters: Episodenliste zurücksetzen, Pagination neu starten, keine Daten aus altem Filterzustand anhängen.

## 9. Episodenanzahl

Prüfen, was aktuell bei „Episoden (220)“ angezeigt wird. Zwei Begriffe sauber unterscheiden:
A. Gesamtzahl der Episoden des Anime
B. Anzahl der aktuell sichtbaren Episoden mit Releases

Die bestehende Fachlichkeit prüfen. Nicht stillschweigend die 220 in eine gefilterte Trefferzahl umdeuten, wenn sie als Anime-Gesamtzahl gedacht ist.

Falls UX-seitig sinnvoll, kann später z. B. „Episoden (220) · 18 mit Releases“ oder bei aktivem Filter „AnimeOwnage · 12 Folgen“ entstehen. Aber keine neue Anzeige eigenmächtig einführen, wenn dafür noch keine UI-Entscheidung getroffen wurde. Für diese Phase zuerst fachlich korrekte Filterung sicherstellen.

## 10. Public Visibility

Nur Releases berücksichtigen, die nach bestehender Public-Visibility-Logik auf der öffentlichen Anime-Seite sichtbar sein dürfen. Keine versteckten / internen / nicht veröffentlichten Versionen verwenden, nur um eine Episode sichtbar zu machen.

Fail closed. Eine Episode ohne öffentlich sichtbare Version bleibt öffentlich unsichtbar.

## 11. Performance

Die Filterung darf kein N+1 erzeugen. Insbesondere NICHT: Episode laden, danach pro Episode Release-Versionen einzeln abfragen, danach pro Version Gruppen einzeln abfragen.

Bestehende Query-Struktur analysieren und Filter möglichst direkt über die bestehenden Joins / EXISTS-Bedingungen abbilden. Ziel: Die Query-Kosten sollen mit vielen Episoden und Gruppen stabil bleiben.

Explizit prüfen: Naruto mit 220 Episoden, mehrere Gruppen, mehrere Versionen pro Episode, Coop-Zuordnungen.

## 12. Reihenfolge

Die bestehende Episodenreihenfolge beibehalten. Gruppenfilter ändert nur die sichtbare Menge, nicht die fachliche Episodenreihenfolge (z. B. Folge 1, 2, 24, 31 – nicht nach Release-Datum oder Gruppenname neu sortieren).

## 13. Deep Link / URL-Zustand

Phase 162 definiert den Gruppen-Kontext über die URL. Phase 163 muss denselben Gruppen-Kontext für die Episodenfilterung verwenden. Es darf keine zweite, unabhängige Gruppen-Auswahl nur für Episoden geben.

Ein URL-Zustand wie sinngemäß `/anime/123?fansub=animeownage` muss gleichzeitig:
- AnimeOwnage als aktive Gruppe darstellen
- AnimeOwnage-Geschichte / Navigation laden
- nur AnimeOwnage-relevante Episoden anzeigen
- innerhalb der Episoden nur AnimeOwnage-relevante Releases anzeigen

Eine gemeinsame Source of Truth.

## 14. Leerer Zustand

Es kann vorkommen, dass eine Gruppe zwar dem Anime zugeordnet ist, aktuell aber keine öffentlich sichtbare Release-Version besitzt. Diesen Fall robust behandeln.

Wenn eine konkrete Gruppe ausgewählt ist und keine passenden Episoden existieren: einen kompakten neutralen Empty State anzeigen, sinngemäß „Für diese Fansub-Gruppe sind derzeit keine öffentlichen Releases hinterlegt.“ Kein technischer Fehlertext. Keine leeren Episodenkarten.

Vor Umsetzung prüfen, ob dieser Zustand durch die Fachlogik überhaupt regulär auftreten kann.

## 15. Tests

Mindestens:
- A. Episode ohne Release – bei „Alle“ nicht sichtbar
- B. Episode mit einer Gruppe – bei „Alle“ sichtbar, bei passender Gruppe sichtbar, bei anderer Gruppe unsichtbar
- C. Episode mit zwei getrennten Versionen (AnimeOwnage / Project Messiah) – „Alle“: beide; AnimeOwnage: nur AO-Version; Project Messiah: nur PM-Version
- D. Coop-Version – Episode bei beiden beteiligten Gruppen sichtbar, Coop-Version bei beiden Filtern sichtbar
- E. Folge nur von Project Messiah – AnimeOwnage aktiv – Episode vollständig unsichtbar; expliziter Naruto-Regressionstest
- F. Pagination – passende Episoden erst hinter der ersten Page, Filter findet sie trotzdem
- G. Filterwechsel – Alle → AnimeOwnage → Project Messiah → Alle, keine vermischten Pagination-Daten
- H. ungültiger Gruppenfilter – bestehende Phase-162-Fallback-Regel respektieren
- I. nicht öffentliche Release-Version – macht Episode öffentlich nicht sichtbar
- J. Performance – keine Query-pro-Episode-Struktur

## 16. Verifikation mit realen Daten

Nach Umsetzung im Browser mindestens Naruto prüfen: AnimeOwnage auswählen → Folgen, die ausschließlich Project Messiah bearbeitet hat, verschwinden (insbesondere Folge 23). Danach Project Messiah auswählen → entsprechende PM-Folgen erscheinen. „Alle“ auswählen → beide Gruppen gemeinsam. Zusätzlich mindestens einen Coop-Fall prüfen, falls im Datenbestand vorhanden.

## 17. Bestehenden Code analysieren

Vor Umsetzung dokumentieren: aktueller Episode-Endpoint, aktuelle Pagination, aktuelle Release-Version-Zuordnung, aktuelle Gruppenfilterlogik, aktuelle Public-Visibility-Bedingungen, aktuelle SQL-Query-Anzahl. Erst danach planen / implementieren. Keine parallele zweite Filterlogik neben einer bereits vorhandenen Struktur aufbauen.

## Arbeitsweise

1. Aktuellen Datenfluss nachvollziehen. 2. Reproduzierbaren Naruto-Fall Folge 23 verifizieren. 3. Backend-Query / Repository analysieren. 4. Bestehende Public-Visibility-Regeln prüfen. 5. Pagination berücksichtigen. 6. Kleinstmögliche konsistente Änderung planen. 7. Tests zuerst für den bekannten Fehler ergänzen. 8. Umsetzung. 9. Backend-Tests. 10. Frontend-Tests. 11. Browser-UAT mit Naruto. 12. Query-/Performance-Kontrolle.

Keine unrelated Refactorings.

## Abschlussbericht

Am Ende berichten: Ursache des bisherigen Fehlverhaltens; welche Filterlogik vorher vorhanden war; wie die Episodensichtbarkeit jetzt bestimmt wird; wie Release-Versionen innerhalb einer Episode gefiltert werden; wie Coop behandelt wird; wie Pagination / Cursor angepasst wurde; wie Public Visibility berücksichtigt wird; Query-/Performance-Auswirkungen; Naruto Folge 23 vorher / nachher; Tests; Build / Typecheck / Lint; Browser-Verifikation; offene Befunde.
