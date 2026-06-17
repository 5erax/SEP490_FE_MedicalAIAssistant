# Tài liệu MediMate AI Frontend

Đây là điểm bắt đầu khi đọc tài liệu của dự án. Tài liệu được chia theo mục
đích sử dụng, không đặt file rời trực tiếp trong `docs/`.

## 1. Sản phẩm và nghiệp vụ

Thư mục [product-definition](./product-definition/README.md) là nguồn chuẩn cho:

- Định vị và phạm vi sản phẩm.
- Actor và phân quyền.
- Luồng nghiệp vụ.
- Mục tiêu phát triển.

Không dùng tài liệu ERD/use case cũ để mở rộng capability khi chưa có quyết định
sản phẩm và backend contract.

## 2. Backend và tích hợp

Thư mục [backend](./backend/README.md) chứa:

- Trạng thái contract backend/frontend hiện tại.
- Backlog backend gắn với chức năng web.
- Hướng dẫn tích hợp Doctor invitation và PayOS.

Các tài liệu trạng thái backend phải ghi ngày kiểm tra và nguồn Swagger. Khi
triển khai, cần xác minh lại deploy thay vì mặc định tài liệu vẫn còn mới.

## 3. Kiến trúc frontend

Thư mục [frontend-architecture](./frontend-architecture/README.md) mô tả:

- Cấu trúc `app / routes / features / shared`.
- Dependency đề xuất.
- Chiến lược CSS và design system.
- Kế hoạch migration từng phase.
- Backlog giao việc frontend theo ưu tiên, phụ thuộc và tiêu chí nghiệm thu.
- Checklist frontend chuẩn web lớn và ma trận tận dụng API backend.

## 4. UI/UX

Thư mục [ui-ux](./ui-ux/README.md) chứa audit, nguyên tắc thiết kế và roadmap
nâng cấp trải nghiệm. UI/UX không được tự mở rộng phạm vi nghiệp vụ.

## 5. Chất lượng

Thư mục [quality](./quality/README.md) chứa baseline kiểm thử route,
accessibility, visual, performance và inventory mock/demo production-sensitive.

## Quy ước tài liệu

- Tên file dùng tiếng Anh, chữ thường và kebab-case.
- Mỗi nhóm có `README.md` làm mục lục nếu có từ hai tài liệu trở lên.
- Tài liệu trạng thái phải có ngày kiểm tra.
- Tài liệu đã được thay thế phải xóa; lịch sử đã có trong Git.
- Không dùng tên không mô tả như `2.md`, `plan-new.md` hoặc `final.md`.
- Link nội bộ dùng đường dẫn tương đối.
