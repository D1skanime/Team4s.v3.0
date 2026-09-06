# Auftrag Phase 150 — Badge Rules: Single Source of Truth

**Eingegangen:** 2026-09-06 (Nutzerauftrag, wörtlich festgehalten)
**Status:** angenommen, Ausführung nach Abschluss von Phase 149

## Ziel

Bereinige ausschließlich die fachliche Doppelhaltung der Badge-Regeln zwischen Backend und
Frontend. Die Rollen-/Role-Registry-Hardcodierungen aus Phase 147 sind bereits erledigt und
dürfen nicht erneut aufgemacht werden.

**Noch keine Arbeiten an:** Badge-Karussell, Scroll-/Settle-Verhalten, Badge-Bildgrößen,
WebP/AVIF, allgemeiner Member-Profile-Performance, großen `MemberBadgeChain`-Refactorings.

## Ausgangslage (vom Nutzer genannte Kandidaten — im Code zu bestätigen)

Badge-Schwellen werden teilweise sowohl im Backend als auch im Frontend gepflegt.

- **Role Volume:** Bronze 12, Silber 108, Gold 320, Platin 510
- **Points:** 1, 50, 200, 500, 1000, 2500
- **Membership:** 5, 7, 10 Jahre
- **Contributions / Projects:** 1/5/15 · 10/50/150 · 10/50/150 · 10/25/50

Der tatsächliche aktuelle Code ist zu prüfen; alle betroffenen Badge-Familien sind zunächst
zu bestätigen.

## 1. Datenfluss verstehen

Badge-Datenfluss vollständig verfolgen:
`DB / Repository -> Service -> Public Member Profile API -> TypeScript Types -> MemberBadgeChain / Badge UI`

Für jede Badge-Familie feststellen: Wo wird der aktuelle Wert ermittelt? Wo werden Thresholds
definiert? Wo wird das aktuelle Tier berechnet? Wo das nächste Tier? Wo "remaining"? Wo
Progress/Prozent? Welche Berechnung findet im Frontend erneut statt?

Nicht auf Vermutungen optimieren.

## 2. Backend als autoritative fachliche Quelle

Grundprinzip: **Badge-Fortschrittsregeln und Schwellen sind Business-Logik und sollen
serverautoritativ sein.** Das Frontend soll möglichst nur darstellen.

Prüfen, ob bestehende DTOs bereits genügend Daten liefern, etwa: Badge-/Family-Code,
aktuelles Tier, aktueller Wert, Threshold des aktuellen Tiers, nächster Threshold,
verbleibender Wert bis zur nächsten Stufe, achieved/completed, ggf. Progress-Wert.
Nicht zwingend exakt diese Feldnamen verwenden.

Bestehende API-Strukturen bevorzugt erweitern, statt einen neuen parallelen Badge-Endpoint
einzuführen.

## 3. Frontend-Doppelhaltung entfernen

Wenn das Backend eine Badge-Entscheidung bereits getroffen hat, darf das Frontend dieselbe
Business-Regel nicht noch einmal anhand eigener Threshold-Tabellen berechnen.

Gezielt prüfen: `memberBadgeLabels.ts`, Badge-Progress-Helfer, `MemberBadgeChain`, weitere
Badge-/Achievement-Utilities.

Threshold-Listen nur dort behalten, wo sie wirklich reine Präsentationsdaten sind.

- **Legitime Präsentation:** Titel, Beschreibung, Artwork-Pfad, CSS-/Darstellungsmetadaten.
- **Nicht legitim:** „Gold beginnt bei 320", „nächste Stufe ist bei 510", „es fehlen noch 27",
  fachliche Tier-Auswahl — wenn das Backend diese Information bereits kennt oder kennen sollte.

## 4. Rollen-Badges nicht wieder hardcodieren

Phase 147 hat die Rollenregistry bereits bereinigt. Daher: keine neue manuelle Rollenliste,
keine Label→Code-Rückauflösung, keine zweite Rollenregistry für Badges, stabile `role_code`-Werte
verwenden. Falls `role_entry_*` dynamisch generiert wird, dieses Prinzip erhalten.

## 5. Badge-Codes vs. Badge-Regeln unterscheiden

Badge-Codes dürfen als stabiler Vertrag existieren. `role_entry_timer_gold` ist nicht automatisch
problematisches Hardcoding. Problematisch ist, wenn aus dem Code erneut die Business-Regel
rekonstruiert wird.

Sauber unterscheiden zwischen:
- **Identität:** Badge-Code, Family-Code, Tier-Code
- **Business-Regel:** Threshold, Berechnung, Progression
- **Präsentation:** Label, Artwork, Beschreibung

## 6. Tests

Bestehende Backend- und Frontend-Badge-Tests prüfen. Neue Tests sollen sicherstellen:

- Backend ist autoritativ für Badge-Tier und Threshold
- Frontend berechnet Thresholds nicht erneut
- Änderung eines Backend-Thresholds benötigt keine parallele TypeScript-Anpassung
- Role-Volume funktioniert für verschiedene `role_code`
- Points-Badges funktionieren
- Membership-Badges funktionieren
- Contribution-/Project-Badges funktionieren
- completed/max-tier hat kein falsches `next_threshold`
- `remaining` kann nicht negativ werden
- bestehende Profile bleiben API-kompatibel oder Contract wird sauber angepasst

Falls bisher ein Anti-Drift-Test nur zwei Threshold-Listen miteinander vergleicht und die
Doppelhaltung nach dem Fix verschwindet: den Test entfernen oder durch einen sinnvolleren
Contract-Test ersetzen.

## 7. Zielzustand

**Eine Änderung einer Badge-Schwelle wird an genau einer fachlich autoritativen Stelle
vorgenommen.**

Das Frontend darf danach nicht wissen müssen: „Bronze beginnt bei 12, Gold bei 320 usw."
Es darf nur wissen: „Backend sagt: aktueller Stand X, nächstes Ziel Y, Tier Z."

## Scope

Ausschließlich Badge-Regeln / Badge-Progress-Single-Source-of-Truth.

**Nicht bearbeiten:** Carousel UX, `FocalCarousel`, Swipe, Animationen, Settle-Timer,
Bildkomprimierung, Lazy Loading, öffentliche Profil-Ladezeit allgemein, SQL-Performance
außerhalb notwendiger Badge-Abfragen, neue Badge-Familien, neues Artwork, neues Badge-Design.

## Vorgehen

1. Bestehende Badge-Architektur analysieren
2. Doppelhaltungen exakt dokumentieren
3. Bestehenden API-Vertrag prüfen
4. Kleinste sinnvolle Zielarchitektur festlegen
5. GSD-Plan erstellen
6. Danach umsetzen
7. Relevante Tests und Contract-Tests ausführen
8. Live prüfen, dass Badge-Progress weiterhin korrekt dargestellt wird

Keine unnötige Komplett-Neuentwicklung des Badge-Systems.

## Abschluss

Tests vollständig ausführen, Phase verifizieren, sauber committen, auf `origin/main` pushen.

Danach stoppen und berichten: entfernte Threshold-Doppelhaltungen, Ort der autoritativen
Badge-Regel, geänderte API-/DTO-Felder, entfernte Frontend-Berechnungen, angepasste/ergänzte
Tests, Testergebnis, Live-UAT-Ergebnis, Commit-Hash, verbleibende Badge-Rest-Gaps.

**Danach noch nicht automatisch das Karussell bearbeiten.**
