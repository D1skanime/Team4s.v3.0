# Deferred Items

- 2026-07-19, Plan 105-03: `api.no-token-boundary.test.ts` findet zwei bereits committed, planfremde Verstöße: `GroupHistorySection.tsx` führt weiterhin ein `authToken`-Prop und `ProfileBackgroundCard.tsx` verwendet einen direkten Public-Source-`fetch`. Beide Dateien liegen außerhalb des Plan-105-03-Scopes und wurden nicht verändert; Timeline-spezifische Auth-/Relay-Scans sind sauber.

- 2026-07-19, Plan 105-02: Ein versehentlich breiter ESLint-Lauf traf den bereits bestehenden `react-hooks/set-state-in-effect`-Fehler in `frontend/src/components/fansubs/FansubStorySection.tsx:49`. Außerhalb des Plans; der gezielte Lint aller Plan-Dateien ist grün.
