import { Footer } from "../components/landing/PricingSection";
import { Navbar } from "../components/landing/Navbar";

const ROUTE_CONTENT = {
  "/product": {
    eyebrow: "Sản phẩm",
    title: "MediMate AI là không gian chăm sóc sức khỏe chủ động.",
    copy: "Từ nhập triệu chứng, lưu hồ sơ, nhắc thuốc đến gợi ý cơ sở y tế, sản phẩm được thiết kế để người dùng có thêm sự rõ ràng trước và sau khi gặp bác sĩ.",
    cards: [
      ["Demo nhanh", "Thử phân tích triệu chứng một phần ngay trên landing page."],
      ["Freemium", "Đăng nhập để lưu lịch sử, hồ sơ và nhắc lịch cơ bản."],
      ["Premium", "Mở khóa phân tích sâu, cảnh báo thuốc và báo cáo theo dõi dài hạn."],
    ],
  },
  "/features": {
    eyebrow: "Tính năng",
    title: "Các tính năng cốt lõi của MediMate AI.",
    copy: "Tập trung vào những việc người dùng thật sự cần: hiểu triệu chứng, chuẩn bị buổi khám, theo dõi điều trị và quản lý hồ sơ sức khỏe gia đình.",
    cards: [
      ["Phân tích triệu chứng", "Gợi ý chuyên khoa, mức ưu tiên và câu hỏi cần chuẩn bị."],
      ["Nhắc thuốc", "Theo dõi liều dùng, lịch tái khám và ghi nhận phản ứng sau uống thuốc."],
      ["Bản đồ y tế", "Tìm cơ sở phù hợp sau khi nhận gợi ý từ AI."],
    ],
  },
  "/pricing": {
    eyebrow: "Bảng giá",
    title: "Bắt đầu miễn phí, nâng cấp khi cần theo dõi sâu hơn.",
    copy: "Gói Cơ bản phù hợp để thử và lưu hồ sơ ban đầu. MediMate+ mở thêm phân tích nâng cao, cảnh báo tương tác thuốc và báo cáo sức khỏe dài hạn.",
    cards: [
      ["Cơ bản", "0đ mãi mãi với các tính năng theo dõi và gợi ý ban đầu."],
      ["MediMate+", "149.000đ/tháng cho người cần theo dõi nghiêm túc."],
      ["Đội ngũ", "Liên hệ để triển khai cho phòng khám hoặc nhóm chăm sóc."],
    ],
  },
  "/roadmap": {
    eyebrow: "Lộ trình",
    title: "Lộ trình phát triển sản phẩm.",
    copy: "MediMate AI sẽ tiếp tục mở rộng theo hướng theo dõi cá nhân hóa, kết nối cơ sở y tế và hỗ trợ bác sĩ có bối cảnh tốt hơn trước buổi khám.",
    cards: [
      ["Q2 2026", "Hoàn thiện demo triệu chứng, hồ sơ cá nhân và bản đồ cơ sở y tế."],
      ["Q3 2026", "Thêm nhắc thuốc nâng cao, báo cáo xu hướng và chia sẻ hồ sơ."],
      ["Q4 2026", "API tích hợp cho phòng khám, hệ thống đặt lịch và đội chăm sóc."],
    ],
  },
  "/api": {
    eyebrow: "API",
    title: "API cho đối tác y tế và ứng dụng chăm sóc sức khỏe.",
    copy: "Trang này mô tả định hướng API: phân tích triệu chứng, tóm tắt hồ sơ, tra cứu cơ sở y tế và đồng bộ nhắc lịch. API sẽ cần xác thực và phân quyền rõ ràng.",
    cards: [
      ["Symptom API", "Nhận mô tả triệu chứng và trả về gợi ý có cấu trúc."],
      ["Record API", "Tạo tóm tắt hồ sơ sức khỏe để chia sẻ có kiểm soát."],
      ["Clinic API", "Tra cứu cơ sở y tế, chuyên khoa và trạng thái đặt lịch."],
    ],
  },
  "/support": {
    eyebrow: "Hỗ trợ",
    title: "Kênh hỗ trợ dành cho người dùng MediMate AI.",
    copy: "Tổng hợp tài liệu, hướng dẫn sử dụng, trạng thái hệ thống và cộng đồng để người dùng tự xử lý nhanh các câu hỏi phổ biến.",
    cards: [
      ["Tài liệu", "Hướng dẫn nhập triệu chứng, lưu hồ sơ và quản lý nhắc thuốc."],
      ["Liên hệ", "Gửi câu hỏi cho đội hỗ trợ khi cần tư vấn triển khai."],
      ["Cộng đồng", "Theo dõi cập nhật, phản hồi và góp ý tính năng."],
    ],
  },
  "/help": {
    eyebrow: "Trung tâm trợ giúp",
    title: "Hướng dẫn dùng MediMate AI dễ hiểu từng bước.",
    copy: "Tìm câu trả lời cho các thao tác thường gặp: tạo hồ sơ, đọc kết quả AI, đặt nhắc thuốc, dùng bản đồ và nâng cấp gói.",
    cards: [
      ["Bắt đầu", "Tạo tài khoản Freemium và nhập triệu chứng đầu tiên."],
      ["Theo dõi", "Lưu lịch sử, đặt nhắc thuốc và xem báo cáo."],
      ["Nâng cấp", "So sánh Freemium với Premium trước khi thanh toán."],
    ],
  },
  "/contact": {
    eyebrow: "Liên hệ",
    title: "Trao đổi với đội MediMate AI.",
    copy: "Bạn có thể gửi yêu cầu tư vấn triển khai, hợp tác phòng khám hoặc phản hồi sản phẩm. Đây là trang nội dung mẫu cho landing page.",
    cards: [
      ["Email", "hello@medimate.ai"],
      ["Đối tác", "Hợp tác cơ sở y tế, phòng khám và nền tảng sức khỏe."],
      ["Hỗ trợ", "Phản hồi lỗi, góp ý UX và yêu cầu tính năng mới."],
    ],
  },
  "/status": {
    eyebrow: "Trạng thái hệ thống",
    title: "Theo dõi tình trạng vận hành của MediMate AI.",
    copy: "Trang trạng thái minh họa các thành phần quan trọng như API phân tích, bản đồ, đăng nhập và thông báo nhắc lịch.",
    cards: [
      ["AI Analysis", "Hoạt động bình thường"],
      ["Map Service", "Hoạt động bình thường"],
      ["Notification", "Đang theo dõi độ trễ thông báo"],
    ],
  },
  "/community": {
    eyebrow: "Cộng đồng",
    title: "Cùng xây trải nghiệm y tế số tốt hơn.",
    copy: "Cộng đồng là nơi người dùng góp ý, chia sẻ nhu cầu thực tế và theo dõi các thử nghiệm tính năng mới của MediMate AI.",
    cards: [
      ["Feedback", "Gửi đề xuất để cải thiện demo và luồng Freemium."],
      ["Beta", "Tham gia thử nghiệm Premium trước khi phát hành rộng."],
      ["Updates", "Theo dõi lộ trình và thông báo sản phẩm."],
    ],
  },
  "/legal": {
    eyebrow: "Pháp lý",
    title: "Các tài liệu pháp lý và nguyên tắc sử dụng.",
    copy: "MediMate AI cần minh bạch về giới hạn y khoa, dữ liệu cá nhân, cookie và điều khoản dịch vụ trước khi người dùng đăng ký.",
    cards: [
      ["Điều khoản", "Quy định sử dụng sản phẩm và giới hạn trách nhiệm."],
      ["Bảo mật", "Cách thu thập, lưu trữ và bảo vệ dữ liệu."],
      ["Disclaimer y tế", "AI chỉ hỗ trợ tham khảo, không thay thế bác sĩ."],
    ],
  },
  "/terms": {
    eyebrow: "Điều khoản",
    title: "Điều khoản sử dụng MediMate AI.",
    copy: "Người dùng cần dùng thông tin AI như nguồn tham khảo, không tự ý chẩn đoán hoặc thay đổi điều trị khi chưa trao đổi với chuyên gia y tế.",
    cards: [
      ["Tài khoản", "Bạn chịu trách nhiệm bảo mật thông tin đăng nhập."],
      ["Sử dụng hợp lý", "Không dùng sản phẩm cho tình huống cấp cứu thay vì gọi cấp cứu."],
      ["Nội dung", "Kết quả AI có thể thay đổi theo dữ liệu bạn cung cấp."],
    ],
  },
  "/privacy": {
    eyebrow: "Bảo mật",
    title: "Bảo vệ dữ liệu sức khỏe cá nhân.",
    copy: "Dữ liệu sức khỏe là nhạy cảm. Thiết kế sản phẩm nên ưu tiên phân quyền, mã hóa, tối thiểu hóa dữ liệu và quyền xóa hồ sơ.",
    cards: [
      ["Tối thiểu hóa", "Chỉ thu thập dữ liệu cần thiết cho tính năng."],
      ["Kiểm soát", "Người dùng có thể xem, chỉnh sửa hoặc xóa hồ sơ."],
      ["Chia sẻ", "Không chia sẻ dữ liệu y tế nếu chưa có sự đồng ý rõ ràng."],
    ],
  },
  "/cookies": {
    eyebrow: "Cookie",
    title: "Chính sách cookie.",
    copy: "Cookie được dùng để duy trì phiên đăng nhập, đo hiệu năng và cải thiện trải nghiệm. Người dùng nên có lựa chọn bật tắt nhóm cookie không thiết yếu.",
    cards: [
      ["Thiết yếu", "Duy trì đăng nhập và bảo mật phiên."],
      ["Phân tích", "Đo hiệu năng trang và hành vi tổng hợp."],
      ["Tùy chọn", "Lưu lựa chọn giao diện và cài đặt trải nghiệm."],
    ],
  },
  "/medical-disclaimer": {
    eyebrow: "Disclaimer y tế",
    title: "MediMate AI không thay thế chẩn đoán y khoa.",
    copy: "Kết quả phân tích chỉ mang tính tham khảo, hỗ trợ chuẩn bị thông tin và theo dõi. Trong trường hợp khẩn cấp, người dùng cần liên hệ cấp cứu hoặc cơ sở y tế gần nhất.",
    cards: [
      ["Không chẩn đoán", "AI không kết luận bệnh và không kê đơn thuốc."],
      ["Cần bác sĩ", "Quyết định điều trị thuộc về chuyên gia y tế."],
      ["Cấp cứu", "Đau ngực dữ dội, khó thở nặng hoặc ngất cần gọi cấp cứu ngay."],
    ],
  },
  "/login": {
    eyebrow: "Đăng nhập",
    title: "Đăng nhập để dùng Freemium.",
    copy: "Trang đăng nhập mẫu cho landing page. Sau khi đăng nhập, người dùng có thể lưu hồ sơ, xem lại phân tích và dùng các tính năng Freemium.",
    cards: [
      ["Lưu lịch sử", "Giữ lại các lần nhập triệu chứng để theo dõi thay đổi."],
      ["Hồ sơ cá nhân", "Quản lý thông tin nền, thuốc đang dùng và lịch tái khám."],
      ["Nâng cấp sau", "Khám phá Premium khi cần phân tích sâu hơn."],
    ],
  },
  "/signup": {
    eyebrow: "Dùng thử miễn phí",
    title: "Tạo tài khoản Freemium trong vài phút.",
    copy: "Trang đăng ký mẫu. Người dùng có thể bắt đầu miễn phí trước, sau đó nâng cấp MediMate+ khi cần theo dõi dài hạn.",
    cards: [
      ["Không cần thẻ", "Bắt đầu với gói Cơ bản miễn phí."],
      ["Demo trước", "Có thể thử nhập triệu chứng trước khi tạo tài khoản."],
      ["Premium", "Mở khóa báo cáo, cảnh báo thuốc và chia sẻ hồ sơ."],
    ],
  },
  "/demo": {
    eyebrow: "Demo",
    title: "Demo nhập triệu chứng có sẵn trên landing page.",
    copy: "Bạn có thể quay lại phần demo để nhập triệu chứng, xem preview miễn phí và chọn đăng nhập Freemium hoặc khám phá Premium.",
    cards: [
      ["Preview AI", "Nhận chuyên khoa gợi ý và mức ưu tiên cơ bản."],
      ["Freemium", "Đăng nhập để lưu kết quả."],
      ["Premium", "Theo dõi sâu và mở các cảnh báo nâng cao."],
    ],
  },
};

function NotFoundPage() {
  return {
    eyebrow: "Không tìm thấy",
    title: "Trang này chưa tồn tại.",
    copy: "Đường dẫn bạn mở chưa có nội dung. Quay lại landing page để tiếp tục khám phá MediMate AI.",
    cards: [
      ["Landing page", "Quay lại trang chủ để xem demo, bản đồ và bảng giá."],
      ["Hỗ trợ", "Mở trang liên hệ nếu bạn cần thêm thông tin."],
      ["Bảng giá", "Xem các gói Freemium và Premium."],
    ],
  };
}

export default function StaticPage({ path }) {
  const page = ROUTE_CONTENT[path] ?? NotFoundPage();

  return (
    <main className="landing-page">
      <Navbar />
      <section className="static-hero">
        <div className="container">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p>{page.copy}</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/#demo">
              Thử demo triệu chứng
            </a>
            <a className="btn btn-ghost" href="/">
              Về landing page
            </a>
          </div>
        </div>
      </section>

      <section className="section static-content">
        <div className="container static-grid">
          {page.cards.map(([title, body]) => (
            <article className="feature-card" key={title}>
              <div className="feature-icon">+</div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
