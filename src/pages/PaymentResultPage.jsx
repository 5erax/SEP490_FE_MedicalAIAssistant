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

function classifyPayment(data) {
  if (data?.isPaid && data?.isActive) return "success";
  if (data?.isCancelled) return "cancelled";

  const paymentStatus = String(data?.paymentStatus ?? "").toLowerCase();
  const subscriptionStatus = String(data?.subscriptionStatus ?? "").toLowerCase();
  if (["failed", "expired", "cancelled", "canceled"].includes(paymentStatus)) return "cancelled";
  if (["active", "paid", "completed"].includes(subscriptionStatus)) return "success";
  return "pending";
}

function getView(status, expectedResult) {
  if (status === "success") {
    return {
      eyebrow: "Thanh toán hoàn tất",
      title: "MediMate+ đã sẵn sàng.",
      description: "Thanh toán đã được xác nhận và quyền lợi nâng cao đã được kích hoạt cho tài khoản của bạn.",
      icon: CheckCircle2,
      tone: "success",
    };
  }
  if (status === "cancelled") {
    return {
      eyebrow: "Giao dịch đã dừng",
      title: "Bạn chưa bị tính phí.",
      description: "Thanh toán đã được hủy. Tài khoản vẫn giữ nguyên gói hiện tại và bạn có thể đăng ký lại bất cứ lúc nào.",
      icon: CircleX,
      tone: "cancelled",
    };
  }
  if (status === "pending" || status === "checking") {
    return {
      eyebrow: "Đang xác minh giao dịch",
      title: "Chờ PayOS xác nhận một chút.",
      description: expectedResult === "cancel"
        ? "MediMate đang kiểm tra trạng thái cuối cùng để bảo đảm giao dịch đã được hủy chính xác."
        : "Thanh toán có thể đã hoàn tất nhưng webhook vẫn đang được xử lý. Trang sẽ tự kiểm tra lại.",
      icon: LoaderCircle,
      tone: "pending",
    };
  }
  if (status === "missing") {
    return {
      eyebrow: "Thiếu thông tin giao dịch",
      title: "Không tìm thấy mã thanh toán.",
      description: "Liên kết quay về không có mã giao dịch. Bạn có thể mở bảng giá để kiểm tra gói hiện tại hoặc thử thanh toán lại.",
      icon: CreditCard,
      tone: "error",
    };
  }
  return {
    eyebrow: "Chưa xác minh được",
    title: "Không thể kiểm tra giao dịch lúc này.",
    description: "Kết nối xác minh đang gián đoạn. Không tạo thanh toán mới cho đến khi bạn kiểm tra lại trạng thái gói.",
    icon: Clock3,
    tone: "error",
  };
}

export default function PaymentResultPage({ expectedResult }) {
  const [orderCode] = useState(getOrderCode);
  const [status, setStatus] = useState(
    expectedResult === "cancel" ? "cancelled" : orderCode ? "checking" : "missing",
  );
  const [message, setMessage] = useState("");
  const [checkingAgain, setCheckingAgain] = useState(false);
  const [hasAuth] = useState(() => Boolean(getStoredAuth()));
  const [returnTo] = useState(() => getReturnToFromSearch() || getRememberedReturnTo());
  const view = getView(status, expectedResult);
  const Icon = view.icon;

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

    const response = await paymentsApi.payOsStatus(orderCode);
    const data = response.data ?? {};
    const nextStatus = classifyPayment(data);
    setStatus(nextStatus);
    setMessage(data.message || "");
    if (nextStatus === "success") await refreshPremiumState();
    return nextStatus;
  }, [orderCode, refreshPremiumState]);

  useEffect(() => {
    if (!orderCode || expectedResult === "cancel") return undefined;
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
  }, [checkStatus, expectedResult, orderCode]);

  async function handleCheckAgain() {
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
  const settled = success || status === "cancelled";

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

      <section className="payment-result-card" aria-live="polite" aria-busy={status === "checking" || status === "pending"}>
        <div className={`payment-result-icon ${status === "checking" || status === "pending" ? "is-loading" : ""}`}>
          <Icon size={38} aria-hidden="true" />
        </div>
        <p className="payment-result-eyebrow">{view.eyebrow}</p>
        <h1>{view.title}</h1>
        <p className="payment-result-description">{message || view.description}</p>

        {orderCode && (
          <dl className="payment-result-reference">
            <div><dt>Mã giao dịch</dt><dd>{orderCode}</dd></div>
            <div>
              <dt>Trạng thái</dt>
              <dd>{success ? "Đã kích hoạt" : status === "cancelled" ? "Đã hủy" : "Đang xác minh"}</dd>
            </div>
          </dl>
        )}

        <div className="payment-result-actions">
          {success ? (
            <>
              <button className="payment-result-primary" type="button" onClick={continueAfterPayment}>
                {returnTo ? "Tiếp tục tác vụ" : "Bắt đầu sử dụng"} <ArrowRight size={17} />
              </button>
              <button type="button" onClick={() => navigate("/pricing#current-subscription")}>Xem gói hiện tại</button>
            </>
          ) : (
            <>
              <button className="payment-result-primary" type="button" onClick={() => navigate("/pricing")}>
                {status === "cancelled" ? "Chọn lại gói" : "Về bảng giá"} <ArrowRight size={17} />
              </button>
              <button type="button" onClick={() => navigate("/dashboard")}>Tiếp tục với gói hiện tại</button>
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
          ? "Giao dịch đã dừng và gói hiện tại của bạn không thay đổi. Bạn có thể đóng trang hoặc chọn lại gói."
          : "Không đóng trình duyệt trong lúc xác minh. Nếu tiền đã trừ nhưng gói chưa kích hoạt, hãy giữ lại mã giao dịch để liên hệ hỗ trợ."}
      </p>
    </main>
  );
}
