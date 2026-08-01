export const ADMIN_SECTIONS = [
  "overview",
  "users",
  "doctors",
  "ai-configs",
  "subscriptions",
  "departments",
  "icd-chapters",
  "clinical-questions",
  "lab-indicators",
  "facilities",
  "patient-profiles",
];

const ADMIN_SECTION_TITLES = {
  overview: "Quản trị hệ thống",
  users: "Quản lý người dùng",
  doctors: "Quản lý bác sĩ",
  "ai-configs": "Cấu hình AI",
  subscriptions: "Quản lý gói dịch vụ",
  departments: "Quản lý chuyên khoa",
  "icd-chapters": "Quản lý chương ICD",
  "clinical-questions": "Quản lý câu hỏi lâm sàng",
  "lab-indicators": "Quản lý chỉ số xét nghiệm",
  facilities: "Quản lý cơ sở y tế",
  "patient-profiles": "Quản lý hồ sơ bệnh nhân",
};

const ADMIN_SECTION_NAVIGATION = {
  overview: { label: "Tổng quan", icon: "dashboard" },
  users: { label: "Người dùng", icon: "users" },
  doctors: { label: "Bác sĩ", icon: "doctor" },
  "ai-configs": { label: "Cấu hình AI", icon: "ai-config" },
  subscriptions: { label: "Gói dịch vụ", icon: "subscription" },
  departments: { label: "Chuyên khoa", icon: "departments" },
  "icd-chapters": { label: "Chương ICD", icon: "icd" },
  "clinical-questions": { label: "Câu hỏi lâm sàng", icon: "question" },
  "lab-indicators": { label: "Chỉ số xét nghiệm", icon: "lab-indicator" },
  facilities: { label: "Cơ sở y tế", icon: "facility" },
  "patient-profiles": { label: "Hồ sơ bệnh nhân", icon: "patient-profile" },
};

const BASE_ROUTES = [
  { id: "public.home", path: "/", title: "MediMate AI | Trợ lý sức khỏe", access: "public" },
  { id: "auth.login", path: "/login", title: "Đăng nhập | MediMate AI", access: "public", returnable: false },
  { id: "auth.signup", path: "/signup", title: "Tạo tài khoản | MediMate AI", access: "public", returnable: false },
  { id: "auth.doctor-register", path: "/register-doctor", title: "Đăng ký bác sĩ | MediMate AI", access: "public" },
  { id: "auth.forgot-password", path: "/forgot-password", title: "Khôi phục mật khẩu | MediMate AI", access: "public", returnable: false },
  { id: "auth.change-password", path: "/change-password", title: "Đổi mật khẩu | MediMate AI", access: "public", returnable: false },
  {
    id: "patient.dashboard",
    path: "/dashboard",
    title: "Tư vấn chuyên khoa | MediMate AI",
    access: "auth",
    shell: "patient",
    navigation: {
      shell: "patient",
      label: "Tư vấn chuyên khoa",
      hint: "Theo triệu chứng",
      icon: "dashboard",
      order: 10,
      mobile: true,
    },
    aliases: [
      { path: "/account", access: "auth" },
      { path: "/app/patient", access: "auth" },
    ],
  },
  {
    id: "assistant.intake",
    path: "/symptom",
    title: "Chẩn đoán lâm sàng | MediMate AI",
    access: "auth",
    shell: "patient",
    navigation: { shell: "patient", label: "Chẩn đoán lâm sàng", hint: "Làm rõ triệu chứng", icon: "symptom", order: 30 },
    aliases: ["/medical-assistant", "/medical-assistant/intake", "/symptom-chat"],
  },
  {
    id: "patient.chat",
    path: "/chat",
    title: "Chat với trợ lý AI | MediMate AI",
    access: "premium",
    shell: "patient",
  },
  {
    id: "public.map",
    path: "/map",
    title: "Tìm cơ sở y tế | MediMate AI",
    access: "public",
    navigation: { shell: "patient", label: "Bản đồ", hint: "Cơ sở gần bạn", icon: "map", order: 40, mobile: true },
  },
  {
    id: "patient.profile",
    path: "/profile",
    title: "Hồ sơ cá nhân | MediMate AI",
    access: "auth",
    shell: "patient",
    navigation: { shell: "patient", label: "Hồ sơ", hint: "Thông tin cá nhân", icon: "profile", order: 50, mobile: true },
  },
  {
    id: "patient.records",
    path: "/records",
    title: "Kết quả xét nghiệm | MediMate AI",
    access: "premium",
    shell: "patient",
    navigation: { shell: "patient", label: "Phân tích xét nghiệm", hint: "Đọc chỉ số xét nghiệm", icon: "records", order: 50 },
  },
  { id: "patient.recovery", path: "/recovery-plan", title: "Kế hoạch phục hồi | MediMate AI", access: "auth", shell: "patient", navigation: { shell: "patient", label: "Kế hoạch phục hồi", hint: "Theo dõi sau khám", icon: "recovery", order: 60 } },
  {
    id: "patient.medication",
    path: "/medication",
    title: "Kiểm tra thuốc | MediMate AI",
    access: "premium",
    shell: "patient",
    navigation: { shell: "patient", label: "Kiểm tra thuốc", hint: "Nhận diện nhãn thuốc", icon: "medication", order: 70 },
  },
  { id: "public.pricing", path: "/pricing", title: "Bảng giá | MediMate AI", access: "public" },
  { id: "public.support", path: "/support", title: "Hỗ trợ | MediMate AI", access: "public" },
  { id: "public.privacy", path: "/privacy", title: "Quyền riêng tư | MediMate AI", access: "public" },
  { id: "public.medical-disclaimer", path: "/medical-disclaimer", title: "Tuyên bố miễn trừ y tế | MediMate AI", access: "public" },
  { id: "payment.return", path: "/payment/return", title: "Thanh toán thành công | MediMate AI", access: "public", returnable: false },
  { id: "payment.cancel", path: "/payment/cancel", title: "Thanh toán đã hủy | MediMate AI", access: "public", returnable: false },
  { id: "workspace.redirect", path: "/app", title: "Không gian làm việc | MediMate AI", access: "public", returnable: false },
  {
    id: "assessment.session",
    path: "/assessment/:sessionId",
    title: "Câu hỏi lâm sàng | MediMate AI",
    access: "auth",
  },
  {
    id: "assessment.result",
    path: "/assessment/:sessionId/result",
    title: "Kết quả đánh giá | MediMate AI",
    access: "auth",
  },
  {
    id: "assessment.history",
    path: "/assessment/history",
    title: "Lịch sử đánh giá | MediMate AI",
    access: "auth",
    shell: "patient",
  },
  {
    id: "patient.profile-setup",
    path: "/patient/profile/setup",
    title: "Hoàn thiện hồ sơ | MediMate AI",
    access: "auth",
    returnable: false,
  },
  {
    id: "public.departments",
    path: "/departments",
    title: "MediMate AI | Trợ lý sức khỏe",
    access: "public",
    canonicalPath: "/",
    returnable: false,
  },
];

const ADMIN_ROUTES = ADMIN_SECTIONS.map((section) => ({
  id: `admin.${section}`,
  path: section === "overview" ? "/app/admin" : `/app/admin/${section}`,
  title: `${ADMIN_SECTION_TITLES[section]} | MediMate AI`,
  access: "role",
  roles: ["admin"],
  section,
  navigation: {
    shell: "admin",
    ...ADMIN_SECTION_NAVIGATION[section],
    order: (ADMIN_SECTIONS.indexOf(section) + 1) * 10,
  },
  aliases: section === "overview"
    ? ["/admin"]
    : section === "users"
      ? ["/admin/users"]
      : [],
}));

const ADMIN_DETAIL_ROUTES = [
  {
    id: "admin.lab-indicator-detail",
    path: "/app/admin/lab-indicators/:indicatorId",
    title: "Chi tiết chỉ số xét nghiệm | MediMate AI",
    access: "role",
    roles: ["admin"],
    section: "lab-indicators",
  },
];

export const ROUTES = [...BASE_ROUTES, ...ADMIN_ROUTES, ...ADMIN_DETAIL_ROUTES];

const ROUTES_BY_PATH = new Map();

for (const route of ROUTES) {
  ROUTES_BY_PATH.set(route.path, route);
  for (const alias of route.aliases ?? []) {
    const aliasDefinition = typeof alias === "string" ? { path: alias } : alias;
    ROUTES_BY_PATH.set(aliasDefinition.path, {
      ...route,
      ...aliasDefinition,
      aliasPath: aliasDefinition.path,
      canonicalPath: route.path,
    });
  }
}

function matchDynamicRoute(pathname) {
  const currentParts = pathname.split("/").filter(Boolean);

  for (const route of ROUTES) {
    if (!route.path.includes(":")) continue;
    const routeParts = route.path.split("/").filter(Boolean);
    if (routeParts.length !== currentParts.length) continue;

    const params = {};
    const matches = routeParts.every((part, index) => {
      if (part.startsWith(":")) {
        params[part.slice(1)] = decodeURIComponent(currentParts[index]);
        return true;
      }
      return part === currentParts[index];
    });

    if (matches) {
      return { ...route, params, matchedPath: pathname };
    }
  }

  return null;
}

export function resolveRoute(pathname) {
  return ROUTES_BY_PATH.get(pathname) ?? matchDynamicRoute(pathname);
}

export function getCanonicalPath(route) {
  return route?.canonicalPath ?? route?.matchedPath ?? route?.path ?? "";
}

export function getAdminSectionPath(section) {
  return section === "overview" ? "/app/admin" : `/app/admin/${section}`;
}

export function getNavigationModel(shell) {
  return ROUTES
    .filter((route) => route.navigation?.shell === shell)
    .sort((left, right) => left.navigation.order - right.navigation.order)
    .map((route) => ({
      id: route.id,
      path: route.path,
      access: route.access,
      roles: route.roles ?? [],
      ...route.navigation,
    }));
}
