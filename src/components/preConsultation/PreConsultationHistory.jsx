import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Stethoscope,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { consultationSessionsApi } from "../../services/api";

const PAGE_SIZE = 6;
const CATEGORY_LABELS = {
  diagnosis: "Chẩn đoán",
  tests: "Xét nghiệm",
  treatment: "Điều trị",
  lifestyle: "Sinh hoạt",
  followUp: "Theo dõi",
};

const STATUS_META = {
  processing: { label: "Đang chuẩn bị", tone: "processing" },
  completed: { label: "Đã hoàn thành", tone: "completed" },
  failed: { label: "Không thành công", tone: "failed" },
};

function unwrapData(response) {
  return response?.data ?? response ?? null;
}

function firstMessage(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) return value.map(firstMessage).find(Boolean) ?? "";
  if (value && typeof value === "object") return Object.values(value).map(firstMessage).find(Boolean) ?? "";
  return "";
}

function errorMessage(error, fallback) {
  return firstMessage(error?.payload?.errors)
    || firstMessage(error?.payload?.message)
    || firstMessage(error?.message)
    || fallback;
}

function formatDateTime(value, fallback = "Chưa cập nhật") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeQuestions(value) {
  return (Array.isArray(value) ? value : [])
    .map((item, index) => ({
      id: item?.id ?? `${item?.category ?? "question"}-${index}`,
      category: item?.category ?? "",
      text: item?.questionText ?? item?.question ?? "",
      priority: Number(item?.priority ?? index + 1),
    }))
    .filter((item) => item.text)
    .sort((left, right) => left.priority - right.priority);
}

function getStatusMeta(status) {
  const normalized = String(status ?? "").toLowerCase();
  return STATUS_META[normalized] ?? { label: "Chưa xác định", tone: "unknown" };
}

export default function PreConsultationHistory({ onStartNew }) {
  const [pageNumber, setPageNumber] = useState(1);
  const [pageData, setPageData] = useState({ items: [], totalPages: 1, totalCount: 0 });
  const [listStatus, setListStatus] = useState("loading");
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle");
  const [detailError, setDetailError] = useState("");
  const detailHeadingRef = useRef(null);
  const detailRequestRef = useRef(0);

  const loadSessions = useCallback(async () => {
    setListStatus("loading");
    setListError("");
    try {
      const response = await consultationSessionsApi.listMySessions(pageNumber, PAGE_SIZE);
      const data = unwrapData(response) ?? {};
      const items = Array.isArray(data) ? data : data.items ?? data.Items ?? [];
      setPageData({
        items,
        totalPages: Math.max(1, Number(data.totalPages ?? data.TotalPages) || 1),
        totalCount: Number(data.totalCount ?? data.TotalCount) || items.length,
      });
      setListStatus("ready");
    } catch (error) {
      setListError(errorMessage(error, "Chưa thể tải lịch sử tư vấn. Vui lòng thử lại."));
      setListStatus("error");
    }
  }, [pageNumber]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadSessions, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadSessions]);

  const loadDetail = useCallback(async (sessionId, { silent = false } = {}) => {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setSelectedId(sessionId);
    setDetailError("");
    if (!silent) setDetailStatus("loading");

    try {
      const response = await consultationSessionsApi.get(sessionId);
      if (detailRequestRef.current !== requestId) return;
      const nextDetail = unwrapData(response);
      setDetail(nextDetail);
      setPageData((current) => ({
        ...current,
        items: current.items.map((item) => (
          String(item.sessionId ?? item.id) === String(sessionId)
            ? { ...item, status: nextDetail?.status ?? item.status }
            : item
        )),
      }));
      setDetailStatus("ready");
      if (!silent) window.requestAnimationFrame(() => detailHeadingRef.current?.focus());
    } catch (error) {
      if (detailRequestRef.current !== requestId) return;
      setDetailError(errorMessage(error, "Chưa thể tải chi tiết phiên tư vấn. Vui lòng thử lại."));
      setDetailStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!selectedId || String(detail?.status).toLowerCase() !== "processing") return undefined;
    const intervalId = window.setInterval(() => loadDetail(selectedId, { silent: true }), 1000);
    return () => window.clearInterval(intervalId);
  }, [detail?.status, loadDetail, selectedId]);

  function changePage(nextPage) {
    detailRequestRef.current += 1;
    setSelectedId("");
    setDetail(null);
    setDetailStatus("idle");
    setDetailError("");
    setPageNumber(nextPage);
  }

  const groupedQuestions = useMemo(() => {
    const groups = new Map();
    for (const question of normalizeQuestions(detail?.questions)) {
      const key = question.category || "other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(question);
    }
    return Array.from(groups.entries());
  }, [detail?.questions]);

  return (
    <section className="consultation-history" aria-labelledby="consultation-history-title">
      <header className="consultation-history-header">
        <div>
          <span className="consultation-history-kicker">Hồ sơ đã lưu</span>
          <h2 id="consultation-history-title">Lịch sử tư vấn trước khám</h2>
          <p>Xem lại thông tin buổi khám và những câu hỏi đã chuẩn bị cho bác sĩ.</p>
        </div>
        <button type="button" className="consultation-history-refresh" onClick={loadSessions} disabled={listStatus === "loading"}>
          <RefreshCw size={17} className={listStatus === "loading" ? "spin" : ""} aria-hidden="true" />
          Tải lại
        </button>
      </header>

      <div className="consultation-history-shell">
        <section className="consultation-session-list" aria-label="Danh sách phiên tư vấn" aria-busy={listStatus === "loading"}>
          <div className="consultation-session-list-head">
            <div><strong>Các phiên gần đây</strong><small>{pageData.totalCount} phiên tư vấn</small></div>
            <span>Trang {pageNumber}/{pageData.totalPages}</span>
          </div>

          {listStatus === "loading" ? (
            <div className="consultation-history-state" role="status"><LoaderCircle className="spin" aria-hidden="true" /><span>Đang tải lịch sử…</span></div>
          ) : listStatus === "error" ? (
            <div className="consultation-history-state error" role="alert"><strong>Chưa tải được lịch sử</strong><span>{listError}</span><button type="button" onClick={loadSessions}>Thử lại</button></div>
          ) : pageData.items.length === 0 ? (
            <div className="consultation-history-state empty"><FileText aria-hidden="true" /><strong>Chưa có phiên tư vấn</strong><span>Phiên đã tạo sẽ được lưu tại đây để bạn xem lại.</span><button type="button" onClick={onStartNew}>Tạo phiên đầu tiên</button></div>
          ) : (
            <div className="consultation-session-cards">
              {pageData.items.map((item) => {
                const statusMeta = getStatusMeta(item.status);
                const sessionId = item.sessionId ?? item.id;
                const selected = sessionId === selectedId;
                return (
                  <button
                    key={sessionId}
                    type="button"
                    className={`consultation-session-card ${selected ? "selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => loadDetail(sessionId)}
                  >
                    <span className={`consultation-status ${statusMeta.tone}`}>{statusMeta.label}</span>
                    <strong>{item.departmentName || "Chuyên khoa chưa cập nhật"}</strong>
                    <span className="consultation-session-time"><CalendarDays size={15} aria-hidden="true" />{formatDateTime(item.appointmentTime, "Chưa có lịch hẹn")}</span>
                    <span className="consultation-session-symptoms">{item.symptoms || "Chưa có nội dung cần tư vấn"}</span>
                    <span className="consultation-session-open">Xem hồ sơ <ChevronRight size={16} aria-hidden="true" /></span>
                  </button>
                );
              })}
            </div>
          )}

          {pageData.totalPages > 1 && (
            <nav className="consultation-history-pagination" aria-label="Phân trang lịch sử tư vấn">
              <button type="button" disabled={pageNumber <= 1 || listStatus === "loading"} onClick={() => changePage(pageNumber - 1)}><ArrowLeft size={15} aria-hidden="true" /> Trang trước</button>
              <button type="button" disabled={pageNumber >= pageData.totalPages || listStatus === "loading"} onClick={() => changePage(pageNumber + 1)}>Trang sau <ArrowRight size={15} aria-hidden="true" /></button>
            </nav>
          )}
        </section>

        <article className="consultation-session-detail" aria-busy={detailStatus === "loading"}>
          {detailStatus === "idle" ? (
            <div className="consultation-detail-placeholder"><FileText size={30} aria-hidden="true" /><strong>Chọn một phiên để xem hồ sơ</strong><p>Thông tin buổi khám và câu hỏi dành cho bác sĩ sẽ hiển thị tại đây.</p></div>
          ) : detailStatus === "loading" ? (
            <div className="consultation-history-state" role="status"><LoaderCircle className="spin" aria-hidden="true" /><span>Đang mở hồ sơ tư vấn…</span></div>
          ) : detailStatus === "error" ? (
            <div className="consultation-history-state error" role="alert"><strong>Chưa mở được hồ sơ</strong><span>{detailError}</span><button type="button" onClick={() => loadDetail(selectedId)}>Thử lại</button></div>
          ) : (
            <div className="consultation-detail-content">
              <header className="consultation-detail-header">
                <div>
                  <span className="consultation-history-kicker">Hồ sơ tư vấn</span>
                  <h3 ref={detailHeadingRef} tabIndex="-1">{detail?.departmentName || "Tư vấn trước khám"}</h3>
                  <p>Tạo lúc {formatDateTime(detail?.createdAt)}</p>
                </div>
                <span className={`consultation-status ${getStatusMeta(detail?.status).tone}`}>{getStatusMeta(detail?.status).label}</span>
              </header>

              {String(detail?.status).toLowerCase() === "processing" && (
                <div className="consultation-detail-processing" role="status"><LoaderCircle className="spin" size={18} aria-hidden="true" /><span>Đang hoàn thiện câu hỏi. Hồ sơ sẽ tự cập nhật.</span></div>
              )}

              <dl className="consultation-detail-facts">
                <div><dt><CalendarDays size={16} aria-hidden="true" /> Thời gian khám</dt><dd>{formatDateTime(detail?.appointmentTime, "Chưa có lịch hẹn")}</dd></div>
                <div><dt><MapPin size={16} aria-hidden="true" /> Cơ sở y tế</dt><dd>{detail?.facilityName || "Chưa chọn cơ sở"}</dd></div>
                <div><dt><Stethoscope size={16} aria-hidden="true" /> Chuyên khoa</dt><dd>{detail?.departmentName || "Chưa cập nhật"}</dd></div>
                <div><dt><Clock3 size={16} aria-hidden="true" /> Trạng thái</dt><dd>{getStatusMeta(detail?.status).label}</dd></div>
              </dl>

              <section className="consultation-detail-section">
                <h4>Điều cần tư vấn</h4>
                <p>{detail?.symptoms || "Chưa có nội dung cần tư vấn."}</p>
              </section>

              <section className="consultation-detail-section questions">
                <div className="consultation-detail-section-title"><h4>Câu hỏi dành cho bác sĩ</h4><span>{normalizeQuestions(detail?.questions).length} câu hỏi</span></div>
                {groupedQuestions.length > 0 ? groupedQuestions.map(([category, questions]) => (
                  <section className="consultation-question-group" key={category}>
                    <h5>{CATEGORY_LABELS[category] || "Trao đổi thêm"}</h5>
                    <ol>{questions.map((question) => <li key={question.id}>{question.text}</li>)}</ol>
                  </section>
                )) : <p className="consultation-detail-empty-copy">Phiên này chưa có câu hỏi để hiển thị.</p>}
              </section>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
