# Quick 260621-p80p88-review-bugfixes Summary

## Ergebnis

Die Phase-80/88-Review-Bugs wurden als schmaler Quick-Fix umgesetzt:

- `release_scope_count` ist kein hardcoded `0` mehr, sondern kommt aus effektiven Release-Version-Kontexten.
- D-18-Konflikte `override_contradiction` und `media_without_contribution_rights` werden gezählt und detailliert ausgeliefert.
- Historische Contribution-Zeilen ohne `member_id` werden über `hist_fansub_group_members` in `legacy_historical` einsortiert.
- Die Admin-User-Tabelle zeigt `Release-Arbeitsflächen`.
- Das Contribution-Report-Modal setzt den Unterformular-Typ nach Erfolg zurück und rendert bei `open=false` nichts.

## Verifikation

- `go test ./internal/repository ./internal/handlers -run "AdminUsers|AnimeContributions|Contributions" -count=1`
- `npm test -- --run src/components/contributions/ReportModal.test.tsx src/app/admin/users`
- `npm run typecheck`
- `npx eslint src/app/admin/users/AdminUsersClient.tsx src/app/admin/users/page.test.tsx src/components/contributions/ReportModal.tsx src/components/contributions/ReportModal.test.tsx`
- `git diff --check`
