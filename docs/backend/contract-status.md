# Trạng thái contract backend/frontend

Ngày kiểm tra: **2026-06-13**

Nguồn:

```text
http://52.77.210.243:8080/swagger/v1/swagger.json
```

## Nhóm API đã có

- Authentication: login, register, Google login, refresh, logout, forgot/change
  password, Staff application và Staff approval.
- Users: list, current user, update và delete.
- Patient profiles: list, create, update và delete.
- Medical departments: public list và CRUD.
- Medical facilities: active list, management list, CRUD/status.
- Facility departments: public active list.
- Doctors: active list, management list, CRUD/status.
- Doctor invitations: create, revoke, validate và register.
- Symptom analysis: analyze và get by session ID.
- Web chatbot.
- Feedback reviews: list, create, detail, status và delete.
- Subscription plans, checkout, current subscription và cancellation.
- Payments: detail, PayOS return/cancel/status/webhook.
- AI configurations: active, by task type, CRUD/status.

## Dữ liệu deploy tại lần kiểm tra

- `GET /api/medical-facilities/active`: HTTP 200, `data: []`.
- `GET /api/facility-departments/active`: HTTP 200, `data: []`.
- `GET /api/subscription-plans/active`: có một gói active.

Facility và facility department chưa có dữ liệu nên luồng map, recommendation và
gán Doctor vào khoa chưa thể nghiệm thu end-to-end dù endpoint đã tồn tại.

## Giới hạn contract

- Doctor invitation chưa có endpoint list hoặc resend.
- Symptom analysis chưa có endpoint lịch sử theo current user.
- Facility department chưa có management CRUD riêng.
- Facility search chưa có filter vị trí, khoảng cách, chuyên khoa và pagination
  phù hợp cho map.
- OpenAPI chưa khai báo security requirement rõ cho endpoint cần JWT.
- Backend deploy dùng HTTP; frontend production cần same-origin HTTPS proxy.
- Payment status cần được bảo vệ bằng ownership hoặc reference an toàn.
- Review có status nhưng policy pending/approve/public chưa được xác định rõ.

## Capability chưa có backend production

- Medical records và file y tế.
- Medication recognition và interaction checking.
- Appointment/visit.
- Treatment, recovery và reminder tracking.

Các màn hình tương ứng chỉ được xem là demo cho tới khi có product decision,
data model, authorization, consent và API production.

## Quy tắc cập nhật

Khi Swagger hoặc dữ liệu deploy thay đổi:

1. Cập nhật ngày kiểm tra.
2. Cập nhật nhóm API và giới hạn tương ứng.
3. Không ghi token, credential hoặc dữ liệu người dùng vào tài liệu.
4. Đồng bộ nhiệm vụ trong [backend backlog](./backlog.md).
