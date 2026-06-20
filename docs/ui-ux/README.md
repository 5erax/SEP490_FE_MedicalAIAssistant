# UI/UX MediMate

> Pham vi nghiep vu, actor va quyen phai theo
> Phạm vi nghiệp vụ, actor và quyền phải theo
> [product definition](../product-definition/README.md). Tài liệu UI/UX chỉ
> quy định cách triển khai trải nghiệm, không tự mở rộng capability sản phẩm.

Thư mục này chứa audit, nguyên tắc và kế hoạch nâng cấp UI/UX.

## Mục tiêu

- Tạo trải nghiệm nhất quán cho public/auth, Patient, Staff, Admin và AI.
- Ưu tiên accessibility, mobile-first và tính rõ ràng của tác vụ.
- Chuẩn hóa design system trước khi sửa riêng từng màn hình.
- Chia thay đổi thành các đợt nhỏ có thể kiểm thử và phát hành độc lập.

## Tài liệu

1. [UI/UX audit](./ui-audit.md): hiện trạng và ma trận route.
2. [Navigation audit](./navigation-audit-2026-06-13.md): findings đã kiểm tra
   bằng Browser/Playwright.
3. [Design principles](./design-principles.md): guardrail thiết kế và nội dung.
4. [Navigation plan](./navigation-plan.md): route registry, guard và return intent.
5. [Roadmap](./roadmap.md): backlog P0/P1/P2 và tiêu chí nghiệm thu.
6. [Full-screen improvement checklist](./full-screen-improvement-checklist.md):
   bảng tiến độ thực thi theo từng route và admin section.
7. [Testing baseline](../quality/testing-baseline.md): route, accessibility,
   visual và performance baseline.

## Phạm vi và ràng buộc

- Bao phủ mọi route, alias, redirect và fallback.
- Giữ React/Vite và backend contract trong từng vertical slice.
- Tái sử dụng token, UI primitive và feedback pattern hiện tại.
- Không thay đổi role, entitlement hoặc nội dung y khoa nếu chưa có yêu cầu.

## Definition of done

- Các màn hình dùng cùng token và component foundation.
- Luồng chính hoạt động tại 320, 375, 768, 1024 và 1440 px.
- Tác vụ chính hoàn thành bằng bàn phím; focus và accessible name rõ ràng.
- Loading, empty, error, success và permission state nhất quán.
- Không regression route, auth, entitlement, role và API contract.
- Build, lint, accessibility và visual regression đạt.
