import test from "node:test";
import assert from "node:assert/strict";
import { clinicalConfidencePercent, clinicalText, hasClinicalPriority } from "../../src/utils/clinicalPresentation.js";

test("clinical confidence retains the existing fraction/percentage convention", () => {
  for (const [input, expected] of [[0.35, 35], [35, 35], ["0.28", 28], ["28", 28], [1, 100], [101, 100], [0, 0]]) {
    assert.equal(clinicalConfidencePercent(input), expected);
  }
});

test("missing or invalid confidence never becomes a made-up zero percentage", () => {
  for (const input of [null, undefined, "", "  ", false, true, [], {}, NaN, Infinity, -1, "invalid"]) {
    assert.equal(clinicalConfidencePercent(input), null);
  }
});

test("clinical text preserves full paragraphs, line breaks and literal markup without generating medical content", () => {
  const text = "Lý do từ API.\nDòng thứ hai <script>example</script>";
  assert.equal(clinicalText(` ${text} `), text);
  assert.equal(clinicalText("x".repeat(3000)).length, 3000);
  for (const input of [undefined, null, {}, [], 1, "  "]) assert.equal(clinicalText(input), "");
});

test("priority notes require an explicit backend flag, not a high score or description", () => {
  for (const flag of [true, "true", "TRUE"]) assert.equal(hasClinicalPriority({ isEmergencySuggested: flag }), true);
  assert.equal(hasClinicalPriority({ IsEmergencySuggested: true }), true);
  for (const flag of [false, "false", "", null, undefined, 1]) assert.equal(hasClinicalPriority({ isEmergencySuggested: flag }), false);
  assert.equal(hasClinicalPriority({ confidenceScore: 100, description: "khẩn cấp" }), false);
});
