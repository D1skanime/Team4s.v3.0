# Phase 83 — Design-Seed

**Erstellt:** 2026-06-11 (aus Richtungs-Diskussion nach Phase 82). Vor Discuss-Phase.
**Status:** Seed — gelockte Richtung + offene Fragen.

## Motivation / Kontext

Phase 82 hat Mitwirkende **anime-weit** zugeordnet (`anime_contributions`, Anker `members.id`, `release_version_id IS NULL`). Der Nutzer will jetzt **pro Release** zuordnen können: alle Teams sind standardmäßig auf jedes Release gemappt, aber pro Release soll man sagen können „dieser User war hier nicht dabei" und „der hat hier diese Rolle gemacht".

Daten-seitig ist die Grundlage da:
- `release_version_groups (release_version_id, fansub_group_id)` — welche Gruppe(n) an einem Release beteiligt sind.
- `anime_contributions.release_version_id BIGINT NULL` (Migration 0091) — NULL = anime-weit, gesetzt = nur diese Release-Version.
- `release_version_notes` + `release_version_media` (member_id + role_id scoped) — die eigentlichen Contributor-Inhalte pro Release.
- Permission-Engine `CanForReleaseVersion` (backend/internal/permissions/permissions.go:63-146, 240-244) prüft Gruppen-Mitgliedschaft + Rolle (heute aus `fansub_group_member_roles`, NICHT aus `anime_contributions`).

## Gelockte Richtung (Nutzer-Entscheidung)

1. **Reihenfolge:** Pro-Release-Zuordnung (Schicht A) ZUERST. Der member-zentrische Mitwirken-Einstieg (Schicht B) ist eine **Folge-Phase**.
2. **Contributor-Pfad (Schicht B, später):** dedizierter **`/me`-Bereich** (z.B. `/me/releases/...`), der die bestehenden Medien-/Notizen-Komponenten in einem Member-Shell wiederverwendet — klar getrennt vom `/admin`-Namespace. (NICHT Teil dieser Phase 83, aber Zielbild festhalten.)
3. **Schicht A (diese Phase):** UI im bestehenden Projekt-Cockpit, um pro Release-Version die Mitwirkenden/Rollen festzulegen; Default „alle Team-Mitglieder gemappt", plus Ausnahmen + Rollen-Overrides via `release_version_id`.

## Offene Fragen (für Discuss-Phase)

1. **Modellierung „war hier NICHT dabei" (Ausnahme/Absenz):** `anime_contributions` modelliert PRÄSENZ (wer hat beigetragen). Wenn der Default „anime-weite Contribution gilt für alle Releases" ist, braucht „X war auf Release Y nicht dabei" eine **negative Override**. Optionen: (a) per-Release-expliziter Roster, der den anime-weiten Default überschreibt (wenn für ein Release irgendein expliziter Eintrag existiert, gilt NUR der explizite Satz); (b) eine Ausschluss-/„excluded"-Markierung pro (member, release); (c) Status-Feld auf der Contribution. Datenmodell-Entscheidung.
2. **Rollen-Override pro Release:** „der hat hier Rolle Z gemacht" = eigener `anime_contributions`-Eintrag mit `release_version_id` gesetzt + anderen `role_codes`, der den anime-weiten Eintrag pro Release ersticht. Konfliktauflösung anime-weit vs. release-spezifisch klären.
3. **Feeds Mapping in PERMISSIONS?** Heute entscheidet `CanForReleaseVersion` über Gruppen-Mitgliedschaft + `fansub_group_member_roles` (Gruppen-Rolle), NICHT über `anime_contributions`. Soll die Pro-Release-Rollen-Zuordnung bestimmen, WER an einem Release Notizen/Media bearbeiten darf — oder ist sie reine Credit-/Anzeige-Information (Permissions bleiben gruppenbasiert)? Wichtige Entscheidung (Sicherheit + Scope).
4. **Einstieg im Cockpit:** Pro-Release-Sicht — pro Anime aufklappen → Release-Versionen → je Release Mitwirkenden-Editor. Verhältnis zu `release_version_groups` (Mehr-Gruppen-Releases / Collabs): nur Mitglieder beteiligter Gruppen wählbar?
5. **Verhältnis zu release_version_notes/media:** Bestimmt das Pro-Release-Mapping, wer in der Notizen-/Media-Maske als Mitwirkender erscheint? Konsistenz mit den bestehenden member+role-scoped Notizen.
6. **Default-Materialisierung:** „alle Teams auf jedes Release gemappt" — implizit (anime-weite Contributions gelten, solange kein release-spezifischer Override) oder explizit materialisiert? (Implizit bevorzugt — keine Datenflut.)

## Referenzen (verifiziert via Explore)

- Release-Edit-Editor: `frontend/src/app/admin/episode-versions/[versionId]/edit/page.tsx` (+ `EpisodeVersionEditorPage.tsx` Tab-/Capability-Logik Z.113-127, 281-377)
- Notizen: `ReleaseVersionNotesTab.tsx`; Media: `ReleaseVersionMediaSection.tsx`
- Contributor-Einstieg heute: `frontend/src/app/admin/my-groups/page.tsx` + `[id]/page.tsx` (Buttons → Editor)
- Daten: `database/migrations/0035` (release_version_groups), `0091` (anime_contributions.release_version_id), `0064` (release_version_notes), `0059` (release_version_media)
- Permissions: `backend/internal/permissions/permissions.go` (Rollen-Matrix, `CanForReleaseVersion`); Notes/Media-Handler: `backend/internal/handlers/admin_content_release_version_notes.go`, `..._media.go`
- Anschluss Phase 82: `anime_contributions` jetzt member_id-Anker; Cockpit `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` (CoverageMatrix, ProjectCockpitBadges, AnimeContributionModal)
