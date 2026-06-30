import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, CircleX, Clock3, CreditCard, LoaderCircle, RefreshCw } from "lucide-react";
import { authApi, getStoredAuth, paymentsApi, userSubscriptionsApi } from "../services/api";
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

function getView(status, expectedResult) {
  if (expectedResult === "cancel" || status === "cancelled") {
    return {
      eyebrow: "Đăng ký không thành công",
      title: "Bạn đã hủy giao dịch.",
      description:
        "Giao dịch PayOS chưa hoàn tất. MediMate không kích hoạt gói mới và bạn không bị mất tiền cho giao dịch này.",
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
        "Backend đã trả về trạng thái cuối cùng không thành công. Hãy chọn lại gói nếu bạn muốn thử thanh toán mới.",
      icon: CircleX,
      tone: "error",
    };
  }

  if (status === "pending" || status === "checking") {
    return {
      eyebrow: "Đang xác minh giao dịch",
      title: "Chờ PayOS xác nhận một chút.",
      description:
        "Thanh toán có thể đã hoàn tất nhưng webhook vẫn đang được xử lý. Trang sẽ tự kiểm tra lại.",
      icon: LoaderCircle,
      tone: "pending",
    };
  }

  if (status === "missing") {
    return {
      eyebrow: "Thiếu thông tin giao dịch",
      title: "Không tìm thấy mã thanh toán.",
      description:
        "Liên kết quay về không có mã giao dịch. Bạn có thể mở bảng giá để kiểm tra gói hiện tại hoặc thử thanh toán lại.",
      icon: CreditCard,
      tone: "error",
    };
  }

  return {
    eyebrow: "Chưa xác minh được",
    title: "Không thể kiểm tra giao dịch lúc này.",
    description:
      "Kết nối xác minh đang gián đoạn. Không tạo thanh toán mới cho đến khi bạn kiểm tra lại trạng thái gói.",
    icon: Clock3,
    tone: "error",
  };
}

function getStatusLabel(status, expectedResult) {
  if (expectedResult === "cancel" || status === "cancelled") return "Đã hủy";
  if (status === "success") return "Đã kích hoạt";
  if (status === "failed") return "Thất bại";
  if (status === "expired") return "Hết hạn";
  if (status === "missing") return "Thiếu mã giao dịch";
  return "Đang xác minh";
}

function getInitialStatus(orderCode, expectedResult) {
  if (expectedResult === "cancel") return "cancelled";
  return orderCode ? "checking" : "missing";
}

export default function PaymentResultPage({ expectedResult }) {
  const [orderCode] = useState(getOrderCode);
  const [status, setStatus] = useState(() => getInitialStatus(orderCode, expectedResult));
  const [message, setMessage] = useState("");
  const [checkingAgain, setCheckingAgain] = useState(false);
  const [hasAuth] = useState(() => Boolean(getStoredAuth()));
  const [returnTo] = useState(() => getReturnToFromSearch() || getRememberedReturnTo());
  const [callbackParams] = useState(getCallbackParams);
  const view = getView(status, expectedResult);
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
  }, [hasAuth]);

  const checkStatus = useCallback(async () => {
    if (!orderCode) {
      setStatus("missing");
      return "missing";
    }

    const response = expectedResult === "return"
      ? await paymentsApi.payOsReturn(callbackParams)
      : await paymentsApi.payOsStatus(orderCode);

    const data = response.data ?? {};
    const nextStatus = classifyPayment(data);
    setStatus(nextStatus);
    setMessage(data.message || "");

    if (nextStatus === "success") await refreshPremiumState();
    return nextStatus;
  }, [callbackParams, expectedResult, orderCode, refreshPremiumState]);

  useEffect(() => {
    if (isCancelFlow) {
      setStatus("cancelled");
      setMessage("");

      // Gọi backend trong nền để ghi nhận callback hủy nếu PayOS có trả orderCode.
      // Không cho lỗi verify làm vỡ UX của người dùng đã bấm hủy thanh toán.
      if (orderCode) {
        paymentsApi.payOsCancel(callbackParams).catch(() => {});
      }

      return undefined;
    }

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
        setMessage("MediMate chưa nhận được trạng thái chính thức từ PayOS. Vui lòng kiểm tra lại sau ít phút.");
      }
    };

    verify();

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [callbackParams, checkStatus, isCancelFlow, orderCode]);

  async function handleCheckAgain() {
    if (isCancelFlow) {
      setStatus("cancelled");
      return;
    }

    setCheckingAgain(true);
    setStatus("checking");

    try {
      await checkStatus();
    } catch {
      setStatus("error");
      setMessage("MediMate chưa nhận được trạng thái chính thức từ PayOS. Vui lòng kiểm tra lại sau ít phút.");
    } finally {
      setCheckingAgain(false);
    }
  }

  const success = status === "success";
  const settled = isCancelFlow || success || status === "cancelled" || status === "failed" || status === "expired";

  function continueAfterPayment() {
    if (success && returnTo) {
      clearRememberedReturnTo();
      navigate(returnTo);
      return;
    }

    navigate("/dashboard");
  }

  return (
    <main className={`payment-result-page payment-result-${view.tone}`}>
      <div className="payment-result-glow" aria-hidden="true" />

      <a className="payment-result-brand" href="/">
        <span aria-hidden="true">+</span>
        <strong>MediMate AI</strong>
      </a>

      <section
        className="payment-result-card"
        aria-live="polite"
        aria-busy={!isCancelFlow && (status === "checking" || status === "pending")}
      >
        <div className={`payment-result-icon ${!isCancelFlow && (status === "checking" || status === "pending") ? "is-loading" : ""}`}>
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
              <dd>{getStatusLabel(status, expectedResult)}</dd>
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
                {isCancelFlow ? "Quay lại bảng giá" : settled ? "Chọn lại gói" : "Về bảng giá"} <ArrowRight size={17} />
              </button>
              <button type="button" onClick={() => navigate("/dashboard")}>
                Tiếp tục với gói hiện tại
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
        {isCancelFlow || status === "cancelled"
          ? "Bạn đã rời khỏi thanh toán trước khi hoàn tất. MediMate không ghi nhận khoản thanh toán nào cho giao dịch này, gói hiện tại của bạn vẫn được giữ nguyên."
          : "Không đóng trình duyệt trong lúc xác minh. Nếu tiền đã trừ nhưng gói chưa kích hoạt, hãy giữ lại mã giao dịch để liên hệ hỗ trợ."}
      </p>
    </main>
  );
}
