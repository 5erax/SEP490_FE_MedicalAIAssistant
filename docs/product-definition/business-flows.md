# Luồng nghiệp vụ

## BF-01 - Guest khám phá sản phẩm

**Mục tiêu:** hiểu giá trị sản phẩm và đi tới một hành động có ích.

1. Guest vào landing page hoặc dashboard công khai.
2. Guest xem cách hoạt động, bảng giá hoặc cơ sở y tế đang hoạt động.
3. Guest có thể nhập mô tả để xem trước luồng định hướng.
4. Hệ thống yêu cầu đăng nhập khi cần phân tích thật, lưu kết quả hoặc gửi đánh giá.
5. Sau đăng nhập, hệ thống đưa người dùng trở lại hành động đang thực hiện.

**Ngoại lệ:** nếu có dấu hiệu khẩn cấp, hiển thị hướng dẫn gọi cấp cứu hoặc đến
cơ sở y tế gần nhất mà không yêu cầu tài khoản hay Premium.

## BF-02 - Đăng ký và onboarding Patient

1. Người dùng đăng ký bằng email hoặc Google.
2. Hệ thống xác thực tài khoản theo contract backend.
3. Lần đăng nhập đầu, Patient hoàn tất hồ sơ cơ bản.
4. Hệ thống chuyển tới dashboard và hiển thị tác vụ chính.
5. Patient có thể sửa hồ sơ cơ bản bất kể trạng thái Premium.

**Dữ liệu tối thiểu:** chỉ thu thập thông tin cần cho định hướng và tài khoản.
Thông tin sức khỏe nhạy cảm cần mục đích sử dụng và consent rõ ràng.

## BF-03 - Đăng nhập và điều hướng theo role

1. Hệ thống xác thực và lấy trạng thái tài khoản.
2. Admin được đưa tới `/app/admin`.
3. Staff hoặc Doctor được đưa tới `/app/staff`.
4. Patient chưa hoàn tất hồ sơ được đưa tới bước setup.
5. Patient còn lại được đưa tới dashboard hoặc `return intent`.

Tài khoản pending, disabled hoặc không đủ quyền phải nhận thông báo cụ thể và
không được rơi vào trang trắng hoặc vòng lặp redirect.

## BF-04 - Từ triệu chứng tới nơi khám

Đây là luồng giá trị cốt lõi của MediMate AI.

1. Patient nhập triệu chứng và bối cảnh cần thiết.
2. Hệ thống hiển thị disclaimer và kiểm tra dấu hiệu khẩn cấp.
3. Backend phân tích và trả mức độ ưu tiên, chuyên khoa và cơ sở phù hợp.
4. Giao diện giải thích kết quả ở mức dễ hiểu, không khẳng định chẩn đoán.
5. Patient chọn chuyên khoa hoặc cơ sở.
6. Ngữ cảnh được chuyển sang bản đồ/danh sách mà không phải nhập lại.
7. Patient xem chi tiết, khoa, bác sĩ, đánh giá, khoảng cách và trạng thái hoạt động.
8. Patient gọi điện, mở chỉ đường hoặc truy cập kênh liên hệ của cơ sở.

**Kết thúc thành công:** người dùng chọn được bước tiếp theo an toàn. Không yêu
cầu hệ thống phải đặt lịch nếu chưa có module appointment.

## BF-05 - Tìm và đánh giá cơ sở y tế

1. Người dùng tìm theo tên, vị trí hoặc chuyên khoa.
2. Hệ thống chỉ ưu tiên cơ sở và dữ liệu đang hoạt động.
3. Người dùng xem chi tiết và đánh giá hiện có.
4. Patient đã đăng nhập có thể gửi đánh giá.
5. Đánh giá đi qua trạng thái kiểm duyệt trước khi hiển thị công khai.

**Cần quyết định:** cho phép đánh giá chưa xác minh nhưng gắn nhãn, hoặc chỉ cho
phép sau khi có lượt khám được xác minh. MVP chưa có module lượt khám nên không
được mô tả đánh giá là "đã khám" nếu không có bằng chứng.

## BF-06 - Nâng cấp Premium và thanh toán

1. Patient xem gói đang hoạt động và quyền lợi rõ ràng.
2. Hệ thống lưu `return intent` trước khi chuyển sang checkout.
3. Backend tạo checkout PayOS.
4. Người dùng hoàn tất hoặc hủy thanh toán trên PayOS.
5. Backend xác nhận trạng thái thanh toán; frontend không tự suy luận thành công
   chỉ từ query parameter.
6. Hệ thống refresh entitlement và đưa người dùng về tác vụ ban đầu.
7. Patient xem trạng thái subscription hoặc yêu cầu hủy gia hạn.

## BF-07 - Staff ứng tuyển và Admin duyệt

1. Ứng viên mở cổng đăng ký Staff công khai.
2. Ứng viên gửi thông tin tối thiểu cần thiết.
3. Tài khoản ở trạng thái pending và chưa có quyền vận hành.
4. Admin xem danh sách, xác minh và duyệt hoặc từ chối.
5. Khi được duyệt, Staff đăng nhập và vào workspace.

Luồng này dành cho nhân sự vận hành chung. Không dùng thay thế luồng Doctor
invitation nếu Doctor cần được liên kết với hồ sơ chuyên môn có sẵn.

## BF-08 - Doctor invitation và kích hoạt tài khoản

1. Admin tạo invitation, thời hạn và hồ sơ Doctor liên quan.
2. Backend gửi liên kết một lần qua email.
3. Doctor mở liên kết; backend xác minh token và trạng thái invitation.
4. Doctor tạo tài khoản hoặc liên kết tài khoản theo contract.
5. Invitation được đánh dấu đã dùng.
6. Doctor đăng nhập vào Staff workspace với phạm vi được phân công.

Token hết hạn, đã dùng hoặc bị thu hồi phải có trạng thái riêng và không được
ghi ra log hay URL analytics.

## BF-09 - Vận hành danh mục y tế

1. Staff xem danh sách dữ liệu được giao.
2. Staff tạo hoặc cập nhật chuyên khoa, cơ sở, khoa tại cơ sở hoặc bác sĩ.
3. Hệ thống kiểm tra dữ liệu bắt buộc, trùng lặp và quan hệ tham chiếu.
4. Thay đổi nhạy cảm có trạng thái draft/pending hoặc audit.
5. Admin kích hoạt, vô hiệu hóa hoặc xử lý ngoại lệ.
6. Chỉ dữ liệu hợp lệ và active được dùng trong gợi ý cho Patient.

Phạm vi Staff hiện chưa đầy đủ trong UI và cần backend xác nhận ownership trước
khi mở rộng quyền sửa dữ liệu.

## BF-10 - Quản trị hệ thống

Admin chịu trách nhiệm:

- Quản lý người dùng, role, trạng thái và duyệt Staff.
- Quản lý Doctor invitation và dữ liệu y tế cấp hệ thống.
- Quản lý AI config, trạng thái model và gói subscription.
- Theo dõi thanh toán ở mức vận hành, không lộ dữ liệu nhạy cảm.
- Kiểm tra audit cho thay đổi quyền, dữ liệu y tế và cấu hình AI.

Admin không mặc định đọc nội dung triệu chứng hoặc hồ sơ sức khỏe của Patient.

## Luồng chưa được phép coi là nghiệp vụ production

- Lưu và phân tích hồ sơ bệnh án.
- Quét toa thuốc, quản lý thuốc và kiểm tra tương tác thuốc.
- Theo dõi điều trị, phục hồi và nhắc lịch.
- Đặt lịch khám hoặc xác nhận đã đến khám.
- Chia sẻ hồ sơ giữa Patient và Doctor.

Các luồng trên chỉ được đưa vào tài liệu chuẩn sau khi có quyết định sản phẩm,
data model, API, consent, ownership và tiêu chí an toàn.
