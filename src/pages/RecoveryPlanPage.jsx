import {
  ArrowRight,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  HeartPulse,
  MapPin,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Button } from "../components/ui";
import { navigate } from "../router/navigation";

const preparationItems = [
  {
    icon: FileText,
    title: "Mang theo hướng dẫn sau khám",
    text: "Giữ lại đơn thuốc, giấy hẹn và các chỉ dẫn được cơ sở y tế cung cấp.",
  },
  {
    icon: HeartPulse,
    title: "Ghi nhận thay đổi đáng chú ý",
    text: "Theo dõi thời điểm xuất hiện, mức độ và diễn biến để trao đổi rõ hơn khi tái khám.",
  },
  {
    icon: CalendarCheck,
    title: "Chuẩn bị cho lần tái khám",
    text: "Ghi lại mốc tái khám và những câu hỏi bạn muốn trao đổi trực tiếp với nhân viên y tế.",
  },
];

export default function RecoveryPlanPage() {
  return (
    <div className="recovery-plan-page">
      <style>{styles}</style>

      <section className="recovery-availability" aria-labelledby="recovery-plan-title">
        <div className="recovery-availability-copy">
          <div className="recovery-status">
            <ShieldCheck size={16} aria-hidden="true" />
            Chưa khả dụng trên MediMate
          </div>
          <p className="recovery-eyebrow">Theo dõi sau khám</p>
          <h1 id="recovery-plan-title">Kế hoạch phục hồi chưa được mở</h1>
          <p className="recovery-lead">
            MediMate hiện chưa tạo, lưu hoặc theo dõi kế hoạch phục hồi cá nhân.
            Kế hoạch chăm sóc cần dựa trên hướng dẫn trực tiếp từ bác sĩ hoặc cơ sở y tế của bạn.
          </p>

          <div className="recovery-actions" aria-label="Hành động hiện có">
            <Button type="button" onClick={() => navigate("/symptom")}>
              <Stethoscope size={18} aria-hidden="true" />
              Phân tích triệu chứng
            </Button>
            <Button type="button" tone="secondary" onClick={() => navigate("/map")}>
              <MapPin size={18} aria-hidden="true" />
              Tìm cơ sở y tế
            </Button>
          </div>

          <p className="recovery-boundary">
            Trang này không yêu cầu và không lưu thông tin sức khỏe của bạn.
          </p>
        </div>

        <aside className="recovery-now" aria-labelledby="recovery-now-title">
          <span className="recovery-now-icon" aria-hidden="true">
            <ClipboardCheck size={24} />
          </span>
          <div>
            <p className="recovery-eyebrow">Bạn có thể làm ngay</p>
            <h2 id="recovery-now-title">Chuẩn bị bước tiếp theo</h2>
          </div>
          <ul>
            <li>
              <span>01</span>
              <p>Làm rõ triệu chứng trước khi chọn chuyên khoa.</p>
            </li>
            <li>
              <span>02</span>
              <p>Tìm cơ sở y tế đang có trên hệ thống.</p>
            </li>
            <li>
              <span>03</span>
              <p>Làm theo kế hoạch được nhân viên y tế hướng dẫn sau khi khám.</p>
            </li>
          </ul>
        </aside>
      </section>

      <section className="recovery-preparation" aria-labelledby="recovery-preparation-title">
        <header>
          <p className="recovery-eyebrow">Trước lần tái khám</p>
          <h2 id="recovery-preparation-title">Những thông tin nên chuẩn bị</h2>
          <p>
            Đây là gợi ý chuẩn bị chung, không phải kế hoạch điều trị và không thay thế
            hướng dẫn từ người có chuyên môn.
          </p>
        </header>

        <div className="recovery-preparation-list">
          {preparationItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title}>
                <span aria-hidden="true"><Icon size={20} /></span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="recovery-care-note" aria-labelledby="recovery-care-note-title">
        <span aria-hidden="true"><HeartPulse size={22} /></span>
        <div>
          <p className="recovery-eyebrow">Khi cần hỗ trợ</p>
          <h2 id="recovery-care-note-title">Ưu tiên hướng dẫn từ cơ sở y tế</h2>
          <p>
            Nếu tình trạng thay đổi hoặc bạn lo lắng về dấu hiệu đang gặp, hãy liên hệ
            cơ sở y tế phù hợp. Trong tình huống khẩn cấp, hãy tìm trợ giúp y tế ngay.
          </p>
        </div>
        <button type="button" onClick={() => navigate("/map")}>
          Xem cơ sở y tế
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}

const styles = `
.recovery-plan-page {
  --recovery-navy: #0c2d35;
  --recovery-teal: #087f78;
  --recovery-teal-dark: #05665f;
  --recovery-mint: #eaf6f1;
  --recovery-mint-strong: #d7eee5;
  --recovery-paper: #ffffff;
  --recovery-soft: #f6faf8;
  --recovery-line: #d5e3dd;
  --recovery-muted: #5f706a;
  display: grid;
  gap: 18px;
  width: min(100%, 1120px);
  margin: 0 auto;
  color: var(--recovery-navy);
}

.recovery-plan-page h1,
.recovery-plan-page h2,
.recovery-plan-page h3,
.recovery-plan-page p {
  margin: 0;
}

.recovery-availability,
.recovery-preparation,
.recovery-care-note {
  border: 1px solid var(--recovery-line);
  background: var(--recovery-paper);
}

.recovery-availability {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, .7fr);
  overflow: hidden;
  border-radius: 24px;
  box-shadow: 0 22px 60px rgba(12, 45, 53, .08);
}

.recovery-availability-copy {
  position: relative;
  display: grid;
  align-content: center;
  gap: 15px;
  min-height: 470px;
  padding: clamp(28px, 5vw, 58px);
  background:
    radial-gradient(circle at 0 0, rgba(8, 127, 120, .1), transparent 31%),
    linear-gradient(145deg, #fff 0%, #f3faf7 100%);
}

.recovery-availability-copy::after {
  position: absolute;
  right: -92px;
  bottom: -118px;
  width: 260px;
  height: 260px;
  border: 34px solid rgba(8, 127, 120, .045);
  border-radius: 50%;
  content: "";
  pointer-events: none;
}

.recovery-status {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 7px;
  border: 1px solid #b8d8cc;
  border-radius: 999px;
  background: #f8fcfa;
  color: var(--recovery-teal-dark);
  padding: 7px 11px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .035em;
}

.recovery-eyebrow {
  color: var(--recovery-teal-dark);
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .11em;
  text-transform: uppercase;
}

.recovery-availability h1 {
  position: relative;
  z-index: 1;
  max-width: 650px;
  font-size: clamp(38px, 5vw, 62px);
  line-height: 1.01;
  letter-spacing: -.045em;
}

.recovery-lead {
  position: relative;
  z-index: 1;
  max-width: 680px;
  color: var(--recovery-muted);
  font-size: 16px;
  line-height: 1.7;
}

.recovery-actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 5px;
}

.recovery-actions .ui-button {
  white-space: nowrap;
}

.recovery-actions [data-tone="primary"] {
  border-color: var(--recovery-teal-dark);
  background: linear-gradient(135deg, var(--recovery-teal), var(--recovery-teal-dark));
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(8, 127, 120, 0.22);
}

.recovery-actions [data-tone="primary"]:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--recovery-teal-dark), #044743);
}

.recovery-actions [data-tone="secondary"] {
  border-color: var(--recovery-line);
  background: var(--recovery-paper);
  color: var(--recovery-navy);
  box-shadow: none;
}

.recovery-actions [data-tone="secondary"]:hover:not(:disabled) {
  border-color: var(--recovery-teal);
  background: var(--recovery-mint);
}

.recovery-boundary {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #64736e;
  font-size: 12px;
  font-weight: 700;
}

.recovery-boundary::before {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--recovery-teal);
  content: "";
}

.recovery-now {
  display: grid;
  align-content: center;
  gap: 18px;
  border-left: 1px solid var(--recovery-line);
  background: #fbfdfc;
  padding: clamp(24px, 4vw, 38px);
}

.recovery-now-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: 1px solid #b9dbce;
  border-radius: 16px;
  background: var(--recovery-mint);
  color: var(--recovery-teal-dark);
}

.recovery-now h2 {
  margin-top: 5px;
  font-size: 25px;
  letter-spacing: -.025em;
}

.recovery-now ul {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.recovery-now li {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid var(--recovery-line);
}

.recovery-now li span {
  color: var(--recovery-teal-dark);
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .08em;
}

.recovery-now li p {
  color: #40534d;
  font-size: 13px;
  font-weight: 720;
  line-height: 1.55;
}

.recovery-preparation {
  display: grid;
  grid-template-columns: minmax(240px, .75fr) minmax(0, 1.5fr);
  gap: clamp(24px, 4vw, 44px);
  border-radius: 22px;
  padding: clamp(24px, 4vw, 38px);
}

.recovery-preparation > header {
  align-self: start;
}

.recovery-preparation h2,
.recovery-care-note h2 {
  margin-top: 7px;
  font-size: clamp(24px, 3vw, 32px);
  line-height: 1.12;
  letter-spacing: -.03em;
}

.recovery-preparation > header > p:last-child,
.recovery-preparation article p,
.recovery-care-note > div > p:last-child {
  color: var(--recovery-muted);
  line-height: 1.65;
}

.recovery-preparation > header > p:last-child {
  margin-top: 12px;
  font-size: 13px;
}

.recovery-preparation-list {
  display: grid;
  gap: 0;
}

.recovery-preparation article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 15px;
  padding: 17px 0;
  border-top: 1px solid var(--recovery-line);
}

.recovery-preparation article:first-child {
  padding-top: 0;
  border-top: 0;
}

.recovery-preparation article:last-child {
  padding-bottom: 0;
}

.recovery-preparation article > span {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: var(--recovery-mint);
  color: var(--recovery-teal-dark);
}

.recovery-preparation h3 {
  margin-bottom: 5px;
  font-size: 15px;
}

.recovery-preparation article p {
  font-size: 13px;
}

.recovery-care-note {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 17px;
  border-radius: 20px;
  background: var(--recovery-navy);
  color: #fff;
  padding: clamp(20px, 3vw, 28px);
}

.recovery-care-note > span {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid rgba(255, 255, 255, .2);
  border-radius: 15px;
  background: rgba(255, 255, 255, .08);
  color: #a9ddd2;
}

.recovery-care-note .recovery-eyebrow {
  color: #a9ddd2;
}

.recovery-care-note h2 {
  color: #fff;
  font-size: 22px;
}

.recovery-care-note > div > p:last-child {
  max-width: 720px;
  margin-top: 7px;
  color: rgba(255, 255, 255, .72);
  font-size: 13px;
}

.recovery-care-note button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  border: 1px solid rgba(255, 255, 255, .45);
  border-radius: 11px;
  background: transparent;
  color: #fff;
  padding: 0 15px;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
}

.recovery-care-note button:hover {
  border-color: #fff;
  background: rgba(255, 255, 255, .08);
}

.recovery-plan-page button:focus-visible {
  outline: 3px solid #53b9af;
  outline-offset: 3px;
}

@media (max-width: 920px) {
  .recovery-availability,
  .recovery-preparation {
    grid-template-columns: 1fr;
  }

  .recovery-availability-copy {
    min-height: auto;
  }

  .recovery-now {
    border-top: 1px solid var(--recovery-line);
    border-left: 0;
  }
}

@media (max-width: 640px) {
  .recovery-plan-page {
    gap: 12px;
  }

  .recovery-availability,
  .recovery-preparation,
  .recovery-care-note {
    border-radius: 18px;
  }

  .recovery-availability-copy,
  .recovery-now,
  .recovery-preparation {
    padding: 21px;
  }

  .recovery-availability h1 {
    font-size: clamp(34px, 12vw, 46px);
  }

  .recovery-actions,
  .recovery-actions .ui-button {
    width: 100%;
  }

  .recovery-care-note {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .recovery-care-note button {
    grid-column: 1 / -1;
    width: 100%;
  }
}

@media (max-width: 380px) {
  .recovery-availability-copy,
  .recovery-now,
  .recovery-preparation {
    padding: 18px;
  }

  .recovery-care-note {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .recovery-plan-page *,
  .recovery-plan-page *::before,
  .recovery-plan-page *::after {
    scroll-behavior: auto;
  }
}

@media (forced-colors: active) {
  .recovery-availability,
  .recovery-preparation,
  .recovery-care-note,
  .recovery-now,
  .recovery-availability-copy,
  .recovery-status,
  .recovery-now-icon,
  .recovery-preparation article > span {
    border-color: CanvasText;
    background: Canvas;
    color: CanvasText;
  }

  .recovery-care-note h2,
  .recovery-care-note .recovery-eyebrow,
  .recovery-care-note > div > p:last-child {
    color: CanvasText;
  }

  .recovery-availability-copy::after {
    display: none;
  }
}
`;
