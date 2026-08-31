import test from "node:test";
import assert from "node:assert/strict";
import { shouldSetupPatientProfile } from "../../src/utils/roles.js";
import { isSameProfileAccount, verifyPatientProfileSetup } from "../../src/utils/patientProfileCompletion.js";

const auth = { userId: "patient-a", accessToken: "old", roles: ["Patient"], isProfileCompleted: false };

test("a stale incomplete login cannot override an existing patient profile for the reminder", async () => {
  const context = await verifyPatientProfileSetup({
    auth,
    loadUser: async () => ({ data: { id: auth.userId, isProfileCompleted: false } }),
    findProfile: async () => ({ id: "saved-profile", userId: auth.userId }),
  });
  assert.equal(context.required, false);
});

test("the reminder eligibility follows completion updates rather than the initial snapshot", () => {
  assert.equal(shouldSetupPatientProfile(auth), true);
  assert.equal(shouldSetupPatientProfile({ ...auth, isProfileCompleted: true }), false);
  assert.equal(shouldSetupPatientProfile(null), false);
  for (const roles of [["Doctor"], ["Admin"], ["Patient", "Doctor"]]) {
    assert.equal(shouldSetupPatientProfile({ ...auth, roles }), false);
  }
});

test("a late missing-profile response cannot re-enable a reminder after a save or account switch", async () => {
  let finish;
  const lookup = new Promise((resolve) => { finish = resolve; });
  const pending = verifyPatientProfileSetup({
    auth, loadUser: async () => ({ data: { id: auth.userId } }), findProfile: () => lookup,
  });
  const savedAuth = { ...auth, accessToken: "refreshed", isProfileCompleted: true };
  finish(null);
  const context = await pending;
  const canShow = (currentAuth) => context.required
    && isSameProfileAccount(auth, currentAuth)
    && shouldSetupPatientProfile(currentAuth);
  assert.equal(canShow(savedAuth), false);
  assert.equal(canShow({ ...auth, userId: "patient-b" }), false);
  assert.equal(canShow(null), false);
  assert.equal(canShow({ ...auth, accessToken: "refreshed" }), true);
});
