# Tích hợp PayOS subscription

Ngày đối chiếu contract: **2026-06-13**

## Mục đích

Patient chọn plan trên `/pricing`, thanh toán qua PayOS và nhận entitlement sau
khi backend xác minh giao dịch.

## API hiện có

```http
GET  /api/subscription-plans/active
POST /api/user-subscriptions/checkout
GET  /api/user-subscriptions/me
POST /api/user-subscriptions/{id}/cancel
GET  /api/payments/payos-status/{orderCode}
GET  /api/payments/payos-return
GET  /api/payments/payos-cancel
POST /api/payments/payos-webhook
```

Tại lần kiểm tra, active plans đã có dữ liệu.

## Luồng web

1. Frontend lấy active plans.
2. Patient đăng nhập và chọn plan.
3. Backend tạo payment/order và trả checkout URL.
4. Frontend chuyển trình duyệt sang PayOS.
5. PayOS redirect tới return/cancel URL do backend cấu hình.
6. Frontend lấy `orderCode` và gọi status endpoint.
7. Backend chỉ trả paid/active sau khi giao dịch được xác minh.
8. Frontend refresh current subscription/capability và phục hồi `return intent`.

Frontend không được suy luận thành công chỉ từ query parameter của redirect.

## Yêu cầu backend bắt buộc

### URL theo môi trường

Return/cancel URL phải trỏ về đúng domain frontend của từng môi trường. Không
hard-code URL production cho local/staging.

### Webhook

- Đăng ký webhook thật với PayOS.
- Xác minh signature trước khi cập nhật payment.
- Xử lý idempotent theo order/payment ID.
- Không tạo nhiều subscription khi webhook được gửi lặp.
- Không activate subscription khi amount, plan hoặc user không khớp.

### Race condition

Redirect có thể tới trước webhook. Status endpoint phải hỗ trợ trạng thái pending
để frontend poll có giới hạn thay vì báo lỗi hoặc thành công giả.

### Authorization

- Checkout và current subscription yêu cầu authenticated user.
- Payment/subscription detail phải kiểm tra ownership.
- Public status endpoint, nếu giữ public, phải dùng reference không thể đoán và
  chỉ trả dữ liệu tối thiểu.

## Trạng thái chuẩn

Payment:

- Pending.
- Paid.
- Cancelled.
- Expired.
- Failed.

Subscription:

- Pending.
- Active.
- Cancelled.
- Expired.

Response status nên trả `orderCode`, `paymentStatus`, `subscriptionStatus`,
`isPaid`, `isActive`, `isCancelled` và message an toàn.

## Tiêu chí nghiệm thu

1. Checkout chỉ nhận plan active và giá do backend quyết định.
2. Return/cancel hoạt động trên local, staging và production.
3. Webhook sai signature không thay đổi dữ liệu.
4. Webhook lặp không tạo subscription/payment trùng.
5. Patient không truy cập được payment của người khác.
6. Frontend nhận được pending trước webhook và active sau khi webhook hoàn tất.
7. Hủy subscription không làm mất quyền trước thời điểm policy quy định.

Xem nhiệm vụ chi tiết tại [BE-002 và BE-009](../backlog.md).
