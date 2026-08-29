function toDateOnly(value) {
  return value ? String(value).slice(0, 10) : "";
}

export function getLocalIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getActiveMedicationReminderTimes(medication) {
  return (medication?.reminderTimes ?? []).filter((item) => item?.isActive !== false);
}

export function getMedicationReminderStatus(medication, today = getLocalIsoDate()) {
  const activeTimes = getActiveMedicationReminderTimes(medication);

  if (!medication?.isReminderEnabled || activeTimes.length === 0) {
    return {
      key: "off",
      label: "Không nhắc",
      description: "Chưa bật lịch nhắc",
      emptyText: "Chưa có giờ nhắc",
      badgeTone: "neutral",
      active: false,
    };
  }

  const startDate = toDateOnly(medication.startDate);
  const endDate = toDateOnly(medication.endDate);

  if (!startDate || !endDate) {
    return {
      key: "incomplete",
      label: "Thiếu lịch",
      description: "Thiếu ngày dùng thuốc",
      emptyText: "Cần bổ sung ngày dùng thuốc",
      badgeTone: "warning",
      active: false,
    };
  }

  if (today < startDate) {
    return {
      key: "scheduled",
      label: "Sắp nhắc",
      description: "Sắp bật lịch nhắc",
      emptyText: "Lịch nhắc chưa đến ngày bắt đầu",
      badgeTone: "warning",
      active: false,
    };
  }

  if (today > endDate) {
    return {
      key: "expired",
      label: "Đã hết hạn",
      description: "Đã qua ngày kết thúc",
      emptyText: "Lịch nhắc đã hết hạn",
      badgeTone: "danger",
      active: false,
    };
  }

  return {
    key: "active",
    label: "Đang nhắc",
    description: "Đang bật lịch nhắc",
    emptyText: "Chưa có giờ nhắc",
    badgeTone: "success",
    active: true,
  };
}
