import {
  ArrowRight,
  Bot,
  Check,
  FolderHeart,
  History,
  MapPinned,
  Stethoscope,
} from "lucide-react";

const STARTING_PATHS = [
  {
    icon: Stethoscope,
    label: "Phân tích triệu chứng",
    title: "Làm rõ điều bạn đang cảm nhận",
    body: "Mô tả triệu chứng và trả lời một số câu hỏi ngắn. MediMate tổng hợp thông tin trong cùng một phiên để bạn dễ xem lại.",
    outcomes: [
      "Câu hỏi được điều chỉnh theo thông tin bạn cung cấp",
      "Kết quả tham khảo và chuyên khoa có thể liên quan",
      "Gợi ý câu hỏi để chuẩn bị trao đổi với bác sĩ",
    ],
    action: "Bắt đầu phân tích triệu chứng",
    href: "/medical-assistant",
    primary: true,
  },
  {
    icon: MapPinned,
    label: "Tìm cơ sở y tế",
    title: "Tìm nơi thăm khám trên hệ thống",
    body: "Tra cứu cơ sở đang hoạt động và xem những thông tin đã được cập nhật trước khi chọn nơi phù hợp.",
    outcomes: [
      "Vị trí của cơ sở khi có dữ liệu tọa độ hợp lệ",
      "Thông tin khoa và bác sĩ khi cơ sở đã cập nhật",
      "Trợ lý trước khám sau khi bạn chọn một cơ sở",
    ],
    action: "Tìm cơ sở trên bản đồ",
    href: "/map",
  },
];

const SUPPORTING_TOOLS = [
  {
    icon: Bot,
    title: "Trợ lý sức khỏe AI",
    body: "Hỏi thông tin sức khỏe ở mức tham khảo hoặc chuyển sang phân tích triệu chứng khi cần.",
    action: "Hỏi MediMate AI",
    href: "/medical-assistant",
  },
  {
    icon: FolderHeart,
    title: "Hồ sơ và lịch sử",
    body: "Đăng nhập để quản lý hồ sơ sức khỏe và mở lại những phiên bạn đã thực hiện.",
    action: "Tạo tài khoản MediMate",
    href: "/signup",
  },
];

export function FeaturesSection() {
  return (
    <section id="support" className="care-section care-support-section" aria-labelledby="support-title">
      <div className="container">
        <div className="care-section-heading care-section-header care-section-heading-single">
          <div>
            <p className="care-eyebrow">Bạn muốn bắt đầu từ đâu?</p>
            <h2 id="support-title">Chọn việc bạn cần làm trước.</h2>
          </div>
        </div>

        <div className="care-path-grid">
          {STARTING_PATHS.map((path) => {
            const Icon = path.icon;
            return (
              <article
                className={`care-path-card ${path.primary ? "care-path-card-primary" : ""}`}
                key={path.title}
              >
                <div className="care-path-card-heading">
                  <span className="care-path-icon"><Icon size={24} aria-hidden="true" /></span>
                  <p>{path.label}</p>
                </div>
                <h3>{path.title}</h3>
                <p className="care-path-description">{path.body}</p>
                <ul>
                  {path.outcomes.map((outcome) => (
                    <li key={outcome}>
                      <Check size={17} aria-hidden="true" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
                <a href={path.href}>
                  {path.action}
                  <ArrowRight size={17} aria-hidden="true" />
                </a>
              </article>
            );
          })}
        </div>

        <div className="care-supporting-tools" aria-label="Công cụ hỗ trợ khác">
          {SUPPORTING_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <article key={tool.title}>
                <span><Icon size={21} aria-hidden="true" /></span>
                <div>
                  <h3>{tool.title}</h3>
                  <p>{tool.body}</p>
                </div>
                <a href={tool.href}>
                  {tool.action}
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              </article>
            );
          })}
        </div>

        <p className="care-history-note">
          <History size={17} aria-hidden="true" />
          Lịch sử chỉ xuất hiện trong tài khoản của bạn sau khi đăng nhập.
        </p>
      </div>
    </section>
  );
}
