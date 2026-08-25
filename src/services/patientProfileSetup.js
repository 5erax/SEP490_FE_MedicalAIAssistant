import { authApi, patientProfilesApi, usersApi } from "./api";
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
