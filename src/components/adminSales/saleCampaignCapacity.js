export function getCapacityErrors(form, capacity = {}) {
  const total = form.maxRedemptions === "" || form.maxRedemptions == null ? null : Number(form.maxRedemptions);
  const perUser = form.maxRedemptionsPerUser === "" || form.maxRedemptionsPerUser == null ? null : Number(form.maxRedemptionsPerUser);
  const errors = {};
  if (total != null && (!Number.isInteger(total) || total < 1)) {
    errors.maxRedemptions = "Tổng suất phải là số nguyên từ 1 trở lên.";
  } else if (total != null && total < capacity.occupiedRedemptions) {
    errors.maxRedemptions = `Đã có ${capacity.occupiedRedemptions} suất được sử dụng hoặc đang giữ chỗ. Tổng suất không được thấp hơn ${capacity.occupiedRedemptions}.`;
  }
  if (perUser != null && (!Number.isInteger(perUser) || perUser < 1)) {
    errors.maxRedemptionsPerUser = "Suất mỗi người phải là số nguyên từ 1 trở lên.";
  } else if (perUser != null && perUser < capacity.maxOccupiedPerUser) {
    errors.maxRedemptionsPerUser = `Đã có người dùng sử dụng hoặc giữ chỗ ${capacity.maxOccupiedPerUser} suất. Giới hạn mỗi người không được thấp hơn ${capacity.maxOccupiedPerUser}.`;
  } else if (total != null && perUser != null && perUser > total) {
    errors.maxRedemptionsPerUser = "Suất mỗi người không được lớn hơn tổng suất.";
  }
  return errors;
}

// Read every history page: a user's reservations may span several pages.
// Released reservations do not consume capacity. The backend still validates
// atomically at update time, since purchases can happen after this snapshot.
export async function loadSaleCampaignCapacity(api, id) {
  const response = await api.get(id);
  const campaign = response?.data;
  if (!campaign || !Number.isInteger(campaign.occupiedRedemptions)) {
    throw new Error("Chưa thể xác minh số suất đã sử dụng. Vui lòng tải lại và thử lại.");
  }
  const perUser = new Map();
  const seen = new Set();
  let pageNumber = 1;
  let totalPages;
  do {
    const history = await api.redemptions(id, pageNumber, 100);
    const page = history?.data;
    if (!Array.isArray(page?.items)) throw new Error("Chưa thể xác minh lịch sử sử dụng ưu đãi.");
    totalPages = Number(page.totalPages) || Math.ceil(Number(page.totalCount || 0) / Number(page.pageSize || 100)) || 1;
    for (const item of page.items) {
      if (!item.id || !item.userId) throw new Error("Lịch sử ưu đãi thiếu thông tin để kiểm tra giới hạn.");
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      if (["reserved", "completed"].includes(String(item.status).toLowerCase())) {
        perUser.set(item.userId, (perUser.get(item.userId) || 0) + 1);
      }
    }
    pageNumber += 1;
  } while (pageNumber <= totalPages);
  return {
    campaign,
    capacity: {
      occupiedRedemptions: campaign.occupiedRedemptions,
      maxOccupiedPerUser: Math.max(0, ...perUser.values()),
    },
  };
}
