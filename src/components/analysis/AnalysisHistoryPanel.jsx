import { useEffect, useState } from "react";
import { ArrowRight, Clock3, FileText, LoaderCircle, X } from "lucide-react";
import { Button } from "../ui";
import { symptomAnalysisApi, unwrapApiData } from "../../services/symptomAnalysisService";
import "../../styles/analysis-history-panel.css";

function getPagedItems(response) {
  const data = unwrapApiData(response);
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

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

function getDetailSummary(detail) {
  const data = unwrapApiData(detail) || detail || {};
  const diagnoses = data.diagnoses || data.Diagnoses || data.analysis?.diagnoses || [];
  const department = data.recommendedDepartment || data.department || data.Department;

  if (Array.isArray(diagnoses) && diagnoses.length > 0) {
    return diagnoses
      .slice(0, 3)
      .map((item) => item.diseaseName || item.DiseaseName)
      .filter(Boolean)
      .join(", ");
  }

  if (department?.departmentName) return department.departmentName;
  return data.status || data.Status || "Đang cập nhật";
}

export default function AnalysisHistoryPanel({
  open,
  onClose,
  sessionType = "diagnoses",
  title,
  emptyText,
  continueLabel,
  onContinue,
}) {
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle");

  const copy = sessionType === "department"
    ? {
      title: title || "Lịch sử tư vấn chuyên khoa",
      empty: emptyText || "Chưa có phiên tư vấn chuyên khoa nào.",
      fallback: "Phiên tư vấn chuyên khoa",
      continueLabel: continueLabel || "Tiếp tục tư vấn",
    }
    : {
      title: title || "Lịch sử chuẩn đoán lâm sàng",
      empty: emptyText || "Chưa có phiên chuẩn đoán lâm sàng nào.",
      fallback: "Phiên chuẩn đoán lâm sàng",
      continueLabel: continueLabel || "Tiếp tục chuẩn đoán",
    };

  useEffect(() => {
    if (!open) return;
    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      setStatus("loading");
      setError("");
      setSelectedDetail(null);
      setSelectedSessionId("");
    });

    symptomAnalysisApi.listMySessions(1, 50, sessionType)
      .then((response) => {
        if (active) setSessions(getPagedItems(response));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Không thể tải lịch sử phân tích.");
      })
      .finally(() => {
        if (active) setStatus("idle");
      });

    return () => {
      active = false;
    };
  }, [open, sessionType]);

  async function viewDetail(session) {
    const sessionId = getSessionId(session);
    if (!sessionId) return;

    setSelectedSessionId(sessionId);
    setDetailStatus("loading");
    setSelectedDetail(null);

    try {
      const response = await symptomAnalysisApi.get(sessionId);
      setSelectedDetail(unwrapApiData(response) || response);
    } catch (requestError) {
      setSelectedDetail({ error: requestError.message || "Không thể tải chi tiết phiên." });
    } finally {
      setDetailStatus("idle");
    }
  }

  if (!open) return null;

  return (
    <div className="analysis-history-drawer" role="dialog" aria-modal="false" aria-label={copy.title}>
      <div className="analysis-history-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="analysis-history-panel">
        <header className="analysis-history-panel-header">
          <div>
            <span><Clock3 size={15} /> Lịch sử</span>
            <h2>{copy.title}</h2>
          </div>
          <button type="button" className="analysis-history-close" onClick={onClose} aria-label="Đóng lịch sử">
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
                      <small>{session.sessionType || sessionType} · {session.status || "Đang cập nhật"}</small>
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
            <section className="analysis-history-detail" aria-live="polite">
              <h3>Chi tiết phiên</h3>
              {detailStatus === "loading" ? (
                <p>Đang tải chi tiết...</p>
              ) : selectedDetail?.error ? (
                <p className="analysis-history-detail-error">{selectedDetail.error}</p>
              ) : selectedDetail ? (
                <>
                  <strong>{getSessionTitle(selectedDetail, copy.fallback)}</strong>
                  <p>{getDetailSummary(selectedDetail)}</p>
                </>
              ) : null}
            </section>
          )}
        </div>

        <footer className="analysis-history-panel-footer">
          <Button type="button" onClick={onContinue}>
            {copy.continueLabel}
            <ArrowRight size={16} />
          </Button>
        </footer>
      </aside>
    </div>
  );
}
