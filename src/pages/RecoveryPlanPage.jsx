import { CalendarCheck, ClipboardCheck, HeartPulse, MapPin, Stethoscope, TimerReset } from "lucide-react";
import { Button } from "../components/ui";
import { navigate } from "../router/navigation";

const recoverySteps = [
  {
    icon: Stethoscope,
    title: "Hoàn tất phân tích lâm sàng",
    text: "Cung cấp triệu chứng chính, bối cảnh và câu trả lời lâm sàng để xác định chuyên khoa cần ưu tiên.",
  },
  {
    icon: MapPin,
    title: "Chọn cơ sở phù hợp",
    text: "Ưu tiên cơ sở có chuyên khoa liên quan, địa chỉ rõ ràng và thông tin liên hệ sẵn sàng.",
  },
  {
    icon: CalendarCheck,
    title: "Theo dõi sau khám",
    text: "Ghi lại lịch tái khám, thuốc đang dùng và thay đổi triệu chứng trong quá trình phục hồi.",
  },
];

const careItems = [
  "Hướng dẫn sau khám và mốc tái khám.",
  "Triệu chứng thay đổi theo từng ngày.",
  "Thuốc đang dùng, dị ứng và phản ứng bất thường.",
  "Câu hỏi cần chuẩn bị cho lần gặp tiếp theo.",
];

export default function RecoveryPlanPage() {
  return (
    <main className="recovery-plan-page">
      <style>{styles}</style>

      <section className="recovery-hero" aria-labelledby="recovery-plan-title">
        <div className="recovery-hero-copy">
          <span className="recovery-mark" aria-hidden="true"><ClipboardCheck size={26} /></span>
          <p className="recovery-eyebrow">Theo dõi sau phân tích</p>
          <h1 id="recovery-plan-title">Kế hoạch phục hồi</h1>
          <p>
            Gom các việc cần chuẩn bị trước và sau khi đi khám. Bắt đầu bằng phân tích lâm sàng để MediMate có đủ dữ liệu tạo lộ trình theo dõi phù hợp.
          </p>

          <div className="recovery-actions">
            <Button type="button" onClick={() => navigate("/symptom")}>
              <Stethoscope size={18} /> Mở phân tích lâm sàng
            </Button>
            <Button type="button" tone="secondary" onClick={() => navigate("/map")}>
              <MapPin size={18} /> Tìm cơ sở y tế
            </Button>
          </div>
        </div>

        <aside className="recovery-summary" aria-label="Trạng thái kế hoạch phục hồi">
          <span><HeartPulse size={22} /></span>
          <div>
            <small>Trạng thái</small>
            <strong>Chưa có kế hoạch cá nhân hóa</strong>
            <p>Hoàn thành phân tích lâm sàng hoặc lưu kết quả khám để bắt đầu theo dõi.</p>
          </div>
          <dl className="recovery-metrics">
            <div><dt>Dữ liệu</dt><dd>Đang chờ</dd></div>
            <div><dt>Theo dõi</dt><dd>3 bước</dd></div>
          </dl>
        </aside>
      </section>

      <section className="recovery-timeline" aria-label="Lộ trình phục hồi">
        {recoverySteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <article key={step.title} className="recovery-step">
              <span aria-hidden="true"><Icon size={20} /></span>
              <div>
                <small>Bước {index + 1}</small>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="recovery-followup" aria-label="Theo dõi cần chuẩn bị">
        <div>
          <p className="recovery-eyebrow">Checklist</p>
          <h2>Thông tin nên ghi lại</h2>
          <p>Những mục này giúp lần tái khám và theo dõi sau khám rõ ràng hơn.</p>
        </div>
        <ul>
          {careItems.map((item) => (
            <li key={item}>
              <ClipboardCheck size={18} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="recovery-note">
          <TimerReset size={20} aria-hidden="true" />
          <p>Khi có dữ liệu từ phân tích lâm sàng hoặc kết quả khám, phần này có thể chuyển thành kế hoạch theo ngày.</p>
        </div>
      </section>
    </main>
  );
}

const styles = `
.recovery-plan-page {
  min-height: calc(100svh - 112px);
  display: grid;
  align-content: start;
  gap: 16px;
  padding: clamp(16px, 3vw, 30px);
  background: linear-gradient(180deg, #f8fbf4, #eef5e9);
}

.recovery-hero,
.recovery-followup,
.recovery-step {
  border: 1px solid rgba(16, 20, 17, .14);
  background: rgba(255, 255, 255, .88);
  box-shadow: 0 18px 42px rgba(16, 20, 17, .07);
}

.recovery-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: clamp(18px, 4vw, 34px);
  border-radius: 22px;
  padding: clamp(22px, 4vw, 38px);
}

.recovery-hero-copy,
.recovery-summary,
.recovery-step,
.recovery-followup {
  min-width: 0;
}

.recovery-hero-copy {
  display: grid;
  align-content: center;
  gap: 14px;
}

.recovery-mark,
.recovery-step > span,
.recovery-summary > span {
  display: grid;
  place-items: center;
  border: 1.5px solid #111412;
  background: #c4e995;
  color: #111412;
}

.recovery-mark {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  box-shadow: 4px 4px 0 #111412;
}

.recovery-eyebrow {
  margin: 0;
  color: #315d18;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.recovery-plan-page h1,
.recovery-plan-page h2,
.recovery-plan-page p,
.recovery-plan-page dl {
  margin: 0;
}

.recovery-plan-page h1 {
  max-width: 680px;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 1.03;
  letter-spacing: 0;
}

.recovery-hero-copy > p:not(.recovery-eyebrow),
.recovery-followup > div > p:not(.recovery-eyebrow),
.recovery-summary p,
.recovery-step p,
.recovery-note p {
  color: rgba(17, 20, 18, .64);
  line-height: 1.62;
}

.recovery-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 8px;
}

.recovery-summary {
  display: grid;
  align-content: space-between;
  gap: 16px;
  border: 1px solid rgba(16, 20, 17, .14);
  border-radius: 18px;
  background: #f4faed;
  padding: 20px;
}

.recovery-summary > span {
  width: 46px;
  height: 46px;
  border-radius: 14px;
}

.recovery-summary strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
  line-height: 1.2;
}

.recovery-summary small,
.recovery-step small,
.recovery-metrics dt {
  color: rgba(17, 20, 18, .54);
  font-size: 12px;
  font-weight: 900;
}

.recovery-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.recovery-metrics div {
  border: 1px solid rgba(16, 20, 17, .12);
  border-radius: 12px;
  background: #fff;
  padding: 12px;
}

.recovery-metrics dd {
  margin: 4px 0 0;
  color: #111412;
  font-weight: 950;
}

.recovery-timeline {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.recovery-step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  border-radius: 18px;
  padding: 18px;
}

.recovery-step > span {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: #e4f4f2;
  border-color: rgba(8, 127, 140, .28);
  color: #075d66;
}

.recovery-step h2,
.recovery-followup h2 {
  margin-top: 4px;
  font-size: 20px;
  line-height: 1.25;
}

.recovery-followup {
  display: grid;
  grid-template-columns: minmax(230px, .75fr) minmax(0, 1fr) minmax(220px, .75fr);
  gap: 18px;
  align-items: center;
  border-radius: 20px;
  padding: clamp(18px, 3vw, 26px);
}

.recovery-followup ul {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.recovery-followup li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(17, 20, 18, .78);
  font-weight: 760;
}

.recovery-followup li svg {
  flex: 0 0 auto;
  color: #315d18;
}

.recovery-note {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  border-radius: 16px;
  background: #f4faed;
  padding: 16px;
}

.recovery-note svg {
  flex: 0 0 auto;
  color: #075d66;
}

@media (max-width: 980px) {
  .recovery-hero,
  .recovery-followup,
  .recovery-timeline {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .recovery-plan-page {
    padding: 14px;
  }

  .recovery-actions,
  .recovery-actions .ui-button {
    width: 100%;
  }

  .recovery-hero,
  .recovery-followup,
  .recovery-step {
    border-radius: 16px;
  }
}
`;
