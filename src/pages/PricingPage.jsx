import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { useFeedback } from "../components/feedback/feedbackContext";
import {
  getStoredAuth,
  paymentsApi,
  subscriptionPlansApi,
  userSubscriptionsApi,
} from "../services/api";
import { clearCheckoutIntent, saveCheckoutIntent } from "../services/checkoutIntent";
import {
  findServiceCreditQuota,
  getServiceCreditErrorPresentation,
  getServiceCreditLimit,
} from "../services/serviceCredit";
import { useServiceCredit } from "../state/useServiceCredit";
import { navigate } from "../router/navigation";
import { getReturnToFromSearch, rememberReturnTo, withReturnTo } from "../router/returnIntent";
import { getCheckoutErrorMessage } from "../services/apiError";
import { getPaymentStatusLabel } from "../services/paymentStatusLabels";
import { trackUxEvent } from "../utils/analytics";
import {
  getPlanBenefits,
  getPlanDisplayName,
  PUBLIC_ACCESS_BENEFITS,
} from "../utils/subscriptionPlanPresentation";

const FAQS = [
  [
    "Lượt dùng trong gói có hết hạn không?",
    "Không. Lượt dùng dịch vụ được cộng vào số dư chung của tài khoản và không hết hạn.",
  ],
  [
    "Phần miễn phí bao gồm gì?",
    "Bạn có thể sử dụng các tính năng công khai để phân tích triệu chứng ở mức tham khảo, tìm cơ sở y tế trên bản đồ và hỏi trợ lý AI trên trang chủ.",
  ],
  [
    "Quyền lợi gói đăng ký được xác định thế nào?",
    "Mỗi gói cấp một số lượt dùng chung cho kế hoạch phục hồi, tư vấn trước khám và phân tích xét nghiệm.",
  ],
];

function formatPrice(value) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function getSubscriptionStatus(subscription) {
  const value = subscription?.status ?? subscription?.statusName ?? "";
  const numericStatus = Number(value);
  if (Number.isFinite(numericStatus) && String(value).trim() !== "") {
    return ["pending", "active", "expired", "cancelled"][numericStatus] || "";
  }
  return String(value).trim().toLowerCase();
}

function isActiveSubscription(subscription) {
  return getSubscriptionStatus(subscription) === "active";
}

function isPendingSubscription(subscription) {
  return getSubscriptionStatus(subscription) === "pending";
}

function getSubscriptionStatusLabel(subscription) {
  const status = getSubscriptionStatus(subscription);
  if (status === "pending") return "Đang chờ thanh toán";
  if (status === "active") return "Đang hoạt động";
  if (status === "expired") return "Đã hết hạn";
  if (["cancelled", "canceled"].includes(status)) return "Đã hủy";
  return subscription?.statusName || "Chưa xác định";
}

function getSubscriptionExpiryLabel(subscription) {
  if (!subscription?.endDate) return "Không hết hạn";
  const endDate = new Date(subscription.endDate);
  return Number.isNaN(endDate.getTime()) ? "Không hết hạn" : endDate.toLocaleDateString("vi-VN");
}

function isSuccessfulPayment(payment) {
  const status = String(payment?.status ?? "").toLowerCase();
  return Boolean(payment?.paidAt) || status === "paid";
}

function isTerminalPayment(payment) {
  const status = String(payment?.status ?? "").toLowerCase();
  return ["failed", "cancelled", "canceled", "expired", "refunded"].includes(status);
}

function PricingPage() {
  const { confirmAction, showToast } = useFeedback();
  const { refresh: refreshServiceCredit } = useServiceCredit();
  const [auth] = useState(() => getStoredAuth());
  const [openFaq, setOpenFaq] = useState(null);
  const [apiPlans, setApiPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [plansLoadAttempt, setPlansLoadAttempt] = useState(0);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(Boolean(auth));
  const [subscriptionsError, setSubscriptionsError] = useState("");
  const [checkoutState, setCheckoutState] = useState({ status: "idle", message: "", paymentId: "", orderCode: "", planId: "" });
  const [cancellingSubscriptionId, setCancellingSubscriptionId] = useState("");
  const pollingRef = useRef(null);
  const checkoutInFlightRef = useRef(false);
  const paidPlans = useMemo(
    () => apiPlans.filter((plan) => Number(plan.price) > 0 && findServiceCreditQuota(plan)),
    [apiPlans],
  );
  const freePlan = useMemo(() => apiPlans.find((plan) => Number(plan.price) === 0), [apiPlans]);
  const visibleSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => (
      isActiveSubscription(subscription) || isPendingSubscription(subscription)
    )),
    [subscriptions],
  );
  const hasActivePackage = visibleSubscriptions.some(isActiveSubscription);
  const returnTo = getReturnToFromSearch();
  const pricingSearchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const isFocusedUpgrade = pricingSearchParams.get("view") === "upgrade";
  const backHref = returnTo || (auth ? "/dashboard" : "/");
  const backLabel = isFocusedUpgrade
    ? "Quay lại hồ sơ"
    : auth
      ? "Quay lại tư vấn"
      : "Quay lại trang chủ";

  async function loadSubscriptions() {
    if (!auth) return [];
    setSubscriptionsLoading(true);
    setSubscriptionsError("");
    try {
      const response = await userSubscriptionsApi.me();
      const items = Array.isArray(response.data) ? response.data : [];
      setSubscriptions(items);
      return items;
    } catch {
      setSubscriptions([]);
      setSubscriptionsError("Chưa thể kiểm tra gói hiện tại.");
      showToast({
        type: "error",
        title: "Không thể tải gói đăng ký",
        message: "Vui lòng thử lại sau ít phút.",
      });
      return [];
    } finally {
      setSubscriptionsLoading(false);
    }
  }

  useEffect(() => {
    if (returnTo) rememberReturnTo(returnTo);
  }, [returnTo]);

  useEffect(() => {
    let active = true;

    subscriptionPlansApi.active()
      .then((response) => {
        if (!active) return;
        setApiPlans(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (!active) return;
        setApiPlans([]);
        setPlansError("Không thể tải thông tin gói.");
      })
      .finally(() => {
        if (active) setPlansLoading(false);
      });

    return () => {
      active = false;
    };
  }, [plansLoadAttempt]);

  useEffect(() => {
    if (!auth) return undefined;
    let active = true;

    userSubscriptionsApi.me()
      .then((response) => {
        if (!active) return;
        setSubscriptions(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (!active) return;
        setSubscriptions([]);
        setSubscriptionsError("Chưa thể kiểm tra gói hiện tại.");
        showToast({
          type: "error",
          title: "Không thể tải gói đăng ký",
          message: "Vui lòng thử lại sau ít phút.",
        });
      })
      .finally(() => {
        if (active) setSubscriptionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auth, showToast]);

  useEffect(() => () => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
  }, []);

  function startFreePlan() {
    navigate("/symptom");
  }

  async function pollPayment(paymentId, orderCode) {
    if (pollingRef.current) window.clearInterval(pollingRef.current);

    let attempts = 0;
    let networkErrorAttempts = 0;
    let checking = false;

    // Local GET /payments/me/{id} is a cheap DB read so it can poll every
    // 200ms; the reconcile call asks PayOS directly, so it only runs on the
    // first tick and periodically after that.
    const check = async () => {
      if (checking) return false;
      checking = true;
      attempts += 1;

      try {
        if (orderCode && (attempts === 1 || attempts % 4 === 0)) {
          try {
            await paymentsApi.reconcilePayOs(orderCode);
          } catch (error) {
            if ([400, 403, 404, 409].includes(error?.status)) {
              window.clearInterval(pollingRef.current);
              pollingRef.current = null;
              checkoutInFlightRef.current = false;
              clearCheckoutIntent(orderCode);
              setCheckoutState({
                status: "error",
                paymentId,
                orderCode,
                planId: "",
                message: "Giao dịch không hợp lệ hoặc không thuộc tài khoản này. Vui lòng kiểm tra lại lịch sử thanh toán.",
              });
              return true;
            }
            // 429/502: giữ trạng thái Pending hiện tại và thử lại ở lượt
            // sau, không spam PayOS.
          }
        }

        const response = await paymentsApi.getMyPayment(paymentId);
        const payment = response.data;

        if (isSuccessfulPayment(payment)) {
          window.clearInterval(pollingRef.current);
          pollingRef.current = null;
          checkoutInFlightRef.current = false;
          clearCheckoutIntent(orderCode);
          setCheckoutState({
            status: "success",
            paymentId,
            orderCode,
            planId: "",
            message: "Thanh toán thành công. Lượt dùng dịch vụ đã được cộng vào tài khoản.",
          });
          await Promise.allSettled([
            loadSubscriptions(),
            refreshServiceCredit({ silent: true }),
          ]);
          showToast({
            type: "success",
            title: "Thanh toán thành công",
            message: "Số dư lượt dùng dịch vụ đã được cập nhật.",
          });
          return true;
        }

        if (isTerminalPayment(payment) || attempts >= 100) {
          window.clearInterval(pollingRef.current);
          pollingRef.current = null;
          checkoutInFlightRef.current = false;
          if (isTerminalPayment(payment)) clearCheckoutIntent(orderCode);
          setCheckoutState({
            status: "error",
            paymentId,
            orderCode,
            planId: "",
            message: isTerminalPayment(payment)
              ? `Giao dịch ${getPaymentStatusLabel(payment?.status, "không thành công").toLowerCase()}.`
              : "Chưa nhận được xác nhận thanh toán. Bạn có thể kiểm tra lại gói đăng ký sau.",
          });
          return true;
        }

        networkErrorAttempts = 0;
        return false;
      } catch {
        networkErrorAttempts += 1;
        if (networkErrorAttempts >= 5) {
          window.clearInterval(pollingRef.current);
          pollingRef.current = null;
          checkoutInFlightRef.current = false;
          setCheckoutState({
            status: "error",
            paymentId,
            orderCode,
            planId: "",
            message: "Chưa thể xác minh giao dịch lúc này. Bạn có thể kiểm tra lại lịch sử thanh toán sau.",
          });
          return true;
        }
        return false;
      } finally {
        checking = false;
      }
    };

    const completed = await check();
    if (!completed) {
      pollingRef.current = window.setInterval(check, 200);
    }
  }

  async function startPremiumUpgrade(paidPlan) {
    if (checkoutInFlightRef.current || ["creating", "pending"].includes(checkoutState.status)) return;

    trackUxEvent("pricing_trial_clicked", {
      planId: paidPlan?.id || "",
      authenticated: Boolean(auth),
    });

    if (!auth) {
      navigate(withReturnTo("/signup", returnTo || "/pricing"));
      return;
    }

    if (!paidPlan?.id) {
      setCheckoutState({
        status: "error",
        paymentId: "",
        orderCode: "",
        planId: "",
        message: plansLoading
          ? "Danh sách gói đang được tải."
          : "Chưa có gói trả phí khả dụng để tạo thanh toán.",
      });
      return;
    }

    const creditLimit = getServiceCreditLimit(paidPlan);
    if (!Number.isFinite(creditLimit) || creditLimit <= 0) {
      setCheckoutState({
        status: "error",
        paymentId: "",
        orderCode: "",
        planId: "",
        message: "Gói này chưa được cấu hình lượt dùng dịch vụ. Vui lòng chọn gói khác hoặc thử lại sau.",
      });
      return;
    }

    checkoutInFlightRef.current = true;

    const paymentWindow = window.open("about:blank", "medimate-payos");
    if (paymentWindow) paymentWindow.opener = null;
    setCheckoutState({
      status: "creating",
      message: "Đang tạo liên kết thanh toán PayOS...",
      paymentId: "",
      orderCode: "",
      planId: paidPlan.id,
    });

    try {
      const response = await userSubscriptionsApi.checkout(paidPlan.id, false);
      const checkout = response.data;
      if (!checkout?.paymentUrl || !checkout?.subscriptionId || !checkout?.paymentId || !checkout?.orderCode) {
        paymentWindow?.close();
        throw new Error("Backend chưa trả đủ thông tin thanh toán. Vui lòng thử lại.");
      }

      saveCheckoutIntent(checkout);

      setCheckoutState({
        status: "pending",
        paymentId: checkout.paymentId,
        orderCode: checkout.orderCode,
        planId: paidPlan.id,
        message: "Trang PayOS đã được mở. Hoàn tất thanh toán ở tab mới; trang này sẽ tự cập nhật.",
      });

      if (paymentWindow) {
        paymentWindow.location.replace(checkout.paymentUrl);
      } else {
        window.location.assign(checkout.paymentUrl);
        return;
      }

      pollPayment(checkout.paymentId, checkout.orderCode);
    } catch (error) {
      checkoutInFlightRef.current = false;
      paymentWindow?.close();
      const creditError = getServiceCreditErrorPresentation(error);
      setCheckoutState({
        status: "error",
        paymentId: "",
        orderCode: "",
        planId: "",
        message: creditError?.message || getCheckoutErrorMessage(error, "Chưa thể tạo liên kết thanh toán lúc này. Vui lòng thử lại sau."),
      });
    }
  }

  async function cancelPendingSubscription(subscription) {
    if (!subscription?.id || !isPendingSubscription(subscription) || cancellingSubscriptionId) return;
    const confirmed = await confirmAction({
      title: "Hủy giao dịch đang chờ?",
      message: "Liên kết thanh toán của gói này sẽ không còn được dùng. Các gói đã thanh toán và số dư hiện có không bị ảnh hưởng.",
      confirmLabel: "Hủy giao dịch",
      tone: "danger",
    });
    if (!confirmed) return;

    setCancellingSubscriptionId(subscription.id);
    try {
      await userSubscriptionsApi.cancel(subscription.id);
      await loadSubscriptions();
      showToast({
        type: "success",
        title: "Đã hủy giao dịch",
        message: "Gói đang chờ thanh toán đã được hủy.",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Không thể hủy giao dịch",
        message: getCheckoutErrorMessage(error, "Chỉ gói đang chờ thanh toán mới có thể hủy."),
      });
    } finally {
      setCancellingSubscriptionId("");
    }
  }
  const paidPlanUnavailable = !plansLoading && Boolean(plansError);

  return (
    <>
      {!isFocusedUpgrade && <Navbar variant="landing" />}
      <main className={`pricing-page ${isFocusedUpgrade ? "pricing-page-focused" : ""}`}>
        <div className="pricing-shell">
          <a className="pricing-back-link" href={backHref}>
            <ArrowLeft size={17} aria-hidden="true" />
            {backLabel}
          </a>

          <header
            className={`pricing-hero ${
              isFocusedUpgrade || (!plansLoading && paidPlans.length === 0) ? "pricing-hero-single" : ""
            }`}
          >
            <div className="pricing-hero-copy">
              <p className="pricing-eyebrow">
                {isFocusedUpgrade ? "Nâng cấp MediMate+" : "Bảng giá MediMate"}
              </p>
              <h1>
                {isFocusedUpgrade
                  ? "Mở khóa gói MediMate Plus"
                  : "Chọn gói phù hợp với cách bạn sử dụng MediMate"}
              </h1>
              <p className="pricing-hero-description">
                {isFocusedUpgrade
                  ? "Chọn số lượt phù hợp để cộng vào số dư dùng chung của tài khoản. Bạn có thể mua thêm bất cứ lúc nào."
                  : "Mỗi gói cấp lượt dùng chung cho kế hoạch phục hồi, tư vấn trước khám và phân tích xét nghiệm."}
              </p>
              {!isFocusedUpgrade && (
                <ul className="pricing-trust-list" aria-label="Thông tin chính về gói">
                  <li><ShieldCheck size={18} aria-hidden="true" />Không yêu cầu nhập thông tin thẻ tại MediMate</li>
                  <li><Clock3 size={18} aria-hidden="true" />Lượt dùng được cộng dồn và không hết hạn</li>
                </ul>
              )}
            </div>
          </header>

          {!plansLoading && plansError ? (
            <section className="pricing-api-message error" role="alert">
              <div>
                <strong>Chưa thể tải thông tin gói</strong>
                <span>Phần miễn phí vẫn sử dụng được. Bạn có thể thử tải lại giá và hạn mức.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPlansLoading(true);
                  setPlansError("");
                  setPlansLoadAttempt((current) => current + 1);
                }}
              >
                Thử tải lại
              </button>
            </section>
          ) : !plansLoading && paidPlans.length === 0 ? (
            <section className="pricing-api-message neutral" role="status">
              <div>
                <strong>Hiện chưa có gói trả phí khả dụng</strong>
                <span>Bạn vẫn có thể sử dụng các tiện ích công khai của MediMate.</span>
              </div>
            </section>
          ) : null}

          <section
            className={`plans-grid ${isFocusedUpgrade ? "plans-grid-focused" : ""}`}
            aria-label={isFocusedUpgrade ? "Gói nâng cấp MediMate Plus" : "So sánh các gói MediMate"}
            aria-busy={plansLoading}
          >
            {!isFocusedUpgrade && (
            <article className="pricing-plan-card pricing-plan-card-basic">
              <div className="pricing-plan-card-heading">
                <span className="plan-icon" aria-hidden="true"><Sparkles size={22} /></span>
                <span className="plan-badge">Không cần mua gói</span>
              </div>
              <p className="plan-kicker">Truy cập công khai</p>
              <h2>{freePlan?.planName || "Miễn phí"}</h2>
              <div className="price-line">
                <strong>0 ₫</strong>
                <span>Không giới hạn thời gian</span>
              </div>
              <p className="plan-summary">
                Phù hợp để tìm hiểu MediMate và chuẩn bị thông tin cơ bản trước khi đi khám.
              </p>
              <div className="plan-benefits">
                <h3>Bạn có thể sử dụng</h3>
                <ul>
                  {PUBLIC_ACCESS_BENEFITS.map((feature) => (
                    <li key={feature}>
                      <Check size={18} aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button className="plan-action plan-action-secondary" type="button" onClick={startFreePlan}>
                Khám phá MediMate
              </button>
            </article>
            )}

            {paidPlans.map((paidPlan) => {
              const paidBenefits = getPlanBenefits(paidPlan);
              const creditLimit = getServiceCreditLimit(paidPlan);
              const hasConfiguredCredits = Number.isFinite(creditLimit) && creditLimit > 0;
              const isCurrentCheckout = checkoutState.planId === paidPlan.id;

              return (
                <article className="pricing-plan-card pricing-plan-card-premium" key={paidPlan.id}>
                  <div className="pricing-plan-card-accent" aria-hidden="true" />
                  <div className="pricing-plan-card-heading">
                    <span className="plan-icon" aria-hidden="true"><CircleDollarSign size={22} /></span>
                    <span className="plan-badge plan-badge-premium">Gói lượt dùng</span>
                  </div>
                  <p className="plan-kicker">
                    {hasConfiguredCredits ? `${creditLimit.toLocaleString("vi-VN")} lượt dùng chung` : "Chưa cấu hình lượt dùng"}
                  </p>
                  <h2>{getPlanDisplayName(paidPlan.planName)}</h2>
                  <div className="price-line">
                    <strong>{formatPrice(Number(paidPlan.price) || 0)}</strong>
                    <span>/ một lần</span>
                  </div>
                  <p className="plan-summary">
                    Lượt dùng được cộng vào số dư hiện có và không hết hạn.
                  </p>
                  <div className="plan-benefits">
                    <h3>Quyền lợi trong gói</h3>
                    <ul>
                      {paidBenefits.map((feature) => (
                        <li key={feature}>
                          <Check size={18} aria-hidden="true" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {!paidBenefits.length && (
                        <li className="plan-benefit-unavailable">Gói này chưa sẵn sàng để thanh toán.</li>
                      )}
                    </ul>
                  </div>
                  <button
                    className="plan-action plan-action-primary"
                    type="button"
                    onClick={() => startPremiumUpgrade(paidPlan)}
                    disabled={!hasConfiguredCredits || ["creating", "pending"].includes(checkoutState.status)}
                  >
                    {isCurrentCheckout && checkoutState.status === "creating"
                      ? "Đang tạo thanh toán..."
                      : isCurrentCheckout && checkoutState.status === "pending"
                        ? "Đang chờ hoàn tất thanh toán"
                        : auth
                          ? !hasConfiguredCredits
                            ? "Gói chưa sẵn sàng"
                            : hasActivePackage ? `Mua thêm ${creditLimit} lượt` : `Mua ${creditLimit} lượt`
                          : "Đăng ký để mua lượt"}
                  </button>
                </article>
              );
            })}

            {plansLoading && (
              <article className="pricing-plan-card pricing-plan-card-premium" aria-busy="true">
                <LoaderCircle className="spin" size={28} aria-hidden="true" />
                <strong>Đang tải các gói lượt dùng...</strong>
              </article>
            )}

            {paidPlanUnavailable && (
              <article className="pricing-plan-card pricing-plan-card-premium pricing-plan-card-unavailable">
                <XCircle size={28} aria-hidden="true" />
                <strong>Thông tin gói lượt dùng chưa khả dụng.</strong>
              </article>
            )}
          </section>

          {!isFocusedUpgrade && (
            <section className="payment-methods" aria-label="Thông tin thanh toán">
              <span className="payment-methods-icon" aria-hidden="true">
                <CreditCard size={21} />
              </span>
              <div>
                <strong>Thanh toán qua PayOS</strong>
                <span>MediMate không yêu cầu bạn nhập thông tin thẻ trực tiếp trên trang này.</span>
              </div>
            </section>
          )}

          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {checkoutState.status !== "idle" ? checkoutState.message : ""}
          </div>
          {checkoutState.status !== "idle" && (
            <section className={`checkout-status ${checkoutState.status}`}>
              {["creating", "pending"].includes(checkoutState.status) && (
                <LoaderCircle className="spin" size={22} aria-hidden="true" />
              )}
              {checkoutState.status === "success" && <CheckCircle2 size={22} aria-hidden="true" />}
              {checkoutState.status === "error" && <XCircle size={22} aria-hidden="true" />}
              <div>
                <strong>
                  {checkoutState.status === "success"
                    ? "Thanh toán thành công"
                    : checkoutState.status === "error"
                      ? "Chưa thể hoàn tất thanh toán"
                      : "Đang chờ thanh toán"}
                </strong>
                <p>{checkoutState.message}</p>
              </div>
            </section>
          )}

          {auth && !isFocusedUpgrade && (
            <section
              className="current-subscription"
              id="current-subscription"
              aria-live="polite"
              aria-busy={subscriptionsLoading}
            >
              <div className="current-subscription-icon" aria-hidden="true">
                <ShieldCheck size={23} />
              </div>
              <div className="current-subscription-copy">
                <p className="pricing-eyebrow">Các gói của bạn</p>
                <h2>
                  {subscriptionsLoading
                    ? "Đang kiểm tra..."
                    : subscriptionsError
                      ? "Chưa thể xác định"
                      : visibleSubscriptions.length
                        ? `${visibleSubscriptions.length} gói đang sử dụng hoặc chờ thanh toán`
                        : "Chưa có gói lượt dùng"}
                </h2>
                {subscriptionsLoading ? (
                  <p>Đang đồng bộ thông tin gói của tài khoản.</p>
                ) : subscriptionsError ? (
                  <p>{subscriptionsError} Dữ liệu tài khoản của bạn chưa bị thay đổi.</p>
                ) : visibleSubscriptions.length ? (
                  <div className="current-subscription-list">
                    {visibleSubscriptions.map((subscription) => (
                      <article className="current-subscription-item" key={subscription.id}>
                        <div>
                          <strong>{getPlanDisplayName(subscription.planName)}</strong>
                          <span>{getSubscriptionStatusLabel(subscription)}</span>
                          {isActiveSubscription(subscription) && (
                            <small>Thời hạn: {getSubscriptionExpiryLabel(subscription)}</small>
                          )}
                        </div>
                        {isPendingSubscription(subscription) && (
                          <button
                            type="button"
                            disabled={Boolean(cancellingSubscriptionId)}
                            onClick={() => cancelPendingSubscription(subscription)}
                          >
                            {cancellingSubscriptionId === subscription.id ? "Đang hủy..." : "Hủy giao dịch"}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>Bạn chưa có gói trả phí đang hoạt động hoặc chờ thanh toán.</p>
                )}
              </div>
              {subscriptionsError && !subscriptionsLoading && (
                <button className="current-subscription-retry" type="button" onClick={loadSubscriptions}>
                  Thử lại
                </button>
              )}
            </section>
          )}

          {!isFocusedUpgrade && (
          <section className="faq-section" aria-labelledby="pricing-faq-title">
            <div className="faq-intro">
              <p className="pricing-eyebrow">Thông tin cần biết</p>
              <h2 id="pricing-faq-title">Câu hỏi về gói đăng ký</h2>
              <p>Những thông tin quan trọng về lượt dùng, thanh toán và số dư.</p>
            </div>
            <div className="faq-list">
              {FAQS.map(([question, answer], index) => {
                const triggerId = `pricing-faq-trigger-${index}`;
                const panelId = `pricing-faq-panel-${index}`;

                return (
                  <article className="faq-item" key={question}>
                    <h3>
                      <button
                        id={triggerId}
                        type="button"
                        aria-expanded={openFaq === index}
                        aria-controls={panelId}
                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      >
                        <span>{question}</span>
                        <ChevronDown size={20} aria-hidden="true" />
                      </button>
                    </h3>
                    <div
                      id={panelId}
                      className="faq-answer"
                      role="region"
                      aria-labelledby={triggerId}
                      hidden={openFaq !== index}
                    >
                      <p>{answer}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
          )}

          {!isFocusedUpgrade && (
          <section className="pricing-assurance" aria-labelledby="pricing-assurance-title">
            <span className="pricing-assurance-icon" aria-hidden="true">
              <ShieldCheck size={25} />
            </span>
            <div>
              <h2 id="pricing-assurance-title">Thông tin gói được hiển thị minh bạch</h2>
              <p>
                Bạn luôn có thể dùng phần công khai mà không cần mua gói. Kết quả AI chỉ mang
                tính tham khảo và không thay thế chẩn đoán hoặc điều trị của bác sĩ.
              </p>
            </div>
          </section>
          )}
        </div>
      </main>
      {!isFocusedUpgrade && <Footer />}
    </>
  );
}

export default PricingPage;
