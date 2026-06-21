# Quick 260621-p80p88-review-bugfixes

## Ziel

Phase-80/88-Review-Bugs beheben, ohne neue User-/Fansub-/Release-Domain-Seams einzuführen.

## Scope

- Admin-User-Aggregate sollen `release_scope_count` real aus Release-Version-Kontexten ableiten.
- D-18-Konflikte sollen gezählt und in Details ausgeliefert werden.
- `legacy_historical` soll historische `fansub_group_member_id`-Altzeilen separat befüllen.
- Admin-User-Liste soll die vorhandene `release_scope_count`-Contract-Spalte sichtbar machen.
- Contribution-Report-Modal soll nach erfolgreichem Submit nicht als offenes Unterformular hängen bleiben.
- Tests sollen die entfernten Claim-Stubs dauerhaft absichern.

## Checks

- Backend Repository-/Handler-Tests für Admin Users und Contributions.
- Frontend Tests für Admin Users und Contribution Modal.
- Frontend Typecheck/Lint, soweit lokal praktikabel.
- `git diff --check`.
