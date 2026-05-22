# Phase 50 Learnings

- Client-side gates must wrap data-loading child components, not live inside the same component that owns effects.
- Reusing an admin editor route is acceptable only if the backend context is also scoped and sanitized.
- Capability names must align with API reads as well as writes; read endpoints can be IDOR-prone when they feel "harmless".
- Contributor navigation should live outside `/admin` long-term. Re-exporting is useful as a transition, but redirects are cleaner once tests and links are moved.
