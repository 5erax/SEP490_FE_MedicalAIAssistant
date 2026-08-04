const HTTP_STATUS_MESSAGES = Object.freeze({
  0: "Không thể kết nối với máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.",
  200: "Thao tác đã được thực hiện thành công.",
  201: "Dữ liệu đã được tạo thành công.",
  204: "Thao tác đã được thực hiện thành công.",

  400: "Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.",
  401: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu được yêu cầu.",
  405: "Phương thức gửi yêu cầu không được hỗ trợ.",
  408: "Yêu cầu mất quá nhiều thời gian để xử lý. Vui lòng thử lại.",
  409: "Dữ liệu đang bị xung đột. Vui lòng kiểm tra lại.",
  413: "Dữ liệu tải lên vượt quá dung lượng cho phép.",
  415: "Định dạng dữ liệu gửi lên không được hỗ trợ.",
  422: "Dữ liệu chưa đáp ứng yêu cầu xử lý.",
  423: "Tài nguyên này đang tạm thời bị khóa.",
  429: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.",

  500: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
  502: "Không thể kết nối với dịch vụ xử lý. Vui lòng thử lại sau.",
  503: "Dịch vụ hiện không khả dụng. Vui lòng thử lại sau.",
  504: "Dịch vụ phản hồi quá lâu. Vui lòng thử lại sau.",
});

const AI_CONFIG_MESSAGES = Object.freeze({
  REQUEST_BODY_REQUIRED: "Request body là bắt buộc",
  CREATE_TASK_TYPE_REQUIRED: "TaskType là bắt buộc",
  UPDATE_TASK_TYPE_REQUIRED: "TaskType không được để trống",
  TASK_TYPE_EXISTS: "TaskType đã tồn tại",
  INVALID_TEMPERATURE: "Temperature phải từ 0 đến 2",
  INVALID_MAX_TOKENS: "MaxTokens phải lớn hơn 0",
  INVALID_ID: "Id AI config không hợp lệ",
  NOT_FOUND: "Không tìm thấy AI config",
  CREATE_SUCCESS: "Tạo AI config thành công",
  UPDATE_SUCCESS: "Cập nhật AI config thành công",
});

/**
 * Các thông báo cố định được backend trả về.
 *
 * Quy tắc:
 * - Khóa là thông báo gốc từ backend.
 * - Giá trị là nội dung tiếng Việt hiển thị cho người dùng.
 * - Không đưa thông tin kỹ thuật, khóa bí mật hoặc dữ liệu sức khỏe vào đây.
 */
const EXACT_MESSAGES = Object.freeze({
  // Chung
  OK: "Thao tác thành công.",
  "Bad Request": "Yêu cầu không hợp lệ.",
  Unauthorized: "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.",
  Forbidden: "Bạn không có quyền thực hiện thao tác này.",
  "Not Found": "Không tìm thấy dữ liệu được yêu cầu.",
  Conflict: "Dữ liệu đang bị xung đột.",
  "One or more validation errors occurred.":
    "Một hoặc nhiều dữ liệu chưa hợp lệ.",

  // Cấu hình AI
  "Request body is required":
    AI_CONFIG_MESSAGES.REQUEST_BODY_REQUIRED,
  "The request body is required":
    AI_CONFIG_MESSAGES.REQUEST_BODY_REQUIRED,
  "A non-empty request body is required":
    AI_CONFIG_MESSAGES.REQUEST_BODY_REQUIRED,
  "The request body field is required":
    AI_CONFIG_MESSAGES.REQUEST_BODY_REQUIRED,

  "TaskType is required":
    AI_CONFIG_MESSAGES.CREATE_TASK_TYPE_REQUIRED,
  "The TaskType field is required":
    AI_CONFIG_MESSAGES.CREATE_TASK_TYPE_REQUIRED,

  "TaskType cannot be empty":
    AI_CONFIG_MESSAGES.UPDATE_TASK_TYPE_REQUIRED,
  "TaskType must not be empty":
    AI_CONFIG_MESSAGES.UPDATE_TASK_TYPE_REQUIRED,
  "The TaskType field must not be empty":
    AI_CONFIG_MESSAGES.UPDATE_TASK_TYPE_REQUIRED,

  "TaskType already exists":
    AI_CONFIG_MESSAGES.TASK_TYPE_EXISTS,

  "Temperature must be between 0 and 2":
    AI_CONFIG_MESSAGES.INVALID_TEMPERATURE,
  "Temperature must be from 0 to 2":
    AI_CONFIG_MESSAGES.INVALID_TEMPERATURE,
  "The field Temperature must be between 0 and 2":
    AI_CONFIG_MESSAGES.INVALID_TEMPERATURE,

  "MaxTokens must be greater than 0":
    AI_CONFIG_MESSAGES.INVALID_MAX_TOKENS,
  "The field MaxTokens must be greater than 0":
    AI_CONFIG_MESSAGES.INVALID_MAX_TOKENS,

  "Invalid AI config id":
    AI_CONFIG_MESSAGES.INVALID_ID,
  "AI config id is invalid":
    AI_CONFIG_MESSAGES.INVALID_ID,

  "AI config not found":
    AI_CONFIG_MESSAGES.NOT_FOUND,
  "AI configuration not found":
    AI_CONFIG_MESSAGES.NOT_FOUND,

  "AI config created successfully":
    AI_CONFIG_MESSAGES.CREATE_SUCCESS,
  "AI configuration created successfully":
    AI_CONFIG_MESSAGES.CREATE_SUCCESS,

  "AI config updated successfully":
    AI_CONFIG_MESSAGES.UPDATE_SUCCESS,
  "AI configuration updated successfully":
    AI_CONFIG_MESSAGES.UPDATE_SUCCESS,

  // Đăng ký và đăng nhập
  "Registration failed":
    "Đăng ký tài khoản thất bại.",
  "Registration succeeded":
    "Đăng ký tài khoản thành công.",
  "Doctor registration failed":
    "Đăng ký tài khoản bác sĩ thất bại.",
  "Doctor account created. Status is pending until approved.":
    "Tài khoản bác sĩ đã được tạo và đang chờ quản trị viên phê duyệt.",
  "Invalid email or password.":
    "Email hoặc mật khẩu không chính xác.",
  "Login succeeded":
    "Đăng nhập thành công.",
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

  // Khôi phục mật khẩu
  "Forgot password failed":
    "Không thể gửi yêu cầu đặt lại mật khẩu.",
  "If the email exists, an OTP has been sent.":
    "Nếu email tồn tại trong hệ thống, mã xác thực đã được gửi.",
  "Change password failed":
    "Đặt lại mật khẩu thất bại.",
  "Password changed successfully.":
    "Đặt lại mật khẩu thành công.",
  "Password and confirmation do not match.":
    "Mật khẩu xác nhận không khớp.",
  "New password and confirmation do not match.":
    "Mật khẩu mới và mật khẩu xác nhận không khớp.",
  "Email is required.":
    "Email là bắt buộc.",
  "OTP is required.":
    "Mã xác thực là bắt buộc.",
  "New password is required.":
    "Mật khẩu mới là bắt buộc.",
  "OTP is invalid or expired.":
    "Mã xác thực không hợp lệ hoặc đã hết hạn.",
  "Unable to send OTP email. Please try again later.":
    "Chưa thể gửi mã xác thực qua email. Vui lòng thử lại sau.",

  // Phê duyệt tài khoản
  "Approve user failed.":
    "Phê duyệt tài khoản thất bại.",
  "User approved.":
    "Tài khoản đã được phê duyệt.",

  // Trợ lý AI và phân tích y tế
  "Send message failed.":
    "Không thể gửi tin nhắn.",
  "Message is required.":
    "Vui lòng nhập nội dung tin nhắn.",
  "Web chatbot is unavailable.":
    "Trợ lý AI hiện không khả dụng.",
  "The AI chatbot service is currently unavailable. Please try again later.":
    "Dịch vụ trợ lý AI hiện không khả dụng. Vui lòng thử lại sau.",
  "Symptom analysis failed.":
    "Chưa thể phân tích triệu chứng lúc này. Vui lòng thử lại sau.",
  "Lab document analysis failed.":
    "Chưa thể phân tích tài liệu xét nghiệm lúc này. Vui lòng thử lại sau.",
  "Medical analysis service is unavailable.":
    "Dịch vụ phân tích y tế hiện không khả dụng. Vui lòng thử lại sau.",
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
  otp: "Mã xác thực",
  message: "Nội dung tin nhắn",
  name: "Tên",
  description: "Mô tả",
  phone: "Số điện thoại",
  phonenumber: "Số điện thoại",
  userid: "Người dùng",
  profileid: "Hồ sơ",
  facilityid: "Cơ sở y tế",
  departmentid: "Chuyên khoa",
  facilitydepartmentid: "Khoa tại cơ sở y tế",
  sessionid: "Phiên phân tích",
  documenturl: "Đường dẫn tài liệu",
  imageurl: "Đường dẫn hình ảnh",

  // Cấu hình AI
  tasktype: "TaskType",
  systemprompt: "Chỉ dẫn hệ thống",
  model: "Mô hình AI",
  temperature: "Temperature",
  maxtokens: "MaxTokens",
  isactive: "Trạng thái hoạt động",
  id: "Id",
  aiconfigid: "Id AI config",
  requestbody: "Request body",
});

/**
 * Tên thực thể thường xuất hiện trong thông báo động từ backend.
 */
const ENTITY_LABELS = Object.freeze({
  user: "người dùng",
  doctor: "bác sĩ",
  patient: "người bệnh",
  profile: "hồ sơ",
  "patient profile": "hồ sơ sức khỏe",
  facility: "cơ sở y tế",
  "medical facility": "cơ sở y tế",
  department: "chuyên khoa",
  "medical department": "chuyên khoa",
  "facility department": "khoa tại cơ sở y tế",
  subscription: "gói dịch vụ",
  "subscription plan": "gói dịch vụ",
  payment: "giao dịch thanh toán",
  invitation: "lời mời",
  "doctor invitation": "lời mời bác sĩ",
  question: "câu hỏi",
  "clinical question": "câu hỏi lâm sàng",
  "ai config": "cấu hình AI",
  "ai configuration": "cấu hình AI",
  "lab test": "xét nghiệm",
  "lab indicator": "chỉ số xét nghiệm",
  "reference range": "khoảng tham chiếu",
  medication: "thuốc",
  "recovery plan": "kế hoạch phục hồi",
  feedback: "phản hồi",
  review: "đánh giá",
  assessment: "lần đánh giá",
  "symptom analysis": "phiên phân tích triệu chứng",
  "analysis session": "phiên phân tích",
});

const MESSAGE_PATTERNS = Object.freeze([
  // ASP.NET Identity: chính sách mật khẩu
  {
    pattern:
      /^Passwords? must be at least (\d+) characters?\.?$/i,
    translate: (_, minimumLength) =>
      `Mật khẩu phải có ít nhất ${minimumLength} ký tự.`,
  },
  {
    pattern:
      /^Passwords? must have at least one non[- ]alphanumeric character\.?$/i,
    translate: () =>
      "Mật khẩu phải có ít nhất một ký tự đặc biệt.",
  },
  {
    pattern:
      /^Passwords? must have at least one digit.*$/i,
    translate: () =>
      "Mật khẩu phải có ít nhất một chữ số.",
  },
  {
    pattern:
      /^Passwords? must have at least one uppercase.*$/i,
    translate: () =>
      "Mật khẩu phải có ít nhất một chữ cái viết hoa.",
  },
  {
    pattern:
      /^Passwords? must have at least one lowercase.*$/i,
    translate: () =>
      "Mật khẩu phải có ít nhất một chữ cái viết thường.",
  },
  {
    pattern:
      /^Passwords? must use at least (\d+) different characters?\.?$/i,
    translate: (_, minimumUniqueCharacters) =>
      `Mật khẩu phải có ít nhất ${minimumUniqueCharacters} ký tự khác nhau.`,
  },
  {
    pattern:
      /^Email ['"].+['"] is already taken\.?$/i,
    translate: () =>
      "Email này đã được sử dụng.",
  },
  {
    pattern:
      /^(?:Username|User name) ['"].+['"] is already taken\.?$/i,
    translate: () =>
      "Tên đăng nhập này đã được sử dụng.",
  },

  // ASP.NET validation
  {
    pattern:
      /^The (.+) field is required\.?$/i,
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
    translate: (
      _,
      fieldName,
      minimum,
      maximum,
    ) =>
      `${getFieldLabel(fieldName)} phải có từ ${minimum} đến ${maximum} ký tự.`,
  },
  {
    pattern:
      /^The field (.+) must be between (\d+) and (\d+)\.?$/i,
    translate: (
      _,
      fieldName,
      minimum,
      maximum,
    ) =>
      `${getFieldLabel(fieldName)} phải nằm trong khoảng từ ${minimum} đến ${maximum}.`,
  },
  {
    pattern:
      /^The value ['"].+['"] is not valid for (.+)\.?$/i,
    translate: (_, fieldName) =>
      `${getFieldLabel(fieldName)} không hợp lệ.`,
  },

  // Cấu hình AI
  {
    pattern:
      /^(?:A non-empty |The )?request body(?: field)? is required\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.REQUEST_BODY_REQUIRED,
  },
  {
    pattern:
      /^The TaskType field is required\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.CREATE_TASK_TYPE_REQUIRED,
  },
  {
    pattern:
      /^The TaskType field (?:cannot|must not) be empty\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.UPDATE_TASK_TYPE_REQUIRED,
  },
  {
    pattern:
      /^The field Temperature must be (?:between|from) 0 (?:and|to) 2\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.INVALID_TEMPERATURE,
  },
  {
    pattern:
      /^The field MaxTokens must be greater than 0\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.INVALID_MAX_TOKENS,
  },
  {
    pattern:
      /^TaskType is required\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.CREATE_TASK_TYPE_REQUIRED,
  },
  {
    pattern:
      /^TaskType (?:cannot|must not) be empty\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.UPDATE_TASK_TYPE_REQUIRED,
  },
  {
    pattern:
      /^TaskType(?: ['"].+['"])? already exists\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.TASK_TYPE_EXISTS,
  },
  {
    pattern:
      /^(?:An? )?(?:AI config|AI configuration)(?: for| with)? (?:TaskType|task type) ['"].+['"] already exists\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.TASK_TYPE_EXISTS,
  },
  {
    pattern:
      /^Temperature must be (?:(?:between|from) 0 (?:and|to) 2|in (?:the )?range \[?0\s*,\s*2\]?)\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.INVALID_TEMPERATURE,
  },
  {
    pattern:
      /^MaxTokens must be (?:greater than 0|a positive number)\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.INVALID_MAX_TOKENS,
  },
  {
    pattern:
      /^(?:Invalid (?:AI config|AI configuration|AIConfig) id|(?:AI config|AI configuration|AIConfig) id (?:is invalid|cannot be empty))\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.INVALID_ID,
  },
  {
    pattern:
      /^(?:AI config|AI configuration)(?: with id ['"].+['"])? (?:not found|was not found)\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.NOT_FOUND,
  },
  {
    pattern:
      /^(?:AI config|AI configuration) created successfully\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.CREATE_SUCCESS,
  },
  {
    pattern:
      /^(?:AI config|AI configuration) updated successfully\.?$/i,
    translate: () =>
      AI_CONFIG_MESSAGES.UPDATE_SUCCESS,
  },

  // Chatbot và nội dung người dùng
  {
    pattern:
      /^Message must be (\d+) characters or fewer\.?$/i,
    translate: (_, maximum) =>
      `Tin nhắn không được vượt quá ${maximum} ký tự.`,
  },

  // Thông báo CRUD động
  {
    pattern:
      /^(.+) not found\.?$/i,
    translate: (_, entity) =>
      `Không tìm thấy ${getEntityLabel(entity)}.`,
  },
  {
    pattern:
      /^(.+) already exists\.?$/i,
    translate: (_, entity) =>
      `${capitalize(getEntityLabel(entity))} đã tồn tại.`,
  },
  {
    pattern:
      /^(.+) created successfully\.?$/i,
    translate: (_, entity) =>
      `${capitalize(getEntityLabel(entity))} đã được tạo thành công.`,
  },
  {
    pattern:
      /^(.+) updated successfully\.?$/i,
    translate: (_, entity) =>
      `${capitalize(getEntityLabel(entity))} đã được cập nhật thành công.`,
  },
  {
    pattern:
      /^(.+) deleted successfully\.?$/i,
    translate: (_, entity) =>
      `${capitalize(getEntityLabel(entity))} đã được xóa thành công.`,
  },

  // Xác thực và bảo mật
  {
    pattern:
      /^Incorrect password\.?$/i,
    translate: () =>
      "Mật khẩu hiện tại không chính xác.",
  },
  {
    pattern:
      /^Invalid token\.?$/i,
    translate: () =>
      "Mã xác thực không hợp lệ hoặc đã hết hạn.",
  },
  {
    pattern:
      /^Token (?:is )?expired\.?$/i,
    translate: () =>
      "Mã xác thực đã hết hạn.",
  },

  // Quy tắc nghiệp vụ y tế
  {
    pattern:
      /^A reference range cannot set both Gender and AgeGroup\.?$/i,
    translate: () =>
      "Khoảng tham chiếu không thể áp dụng đồng thời theo giới tính và nhóm tuổi.",
  },
  {
    pattern:
      /^Document host is not allowed\.?$/i,
    translate: () =>
      "Nguồn tài liệu không được hệ thống cho phép.",
  },
]);

const COMPOUND_MESSAGE_PREFIX =
  "(?:Passwords? must\\b|The\\s+.+?\\s+field\\b|The field\\b|The value\\b|Email\\s+['\"]|(?:Username|User name)\\s+['\"]|OTP\\s+(?:is|must|has)\\b|Invalid\\s+token\\b|Incorrect\\s+password\\b|Message must\\b|(?:A non-empty |The )Request body\\b|Request body\\s+is\\b|TaskType\\s+(?:is|cannot|must|already)\\b|Temperature\\s+must\\b|MaxTokens\\s+must\\b|Invalid\\s+(?:AI config|AI configuration|AIConfig)\\s+id\\b|An?\\s+(?:AI config|AI configuration|AIConfig)\\s+(?:with|for)\\b|(?:AI config|AI configuration|AIConfig)\\s+(?:id is invalid|id cannot be empty|not found|was not found|created successfully|updated successfully)\\b|Change password failed\\b|Forgot password failed\\b|Registration failed\\b|Doctor registration failed\\b|A reference range\\b|Document host\\b)";

const COMPOUND_MESSAGE_SEPARATOR =
  "\u0000";

function normalizeMessage(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeComparisonKey(value) {
  return normalizeMessage(value)
    .toLocaleLowerCase("vi-VN")
    .replace(/[.!?,;:]+$/g, "")
    .trim();
}

function normalizeLookupKey(value) {
  return String(value)
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function normalizeEntityKey(value) {
  return String(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .replace(/[.:]+$/g, "")
    .trim()
    .toLowerCase();
}

function getFieldLabel(fieldName) {
  const normalized =
    normalizeLookupKey(fieldName);

  return (
    FIELD_LABELS[normalized] ||
    normalizeMessage(String(fieldName)) ||
    "Trường dữ liệu"
  );
}

function getEntityLabel(entityName) {
  const normalized =
    normalizeEntityKey(entityName);

  return (
    ENTITY_LABELS[normalized] ||
    normalized ||
    "dữ liệu"
  );
}

function capitalize(value) {
  if (!value) {
    return "";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function isVietnameseMessage(message) {
  return /[ăâđêôơưà-ỹ]/i.test(message);
}

function isDevelopmentEnvironment() {
  return Boolean(import.meta.env?.DEV);
}

function reportUntranslatedMessage(
  message,
  status,
) {
  if (!isDevelopmentEnvironment()) {
    return;
  }

  console.warn(
    "[Thông báo API chưa được Việt hóa]",
    {
      status,
      message,
    },
  );
}

function getExactTranslation(message) {
  const comparisonKey =
    normalizeComparisonKey(message);

  for (
    const [
      sourceMessage,
      translatedMessage,
    ] of Object.entries(EXACT_MESSAGES)
  ) {
    if (
      normalizeComparisonKey(
        sourceMessage,
      ) === comparisonKey
    ) {
      return translatedMessage;
    }
  }

  return "";
}

/**
 * Thu gọn trường hợp một thông báo bị lặp nguyên văn nhiều lần.
 */
function collapseRepeatedMessage(value) {
  const message =
    normalizeMessage(value);

  if (!message) {
    return "";
  }

  const words = message.split(" ");
  const maximumRepeatCount = Math.min(
    4,
    words.length,
  );

  for (
    let repeatCount =
      maximumRepeatCount;
    repeatCount >= 2;
    repeatCount -= 1
  ) {
    if (
      words.length % repeatCount !== 0
    ) {
      continue;
    }

    const partLength =
      words.length / repeatCount;

    const parts = Array.from(
      {
        length: repeatCount,
      },
      (_, index) =>
        words
          .slice(
            index * partLength,
            (index + 1) *
              partLength,
          )
          .join(" "),
    );

    const firstPartKey =
      normalizeComparisonKey(
        parts[0],
      );

    if (
      firstPartKey &&
      parts.every(
        (part) =>
          normalizeComparisonKey(
            part,
          ) === firstPartKey,
      )
    ) {
      return normalizeMessage(
        parts[0],
      );
    }
  }

  return message;
}

/**
 * Tách nhiều thông báo bị backend ghép thành một chuỗi.
 */
function splitCompoundMessage(value) {
  const message =
    collapseRepeatedMessage(value);

  if (!message) {
    return [];
  }

  const beforeKnownPrefix =
    new RegExp(
      `\\s+(?=${COMPOUND_MESSAGE_PREFIX})`,
      "gi",
    );

  const commaBeforeKnownPrefix =
    new RegExp(
      `[,;]\\s*(?=${COMPOUND_MESSAGE_PREFIX})`,
      "gi",
    );

  return message
    .replace(
      /\r?\n+/g,
      COMPOUND_MESSAGE_SEPARATOR,
    )
    .replace(
      commaBeforeKnownPrefix,
      COMPOUND_MESSAGE_SEPARATOR,
    )
    .replace(
      beforeKnownPrefix,
      COMPOUND_MESSAGE_SEPARATOR,
    )
    .split(
      COMPOUND_MESSAGE_SEPARATOR,
    )
    .map((part) =>
      normalizeMessage(part),
    )
    .filter(Boolean);
}

function getUniqueMessages(messages) {
  const uniqueMessages = [];
  const seenKeys = new Set();

  for (const rawMessage of messages) {
    const message =
      collapseRepeatedMessage(
        rawMessage,
      );

    const key =
      normalizeComparisonKey(
        message,
      );

    if (
      !message ||
      !key ||
      seenKeys.has(key)
    ) {
      continue;
    }

    seenKeys.add(key);
    uniqueMessages.push(message);
  }

  return uniqueMessages;
}

function translateSingleMessage(
  message,
  {
    status,
    fallback,
  } = {},
) {
  const normalizedMessage =
    normalizeMessage(message);

  if (!normalizedMessage) {
    return fallback ?? "";
  }

  const exactTranslation =
    getExactTranslation(
      normalizedMessage,
    );

  if (exactTranslation) {
    return exactTranslation;
  }

  for (
    const item of MESSAGE_PATTERNS
  ) {
    const match =
      normalizedMessage.match(
        item.pattern,
      );

    if (match) {
      return item.translate(
        ...match,
      );
    }
  }

  /*
   * Nội dung đã là tiếng Việt được giữ nguyên.
   *
   * Không tự động chỉnh sửa nội dung do backend cung cấp nếu nội dung
   * đã được Việt hóa, tránh thay đổi ý nghĩa của thông báo nghiệp vụ.
   */
  if (
    isVietnameseMessage(
      normalizedMessage,
    )
  ) {
    return normalizedMessage;
  }

  /*
   * Không hiển thị thông báo kỹ thuật tiếng Anh chưa được kiểm duyệt
   * cho người dùng cuối.
   */
  reportUntranslatedMessage(
    normalizedMessage,
    status,
  );

  return (
    fallback ??
    getApiStatusMessage(status)
  );
}

/**
 * Lấy thông báo mặc định theo mã HTTP.
 */
export function getApiStatusMessage(
  status,
) {
  return (
    HTTP_STATUS_MESSAGES[
      Number(status)
    ] ||
    "Không thể thực hiện yêu cầu. Vui lòng thử lại sau."
  );
}

/**
 * Việt hóa một thông báo API.
 *
 * Hàm có thể xử lý:
 * - Một thông báo đơn.
 * - Nhiều lỗi bị backend ghép trong cùng một chuỗi.
 * - Chuỗi bị lặp hai hoặc nhiều lần.
 * - Chuỗi gồm cả tiếng Việt và thông báo kỹ thuật tiếng Anh.
 *
 * @param {unknown} value
 * @param {{ status?: number, fallback?: string }} options
 * @returns {string}
 */
export function translateApiMessage(
  value,
  {
    status,
    fallback,
  } = {},
) {
  const parts =
    splitCompoundMessage(value);

  if (parts.length === 0) {
    return fallback ?? "";
  }

  const translatedParts =
    parts.map((part) =>
      translateSingleMessage(
        part,
        {
          status,
          fallback: "",
        },
      ),
    );

  const uniqueMessages =
    getUniqueMessages(
      translatedParts,
    );

  if (
    uniqueMessages.length > 0
  ) {
    return uniqueMessages.join(" ");
  }

  return (
    fallback ??
    getApiStatusMessage(status)
  );
}

function translateApiErrorValue(
  value,
  status,
) {
  if (Array.isArray(value)) {
    const translatedItems =
      value.flatMap((item) => {
        const translatedItem =
          translateApiErrorValue(
            item,
            status,
          );

        if (
          Array.isArray(
            translatedItem,
          )
        ) {
          return translatedItem;
        }

        return translatedItem
          ? [translatedItem]
          : [];
      });

    return getUniqueMessages(
      translatedItems,
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .map(
          ([key, item]) => [
            key,
            translateApiErrorValue(
              item,
              status,
            ),
          ],
        )
        .filter(([, item]) => {
          if (
            Array.isArray(item)
          ) {
            return item.length > 0;
          }

          if (
            item &&
            typeof item ===
              "object"
          ) {
            return (
              Object.keys(item)
                .length > 0
            );
          }

          return Boolean(item);
        }),
    );
  }

  const parts =
    splitCompoundMessage(value);

  const translatedMessages =
    getUniqueMessages(
      parts.map((part) =>
        translateSingleMessage(
          part,
          {
            status,
            fallback: "",
          },
        ),
      ),
    );

  if (
    translatedMessages.length === 0
  ) {
    return "";
  }

  if (
    translatedMessages.length === 1
  ) {
    return translatedMessages[0];
  }

  return translatedMessages;
}

/**
 * Chỉ Việt hóa các trường chứa thông báo lỗi hoặc trạng thái.
 *
 * Không thay đổi dữ liệu nghiệp vụ trong `data`, đặc biệt là:
 * - Nội dung do người dùng nhập.
 * - Dữ liệu hồ sơ sức khỏe.
 * - Nội dung hội thoại với trợ lý AI.
 * - Kết quả phân tích triệu chứng hoặc xét nghiệm.
 * - Chẩn đoán, cảnh báo và khuyến nghị y tế.
 * - Prompt hệ thống và cấu hình AI được trả về trong `data`.
 *
 * Việc giữ nguyên các trường trên tránh làm sai lệch nội dung y tế
 * hoặc làm thay đổi hành vi của mô hình AI.
 */
export function localizeApiPayload(
  rawPayload,
  status,
) {
  if (
    !rawPayload ||
    typeof rawPayload !== "object" ||
    Array.isArray(rawPayload)
  ) {
    return rawPayload;
  }

  const payload = {
    ...rawPayload,
  };

  if (payload.message) {
    payload.message =
      translateApiMessage(
        payload.message,
        {
          status,
        },
      );
  }

  if (payload.title) {
    payload.title =
      translateApiMessage(
        payload.title,
        {
          status,
        },
      );
  }

  if (payload.detail) {
    payload.detail =
      translateApiMessage(
        payload.detail,
        {
          status,
          fallback: "",
        },
      );
  }

  if (payload.error) {
    payload.error =
      translateApiErrorValue(
        payload.error,
        status,
      );
  }

  if (payload.errors) {
    payload.errors =
      translateApiErrorValue(
        payload.errors,
        status,
      );
  }

  return payload;
}