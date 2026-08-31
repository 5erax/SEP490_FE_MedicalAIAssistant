# Facility discovery and review editor upgrade

Date: 2026-08-31. Target branch: `FE-5era`. This change does not modify the backend or merge into `main`.

## Behavior

- Facility results use five items per page. Filtering happens before pagination; the complete filtered set remains available. List navigation stays outside the scrolling content. Opening details and returning preserves the page and scroll position; map selection switches to the corresponding list page.
- Map pins still cover the full filtered set with valid coordinates. The expanded results explanation distinguishes list pagination, unavailable coordinates and the existing API result limits. The nearby 1/3/5 km search policy remains unchanged.
- A specialty's short `reason` is presented as a related reference result, with the matching diagnosis explanation when the source is unique. It never assumes the first-ranked diagnosis is the source. Missing explanations have an explicit fallback.
- Diagnosis ranking accepts only finite numeric values in [0, 1] from the known analysis/session contract. The ambiguous percentage is removed from collapsed rows. Expanded information explains that the score is neither a symptom-match percentage nor a probability of disease. No new medical reasoning is generated in the frontend.
- Hidden file inputs are positioned inside their label and scroll region, preventing focus from scrolling the outer sidebar. Review Save/Cancel actions replace the consultation CTA while editing. Text fields use readable sizing and star displays have accessible semantics.
- Review images preserve backend dictionary keys. Update requests send explicit null entries for deleted images and stable keys for additions. Empty comments use an empty string to clear the value; null would leave the server value unchanged.
- Upload batches are validated before requests start, track each image independently, preserve successful uploads when another fails, and support retry/removal. Cancelling aborts pending work and invalidates stale responses. URLs created for local previews are released.
- Unsaved changes are guarded when leaving the review through application controls, same-origin links, normal browser Back/Forward within the indexed map history, and document unload. Map location updates do not dismiss a review editor. Saving disables editing and duplicate submissions.
- Reopening the same facility explicitly refreshes its reviews instead of relying on a changed facility ID.

## Validation

- Unit tests cover pagination completeness, page bounds, source matching, score units and image update semantics.
- Browser regression tests use mocked APIs and uploads. They exercise the native file chooser event instead of only assigning files, including 320/390/1920 px viewports and accessibility checks of the sidebar.
- Other cases cover 23 results, map markers on another page, restoring list context, clearing all images/comments followed by reload, replacing one of five images, partial upload failure/retry, invalid batches, cancellation with late responses, failed saves, unsaved Back navigation and reopening reviews.
- Existing map, feedback-review and symptom-analysis UI suites are included in regression checks: 45 browser tests passed, including 14 cases in the new upgrade suite. All 52 unit tests, repository-wide lint and the production build passed.
- Two pre-existing unused assignments were removed to make the repository-wide lint check pass; behavior is unchanged.

## Known limits and follow-up

1. Backend still provides a disease name as the specialty `reason`. Rich explanations linked to supporting answers, source diagnosis/version and validated specialty-fit text require a separately reviewed backend contract. The frontend currently uses the existing source explanation or a truthful fallback. It does not re-run analysis or expand persisted medical data.
2. The ranking is based on model estimates, not a clinically calibrated patient risk. Clinical review/calibration is not claimed by this UI change.
3. `/active` still returns an unpaged catalog. Five-item pages reduce scrolling but do not reduce the initial catalog transfer. Server pagination with department filtering and total/cursor metadata is a later backend change.
4. Automated mobile checks use Chromium viewports. Safari/iPhone and Messenger on real devices still need release acceptance testing, especially file picker return, keyboard/safe-area behavior and history traversal across unrelated routes. Upload/storage service behavior is mocked; no production reviews or medical images were used.
5. Cancelling a browser upload cannot guarantee removal of a file already stored by the upload provider. No cleanup of previously orphaned or duplicate production images is performed.
6. An extended, unrelated lab-result test fails its polling interval assertion: observed ~309 ms versus an expected minimum 850 ms. The identical test fails against an isolated, unmodified `ef30ba4` checkout (~315 ms). Its source and assertion are left unchanged. This is not counted as a passing test and is outside this map/review fix.

## Manual release checklist

- Open a long specialty list; visit the last page, a facility detail, then the recommendation; return to the same place.
- Check location denied, location unavailable and a location update during review editing.
- On a real phone, edit an existing review, open and cancel the picker, select several images, remove an existing image, save and reload.
- Try a slow upload, partial failure, and leaving with a draft. Confirm both staying and discarding work.
- Read the explanation aloud: no wording should imply a confirmed disease, symptom-match ratio or probability from the ranking score.
- Inspect the branch preview before approving a merge into `main`.
