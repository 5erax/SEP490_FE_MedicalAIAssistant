import { ArrowRight, CalendarDays, Check, CircleDollarSign, Info, LoaderCircle, MapPinned, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscriptionPlansApi } from "../../services/api";
import { getPlanBenefits, getPlanDisplayName, PUBLIC_ACCESS_BENEFITS } from "../../utils/subscriptionPlanPresentation";

const FOOTER_COLUMNS = [
  {
    title: "Bắt đầu",
    links: [
      ["Mô tả triệu chứng", "/medical-assistant"],
      ["Tìm cơ sở y tế", "/map"],
      ["Xem gói dịch vụ", "/pricing"],
    ],
  },
  {
    title: "Tài khoản",
    links: [
      ["Đăng nhập", "/login"],
      ["Tạo tài khoản", "/signup"],
      ["Đăng ký bác sĩ bằng lời mời", "/register-doctor"],
    ],
  },
  {
    title: "Thông tin",
    links: [
      ["Hỗ trợ", "/support"],
      ["Quyền riêng tư", "/privacy"],
      ["Tuyên bố miễn trừ y tế", "/medical-disclaimer"],
    ],
  },
];

function getArrayData(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
}

function formatPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price)) return "Chưa cập nhật giá";
  return `${price.toLocaleString("vi-VN")}đ`;
}

function formatDuration(value) {
  const days = Number(value);
  if (!Number.isInteger(days) || days <= 0) return "Chưa cập nhật thời hạn";
  if (days % 365 === 0) return `${days / 365} năm`;
  if (days % 30 === 0) return `${days / 30} tháng`;
  return `${days} ngày`;
}

function formatBillingPeriod(value) {
  const days = Number(value);
  if (!Number.isInteger(days) || days <= 0) return "chưa cập nhật";
  if (days === 365) return "năm";
  if (days % 365 === 0) return `${days / 365} năm`;
  if (days === 30) return "tháng";
  if (days % 30 === 0) return `${days / 30} tháng`;
  return `${days} ngày`;
}

export function PricingPreviewSection() {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    subscriptionPlansApi.active()
      .then((response) => {
        if (!active) return;
        setPlans(getArrayData(response));
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setPlans([]);
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  const previewPlans = useMemo(() => [...plans]
    .filter((plan) => plan && (plan.id || plan.planName))
    .sort((left, right) => Number(left.price ?? Number.MAX_SAFE_INTEGER) - Number(right.price ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 2), [plans]);

  return (
    <section id="pricing-preview" className="care-section care-pricing-section" aria-labelledby="pricing-preview-title">
      <div className="container">
        <div className="care-pricing-heading">
          <div>
            <p className="care-eyebrow">Bảng giá</p>
            <h2 id="pricing-preview-title">Bắt đầu miễn phí. Nâng cấp khi cần.</h2>
          </div>
          <div>
            <p>
              So sánh những gì bạn có thể dùng ngay trên các trang công khai với quyền lợi có hạn mức của gói đăng ký.
              Giá và hạn mức gói trả phí được lấy trực tiếp từ hệ thống.
            </p>
          </div>
        </div>

        <div className="care-pricing-grid" id="pricing-plans">
          <article className="care-price-card care-price-card-free">
            <div className="care-price-card-head">
              <span className="care-price-icon"><Sparkles size={21} aria-hidden="true" /></span>
            </div>
            <p className="care-price-kicker">Truy cập công khai</p>
            <h3>Miễn phí</h3>
            <div className="care-price-line">
              <p className="care-price-value">0đ</p>
              <span>cho các tính năng công khai</span>
            </div>
            <p className="care-price-duration">
              <ShieldCheck size={16} aria-hidden="true" />
              Phù hợp để làm quen và tìm thông tin trước khi đi khám
            </p>
            <div className="care-price-benefits">
              <strong>Bạn có thể dùng</strong>
              <ul>
                {PUBLIC_ACCESS_BENEFITS.map((benefit) => (
                  <li key={benefit}>
                    <Check size={16} aria-hidden="true" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <a className="care-price-cta" href="/medical-assistant">
              Bắt đầu miễn phí
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </article>

          {status === "loading" && (
            <div className="care-pricing-state care-price-slot" role="status">
              <LoaderCircle className="care-spin" size={24} aria-hidden="true" />
              <div>
                <strong>Đang tải gói đăng ký…</strong>
                <span>Giá và hạn mức sẽ xuất hiện ngay khi hệ thống phản hồi.</span>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="care-pricing-state care-price-slot" role="status">
              <CircleDollarSign size={24} aria-hidden="true" />
              <div>
                <strong>Chưa thể tải gói đăng ký.</strong>
                <span>Phần miễn phí vẫn dùng được. Bạn có thể mở bảng giá để thử lại.</span>
              </div>
              <a href="/pricing">Mở bảng giá</a>
            </div>
          )}

          {status === "ready" && previewPlans.length === 0 && (
            <div className="care-pricing-state care-price-slot" role="status">
              <CircleDollarSign size={24} aria-hidden="true" />
              <div>
                <strong>Chưa có gói đăng ký đang hoạt động.</strong>
                <span>Hệ thống hiện chỉ hiển thị các tính năng công khai.</span>
              </div>
            </div>
          )}

          {previewPlans.length > 0 && (
            <>
              {previewPlans.map((plan) => {
                const benefits = getPlanBenefits(plan.featureLimitJson);
                const planName = getPlanDisplayName(plan.planName);

                return (
                  <article className="care-price-card care-price-card-paid" key={plan.id || plan.planName}>
                    <div className="care-price-card-head">
                      <span className="care-price-icon"><CircleDollarSign size={21} aria-hidden="true" /></span>
                    </div>
                    <p className="care-price-kicker">Quyền lợi có hạn mức</p>
                    <h3>{planName}</h3>
                    <div className="care-price-line">
                      <p className="care-price-value">{formatPrice(plan.price)}</p>
                      <span>/ {formatBillingPeriod(plan.durationInDays)}</span>
                    </div>
                    <p className="care-price-duration">
                      <CalendarDays size={16} aria-hidden="true" />
                      Có hiệu lực trong {formatDuration(plan.durationInDays)} sau khi kích hoạt
                    </p>
                    <div className="care-price-benefits">
                      <strong>Quyền lợi trong gói</strong>
                      {benefits.length > 0 ? (
                        <ul>
                          {benefits.map((benefit) => (
                            <li key={benefit}>
                              <Check size={16} aria-hidden="true" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Chưa có giới hạn quyền lợi riêng được công bố.</p>
                      )}
                    </div>
                    <a className="care-price-cta care-price-cta-primary" href="/pricing">
                      Đăng ký {planName}
                      <ArrowRight size={16} aria-hidden="true" />
                    </a>
                  </article>
                );
              })}
            </>
          )}
        </div>

        <p className="care-pricing-note">
          <Info size={16} aria-hidden="true" />
          <span>
            Các tính năng miễn phí vẫn có giới hạn và không thay thế chẩn đoán y khoa.
            Thanh toán chỉ bắt đầu trên trang bảng giá sau khi bạn chọn gói và đăng nhập.
          </span>
        </p>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="care-section care-cta-section" aria-labelledby="landing-cta-title">
      <div className="container care-cta-card">
        <div>
          <span className="care-cta-icon"><ShieldCheck size={22} aria-hidden="true" /></span>
          <p className="care-eyebrow">Bắt đầu theo cách phù hợp với bạn</p>
          <h2 id="landing-cta-title">Bạn có thể bắt đầu bằng điều mình đang cảm nhận.</h2>
          <p>Không cần dùng thuật ngữ y khoa. Hãy mô tả ngắn gọn và bổ sung thông tin khi được hỏi.</p>
        </div>
        <div className="care-cta-actions">
          <a className="care-button care-button-light" href="/medical-assistant">
            <Stethoscope size={19} aria-hidden="true" />
            Mô tả triệu chứng
          </a>
          <a className="care-button care-button-outline-light" href="/map">
            <MapPinned size={19} aria-hidden="true" />
            Tìm cơ sở y tế
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer care-footer">
      <div className="container">
        <div className="care-footer-grid">
          <div className="care-footer-brand">
            <a className="brand" href="/" aria-label="MediMate AI - Trang chủ">
              <span className="brand-mark" aria-hidden="true">
                <img src="/logo.svg" alt="" width="36" height="36" />
              </span>
              <span>MediMate AI</span>
            </a>
            <p>Trợ lý định hướng trước khi đi khám, dựa trên thông tin bạn cung cấp và dữ liệu hiện có.</p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2>{column.title}</h2>
              <div className="footer-links">
                {column.links.map(([label, href]) => (
                  <a href={href} key={href}>{label}</a>
                ))}
              </div>
            </nav>
          ))}
        </div>

        <div className="footer-bottom">
          <span>© 2026 MediMate AI.</span>
          <span>Kết quả AI chỉ mang tính tham khảo, không thay thế bác sĩ.</span>
        </div>
      </div>
    </footer>
  );
}
