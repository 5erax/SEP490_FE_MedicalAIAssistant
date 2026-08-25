import { useRef, useState } from "react";
import { Download, FileJson2, Upload } from "lucide-react";
import { labIndicatorsApi } from "../../services/api";
import { useFeedback } from "../feedback/feedbackContext";
import { Button } from "../ui";

const CATALOG_FORMAT = "medimate.lab-indicator-curation.v1";
const EXPORT_PAGE_SIZE = 250;
const SUPPORTED_STATUSES = new Set(["normal", "high", "low"]);

function unwrapData(response) {
  return response?.data ?? response?.Data ?? response;
}

function unwrapList(response) {
  const data = unwrapData(response);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function getIndicatorId(indicator) {
  return indicator?.indicatorId ?? indicator?.id ?? "";
}

function getAliasId(alias) {
  return alias?.aliasId ?? alias?.id ?? "";
}

function getAdviceId(advice) {
  return advice?.cacheId ?? advice?.adviceId ?? advice?.id ?? "";
}

function normalizeKey(value) {
  return String(value ?? "").normalize("NFKC").trim().toLocaleUpperCase("vi-VN");
}

function indicatorPayload(indicator) {
  return {
    symbol: String(indicator?.symbol ?? "").trim(),
    fullName: String(indicator?.fullName ?? "").trim() || null,
    unit: String(indicator?.unit ?? "").trim() || null,
    minReference: indicator?.minReference ?? null,
    maxReference: indicator?.maxReference ?? null,
    description: String(indicator?.description ?? "").trim() || null,
    category: String(indicator?.category ?? "").trim() || null,
    isActive: indicator?.isActive !== false,
  };
}

function aliasPayload(alias) {
  return {
    aliasText: String(alias?.aliasText ?? "").trim(),
    language: String(alias?.language ?? "").trim() || null,
    isPrimary: Boolean(alias?.isPrimary),
  };
}

function advicePayload(advice) {
  return {
    status: advice?.status,
    displayTitle: String(advice?.displayTitle ?? "").trim() || null,
    summary: String(advice?.summary ?? "").trim() || null,
    possibleCauses: String(advice?.possibleCauses ?? "").trim() || null,
    lifestyleAdvice: String(advice?.lifestyleAdvice ?? "").trim() || null,
    nutritionalAdvice: String(advice?.nutritionalAdvice ?? "").trim() || null,
    urgencyLevel: String(advice?.urgencyLevel ?? "").trim() || null,
    severityLevel: advice?.severityLevel || "info",
    warningSigns: String(advice?.warningSigns ?? "").trim() || null,
  };
}

function downloadJson(payload) {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `medimate-lab-indicators-${date}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function collectCatalog(onProgress) {
  const listResponse = await labIndicatorsApi.list(1, EXPORT_PAGE_SIZE, {});
  const indicators = unwrapList(listResponse);
  const records = [];

  for (let index = 0; index < indicators.length; index += 1) {
    const indicator = indicators[index];
    const indicatorId = getIndicatorId(indicator);
    onProgress(index + 1, indicators.length);

    const [detail, aliases, ranges, adviceCaches] = await Promise.all([
      labIndicatorsApi.get(indicatorId),
      labIndicatorsApi.listAliases(indicatorId),
      labIndicatorsApi.listReferenceRanges(indicatorId),
      labIndicatorsApi.listAdvice(indicatorId),
    ]);

    records.push({
      indicator: unwrapData(detail),
      aliases: unwrapList(aliases),
      referenceRanges: unwrapList(ranges),
      adviceCaches: unwrapList(adviceCaches),
    });
  }

  return {
    format: CATALOG_FORMAT,
    exportedAt: new Date().toISOString(),
    safeguards: {
      referenceRangesAreReadOnlyOnImport: true,
      existingAliasesAreNotDeleted: true,
      missingIndicatorsAreNotCreated: true,
    },
    indicators: records,
  };
}

function validateCatalog(value) {
  if (!value || value.format !== CATALOG_FORMAT || !Array.isArray(value.indicators)) {
    throw new Error("Tệp không đúng định dạng danh mục chỉ số MediMate.");
  }

  const invalid = value.indicators.find((record) => !record?.indicator?.symbol);
  if (invalid) throw new Error("Có bản ghi không có ký hiệu chỉ số.");
  return value;
}

async function applyRecord(record, liveIndicator) {
  const indicatorId = getIndicatorId(liveIndicator);
  const targetIndicator = record.indicator ?? {};
  await labIndicatorsApi.update(indicatorId, indicatorPayload({ ...liveIndicator, ...targetIndicator }));

  const [liveAliasesResponse, liveAdviceResponse] = await Promise.all([
    labIndicatorsApi.listAliases(indicatorId),
    labIndicatorsApi.listAdvice(indicatorId),
  ]);
  const liveAliases = unwrapList(liveAliasesResponse);
  const liveAdvice = unwrapList(liveAdviceResponse);
  const aliasesByText = new Map(liveAliases.map((item) => [normalizeKey(item.aliasText), item]));
  const adviceByStatus = new Map(liveAdvice.map((item) => [item.status, item]));

  for (const targetAlias of record.aliases ?? []) {
    const payload = aliasPayload(targetAlias);
    if (!payload.aliasText) continue;
    const current = aliasesByText.get(normalizeKey(payload.aliasText));
    if (current) {
      await labIndicatorsApi.updateAlias(indicatorId, getAliasId(current), payload);
    } else {
      await labIndicatorsApi.createAlias(indicatorId, payload);
    }
  }

  for (const targetAdvice of record.adviceCaches ?? record.advice ?? []) {
    if (!SUPPORTED_STATUSES.has(targetAdvice?.status)) continue;
    const payload = advicePayload(targetAdvice);
    const current = adviceByStatus.get(payload.status);
    if (current) {
      await labIndicatorsApi.updateAdvice(indicatorId, getAdviceId(current), payload);
    } else {
      await labIndicatorsApi.createAdvice(indicatorId, payload);
    }
  }
}

export default function LabIndicatorCatalogTransfer({ onApplied }) {
  const { confirmAction, showToast } = useFeedback();
  const fileInputRef = useRef(null);
  const [catalog, setCatalog] = useState(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function exportCatalog() {
    setStatus("exporting");
    setError("");
    setProgress("Đang đọc danh mục…");
    try {
      const payload = await collectCatalog((current, total) => {
        setProgress(`Đang xuất ${current}/${total} chỉ số…`);
      });
      downloadJson(payload);
      setProgress(`Đã xuất ${payload.indicators.length} chỉ số.`);
      showToast({ type: "success", title: "Đã xuất danh mục", message: "Tệp JSON đã sẵn sàng để rà soát nội dung." });
    } catch (exportError) {
      setError(exportError?.message || "Không thể xuất danh mục chỉ số.");
    } finally {
      setStatus("idle");
    }
  }

  async function selectFile(event) {
    const [file] = Array.from(event.target.files ?? []);
    if (!file) return;
    setError("");
    try {
      const parsed = validateCatalog(JSON.parse(await file.text()));
      setCatalog(parsed);
      setFileName(file.name);
      setProgress(`Đã đọc ${parsed.indicators.length} bản ghi. Khoảng tham chiếu sẽ không bị thay đổi.`);
    } catch (parseError) {
      setCatalog(null);
      setFileName("");
      setError(parseError?.message || "Không thể đọc tệp JSON.");
    }
  }

  async function applyCatalog() {
    if (!catalog) return;
    const confirmed = await confirmAction({
      title: "Áp dụng nội dung đã rà soát?",
      message: `Hệ thống sẽ cập nhật thông tin, bổ sung alias và lời khuyên cho ${catalog.indicators.length} bản ghi. Không xóa alias và không sửa khoảng tham chiếu.`,
      confirmLabel: "Áp dụng nội dung",
      tone: "primary",
    });
    if (!confirmed) return;

    setStatus("importing");
    setError("");
    let updated = 0;
    let skipped = 0;
    try {
      const liveResponse = await labIndicatorsApi.list(1, EXPORT_PAGE_SIZE, {});
      const liveIndicators = unwrapList(liveResponse);
      const liveBySymbol = new Map(liveIndicators.map((item) => [normalizeKey(item.symbol), item]));

      for (let index = 0; index < catalog.indicators.length; index += 1) {
        const record = catalog.indicators[index];
        const symbol = record.indicator.symbol;
        const liveIndicator = liveBySymbol.get(normalizeKey(symbol));
        setProgress(`Đang cập nhật ${index + 1}/${catalog.indicators.length}: ${symbol}`);
        if (!liveIndicator) {
          skipped += 1;
          continue;
        }
        await applyRecord(record, liveIndicator);
        updated += 1;
      }

      setProgress(`Đã cập nhật ${updated} chỉ số; bỏ qua ${skipped} bản ghi không tồn tại.`);
      showToast({ type: "success", title: "Đã áp dụng danh mục", message: `Cập nhật ${updated} chỉ số, bỏ qua ${skipped}.` });
      if (typeof onApplied === "function") onApplied();
    } catch (importError) {
      setError(importError?.message || "Không thể áp dụng toàn bộ danh mục.");
    } finally {
      setStatus("idle");
    }
  }

  const busy = status === "exporting" || status === "importing";

  return (
    <section className="lab-catalog-transfer" aria-labelledby="lab-catalog-transfer-title">
      <div>
        <span className="lab-catalog-transfer__icon" aria-hidden="true"><FileJson2 size={19} /></span>
        <div>
          <h3 id="lab-catalog-transfer-title">Rà soát nội dung theo lô</h3>
          <p>Xuất dữ liệu để biên tập, sau đó nhập lại. Hệ thống không xóa alias và không thay đổi khoảng tham chiếu.</p>
        </div>
      </div>
      <div className="lab-catalog-transfer__actions">
        <Button type="button" tone="secondary" size="sm" disabled={busy} onClick={exportCatalog}>
          <Download size={15} aria-hidden="true" /> Xuất JSON
        </Button>
        <input ref={fileInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={selectFile} />
        <Button type="button" tone="secondary" size="sm" disabled={busy} onClick={() => fileInputRef.current?.click()}>
          <Upload size={15} aria-hidden="true" /> Chọn tệp
        </Button>
        <Button type="button" size="sm" disabled={busy || !catalog} onClick={applyCatalog}>
          Áp dụng nội dung
        </Button>
      </div>
      {(fileName || progress || error) && (
        <p className={`lab-catalog-transfer__status${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>
          {error || `${fileName ? `${fileName} · ` : ""}${progress}`}
        </p>
      )}
    </section>
  );
}
