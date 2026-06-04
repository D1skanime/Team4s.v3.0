# Phase 74: Public Member Profile `/members/[slug]` + Memorial - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-04
**Phase:** 74-public-member-profile-members-slug-memorial
**Areas discussed:** Seiten-Aufbau (3 Ebenen), Contribution-Filter & Rollen, Status/Memorial/Badges, Write-Scope

---

## Gray-Area-Auswahl

| Option | Description | Selected |
|--------|-------------|----------|
| Seiten-Aufbau (3 Ebenen) | Layout/Reihenfolge der drei Ebenen | ✓ |
| Contribution-Filter & Rollen | Filter-Ort, Detail-Subtypes, unbestätigte | ✓ |
| Status, Memorial & Badges | Status-UI, Memorial-Variante, Badge-Kuration | ✓ |
| Write-Scope (74) | Welche Schreibaktionen shippen | ✓ |

**User's choice:** Alle vier Bereiche.

---

## Seiten-Aufbau (3 Ebenen)

### Layout-Paradigma
| Option | Description | Selected |
|--------|-------------|----------|
| Scroll-Seite + Sticky-Nav (analog 73) | Kuratierte einspaltige Erzähl-/Scroll-Seite, Sticky-Anker-Nav / Chip-Leiste | ✓ |
| Tabs (Ebenen als Reiter) | Drei Ebenen als drei Tabs | |
| Hybrid (Hero fix + Tabs darunter) | Hero/Highlights oben, darunter Tabs | |

**User's choice:** Scroll-Seite + Sticky-Nav (analog 73). → **D-01**

### Sektions-Reihenfolge
| Option | Description | Selected |
|--------|-------------|----------|
| Hero → Bekannt für/Badges → Gruppen/Geschichte → Contributions | Badges prominent oben, Contributions zuletzt | ✓ |
| Hero → Gruppen/Geschichte → Contributions → Badges | Badges ans Ende | |
| Hero → Contributions → Gruppen/Geschichte | Contributions direkt nach Hero | |

**User's choice:** Hero → Bekannt für/Badges → Gruppen/Geschichte → Contributions. → **D-02**

### „Bekannt für"/Highlights-Herkunft
| Option | Description | Selected |
|--------|-------------|----------|
| Automatisch abgeleitet (read-only) | Aus vorhandenen Daten berechnet, kein neues Feld/Flow | ✓ |
| Kuratierbares Feld (Owner pflegt) | Neues DB-Feld + Schreib-Flow + Contract | |

**User's choice:** Automatisch abgeleitet (read-only). → **D-03**

---

## Contribution-Filter & Rollen

### Filter-Ort
| Option | Description | Selected |
|--------|-------------|----------|
| Client-seitig auf geladener Timeline | useMemo, kein Contract-Change | ✓ |
| Server-seitig (Query-Params) | DTO/Contract-Arbeit, Pagination | |

**User's choice:** Client-seitig. → **D-06**

### Detail-Subtypes-Ort
| Option | Description | Selected |
|--------|-------------|----------|
| Inline-Expand pro Contribution | Aufklappen zeigt Subtypes/Notes inline | ✓ |
| Detail-Drawer | Seitlicher Drawer | |
| Nur Hauptrolle (Detail später) | Subtypes vorerst nicht im Profil | |

**User's choice:** Inline-Expand pro Contribution. → **D-07**

### Darstellung unbestätigter/historischer Contributions
| Option | Description | Selected |
|--------|-------------|----------|
| Sichtbar, aber gedämpft + Badge „unbestätigt" | Bestätigte prominent, unbestätigte gedämpft, Filter toggelt | ✓ |
| Standardmäßig ausgeblendet, per Filter zuschaltbar | Nur bestätigte by default | |

**User's choice:** Sichtbar, aber gedämpft + Badge „unbestätigt". → **D-08**

---

## Status, Memorial & Badges

### Status-Darstellung im Hero
| Option | Description | Selected |
|--------|-------------|----------|
| Status-Pill neben Nickname + Tooltip | Farbcodierte Pill + Tooltip | ✓ |
| Status nur als Text in Hero-Subline | Teil der Meta-Zeile | |
| Claimed/Unclaimed separat von Aktivitätsstatus | Zwei getrennte Marker | |

**User's choice:** Status-Pill + Tooltip. → **D-09**

### Memorial-Darstellung
| Option | Description | Selected |
|--------|-------------|----------|
| Eigene würdevolle Hero-Variante + Unterdrückung | Sonder-Hero, Gedenk-Sprache, Mengen-Badges/Aktivität aus, Beiträge würdig sichtbar | ✓ |
| Normales Layout + Gedenk-Banner | Gleiches Layout + Banner | |
| Stark reduziert (nur Identität + Gedenken) | Contributions weitgehend ausgeblendet | |

**User's choice:** Eigene würdevolle Hero-Variante + Unterdrückung. → **D-10**

### Badge-Kuratierung
| Option | Description | Selected |
|--------|-------------|----------|
| Top-N im Hero + „alle anzeigen"-Expand | Wenige prominent, Rest im Detail; Badge-Service, public | ✓ |
| Eigener Badge-Abschnitt, alle gleichwertig | Keine Hervorhebung weniger | |
| Owner pinnt Featured-Badges | Neues „featured"-Feld + Flow | |

**User's choice:** Top-N im Hero + „alle anzeigen"-Expand. → **D-11**

---

## Write-Scope (74)

### Welche Schreibaktionen (1. Runde)
**User's response (Other/Freitext):** Rückfrage statt Auswahl — „Gilt memorial für
historisch wie auch app user? … manche sterben, andere sind schon gestorben … Platform
Admin kann immer alles und jeder Schritt muss geloggt sein … Log muss aber nicht
öffentlich sein."

**Klärung (Claude):** `memorial` = Status auf dem **Member-Profil** (`members`), gilt
für jedes Profil (historisch ODER geclaimt); `app_user`-Account unberührt; nur Global
Admin setzbar; alles auditiert; Audit nicht öffentlich. → **D-13, D-14, D-15**

### Write-Scope (2. Runde, mit Klarstellungen)
| Option | Description | Selected (Runde 2) |
|--------|-------------|----------|
| Memorial-Setter (Global Admin, auditiert) | Endpoint + minimale Admin-UI | ✓ |
| Claim-Sperre (Memorial, server-seitig + auditiert) | Server-Reject + UI-Hinweis | (zunächst nicht markiert) |
| Korrektur-melden (review-gebundener Vorschlag) | Public-Aktion → Vorschlag | (zunächst nicht markiert) |

**Notes:** Claim-Sperre (Krit. 4 + Phase-72 D-06) und Korrektur-melden (Krit. 3) sind
ROADMAP-Locks dieser Phase, nicht frei wählbar — Claude hat das aufgezeigt.

### Locks-Klärung
| Option | Description | Selected |
|--------|-------------|----------|
| Alle drei in 74 behalten (empfohlen) | Setter + Claim-Sperre + Korrektur-melden | ✓ |
| Setter + Claim-Sperre; Korrektur-melden abspalten | ROADMAP-Änderung nötig | |
| Nur Setter; Rest später | Verletzt D-06, Krit. 3+4 offen | |

**User's choice:** Alle drei in 74 behalten. → **D-12**

### Memorial-Setter-Ort
| Option | Description | Selected |
|--------|-------------|----------|
| Global-Admin-Steuerung auf dem Member-Profil | Dezente Admin-Aktion auf /members/[slug] | |
| Im Fansub Leader Workspace | Einhängung in /admin/fansubs/[id]/edit | ✓ |
| Nur Backend-Endpoint (UI minimal/später) | API-only bis Phase 80 | |

**User's choice:** Im Fansub Leader Workspace. → **D-16**
**Notes (Claude):** Caveat festgehalten — Aktion bleibt Global-Admin-only + global
wirkend; Workspace ist nur Einstiegspunkt, nicht Capability-Scope.

### Korrektur-melden: Wer + Was
| Option | Description | Selected |
|--------|-------------|----------|
| Nur registrierte User, Freitext + Zielbezug | Submitter-ID, Zielkontext, Freitext → review-gebunden | ✓ |
| Auch anonym/öffentlich (ohne Login) | Niedrigere Hürde, kein Audit | |
| Registriert, strukturierte Felder (kein Freitext) | Strukturierte Auswahl statt Text | |

**User's choice:** Nur registrierte User, Freitext + Zielbezug. → **D-18**

---

## Claude's Discretion

- Konkrete Public-Badge-Quelle für den angezeigten Member (DTO-Erweiterung vs. public
  Badge-Endpoint) — Lock K.
- Ziel-/Reuse-Struktur des Korrektur-Vorschlags (Proposal-/Review-Tabelle) — Lock H/K.
- Exakte Audit-Tabelle/-Mechanik (D-15).
- Komponenten-Split, CSS-Module, Sticky-Nav-/Chip-Implementierung, Top-N-Schwelle,
  „Bekannt für"-Kennzahlen, Filter-UI-Form.

## Deferred Ideas

- `/admin/users` + User Detail Drawer → Phase 80.
- Account-Deaktivierung beim Memorial-Setzen → nicht in 74.
- Server-seitige Contribution-Filterung/Pagination → bei Volumen-Bedarf.
- Owner-gepinnte „featured" Badges / kuratierbares „Bekannt für" → /me-Erweiterung.
- Leader-Review der Korrekturvorschläge → Phase 78; breitere Vorschläge → Phase 76.
- Moderierte „Erinnerungen" an Memorial-Profilen → eigener Slice.
