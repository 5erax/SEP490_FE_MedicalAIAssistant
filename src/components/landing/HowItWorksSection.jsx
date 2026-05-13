const STEPS = [
  {
    number: "01",
    title: "Nhập triệu chứng",
    body: "Mô tả điều bạn đang gặp bằng ngôn ngữ tự nhiên, có thể thêm thời gian, mức độ đau và bệnh nền.",
  },
  {
    number: "02",
    title: "AI phân tích ngữ cảnh",
    body: "Hệ thống đối chiếu thông tin với nguồn y khoa và hỏi thêm khi dữ liệu còn thiếu.",
  },
  {
    number: "03",
    title: "Nhận gợi ý hành động",
    body: "Xem chuyên khoa phù hợp, mức độ ưu tiên và danh sách câu hỏi nên chuẩn bị trước buổi khám.",
  },
  {
    number: "04",
    title: "Theo dõi sau khám",
    body: "Lưu hồ sơ, nhắc thuốc, nhắc tái khám và theo dõi xu hướng phục hồi qua từng ngày.",
  },
];

const REVIEWS = [
  {
    name: "Nguyễn Thị Lan",
    role: "Kế toán, Hà Nội",
    initials: "NL",
    text: "Tôi hiểu kết quả xét nghiệm nhanh hơn và biết nên hỏi bác sĩ điều gì. Cảm giác bớt hoang mang hơn rất nhiều.",
  },
  {
    name: "Trần Minh Khoa",
    role: "Kỹ sư phần mềm, TP.HCM",
    initials: "TK",
    text: "Phần nhắc thuốc và theo dõi triệu chứng giúp tôi duy trì lịch điều trị đều hơn, nhất là những ngày bận.",
  },
  {
    name: "Lê Phương Anh",
    role: "Giáo viên, Đà Nẵng",
    initials: "LA",
    text: "Dùng cho cả bố mẹ rất tiện. Giao diện rõ, chữ dễ hiểu và không tạo cảm giác như đọc tài liệu y khoa khô cứng.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="process" className="section">
      <div className="container">
        <p className="eyebrow">Quy trình</p>
        <h2 className="section-title">
          Bốn bước đơn giản để chuyển lo lắng thành <em>hành động rõ ràng</em>.
        </h2>

        <div className="steps-grid">
          {STEPS.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">Bước {step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SocialProofSection() {
  return (
    <section className="section section-alt">
      <div className="container">
        <p className="eyebrow">Người dùng nói gì</p>
        <h2 className="section-title">
          Một trải nghiệm y tế số <em>dễ hiểu, bình tĩnh và đáng tin</em>.
        </h2>

        <div className="reviews-grid">
          {REVIEWS.map((review) => (
            <article className="review-card" key={review.name}>
              <div className="stars" aria-label="5 sao">
                ★★★★★
              </div>
              <p>"{review.text}"</p>
              <div className="person">
                <div className="avatar">{review.initials}</div>
                <div>
                  <strong>{review.name}</strong>
                  <span>{review.role}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
