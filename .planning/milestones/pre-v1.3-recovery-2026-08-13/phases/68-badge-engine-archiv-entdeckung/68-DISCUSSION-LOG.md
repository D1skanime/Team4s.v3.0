# Phase 68: Badge-Engine und Archiv-Entdeckung - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 68-badge-engine-archiv-entdeckung
**Areas discussed:** Badge-Katalog & Definitionsart, Badge-Recompute & Trigger, Gruppen-Meilensteine, Archiv-Suche

---

## Badge-Katalog & Definitionsart

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Definitionsart | Hardcoded im badge_service / badge_definitions-Tabelle | **Hardcoded** |
| Neue Badge-Typen | (Vorschlag des Assistenten) | **Erster Beitrag, Produktiv (gestuft), Verifiziert** |
| Allrounder | Ja / Nein | **Ja, aufnehmen** |
| Spezialist pro Rolle | — | **Zurückgestellt** |
| Schwellenwerte | Jetzt / später-Research | **Später / Research schlägt vor** |

Hinweis: Nutzer fragte nach sinnvollem Katalog; Assistent schlug Erster Beitrag / Produktiv / Spezialist / Allrounder / Verifiziert vor. Auswahl wie oben.

---

## Badge-Recompute & Trigger

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Trigger | Event-getrieben + Admin-Backfill / nur event-getrieben | **Event-getrieben + Admin-Backfill** |
| Hidden-Schutz | Hidden bleibt / auf Standard zuruecksetzen | **Hidden bleibt erhalten** |
| Entzug | revoked wenn Bedingung wegfaellt / behalten | **Badge entziehen (revoked)** |

---

## Gruppen-Meilensteine (Leader-CRUD)

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Umfang | Ganze Historie (alle event_types) / nur Meilensteine | **Ganze Historie, sparsam** |
| Felder | Titel Pflicht (Jahr+Note optional) / Jahr+Titel Pflicht | **Titel Pflicht, Jahr+Note optional** |
| Status | Sofort sichtbar (confirmed) / draft->sichtbar | **Sofort sichtbar (confirmed)** |
| Ort | Inline manage/groups/[id] / eigene Unterseite | **Inline (UI-Empfehlung)** |

Hinweis: Nutzer äußerte Sorge vor Pflegeaufwand (Beispiel Bleach 700 Folgen). Klargestellt: granulare Beteiligung = Contributions (Phase 65/67, member-getrieben), nicht Meilensteine. Meilensteine sind sparsame, hochstufige Gruppen-Ereignisse (5–15/Gruppe). Nutzer fragte nach UI-Experten-Empfehlung zum Ort → Inline in manage/groups/[id].

---

## Archiv-Suche

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Ort | Neue Route /archiv / bestehende /members | **Neue Route /archiv** |
| Filter-Logik | Alle optional UND / mind. ein Filter Pflicht | **Alle optional, UND-verknuepft** |
| Sichtbarkeit | Oeffentlich nur sichtbare / nur eingeloggt | **Oeffentlich, nur sichtbare Eintraege** |
| Ergebnis | Profil-Karten paginiert / kompakte Liste | **Profil-Karten, paginiert** |

---

## Claude's Discretion

- Konkrete Schwellenwerte (Produktiv/Allrounder)
- Admin-Backfill-Mechanik (CLI vs. Endpoint)
- Recompute-Trigger-Punkte
- Such-Query-Strategie (Indizes, Pagination, Sortier-Score)
- Handler/Repo/Service-Aufteilung unter 450-Zeilen-Limit

## Deferred Ideas

- Spezialist-pro-Rolle-Badges — spätere Phase
- Datengetriebene badge_definitions-Tabelle — spätere Phase
- Sortier-/Relevanz-Tuning der Suche — Research/Iteration
- Ablösung release_member_roles — eigene Cleanup-Phase (aus Phase 67)
- Todos profile-hub-redesign & contributor-owned-media — reviewed, nicht gefoldet
