import { useEffect, useRef, useState } from "react";
import { ArrowRight, Clock3, FileText, LoaderCircle, RefreshCw, X } from "lucide-react";
import { Button, useOverlayFocus } from "../ui";
import { symptomAnalysisApi, unwrapApiData } from "../../services/symptomAnalysisService";
import "../../styles/analysis-history-panel.css";

export const ANALYSIS_HISTORY_PANEL_ID = "analysis-history-panel";
const SESSION_TYPE_LABELS = {
  department: "Gợi ý chuyên khoa",
  diagnoses: "Phân tích lâm sàng",
  diagnosis: "Phân tích lâm sàng",
};
const SESSION_STATUS_LABELS = {
  pending: "Đang chờ",
  processing: "Đang xử lý",
  in_progress: "Đang xử lý",
  completed: "Hoàn tất",
  complete: "Hoàn tất",
  failed: "Không thành công",
  cancelled: "Đã hủy",
  canceled: "Đã hủy",
};

function getSessionId(session) {
  return session?.sessionId || session?.id || "";
}

function getSessionTitle(session, fallback) {
  return session?.inputText || session?.userInput || session?.symptoms || fallback;
}

function formatDate(value) {
  if (!value) return "Chưa có ngày tạo";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có ngày tạo";
  return date.toLocaleString("vi-VN");
}

function formatSessionType(value, fallbackType) {
  const normalized = String(value || fallbackType || "").trim().toLowerCase();
  return SESSION_TYPE_LABELS[normalized] || SESSION_TYPE_LABELS[fallbackType] || "Phiên phân tích";
}

function formatSessionStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SESSION_STATUS_LABELS[normalized] || "Đang cập nhật";
}

function getSafeHistoryError(error, detail = false) {
  if (error?.status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem lịch sử.";
  }
  if (error?.status === 403) {
    return "Bạn không có quyền xem phiên phân tích này.";
  }
  if (detail && error?.status === 404) {
    return "Không tìm thấy phiên phân tích hoặc phiên này không còn khả dụng.";
  }
  return detail
    ? "Chưa thể tải chi tiết phiên. Vui lòng thử lại."
    : "Chưa thể tải lịch sử phân tích. Vui lòng thử lại.";
}

function getDetailSummary(detail, sessionType) {
  const data = unwrapApiData(detail) || detail || {};
  const analysis = data.analysis || data.Analysis || data;
  const department = analysis.recommendedDepartment
    || analysis.RecommendedDepartment
    || analysis.department
    || analysis.Department;
  const facilities = analysis.recommendedFacilities || analysis.RecommendedFacilities || [];

  if (sessionType === "department") {
    const fallbackDepartment = Array.isArray(facilities)
      ? facilities.flatMap((facility) => (
        Array.isArray(facility?.departments)
          ? facility.departments
          : Array.isArray(facility?.Departments) ? facility.Departments : []
      ))[0]
      : null;
    const departmentName = department?.departmentName
      || department?.DepartmentName
      || fallbackDepartment?.departmentName
      || fallbackDepartment?.DepartmentName
      || "";
    const facilityNames = Array.isArray(facilities)
      ? facilities
        .map((facility) => facility?.facilityName || facility?.FacilityName || facility?.name)
        .filter(Boolean)
        .slice(0, 3)
      : [];

    if (departmentName && facilityNames.length > 0) {
      return `Chuyên khoa: ${departmentName}. Cơ sở gợi ý: ${facilityNames.join(", ")}.`;
    }
    if (departmentName) return `Chuyên khoa được gợi ý: ${departmentName}.`;
    if (facilityNames.length > 0) return `Cơ sở được gợi ý: ${facilityNames.join(", ")}.`;
    return analysis.status || analysis.Status || "Đang cập nhật gợi ý chuyên khoa";
  }

  const diagnoses = analysis.diagnoses || analysis.Diagnoses || [];

  if (Array.isArray(diagnoses) && diagnoses.length > 0) {
    return diagnoses
      .slice(0, 3)
      .map((item) => item.diseaseName || item.DiseaseName)
      .filter(Boolean)
      .join(", ");
  }

  return analysis.status || analysis.Status || "Đang cập nhật";
}

export default function AnalysisHistoryPanel({
  open,
  onClose,
  sessionType = "diagnoses",
  title,
  emptyText,
  continueLabel,
  onContinue,
  onViewSession,
}) {
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle");
  const [announcement, setAnnouncement] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);

  const copy = sessionType === "department"
    ? {
      title: title || "Lịch sử gợi ý chuyên khoa",
      empty: emptyText || "Chưa có phiên gợi ý chuyên khoa nào.",
      fallback: "Phiên gợi ý chuyên khoa",
      continueLabel: continueLabel || "Tiếp tục tư vấn",
      sessionLabel: "phiên gợi ý chuyên khoa",
    }
    : {
      title: title || "Lịch sử phân tích lâm sàng",
      empty: emptyText || "Chưa có phiên phân tích lâm sàng nào.",
      fallback: "Phiên phân tích lâm sàng",
      continueLabel: continueLabel || "Tiếp tục phân tích",
      sessionLabel: "phiên phân tích lâm sàng",
    };

  useOverlayFocus({
    active: open,
    containerRef: panelRef,
    initialFocusRef: closeButtonRef,
    onClose,
  });

  useEffect(() => {
    if (!open) return;
    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      setStatus("loading");
      setError("");
      setSessions([]);
      setSelectedDetail(null);
      setSelectedSessionId("");
      setDetailStatus("idle");
      setAnnouncement(`Đang tải ${copy.sessionLabel}.`);
    });

    symptomAnalysisApi.listAllMySessions(sessionType)
      .then((items) => {
        if (!active) return;
        setSessions(items);
        setAnnouncement(`Đã tải ${items.length} ${copy.sessionLabel}.`);
      })
      .catch((requestError) => {
        if (!active) return;
        const message = getSafeHistoryError(requestError);
        setError(message);
        setAnnouncement(message);
      })
      .finally(() => {
        if (active) setStatus("idle");
      });

    return () => {
      active = false;
    };
  }, [copy.sessionLabel, open, reloadKey, sessionType]);

  async function loadDetail(sessionId) {
    if (!sessionId) return;

    setDetailStatus("loading");
    setSelectedDetail(null);
    setAnnouncement("Đang tải chi tiết phiên.");

    try {
      const response = await symptomAnalysisApi.get(sessionId);
      setSelectedDetail(unwrapApiData(response) || response);
      setAnnouncement("Đã tải chi tiết phiên.");
    } catch (requestError) {
      const message = getSafeHistoryError(requestError, true);
      setSelectedDetail({ error: message });
      setAnnouncement(message);
    } finally {
      setDetailStatus("idle");
    }
  }

  function viewDetail(session) {
    const sessionId = getSessionId(session);
    if (!sessionId) return;

    if (onViewSession) {
      onViewSession({ sessionId, session });
      return;
    }

    setSelectedSessionId(sessionId);
    loadDetail(sessionId);
  }

  function retryHistory() {
    setStatus("loading");
    setError("");
    setReloadKey((current) => current + 1);
  }

  return (
    <>
      <p className="sr-only" role="status" aria-atomic="true">{announcement}</p>
      {open && (
        <div className="analysis-history-drawer">
          <div className="analysis-history-backdrop" onClick={onClose} aria-hidden="true" />
          <aside
            className="analysis-history-panel"
            id={ANALYSIS_HISTORY_PANEL_ID}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${ANALYSIS_HISTORY_PANEL_ID}-title`}
            aria-busy={status === "loading" || detailStatus === "loading"}
            tabIndex={-1}
          >
            <header className="analysis-history-panel-header">
              <div>
                <span><Clock3 size={15} /> Lịch sử</span>
                <h2 id={`${ANALYSIS_HISTORY_PANEL_ID}-title`}>{copy.title}</h2>
              </div>
              <button ref={closeButtonRef} type="button" className="analysis-history-close" onClick={onClose} aria-label="Đóng lịch sử">
                <X size={18} />
              </button>
            </header>

            <div className="analysis-history-panel-body">
              {status === "loading" && (
                <div className="analysis-history-state">
                  <LoaderCircle className="analysis-history-spin" size={22} />
                  <p>Đang tải lịch sử...</p>
                </div>
              )}

              {error && (
                <div className="analysis-history-state error">
                  <p>{error}</p>
                  <Button type="button" tone="secondary" size="sm" onClick={retryHistory}>
                    <RefreshCw size={16} aria-hidden="true" />
                    Thử lại
                  </Button>
                </div>
              )}

              {status !== "loading" && !error && sessions.length === 0 && (
                <div className="analysis-history-empty">
                  <FileText size={24} />
                  <strong>{copy.empty}</strong>
                  <p>Bắt đầu phiên mới để MediMate lưu lại lịch sử tại đây.</p>
                </div>
              )}

              {sessions.length > 0 && (
                <div className="analysis-history-list">
                  {sessions.map((session, index) => {
                    const sessionId = getSessionId(session);
                    const isActive = sessionId && sessionId === selectedSessionId;
                    return (
                      <article className={isActive ? "active" : ""} key={sessionId || index}>
                        <div>
                          <strong>{getSessionTitle(session, copy.fallback)}</strong>
                          <span>{formatDate(session.createdAt || session.createdDate)}</span>
                          <small>
                            {formatSessionType(session.sessionType, sessionType)}
                            {" · "}
                            {formatSessionStatus(session.status)}
                          </small>
                        </div>
                        <Button type="button" tone="secondary" size="sm" onClick={() => viewDetail(session)}>
                          Chi tiết
                        </Button>
                      </article>
                    );
                  })}
                </div>
              )}

              {selectedSessionId && (
                <section className="analysis-history-detail">
                  <h3>Chi tiết phiên</h3>
                  {detailStatus === "loading" ? (
                    <p>Đang tải chi tiết...</p>
                  ) : selectedDetail?.error ? (
                    <div className="analysis-history-detail-retry">
                      <p className="analysis-history-detail-error">{selectedDetail.error}</p>
                      <Button type="button" tone="secondary" size="sm" onClick={() => loadDetail(selectedSessionId)}>
                        <RefreshCw size={16} aria-hidden="true" />
                        Thử lại
                      </Button>
                    </div>
                  ) : selectedDetail ? (
                    <>
                      <strong>{getSessionTitle(selectedDetail, copy.fallback)}</strong>
                      <p>{getDetailSummary(selectedDetail, sessionType)}</p>
                    </>
                  ) : null}
                </section>
              )}
            </div>

            <footer className="analysis-history-panel-footer">
              <Button type="button" className="analysis-history-continue" onClick={onContinue}>
                {copy.continueLabel}
                <ArrowRight size={16} />
              </Button>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
