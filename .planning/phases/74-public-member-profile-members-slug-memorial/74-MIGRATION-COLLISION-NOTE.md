# Phase 74 — Migrations-Kollisions-Notiz (Wave-0 BLOCKER-Dokumentation)

**Erstellt:** 2026-06-05
**Status:** AUFGELÖST (Phase 72 bereits umnummeriert)

---

## Befund (aus 74-RESEARCH.md §Migrations-Befund)

### Ursprünglich dokumentierte Kollision

Phase-72-Plan 01 hatte `0096_v12_status_foundation` als geplante Migrationsnummer vorgesehen.
Gleichzeitig existierte in `database/migrations/` bereits:

```
0096_hist_group_members_confirmation_audit.up.sql
0096_hist_group_members_confirmation_audit.down.sql
```

Die höchste belegte Migrationsnummer zum Zeitpunkt der Phase-74-Planung: **0096**.

Diese Kollision hätte beim Ausführen von `go run ./cmd/migrate up` zu einem Fehler oder
unvollständigen Migrations-Stand geführt.

---

## Realer Stand beim Phase-74-Execute (2026-06-05)

```
database/migrations/
  0096_hist_group_members_confirmation_audit.up.sql   ← belegt (real, historisch)
  0096_hist_group_members_confirmation_audit.down.sql ← belegt (real, historisch)
  0097_v12_status_foundation.up.sql                   ← Phase 72, bereits umnummeriert ✓
  0097_v12_status_foundation.down.sql                 ← Phase 72, bereits umnummeriert ✓
```

**Phase 72 wurde vor Phase-74-Execute korrekt auf 0097 umnummeriert.**
Die Kollision ist **aufgelöst** — `migrate up` läuft sauber durch.

---

## Umnummerierungs-Anweisung (für zukünftige Pläne)

Falls weitere Phasen Migrationen hinzufügen müssen:

- Nächste freie Nummer nach der Phase-72-Umnummerierung: **0098**
- Phase 74 selbst braucht voraussichtlich **keine eigene Migration**:
  - `members.profile_status` kommt aus Migration 0097 (Phase 72)
  - `GetPublicMemberBadges` ist ein reiner Read auf bestehende `member_badges`-Tabelle
- **Mögliche Ausnahme:** Korrektur-Vorschlags-Persistenz-Modell (Plan 74-05, §Korrektur-melden):
  Falls keine bestehende Proposal-/Request-Tabelle generisch genug ist → neue Migration 0098+.

---

## Präventivmaßnahme

Vor jedem `go run ./cmd/migrate up` in Phase 74 (insbesondere Plan 03+):

```bash
ls database/migrations/ | tail -5
```

Erwartetes Ergebnis: Höchste Nummer ist 0097. Wenn eine neue Migration angelegt wird, muss sie
0098 oder höher verwenden. Niemals eine bestehende Nummer wiederverwenden.

---

## Quellen

- `74-RESEARCH.md §Migrations-Befund` (Kollision ursprünglich entdeckt)
- `74-RESEARCH.md §Fallstrick 1` (Beschreibung des Kollisions-Risikos)
- `72-01-PLAN.md` (Phase-72-Plan mit ursprünglich geplanter 0096-Nummer)
- Realer `ls database/migrations/`-Befund: Kollision durch Umnummerierung aufgelöst
