# Phase 106: Beitrags- und Punktefundament — Context

**Gathered:** 2026-07-22
**Status:** Ready for fresh research; not yet planned

<domain>
## Phase Boundary

Phase 106 schafft ausschließlich das fachliche und technische Fundament für bestätigungsgebundene Member-Punkte:

- stabile Member-Identität als Begünstigter
- optionaler App-User als handelnder Akteur
- versionierter, fester Punktekatalog
- auditierbares und idempotentes Punktebuch
- nachvollziehbare Stornierungen

Die Phase bindet noch nicht alle Beitragsquellen an, baut noch keine Ranglisten-UI und verändert keine bestehenden Medien-/Uploadsysteme.
</domain>

<decisions>
## Implementation Decisions

### D-01 Punkte gehören zum Member

`members` ist die fachliche Identität für Verdienste. Ein Account ist nicht erforderlich. Claims verbinden später einen Account mit derselben Identität.

### D-02 Historische Leistung zählt vollständig

Bestätigte historische Fansub-Arbeit wird später mit denselben Werten wie neue gleichartige Arbeit rückwirkend anerkannt.

### D-03 Nur bestätigte Beiträge zählen

Upload, Entwurf oder Selbstangabe erzeugen keine Punkte. Die Review-/Capability-Regeln werden in Phase 107 vollständig umgesetzt.

### D-04 Feste, versionierte Punktwerte

Prüfer vergeben keine individuelle Punktzahl. Änderungen am Katalog dürfen alte Buchungen nicht still verändern.

### D-05 Vier-Augen-Prinzip

Eigene Beiträge dürfen nicht selbst bestätigt werden. Plattform-Admin-Override bleibt als auditierbare Ausnahme.

### D-06 Review kann selbst ein Beitrag sein

Eine legitime Prüfung darf später kleine feste Punkte erzeugen. Bestätigung und Ablehnung müssen gleich gewichtet sein.

### D-07 Profilpflege ohne Punkte

Profilpflege erzeugt nur mögliche automatische Badges, keine Punkteereignisse.

### D-08 Keine Inhaltsmengen- oder Kopierbewertung

Textlänge, Datei-Hash und Copy-and-paste-Erkennung bestimmen keine Punkte. Qualität wird durch berechtigte Prüfung abgesichert.

### D-09 Kein Medienumbau

`media_assets`, `media_files` und alle kontextspezifischen Relationen/Uploads bleiben bestehen. Phase 106 darf sie nicht ersetzen, vereinheitlichen oder entfernen.

### D-10 Abgelehnte Inhalte

Der in Phase 107 zu implementierende Retention-Default beträgt 90 Tage in Produktion und 5 Stunden lokal. Automatisierte Tests verwenden kontrollierte Zeit.
</decisions>

<research_required>
## Required Research Before Planning

1. Aktuelles Schema und aktuelle Migrationen für `members`, `member_claims`, `member_badges`, `anime_contributions`, Release-Rollen und Audit-Seams inventarisieren.
2. Prüfen, ob bereits ein generisches Ledger-/Event-/Rule-Katalog-Muster existiert, das fachlich wiederverwendbar ist.
3. Alle späteren Quellen nach Member-ID, Actor-ID, Reviewstatus, Gruppen-/Release-Scope und Zeitstempel klassifizieren.
4. Eine fachliche Idempotency-Key-Strategie entwerfen, ohne Datei-Hash-Deduplizierung.
5. Stornierungs-, Regelversions- und historische Importsemantik definieren.
6. Contract-, Repository-, Migration-up/down- und Concurrency-Testmuster im Bestand identifizieren.
7. Exakte Abgrenzung zu `member_badges` und den bestehenden Fansub-Gruppenerfolgen dokumentieren.
</research_required>

<open_questions>
## Open Questions For Later Discussion

- konkrete Punktwerte und Gewichtung der Beitragstypen
- ob Gesamtpunkte nur summiert oder zusätzlich in getrennten Hauptwertungen dargestellt werden
- exakte Wirksamkeitszeit für historische Imports
- Umgang mit aktiven `app_users` ohne bestätigte Member-/Claim-Verknüpfung
- Badge-Katalog und Badge-Stufen
- Schwellen und Missbrauchsschutz für Prüfer-Badges
</open_questions>

<canonical_refs>
## Canonical References

- `.planning/notes/260722-member-gamification-DECISION.md`
- `.planning/notes/260722-gamification-analysis-postmortem.md`
- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/architecture/db-schema-fansub-domain.md`
- `.planning/ROADMAP.md`
</canonical_refs>
