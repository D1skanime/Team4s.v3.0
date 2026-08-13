# Phase 58: Profil-Hub Content, Membership Cards & Activity Preparation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 58-profil-hub-content-membership-cards-activity-preparation
**Areas discussed:** Membership Cards, Activity Section, Admin-Copy entfernen, Phase 59 Vorbereitung, Drawer-Navigation

---

## Drawer-Navigation (vom Nutzer eingebracht)

| Option | Description | Selected |
|--------|-------------|----------|
| Meine Gruppen-Seite (/me/groups) | Dedizierte Route mit mehr Kontext | |
| Globaler Drawer zeigt Gruppen-Schnellzugriff | Drawer „Mein Bereich" bekommt „Meine Gruppen" mit Logo+Name | ✓ |
| Beides vorbereiten, nichts produktiv schalten | Architektur entscheiden, Schaltung Phase 59 | |

**User's choice:** Globaler Drawer
**Notes:** Member sind selten in mehr als 3 Gruppen — separate Route lohnt nicht. Drawer zeigt Logo + Gruppenname, Klick geht direkt in den geschützten Gruppen-Contrib-Bereich, nicht auf eine öffentliche Seite.

---

## Membership Cards — Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Meine Gruppen-Seite (/me/groups) | Route als ehrlicher Stub in Phase 58 | |
| Globaler Drawer | Drawer „Mein Bereich" mit Gruppen-Links | ✓ |
| Beides vorbereiten | Architektur jetzt, Schaltung later | |

**User's choice:** Drawer (Bestätigung der vorigen Entscheidung)

---

## Membership Cards — Inhalt

| Option | Description | Selected |
|--------|-------------|----------|
| Vereinfachen: Logo + Name + aktive Rollen-Chips | Status-Badges, historische Links und Jahr-Badges fallen weg | ✓ |
| Logo + Name + Status + Rollen, ohne historischen Link | Gruppen-Status bleibt sichtbar | |
| Du entscheidest | Claude wählt sinnvolle Vereinfachung | |

**User's choice:** Vereinfachen (Logo + Name + aktive Rollen-Chips)
**Notes:** Im weiteren Verlauf wurde klargestellt: MembershipsSection wird komplett von der Profilseite entfernt. Gruppen wandern nur in den Drawer. Der freigewordene Platz auf der Profilseite wird durch „Meine letzten Medien" gefüllt.

---

## Membership Cards — Aktion

**Entscheidung per Freitext:** MembershipsSection wird nicht vereinfacht, sondern komplett entfernt. Auf der Profilseite gibt es keine Membership-Karte mehr. Mitgliedschaften erscheinen nur im Drawer.

---

## Activity Section

| Option | Description | Selected |
|--------|-------------|----------|
| 3 neueste Medien-Uploads (release_version_media) | Thumbnail, Kategorie, Releasename | Bereits entschieden für Medien-Slot |
| 3 neueste Beiträge (release_member_roles) | Anime-Titel, Gruppenname, Rolle | ✓ für Beitrags-Slot |
| Beides nebeneinander | Zwei kompakte Reihen | Ergebnis |

**User's choice:** Beide Sektionen bestätigt nach Claude-Empfehlung
**Notes:** Claude empfahl Beitrags-Kacheln aus `release_member_roles` weil sie echte Fansub-Identität zeigen statt abstrakte Credit-Aggregate. User stimmte zu.

---

## Admin-Copy entfernen

| Option | Description | Selected |
|--------|-------------|----------|
| Ehrlicher leerer Zustand ohne technischen Kontext | Einfach: „Noch keine Medien hochgeladen" | ✓ |
| Kurzer Hinweis mit Handlungs-Impuls | „Noch keine Beiträge — trag dich in Releases ein" | |

**User's choice:** Ehrlicher leerer Zustand ohne technischen Kontext

---

## Phase 59 Vorbereitung

| Option | Description | Selected |
|--------|-------------|----------|
| Nur saubere Daten und Komponenten — keine Phase-59-Infra | Phase 58 liefert /me/profile, Phase 59 baut Public-Profil | |
| Sichtbarkeits-Logik in Phase 58 vorbereiten | is_public-Check in neuen Sections von Beginn an | ✓ |
| Public-Profil-Route als Stub in Phase 58 | /members/[slug] als leere Seite | |

**User's choice:** Sichtbarkeitslogik in Phase 58 vorbereiten

---

## Claude's Discretion

Keine — alle Bereiche wurden vom Nutzer explizit entschieden.

## Deferred Ideas

- Separate `/me/groups`-Route
- Paginierter Contributions-Detail-Endpunkt
- Vollständige Public-Member-Page `/members/[slug]` — Phase 59
