---
phase: quick-260916-rpv
plan: 01
subsystem: public-anime-page
tags: [relations, public, cover]
---

# Quick 260916-rpv — Öffentliche Relationsanzeige

Befund (Nutzer-Screenshot /anime/3): Badge zeigte rohen DB-Namen `side-story`, Überschrift „Related“,
Karte ohne Cover, und aus OVA-Sicht war 11eyes fälschlich als Nebengeschichte gekennzeichnet.

Ursachen:
- Frontend-Labeltabelle erwartete `side_story`/`alternative`, DB liefert `side-story`/`alternative-version`/`full-story`.
- `GetAnimeRelations` las nur `anime.cover_image`; 11eyes hat das Cover als Jellyfin-Poster in `anime_media`.
- Die Abfrage gab den gespeicherten Typ auch für eingehende Relationen unverändert zurück.

Fix:
- `backend/internal/repository/anime_relations.go`: Cover über gemeinsamen `animeCoverImageSelectSQL` + Poster-Join
  (wie Detailseite); Typ aus Sicht der angezeigten Seite: eingehend side-story→full-story, full-story→side-story,
  sequel→full-story, summary→full-story (Team4s-Taxonomie, gleich wie aniSearch-Import), sonst unverändert;
  eigene gespeicherte Relation gewinnt vor der gedrehten.
- `frontend/src/components/anime/AnimeRelations.tsx`: deutsche Labels nach DB-Namen, Fallback „Verwandt“ statt
  Rohwert, Überschrift „Verwandte Anime“, Cover über `resolveAnimeCoverURL` wie die Detailseite.

Tests: `TestGetAnimeRelations_PerspectiveAndPosterCover` (Postgres, team4s_relations_test), bestehende
Public-Read-Tests (Phase-106-DSN) grün; `AnimeRelations.test.tsx` 2/2; eslint 0 Fehler, tsc ohne neue Fehler.
Live: /anime/3 zeigt „Hauptgeschichte · 11eyes“ mit Cover, /anime/2 „Nebengeschichte · 11eyes: Pink Phantasmagoria“
mit Cover, keine Konsolenfehler.
