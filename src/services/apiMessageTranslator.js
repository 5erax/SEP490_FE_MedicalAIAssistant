const HTTP_STATUS_MESSAGES = Object.freeze({
  200: "Thao tác đã được thực hiện thành công.",
  201: "Dữ liệu đã được tạo thành công.",
  204: "Thao tác đã được thực hiện thành công.",

  400: "Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.",
  401: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu được yêu cầu.",
  405: "Phương thức gửi yêu cầu không được hỗ trợ.",
  409: "Dữ liệu đang bị xung đột. Vui lòng kiểm tra lại.",
  422: "Dữ liệu chưa đáp ứng yêu cầu xử lý.",
  429: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.",

  500: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
  502: "Không thể kết nối với dịch vụ xử lý. Vui lòng thử lại sau.",
  503: "Dịch vụ hiện không khả dụng. Vui lòng thử lại sau.",
  504: "Dịch vụ phản hồi quá lâu. Vui lòng thử lại sau.",
});

/**
 * Các message cố định đang được backend trả về.
 *
 * Quy tắc:
 * - Key phải giống chính xác message của backend.
 * - Value là nội dung sẽ hiển thị cho người dùng.
 * - Không đặt dấu cách thừa ở đầu/cuối key.
 */
const EXACT_MESSAGES = Object.freeze({
  // Common
  OK: "Thao tác thành công.",
  "Bad Request": "Yêu cầu không hợp lệ.",
  Unauthorized: "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.",
  Forbidden: "Bạn không có quyền thực hiện thao tác này.",
  "Not Found": "Không tìm thấy dữ liệu được yêu cầu.",
  Conflict: "Dữ liệu đang bị xung đột.",
  "One or more validation errors occurred.":
    "Một hoặc nhiều dữ liệu chưa hợp lệ.",

  // Authentication
  "Registration failed": "Đăng ký tài khoản thất bại.",
  "Registration succeeded": "Đăng ký tài khoản thành công.",

  "Doctor registration failed":
    "Đăng ký tài khoản bác sĩ thất bại.",
  "Doctor account created. Status is pending until approved.":
    "Tài khoản bác sĩ đã được tạo và đang chờ quản trị viên phê duyệt.",

  "Invalid email or password.":
    "Email hoặc mật khẩu không chính xác.",
  "Login succeeded": "Đăng nhập thành công.",

  "Google login failed":
    "Đăng nhập bằng Google thất bại.",
  "Invalid Google credential.":
    "Thông tin xác thực Google không hợp lệ.",
  "Credential is required.":
    "Thiếu thông tin xác thực Google.",
  "Google ClientId is not configured.":
    "Đăng nhập Google chưa được cấu hình trên hệ thống.",
  "Google account does not provide an email.":
    "Tài khoản Google không cung cấp địa chỉ email.",

  "Refresh token missing, invalid, or expired.":
    "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  "Token refreshed.":
    "Phiên đăng nhập đã được gia hạn.",
  "Logged out.":
    "Đăng xuất thành công.",

  "Forgot password failed":
    "Không thể gửi yêu cầu đặt lại mật khẩu.",
  "If the email exists, an OTP has been sent.":
    "Nếu email tồn tại trong hệ thống, mã OTP đã được gửi.",

  "Change password failed":
    "Đổi mật khẩu thất bại.",
  "Password changed successfully.":
    "Đổi mật khẩu thành công.",

  "Approve user failed.":
    "Phê duyệt tài khoản thất bại.",
  "User approved.":
    "Tài khoản đã được phê duyệt.",

  // Authentication validation
  "Password and confirmation do not match.":
    "Mật khẩu xác nhận không khớp.",
  "New password and confirmation do not match.":
    "Mật khẩu mới và mật khẩu xác nhận không khớp.",
  "Email is required.":
    "Email là bắt buộc.",
  "OTP is required.":
    "Mã OTP là bắt buộc.",
  "New password is required.":
    "Mật khẩu mới là bắt buộc.",
  "OTP is invalid or expired.":
    "Mã OTP không hợp lệ hoặc đã hết hạn.",
  "Unable to send OTP email. Please try again later.":
    "Không thể gửi email OTP. Vui lòng thử lại sau.",

  // Web chatbot
  "Send message failed.":
    "Không thể gửi tin nhắn.",
  "Message is required.":
    "Vui lòng nhập nội dung tin nhắn.",
  "Web chatbot is unavailable.":
    "Trợ lý AI hiện không khả dụng.",
  "The AI chatbot service is currently unavailable. Please try again later.":
    "Dịch vụ trợ lý AI hiện không khả dụng. Vui lòng thử lại sau.",
});

const FIELD_LABELS = Object.freeze({
  email: "Email",
  password: "Mật khẩu",
  currentpassword: "Mật khẩu hiện tại",
  newpassword: "Mật khẩu mới",
  confirmpassword: "Xác nhận mật khẩu",
  confirmnewpassword: "Xác nhận mật khẩu mới",
  username: "Tên đăng nhập",
  displayname: "Tên hiển thị",
  fullname: "Họ và tên",
  address: "Địa chỉ",
  gender: "Giới tính",
  dateofbirth: "Ngày sinh",
  otp: "Mã OTP",
  message: "Nội dung tin nhắn",
  name: "Tên",
  description: "Mô tả",
  phone: "Số điện thoại",
  phonenumber: "Số điện thoại",
});

/**
 * Map tên entity thường xuất hiện trong message backend.
 */
const ENTITY_LABELS = Object.freeze({
  user: "người dùng",
  doctor: "bác sĩ",
  patient: "bệnh nhân",
  profile: "hồ sơ",
  "patient profile": "hồ sơ bệnh nhân",
  facility: "cơ sở y tế",
  "medical facility": "cơ sở y tế",
  department: "chuyên khoa",
  "medical department": "chuyên khoa",
  subscription: "gói đăng ký",
  "subscription plan": "gói dịch vụ",
  payment: "giao dịch thanh toán",
  invitation: "lời mời",
  "doctor invitation": "lời mời bác sĩ",
  question: "câu hỏi",
  "clinical question": "câu hỏi lâm sàng",
  "ai config": "cấu hình AI",
  "ai configuration": "cấu hình AI",
  "lab test": "xét nghiệm",
  medication: "thuốc",
  "recovery plan": "kế hoạch phục hồi",
  feedback: "phản hồi",
  review: "đánh giá",
});

const MESSAGE_PATTERNS = [
  // ASP.NET Identity password errors
  {
    pattern: /^Passwords must be at least (\d+) characters\.?$/i,
    translate: (_, minimumLength) =>
      `Mật khẩu phải có ít nhất ${minimumLength} ký tự.`,
  },
  {
    pattern:
      /^Passwords must have at least one non alphanumeric character\.?$/i,
    translate: () =>
      "Mật khẩu phải có ít nhất một ký tự đặc biệt.",
  },
  {
    pattern: /^Passwords must have at least one digit.*$/i,
    translate: () =>
      "Mật khẩu phải có ít nhất một chữ số.",
  },
  {
    pattern: /^Passwords must have at least one uppercase.*$/i,
    translate: () =>
      "Mật khẩu phải có ít nhất một chữ cái viết hoa.",
  },
  {
    pattern: /^Passwords must have at least one lowercase.*$/i,
    translate: () =>
      "Mật khẩu phải có ít nhất một chữ cái viết thường.",
  },
  {
    pattern: /^Email ['"].+['"] is already taken\.?$/i,
    translate: () =>
      "Email này đã được sử dụng.",
  },
  {
    pattern: /^Username ['"].+['"] is already taken\.?$/i,
    translate: () =>
      "Tên đăng nhập này đã được sử dụng.",
  },

  // ASP.NET validation
  {
    pattern: /^The (.+) field is required\.?$/i,
    translate: (_, fieldName) =>
      `${getFieldLabel(fieldName)} là bắt buộc.`,
  },
  {
    pattern:
      /^The (.+) field is not a valid e-mail address\.?$/i,
    translate: (_, fieldName) =>
      `${getFieldLabel(fieldName)} không đúng định dạng email.`,
  },
  {
    pattern:
      /^The field (.+) must be a string with a minimum length of (\d+) and a maximum length of (\d+)\.?$/i,
    translate: (_, fieldName, minimum, maximum) =>
      `${getFieldLabel(fieldName)} phải có từ ${minimum} đến ${maximum} ký tự.`,
  },

  // Chatbot
  {
    pattern: /^Message must be (\d+) characters or fewer\.?$/i,
    translate: (_, maximum) =>
      `Tin nhắn không được vượt quá ${maximum} ký tự.`,
  },

  // Common dynamic CRUD messages
  {
    pattern: /^(.+) not found\.?$/i,
    translate: (_, entity) =>
      `Không tìm thấy ${getEntityLabel(entity)}.`,
  },
  {
    pattern: /^(.+) already exists\.?$/i,
    translate: (_, entity) =>
      `${capitalize(getEntityLabel(entity))} đã tồn tại.`,
  },
  {
    pattern: /^(.+) created successfully\.?$/i,
    translate: (_, entity) =>
      `${capitalize(getEntityLabel(entity))} đã được tạo thành công.`,
  },
  {
    pattern: /^(.+) updated successfully\.?$/i,
    translate: (_, entity) =>
      `${capitalize(getEntityLabel(entity))} đã được cập nhật thành công.`,
  },
  {
    pattern: /^(.+) deleted successfully\.?$/i,
    translate: (_, entity) =>
      `${capitalize(getEntityLabel(entity))} đã được xóa thành công.`,
  },

  // Generic security
  {
    pattern: /^Incorrect password\.?$/i,
    translate: () =>
      "Mật khẩu hiện tại không chính xác.",
  },
  {
    pattern: /^Invalid token\.?$/i,
    translate: () =>
      "Mã xác thực không hợp lệ hoặc đã hết hạn.",
  },
];

function normalizeMessage(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function normalizeLookupKey(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function normalizeEntityKey(value) {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/[.:]+$/g, "")
    .trim()
    .toLowerCase();
}

function getFieldLabel(fieldName) {
  const normalized = normalizeLookupKey(fieldName);

  return (
    FIELD_LABELS[normalized] ||
    String(fieldName).trim() ||
    "Trường dữ liệu"
  );
}

function getEntityLabel(entityName) {
  const normalized = normalizeEntityKey(entityName);

  return ENTITY_LABELS[normalized] || normalized;
}

function capitalize(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isVietnameseMessage(message) {
  return /[ăâđêôơưà-ỹ]/i.test(message);
}

function isDevelopmentEnvironment() {
  return Boolean(import.meta.env?.DEV);
}

function reportUntranslatedMessage(message, status) {
  if (!isDevelopmentEnvironment()) {
    return;
  }

  console.warn("[API message chưa được dịch]", {
    status,
    message,
  });
}

/**
 * Lấy fallback theo HTTP status.
 */
export function getApiStatusMessage(status) {
  return (
    HTTP_STATUS_MESSAGES[status] ||
    "Không thể thực hiện yêu cầu. Vui lòng thử lại sau."
  );
}

/**
 * Dịch một message riêng lẻ.
 *
 * @param {unknown} value
 * @param {{ status?: number, fallback?: string }} options
 * @returns {string}
 */
export function translateApiMessage(
  value,
  { status, fallback } = {},
) {
  const message = normalizeMessage(value);

  if (!message) {
    return fallback || "";
  }

  // Message đã là tiếng Việt thì giữ nguyên.
  if (isVietnameseMessage(message)) {
    return message;
  }

  const exactTranslation = EXACT_MESSAGES[message];

  if (exactTranslation) {
    return exactTranslation;
  }

  for (const item of MESSAGE_PATTERNS) {
    const match = message.match(item.pattern);

    if (match) {
      return item.translate(...match);
    }
  }

  // Giúp developer phát hiện message BE mới trong lúc chạy local.
  reportUntranslatedMessage(message, status);

  // Không hiển thị message kỹ thuật tiếng Anh chưa được kiểm duyệt.
  return fallback || getApiStatusMessage(status);
}

function translateApiErrorValue(value, status) {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        translateApiMessage(item, {
          status,
          fallback: "",
        }),
      )
      .filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [
          key,
          translateApiErrorValue(item, status),
        ])
        .filter(([, item]) => {
          if (Array.isArray(item)) {
            return item.length > 0;
          }

          if (item && typeof item === "object") {
            return Object.keys(item).length > 0;
          }

          return Boolean(item);
        }),
    );
  }

  return translateApiMessage(value, {
    status,
    fallback: "",
  });
}

/**
 * Chỉ dịch các field thông báo.
 *
 * Không thay đổi:
 * - data
 * - content AI
 * - diagnosis
 * - medical result
 */
export function localizeApiPayload(rawPayload, status) {
  if (!rawPayload || typeof rawPayload !== "object") {
    return rawPayload;
  }

  const payload = {
    ...rawPayload,
  };

  if (payload.message) {
    payload.message = translateApiMessage(payload.message, {
      status,
    });
  }

  if (payload.title) {
    payload.title = translateApiMessage(payload.title, {
      status,
    });
  }

  if (payload.errors) {
    payload.errors = translateApiErrorValue(
      payload.errors,
      status,
    );
  }

  return payload;
}