import { ArrowRight, Check, CircleDollarSign, Info, LoaderCircle, MapPinned, ShieldCheck, Stethoscope } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscriptionPlansApi } from "../../services/api";
import { findServiceCreditQuota } from "../../services/serviceCredit";
import { getPlanBenefits, getPlanDisplayName, PUBLIC_ACCESS_BENEFITS } from "../../utils/subscriptionPlanPresentation";

const FOOTER_COLUMNS = [
  {
    title: "Bắt đầu",
    links: [
      ["Phân tích triệu chứng", "/symptom"],
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
    title: "Pháp lý và an toàn",
    links: [
      ["Quyền riêng tư", "/privacy"],
      ["Điều khoản sử dụng", "/terms"],
      ["Tuyên bố miễn trừ y tế", "/medical-disclaimer"],
    ],
  },
  {
    title: "Hỗ trợ",
    links: [
      ["Trung tâm hỗ trợ", "/support"],
      ["Cách dữ liệu được xử lý", "/privacy"],
      ["Báo lỗi dữ liệu cơ sở y tế", "/support"],
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
    .filter((plan) => plan && Number(plan.price) > 0 && findServiceCreditQuota(plan))
    .sort((left, right) => Number(left.price ?? Number.MAX_SAFE_INTEGER) - Number(right.price ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 2), [plans]);

  return (
    <section id="pricing-preview" className="care-section care-pricing-section" aria-labelledby="pricing-preview-title">
      <div className="container">
        <div className="care-section-heading care-section-header care-section-heading-single">
          <div>
            <p className="care-eyebrow">Bảng giá</p>
            <h2 id="pricing-preview-title">Bắt đầu miễn phí. Nâng cấp khi cần.</h2>
          </div>
        </div>

        <div className="care-pricing-grid" id="pricing-plans">
          <article className="care-price-card care-price-card-free">
            <div className="care-price-card-head">
              <span className="care-price-icon"><CircleDollarSign size={21} aria-hidden="true" /></span>
            </div>
            <p className="care-price-kicker">Truy cập công khai</p>
            <h3>Miễn phí</h3>
            <div className="care-price-line">
              <p className="care-price-value">0đ</p>
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
            <a className="care-price-cta" href="/symptom">
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
              {previewPlans.map((plan, index) => {
                const benefits = getPlanBenefits(plan);
                const planName = getPlanDisplayName(plan.planName);
                const badgeText = index === 0 ? "Phù hợp trải nghiệm" : "Giá trị tốt nhất";

                return (
                  <article className="care-price-card care-price-card-paid" key={plan.id || plan.planName}>
                    <div className="care-price-card-head">
                      <span className="care-price-icon"><CircleDollarSign size={21} aria-hidden="true" /></span>
                      <span className="care-plan-badge">{badgeText}</span>
                    </div>
                    <p className="care-price-kicker">Quyền lợi có hạn mức</p>
                    <h3>{planName}</h3>
                    <div className="care-price-line">
                      <p className="care-price-value">{formatPrice(plan.price)}</p>
                    </div>
                    <p className="care-price-duration">
                      <ShieldCheck size={16} aria-hidden="true" />
                      Lượt dùng được cộng dồn và không hết hạn
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
          <h2 id="landing-cta-title">Bạn muốn bắt đầu từ đâu?</h2>
          <p>Phân tích triệu chứng, hỏi trợ lý AI hoặc tìm cơ sở y tế để chuẩn bị cho buổi khám.</p>
        </div>
        <div className="care-cta-actions">
          <a className="care-button care-button-light" href="/symptom">
            <Stethoscope size={19} aria-hidden="true" />
            Phân tích triệu chứng
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
            <p>Trợ lý sức khỏe hỗ trợ phân tích triệu chứng, chuẩn bị câu hỏi, lưu lịch sử và tìm cơ sở y tế.</p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2>{column.title}</h2>
              <div className="footer-links">
                {column.links.map(([label, href]) => (
                  <a href={href} key={`${label}-${href}`}>{label}</a>
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
