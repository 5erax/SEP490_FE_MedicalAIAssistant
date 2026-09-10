import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileText,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { Button, EmptyState, ErrorState } from "../components/ui";
import { navigate } from "../router/navigation";
import { getLabTestApiMessage, labTestsApi } from "../services/api";
import { useServiceCredit } from "../state/useServiceCredit";
import { ASYNC_SESSION_STATUS, normalizeAsyncSessionStatus } from "../utils/asyncSessionStatus";
import "../styles/user-workspace/lab-test-result.css";

const POLL_INTERVAL_MS = 1000;
const TERMINAL_SESSION_STATUSES = new Set([
  ASYNC_SESSION_STATUS.COMPLETED,
  ASYNC_SESSION_STATUS.FAILED,
]);
const ABNORMAL_RESULT_STATUSES = new Set(["high", "low", "criticalHigh", "criticalLow"]);

const RESULT_STATUS_META = {
  unknown: { label: "Chưa xác định", tone: "neutral" },
  normal: { label: "Bình thường", tone: "success" },
  high: { label: "Cao", tone: "warning" },
  low: { label: "Thấp", tone: "warning" },
  criticalHigh: { label: "Cao", tone: "warning" },
  criticalLow: { label: "Thấp", tone: "warning" },
};

function unwrapData(response) {
  return response?.data ?? response?.Data ?? response;
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

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format(numeric)
    : String(value);
}

function firstMeaningfulText(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && text !== "-" && text !== "—") return text;
  }
  return "";
}

function getIndicatorSource(result) {
  return result?.indicator
    ?? result?.labIndicator
    ?? result?.matchedIndicator
    ?? result?.indicatorSnapshot
    ?? result?.labTestIndicator
    ?? {};
}

function getSessionResults(session) {
  const items = session?.results
    ?? session?.resultDetails
    ?? session?.labResults
    ?? session?.labTestResults
    ?? session?.indicators
    ?? session?.details
    ?? [];
  return Array.isArray(items) ? items : [];
}

function getResultName(result) {
  const indicator = getIndicatorSource(result);
  return firstMeaningfulText(
    indicator.fullName,
    indicator.name,
    indicator.displayName,
    indicator.vietnameseName,
    indicator.label,
    result?.indicatorFullName,
    result?.fullName,
    result?.indicatorName,
    result?.labIndicatorName,
    result?.matchedIndicatorName,
    result?.displayTitle,
    result?.name,
    result?.displayName,
    result?.testName,
    result?.testNameVi,
    result?.analyteName,
    result?.parameterName,
    result?.rawExtractedName,
    result?.rawName,
    getResultSymbol(result),
  ) || "Chỉ số chưa nhận diện";
}

function getResultSymbol(result) {
  const indicator = getIndicatorSource(result);
  return firstMeaningfulText(
    indicator.symbol,
    indicator.code,
    indicator.shortName,
    result?.indicatorSymbol,
    result?.indicatorCode,
    result?.labIndicatorSymbol,
    result?.labIndicatorCode,
    result?.symbol,
    result?.code,
    result?.shortName,
    result?.rawExtractedName,
    result?.rawName,
  ) || "—";
}

function getResultUnit(result) {
  const indicator = getIndicatorSource(result);
  return result?.referenceUnitUsed
    ?? result?.referenceRangeUsed?.unit
    ?? result?.referenceRange?.unit
    ?? result?.unit
    ?? result?.resultUnit
    ?? result?.valueUnit
    ?? result?.measurementUnit
    ?? indicator.unit
    ?? "";
}

function getResultValue(result) {
  const value = result?.userValue
    ?? result?.rawExtractedValue
    ?? result?.value
    ?? result?.resultValue
    ?? result?.displayValue
    ?? result?.numericValue
    ?? result?.measuredValue;
  const unit = getResultUnit(result);
  return `${formatNumber(value)}${unit ? ` ${unit}` : ""}`;
}

function getResultNumericValue(result) {
  const value = result?.userValue
    ?? result?.rawExtractedValue
    ?? result?.value
    ?? result?.resultValue
    ?? result?.numericValue
    ?? result?.measuredValue;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getReferenceValues(result) {
  const range = result?.referenceRangeUsed ?? result?.referenceRange ?? {};
  const minimum = result?.referenceMinUsed
    ?? result?.referenceMin
    ?? result?.minReference
    ?? result?.lowerBound
    ?? result?.low
    ?? range.minValue
    ?? range.min
    ?? range.minimum
    ?? range.lowerBound;
  const maximum = result?.referenceMaxUsed
    ?? result?.referenceMax
    ?? result?.maxReference
    ?? result?.upperBound
    ?? result?.high
    ?? range.maxValue
    ?? range.max
    ?? range.maximum
    ?? range.upperBound;

  const normalizedMinimum = minimum === null || minimum === undefined || minimum === "" ? null : Number(minimum);
  const normalizedMaximum = maximum === null || maximum === undefined || maximum === "" ? null : Number(maximum);

  return {
    comparisonType: result?.comparisonTypeUsed ?? range.comparisonType,
    minimum: Number.isFinite(normalizedMinimum) ? normalizedMinimum : null,
    maximum: Number.isFinite(normalizedMaximum) ? normalizedMaximum : null,
  };
}

function formatReference(result) {
  const explicitReference = firstMeaningfulText(
    result?.referenceText,
    result?.referenceRangeText,
    result?.normalRange,
    result?.normalRangeText,
    typeof result?.referenceRange === "string" ? result.referenceRange : "",
  );
  if (explicitReference) return explicitReference;

  const { comparisonType, minimum, maximum } = getReferenceValues(result);
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

function getResultDeviation(result) {
  const value = getResultNumericValue(result);
  const status = normalizeResultStatus(result?.status);
  const { minimum, maximum } = getReferenceValues(result);
  const unit = getResultUnit(result);
  const boundary = status === "low" || status === "criticalLow" ? minimum : maximum;
  if (value === null || !Number.isFinite(boundary) || !ABNORMAL_RESULT_STATUSES.has(status)) return null;

  const difference = Math.abs(value - boundary);
  const percentage = boundary !== 0 ? (difference / Math.abs(boundary)) * 100 : null;
  const direction = status === "low" || status === "criticalLow" ? "thấp hơn" : "cao hơn";
  const boundaryLabel = status === "low" || status === "criticalLow" ? "giới hạn dưới" : "giới hạn trên";
  const percentageText = Number.isFinite(percentage)
    ? ` (${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(percentage)}%)`
    : "";

  return {
    value: `${direction} ${formatNumber(difference)}${unit ? ` ${unit}` : ""}${percentageText}`,
    note: `So với ${boundaryLabel} ${formatNumber(boundary)}${unit ? ` ${unit}` : ""}`,
  };
}

function normalizeIndicatorKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

const LIPID_RELATED_INDICATORS = [
  { label: "LDL-C", keys: ["LDL", "LDLC", "CHOLESTEROLLDL"] },
  { label: "HDL-C", keys: ["HDL", "HDLC", "CHOLESTEROLHDL"] },
  { label: "Triglyceride", keys: ["TG", "TRIGLYCERIDE", "TRIGLYCERIDES"] },
  { label: "Non-HDL", keys: ["NONHDL", "NONHDLCHOLESTEROL"] },
];

function getLipidContext(result, results) {
  const currentKeys = [getResultSymbol(result), getResultName(result)].map(normalizeIndicatorKey);
  const isTotalCholesterol = currentKeys.some((key) => (
    key === "CHOL" || key.includes("CHOLESTEROLTOANPHAN") || key.includes("TOTALCHOLESTEROL")
  ));
  if (!isTotalCholesterol) return null;

  const related = LIPID_RELATED_INDICATORS.map((definition) => {
    const match = results.find((candidate) => {
      if (candidate === result) return false;
      const candidateKeys = [getResultSymbol(candidate), getResultName(candidate)].map(normalizeIndicatorKey);
      return candidateKeys.some((key) => definition.keys.some((expected) => key === expected || key.includes(expected)));
    });
    return match ? {
      label: definition.label,
      value: getResultValue(match),
      status: RESULT_STATUS_META[normalizeResultStatus(match?.status)]?.label ?? "Chưa xác định",
      tone: RESULT_STATUS_META[normalizeResultStatus(match?.status)]?.tone ?? "neutral",
    } : { label: definition.label, value: "Chưa nhận diện", status: "", tone: "neutral" };
  });

  return {
    description: "Tổng cholesterol chưa đủ để tự kết luận nguy cơ tim mạch. Cần đọc cùng LDL-C, HDL-C, triglyceride, non-HDL và các yếu tố nguy cơ cá nhân.",
    related,
  };
}

function getResultKey(result, index) {
  const indicator = getIndicatorSource(result);
  return result?.resultDetailId
    || result?.id
    || result?.detailId
    || result?.resultId
    || indicator.indicatorId
    || indicator.id
    || `${getResultSymbol(result)}-${index}`;
}

function getResultAdvice(result) {
  return result?.advice
    ?? result?.indicatorAdvice
    ?? result?.clinicalAdvice
    ?? result?.analysis
    ?? result?.interpretation
    ?? null;
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

function AdviceBlock({ title, value, tone = "default", collapsible = false }) {
  const items = toAdviceItems(value);
  if (items.length === 0) return null;

  const renderItem = (item) => {
    const parts = item.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, index) => (
      /^https?:\/\//.test(part)
        ? <a key={`${part}-${index}`} href={part.replace(/[.,;:]$/, "")} target="_blank" rel="noreferrer">Nguồn tham khảo</a>
        : part
    ));
  };

  const content = items.length === 1 ? (
    <p>{renderItem(items[0])}</p>
  ) : (
    <ul>
      {items.map((item, index) => <li key={`${title}-${index}`}>{renderItem(item)}</li>)}
    </ul>
  );

  if (collapsible) {
    return (
      <details className="lab-test-result__advice-disclosure" data-tone={tone}>
        <summary>{title}</summary>
        {content}
      </details>
    );
  }

  return (
    <section className="lab-test-result__advice-block" data-tone={tone}>
      <h3>{title}</h3>
      {content}
    </section>
  );
}

function getResultPriority(result) {
  const status = normalizeResultStatus(result?.status);
  if (status === "criticalHigh" || status === "criticalLow") return 0;
  if (status === "high" || status === "low") return 1;
  if (status === "unknown") return 2;
  return 3;
}

function getFallbackOverviewSummary({
  attentionCount,
  normalCount,
  unknownCount,
  totalCount,
}) {
  if (totalCount === 0) {
    return "Phiên phân tích đã hoàn tất nhưng chưa có đủ chỉ số để tạo nhận định tổng quan.";
  }
  const normalRatio = normalCount > 0 ? `${normalCount}/${totalCount} chỉ số nằm trong khoảng tham chiếu. ` : "";
  if (attentionCount > 0) {
    return `${normalRatio}Có ${attentionCount} chỉ số nằm ngoài khoảng tham chiếu.`;
  }
  if (normalCount > 0 && unknownCount === 0) {
    return "Các chỉ số đã nhận diện đều nằm trong khoảng tham chiếu. Bạn vẫn nên theo dõi sức khỏe và thực hiện theo hướng dẫn của bác sĩ nếu có.";
  }
  if (unknownCount > 0) {
    return `Có ${unknownCount} chỉ số chưa đủ dữ liệu để đánh giá. Những chỉ số này không được xem là bình thường và có thể cần được đối chiếu thêm.`;
  }
  return "Kết quả đã được hệ thống tổng hợp. Hãy xem từng chỉ số để biết giá trị và khoảng tham chiếu tương ứng.";
}

function stripSummaryFormatting(value) {
  return String(value ?? "")
    .replace(/^#{1,6}\s*/, "")
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSummaryBlocks(value) {
  const blocks = [];
  let paragraphLines = [];
  let listItems = [];

  function flushParagraph() {
    const text = stripSummaryFormatting(paragraphLines.join(" "));
    if (text) blocks.push({ type: "paragraph", text });
    paragraphLines = [];
  }

  function flushList() {
    if (listItems.length > 0) blocks.push({ type: "list", items: listItems });
    listItems = [];
  }

  for (const sourceLine of String(value ?? "").split(/\r?\n/)) {
    const rawLine = sourceLine.trim();
    if (!rawLine) {
      flushParagraph();
      flushList();
      continue;
    }

    const isMarkdownHeading = /^#{1,6}\s+/.test(rawLine);
    const isBullet = /^[-*•]\s+/.test(rawLine);
    const content = stripSummaryFormatting(rawLine.replace(/^[-*•]\s+/, ""));
    if (!content) continue;

    if (/^chào\s+(bạn|anh|chị)\b/i.test(content) || /tôi là trợ lý y khoa/i.test(content)) {
      continue;
    }

    const isNumberedHeading = /^\d+[.)]\s+/.test(content) && content.length <= 100;
    const isSummaryTitle = /^(tóm tắt|bản tóm tắt)\s+kết quả xét nghiệm/i.test(content);

    if (isMarkdownHeading || isNumberedHeading || isSummaryTitle) {
      flushParagraph();
      flushList();
      if (!isSummaryTitle) {
        blocks.push({ type: "heading", text: content.replace(/^\d+[.)]\s*/, "").replace(/:$/, "") });
      }
      continue;
    }

    if (isBullet) {
      flushParagraph();
      listItems.push(content);
      continue;
    }

    flushList();
    paragraphLines.push(content);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function FormattedSummary({ value }) {
  const blocks = parseSummaryBlocks(value);
  if (blocks.length === 0) return null;

  return (
    <div className="lab-test-result__formatted-summary">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return <h4 key={`${block.type}-${index}`}>{block.text}</h4>;
        }
        if (block.type === "list") {
          return (
            <ul key={`${block.type}-${index}`}>
              {block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}
            </ul>
          );
        }
        return <p key={`${block.type}-${index}`}>{block.text}</p>;
      })}
    </div>
  );
}

function ResultOverview({
  results,
  summary,
  summaryStatus,
  summaryError,
  normalCount,
  attentionCount,
  unknownCount,
  onRetrySummary,
  onViewResults,
}) {
  const totalCount = results.length;
  const headline = attentionCount > 0
    ? `Có ${attentionCount} chỉ số cần chú ý`
    : totalCount === 0 ? "Chưa có chỉ số để đối chiếu"
      : normalCount > 0 && unknownCount === 0
        ? "Các chỉ số nằm trong khoảng tham chiếu"
        : "Có chỉ số chưa đủ dữ liệu để đánh giá";
  const tone = attentionCount > 0 ? "warning" : unknownCount > 0 || totalCount === 0 ? "neutral" : "success";
  const fallbackSummary = getFallbackOverviewSummary({
    attentionCount,
    normalCount,
    unknownCount,
    totalCount,
  });

  return (
    <section className="lab-test-result__overview" aria-labelledby="lab-overview-title">
      <header className="lab-test-result__overview-header">
        <span className="lab-test-result__overview-icon" data-tone={tone} aria-hidden="true">
          <ClipboardCheck size={22} />
        </span>
        <div>
          <p>TỔNG QUAN KẾT QUẢ</p>
          <h2 id="lab-overview-title" tabIndex="-1">{headline}</h2>
        </div>
      </header>

      <div className="lab-test-result__overview-counts" aria-label={`Tổng cộng ${totalCount} chỉ số`}>
        <div className="lab-test-result__overview-attention" data-tone="warning" data-active={attentionCount > 0}>
          <span>Chỉ số cần chú ý</span><strong>{attentionCount}</strong>
        </div>
        <div data-tone="success" data-active={normalCount > 0}><span>Chỉ số bình thường</span><strong>{normalCount}</strong></div>
        <div data-tone="neutral" data-active={unknownCount > 0}><span>Chỉ số chưa xác định</span><strong>{unknownCount}</strong></div>
      </div>

      {totalCount > 0 && <div className="lab-test-result__overview-actions">
        <button className="lab-test-result__overview-action" type="button" onClick={() => onViewResults("all")}>
          Xem {totalCount} chỉ số xét nghiệm <ArrowRight size={18} aria-hidden="true" />
        </button>
        {attentionCount > 0 && <button className="lab-test-result__overview-action is-secondary" type="button" onClick={() => onViewResults("attention")}>
          Xem chỉ số cần chú ý
        </button>}
      </div>}

      <div className="lab-test-result__overview-summary" data-tone={tone}>
        <span className="lab-test-result__overview-summary-label">Nhận định chung</span>
        {summary ? <FormattedSummary value={summary} /> : <p>{fallbackSummary}</p>}
        {summaryStatus === "loading" && (
          <span className="lab-test-result__summary-state">
            <LoaderCircle className="lab-test-result__spinner" size={15} aria-hidden="true" />
            Đang hoàn thiện phần tóm tắt…
          </span>
        )}
        {summaryStatus === "error" && (
          <span className="lab-test-result__summary-state is-error">
            {summaryError || "Chưa thể tải tóm tắt tự động."}
            <button type="button" onClick={onRetrySummary}>
              <RefreshCw size={14} aria-hidden="true" /> Thử lại
            </button>
          </span>
        )}
      </div>

      <p className="lab-test-result__overview-disclaimer">
        Tổng quan giúp bạn đọc kết quả dễ hơn, không thay thế chẩn đoán hoặc tư vấn trực tiếp từ bác sĩ.
      </p>
    </section>
  );
}

function ResultAdvice({ result, results = [] }) {
  if (!result) {
    return (
      <EmptyState
        title="Chọn một chỉ số"
        description="Chọn chỉ số trong phiếu để xem phân tích chi tiết và thông tin tham khảo."
      />
    );
  }

  const advice = getResultAdvice(result);
  const status = normalizeResultStatus(result?.status);
  const meta = RESULT_STATUS_META[status];
  const deviation = getResultDeviation(result);
  const lipidContext = getLipidContext(result, results);

  return (
    <div className="lab-test-result__advice-content">
      <header className="lab-test-result__advice-header">
        <span className="lab-test-result__advice-icon" data-tone={meta.tone} aria-hidden="true">
          {meta.tone === "success" ? <CheckCircle2 size={21} /> : <CircleAlert size={21} />}
        </span>
        <div>
          <p>PHÂN TÍCH CHI TIẾT</p>
          <h2 tabIndex="-1">{getResultName(result)}</h2>
          <span>Mục đang chọn: {getResultSymbol(result)} · {getResultValue(result)}</span>
        </div>
      </header>

      <div className="lab-test-result__selected-summary" data-tone={meta.tone}>
        <div><span>Trạng thái</span><strong>{meta.label}</strong></div>
        <div><span>Khoảng tham chiếu</span><strong>{formatReference(result)}</strong></div>
        {deviation && (
          <div className="lab-test-result__deviation">
            <span>Mức sai lệch</span>
            <strong>{deviation.value}</strong>
            <small>{deviation.note}</small>
          </div>
        )}
      </div>

      {lipidContext && (
        <section className="lab-test-result__related-context" aria-labelledby="lab-related-title">
          <h3 id="lab-related-title">Cần đối chiếu cùng bộ mỡ máu</h3>
          <p>{lipidContext.description}</p>
          <div className="lab-test-result__related-list">
            {lipidContext.related.map((item) => (
              <div key={item.label} data-tone={item.tone}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                {item.status && <small>{item.status}</small>}
              </div>
            ))}
          </div>
        </section>
      )}

      {advice ? (
        <div className="lab-test-result__advice-sections">
          <AdviceBlock
            title={advice.displayTitle || "Thông tin tham khảo"}
            value={typeof advice === "string" ? advice : advice.summary ?? advice.description ?? advice.content}
          />
          {typeof advice !== "string" && (
            <>
              <AdviceBlock title="Nguyên nhân có thể liên quan" value={advice.possibleCauses} collapsible />
              <AdviceBlock title="Sinh hoạt" value={advice.lifestyleAdvice} collapsible />
              <AdviceBlock title="Dinh dưỡng" value={advice.nutritionalAdvice} collapsible />
              <AdviceBlock
                title="Khi nào cần khám ngay"
                value={advice.warningSigns}
                tone="danger"
                collapsible={advice.severityLevel !== "critical"}
              />
              <AdviceBlock title="Theo dõi tiếp" value={advice.followUpSuggestion} collapsible />
              <AdviceBlock title="Câu hỏi có thể trao đổi với bác sĩ" value={advice.doctorQuestions} collapsible />
            </>
          )}
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

export default function LabTestResultPage({ sessionId, initialSession = null, embedded = false, onResponse, onSessionUpdate }) {
  const { refresh: refreshServiceCredit } = useServiceCredit();
  const [session, setSession] = useState(initialSession);
  const [loadStatus, setLoadStatus] = useState(initialSession ? "ready" : sessionId ? "loading" : "error");
  const [error, setError] = useState(initialSession || sessionId ? "" : "Không tìm thấy mã phiên phân tích xét nghiệm.");
  const [retryKey, setRetryKey] = useState(0);
  const [summaryRetryKey, setSummaryRetryKey] = useState(0);
  const [summaryState, setSummaryState] = useState({ sessionId: "", status: "idle", error: "" });
  const [selectedResultKey, setSelectedResultKey] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [visibleResultLimit, setVisibleResultLimit] = useState(12);
  const [activeView, setActiveView] = useState("overview");
  const [resultSearch, setResultSearch] = useState("");
  const [compact, setCompact] = useState(() => window.innerWidth < 1024);
  const [mobileDetail, setMobileDetail] = useState(false);
  const rootRef = useRef(null);
  const viewScrollRef = useRef({});
  const resultButtonsRef = useRef(new Map());
  const [announcement, setAnnouncement] = useState(
    sessionId ? "Đang tải kết quả xét nghiệm." : "Không tìm thấy mã phiên phân tích xét nghiệm.",
  );
  const pageHeadingRef = useRef(null);
  const responseNotifiedRef = useRef(false);
  const terminalBalanceRefreshRef = useRef("");
  const summaryRequestedRef = useRef("");

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    let focusFrame;
    const observer = new ResizeObserver(([entry]) => {
      const nextCompact = entry.contentRect.width < 960;
      if (nextCompact === (node.dataset.compact === "true")) return;
      const focused = document.activeElement;
      const focusInAdvice = node.querySelector("#lab-result-advice")?.contains(focused);
      const focusOnBack = focused?.matches(".lab-test-result__mobile-back");
      setCompact(nextCompact);
      // A breakpoint change returns to the list, never a stale compact detail screen.
      setMobileDetail(false);
      window.cancelAnimationFrame(focusFrame);
      focusFrame = window.requestAnimationFrame(() => {
        if (nextCompact && focusInAdvice) {
          node.querySelector('.lab-test-result__result-card[aria-pressed="true"]')?.focus({ preventScroll: true });
        } else if (!nextCompact && focusOnBack) {
          node.querySelector("#lab-result-advice h2")?.focus({ preventScroll: true });
        }
      });
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(focusFrame);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveView("overview");
      setMobileDetail(false);
      setSelectedResultKey("");
      setResultFilter("all");
      setResultSearch("");
      setVisibleResultLimit(12);
      viewScrollRef.current = {};
    }, 0);
    return () => window.clearTimeout(timer);
  }, [sessionId, initialSession?.sessionId]);

  useEffect(() => {
    terminalBalanceRefreshRef.current = "";
    summaryRequestedRef.current = "";
  }, [initialSession?.sessionId, retryKey, sessionId]);

  useEffect(() => {
    if (initialSession) {
      const initialSessionTimer = window.setTimeout(() => {
        const nextStatus = normalizeAsyncSessionStatus(initialSession?.status);
        const resultCount = getSessionResults(initialSession).length;
        setSession(initialSession);
        setLoadStatus("ready");
        setError("");
        setAnnouncement(
          nextStatus === ASYNC_SESSION_STATUS.COMPLETED
            ? `Đã hoàn tất phân tích. Tìm thấy ${resultCount} chỉ số xét nghiệm.`
            : "Đã tải kết quả xét nghiệm đính kèm.",
        );
        if (typeof onSessionUpdate === "function") onSessionUpdate(initialSession);
      }, 0);
      return () => window.clearTimeout(initialSessionTimer);
    }

    if (!sessionId) return undefined;

    let active = true;
    let startTimer;
    let pollTimer;

    const pollSession = async () => {
      const pollStartedAt = window.performance.now();

      try {
        const response = await labTestsApi.get(sessionId);
        if (!active) return;

        if (!responseNotifiedRef.current && typeof onResponse === "function") {
          responseNotifiedRef.current = true;
          onResponse(response);
        }

        const nextSession = unwrapData(response) ?? null;
        const nextStatus = normalizeAsyncSessionStatus(nextSession?.status);
        if (typeof onSessionUpdate === "function") onSessionUpdate(nextSession);
        setSession(nextSession);
        setLoadStatus("ready");
        setError("");

        if (nextStatus === ASYNC_SESSION_STATUS.COMPLETED) {
          const resultCount = getSessionResults(nextSession).length;
          setAnnouncement(`Đã hoàn tất phân tích. Tìm thấy ${resultCount} chỉ số xét nghiệm.`);
          const terminalKey = `${sessionId}:${nextStatus}`;
          if (terminalBalanceRefreshRef.current !== terminalKey) {
            terminalBalanceRefreshRef.current = terminalKey;
            void refreshServiceCredit({ silent: true });
          }
          return;
        }

        if (nextStatus === ASYNC_SESSION_STATUS.FAILED) {
          setAnnouncement("Phiên phân tích xét nghiệm không hoàn tất.");
          const terminalKey = `${sessionId}:${nextStatus}`;
          if (terminalBalanceRefreshRef.current !== terminalKey) {
            terminalBalanceRefreshRef.current = terminalKey;
            void refreshServiceCredit({ silent: true });
          }
          return;
        }

        const requestDuration = window.performance.now() - pollStartedAt;
        const nextPollDelay = Math.max(0, POLL_INTERVAL_MS - requestDuration);
        pollTimer = window.setTimeout(() => void pollSession(), nextPollDelay);
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
      responseNotifiedRef.current = false;
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
  }, [initialSession, onResponse, onSessionUpdate, refreshServiceCredit, retryKey, sessionId]);

  const results = getSessionResults(session);
  const sessionStatus = normalizeAsyncSessionStatus(session?.status);
  const isPending = !initialSession && loadStatus === "ready" && !TERMINAL_SESSION_STATUSES.has(sessionStatus);
  const normalCount = results.filter((result) => normalizeResultStatus(result?.status) === "normal").length;
  const attentionCount = results.filter((result) => (
    ABNORMAL_RESULT_STATUSES.has(normalizeResultStatus(result?.status))
  )).length;
  const warningCount = attentionCount;
  const unknownCount = results.length - normalCount - warningCount;
  const requestedResultFilter = resultFilter;
  const requestedFilterCount = {
    attention: warningCount,
    normal: normalCount,
    unknown: unknownCount,
    all: results.length,
  }[requestedResultFilter] ?? results.length;
  const effectiveResultFilter = requestedFilterCount > 0 ? requestedResultFilter : "all";
  const orderedResultEntries = results
    .map((result, index) => ({ result, index }))
    .sort((left, right) => (
      getResultPriority(left.result) - getResultPriority(right.result)
      || left.index - right.index
    ));
  const normalizeSearch = (value) => String(value ?? "").toLocaleLowerCase("vi")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  const searchQuery = normalizeSearch(resultSearch.trim());
  const filteredResultEntries = orderedResultEntries.filter(({ result }) => {
    if (searchQuery && !normalizeSearch(getResultName(result) + " " + getResultSymbol(result) + " " + (result?.rawExtractedName ?? "")).includes(searchQuery)) return false;
    const status = normalizeResultStatus(result?.status);
    if (effectiveResultFilter === "attention") return ABNORMAL_RESULT_STATUSES.has(status);
    if (effectiveResultFilter === "normal") return status === "normal";
    if (effectiveResultFilter === "unknown") return status === "unknown";
    return true;
  });
  const visibleResultEntries = filteredResultEntries.slice(0, visibleResultLimit);
  const selectedEntry = visibleResultEntries.find(({result, index}) => getResultKey(result, index) === selectedResultKey)
    ?? visibleResultEntries[0];
  const effectiveSelectedKey = selectedEntry ? getResultKey(selectedEntry.result, selectedEntry.index) : "";
  const selectedResult = selectedEntry?.result ?? null;
  const showMobileDetail = compact && mobileDetail && activeView === "indicators" && Boolean(selectedResult);
  const summarySessionId = session?.sessionId ?? sessionId;
  const summaryText = firstMeaningfulText(session?.aiSummary);
  const resultDate = formatDate(
    session?.testDate
      ?? session?.processedAt
      ?? session?.uploadedAt
      ?? session?.createdAt
      ?? session?.createdAtUtc,
    "",
  );
  const summaryStatus = summaryText
    ? "ready"
    : summaryState.sessionId === summarySessionId
      ? summaryState.status
      : "idle";
  const summaryError = summaryState.sessionId === summarySessionId ? summaryState.error : "";

  useEffect(() => {
    if (
      sessionStatus !== ASYNC_SESSION_STATUS.COMPLETED
      || !summarySessionId
      || results.length === 0
    ) return undefined;

    if (summaryText) return undefined;

    const requestKey = `${summarySessionId}:${summaryRetryKey}`;
    if (summaryRequestedRef.current === requestKey) return undefined;
    summaryRequestedRef.current = requestKey;

    let active = true;

    const loadSummary = async () => {
      setSummaryState({ sessionId: summarySessionId, status: "loading", error: "" });
      try {
        const response = await labTestsApi.summarize(summarySessionId);
        if (!active) return;

        const generatedSummary = firstMeaningfulText(unwrapData(response));
        if (!generatedSummary) {
          throw new Error("API chưa trả về nội dung tóm tắt.");
        }

        const nextSession = { ...session, aiSummary: generatedSummary };
        setSession(nextSession);
        setSummaryState({ sessionId: summarySessionId, status: "ready", error: "" });
        setAnnouncement("Đã hoàn thiện phần tổng quan kết quả xét nghiệm.");
        if (typeof onSessionUpdate === "function") onSessionUpdate(nextSession);
      } catch (requestError) {
        if (!active) return;
        setSummaryState({
          sessionId: summarySessionId,
          status: "error",
          error: getLabTestApiMessage(
            requestError,
            "Chưa thể tải tóm tắt tự động. Bạn vẫn có thể xem tổng quan theo trạng thái chỉ số.",
          ),
        });
      }
    };

    void loadSummary();
    return () => {
      active = false;
    };
  }, [
    onSessionUpdate,
    results.length,
    session,
    sessionStatus,
    summaryRetryKey,
    summarySessionId,
    summaryText,
  ]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => pageHeadingRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isPending, loadStatus, sessionStatus]);

  // Use the existing page/modal scroll owner, never add a second scrolling pane.
  function scrollOwner() {
    let node = rootRef.current?.parentElement;
    while (node && node !== document.body) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
      node = node.parentElement;
    }
    return document.scrollingElement;
  }

  function rememberScroll(view) {
    const owner = scrollOwner();
    viewScrollRef.current[view] = { owner, top:owner?.scrollTop ?? 0 };
  }

  function restoreScroll(view, focusTarget, reset = false) {
    window.requestAnimationFrame(() => {
      const saved = viewScrollRef.current[view];
      const owner = saved?.owner?.isConnected ? saved.owner : scrollOwner();
      if (owner) owner.scrollTop = reset ? 0 : saved?.top ?? 0;
      focusTarget?.()?.focus({ preventScroll:true });
    });
  }

  function switchView(view, { focusPanel = false, reset = false } = {}) {
    if (view === activeView && !mobileDetail) return;
    rememberScroll(activeView);
    setMobileDetail(false);
    setActiveView(view);
    restoreScroll(view, focusPanel ? () => rootRef.current?.querySelector(view === "overview" ? "#lab-overview-title" : "#lab-results-title") : null, reset);
  }

  function openResults(filter) {
    changeResultFilter(filter);
    setResultSearch("");
    switchView("indicators", {focusPanel:true, reset:true});
  }

  function selectResult(key, result) {
    setSelectedResultKey(key);
    setAnnouncement(`Đã chọn ${getResultName(result)} để xem phân tích chi tiết.`);
    if (compact) {
      rememberScroll("indicators");
      setMobileDetail(true);
      restoreScroll("detail", () => rootRef.current?.querySelector("#lab-result-advice h2"), true);
    }
  }

  function closeMobileDetail() {
    setMobileDetail(false);
    restoreScroll("indicators", () => resultButtonsRef.current.get(effectiveSelectedKey));
  }

  function onViewTabKeyDown(event, view) {
    const views = ["overview", "indicators"];
    let next;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") next = views[1 - views.indexOf(view)];
    else if (event.key === "Home") next = "overview";
    else if (event.key === "End") next = "indicators";
    if (!next) return;
    event.preventDefault();
    switchView(next);
    rootRef.current?.querySelector(`#lab-tab-${next}`)?.focus({preventScroll:true});
  }

  function retryLoading() {
    setLoadStatus("loading");
    setError("");
    setAnnouncement("Đang tải lại kết quả xét nghiệm.");
    setRetryKey((current) => current + 1);
  }

  function retrySummary() {
    summaryRequestedRef.current = "";
    setSummaryRetryKey((current) => current + 1);
  }

  function changeResultFilter(nextFilter) {
    setResultFilter(nextFilter);
    setVisibleResultLimit(12);
    const labels = {
      all: "tất cả chỉ số",
      attention: "chỉ số cần chú ý",
      normal: "chỉ số bình thường",
      unknown: "chỉ số chưa xác định",
    };
    setAnnouncement(`Đang hiển thị ${labels[nextFilter]}.`);
  }

  let content;

  if (loadStatus === "loading" || isPending) {
    content = (
      <section className="lab-test-result__loading-card" aria-busy="true">
        <LoaderCircle className="lab-test-result__spinner" size={48} aria-hidden="true" />
        <p>ĐANG PHÂN TÍCH PHIẾU XÉT NGHIỆM</p>
        <h1 ref={pageHeadingRef} tabIndex="-1">Hệ thống đang đọc và đối chiếu các chỉ số</h1>
        <span>Kết quả được kiểm tra tự động mỗi giây và sẽ xuất hiện ngay khi hoàn tất.</span>
        {!embedded && (
          <Button type="button" tone="secondary" onClick={() => navigate("/records")}>
            <ArrowLeft size={17} aria-hidden="true" /> Quay lại phiếu xét nghiệm
          </Button>
        )}
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
              {!embedded && <Button type="button" tone="secondary" onClick={() => navigate("/records")}>Quay lại</Button>}
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
          action={!embedded ? <Button type="button" onClick={() => navigate("/records")}>Phân tích phiếu khác</Button> : undefined}
        />
      </section>
    );
  } else {
    content = (
      <div className="lab-test-result__container">
        <header className="lab-test-result__header" hidden={showMobileDetail}>
          {!embedded && <button type="button" className="lab-test-result__back-button" onClick={() => navigate("/records")}>
            <ArrowLeft size={18} aria-hidden="true" /><span>Phân tích xét nghiệm</span>
          </button>}
          <div className="lab-test-result__heading-group">
            <div>
              <p>PHIẾU XÉT NGHIỆM</p>
              <h1 ref={pageHeadingRef} tabIndex="-1">{resultDate ? `Kết quả ngày ${resultDate}` : "Kết quả xét nghiệm"}</h1>
              <span className="lab-test-result__scan-meta">Đã nhận diện {results.length} chỉ số{session?.processedAt ? ` · Phân tích ngày ${formatDate(session.processedAt)}` : ""}</span>
            </div>
            <span className="lab-test-result__session-badge"><CheckCircle2 size={16} aria-hidden="true" /> Đã hoàn tất</span>
          </div>
        </header>

        <nav className="lab-test-result__view-tabs" role="tablist" aria-label="Nội dung kết quả xét nghiệm" hidden={showMobileDetail}>
          {[["overview", "Tổng quan"], ["indicators", "Chỉ số xét nghiệm"]].map(([view, label]) => <button key={view}
            id={`lab-tab-${view}`} className="lab-test-result__view-tab" type="button" role="tab"
            aria-label={label} aria-selected={activeView === view} aria-controls={view === "overview" ? "lab-overview-panel" : "lab-indicators-panel"}
            tabIndex={activeView === view ? 0 : -1} onClick={() => switchView(view)} onKeyDown={(event) => onViewTabKeyDown(event, view)}>
            {label}{view === "indicators" && <span aria-hidden="true">{results.length}</span>}
          </button>)}
        </nav>

        <div id="lab-overview-panel" role="tabpanel" aria-labelledby="lab-tab-overview" hidden={activeView !== "overview"}>
          <ResultOverview results={results} summary={summaryText} summaryStatus={summaryStatus} summaryError={summaryError}
            normalCount={normalCount} attentionCount={attentionCount} unknownCount={unknownCount}
            onRetrySummary={retrySummary} onViewResults={openResults} />
        </div>

        <div id="lab-indicators-panel" role="tabpanel" aria-labelledby="lab-tab-indicators" hidden={activeView !== "indicators"}>
        <div className="lab-test-result__content-grid">
          <section className="lab-test-result__results-panel" aria-labelledby="lab-results-title" hidden={showMobileDetail}>
            <header className="lab-test-result__results-header">
              <h2 id="lab-results-title" tabIndex="-1">Các chỉ số được nhận diện</h2>
              <p>Chọn một chỉ số để xem giá trị, khoảng tham chiếu và giải thích.</p>
            </header>
            {results.length > 0 && <div className="lab-test-result__results-toolbar">
              <label className="lab-test-result__search">
                <span className="visually-hidden">Tìm chỉ số xét nghiệm</span>
                <input type="search" value={resultSearch} placeholder="Tìm tên hoặc ký hiệu, ví dụ: AST"
                  onChange={(event) => { setResultSearch(event.target.value); setVisibleResultLimit(12); }} />
              </label>
              <div className="lab-test-result__result-filters" role="group" aria-label="Lọc chỉ số xét nghiệm">
                {[["all", "Tất cả", results.length, "neutral"], ["attention", "Cần chú ý", warningCount, "warning"],
                  ["normal", "Bình thường", normalCount, "success"], ["unknown", "Chưa xác định", unknownCount, "neutral"]]
                  .filter(([key,,count]) => key === "all" || count > 0).map(([key,label,count,tone]) => <button key={key}
                    type="button" data-active={effectiveResultFilter === key} data-tone={tone} aria-pressed={effectiveResultFilter === key}
                    onClick={() => changeResultFilter(key)}>{label} <span>{count}</span></button>)}
              </div>
              <p className="lab-test-result__result-count" aria-live="polite">Hiển thị {visibleResultEntries.length}/{filteredResultEntries.length} chỉ số{resultSearch.trim() ? " phù hợp" : ""}</p>
            </div>}

            {results.length === 0 ? <EmptyState title="Chưa nhận được chỉ số" description="Phiên đã hoàn tất nhưng chưa có chỉ số xét nghiệm để hiển thị." />
              : filteredResultEntries.length === 0 ? <div className="lab-test-result__empty-search">
                <EmptyState title="Không tìm thấy chỉ số phù hợp" description="Thử tên hoặc ký hiệu khác, hoặc thay đổi bộ lọc." />
                <button type="button" className="lab-test-result__show-more" onClick={() => {setResultSearch("");changeResultFilter("all");}}>Xóa tìm kiếm và bộ lọc</button>
              </div> : <>
                <div className="lab-test-result__result-grid">
                  {visibleResultEntries.map(({result,index}) => {
                    const key = getResultKey(result,index);
                    const meta = RESULT_STATUS_META[normalizeResultStatus(result?.status)];
                    const isSelected = key === effectiveSelectedKey;
                    return <button key={key} type="button" className="lab-test-result__result-card"
                      ref={(node) => { if (node) resultButtonsRef.current.set(key,node); else resultButtonsRef.current.delete(key); }}
                      data-tone={meta.tone} data-selected={isSelected ? "true" : "false"} aria-pressed={isSelected} aria-controls="lab-result-advice"
                      onClick={() => selectResult(key,result)}>
                      <span className="lab-test-result__result-identity">
                        {getResultSymbol(result) !== getResultName(result) && <span className="lab-test-result__symbol">{getResultSymbol(result)}</span>}
                        <strong>{getResultName(result)}</strong>
                      </span>
                      <span className="lab-test-result__result-measurement"><span className="lab-test-result__value">{getResultValue(result)}</span></span>
                      <small className="lab-test-result__result-reference">Tham chiếu: {formatReference(result)}</small>
                      <span className="lab-test-result__result-status" data-tone={meta.tone}>{meta.label}</span>
                      <ChevronRight className="lab-test-result__result-row-chevron" size={17} aria-hidden="true" />
                    </button>;
                  })}
                </div>
                {visibleResultEntries.length < filteredResultEntries.length && <button type="button" className="lab-test-result__show-more"
                  onClick={() => setVisibleResultLimit(current => current + 12)}>
                  Xem thêm {Math.min(12,filteredResultEntries.length - visibleResultEntries.length)} chỉ số
                </button>}
              </>}
          </section>

          <aside id="lab-result-advice" className="lab-test-result__advice-panel" aria-label="Phân tích chi tiết chỉ số đã chọn" hidden={compact && !showMobileDetail}>
            {compact && <button type="button" className="lab-test-result__mobile-back" onClick={closeMobileDetail}>
              <ArrowLeft size={18} aria-hidden="true" />Quay lại các chỉ số
            </button>}
            <ResultAdvice key={effectiveSelectedKey} result={selectedResult} results={results} />
          </aside>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`lab-test-result-page${embedded ? " is-embedded" : ""}`} data-compact={compact ? "true" : "false"} data-mobile-detail={showMobileDetail ? "true" : "false"}
      onKeyDown={(event) => {
        if (showMobileDetail && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeMobileDetail(); }
      }}>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {content}
    </div>
  );
}
