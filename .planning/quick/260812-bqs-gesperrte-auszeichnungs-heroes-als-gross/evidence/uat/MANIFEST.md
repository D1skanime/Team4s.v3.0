# Sheppert Responsive UAT Manifest

Route: http://127.0.0.1:3300/members/sheppert
Date: 2026-08-12
Browser: Codex in-app browser

## Successful live semantic audit

- Default live viewport: clientWidth=1265, scrollWidth=1265 (no document-level horizontal overflow).
- Locked hero count on real Sheppert profile: 3 (Punkte, Mitgetragene Projekte, Mitgliedschaft).
- Every locked hero contained `?Noch nicht freigeschaltet`.
- Locked hero image/artwork count: 0.
- Earned Chronikpflege and Bildarchivpflege heroes remained real images.

## Requested viewport evidence

| Viewport | Screenshot | Overflow assertion | Result |
|---|---|---|---|
| 390x844 | unavailable | unavailable | In-app screenshot call timed out after 30 seconds; no scaled substitute used. |
| 768x1024 | unavailable | unavailable | Five-size full-page screenshot run timed out after 120 seconds before returning results; no scaled substitute used. |
| 1024x768 | unavailable | unavailable | Five-size full-page screenshot run timed out after 120 seconds before returning results; no scaled substitute used. |
| 1440x900 | unavailable | unavailable | Five-size full-page screenshot run timed out after 120 seconds before returning results; no scaled substitute used. |
| 1920x1080 | unavailable | unavailable | Five-size full-page screenshot run timed out after 120 seconds before returning results; no scaled substitute used. |

A second isolated 390x844 viewport-only screenshot attempt also timed out after 30 seconds. No screenshots were fabricated or substituted.

## Human verification status

Awaiting explicit user approval. Reply exactly `approved` to authorize finalization, or describe the visual issue to revise.
## Approval

- Explicit standalone approval received from the user: `approved`
- Approved on: 2026-08-12
- The Quick is authorized for finalization despite the documented in-app screenshot timeouts.