import { useEffect, useMemo, useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import { adminQuotasApi, adminSubscriptionPlanQuotasApi } from "../../services/api";
import { Button, ErrorState, LoadingState } from "../ui";
import SubscriptionPlanTable from "./SubscriptionPlanTable";
import AdminPaymentsPanel from "./AdminPaymentsPanel";

const RECOVERY_PLAN_QUOTA_CODE = "RECOVERY_PLAN_REQUEST";
const DEFAULT_RECOVERY_PLAN_LIMIT = 3;

function readApiItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function findRecoveryPlanQuota(quotas) {
  return quotas.find((quota) => String(quota?.code || "").toUpperCase() === RECOVERY_PLAN_QUOTA_CODE)
    || quotas.find((quota) => String(quota?.code || quota?.name || "").toLowerCase().includes("recovery"));
}

export default function AdminSubscriptionsSection({
  activeCount,
  error,
  loading,
  message,
  plans,
  onReload,
}) {
  const [quotaCatalog, setQuotaCatalog] = useState([]);
  const [quotaMessage, setQuotaMessage] = useState(null);
  const [assigningQuotaPlanId, setAssigningQuotaPlanId] = useState("");

  const defaultRecoveryQuota = useMemo(() => findRecoveryPlanQuota(quotaCatalog), [quotaCatalog]);
  const visibleMessage = quotaMessage || message;

  useEffect(() => {
    let active = true;

    adminQuotasApi.list()
      .then((response) => {
        if (!active) return;
        setQuotaCatalog(readApiItems(response));
      })
      .catch((err) => {
        if (!active) return;
        setQuotaMessage({
          type: "error",
          text: err?.status === 401
            ? "Bạn cần đăng nhập bằng tài khoản admin để tải danh mục quota."
            : (err?.message || "Không thể tải danh mục quota."),
        });
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleAssignRecoveryQuota(plan) {
    if (!defaultRecoveryQuota?.id) {
      setQuotaMessage({
        type: "error",
        text: "Chưa tìm thấy quota RECOVERY_PLAN_REQUEST từ backend. Vui lòng kiểm tra danh mục quota trước.",
      });
      return;
    }

    setAssigningQuotaPlanId(plan.id);
    setQuotaMessage(null);

    try {
      await adminSubscriptionPlanQuotasApi.upsert(plan.id, defaultRecoveryQuota.id, {
        limitValue: DEFAULT_RECOVERY_PLAN_LIMIT,
        resetPeriod: "subscriptionCycle",
        isActive: true,
      });
      setQuotaMessage({
        type: "success",
        text: `Đã gán ${DEFAULT_RECOVERY_PLAN_LIMIT} lượt yêu cầu kế hoạch phục hồi cho ${plan.planName}.`,
      });
      await onReload?.();
    } catch (err) {
      setQuotaMessage({
        type: "error",
        text: err?.message || "Không thể gán quota cho gói dịch vụ.",
      });
    } finally {
      setAssigningQuotaPlanId("");
    }
  }

  return (
    <section className="admin-panel subscription-plan-admin-panel">
      <div className="panel-title-row subscription-plan-heading">
        <div>
          <p className="eyebrow">Gói đăng ký</p>
          <h2>Quản lý gói dịch vụ</h2>
          <p className="muted-text">Theo dõi gói đang mở bán và gán quota sử dụng thật cho từng gói.</p>
        </div>
        <div className="record-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={onReload}>
            <RefreshCw size={15} /> Đồng bộ
          </button>
        </div>
      </div>

      <div className="subscription-contract-notice" role="note">
        <Info size={18} aria-hidden="true" />
        <p>
          <strong>Quota đã dùng API quản trị từ backend.</strong> Nếu gói chưa có hạn mức,
          hãy gán quota kế hoạch phục hồi để trang hồ sơ và kết quả thanh toán có dữ liệu thật để hiển thị.
        </p>
      </div>

      {!loading && !error && (
        <section className="subscription-plan-kpis" aria-label="Tổng quan gói dịch vụ">
          <article>
            <span>Tổng số gói</span>
            <strong>{plans.length}</strong>
          </article>
          <article>
            <span>Đang mở bán</span>
            <strong>{activeCount}</strong>
          </article>
          <article>
            <span>Đang tạm ẩn</span>
            <strong>{Math.max(0, plans.length - activeCount)}</strong>
          </article>
        </section>
      )}

      {visibleMessage && (
        <div
          className={`api-message ${visibleMessage.type}`}
          role={visibleMessage.type === "error" ? "alert" : "status"}
          aria-live={visibleMessage.type === "error" ? "assertive" : "polite"}
        >
          {visibleMessage.text}
        </div>
      )}

      {loading ? (
        <LoadingState
          label="Đang tải danh sách gói dịch vụ..."
          description="Dữ liệu gói đăng ký đang được đồng bộ."
        />
      ) : error ? (
        <ErrorState
          title="Không thể tải danh sách gói dịch vụ"
          description={error}
          urgent
          action={(
            <Button onClick={onReload}>
              <RefreshCw size={16} aria-hidden="true" /> Thử tải lại
            </Button>
          )}
        />
      ) : (
        <SubscriptionPlanTable
          assigningQuotaPlanId={assigningQuotaPlanId}
          defaultQuota={defaultRecoveryQuota}
          onAssignDefaultQuota={handleAssignRecoveryQuota}
          plans={plans}
        />
      )}

      <AdminPaymentsPanel />
    </section>
  );
}
