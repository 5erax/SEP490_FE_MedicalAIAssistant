# Tích hợp Doctor invitation

Ngày đối chiếu contract: **2026-06-13**

## Mục đích

Admin gửi lời mời để Doctor kích hoạt tài khoản và liên kết với Doctor profile.
Frontend public sử dụng route:

```text
/register-doctor?token=...
```

Token chỉ được đọc từ URL để validate/register, không lưu vào local storage,
analytics hoặc log.

## API hiện có

```http
POST /api/admin/doctor-invitations
POST /api/admin/doctor-invitations/{id}/revoke
GET  /api/doctor-invitations/validate?token={token}
POST /api/doctor-invitations/register
GET  /api/facility-departments/active
```

Validate và register là public vì người nhận invitation chưa có tài khoản.
Create/revoke chỉ dành cho Admin và backend phải enforce authorization.

## Luồng web

1. Admin tạo invitation cho email và có thể liên kết `doctorId`.
2. Backend tạo token một lần, lưu dạng an toàn và gửi email.
3. Doctor mở `/register-doctor?token=...`.
4. Frontend validate token trước khi hiển thị form.
5. Invitation liên kết Doctor profile cũ chỉ yêu cầu thông tin tài khoản cần thiết.
6. Invitation tạo Doctor mới yêu cầu `facilityDepartmentId` và thông tin chuyên môn.
7. Backend tạo/liên kết tài khoản, đánh dấu invitation đã dùng.
8. Frontend chuyển Doctor tới login.

## Nguồn FacilityDepartment

Frontend phải gửi ID của quan hệ FacilityDepartment, không gửi
`medicalDepartmentId`.

Response active cần có:

```json
{
  "id": "facility-department-id",
  "facilityId": "facility-id",
  "facilityName": "Tên cơ sở",
  "departmentId": "department-id",
  "departmentName": "Tên khoa"
}
```

Endpoint hiện trả HTTP 200 nhưng danh sách rỗng. Backend cần seed dữ liệu facility
và facility department hợp lệ trước khi kiểm thử luồng tạo Doctor mới.

## Trạng thái invitation

Backend và frontend cần phân biệt:

- Valid.
- Expired.
- Used.
- Revoked.
- Invalid/missing.

Không dùng một message chung cho mọi trạng thái nếu backend đã xác định được lý do.

## Phần backend còn thiếu

- `GET /api/admin/doctor-invitations` có pagination và filter status.
- Resend invitation với token/thời hạn mới.
- Audit người tạo, revoke/resend và thời gian xử lý.
- Ràng buộc Doctor profile với facility department active.
- Idempotency cho register để không tạo tài khoản/profile trùng.

Xem nhiệm vụ chi tiết tại
[BE-006 và BE-012](../backlog.md).

## Tiêu chí nghiệm thu

1. Token hợp lệ chỉ dùng được một lần và hết hạn đúng cấu hình.
2. Token không xuất hiện trong server log hoặc analytics.
3. Admin có thể list/revoke/resend sau khi reload trang.
4. ID từ `/facility-departments/active` được register chấp nhận.
5. User không có role Admin không thể quản lý invitation.
6. Doctor đăng ký thành công được đưa vào đúng Staff/Doctor workspace policy.
