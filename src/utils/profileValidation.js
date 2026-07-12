const PHONE_PATTERN = /^(?:0\d{8,10}|\+[1-9]\d{8,14})$/;
const MAX_NOTE_LENGTH = 1000;

export function getChronicDiseaseText(profile) {
  if (Array.isArray(profile?.chronicDiseases) && profile.chronicDiseases.length > 0) {
    return profile.chronicDiseases
      .map((disease) => disease?.diseaseName)
      .filter(Boolean)
      .join("\n");
  }

  return profile?.chronicDiseaseNote ?? "";
}

export function normalizeChronicDiseases(value) {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((diseaseName) => diseaseName.trim())
    .filter(Boolean)
    .map((diseaseName) => ({
      diseaseName,
      from: null,
      to: null,
      note: null,
    }));
}

export function normalizePhoneNumber(value) {
  return String(value ?? "").trim().replace(/[\s.-]/g, "");
}

function isDateInRange(value) {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  const earliest = new Date("1900-01-01T00:00:00");
  return date >= earliest && date <= today;
}

function validateMeasurement(value, minimum, maximum, label) {
  if (value === "" || value === null || value === undefined) return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < minimum || numeric > maximum) {
    return `${label} phải từ ${minimum} đến ${maximum}.`;
  }
  return "";
}

export function validatePersonalProfile(form, { required = false } = {}) {
  const errors = {};
  const displayName = String(form.displayName ?? "").trim();
  const address = String(form.address ?? "").trim();
  const phoneNumber = normalizePhoneNumber(form.phoneNumber);

  if (!displayName) {
    errors.displayName = "Vui lòng nhập họ và tên.";
  } else if (displayName.length < 2 || displayName.length > 100) {
    errors.displayName = "Họ và tên phải có từ 2 đến 100 ký tự.";
  }

  if (required && !form.dateOfBirth) {
    errors.dateOfBirth = "Vui lòng chọn ngày sinh.";
  } else if (form.dateOfBirth && !isDateInRange(form.dateOfBirth)) {
    errors.dateOfBirth = "Ngày sinh phải từ năm 1900 đến hôm nay.";
  }

  if (required && !phoneNumber) {
    errors.phoneNumber = "Vui lòng nhập số điện thoại.";
  } else if (phoneNumber && !PHONE_PATTERN.test(phoneNumber)) {
    errors.phoneNumber = "Số điện thoại phải có 9-15 chữ số và có thể bắt đầu bằng +.";
  }

  if (required && !address) {
    errors.address = "Vui lòng nhập địa chỉ.";
  } else if (address && (address.length < 5 || address.length > 255)) {
    errors.address = "Địa chỉ phải có từ 5 đến 255 ký tự.";
  }

  if (!["0", "1", "2"].includes(String(form.gender))) {
    errors.gender = "Vui lòng chọn giới tính hợp lệ.";
  }

  return errors;
}

export function validateMedicalProfile(form) {
  const errors = {};
  const heightError = validateMeasurement(form.height, 40, 250, "Chiều cao (cm)");
  const weightError = validateMeasurement(form.weight, 2, 500, "Cân nặng (kg)");

  if (heightError) errors.height = heightError;
  if (weightError) errors.weight = weightError;

  if (String(form.allergyNote ?? "").trim().length > MAX_NOTE_LENGTH) {
    errors.allergyNote = `Thông tin dị ứng không được vượt quá ${MAX_NOTE_LENGTH} ký tự.`;
  }
  if (String(form.chronicDiseaseNote ?? "").trim().length > MAX_NOTE_LENGTH) {
    errors.chronicDiseaseNote = `Thông tin bệnh nền không được vượt quá ${MAX_NOTE_LENGTH} ký tự.`;
  }

  return errors;
}

export function normalizePersonalProfile(form) {
  return {
    displayName: String(form.displayName ?? "").trim(),
    address: String(form.address ?? "").trim(),
    gender: Number(form.gender),
    dateOfBirth: form.dateOfBirth || null,
    phoneNumber: normalizePhoneNumber(form.phoneNumber) || null,
  };
}
