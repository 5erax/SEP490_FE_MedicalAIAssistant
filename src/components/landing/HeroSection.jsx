import {
  ArrowRight,
  CheckCircle2,
  Database,
  LockKeyhole,
  MapPinned,
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
            Trợ lý định hướng trước khi đi khám
          </p>
          <h1 id="landing-title">
            Chuẩn bị rõ ràng hơn <span>trước khi đi khám.</span>
          </h1>
          <p className="care-hero-lead">
            Mô tả điều bạn đang gặp, nhận gợi ý chuyên khoa để tham khảo và tìm cơ sở
            y tế đang có trên hệ thống.
          </p>

          <div className="care-hero-actions">
            <a className="care-button care-button-primary" href="/medical-assistant">
              <Stethoscope size={19} aria-hidden="true" />
              Mô tả triệu chứng
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

        <aside className="care-start-card" aria-labelledby="care-start-title">
          <div className="care-start-card-header">
            <span className="care-start-icon" aria-hidden="true">
              <img src="/logo.svg" alt="" width="38" height="38" />
            </span>
            <div>
              <span>Bắt đầu tại đây</span>
              <strong id="care-start-title">Hôm nay bạn cần hỗ trợ điều gì?</strong>
            </div>
          </div>

          <div className="care-start-options">
            <a href="/medical-assistant">
              <span className="care-option-icon"><Stethoscope size={21} aria-hidden="true" /></span>
              <span>
                <strong>Chưa biết nên khám khoa nào</strong>
                <small>Mô tả triệu chứng bằng lời của bạn</small>
              </span>
              <ArrowRight size={19} aria-hidden="true" />
            </a>
            <a href="/map">
              <span className="care-option-icon"><MapPinned size={21} aria-hidden="true" /></span>
              <span>
                <strong>Muốn tìm một cơ sở y tế</strong>
                <small>Xem thông tin cơ sở và các khoa hiện có</small>
              </span>
              <ArrowRight size={19} aria-hidden="true" />
            </a>
          </div>

          <div className="care-urgent-note">
            <ShieldAlert size={20} aria-hidden="true" />
            <p>
              Nếu bạn có dấu hiệu nghiêm trọng, hãy ưu tiên trợ giúp y tế khẩn cấp.
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
            <strong>Bạn chủ động thông tin cung cấp</strong>
            <span>Chỉ nhập thông tin cần thiết cho tính năng bạn chọn.</span>
          </div>
        </article>
      </div>
    </section>
  );
}
