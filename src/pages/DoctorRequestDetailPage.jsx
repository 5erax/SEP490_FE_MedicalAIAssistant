import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bone,
  CalendarClock,
  ClipboardCheck,
  Clock3,
  FileText,
  RefreshCw,
  Sparkles,
  Thermometer,
  Wind,
} from "lucide-react";
import { Badge, Button, ErrorState, LoadingState } from "../components/ui";
import { navigate } from "../router/navigation";
import { doctorRecoveryPlanRequestsApi } from "../services/api";
import { getApiErrorCode } from "../services/apiError";
import "../styles/doctor-request-detail.css";

const DISEASE_GROUPS = {
  respiratory: { label: "Hô hấp", icon: Wind },
  musculoskeletal: { label: "Cơ xương khớp", icon: Bone },
  infectiousDisease: { label: "Bệnh truyền nhiễm", icon: Thermometer },
};

const STATUS_META = {
  assigned: { label: "Đã nhận", tone: "info" },
  inReview: { label: "Đang xem xét", tone: "warning" },
  needMoreInformation: { label: "Cần bổ sung", tone: "warning" },
  published: { label: "Đã xuất bản", tone: "success" },
  rejected: { label: "Đã từ chối", tone: "danger" },
  cancelled: { label: "Đã hủy", tone: "danger" },
  expired: { label: "Hết hạn", tone: "danger" },
};

const NEXT_STEP_COPY = {
  assigned: {
    title: "Bắt đầu xem xét",
    description: "Xác nhận bắt đầu xử lý để mở hồ sơ lâm sàng và tính thời hạn xử lý.",
  },
  inReviewNoPlan: {
    title: "Tạo kế hoạch phục hồi",
    description: "Soạn kế hoạch mới gồm các giai đoạn, dinh dưỡng và thực phẩm gợi ý.",
  },
  inReviewDraft: {
    title: "Tiếp tục soạn kế hoạch",
    description: "Kế hoạch đang ở dạng nháp, tiếp tục chỉnh sửa trước khi xuất bản.",
  },
  needMoreInformation: {
    title: "Đang chờ bệnh nhân bổ sung",
    description: "Bạn đã yêu cầu bổ sung thông tin. Khi bệnh nhân cập nhật, yêu cầu sẽ quay lại trạng thái Đang xem xét.",
  },
  published: {
    title: "Đã gửi kế hoạch tới bệnh nhân",
    description: "Bệnh nhân sẽ tự bắt đầu kế hoạch khi sẵn sàng.",
  },
};

function getDiseaseInfo(value) {
  return DISEASE_GROUPS[value] ?? { label: "Chưa phân loại", icon: ClipboardCheck };
}

function getStatusMeta(value) {
  return STATUS_META[value] ?? { label: value || "—", tone: "info" };
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}

function getNextStep(request) {
  if (!request) return null;
  if (request.status === "assigned") return NEXT_STEP_COPY.assigned;
  if (request.status === "inReview") {
    return request.recoveryPlanStatus === "draft" ? NEXT_STEP_COPY.inReviewDraft : NEXT_STEP_COPY.inReviewNoPlan;
  }
  if (request.status === "needMoreInformation") return NEXT_STEP_COPY.needMoreInformation;
  if (request.status === "published") return NEXT_STEP_COPY.published;
  return null;
}

export default function DoctorRequestDetailPage({ requestId }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const response = await doctorRecoveryPlanRequestsApi.get(requestId);
      setRequest(response?.data ?? null);
    } catch (requestError) {
      if (requestError?.status === 404 || getApiErrorCode(requestError) === "NOT_FOUND") {
        setNotFound(true);
      } else {
        setError("Chưa thể tải chi tiết yêu cầu. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  return (
    <div className="doctor-detail-page">
      <button type="button" className="doctor-detail-back" onClick={() => navigate("/app/staff/recovery-plans/mine")}>
        <ArrowLeft size={16} aria-hidden="true" /> Yêu cầu của tôi
      </button>

      {loading ? (
        <LoadingState label="Đang tải chi tiết yêu cầu…" />
      ) : notFound ? (
        <ErrorState
          urgent
          title="Không tìm thấy yêu cầu này"
          description="Yêu cầu không tồn tại, hoặc không thuộc quyền xử lý của tài khoản này."
          action={<Button onClick={() => navigate("/app/staff/recovery-plans/mine")}>Về Yêu cầu của tôi</Button>}
        />
      ) : error ? (
        <ErrorState
          title="Không thể tải chi tiết"
          description={error}
          action={<Button onClick={load}><RefreshCw size={16} aria-hidden="true" /> Thử lại</Button>}
        />
      ) : request && (
        <DetailContent request={request} onReload={load} />
      )}
    </div>
  );
}

function DetailContent({ request, onReload }) {
  const disease = getDiseaseInfo(request.diseaseGroup);
  const DiseaseIcon = disease.icon;
  const statusMeta = getStatusMeta(request.status);
  const nextStep = getNextStep(request);
  const assignmentExpiresAt = formatDate(request.assignmentExpiresAt);

  return (
    <>
      <header className="doctor-detail-header">
        <span className="doctor-detail-icon" aria-hidden="true"><DiseaseIcon size={26} /></span>
        <div>
          <p className="doctor-detail-eyebrow">Chi tiết yêu cầu</p>
          <h1>{disease.label}</h1>
        </div>
        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
        <button type="button" className="doctor-detail-refresh" aria-label="Tải lại" onClick={onReload}>
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      </header>

      {assignmentExpiresAt && (
        <div className="doctor-detail-countdown">
          <Clock3 size={16} aria-hidden="true" />
          <span>Hạn xử lý: <strong>{assignmentExpiresAt}</strong></span>
        </div>
      )}

      <dl className="doctor-detail-grid">
        <div>
          <dt>Ngày gửi yêu cầu</dt>
          <dd>{formatDate(request.requestedAt) || "Chưa cập nhật"}</dd>
        </div>
        <div>
          <dt>Ngày nhận</dt>
          <dd>{formatDate(request.acceptedAt) || "Chưa cập nhật"}</dd>
        </div>
        <div>
          <dt>Bắt đầu xem xét</dt>
          <dd>{formatDate(request.reviewStartedAt) || "Chưa bắt đầu"}</dd>
        </div>
        <div>
          <dt>Phiên bản dữ liệu</dt>
          <dd>#{request.version ?? 1}</dd>
        </div>
        <div className="doctor-detail-wide">
          <dt>Ghi chú từ bệnh nhân</dt>
          <dd>{request.requestNote || "Không có ghi chú."}</dd>
        </div>
        {request.status === "rejected" && (
          <div className="doctor-detail-wide doctor-detail-danger">
            <dt><AlertTriangle size={14} aria-hidden="true" /> Lý do từ chối</dt>
            <dd>
              {request.rejectionReasonCode && <span className="doctor-detail-reason-code">{request.rejectionReasonCode}</span>}
              {request.rejectionReason || "Không có mô tả."}
            </dd>
          </div>
        )}
      </dl>

      {nextStep && (
        <section className="doctor-detail-next" aria-labelledby="doctor-detail-next-title">
          <span aria-hidden="true"><Sparkles size={20} /></span>
          <div>
            <p className="doctor-detail-eyebrow">Bước tiếp theo · sắp ra mắt</p>
            <h2 id="doctor-detail-next-title">{nextStep.title}</h2>
            <p>{nextStep.description}</p>
          </div>
        </section>
      )}

      {["published"].includes(request.status) && request.recoveryPlanId && (
        <section className="doctor-detail-plan-note">
          <FileText size={16} aria-hidden="true" />
          <span>Kế hoạch liên kết đang ở trạng thái <strong>{request.recoveryPlanStatus}</strong>. Trang xem kế hoạch sẽ sớm ra mắt.</span>
        </section>
      )}

      {["cancelled", "expired"].includes(request.status) && (
        <section className="doctor-detail-plan-note is-muted">
          <CalendarClock size={16} aria-hidden="true" />
          <span>Yêu cầu này đã kết thúc và không còn thao tác nào khả dụng.</span>
        </section>
      )}
    </>
  );
}
