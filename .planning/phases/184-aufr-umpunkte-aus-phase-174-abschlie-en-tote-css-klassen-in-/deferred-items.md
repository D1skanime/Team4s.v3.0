# Deferred Items — Phase 184

Out-of-scope issues discovered during execution, not fixed per Scope Boundary rule
(nicht durch die Änderungen dieser Pläne verursacht, daher nicht angefasst).

## 184-02

- **`frontend/src/types/__tests__/anime-detail-contract.test.ts` schlägt vorbestehend fehl**
  (unabhängig von 184-02, reproduzierbar auch isoliert `npx vitest run
  src/types/__tests__/anime-detail-contract.test.ts`, vor und nach den Änderungen dieses Plans
  identisch). Betrifft `shared/contracts/openapi.yaml` (anime-detail relation payload,
  `cover_image`/`relations`-Schema), komplett außerhalb des F-07-Scopes (Pagination/formatDate).
  Fehler: `expected '...type: object...' to contain '- cover_image'` — die Testdatei prüft
  offenbar eine Property-Reihenfolge/Position im OpenAPI-Schema, die sich durch eine spätere,
  unabhängige Phase verschoben hat. Nicht von 184-02 verursacht, nicht gefixt.
- **`frontend/src/app/admin/users/tabs/ReviewDelegationSection.test.tsx` einmalig flaky
  beobachtet** in einem ersten vollständigen `vitest run` (unter hoher Systemlast durch mehrere
  parallel/nacheinander gestartete Testläufe während der Fehlersuche bei Hintergrundprozessen).
  In Isolation und im finalen sauberen vollständigen Lauf grün. Kein Code in diesem Plan
  berührt diese Datei. Nicht gefixt, da nicht reproduzierbar und außerhalb des Scopes.
