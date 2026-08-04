import { useRef, useState } from "react";
import {
  BrainCircuit,
  Check,
  MessageSquareText,
  ShieldAlert,
  SlidersHorizontal,
  ToggleLeft,
} from "lucide-react";
import {
  focusFirstInvalidField,
  getAdminFieldProps,
} from "../admin/adminFormUtils";
import { Dialog } from "../ui";

const EDITABLE_FIELDS = Object.freeze([
  "taskType",
  "systemPrompt",
  "model",
  "temperature",
  "maxTokens",
  "isActive",
]);

function createEmptyForm() {
  return {
    taskType: "",
    systemPrompt: "",
    model: "",
    temperature: "",
    maxTokens: "",
    isActive: "true",
  };
}

function toFormValue(config) {
  if (!config) {
    return createEmptyForm();
  }

  return {
    taskType: String(config.taskType ?? ""),
    systemPrompt: String(config.systemPrompt ?? ""),
    model: String(config.model ?? ""),
    temperature:
      config.temperature === null ||
      config.temperature === undefined
        ? ""
        : String(config.temperature),
    maxTokens:
      config.maxTokens === null ||
      config.maxTokens === undefined
        ? ""
        : String(config.maxTokens),
    isActive:
      config.isActive === false
        ? "false"
        : "true",
  };
}

function normalizeRequiredText(value) {
  return String(value ?? "").trim();
}

function normalizeOptionalText(value) {
  const normalizedValue = String(value ?? "").trim();

  return normalizedValue || null;
}

function normalizeOptionalNumber(value) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return null;
  }

  return Number(normalizedValue);
}

function normalizeFormValues(form) {
  return {
    taskType: normalizeRequiredText(form.taskType),
    systemPrompt: normalizeOptionalText(
      form.systemPrompt,
    ),
    model: normalizeOptionalText(form.model),
    temperature: normalizeOptionalNumber(
      form.temperature,
    ),
    maxTokens: normalizeOptionalNumber(
      form.maxTokens,
    ),
    isActive: form.isActive === "true",
  };
}

function normalizeConfigValues(config) {
  return {
    taskType: normalizeRequiredText(
      config?.taskType,
    ),
    systemPrompt: normalizeOptionalText(
      config?.systemPrompt,
    ),
    model: normalizeOptionalText(config?.model),
    temperature:
      config?.temperature === null ||
      config?.temperature === undefined
        ? null
        : Number(config.temperature),
    maxTokens:
      config?.maxTokens === null ||
      config?.maxTokens === undefined
        ? null
        : Number(config.maxTokens),
    isActive:
      config?.isActive === false
        ? false
        : true,
  };
}

function validateForm(form, mode) {
  const errors = {};
  const taskType =
    normalizeRequiredText(form.taskType);

  const temperatureText = String(
    form.temperature ?? "",
  ).trim();

  const maxTokensText = String(
    form.maxTokens ?? "",
  ).trim();

  if (!taskType) {
    errors.taskType =
      mode === "edit"
        ? "TaskType không được để trống."
        : "TaskType là bắt buộc.";
  }

  if (temperatureText) {
    const temperature = Number(temperatureText);

    if (
      !Number.isFinite(temperature) ||
      temperature < 0 ||
      temperature > 2
    ) {
      errors.temperature =
        "Temperature phải từ 0 đến 2.";
    }
  }

  if (maxTokensText) {
    const maxTokens = Number(maxTokensText);

    if (
      !Number.isFinite(maxTokens) ||
      maxTokens <= 0
    ) {
      errors.maxTokens =
        "MaxTokens phải lớn hơn 0.";
    }
  }

  if (
    form.isActive !== "true" &&
    form.isActive !== "false"
  ) {
    errors.isActive =
      "Trạng thái hoạt động là bắt buộc.";
  }

  return errors;
}

function buildCreatePayload(form) {
  return normalizeFormValues(form);
}

function buildUpdatePayload(form, config) {
  const currentValues =
    normalizeFormValues(form);

  const originalValues =
    normalizeConfigValues(config);

  return EDITABLE_FIELDS.reduce(
    (payload, fieldName) => {
      if (
        !Object.is(
          currentValues[fieldName],
          originalValues[fieldName],
        )
      ) {
        payload[fieldName] =
          currentValues[fieldName];
      }

      return payload;
    },
    {},
  );
}

export default function AIConfigFormModal({
  mode,
  config,
  saving,
  restoreFocusRef,
  onClose,
  onSubmit,
}) {
  const isEditMode = mode === "edit";

  const [form, setForm] = useState(() =>
    toFormValue(config),
  );

  const [errors, setErrors] = useState({});
  const [formMessage, setFormMessage] =
    useState("");

  const firstFieldRef = useRef(null);
  const errorSummaryRef = useRef(null);
  const formRef = useRef(null);

  const title = isEditMode
    ? "Cập nhật cấu hình AI"
    : "Tạo cấu hình AI";

  const hasFieldErrors =
    Object.values(errors).some(Boolean);

  const hasErrors =
    hasFieldErrors || Boolean(formMessage);

  const systemPromptIsEmpty =
    !normalizeRequiredText(form.systemPrompt);

  function focusErrorSummary() {
    window.requestAnimationFrame(() => {
      errorSummaryRef.current?.focus();
    });
  }

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => ({
      ...current,
      [key]: "",
    }));

    setFormMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateForm(
      form,
      mode,
    );

    setErrors(nextErrors);
    setFormMessage("");

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(
        formRef,
        nextErrors,
      );

      return;
    }

    const payload = isEditMode
      ? buildUpdatePayload(form, config)
      : buildCreatePayload(form);

    if (
      isEditMode &&
      Object.keys(payload).length === 0
    ) {
      setFormMessage(
        "Chưa có thay đổi để cập nhật.",
      );

      focusErrorSummary();
      return;
    }

    onSubmit(payload);
  }

  return (
    <Dialog
      backdropClassName="ai-config-modal-backdrop"
      className="ai-config-modal"
      labelledBy="ai-config-modal-title"
      describedBy="ai-config-modal-description"
      onClose={onClose}
      closeOnBackdrop={!saving}
      closeOnEscape={!saving}
      initialFocusRef={firstFieldRef}
      restoreFocusRef={restoreFocusRef}
    >
      <header className="ai-config-modal-header">
        <span className="ai-config-modal-icon">
          <BrainCircuit
            size={22}
            aria-hidden="true"
          />
        </span>

        <div>
          <p className="eyebrow">
            Vận hành trí tuệ nhân tạo
          </p>

          <h2 id="ai-config-modal-title">
            {title}
          </h2>

          <p id="ai-config-modal-description">
            {isEditMode
              ? "Chỉ những trường thực sự thay đổi mới được gửi lên hệ thống."
              : "Thiết lập loại tác vụ và các tham số vận hành ban đầu cho một cấu hình AI."}
          </p>
        </div>

        <button
          className="doctor-modal-close"
          type="button"
          aria-label="Đóng biểu mẫu"
          onClick={onClose}
          disabled={saving}
        >
          ×
        </button>
      </header>

      <form
        ref={formRef}
        className="clean-form ai-config-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <aside className="ai-config-modal-warning">
          <ShieldAlert
            size={18}
            aria-hidden="true"
          />

          <p>
            <strong>
              Kiểm tra kỹ trước khi lưu.
            </strong>{" "}
            Cấu hình này có thể ảnh hưởng trực
            tiếp đến nội dung AI cung cấp cho
            người dùng trong các chức năng liên
            quan đến sức khỏe.
          </p>
        </aside>

        {hasErrors && (
          <div
            ref={errorSummaryRef}
            className="ai-config-error-summary"
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            <strong>
              Chưa thể lưu cấu hình
            </strong>

            <span>
              {formMessage ||
                "Kiểm tra các trường được đánh dấu bên dưới."}
            </span>
          </div>
        )}

        <div className="ai-config-form-sections">
          <section
            className="ai-config-form-card"
            aria-labelledby="ai-config-operation-section"
          >
            <div className="ai-config-form-card-head">
              <span>
                <SlidersHorizontal
                  size={18}
                  aria-hidden="true"
                />
              </span>

              <div>
                <h3 id="ai-config-operation-section">
                  Thiết lập vận hành
                </h3>

                <p>
                  Xác định loại tác vụ, mô hình và
                  giới hạn phản hồi của cấu hình.
                </p>
              </div>
            </div>

            <div className="form-two-cols ai-config-form-grid">
              <label
                className={`clean-field ${
                  errors.taskType
                    ? "ai-config-field-error"
                    : ""
                }`}
              >
                <span>
                  Loại tác vụ{" "}
                  <small className="ai-config-required-note">
                    (bắt buộc)
                  </small>
                </span>

                <input
                  {...getAdminFieldProps(
                    "taskType",
                    errors.taskType,
                    "ai-config-task-help",
                  )}
                  ref={firstFieldRef}
                  value={form.taskType}
                  onChange={(event) =>
                    update(
                      "taskType",
                      event.target.value,
                    )
                  }
                  placeholder="Ví dụ: phan-tich-trieu-chung"
                  autoComplete="off"
                  required
                />

                <small id="ai-config-task-help">
                  {errors.taskType ||
                    "Định danh duy nhất của tác vụ AI. Không được để trống hoặc trùng với cấu hình khác."}
                </small>
              </label>

              <label className="clean-field">
                <span>
                  Mô hình AI{" "}
                  <small>
                    (không bắt buộc)
                  </small>
                </span>

                <input
                  {...getAdminFieldProps(
                    "model",
                    "",
                    "ai-config-model-help",
                  )}
                  value={form.model}
                  onChange={(event) =>
                    update(
                      "model",
                      event.target.value,
                    )
                  }
                  placeholder="Ví dụ: medimate-clinical-v1"
                  autoComplete="off"
                />

                <small id="ai-config-model-help">
                  Có thể để trống để dịch vụ AI sử
                  dụng mô hình mặc định.
                </small>
              </label>

              <label
                className={`clean-field ${
                  errors.temperature
                    ? "ai-config-field-error"
                    : ""
                }`}
              >
                <span>
                  Mức độ sáng tạo{" "}
                  <small>
                    (không bắt buộc)
                  </small>
                </span>

                <input
                  {...getAdminFieldProps(
                    "temperature",
                    errors.temperature,
                    "ai-config-temperature-help",
                  )}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  max="2"
                  value={form.temperature}
                  onChange={(event) =>
                    update(
                      "temperature",
                      event.target.value,
                    )
                  }
                  placeholder="Để trống nếu dùng mặc định"
                />

                <small id="ai-config-temperature-help">
                  {errors.temperature ||
                    "Giá trị hợp lệ từ 0 đến 2. Giá trị thấp thường tạo phản hồi ổn định và ít biến động hơn."}
                </small>
              </label>

              <label
                className={`clean-field ${
                  errors.maxTokens
                    ? "ai-config-field-error"
                    : ""
                }`}
              >
                <span>
                  Độ dài phản hồi tối đa{" "}
                  <small>
                    (không bắt buộc)
                  </small>
                </span>

                <input
                  {...getAdminFieldProps(
                    "maxTokens",
                    errors.maxTokens,
                    "ai-config-token-help",
                  )}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  value={form.maxTokens}
                  onChange={(event) =>
                    update(
                      "maxTokens",
                      event.target.value,
                    )
                  }
                  placeholder="Để trống nếu dùng mặc định"
                />

                <small id="ai-config-token-help">
                  {errors.maxTokens ||
                    "Khi nhập giá trị, số token tối đa phải lớn hơn 0."}
                </small>
              </label>
            </div>
          </section>

          <section
            className="ai-config-form-card ai-config-prompt-card"
            aria-labelledby="ai-config-prompt-section"
          >
            <div className="ai-config-form-card-head">
              <span>
                <MessageSquareText
                  size={18}
                  aria-hidden="true"
                />
              </span>

              <div>
                <h3 id="ai-config-prompt-section">
                  Chỉ dẫn hệ thống
                </h3>

                <p>
                  Định hướng vai trò, giới hạn an
                  toàn và cách AI phản hồi với
                  người dùng.
                </p>
              </div>
            </div>

            <label className="clean-field">
              <span>
                Chỉ dẫn hệ thống{" "}
                <small>
                  (không bắt buộc)
                </small>
              </span>

              <textarea
                {...getAdminFieldProps(
                  "systemPrompt",
                  "",
                  "ai-config-prompt-help",
                )}
                rows={9}
                value={form.systemPrompt}
                onChange={(event) =>
                  update(
                    "systemPrompt",
                    event.target.value,
                  )
                }
                placeholder="Nhập vai trò, phạm vi hỗ trợ, giới hạn an toàn và cách phản hồi của AI..."
              />

              <small id="ai-config-prompt-help">
                Có thể để trống. Với tác vụ liên
                quan đến sức khỏe, nên nêu rõ AI
                không thay thế bác sĩ, không khẳng
                định chẩn đoán khi chưa đủ dữ liệu
                và phải ưu tiên cảnh báo khi có dấu
                hiệu cần cấp cứu.
              </small>
            </label>

            {systemPromptIsEmpty && (
              <aside
                className="ai-config-modal-warning"
                aria-label="Lưu ý khi chưa có chỉ dẫn hệ thống"
              >
                <ShieldAlert
                  size={18}
                  aria-hidden="true"
                />

                <p>
                  <strong>
                    Cấu hình chưa có chỉ dẫn hệ
                    thống.
                  </strong>{" "}
                  Dịch vụ AI sẽ sử dụng hành vi mặc
                  định. Cần kiểm tra ranh giới an
                  toàn y tế trước khi đưa cấu hình
                  vào vận hành.
                </p>
              </aside>
            )}
          </section>

          <section
            className="ai-config-form-card ai-config-status-card"
            aria-labelledby="ai-config-status-section"
          >
            <div className="ai-config-form-card-head">
              <span>
                <ToggleLeft
                  size={18}
                  aria-hidden="true"
                />
              </span>

              <div>
                <h3 id="ai-config-status-section">
                  Trạng thái
                </h3>

                <p>
                  Cấu hình mới mặc định được bật.
                  Có thể chuyển sang trạng thái tắt
                  trước khi lưu.
                </p>
              </div>
            </div>

            <label
              className={`clean-field ai-config-status-field ${
                errors.isActive
                  ? "ai-config-field-error"
                  : ""
              }`}
            >
              <span>
                Trạng thái sau khi lưu
              </span>

              <select
                {...getAdminFieldProps(
                  "isActive",
                  errors.isActive,
                  "ai-config-status-help",
                )}
                value={form.isActive}
                onChange={(event) =>
                  update(
                    "isActive",
                    event.target.value,
                  )
                }
                required
              >
                <option value="true">
                  Đang bật
                </option>

                <option value="false">
                  Đang tắt
                </option>
              </select>

              <small id="ai-config-status-help">
                {errors.isActive ||
                  "Chỉ bật cấu hình sau khi đã kiểm tra mô hình, chỉ dẫn hệ thống và các giới hạn phản hồi."}
              </small>
            </label>
          </section>
        </div>

        <div className="doctor-modal-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Hủy
          </button>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={saving}
          >
            <Check
              size={16}
              aria-hidden="true"
            />

            {saving
              ? "Đang lưu..."
              : isEditMode
                ? "Lưu thay đổi"
                : "Tạo cấu hình"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}