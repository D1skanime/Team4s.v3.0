# Phase 53: Rollenübergreifendes Mein Profil als Member Identity Hub - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 53-rollenuebergreifendes-mein-profil-als-member-identity-hub
**Areas discussed:** Plan completeness, context sufficiency, screenshot-to-UI reference

---

## Existing Plans

| Option | Description | Selected |
|--------|-------------|----------|
| Continue and replan after | Capture context first, then regenerate/adjust plans so they reflect the decisions. | ✓ |
| View existing plans | Inspect existing `53-01-PLAN.md` and `53-02-PLAN.md` before proceeding. | ✓ |
| Cancel | Stop without writing context. | |

**User's choice:** The user wanted to prüfen, ob an alles gedacht wurde, was umgesetzt werden muss.
**Notes:** Existing plans were reviewed against ROADMAP, REQUIREMENTS, Phase 47/48/52 contexts, runtime code, API helpers, DTOs, migrations and UI assets.

---

## Plan Completeness

| Finding | Decision |
|---------|----------|
| Existing plans cover most of the roadmap scope. | Keep the two-phase shape 53A/53B. |
| OpenAPI was phrased too optionally. | Make OpenAPI documentation for profile read/update/avatar mandatory. |
| Visibility has only two runtime values today. | Do not show unsupported third option unless DB/API/Public-query contract is implemented. |
| Activity period is year-only today. | Do not infer month/year from memberships or credits. Add contract/migration or keep year-only honestly. |
| Contributions are aggregate-only today. | Show honest summaries unless a paginated detail endpoint is explicitly added. |
| Avatar limit and variants are not fully productized. | Require server validation and decide variants through existing media structures or defer. |

**User's choice:** Provided a detailed planning brief and asked whether it is enough context.
**Notes:** The brief is sufficient for replanning; the context file condenses it into locked implementation decisions.

---

## Screenshot Reference

| Option | Description | Selected |
|--------|-------------|----------|
| Pixel-perfect target | Implement the screenshot exactly. | |
| Design direction | Use the screenshot as structure/quality target while adapting to existing GDS and real data contracts. | ✓ |
| Ignore screenshot | Keep purely textual planning. | |

**User's choice:** Provided `C:/Users/admin/Desktop/ChatGPT Image 26. Mai 2026, 18_24_26.png` as visual reference.
**Notes:** The reference drives layout and information hierarchy: app shell, profile hero, avatar, chips, left content column, right side cards, membership cards and contribution empty state. It does not authorize fake data, unsupported visibility values or a page-local hardcoded sidebar.

---

## Deferred Ideas

- Full public member page.
- Stable member slug and `/members/[slug]`.
- Full `/me/groups`, `/me/contributions`, `/me/account` routes.
- Detailed paginated contributions endpoint unless explicitly scoped into Phase 53.
- Custom Keycloak Account Console return theme.

---

## Follow-up Discussion: 53A Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimaler Foundation-Slice | `/me/profile`, Übergang, Split, echte Daten, Basislayout; Navigation/OpenAPI nur minimal. | |
| Solider Hub-Grundbau | Zielstruktur ohne neue tiefe Contracts; bekannte Navigation, StoryCard, Account/Memberships/Beiträge. | |
| Breiter 53A-Abschluss | Vollständige Zielstruktur mit allen Cards, Visibility-/Avatar-/Beiträge-Bereichen und stärkerer Shell-Richtung. | ✓ |

**User's choice:** 53A soll breit laufen.
**Notes:** Die Breite wird durch Ehrlichkeit begrenzt: keine Fake-Daten, keine erfundenen Felder, keine neuen tiefen Contracts in 53A.

---

## Follow-up Discussion: Sichtbare Bereiche Ohne Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Alle Bereiche sichtbar, ehrlich begrenzt | Cards bleiben sichtbar, zeigen aber Empty State, deaktivierte Aktion oder Contract-Hinweis. | ✓ |
| Nur echte Bereiche sichtbar | Cards ohne belastbare Daten bleiben aus der UI raus. | |
| Gemischt | Strukturrelevante Cards sichtbar, Detailbereiche eher als Summary/Empty State. | |

**User's choice:** Alle Bereiche sichtbar, aber ehrlich begrenzt.
**Notes:** Das passt zur gewünschten Hub-Wirkung, solange nichts fachlich vorgetäuscht wird.

---

## Follow-up Discussion: Story und TipTap

| Option | Description | Selected |
|--------|-------------|----------|
| Konservativ | `member_story` bleibt Plain Text; echte TipTap-Persistenz wird verschoben. | |
| Reuse-first TipTap-Verdrahtung | Bestehenden Phase-41-TipTap-Stack für Profil-Story übernehmen, ohne neuen Service/Renderer/Sanitizer. | ✓ |
| Richtige Migration ohne Fallback | Bestehende Plain-Text-Werte vollständig migrieren und nur noch TipTap erlauben. | |

**User's choice:** TipTap soll wirklich verdrahtet werden, aber reuse-first über vorhandene Implementierung.
**Notes:** Klärung: Der Editor ist bereits eingebaut, aber die Profilseite konvertiert `member_story` beim Laden/Speichern aktuell Plain Text ↔ TipTap JSON. Das Problem ist also die fehlende Persistenz-/Sanitizing-/Render-Verdrahtung, nicht der Editor selbst.

---

## Follow-up Discussion: Avatar-Crop

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side Crop ohne Original | Einfachster Upload, aber spätere Varianten/Recrop nur aus zugeschnittenem Raster. | |
| Client-side UX plus Original behalten | Frontend bietet Crop-UX; Backend/Media-Contract erhält Original oder Crop-Metadaten für spätere Varianten. | ✓ |
| Server-side Crop | Original + Crop-Metadaten an Backend, Backend erzeugt Avatar/Varianten sofort. | |

**User's choice:** Clientseitige Crop-UX, aber Original darf architektonisch nicht verloren gehen.
**Notes:** Bestehende Media-Strukturen bleiben maßgeblich; keine parallele Avatar-Media-Logik.

---

## Follow-up Discussion: Globale Shell

| Option | Description | Selected |
|--------|-------------|----------|
| App-Shell für eingeloggte User | Nur eingeloggter Zustand; Login/Register später außerhalb. | |
| Dual-State vorbereiten | Shell kann konzeptionell anonymous/authenticated, 53A nutzt nur authenticated. | ✓ |
| Vollständige Public/Auth/App-Shell | Public, Login/Register und intern sofort vollständig abdecken. | |

**User's choice:** Dual-state-fähige globale Shell vorbereiten.
**Notes:** Login/Registrieren sollen später in die Shell passen, werden in Phase 53 aber nicht umgesetzt.

---

## Follow-up Discussion: Shell-Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Schlank | Public, Dashboard, Mein Profil, Meine Gruppen, Settings/User-Footer. | |
| Referenznah | Public, Dashboard, Verwaltung capability-gated, Mein Bereich, Settings, User-Footer. | ✓ |
| Nur Mein Bereich | Fast nur Profil/Gruppen/Beiträge, Admin-Navigation nicht berühren. | |

**User's choice:** Referenznahe Navigation.
**Notes:** Admin-/Verwaltungslinks bleiben capability-gated.

---

## Follow-up Discussion: Shell-Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Shell bauen + `/me/profile` nutzt sie | Andere Seiten bleiben vorerst wie sie sind. | ✓ |
| Profilnahe Seiten umstellen | Zusätzlich `/admin/my-groups` oder `/manage/groups` in dieselbe Shell bringen. | |
| Breite Admin-Migration | Dashboard/Adminseiten nutzen die neue Shell direkt. | |

**User's choice:** Nur `/me/profile` ist erster Consumer.
**Notes:** Die Shell wird global gebaut, aber Phase 53A wird nicht zur app-weiten Shell-Migration.

---

## Follow-up Discussion: Nicht Existierende Shell-Ziele

| Option | Description | Selected |
|--------|-------------|----------|
| Nicht anzeigen | Ziel erst zeigen, wenn Route existiert. | |
| Deaktiviert/Coming soon | Zielstruktur sichtbar, aber ehrlich nicht klickbar. | ✓ |
| Auf Profil-Anker verlinken | Temporär auf Sections in `/me/profile` springen. | |

**User's choice:** Sichtbar vorbereitet, aber deaktiviert/Coming soon.
**Notes:** Keine Fake-Routen, keine 404-Links.

---

## Follow-up Discussion: Mobile Shell

| Option | Description | Selected |
|--------|-------------|----------|
| Basic responsive in 53A | Desktop/tablet sauber, mobile nicht kaputt, kein finaler Drawer. | |
| Drawer/Burger direkt in 53A | Mobile Menü-Pattern sofort umsetzen. | |
| Mobile vollständig in 53B | 53A macht keine Shell-Mobile-Härtung. | ✓ |

**User's choice:** Mobile-Shell-Härtung kommt in 53B.
**Notes:** 53A muss dennoch nicht kaputt/überlappend sein.

---

## Follow-up Discussion: Execution-Regel

| Option | Description | Selected |
|--------|-------------|----------|
| 53A parallel, 53B seriell | 53A freier, 53B wegen Contract-Konflikten seriell. | |
| Alles seriell | Weniger Konflikte, langsamer. | |
| Parallel nur nach File Ownership | Nur konfliktfreie File-Besitzer parallel; Shell als eigener Block. | ✓ |

**User's choice:** Parallel nur nach klarer File Ownership.
**Notes:** Globale Shell zuerst/separat; keine parallele Arbeit an Shell-Grundlagen und konfliktierenden `/me/profile`-Dateien.
