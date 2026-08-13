# Phase 14: Create Provider Search Separation And Result Selection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 14-create-provider-search-separation-and-result-selection
**Areas discussed:** Treffer-UI pro Quelle, Jellyfin-Suchfluss, AniSearch-Titelsuche, Draft-Übernahme

---

## Treffer-UI pro Quelle

| Option | Description | Selected |
|--------|-------------|----------|
| Eingebettet direkt in der jeweiligen Karte | Both providers show results inline in their own cards | |
| Als Dialog/Popup | Both providers use popup-based result selection | |
| Jellyfin eingebettet, AniSearch als Dialog | Jellyfin keeps inline flow, AniSearch uses popup chooser | ✓ |
| Anders | Custom combination | |

**User's choice:** Jellyfin stays as it already works and only gets its own search field. AniSearch should use a popup that lists anime title, type, year, and ID.
**Notes:** The user explicitly wants Jellyfin behavior preserved while AniSearch gets a clearer multi-candidate chooser.

---

## Jellyfin-Suchfluss

| Option | Description | Selected |
|--------|-------------|----------|
| Eigenes Suchfeld in der Jellyfin-Karte, Treffer dort wählen, dann Preview laden, dann Draft füllen | Move query state into dedicated Jellyfin card and keep preview-first flow | |
| Eigenes Suchfeld, Trefferwahl lädt sofort direkt in den Draft | No preview step | |
| Eigenes Suchfeld, Trefferliste bleibt separat unter der Workspace wie heute, nur Input wird getrennt | Preserve current review behavior and only decouple input from title field | |
| Anders | Keep current Jellyfin behavior, only separate search input from final title field | ✓ |

**User's choice:** Jellyfin already works and should not be changed except that it gets its own search field.
**Notes:** This effectively preserves the current Jellyfin search/review/preview flow and rejects broader Jellyfin UX churn in this phase.

---

## AniSearch-Titelsuche

| Option | Description | Selected |
|--------|-------------|----------|
| Eigenes Suchfeld, Kandidatenliste zuerst, Detail-Crawl erst nach bewusster Auswahl | Candidate-first, detail-after-selection | ✓ |
| Eigenes Suchfeld, Top-Treffer direkt laden und nur bei Mehrdeutigkeit Auswahl zeigen | Optimistic direct load | |
| ID-Eingabe bleibt Hauptweg, Titelsuche nur als Nebenweg mit kleiner Ergebnisliste | Limited title-search path | |
| Anders | Custom behavior | |

**User's choice:** Candidate list first, then crawl detailed AniSearch data only after a deliberate selection.
**Notes:** The user explicitly tied this to request discipline and avoiding too many AniSearch requests. They later clarified that the existing AniSearch ID flow must continue to work unchanged, and that candidate selection should simply pass the chosen AniSearch ID into that existing ID-based crawler/load path.

---

## Draft-Übernahme

| Option | Description | Selected |
|--------|-------------|----------|
| Gewählte Quelldaten schreiben direkt in den Draft, aber klar als „noch nicht gespeichert“ markiert | Direct draft hydration after explicit selection | ✓ |
| Erst eine kleine Übernahme-Vorschau zeigen, dann separater „in Draft übernehmen“-Klick | Extra confirmation step | |
| Jellyfin direkt in Draft, AniSearch erst nach zusätzlicher Bestätigung | Mixed behavior | |
| Anders | Custom behavior | |

**User's choice:** After explicit selection, the chosen provider data writes directly into the draft, but the UI must still clearly say that nothing is saved yet.
**Notes:** This preserves the current draft-first workflow without adding another confirmation click after the deliberate result selection itself.

---

## the agent's Discretion

- Exact popup design for AniSearch candidate selection
- Exact copy and helper text
- Exact component split between provider cards, modal, controller, and helper files

## Deferred Ideas

- Any broader Jellyfin redesign beyond separating its search input
- Any edit-route redesign work
- Broader AniSearch crawler/browse behavior beyond candidate-first title search
