# Quality audit matrix

Ngày cập nhật: **2026-06-26**.

Tài liệu này là ma trận audit tổng thể để kiểm tra chất lượng frontend theo route, feature và risk area.

## 1. Cách dùng

Mỗi lần audit, tạo một bản ghi:

```md
## Audit record

- Date:
- Auditor:
- Branch/commit:
- Scope:
- Browser:
- Viewports:
- Backend:
```

Sau đó kiểm tra từng nhóm tiêu chí dưới đây.

## 2. Route matrix

| Route/surface | Actor | Risk | Audit priority |
| --- | --- | --- | --- |
| `/` | Public | Landing, mock data, performance | P1 |
| `/login` | Public | Auth, redirect, error | P0 |
| `/signup` | Public | Auth, validation | P0 |
| `/forgot-password` | Public | Auth, form | P1 |
| `/change-password` | Public | Auth, form | P1 |
| `/dashboard` | Patient/Public depending route access | Intake, suggestion, safety | P0 |
| `/symptom` | Patient | Clinical questions, AI safety | P0 |
| `/map` | Public/Patient | Facility, map, geolocation | P0 |
| `/profile` | Patient | PII, profile form | P0 |
| `/pricing` | Public/Patient | Plan, checkout | P0 |
| `/payment/return` | Public/Patient | Payment status | P0 |
| `/payment/cancel` | Public/Patient | Payment cancel state | P0 |
| `/app/staff` | Staff/Doctor/Admin | Role boundary, workspace | P0 |
| `/app/admin` | Admin | Security, CRUD | P0 |
| `/app/admin/users` | Admin | User data, PII | P0 |
| `/app/admin/doctors` | Admin | CRUD, responsive table | P0 |
| `/app/admin/facilities` | Admin | Map data, CRUD | P0 |
| `/app/admin/ai-configs` | Admin | AI behavior config | P0 |
| `/app/admin/subscriptions` | Admin | Plan/payment config | P0 |
| `/records` | Patient/Premium | Demo vs production | P1 |
| `/medication` | Patient/Premium | Demo vs production | P1 |

## 3. Audit dimensions

Mỗi route chấm theo 0/1/2:

| Điểm | Ý nghĩa |
| --- | --- |
| 0 | Không đạt hoặc chưa kiểm tra được |
| 1 | Đạt một phần, có issue |
| 2 | Đạt production expectation |

Dimension:

- Product correctness.
- Route/access.
- API correctness.
- Data states.
- Form behavior.
- UI responsive.
- Accessibility.
- Performance.
- Security/privacy.
- Test coverage.
- Documentation.

## 4. Audit table template

```md
| Route | Product | Route | API | State | Form | UI | A11Y | Perf | Sec | Test | Docs | Issues |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `/login` | 2 | 2 | 2 | 1 | 1 | 2 | 2 | 2 | 2 | 1 | 2 | Missing server error focus |
```

## 5. Product correctness

- [ ] Route thể hiện capability đã được product/backend cho phép.
- [ ] Không trình bày demo như production.
- [ ] Copy đúng actor.
- [ ] Medical/AI copy không chẩn đoán tuyệt đối.
- [ ] Emergency/safety content không bị khóa.
- [ ] Payment/subscription copy không gây hiểu nhầm.
- [ ] Admin/operator copy không expose internal ID không cần thiết.

## 6. Route/access

- [ ] Direct URL đúng.
- [ ] Refresh đúng.
- [ ] Back/Forward đúng.
- [ ] Auth redirect đúng.
- [ ] Role guard đúng.
- [ ] Premium guard đúng.
- [ ] Alias canonicalize đúng.
- [ ] Page title đúng.
- [ ] Navigation active đúng.

## 7. API correctness

- [ ] Service dùng `ENDPOINTS`.
- [ ] Request auth đúng.
- [ ] Payload đúng contract.
- [ ] Response null/missing field an toàn.
- [ ] Error hiển thị được.
- [ ] Không gọi provider trực tiếp nếu backend là gateway.
- [ ] Không hard-code backend host.
- [ ] Không gọi API backend-only từ frontend.

## 8. Data states

- [ ] Loading.
- [ ] Empty.
- [ ] Error.
- [ ] Retry.
- [ ] Success.
- [ ] Permission denied.
- [ ] Partial data.
- [ ] Offline/timeout nếu phù hợp.
- [ ] Mutation busy.
- [ ] Refetch after mutation.

## 9. Form behavior

- [ ] Label.
- [ ] Hint.
- [ ] Error.
- [ ] Validation.
- [ ] Dirty state.
- [ ] Disabled/busy submit.
- [ ] Server error recovery.
- [ ] Keyboard submit.
- [ ] Autofill/autocomplete.
- [ ] No double-submit.

## 10. UI responsive

- [ ] 320px.
- [ ] 375px.
- [ ] 768px.
- [ ] 1024px.
- [ ] 1440px.
- [ ] No unwanted horizontal scroll.
- [ ] Text wraps.
- [ ] Table/card strategy.
- [ ] Dialog viewport.
- [ ] Action visibility.

## 11. Accessibility

- [ ] Keyboard path.
- [ ] Focus visible.
- [ ] Heading.
- [ ] Landmark.
- [ ] Button/link name.
- [ ] Form error announcement.
- [ ] Dialog focus.
- [ ] Contrast.
- [ ] Reduced motion.
- [ ] Map/chart alternative.

## 12. Performance

- [ ] Route does not import heavy modules unnecessarily.
- [ ] Lazy-load heavy page.
- [ ] No render loop.
- [ ] No uncontrolled polling.
- [ ] Images/assets optimized.
- [ ] Map/admin/chat isolated.
- [ ] LCP/CLS within baseline.
- [ ] No large mock data in initial bundle.

## 13. Security/privacy

- [ ] No token/PII in logs.
- [ ] Auth storage whitelist.
- [ ] No medical content in analytics/test output.
- [ ] Admin route protected.
- [ ] Payment status verified by backend.
- [ ] Unsafe HTML/URL avoided.
- [ ] File upload validated.
- [ ] No secret in client env.

## 14. Test coverage

- [ ] Route smoke.
- [ ] A11Y smoke.
- [ ] Visual baseline if UI route.
- [ ] Performance smoke if critical route.
- [ ] Interaction test for critical task.
- [ ] Error state test.
- [ ] Auth/role test if protected.
- [ ] Payment/map/AI specialized test if relevant.

## 15. Audit output

Sau audit, tạo danh sách issue:

```md
| ID | Severity | Route | Problem | Evidence | Proposed fix | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AUD-001 | P0 | `/payment/return` | Success shown before backend verification | video/link | call status API first | FE | Open |
```

## 16. Exit criteria

Một audit pass khi:

- Không còn P0.
- P1 có owner và milestone.
- Route chính đạt trung bình >= 1.7/2.
- Security/privacy không có issue mở.
- Test baseline chạy được.
- Docs/backlog cập nhật.
