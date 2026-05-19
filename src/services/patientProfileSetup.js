import { authApi, patientProfilesApi } from "./api";

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function savePatientProfileSetup({ userId, existingProfileId, form }) {
  await authApi.updateUser(userId, {
    displayName: form.displayName.trim(),
    address: form.address.trim(),
    gender: Number(form.gender),
    dateOfBirth: form.dateOfBirth || null,
    phoneNumber: form.phoneNumber.trim(),
  });

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

