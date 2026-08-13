# Phase 88: Fansubber-Workspace & Contribution-Copy bereinigen - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 88-fansubber-workspace-contribution-copy-bereinigen
**Areas discussed:** Copy-Grenze, Betroffene Flächen, UAT-Regeln, Backlog-Schnitt

---

## Copy-Grenze

| Option | Description | Selected |
|--------|-------------|----------|
| Streng neutral | Überall Prüfung/Hinweis/Kontext/Zuordnung; keine Besitzsprache. | |
| Gemischt, aber vorsichtig | `Mein Profil` und `Meine Gruppen` bleiben okay; Anime-/Release-Credits neutraler. | x |
| Nur Problemstellen ändern | Nur aktiv claimlastige Stellen ändern. | |

**User's choice:** Gemischt, aber vorsichtig.
**Notes:** Der User hat klargestellt, dass die UI nicht zu bürokratisch werden soll. Ein User sagt schlicht `Ich war bei der Gruppe dabei` oder `Ich war bei dem Anime dabei`. Für Anime-/Release-Nähe wurde `Ich war in diesem Projekt dabei` gewählt, weil es menschlich bleibt und den neutralen Anime nicht als direkt beanspruchten Credit darstellt.

---

## Betroffene Flächen

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Member-Flächen | `/me/contributions`, `/me/profile`, `/me/releases/[versionId]/workspace`, `Meine Gruppen`. | x |
| Member + öffentliche Darstellung | Zusätzlich `/members/[slug]`, öffentliche Member-Credits, Anime-/Gruppen-Credit-Blöcke. | |
| Alles inkl. Admin-Fansub-Review | Zusätzlich `/admin/fansubs/[id]/edit`, Review-Queues, historische Mitglieder, Contribution-/Claim-Review-Copy. | |

**User's choice:** Nur Member-Flächen.
**Notes:** Öffentliche und Admin-Flächen werden deferred, damit Phase 88 klein und prüfbar bleibt.

---

## UAT-Regeln

| Option | Description | Selected |
|--------|-------------|----------|
| Sehr schlank | Mobile/desktop Layout, keine falsche Claim-Sprache, Links korrekt. | |
| Mittel | Zusätzlich Auth-Refresh-Fall, Modal/Keyboard, leere Zustände, disabled states. | x |
| Breiter | Jede Komponente/Statusgruppe/Fehlerzustand einzeln. | |

**User's choice:** Mittel.
**Notes:** Protected Member-UI berührt Auth, daher muss der Refresh-Session-Fall mit geprüft werden. Die UAT darf aber nicht in viele Claim-Sonderregeln ausarten.

---

## Backlog-Schnitt

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, genau so | In scope: Contribution UI, Profile Activity, Member-Profil UI/params.id, member-nahe Media/Note edit/delete. Deferred: Public/Admin-Todos. | x |
| Noch enger | Nur Contribution UI, Profile Activity, Member-Profil UI/params.id. | |
| Doch breiter | Admin/Public-Todos trotz Member-Fokus aufnehmen. | |

**User's choice:** Ja, genau so.
**Notes:** Alle acht Todo-Matches wurden gesichtet. Vier bleiben in Phase 88, vier werden als deferred festgehalten.

---

## the agent's Discretion

- Konkrete UI-Texte innerhalb der Copy-Grenze.
- Exakte technische Aufteilung der Tests.
- Ob bestehende globale UI-Primitives reichen oder eine kleine Erweiterung nötig ist.

## Deferred Ideas

- Public collaboration handling.
- Public Anime/group Credits-UI.
- Admin fansub edit split.
- Phase-78 media review warnings.
