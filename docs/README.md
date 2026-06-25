# Tài liệu MediMate AI Frontend

Đây là điểm bắt đầu khi đọc tài liệu của dự án. Tài liệu được chia theo mục đích sử dụng, không đặt file rời trực tiếp trong `docs/`.

Ngày cập nhật: **2026-06-26**.

## 1. Sản phẩm và nghiệp vụ

Thư mục [product-definition](./product-definition/README.md) là nguồn chuẩn cho:

- Định vị và phạm vi sản phẩm.
- Actor và phân quyền.
- Luồng nghiệp vụ.
- Mục tiêu phát triển.
- Quyết định còn mở.

Không dùng tài liệu ERD/use case cũ để mở rộng capability khi chưa có quyết định sản phẩm và backend contract.

## 2. Backend và tích hợp

Thư mục [backend](./backend/README.md) chứa:

- Trạng thái contract backend/frontend hiện tại.
- Backlog backend gắn với chức năng web.
- Hướng dẫn tích hợp Doctor invitation và PayOS.

Các tài liệu trạng thái backend phải ghi ngày kiểm tra và nguồn Swagger. Khi triển khai, cần xác minh lại deploy thay vì mặc định tài liệu vẫn còn mới.

## 3. Kiến trúc frontend

Thư mục [frontend-architecture](./frontend-architecture/README.md) là nguồn chuẩn cho cách tổ chức và review frontend:

1. [Kiến trúc frontend](./frontend-architecture/README.md)
2. [Frontend production standards](./frontend-architecture/production-frontend-standards.md)
3. [Developer workflow](./frontend-architecture/developer-workflow.md)
4. [Refactor & cleanup guide](./frontend-architecture/refactor-cleanup-guide.md)
5. [API layer](./frontend-architecture/api-layer.md)
6. [Styling strategy](./frontend-architecture/styling-strategy.md)
7. [Migration plan](./frontend-architecture/migration-plan.md)
8. [Task checklist](./frontend-architecture/task-checklist.md)
9. [Frontend delivery backlog](./frontend-architecture/frontend-delivery-backlog.md)
10. [Frontend web-scale checklist](./frontend-architecture/frontend-web-scale-checklist.md)

Quy tắc: tài liệu kiến trúc được dùng làm điều kiện review PR, không chỉ là tài liệu tham khảo.

## 4. UI/UX

Thư mục [ui-ux](./ui-ux/README.md) chứa audit, nguyên tắc thiết kế và roadmap nâng cấp trải nghiệm. UI/UX không được tự mở rộng phạm vi nghiệp vụ.

Mọi UI production phải có:

- Responsive ở 320, 375, 768, 1024 và 1440 px.
- Keyboard flow hợp lệ.
- Accessible name rõ ràng.
- Loading, empty, error, success và permission state nhất quán.
- Không che khuất cảnh báo y tế, lỗi backend hoặc hành động nguy hiểm.

## 5. Chất lượng

Thư mục [quality](./quality/testing-baseline.md) chứa baseline kiểm thử route, accessibility, visual và performance.

Tối thiểu trước merge:

```bash
npm run lint
npm run build
npm run test:e2e:routes
npm run test:e2e:a11y
```

Khi thay đổi UI, route, layout, map, payment hoặc workspace lớn, chạy thêm:

```bash
npm run test:e2e:performance
npm run test:e2e:visual
```

## 6. Quy trình bắt buộc cho coder frontend

Mỗi task frontend phải đi qua 7 bước:

1. Đọc product scope và xác định actor/quyền.
2. Đọc route/API/service hiện có.
3. Viết hoặc cập nhật tiêu chí nghiệm thu.
4. Implement theo vertical slice nhỏ.
5. Chạy kiểm tra phù hợp.
6. Xóa code/file dư thừa trong phạm vi thay đổi.
7. Cập nhật docs nếu hành vi hệ thống thay đổi.

Chi tiết xem [Developer workflow](./frontend-architecture/developer-workflow.md).

## 7. Quy ước tài liệu

- Tên file dùng tiếng Anh, chữ thường và kebab-case.
- Mỗi nhóm có `README.md` làm mục lục nếu có từ hai tài liệu trở lên.
- Tài liệu trạng thái phải có ngày kiểm tra.
- Tài liệu đã được thay thế phải xóa; lịch sử đã có trong Git.
- Không dùng tên không mô tả như `2.md`, `plan-new.md` hoặc `final.md`.
- Link nội bộ dùng đường dẫn tương đối.
- Khi code đổi mà docs không đổi, PR phải giải thích vì sao docs không bị ảnh hưởng.
