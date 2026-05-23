import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Home, MapPin } from "lucide-react";
import { getStoredAuth, subscriptionPlansApi } from "../services/api";
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

function PricingPage() {
  const auth = getStoredAuth();
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [openFaq, setOpenFaq] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [apiPlans, setApiPlans] = useState([]);
  const paidPlan = useMemo(() => apiPlans.find((plan) => Number(plan.price) > 0), [apiPlans]);
  const freePlan = useMemo(() => apiPlans.find((plan) => Number(plan.price) === 0), [apiPlans]);
  const monthlyPrice = Number(paidPlan?.price) || 149000;
  const yearlyPrice = Math.round(monthlyPrice * 0.8);
  const currentPrice = billingCycle === "yearly" ? yearlyPrice : monthlyPrice;

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
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="pricing-page">
      <style>{styles}</style>
      <nav className="pricing-nav" aria-label="Điều hướng bảng giá">
        <button type="button" onClick={() => { window.location.href = auth ? "/dashboard" : "/"; }}>
          <ArrowLeft size={18} />
          {auth ? "Về tư vấn" : "Về trang chủ"}
        </button>
        <div>
          <button type="button" onClick={() => { window.location.href = "/"; }}>
            <Home size={17} />
            Trang chủ
          </button>
          <button type="button" onClick={() => { window.location.href = "/map"; }}>
            <MapPin size={17} />
            Bản đồ
          </button>
        </div>
      </nav>
      <section className="pricing-hero">
        <p className="mini-label">Bảng giá</p>
        <h1>Minh bạch. Không phí ẩn. Huỷ bất cứ lúc nào.</h1>
        <div className="billing-toggle" role="group" aria-label="Chu kỳ thanh toán">
          <button className={billingCycle === "monthly" ? "active" : ""} type="button" onClick={() => setBillingCycle("monthly")}>Tháng</button>
          <button className={billingCycle === "yearly" ? "active" : ""} type="button" onClick={() => setBillingCycle("yearly")}>Năm · giảm 20%</button>
        </div>
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
          <button type="button" onClick={() => { window.location.href = "/signup"; }}>Bắt đầu ngay</button>
        </article>

        <article className="plan-card-premium">
          <div className="premium-stripe" />
          <span className="popular">✦ PHỔ BIẾN</span>
          <code>PREMIUM</code>
          <h2>{paidPlan?.planName || "MediMate+"}</h2>
          <div className="price-line"><strong>{formatPrice(currentPrice)}</strong><span>/ tháng</span></div>
          <p>Mở khoá tư vấn sau khám, kiểm tra thuốc và theo dõi hành trình chăm sóc sức khoẻ.</p>
          <ul>
            {FEATURES.map((feature) => <li key={feature}>✓ {feature}</li>)}
          </ul>
          <button type="button" onClick={() => {
            trackUxEvent("pricing_trial_clicked", { billingCycle });
            setShowModal(true);
          }}>Dùng thử 14 ngày</button>
        </article>
      </section>

      <section className="payment-methods">
        Thanh toán qua: <strong>VNPay</strong> · <strong>MoMo</strong> · <strong>Thẻ quốc tế</strong>
      </section>

      <section className="faq-section">
        {FAQS.map(([question, answer], index) => (
          <article className="faq-item" key={question}>
            <button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)}>
              <strong>{question}</strong>
              <span>{openFaq === index ? "−" : "+"}</span>
            </button>
            <div className="faq-answer" style={{ maxHeight: openFaq === index ? 120 : 0 }}>
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

      {showModal && (
        <div className="pricing-modal" role="dialog" aria-modal="true">
          <div>
            <strong>MediMate+ sắp ra mắt</strong>
            <p>Tính năng nâng cấp sẽ được mở khi cổng thanh toán hoàn tất.</p>
            <button type="button" onClick={() => setShowModal(false)}>Đã hiểu</button>
          </div>
        </div>
      )}
    </main>
  );
}

const styles = `
.pricing-page { min-height: 100svh; background: var(--bg); color: var(--ink); padding: 34px 20px 58px; }
.pricing-nav { width: min(960px, 100%); margin: 0 auto 28px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.pricing-nav div { display: flex; gap: 8px; }
.pricing-nav button { min-height: 40px; display: inline-flex; align-items: center; gap: 8px; border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); padding: 0 14px; font-weight: 900; }
.pricing-nav > button { background: var(--lime); box-shadow: 3px 3px 0 var(--ink); }
.pricing-hero { text-align: center; width: min(820px, 100%); margin: 0 auto; }
.mini-label { display: inline-flex; align-items: center; gap: 9px; margin: 0 0 14px; color: var(--lime-dark); font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.mini-label::before { content: ""; width: 12px; height: 2px; background: currentColor; }
.pricing-hero h1 { margin: 0; font-family: var(--display); font-size: clamp(34px, 6vw, 60px); line-height: 1.05; }
.billing-toggle { display: inline-grid; grid-template-columns: 1fr 1fr; gap: 4px; border: 1.5px solid var(--ink); border-radius: 999px; background: var(--paper); padding: 4px; margin-top: 22px; box-shadow: 3px 3px 0 var(--ink); }
.billing-toggle button { border: 0; border-radius: 999px; background: transparent; padding: 10px 16px; color: var(--muted); font-weight: 900; }
.billing-toggle button.active { background: var(--lime); color: var(--ink); }
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
.plans-grid article > button, .pricing-cta button, .pricing-modal button { min-height: 46px; border: 1.5px solid var(--ink); border-radius: 9px; padding: 0 16px; font-weight: 900; }
.plans-grid article > button { width: 100%; background: #fff; }
.plan-card-premium > button { background: var(--lime); color: var(--ink); box-shadow: 3px 3px 0 #000; }
.payment-methods { width: min(860px, 100%); margin: 22px auto 0; text-align: center; color: var(--muted); font-weight: 800; }
.payment-methods strong { color: var(--ink); }
.faq-section { width: min(860px, 100%); margin: 34px auto 0; display: grid; gap: 10px; }
.faq-item { border: 1.5px solid var(--ink); border-radius: 10px; background: var(--paper); overflow: hidden; }
.faq-item > button { width: 100%; display: flex; justify-content: space-between; gap: 14px; border: 0; background: transparent; padding: 16px; color: var(--ink); text-align: left; }
.faq-item span { font-size: 24px; line-height: 1; }
.faq-answer { overflow: hidden; transition: max-height 220ms ease; }
.faq-answer p { margin: 0; padding: 0 16px 16px; color: var(--muted); line-height: 1.65; }
.pricing-cta { width: min(960px, 100%); margin: 38px auto 0; display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 22px; align-items: center; border: 1.5px solid var(--ink); border-radius: 14px; background: var(--lime); padding: clamp(24px, 5vw, 44px); box-shadow: 6px 6px 0 var(--ink); }
.pricing-cta h2 { margin: 0; font-family: var(--display); font-size: clamp(28px, 5vw, 46px); line-height: 1.08; }
.pricing-cta div:last-child { display: flex; flex-wrap: wrap; gap: 10px; }
.pricing-cta button:first-child { background: var(--ink); color: #fff; }
.pricing-cta button:last-child { background: transparent; }
.pricing-modal { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; background: rgba(17,20,18,.48); padding: 18px; }
.pricing-modal > div { width: min(420px, 100%); border: 1.5px solid var(--ink); border-radius: 14px; background: var(--paper); box-shadow: 5px 5px 0 var(--ink); padding: 24px; }
.pricing-modal strong { font-size: 22px; }
.pricing-modal p { color: var(--muted); line-height: 1.6; }
.pricing-modal button { width: 100%; background: var(--lime); }
@media (max-width: 760px) {
  .pricing-page { padding-inline: 14px; }
  .pricing-nav { align-items: stretch; flex-direction: column; }
  .pricing-nav button, .pricing-nav div { width: 100%; }
  .pricing-nav div { display: grid; grid-template-columns: 1fr 1fr; }
  .pricing-nav button { justify-content: center; }
  .plans-grid, .pricing-cta { grid-template-columns: 1fr; }
  .billing-toggle { width: 100%; }
  .pricing-cta div:last-child, .pricing-cta button { width: 100%; }
}
`;

export default PricingPage;
