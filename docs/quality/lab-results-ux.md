# Lab results: overview and indicator details

## Scope

This change simplifies the completed lab-result screen on `/records/:sessionId`
(including navigation from patient history) and inside the doctor result dialog.
It does not change uploads, API contracts,
polling cadence, credit consumption, medical thresholds, or backend advice content.

## Interaction contract

- Open each new scan on **Tổng quan**. Show the scan date, total recognized indicators,
  attention/normal/unknown counts, and the complete available analysis immediately.
- Do not restore the removed urgent category, priority cards, next-action cards, or
  an extra disclosure hiding the full overview.
- **Chỉ số xét nghiệm** opens a dense result list with **Tất cả** selected initially.
  Each row keeps its name, value/unit, reference range, and explicit status text.
- Search accepts names or symbols, case/accent-insensitively. Status filters combine
  with search; their badges always represent the whole scan. Render 12 rows initially
  and offer 12 more at a time, without discarding any results.
- A desktop selection displays details beside the list. Details always belong to a
  visible filtered result, never an indicator hidden by the current search/filter.
- Containers narrower than 960px use a list-to-detail transition, including narrow
  embedded dialogs on large screens. Back/Escape returns to the same search, filter,
  expanded result count, selected row, and list scroll position.
- Switching tabs preserves their scroll positions and does not restart analysis.
  The containing page/dialog remains the only scrolling surface.
- Arrow keys/Home/End operate the tabs. Enter selects a result. Breakpoint changes
  restore visible keyboard focus rather than leaving it in a hidden detail pane.
- Loading, failed analysis, failed summary, empty scan, no search match, and missing
  advice/reference data remain explicit states with appropriate retry/reset actions.

## Implementation boundaries

- `src/pages/LabTestResultPage.jsx`: presentation state, navigation, filtering and rows.
- `src/styles/user-workspace/lab-test-result.css`: scoped responsive/result styling.
- `src/components/ui/useOverlayFocus.js`: exclude hidden/inert/non-visible descendants
  when trapping focus, required by the mounted but hidden lab tab panels.
- Lab/patient-history/embedded-doctor E2E regressions cover the affected workflows.

## Release isolation

`uiux/lab-test-results` was created from FE-5era. Do **not** merge its inherited map
and unrelated FE changes into main. Apply only the lab-result commit to an integration
branch based on current main, verify the resulting file diff and tests there, then
merge that isolated branch into main without force-pushing.

## Manual acceptance checks

1. Open a completed scan with many indicators: the overview is readable without
   opening extra accordions, with one clear entry into the result list.
2. On desktop, search and select several rows, including a long name and a result
   without advice. Confirm the adjacent detail matches the selected result.
3. At 320px and 390px, select a row after scrolling; return and confirm position,
   search and filter are retained. There must be no horizontal page overflow.
4. Check keyboard tab navigation, visible focus, forced colors, and dialog focus
   wrapping in both overview and indicator views.
5. Retry a failed summary: the lab scan is not repeated and no extra credit is used.
6. Confirm the main integration diff contains only the files required by this lab task.

## Verification on the feature branch

- Production build and targeted ESLint passed.
- 50 unit tests passed.
- 25 lab-result, patient-history and modal-focus E2Es passed, including 320/390/768px,
  keyboard/resize, accessibility, polling/credits, retries and missing advice.
- Desktop overview/list and mobile list/detail screenshots were visually reviewed.
- Broader doctor smoke: 14/15 passed. The existing publish-plan test omits the
  already-shipped creation-method dialog; this unrelated test was not changed.
- Repository-wide CSS audit has pre-existing errors outside the lab stylesheet;
  this change adds no new CSS audit violation.
