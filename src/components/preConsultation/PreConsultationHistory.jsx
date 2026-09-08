import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  FileText,
  History,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, useOverlayFocus } from "../ui";
import { checklistItemsApi, consultationSessionsApi } from "../../services/api";
import { ASYNC_SESSION_STATUS, normalizeAsyncSessionStatus } from "../../utils/asyncSessionStatus";
import "../../styles/analysis-history-panel.css";

const PAGE_SIZE = 6;
const CATEGORY_ALIASES = {
  diagnosis: "diagnosis",
  tests: "tests",
  test: "tests",
  treatment: "treatment",
  lifestyle: "lifestyle",
  followup: "followUp",
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
      category: normalizeCategory(item?.category),
      text: item?.questionText ?? item?.question ?? "",
      priority: Number(item?.priority ?? index + 1),
    }))
    .filter((item) => item.text)
    .sort((left, right) => left.priority - right.priority);
}

function normalizeCategory(value) {
  const key = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return CATEGORY_ALIASES[key] ?? "other";
}

function normalizeChecklist(value) {
  return (Array.isArray(value) ? value : [])
    .map((item, index) => ({
      id: item?.id ?? `checklist-${index}`,
      content: item?.content ?? item?.title ?? item?.name ?? "",
      isMandatory: Boolean(item?.isMandatory),
    }))
    .filter((item) => item.content);
}

function getStatusMeta(status) {
  const normalized = normalizeAsyncSessionStatus(status, "");
  return STATUS_META[normalized] ?? { label: "Chưa xác định", tone: "unknown" };
}

export default function PreConsultationHistory({ onStartNew, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageData, setPageData] = useState({ items: [], totalPages: 1, totalCount: 0 });
  const [listStatus, setListStatus] = useState("loading");
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle");
  const [detailError, setDetailError] = useState("");
  const [checklist, setChecklist] = useState([]);
  const [checklistStatus, setChecklistStatus] = useState("idle");
  const [checklistError, setChecklistError] = useState("");
  const detailHeadingRef = useRef(null);
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const detailPanelRef = useRef(null);
  const detailCloseButtonRef = useRef(null);
  const detailRequestRef = useRef(0);
  const checklistRequestRef = useRef(0);

  useOverlayFocus({
    active: open && !detailOpen,
    containerRef: panelRef,
    initialFocusRef: closeButtonRef,
    onClose: () => setOpen(false),
  });

  useOverlayFocus({
    active: detailOpen,
    containerRef: detailPanelRef,
    initialFocusRef: detailCloseButtonRef,
    onClose: () => setDetailOpen(false),
  });

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

  const loadChecklist = useCallback(async (departmentId) => {
    const requestId = checklistRequestRef.current + 1;
    checklistRequestRef.current = requestId;
    setChecklistStatus("loading");
    setChecklistError("");

    try {
      const response = await checklistItemsApi.byDepartment(departmentId);
      if (checklistRequestRef.current !== requestId) return;
      setChecklist(normalizeChecklist(unwrapData(response)));
      setChecklistStatus("ready");
    } catch (error) {
      if (checklistRequestRef.current !== requestId) return;
      setChecklist([]);
      setChecklistError(errorMessage(error, "Chưa thể tải danh sách chuẩn bị. Vui lòng thử lại."));
      setChecklistStatus("error");
    }
  }, []);

  const loadDetail = useCallback(async (sessionId, { silent = false } = {}) => {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setSelectedId(sessionId);
    setDetailError("");
    if (!silent) {
      setDetailOpen(true);
      checklistRequestRef.current += 1;
      setDetailStatus("loading");
      setChecklist([]);
      setChecklistStatus("idle");
      setChecklistError("");
    }

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
      if (!silent && nextDetail?.departmentId) loadChecklist(nextDetail.departmentId);
      if (!silent) window.requestAnimationFrame(() => detailHeadingRef.current?.focus());
    } catch (error) {
      if (detailRequestRef.current !== requestId) return;
      setDetailError(errorMessage(error, "Chưa thể tải chi tiết phiên tư vấn. Vui lòng thử lại."));
      setDetailStatus("error");
    }
  }, [loadChecklist]);

  useEffect(() => {
    if (!selectedId || normalizeAsyncSessionStatus(detail?.status, "") !== ASYNC_SESSION_STATUS.PROCESSING) return undefined;
    const intervalId = window.setInterval(() => loadDetail(selectedId, { silent: true }), 200);
    return () => window.clearInterval(intervalId);
  }, [detail?.status, loadDetail, selectedId]);

  function changePage(nextPage) {
    detailRequestRef.current += 1;
    setSelectedId("");
    setDetailOpen(false);
    setDetail(null);
    setDetailStatus("idle");
    setDetailError("");
    checklistRequestRef.current += 1;
    setChecklist([]);
    setChecklistStatus("idle");
    setChecklistError("");
    setPageNumber(nextPage);
  }

  function startNewConsultation() {
    setOpen(false);
    setDetailOpen(false);
    onStartNew?.();
  }

  return (
    <section className="consultation-history" aria-labelledby="consultation-history-title">
      <Button
        type="button"
        tone="secondary"
        size="sm"
        className="analysis-history-button consultation-history-launch"
        aria-haspopup="dialog"
        aria-controls="pre-consultation-history-panel"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <History size={16} aria-hidden="true" />
        Lịch sử tư vấn trước khám
      </Button>

      {open && typeof document !== "undefined" && createPortal((
        <div className="analysis-history-drawer consultation-history-drawer">
          <div className="analysis-history-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside
            className="analysis-history-panel consultation-history-drawer-panel"
            id="pre-consultation-history-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="consultation-history-title"
            aria-busy={listStatus === "loading" || detailStatus === "loading"}
            tabIndex={-1}
          >
            <header className="analysis-history-panel-header">
              <div>
                <span><Clock3 size={15} aria-hidden="true" /> Lịch sử</span>
                <h2 id="consultation-history-title">Lịch sử tư vấn trước khám</h2>
              </div>
              <button ref={closeButtonRef} type="button" className="analysis-history-close" onClick={() => setOpen(false)} aria-label="Đóng lịch sử tư vấn trước khám">
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="analysis-history-panel-body">
              <div className="consultation-history-drawer-summary">
                <strong>{pageData.totalCount} phiên tư vấn</strong>
                <button type="button" className="consultation-history-refresh" onClick={loadSessions} disabled={listStatus === "loading"}>
                  <RefreshCw size={17} className={listStatus === "loading" ? "spin" : ""} aria-hidden="true" />
                  Tải lại
                </button>
              </div>

              {listStatus === "loading" ? (
                <div className="analysis-history-state" role="status"><LoaderCircle className="analysis-history-spin" aria-hidden="true" /><p>Đang tải lịch sử...</p></div>
              ) : listStatus === "error" ? (
                <div className="analysis-history-state error" role="alert"><p>{listError}</p><Button type="button" tone="secondary" size="sm" onClick={loadSessions}>Thử lại</Button></div>
              ) : pageData.items.length === 0 ? (
                <div className="analysis-history-empty"><FileText aria-hidden="true" /><strong>Chưa có phiên tư vấn</strong><p>Phiên đã tạo sẽ được lưu tại đây để bạn xem lại.</p></div>
              ) : (
                <div className="analysis-history-list consultation-history-drawer-list">
                  {pageData.items.map((item) => {
                    const statusMeta = getStatusMeta(item.status);
                    const sessionId = item.sessionId ?? item.id;
                    const selected = sessionId === selectedId;
                    return (
                      <article className={selected ? "active" : ""} key={sessionId}>
                        <div>
                          <strong>{item.departmentName || "Chuyên khoa chưa cập nhật"}</strong>
                          <span>{formatDateTime(item.appointmentTime, "Chưa có lịch hẹn")}</span>
                          <small>Tư vấn trước khám · {statusMeta.label}</small>
                        </div>
                        <Button type="button" tone="secondary" size="sm" onClick={() => loadDetail(sessionId)}>
                          Chi tiết
                        </Button>
                      </article>
                    );
                  })}
                </div>
              )}

              {pageData.totalPages > 1 && (
                <nav className="consultation-history-pagination" aria-label="Phân trang lịch sử tư vấn">
                  <button type="button" disabled={pageNumber <= 1 || listStatus === "loading"} onClick={() => changePage(pageNumber - 1)}><ArrowLeft size={15} aria-hidden="true" /> Trang trước</button>
                  <span>Trang {pageNumber}/{pageData.totalPages}</span>
                  <button type="button" disabled={pageNumber >= pageData.totalPages || listStatus === "loading"} onClick={() => changePage(pageNumber + 1)}>Trang sau <ArrowRight size={15} aria-hidden="true" /></button>
                </nav>
              )}


            </div>

            <footer className="analysis-history-panel-footer">
              <Button type="button" className="analysis-history-continue" onClick={startNewConsultation}>
                Tiếp tục tư vấn
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
            </footer>
          </aside>
        </div>
      ), document.body)}

      {detailOpen && typeof document !== "undefined" && createPortal((
        <div className="consultation-detail-dialog">
          <div className="analysis-history-backdrop" onClick={() => setDetailOpen(false)} aria-hidden="true" />
          <aside
            className="analysis-history-panel consultation-detail-panel"
            ref={detailPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="consultation-detail-title"
            aria-busy={detailStatus === "loading"}
            tabIndex={-1}
          >
            <header className="consultation-detail-modal-head">
              <div>
                <div>
                  <h2 id="consultation-detail-title" ref={detailHeadingRef} tabIndex="-1">Chi tiết tư vấn trước khám</h2>
                  <p>Xem lại nội dung đã chuẩn bị trước khi trao đổi với bác sĩ.</p>
                </div>
              </div>
              <button ref={detailCloseButtonRef} type="button" className="analysis-history-close" onClick={() => setDetailOpen(false)} aria-label="Đóng chi tiết tư vấn trước khám">
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="analysis-history-panel-body consultation-detail-panel-body">
              {detailStatus === "loading" && (
                <div className="analysis-history-state" role="status"><LoaderCircle className="analysis-history-spin" aria-hidden="true" /><p>Đang mở hồ sơ tư vấn...</p></div>
              )}

              {detailStatus === "error" && (
                <div className="analysis-history-state error" role="alert"><p>{detailError}</p><Button type="button" tone="secondary" size="sm" onClick={() => loadDetail(selectedId)}>Thử lại</Button></div>
              )}

              {detailStatus === "ready" && (
                <article className="analysis-history-detail consultation-session-detail" aria-label="Chi tiết phiên tư vấn" tabIndex="0">
                  <div className="consultation-detail-content">
                    {normalizeAsyncSessionStatus(detail?.status, "") === ASYNC_SESSION_STATUS.PROCESSING && (
                      <div className="consultation-detail-processing" role="status"><LoaderCircle className="spin" size={18} aria-hidden="true" /><span>Đang hoàn thiện câu hỏi. Hồ sơ sẽ tự cập nhật.</span></div>
                    )}

                    <dl className="pre-consultation-summary-grid consultation-detail-summary-grid">
                      <div><dt>Chuyên khoa</dt><dd>{detail?.departmentName || "Chưa cập nhật"}</dd></div>
                      <div><dt>Thời gian khám</dt><dd>{formatDateTime(detail?.appointmentTime, "Chưa có lịch hẹn")}</dd></div>
                      <div><dt>Tạo lúc</dt><dd>{formatDateTime(detail?.createdAt)}</dd></div>
                      <div><dt>Trạng thái</dt><dd>{getStatusMeta(detail?.status).label}</dd></div>
                    </dl>

                    <section className="pre-consultation-summary-block consultation-detail-summary-block">
                      <h3>Điều cần tư vấn</h3>
                      <p>{detail?.symptoms || "Chưa có nội dung cần tư vấn."}</p>
                    </section>

                    <section className="pre-consultation-summary-block consultation-detail-summary-block" aria-labelledby="consultation-detail-checklist-title">
                      <h3 id="consultation-detail-checklist-title">Danh sách chuẩn bị</h3>
                      {checklistStatus === "loading" ? (
                        <div className="consultation-inline-state" role="status"><LoaderCircle className="spin" size={18} aria-hidden="true" /> Đang tải danh sách chuẩn bị...</div>
                      ) : checklistStatus === "error" ? (
                        <div className="consultation-inline-state error" role="alert"><span>{checklistError}</span><button type="button" onClick={() => loadChecklist(detail?.departmentId)}>Thử lại</button></div>
                      ) : checklist.length > 0 ? (
                        <ul>
                          {checklist.map((item) => <li key={item.id}><Check size={15} aria-hidden="true" /> {item.content}</li>)}
                        </ul>
                      ) : (
                        <p className="consultation-detail-empty-copy">Chuyên khoa này chưa có danh sách chuẩn bị.</p>
                      )}
                    </section>

                    <section className="pre-consultation-summary-block consultation-detail-summary-block">
                      <h3>Câu hỏi dành cho bác sĩ</h3>
                      {normalizeQuestions(detail?.questions).length > 0 ? (
                        <ol>{normalizeQuestions(detail?.questions).map((question) => <li key={question.id}>{question.text}</li>)}</ol>
                      ) : <p className="consultation-detail-empty-copy">Phiên này chưa có câu hỏi để hiển thị.</p>}
                    </section>
                  </div>
                </article>
              )}
            </div>
          </aside>
        </div>
      ), document.body)}
    </section>
  );
}
