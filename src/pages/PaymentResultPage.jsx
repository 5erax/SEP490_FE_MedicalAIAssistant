import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleX,
  Clock3,
  CreditCard,
  LoaderCircle,
  LogIn,
  RefreshCw,
} from "lucide-react";
import { authApi, getStoredAuth, paymentsApi, subscriptionUsageApi, userSubscriptionsApi } from "../services/api";
import { navigate } from "../router/navigation";
import {
  clearRememberedReturnTo,
  getRememberedReturnTo,
  getReturnToFromSearch,
  withReturnTo,
} from "../router/returnIntent";
import "../styles/payment-result.css";

const MAX_RECONCILE_ATTEMPTS = 6;
const RECONCILE_DELAY_MS = 10_000;
const AUTO_RETRY_STATUSES = new Set(["pending", "processing", "activation-pending"]);
const TERMINAL_STATUSES = new Set(["success", "cancelled", "expired", "failed"]);

function getOrderCode() {
  return new URLSearchParams(window.location.search).get("orderCode")?.trim() || "";
}

function normalizeUpper(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeLower(value) {
  return String(value ?? "").trim().toLowerCase();
}

// Mirrors the reconciliation contract exactly: providerStatus is the
// primary source of truth, then isPaid/isActive/isCancelled, then the
// local paymentStatus string. subscriptionStatus is intentionally never
// used to decide "cancelled" - backend can set it to Cancelled for a
// FAILED or EXPIRED transaction too.
function classifyPayment(data) {
  const providerStatus = normalizeUpper(data?.providerStatus);
  const paymentStatus = normalizeLower(data?.paymentStatus);

  if (data?.isPaid && data?.isActive) return "success";

  if (providerStatus === "CANCELLED" || data?.isCancelled) return "cancelled";
  if (providerStatus === "EXPIRED") return "expired";
  if (providerStatus === "FAILED") return "failed";
  if (providerStatus === "UNDERPAID") return "underpaid";
  if (providerStatus === "PROCESSING") return "processing";

  if (providerStatus === "PAID" || data?.isPaid || paymentStatus === "paid") {
    return data?.isActive ? "success" : "activation-pending";
  }

  if (["cancelled", "canceled"].includes(paymentStatus)) return "cancelled";
  if (paymentStatus === "failed") return "failed";

  return "pending";
}

function getReconcileErrorState(error) {
  const codes = Array.isArray(error?.payload?.errors) ? error.payload.errors : [];
  if (error?.status === 401) return "unauthenticated";
  if (error?.status === 429 || codes.includes("PAYOS_RATE_LIMITED")) return "rate-limited";
  if (error?.status === 502) return "provider-unavailable";
  return "error";
}

function getView(status, paymentDetail) {
  if (status === "cancelled") {
    return {
      eyebrow: "Trạng thái đã được xác nhận",
      title: "Giao dịch đã hủy",
      description: "PayOS xác nhận giao dịch đã bị hủy.",
      icon: CircleX,
      tone: "cancelled",
    };
  }

  if (status === "expired") {
    return {
      eyebrow: "Giao dịch đã hết hạn",
      title: "Liên kết thanh toán đã hết hạn.",
      description: "Tạo giao dịch mới nếu vẫn muốn đăng ký gói.",
      icon: CircleX,
      tone: "error",
    };
  }

  if (status === "failed") {
    return {
      eyebrow: "Giao dịch không thành công",
      title: "Thanh toán chưa hoàn tất.",
      description: "Giao dịch đã kết thúc nhưng không được PayOS xác nhận thành công.",
      icon: CircleX,
      tone: "error",
    };
  }

  if (status === "underpaid") {
    const amountRemaining = paymentDetail?.amountRemaining;
    return {
      eyebrow: "Số tiền nhận chưa đủ",
      title: "Số tiền nhận chưa đủ.",
      description: Number.isFinite(amountRemaining) && amountRemaining > 0
        ? `PayOS chưa ghi nhận đủ số tiền. Còn thiếu ${amountRemaining.toLocaleString("vi-VN")} đ trước khi gói được kích hoạt.`
        : "PayOS chưa ghi nhận đủ số tiền. Kiểm tra số tiền còn thiếu trước khi thử lại.",
      icon: AlertTriangle,
      tone: "pending",
    };
  }

  if (status === "success") {
    return {
      eyebrow: "Thanh toán hoàn tất",
      title: "MediMate+ đã sẵn sàng.",
      description: "Thanh toán đã xác nhận và gói đã được kích hoạt.",
      icon: CheckCircle2,
      tone: "success",
    };
  }

  if (status === "activation-pending") {
    return {
      eyebrow: "Đã nhận thanh toán",
      title: "Đã nhận thanh toán.",
      description: "MediMate đang hoàn tất kích hoạt quyền lợi cho tài khoản.",
      icon: LoaderCircle,
      tone: "pending",
    };
  }

  if (status === "processing") {
    return {
      eyebrow: "PayOS đang xử lý",
      title: "PayOS đang xử lý giao dịch.",
      description: "Giao dịch chưa có kết quả cuối cùng. Trang sẽ kiểm tra lại sau.",
      icon: LoaderCircle,
      tone: "pending",
    };
  }

  if (status === "unauthenticated") {
    return {
      eyebrow: "Cần đăng nhập lại",
      title: "Phiên đăng nhập đã hết hạn.",
      description: "Đăng nhập lại để MediMate xác minh giao dịch này.",
      icon: LogIn,
      tone: "pending",
    };
  }

  if (status === "rate-limited") {
    return {
      eyebrow: "Kiểm tra quá thường xuyên",
      title: "Kiểm tra quá thường xuyên.",
      description: "Chờ một lúc rồi bấm \"Kiểm tra lại\".",
      icon: Clock3,
      tone: "pending",
    };
  }

  if (status === "provider-unavailable") {
    return {
      eyebrow: "Chưa kết nối được PayOS",
      title: "Chưa kết nối được PayOS.",
      description: "Không tạo giao dịch mới; hãy kiểm tra lại giao dịch hiện tại sau.",
      icon: Clock3,
      tone: "pending",
    };
  }

  if (status === "pending" || status === "checking") {
    return {
      eyebrow: "Đang xác minh giao dịch",
      title: "Đang xác minh giao dịch.",
      description: "MediMate đang đối chiếu trạng thái trực tiếp với PayOS.",
      icon: LoaderCircle,
      tone: "pending",
    };
  }

  if (status === "missing") {
    return {
      eyebrow: "Chưa đủ thông tin xác minh",
      title: "Chưa thể kiểm tra giao dịch này.",
      description:
        "Liên kết hiện tại không có mã giao dịch. Hãy mở bảng giá hoặc không gian cá nhân để kiểm tra trạng thái trước khi thực hiện giao dịch khác.",
      icon: CreditCard,
      tone: "pending",
    };
  }

  return {
    eyebrow: "Chưa xác minh được",
    title: "Không thể kiểm tra giao dịch lúc này.",
    description: "Kết nối xác minh đang gián đoạn. Hãy kiểm tra lại trạng thái gói trước khi thực hiện giao dịch khác.",
    icon: Clock3,
    tone: "pending",
  };
}

function getStatusLabel(status) {
  if (status === "success") return "Đã kích hoạt";
  if (status === "activation-pending") return "Đang kích hoạt";
  if (status === "processing") return "PayOS đang xử lý";
  if (status === "underpaid") return "Thiếu tiền";
  if (status === "cancelled") return "Đã hủy";
  if (status === "expired") return "Hết hạn";
  if (status === "failed") return "Thất bại";
  if (status === "unauthenticated") return "Cần đăng nhập lại";
  if (status === "rate-limited") return "Kiểm tra quá nhanh";
  if (status === "provider-unavailable" || status === "error") return "Chưa xác minh";
  return "Đang xác minh";
}

function getInitialStatus(orderCode) {
  return orderCode ? "checking" : "missing";
}

export default function PaymentResultPage({ expectedResult }) {
  const [orderCode] = useState(getOrderCode);
  const [status, setStatus] = useState(() => getInitialStatus(orderCode));
  const [message, setMessage] = useState("");
  const [paymentDetail, setPaymentDetail] = useState(null);
  const [checkingAgain, setCheckingAgain] = useState(false);
  const [hasAuth] = useState(() => Boolean(getStoredAuth()));
  const [returnTo] = useState(() => getReturnToFromSearch() || getRememberedReturnTo());
  const [usageList, setUsageList] = useState([]);
  const view = getView(status, paymentDetail);
  const Icon = view.icon;
  const isCancelFlow = expectedResult === "cancel";

  const refreshPremiumState = useCallback(async () => {
    if (!hasAuth) return;
    await userSubscriptionsApi.me();
    try {
      await authApi.refresh();
    } catch {
      // Subscription state is already refreshed even if token refresh is delayed.
    }
    try {
      const usageResponse = await subscriptionUsageApi.getUsage();
      const usageItems = usageResponse?.data ?? [];
      setUsageList(Array.isArray(usageItems) ? usageItems : []);
    } catch {
      // Quota card is optional context here; NO_ACTIVE_SUBSCRIPTION or
      // RECOVERY_PLAN_QUOTA_NOT_CONFIGURED just means nothing to show.
      setUsageList([]);
    }
  }, [hasAuth]);

  // Reconciliation replaces the old webhook-dependent flow: the backend
  // actively asks PayOS for the real status instead of only reading its
  // local database, so this is the single source of truth for both
  // /payment/return and /payment/cancel. expectedResult only affects
  // copy/CTAs below, never which status gets shown.
  const checkStatus = useCallback(async () => {
    if (!orderCode) {
      setStatus("missing");
      return "missing";
    }

    if (!hasAuth) {
      setStatus("unauthenticated");
      setMessage("Vui lòng đăng nhập lại để xác minh giao dịch này.");
      return "unauthenticated";
    }

    const response = await paymentsApi.reconcilePayOs(orderCode);
    const data = response.data ?? {};
    const nextStatus = classifyPayment(data);
    setStatus(nextStatus);
    setMessage(data.message || response.message || "");
    setPaymentDetail(data);

    if (nextStatus === "success") await refreshPremiumState();
    return nextStatus;
  }, [hasAuth, orderCode, refreshPremiumState]);

  useEffect(() => {
    if (!orderCode) return undefined;

    let active = true;
    let timer;
    let attempts = 0;

    const verify = async () => {
      attempts += 1;
      try {
        const nextStatus = await checkStatus();
        if (!active || !AUTO_RETRY_STATUSES.has(nextStatus)) return;
        if (attempts >= MAX_RECONCILE_ATTEMPTS) {
          setStatus("error");
          setMessage("Giao dịch vẫn chưa có kết quả cuối cùng. Hãy kiểm tra lại sau ít phút.");
          return;
        }
        timer = window.setTimeout(verify, RECONCILE_DELAY_MS);
      } catch (error) {
        if (!active) return;
        setStatus(getReconcileErrorState(error));
        setMessage(error?.message || "MediMate chưa thể xác minh giao dịch lúc này.");
      }
    };

    verify();

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [checkStatus, orderCode]);

  async function handleCheckAgain() {
    if (!orderCode) {
      setStatus("missing");
      return;
    }

    setCheckingAgain(true);
    setStatus("checking");

    try {
      await checkStatus();
    } catch (error) {
      setStatus(getReconcileErrorState(error));
      setMessage(error?.message || "MediMate chưa thể xác minh giao dịch lúc này.");
    } finally {
      setCheckingAgain(false);
    }
  }

  const success = status === "success";
  const settled = TERMINAL_STATUSES.has(status);
  const verifying = ["checking", "pending", "processing", "activation-pending"].includes(status);

  useEffect(() => {
    document.title = success
      ? "Thanh toán đã xác nhận | MediMate AI"
      : status === "cancelled"
        ? "Giao dịch đã hủy | MediMate AI"
        : "Trạng thái thanh toán | MediMate AI";
  }, [status, success]);

  function continueAfterPayment() {
    if (success && returnTo) {
      clearRememberedReturnTo();
      navigate(returnTo);
      return;
    }

    navigate("/dashboard");
  }

  function loginAgain() {
    navigate(withReturnTo("/login", `${window.location.pathname}${window.location.search}`));
  }

  return (
    <main className={`landing-page payment-result-page payment-result-${view.tone}`}>
      <div className="payment-result-glow" aria-hidden="true" />

      <a className="payment-result-brand" href="/">
        <span aria-hidden="true">
          <img src="/logo.svg" alt="" width="34" height="34" />
        </span>
        <strong>MediMate AI</strong>
      </a>

      <section
        className="payment-result-card"
        aria-live="polite"
        aria-busy={verifying}
      >
        <div className={`payment-result-icon ${verifying ? "is-loading" : ""}`}>
          <Icon size={38} aria-hidden="true" />
        </div>

        <p className="payment-result-eyebrow">{view.eyebrow}</p>
        <h1>{view.title}</h1>

        {orderCode && (
          <dl className="payment-result-reference">
            <div>
              <dt>Mã giao dịch</dt>
              <dd>{orderCode}</dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd>{getStatusLabel(status)}</dd>
            </div>
          </dl>
        )}

        {success && usageList.length > 0 && (
          <dl className="payment-result-reference payment-result-usage">
            {usageList.map((item) => (
              <div key={item.quotaCode}>
                <dt>{item.quotaName || "Hạn mức sử dụng"}</dt>
                <dd>{item.remainingCount ?? "—"}/{item.limitValue ?? "—"} lượt còn lại</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="payment-result-actions">
          {status === "unauthenticated" ? (
            <button className="payment-result-primary" type="button" onClick={loginAgain}>
              Đăng nhập lại <ArrowRight size={17} />
            </button>
          ) : success ? (
            <>
              <button className="payment-result-primary" type="button" onClick={continueAfterPayment}>
                {returnTo ? "Tiếp tục tác vụ" : "Bắt đầu sử dụng"} <ArrowRight size={17} />
              </button>
              <button type="button" onClick={() => navigate("/pricing#current-subscription")}>
                Xem gói hiện tại
              </button>
            </>
          ) : (
            <>
              <button className="payment-result-primary" type="button" onClick={() => navigate("/pricing")}>
                {isCancelFlow && status === "cancelled" ? "Quay lại bảng giá" : settled ? "Chọn lại gói" : "Về bảng giá"} <ArrowRight size={17} />
              </button>
              <button type="button" onClick={() => navigate("/dashboard")}>
                {hasAuth ? "Mở không gian cá nhân" : "Đăng nhập để kiểm tra"}
              </button>
            </>
          )}
        </div>

        {!settled && orderCode && status !== "unauthenticated" && (
          <button className="payment-result-retry" type="button" onClick={handleCheckAgain} disabled={checkingAgain}>
            <RefreshCw className={checkingAgain ? "is-spinning" : ""} size={16} />
            {checkingAgain ? "Đang kiểm tra..." : "Kiểm tra lại trạng thái"}
          </button>
        )}
      </section>

      <p className="payment-result-support">
        {status === "cancelled"
          ? "Trạng thái hủy chỉ được hiển thị sau khi PayOS xác nhận. Hãy kiểm tra không gian cá nhân nếu bạn cần xác nhận gói đang dùng."
          : "Không thực hiện lại thanh toán khi trạng thái còn đang được xác minh. Hãy giữ mã giao dịch để đối chiếu khi cần."}
        {" "}
        <a href="/support">Xem hướng dẫn thanh toán</a>
      </p>
    </main>
  );
}
