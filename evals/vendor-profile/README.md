# Vendor profile extraction fixtures (P1.5)

Fictional provider pages for `VENDOR_PROFILE_EXTRACTION`. Unit tests run the deterministic extractor over
them (`tests/unit/vendor-draft.test.ts`); the eval harness (P0.4, blocked on a gateway key) will score the
model against the same pages. Every name, address and number here is made up.

- `diagnostics-clinic.html` — a provider's own site: accreditations, branches, doctors, and one service
  worded as a health claim (must never reach a suggestion).
- `ayurveda-listing.html` — a tourism-board style listing with a Green Leaf classification.
- `culture-centre.txt` — plain text as staff would paste it.
