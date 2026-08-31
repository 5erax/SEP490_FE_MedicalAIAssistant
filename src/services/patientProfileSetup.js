import { authApi, getStoredAuth, mergeAuthWithCurrentUser, patientProfilesApi, setStoredAuth, usersApi } from "./api";
import { isSameProfileAccount } from "../utils/patientProfileCompletion";
import {
  normalizeChronicDiseases,
  normalizePersonalProfile,
  normalizePhoneProfile,
} from "../utils/profileValidation";

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function findPatientProfileByUserId(userId) {
  return patientProfilesApi.findByUserId(userId);
}

export function rememberCompletedPatientProfile(expectedAuth, user) {
  const currentAuth = getStoredAuth();
  if (!isSameProfileAccount(expectedAuth, currentAuth)) return null;
  // Use the current token, not the snapshot captured before a slow request/refresh.
  const nextAuth = mergeAuthWithCurrentUser(currentAuth, { ...(user ?? currentAuth), isProfileCompleted: true });
  setStoredAuth(nextAuth);
  return nextAuth;
}

export async function savePatientProfileSetup({ userId, existingProfileId, form }) {
  await usersApi.updateMe(normalizePersonalProfile(form));
  await usersApi.updatePhone(normalizePhoneProfile(form));

  const chronicDiseases = Array.isArray(form.chronicDiseases)
    ? form.chronicDiseases
      .map((disease) => ({
        id: disease.id || undefined,
        diseaseName: String(disease.diseaseName ?? "").trim(),
        from: disease.from || null,
        to: disease.to || null,
        note: String(disease.note ?? "").trim() || null,
      }))
      .filter((disease) => disease.diseaseName)
    : normalizeChronicDiseases(form.chronicDiseaseNote);

  const patientPayload = {
    bloodType: form.bloodType || null,
    height: numberOrNull(form.height),
    weight: numberOrNull(form.weight),
    allergyNote: form.allergyNote.trim() || null,
    chronicDiseases,
  };

  const profileResponse = existingProfileId
    ? await patientProfilesApi.update(existingProfileId, patientPayload)
    : await patientProfilesApi.create({
      ...patientPayload,
      userId,
    });

  const currentUserResponse = await authApi.me();

  return {
    profileResponse,
    currentUser: currentUserResponse.data ?? {},
  };
}
