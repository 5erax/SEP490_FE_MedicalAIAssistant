import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Home,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  authApi,
  getStoredAuth,
  hasPremiumAccess,
  paymentsApi,
  subscriptionPlansApi,
  userSubscriptionsApi,
} from "../services/api";
import { useFeedback } from "../components/feedback/feedbackContext";
import { navigate } from "../router/navigation";
import { getReturnToFromSearch, rememberReturnTo, withReturnTo } from "../router/returnIntent";
import { trackUxEvent } from "../utils/analytics";
import { getPlanBenefits, PUBLIC_ACCESS_BENEFITS } from "../utils/subscriptionPlanPresentation";

const FAQS = [
  ["Tôi có thể hủy gia hạn không?", "Có. Khi gói đang bật gia hạn tự động, bạn có thể hủy gia hạn trong phần gói hiện tại. Quyền lợi vẫn được hiển thị đến ngày kết thúc mà hệ thống trả về."],
  ["Phần miễn phí bao gồm gì?", "Bạn có thể mở các trang công khai để xem hướng dẫn triệu chứng, bản đồ cơ sở y tế và hỏi trợ lý trên trang chủ ở mức tham khảo."],
  ["Quyền lợi gói đăng ký được xác định thế nào?", "Tên gói, giá, thời hạn và các hạn mức bên dưới được lấy từ gói đang hoạt động trên hệ thống MediMate."],
];

function formatPrice(value) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function getPlanCycle(plan) {
  return Number(plan?.durationInDays) >= 300 ? "yearly" : "monthly";
}

function isActiveSubscription(subscription) {
  const status = String(subscription?.statusName ?? "").toLowerCase();
  return status === "active" || Number(subscription?.status) === 1;
}

function isSuccessfulPayment(payment) {
  const status = String(payment?.statusName ?? "").toLowerCase();
  return Boolean(payment?.paidAt) || ["paid", "completed", "success", "succeeded"].includes(status);
}

function isTerminalPayment(payment) {
  const status = String(payment?.statusName ?? "").toLowerCase();
  return ["failed", "cancelled", "canceled", "expired", "refunded"].includes(status);
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
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(Boolean(auth));
  const [checkoutState, setCheckoutState] = useState({ status: "idle", message: "", paymentId: "" });
  const pollingRef = useRef(null);
  const isPremium = hasPremiumAccess(auth);
  const paidPlans = useMemo(() => apiPlans.filter((plan) => Number(plan.price) > 0), [apiPlans]);
  const paidPlan = useMemo(
    () => paidPlans.find((plan) => getPlanCycle(plan) === billingCycle) ?? paidPlans[0],
    [billingCycle, paidPlans],
  );
  const freePlan = useMemo(() => apiPlans.find((plan) => Number(plan.price) === 0), [apiPlans]);
  const activeSubscription = useMemo(
    () => subscriptions.find(isActiveSubscription) ?? null,
    [subscriptions],
  );
  const availableCycles = useMemo(
    () => new Set(paidPlans.map(getPlanCycle)),
    [paidPlans],
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
    try {
      const response = await userSubscriptionsApi.me();
      const items = Array.isArray(response.data) ? response.data : [];
      setSubscriptions(items);
      return items;
    } catch (error) {
      setSubscriptions([]);
      showToast({
        type: "error",
        title: "Không thể tải gói đăng ký",
        message: error.message,
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
      .catch((error) => {
        if (!active) return;
        setApiPlans([]);
        setPlansError(error.message);
      })
      .finally(() => {
        if (active) setPlansLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!auth) return undefined;
    let active = true;

    userSubscriptionsApi.me()
      .then((response) => {
        if (!active) return;
        setSubscriptions(Array.isArray(response.data) ? response.data : []);
      })
      .catch((error) => {
        if (!active) return;
        setSubscriptions([]);
        showToast({
          type: "error",
          title: "Không thể tải gói đăng ký",
          message: error.message,
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
    navigate("/medical-assistant");
  }

  async function pollPayment(paymentId) {
    if (pollingRef.current) window.clearInterval(pollingRef.current);

    let attempts = 0;
    const check = async () => {
      attempts += 1;
      try {
        const response = await paymentsApi.getMyPayment(paymentId);
        const payment = response.data;

        if (isSuccessfulPayment(payment)) {
          window.clearInterval(pollingRef.current);
          pollingRef.current = null;
          setCheckoutState({
            status: "success",
            paymentId,
            message: "Thanh toán thành công. Gói MediMate+ đang được kích hoạt.",
          });
          await loadSubscriptions();
          try {
            await authApi.refresh();
          } catch {
            // Subscription state is still refreshed from /user-subscriptions/me.
          }
          showToast({
            type: "success",
            title: "Thanh toán thành công",
            message: "Quyền lợi MediMate+ đã được cập nhật.",
          });
          return true;
        }

        if (isTerminalPayment(payment) || attempts >= 100) {
          window.clearInterval(pollingRef.current);
          pollingRef.current = null;
          setCheckoutState({
            status: "error",
            paymentId,
            message: isTerminalPayment(payment)
              ? `Giao dịch ${payment?.statusName || "không thành công"}.`
              : "Chưa nhận được xác nhận thanh toán. Bạn có thể kiểm tra lại gói đăng ký sau.",
          });
          return true;
        }
      } catch {
        if (attempts >= 5) {
          window.clearInterval(pollingRef.current);
          pollingRef.current = null;
          setCheckoutState({
            status: "error",
            paymentId,
            message: "Chưa thể xác minh giao dịch lúc này. Bạn có thể kiểm tra lại lịch sử thanh toán sau.",
          });
          return true;
        }
      }
      return false;
    };

    const completed = await check();
    if (!completed) {
      pollingRef.current = window.setInterval(check, 3000);
    }
  }

  async function startPremiumUpgrade() {
    trackUxEvent("pricing_trial_clicked", { billingCycle, authenticated: Boolean(auth) });

    if (!auth) {
      navigate(withReturnTo("/signup", returnTo || "/pricing"));
      return;
    }

    if (activeSubscription || isPremium) {
      document.getElementById("current-subscription")?.scrollIntoView({ behavior: "smooth" });
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

    const paymentWindow = window.open("about:blank", "medimate-payos");
    if (paymentWindow) paymentWindow.opener = null;
    setCheckoutState({ status: "creating", message: "Đang tạo liên kết thanh toán PayOS...", paymentId: "" });

    try {
      const response = await userSubscriptionsApi.checkout(paidPlan.id, autoRenew);
      const checkout = response.data;
      if (!checkout?.paymentUrl || !checkout?.paymentId) {
        paymentWindow?.close();
        throw new Error("Chưa tạo được liên kết thanh toán hợp lệ. Vui lòng thử lại.");
      }

      setCheckoutState({
        status: "pending",
        paymentId: checkout.paymentId,
        message: "Trang PayOS đã được mở. Hoàn tất thanh toán ở tab mới; trang này sẽ tự cập nhật.",
      });

      if (paymentWindow) {
        paymentWindow.location.replace(checkout.paymentUrl);
      } else {
        window.location.href = checkout.paymentUrl;
        return;
      }

      pollPayment(checkout.paymentId);
    } catch (error) {
      paymentWindow?.close();
      setCheckoutState({ status: "error", paymentId: "", message: error.message });
    }
  }

  async function cancelCurrentSubscription() {
    if (!activeSubscription?.id) return;
    const confirmed = await confirmAction({
      title: "Hủy gia hạn MediMate+?",
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
    } catch (error) {
      showToast({ type: "error", title: "Không thể hủy gói", message: error.message });
    }
  }

  return (
    <main className="pricing-page">
      <style>{styles}</style>
      <style>{refreshStyles}</style>
      <nav className="pricing-nav" aria-label="Điều hướng bảng giá">
        <a className="pricing-nav-back" href={auth ? "/dashboard" : "/"}>
          <ArrowLeft size={18} />
          {auth ? "Về tư vấn" : "Về trang chủ"}
        </a>
        <div className="pricing-nav-links">
          <a href="/">
            <Home size={17} />
            Trang chủ
          </a>
          <a href="/map">
            <MapPin size={17} />
            Bản đồ
          </a>
        </div>
      </nav>

      <header className="pricing-hero">
        <div className="pricing-hero-copy">
          <p className="mini-label">Bảng giá MediMate</p>
          <h1>Chọn quyền lợi phù hợp với nhu cầu của bạn</h1>
          <p className="pricing-hero-description">
            Dùng các tiện ích công khai khi cần tra cứu nhanh, hoặc đăng ký thêm hạn mức
            cho những tính năng được hệ thống cung cấp.
          </p>
        </div>
        <div className="billing-panel">
          <span>Chu kỳ gói</span>
          <div className="billing-toggle" role="group" aria-label="Chu kỳ thanh toán">
            <button
              className={billingCycle === "monthly" ? "active" : ""}
              type="button"
              onClick={() => setBillingCycle("monthly")}
              disabled={!availableCycles.has("monthly")}
              aria-pressed={billingCycle === "monthly"}
            >
              Theo tháng
            </button>
            <button
              className={billingCycle === "yearly" ? "active" : ""}
              type="button"
              onClick={() => setBillingCycle("yearly")}
              disabled={!availableCycles.has("yearly")}
              aria-pressed={billingCycle === "yearly"}
            >
              Theo năm
            </button>
          </div>
          <small>Chỉ những chu kỳ đang hoạt động mới có thể lựa chọn.</small>
        </div>
      </header>

      {!plansLoading && paidPlans.length === 0 && (
        <div className="pricing-api-message error" role="alert">
          Hiện chưa có gói trả phí khả dụng. Bạn vẫn có thể sử dụng các tiện ích công khai.
        </div>
      )}
      {plansError && (
        <div className="pricing-api-message error" role="alert">
          Chưa thể tải thông tin gói lúc này. Vui lòng thử lại sau.
        </div>
      )}

      <section className="plans-grid" aria-label="So sánh các gói MediMate">
        <article className="plan-card plan-card-basic">
          <div className="plan-card-heading">
            <span className="plan-icon" aria-hidden="true"><Sparkles size={22} /></span>
            <span className="plan-badge">Không cần mua gói</span>
          </div>
          <p className="plan-kicker">Truy cập công khai</p>
          <h2>{freePlan?.planName || "Miễn phí"}</h2>
          <div className="price-line">
            <strong>0 ₫</strong>
            <span>không giới hạn thời gian</span>
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
            Mở phần miễn phí
          </button>
        </article>

        <article className="plan-card plan-card-premium">
          <div className="plan-card-heading">
            <span className="plan-icon" aria-hidden="true"><CircleDollarSign size={22} /></span>
            <span className="plan-badge plan-badge-premium">Gói đăng ký</span>
          </div>
          <p className="plan-kicker">Quyền lợi có hạn mức</p>
          <h2>{paidPlan?.planName || "MediMate+"}</h2>
          <div className="price-line">
            <strong>{plansLoading ? "Đang tải..." : currentPrice ? formatPrice(currentPrice) : "Chưa cấu hình"}</strong>
            {paidPlan && <span>/ {paidPlan.durationInDays} ngày</span>}
          </div>
          <p className="plan-summary">
            Tên gói, mức giá và quyền lợi được hiển thị theo cấu hình đang hoạt động.
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
              <li className="disabled">Chưa có hạn mức quyền lợi được công bố.</li>
            )}
          </ul>
          </div>
          {auth && !isPremium && !activeSubscription && (
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
            disabled={checkoutState.status === "creating" || (Boolean(auth) && !isPremium && !activeSubscription && !paidPlan)}
          >
            {checkoutState.status === "creating"
              ? "Đang tạo thanh toán..."
              : auth
                ? (isPremium || activeSubscription ? "Quản lý gói hiện tại" : "Thanh toán qua PayOS")
                : "Đăng ký để nâng cấp"}
          </button>
        </article>
      </section>

      <section className="payment-methods">
        <ShieldCheck size={20} aria-hidden="true" />
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
          {["creating", "pending"].includes(checkoutState.status) && <LoaderCircle className="spin" size={22} />}
          {checkoutState.status === "success" && <CheckCircle2 size={22} />}
          {checkoutState.status === "error" && <XCircle size={22} />}
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

      {auth && (
        <section className="current-subscription" id="current-subscription">
          <div>
            <p className="mini-label">Gói của bạn</p>
            <h2>{subscriptionsLoading ? "Đang kiểm tra..." : activeSubscription?.planName || "Gói miễn phí"}</h2>
            {activeSubscription ? (
              <p>
                Có hiệu lực đến{" "}
                <strong>{activeSubscription.endDate ? new Date(activeSubscription.endDate).toLocaleDateString("vi-VN") : "đang cập nhật"}</strong>.
                {" "}Gia hạn tự động: <strong>{activeSubscription.autoRenew ? "Bật" : "Tắt"}</strong>.
              </p>
            ) : (
              <p>Bạn chưa có subscription trả phí đang hoạt động.</p>
            )}
          </div>
          {activeSubscription?.autoRenew && (
            <button type="button" onClick={cancelCurrentSubscription}>Hủy gia hạn</button>
          )}
        </section>
      )}

      <section className="faq-section" aria-labelledby="pricing-faq-title">
        <div className="faq-intro">
          <p className="mini-label">Thông tin cần biết</p>
          <h2 id="pricing-faq-title">Câu hỏi về gói đăng ký</h2>
          <p>Thông tin ngắn gọn về quyền lợi, thanh toán và gia hạn.</p>
        </div>
        <div className="faq-list">
          {FAQS.map(([question, answer], index) => (
            <article className="faq-item" key={question}>
              <button
                type="button"
                aria-expanded={openFaq === index}
                aria-controls={`pricing-faq-${index}`}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <strong>{question}</strong>
                <ChevronDown size={20} aria-hidden="true" />
              </button>
              <div
                id={`pricing-faq-${index}`}
                className="faq-answer"
                hidden={openFaq !== index}
              >
                <p>{answer}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pricing-cta">
        <span className="pricing-cta-icon" aria-hidden="true"><CalendarDays size={24} /></span>
        <div>
          <h2>Chủ động chọn gói theo nhu cầu thực tế</h2>
          <p>Bạn vẫn có thể dùng phần công khai mà không cần đăng ký gói trả phí.</p>
        </div>
      </section>

    </main>
  );
}

const styles = `
.pricing-page { min-height: 100svh; background: var(--bg); color: var(--ink); padding: 34px 20px 58px; }
.pricing-nav { width: min(960px, 100%); margin: 0 auto 28px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.pricing-nav div { display: flex; gap: 8px; }
.pricing-nav a { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); padding: 0 14px; font-weight: 900; }
.pricing-nav > a { background: var(--lime); box-shadow: 3px 3px 0 var(--ink); }
.pricing-hero { text-align: center; width: min(820px, 100%); margin: 0 auto; }
.mini-label { display: inline-flex; align-items: center; gap: 9px; margin: 0 0 14px; color: var(--lime-dark); font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.mini-label::before { content: ""; width: 12px; height: 2px; background: currentColor; }
.pricing-hero h1 { margin: 0; font-family: var(--display); font-size: clamp(34px, 6vw, 60px); line-height: 1.05; }
.billing-toggle { display: inline-grid; grid-template-columns: 1fr 1fr; gap: 4px; border: 1.5px solid var(--ink); border-radius: 999px; background: var(--paper); padding: 4px; margin-top: 22px; box-shadow: 3px 3px 0 var(--ink); }
.billing-toggle button { border: 0; border-radius: 999px; background: transparent; padding: 10px 16px; color: var(--muted); font-weight: 900; }
.billing-toggle button.active { background: var(--lime); color: var(--ink); }
.billing-toggle button:disabled { cursor: not-allowed; opacity: .42; }
.pricing-api-message { width: min(720px, 100%); margin: 18px auto 0; border: 1px solid #be123c; border-radius: 10px; background: #fff1f2; color: #9f1239; padding: 12px 14px; font-weight: 800; line-height: 1.55; }
.plans-grid { width: min(860px, 100%); margin: 34px auto 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.plan-card-basic, .plan-card-premium { position: relative; overflow: hidden; border: 1.5px solid var(--ink); border-radius: 12px; padding: 26px; box-shadow: 5px 5px 0 var(--ink); }
.plan-card-basic { background: var(--paper); }
.plan-card-premium { background: var(--ink); color: #fff; }
.premium-stripe { position: absolute; inset: 0 0 auto; height: 4px; background: var(--lime); }
.popular { display: inline-flex; border-radius: 999px; background: var(--lime); color: var(--ink); padding: 7px 10px; font-size: 11px; font-weight: 900; }
.plans-grid code { display: block; margin-top: 18px; color: var(--lime-dark); font-weight: 900; letter-spacing: .1em; }
.plan-card-premium code { color: var(--lime); }
.plans-grid h2 { margin: 10px 0; font-size: 30px; }
.price-line { display: flex; align-items: baseline; gap: 7px; margin: 12px 0; }
.price-line strong { font-size: clamp(30px, 5vw, 42px); }
.price-line span, .plans-grid p { color: var(--muted); line-height: 1.6; }
.plan-card-premium .price-line span, .plan-card-premium p { color: rgba(255,255,255,.66); }
.plans-grid ul { display: grid; gap: 12px; border-top: 1px solid var(--line); margin: 22px 0; padding: 22px 0 0; list-style: none; }
.plan-card-premium ul { border-color: rgba(255,255,255,.14); }
.plans-grid li { color: var(--ink); font-weight: 800; line-height: 1.45; }
.plan-card-basic li.disabled { color: var(--subtle); }
.plan-card-premium li { color: rgba(255,255,255,.86); }
.plan-card-premium li::first-letter { color: var(--lime); }
.auto-renew-option { display: flex; align-items: flex-start; gap: 10px; margin: -4px 0 18px; border: 1px solid rgba(255,255,255,.22); border-radius: 9px; padding: 12px; color: #fff; cursor: pointer; }
.auto-renew-option input { width: 18px; height: 18px; margin-top: 2px; accent-color: var(--lime); }
.auto-renew-option span, .auto-renew-option strong, .auto-renew-option small { display: block; }
.auto-renew-option small { margin-top: 3px; color: rgba(255,255,255,.68); line-height: 1.45; }
.plans-grid article > button, .pricing-cta button { min-height: 46px; border: 1.5px solid var(--ink); border-radius: 9px; padding: 0 16px; font-weight: 900; }
.plans-grid article > button { width: 100%; background: #fff; }
.plans-grid article > button:disabled { cursor: not-allowed; opacity: .58; box-shadow: none; }
.plan-card-premium > button { background: var(--lime); color: var(--ink); box-shadow: 3px 3px 0 #000; }
.payment-methods { width: min(860px, 100%); margin: 22px auto 0; text-align: center; color: var(--muted); font-weight: 800; }
.payment-methods strong { color: var(--ink); }
.checkout-status, .current-subscription { width: min(860px, 100%); margin: 18px auto 0; border: 1.5px solid var(--ink); border-radius: 12px; background: var(--paper); box-shadow: 3px 3px 0 var(--ink); padding: 18px; }
.checkout-status { display: flex; align-items: flex-start; gap: 12px; }
.checkout-status.success { background: #ecfdf5; color: #166534; }
.checkout-status.error { background: #fff1f2; color: #9f1239; }
.checkout-status.pending, .checkout-status.creating { background: #eff6ff; color: #1d4ed8; }
.checkout-status strong, .checkout-status p { display: block; margin: 0; }
.checkout-status p { margin-top: 4px; line-height: 1.55; }
.spin { animation: pricingSpin .8s linear infinite; }
.current-subscription { display: flex; justify-content: space-between; align-items: center; gap: 18px; }
.current-subscription h2 { margin: 0; font-size: 28px; }
.current-subscription p:not(.mini-label) { margin: 8px 0 0; color: var(--muted); line-height: 1.6; }
.current-subscription > button { flex: 0 0 auto; min-height: 42px; border: 1.5px solid #be123c; border-radius: 9px; background: #fff1f2; color: #9f1239; padding: 0 14px; font-weight: 900; }
.faq-section { width: min(860px, 100%); margin: 34px auto 0; display: grid; gap: 10px; }
.faq-item { border: 1.5px solid var(--ink); border-radius: 10px; background: var(--paper); overflow: hidden; }
.faq-item > button { width: 100%; display: flex; justify-content: space-between; gap: 14px; border: 0; background: transparent; padding: 16px; color: var(--ink); text-align: left; }
.faq-item span { font-size: 24px; line-height: 1; }
.faq-answer { overflow: hidden; }
.faq-answer p { margin: 0; padding: 0 16px 16px; color: var(--muted); line-height: 1.65; }
.pricing-cta { width: min(960px, 100%); margin: 38px auto 0; display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 22px; align-items: center; border: 1.5px solid var(--ink); border-radius: 14px; background: var(--lime); padding: clamp(24px, 5vw, 44px); box-shadow: 6px 6px 0 var(--ink); }
.pricing-cta h2 { margin: 0; font-family: var(--display); font-size: clamp(28px, 5vw, 46px); line-height: 1.08; }
.pricing-cta div:last-child { display: flex; flex-wrap: wrap; gap: 10px; }
.pricing-cta button:first-child { background: var(--ink); color: #fff; }
.pricing-cta button:last-child { background: transparent; }
@keyframes pricingSpin { to { transform: rotate(360deg); } }
@media (max-width: 760px) {
  .pricing-page { padding-inline: 14px; }
  .pricing-nav { align-items: stretch; flex-direction: column; }
  .pricing-nav a, .pricing-nav div { width: 100%; }
  .pricing-nav div { display: grid; grid-template-columns: 1fr 1fr; }
  .plans-grid, .pricing-cta { grid-template-columns: 1fr; }
  .billing-toggle { width: 100%; }
  .current-subscription { align-items: stretch; flex-direction: column; }
  .current-subscription > button { width: 100%; }
  .pricing-cta div:last-child, .pricing-cta button { width: 100%; }
}
`;

const refreshStyles = `
.pricing-page {
  --pricing-ink: #0b2c35;
  --pricing-muted: #526b70;
  --pricing-subtle: #6b7e82;
  --pricing-teal: #0f827b;
  --pricing-teal-dark: #09655f;
  --pricing-teal-soft: #e9f7f3;
  --pricing-mint: #dff4e9;
  --pricing-line: #cbded9;
  --pricing-surface: #fff;
  --pricing-surface-soft: #f7fbf9;
  --pricing-focus: #e09b32;
  min-height: 100svh;
  padding: 24px 20px 64px;
  background:
    radial-gradient(circle at 8% 10%, rgba(15, 130, 123, .09), transparent 24rem),
    radial-gradient(circle at 92% 8%, rgba(176, 224, 144, .13), transparent 26rem),
    #f7faf7;
  color: var(--pricing-ink);
}
.pricing-page :where(a, button, input):focus-visible {
  outline: 3px solid var(--pricing-focus);
  outline-offset: 3px;
}
.pricing-nav {
  width: min(1120px, 100%);
  min-height: 58px;
  margin: 0 auto 46px;
  padding: 8px;
  border: 1px solid rgba(148, 177, 169, .45);
  border-radius: 16px;
  background: rgba(255, 255, 255, .86);
  box-shadow: 0 12px 36px rgba(27, 71, 66, .07);
  backdrop-filter: blur(14px);
}
.pricing-nav a {
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--pricing-ink);
  padding: 0 14px;
  font-size: 14px;
  font-weight: 750;
  box-shadow: none;
}
.pricing-nav a:hover {
  background: var(--pricing-teal-soft);
  color: var(--pricing-teal-dark);
}
.pricing-nav .pricing-nav-back {
  background: var(--pricing-teal-soft);
  color: var(--pricing-teal-dark);
  box-shadow: none;
}
.pricing-nav-links {
  display: flex;
  gap: 4px;
}
.pricing-hero {
  width: min(1120px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(290px, .65fr);
  gap: clamp(32px, 6vw, 84px);
  align-items: end;
  text-align: left;
}
.pricing-hero-copy {
  max-width: 720px;
}
.pricing-page .mini-label,
.plan-kicker {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 13px;
  color: var(--pricing-teal-dark);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.pricing-page .mini-label::before {
  width: 24px;
  height: 1px;
  background: currentColor;
}
.pricing-hero h1 {
  max-width: 780px;
  margin: 0;
  color: var(--pricing-ink);
  font-family: var(--display);
  font-size: clamp(40px, 5.7vw, 68px);
  line-height: .98;
  letter-spacing: -.045em;
}
.pricing-hero-description {
  max-width: 640px;
  margin: 24px 0 0;
  color: var(--pricing-muted);
  font-size: clamp(16px, 1.6vw, 19px);
  line-height: 1.7;
}
.billing-panel {
  border: 1px solid var(--pricing-line);
  border-radius: 16px;
  background: rgba(255, 255, 255, .82);
  padding: 18px;
}
.billing-panel > span {
  display: block;
  margin-bottom: 10px;
  color: var(--pricing-ink);
  font-size: 13px;
  font-weight: 800;
}
.billing-panel > small {
  display: block;
  margin-top: 10px;
  color: var(--pricing-subtle);
  font-size: 12px;
  line-height: 1.5;
}
.billing-toggle {
  width: 100%;
  margin: 0;
  border: 1px solid var(--pricing-line);
  border-radius: 11px;
  background: var(--pricing-surface-soft);
  padding: 4px;
  box-shadow: none;
}
.billing-toggle button {
  min-height: 42px;
  padding: 0 12px;
  color: var(--pricing-muted);
  font-size: 14px;
  font-weight: 750;
}
.billing-toggle button.active {
  background: var(--pricing-teal);
  color: #fff;
  box-shadow: 0 5px 14px rgba(15, 130, 123, .18);
}
.pricing-api-message {
  width: min(1120px, 100%);
  margin: 24px auto 0;
  border-width: 1px;
  border-radius: 12px;
  box-shadow: none;
}
.plans-grid {
  width: min(1120px, 100%);
  margin: 44px auto 0;
  gap: 22px;
  align-items: stretch;
}
.plans-grid .plan-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--pricing-line);
  border-radius: 20px;
  background: var(--pricing-surface);
  color: var(--pricing-ink);
  padding: clamp(24px, 3.3vw, 38px);
  box-shadow: 0 20px 55px rgba(22, 66, 61, .08);
}
.plans-grid .plan-card-premium {
  border-color: #79bdb5;
  background:
    linear-gradient(145deg, rgba(233, 247, 243, .9), rgba(255, 255, 255, .96) 50%),
    var(--pricing-surface);
  color: var(--pricing-ink);
  box-shadow: 0 24px 65px rgba(15, 130, 123, .12);
}
.plan-card-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
}
.plan-icon {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  background: var(--pricing-teal-soft);
  color: var(--pricing-teal-dark);
}
.plan-badge {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  border: 1px solid var(--pricing-line);
  border-radius: 999px;
  background: var(--pricing-surface-soft);
  color: var(--pricing-muted);
  padding: 0 11px;
  font-size: 12px;
  font-weight: 800;
}
.plan-badge-premium {
  border-color: #97cbc4;
  background: var(--pricing-teal-soft);
  color: var(--pricing-teal-dark);
}
.plans-grid .plan-kicker {
  margin-bottom: 8px;
}
.plans-grid h2 {
  margin: 0;
  color: var(--pricing-ink);
  font-size: clamp(28px, 3vw, 36px);
  letter-spacing: -.025em;
}
.plans-grid .price-line {
  min-height: 56px;
  margin: 16px 0 10px;
  align-items: baseline;
  flex-wrap: wrap;
}
.plans-grid .price-line strong {
  color: var(--pricing-ink);
  font-size: clamp(36px, 4vw, 48px);
  line-height: 1;
  letter-spacing: -.04em;
}
.plans-grid .price-line span,
.plans-grid .plan-summary,
.plan-card-premium .price-line span,
.plan-card-premium .plan-summary {
  color: var(--pricing-muted);
}
.plans-grid .plan-summary {
  min-height: 54px;
  margin: 0;
  line-height: 1.65;
}
.plan-benefits {
  flex: 1;
  margin-top: 26px;
  border-top: 1px solid var(--pricing-line);
  padding-top: 22px;
}
.plan-benefits h3 {
  margin: 0;
  font-size: 14px;
}
.plans-grid .plan-benefits ul {
  margin: 15px 0 24px;
  border: 0;
  padding: 0;
  gap: 13px;
}
.plans-grid .plan-benefits li,
.plan-card-premium .plan-benefits li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--pricing-muted);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.55;
}
.plan-benefits li svg {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--pricing-teal);
}
.auto-renew-option {
  min-height: 62px;
  margin: -4px 0 18px;
  border: 1px solid var(--pricing-line);
  border-radius: 12px;
  background: rgba(255, 255, 255, .78);
  color: var(--pricing-ink);
  padding: 12px 14px;
}
.auto-renew-option input {
  width: 20px;
  height: 20px;
  accent-color: var(--pricing-teal);
}
.auto-renew-option small {
  color: var(--pricing-muted);
}
.plans-grid .plan-action {
  width: 100%;
  min-height: 50px;
  border: 1px solid var(--pricing-teal);
  border-radius: 11px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 800;
  box-shadow: none;
}
.plans-grid .plan-action-secondary {
  background: var(--pricing-surface);
  color: var(--pricing-teal-dark);
}
.plans-grid .plan-action-primary {
  background: var(--pricing-teal);
  color: #fff;
  box-shadow: 0 10px 24px rgba(15, 130, 123, .18);
}
.plans-grid .plan-action:not(:disabled):hover {
  transform: translateY(-1px);
}
.plans-grid .plan-action-primary:not(:disabled):hover {
  background: var(--pricing-teal-dark);
}
.payment-methods {
  width: min(1120px, 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 11px;
  margin: 20px auto 0;
  color: var(--pricing-muted);
  text-align: left;
  font-weight: 500;
}
.payment-methods svg {
  flex: 0 0 auto;
  color: var(--pricing-teal);
}
.payment-methods strong,
.payment-methods span {
  display: block;
}
.payment-methods strong {
  margin-bottom: 2px;
  color: var(--pricing-ink);
  font-size: 13px;
}
.payment-methods span {
  font-size: 12px;
  line-height: 1.5;
}
.checkout-status,
.current-subscription {
  width: min(1120px, 100%);
  border: 1px solid var(--pricing-line);
  border-radius: 15px;
  box-shadow: none;
}
.current-subscription {
  padding: clamp(20px, 3vw, 28px);
}
.current-subscription h2 {
  color: var(--pricing-ink);
}
.current-subscription > button {
  min-height: 44px;
}
.faq-section {
  width: min(1120px, 100%);
  margin: 72px auto 0;
  display: grid;
  grid-template-columns: minmax(220px, .7fr) minmax(0, 1.3fr);
  gap: clamp(30px, 7vw, 90px);
  align-items: start;
}
.faq-intro h2 {
  margin: 0;
  color: var(--pricing-ink);
  font-family: var(--display);
  font-size: clamp(30px, 4vw, 44px);
  line-height: 1.08;
  letter-spacing: -.035em;
}
.faq-intro > p:last-child {
  margin: 15px 0 0;
  color: var(--pricing-muted);
  line-height: 1.65;
}
.faq-list {
  display: grid;
  gap: 10px;
}
.faq-item {
  border: 1px solid var(--pricing-line);
  border-radius: 13px;
  background: rgba(255, 255, 255, .78);
}
.faq-item > button {
  min-height: 58px;
  align-items: center;
  padding: 16px 18px;
  color: var(--pricing-ink);
}
.faq-item > button svg {
  flex: 0 0 auto;
  color: var(--pricing-teal);
  transition: transform .2s ease;
}
.faq-item > button[aria-expanded="true"] svg {
  transform: rotate(180deg);
}
.faq-answer p {
  padding: 0 18px 18px;
  color: var(--pricing-muted);
}
.pricing-cta {
  width: min(1120px, 100%);
  margin: 64px auto 0;
  display: flex;
  grid-template-columns: none;
  gap: 17px;
  align-items: center;
  border: 1px solid var(--pricing-line);
  border-radius: 18px;
  background: var(--pricing-teal-soft);
  padding: clamp(22px, 4vw, 32px);
  box-shadow: none;
}
.pricing-cta-icon {
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  background: var(--pricing-surface);
  color: var(--pricing-teal-dark);
}
.pricing-cta h2 {
  margin: 0;
  color: var(--pricing-ink);
  font-family: inherit;
  font-size: clamp(20px, 2.5vw, 26px);
  line-height: 1.25;
  letter-spacing: -.02em;
}
.pricing-cta p {
  margin: 6px 0 0;
  color: var(--pricing-muted);
  line-height: 1.55;
}
@media (max-width: 820px) {
  .pricing-page {
    padding-inline: 14px;
  }
  .pricing-nav {
    margin-bottom: 34px;
  }
  .pricing-hero,
  .plans-grid,
  .faq-section {
    grid-template-columns: 1fr;
  }
  .pricing-hero {
    gap: 26px;
  }
  .billing-panel {
    max-width: 520px;
  }
  .plans-grid {
    margin-top: 34px;
  }
  .plans-grid .plan-summary {
    min-height: 0;
  }
  .faq-section {
    margin-top: 58px;
    gap: 26px;
  }
}
@media (max-width: 520px) {
  .pricing-page {
    padding-top: 10px;
  }
  .pricing-nav {
    min-height: auto;
    align-items: stretch;
    flex-direction: column;
    border-radius: 14px;
  }
  .pricing-nav .pricing-nav-back {
    width: 100%;
  }
  .pricing-nav .pricing-nav-links {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .pricing-nav-links a {
    width: 100%;
  }
  .pricing-hero h1 {
    font-size: clamp(36px, 12vw, 50px);
  }
  .billing-panel {
    padding: 14px;
  }
  .plans-grid .plan-card {
    padding: 22px 18px;
    border-radius: 16px;
  }
  .plan-card-heading {
    margin-bottom: 23px;
  }
  .plans-grid .price-line strong {
    font-size: 36px;
  }
  .payment-methods {
    align-items: flex-start;
    justify-content: flex-start;
    padding-inline: 4px;
  }
  .checkout-status,
  .current-subscription {
    border-radius: 13px;
  }
  .pricing-cta {
    align-items: flex-start;
    margin-top: 48px;
  }
}
[data-theme="dark"] .pricing-page {
  --pricing-ink: #e8f3f1;
  --pricing-muted: #abc1bd;
  --pricing-subtle: #8fa8a3;
  --pricing-teal: #55c4b9;
  --pricing-teal-dark: #84d8cf;
  --pricing-teal-soft: #153b39;
  --pricing-mint: #173f39;
  --pricing-line: #365b56;
  --pricing-surface: #102c2d;
  --pricing-surface-soft: #173436;
  background:
    radial-gradient(circle at 8% 10%, rgba(85, 196, 185, .08), transparent 24rem),
    #0b2224;
}
[data-theme="dark"] .pricing-nav,
[data-theme="dark"] .billing-panel,
[data-theme="dark"] .faq-item {
  background: rgba(16, 44, 45, .88);
}
[data-theme="dark"] .plans-grid .plan-card-premium {
  background: linear-gradient(145deg, rgba(21, 59, 57, .92), rgba(16, 44, 45, .98));
}
[data-theme="dark"] .auto-renew-option {
  background: rgba(16, 44, 45, .76);
}
@media (prefers-reduced-motion: reduce) {
  .pricing-page *,
  .pricing-page *::before,
  .pricing-page *::after {
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
  }
}
@media (forced-colors: active) {
  .pricing-page,
  .pricing-nav,
  .billing-panel,
  .plans-grid .plan-card,
  .faq-item,
  .pricing-cta {
    background: Canvas;
    color: CanvasText;
  }
  .pricing-nav,
  .billing-panel,
  .plans-grid .plan-card,
  .faq-item,
  .pricing-cta,
  .plans-grid .plan-action {
    border: 1px solid CanvasText;
  }
  .billing-toggle button.active,
  .plans-grid .plan-action-primary {
    background: Highlight;
    color: HighlightText;
  }
}
`;

export default PricingPage;
