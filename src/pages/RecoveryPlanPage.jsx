import { CalendarCheck, ClipboardCheck, HeartPulse, MapPin, Stethoscope, TimerReset } from "lucide-react";
import { Button } from "../components/ui";
import { navigate } from "../router/navigation";

const recoverySteps = [
  {
    icon: Stethoscope,
    title: "Hoàn thành phân tích lâm sàng",
    text: "Mô tả triệu chứng để hệ thống xác định chuyên khoa cần ưu tiên trước khi lập kế hoạch.",
  },
  {
    icon: MapPin,
    title: "Chọn cơ sở y tế phù hợp",
    text: "Ưu tiên cơ sở có chuyên khoa liên quan, vị trí thuận tiện và thông tin rõ ràng.",
  },
  {
    icon: CalendarCheck,
    title: "Theo dõi sau khám",
    text: "Ghi lại lịch tái khám, thuốc đang dùng và các dấu hiệu cần chú ý trong quá trình hồi phục.",
  },
];

const careItems = [
  "Lưu hướng dẫn của bác sĩ sau buổi khám.",
  "Theo dõi triệu chứng thay đổi mỗi ngày.",
  "Chuẩn bị câu hỏi cho lần tái khám tiếp theo.",
];

export default function RecoveryPlanPage() {
  return (
    <main className="recovery-plan-page">
      <style>{styles}</style>

      <section className="recovery-hero" aria-labelledby="recovery-plan-title">
        <div className="recovery-hero-copy">
          <span className="recovery-mark" aria-hidden="true"><ClipboardCheck size={26} /></span>
          <p className="recovery-eyebrow">Theo dõi sau sàng lọc</p>
          <h1 id="recovery-plan-title">Kế hoạch phục hồi</h1>
          <p>
            Kế hoạch phù hợp cần dựa trên kết quả khám và hướng dẫn của bác sĩ.
            Hãy hoàn thành phân tích lâm sàng trước để xác định chuyên khoa cần ưu tiên.
          </p>

          <div className="recovery-actions">
            <Button type="button" onClick={() => navigate("/symptom")}>
              <Stethoscope size={18} /> Bắt đầu phân tích
            </Button>
            <Button type="button" tone="secondary" onClick={() => navigate("/map")}>
              <MapPin size={18} /> Tìm cơ sở y tế
            </Button>
          </div>
        </div>

        <aside className="recovery-summary" aria-label="Tóm tắt kế hoạch">
          <span><HeartPulse size={22} /></span>
          <strong>Chưa có kế hoạch cá nhân hóa</strong>
          <p>Hoàn thành bước phân tích để MediMate có dữ liệu tạo lộ trình theo dõi phù hợp hơn.</p>
          <div>
            <small>Trạng thái</small>
            <b>Đang chờ dữ liệu khám</b>
          </div>
        </aside>
      </section>

      <section className="recovery-grid" aria-label="Các bước phục hồi">
        {recoverySteps.map((step) => {
          const Icon = step.icon;
          return (
            <article key={step.title} className="recovery-step">
              <span aria-hidden="true"><Icon size={20} /></span>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </article>
          );
        })}
      </section>

      <section className="recovery-followup" aria-label="Theo dõi cần chuẩn bị">
        <div>
          <p className="recovery-eyebrow">Chuẩn bị trước khi có kế hoạch</p>
          <h2>Những thông tin nên ghi lại</h2>
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
          <p>Thông tin này giúp quá trình tái khám và theo dõi sau khám rõ ràng hơn.</p>
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
  gap: 18px;
  padding: clamp(18px, 3vw, 30px);
  background:
    radial-gradient(circle at 18% 8%, rgba(196, 233, 149, .28), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,.96), rgba(247,250,243,.98));
}

.recovery-hero,
.recovery-followup,
.recovery-step {
  border: 1px solid rgba(16, 20, 17, .14);
  background: rgba(255, 255, 255, .84);
  box-shadow: 0 18px 48px rgba(16, 20, 17, .08);
}

.recovery-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  gap: clamp(18px, 4vw, 34px);
  align-items: stretch;
  border-radius: 24px;
  padding: clamp(22px, 4vw, 38px);
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
  width: 58px;
  height: 58px;
  border-radius: 18px;
  box-shadow: 4px 4px 0 #111412;
}

.recovery-eyebrow {
  margin: 0;
  color: #315d18;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.recovery-plan-page h1,
.recovery-plan-page h2,
.recovery-plan-page p {
  margin: 0;
}

.recovery-plan-page h1 {
  max-width: 680px;
  font-size: clamp(34px, 5vw, 58px);
  line-height: 1.02;
  letter-spacing: 0;
}

.recovery-hero-copy > p:not(.recovery-eyebrow) {
  max-width: 760px;
  color: rgba(17, 20, 18, .68);
  font-size: 16px;
  line-height: 1.7;
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
  border-radius: 20px;
  background: #f4faed;
  padding: 22px;
}

.recovery-summary > span {
  width: 46px;
  height: 46px;
  border-radius: 15px;
}

.recovery-summary strong {
  font-size: 22px;
  line-height: 1.2;
}

.recovery-summary p,
.recovery-step p,
.recovery-note p {
  color: rgba(17, 20, 18, .62);
  line-height: 1.58;
}

.recovery-summary div {
  display: grid;
  gap: 5px;
  border-top: 1px solid rgba(16, 20, 17, .14);
  padding-top: 14px;
}

.recovery-summary small {
  color: rgba(17, 20, 18, .54);
  font-weight: 850;
}

.recovery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.recovery-step {
  display: grid;
  gap: 12px;
  border-radius: 18px;
  padding: 20px;
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
  font-size: 20px;
  line-height: 1.25;
}

.recovery-followup {
  display: grid;
  grid-template-columns: minmax(240px, .8fr) minmax(0, 1fr) minmax(220px, .75fr);
  gap: 18px;
  align-items: center;
  border-radius: 22px;
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
  .recovery-followup {
    grid-template-columns: 1fr;
  }

  .recovery-grid {
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
    border-radius: 18px;
  }
}
`;
