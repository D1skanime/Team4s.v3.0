# Phase 113: Wiederholbare Leistungs-Badges (Bronze/Silber/Gold) - Context

**Gathered:** 2026-07-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 113 hängt **drei weitere abgeleitete Badge-Familien** in die (in Phase 110
gebaute, in Phase 112 um Typ 2/3 erweiterte) „Auszeichnungen"-Sektion ein. Alle drei
folgen demselben Prinzip wie Typ 3:

> **Bronze/Silber/Gold = Stufen derselben zählbaren, wiederholbaren Leistung.**

Alle drei sind **reine abgeleitete Live-Projektionen** (Rückstufung bei Storno/Entfernen),
**kein neuer Backend-Buchungspfad**, **keine Punkte fürs Haben eines Badges**. Badge-Bilder
liefert der Nutzer später — vorerst Platzhalter (Lucide-Icons).

Die drei Familien:
- **Vollständig mitgetragene Projekte** (1 / 5 / 15)
- **Chronist** — Notiz-/Text-Beiträge (10 / 50 / 150)
- **Bildarchivar** — beigetragene Bilder (10 / 50 / 150)

**Nicht in dieser Phase:** Typ 1 (Rollen-Einstiege, Phase 110) und Typ 2/3 (Punkt-
Meilensteine + Rollen-Volumen, Phase 112). Die bestehende `productive_*`-Familie
(„Produktiv · 10/25/50 Anime", persistierte `member_badges`) bleibt unangetastet und ist
NICHT Teil der neuen „Beiträge"-Gruppe.

</domain>

<decisions>
## Implementation Decisions

### D-01 Gemeinsames Prinzip (alle drei Familien)
- B/S/G sind Stufen **einer** zählbaren, wiederholbaren Leistung (kein zusätzliches
  Meilenstein-Naming wie bei Typ 2).
- Rein abgeleitet aus vorhandenen Daten; **kein neuer Buchungs-/Pflegepfad**, keine Punkte
  fürs Badge.
- **Live-Projektion:** Fällt die Zahl durch Storno/Entfernen unter eine Schwelle, **stuft
  das Badge zurück** (kein „einmal erreicht, bleibt für immer").
- Jeweils **netto** gezählt (storniert / gelöscht / zurückgezogen zählt nicht).

### D-02 Familie 1 — „Vollständig mitgetragene Projekte" (1 / 5 / 15)
- **Zählbasis: Anzahl Projekte, die der Member durchgängig mitgetragen hat.**
- **Ein Projekt zählt, wenn der Member zu JEDEM Release des Projekts in mindestens einer
  seiner Rollen beigetragen hat** (z. B. Upload, QC/Test o. ä.). Nicht „irgendwo einmal
  gecreditet", sondern **lückenlose Beteiligung über alle Releases** des Projekts.
- Datenquelle: die `release_role_work`-Buchungen (Phase 108/109-Ledger), netto.
- **Bewusst KEINE Story-/Medien-Bedingung.** Die frühere Idee „vollständig dokumentiert =
  Story + Release + Medien" wurde verworfen: Story-/Medien-Existenz ist Projekt- statt
  Memberleistung; die durchgängige Beteiligung trägt die Aussage „ich habe dieses Projekt
  komplett mitgetragen" allein.
- Offen (Research): Granularität „Release" vs. „Release-Version" und wie „alle Releases eines
  Projekts" aus `release_role_work` + Projekt-/Release-Zuordnung (anime × group) exakt
  hergeleitet wird.

### D-03 Familie 2 — „Chronist" (10 / 50 / 150)
- **Zählbasis: alle eigenen Notiz-/Text-Beiträge des Members, veröffentlicht/aktiv.**
- **„Akzeptiert" = veröffentlicht/aktiv genügt** — kein formaler Review-/Freigabe-Gate.
  Jeder eigene, live vorhandene Notiz-/Text-Beitrag zählt (netto: gelöscht/zurückgezogen
  zählt nicht).
- **Bewusst breiter** als der bestehende `project_text_first_author`-Punkt-Credit: nicht nur
  Erstautor-Projekt-Texte, sondern alle Notiz-/Text-Flächen.
- Offen (Research): welche Notiz-/Text-Tabellen genau zählen (Kandidaten:
  `anime_fansub_project_notes`/Projekt-Texte, `release_version_notes`, `fansub_group_notes`)
  und wie die Autor→Member-Zuordnung erfolgt (analog Phase-99-Autor-Seam:
  `…uploaded/created_by_user_id → users → app_users → verified member_claims → members`).
  Member-Story (eigenes Profil) ist KEIN „Beitrag".

### D-04 Familie 3 — „Bildarchivar" (10 / 50 / 150)
- **Zählbasis: Anzahl beigetragener Bilder GESAMT** (jede vom Member hochgeladene
  `release_version_media`-Zeile), nicht distinct Release-Versionen. Überstimmt die frühere
  Roadmap-Formulierung „Bilder zu N Release-Versionen".
- **Gate: aktiv/vorhanden genügt** — jedes hochgeladene, nicht (soft-)gelöschte Bild zählt,
  **unabhängig vom review_status/Sichtbarkeit** (Phase 79). Netto (Soft-Delete raus).
- Datenquelle: `release_version_media` über `uploaded_by_user_id → Member` (Autor-Seam aus
  Phase 99). **Kein** Ledger — für Bilder existiert keine Punktregel.
- Scope: `release_version_media` (release-version-gebundene Bilder). `fansub_group_media`
  (gruppenweite Medien) ist NICHT Teil dieser Familie.

### D-05 Anzeige & Gruppierung
- **Neue Gruppe „Beiträge"** in der „Auszeichnungen"-Sektion, getrennt von „Fortschritt"
  (Typ 2, Punkte) und „Rollen" (Typ 1/3).
- **Pro Familie nur die höchste erreichte Stufe** als aktueller Rang (z. B. „Bildarchivar ·
  Gold"), konsistent mit Typ 2/3 — keine Kette aller Stufen.
- **Immer sichtbar wenn erreicht** — **kein** Sichtbarkeits-Toggle für diese abgeleiteten
  Badges. Bewusste Abweichung von den bestehenden persistierten `member_badges` (die einen
  Öffentlich/Privat-Schalter haben): weil rein abgeleitet, braucht es keine gespeicherte
  Sichtbarkeits-Präferenz.

### Claude's Discretion
- **Badge-Codes/Labels/Icons/Palette** im Stil des vorhandenen Katalogs
  (`memberBadgeLabels.ts`, Kategorien wie `quantity`/`contribution`), Bronze/Silber/Gold-
  Farbgebung. Insbesondere: **Label für Familie 1** — „vollständig mitgetragene/abgeschlossene
  Projekte" trifft es besser als „dokumentierte Projekte" (die Bedingung ist Beteiligung, nicht
  Dokumentation).
- **Ableitungsort:** Frontend-Ableitung aus geladenen Daten vs. schmaler Backend-Read. Hinweis:
  Diese drei sind **schwerere Aggregationen** als Typ 2/3 (Familie 1 = per-Release-Coverage über
  ein Projekt; Chronist = Multi-Tabellen-Autorschaft; Bildarchivar = Media-Autor-Count) →
  voraussichtlich ein **rollen-/member-gefilterter Backend-Read** sinnvoll.
- **Rendering-Konsistenz:** Muss zu dem in **Phase 112** etablierten Derived-Badge-Muster in der
  „Auszeichnungen"-Sektion passen (Repräsentation abgeleiteter vs. persistierter Badges,
  Merge in dieselbe Sektion). Platzhalter-Icons austauschbar ohne Logikänderung.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phasen-Grenzen & Anforderungen
- `.planning/ROADMAP.md` — Phase-113-Eintrag (Grenze, Familien, Schwellen, offene Datenquellen).
- `.planning/REQUIREMENTS.md` — **GAM-04** (Badges als getrennte, abgeleitete Projektion; keine
  Punkte für Selbstpflege; `member_badges` bleibt getrennte Projektion).

### Abgrenzung zu Nachbar-Phasen (Badge-Typen 1–3)
- `.planning/phases/112-member-punkt-meilenstein-badges/112-CONTEXT.md` — Typ 2/3, Prinzip
  „eine Quelle, mehrere Sichten", Rückstufungs-/Live-Projektions-Muster, Platzhalter-Bild-
  Entscheidung. **113 muss zum dort etablierten Derived-Badge-Rendering passen.**
- `.planning/phases/110-member-badges-ranglisten-ui-und-e2e-abnahme/110-CONTEXT.md` — Profil-
  Badge-/„Auszeichnungen"-Sektion, Typ 1 (Rollen-Einstiege), erweiterbare Gruppen-Struktur.
- `.planning/phases/109-ranglisten-und-punkteprojektionen/109-CONTEXT.md` — persistierte
  Punktsumme (`member_point_totals`), `release_role_work`-Ledger-Nutzung.

### Datenquellen (Ledger / Punkte-Fundament)
- `database/migrations/0137_phase108_contribution_sources.up.sql` — `point_rules`
  (`release_role_work`, `project_text_first_author`), `point_ledger_entries`,
  `release_role_credit_lifecycles`, `project_note_credit_lifecycles`, `release_crew_snapshots`
  (award/reversal-Semantik = netto/Storno).
- `backend/internal/migrations/phase108_contribution_sources_test.go` — belegt Regel-Codes,
  Kategorien, Immutabilität und Storno-Lifecycle.

### Bestehende Badge-UI (Andockpunkt / Reuse)
- `frontend/src/components/profile/memberBadgeLabels.ts` — Katalog `MEMBER_BADGE_PRESENTATIONS`
  + `PUBLIC_MEMBER_BADGE_CATALOG` (Kategorien, Palette, Lucide-Icons); um die neuen Familien
  erweitern.
- `frontend/src/app/me/profile/components/AchievementBadgesCard.tsx` — „Auszeichnungen"-Sektion
  (heute persistierte `member_badges` mit Sichtbarkeits-Toggle) — Integrationsziel für die neue
  „Beiträge"-Gruppe (abgeleitet, ohne Toggle).

### Projekt-Regeln
- `./CLAUDE.md` — globale UI-Primitives aus `@/components/ui` sind Pflicht; korrekte Umlaute in
  user-facing Strings; 450-Zeilen-Datei-Limit.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `memberBadgeLabels.ts` — Badge-Katalog/Presentation-Map; neue Codes/Labels/Icons hier ergänzen.
- `AchievementBadgesCard.tsx` (+ `MemberBadgeChain.tsx`, `MemberBadgeChips.tsx`,
  `MemberBadgeHighlights.tsx`) — bestehende Badge-Anzeige-Komponenten der Sektion.
- Punkte-Fundament (Phase 106–109): `point_ledger_entries` + `release_role_work` (netto,
  Storno via reversal-Einträge) — Basis für Familie 1.
- Autor→Member-Seam (Phase 99): `uploaded_by_user_id → users → app_users → verified
  member_claims → members` — Basis für Bildarchivar (und analog für Chronist-Notizautorschaft).

### Established Patterns
- „Eine Quelle, mehrere Sichten" (Phase 112): dieselben `release_role_work`-Buchungen für
  Punktsumme (Typ 2), Rollen-Volumen (Typ 3) und jetzt Projekt-Coverage (Familie 1).
- Netto-/Storno-Semantik über award/reversal `entry_kind` im Ledger; Soft-Delete-Ausschluss bei
  Medien/Notizen.

### Integration Points
- Neue „Beiträge"-Gruppe reiht sich in die Phase-110/112-Gruppen-Struktur der „Auszeichnungen"-
  Sektion ein. Familie 1/2/3 sind abgeleitet und immer sichtbar (kein `member_badges`-Row nötig,
  außer die Phase-112-Architektur entscheidet sich generell für persistierte Projektions-Rows).

</code_context>

<specifics>
## Specific Ideas

- Nutzer-Prinzip (Zitat sinngemäß): „Bronze, Silber und Gold nur für wiederholbare Leistungen —
  wenn sie Entwicklungsstufen derselben konkreten Leistung darstellen."
- Familie 1 Zurechnung (Nutzer wörtlich): zählt, „wenn er in mindestens einer seiner Rollen zu
  jedem Release des Projekts was beigetragen hat, sei es Upload oder Test".
- Ursprüngliche (teils überstimmte) Nutzer-Tabellen:
  - Projekte: Bronze 1 / Silber 5 / Gold 15 „vollständig dokumentiert" → jetzt „durchgängig
    mitgetragen".
  - Chronist: Bronze 10 / Silber 50 / Gold 150 „akzeptierte Beiträge" → jetzt „veröffentlicht/
    aktiv", breit über alle Notiz-Flächen.
  - Bildarchivar: Bronze 10 / Silber 50 / Gold 150 → jetzt „Anzahl Bilder gesamt" (nicht distinct
    Release-Versionen).

</specifics>

<deferred>
## Deferred Ideas

- **Weitere Badge-Kategorien** über Typ 1–3 + diese drei hinaus (Events/Saison, Moderation/
  Review, sowie das bloße Einsortieren vorhandener Katalog-Badges wie `Gründungsmitglied`,
  `5+ Jahre Mitglied`, `Historische Leitung`, `Allrounder`, `Verifiziert`) — dank erweiterbarer
  „Auszeichnungen"-Sektion andockbar ohne Umbau; jeweils eigene kleine Folgeschritte.
- **Bildarchivar als distinct Release-Versionen** (statt Bilder gesamt) — bewusst zugunsten
  „Anzahl Bilder gesamt" verworfen; als Alternative dokumentiert.
- **Review-/Freigabe-gebundene Chronist-Zählung** — verworfen zugunsten „veröffentlicht/aktiv
  genügt"; nur relevant, falls später ein echter Notiz-Review-Flow eingeführt wird.
- **Echte Episoden-Granularität** (statt Release-Versionen) für volumenbasierte Familien — nur
  falls später gewünscht; andere Datenbasis.

</deferred>

---

*Phase: 113-wiederholbare-leistungs-badges-bronze-silber-gold*
*Context gathered: 2026-07-27*
