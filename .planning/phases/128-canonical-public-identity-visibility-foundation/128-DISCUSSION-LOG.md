# Phase 128: Canonical Public Identity & Visibility Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-13
**Phase:** 128-canonical-public-identity-visibility-foundation
**Areas discussed:** Slug-Erzeugung und Kollisionen, Bedeutung der Profilsichtbarkeit, Owner-Vorschau, nicht-kanonische URLs

---

## Slug-Erzeugung und Kollisionen

### Initiale Identität

| Option | Description | Selected |
|--------|-------------|----------|
| Automatisch aus Nickname | Einmal bei Erstellung erzeugen und danach unveränderlich speichern | ✓ |
| Manuell festlegen | Ein Admin pflegt den initialen Slug | |
| Technische Kennung | Nicht sprechende stabile ID wie `m-8f42ab` | |

**User's choice:** Automatisch aus dem Nickname.
**Notes:** Nickname-Änderungen dürfen den gespeicherten Slug nicht ändern.

### Kollisionen

| Option | Description | Selected |
|--------|-------------|----------|
| Lesbares Nummernsuffix | `name`, `name-2`, `name-3`, transaktionssicher vergeben | ✓ |
| Zufälliges Suffix | Kurze zufällige Kennung anhängen | |
| Erstellung blockieren | Gleiche normalisierte Nicknames nicht zulassen | |

**User's choice:** Lesbares Nummernsuffix.
**Notes:** Gleiche Anzeigenamen bleiben erlaubt.

### Sonderzeichen

| Option | Description | Selected |
|--------|-------------|----------|
| Lesbare ASCII-Umschreibung | Umlaute und ß sprachlich lesbar transliterieren | ✓ |
| Zeichen vereinfachen | Akzente und Sonderzeichen lediglich entfernen | |
| Unicode behalten | Unicode-Zeichen direkt im URL-Pfad verwenden | |

**User's choice:** Lesbare ASCII-Umschreibung.
**Notes:** Vereinbartes Beispiel: `Müller & Söhne` → `mueller-und-soehne`.

### Ungültige oder reservierte Ergebnisse

| Option | Description | Selected |
|--------|-------------|----------|
| Erstellung stoppen | Klare Validierung; geeigneter Nickname/Initialwert erforderlich | ✓ |
| Technischen Ersatz vergeben | Automatischer Slug wie `mitglied-x7k4` | |
| Reservierte Namen nummerieren | Beispielsweise `ranking-2` | |

**User's choice:** Erstellung stoppen.
**Notes:** Keine stillen technischen oder numerischen Ersatzidentitäten.

---

## Bedeutung der Profilsichtbarkeit

### Zugriffsberechtigte

| Option | Description | Selected |
|--------|-------------|----------|
| Nur verifizierter Owner | Private Profile sind ausschließlich als Owner-Vorschau sichtbar | ✓ |
| Jeder angemeldete Account | Login genügt für `members_only` | |
| Nur verifizierte Member | Login plus eigenes verifiziertes Memberprofil erforderlich | |

**User's choice:** Nur der verifizierte Owner.
**Notes:** Der Benutzer fragte, ob dies bereits umgesetzt sei. Die Codeprüfung zeigte nur partielle Umsetzung: Hauptprofil und Projekte prüfen erst nach dem vollständigen Detail-Load; Contributions umgehen die Regel; die Browser-Vorschau rekonstruiert Identität und DTO separat.

### Benennung

| Option | Description | Selected |
|--------|-------------|----------|
| `public` / `private` | Technische Werte entsprechen dem tatsächlichen Verhalten | ✓ |
| `members_only` intern | UI nennt den Zustand privat, Schema bleibt irreführend | |
| Echte dritte Stufe | `members_only` zusätzlich zu `private` einführen | |

**User's choice:** `public` und `private`.
**Notes:** Keine derzeit ungenutzte dritte Zugriffsstufe.

### Anonyme Besucher

| Option | Description | Selected |
|--------|-------------|----------|
| Neutrales HTTP 404 | Private und fehlende Profile sind nicht unterscheidbar | ✓ |
| HTTP 200 mit Hinweis | Nicht verfügbare Ressource erscheint technisch erfolgreich | |
| Weiterleitung | Rückkehr zur Member-Übersicht ohne Erklärung | |

**User's choice:** Neutrales HTTP 404.
**Notes:** Gewünschter Text: „Profil nicht verfügbar“.

### Angemeldete Nicht-Owner

| Option | Description | Selected |
|--------|-------------|----------|
| Dasselbe neutrale 404 | Existenz des privaten Profils wird nicht bestätigt | ✓ |
| Expliziter Privathinweis | Bestätigt, dass das Profil existiert | |
| Admin-Bypass öffentlich | Admins erkennen private Profile über dieselbe Route | |

**User's choice:** Dasselbe neutrale 404.
**Notes:** Administrative Einsicht gehört nicht in den öffentlichen Profilpfad.

---

## Owner-Vorschau

### Darstellung

| Option | Description | Selected |
|--------|-------------|----------|
| Vollständige Profilseite | Dieselbe spätere öffentliche Darstellung und Projektion | ✓ |
| Reduzierte Vorschau | Separater, unvollständiger Ausschnitt wie im heutigen Fallback | |
| Editor-Weiterleitung | Keine Vorschau unter der öffentlichen URL | |

**User's choice:** Vollständige Profilseite.
**Notes:** Die normale kanonische URL bleibt maßgeblich.

### Vorschauhinweis

| Option | Description | Selected |
|--------|-------------|----------|
| Dauerhafter Hinweis | Oberhalb des Profilkopfs, inklusive Link zu „Sichtbarkeit bearbeiten“ | ✓ |
| Kein dauerhafter Hinweis | Vorschau sieht ohne Zustandskennzeichnung öffentlich aus | |

**User's choice:** Dauerhafter Hinweis mit Bearbeitungslink.
**Notes:** Der private Zustand darf nicht übersehen werden.

### Auth-Ladeverhalten

| Option | Description | Selected |
|--------|-------------|----------|
| Auth zuerst klären | Refresh-only Session nutzen, höchstens neutraler Ladezustand, kein 404-Aufblitzen | ✓ |
| Erst anonym rendern | 404 kann kurz erscheinen und anschließend ersetzt werden | |

**User's choice:** Kein 404-Aufblitzen.
**Notes:** Die zentrale Auth-/Refresh-Seam bleibt alleinige Autorität.

### Aktionen

| Option | Description | Selected |
|--------|-------------|----------|
| Schreibgeschützte Vorschau | Bearbeitungslinks führen in den bestehenden Editor; keine Eigenmeldung | ✓ |
| Inline bearbeiten | Profilinhalt direkt in der öffentlichen Ansicht ändern | |

**User's choice:** Schreibgeschützte Vorschau.
**Notes:** Der Owner darf keine Korrekturmeldung gegen sein eigenes Profil absenden.

---

## Nicht-kanonische URLs

### Technisch gleichwertige Schreibweisen

| Option | Description | Selected |
|--------|-------------|----------|
| Permanent weiterleiten | Case-/Whitespace-/Encoding-Varianten führen zur einzigen kanonischen URL | ✓ |
| Direkt ausliefern | Mehrere URL-Schreibweisen zeigen denselben Inhalt ohne Redirect | |
| 404 liefern | Auch technisch äquivalente Varianten ablehnen | |

**User's choice:** Permanente serverseitige Weiterleitung.
**Notes:** Nur eine URL soll indexierbar sein.

### Neuer Nickname nach Umbenennung

| Option | Description | Selected |
|--------|-------------|----------|
| Neutral 404 | Der neu erratene Slug ist keine Identität und kein Alias | ✓ |
| Auf Original umleiten | Neuen Nickname als alternative URL registrieren | |
| Kanonischen Slug ändern | Öffentliche URL folgt jeder Umbenennung | |

**User's choice:** Neutral 404.
**Notes:** Interne Links verwenden weiterhin ausschließlich den gespeicherten ursprünglichen Slug.

### Numerische URLs

| Option | Description | Selected |
|--------|-------------|----------|
| Neutral 404 | IDs sind weder Fallback noch alternative öffentliche Identität | ✓ |
| Auf Slug umleiten | Numerische ID bleibt als alternativer Resolver aktiv | |
| Direkt ausliefern | Profil bleibt auch unter der ID erreichbar | |

**User's choice:** Neutral 404.
**Notes:** Interne IDs werden nicht öffentlich als Profilidentität verwendet.

### Bestehende Testdaten

| Option | Description | Selected |
|--------|-------------|----------|
| Reset und Reseed | Keine Aliase oder Kompatibilität; neue kanonische Ausgangslage | ✓ |
| Alias-Tabelle | Alte nickname-basierte URLs dauerhaft erhalten | |
| Einmaliger Backfill | Bestehende Testzeilen samt alten Ableitungen weitertragen | |

**User's choice:** Reset und Reseed.
**Notes:** Testzeilen sind ausdrücklich disposable.

---

## Agent's Discretion

- Genaue technische Namen und interne Struktur des Slug-Allocators und Access-Resolvers.
- Vollständige Reserved-Word-Liste und Normalisierung weiterer Akzente.
- Wahl zwischen HTTP 301 und 308 für sichere permanente Canonical-Redirects.
- Testdateiaufteilung und begrenzte Übergangsstruktur bis zu den späteren Refactor-Phasen.

## Deferred Ideas

- Vollständige Projektions-/Join-Korrektheit: Phase 129.
- DTO-/OpenAPI-/Frontend-Typbereinigung und der vollständige Params-Vertrag: Phase 130.
- Query-, Payload- und Pagination-Optimierung: Phase 131.
- Umfassende SSR-/Frontend-Konsolidierung: Phase 132.
- Responsive CSS, Accessibility und Bildauslieferung: Phase 133.
