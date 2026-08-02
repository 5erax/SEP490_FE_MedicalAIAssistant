# Định nghĩa sản phẩm MediMate AI

Đây là nguồn chuẩn để xác định actor, phạm vi nghiệp vụ và mục tiêu phát triển
web. Khi tài liệu khác mâu thuẫn với thư mục này, ưu tiên tài liệu trong thư
mục này và đối chiếu lại API đang triển khai trước khi lập trình.

## Trạng thái yêu cầu

- **Đã có**: có route và API/service tương ứng trong frontend hiện tại.
- **Mục tiêu**: hướng phát triển đã đề xuất nhưng chưa chắc đã được triển khai.
- **Thử nghiệm**: giao diện hoặc dữ liệu mẫu, chưa được xem là nghiệp vụ thật.
- **Hoãn**: chưa thuộc phạm vi MVP và cần backend hoặc quyết định sản phẩm mới.
- **Cần quyết định**: chưa đủ thông tin để biến thành yêu cầu phát triển.

## Định vị sản phẩm

MediMate AI là nền tảng **định hướng trước khi đi khám**. Sản phẩm giúp người
dùng:

1. Mô tả triệu chứng bằng ngôn ngữ tự nhiên.
2. Nhận cảnh báo mức độ ưu tiên và gợi ý chuyên khoa phù hợp.
3. Tìm cơ sở y tế, khoa và bác sĩ phù hợp.
4. Liên hệ hoặc mở chỉ đường để chủ động đi khám.

Kết quả AI chỉ có vai trò hỗ trợ sàng lọc và định hướng, không phải chẩn đoán,
kê đơn hoặc thay thế bác sĩ. Cảnh báo khẩn cấp và hướng dẫn tìm trợ giúp y tế
không được đặt sau paywall.

## Phạm vi sản phẩm hiện tại

### Đã có

- Đăng ký, đăng nhập, Google OAuth, quên và đặt lại mật khẩu.
- Hồ sơ người dùng/patient.
- Phân tích triệu chứng và lấy lại phiên phân tích.
- Danh mục chuyên khoa, cơ sở y tế, khoa tại cơ sở và bác sĩ.
- Tìm cơ sở y tế, xem đánh giá và gửi đánh giá.
- Gói đăng ký, thanh toán PayOS, xem và hủy subscription.
- Quản lý thuốc tự khai báo và lịch nhắc tại `/medication`.
- Gửi yêu cầu, theo dõi và bắt đầu kế hoạch phục hồi tại `/recovery-plan`.
- Đăng ký Staff chờ duyệt và đăng ký Doctor bằng invitation.
- Workspace quản trị người dùng, dữ liệu y tế, AI config và gói dịch vụ.

### Thử nghiệm, chưa phải cam kết sản phẩm

- Hồ sơ y tế tại `/records` đang dùng dữ liệu mẫu.
- Một phần gợi ý bệnh viện trong trợ lý y tế đang dùng dữ liệu mẫu.
- Chat độc lập tại `/chat` chưa đi qua service backend thống nhất.

### Hoãn

- Đặt lịch khám và quản lý lượt khám.
- Hồ sơ bệnh án, xét nghiệm, toa thuốc có lưu trữ thật.
- Kiểm tra tương tác thuốc có nguồn dữ liệu lâm sàng được kiểm chứng.
- Chia sẻ trực tiếp dữ liệu thuốc và kế hoạch phục hồi với bác sĩ.

## Nguyên tắc phát triển

- Một capability chỉ được coi là nghiệp vụ thật khi có actor chịu trách nhiệm,
  dữ liệu nguồn, API contract, quyền truy cập và tiêu chí nghiệm thu.
- `Premium` là trạng thái quyền lợi của Patient, không phải một role hệ thống.
- `Staff Applicant` và `Doctor Invitee` là trạng thái onboarding, không phải
  role lâu dài.
- Không thu thập hoặc gửi nội dung triệu chứng, hồ sơ y tế hay token vào
  analytics, log, screenshot hoặc lỗi hiển thị cho người dùng.
- Luồng điều hướng phải bảo toàn ý định ban đầu sau đăng nhập hoặc thanh toán.
- Tính năng mock phải được gắn nhãn demo hoặc ẩn khỏi điều hướng production.

## Tài liệu chuẩn

1. [Actor và phân quyền](./actors-and-permissions.md)
2. [Luồng nghiệp vụ](./business-flows.md)
3. [Mục tiêu phát triển](./development-roadmap.md)
4. [Backlog backend theo chức năng web](../backend/backlog.md)
5. [Kiến trúc frontend](../frontend-architecture/README.md)

## Quyết định còn mở

Các quyết định sau phải được Product Owner xác nhận trước khi mở rộng phạm vi:

1. Hạn mức miễn phí và quyền lợi Premium cụ thể.
2. Doctor chỉ là Staff gắn hồ sơ bác sĩ hay cần workspace lâm sàng riêng.
3. Staff được tự ứng tuyển hay chỉ được Admin mời.
4. Đánh giá cơ sở y tế có bắt buộc xác minh lượt khám hay không.
5. Đặt lịch khám có thuộc phạm vi sản phẩm hay chỉ điều hướng ra bên ngoài.
6. Hồ sơ y tế và chia sẻ dữ liệu thuốc/phục hồi có thuộc MVP tiếp theo hay không.
7. Ai chịu trách nhiệm kiểm duyệt dữ liệu cơ sở, bác sĩ và nội dung AI.
