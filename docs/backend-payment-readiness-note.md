# Backend readiness note: PayOS subscription checkout

Đối chiếu ngày 12/06/2026 dựa trên:

- Tài liệu `Tài liệu tích hợp checkout subscription bằng payOS.docx`.
- Swagger deploy: `http://52.77.210.243:8080/swagger/v1/swagger.json`.
- Các request GET/unauthenticated an toàn tới backend deploy.

## 1. Phần backend đã có và đúng contract

### Tạo checkout

```http
POST /api/user-subscriptions/checkout
Authorization: Bearer <access_token>
Content-Type: application/json
```

Request:

```json
{
  "planId": "subscription-plan-uuid",
  "autoRenew": false
}
```

Swagger đã khai báo đúng các field trả về:

```json
{
  "subscriptionId": "guid",
  "paymentId": "guid",
  "transactionId": "guid",
  "paymentUrl": "https://pay.payos.vn/...",
  "paymentProvider": "payOS"
}
```

Request không có Bearer token trả `401 Unauthorized`, đúng yêu cầu.

### Kiểm tra trạng thái bằng orderCode

```http
GET /api/payments/payos-status/{orderCode}
```

Endpoint đang public và Swagger có đủ:

```json
{
  "orderCode": "123456789",
  "paymentId": "guid",
  "subscriptionId": "guid",
  "paymentStatus": "Paid",
  "subscriptionStatus": "Active",
  "isPaid": true,
  "isActive": true,
  "isCancelled": false,
  "message": "Payment confirmed."
}
```

Khi kiểm tra một `orderCode` không tồn tại, backend trả `404` với message
`Payment transaction not found.` thay vì yêu cầu đăng nhập. Điều này phù hợp cho
trang return/cancel của FE.

### Subscription hiện tại và webhook

Backend đã có:

```http
GET  /api/user-subscriptions/me
POST /api/payments/payos-webhook
```

`/me` yêu cầu Bearer token. Webhook là endpoint public để PayOS gọi trực tiếp.

## 2. Thiếu chắc chắn trên backend deploy

### Chưa có SubscriptionPlan đang hoạt động

Tại thời điểm kiểm tra:

```http
GET /api/subscription-plans/active
```

trả:

```json
{
  "success": true,
  "message": "OK",
  "errors": [],
  "data": []
}
```

Vì không có plan nên FE không có `planId` hợp lệ và chưa thể tạo checkout thật.

Backend/Admin cần tạo và kích hoạt ít nhất một plan trả phí:

- `id` là UUID hợp lệ.
- `planName` có nội dung.
- `price > 0`.
- `durationInDays > 0`.
- `isActive = true`.

Nếu UI hỗ trợ tháng và năm, cần hai plan riêng, ví dụ 30 ngày và 365 ngày. FE
không nên tự suy ra giá năm hoặc dùng UUID giả.

## 3. Cấu hình PayOS backend cần sửa hoặc xác nhận

### ReturnUrl và CancelUrl phải trỏ thẳng về FE

Theo tài liệu tích hợp, khi backend tạo payment link phải gửi:

```text
Local:
http://localhost:3000/payment/return
http://localhost:3000/payment/cancel

Production:
https://sep-490-fe-medical-ai-assistant.vercel.app/payment/return
https://sep-490-fe-medical-ai-assistant.vercel.app/payment/cancel
```

Backend deploy hiện vẫn công khai hai endpoint:

```http
GET /api/payments/payos-return
GET /api/payments/payos-cancel
```

Hai endpoint này trả JSON. Nếu cấu hình PayOS hiện trỏ vào chúng, người dùng sẽ
rời khỏi giao diện FE và nhìn thấy JSON thô. Backend cần cấu hình `ReturnUrl` và
`CancelUrl` theo môi trường FE khi tạo link thanh toán. Hai endpoint JSON chỉ nên
giữ cho tương thích cũ nếu còn client sử dụng, không nên là URL điều hướng của
checkout mới.

Không thể xác nhận giá trị cấu hình thực tế chỉ từ Swagger. Backend cần cung cấp
một checkout test hoặc log payload tạo payment link để xác nhận.

### Webhook phải được đăng ký thật với PayOS

Có endpoint trong Swagger chưa chứng minh PayOS đã đăng ký và gọi được endpoint.
Backend cần xác nhận:

1. Webhook URL đã được đăng ký/confirm trên kênh thanh toán PayOS.
2. URL có thể truy cập công khai từ PayOS.
3. Production dùng HTTPS hợp lệ. URL HTTP theo IP hiện tại không nên dùng cho
   production.
4. Backend trả HTTP `2xx` khi webhook hợp lệ.
5. Backend trả `400` khi chữ ký không hợp lệ.

Webhook production đề xuất:

```text
https://<backend-domain>/api/payments/payos-webhook
```

### Bắt buộc xác minh signature

Backend phải xác minh `signature` bằng checksum key trước khi cập nhật Payment
hoặc UserSubscription. Không được tin trực tiếp `status`, `orderCode` hoặc
`success` trong payload webhook.

Theo tài liệu PayOS, signature sử dụng HMAC-SHA256. Checksum key không được gửi
về FE, ghi log hoặc commit vào repository.

### Webhook cần idempotent và chống cập nhật sai trạng thái

PayOS có thể retry webhook. Backend cần:

- Dùng `orderCode`/transaction duy nhất để chống xử lý lặp.
- Không tạo thêm subscription/payment khi nhận lại cùng webhook.
- Không kích hoạt subscription nếu amount hoặc orderCode không khớp giao dịch.
- Không hạ trạng thái `Paid/Active` về `Pending`.
- Cập nhật Payment và UserSubscription trong cùng transaction dữ liệu.
- Ghi nhận `paidAt` khi payment được xác minh thành công.

### Xử lý race condition giữa redirect và webhook

Người dùng có thể quay về `/payment/return` trước khi webhook cập nhật DB.
`GET /api/payments/payos-status/{orderCode}` phải:

- Trả trạng thái Pending ổn định trong lúc chờ webhook.
- Trả Paid + Active sau khi webhook hoàn tất.
- Trả Cancelled cho giao dịch đã hủy.
- Không trả `200 success=true` với dữ liệu mâu thuẫn như `isPaid=true` nhưng
  `isActive=false` kéo dài không có khả năng phục hồi.

Nếu webhook chậm hoặc mất, backend nên có cơ chế đối soát trạng thái payment với
PayOS thay vì để subscription Pending vô thời hạn.

## 4. Response và mã lỗi cần thống nhất

Đề nghị backend duy trì envelope:

```json
{
  "success": false,
  "message": "Thông báo có thể hiển thị cho người dùng.",
  "errors": [],
  "data": null
}
```

Các trường hợp cần có mã HTTP rõ ràng:

- `400`: plan không hợp lệ, plan miễn phí, plan inactive hoặc request sai.
- `401`: checkout hoặc `/me` không có token hợp lệ.
- `404`: không tìm thấy payment/orderCode/subscription.
- `409`: user đã có subscription Active hoặc checkout đang Pending theo business rule.
- `502/503`: PayOS không phản hồi hoặc tạm thời không khả dụng.

Backend không nên trả thông tin nội bộ, checksum key, API key, stack trace hoặc
payload PayOS nhạy cảm trong message cho FE.

## 5. Phần FE còn thiếu theo tài liệu, không phải lỗi backend

FE hiện đã checkout và polling bằng `paymentId` ngay tại `/pricing`, nhưng chưa có:

```text
/payment/return
/payment/cancel
```

Hai màn hình này cần:

1. Đọc `orderCode` từ query string.
2. Không tin `status=PAID` trên URL.
3. Gọi `GET /api/payments/payos-status/{orderCode}`.
4. Poll 2-3 giây nếu backend còn Pending.
5. Khi `isPaid && isActive`, gọi thêm `/api/user-subscriptions/me`.
6. Hiển thị trạng thái success, pending, cancelled, missing orderCode và error.
7. Có nút quay về `/pricing` hoặc `/dashboard`.

Sau khi hai route FE được bổ sung và backend cấu hình đúng return/cancel URL,
polling bằng `paymentId` trên `/pricing` có thể giữ như cơ chế bổ sung khi người
dùng vẫn mở tab cũ.

## 6. Checklist nghiệm thu end-to-end

1. Backend có ít nhất một paid plan Active.
2. Checkout authenticated trả `paymentUrl`, `paymentId`, `subscriptionId` và
   transaction/order tương ứng.
3. Payment link chứa đúng ReturnUrl/CancelUrl của môi trường FE.
4. Thanh toán thành công quay về `/payment/return?orderCode=...`.
5. Hủy thanh toán quay về `/payment/cancel?orderCode=...`.
6. FE xác minh trạng thái qua backend, không tin query param.
7. Webhook hợp lệ được verify signature và trả `2xx`.
8. Webhook gửi lại không tạo dữ liệu trùng.
9. Payment chuyển Paid, có `paidAt`; subscription chuyển Active.
10. `/api/user-subscriptions/me` trả đúng plan đang hoạt động.
11. Premium gate mở sau khi state subscription/auth được refresh.
12. Webhook giả hoặc signature sai không thay đổi dữ liệu.

## 7. Kết luận

Backend đã có đúng phần lớn endpoint và schema trong tài liệu. Hai blocker để
chạy thanh toán thật hiện tại là:

1. Chưa có paid SubscriptionPlan Active.
2. Chưa có bằng chứng cấu hình PayOS đang dùng ReturnUrl/CancelUrl trỏ về hai
   route FE mới.

Trước production còn phải xác nhận webhook đã được PayOS đăng ký, dùng HTTPS,
verify signature và xử lý idempotent/race condition đúng.
