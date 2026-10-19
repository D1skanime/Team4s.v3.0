---
created: 2026-10-19T00:00:00+00:00
title: Profil-Einstellung „Theme-Video immer mit Ton“, gesteuert über das Rechtesystem
area: profile-permissions-anime-detail
status: discuss-first
files:
  - frontend/src/components/anime/AnimeBackdropRotator.tsx
  - frontend/src/components/anime/themeVideoAudio.ts
---

## Nutzerwunsch (19.10.2026)

Heute startet das Theme-Hintergrundvideo auf der Anime-Detailseite stumm, und man muss „Ton aktivieren“ klicken. Das passt als Standard. Später soll jeder registrierte User im **Profil** einstellen können:
- „Theme-Videos immer mit Ton abspielen“ oder
- „Ton manuell per Klick aktivieren“ (heutiges Verhalten, Standard).

Wichtig: Der User setzt das zwar im Profil, **ob er diese Einstellung überhaupt hat, wird aber aus dem Rechtemanagement gesteuert** (eigenes Recht/Capability, im bestehenden Rechte-System verwaltbar). Keine Sonderlogik am Rechtesystem vorbei.

## Technische Randbedingung (vor dem Planen klären)

Browser blockieren Autoplay **mit Ton** ohne vorherige Nutzerinteraktion auf der Seite (Chrome/Firefox/Safari Autoplay-Policy; Chrome lockert das für häufig besuchte Seiten über den Media Engagement Index). „Immer mit Ton“ kann daher nur heißen: mit Ton starten, **wenn der Browser es erlaubt**, sonst stumm starten und beim ersten Klick auf der Seite automatisch einschalten. Diese Einschränkung muss im Profiltext ehrlich stehen.

## Offene Fragen

1. Name/Einordnung des Rechts im Rechtekatalog (welche Rollen bekommen es standardmäßig, z. B. Grundausstattung?).
2. Wo im Profil (bestehende Einstellungsseite, globale UI-Primitives aus `@/components/ui`).
3. Gilt die Einstellung auch für andere Videos (Release-Player, Segmente) oder nur fürs Theme-Hintergrundvideo?
4. Gäste (nicht angemeldet): immer stumm wie heute.
5. Lautstärke merken?

## Bezug

Quick-Task vom 19.10.2026: Der Ton des alten Videos läuft beim Wechsel zum nächsten Anime weiter. Dieser Fix ist Voraussetzung, damit „immer mit Ton“ später nicht zu Ton-Überlappungen führt.
