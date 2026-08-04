import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, RefreshCw, UserCheck } from "lucide-react";
import { useFeedback } from "../components/feedback/feedbackContext";
import { Badge, Button, CustomSelect, EmptyState, ErrorState, LoadingState } from "../components/ui";
import { doctorRecoveryPlanRequestsApi } from "../services/api";
import { getApiErrorCode } from "../services/apiError";
import "../styles/doctor-recovery-plan.css";

const PAGE_SIZE = 10;
const DISEASE_GROUPS = [
  { value: "", label: "Tất cả nhóm bệnh" },
  { value: "respiratory", label: "Hô hấp" },
  { value: "musculoskeletal", label: "Cơ xương khớp" },
  { value: "infectiousDisease", label: "Bệnh truyền nhiễm" },
];

function getDiseaseLabel(value) {
  return DISEASE_GROUPS.find((item) => item.value === value)?.label ?? "Chưa phân loại";
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function normalizePaged(response, pageNumber) {
  const data = response?.data ?? {};
  return {
    items: Array.isArray(data.items) ? data.items : [],
    pageNumber: Number(data.pageNumber) || pageNumber,
    totalPages: Math.max(1, Number(data.totalPages) || 1),
  };
}

function getAcceptErrorMessage(error) {
  const code = getApiErrorCode(error);
  if (code === "RECOVERY_PLAN_REQUEST_ALREADY_CLAIMED") {
    return { code, message: "Yêu cầu này đã được bác sĩ khác nhận." };
  }
  if (code === "DOCTOR_CAPACITY_REACHED") {
    return { code, message: "Bạn đã đạt giới hạn số yêu cầu đang xử lý đồng thời." };
  }
  if (code === "DOCTOR_NOT_ACTIVE") {
    return { code, message: "Tài khoản bác sĩ của bạn hiện chưa ở trạng thái hoạt động." };
  }
  if (code === "DOCTOR_NOT_ACCEPTING_REQUESTS") {
    return { code, message: "Tài khoản của bạn hiện không nhận yêu cầu mới. Kiểm tra lại cấu hình nhận yêu cầu." };
  }
  if (code === "DOCTOR_PROFILE_NOT_FOUND") {
    return { code, message: "Không tìm thấy hồ sơ bác sĩ gắn với tài khoản này." };
  }
  return { code, message: "Chưa thể nhận yêu cầu này. Vui lòng thử lại." };
}

export default function DoctorRecoveryPlanQueuePage() {
  const { showToast } = useFeedback();
  const [diseaseGroup, setDiseaseGroup] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState({ items: [], pageNumber: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [blockedMessage, setBlockedMessage] = useState("");
  const [acceptingId, setAcceptingId] = useState("");

  const loadQueue = useCallback(async (targetPage = pageNumber, targetDiseaseGroup = diseaseGroup) => {
    setLoading(true);
    setError("");
    try {
      const response = await doctorRecoveryPlanRequestsApi.listOpen({
        pageNumber: targetPage,
        pageSize: PAGE_SIZE,
        diseaseGroup: targetDiseaseGroup,
      });
      setPage(normalizePaged(response, targetPage));
      setBlockedMessage("");
    } catch (requestError) {
      const code = getApiErrorCode(requestError);
      if (code === "DOCTOR_NOT_ACTIVE") {
        setBlockedMessage("Tài khoản bác sĩ của bạn hiện chưa ở trạng thái hoạt động nên không thể xem hàng đợi.");
      } else if (code === "DOCTOR_NOT_ACCEPTING_REQUESTS") {
        setBlockedMessage("Bạn đang tắt nhận yêu cầu mới nên không thể xem hàng đợi.");
      } else if (code === "DOCTOR_PROFILE_NOT_FOUND") {
        setBlockedMessage("Không tìm thấy hồ sơ bác sĩ gắn với tài khoản này.");
      } else {
        setError("Chưa thể tải hàng đợi yêu cầu. Vui lòng thử lại.");
      }
      setPage({ items: [], pageNumber: targetPage, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [pageNumber, diseaseGroup]);

  useEffect(() => {
    // Reload whenever the disease-group filter changes (including mount);
    // page-number-only changes are triggered explicitly by the pagination
    // buttons instead. Deferred via microtask so setState doesn't run
    // synchronously in the effect body.
    queueMicrotask(() => {
      setPageNumber(1);
      void loadQueue(1, diseaseGroup);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diseaseGroup]);

  async function handleAccept(request) {
    setAcceptingId(request.id);
    try {
      await doctorRecoveryPlanRequestsApi.accept(request.id);
      showToast({ type: "success", title: "Đã nhận yêu cầu", message: "Yêu cầu đã được chuyển vào danh sách của bạn." });
      setPage((current) => ({ ...current, items: current.items.filter((item) => item.id !== request.id) }));
    } catch (requestError) {
      const mapped = getAcceptErrorMessage(requestError);
      showToast({ type: "error", title: "Không thể nhận yêu cầu", message: mapped.message });
      if (mapped.code === "RECOVERY_PLAN_REQUEST_ALREADY_CLAIMED") {
        setPage((current) => ({ ...current, items: current.items.filter((item) => item.id !== request.id) }));
      }
      if (["DOCTOR_NOT_ACTIVE", "DOCTOR_NOT_ACCEPTING_REQUESTS"].includes(mapped.code)) {
        void loadQueue(pageNumber, diseaseGroup);
      }
    } finally {
      setAcceptingId("");
    }
  }

  return (
    <div className="doctor-recovery-page">
      <header className="doctor-recovery-header">
        <div>
          <p className="doctor-recovery-eyebrow">Hàng đợi chung</p>
          <h1>Yêu cầu Kế hoạch phục hồi</h1>
          <p>Nhận một yêu cầu để bắt đầu xem xét. Yêu cầu chưa có bác sĩ nhận sẽ hiển thị tại đây theo thứ tự gửi trước.</p>
        </div>
        <Button tone="secondary" size="sm" onClick={() => loadQueue(pageNumber, diseaseGroup)} disabled={loading}>
          <RefreshCw size={16} aria-hidden="true" /> Tải lại
        </Button>
      </header>

      <div className="doctor-recovery-filters">
        <CustomSelect
          label="Nhóm bệnh"
          value={diseaseGroup}
          options={DISEASE_GROUPS}
          onChange={setDiseaseGroup}
        />
      </div>

      {blockedMessage ? (
        <ErrorState title="Không thể xem hàng đợi" description={blockedMessage} urgent />
      ) : loading ? (
        <LoadingState label="Đang tải hàng đợi…" />
      ) : error ? (
        <ErrorState
          title="Không thể tải hàng đợi"
          description={error}
          action={<Button onClick={() => loadQueue(pageNumber, diseaseGroup)}>Thử lại</Button>}
        />
      ) : page.items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={26} aria-hidden="true" />}
          title="Không có yêu cầu đang chờ"
          description="Hàng đợi hiện trống. Yêu cầu mới sẽ xuất hiện tại đây ngay khi được gửi."
        />
      ) : (
        <>
          <div className="doctor-recovery-queue-list">
            {page.items.map((request) => (
              <article className="doctor-recovery-queue-card" key={request.id}>
                <div>
                  <Badge tone="info">{getDiseaseLabel(request.diseaseGroup)}</Badge>
                  <p className="doctor-recovery-queue-time">Gửi lúc {formatDate(request.requestedAt)}</p>
                </div>
                <Button
                  loading={acceptingId === request.id}
                  loadingLabel="Đang nhận…"
                  disabled={Boolean(acceptingId) && acceptingId !== request.id}
                  onClick={() => handleAccept(request)}
                >
                  <UserCheck size={17} aria-hidden="true" /> Nhận yêu cầu
                </Button>
              </article>
            ))}
          </div>

          {page.totalPages > 1 && (
            <nav className="doctor-recovery-pagination" aria-label="Phân trang hàng đợi">
              <Button
                tone="ghost"
                size="sm"
                disabled={loading || page.pageNumber <= 1}
                onClick={() => {
                  const next = page.pageNumber - 1;
                  setPageNumber(next);
                  void loadQueue(next, diseaseGroup);
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
                  void loadQueue(next, diseaseGroup);
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
