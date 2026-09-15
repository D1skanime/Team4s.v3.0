# Nachtest-Checkliste Phase 156 und 157

Alle Prüfungen über `http://127.0.0.1:3300`. Nach dem letzten Frontend-Neustart einmal Strg+F5.

Folgenzuordnung: Release 27 = Folge 1 · 28 = Folge 2 · 29 = Folge 3 · 40 = Folge 4 · 41 = Folge 5 ·
42 = Folge 6 · 47 = Folge 11.

Release-Seiten: `http://127.0.0.1:3300/fansubs/new-subs/fansubprojekt/buddy-complex/releases/<Release>`

> **Stand 2026-09-15 ~10:00 UTC:** GAP-08 und GAP-09 sind umgesetzt. Der Episode-Version-Editor bricht als
> **Plattform-Admin** derzeit mit „(500) interner serverfehler" ab (Jellyfin-Schlüssel ungültig, nur der
> Admin-Kontext fragt Jellyfin ab). Bis zum Fix die Segment-Punkte als **Type** prüfen, der Tab „Segmente" ist
> dort sichtbar.

## Phase 156 — Segmente

### Beschriftungen (GAP-06, mit GAP-09 geschärft)
1. **Folge 4** (`/releases/40`), Abschnitt „Karas", Karte „op": dort steht **„Qc · Karaoke-Übersetzung,
   Karaoke-Qualitätsprüfung"**.
2. Auf derselben Seite unter „An diesem Release beteiligt" steht Qc weiterhin mit den Release-Rollen
   („Übersetzung", „Qualitätsprüfung"), nicht mit den Karaoke-Beschriftungen.

### Origin bleibt gültig (GAP-04/GAP-05)
3. Segment-Editor „Buddy Opening 2": Das Feld „Segment-Origin" steht auf **Folge 2**.
4. Den Bereich eines Segments so ändern, dass seine Origin-Folge herausfällt → die Origin springt auf eine
   verbleibende Folge, nicht auf eine ungültige.
5. Eine einzelne Folge im Editor manuell zuweisen bzw. entfernen → keine kaputte Origin, keine verwaisten
   Mitwirkenden.

### Automatische Vorauswahl (GAP-07)
6. **Ohne etwas zu tun:** **Folge 2** (`/releases/28`) oder **Folge 3** (`/releases/29`), Karte „Buddy Opening 2".
   Erwartet: „Qc · Karaoke-Übersetzung, Karaoke-Qualitätsprüfung", „Type · Karaoke-FX, Karaoke-Typesetting",
   „timer · Karaoke-Timing", „Über · Karaoke-Übersetzung".
7. Segment-Editor „Buddy Opening 2", Bereich „Mitwirkende am Segment": **Qc, Über, timer, Type** sind
   ausgewählt, **Jeahn45** (Encoding) und **Desi** (Design) nicht.
   - **Ein-Folgen-Segment (GAP-08):** ✅ **Live bestätigt 2026-09-15 als Type:** bei „Kara time 1" (nur Folge 1)
     Qc abgewählt → Qc verschwindet öffentlich an dieser Karte, gespeichert und per API geprüft.
     Noch offen: Segment-Editor „Ending Buddy" (nur Folge 1). Die Origin steht dort **schreibgeschützt** als
     „Origin: Folge 1", ohne Auswahlfeld. „Mitwirkende am Segment" ist **sichtbar**, mit Qc, timer, Type und
     Über ausgewählt.
8. **„op" unverändert:** Folge 4 zeigt weiterhin **nur** Qc. Die bewusste Auswahl wurde nicht überschrieben.
9. **Neues Segment:** Ein neues OP nur für **Folge 11** anlegen. Auf `/releases/47` erscheinen die
   Kara-Mitwirkenden von Folge 11 automatisch, ohne dass du jemanden auswählst. **Encoder und Designer sind dabei
   nicht angehakt** (GAP-09).

### Teilmenge und Ausschlüsse
10. **Teilmenge:** Bei „Buddy Opening 2" **Über abwählen**, speichern → Über verschwindet von Folge 2/3, Qc bleibt.
11. **Bewusst leeren:** Alle Mitwirkenden abwählen, speichern → keine Namen mehr auf Folge 2/3. Danach die Origin
    oder den Bereich ändern → die Auswahl bleibt **leer** und wird **nicht** automatisch wieder befüllt.
12. **QC und Editor:** Folge 2 hat derzeit keinen Qualitätsprüfer und keinen Editor. Erst zwei Personen als
    Qualitätsprüfung und eine als Edit an Folge 2 eintragen. Für ein Segment, dessen Auswahl noch nie gepflegt
    wurde (z. B. ein neues), sind dann beide QCs und der Editor vorausgewählt. Einen QC abwählen → nur der
    verbliebene erscheint, als „Karaoke-Qualitätsprüfung"; der Editor als „Karaoke-Edit".
    - ✅ **Teilweise live bestätigt 2026-09-15:** Folge 1 hat zwei QCs (Qc, Desi). Nach dem Abwählen von Qc bei
      „Kara time 1" steht Desi weiter als „Karaoke-Qualitätsprüfung". Beachte: Die Auswahl gilt für die ganze
      Person, Qc verliert dort auch „Karaoke-Übersetzung".
13. **Origin wechseln** → nicht passende Mitwirkende verschwinden sauber.

### Encoding und Design als Segment-Credit (GAP-09)
14. **Folge 1** (`/releases/27`), Karte „Kara time 1" zeigt: „Desi · Karaoke-Qualitätsprüfung, Logo",
    „Jeahn45 · Karaoke-Encoding", „Type · Karaoke-FX, Karaoke-Typesetting", „timer · Karaoke-Timing",
    „Über · Karaoke-Übersetzung". (Per API bereits bestätigt.)
15. Segment-Editor, Bereich „Mitwirkende am Segment": Der Hinweistext sagt, dass Encoding und Design nicht
    automatisch vorausgewählt werden und bei Bedarf von Hand angehakt werden.
16. Bei „Buddy Opening 2" **Jeahn45 anhaken**, speichern → erscheint auf Folge 2/3 als **„Karaoke-Encoding"**.
    **Desi anhaken** → erscheint als **„Karaoke-Qualitätsprüfung, Logo"** bzw. „Logo", je nach Rollen an der Origin.
    Wieder abwählen → beide verschwinden.
17. Unter „An diesem Release beteiligt" bleiben die Release-Rollen unverändert („Encoding", „Design").

## Phase 157 — Projekt-Memberseite und Projektseite (ohne Login)

Memberseite: `/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type`

18. **V1:** Projektseite, „Mitwirkende am Fansub-Projekt" hat die weinrote Linie wie „Neuestes Release".
19. **V2:** Memberseite, „Texte & Notizen" und „Bilder & Medien" haben die weinrote Linie über die **volle Breite**
    der Karte. Die Zahl („12", „2") steht auf dem Handy und bei 200 % Zoom **in derselben Zeile** wie der Titel.
20. **V3:** Die Timeline-Punkte sind deutlich größer.
21. **V4:** Die Timeline-Linie ist dicker und trägt die Rollenfarbe. Bei einem Member mit zwei Rollen wechselt die
    Linienfarbe mit der Rolle des jeweiligen Eintrags.
22. **V5:** Sind alle Beiträge sichtbar, steht **kein** „Alle N angezeigt" mehr. Auf dem Handy bleibt bei Type
    „5 von 12 angezeigt" plus „Weitere 7 Beiträge anzeigen".
23. **V6:** Im Hero sind „12 Beiträge" und „2 Medien" unterstrichen, anklickbar und springen zur Sektion, auch auf
    dem Handy erkennbar. „13 Folgen" sieht normal aus und ist **nicht** anklickbar. Die schmale Tab-Karte ist weg.
24. **V6 Tastatur:** Mit Tab erreichst du beide Kennzahlen, der Fokus ist sichtbar, Enter springt.
    - *Optional, braucht Testdaten:* Im Projekt gibt es derzeit **keine** öffentliche Notiz mit Link. Wer das prüfen
      will, legt eine lange Notiz mit einem Link **am Textende** an. Eingeklappt darf Tab **nicht** auf diesem
      unsichtbaren Link landen, aufgeklappt schon.
25. **Zoom:** Browser auf 200 % zoomen → kein horizontales Scrollen, alles lesbar.
26. **Regression:** Mehr/Weniger anzeigen klappt ohne Sprung, Kartenklick öffnet das Release, die Rollenfarbe am
    Punkt stimmt.
