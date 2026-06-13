# Actor và phân quyền

## Mô hình actor

| Actor | Loại | Mục tiêu chính | Trạng thái hiện tại |
|---|---|---|---|
| Guest | Người dùng ngoài hệ thống | Tìm hiểu dịch vụ, thử luồng cơ bản, tìm cơ sở y tế | Đã có |
| Patient | Role người dùng | Nhận định hướng triệu chứng, quản lý hồ sơ cơ bản, tìm nơi khám | Đã có |
| Premium Patient | Patient có entitlement | Dùng hạn mức hoặc tính năng nâng cao | Đã có một phần |
| Staff Applicant | Trạng thái onboarding | Nộp hồ sơ để trở thành Staff | Đã có |
| Medical Staff | Role vận hành | Quản lý dữ liệu y tế được phân công | Đã có một phần |
| Doctor Invitee | Trạng thái onboarding | Kích hoạt tài khoản từ lời mời của Admin | Đã có |
| Doctor | Staff gắn hồ sơ bác sĩ | Duy trì thông tin chuyên môn; chưa truy cập dữ liệu Patient | Cần quyết định |
| Admin | Role quản trị | Quản trị danh tính, dữ liệu, AI config và thương mại | Đã có |
| AI Service | Hệ thống ngoài | Phân tích triệu chứng và phản hồi hội thoại | Đã có |
| PayOS | Hệ thống ngoài | Checkout và xác nhận thanh toán | Đã có |
| Google OAuth | Hệ thống ngoài | Xác thực bằng Google | Đã có |
| Email Provider | Hệ thống ngoài | Gửi email xác thực, reset và invitation | Backend quản lý |
| Map/Geolocation | Hệ thống ngoài | Định vị và chỉ đường | Đã có |

## Ma trận quyền mục tiêu

| Capability | Guest | Patient | Premium | Staff/Doctor | Admin |
|---|---:|---:|---:|---:|---:|
| Xem nội dung công khai và bảng giá | Có | Có | Có | Có | Có |
| Xem cơ sở y tế đang hoạt động | Có | Có | Có | Có | Có |
| Xem cảnh báo khẩn cấp | Có | Có | Có | Có | Có |
| Phân tích triệu chứng thật | Xem trước | Hạn mức cơ bản | Hạn mức nâng cao | Không phải tác vụ chính | Kiểm thử vận hành |
| Lưu lịch sử phân tích | Không | Cơ bản | Nâng cao | Không | Hỗ trợ có kiểm soát |
| Quản lý hồ sơ cá nhân cơ bản | Không | Có | Có | Có | Có |
| Gửi đánh giá cơ sở | Không | Có | Có | Có kiểm soát | Có kiểm soát |
| Quản lý subscription cá nhân | Không | Có | Có | Không bắt buộc | Giám sát |
| Quản lý danh mục y tế | Không | Không | Không | Theo phân công | Toàn quyền |
| Duyệt Staff và quản lý role | Không | Không | Không | Không | Có |
| Quản lý Doctor invitation | Không | Không | Không | Không | Có |
| Quản lý AI config và gói dịch vụ | Không | Không | Không | Không | Có |
| Truy cập hồ sơ y tế của Patient | Không | Chỉ bản thân | Chỉ bản thân | Không trong MVP | Không mặc định |

## Quy tắc phân quyền

1. Hồ sơ cá nhân cơ bản không nên bị khóa bởi Premium. Premium chỉ mở quyền lợi
   nâng cao, không chặn việc hoàn tất onboarding hoặc sửa thông tin cá nhân.
2. Admin và Staff không tự động được xem dữ liệu sức khỏe của Patient chỉ vì có
   role cao hơn. Mọi quyền hỗ trợ phải có mục đích, audit và dữ liệu tối thiểu.
3. Doctor hiện được xem là biến thể của Staff cho tới khi có use case lâm sàng,
   API và cơ chế consent riêng.
4. Staff chỉ sửa dữ liệu thuộc phạm vi được giao. Admin chịu trách nhiệm role,
   trạng thái tài khoản và cấu hình hệ thống.
5. Route guard ở frontend chỉ hỗ trợ UX; backend vẫn phải kiểm tra role và
   ownership cho mọi request.

## Khoảng trống cần xử lý

- Route hồ sơ Patient hiện bị Premium gate dù hồ sơ là dữ liệu onboarding cốt lõi.
- Workspace Staff mới tập trung vào chuyên khoa, chưa phản ánh đầy đủ vai trò
  vận hành danh mục cơ sở, bác sĩ và đánh giá.
- Doctor đã có invitation nhưng chưa có tác vụ sau khi đăng nhập.
- Quyền gửi và kiểm duyệt đánh giá chưa có mô hình tin cậy rõ ràng.
- Quyền truy cập tính năng đang rải trong route/component, cần một registry
  thống nhất cho role, entitlement và trạng thái tài khoản.
