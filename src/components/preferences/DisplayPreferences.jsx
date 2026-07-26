import { MonitorCog, RotateCcw, Settings2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  resetDisplayPreferences,
  setDisplayPreference,
  useDisplayPreferences,
} from "../../state/displayPreferences";
import "./display-preferences.css";

const LABELS = {
  theme: {
    system: "Giao diện theo hệ thống",
    light: "Giao diện sáng",
    dark: "Giao diện tối",
  },
  motion: {
    system: "Chuyển động theo hệ thống",
    reduce: "Đã giảm chuyển động",
    full: "Đã bật chuyển động đầy đủ",
  },
  contrast: {
    system: "Độ tương phản theo hệ thống",
    more: "Đã tăng độ tương phản",
  },
  textScale: {
    100: "Cỡ chữ mặc định",
    112: "Cỡ chữ 112 phần trăm",
    125: "Cỡ chữ 125 phần trăm",
  },
  spacing: {
    normal: "Giãn dòng mặc định",
    comfortable: "Giãn dòng thoáng",
  },
};

const FIELDS = [
  {
    key: "theme",
    label: "Giao diện",
    description: "Chọn tông sáng, tối hoặc tự đi theo thiết bị.",
    options: [
      ["system", "Theo hệ thống"],
      ["light", "Sáng"],
      ["dark", "Tối"],
    ],
  },
  {
    key: "motion",
    label: "Chuyển động",
    description: "Điều chỉnh mức chuyển cảnh để dễ theo dõi hơn.",
    options: [
      ["system", "Theo hệ thống"],
      ["reduce", "Giảm chuyển động"],
      ["full", "Đầy đủ"],
    ],
  },
  {
    key: "contrast",
    label: "Độ tương phản",
    description: "Tăng độ rõ của chữ và đường viền khi cần.",
    options: [
      ["system", "Theo hệ thống"],
      ["more", "Tăng tương phản"],
    ],
  },
  {
    key: "textScale",
    label: "Cỡ chữ",
    description: "Phóng chữ cho các phiên đọc dài.",
    options: [
      ["100", "100%"],
      ["112", "112%"],
      ["125", "125%"],
    ],
  },
  {
    key: "spacing",
    label: "Giãn dòng",
    description: "Tăng khoảng thở trong nội dung tư vấn.",
    options: [
      ["normal", "Mặc định"],
      ["comfortable", "Thoáng"],
    ],
  },
];

export default function DisplayPreferences({ compact = false }) {
  const preferences = useDisplayPreferences();
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const idPrefix = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);

  function announce(message) {
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 50);
  }

  function updatePreference(key, value) {
    setDisplayPreference(key, value);
    announce(LABELS[key][value]);
  }

  function closePanel({ restoreFocus = true } = {}) {
    setOpen(false);
    if (restoreFocus) window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) closePanel({ restoreFocus: false });
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") closePanel();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`display-preferences ${compact ? "display-preferences-compact" : ""}`} ref={rootRef}>
      <button
        className="display-preferences-trigger"
        type="button"
        aria-expanded={open}
        aria-controls={`${idPrefix}-panel`}
        aria-label={compact ? "Mở tùy chọn hiển thị" : undefined}
        ref={triggerRef}
        onClick={() => setOpen((current) => !current)}
      >
        <Settings2 size={18} aria-hidden="true" />
        <span>{compact ? "Hiển thị" : "Tùy chọn hiển thị"}</span>
      </button>

      <div className="sr-only" role="status" aria-atomic="true">
        {announcement}
      </div>

      {open && (
        <section
          className="display-preferences-panel"
          id={`${idPrefix}-panel`}
          aria-labelledby={`${idPrefix}-title`}
        >
          <header>
            <span className="display-preferences-mark" aria-hidden="true">
              <MonitorCog size={20} />
            </span>
            <div>
              <p>Tùy chỉnh trải nghiệm</p>
              <h2 id={`${idPrefix}-title`}>Tùy chọn hiển thị</h2>
              <span>Đồng bộ cảm giác đọc với giao diện MediMate.</span>
            </div>
            <button
              className="display-preferences-close"
              type="button"
              aria-label="Đóng tùy chọn hiển thị"
              ref={closeRef}
              onClick={() => closePanel()}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="display-preferences-options">
            {FIELDS.map((field) => (
              <label className="display-preferences-option" htmlFor={`${idPrefix}-${field.key}`} key={field.key}>
                <span>
                  <strong>{field.label}</strong>
                  <small>{field.description}</small>
                </span>
                <select
                  id={`${idPrefix}-${field.key}`}
                  value={preferences[field.key]}
                  onChange={(event) => updatePreference(field.key, event.target.value)}
                >
                  {field.options.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <button
            className="display-preferences-reset"
            type="button"
            onClick={() => {
              resetDisplayPreferences();
              announce("Đã đặt lại tùy chọn hiển thị");
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Đặt lại theo hệ thống
          </button>
        </section>
      )}
    </div>
  );
}
