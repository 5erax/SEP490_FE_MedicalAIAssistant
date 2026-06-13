import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Home, LoaderCircle, MapPin, XCircle } from "lucide-react";
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

const FEATURES = [
  "Phân tích triệu chứng cơ bản",
  "Gợi ý chuyên khoa",
  "Tìm kiếm cơ sở y tế",
  "Tư vấn AI 24/7 sau khám",
  "Cảnh báo tương tác thuốc",
  "Theo dõi xu hướng sức khoẻ",
];

const FAQS = [
  ["Tôi có thể huỷ bất cứ lúc nào không?", "Có. Bạn có thể huỷ gia hạn bất cứ lúc nào trong phần gói đăng ký."],
  ["Dữ liệu của tôi có được bảo mật không?", "Dữ liệu sức khoẻ được thiết kế để chỉ phục vụ trải nghiệm chăm sóc cá nhân của bạn và cần được bảo vệ theo quyền truy cập tài khoản."],
  ["Gói miễn phí có giới hạn số lần dùng không?", "Gói miễn phí phù hợp để trải nghiệm các chức năng cốt lõi. Một số tính năng chuyên sâu sẽ thuộc MediMate+."],
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
    navigate("/dashboard");
  }

  async function pollPayment(paymentId) {
    if (pollingRef.current) window.clearInterval(pollingRef.current);

    let attempts = 0;
    const check = async () => {
      attempts += 1;
      try {
        const response = await paymentsApi.get(paymentId);
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
      } catch (error) {
        if (attempts >= 5) {
          window.clearInterval(pollingRef.current);
          pollingRef.current = null;
          setCheckoutState({ status: "error", paymentId, message: error.message });
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
          : "Backend chưa cấu hình gói subscription trả phí để tạo thanh toán.",
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
        throw new Error("Backend không trả về paymentUrl hoặc paymentId hợp lệ.");
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
      <nav className="pricing-nav" aria-label="Điều hướng bảng giá">
        <a href={auth ? "/dashboard" : "/"}>
          <ArrowLeft size={18} />
          {auth ? "Về tư vấn" : "Về trang chủ"}
        </a>
        <div>
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
      <section className="pricing-hero">
        <p className="mini-label">Bảng giá</p>
        <h1>Minh bạch. Không phí ẩn. Huỷ bất cứ lúc nào.</h1>
        <div className="billing-toggle" role="group" aria-label="Chu kỳ thanh toán">
          <button
            className={billingCycle === "monthly" ? "active" : ""}
            type="button"
            onClick={() => setBillingCycle("monthly")}
            disabled={!availableCycles.has("monthly")}
            aria-pressed={billingCycle === "monthly"}
          >
            Tháng
          </button>
          <button
            className={billingCycle === "yearly" ? "active" : ""}
            type="button"
            onClick={() => setBillingCycle("yearly")}
            disabled={!availableCycles.has("yearly")}
            aria-pressed={billingCycle === "yearly"}
          >
            Năm
          </button>
        </div>
        {!plansLoading && paidPlans.length === 0 && (
          <div className="pricing-api-message error" role="alert">
            Backend chưa có gói subscription trả phí đang hoạt động. Quản trị viên cần tạo hoặc kích hoạt plan trước khi checkout.
          </div>
        )}
        {plansError && <div className="pricing-api-message error" role="alert">{plansError}</div>}
      </section>

      <section className="plans-grid">
        <article className="plan-card-basic">
          <code>MIỄN PHÍ</code>
          <h2>{freePlan?.planName || "Cơ bản"}</h2>
          <div className="price-line"><strong>0 ₫</strong><span>/ mãi mãi</span></div>
          <p>Phù hợp để bắt đầu kiểm tra triệu chứng và tìm chuyên khoa phù hợp.</p>
          <ul>
            {FEATURES.map((feature, index) => (
              <li className={index > 2 ? "disabled" : ""} key={feature}>{index > 2 ? "×" : "✓"} {feature}</li>
            ))}
          </ul>
          <button type="button" onClick={startFreePlan}>Bắt đầu ngay</button>
        </article>

        <article className="plan-card-premium">
          <div className="premium-stripe" />
          <span className="popular">✦ PHỔ BIẾN</span>
          <code>PREMIUM</code>
          <h2>{paidPlan?.planName || "MediMate+"}</h2>
          <div className="price-line">
            <strong>{plansLoading ? "Đang tải..." : currentPrice ? formatPrice(currentPrice) : "Chưa cấu hình"}</strong>
            {paidPlan && <span>/ {paidPlan.durationInDays} ngày</span>}
          </div>
          <p>Mở khoá tư vấn sau khám, kiểm tra thuốc và theo dõi hành trình chăm sóc sức khoẻ.</p>
          <ul>
            {FEATURES.map((feature) => <li key={feature}>✓ {feature}</li>)}
          </ul>
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
        Thanh toán an toàn qua <strong>PayOS</strong>.
      </section>

      {checkoutState.status !== "idle" && (
        <section className={`checkout-status ${checkoutState.status}`} aria-live="polite">
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
                <strong>{activeSubscription.endDate ? new Date(activeSubscription.endDate).toLocaleDateString("vi-VN") : "khi backend cập nhật"}</strong>.
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

      <section className="faq-section">
        {FAQS.map(([question, answer], index) => (
          <article className="faq-item" key={question}>
            <button
              type="button"
              aria-expanded={openFaq === index}
              aria-controls={`pricing-faq-${index}`}
              onClick={() => setOpenFaq(openFaq === index ? null : index)}
            >
              <strong>{question}</strong>
              <span aria-hidden="true">{openFaq === index ? "−" : "+"}</span>
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
      </section>

      <section className="pricing-cta">
        <div>
          <h2>Bắt đầu hành trình chăm sóc sức khoẻ thông minh ngay hôm nay.</h2>
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

export default PricingPage;
