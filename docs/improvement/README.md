# Frontend improvement & bug-fix playbooks

Ngày cập nhật: **2026-06-26**.

Nhóm tài liệu này dùng khi team frontend muốn:

- Nâng cấp web theo hướng production/professional.
- Cải tiến UI/UX có kiểm soát.
- Bắt lỗi đang tồn tại.
- Sửa bug theo quy trình thống nhất.
- Giảm technical debt.
- Tạo kế hoạch hardening trước release.
- Đề xuất thêm docs/process cho team.

## Tài liệu trong nhóm này

1. [Upgrade & improvement playbook](./upgrade-improvement-playbook.md)
2. [Bug hunting playbook](./bug-hunting-playbook.md)
3. [Production bug fix workflow](./production-bug-fix-workflow.md)
4. [Quality audit matrix](./quality-audit-matrix.md)
5. [UI/UX improvement audit](./ui-ux-improvement-audit.md)
6. [Performance optimization playbook](./performance-optimization-playbook.md)
7. [Security & privacy bug hunt](./security-privacy-bug-hunt.md)
8. [Regression test strategy](./regression-test-strategy.md)
9. [Technical debt register](./technical-debt-register.md)
10. [Recommended docs roadmap](./recommended-docs-roadmap.md)

## Quan hệ với docs hiện có

Nhóm này không thay thế:

- `docs/product-definition/README.md`
- `docs/frontend-architecture/production-frontend-standards.md`
- `docs/frontend-architecture/developer-workflow.md`
- `docs/frontend-architecture/refactor-cleanup-guide.md`
- `docs/frontend-architecture/frontend-delivery-backlog.md`
- `docs/ui-ux/roadmap.md`
- `docs/quality/testing-baseline.md`

Nhóm này bổ sung quy trình thực thi khi team muốn tìm lỗi, cải tiến hoặc nâng cấp.

## Khi nào dùng tài liệu nào?

| Tình huống | Dùng file |
| --- | --- |
| Muốn nâng cấp toàn web | `upgrade-improvement-playbook.md` |
| Muốn tìm bug ẩn/chưa có report | `bug-hunting-playbook.md` |
| Bug đã xảy ra trên production/local | `production-bug-fix-workflow.md` |
| Muốn audit theo route/feature | `quality-audit-matrix.md` |
| Muốn cải thiện UI/UX | `ui-ux-improvement-audit.md` |
| Web chậm, bundle lớn, route nặng | `performance-optimization-playbook.md` |
| Lo ngại dữ liệu y tế, PII, token, payment | `security-privacy-bug-hunt.md` |
| Sợ sửa bug làm hỏng tính năng khác | `regression-test-strategy.md` |
| Muốn quản lý nợ kỹ thuật | `technical-debt-register.md` |
| Muốn bổ sung bộ docs chuyên nghiệp hơn | `recommended-docs-roadmap.md` |

## Nguyên tắc chung

1. Không nâng cấp bằng cảm tính.
2. Mọi cải tiến phải có baseline trước/sau.
3. Bug phải có reproduction hoặc evidence.
4. Fix bug phải có regression guard nếu có thể test tự động.
5. UI improvement phải giữ accessibility và responsive.
6. Performance improvement phải có metric.
7. Security/privacy issue luôn ưu tiên hơn polish.
8. Không dùng mock/demo data như production.
9. Không sửa nhiều lớp kiến trúc trong cùng một PR nếu không cần.
10. Docs phải được cập nhật khi behavior, route, API, test hoặc deployment thay đổi.

## Severity chuẩn

| Severity | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| P0 | Chặn release hoặc gây rủi ro nghiêm trọng | Login hỏng, payment sai, lộ token/PII, route admin public |
| P1 | Ảnh hưởng luồng chính hoặc dữ liệu quan trọng | Symptom flow lỗi, map không load, admin CRUD sai |
| P2 | Ảnh hưởng trải nghiệm/hiệu năng nhưng có workaround | Layout mobile xấu, slow route, empty state kém |
| P3 | Cải thiện polish/maintainability | Copy chưa đều, spacing chưa đẹp, refactor nhỏ |

## Definition of Ready cho task improvement/bug fix

Task sẵn sàng để làm khi có:

- Route/surface bị ảnh hưởng.
- Actor bị ảnh hưởng.
- Mô tả vấn đề.
- Mức độ ưu tiên.
- Cách tái hiện hoặc baseline hiện tại.
- Kỳ vọng sau khi sửa.
- Test cần chạy.
- Docs cần cập nhật.

## Definition of Done

Task hoàn tất khi:

- Lỗi được sửa hoặc improvement đạt acceptance.
- Không tạo regression route/API/accessibility.
- Test liên quan đã chạy.
- Code/file dư phát sinh đã được xóa.
- Nếu là bug, có regression guard hoặc lý do không thể tự động hóa.
- Nếu là improvement, có before/after evidence.
- Docs/backlog được cập nhật nếu cần.
