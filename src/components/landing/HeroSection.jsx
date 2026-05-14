import { useEffect, useState } from "react";

const PROMPTS = [
  "Đau đầu, sốt nhẹ kéo dài 3 ngày, mệt mỏi toàn thân...",
  "Khó thở khi leo cầu thang, tim đập nhanh vào buổi tối...",
  "Đau bụng âm ỉ sau bữa ăn, buồn nôn nhẹ...",
  "Mất ngủ, hồi hộp và khó tập trung không rõ nguyên nhân...",
];

function useTypewriter() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = PROMPTS[phraseIndex];
    const doneTyping = !deleting && cursor === phrase.length;
    const doneDeleting = deleting && cursor === 0;

    const timer = setTimeout(
      () => {
        if (doneTyping) {
          setDeleting(true);
          return;
        }

        if (doneDeleting) {
          setDeleting(false);
          setPhraseIndex((index) => (index + 1) % PROMPTS.length);
          return;
        }

        setCursor((value) => value + (deleting ? -1 : 1));
      },
      doneTyping ? 1200 : deleting ? 28 : 52,
    );

    return () => clearTimeout(timer);
  }, [cursor, deleting, phraseIndex]);

  return PROMPTS[phraseIndex].slice(0, cursor);
}

export function HeroSection() {
  const typed = useTypewriter();

  return (
    <section id="top" className="hero">
      <div className="container hero-grid">
        <div>
          <p className="eyebrow">Trợ lý y khoa AI cho người Việt</p>
          <h1>
            Chăm sóc sức khỏe <em>rõ ràng hơn</em> mỗi ngày.
          </h1>
          <p className="hero-copy">
            MediMate AI giúp phân tích triệu chứng, giải thích kết quả xét nghiệm,
            nhắc lịch dùng thuốc và chuẩn bị câu hỏi trước khi gặp bác sĩ.
          </p>

          <div className="hero-actions">
            <a className="btn btn-primary" href="#pricing">
              Bắt đầu miễn phí
            </a>
            <a className="btn btn-ghost" href="#demo">
              Demo nhập triệu chứng
            </a>
          </div>

          <div className="trust-row" aria-label="Điểm tin cậy">
            <span className="trust-pill">Nguồn y khoa có kiểm chứng</span>
            <span className="trust-pill">Tiếng Việt tự nhiên</span>
            <span className="trust-pill">Bảo mật dữ liệu cá nhân</span>
          </div>
        </div>

        <div className="hero-panel" aria-label="Bản xem trước ứng dụng MediMate AI">
          <div className="app-window">
            <div className="window-bar">
              <span className="window-title">MediMate AI Console</span>
              <span className="status-dot">Đang phân tích</span>
            </div>

            <div className="symptom-box">
              <label>Triệu chứng của bạn</label>
              <div className="typed-text">{typed}</div>
            </div>

            <div className="analysis-stack">
              <div className="analysis-card">
                <small>Chuyên khoa gợi ý</small>
                <div className="analysis-top">
                  <span>Nội khoa tổng quát</span>
                  <span className="confidence">91%</span>
                </div>
                <div className="bar">
                  <span style={{ width: "91%" }} />
                </div>
              </div>

              <div className="analysis-card">
                <small>Mức độ ưu tiên</small>
                <div className="analysis-top">
                  <span>Nên đặt lịch trong 48-72 giờ</span>
                  <span className="confidence">74%</span>
                </div>
                <div className="bar">
                  <span style={{ width: "74%" }} />
                </div>
              </div>

              <div className="analysis-card">
                <small>Chuẩn bị khi đi khám</small>
                <div className="analysis-top">
                  <span>5 câu hỏi cần trao đổi với bác sĩ</span>
                  <span className="confidence">Sẵn sàng</span>
                </div>
                <div className="bar">
                  <span style={{ width: "86%" }} />
                </div>
              </div>
            </div>

            <p className="hero-note">
              Kết quả AI chỉ mang tính tham khảo, không thay thế chẩn đoán hoặc
              điều trị từ chuyên gia y tế.
            </p>
          </div>
        </div>
      </div>

      <div className="container metric-strip">
        <div className="metric">
          <strong>2.5s</strong>
          <span>phản hồi trung bình</span>
        </div>
        <div className="metric">
          <strong>24/7</strong>
          <span>hỗ trợ theo dõi</span>
        </div>
        <div className="metric">
          <strong>50K+</strong>
          <span>hồ sơ sức khỏe</span>
        </div>
        <div className="metric">
          <strong>98%</strong>
          <span>người dùng hài lòng</span>
        </div>
      </div>
    </section>
  );
}
