import { FileHeart, FlaskConical, Lock, MessageCircle, Stethoscope } from "lucide-react";
import { Button } from "../components/ui";
import { navigate } from "../router/navigation";

const upcomingCapabilities = [
  {
    icon: FileHeart,
    title: "Tải hồ sơ y tế",
    text: "Tính năng lưu trữ tệp, quyền truy cập và lịch sử xử lý đang được hoàn thiện trước khi bật cho người dùng.",
  },
  {
    icon: FlaskConical,
    title: "Đọc chỉ số xét nghiệm",
    text: "Chỉ hiển thị khi có dữ liệu thật từ API hoặc tệp người dùng tự tải lên.",
  },
  {
    icon: Lock,
    title: "Bảo vệ dữ liệu sức khỏe",
    text: "Không dùng dữ liệu mẫu cho kết quả cá nhân để tránh hiểu nhầm là hồ sơ thật.",
  },
];

export default function MedicalRecordPage() {
  return (
    <main className="records-page records-unavailable-page">
      <style>{styles}</style>
      <section className="records-unavailable-card" aria-labelledby="records-title">
        <p className="mini-label">Hồ sơ y tế</p>
        <h1 id="records-title">Tính năng hồ sơ y tế đang được hoàn thiện</h1>
        <p>
          Trang này không hiển thị dữ liệu mẫu hoặc kết quả phân tích giả. Khi API hồ sơ y tế
          sẵn sàng, dữ liệu tại đây sẽ đến từ hồ sơ thật của người dùng và có kiểm soát quyền truy cập.
        </p>

        <div className="records-capability-grid">
          {upcomingCapabilities.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title}>
                <span aria-hidden="true"><Icon size={20} /></span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>

        <div className="records-actions">
          <Button type="button" onClick={() => navigate("/symptom")}>
            <Stethoscope size={18} /> Mở phân tích lâm sàng
          </Button>
          <Button type="button" tone="secondary" onClick={() => navigate("/chat")}>
            <MessageCircle size={18} /> Chat AI
          </Button>
        </div>
      </section>
    </main>
  );
}

const styles = `
.records-unavailable-page {
  min-height: calc(100svh - 112px);
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #f8fbf4, #eef5e9);
  color: var(--ink);
  padding: clamp(16px, 4vw, 42px);
}

.records-unavailable-card {
  width: min(980px, 100%);
  display: grid;
  gap: 18px;
  border: 1.5px solid var(--ink);
  border-radius: 18px;
  background: var(--paper);
  box-shadow: 4px 4px 0 var(--ink);
  padding: clamp(22px, 4vw, 38px);
}

.records-unavailable-card h1,
.records-unavailable-card p {
  margin: 0;
}

.records-unavailable-card h1 {
  max-width: 760px;
  font-family: var(--display);
  font-size: clamp(32px, 5vw, 52px);
  line-height: 1.05;
}

.records-unavailable-card > p {
  max-width: 760px;
  color: var(--muted);
  line-height: 1.7;
}

.mini-label {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  color: var(--lime-dark);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.mini-label::before {
  content: "";
  width: 12px;
  height: 2px;
  background: currentColor;
}

.records-capability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.records-capability-grid article {
  min-width: 0;
  display: grid;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--paper-soft);
  padding: 16px;
}

.records-capability-grid span {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--mint);
  color: var(--teal);
}

.records-capability-grid strong {
  color: var(--ink);
  font-size: 16px;
}

.records-capability-grid p {
  color: var(--muted);
  line-height: 1.55;
}

.records-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 760px) {
  .records-capability-grid {
    grid-template-columns: 1fr;
  }

  .records-actions,
  .records-actions .ui-button {
    width: 100%;
  }
}
`;
