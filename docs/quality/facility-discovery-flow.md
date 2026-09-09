# Facility discovery: implementation and verification

## Delivery scope

- Branch: FE-5era only. Main was imported at 68e13d7 in merge 4ae69f4; this delivery does not merge FE-5era back to main.
- Direct map entry opens the facility list. A clinical-history entry opens consultation results, unless an explicit list/filter/detail panel is requested.
- Desktop uses a 400px panel and supporting map. Below 1024px, List and Map are separate surfaces; consultation, filters and detail use the same single-scroll panel.
- Consultation explanations are outside the map, vertical and expandable. Actual clinical explanation text is upright; short supporting notes are smaller and italic.
- Filters edit a draft. Applying an unchanged draft preserves loaded results; cancellation restores the committed filters. Search, specialty, facility type, scope and sorting are shared across both surfaces.

## Data contract / Gate D0

The existing public API was inspected read-only, including its Swagger document:

- GET /api/medical-facilities/active returns an unpaged MedicalFacilityResponseIReadOnlyListApiResponse (25 entries in the inspected response).
- GET /api/facility-departments/active supplies the complete active facility/department relations (50 entries in the inspected response).
- The frontend joins both responses, then filters by active state, specialty, type and search. It computes straight-line distance from coordinates, selects the radius, ranks the entire candidate set, and only then takes the visible page.
- The limited nearby endpoint and global top-rated endpoint are not used to approximate this complete candidate set.
- If either catalog request fails, the UI reports an error rather than treating the failure as an empty radius.

If the backend later paginates/caps the active catalog, this contract must be updated to exhaust pagination or use a server-ranked query with authoritative totals before claiming complete ranking.

## Search and ranking rules

- Location is requested only after an explicit action, never just by opening results or entering the map.
- Automatic radius: 5, 10, 15, 20, 25, 50, 100, 250, 500, 1000 km. Stop at the first nonempty radius, including when it has fewer than five facilities.
- A manually selected radius never expands automatically. The empty state offers a deliberate switch to automatic discovery.
- With valid aggregates, rating order is average descending, review count descending, distance ascending, stable ID. Missing/invalid aggregates do not become invented zero-star reviews.
- Without location, no nearest claim is made. Without usable ratings, the UI explains its distance/name fallback.
- Five results are shown initially. Load more appends five within the same scope without duplicates.
- Map markers and clusters represent only visible results. Deep-linked detail is not injected into an unrelated filtered list or radius.

## Camera and navigation

- MapLibre owns the live camera. React observes its position for clustering and navigation history; ordinary list renders cannot replay an older camera frame.
- Initial fit is automatic once. Center-on-me, fit-results, cluster expansion and facility selection are explicit camera commands; they stop the prior animation.
- User gestures prevent subsequent automatic fitting. Load more and panel switches do not pan the map.
- Back/Forward restore filters, loaded count, scroll and saved viewport. Closing facility detail restores keyboard focus to its list action.
- Detail responses are request-guarded; a late response cannot replace a newer facility.
- Missing/inactive deep links show a recovery message. Map failure leaves the list available.
- Location failure is visible on the mobile map as well as the list. A failed refresh retains results and clearly labels the previous location.

## Pre-consultation handoff and existing features

- The selected facility and compatible department are revalidated against facility/department APIs at handoff. The API name takes precedence over URL text.
- The facility is preselected, not locked. Users can choose another suggestion or return to the map.
- In-progress appointment/form context is held in account-scoped memory with a 30-minute TTL; it is not persisted to localStorage, sessionStorage or URL/history payloads.
- A reload that loses a map-return draft displays a notice. Routing alone does not create a consultation or consume credits.
- Existing reviews, image replacement/removal/retry, upload cancellation and unsaved-review navigation confirmation remain supported.
- Pre-consultation history detail has one scroll owner; its inner article no longer creates a second desktop scroll area.

## Regression test migration

Existing E2E scenarios were retained and adapted to the intentional UI/API contract changes, not deleted or skipped:

- Old numbered pages became five-at-a-time load-more assertions, including all 23 fixtures and scroll restoration.
- Old nearby radius/limit request assertions became full-catalog, first-nonempty-radius, ranking and delayed-catalog assertions.
- Floating consultation selectors became panel selectors; selecting a facility is now required before continuing to pre-consultation.
- Mobile pin preview remains short; full detail requires an explicit action.
- Existing review image and unsaved-navigation assertions remain.
- Existing history assertions now target the main branch's history drawer/detail panel.

## Verification commands

Final verification on 2026-09-09:

- 50/50 unit tests passed; targeted ESLint, production build and diff whitespace check passed.
- All 69 scoped E2E tests passed in the combined run: discovery (18), review/discovery upgrade (17), map UX (26), pre-consultation (8).
- Expanded route/accessibility run: 146 passed, 1 failed, 1 existing skip out of 148. The failure is /signup color-contrast on the two hint elements (#_r_4_-hint and #_r_5_-hint); reproduced in an isolated rerun. Signup is outside this map-flow delivery and was not changed to suppress the finding. The existing /api route-conflict skip was retained.
- Inspected desktop list and mobile facility-detail screenshots at their actual viewport sizes.

- node --test tests/unit/*.test.mjs
- Targeted ESLint over all changed JavaScript/JSX and tests.
- npm run build
- playwright test tests/e2e/discovery-flow.spec.js tests/e2e/facility-discovery-upgrade.spec.js tests/e2e/map-ux.spec.js tests/e2e/pre-consultation.spec.js tests/e2e/routes.spec.js tests/e2e/accessibility.spec.js --workers=3
- git diff --check

Browser tests use deterministic API fixtures and a blank map style. They verify layout, keyboard/accessibility, filtering, marker interaction, camera stability, upload handling and handoff without writing to real medical accounts. They do not certify live deployment CORS, tile-service uptime or a real patient's authenticated medical session.
