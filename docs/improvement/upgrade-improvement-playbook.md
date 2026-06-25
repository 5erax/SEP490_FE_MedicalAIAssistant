# Upgrade & improvement playbook

Ngày cập nhật: **2026-06-26**.

Tài liệu này dùng khi team muốn nâng cấp web MediMate AI theo hướng chuyên nghiệp hơn mà không biến quá trình thành rewrite tùy tiện.

## 1. Mục tiêu nâng cấp

Một đợt nâng cấp frontend chỉ hợp lệ nếu phục vụ ít nhất một mục tiêu:

- Tăng độ ổn định của luồng chính.
- Giảm lỗi production.
- Cải thiện UI/UX có thể đo được.
- Tăng accessibility.
- Tăng performance.
- Giảm technical debt.
- Làm code dễ bảo trì hơn.
- Làm onboarding coder mới dễ hơn.
- Chuẩn hóa design system và API usage.
- Loại bỏ mock/demo data khỏi production flow.

Không nâng cấp chỉ vì “muốn đổi giao diện” nếu không có vấn đề cụ thể, metric hoặc acceptance criteria.

## 2. Các loại nâng cấp

| Loại | Mục tiêu | Ví dụ |
| --- | --- | --- |
| Functional hardening | Luồng chính chạy ổn định hơn | Symptom flow, payment, profile, map |
| UI/UX polish | Giao diện rõ, đẹp, dễ dùng hơn | Landing hierarchy, admin table, form error |
| Accessibility upgrade | Dùng được bằng keyboard/screen reader | Dialog focus, label/error, map alternative |
| Performance upgrade | Giảm tải, giảm chậm | Lazy-load map/admin, giảm render dư |
| Architecture upgrade | Giảm coupling, dễ test | Tách page lớn, service boundary |
| Security/privacy hardening | Giảm rủi ro dữ liệu | Auth storage whitelist, không log PII |
| Test hardening | Chặn regression | Route/a11y/visual/performance baseline |

## 3. Quy trình nâng cấp chuẩn

```text
Select target
  -> Audit current state
  -> Define baseline
  -> Define acceptance
  -> Implement vertical slice
  -> Verify
  -> Document
  -> Release note
```

## 4. Bước 1: Chọn target

Chọn target theo thứ tự ưu tiên:

1. P0/P1 bug hoặc risk.
2. Luồng người dùng chính.
3. Luồng operator/admin chính.
4. Security/privacy/payment/AI safety.
5. Performance route nặng.
6. UI/UX consistency.
7. Refactor để giảm nợ kỹ thuật.

Không bắt đầu bằng route ít dùng nếu luồng chính còn lỗi.

## 5. Bước 2: Audit hiện trạng

Với mỗi route/surface, ghi:

```md
## Current state

- Route:
- Actor:
- Main task:
- API used:
- Loading state:
- Empty state:
- Error state:
- Permission state:
- Mobile state:
- Keyboard state:
- Known issues:
- Test coverage:
```

## 6. Bước 3: Tạo baseline

Baseline có thể là:

- Screenshot trước khi sửa.
- Video thao tác.
- Playwright test hiện tại.
- Performance metric.
- Axe result.
- Bundle warning.
- Bug reproduction steps.
- Manual checklist.

Không có baseline thì khó chứng minh upgrade có hiệu quả.

## 7. Bước 4: Đặt acceptance criteria

Acceptance tốt phải rõ, đo được, test được.

Ví dụ chưa tốt:

```text
UI đẹp hơn.
```

Ví dụ tốt:

```text
Ở 320px, form đăng nhập không tràn ngang; mọi field có label/error rõ; submit loading disabled double click; route smoke và a11y smoke pass.
```

## 8. Bước 5: Implement theo vertical slice

Một PR improvement nên nhỏ:

```text
One route
  -> one surface
  -> one problem group
  -> one verification set
```

Ví dụ tốt:

- `fix: stabilize payment cancel state`
- `refactor: extract admin doctor table responsive card`
- `perf: lazy load map surface`
- `a11y: normalize dialog focus management`

Ví dụ không tốt:

- `improve UI all pages`
- `refactor whole app`
- `fix bugs`
- `clean everything`

## 9. Bước 6: Verify

Chọn test theo loại nâng cấp.

| Loại thay đổi | Lệnh tối thiểu |
| --- | --- |
| Code logic nhỏ | `npm run lint`, `npm run build`, test liên quan |
| Route/access | `npm run test:e2e:routes` |
| UI/layout | `npm run test:e2e:a11y`, `npm run test:e2e:visual` |
| Performance | `npm run test:e2e:performance` |
| Payment/map/admin/auth | `npm run test:e2e` nếu có thể |
| Docs-only | Không cần build nếu không đổi code, nhưng cần review link |

## 10. Bước 7: Document

Cập nhật docs nếu thay đổi:

- Route.
- API.
- Access rule.
- User flow.
- Data state.
- UI pattern.
- Performance budget.
- Test baseline.
- Known issues.
- Technical debt.

## 11. Upgrade roadmap đề xuất cho repo hiện tại

### Phase 1: Hardening luồng chính

- Symptom analysis yes/no clinical questions.
- Payment result states.
- Profile/account menu.
- Map live facility discovery.
- Doctor/staff/admin route permission.
- Auth return intent.

### Phase 2: UI/UX consistency

- Landing không dùng dữ liệu giả.
- Form pattern chung.
- DataState pattern chung.
- Dialog/drawer foundation.
- Admin responsive table/card.
- Patient shell mobile navigation.

### Phase 3: Performance

- Lazy-load route nặng.
- Tách admin section bundle nếu cần.
- Kiểm soát MapLibre chunk.
- Giảm import eager mock/demo.
- Cải thiện LCP landing.

### Phase 4: Architecture

- Tách page lớn theo feature.
- Chuẩn hóa service + mapper.
- Tạo query/state strategy.
- Migration TypeScript theo boundary nếu team quyết định.
- Thêm unit/component test cho mapper, schema, utility.

### Phase 5: Production maturity

- Release checklist.
- Incident log.
- Browser/device matrix.
- Monitoring/analytics privacy-safe.
- ADR.
- Design system docs.

## 12. Improvement proposal template

```md
# Improvement proposal

## Problem

...

## Evidence

- Screenshot:
- Test:
- Metric:
- User impact:

## Scope

- Route:
- Actor:
- Files:
- API:

## Proposed change

...

## Acceptance criteria

- [ ] ...
- [ ] ...

## Risk

- Product:
- API:
- Security/privacy:
- Accessibility:
- Performance:

## Verification

- [ ] npm run lint
- [ ] npm run build
- [ ] npm run test:e2e:routes
- [ ] npm run test:e2e:a11y
- [ ] npm run test:e2e:visual
- [ ] npm run test:e2e:performance
```

## 13. Không được làm trong đợt upgrade

- Rewrite toàn app.
- Đổi framework.
- Thêm UI framework lớn.
- Tạo design system song song không dùng.
- Thêm dependency không có owner.
- Xóa test fail để merge.
- Dùng mock data thay production API.
- Tự mở rộng nghiệp vụ y tế không có product/backend contract.
- Đưa medical/PII data vào log hoặc analytics.
