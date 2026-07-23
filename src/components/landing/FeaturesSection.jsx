import {
  ArrowRight,
  ClipboardCheck,
  FolderHeart,
  MapPinned,
  MessagesSquare,
} from "lucide-react";

const SUPPORT_AREAS = [
  {
    icon: MessagesSquare,
    number: "01",
    title: "Trình bày triệu chứng dễ hơn",
    body: "Mô tả bằng lời của bạn. MediMate hỏi thêm về thời điểm, mức độ và dấu hiệu đi kèm.",
    action: "Mô tả triệu chứng",
    href: "/medical-assistant",
  },
  {
    icon: ClipboardCheck,
    number: "02",
    title: "Có định hướng để chọn chuyên khoa",
    body: "Nhận gợi ý chuyên khoa để tham khảo trước khi lựa chọn nơi khám.",
    action: "Nhận định hướng chuyên khoa",
    href: "/medical-assistant",
  },
  {
    icon: MapPinned,
    number: "03",
    title: "Tìm cơ sở y tế để tiếp tục",
    body: "Xem cơ sở đang có, khoa liên quan và thông tin liên hệ khi đã được cập nhật.",
    action: "Xem cơ sở y tế",
    href: "/map",
  },
];

export function FeaturesSection() {
  return (
    <section id="support" className="care-section care-support-section" aria-labelledby="support-title">
      <div className="container">
        <div className="care-section-heading">
          <div>
            <p className="care-eyebrow">MediMate giúp bạn</p>
            <h2 id="support-title">Ba việc bạn có thể làm trước khi đi khám.</h2>
          </div>
        </div>

        <div className="care-support-grid">
          {SUPPORT_AREAS.map(({ icon: Icon, number, title, body, action, href }) => (
            <article className="care-support-card" key={title}>
              <div className="care-support-card-top">
                <span className="care-support-icon"><Icon size={24} aria-hidden="true" /></span>
                <span className="care-support-number" aria-hidden="true">{number}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
              <a href={href}>
                {action}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>

        <div className="care-account-note">
          <span className="care-account-icon"><FolderHeart size={22} aria-hidden="true" /></span>
          <div>
            <strong>Thông tin của bạn, khi bạn cần xem lại</strong>
            <p>Đăng nhập để lưu hồ sơ sức khỏe và xem lại các phiên đã thực hiện.</p>
          </div>
          <a href="/login">
            Đăng nhập
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
