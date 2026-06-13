# Mục tiêu phát triển

## Mục tiêu sản phẩm

Tối ưu một hành trình duy nhất trước khi mở rộng tính năng:

> Người dùng có triệu chứng chưa rõ ràng có thể nhận định hướng an toàn, chọn
> chuyên khoa/cơ sở phù hợp và biết hành động tiếp theo.

## Giai đoạn 0 - Làm đúng phạm vi

Ưu tiên P0:

- Tạo registry route/capability thống nhất cho public, auth, role và entitlement.
- Bỏ Premium gate khỏi hồ sơ Patient cơ bản.
- Gắn nhãn demo hoặc ẩn `/records` và `/medication` khỏi navigation production.
- Không gọi trực tiếp nhà cung cấp AI bằng khóa Vite ở trình duyệt; đi qua backend.
- Chuẩn hóa emergency notice, disclaimer và safe error message.
- Bảo toàn `return intent` qua đăng nhập, onboarding và thanh toán.

**Hoàn thành khi:** người dùng không nhầm tính năng demo là dữ liệu thật, không
bị redirect sai và không có secret phía client dùng cho AI service.

## Giai đoạn 1 - Hành trình Patient cốt lõi

Ưu tiên P0:

- Hoàn thiện đăng ký, đăng nhập, first-login profile và dashboard.
- Kết nối một luồng phân tích triệu chứng thật duy nhất.
- Chuyển kết quả chuyên khoa/cơ sở sang `/map` bằng state hoặc URL chuẩn.
- Hiển thị urgency, nguồn dữ liệu, thời điểm cập nhật và giới hạn của kết quả.
- Hoàn thiện chi tiết cơ sở, liên hệ và chỉ đường trên desktop/mobile.

Ưu tiên P1:

- Lịch sử phiên phân tích ở mức backend hỗ trợ.
- Hạn mức Free/Premium rõ ràng và không chặn hướng dẫn khẩn cấp.
- Empty, loading, error, offline và permission-denied thống nhất.

**Hoàn thành khi:** Patient đi từ nhập triệu chứng tới hành động liên hệ/chỉ
đường mà không nhập lại dữ liệu hoặc gặp full page reload.

## Giai đoạn 2 - Tin cậy dữ liệu và vận hành

- Chốt ranh giới Staff và Admin cho từng loại dữ liệu.
- Bổ sung trạng thái/audit cho dữ liệu cơ sở, khoa, bác sĩ và review.
- Hoàn thiện Staff application và Doctor invitation như hai luồng riêng.
- Xác định Doctor là Staff subtype hay actor lâm sàng độc lập.
- Bổ sung review moderation và nhãn xác minh phù hợp.

**Hoàn thành khi:** mọi dữ liệu được dùng để gợi ý cho Patient có owner, trạng
thái, quy trình cập nhật và khả năng truy vết.

## Giai đoạn 3 - Subscription và đo lường

- Đồng bộ entitlement sau callback/webhook PayOS.
- Hiển thị chính xác gói hiện tại, ngày gia hạn và trạng thái hủy.
- Đưa người dùng trở lại tác vụ đã bị chặn sau khi nâng cấp.
- Đo conversion mà không gửi dữ liệu sức khỏe hoặc nội dung hội thoại.

Sự kiện gợi ý:

- `analysis_started`
- `analysis_completed`
- `facility_result_opened`
- `facility_contact_clicked`
- `directions_opened`
- `checkout_started`
- `subscription_activated`

Chỉ ghi ID kỹ thuật không chứa PII/PHI và metadata tổng hợp đã được phê duyệt.

## Giai đoạn tương lai

Chỉ bắt đầu records, medication, appointment hoặc treatment tracking sau khi có:

1. Product owner và actor chịu trách nhiệm.
2. Data model và API production.
3. Consent, authorization, retention và audit.
4. Nguồn dữ liệu y khoa được kiểm chứng.
5. Kịch bản lỗi/an toàn và tiêu chí nghiệm thu.

## Backlog quyết định

| ID | Quyết định | Khuyến nghị mặc định cho MVP | Ảnh hưởng |
|---|---|---|---|
| PD-01 | Free được bao nhiêu lượt phân tích thật | Cho Patient một hạn mức thật đủ trải nghiệm; Premium tăng hạn mức và lịch sử, không khóa cảnh báo khẩn cấp | Conversion, chi phí AI, premium gate |
| PD-02 | Doctor có workspace riêng hay dùng Staff workspace | Xem Doctor là Staff subtype; chưa tạo workspace lâm sàng hoặc quyền xem dữ liệu Patient | Role, route, API, privacy |
| PD-03 | Staff tự ứng tuyển hay invitation-only | Staff chung được ứng tuyển và chờ duyệt; Doctor chỉ kích hoạt bằng invitation | Trust và vận hành tài khoản |
| PD-04 | Review có cần lượt khám xác minh | Cho tài khoản đã đăng nhập gửi review có kiểm duyệt và gắn nhãn chưa xác minh | Data model và độ tin cậy |
| PD-05 | Booking có thuộc sản phẩm | Không xây booking trong MVP; kết thúc bằng gọi điện, chỉ đường hoặc kênh liên hệ ngoài | Phạm vi MVP và tích hợp đối tác |
| PD-06 | Records/medication có tiếp tục phát triển | Hoãn; gắn nhãn demo hoặc ẩn khỏi production tới khi có backend và clinical owner | Backend, compliance, an toàn |

Không triển khai các hạng mục phụ thuộc một quyết định khi hàng tương ứng chưa
được xác nhận.
