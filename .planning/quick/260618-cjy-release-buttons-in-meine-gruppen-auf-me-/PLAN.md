# Quick 260618-cjy: Release-Buttons in Meine Gruppen auf Workspace umstellen

## Ziel

Die Release-Aktionen in `Meine Gruppen` sollen nicht mehr in den Admin-Episode-Version-Editor führen, sondern in den member-nahen Release-Workspace:

`/me/releases/[versionId]/workspace`

Gleichzeitig wird sichtbare Copy fansubber-neutraler formuliert: historische Credits bleiben Kontext, aktive App-Rechte kommen aus Capabilities, und es wird kein Anime-Mitwirkungsclaim suggeriert.

## Read First

- `frontend/src/app/admin/my-groups/page.tsx`
- `frontend/src/app/admin/my-groups/[id]/page.tsx`
- `frontend/src/app/admin/my-groups/page.test.tsx`
- `frontend/src/app/admin/my-groups/[id]/page.test.tsx`
- `frontend/src/app/me/releases/[versionId]/workspace/page.tsx`

## Umsetzung

1. Detailseite `Meine Gruppen` auf einen einzelnen Release-Workspace-Button reduzieren.
2. Button-Ziel auf `/me/releases/${releaseVersionId}/workspace` setzen.
3. Button nur anzeigen, wenn Release-Medien- oder Notizrechte vorhanden sind.
4. Visible Copy neutralisieren: Kontext statt Claim, Rechte statt Beitragseigentum.
5. Tests für Linkziel und Button-Text aktualisieren.

## Verifikation

- Fokus-Tests für `admin/my-groups` ausführen.
- Targeted ESLint für geänderte Dateien ausführen.
- `npm run typecheck` im Frontend ausführen.
- `git diff --check` ausführen.
- `rg` prüfen, dass alte Admin-Release-Editor-Links und technische Copy im `my-groups`-UI nicht mehr sichtbar sind.
