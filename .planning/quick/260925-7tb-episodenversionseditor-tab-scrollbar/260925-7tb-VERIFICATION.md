# Verification 260925-7tb

- Die `.tabNav`-Regel enthält `overflow-y: hidden`.
- `scrollbar-width: none` blendet Firefox-Scrollbars aus.
- `::-webkit-scrollbar { display: none; }` blendet Chromium-/WebKit-Scrollbars aus.
- `overflow-x: auto` bleibt erhalten; Tabs bleiben horizontal scrollbar.
- `git diff --check` bestanden.
