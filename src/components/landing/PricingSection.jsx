const PLANS = [
  {
    badge: "Miễn phí",
    name: "Cơ bản",
    price: "0đ",
    period: "mãi mãi",
    desc: "Cho người mới bắt đầu theo dõi sức khỏe cá nhân.",
    cta: "Bắt đầu ngay",
    features: [
      "Phân tích triệu chứng cơ bản",
      "Gợi ý chuyên khoa phù hợp",
      "Lưu 3 hồ sơ sức khỏe",
      "Nhắc lịch uống thuốc",
    ],
  },
  {
    badge: "Phổ biến",
    name: "MediMate+",
    price: "149.000đ",
    period: "mỗi tháng",
    desc: "Cho người cần theo dõi sức khỏe nghiêm túc hơn.",
    cta: "Dùng thử 14 ngày",
    highlight: true,
    features: [
      "Phân tích nâng cao và hỏi thêm ngữ cảnh",
      "Giải thích xét nghiệm chi tiết",
      "Hồ sơ sức khỏe không giới hạn",
      "Cảnh báo tương tác thuốc",
      "Tóm tắt để chia sẻ với bác sĩ",
    ],
  },
];

const FAQS = [
  {
    q: "MediMate AI có thay thế bác sĩ không?",
    a: "Không. Ứng dụng hỗ trợ sàng lọc thông tin, chuẩn bị câu hỏi và theo dõi sức khỏe, nhưng quyết định chẩn đoán và điều trị vẫn thuộc về chuyên gia y tế.",
  },
  {
    q: "Dữ liệu sức khỏe có được bảo mật không?",
    a: "Có. Landing page đang mô tả định hướng sản phẩm với các lớp bảo mật, phân quyền truy cập và nguyên tắc tối thiểu hóa dữ liệu cá nhân.",
  },
  {
    q: "Có dùng được cho người lớn tuổi không?",
    a: "Có. Nội dung được viết bằng tiếng Việt dễ hiểu, giao diện ưu tiên chữ rõ, thao tác ít bước và nhắc nhở theo lịch.",
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="section">
      <div className="container">
        <p className="eyebrow">Bảng giá</p>
        <h2 className="section-title">
          Minh bạch, dễ bắt đầu và có thể <em>nâng cấp khi cần</em>.
        </h2>

        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <article
              className={`price-card ${plan.highlight ? "highlight" : ""}`}
              key={plan.name}
            >
              <span className="price-badge">{plan.badge}</span>
              <h3>{plan.name}</h3>
              <p>{plan.desc}</p>
              <div className="price">
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </div>
              <ul className="plan-list">
                {plan.features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>
              <a
                className={`btn ${plan.highlight ? "btn-primary" : "btn-ghost"}`}
                href="#contact"
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section id="contact" className="section">
      <div className="container">
        <div className="cta-band">
          <div>
            <h2>Bắt đầu xây thói quen chăm sóc sức khỏe chủ động hơn.</h2>
            <p>Miễn phí để thử, không cần thẻ tín dụng, thiết lập trong vài phút.</p>
          </div>
          <div className="hero-actions">
            <a className="btn btn-dark" href="mailto:hello@medimate.ai">
              Liên hệ tư vấn
            </a>
            <a className="btn btn-ghost" href="#top">
              Xem lại demo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="section section-alt">
      <div className="container">
        <p className="eyebrow">Câu hỏi thường gặp</p>
        <h2 className="section-title">
          Rõ ràng từ đầu để người dùng <em>an tâm trước khi thử</em>.
        </h2>
        <div className="faq-grid">
          {FAQS.map((item) => (
            <article className="faq-card" key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const columns = [
    ["Sản phẩm", "Tính năng", "Bảng giá", "Lộ trình", "API"],
    ["Hỗ trợ", "Trung tâm trợ giúp", "Liên hệ", "Trạng thái hệ thống", "Cộng đồng"],
    ["Pháp lý", "Điều khoản", "Bảo mật", "Cookie", "Disclaimer y tế"],
  ];

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <a className="brand" href="#top">
              <span className="brand-mark">+</span>
              <span>MediMate AI</span>
            </a>
            <p className="section-copy">
              Trợ lý y khoa AI giúp người Việt hiểu triệu chứng, theo dõi điều trị
              và chuẩn bị tốt hơn cho mỗi lần gặp bác sĩ.
            </p>
          </div>

          {columns.map(([title, ...links]) => (
            <div key={title}>
              <h4>{title}</h4>
              <div className="footer-links">
                {links.map((link) => (
                  <a href="#top" key={link}>
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <span>© 2026 MediMate AI. Bảo lưu mọi quyền.</span>
          <span>Kết quả AI chỉ mang tính tham khảo y khoa.</span>
        </div>
      </div>
    </footer>
  );
}
