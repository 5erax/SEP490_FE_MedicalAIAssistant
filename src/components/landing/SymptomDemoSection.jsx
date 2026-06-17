import { useMemo, useState } from "react";

const SAMPLE_SYMPTOMS = [
  "Đau đầu, sốt nhẹ 3 ngày, mệt mỏi toàn thân",
  "Đau bụng âm ỉ sau bữa ăn, buồn nôn nhẹ",
  "Khó thở khi leo cầu thang, tim đập nhanh",
];

function analyzeSymptom(text) {
  const normalized = text.toLowerCase();

  if (normalized.includes("khó thở") || normalized.includes("tim")) {
    return {
      specialty: "Tim mạch hoặc Hô hấp",
      priority: "Nên đặt lịch trong 24-48 giờ",
      confidence: 86,
      questions: [
        "Triệu chứng xuất hiện khi nghỉ hay khi vận động?",
        "Có đau tức ngực, chóng mặt hoặc ngất không?",
      ],
      premium: "Theo dõi SpO2, nhịp tim và cảnh báo khi triệu chứng tăng nhanh.",
    };
  }

  if (normalized.includes("bụng") || normalized.includes("buồn nôn")) {
    return {
      specialty: "Tiêu hóa",
      priority: "Nên theo dõi thêm và đặt lịch nếu kéo dài",
      confidence: 78,
      questions: [
        "Cơn đau nằm ở vùng nào và kéo dài bao lâu?",
        "Có sốt, nôn nhiều hoặc đi ngoài bất thường không?",
      ],
      premium: "Gợi ý nhật ký ăn uống và phát hiện mẫu triệu chứng tái diễn.",
    };
  }

  return {
    specialty: "Nội khoa tổng quát",
    priority: "Nên đặt lịch nếu không cải thiện sau 48-72 giờ",
    confidence: 82,
    questions: [
      "Nhiệt độ cao nhất đo được là bao nhiêu?",
      "Có dùng thuốc hạ sốt hoặc bệnh nền gần đây không?",
    ],
    premium: "Tạo lộ trình theo dõi sốt, giấc ngủ và mức độ mệt mỏi hằng ngày.",
  };
}

export function SymptomDemoSection() {
  const [symptom, setSymptom] = useState(SAMPLE_SYMPTOMS[0]);
  const [submittedText, setSubmittedText] = useState(SAMPLE_SYMPTOMS[0]);

  const result = useMemo(() => analyzeSymptom(submittedText), [submittedText]);
  const isReady = submittedText.trim().length > 0;

  return (
    <section id="demo" className="section demo-section">
      <div className="container demo-grid">
        <div>
          <p className="eyebrow">Demo nhập triệu chứng</p>
          <h2 className="section-title">
            Cho người dùng thử một phần trước khi <em>đăng nhập Freemium</em>.
          </h2>
          <p className="section-copy">
            Demo này mô phỏng luồng sản phẩm: nhập triệu chứng, nhận preview AI,
            đăng nhập để lưu hồ sơ Freemium, rồi khám phá các phân tích nâng cao
            trong gói Premium.
          </p>

          <div className="demo-samples" aria-label="Mẫu triệu chứng">
            {SAMPLE_SYMPTOMS.map((sample) => (
              <button
                className={sample === symptom ? "active" : ""}
                key={sample}
                onClick={() => {
                  setSymptom(sample);
                  setSubmittedText(sample);
                }}
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        <div className="demo-console">
          <label htmlFor="symptom-demo">Mô tả triệu chứng</label>
          <textarea
            id="symptom-demo"
            value={symptom}
            onChange={(event) => setSymptom(event.target.value)}
            placeholder="Ví dụ: Đau đầu, sốt nhẹ, mệt mỏi trong 3 ngày..."
            rows={5}
          />
          <div className="demo-actions">
            <button className="btn btn-primary" onClick={() => setSubmittedText(symptom)}>
              Phân tích thử
            </button>
            <a className="btn btn-ghost" href="/login">
              Đăng nhập Freemium
            </a>
          </div>
          <p className="api-message warning" role="status">
            Demo chỉ hỗ trợ định hướng thông tin ban đầu, không chẩn đoán bệnh và không thay thế bác sĩ. Nếu có triệu chứng nặng hoặc khẩn cấp, hãy gọi cấp cứu 115 hoặc đến cơ sở y tế gần nhất.
          </p>

          {isReady && (
            <div className="demo-result">
              <div className="demo-result-main">
                <span>Preview miễn phí</span>
                <strong>{result.specialty}</strong>
                <p>{result.priority}</p>
                <div className="bar">
                  <span style={{ width: `${result.confidence}%` }} />
                </div>
              </div>

              <div className="demo-upgrade-grid">
                <article>
                  <span>Freemium sau đăng nhập</span>
                  <strong>Lưu hồ sơ và lịch sử phân tích</strong>
                  <p>{result.questions[0]}</p>
                  <a href="/login">Mở khóa Freemium</a>
                </article>
                <article>
                  <span>Premium</span>
                  <strong>Phân tích sâu và theo dõi dài hạn</strong>
                  <p>{result.premium}</p>
                  <a href="/pricing">Khám phá Premium</a>
                </article>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
