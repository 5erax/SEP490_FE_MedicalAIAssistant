import { useCallback, useEffect, useState } from "react";
import {
  Bone,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  RefreshCw,
  Thermometer,
  Wind,
} from "lucide-react";
import { Badge, Button, EmptyState, ErrorState, LoadingState } from "../components/ui";
import { navigate } from "../router/navigation";
import { doctorRecoveryPlanRequestsApi } from "../services/api";
import "../styles/doctor-my-requests.css";

const PAGE_SIZE = 10;

const DISEASE_GROUPS = {
  respiratory: { label: "Hô hấp", icon: Wind },
  musculoskeletal: { label: "Cơ xương khớp", icon: Bone },
  infectiousDisease: { label: "Bệnh truyền nhiễm", icon: Thermometer },
};

const STATUS_TABS = [
  { value: "", label: "Tất cả" },
  { value: "assigned", label: "Đã nhận" },
  { value: "inReview", label: "Đang xem xét" },
  { value: "needMoreInformation", label: "Cần bổ sung" },
  { value: "published", label: "Đã xuất bản" },
  { value: "rejected", label: "Đã từ chối" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "expired", label: "Hết hạn" },
];

const STATUS_META = {
  assigned: { label: "Đã nhận", tone: "info" },
  inReview: { label: "Đang xem xét", tone: "warning" },
  needMoreInformation: { label: "Cần bổ sung", tone: "warning" },
  published: { label: "Đã xuất bản", tone: "success" },
  rejected: { label: "Đã từ chối", tone: "danger" },
  cancelled: { label: "Đã hủy", tone: "danger" },
  expired: { label: "Hết hạn", tone: "danger" },
};

function getDiseaseInfo(value) {
  return DISEASE_GROUPS[value] ?? { label: "Chưa phân loại", icon: ClipboardCheck };
}

function getStatusMeta(value) {
  return STATUS_META[value] ?? { label: value || "—", tone: "info" };
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function getNextStepHint(request) {
  const { status, recoveryPlanId, recoveryPlanStatus } = request;
  if (status === "assigned") return "Tiếp theo: Bắt đầu xem xét";
  if (status === "inReview" && !recoveryPlanId) return "Tiếp theo: Tạo kế hoạch";
  if (status === "inReview" && recoveryPlanStatus === "draft") return "Tiếp theo: Tiếp tục soạn kế hoạch";
  if (status === "needMoreInformation") return "Đang chờ bệnh nhân bổ sung thông tin";
  if (status === "published") return "Đã gửi kế hoạch tới bệnh nhân";
  return null;
}

function normalizePaged(response, pageNumber) {
  const data = response?.data ?? {};
  return {
    items: Array.isArray(data.items) ? data.items : [],
    pageNumber: Number(data.pageNumber) || pageNumber,
    totalPages: Math.max(1, Number(data.totalPages) || 1),
    totalCount: Math.max(0, Number(data.totalCount) || 0),
  };
}

export default function DoctorMyRequestsPage() {
  const [status, setStatus] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState({ items: [], pageNumber: 1, totalPages: 1, totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async (targetPage = pageNumber, targetStatus = status) => {
    setLoading(true);
    setError("");
    try {
      const response = await doctorRecoveryPlanRequestsApi.listMine({
        pageNumber: targetPage,
        pageSize: PAGE_SIZE,
        status: targetStatus,
      });
      setPage(normalizePaged(response, targetPage));
    } catch {
      setError("Chưa thể tải danh sách yêu cầu. Vui lòng thử lại.");
      setPage({ items: [], pageNumber: targetPage, totalPages: 1, totalCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [pageNumber, status]);

  useEffect(() => {
    queueMicrotask(() => {
      setPageNumber(1);
      void loadRequests(1, status);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="doctor-mine-page">
      <header className="doctor-mine-header">
        <div>
          <p className="doctor-mine-eyebrow">
            <span className="doctor-mine-eyebrow-icon" aria-hidden="true"><ClipboardCheck size={14} /></span>
            Yêu cầu của tôi
          </p>
          <h1>Yêu cầu đã nhận</h1>
          <p>Theo dõi tiến độ xử lý và tiếp tục các yêu cầu Kế hoạch phục hồi bạn đã nhận.</p>
        </div>
        <Button tone="secondary" size="sm" onClick={() => loadRequests(pageNumber, status)} disabled={loading}>
          <RefreshCw size={16} aria-hidden="true" /> Tải lại
        </Button>
      </header>

      <nav className="doctor-mine-tabs" aria-label="Lọc theo trạng thái">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || "all"}
            type="button"
            className={status === tab.value ? "is-active" : ""}
            aria-pressed={status === tab.value}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <LoadingState label="Đang tải danh sách…" />
      ) : error ? (
        <ErrorState
          title="Không thể tải danh sách"
          description={error}
          action={<Button onClick={() => loadRequests(pageNumber, status)}>Thử lại</Button>}
        />
      ) : page.items.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={26} aria-hidden="true" />}
          title="Chưa có yêu cầu nào"
          description="Yêu cầu bạn nhận từ Hàng đợi sẽ xuất hiện tại đây."
        />
      ) : (
        <>
          <div className="doctor-mine-list">
            {page.items.map((request) => {
              const disease = getDiseaseInfo(request.diseaseGroup);
              const DiseaseIcon = disease.icon;
              const statusMeta = getStatusMeta(request.status);
              const nextStep = getNextStepHint(request);
              return (
                <article
                  className="doctor-mine-card"
                  key={request.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/app/staff/recovery-plan-requests/${request.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/app/staff/recovery-plan-requests/${request.id}`);
                    }
                  }}
                >
                  <span className="doctor-mine-card-icon" aria-hidden="true"><DiseaseIcon size={20} /></span>
                  <div className="doctor-mine-card-body">
                    <div className="doctor-mine-card-head">
                      <strong>{disease.label}</strong>
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    </div>
                    <p className="doctor-mine-card-time">Gửi lúc {formatDate(request.requestedAt)}</p>
                    {nextStep && <p className="doctor-mine-card-next">{nextStep}</p>}
                  </div>
                  <ChevronRight size={18} aria-hidden="true" className="doctor-mine-card-chevron" />
                </article>
              );
            })}
          </div>

          {page.totalPages > 1 && (
            <nav className="doctor-mine-pagination" aria-label="Phân trang yêu cầu">
              <Button
                tone="ghost"
                size="sm"
                disabled={loading || page.pageNumber <= 1}
                onClick={() => {
                  const next = page.pageNumber - 1;
                  setPageNumber(next);
                  void loadRequests(next, status);
                }}
              >
                <ChevronLeft size={16} aria-hidden="true" /> Trang trước
              </Button>
              <span>Trang {page.pageNumber}/{page.totalPages}</span>
              <Button
                tone="ghost"
                size="sm"
                disabled={loading || page.pageNumber >= page.totalPages}
                onClick={() => {
                  const next = page.pageNumber + 1;
                  setPageNumber(next);
                  void loadRequests(next, status);
                }}
              >
                Trang sau <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
