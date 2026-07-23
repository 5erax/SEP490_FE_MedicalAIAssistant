import { RotateCcw, Settings2, X } from "lucide-react";
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
            <div>
              <p>Tùy chỉnh trải nghiệm</p>
              <h2 id={`${idPrefix}-title`}>Tùy chọn hiển thị</h2>
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

          <label htmlFor={`${idPrefix}-theme`}>
            <span>Giao diện</span>
            <select
              id={`${idPrefix}-theme`}
              value={preferences.theme}
              onChange={(event) => updatePreference("theme", event.target.value)}
            >
              <option value="system">Theo hệ thống</option>
              <option value="light">Sáng</option>
              <option value="dark">Tối</option>
            </select>
          </label>

          <label htmlFor={`${idPrefix}-motion`}>
            <span>Chuyển động</span>
            <select
              id={`${idPrefix}-motion`}
              value={preferences.motion}
              onChange={(event) => updatePreference("motion", event.target.value)}
            >
              <option value="system">Theo hệ thống</option>
              <option value="reduce">Giảm chuyển động</option>
              <option value="full">Đầy đủ</option>
            </select>
          </label>

          <label htmlFor={`${idPrefix}-contrast`}>
            <span>Độ tương phản</span>
            <select
              id={`${idPrefix}-contrast`}
              value={preferences.contrast}
              onChange={(event) => updatePreference("contrast", event.target.value)}
            >
              <option value="system">Theo hệ thống</option>
              <option value="more">Tăng tương phản</option>
            </select>
          </label>

          <label htmlFor={`${idPrefix}-text-scale`}>
            <span>Cỡ chữ</span>
            <select
              id={`${idPrefix}-text-scale`}
              value={preferences.textScale}
              onChange={(event) => updatePreference("textScale", event.target.value)}
            >
              <option value="100">100%</option>
              <option value="112">112%</option>
              <option value="125">125%</option>
            </select>
          </label>

          <label htmlFor={`${idPrefix}-spacing`}>
            <span>Giãn dòng</span>
            <select
              id={`${idPrefix}-spacing`}
              value={preferences.spacing}
              onChange={(event) => updatePreference("spacing", event.target.value)}
            >
              <option value="normal">Mặc định</option>
              <option value="comfortable">Thoáng</option>
            </select>
          </label>

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
