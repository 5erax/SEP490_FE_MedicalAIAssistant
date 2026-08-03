import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, CircleX, Clock3, CreditCard, LoaderCircle, RefreshCw } from "lucide-react";
import { authApi, getStoredAuth, paymentsApi, subscriptionUsageApi, userSubscriptionsApi } from "../services/api";
import { navigate } from "../router/navigation";
import {
  clearRememberedReturnTo,
  getRememberedReturnTo,
  getReturnToFromSearch,
} from "../router/returnIntent";
import "../styles/payment-result.css";

const MAX_STATUS_CHECKS = 12;
const STATUS_CHECK_DELAY = 2500;
function getOrderCode() {
  return new URLSearchParams(window.location.search).get("orderCode")?.trim() || "";
}

function getCallbackParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

function classifyPayment(data) {
  if (data?.isPaid && data?.isActive) return "success";
  if (data?.isCancelled || data?.cancelled) return "cancelled";

  const paymentStatus = String(data?.paymentStatus ?? data?.status ?? "").toLowerCase();
  const subscriptionStatus = String(data?.subscriptionStatus ?? data?.subscription?.status ?? "").toLowerCase();

  if (["paid", "completed", "success", "succeeded"].includes(paymentStatus)) return "success";
  if (["cancelled", "canceled", "cancel"].includes(paymentStatus)) return "cancelled";
  if (["failed", "fail", "error"].includes(paymentStatus)) return "failed";
  if (["expired", "expire"].includes(paymentStatus)) return "expired";
  if (["active", "paid", "completed"].includes(subscriptionStatus)) return "success";
  if (["cancelled", "canceled", "cancel"].includes(subscriptionStatus)) return "cancelled";
  if (["failed", "fail", "error"].includes(subscriptionStatus)) return "failed";
  if (["expired", "expire"].includes(subscriptionStatus)) return "expired";

  return "pending";
}

function getView(status) {
  if (status === "cancelled") {
    return {
      eyebrow: "Trạng thái đã được xác nhận",
      title: "Giao dịch đã được xác nhận là đã hủy.",
      description:
        "MediMate đã nhận trạng thái hủy từ cổng thanh toán. Bạn có thể kiểm tra lại gói đang dùng trong không gian cá nhân.",
      icon: CircleX,
      tone: "cancelled",
    };
  }

  if (status === "success") {
    return {
      eyebrow: "Thanh toán hoàn tất",
      title: "MediMate+ đã sẵn sàng.",
      description:
        "Thanh toán đã được xác nhận và quyền lợi nâng cao đã được kích hoạt cho tài khoản của bạn.",
      icon: CheckCircle2,
      tone: "success",
    };
  }

  if (status === "failed" || status === "expired") {
    return {
      eyebrow: status === "expired" ? "Giao dịch đã hết hạn" : "Giao dịch không thành công",
      title: status === "expired" ? "Liên kết thanh toán đã hết hạn." : "Thanh toán chưa hoàn tất.",
      description:
        "Giao dịch đã kết thúc nhưng không thành công. Hãy chọn lại gói nếu bạn muốn thử thanh toán mới.",
      icon: CircleX,
      tone: "error",
    };
  }

  if (status === "pending" || status === "checking") {
    return {
      eyebrow: "Đang kiểm tra trạng thái",
      title: "Giao dịch chưa được xác nhận.",
      description:
        "MediMate đang chờ trạng thái chính thức từ cổng thanh toán. Trang sẽ tự kiểm tra lại trong ít phút.",
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
    description:
      "Kết nối xác minh đang gián đoạn. Hãy kiểm tra lại trạng thái gói trước khi thực hiện giao dịch khác.",
    icon: Clock3,
    tone: "pending",
  };
}

function getStatusLabel(status) {
  if (status === "cancelled") return "Đã hủy";
  if (status === "success") return "Đã kích hoạt";
  if (status === "failed") return "Thất bại";
  if (status === "expired") return "Hết hạn";
  if (status === "missing" || status === "error") return "Chưa xác minh";
  return "Đang xác minh";
}

function getInitialStatus(orderCode) {
  return orderCode ? "checking" : "missing";
}

export default function PaymentResultPage({ expectedResult }) {
  const [orderCode] = useState(getOrderCode);
  const [status, setStatus] = useState(() => getInitialStatus(orderCode));
  const [message, setMessage] = useState("");
  const [checkingAgain, setCheckingAgain] = useState(false);
  const [hasAuth] = useState(() => Boolean(getStoredAuth()));
  const [returnTo] = useState(() => getReturnToFromSearch() || getRememberedReturnTo());
  const [callbackParams] = useState(getCallbackParams);
  const [usage, setUsage] = useState(null);
  const view = getView(status);
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
      setUsage(usageResponse?.data ?? null);
    } catch {
      // Quota card is optional context here; NO_ACTIVE_SUBSCRIPTION or
      // RECOVERY_PLAN_QUOTA_NOT_CONFIGURED just means nothing to show.
      setUsage(null);
    }
  }, [hasAuth]);

  const checkStatus = useCallback(async () => {
    if (!orderCode) {
      setStatus("missing");
      return "missing";
    }

    const response = expectedResult === "return"
      ? await paymentsApi.payOsReturn(callbackParams)
      : expectedResult === "cancel"
        ? await paymentsApi.payOsCancel(callbackParams)
        : await paymentsApi.payOsStatus(orderCode);

    const data = response.data ?? {};
    const nextStatus = classifyPayment(data);
    setStatus(nextStatus);
    setMessage("");

    if (nextStatus === "success") await refreshPremiumState();
    return nextStatus;
  }, [callbackParams, expectedResult, orderCode, refreshPremiumState]);

  useEffect(() => {
    if (!orderCode) return undefined;

    let active = true;
    let timer;
    let attempts = 0;

    const verify = async () => {
      attempts += 1;
      try {
        const nextStatus = await checkStatus();
        if (!active || nextStatus !== "pending") return;
        if (attempts >= MAX_STATUS_CHECKS) {
          setStatus("error");
          setMessage("Giao dịch vẫn đang chờ xử lý. Hãy kiểm tra lại gói đăng ký sau ít phút.");
          return;
        }
        timer = window.setTimeout(verify, STATUS_CHECK_DELAY);
      } catch {
        if (!active) return;
        setStatus("error");
        setMessage("MediMate chưa nhận được trạng thái chính thức từ cổng thanh toán. Vui lòng kiểm tra lại sau ít phút.");
      }
    };

    verify();

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [checkStatus, isCancelFlow, orderCode]);

  async function handleCheckAgain() {
    if (!orderCode) {
      setStatus("missing");
      return;
    }

    setCheckingAgain(true);
    setStatus("checking");

    try {
      await checkStatus();
    } catch {
      setStatus("error");
      setMessage("MediMate chưa nhận được trạng thái chính thức từ cổng thanh toán. Vui lòng kiểm tra lại sau ít phút.");
    } finally {
      setCheckingAgain(false);
    }
  }

  const success = status === "success";
  const settled = success || status === "cancelled" || status === "failed" || status === "expired";
  const verifying = status === "checking" || status === "pending";

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
        <p className="payment-result-description">{message || view.description}</p>

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

        {success && usage && (
          <dl className="payment-result-reference payment-result-usage">
            <div>
              <dt>{usage.quotaName || "Hạn mức sử dụng"}</dt>
              <dd>{usage.remainingCount ?? "—"}/{usage.limitValue ?? "—"} lượt còn lại</dd>
            </div>
          </dl>
        )}

        <div className="payment-result-actions">
          {success ? (
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

        {!settled && orderCode && (
          <button className="payment-result-retry" type="button" onClick={handleCheckAgain} disabled={checkingAgain}>
            <RefreshCw className={checkingAgain ? "is-spinning" : ""} size={16} />
            {checkingAgain ? "Đang kiểm tra..." : "Kiểm tra lại trạng thái"}
          </button>
        )}
      </section>

      <p className="payment-result-support">
        {status === "cancelled"
          ? "Trạng thái hủy chỉ được hiển thị sau khi cổng thanh toán phản hồi. Hãy kiểm tra không gian cá nhân nếu bạn cần xác nhận gói đang dùng."
          : "Không thực hiện lại thanh toán khi trạng thái còn đang được xác minh. Hãy giữ mã giao dịch để đối chiếu khi cần."}
        {" "}
        <a href="/support">Xem hướng dẫn thanh toán</a>
      </p>
    </main>
  );
}
