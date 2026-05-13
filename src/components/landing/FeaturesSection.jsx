const TICKER_ITEMS = [
  "Phân tích triệu chứng",
  "Nhắc lịch uống thuốc",
  "Giải thích xét nghiệm",
  "Theo dõi phục hồi",
  "Chuẩn bị câu hỏi đi khám",
  "Hồ sơ sức khỏe gia đình",
];

const FEATURES = [
  {
    icon: "AI",
    title: "Phân tích triệu chứng thông minh",
    body: "Hiểu mô tả bằng tiếng Việt tự nhiên, gợi ý chuyên khoa phù hợp và chỉ ra dấu hiệu cần chú ý.",
  },
  {
    icon: "Rx",
    title: "Nhắc thuốc đúng lịch",
    body: "Theo dõi đơn thuốc, liều dùng, giờ uống và lịch tái khám cho từng thành viên trong gia đình.",
    dark: true,
  },
  {
    icon: "Lab",
    title: "Giải thích kết quả xét nghiệm",
    body: "Chuyển các chỉ số khó đọc thành phần giải thích dễ hiểu, có ngữ cảnh và câu hỏi gợi ý để trao đổi với bác sĩ.",
    wide: true,
  },
  {
    icon: "MD",
    title: "Chia sẻ hồ sơ với bác sĩ",
    body: "Tạo bản tóm tắt sức khỏe gọn gàng để buổi khám tập trung vào điều quan trọng nhất.",
  },
];

const SOLUTIONS = [
  {
    title: "Cho cá nhân bận rộn",
    body: "Một nơi duy nhất để ghi triệu chứng, nhận nhắc nhở và theo dõi thay đổi sức khỏe theo thời gian.",
    tone: "#087f8c",
  },
  {
    title: "Cho gia đình",
    body: "Quản lý hồ sơ nhiều người, nhắc thuốc cho người thân và lưu lại lịch sử khám theo từng thành viên.",
    tone: "#1d4ed8",
  },
  {
    title: "Cho phòng khám",
    body: "Nhận bản tóm tắt trước buổi khám, giảm thời gian hỏi lại thông tin nền và tăng chất lượng tư vấn.",
    tone: "#ef6f61",
  },
];

export function TickerBar() {
  return (
    <div className="ticker" aria-label="Các năng lực chính">
      <div className="ticker-track">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
          <span key={`${item}-${index}`}>+ {item}</span>
        ))}
      </div>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <>
      <section id="features" className="section">
        <div className="container">
          <p className="eyebrow">Tính năng nổi bật</p>
          <h2 className="section-title">
            Mọi thứ cần thiết để <em>hiểu và theo dõi</em> sức khỏe hằng ngày.
          </h2>
          <p className="section-copy">
            Landing page không chỉ cần đẹp. Nó cần làm người dùng hiểu ngay sản
            phẩm giải quyết điều gì, tin tưởng ở đâu và bắt đầu như thế nào.
          </p>

          <div className="features-grid">
            {FEATURES.map((feature) => (
              <article
                className={[
                  "feature-card",
                  feature.dark ? "feature-dark" : "",
                  feature.wide ? "feature-wide" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={feature.title}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="section section-alt">
        <div className="container">
          <p className="eyebrow">Giải pháp</p>
          <h2 className="section-title">
            Linh hoạt cho cá nhân, gia đình và <em>đội ngũ chăm sóc</em>.
          </h2>

          <div className="solutions-grid">
            {SOLUTIONS.map((solution) => (
              <article
                className="solution-card"
                key={solution.title}
                style={{ "--tone": solution.tone }}
              >
                <h3>{solution.title}</h3>
                <p>{solution.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
