# Tích hợp luồng FE1 cho người dùng

Ngày đối chiếu tài liệu tích hợp: **2026-08-02**

## Phạm vi đã tích hợp

### Thuốc và lịch nhắc

Route người dùng: `/medication`.

Frontend dùng các endpoint `/api/user-medications` để xem danh sách, xem chi
tiết, tạo, sửa và xóa thuốc tự khai báo. Lịch nhắc được thay thế qua
`PUT /api/user-medications/{id}/reminders`.

Form áp dụng các ràng buộc của contract: tối đa 12 giờ nhắc không trùng nhau,
giờ gửi theo định dạng `HH:mm:00`, ngày kết thúc không trước ngày bắt đầu và
chỉ bật lịch khi đã có đủ ngày cùng giờ nhắc.

Màn hình luôn hiển thị lưu ý an toàn rằng đây là lịch nhắc dựa trên thông tin
người dùng cung cấp, không phải kê đơn hoặc xác minh chỉ định dùng thuốc.

### Yêu cầu và kế hoạch phục hồi

Route người dùng: `/recovery-plan`.

Frontend tích hợp:

- `GET /api/me/subscription-usage` để hiển thị hạn mức hiện tại.
- `/api/recovery-plan-requests` để tạo, phân trang, xem chi tiết, hủy yêu cầu và
  bổ sung thông tin khi được yêu cầu.
- `/api/recovery-plans` để phân trang, xem chi tiết và bắt đầu kế hoạch.
- Header `Idempotency-Key` khi tạo yêu cầu để tránh tạo trùng do gửi lại.

Hub `/hubs/recovery-plans` chỉ phát tín hiệu thay đổi. Khi nhận sự kiện, frontend
tải lại dữ liệu từ REST thay vì dùng payload sự kiện làm nguồn dữ liệu chính.
Kết nối được dùng chung, tự kết nối lại và nhận token đăng nhập qua
`accessTokenFactory`.

Biến `VITE_REALTIME_BASE_URL` cấu hình HTTPS origin chứa hub ở môi trường deploy.
Local development có thể để trống để dùng cùng origin với API.

### Subscription và thanh toán

Checkout PayOS dùng điều hướng toàn trang tới URL backend trả về. Trang kết quả
đọc `orderCode`, xác minh qua `/api/payments/payos-status/{orderCode}`, sau đó tải
lại subscription và hạn mức. Frontend không gọi trực tiếp callback hoặc webhook
của PayOS và không dùng API subscription detail không bảo đảm ownership.

### Phạm vi admin

Admin có thể xem danh sách và chi tiết payment qua `/api/payments` và
`/api/payments/{id}`. Quản lý gói dịch vụ hiện ở chế độ chỉ đọc; frontend không
mở thao tác tạo, sửa, xóa hoặc tự diễn giải `FeatureLimitJson` cho hạn mức mới
khi contract phân quyền chưa hoàn tất.

## Kiểm thử trọng tâm

- CRUD thuốc, validation lịch nhắc và tắt lịch.
- Hạn mức, tạo yêu cầu idempotent, bổ sung thông tin, xem/bắt đầu kế hoạch.
- Điều hướng PayOS và xác minh kết quả bằng `orderCode`.
- Admin xem payment và không có thao tác mutation gói dịch vụ.
- Accessibility trên viewport desktop và mobile cho các luồng mới.
