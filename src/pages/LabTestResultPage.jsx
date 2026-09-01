import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileText,
  HeartPulse,
  ListChecks,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Button, EmptyState, ErrorState } from "../components/ui";
import { navigate } from "../router/navigation";
import { getLabTestApiMessage, labTestsApi } from "../services/api";
import { useServiceCredit } from "../state/useServiceCredit";
import { ASYNC_SESSION_STATUS, normalizeAsyncSessionStatus } from "../utils/asyncSessionStatus";
import "../styles/user-workspace/lab-test-result.css";

const POLL_INTERVAL_MS = 100;
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
  criticalHigh: { label: "Cao nguy cấp", tone: "danger" },
  criticalLow: { label: "Thấp nguy cấp", tone: "danger" },
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

function getDeviationMagnitude(result) {
  const deviation = Number(result?.deviationPercent);
  return Number.isFinite(deviation) ? Math.abs(deviation) : -1;
}

function getPriorityResults(results) {
  return results
    .filter((result) => ABNORMAL_RESULT_STATUSES.has(normalizeResultStatus(result?.status)))
    .map((result, index) => ({ result, index }))
    .sort((left, right) => (
      getResultPriority(left.result) - getResultPriority(right.result)
      || getDeviationMagnitude(right.result) - getDeviationMagnitude(left.result)
      || left.index - right.index
    ))
    .slice(0, 3);
}

function uniqueAdviceItems(values, limit = 3) {
  const seen = new Set();
  const items = [];

  for (const value of values) {
    for (const item of toAdviceItems(value)) {
      const key = item.normalize("NFKC").toLocaleLowerCase("vi-VN").replace(/\s+/g, " ").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push(item);
      if (items.length >= limit) return items;
    }
  }

  return items;
}

function getOverviewActions(results) {
  const abnormalResults = results.filter((result) => (
    ABNORMAL_RESULT_STATUSES.has(normalizeResultStatus(result?.status))
  ));
  const actionSources = abnormalResults.length > 0 ? abnormalResults : results;
  const adviceItems = actionSources.map(getResultAdvice).filter(Boolean);

  return {
    urgent: uniqueAdviceItems(adviceItems.map((advice) => (
      typeof advice === "object" ? advice.warningSigns : null
    ))),
    followUp: uniqueAdviceItems(adviceItems.flatMap((advice) => (
      typeof advice === "object"
        ? [advice.followUpSuggestion, advice.followUpAdvice, advice.monitoringAdvice]
        : []
    ))),
    habits: uniqueAdviceItems(adviceItems.flatMap((advice) => (
      typeof advice === "object"
        ? [advice.lifestyleAdvice, advice.nutritionalAdvice]
        : []
    ))),
  };
}

function getFallbackOverviewSummary({
  criticalCount,
  attentionCount,
  normalCount,
  unknownCount,
  totalCount,
  priorityNames = [],
}) {
  if (totalCount === 0) {
    return "Phiên phân tích đã hoàn tất nhưng chưa có đủ chỉ số để tạo nhận định tổng quan.";
  }
  const normalRatio = normalCount > 0 ? `${normalCount}/${totalCount} chỉ số nằm trong khoảng tham chiếu. ` : "";
  const focusText = priorityNames.length > 0 ? ` ${priorityNames.join(", ")} cần được xem trước.` : "";
  if (criticalCount > 0) {
    return `${normalRatio}Có ${criticalCount} chỉ số ở mức nguy cấp.${focusText} Hãy trao đổi với nhân viên y tế, đặc biệt khi bạn đang có triệu chứng bất thường.`;
  }
  if (attentionCount > 0) {
    return `${normalRatio}Có ${attentionCount} chỉ số nằm ngoài khoảng tham chiếu.${focusText}`;
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

function OverviewActionGroup({ icon, title, items, tone = "default" }) {
  if (items.length === 0) return null;

  return (
    <section className="lab-test-result__overview-action" data-tone={tone}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <h3>{title}</h3>
        <ul>
          {items.map((item) => <li key={`${title}-${item}`}>{item}</li>)}
        </ul>
      </div>
    </section>
  );
}

function ResultOverview({
  results,
  summary,
  summaryStatus,
  summaryError,
  normalCount,
  attentionCount,
  criticalCount,
  unknownCount,
  onRetrySummary,
  onSelectResult,
}) {
  const totalCount = results.length;
  const priorityResults = getPriorityResults(results);
  const actions = getOverviewActions(results);
  const headline = criticalCount > 0
    ? `Có ${criticalCount} chỉ số ở mức nguy cấp`
    : attentionCount > 0
      ? `Có ${attentionCount} chỉ số cần chú ý`
      : normalCount > 0 && unknownCount === 0
        ? "Các chỉ số đã nhận diện đang ổn định"
        : "Kết quả cần được đối chiếu thêm";
  const tone = criticalCount > 0 ? "danger" : attentionCount > 0 ? "warning" : "success";
  const fallbackSummary = getFallbackOverviewSummary({
    criticalCount,
    attentionCount,
    normalCount,
    unknownCount,
    totalCount,
    priorityNames: priorityResults.map(({ result }) => getResultSymbol(result)),
  });
  const summaryPreview = fallbackSummary;
  const hasExtendedSummary = Boolean(summary) && stripSummaryFormatting(summary).length > summaryPreview.length + 80;
  const hasActions = actions.urgent.length + actions.followUp.length + actions.habits.length > 0;

  return (
    <section className="lab-test-result__overview" aria-labelledby="lab-overview-title">
      <header className="lab-test-result__overview-header">
        <span className="lab-test-result__overview-icon" data-tone={tone} aria-hidden="true">
          <ClipboardCheck size={22} />
        </span>
        <div>
          <p>TỔNG QUAN KẾT QUẢ</p>
          <h2 id="lab-overview-title">{headline}</h2>
        </div>
      </header>

      <div className="lab-test-result__overview-counts" aria-label={`Tổng cộng ${totalCount} chỉ số`}>
        <div data-tone="danger" data-active={criticalCount > 0}><strong>{criticalCount}</strong><span>Nguy cấp</span></div>
        <div className="lab-test-result__overview-attention" data-tone="warning" data-active={attentionCount > 0}>
          <span>Cần chú ý</span><strong>{attentionCount}</strong>
        </div>
        <div data-tone="success" data-active={normalCount > 0}><strong>{normalCount}</strong><span>Bình thường</span></div>
        <div data-tone="neutral" data-active={unknownCount > 0}><strong>{unknownCount}</strong><span>Chưa xác định</span></div>
      </div>

      <div className="lab-test-result__overview-summary" data-tone={tone}>
        <span className="lab-test-result__overview-summary-label">Nhận định chung</span>
        <p>{summaryPreview}</p>
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

      {priorityResults.length > 0 && (
        <section className="lab-test-result__priority-section" aria-labelledby="lab-priority-title">
          <div className="lab-test-result__section-title">
            <TriangleAlert size={18} aria-hidden="true" />
            <h3 id="lab-priority-title">Điểm cần chú ý trước</h3>
          </div>
          <div className="lab-test-result__priority-list">
            {priorityResults.map(({ result, index }) => {
              const key = getResultKey(result, index);
              const meta = RESULT_STATUS_META[normalizeResultStatus(result?.status)];
              return (
                <button
                  key={key}
                  type="button"
                  className="lab-test-result__priority-item"
                  data-tone={meta.tone}
                  onClick={() => onSelectResult(key, result)}
                >
                  <span>
                    <strong>{getResultName(result)}</strong>
                    <small>{getResultValue(result)} · {meta.label}</small>
                  </span>
                  <span className="lab-test-result__priority-link">
                    Xem chi tiết <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {hasActions && (
        <section className="lab-test-result__actions-section" aria-labelledby="lab-actions-title">
          <div className="lab-test-result__section-title">
            <ListChecks size={18} aria-hidden="true" />
            <h3 id="lab-actions-title">Việc nên làm tiếp theo</h3>
          </div>
          <div className="lab-test-result__overview-actions">
            <OverviewActionGroup
              icon={<TriangleAlert size={18} />}
              title="Dấu hiệu cần lưu ý"
              items={actions.urgent}
              tone="warning"
            />
            <OverviewActionGroup
              icon={<HeartPulse size={18} />}
              title="Nên theo dõi"
              items={actions.followUp}
            />
            <OverviewActionGroup
              icon={<CheckCircle2 size={18} />}
              title="Sinh hoạt và dinh dưỡng"
              items={actions.habits}
              tone="success"
            />
          </div>
        </section>
      )}

      {hasExtendedSummary && (
        <details className="lab-test-result__full-summary">
          <summary>
            <FileText size={17} aria-hidden="true" />
            <span>Xem phân tích tổng quan đầy đủ</span>
          </summary>
          <FormattedSummary value={summary} />
        </details>
      )}

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
          <h2>{getResultName(result)}</h2>
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
  const [visibleResultLimit, setVisibleResultLimit] = useState(9);
  const [announcement, setAnnouncement] = useState(
    sessionId ? "Đang tải kết quả xét nghiệm." : "Không tìm thấy mã phiên phân tích xét nghiệm.",
  );
  const pageHeadingRef = useRef(null);
  const responseNotifiedRef = useRef(false);
  const terminalBalanceRefreshRef = useRef("");
  const summaryRequestedRef = useRef("");

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
  const sessionStatus = normalizeAsyncSessionStatus(session?.status);
  const isPending = !initialSession && loadStatus === "ready" && !TERMINAL_SESSION_STATUSES.has(sessionStatus);
  const normalCount = results.filter((result) => normalizeResultStatus(result?.status) === "normal").length;
  const criticalCount = results.filter((result) => (
    ["criticalHigh", "criticalLow"].includes(normalizeResultStatus(result?.status))
  )).length;
  const attentionCount = results.filter((result) => (
    ["high", "low"].includes(normalizeResultStatus(result?.status))
  )).length;
  const warningCount = criticalCount + attentionCount;
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
  const filteredResultEntries = orderedResultEntries.filter(({ result }) => {
    const status = normalizeResultStatus(result?.status);
    if (effectiveResultFilter === "attention") return ABNORMAL_RESULT_STATUSES.has(status);
    if (effectiveResultFilter === "normal") return status === "normal";
    if (effectiveResultFilter === "unknown") return status === "unknown";
    return true;
  });
  const visibleResultEntries = filteredResultEntries.slice(0, visibleResultLimit);
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

  function retrySummary() {
    summaryRequestedRef.current = "";
    setSummaryRetryKey((current) => current + 1);
  }

  function selectOverviewResult(key, result) {
    setResultFilter("attention");
    setVisibleResultLimit(9);
    selectResult(key, result);
    window.requestAnimationFrame(() => {
      const target = document.getElementById("lab-result-advice");
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      target?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }

  function changeResultFilter(nextFilter) {
    setResultFilter(nextFilter);
    setVisibleResultLimit(9);
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
        <header className="lab-test-result__header">
          {!embedded && (
            <button type="button" className="lab-test-result__back-button" onClick={() => navigate("/records")}>
              <ArrowLeft size={18} aria-hidden="true" />
              <span>Phân tích xét nghiệm</span>
            </button>
          )}

          <div className="lab-test-result__heading-group">
            <div>
              <p>KẾT QUẢ PHÂN TÍCH</p>
              <h1 ref={pageHeadingRef} tabIndex="-1">
                {resultDate ? `Kết quả ngày ${resultDate}` : "Kết quả xét nghiệm"}
              </h1>
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

        <ResultOverview
          results={results}
          summary={summaryText}
          summaryStatus={summaryStatus}
          summaryError={summaryError}
          normalCount={normalCount}
          attentionCount={attentionCount}
          criticalCount={criticalCount}
          unknownCount={unknownCount}
          onRetrySummary={retrySummary}
          onSelectResult={selectOverviewResult}
        />

        <div className="lab-test-result__content-grid">
          <section className="lab-test-result__results-panel" aria-labelledby="lab-results-title">
            <header className="lab-test-result__results-header">
              <div>
                <p>PHIẾU XÉT NGHIỆM</p>
                <h2 id="lab-results-title">Các chỉ số được nhận diện</h2>
              </div>
            </header>

            {results.length > 0 && (
              <div className="lab-test-result__result-filters" role="group" aria-label="Lọc chỉ số xét nghiệm">
                {warningCount > 0 && (
                  <button
                    type="button"
                    data-active={effectiveResultFilter === "attention"}
                    data-tone="warning"
                    onClick={() => changeResultFilter("attention")}
                  >
                    Cần chú ý <span>{warningCount}</span>
                  </button>
                )}
                {normalCount > 0 && (
                  <button
                    type="button"
                    data-active={effectiveResultFilter === "normal"}
                    data-tone="success"
                    onClick={() => changeResultFilter("normal")}
                  >
                    Bình thường <span>{normalCount}</span>
                  </button>
                )}
                {unknownCount > 0 && (
                  <button
                    type="button"
                    data-active={effectiveResultFilter === "unknown"}
                    data-tone="neutral"
                    onClick={() => changeResultFilter("unknown")}
                  >
                    Chưa xác định <span>{unknownCount}</span>
                  </button>
                )}
                <button
                  type="button"
                  data-active={effectiveResultFilter === "all"}
                  data-tone="neutral"
                  onClick={() => changeResultFilter("all")}
                >
                  Tất cả <span>{results.length}</span>
                </button>
              </div>
            )}

            {results.length === 0 ? (
              <EmptyState
                title="Chưa nhận được chỉ số"
                description="Phiên đã hoàn tất nhưng chưa có chỉ số xét nghiệm để hiển thị."
              />
            ) : (
              <>
                <div className="lab-test-result__result-grid">
                {visibleResultEntries.map(({ result, index }) => {
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
                {visibleResultEntries.length < filteredResultEntries.length && (
                  <button
                    type="button"
                    className="lab-test-result__show-more"
                    onClick={() => setVisibleResultLimit((current) => current + 12)}
                  >
                    Xem thêm {Math.min(12, filteredResultEntries.length - visibleResultEntries.length)} chỉ số
                    <span>{visibleResultEntries.length}/{filteredResultEntries.length}</span>
                  </button>
                )}
              </>
            )}
          </section>

          <aside id="lab-result-advice" className="lab-test-result__advice-panel" aria-label="Phân tích chi tiết chỉ số đã chọn">
            <ResultAdvice result={selectedResult} results={results} />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className={`lab-test-result-page${embedded ? " is-embedded" : ""}`}>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {content}
    </div>
  );
}
