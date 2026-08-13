# Phase 59: Öffentliches Fansub-Member-Profil - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 59-ffentliches-fansub-member-profil
**Areas discussed:** Route & URL-Struktur, Sichtbarkeit & Zugangskontrolle, Dargestellte Inhalte, Komponenten-Wiederverwendung

---

## Route & URL-Struktur

| Option | Description | Selected |
|--------|-------------|----------|
| /members/[slug] | Fansub-Szene-Name als Slug — menschenlesbar, passt zu /fansubs/[slug] | ✓ |
| /me/public/[slug] | Unterhalb der /me/-Hierarchie | |
| /members/[id] | Member-ID statt Slug | |

**User's choice:** `/members/[slug]`
**Notes:** Slug basiert auf normalisiertem `fansub_name`; bei Konflikten Fallback auf `member_id`. Wichtige Einsicht vom User: Das Profil wird von vielen Stellen aus verlinkt — Beiträge, Medien-Uploads, Fansub-Mitgliederlisten, Direktaufruf.

---

| Option | Description | Selected |
|--------|-------------|----------|
| fansub_name normalisiert | Einfach, kein neues DB-Feld, kann sich ändern | |
| Separates slug-Feld | Unveränderlich, aber Migration nötig | |
| member_id als Fallback | Hybrid: Slug-Versuch, dann ID | ✓ |

**User's choice:** `member_id als Fallback`

---

| Option | Description | Selected |
|--------|-------------|----------|
| Alle Eintrittspunkte in Phase 59 | Profilseite + alle Links auf einmal | |
| Nur Profilseite, Links später | Nur Route, Links in Folge-Phase | ✓ |

**User's choice:** Nur die Profilseite. Links aus Medien/Beiträgen/Fansub-Mitgliederlisten kommen später.

---

## Sichtbarkeit & Zugangskontrolle

| Option | Description | Selected |
|--------|-------------|----------|
| 404 | Anonyme sehen keine Existenzhinweise | |
| Redirect zu /auth | Signalisiert Existenz, fordert Login | |
| Leere Seite mit Hinweis | Zeigt dass Profil existiert aber nicht zugänglich | ✓ |

**User's choice:** Leere Seite mit „Dieses Profil ist nicht öffentlich zugänglich."

---

| Option | Description | Selected |
|--------|-------------|----------|
| Vollständiges Profil sichtbar | Eingeloggte Members sehen alles | ✓ |
| Nur Name und Avatar | Konservativere Variante | |

**User's choice:** Vollständiges Profil für eingeloggte Members.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Backend-Prüfung | Neuer Endpoint prüft Sichtbarkeit serverseitig | ✓ |
| Frontend-Prüfung | API gibt alles, JS versteckt | |

**User's choice:** Backend-Prüfung. Datenschutzkonform, kein Leaken via Network-Tab.

---

## Dargestellte Inhalte

| Option | Description | Selected |
|--------|-------------|----------|
| Name, Avatar, Bio | Basis-Identität | ✓ |
| Member-Story (TipTap) | member_story_html | ✓ |
| Aktivzeitraum | active_from/until_date | ✓ |
| Gruppen, Medien & Beiträge | Alle Phase-58-Sections | ✓ |

**User's choice:** Alles, aber **nur `fansub_name`** als Anzeigename — nicht den Keycloak `display_name`.
**Notes:** Wichtige Klarstellung vom User: fansub_name ist der Szene-Nick, der öffentlich erscheint. E-Mail und Keycloak-Daten dürfen nie auf der öffentlichen Seite erscheinen.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Neuer Endpoint /api/v1/members/[slug] | Klare Trennung, explizite Sichtbarkeitskontrolle | ✓ |
| Bestehenden /me/profile wiederverwenden | Scope-Mixing | |

**User's choice:** Neuer dedizierter Endpoint.

---

**Ergänzung vom User:** Auf dem öffentlichen Profil sollen auch die festen Fansub-Gruppenrollen des Members erscheinen (z.B. „Translator + Timer bei Doki Fansubs"). Diese sind klar von Release-Versionrollen zu trennen. Gruppen-Kacheln verlinken auf `/fansubs/[group_slug]`.

| Option | Description | Selected |
|--------|-------------|----------|
| Eigene MembershipsSection (Card-Block) | Gruppenlogo + Name + Gruppenrollen, Link zu /fansubs/[slug] | ✓ |
| Gruppen nur im Hero als Chips | Kompakt, kein Platz für Rollendetails | |

**User's choice:** Eigene MembershipsSection auf dem öffentlichen Profil.

---

## Komponenten-Wiederverwendung

| Option | Description | Selected |
|--------|-------------|----------|
| Gleiche Shell, kein Edit-Modus | Bestehende Komponenten mit isPublicView=true | ✓ |
| Eigenständiges Layout | Mehr Freiheit, aber Duplizierung | |
| Shared Component Library | Gemeinsame Basis herausziehen | |

**User's choice:** Option 1, mit Hinweis: MemberProfileHero ist noch nicht global und muss verschoben werden.

---

| Option | Description | Selected |
|--------|-------------|----------|
| In Phase 59 nach /components/profile/ verschieben | Globalisierung jetzt | ✓ |
| In Phase 59 duplizieren, später globalisieren | Schnell aber Divergenz | |
| Eigener PublicMemberHero | Maximale Freiheit | |

**User's choice:** In Phase 59 globalisieren — MemberProfileHero, RecentMediaSection, RecentContributionsSection nach `frontend/src/components/profile/`.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Alle drei nach /components/profile/ | Sauberer Schnitt | ✓ |
| Nur Hero, Sections bleiben | Cross-import | |

**User's choice:** Alle drei globalisieren.

---

## Claude's Discretion

- Konkrete Datenbankabfrage-Implementierung für Slug-Auflösung mit Fallback
- HTTP-Statuscodes für Edge Cases (ungültiger Slug, Member existiert nicht → 404 vs. 400)
- CSS/Layout-Details der neuen MembershipsSection auf dem öffentlichen Profil

## Deferred Ideas

- Links aus Medien-Uploads zu `/members/[slug]` — Folge-Phase
- Links aus Beiträgen zu `/members/[slug]` — Folge-Phase
- Links aus Fansub-Mitgliederlisten zu `/members/[slug]` — Folge-Phase
- SEO-Metadaten für öffentliche Profilseiten
- Paginierung der Beiträge/Medien (mehr als 3 anzeigen)
