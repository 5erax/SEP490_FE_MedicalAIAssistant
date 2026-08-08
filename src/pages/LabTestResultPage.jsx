import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  FileText,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button, EmptyState, ErrorState } from "../components/ui";
import { navigate } from "../router/navigation";
import { getLabTestApiMessage, labTestsApi } from "../services/api";
import "../styles/user-workspace/lab-test-result.css";

const POLL_INTERVAL_MS = 1000;
const TERMINAL_SESSION_STATUSES = new Set(["completed", "failed"]);
const ABNORMAL_RESULT_STATUSES = new Set(["high", "low", "criticalHigh", "criticalLow"]);

const RESULT_STATUS_META = {
  unknown: { label: "Chưa xác định", tone: "neutral" },
  normal: { label: "Bình thường", tone: "success" },
  high: { label: "Cao", tone: "warning" },
  low: { label: "Thấp", tone: "warning" },
  criticalHigh: { label: "Cao nguy cấp", tone: "danger" },
  criticalLow: { label: "Thấp nguy cấp", tone: "danger" },
};

function unwrapData(response) {
  return response?.data ?? response?.Data ?? response;
}

function normalizeSessionStatus(value) {
  return String(value ?? "processing").trim().toLowerCase();
}

function normalizeResultStatus(value) {
  const normalized = String(value ?? "unknown").trim().toLowerCase().replace(/[\s_-]/g, "");
  if (normalized === "normal") return "normal";
  if (normalized === "high") return "high";
  if (normalized === "low") return "low";
  if (normalized === "criticalhigh") return "criticalHigh";
  if (normalized === "criticallow") return "criticalLow";
  return "unknown";
}

function formatDate(value, fallback = "chưa xác định") {
  if (!value) return fallback;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat("vi-VN").format(date);
}

function formatDateTime(value) {
  if (!value) return "Chưa có thời gian xử lý";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa có thời gian xử lý"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format(numeric)
    : String(value);
}

function getResultName(result) {
  return result?.indicator?.fullName || result?.rawExtractedName || "Chỉ số chưa nhận diện";
}

function getResultSymbol(result) {
  return result?.indicator?.symbol || result?.rawExtractedName || "—";
}

function getResultUnit(result) {
  return result?.referenceUnitUsed
    ?? result?.referenceRangeUsed?.unit
    ?? result?.indicator?.unit
    ?? "";
}

function getResultValue(result) {
  const value = result?.userValue ?? result?.rawExtractedValue;
  const unit = getResultUnit(result);
  return `${formatNumber(value)}${unit ? ` ${unit}` : ""}`;
}

function formatReference(result) {
  const range = result?.referenceRangeUsed ?? {};
  const comparisonType = result?.comparisonTypeUsed ?? range.comparisonType;
  const minimum = result?.referenceMinUsed ?? range.minValue;
  const maximum = result?.referenceMaxUsed ?? range.maxValue;
  const unit = getResultUnit(result);
  let reference = "Chưa có khoảng tham chiếu";

  if (comparisonType === "lessThanOrEqual" && maximum !== null && maximum !== undefined) {
    reference = `≤ ${formatNumber(maximum)}`;
  } else if (comparisonType === "greaterThanOrEqual" && minimum !== null && minimum !== undefined) {
    reference = `≥ ${formatNumber(minimum)}`;
  } else if (minimum !== null && minimum !== undefined && maximum !== null && maximum !== undefined) {
    reference = `${formatNumber(minimum)} – ${formatNumber(maximum)}`;
  } else if (minimum !== null && minimum !== undefined) {
    reference = `Từ ${formatNumber(minimum)}`;
  } else if (maximum !== null && maximum !== undefined) {
    reference = `Đến ${formatNumber(maximum)}`;
  }

  return unit && reference !== "Chưa có khoảng tham chiếu" ? `${reference} ${unit}` : reference;
}

function getResultKey(result, index) {
  return result?.resultDetailId
    || result?.indicator?.indicatorId
    || `${getResultSymbol(result)}-${index}`;
}

function toAdviceItems(value) {
  if (Array.isArray(value)) return value.flatMap(toAdviceItems);
  if (value && typeof value === "object") return Object.values(value).flatMap(toAdviceItems);

  const text = String(value ?? "").trim();
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((item) => item.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}

function AdviceBlock({ title, value, tone = "default" }) {
  const items = toAdviceItems(value);
  if (items.length === 0) return null;

  return (
    <section className="lab-test-result__advice-block" data-tone={tone}>
      <h3>{title}</h3>
      {items.length === 1 ? (
        <p>{items[0]}</p>
      ) : (
        <ul>
          {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
        </ul>
      )}
    </section>
  );
}

function ResultAdvice({ result }) {
  if (!result) {
    return (
      <EmptyState
        title="Chọn một chỉ số"
        description="Chọn chỉ số trong phiếu để xem phân tích chi tiết và thông tin tham khảo."
      />
    );
  }

  const advice = result?.advice;
  const status = normalizeResultStatus(result?.status);
  const meta = RESULT_STATUS_META[status];

  return (
    <div className="lab-test-result__advice-content">
      <header className="lab-test-result__advice-header">
        <span className="lab-test-result__advice-icon" data-tone={meta.tone} aria-hidden="true">
          {meta.tone === "success" ? <CheckCircle2 size={21} /> : <CircleAlert size={21} />}
        </span>
        <div>
          <p>PHÂN TÍCH CHI TIẾT</p>
          <h2>{getResultName(result)}</h2>
          <span>Mục đang chọn: {getResultSymbol(result)} · {getResultValue(result)}</span>
        </div>
      </header>

      <div className="lab-test-result__selected-summary" data-tone={meta.tone}>
        <div><span>Trạng thái</span><strong>{meta.label}</strong></div>
        <div><span>Khoảng tham chiếu</span><strong>{formatReference(result)}</strong></div>
      </div>

      {advice ? (
        <div className="lab-test-result__advice-sections">
          <AdviceBlock
            title={advice.displayTitle || "Thông tin tham khảo"}
            value={advice.summary ?? advice.description ?? advice.content}
          />
          <AdviceBlock title="Nguyên nhân có thể liên quan" value={advice.possibleCauses} />
          <AdviceBlock title="Sinh hoạt" value={advice.lifestyleAdvice} />
          <AdviceBlock title="Dinh dưỡng" value={advice.nutritionalAdvice} />
          <AdviceBlock title="Dấu hiệu cần lưu ý" value={advice.warningSigns} tone="danger" />
          <AdviceBlock title="Theo dõi tiếp" value={advice.followUpSuggestion} />
          <AdviceBlock title="Câu hỏi có thể trao đổi với bác sĩ" value={advice.doctorQuestions} />
        </div>
      ) : (
        <div className="lab-test-result__no-advice">
          <FileText size={20} aria-hidden="true" />
          <div>
            <strong>Chưa có phân tích chi tiết cho chỉ số này</strong>
            <p>Bạn vẫn có thể xem giá trị và khoảng tham chiếu đã được hệ thống đối chiếu.</p>
          </div>
        </div>
      )}

      <p className="lab-test-result__disclaimer">
        Nội dung chỉ hỗ trợ định hướng, không thay thế chẩn đoán, kê đơn hoặc tư vấn trực tiếp từ bác sĩ.
      </p>
    </div>
  );
}

function genderLabel(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "male") return "Nam";
  if (normalized === "female") return "Nữ";
  return "Giới tính chưa xác định";
}

export default function LabTestResultPage({ sessionId }) {
  const [session, setSession] = useState(null);
  const [loadStatus, setLoadStatus] = useState(sessionId ? "loading" : "error");
  const [error, setError] = useState(sessionId ? "" : "Không tìm thấy mã phiên phân tích xét nghiệm.");
  const [retryKey, setRetryKey] = useState(0);
  const [selectedResultKey, setSelectedResultKey] = useState("");
  const [announcement, setAnnouncement] = useState(
    sessionId ? "Đang tải kết quả xét nghiệm." : "Không tìm thấy mã phiên phân tích xét nghiệm.",
  );
  const pageHeadingRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return undefined;

    let active = true;
    let startTimer;
    let pollTimer;

    const pollSession = async () => {
      try {
        const response = await labTestsApi.get(sessionId);
        if (!active) return;

        const nextSession = unwrapData(response) ?? null;
        const nextStatus = normalizeSessionStatus(nextSession?.status);
        setSession(nextSession);
        setLoadStatus("ready");
        setError("");

        if (nextStatus === "completed") {
          const resultCount = Array.isArray(nextSession?.results) ? nextSession.results.length : 0;
          setAnnouncement(`Đã hoàn tất phân tích. Tìm thấy ${resultCount} chỉ số xét nghiệm.`);
          return;
        }

        if (nextStatus === "failed") {
          setAnnouncement("Phiên phân tích xét nghiệm không hoàn tất.");
          return;
        }

        pollTimer = window.setTimeout(() => void pollSession(), POLL_INTERVAL_MS);
      } catch (requestError) {
        if (!active) return;
        const message = getLabTestApiMessage(
          requestError,
          "Chưa thể tải kết quả xét nghiệm. Vui lòng thử lại.",
        );
        setLoadStatus("error");
        setError(message);
        setAnnouncement(message);
      }
    };

    startTimer = window.setTimeout(() => {
      setSession(null);
      setLoadStatus("loading");
      setError("");
      setAnnouncement("Đang tải kết quả xét nghiệm.");
      void pollSession();
    }, 0);

    return () => {
      active = false;
      if (startTimer) window.clearTimeout(startTimer);
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, [retryKey, sessionId]);

  const results = Array.isArray(session?.results) ? session.results : [];
  const selectedKeyExists = results.some(
    (result, index) => getResultKey(result, index) === selectedResultKey,
  );
  const defaultSelectedIndex = Math.max(0, results.findIndex((result) => (
    ABNORMAL_RESULT_STATUSES.has(normalizeResultStatus(result?.status))
  )));
  const effectiveSelectedKey = selectedKeyExists
    ? selectedResultKey
    : results.length > 0
      ? getResultKey(results[defaultSelectedIndex], defaultSelectedIndex)
      : "";

  const selectedResult = results.find(
    (result, index) => getResultKey(result, index) === effectiveSelectedKey,
  ) ?? null;
  const sessionStatus = normalizeSessionStatus(session?.status);
  const isPending = loadStatus === "ready" && !TERMINAL_SESSION_STATUSES.has(sessionStatus);
  const normalCount = results.filter((result) => normalizeResultStatus(result?.status) === "normal").length;
  const warningCount = results.filter((result) => (
    ABNORMAL_RESULT_STATUSES.has(normalizeResultStatus(result?.status))
  )).length;
  const unknownCount = results.length - normalCount - warningCount;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => pageHeadingRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isPending, loadStatus, sessionStatus]);

  function selectResult(key, result) {
    setSelectedResultKey(key);
    setAnnouncement(`Đã chọn ${getResultName(result)} để xem phân tích chi tiết.`);
  }

  function retryLoading() {
    setLoadStatus("loading");
    setError("");
    setAnnouncement("Đang tải lại kết quả xét nghiệm.");
    setRetryKey((current) => current + 1);
  }

  let content;

  if (loadStatus === "loading" || isPending) {
    content = (
      <section className="lab-test-result__loading-card" aria-busy="true">
        <LoaderCircle className="lab-test-result__spinner" size={48} aria-hidden="true" />
        <p>ĐANG PHÂN TÍCH PHIẾU XÉT NGHIỆM</p>
        <h1 ref={pageHeadingRef} tabIndex="-1">Hệ thống đang đọc và đối chiếu các chỉ số</h1>
        <span>Kết quả được kiểm tra tự động mỗi giây và sẽ xuất hiện ngay khi hoàn tất.</span>
        <Button type="button" tone="secondary" onClick={() => navigate("/records")}>
          <ArrowLeft size={17} aria-hidden="true" /> Quay lại phiếu xét nghiệm
        </Button>
      </section>
    );
  } else if (loadStatus === "error") {
    content = (
      <section className="lab-test-result__state-card">
        <h1 className="visually-hidden" ref={pageHeadingRef} tabIndex="-1">Không thể tải kết quả xét nghiệm</h1>
        <ErrorState
          title="Không thể tải kết quả xét nghiệm"
          description={error}
          action={(
            <div className="lab-test-result__state-actions">
              <Button type="button" onClick={retryLoading}>
                <RefreshCw size={17} aria-hidden="true" /> Thử lại
              </Button>
              <Button type="button" tone="secondary" onClick={() => navigate("/records")}>Quay lại</Button>
            </div>
          )}
        />
      </section>
    );
  } else if (sessionStatus === "failed") {
    content = (
      <section className="lab-test-result__state-card">
        <h1 className="visually-hidden" ref={pageHeadingRef} tabIndex="-1">Phiên phân tích không hoàn tất</h1>
        <ErrorState
          title="Phiên phân tích không hoàn tất"
          description="Hệ thống chưa thể đọc phiếu xét nghiệm này. Hãy kiểm tra độ rõ của tài liệu và gửi lại."
          action={<Button type="button" onClick={() => navigate("/records")}>Phân tích phiếu khác</Button>}
        />
      </section>
    );
  } else {
    content = (
      <div className="lab-test-result__container">
        <header className="lab-test-result__header">
          <button type="button" className="lab-test-result__back-button" onClick={() => navigate("/records")}>
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Phân tích xét nghiệm</span>
          </button>

          <div className="lab-test-result__heading-group">
            <div>
              <p>KẾT QUẢ PHÂN TÍCH</p>
              <h1 ref={pageHeadingRef} tabIndex="-1">Kết quả ngày {formatDate(session?.testDate)}</h1>
              <span>
                {genderLabel(session?.patientGenderAtTest)} · {formatNumber(session?.patientAgeAtTest)} tuổi · {formatDateTime(session?.processedAt || session?.createdAt)}
              </span>
            </div>
            <div className="lab-test-result__session-badge">
              <CheckCircle2 size={17} aria-hidden="true" /> Đã hoàn tất
            </div>
          </div>

          <div className="lab-test-result__safety-note">
            <ShieldCheck size={19} aria-hidden="true" />
            <span>Kết quả hỗ trợ định hướng. Khi có chỉ số bất thường hoặc triệu chứng đáng lo, hãy trao đổi với nhân viên y tế.</span>
          </div>
        </header>

        <div className="lab-test-result__content-grid">
          <section className="lab-test-result__results-panel" aria-labelledby="lab-results-title">
            <header className="lab-test-result__results-header">
              <div>
                <p>PHIẾU XÉT NGHIỆM</p>
                <h2 id="lab-results-title">Các chỉ số được nhận diện</h2>
              </div>
              <div className="lab-test-result__counts" aria-label="Tóm tắt trạng thái chỉ số">
                {warningCount > 0 && <span data-tone="warning">{warningCount} cảnh báo</span>}
                <span data-tone="success">{normalCount} bình thường</span>
                {unknownCount > 0 && <span data-tone="neutral">{unknownCount} chưa xác định</span>}
              </div>
            </header>

            {results.length === 0 ? (
              <EmptyState
                title="Chưa nhận được chỉ số"
                description="Phiên đã hoàn tất nhưng chưa có chỉ số xét nghiệm để hiển thị."
              />
            ) : (
              <div className="lab-test-result__result-grid">
                {results.map((result, index) => {
                  const key = getResultKey(result, index);
                  const status = normalizeResultStatus(result?.status);
                  const meta = RESULT_STATUS_META[status];
                  const isSelected = key === effectiveSelectedKey;

                  return (
                    <button
                      key={key}
                      type="button"
                      className="lab-test-result__result-card"
                      data-tone={meta.tone}
                      data-selected={isSelected ? "true" : "false"}
                      aria-pressed={isSelected}
                      aria-controls="lab-result-advice"
                      onClick={() => selectResult(key, result)}
                    >
                      <span className="lab-test-result__result-card-top">
                        <span className="lab-test-result__symbol">{getResultSymbol(result)}</span>
                        <span className="lab-test-result__result-status" data-tone={meta.tone}>{meta.label}</span>
                      </span>
                      <strong>{getResultName(result)}</strong>
                      <span className="lab-test-result__value">{getResultValue(result)}</span>
                      <small>Tham chiếu: {formatReference(result)}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside id="lab-result-advice" className="lab-test-result__advice-panel" aria-label="Phân tích chi tiết chỉ số đã chọn">
            <ResultAdvice result={selectedResult} />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="lab-test-result-page">
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {content}
    </div>
  );
}
