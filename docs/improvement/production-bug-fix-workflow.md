# Production bug fix workflow

Ngày cập nhật: **2026-06-26**.

Tài liệu này dùng khi có bug đã được phát hiện ở local, staging hoặc production.

## 1. Mục tiêu

Sửa bug phải đạt 4 mục tiêu:

1. Khôi phục hành vi đúng.
2. Không tạo regression.
3. Xác định nguyên nhân gốc.
4. Để lại test/docs giúp lỗi không lặp lại.

## 2. Quy trình chuẩn

```text
Triage
  -> Reproduce
  -> Isolate
  -> Root cause
  -> Fix minimal
  -> Regression test
  -> Verify
  -> Document
```

## 3. Triage

Ghi ngay:

- Bug xảy ra ở route nào.
- Actor/role nào bị ảnh hưởng.
- Có liên quan y tế/payment/PII/security không.
- Có workaround không.
- Có cần rollback/hotfix không.
- Severity P0/P1/P2/P3.

P0 phải ưu tiên hơn mọi polish/refactor.

## 4. Reproduce

Bug chưa reproduce được thì chưa nên sửa theo cảm tính.

Cần ít nhất một loại evidence:

- Steps cụ thể.
- Video/screenshot.
- Console error.
- Network request/response.
- Failed test.
- Production log không chứa PII.
- User report đủ rõ.

## 5. Isolate

Phân loại bug:

| Loại | Dấu hiệu | Nơi kiểm tra |
| --- | --- | --- |
| Route | URL sai, redirect vòng, refresh lỗi | `src/router`, `src/App.jsx` |
| Access | Role/premium/profile sai | `src/router/access.js`, auth storage |
| API | Request sai path/payload/auth | `src/services/endpoints.js`, service |
| State | Loading/error/empty sai | Page/container state |
| Form | Validation/submit lỗi | Form component/page |
| UI/CSS | Vỡ layout, hidden content | CSS/component |
| A11Y | Keyboard/focus/name sai | component/dialog/form |
| Payment | Return/cancel/status sai | payment page/service |
| Map | WebGL/style/coordinate/search lỗi | map page/service |
| Backend contract | API trả khác docs | Swagger/backend response |

## 6. Root cause

Root cause tốt có dạng:

```md
Root cause:
PaymentResultPage treated `/payment/return` query params as success before verifying `payos-status`, so users saw success state when backend still returned pending.
```

Root cause không tốt:

```md
Bug do frontend.
```

## 7. Fix minimal

Hotfix/bugfix phải nhỏ:

- Không refactor toàn page.
- Không đổi dependency.
- Không rewrite UI.
- Không thêm mock để che lỗi.
- Không đổi contract backend nếu backend không sai.
- Không sửa file ngoài phạm vi nếu không cần.

Nếu cần refactor lớn để fix, tách làm hai PR:

1. Regression test + minimal fix.
2. Refactor cleanup sau.

## 8. Regression guard

Mỗi bug nên có test chống tái diễn.

| Bug type | Regression guard |
| --- | --- |
| Route redirect | `tests/e2e/routes.spec.js` hoặc navigation test |
| Auth/role | role/access E2E |
| API payload | E2E route intercept assert request |
| Error state | mock failed response and assert UI |
| Form validation | interaction test |
| Payment | mock status states |
| Map | mock facilities with/without coordinates |
| Layout | visual regression |
| Accessibility | a11y + keyboard smoke |

Nếu không thể tự động hóa, PR phải ghi lý do và manual verification.

## 9. Verification checklist

- [ ] Bug reproduction fail trước fix.
- [ ] Bug reproduction pass sau fix.
- [ ] `npm run lint`.
- [ ] `npm run build`.
- [ ] Test liên quan.
- [ ] Route smoke nếu route/access đổi.
- [ ] A11Y/visual nếu UI đổi.
- [ ] Performance nếu route nặng đổi.
- [ ] Docs/backlog cập nhật nếu có behavior mới.

## 10. Hotfix rule

Hotfix chỉ dùng khi:

- P0/P1 production.
- Không thể chờ release thường.
- Scope cực nhỏ.
- Có rollback plan.

Hotfix không được dùng để merge redesign/refactor.

## 11. Rollback rule

Rollback nên chọn khi:

- Root cause chưa rõ.
- Fix có rủi ro lớn hơn lỗi.
- PR gần nhất gây lỗi rõ.
- User impact nghiêm trọng.

Rollback vẫn phải tạo follow-up root cause.

## 12. Bug fix PR template

```md
## Bug

- Severity:
- Route:
- Actor:
- First seen:
- Reproduction:

## Root cause

...

## Fix

...

## Regression guard

- [ ] Added/updated test:
- [ ] Manual only, reason:

## Verification

- [ ] npm run lint
- [ ] npm run build
- [ ] npm run test:e2e:routes
- [ ] Other:

## Risk

- Product:
- API:
- Security/privacy:
- Accessibility:
- Performance:

## Follow-up

...
```

## 13. Incident note template

Dùng cho P0/P1 production:

```md
# Incident note

## Summary

...

## Timeline

- Detected:
- Triage:
- Fix:
- Released:

## Impact

- Users affected:
- Routes:
- Data/security impact:

## Root cause

...

## Resolution

...

## Prevention

- Test:
- Doc:
- Monitoring:
- Process:
```
