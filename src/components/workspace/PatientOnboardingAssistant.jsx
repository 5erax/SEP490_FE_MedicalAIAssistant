import { HelpCircle, PlayCircle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { setStoredAuth } from "../../services/api";

const TOUR_VERSION = "patient-v1";
const STORAGE_PREFIX = "medimate.onboarding.patient";

const TOUR_STEPS = [
  {
    title: "Bắt đầu với MediMate",
    body: "Tour ngắn này giúp bạn nắm các khu vực chính trong không gian bệnh nhân.",
    target: "",
  },
  {
    title: "Khu vực làm việc cá nhân",
    body: "Tiêu đề này cho biết bạn đang ở màn hình nào và giữ ngữ cảnh khi chuyển chức năng.",
    target: '[data-onboarding="patient-title"]',
  },
  {
    title: "Các chức năng chính",
    body: "Dùng thanh điều hướng để mở tư vấn chuyên khoa, bản đồ cơ sở y tế, phân tích xét nghiệm và các công cụ theo dõi.",
    target: '[data-onboarding="patient-nav"]',
  },
  {
    title: "Tìm cơ sở y tế",
    body: "Nhập chuyên khoa, triệu chứng hoặc tên cơ sở để chuyển nhanh sang bản đồ tìm nơi chăm sóc phù hợp.",
    target: '[data-onboarding="patient-search"]',
  },
  {
    title: "Tài khoản và hồ sơ",
    body: "Mở menu tài khoản để cập nhật hồ sơ cá nhân, xem giao dịch hoặc đổi tùy chọn hiển thị.",
    target: '[data-onboarding="patient-account"]',
  },
  {
    title: "Xem lại hướng dẫn bất cứ lúc nào",
    body: "Nút trợ giúp này luôn nằm ở góc màn hình để bạn có thể mở lại tour khi cần.",
    target: '[data-onboarding="patient-help"]',
  },
];

function getUserKey(auth) {
  return auth?.userId || auth?.identityId || auth?.email || "guest";
}

function getStorageKey(auth) {
  return `${STORAGE_PREFIX}.${TOUR_VERSION}.${getUserKey(auth)}`;
}

function readTourStatus(auth) {
  try {
    const raw = localStorage.getItem(getStorageKey(auth));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeTourStatus(auth, status) {
  localStorage.setItem(getStorageKey(auth), JSON.stringify({
    status,
    tourVersion: TOUR_VERSION,
    updatedAt: new Date().toISOString(),
  }));
}

function clearPendingFlag(auth) {
  if (!auth?.patientOnboardingPending) return;
  setStoredAuth({ ...auth, patientOnboardingPending: false });
}

function shouldAutoOpen(auth) {
  if (!auth?.accessToken || auth?.patientOnboardingPending !== true) return false;
  return !readTourStatus(auth)?.status;
}

function getTargetRect(selector) {
  if (!selector) return null;
  const element = document.querySelector(selector);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  return {
    top: Math.max(8, rect.top - 8),
    left: Math.max(8, rect.left - 8),
    width: rect.width + 16,
    height: rect.height + 16,
  };
}

export default function PatientOnboardingAssistant({ auth }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(() => shouldAutoOpen(auth));
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const nextButtonRef = useRef(null);
  const skipTourRef = useRef(null);
  const currentStep = TOUR_STEPS[stepIndex];
  const lastStep = stepIndex === TOUR_STEPS.length - 1;
  const progress = `${stepIndex + 1} / ${TOUR_STEPS.length}`;
  const highlightStyle = useMemo(() => (
    targetRect
      ? {
        top: `${targetRect.top}px`,
        left: `${targetRect.left}px`,
        width: `${targetRect.width}px`,
        height: `${targetRect.height}px`,
      }
      : null
  ), [targetRect]);

  useEffect(() => {
    skipTourRef.current = skipTour;
  });

  useEffect(() => {
    if (!tourOpen) return undefined;

    const updateTarget = () => {
      window.requestAnimationFrame(() => {
        setTargetRect(getTargetRect(currentStep.target));
      });
    };

    updateTarget();
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);

    return () => {
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [currentStep.target, tourOpen]);

  useEffect(() => {
    if (!tourOpen) return undefined;

    const frame = window.requestAnimationFrame(() => {
      nextButtonRef.current?.focus();
    });

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        skipTourRef.current?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [tourOpen]);

  function startTour() {
    setMenuOpen(false);
    setStepIndex(0);
    setTourOpen(true);
  }

  function closeTour(status) {
    writeTourStatus(auth, status);
    clearPendingFlag(auth);
    setTourOpen(false);
    setMenuOpen(false);
    setStepIndex(0);
  }

  function skipTour() {
    closeTour("skipped");
  }

  function finishTour() {
    closeTour("completed");
  }

  function goBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function goNext() {
    if (lastStep) {
      finishTour();
      return;
    }

    setStepIndex((current) => Math.min(TOUR_STEPS.length - 1, current + 1));
  }

  return (
    <>
      <div
        className="patient-help-launcher"
        data-onboarding="patient-help"
      >
        {menuOpen && !tourOpen && (
          <section className="patient-help-menu" aria-label="Hướng dẫn sử dụng">
            <div>
              <strong>Hướng dẫn nhanh</strong>
              <p>Mở lại tour các chức năng chính của bệnh nhân.</p>
            </div>
            <button type="button" onClick={startTour}>
              <PlayCircle size={17} aria-hidden="true" />
              Bắt đầu tour
            </button>
          </section>
        )}
        <button
          className="patient-help-button"
          type="button"
          aria-label="Mở hướng dẫn sử dụng"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X size={20} /> : <HelpCircle size={21} />}
        </button>
      </div>

      {tourOpen && (
        <div className="patient-tour-layer" role="presentation">
          {highlightStyle ? (
            <div className="patient-tour-highlight" style={highlightStyle} aria-hidden="true" />
          ) : (
            <div className="patient-tour-scrim" aria-hidden="true" />
          )}

          <section
            className={`patient-tour-panel ${highlightStyle ? "" : "is-centered"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-tour-title"
            aria-describedby="patient-tour-description"
          >
            <div className="patient-tour-kicker">
              <span>Patient tour</span>
              <strong>{progress}</strong>
            </div>
            <h2 id="patient-tour-title">{currentStep.title}</h2>
            <p id="patient-tour-description">{currentStep.body}</p>
            <div className="patient-tour-actions">
              <button type="button" onClick={skipTour}>Bỏ qua</button>
              <button type="button" onClick={goBack} disabled={stepIndex === 0}>Quay lại</button>
              <button ref={nextButtonRef} type="button" onClick={goNext}>
                {lastStep ? "Hoàn tất" : "Tiếp tục"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
