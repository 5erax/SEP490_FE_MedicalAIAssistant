import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
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
  hasPremiumAccess,
  subscriptionPlansApi,
  userSubscriptionsApi,
} from "../services/api";
import { navigate } from "../router/navigation";
import { getReturnToFromSearch, rememberReturnTo, withReturnTo } from "../router/returnIntent";
import { trackUxEvent } from "../utils/analytics";
import {
  getPlanBenefits,
  getPlanDisplayName,
  PUBLIC_ACCESS_BENEFITS,
} from "../utils/subscriptionPlanPresentation";

const FAQS = [
  [
    "Tôi có thể hủy gia hạn không?",
    "Có. Khi gói đang bật gia hạn tự động, bạn có thể hủy gia hạn trong phần gói hiện tại. Quyền lợi vẫn được hiển thị đến ngày kết thúc mà hệ thống trả về.",
  ],
  [
    "Phần miễn phí bao gồm gì?",
    "Bạn có thể sử dụng các tính năng công khai để phân tích triệu chứng ở mức tham khảo, tìm cơ sở y tế trên bản đồ và hỏi trợ lý AI trên trang chủ.",
  ],
  [
    "Quyền lợi gói đăng ký được xác định thế nào?",
    "Tên gói, giá, thời hạn và các hạn mức được lấy từ gói đang hoạt động trên hệ thống MediMate.",
  ],
];

function formatPrice(value) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function getPlanCycle(plan) {
  return Number(plan?.durationInDays) >= 300 ? "yearly" : "monthly";
}

function getDurationLabel(durationInDays) {
  const duration = Number(durationInDays);
  if (!Number.isFinite(duration) || duration <= 0) return "";
  if (duration === 365) return "1 năm";
  if (duration === 30) return "30 ngày";
  return `${duration.toLocaleString("vi-VN")} ngày`;
}

function isActiveSubscription(subscription) {
  const status = String(subscription?.statusName ?? "").toLowerCase();
  return status === "active" || Number(subscription?.status) === 1;
}

function PricingPage() {
  const { confirmAction, showToast } = useFeedback();
  const [auth] = useState(() => getStoredAuth());
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [autoRenew, setAutoRenew] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [apiPlans, setApiPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [plansLoadAttempt, setPlansLoadAttempt] = useState(0);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(Boolean(auth));
  const [subscriptionsError, setSubscriptionsError] = useState("");
  const [checkoutState, setCheckoutState] = useState({ status: "idle", message: "", paymentId: "" });
  const isPremium = hasPremiumAccess(auth);
  const paidPlans = useMemo(() => apiPlans.filter((plan) => Number(plan.price) > 0), [apiPlans]);
  const availableCycles = useMemo(
    () => new Set(paidPlans.map(getPlanCycle)),
    [paidPlans],
  );
  const selectedBillingCycle = availableCycles.has(billingCycle)
    ? billingCycle
    : paidPlans[0]
      ? getPlanCycle(paidPlans[0])
      : billingCycle;
  const paidPlan = useMemo(
    () => paidPlans.find((plan) => getPlanCycle(plan) === selectedBillingCycle) ?? paidPlans[0],
    [paidPlans, selectedBillingCycle],
  );
  const freePlan = useMemo(() => apiPlans.find((plan) => Number(plan.price) === 0), [apiPlans]);
  const activeSubscription = useMemo(
    () => subscriptions.find(isActiveSubscription) ?? null,
    [subscriptions],
  );
  const paidBenefits = useMemo(
    () => getPlanBenefits(paidPlan?.featureLimitJson),
    [paidPlan],
  );
  const currentPrice = Number(paidPlan?.price) || 0;
  const returnTo = getReturnToFromSearch();

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

  function startFreePlan() {
    navigate("/symptom");
  }

  async function startPremiumUpgrade() {
    trackUxEvent("pricing_trial_clicked", {
      billingCycle: selectedBillingCycle,
      authenticated: Boolean(auth),
    });

    if (!auth) {
      navigate(withReturnTo("/signup", returnTo || "/pricing"));
      return;
    }

    if (activeSubscription || isPremium) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("current-subscription")?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
      });
      return;
    }

    if (!paidPlan?.id) {
      setCheckoutState({
        status: "error",
        paymentId: "",
        message: plansLoading
          ? "Danh sách gói đang được tải."
          : "Chưa có gói trả phí khả dụng để tạo thanh toán.",
      });
      return;
    }

    setCheckoutState({
      status: "creating",
      message: "Đang tạo liên kết và chuyển bạn đến PayOS...",
      paymentId: "",
    });

    try {
      const response = await userSubscriptionsApi.checkout(paidPlan.id, autoRenew);
      const checkout = response.data;
      if (!checkout?.paymentUrl) {
        throw new Error("Chưa tạo được liên kết thanh toán hợp lệ. Vui lòng thử lại.");
      }

      setCheckoutState({
        status: "pending",
        paymentId: checkout.paymentId || "",
        message: "Đang chuyển đến trang thanh toán PayOS.",
      });
      window.location.assign(checkout.paymentUrl);
    } catch {
      setCheckoutState({
        status: "error",
        paymentId: "",
        message: "Chưa thể tạo liên kết thanh toán lúc này. Vui lòng thử lại sau.",
      });
    }
  }

  async function cancelCurrentSubscription() {
    if (!activeSubscription?.id) return;
    const confirmed = await confirmAction({
      title: "Hủy gia hạn MediMate Plus?",
      message: "Bạn vẫn sử dụng quyền lợi đến ngày kết thúc hiện tại, nhưng gói sẽ không tiếp tục gia hạn.",
      confirmLabel: "Hủy gia hạn",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await userSubscriptionsApi.cancel(activeSubscription.id);
      await loadSubscriptions();
      showToast({
        type: "success",
        title: "Đã hủy gia hạn",
        message: "Gói hiện tại vẫn có hiệu lực đến ngày kết thúc.",
      });
    } catch {
      showToast({
        type: "error",
        title: "Không thể hủy gói",
        message: "Vui lòng thử lại sau ít phút.",
      });
    }
  }

  const paidPriceLabel = plansLoading
    ? "Đang tải giá..."
    : currentPrice
      ? formatPrice(currentPrice)
      : plansError
        ? "Không khả dụng"
        : "Chưa có gói khả dụng";
  const paidPlanUnavailable = !plansLoading && Boolean(plansError);

  return (
    <>
      <Navbar variant="landing" />
      <main className="pricing-page">
        <div className="pricing-shell">
          <a className="pricing-back-link" href={auth ? "/dashboard" : "/"}>
            <ArrowLeft size={17} aria-hidden="true" />
            {auth ? "Quay lại tư vấn" : "Quay lại trang chủ"}
          </a>

          <header
            className={`pricing-hero ${
              !plansLoading && paidPlans.length === 0 ? "pricing-hero-single" : ""
            }`}
          >
            <div className="pricing-hero-copy">
              <p className="pricing-eyebrow">Bảng giá MediMate</p>
              <h1>Chọn gói phù hợp với cách bạn sử dụng MediMate</h1>
              <p className="pricing-hero-description">
                So sánh rõ phần có thể dùng ngay và quyền lợi có hạn mức của gói đăng ký.
                Giá và thời hạn bên dưới được lấy từ cấu hình đang hoạt động.
              </p>
              <ul className="pricing-trust-list" aria-label="Thông tin chính về gói">
                <li><ShieldCheck size={18} aria-hidden="true" />Không yêu cầu nhập thông tin thẻ tại MediMate</li>
                <li><Clock3 size={18} aria-hidden="true" />Quyền lợi hiển thị theo thời hạn của từng gói</li>
              </ul>
            </div>

            {(plansLoading || paidPlans.length > 0) && (
              <aside className="billing-panel" aria-labelledby="billing-panel-title">
              <div className="billing-panel-heading">
                <span className="billing-panel-icon" aria-hidden="true">
                  <CalendarDays size={20} />
                </span>
                <div>
                  <strong id="billing-panel-title">Chọn thời hạn</strong>
                  <small>Chỉ chu kỳ đang được hệ thống cung cấp mới có thể chọn.</small>
                </div>
              </div>
              <div className="billing-toggle" role="group" aria-label="Chu kỳ thanh toán">
                <button
                  className={selectedBillingCycle === "monthly" ? "active" : ""}
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  disabled={!availableCycles.has("monthly")}
                  aria-pressed={selectedBillingCycle === "monthly"}
                >
                  Theo tháng
                </button>
                <button
                  className={selectedBillingCycle === "yearly" ? "active" : ""}
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  disabled={!availableCycles.has("yearly")}
                  aria-pressed={selectedBillingCycle === "yearly"}
                >
                  Theo năm
                </button>
              </div>
              </aside>
            )}
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
            className="plans-grid"
            aria-label="So sánh các gói MediMate"
            aria-busy={plansLoading}
          >
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

            <article className={`pricing-plan-card pricing-plan-card-premium ${
              paidPlanUnavailable ? "pricing-plan-card-unavailable" : ""
            }`}>
              <div className="pricing-plan-card-accent" aria-hidden="true" />
              <div className="pricing-plan-card-heading">
                <span className="plan-icon" aria-hidden="true"><CircleDollarSign size={22} /></span>
                <span className="plan-badge plan-badge-premium">Gói đăng ký</span>
              </div>
              <p className="plan-kicker">Quyền lợi có hạn mức</p>
              <h2>{paidPlan ? getPlanDisplayName(paidPlan.planName) : "MediMate Plus"}</h2>
              <div className="price-line">
                <strong className={plansLoading ? "pricing-price-loading" : ""}>
                  {plansLoading && <LoaderCircle className="spin" size={24} aria-hidden="true" />}
                  {paidPriceLabel}
                </strong>
                {paidPlan && <span>/ {getDurationLabel(paidPlan.durationInDays)}</span>}
              </div>
              <p className="plan-summary">
                {paidPlanUnavailable
                  ? "Giá và hạn mức sẽ hiển thị lại khi kết nối được khôi phục."
                  : "Dành cho người cần sử dụng thường xuyên các tính năng có giới hạn theo gói."}
              </p>
              <div className="plan-benefits">
                <h3>Quyền lợi trong gói</h3>
                <ul>
                  {paidBenefits.length > 0 ? paidBenefits.map((feature) => (
                    <li key={feature}>
                      <Check size={18} aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  )) : (
                    <li className="plan-benefit-unavailable">
                      {plansLoading
                        ? "Đang tải hạn mức quyền lợi..."
                        : paidPlanUnavailable
                          ? "Quyền lợi chưa khả dụng."
                          : "Chưa có hạn mức quyền lợi được công bố."}
                    </li>
                  )}
                </ul>
              </div>
              {auth && paidPlan && !isPremium && !activeSubscription && (
                <label className="auto-renew-option">
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(event) => setAutoRenew(event.target.checked)}
                  />
                  <span>
                    <strong>Tự động gia hạn</strong>
                    <small>Có thể hủy gia hạn trong phần gói hiện tại.</small>
                  </span>
                </label>
              )}
              <button
                className="plan-action plan-action-primary"
                type="button"
                onClick={startPremiumUpgrade}
                disabled={
                  ["creating", "pending"].includes(checkoutState.status)
                  || (!paidPlan && !isPremium && !activeSubscription)
                }
              >
                {checkoutState.status === "creating"
                  ? "Đang tạo thanh toán..."
                  : checkoutState.status === "pending"
                    ? "Đang chờ hoàn tất thanh toán"
                    : !paidPlan && !isPremium && !activeSubscription
                      ? "Tạm thời chưa thể đăng ký"
                  : auth
                    ? (isPremium || activeSubscription ? "Quản lý gói hiện tại" : "Thanh toán qua PayOS")
                    : "Đăng ký để nâng cấp"}
              </button>
            </article>
          </section>

          <section className="payment-methods" aria-label="Thông tin thanh toán">
            <span className="payment-methods-icon" aria-hidden="true">
              <CreditCard size={21} />
            </span>
            <div>
              <strong>Thanh toán qua PayOS</strong>
              <span>MediMate không yêu cầu bạn nhập thông tin thẻ trực tiếp trên trang này.</span>
            </div>
          </section>

          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {checkoutState.status !== "idle" ? checkoutState.message : ""}
          </div>
          {checkoutState.status !== "idle" && (
            <section className={`checkout-status ${checkoutState.status}`}>
              {["creating", "pending"].includes(checkoutState.status) && (
                <LoaderCircle className="spin" size={22} aria-hidden="true" />
              )}
              {checkoutState.status === "error" && <XCircle size={22} aria-hidden="true" />}
              <div>
                <strong>
                  {checkoutState.status === "error"
                      ? "Chưa thể hoàn tất thanh toán"
                      : "Đang chuyển đến PayOS"}
                </strong>
                <p>{checkoutState.message}</p>
              </div>
            </section>
          )}

          {auth && (
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
                <p className="pricing-eyebrow">Gói của bạn</p>
                <h2>
                  {subscriptionsLoading
                    ? "Đang kiểm tra..."
                    : subscriptionsError
                      ? "Chưa thể xác định"
                      : activeSubscription?.planName || "Gói miễn phí"}
                </h2>
                {subscriptionsLoading ? (
                  <p>Đang đồng bộ thông tin gói của tài khoản.</p>
                ) : subscriptionsError ? (
                  <p>{subscriptionsError} Dữ liệu tài khoản của bạn chưa bị thay đổi.</p>
                ) : activeSubscription ? (
                  <p>
                    Có hiệu lực đến{" "}
                    <strong>
                      {activeSubscription.endDate
                        ? new Date(activeSubscription.endDate).toLocaleDateString("vi-VN")
                        : "đang cập nhật"}
                    </strong>.
                    {" "}Gia hạn tự động: <strong>{activeSubscription.autoRenew ? "Bật" : "Tắt"}</strong>.
                  </p>
                ) : (
                  <p>Bạn chưa có gói trả phí đang hoạt động.</p>
                )}
              </div>
              {subscriptionsError && !subscriptionsLoading && (
                <button className="current-subscription-retry" type="button" onClick={loadSubscriptions}>
                  Thử lại
                </button>
              )}
              {!subscriptionsError && activeSubscription?.autoRenew && (
                <button type="button" onClick={cancelCurrentSubscription}>Hủy gia hạn</button>
              )}
            </section>
          )}

          <section className="faq-section" aria-labelledby="pricing-faq-title">
            <div className="faq-intro">
              <p className="pricing-eyebrow">Thông tin cần biết</p>
              <h2 id="pricing-faq-title">Câu hỏi về gói đăng ký</h2>
              <p>Những thông tin quan trọng về quyền lợi, thanh toán và gia hạn.</p>
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
        </div>
      </main>
      <Footer />
    </>
  );
}

export default PricingPage;
