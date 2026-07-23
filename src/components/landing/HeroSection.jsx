import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileCheck2,
  LockKeyhole,
  MapPinned,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

export function HeroSection() {
  return (
    <section id="top" className="care-hero" aria-labelledby="landing-title">
      <div className="container care-hero-grid">
        <div className="care-hero-copy">
          <p className="care-kicker">
            <CheckCircle2 size={16} aria-hidden="true" />
            Trợ lý sức khỏe số trước khi đi khám
          </p>
          <h1 id="landing-title">
            <span className="care-hero-title-main">Điều hướng y tế.</span>
            <span className="care-hero-title-highlight">Sẵn sàng trước khi khám.</span>
          </h1>
          <p className="care-hero-lead">
            Phân tích triệu chứng qua câu hỏi lâm sàng, xem kết quả tham khảo, chuẩn bị câu hỏi
            cho bác sĩ và tìm cơ sở y tế phù hợp.
          </p>

          <div className="care-hero-actions">
            <a className="care-button care-button-primary" href="/medical-assistant">
              <Stethoscope size={19} aria-hidden="true" />
              Phân tích triệu chứng
            </a>
            <a className="care-button care-button-secondary" href="/map">
              <MapPinned size={19} aria-hidden="true" />
              Tìm cơ sở y tế
            </a>
          </div>

          <p className="care-hero-disclaimer">
            <ShieldAlert size={18} aria-hidden="true" />
            Kết quả AI chỉ mang tính tham khảo, không phải chẩn đoán và không thay thế bác sĩ.
          </p>
        </div>

        <aside className="care-dossier" aria-labelledby="care-dossier-title">
          <div className="care-dossier-header">
            <span className="care-start-icon" aria-hidden="true">
              <img src="/logo.svg" alt="" width="38" height="38" />
            </span>
            <div>
              <span>Hồ sơ chuẩn bị trước khám</span>
              <strong id="care-dossier-title">Bắt đầu từ điều bạn đang cảm nhận</strong>
            </div>
          </div>

          <a className="care-dossier-start" href="/medical-assistant">
            <span className="care-option-icon"><Stethoscope size={21} aria-hidden="true" /></span>
            <span>
              <small>Bắt đầu một phiên mới</small>
              <strong>Mô tả triệu chứng bằng lời của bạn</strong>
            </span>
            <ArrowRight size={19} aria-hidden="true" />
          </a>

          <div className="care-dossier-output">
            <p>Sau phiên phân tích, bạn có thể xem</p>
            <ul>
              <li>
                <FileCheck2 size={18} aria-hidden="true" />
                <span>Tóm tắt triệu chứng và câu trả lời</span>
              </li>
              <li>
                <MapPinned size={18} aria-hidden="true" />
                <span>Chuyên khoa có thể liên quan</span>
              </li>
              <li>
                <MessageSquareText size={18} aria-hidden="true" />
                <span>Câu hỏi để chuẩn bị trao đổi với bác sĩ</span>
              </li>
            </ul>
          </div>

          <div className="care-urgent-note">
            <ShieldAlert size={20} aria-hidden="true" />
            <p>
              Nếu có dấu hiệu nghiêm trọng, hãy liên hệ dịch vụ cấp cứu hoặc đến cơ sở y tế gần nhất.
            </p>
          </div>
        </aside>
      </div>

      <div className="container care-trust-strip" aria-label="Thông tin quan trọng về MediMate">
        <article>
          <ShieldCheck size={21} aria-hidden="true" />
          <div>
            <strong>Giới hạn được nói rõ</strong>
            <span>Không chẩn đoán, không kê đơn và không thay thế bác sĩ.</span>
          </div>
        </article>
        <article>
          <Database size={21} aria-hidden="true" />
          <div>
            <strong>Thông tin theo dữ liệu hiện có</strong>
            <span>Cơ sở y tế và gói dịch vụ hiển thị theo dữ liệu từ hệ thống.</span>
          </div>
        </article>
        <article>
          <LockKeyhole size={21} aria-hidden="true" />
          <div>
            <strong>Bạn kiểm soát thông tin được chia sẻ</strong>
            <span>Chỉ nhập những thông tin cần thiết cho tính năng bạn sử dụng.</span>
          </div>
        </article>
      </div>
    </section>
  );
}
