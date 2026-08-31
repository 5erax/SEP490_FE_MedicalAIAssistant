import test from "node:test";
import assert from "node:assert/strict";
import { getProfileAccountKey, isSameProfileAccount, resolveProfileCompletion, verifyPatientProfileSetup } from "../../src/utils/patientProfileCompletion.js";

const auth = { accessToken: "old-token", userId: "patient-a", roles: ["Patient"] };
const user = { id: "patient-a", isProfileCompleted: false };
const verify = (overrides = {}) => verifyPatientProfileSetup({
  auth, loadUser: async () => ({ data: user }), findProfile: async () => null, ...overrides,
});

test("partial account/refresh responses preserve known completion without inventing false", () => {
  for (const data of [{}, { isProfileCompleted: null }, { isProfileCompleted: undefined }]) {
    assert.equal(resolveProfileCompletion(data, { isProfileCompleted: true }), true);
    assert.equal(resolveProfileCompletion(data, { isProfileCompleted: false }), false);
    assert.equal(resolveProfileCompletion(data), undefined);
  }
  assert.equal(resolveProfileCompletion({ isProfileCompleted: false }, { isProfileCompleted: true }), false);
});

test("a confirmed complete user does not need another profile lookup", async () => {
  const result = await verify({
    loadUser: async () => ({ data: { ...user, isProfileCompleted: true } }),
    findProfile: () => assert.fail("must not fetch an already complete profile"),
  });
  assert.equal(result.required, false);
});

test("existing profiles suppress setup even if cached completion is false or missing", async () => {
  for (const isProfileCompleted of [false, undefined]) {
    const result = await verify({
      loadUser: async () => ({ data: { ...user, isProfileCompleted } }),
      findProfile: async () => ({ id: "profile-a", userId: "patient-a" }),
    });
    assert.equal(result.required, false);
  }
});

test("verification never decides to show setup before a slow profile lookup finishes", async () => {
  let finish;
  const delayed = new Promise((resolve) => { finish = resolve; });
  let resolved = false;
  const result = verify({ findProfile: () => delayed }).then((value) => { resolved = true; return value; });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(resolved, false);
  finish({ id: "profile-a" });
  assert.equal((await result).required, false);
});

test("a successfully confirmed absent profile still requires onboarding", async () => {
  const result = await verify();
  assert.equal(result.required, true);
  assert.equal(result.userId, "patient-a");
});

test("network and authentication errors never become an absent profile", async () => {
  await assert.rejects(verify({ loadUser: async () => { throw new Error("offline"); } }), /offline/);
  for (const status of [401, 403, 500]) {
    await assert.rejects(verify({ findProfile: async () => { throw Object.assign(new Error("lookup failed"), { status }); } }), /lookup failed/);
  }
});

test("malformed responses and a changed account fail closed", async () => {
  for (const data of [null, [], "invalid"]) await assert.rejects(verify({ loadUser: async () => ({ data }) }));
  for (const profile of [undefined, [], {}, "invalid"]) await assert.rejects(verify({ findProfile: async () => profile }));
  await assert.rejects(verify({ loadUser: async () => ({ data: { id: "patient-b" } }) }), /thay đổi/);
  await assert.rejects(verify({ auth: { accessToken: "token" }, loadUser: async () => ({ data: {} }) }), /xác định/);
});

test("profile verification stays scoped to the user across token rotation and logout", () => {
  assert.equal(getProfileAccountKey(auth), getProfileAccountKey({ ...auth, accessToken: "refreshed-token" }));
  assert.equal(isSameProfileAccount(auth, { ...auth, accessToken: "refreshed-token" }), true);
  assert.equal(isSameProfileAccount(auth, { ...auth, userId: "patient-b" }), false);
  assert.equal(isSameProfileAccount(auth, null), false);
  const token = (suffix) => `e30.${Buffer.from(JSON.stringify({ sub: "patient-a" })).toString("base64url")}.${suffix}`;
  assert.equal(getProfileAccountKey({ accessToken: token("old") }), getProfileAccountKey({ accessToken: token("new") }));
});
