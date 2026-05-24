import { Footer } from "../components/landing/PricingSection";
import { Navbar } from "../components/landing/Navbar";

const COMMON_FAQS = [
  ["MediMate AI có thay thế bác sĩ không?", "Không. MediMate AI chỉ hỗ trợ sàng lọc thông tin, chuẩn bị câu hỏi và theo dõi. Quyết định chẩn đoán hoặc điều trị vẫn cần chuyên gia y tế."],
  ["Tôi có thể bắt đầu miễn phí không?", "Có. Gói Freemium cho phép dùng các tính năng cơ bản, lưu một phần hồ sơ và trải nghiệm luồng phân tích triệu chứng."],
  ["Dữ liệu sức khỏe có nhạy cảm không?", "Có. Các trang pháp lý trong demo này mô tả định hướng bảo vệ dữ liệu, phân quyền và giới hạn chia sẻ."],
];

const PAGES = {
  "/product": {
    eyebrow: "Sản phẩm",
    title: "Một không gian chăm sóc sức khỏe chủ động cho người Việt.",
    copy: "MediMate AI kết nối ba việc thường bị tách rời: hiểu triệu chứng, theo dõi điều trị và tìm nơi chăm sóc phù hợp. Người dùng có thể thử trước, đăng nhập Freemium để lưu hồ sơ, rồi nâng cấp Premium khi cần phân tích sâu hơn.",
    primary: ["Thử demo triệu chứng", "/#demo"],
    secondary: ["Xem bảng giá", "/pricing"],
    stats: [["3 bước", "từ demo đến theo dõi"], ["24/7", "nhắc lịch và ghi nhận"], ["Premium", "phân tích nâng cao"]],
    cards: [
      ["Demo trước khi đăng nhập", "Người dùng nhập triệu chứng và xem preview miễn phí để hiểu giá trị cốt lõi trước khi tạo tài khoản."],
      ["Freemium có hồ sơ", "Sau đăng nhập, người dùng lưu lịch sử, ghi thuốc đang dùng và quản lý nhắc lịch cơ bản."],
      ["Premium theo dõi sâu", "Mở thêm cảnh báo tương tác thuốc, báo cáo xu hướng và tóm tắt để chia sẻ với bác sĩ."],
    ],
    sections: [
      ["Luồng sản phẩm", ["Nhập triệu chứng bằng tiếng Việt tự nhiên.", "Nhận chuyên khoa gợi ý, mức ưu tiên và câu hỏi nên chuẩn bị.", "Lưu kết quả vào hồ sơ Freemium hoặc nâng cấp để theo dõi dài hạn."]],
      ["Trải nghiệm chính", ["Giao diện ít bước, ưu tiên chữ rõ và trạng thái dễ hiểu.", "Bản đồ giúp người dùng chuyển từ gợi ý chuyên khoa sang lựa chọn cơ sở y tế.", "Footer và CTA dẫn tới các trang nội dung đầy đủ thay vì link rỗng."]],
    ],
  },
  "/features": {
    eyebrow: "Tính năng",
    title: "Các tính năng cốt lõi để người dùng hiểu và theo dõi sức khỏe.",
    copy: "Bộ tính năng được thiết kế xoay quanh các khoảnh khắc thực tế: đang lo vì triệu chứng mới, chuẩn bị đi khám, uống thuốc sau khám và cần xem lại tiến triển sau vài ngày.",
    primary: ["Dùng thử miễn phí", "/signup"],
    secondary: null,
    stats: [["AI", "phân tích triệu chứng"], ["Map", "gợi ý cơ sở y tế"], ["Care", "theo dõi sau khám"]],
    cards: [
      ["Phân tích triệu chứng", "Gợi ý chuyên khoa, mức ưu tiên và câu hỏi cần chuẩn bị trước khi gặp bác sĩ."],
      ["Giải thích xét nghiệm", "Chuyển các chỉ số khó đọc thành nội dung dễ hiểu, kèm bối cảnh và gợi ý trao đổi."],
      ["Nhắc thuốc & tái khám", "Theo dõi liều dùng, lịch uống, lịch tái khám và phản ứng sau điều trị."],
      ["Bản đồ cơ sở y tế", "Hiển thị cơ sở phù hợp, khoảng cách và thời gian chờ dự kiến trong khu vực."],
      ["Hồ sơ gia đình", "Quản lý nhiều hồ sơ trong một tài khoản để chăm sóc người thân tiện hơn."],
      ["Báo cáo Premium", "Theo dõi xu hướng triệu chứng và tạo tóm tắt để chia sẻ với chuyên gia y tế."],
    ],
    sections: [
      ["Freemium", ["Lưu các lần phân tích gần nhất.", "Thiết lập hồ sơ cá nhân cơ bản.", "Nhắc lịch uống thuốc và tái khám ở mức cơ bản."]],
      ["Premium", ["Cảnh báo tương tác thuốc và tình trạng cần chú ý.", "Báo cáo xu hướng sức khỏe theo tuần/tháng.", "Tóm tắt hồ sơ chuyên sâu để chuẩn bị buổi khám."]],
    ],
  },
  "/pricing": {
    eyebrow: "Bảng giá",
    title: "Bắt đầu miễn phí, nâng cấp khi việc theo dõi trở nên quan trọng.",
    copy: "MediMate AI nên cho người dùng cảm nhận giá trị trước khi trả phí. Vì vậy landing page có demo, gói Freemium và gói Premium rõ ràng.",
    primary: ["Tạo tài khoản Freemium", "/signup"],
    secondary: ["Liên hệ tư vấn", "/contact"],
    stats: [["0đ", "gói Cơ bản"], ["149.000đ", "MediMate+ / tháng"], ["14 ngày", "dùng thử Premium"]],
    cards: [
      ["Cơ bản", "Phân tích triệu chứng cơ bản, gợi ý chuyên khoa, lưu 3 hồ sơ và nhắc lịch dùng thuốc."],
      ["MediMate+", "Phân tích nâng cao, giải thích xét nghiệm, cảnh báo tương tác thuốc và báo cáo xu hướng."],
      ["Đội ngũ", "Dành cho phòng khám hoặc tổ chức muốn tích hợp luồng chuẩn bị thông tin trước buổi khám."],
    ],
    sections: [
      ["Khi nào nên dùng Freemium?", ["Bạn muốn thử sản phẩm trước khi đăng ký trả phí.", "Bạn chỉ cần lưu một vài hồ sơ và nhắc lịch cơ bản.", "Bạn muốn trải nghiệm luồng phân tích triệu chứng."]],
      ["Khi nào nên nâng cấp Premium?", ["Bạn đang theo dõi điều trị dài ngày.", "Bạn cần cảnh báo thuốc, báo cáo xu hướng và tóm tắt chuyên sâu.", "Bạn chăm sóc nhiều thành viên trong gia đình."]],
    ],
  },
  "/roadmap": {
    eyebrow: "Lộ trình",
    title: "Lộ trình phát triển MediMate AI.",
    copy: "Lộ trình tập trung vào trải nghiệm thực tế: demo đủ hấp dẫn, Freemium đủ dùng, Premium đủ giá trị và API đủ rõ để hợp tác với đối tác y tế.",
    primary: ["Góp ý lộ trình", "/community"],
    secondary: ["Xem API", "/api"],
    stats: [["Q2", "demo & hồ sơ"], ["Q3", "theo dõi nâng cao"], ["Q4", "API đối tác"]],
    cards: [
      ["Q2 2026", "Hoàn thiện demo triệu chứng, bản đồ cơ sở y tế, hồ sơ cá nhân và các trang tĩnh."],
      ["Q3 2026", "Thêm báo cáo xu hướng, cảnh báo tương tác thuốc và quản lý hồ sơ gia đình."],
      ["Q4 2026", "Mở API cho phòng khám, hệ thống đặt lịch và dashboard cho đội chăm sóc."],
    ],
    sections: [
      ["Nguyên tắc ưu tiên", ["Không mở tính năng y khoa nếu chưa có disclaimer rõ.", "Ưu tiên luồng người dùng có thể kiểm chứng bằng demo.", "Tách Freemium và Premium bằng giá trị thật, không khóa các bước thiết yếu."]],
      ["Đang cân nhắc", ["Tích hợp wearable để theo dõi nhịp tim/SpO2.", "Tự động tạo tóm tắt trước lịch khám.", "Chế độ chăm sóc cho người thân lớn tuổi."]],
    ],
  },
  "/api": {
    eyebrow: "API",
    title: "API cho đối tác y tế và ứng dụng chăm sóc sức khỏe.",
    copy: "Trang API mô tả định hướng tích hợp, chưa phải tài liệu kỹ thuật cuối cùng. Trọng tâm là dữ liệu có cấu trúc, xác thực an toàn và giới hạn trách nhiệm y khoa rõ ràng.",
    primary: ["Liên hệ tích hợp", "/contact"],
    secondary: ["Xem trạng thái", "/status"],
    stats: [["REST", "định hướng ban đầu"], ["OAuth", "xác thực đối tác"], ["Audit", "ghi nhận truy cập"]],
    cards: [
      ["Symptom API", "Nhận mô tả triệu chứng, trả về chuyên khoa gợi ý, mức ưu tiên và câu hỏi cần bổ sung."],
      ["Record API", "Tạo tóm tắt hồ sơ, quản lý thuốc đang dùng và dữ liệu theo dõi sau khám."],
      ["Clinic API", "Tra cứu cơ sở y tế, chuyên khoa, khoảng cách và trạng thái đặt lịch."],
    ],
    sections: [
      ["Nguyên tắc dữ liệu", ["Không gửi dữ liệu nhạy cảm khi chưa có đồng ý rõ.", "Mỗi request cần gắn mục đích xử lý.", "Có log truy cập để phục vụ kiểm toán."]],
      ["Ví dụ endpoint", ["POST /v1/symptom-checks", "GET /v1/records/:id/summary", "GET /v1/clinics?specialty=cardiology"]],
    ],
  },
  "/support": {
    eyebrow: "Hỗ trợ",
    title: "Tất cả kênh hỗ trợ người dùng MediMate AI.",
    copy: "Trang hỗ trợ gom các kênh quan trọng: tài liệu, liên hệ, trạng thái hệ thống và cộng đồng. Người dùng không cần đoán phải bấm vào đâu khi gặp vấn đề.",
    primary: ["Mở trung tâm trợ giúp", "/help"],
    secondary: ["Liên hệ hỗ trợ", "/contact"],
    stats: [["Help", "hướng dẫn từng bước"], ["Status", "trạng thái dịch vụ"], ["Community", "góp ý sản phẩm"]],
    cards: [
      ["Trung tâm trợ giúp", "Hướng dẫn nhập triệu chứng, đọc kết quả, lưu hồ sơ và nâng cấp gói."],
      ["Liên hệ", "Gửi câu hỏi về tài khoản, hợp tác hoặc phản hồi sản phẩm."],
      ["Trạng thái hệ thống", "Theo dõi tình trạng AI Analysis, Map Service và Notification."],
    ],
    sections: [
      ["Vấn đề thường gặp", ["Không thấy kết quả phân tích sau khi nhập triệu chứng.", "Không nhận được nhắc lịch uống thuốc.", "Cần chỉnh sửa hoặc xóa dữ liệu hồ sơ."]],
      ["Cam kết hỗ trợ", ["Ưu tiên vấn đề liên quan dữ liệu sức khỏe.", "Phản hồi rõ ràng, không dùng ngôn ngữ kỹ thuật khó hiểu.", "Luôn nhắc lại giới hạn y khoa khi cần."]],
    ],
  },
  "/help": {
    eyebrow: "Trung tâm trợ giúp",
    title: "Hướng dẫn dùng MediMate AI từng bước.",
    copy: "Trung tâm trợ giúp giúp người dùng tự xử lý nhanh trước khi cần liên hệ đội hỗ trợ.",
    primary: ["Thử demo", "/#demo"],
    secondary: ["Gửi câu hỏi", "/contact"],
    stats: [["1", "nhập triệu chứng"], ["2", "xem preview AI"], ["3", "lưu hồ sơ"]],
    cards: [
      ["Bắt đầu", "Nhập triệu chứng bằng tiếng Việt tự nhiên, càng cụ thể càng tốt."],
      ["Đọc kết quả", "Xem chuyên khoa gợi ý, mức ưu tiên và câu hỏi cần chuẩn bị."],
      ["Lưu hồ sơ", "Đăng nhập Freemium để lưu kết quả, thuốc đang dùng và lịch nhắc."],
    ],
    sections: [
      ["Cách nhập triệu chứng tốt", ["Nêu thời gian xuất hiện và mức độ nặng nhẹ.", "Thêm bệnh nền, thuốc đang dùng nếu có.", "Ghi rõ triệu chứng đi kèm như sốt, khó thở, buồn nôn."]],
      ["Khi cần đi khám ngay", ["Khó thở nặng, đau ngực dữ dội hoặc ngất.", "Sốt cao kéo dài kèm lơ mơ.", "Đau dữ dội hoặc triệu chứng xấu nhanh."]],
    ],
  },
  "/contact": {
    eyebrow: "Liên hệ",
    title: "Trao đổi với đội MediMate AI.",
    copy: "Dùng trang này để mô phỏng luồng liên hệ tư vấn, hỗ trợ hoặc hợp tác. Form hiện là giao diện tĩnh, sẵn sàng nối API sau.",
    primary: ["Gửi email", "mailto:hello@medimate.ai"],
    secondary: ["Xem hỗ trợ", "/support"],
    stats: [["24h", "phản hồi dự kiến"], ["3 nhóm", "hỗ trợ, đối tác, sản phẩm"], ["VN", "ưu tiên tiếng Việt"]],
    cards: [
      ["Hỗ trợ người dùng", "Câu hỏi về tài khoản, Freemium, Premium hoặc dữ liệu hồ sơ."],
      ["Hợp tác phòng khám", "Trao đổi về tích hợp đặt lịch, bản đồ cơ sở y tế hoặc API."],
      ["Góp ý sản phẩm", "Phản hồi UX, nội dung y khoa, luồng demo và tính năng mới."],
    ],
    form: "contact",
    sections: [
      ["Thông tin liên hệ", ["Email: hello@medimate.ai", "Thời gian phản hồi mẫu: trong 1 ngày làm việc.", "Không gửi thông tin cấp cứu qua form liên hệ."]],
    ],
  },
  "/status": {
    eyebrow: "Trạng thái hệ thống",
    title: "Theo dõi tình trạng vận hành của MediMate AI.",
    copy: "Trang trạng thái giúp người dùng biết các phần quan trọng có hoạt động bình thường không. Đây là nội dung tĩnh mô phỏng cho landing page.",
    primary: ["Liên hệ hỗ trợ", "/contact"],
    secondary: ["Xem trợ giúp", "/help"],
    stats: [["99.9%", "uptime mục tiêu"], ["4", "dịch vụ theo dõi"], ["0", "sự cố nghiêm trọng"]],
    cards: [
      ["AI Analysis", "Hoạt động bình thường"],
      ["Map Service", "Hoạt động bình thường"],
      ["Authentication", "Hoạt động bình thường"],
      ["Notification", "Đang theo dõi độ trễ thông báo"],
    ],
    status: true,
    sections: [
      ["Lịch sử gần đây", ["Không có sự cố nghiêm trọng trong bản demo.", "MapLibre tiles có thể tải chậm tùy mạng.", "Notification là mô phỏng, chưa nối hệ thống thật."]],
    ],
  },
  "/community": {
    eyebrow: "Cộng đồng",
    title: "Cùng xây trải nghiệm y tế số tốt hơn.",
    copy: "Cộng đồng giúp người dùng góp ý về nhu cầu thật, theo dõi lộ trình và tham gia thử nghiệm các tính năng mới.",
    primary: ["Gửi góp ý", "/contact"],
    secondary: ["Xem lộ trình", "/roadmap"],
    stats: [["Feedback", "góp ý mở"], ["Beta", "thử tính năng"], ["Roadmap", "theo dõi cập nhật"]],
    cards: [
      ["Góp ý demo", "Đề xuất cách trình bày kết quả, câu hỏi sau phân tích và CTA Freemium."],
      ["Thử nghiệm Premium", "Đăng ký nhận tính năng báo cáo xu hướng và cảnh báo thuốc sớm."],
      ["Câu chuyện người dùng", "Chia sẻ cách bạn theo dõi sức khỏe cho bản thân hoặc gia đình."],
    ],
    sections: [
      ["Quy tắc cộng đồng", ["Tôn trọng quyền riêng tư, không đăng hồ sơ y tế nhạy cảm công khai.", "Không xem góp ý cộng đồng là tư vấn y khoa.", "Ưu tiên phản hồi cụ thể, có bối cảnh sử dụng."]],
    ],
  },
  "/legal": {
    eyebrow: "Pháp lý",
    title: "Minh bạch về dữ liệu, giới hạn y khoa và điều khoản sử dụng.",
    copy: "Các trang pháp lý giúp landing page đáng tin hơn, đặc biệt với sản phẩm liên quan sức khỏe. Nội dung ở đây là bản mô phỏng để hoàn thiện luồng.",
    primary: ["Đọc disclaimer", "/medical-disclaimer"],
    secondary: ["Xem bảo mật", "/privacy"],
    stats: [["Terms", "điều khoản"], ["Privacy", "bảo mật"], ["Cookie", "tùy chọn"]],
    cards: [
      ["Điều khoản", "Quy định sử dụng, giới hạn trách nhiệm và quyền của người dùng."],
      ["Bảo mật", "Cách xử lý dữ liệu sức khỏe, phân quyền và kiểm soát chia sẻ."],
      ["Disclaimer y tế", "AI không thay thế bác sĩ, không chẩn đoán và không kê đơn."],
    ],
    sections: [
      ["Tài liệu pháp lý", ["Điều khoản sử dụng dịch vụ.", "Chính sách bảo mật và cookie.", "Tuyên bố giới hạn y khoa."]],
    ],
  },
  "/terms": {
    eyebrow: "Điều khoản",
    title: "Điều khoản sử dụng MediMate AI.",
    copy: "Người dùng cần hiểu MediMate AI là công cụ hỗ trợ thông tin, không phải dịch vụ cấp cứu, chẩn đoán hoặc điều trị trực tiếp.",
    primary: ["Tạo tài khoản", "/signup"],
    secondary: ["Xem disclaimer", "/medical-disclaimer"],
    stats: [["Account", "trách nhiệm tài khoản"], ["Use", "sử dụng hợp lý"], ["Limit", "giới hạn trách nhiệm"]],
    cards: [
      ["Tài khoản", "Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và hoạt động trong tài khoản."],
      ["Sử dụng hợp lý", "Không dùng sản phẩm thay thế cấp cứu hoặc thay đổi điều trị khi chưa hỏi bác sĩ."],
      ["Nội dung AI", "Kết quả phụ thuộc vào thông tin bạn cung cấp và có thể cần kiểm chứng lại."],
    ],
    sections: [
      ["Quy định chính", ["Không nhập dữ liệu của người khác nếu chưa được cho phép.", "Không dùng kết quả AI để tự kê thuốc.", "Có thể tạm ngưng tài khoản nếu phát hiện lạm dụng."]],
      ["Trách nhiệm", ["MediMate AI cung cấp thông tin tham khảo.", "Người dùng cần liên hệ chuyên gia y tế khi triệu chứng nghiêm trọng.", "Nội dung có thể thay đổi khi sản phẩm phát triển."]],
    ],
  },
  "/privacy": {
    eyebrow: "Bảo mật",
    title: "Bảo vệ dữ liệu sức khỏe cá nhân.",
    copy: "Dữ liệu sức khỏe là dữ liệu nhạy cảm. Trang này mô tả cách MediMate AI nên tiếp cận quyền riêng tư: tối thiểu hóa, minh bạch, phân quyền và cho phép người dùng kiểm soát.",
    primary: ["Quản lý tài khoản", "/login"],
    secondary: ["Xem Cookie", "/cookies"],
    stats: [["Minimize", "thu thập vừa đủ"], ["Control", "người dùng kiểm soát"], ["Consent", "đồng ý rõ ràng"]],
    cards: [
      ["Tối thiểu hóa", "Chỉ thu thập dữ liệu cần thiết để phân tích triệu chứng, lưu hồ sơ và nhắc lịch."],
      ["Kiểm soát", "Người dùng có thể xem, sửa, tải xuống hoặc yêu cầu xóa dữ liệu hồ sơ."],
      ["Chia sẻ", "Không chia sẻ dữ liệu y tế với bên thứ ba nếu chưa có đồng ý rõ ràng."],
    ],
    sections: [
      ["Dữ liệu có thể được xử lý", ["Triệu chứng bạn nhập trong demo hoặc tài khoản.", "Thông tin hồ sơ như tuổi, bệnh nền, thuốc đang dùng nếu bạn cung cấp.", "Lịch nhắc thuốc, tái khám và tương tác với bản đồ."]],
      ["Quyền của người dùng", ["Yêu cầu xóa hồ sơ khỏi tài khoản.", "Rút lại đồng ý chia sẻ dữ liệu.", "Nhận giải thích về mục đích xử lý dữ liệu."]],
    ],
  },
  "/cookies": {
    eyebrow: "Cookie",
    title: "Chính sách cookie.",
    copy: "Cookie giúp duy trì phiên đăng nhập, lưu lựa chọn giao diện và đo hiệu năng. Với sản phẩm sức khỏe, các cookie không thiết yếu nên có lựa chọn bật/tắt rõ ràng.",
    primary: ["Xem bảo mật", "/privacy"],
    secondary: ["Về pháp lý", "/legal"],
    stats: [["Essential", "bắt buộc"], ["Analytics", "đo hiệu năng"], ["Preference", "lưu tùy chọn"]],
    cards: [
      ["Cookie thiết yếu", "Duy trì phiên đăng nhập, bảo mật CSRF và ghi nhớ trạng thái cơ bản."],
      ["Cookie phân tích", "Đo tốc độ tải trang, lỗi giao diện và hành vi tổng hợp không định danh."],
      ["Cookie tùy chọn", "Lưu lựa chọn giao diện, ngôn ngữ và cài đặt trải nghiệm."],
    ],
    sections: [
      ["Cách kiểm soát", ["Có thể xóa cookie trong trình duyệt.", "Cookie không thiết yếu nên có tùy chọn từ chối.", "Một số tính năng đăng nhập cần cookie thiết yếu để hoạt động."]],
    ],
  },
  "/medical-disclaimer": {
    eyebrow: "Disclaimer y tế",
    title: "MediMate AI không thay thế chẩn đoán y khoa.",
    copy: "MediMate AI hỗ trợ chuẩn bị thông tin và theo dõi, nhưng không chẩn đoán bệnh, không kê đơn và không thay thế bác sĩ. Trong tình huống khẩn cấp, người dùng cần gọi cấp cứu hoặc đến cơ sở y tế gần nhất.",
    primary: ["Xem điều khoản", "/terms"],
    secondary: ["Tìm cơ sở y tế", "/#map"],
    stats: [["No diagnosis", "không chẩn đoán"], ["No prescription", "không kê đơn"], ["Emergency", "ưu tiên cấp cứu"]],
    cards: [
      ["Không chẩn đoán", "Kết quả AI chỉ là gợi ý tham khảo dựa trên dữ liệu bạn nhập."],
      ["Không kê đơn", "Không tự dùng, đổi hoặc ngưng thuốc chỉ dựa trên nội dung AI."],
      ["Cần bác sĩ", "Hãy liên hệ chuyên gia y tế nếu triệu chứng kéo dài, nặng lên hoặc gây lo lắng."],
    ],
    sections: [
      ["Dấu hiệu cần xử lý khẩn cấp", ["Đau ngực dữ dội, khó thở nặng hoặc tím tái.", "Ngất, co giật, yếu liệt đột ngột hoặc nói khó.", "Sốt cao kèm lơ mơ, cổ cứng hoặc mất nước nặng."]],
      ["Giới hạn của AI", ["AI có thể thiếu bối cảnh lâm sàng.", "Kết quả phụ thuộc vào thông tin bạn nhập.", "Không thay thế xét nghiệm, thăm khám hoặc đánh giá trực tiếp."]],
    ],
  },
  "/login": {
    eyebrow: "Đăng nhập",
    title: "Đăng nhập để dùng Freemium.",
    copy: "Trang đăng nhập tĩnh mô phỏng luồng vào sản phẩm. Sau khi có backend, form này có thể nối xác thực để lưu hồ sơ và lịch sử phân tích.",
    primary: ["Tạo tài khoản mới", "/signup"],
    secondary: ["Thử demo trước", "/#demo"],
    stats: [["Freemium", "lưu hồ sơ"], ["History", "xem lại phân tích"], ["Upgrade", "mở Premium"]],
    cards: [
      ["Lưu lịch sử", "Giữ lại các lần nhập triệu chứng để theo dõi thay đổi."],
      ["Hồ sơ cá nhân", "Quản lý thông tin nền, thuốc đang dùng và lịch tái khám."],
      ["Nâng cấp sau", "Khám phá Premium khi cần phân tích sâu hơn."],
    ],
    form: "login",
    sections: [
      ["Sau khi đăng nhập", ["Lưu kết quả demo vào hồ sơ.", "Thiết lập nhắc thuốc và tái khám.", "Xem lại gợi ý chuyên khoa theo thời gian."]],
    ],
  },
  "/signup": {
    eyebrow: "Dùng thử miễn phí",
    title: "Tạo tài khoản Freemium trong vài phút.",
    copy: "Trang đăng ký tĩnh mô phỏng bước chuyển từ demo sang Freemium. Người dùng có thể bắt đầu miễn phí và nâng cấp khi cần theo dõi sâu hơn.",
    primary: ["Đã có tài khoản", "/login"],
    secondary: ["Xem bảng giá", "/pricing"],
    stats: [["0đ", "bắt đầu"], ["No card", "không cần thẻ"], ["Premium", "nâng cấp sau"]],
    cards: [
      ["Không cần thẻ", "Bắt đầu với gói Cơ bản miễn phí."],
      ["Demo trước", "Có thể thử nhập triệu chứng trước khi tạo tài khoản."],
      ["Premium", "Mở khóa báo cáo, cảnh báo thuốc và chia sẻ hồ sơ."],
    ],
    form: "signup",
    sections: [
      ["Thông tin cần có", ["Email đăng nhập.", "Tên hiển thị cho hồ sơ.", "Đồng ý điều khoản và disclaimer y tế."]],
    ],
  },
  "/demo": {
    eyebrow: "Demo",
    title: "Demo nhập triệu chứng có sẵn trên landing page.",
    copy: "Trang này giải thích luồng demo và dẫn người dùng quay lại đúng section nhập triệu chứng trên landing.",
    primary: ["Mở demo trên landing", "/#demo"],
    secondary: ["Đăng nhập Freemium", "/login"],
    stats: [["Preview", "miễn phí"], ["Freemium", "lưu hồ sơ"], ["Premium", "theo dõi sâu"]],
    cards: [
      ["Preview AI", "Nhận chuyên khoa gợi ý và mức ưu tiên cơ bản."],
      ["Freemium", "Đăng nhập để lưu kết quả và lịch sử."],
      ["Premium", "Theo dõi sâu và mở các cảnh báo nâng cao."],
    ],
    sections: [
      ["Luồng demo", ["Nhập triệu chứng hoặc chọn mẫu có sẵn.", "Bấm phân tích thử để xem preview.", "Chọn đăng nhập Freemium hoặc khám phá Premium."]],
    ],
  },
};

function getPage(path) {
  return PAGES[path] ?? {
    eyebrow: "Không tìm thấy",
    title: "Trang này chưa tồn tại.",
    copy: "Đường dẫn bạn mở chưa có nội dung. Quay lại landing page để tiếp tục khám phá MediMate AI.",
    primary: ["Về landing page", "/"],
    secondary: ["Liên hệ hỗ trợ", "/contact"],
    stats: [["404", "không tìm thấy"], ["Home", "quay lại"], ["Support", "cần hỗ trợ"]],
    cards: [
      ["Landing page", "Quay lại trang chủ để xem demo, bản đồ và bảng giá."],
      ["Hỗ trợ", "Mở trang liên hệ nếu bạn cần thêm thông tin."],
      ["Bảng giá", "Xem các gói Freemium và Premium."],
    ],
    sections: [],
  };
}

function ContactForm() {
  return (
    <form className="static-form">
      <label>
        Họ và tên
        <input placeholder="Nguyễn Văn A" />
      </label>
      <label>
        Email
        <input type="email" placeholder="you@example.com" />
      </label>
      <label>
        Nhu cầu
        <select defaultValue="support">
          <option value="support">Hỗ trợ người dùng</option>
          <option value="clinic">Hợp tác phòng khám</option>
          <option value="feedback">Góp ý sản phẩm</option>
        </select>
      </label>
      <label>
        Nội dung
        <textarea rows={5} placeholder="Bạn muốn trao đổi điều gì?" />
      </label>
      <button className="btn btn-primary" type="button">Gửi yêu cầu</button>
    </form>
  );
}

function AuthForm({ type }) {
  const isSignup = type === "signup";

  return (
    <form className="static-form">
      {isSignup && (
        <label>
          Tên hiển thị
          <input placeholder="Tên của bạn" />
        </label>
      )}
      <label>
        Email
        <input type="email" placeholder="you@example.com" />
      </label>
      <label>
        Mật khẩu
        <input type="password" placeholder="••••••••" />
      </label>
      {isSignup && (
        <label className="static-check">
          <input type="checkbox" />
          <span>Tôi đồng ý với điều khoản và disclaimer y tế.</span>
        </label>
      )}
      <button className="btn btn-primary" type="button">
        {isSignup ? "Tạo tài khoản Freemium" : "Đăng nhập"}
      </button>
    </form>
  );
}

function StaticForm({ type }) {
  if (type === "contact") return <ContactForm />;
  if (type === "login" || type === "signup") return <AuthForm type={type} />;
  return null;
}

export default function StaticPage({ path }) {
  const page = getPage(path);
  const faqs = page.faqs ?? COMMON_FAQS;

  return (
    <main className="landing-page">
      <Navbar />
      <section className="static-hero">
        <div className="container static-hero-grid">
          <div>
            <p className="eyebrow">{page.eyebrow}</p>
            <h1>{page.title}</h1>
            <p>{page.copy}</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href={page.primary[1]}>
                {page.primary[0]}
              </a>
              {page.secondary && (
                <a className="btn btn-ghost" href={page.secondary[1]}>
                  {page.secondary[0]}
                </a>
              )}
            </div>
          </div>

          <div className="static-summary">
            {page.stats.map(([value, label]) => (
              <div key={value}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section static-content">
        <div className="container">
          <div className="static-grid">
            {page.cards.map(([title, body]) => (
              <article className="feature-card" key={title}>
                <div className="feature-icon">+</div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>

          {page.form && (
            <div className="static-form-wrap">
              <div>
                <p className="eyebrow">Biểu mẫu</p>
                <h2 className="section-title">Sẵn sàng nối backend khi cần.</h2>
                <p className="section-copy">
                  Form hiện là giao diện tĩnh để hoàn thiện trải nghiệm landing.
                  Khi có API, có thể nối xác thực, gửi liên hệ hoặc lưu lead.
                </p>
              </div>
              <StaticForm type={page.form} />
            </div>
          )}

          {page.status && (
            <div className="status-panel">
              {page.cards.map(([service, state]) => (
                <div className="status-row" key={service}>
                  <span>{service}</span>
                  <strong>{state}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="static-sections">
            {page.sections.map(([title, items]) => (
              <article className="static-section-card" key={title}>
                <h2>{title}</h2>
                <ul>
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <p className="eyebrow">Câu hỏi liên quan</p>
          <h2 className="section-title">Những điều nên biết trước khi tiếp tục.</h2>
          <div className="faq-grid">
            {faqs.map(([question, answer]) => (
              <article className="faq-card" key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
