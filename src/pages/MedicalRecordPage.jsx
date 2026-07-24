import {
  ArrowRight,
  Bot,
  Database,
  FileHeart,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Button } from "../components/ui";
import { navigate } from "../router/navigation";

const recordPrinciples = [
  {
    icon: Database,
    title: "Không dùng dữ liệu mẫu",
    text: "MediMate không hiển thị hồ sơ hoặc kết quả giả như dữ liệu sức khỏe của bạn.",
  },
  {
    icon: ShieldCheck,
    title: "Chỉ hiển thị dữ liệu có nguồn",
    text: "Thông tin chỉ xuất hiện khi có dữ liệu thực từ tính năng được hỗ trợ.",
  },
  {
    icon: LockKeyhole,
    title: "Quyền truy cập phải được kiểm soát",
    text: "Khả năng lưu trữ chỉ được mở khi cơ chế bảo vệ dữ liệu đã sẵn sàng.",
  },
];

export default function MedicalRecordPage() {
  return (
    <div className="records-page records-unavailable-page">
      <style>{styles}</style>

      <section className="records-intro" aria-labelledby="records-title">
        <div className="records-copy">
          <div className="records-kicker">
            <FileHeart aria-hidden="true" size={17} />
            <span>HỒ SƠ Y TẾ</span>
          </div>
          <h1 id="records-title">Hồ sơ y tế chưa được mở trên MediMate</h1>
          <p>
            Hiện tại trang này chưa lưu trữ hoặc hiển thị hồ sơ sức khỏe cá nhân.
            Bạn sẽ không thấy dữ liệu mẫu được trình bày như thông tin thật.
          </p>

          <div className="records-status-note" role="status">
            <span aria-hidden="true"><LockKeyhole size={18} /></span>
            <div>
              <strong>Chưa khả dụng</strong>
              <p>Không có hồ sơ nào được tạo hoặc lưu từ màn hình này.</p>
            </div>
          </div>

          <div className="records-actions">
            <Button type="button" onClick={() => navigate("/symptom")}>
              <Stethoscope aria-hidden="true" size={18} />
              Mở phân tích lâm sàng
              <ArrowRight aria-hidden="true" size={17} />
            </Button>
            <Button type="button" tone="secondary" onClick={() => navigate("/chat")}>
              <Bot aria-hidden="true" size={18} />
              Mở trợ lý AI
            </Button>
          </div>
        </div>

        <div className="records-folder" role="group" aria-label="Trạng thái hồ sơ y tế">
          <div className="records-folder-tab" aria-hidden="true">MEDIMATE</div>
          <div className="records-folder-seal" aria-hidden="true">
            <FileHeart size={34} />
          </div>
          <div className="records-folder-copy">
            <span>TRẠNG THÁI HIỆN TẠI</span>
            <strong>Chưa có dữ liệu hồ sơ</strong>
            <p>Tính năng lưu trữ chưa được cung cấp.</p>
          </div>
          <div className="records-folder-lock">
            <LockKeyhole aria-hidden="true" size={16} />
            <span>Không phát sinh dữ liệu từ trang này</span>
          </div>
        </div>
      </section>

      <section className="records-principles" aria-labelledby="records-principles-title">
        <div className="records-principles-heading">
          <span>NGUYÊN TẮC HIỂN THỊ</span>
          <h2 id="records-principles-title">Thông tin sức khỏe cần rõ nguồn và đúng ngữ cảnh</h2>
        </div>
        <div className="records-principles-grid">
          {recordPrinciples.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <span className="records-principle-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const styles = `
.records-unavailable-page {
  --records-ink: #0b2d36;
  --records-teal: #087f78;
  --records-teal-dark: #07635f;
  --records-mint: #e8f6f2;
  --records-line: #c9ded8;
  --records-muted: #587078;
  min-height: calc(100svh - 154px);
  display: grid;
  align-content: center;
  gap: clamp(18px, 2.4vw, 28px);
  background:
    radial-gradient(circle at 8% 12%, rgba(204, 237, 229, 0.68), transparent 27%),
    #f7faf7;
  color: var(--records-ink);
  padding: clamp(18px, 3vw, 34px);
}

.records-intro,
.records-principles {
  width: min(100%, 1080px);
  margin: 0 auto;
}

.records-intro {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(320px, 0.88fr);
  align-items: center;
  gap: clamp(36px, 7vw, 84px);
  border: 1px solid var(--records-line);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  padding: clamp(26px, 4.5vw, 58px);
  box-shadow: 0 24px 68px rgba(20, 67, 63, 0.09);
}

.records-copy {
  min-width: 0;
}

.records-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--records-teal-dark);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.1em;
}

.records-copy h1 {
  max-width: 650px;
  margin: 15px 0 16px;
  color: var(--records-ink);
  font-size: clamp(34px, 4.4vw, 58px);
  line-height: 1.02;
  letter-spacing: -0.045em;
}

.records-copy > p {
  max-width: 640px;
  margin: 0;
  color: var(--records-muted);
  font-size: 15px;
  line-height: 1.72;
}

.records-status-note {
  max-width: 640px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 24px;
  border-left: 3px solid var(--records-teal);
  background: var(--records-mint);
  padding: 14px 16px;
}

.records-status-note > span {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #fff;
  color: var(--records-teal-dark);
}

.records-status-note strong,
.records-status-note p {
  display: block;
  margin: 0;
}

.records-status-note strong {
  font-size: 14px;
}

.records-status-note p {
  margin-top: 3px;
  color: var(--records-muted);
  font-size: 12px;
  line-height: 1.5;
}

.records-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;
}

.records-actions .ui-button {
  min-height: 46px;
  border-radius: 13px;
  white-space: nowrap;
}

.records-actions .ui-button:first-child {
  background: var(--records-teal-dark);
  color: #fff;
}

.records-actions .ui-button:first-child:hover {
  background: var(--records-teal);
}

.records-folder {
  position: relative;
  min-height: 360px;
  display: grid;
  align-content: end;
  gap: 20px;
  overflow: hidden;
  border: 1px solid #a9cec5;
  border-radius: 20px 20px 20px 8px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.55), transparent 45%),
    #dcefe9;
  padding: 34px 28px 28px;
  box-shadow:
    14px 14px 0 rgba(8, 127, 120, 0.08),
    0 24px 50px rgba(20, 67, 63, 0.12);
}

.records-folder::before {
  content: "";
  position: absolute;
  top: 28px;
  right: 28px;
  width: 92px;
  height: 92px;
  border: 1px solid rgba(8, 127, 120, 0.16);
  border-radius: 50%;
}

.records-folder::after {
  content: "";
  position: absolute;
  top: 46px;
  right: 46px;
  width: 54px;
  height: 54px;
  border: 1px solid rgba(8, 127, 120, 0.14);
  border-radius: 50%;
}

.records-folder-tab {
  position: absolute;
  top: -1px;
  left: -1px;
  min-width: 144px;
  border: 1px solid #a9cec5;
  border-bottom-right-radius: 16px;
  background: #fff;
  padding: 10px 18px;
  color: var(--records-teal-dark);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.records-folder-seal {
  width: 66px;
  height: 66px;
  display: grid;
  place-items: center;
  border: 1px solid #9ac5ba;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--records-teal-dark);
}

.records-folder-copy {
  position: relative;
  z-index: 1;
}

.records-folder-copy span,
.records-folder-copy strong,
.records-folder-copy p {
  display: block;
}

.records-folder-copy span {
  color: var(--records-teal-dark);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.1em;
}

.records-folder-copy strong {
  margin-top: 8px;
  font-size: clamp(22px, 2.5vw, 30px);
  line-height: 1.12;
  letter-spacing: -0.025em;
}

.records-folder-copy p {
  margin: 7px 0 0;
  color: var(--records-muted);
  font-size: 13px;
}

.records-folder-lock {
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid rgba(7, 99, 95, 0.18);
  padding-top: 16px;
  color: var(--records-teal-dark);
  font-size: 11px;
  font-weight: 700;
}

.records-principles {
  display: grid;
  grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1.3fr);
  align-items: start;
  gap: clamp(24px, 5vw, 60px);
  border-top: 1px solid var(--records-line);
  padding: 24px 4px 0;
}

.records-principles-heading > span {
  color: var(--records-teal-dark);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.1em;
}

.records-principles-heading h2 {
  margin: 8px 0 0;
  font-size: clamp(20px, 2.2vw, 28px);
  line-height: 1.2;
  letter-spacing: -0.025em;
}

.records-principles-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.records-principles-grid article {
  min-width: 0;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: start;
  gap: 11px;
  border: 1px solid var(--records-line);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.72);
  padding: 15px;
}

.records-principle-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: var(--records-mint);
  color: var(--records-teal-dark);
}

.records-principles-grid h3,
.records-principles-grid p {
  margin: 0;
}

.records-principles-grid h3 {
  font-size: 13px;
  line-height: 1.35;
}

.records-principles-grid p {
  margin-top: 5px;
  color: var(--records-muted);
  font-size: 11px;
  line-height: 1.5;
}

.records-unavailable-page button:focus-visible {
  outline: 3px solid #f0a22e;
  outline-offset: 3px;
}

@media (max-width: 980px) {
  .records-unavailable-page {
    align-content: start;
  }

  .records-intro {
    grid-template-columns: 1fr;
  }

  .records-folder {
    min-height: 300px;
  }

  .records-principles {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .records-unavailable-page {
    min-height: 0;
    padding: 14px;
  }

  .records-intro {
    gap: 28px;
    border-radius: 20px;
    padding: 22px 18px;
  }

  .records-copy h1 {
    font-size: 36px;
  }

  .records-actions,
  .records-actions .ui-button {
    width: 100%;
  }

  .records-actions .ui-button {
    justify-content: center;
  }

  .records-folder {
    min-height: 280px;
    padding: 32px 22px 22px;
  }

  .records-principles-grid {
    grid-template-columns: 1fr;
  }
}

@media (forced-colors: active) {
  .records-unavailable-page,
  .records-intro,
  .records-status-note,
  .records-folder,
  .records-folder-tab,
  .records-folder-seal,
  .records-principles-grid article {
    background: Canvas;
    color: CanvasText;
  }

  .records-status-note,
  .records-folder,
  .records-principles-grid article {
    border: 1px solid ButtonBorder;
  }

  .records-actions .ui-button:first-child,
  .records-principle-icon {
    background: Highlight;
    color: HighlightText;
  }
}
`;
