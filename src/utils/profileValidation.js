const PHONE_PATTERN = /^(?:0\d{8,10}|\+[1-9]\d{8,14})$/;
const MAX_NOTE_LENGTH = 1000;
export const MINIMUM_DATE_OF_BIRTH = "1890-01-01";
export const MINIMUM_PATIENT_AGE = 16;
export const MAXIMUM_PATIENT_AGE = 100;

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

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function getLatestAllowedBirthDate(today = new Date()) {
  return formatDateInputValue(new Date(
    today.getFullYear() - MINIMUM_PATIENT_AGE,
    today.getMonth(),
    today.getDate(),
  ));
}

function calculateAge(dateOfBirth, today) {
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const birthdayHasNotOccurred = (
    today.getMonth() < dateOfBirth.getMonth()
    || (
      today.getMonth() === dateOfBirth.getMonth()
      && today.getDate() < dateOfBirth.getDate()
    )
  );

  if (birthdayHasNotOccurred) age -= 1;
  return age;
}

export function getEarliestAllowedBirthDate(today = new Date()) {
  const targetYear = today.getFullYear() - MAXIMUM_PATIENT_AGE - 1;
  const lastDayOfTargetMonth = new Date(
    targetYear,
    today.getMonth() + 1,
    0,
  ).getDate();
  const cutoff = new Date(
    targetYear,
    today.getMonth(),
    Math.min(today.getDate(), lastDayOfTargetMonth),
  );
  cutoff.setDate(cutoff.getDate() + 1);
  return formatDateInputValue(cutoff);
}

export function normalizeGender(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["male", "1"].includes(normalized)) return "male";
  if (["female", "2"].includes(normalized)) return "female";
  return "";
}

export function validateDateOfBirth(value, { today = new Date() } = {}) {
  if (!value) return "Vui lòng nhập ngày sinh.";

  const dateOfBirth = parseDateInputValue(value);
  if (!dateOfBirth) return "Ngày sinh không hợp lệ. Vui lòng kiểm tra lại.";

  const earliest = parseDateInputValue(MINIMUM_DATE_OF_BIRTH);
  if (dateOfBirth < earliest) {
    return "Ngày sinh phải từ ngày 01/01/1890 trở đi.";
  }

  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (dateOfBirth > todayAtMidnight) return "Ngày sinh không thể nằm trong tương lai.";

  const age = calculateAge(dateOfBirth, todayAtMidnight);
  if (age < MINIMUM_PATIENT_AGE) {
    return "Bạn phải đủ ít nhất 16 tuổi để sử dụng hệ thống.";
  }

  if (age > MAXIMUM_PATIENT_AGE) {
    return "Tuổi không được vượt quá 100. Vui lòng kiểm tra lại ngày sinh.";
  }

  return "";
}

function validateMeasurement(value, minimum, maximum, label) {
  if (value === "" || value === null || value === undefined) return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < minimum || numeric > maximum) {
    return `${label} phải từ ${minimum} đến ${maximum}.`;
  }
  return "";
}

export function validatePersonalProfile(
  form,
  { required = false, requireDateOfBirth = required } = {},
) {
  const errors = {};
  const displayName = String(form.displayName ?? "").trim();
  const address = String(form.address ?? "").trim();
  const phoneNumber = normalizePhoneNumber(form.phoneNumber);

  if (!displayName) {
    errors.displayName = "Vui lòng nhập họ và tên.";
  } else if (displayName.length < 2 || displayName.length > 100) {
    errors.displayName = "Họ và tên phải có từ 2 đến 100 ký tự.";
  }

  const dateOfBirthError = validateDateOfBirth(form.dateOfBirth);
  if (requireDateOfBirth || form.dateOfBirth) {
    if (dateOfBirthError) errors.dateOfBirth = dateOfBirthError;
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

  if (!normalizeGender(form.gender)) {
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
  if (Array.isArray(form.chronicDiseases)) {
    form.chronicDiseases.forEach((disease, index) => {
      const diseaseName = String(disease?.diseaseName ?? "").trim();
      const from = String(disease?.from ?? "").trim();
      const to = String(disease?.to ?? "").trim();
      const note = String(disease?.note ?? "").trim();
      const hasDiseaseDetails = Boolean(diseaseName || from || to || note);

      if (hasDiseaseDetails && !diseaseName) {
        errors[`chronicDiseases.${index}.diseaseName`] = "Vui lòng nhập tên bệnh nền.";
      } else if (diseaseName.length > 160) {
        errors[`chronicDiseases.${index}.diseaseName`] = "Tên bệnh không được vượt quá 160 ký tự.";
      }
      if (from && to && to < from) {
        errors[`chronicDiseases.${index}.to`] = "Đến ngày không được trước từ ngày.";
      }
      if (note.length > MAX_NOTE_LENGTH) {
        errors[`chronicDiseases.${index}.note`] = `Ghi chú bệnh nền không được vượt quá ${MAX_NOTE_LENGTH} ký tự.`;
      }
    });
  }

  return errors;
}

export function normalizePersonalProfile(form) {
  return {
    displayName: String(form.displayName ?? "").trim(),
    address: String(form.address ?? "").trim() || null,
    gender: normalizeGender(form.gender) || null,
    dateOfBirth: form.dateOfBirth,
  };
}

export function normalizePhoneProfile(form) {
  return {
    phoneNumber: normalizePhoneNumber(form.phoneNumber) || null,
  };
}
