# Chính sách bảo mật

MediMate AI coi trọng việc bảo vệ tài khoản, thông tin xác thực và dữ liệu liên quan đến sức khỏe. Chúng tôi hoan nghênh các báo cáo có trách nhiệm giúp dự án an toàn hơn.

## Phiên bản được hỗ trợ

Dự án hiện chưa phát hành phiên bản ổn định theo semantic versioning. Các bản sửa lỗi bảo mật được áp dụng cho mã nguồn mới nhất trên nhánh mặc định.

| Phiên bản | Được hỗ trợ |
| --- | --- |
| Nhánh mặc định mới nhất | Có |
| Commit, nhánh hoặc bản triển khai cũ | Không |

## Báo cáo lỗ hổng

Không tạo GitHub Issue, Pull Request hoặc thảo luận công khai cho lỗ hổng chưa được xử lý.

Hãy gửi báo cáo riêng tư qua [GitHub Security Advisories](https://github.com/5erax/SEP490_FE_MedicalAIAssistant/security/advisories/new). Nếu tính năng này không khả dụng, hãy liên hệ trực tiếp với maintainer của repository và chỉ cung cấp thông tin tối thiểu cần thiết qua kênh ban đầu.

Báo cáo nên bao gồm:

- Mô tả lỗ hổng và ảnh hưởng dự kiến.
- Thành phần, route hoặc phiên bản bị ảnh hưởng.
- Các bước tái hiện tối thiểu.
- Bằng chứng khái niệm đã được loại bỏ token, dữ liệu cá nhân và dữ liệu sức khỏe.
- Đề xuất khắc phục nếu có.

Maintainer sẽ cố gắng xác nhận đã nhận báo cáo trong vòng 5 ngày làm việc, sau đó đánh giá mức độ ảnh hưởng và phối hợp cách công bố phù hợp. Thời gian sửa lỗi phụ thuộc vào mức độ nghiêm trọng và độ phức tạp của vấn đề.

## Phạm vi ưu tiên

Các vấn đề sau được ưu tiên xử lý:

- Vượt qua xác thực hoặc phân quyền giữa User, Staff/Doctor và Admin.
- Đánh cắp, làm lộ hoặc sử dụng lại access token, refresh token hay session.
- Truy cập trái phép dữ liệu cá nhân, hồ sơ y tế hoặc nội dung tư vấn.
- Cross-site scripting, request forgery hoặc injection có thể khai thác.
- Làm lộ khóa API, Google OAuth secret hoặc thông tin xác thực của dịch vụ.
- Thao túng luồng đăng ký gói, kết quả thanh toán hoặc quyền premium.
- Lợi dụng liên kết mời để đăng ký bác sĩ trái phép.
- Cấu hình AI cho phép truy cập dữ liệu hoặc chức năng ngoài quyền hạn.

## Quy tắc kiểm thử

Khi nghiên cứu bảo mật:

- Chỉ kiểm thử trên tài khoản và dữ liệu do bạn sở hữu hoặc được phép sử dụng.
- Không truy cập, tải xuống, thay đổi hoặc xóa dữ liệu của người khác.
- Không thực hiện từ chối dịch vụ, spam, social engineering hoặc kiểm thử gây gián đoạn.
- Không tải dữ liệu sức khỏe thật lên dịch vụ bên thứ ba.
- Dừng kiểm thử ngay khi phát hiện dữ liệu nhạy cảm ngoài phạm vi cần thiết.
- Cho maintainer thời gian hợp lý để khắc phục trước khi công bố.

## Thông tin nhạy cảm

Không đưa các nội dung sau vào issue, log, ảnh chụp màn hình hoặc bản demo công khai:

- Access token, refresh token, cookie phiên hoặc invitation token.
- Mật khẩu, khóa API, OAuth client secret hoặc thông tin thanh toán.
- Họ tên, email, số điện thoại hoặc dữ liệu định danh cá nhân.
- Triệu chứng, chẩn đoán, thuốc, hồ sơ y tế hoặc nội dung trò chuyện sức khỏe.

Nếu bí mật đã bị commit, hãy thu hồi hoặc xoay vòng bí mật đó ngay. Chỉ xóa khỏi lịch sử Git là chưa đủ để bảo đảm bí mật không còn bị khai thác.

## Miễn trừ

MIT License cung cấp phần mềm theo hiện trạng và không có bảo hành. Chính sách này không biến MediMate AI thành dịch vụ cấp cứu hoặc công cụ thay thế chuyên gia y tế.

