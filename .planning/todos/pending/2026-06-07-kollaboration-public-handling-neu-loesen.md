---
created: 2026-06-07T13:55:00+02:00
title: Kollaboration public handling neu loesen
area: public-fansub-page
files:
  - frontend/src/app/fansubs/[slug]/page.tsx
  - frontend/src/components/fansubs/FansubHeroSection.tsx
---

## Problem

Phase 73 (Plan 73-10/73-12) hat fuer `group_type='collaboration'` einen Early-Return in `frontend/src/app/fansubs/[slug]/page.tsx` (Zeilen ~96-104) eingebaut, der eine eigene, vereinfachte oeffentliche Profilseite fuer Kollaborationen rendert (Hero + Hinweis-Block "Dies ist eine Kollaboration zwischen:" mit Links zu den Mitgliedsgruppen via `getCollaborationMembers`). Die Links funktionieren live (z.B. /fansubs/animeownage-project-messiah -> AnimeOwnage, Project Messiah).

Der Nutzer will diese "neue Seite" fuer Kollaborationen NICHT. Im Live-UAT-Feedback: "du hast eine neue Seite gemacht fuer collabration das wuerde ich nicht machen wieder entfernen. man muss das anders loesen." Die genaue gewuenschte Loesung wird der Nutzer in einer spaeteren Phase erklaeren.

## Desired Outcome

In einer spaeteren Phase: den Kollaborations-Early-Return wieder entfernen und Kollaborationen anders behandeln (Ansatz wird vom Nutzer dann definiert — moegliche Optionen: notFound()/404 fuer Collab-Slugs, Redirect auf eine Mitgliedsgruppe, oder Darstellung nur im Anime-/Release-Kontext statt als eigener Slug). Dabei den `isCollaboration`/`collaborationMembers`-Prop in FansubHeroSection und die zugehoerige inline-style-Logik mit aufraeumen. UAT-16-Vorgabe bleibt: "Kollaborationen werden nicht als eigenstaendige Gruppe dargestellt."

## Hinweis

Bewusst NICHT im Rahmen von Phase 73 geloest — auf Wunsch des Nutzers als TODO festgehalten. Die uebrigen Phase-73-Befunde (Banner-Edge-Fill, UAT-12/5/7) werden separat behandelt.
