# Backend note: Public FacilityDepartment API for doctor invitation registration

## Bối cảnh

Frontend đã triển khai trang public:

```text
/register-doctor?token=...
```

Hai API invitation hiện có trên backend deploy:

```http
GET /api/doctor-invitations/validate?token={token}
POST /api/doctor-invitations/register
```

Luồng liên kết một Doctor profile đã tồn tại có thể hoạt động với hai API trên. Luồng tạo Doctor profile mới chưa thể hoàn tất vì frontend chưa có nguồn dữ liệu public cung cấp `facilityDepartmentId`.

## API backend cần bổ sung

```http
GET /api/facility-departments/active
```

Endpoint phải public, không yêu cầu JWT. Người mở invitation chưa có tài khoản nên không thể cung cấp access token.

Response đề xuất:

```json
{
  "success": true,
  "message": "OK",
  "errors": [],
  "data": [
    {
      "id": "facility-department-uuid",
      "facilityId": "facility-uuid",
      "facilityName": "Bệnh viện A",
      "departmentId": "department-uuid",
      "departmentName": "Khoa Tim mạch"
    }
  ]
}
```

Quy ước:

- `id` là khóa chính của bản ghi `FacilityDepartment`, cũng là giá trị FE gửi trong `facilityDepartmentId`.
- Chỉ trả các liên kết có cơ sở y tế và khoa đang hoạt động.
- `facilityName` và `departmentName` dùng để tạo nhãn dropdown thân thiện.
- Có thể hỗ trợ query `search` nếu dữ liệu lớn.
- Response giữ envelope `success`, `message`, `errors`, `data` giống các API hiện tại.

## Tại sao backend cần bổ sung API này

`POST /api/doctor-invitations/register` nhận trường:

```json
{
  "facilityDepartmentId": "uuid"
}
```

Tuy nhiên, OpenAPI hiện tại cho thấy:

- Không có route `/api/facility-departments`.
- `GET /api/medical-facilities` và `/active` trả mảng departments chỉ gồm `departmentId`, `departmentName`, `description`.
- `departmentId` là ID của khoa chung, không phải ID của quan hệ giữa một cơ sở y tế và khoa đó.

Vì vậy frontend không thể suy ra `facilityDepartmentId`. Nếu gửi `departmentId`, backend có thể từ chối do sai ID hoặc liên kết bác sĩ với dữ liệu không đúng. Cho người dùng nhập UUID thủ công cũng không phù hợp vì dễ nhập sai và làm lộ chi tiết kỹ thuật.

## Trạng thái frontend trong thời gian chờ

- Invitation liên kết Doctor profile cũ vẫn cho phép đăng ký.
- Invitation tạo bác sĩ mới vẫn hiển thị đầy đủ form.
- FE gọi `GET /api/facility-departments/active`.
- Nếu endpoint trả 404, lỗi hoặc danh sách rỗng, FE khóa nút đăng ký và hiển thị lý do.
- FE không dùng `departmentId` làm phương án thay thế và không cho nhập UUID thủ công.

## Tiêu chí tích hợp

Backend hoàn thành khi:

1. Endpoint public trả HTTP 200 mà không cần JWT.
2. Mỗi item có `id` là FacilityDepartment ID hợp lệ.
3. ID trả về được `POST /api/doctor-invitations/register` chấp nhận.
4. Danh sách chỉ chứa cơ sở và khoa đang hoạt động.
5. Có ít nhất một bản ghi test trên môi trường deploy để FE kiểm tra end-to-end.
