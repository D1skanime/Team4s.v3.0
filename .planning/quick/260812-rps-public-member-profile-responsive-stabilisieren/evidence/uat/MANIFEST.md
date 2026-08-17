# UAT manifest

Route requested: http://127.0.0.1:3300/members/sheppert
Runtime route used by automated fallback: http://172.17.0.1:3000/members/sheppert

| Viewport | Screenshot | Width audit | Interaction audit |
| --- | --- | --- | --- |
| 390x844 | unavailable | capture runner stalled before result | unavailable |
| 768x1024 | unavailable | client 768 / scroll 768 (pass) | unavailable |
| 1024x768 | unavailable | capture runner stalled before result | unavailable |
| 1440x900 | unavailable | capture runner stalled before result | unavailable |
| 1920x1080 | unavailable | capture runner stalled before result | unavailable |

Browser limit: the shared in-app Browser tool was not available to this executor. Automated Playwright full-page capture and direct CDP capture were both attempted; rendering stalled after the successful 768x1024 DOM measurement. A controlled frontend restart removed the leaked capture processes, and one clean retry also stalled. No scaled or fabricated captures were substituted.

Static and interaction regression coverage remains green for the Quick-specific page, Hero, BadgeChain and FocalCarousel contracts. Existing FocalCarousel pointer/touch/keyboard tests remain present; live arrows, swipe/pointer and keyboard could not be honestly certified without a functioning shared browser.

Status: blocking human verification remains required. Do not create SUMMARY.md or update STATE.md before exact `approved`.
