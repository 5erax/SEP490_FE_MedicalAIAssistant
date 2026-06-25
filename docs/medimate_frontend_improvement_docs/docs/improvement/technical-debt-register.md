# Technical debt register

Ngày cập nhật: **2026-06-26**.

Tài liệu này là mẫu quản lý nợ kỹ thuật frontend. Mỗi nợ kỹ thuật phải có owner, impact và điều kiện đóng.

## 1. Debt categories

| Category | Ví dụ |
| --- | --- |
| Architecture | Page quá lớn, boundary sai, import vòng |
| API | Endpoint legacy, service duplicate, error mapping yếu |
| UI/UX | Pattern không nhất quán, mobile table kém |
| Accessibility | Focus trap thiếu, label/error yếu |
| Performance | Bundle lớn, import eager, render loop |
| Security/privacy | Storage/log chứa dữ liệu nhạy cảm |
| Testing | Thiếu regression guard |
| Documentation | Docs lỗi thời, thiếu ADR |
| Product mismatch | Demo capability hiển thị như production |

## 2. Debt severity

| Severity | Điều kiện |
| --- | --- |
| High | Gây bug P0/P1 hoặc chặn feature quan trọng |
| Medium | Làm dev chậm, dễ tạo bug, ảnh hưởng UX |
| Low | Polish/cleanup, chưa ảnh hưởng trực tiếp |

## 3. Debt item template

```md
## TD-000: Title

- Category:
- Severity:
- Owner:
- Created:
- Related route/file:
- Related issue/PR:
- Current impact:
- Why not fixed now:
- Proposed fix:
- Acceptance criteria:
- Verification:
- Target milestone:
- Status:
```

## 4. Register table

```md
| ID | Category | Severity | Title | Impact | Owner | Target | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TD-001 | API | Medium | apiClient fallback message mojibake | User sees broken Vietnamese error | FE | Sprint X | Open |
```

## 5. Debt candidates hiện nên theo dõi

> Danh sách này là đề xuất ban đầu. Khi áp dụng vào repo, team nên xác minh lại bằng code hiện tại trước khi chốt.

| ID | Category | Severity | Title | Lý do |
| --- | --- | --- | --- | --- |
| TD-001 | API | Medium | Sửa mojibake fallback message trong `apiClient.js` | Error tiếng Việt bị lỗi encoding sẽ làm UX kém và khó debug |
| TD-002 | Config | Medium | Production backend rewrite còn hard-code IP | Khó quản lý nhiều môi trường và HTTPS/domain |
| TD-003 | Testing | Medium | Thiếu test full symptom flow | Luồng y tế chính có rủi ro regression |
| TD-004 | Testing | High | Payment status state cần regression rộng hơn | Payment là luồng P0 |
| TD-005 | Architecture | Medium | Page/workspace lớn cần tiếp tục tách | Khó maintain và test |
| TD-006 | Performance | Medium | Map/Admin chunk cần budget rõ | Route nặng có thể ảnh hưởng initial load |
| TD-007 | Product | High | Demo capability cần kiểm soát production navigation | Tránh user hiểu nhầm dữ liệu mẫu là thật |
| TD-008 | Accessibility | Medium | Map/list/dialog cần manual a11y sweep định kỳ | Axe tự động không đủ |
| TD-009 | ESLint | Medium | ESLint hiện chủ yếu cho JS/JSX | Nếu thêm TS phải cập nhật gate |
| TD-010 | Docs | Low | Cần ADR cho dependency/architecture decision | Tránh quyết định kỹ thuật bị lặp lại |

## 6. Debt review cadence

- Mỗi tuần: review High debt.
- Mỗi sprint: chọn 1-3 Medium debt liên quan feature đang làm.
- Trước release: không để High debt chưa có owner.
- Sau incident: tạo debt item nếu root cause là process/architecture/test gap.

## 7. Khi nào được đóng debt

Debt chỉ đóng khi:

- Fix đã merge.
- Test hoặc verification đạt.
- Docs cập nhật nếu cần.
- Không còn import/file/behavior cũ.
- Có PR link hoặc commit.
- Owner xác nhận acceptance criteria đạt.

## 8. Không được làm

- Tạo debt item không owner.
- Ghi debt chung chung như “code xấu”.
- Đóng debt chỉ vì “không còn thời gian”.
- Dùng debt register thay cho bug tracker P0/P1.
