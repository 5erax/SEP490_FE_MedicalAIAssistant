# Recommended docs roadmap

Ngày cập nhật: **2026-06-26**.

Tài liệu này đề xuất các bộ docs nên có thêm để repo frontend đạt mức vận hành chuyên nghiệp hơn cho team production.

## 1. Mức ưu tiên

| Priority | Ý nghĩa |
| --- | --- |
| P0 | Nên có ngay vì ảnh hưởng chất lượng/release/security |
| P1 | Nên có trong giai đoạn hardening |
| P2 | Nên có khi team mở rộng hoặc sản phẩm ổn định |
| P3 | Hữu ích nhưng chưa cấp thiết |

## 2. Docs đề xuất P0

### 2.1. Release checklist

Đường dẫn đề xuất:

```text
docs/release/release-checklist.md
```

Nội dung cần có:

- Branch/tag rule.
- Required tests.
- Env check.
- Vercel deployment check.
- OAuth domain check.
- Backend compatibility check.
- Smoke test sau deploy.
- Rollback rule.
- Release note template.

Lý do: repo có payment, auth, admin và dữ liệu y tế; release không nên dựa vào nhớ thủ công.

### 2.2. Incident response log

Đường dẫn đề xuất:

```text
docs/incidents/README.md
docs/incidents/YYYY-MM-DD-incident-title.md
```

Nội dung cần có:

- Timeline.
- Impact.
- Root cause.
- Resolution.
- Prevention.
- Test added.
- Docs updated.

Lý do: P0/P1 bug cần học lại được sau khi fix.

### 2.3. Environment & deployment guide

Đường dẫn đề xuất:

```text
docs/deployment/environment-guide.md
```

Nội dung cần có:

- `.env.example`.
- Local/staging/production.
- Vite proxy.
- Vercel rewrites.
- OAuth domain.
- Backend URL strategy.
- Secret policy.
- Troubleshooting 405/404/rewrite.

Lý do: repo từng có lỗi 405 và Vercel routing/API rewrite là điểm rủi ro.

### 2.4. Critical flow checklist

Đường dẫn đề xuất:

```text
docs/quality/critical-flow-checklist.md
```

Nội dung cần có:

- Login/logout.
- Signup.
- Symptom flow.
- Map.
- Payment.
- Profile.
- Admin CRUD.
- Staff/Doctor workspace.
- Manual + automated check.

Lý do: trước mỗi merge/release cần biết flow nào phải sống.

## 3. Docs đề xuất P1

### 3.1. Architecture Decision Records

Đường dẫn đề xuất:

```text
docs/adr/0001-record-architecture-decisions.md
docs/adr/0002-router-strategy.md
docs/adr/0003-state-management-strategy.md
docs/adr/0004-design-system-strategy.md
```

Nội dung mỗi ADR:

- Context.
- Decision.
- Alternatives.
- Consequences.
- Revisit date.

Lý do: tránh tranh cãi lặp lại về React Router, TanStack Query, TypeScript, Tailwind, UI framework.

### 3.2. Design system manual

Đường dẫn đề xuất:

```text
docs/design-system/README.md
docs/design-system/components.md
docs/design-system/tokens.md
docs/design-system/content-guidelines.md
```

Nội dung cần có:

- Token.
- Button variants.
- Form Field.
- Alert.
- Dialog.
- DataState.
- Table.
- Status badge.
- Copy style.
- Accessibility expectation.

Lý do: UI/UX upgrade cần foundation thay vì sửa từng màn hình riêng lẻ.

### 3.3. API contract mapping

Đường dẫn đề xuất:

```text
docs/backend/frontend-api-contract-map.md
```

Nội dung cần có:

- Backend endpoint.
- Frontend service.
- Route/page dùng.
- Auth required.
- Payload.
- Response.
- Known gaps.
- Test coverage.

Lý do: giúp bắt lỗi contract nhanh hơn khi backend đổi.

### 3.4. Browser/device support matrix

Đường dẫn đề xuất:

```text
docs/quality/browser-device-matrix.md
```

Nội dung cần có:

- Chrome/Edge/Firefox/Safari.
- Desktop/mobile widths.
- Minimum support.
- Manual test cadence.
- Known browser-specific issues.

Lý do: Playwright hiện chủ yếu Chromium; release cần biết giới hạn.

## 4. Docs đề xuất P2

### 4.1. Observability & analytics policy

Đường dẫn đề xuất:

```text
docs/observability/privacy-safe-events.md
```

Nội dung cần có:

- Event naming.
- Allowed metadata.
- Forbidden medical/PII payload.
- Error reporting policy.
- Sampling.
- Retention.

Lý do: sản phẩm y tế không được log triệu chứng/PII tùy tiện.

### 4.2. Frontend onboarding handbook

Đường dẫn đề xuất:

```text
docs/onboarding/frontend-onboarding.md
```

Nội dung cần có:

- 1-day onboarding.
- 1-week checklist.
- How to run project.
- How to read architecture.
- First good issues.
- Common mistakes.

Lý do: team mới sẽ giảm lỗi nếu có handbook rõ.

### 4.3. Performance budget & bundle analysis

Đường dẫn đề xuất:

```text
docs/performance/performance-budget.md
docs/performance/bundle-analysis.md
```

Nội dung cần có:

- Route budgets.
- Bundle budget.
- LCP/CLS/INP target.
- Map/Admin strategy.
- How to profile.

Lý do: MapLibre/admin/chat dễ làm app nặng.

### 4.4. Test authoring guide

Đường dẫn đề xuất:

```text
docs/testing/test-authoring-guide.md
```

Nội dung cần có:

- Playwright pattern.
- Route mock.
- Accessibility test.
- Visual snapshot policy.
- Data privacy in tests.
- Flaky test rule.

Lý do: test tồn tại nhưng cần guide viết test nhất quán.

## 5. Docs đề xuất P3

### 5.1. Content style guide

Đường dẫn đề xuất:

```text
docs/content/vietnamese-product-copy-guide.md
```

Nội dung cần có:

- Giọng văn patient/admin.
- Medical disclaimer.
- Error message style.
- CTA naming.
- Glossary.

### 5.2. Dependency policy

Đường dẫn đề xuất:

```text
docs/engineering/dependency-policy.md
```

Nội dung cần có:

- Khi nào được thêm package.
- Security/license check.
- Bundle impact.
- Alternatives.
- Deprecation/removal plan.

### 5.3. Code ownership matrix

Đường dẫn đề xuất:

```text
docs/team/code-ownership.md
```

Nội dung cần có:

- Owner theo route/feature.
- Reviewer rule.
- Escalation.
- Backup owner.

## 6. Thứ tự triển khai đề xuất

Nên tạo theo thứ tự:

1. `docs/release/release-checklist.md`
2. `docs/deployment/environment-guide.md`
3. `docs/quality/critical-flow-checklist.md`
4. `docs/incidents/README.md`
5. `docs/adr/*`
6. `docs/design-system/*`
7. `docs/backend/frontend-api-contract-map.md`
8. `docs/testing/test-authoring-guide.md`
9. `docs/performance/*`
10. `docs/onboarding/*`

## 7. Template đề xuất tạo doc mới

```md
# Document title

Ngày cập nhật: YYYY-MM-DD.

## Purpose

...

## Scope

...

## Rules

...

## Checklist

...

## Examples

...

## Verification

...

## Owner

...
```

## 8. Điều kiện docs được xem là đạt

- Đọc vào là làm được.
- Có checklist rõ.
- Có ví dụ đúng repo.
- Có owner hoặc nhóm chịu trách nhiệm.
- Có ngày cập nhật nếu là trạng thái.
- Không mâu thuẫn product/backend/architecture docs.
- Không chứa thông tin đã lỗi thời mà không ghi rõ.
