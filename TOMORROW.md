# TOMORROW

## Top 3 Priorities
1. Frontend Episodes Overview: Accordion-Expansion, Version-Counts, Fansub-Badges (Backend API ready)
2. Provider/Jellyfin: Add structured error responses ("Server nicht erreichbar", "Token ungueltig", etc.)
3. Continue handler modularization sweep for files >150 lines

## First 15-Minute Task
```bash
cd Team4s.v3.0/frontend
# Start implementing Episodes Overview UI with expandable version details
# Backend endpoint already supports includeVersions/includeFansubs params
```

## Dependencies To Unblock
- None (Backend Episodes endpoint is complete and tested)

## Nice-To-Have
- Add audit logs for sync actions and version edits
- Replace remaining `img` tags with next/image
- Full code/UX audit after episode visibility work
