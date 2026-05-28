---
status: complete
completed: 2026-05-28T10:34:56.7147228+02:00
---

# Summary

Implemented the UAT 2 avatar crop follow-up:

- Crop panning bounds now support moving the image until its edge reaches the crop circle.
- Own-profile avatar reads include `source_original_url` as an edit source while keeping `public_url` as the cropped display URL.
- The profile image card can load the retained source and open the existing crop dialog for re-cropping.
- Focused frontend/backend tests, typecheck, focused eslint, and diff whitespace checks were run.
