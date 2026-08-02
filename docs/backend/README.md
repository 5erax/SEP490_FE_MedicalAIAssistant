# Backend và tích hợp

## Tài liệu

1. [Contract status](./contract-status.md): endpoint đã tích hợp, giới hạn và
   dữ liệu deploy tại lần kiểm tra gần nhất.
2. [Backend backlog](./backlog.md): nhiệm vụ backend và chức năng web sử dụng.
3. [Doctor invitation](./integrations/doctor-invitation.md): contract và luồng
   đăng ký Doctor bằng invitation.
4. [PayOS](./integrations/payos.md): checkout, callback, webhook và tiêu chí
   nghiệm thu thanh toán.
5. [Luồng FE1 cho người dùng](./integrations/fe1-user-workflows.md): thuốc và lịch
   nhắc, quota, yêu cầu/kế hoạch phục hồi, realtime và phạm vi admin chỉ đọc.

## Nguồn contract

Swagger deploy:

```text
http://52.77.210.243:8080/swagger/v1/swagger.json
```

Swagger deploy là nguồn contract ưu tiên hơn tài liệu cũ. Dữ liệu và trạng thái
vận hành có thể thay đổi nên phải kiểm tra lại trước khi code hoặc nghiệm thu.
