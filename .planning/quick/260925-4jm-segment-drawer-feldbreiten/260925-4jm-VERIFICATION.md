# Verification 260925-4jm

- `.panel :global(.sectionDescription)` hebt die globale 58ch-Begrenzung nur im Drawer auf.
- `.panelField > select` nutzt maximal 360px und bleibt mobil mit `min(100%, 360px)` responsiv.
- `SegmenteTab.test.tsx` + `SegmenteTab.assignment-conflicts.test.tsx`: 125/125 bestanden.
- `git diff --check`: bestanden.
