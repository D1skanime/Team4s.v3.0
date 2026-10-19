---
created: 2026-10-19T22:30:00+00:00
title: "BUG: Leader bzw. Projektleiter kann den Projektzeitraum (Datum) nicht setzen"
area: permissions-fansub-project-timeline
status: open
files:
  - backend/internal/handlers/admin_content_anime_project_timeline.go
  - backend/internal/handlers/app_auth_capabilities.go
  - backend/internal/permissions/permissions.go
  - database/migrations/0157_project_timeline_capability.up.sql
  - frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx
---

## Nutzerbefund (19.10.2026)

Als Leader einer Gruppe kann ich auf der Projektseite (Fansub-Bearbeiten → Projekt aufklappen → Projektzeitraum) kein Datum setzen. Auch nachdem ich mich selbst als **Projektleiter** zum Projekt hinzugefügt habe, geht es weiterhin nicht. Konkretes Beispiel: **Strawhat Subs (Gruppe 26), Projekt „11eyes: Pink Phantasmagoria“ (OVA, Anime 3).**

## Analyse (mit echten Daten geprüft)

- Der Leader von Strawhat ist app_user 6 = member 4, Gruppenrollen: `fansub_lead`, `founder`, `techadmin`.
- Für Anime 3 hat member 4 einen bestätigten Projekt-Beitrag (`anime_contributions` id 684) mit den Projektrollen `translator` **und `project_lead`**.
- Das Recht heißt `anime_fansub_project.timeline.update` („Projektzeitraum bearbeiten“). Laut `role_capabilities` haben es nur **`project_lead`** und — auffällig — **`typesetter`**. **`fansub_lead` hat es nicht.**
- Geprüft wird es gruppenweit: `requireAnimeProjectTimelineWriteAccess` und die Capability `can_edit_project_timeline` (`app_auth_capabilities.go:116`) rufen beide `CanForFansubGroup(…, fansubID)` auf. Dabei zählen nur die **Gruppenrollen** (`fansub_group_member_roles`). Eine **Projektrolle** `project_lead` aus `anime_contribution_roles` für genau dieses Anime wird nicht berücksichtigt.
- Die Gegenprobe passt: app_user 8 hat `project_lead` als **Gruppenrolle** und dürfte das Datum setzen.

## Zwei Ursachen

1. **Rechte-Konfiguration:** Die Leader-Rolle `fansub_lead` hat das Recht „Projektzeitraum bearbeiten“ nicht, obwohl sie fast alle anderen Projekt- und Release-Rechte hat. Das ließe sich über die Rechte-Matrix (Plattform-Admin) zuweisen, ohne Code. Zu klären ist, ob `typesetter` das Recht wirklich haben soll; das sieht nach einem Fehlklick in der Matrix aus (vgl. frühere Laufzeit-Drift bei Rollenrechten).
2. **Logikfehler:** Der Projektzeitraum gehört zu einem konkreten Projekt (Gruppe + Anime). Die Prüfung läuft aber nur auf Gruppenebene. Wer **für dieses Projekt** als `project_lead` eingetragen ist, bekommt das Recht trotzdem nicht. Richtig wäre eine Prüfung im Projektkontext (Gruppe + Anime), die Projektrollen aus `anime_contribution_roles` (Status bestätigt) mitberücksichtigt — sowohl im Schreib-Endpunkt als auch in der Capability, die das Frontend für das Freischalten der Datumsfelder nutzt.

## Offene Fragen

- Soll `fansub_lead` das Recht standardmäßig bekommen? (Empfehlung: ja, per Migration bzw. Matrix.)
- Soll `typesetter` das Recht behalten?
- Sollen Projektrollen auch für andere projektbezogene Rechte zählen (z. B. Projektnotizen `anime_fansub_project.notes.write`)? Gleiches Muster prüfen.
