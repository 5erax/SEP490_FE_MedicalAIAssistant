import test from "node:test";
import assert from "node:assert/strict";
import { resolveExplorerSideMode } from "../../src/utils/facilityExplorerState.js";

const ready = {
  selectedMode: null,
  isClinicalFlow: true,
  clinicalStatus: "ready",
  recommendedDepartment: { departmentId: "respiratory", departmentName: "Khoa Hô Hấp" },
};

test("clinical recommendations open advice by default once restored", () => {
  assert.equal(resolveExplorerSideMode({ ...ready, clinicalStatus: "loading", recommendedDepartment: null }), "list");
  assert.equal(resolveExplorerSideMode(ready), "advice");
  assert.equal(resolveExplorerSideMode({ ...ready, recommendedDepartment: { departmentName: "Khoa Hô Hấp" } }), "advice");
});

test("normal maps and unavailable or empty recommendations keep the facility list", () => {
  assert.equal(resolveExplorerSideMode({ ...ready, isClinicalFlow: false }), "list");
  for (const clinicalStatus of ["idle", "loading", "locked", "error", "empty"]) {
    assert.equal(resolveExplorerSideMode({ ...ready, clinicalStatus }), "list");
  }
  for (const recommendedDepartment of [null, {}, { departmentId: "", departmentName: " " }]) {
    assert.equal(resolveExplorerSideMode({ ...ready, recommendedDepartment }), "list");
  }
});

test("late recommendations never override the user's list, advice or filter selection", () => {
  for (const selectedMode of ["list", "advice", "filters"]) {
    assert.equal(resolveExplorerSideMode({ ...ready, selectedMode }), selectedMode);
    assert.equal(resolveExplorerSideMode({ ...ready, selectedMode, clinicalStatus: "loading" }), selectedMode);
  }
});
