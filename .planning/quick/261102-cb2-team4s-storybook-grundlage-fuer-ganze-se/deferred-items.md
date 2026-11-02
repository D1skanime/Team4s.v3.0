# Deferred Items (Quick Task 261102-cb2)

Gefundene, aber bewusst NICHT im Scope dieses Auftrags behobene Punkte (Scope-Grenze:
"nur Probleme beheben, die direkt durch die eigenen Änderungen verursacht wurden").

## 1. `ArchivePageProps.searchParams` erfüllt Next.js 16s `PageProps`-Constraint nicht

**Gefunden während:** Task 1 (Pagination-Fix), beim Live-Smoke-Test gegen den laufenden Dev-Server.

**Befund:** `frontend/src/app/archiv/page.tsx`s `ArchivePageProps.searchParams` ist auf
`Promise<{...}> | {...} | undefined` typisiert -- erlaubt also zusätzlich zur Promise-Form auch
eine rohe (nicht-Promise) Objektform. Next.js 16.1.6s generierter `PageProps`-Constraint-Typ
verlangt dagegen strikt `Promise<any> | undefined`. `tsc --noEmit` meldet das erst, sobald
`.next/dev/types/app/archiv/page.ts` einmal vom laufenden `next dev`-Server für die `/archiv`-Route
generiert wurde (dieses Artefakt existierte in diesem Container vorher nicht, weil die Route seit
dem letzten Neustart noch nicht besucht worden war -- `tsconfig.json` bindet
`.next/dev/types/**/*.ts` explizit in die Projektprüfung ein).

**Beleg, dass dies NICHT durch diesen Auftrag verursacht wurde:** `git diff
frontend/src/app/archiv/page.tsx` zeigt, dass `ArchivePageProps`/`ResolvedArchiveParams` in diesem
Auftrag nicht angefasst wurden -- nur `buildArchivUrl` (Signatur `page: number | string`) und die
`Pagination`-Props wurden geändert.

**Warum nicht selbst behoben:** Eine Korrektur der Typ-Union könnte Aufrufer/Tests treffen, die
bewusst eine rohe (nicht-Promise) `searchParams`-Objektform übergeben (z. B. für synchrones
Test-Rendering) -- das ist eine eigene Untersuchung, die über den Pagination-Fix-Scope dieses
Auftrags hinausgeht.

**Reproduktion:** `docker compose exec team4sv30-frontend npm run typecheck` nach einem Besuch von
`http://<host>:3000/archiv` im laufenden Dev-Server zeigt:
```
.next/dev/types/app/archiv/page.ts(36,29): error TS2344: Type 'ArchivePageProps' does not satisfy
the constraint 'PageProps'. ...
```

**Empfehlung:** In einem eigenen, kleinen Folge-Task `ArchivePageProps.searchParams` auf
ausschließlich `Promise<{...}> | undefined` vereinheitlichen und alle Aufrufer/Tests, die die rohe
Objektform nutzen, auf `Promise.resolve(...)` umstellen.
