import { useEffect, useMemo, useRef, useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import { adminQuotasApi, adminSubscriptionPlanQuotasApi, subscriptionPlansApi } from "../../services/api";
import { Button, ErrorState, LoadingState } from "../ui";
import SubscriptionPlanTable from "./SubscriptionPlanTable";
import SubscriptionPlanFormModal from "./SubscriptionPlanFormModal";
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
  const planModalTriggerRef = useRef(null);
  const [quotaCatalog, setQuotaCatalog] = useState([]);
  const [quotaMessage, setQuotaMessage] = useState(null);
  const [assigningQuotaPlanId, setAssigningQuotaPlanId] = useState("");
  const [planModal, setPlanModal] = useState({ open: false, mode: "edit", plan: null });
  const [savingPlan, setSavingPlan] = useState(false);

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

  function openEditPlan(plan) {
    planModalTriggerRef.current = document.activeElement;
    setPlanModal({ open: true, mode: "edit", plan });
  }

  function closePlanModal() {
    if (savingPlan) return;
    setPlanModal({ open: false, mode: "edit", plan: null });
  }

  async function handleSavePlan(payload, options = {}) {
    if (!planModal.plan?.id) return;

    setSavingPlan(true);
    setQuotaMessage(null);

    try {
      await subscriptionPlansApi.update(planModal.plan.id, payload);
      const quotaUpdates = Array.isArray(options.quotaUpdates) ? options.quotaUpdates : [];
      if (quotaUpdates.length) {
        await Promise.all(quotaUpdates.map((quota) => (
          adminSubscriptionPlanQuotasApi.upsert(planModal.plan.id, quota.quotaId, {
            limitValue: quota.limitValue,
            resetPeriod: quota.resetPeriod,
            isActive: quota.isActive,
          })
        )));
      }
      setQuotaMessage({
        type: "success",
        text: quotaUpdates.length ? "Đã cập nhật gói dịch vụ và hạn mức sử dụng." : "Đã cập nhật gói dịch vụ.",
      });
      setPlanModal({ open: false, mode: "edit", plan: null });
      await onReload?.();
    } catch (err) {
      setQuotaMessage({
        type: "error",
        text: err?.message || "Không thể cập nhật gói dịch vụ.",
      });
    } finally {
      setSavingPlan(false);
    }
  }

  return (
    <section className="admin-panel subscription-plan-admin-panel">
      <div className="panel-title-row subscription-plan-heading">
        <div>
          <p className="eyebrow">Gói đăng ký</p>
          <h2>Quản lý gói dịch vụ</h2>
          <p className="muted-text">Theo dõi gói đang mở bán và hạn mức sử dụng thật cho từng gói.</p>
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
          <strong>Hạn mức sử dụng đã sẵn sàng.</strong> Gán số lượt thật cho từng gói khi cần.
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
          onEdit={openEditPlan}
          onAssignDefaultQuota={handleAssignRecoveryQuota}
          plans={plans}
        />
      )}

      {planModal.open && (
        <SubscriptionPlanFormModal
          mode={planModal.mode}
          plan={planModal.plan}
          saving={savingPlan}
          quotaCatalog={quotaCatalog}
          defaultQuota={defaultRecoveryQuota}
          restoreFocusRef={planModalTriggerRef}
          onClose={closePlanModal}
          onSubmit={handleSavePlan}
        />
      )}

      <AdminPaymentsPanel />
    </section>
  );
}
