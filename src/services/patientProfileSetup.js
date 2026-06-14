import { authApi, patientProfilesApi } from "./api";
import { normalizePersonalProfile } from "../utils/profileValidation";

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function findPatientProfileByUserId(userId, pageNumber = 1, pageSize = 100) {
  if (!userId) return null;

  const response = await patientProfilesApi.list(pageNumber, pageSize);
  const items = response.data?.items ?? [];

  return items.find((item) => String(item.userId).toLowerCase() === String(userId).toLowerCase()) ?? null;
}

export async function savePatientProfileSetup({ userId, existingProfileId, form }) {
  await authApi.updateUser(userId, normalizePersonalProfile(form));

  const patientPayload = {
    bloodType: form.bloodType || null,
    height: numberOrNull(form.height),
    weight: numberOrNull(form.weight),
    allergyNote: form.allergyNote.trim() || null,
    chronicDiseaseNote: form.chronicDiseaseNote.trim() || null,
  };

  if (existingProfileId) {
    return patientProfilesApi.update(existingProfileId, patientPayload);
  }

  return patientProfilesApi.create({
    ...patientPayload,
    userId,
  });
}
