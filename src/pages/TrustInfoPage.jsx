import {
  ArrowRight,
  BadgeInfo,
  CircleAlert,
  CircleHelp,
  ClipboardCheck,
  CreditCard,
  Database,
  ExternalLink,
  HeartPulse,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  MapPinned,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserRoundCheck,
} from "lucide-react";
import { Footer } from "../components/landing/PricingSection";
import { Navbar } from "../components/landing/Navbar";

const TRUST_PAGES = {
  support: {
    eyebrow: "Trung tâm hỗ trợ",
    title: "Tìm đúng hướng khi bạn cần trợ giúp.",
    intro: "Chọn vấn đề bạn đang gặp để mở đúng phần của MediMate. Trang này ưu tiên các bước tự xử lý đang có trên hệ thống và không yêu cầu bạn chia sẻ dữ liệu sức khỏe.",
    icon: LifeBuoy,
    facts: [
      [CircleHelp, "Hướng dẫn theo vấn đề", "Đi thẳng đến tài khoản, gói dịch vụ hoặc tính năng công khai."],
      [ShieldCheck, "Không gửi dữ liệu nhạy cảm", "Không chia sẻ mật khẩu, mã đăng nhập hoặc nội dung hồ sơ y tế."],
      [HeartPulse, "Không dùng cho cấp cứu", "Liên hệ dịch vụ cấp cứu tại nơi bạn sống nếu tình huống đe dọa tính mạng."],
    ],
    notice: {
      tone: "info",
      title: "Kênh hỗ trợ trực tiếp chưa được công bố trên website",
      body: "MediMate hiện cung cấp hướng dẫn tự phục vụ trên trang này. Không gửi dữ liệu cá nhân hoặc dữ liệu sức khỏe đến email, số điện thoại hay tài khoản mạng xã hội không được công bố chính thức.",
    },
    sections: [
      {
        id: "start",
        title: "Chọn nội dung bạn cần hỗ trợ",
        intro: "Mỗi lựa chọn bên dưới dẫn đến chức năng đang có trên hệ thống.",
        cards: [
          { icon: KeyRound, title: "Tài khoản và đăng nhập", body: "Đăng nhập lại hoặc đặt lại mật khẩu khi bạn không thể vào tài khoản.", links: [["Mở trang đăng nhập", "/login"], ["Đặt lại mật khẩu", "/forgot-password"]] },
          { icon: CreditCard, title: "Gói dịch vụ và thanh toán", body: "Xem gói đang cung cấp, hạn mức và trạng thái được hệ thống trả về.", links: [["Xem bảng giá", "/pricing"], ["Mở hồ sơ cá nhân", "/profile"]] },
          { icon: Stethoscope, title: "Tính năng trước khi đi khám", body: "Mở hướng dẫn mô tả triệu chứng hoặc tìm cơ sở y tế trên bản đồ.", links: [["Mở trợ lý y tế", "/symptom"], ["Tìm cơ sở y tế", "/map"]] },
        ],
      },
      {
        id: "troubleshoot",
        title: "Khi trang không tải hoặc dữ liệu chưa cập nhật",
        intro: "Thử lần lượt các bước này. Dừng lại nếu thao tác yêu cầu bạn cung cấp mật khẩu hoặc mã truy cập cho người khác.",
        steps: [
          ["01", "Tải lại trang một lần", "Chờ yêu cầu hiện tại kết thúc rồi tải lại. Tránh bấm thanh toán nhiều lần."],
          ["02", "Kiểm tra kết nối và phiên đăng nhập", "Xác nhận mạng ổn định. Nếu phiên đã hết hạn, đăng nhập lại từ trang chính thức."],
          ["03", "Ghi lại thông tin không nhạy cảm", "Ghi đường dẫn trang, thời điểm xảy ra và thông báo lỗi. Không chụp token, cookie hay nội dung hồ sơ."],
          ["04", "Kiểm tra trạng thái trong tài khoản", "Với gói dịch vụ, mở lại bảng giá hoặc hồ sơ sau vài phút để xem trạng thái mới nhất."],
        ],
      },
      {
        id: "safety",
        title: "Hỗ trợ kỹ thuật không thay thế trợ giúp y tế",
        intro: "Nếu bạn lo ngại về triệu chứng, hãy ưu tiên cơ sở y tế hoặc chuyên gia y tế. Đừng chờ phản hồi kỹ thuật trong tình huống khẩn cấp.",
        links: [["Đọc tuyên bố miễn trừ y tế", "/medical-disclaimer"], ["Mở bản đồ cơ sở y tế", "/map"]],
      },
    ],
  },
  privacy: {
    eyebrow: "Quyền riêng tư",
    title: "Hiểu dữ liệu nào được dùng và khi nào.",
    intro: "MediMate xử lý dữ liệu bạn chủ động cung cấp để vận hành tài khoản và các tính năng sức khỏe. Phần này mô tả hành vi hiện có trên giao diện, không đưa ra cam kết vượt quá hệ thống.",
    icon: LockKeyhole,
    facts: [
      [UserRoundCheck, "Bạn chọn nội dung nhập", "Chỉ cung cấp thông tin cần thiết cho chức năng bạn đang dùng."],
      [Database, "Dữ liệu theo từng chức năng", "Tài khoản, hồ sơ, hội thoại và thanh toán được gửi khi bạn thực hiện thao tác tương ứng."],
      [ShieldCheck, "Bảo vệ thông tin đăng nhập", "Không chia sẻ mật khẩu, mã truy cập hoặc ảnh chụp chứa thông tin xác thực."],
    ],
    notice: {
      tone: "calm",
      title: "Dữ liệu sức khỏe là dữ liệu nhạy cảm",
      body: "Không nhập thông tin của người khác khi chưa được phép. Với nội dung không cần thiết để sử dụng tính năng, hãy bỏ qua hoặc mô tả ở mức tối thiểu.",
    },
    sections: [
      {
        id: "data",
        title: "Những nhóm dữ liệu có thể được xử lý",
        intro: "Dữ liệu cụ thể phụ thuộc vào chức năng bạn chọn sử dụng.",
        cards: [
          { icon: UserRoundCheck, title: "Tài khoản", body: "Thông tin đăng ký, đăng nhập và vai trò tài khoản. Phiên đăng nhập được lưu trong trình duyệt để duy trì truy cập." },
          { icon: HeartPulse, title: "Thông tin sức khỏe", body: "Triệu chứng, câu trả lời lâm sàng, hồ sơ bệnh nhân hoặc nội dung trò chuyện khi bạn chủ động nhập." },
          { icon: ClipboardCheck, title: "Gói dịch vụ", body: "Gói đã chọn, trạng thái đăng ký và thông tin giao dịch cần thiết để theo dõi thanh toán." },
          { icon: BadgeInfo, title: "Dữ liệu kỹ thuật", body: "Tùy chọn hiển thị, thông tin phiên tạm thời và dữ liệu hiệu năng cần để vận hành, sửa lỗi giao diện." },
        ],
      },
      {
        id: "services",
        title: "Dịch vụ liên quan khi bạn dùng MediMate",
        intro: "Một số yêu cầu đi qua dịch vụ khác để hoàn thành đúng chức năng.",
        services: [
          ["Máy chủ MediMate", "Nhận yêu cầu API cho tài khoản, hồ sơ, trợ lý y tế, cơ sở y tế và gói dịch vụ."],
          ["Google", "Chỉ tham gia khi đăng nhập Google được bật và bạn chọn cách đăng nhập này."],
          ["PayOS", "Nhận thông tin cần thiết khi bạn chủ động bắt đầu thanh toán gói đăng ký."],
          ["CARTO và OpenStreetMap", "Cung cấp kiểu bản đồ và dữ liệu nền; trình duyệt cần gửi yêu cầu tải bản đồ đến các dịch vụ này."],
          ["Vercel Speed Insights", "Thu thập tín hiệu hiệu năng để theo dõi tốc độ và độ ổn định của website."],
        ],
      },
      {
        id: "choices",
        title: "Những lựa chọn bạn có trên giao diện",
        bullets: [
          "Không nhập dữ liệu sức khỏe khi bạn chưa sẵn sàng chia sẻ với chức năng đó.",
          "Đăng xuất khi dùng thiết bị chung và không lưu thông tin đăng nhập trên trình duyệt công cộng.",
          "Chỉ mở thanh toán khi bạn đã kiểm tra đúng tên gói, giá và thời hạn.",
          "Bạn có thể sửa các trường hồ sơ mà giao diện hiện cho phép chỉnh sửa.",
        ],
      },
      {
        id: "open-items",
        title: "Thông tin cần được công bố thêm trước khi phát hành chính thức",
        intro: "Website hiện chưa công bố đầu mối yêu cầu dữ liệu, thời hạn lưu trữ chi tiết hoặc quy trình yêu cầu xóa tài khoản. MediMate không nên khẳng định các quyền này đã có cho đến khi backend và quy trình vận hành hỗ trợ đầy đủ.",
      },
    ],
  },
  "medical-disclaimer": {
    eyebrow: "Tuyên bố miễn trừ y tế",
    title: "MediMate hỗ trợ chuẩn bị, không chẩn đoán hay kê đơn.",
    intro: "Kết quả từ AI chỉ mang tính tham khảo dựa trên thông tin bạn nhập. Chuyên gia y tế cần đánh giá trực tiếp để chẩn đoán, chỉ định xét nghiệm hoặc quyết định điều trị.",
    icon: ShieldAlert,
    facts: [
      [Stethoscope, "Không chẩn đoán", "Gợi ý từ AI không phải kết luận bệnh án."],
      [ClipboardCheck, "Không kê đơn", "Không tự bắt đầu, đổi liều hoặc ngừng thuốc chỉ vì nội dung AI."],
      [CircleAlert, "Không dùng cho cấp cứu", "Gọi dịch vụ cấp cứu địa phương khi có dấu hiệu đe dọa tính mạng."],
    ],
    notice: {
      tone: "warning",
      title: "Trong tình huống khẩn cấp, đừng chờ MediMate phản hồi",
      body: "Liên hệ dịch vụ cấp cứu tại nơi bạn sống hoặc đến cơ sở cấp cứu gần nhất. Nếu có thể, nhờ người ở cạnh hỗ trợ.",
    },
    sections: [
      {
        id: "can-do",
        title: "MediMate có thể hỗ trợ điều gì",
        cards: [
          { icon: ClipboardCheck, title: "Sắp xếp thông tin", body: "Giúp bạn mô tả triệu chứng rõ hơn và chuẩn bị câu hỏi trước khi gặp nhân viên y tế." },
          { icon: Stethoscope, title: "Định hướng tham khảo", body: "Đưa ra gợi ý chuyên khoa hoặc bước tiếp theo dựa trên dữ liệu bạn cung cấp." },
          { icon: MapPinned, title: "Tìm cơ sở y tế", body: "Hiển thị cơ sở có trong dữ liệu hệ thống để bạn tự xem và lựa chọn." },
        ],
      },
      {
        id: "cannot-do",
        title: "MediMate không thể thay thế",
        bullets: [
          "Khám trực tiếp, đo dấu hiệu sinh tồn hoặc xem toàn bộ bệnh sử.",
          "Xét nghiệm, chẩn đoán hình ảnh và đánh giá chuyên môn của bác sĩ.",
          "Chẩn đoán xác định, kê đơn hoặc quyết định thay đổi điều trị.",
          "Dịch vụ cấp cứu hay theo dõi liên tục khi tình trạng chuyển nặng.",
        ],
      },
      {
        id: "emergency",
        title: "Ví dụ về dấu hiệu cần trợ giúp khẩn cấp",
        intro: "Danh sách này không đầy đủ. Hãy gọi dịch vụ cấp cứu địa phương nếu bạn cho rằng tính mạng hoặc sự an toàn đang bị đe dọa.",
        bullets: [
          "Khó thở nặng, đau hoặc tức ngực nghiêm trọng.",
          "Bất tỉnh, co giật hoặc thay đổi ý thức đột ngột.",
          "Đột ngột yếu liệt một bên, khó nói, khó nhìn hoặc khó đi lại.",
          "Chảy máu không cầm, phản ứng dị ứng nặng hoặc sưng nhanh ở mặt, mắt, lưỡi.",
        ],
        source: ["Nguồn tham khảo về dấu hiệu cấp cứu: MedlinePlus", "https://medlineplus.gov/ency/article/001927.htm"],
      },
      {
        id: "safe-use",
        title: "Cách sử dụng kết quả AI an toàn hơn",
        steps: [
          ["01", "Kiểm tra lại thông tin đầu vào", "Bổ sung thời điểm khởi phát, mức độ và dấu hiệu đi kèm khi phù hợp."],
          ["02", "Xem kết quả là gợi ý", "Không coi tên bệnh hoặc chuyên khoa do AI đề xuất là kết luận y khoa."],
          ["03", "Trao đổi với chuyên gia y tế", "Mang theo thông tin đã chuẩn bị để bác sĩ hoặc nhân viên y tế đánh giá."],
        ],
        links: [["Tìm cơ sở y tế", "/map"]],
      },
    ],
  },
};

function PageLinks({ links }) {
  if (!links?.length) return null;

  return (
    <div className="trust-links">
      {links.map(([label, href]) => (
        <a href={href} key={href}>
          {label}
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function ContentSection({ section }) {
  return (
    <section className="trust-section" id={section.id} aria-labelledby={`${section.id}-title`}>
      <div className="trust-section-heading">
        <h2 id={`${section.id}-title`}>{section.title}</h2>
        {section.intro && <p>{section.intro}</p>}
      </div>

      {section.cards && (
        <div className="trust-card-grid">
          {section.cards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="trust-card" key={card.title}>
                <span className="trust-card-icon" aria-hidden="true"><Icon size={20} /></span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <PageLinks links={card.links} />
              </article>
            );
          })}
        </div>
      )}

      {section.steps && (
        <ol className="trust-steps">
          {section.steps.map(([number, title, body]) => (
            <li key={number}>
              <span aria-hidden="true">{number}</span>
              <div><h3>{title}</h3><p>{body}</p></div>
            </li>
          ))}
        </ol>
      )}

      {section.services && (
        <dl className="trust-services">
          {section.services.map(([name, description]) => (
            <div key={name}><dt>{name}</dt><dd>{description}</dd></div>
          ))}
        </dl>
      )}

      {section.bullets && (
        <ul className="trust-bullets">
          {section.bullets.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}

      {section.source && (
        <a className="trust-source" href={section.source[1]} target="_blank" rel="noreferrer">
          {section.source[0]}
          <ExternalLink size={15} aria-hidden="true" />
          <span className="sr-only"> (mở trong thẻ mới)</span>
        </a>
      )}

      <PageLinks links={section.links} />
    </section>
  );
}

export default function TrustInfoPage({ page }) {
  const content = TRUST_PAGES[page] ?? TRUST_PAGES.support;
  const HeroIcon = content.icon;

  return (
    <>
      <Navbar variant="landing" />
      <main className={`trust-page trust-page-${page}`}>
        <section className="trust-hero" aria-labelledby="trust-page-title">
          <div className="container trust-hero-grid">
            <div className="trust-hero-copy">
              <a className="trust-back-link" href="/">
                <ArrowRight size={16} aria-hidden="true" />
                Về trang chủ MediMate
              </a>
              <span className="trust-hero-icon" aria-hidden="true"><HeroIcon size={24} /></span>
              <p className="care-eyebrow">{content.eyebrow}</p>
              <h1 id="trust-page-title">{content.title}</h1>
              <p className="trust-intro">{content.intro}</p>
            </div>

            <div className="trust-fact-panel" aria-label="Thông tin chính">
              {content.facts.map(([Icon, title, body]) => (
                <div className="trust-fact" key={title}>
                  <span aria-hidden="true"><Icon size={19} /></span>
                  <div><strong>{title}</strong><p>{body}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="container trust-body">
          <aside className="trust-nav" aria-label="Nội dung trên trang">
            <div className="trust-nav-header">
              <strong>Trên trang này</strong>
              <span className="trust-nav-cue">
                Vuốt hoặc kéo ngang để xem thêm
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </div>
            <nav aria-label={`Mục lục ${content.eyebrow.toLowerCase()}`}>
              {content.sections.map((section) => (
                <a href={`#${section.id}`} key={section.id}>{section.title}</a>
              ))}
            </nav>
          </aside>

          <div className="trust-main-content">
            <div className={`trust-notice trust-notice-${content.notice.tone}`} role="note">
              <span aria-hidden="true"><ShieldAlert size={21} /></span>
              <div><strong>{content.notice.title}</strong><p>{content.notice.body}</p></div>
            </div>

            {content.sections.map((section) => (
              <ContentSection section={section} key={section.id} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
