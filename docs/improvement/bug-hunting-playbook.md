# Bug hunting playbook

Ngày cập nhật: **2026-06-26**.

Tài liệu này dùng để chủ động tìm bug đang tồn tại trong frontend, kể cả khi chưa có user report.

## 1. Mục tiêu

Bug hunting phải tìm được:

- Lỗi crash.
- Lỗi route/redirect.
- Lỗi auth/role/premium.
- Lỗi API contract.
- Lỗi loading/error/empty state.
- Lỗi form validation.
- Lỗi responsive.
- Lỗi accessibility.
- Lỗi payment state.
- Lỗi map/location.
- Lỗi bảo mật/privacy.
- Lỗi performance.
- Lỗi mock/demo bị lộ như production.

## 2. Quy trình bug hunting

```text
Pick surface
  -> Define expected behavior
  -> Try normal path
  -> Try edge cases
  -> Try failure states
  -> Record evidence
  -> Classify severity
  -> Create fix task
```

## 3. Route checklist

Với mỗi route:

- [ ] Direct URL load được.
- [ ] Refresh không crash.
- [ ] Back/Forward hoạt động.
- [ ] Page title đúng.
- [ ] Auth route không redirect vòng.
- [ ] Protected route không leak dữ liệu.
- [ ] Unknown route hiển thị fallback đúng.
- [ ] Alias canonicalize đúng.
- [ ] `/api/*` không bị route React bắt nhầm.
- [ ] Không có uncaught page error.

## 4. Auth/role/premium checklist

- [ ] Chưa đăng nhập vào route auth-required bị redirect đúng.
- [ ] Đăng nhập xong quay lại đúng `returnTo`.
- [ ] Token hết hạn được clear.
- [ ] Role Patient không vào admin.
- [ ] Role Staff không vào admin nếu không được phép.
- [ ] Role Admin vào đúng admin workspace.
- [ ] Doctor Invitee/Doctor không bị ép qua Patient setup.
- [ ] Premium gate không che emergency/safety content.
- [ ] Logout clear auth state và navigation.
- [ ] Auth storage không chứa email/số điện thoại/địa chỉ/refresh token.

## 5. API/data checklist

Với mỗi API surface:

- [ ] Loading state hiển thị.
- [ ] Empty state hiển thị.
- [ ] Error state hiển thị message dễ hiểu.
- [ ] Retry hoạt động nếu phù hợp.
- [ ] 401/403 xử lý đúng.
- [ ] 404 xử lý đúng.
- [ ] 500/timeout không blank page.
- [ ] Mutation disabled khi đang submit.
- [ ] Mutation success refetch đúng data.
- [ ] Payload không chứa field dư.
- [ ] Không hard-code endpoint trong component.
- [ ] Không log dữ liệu nhạy cảm.

## 6. Form checklist

- [ ] Field có label thật.
- [ ] Error gắn đúng field.
- [ ] Submit không gửi khi invalid.
- [ ] Submit disabled/busy khi đang gửi.
- [ ] Double-click không tạo request lặp.
- [ ] Server error không làm mất toàn bộ input.
- [ ] Password field có autocomplete hợp lý.
- [ ] Numeric/date/phone field handle input sai.
- [ ] Vietnamese long text không làm vỡ layout.
- [ ] Focus đến field lỗi đầu tiên nếu validation fail.

## 7. UI responsive checklist

Test viewport:

- 320px
- 375px
- 390px
- 768px
- 1024px
- 1440px

Kiểm tra:

- [ ] Không có horizontal scroll ngoài ý muốn.
- [ ] Header/nav không che content.
- [ ] CTA chính vẫn thấy được.
- [ ] Table có mobile strategy.
- [ ] Dialog/drawer vừa viewport.
- [ ] Text dài wrap đúng.
- [ ] Touch target tối thiểu khoảng 44px.
- [ ] Footer không overlap.
- [ ] Map/list vẫn dùng được.
- [ ] Admin action không bị đẩy khỏi màn hình.

## 8. Accessibility checklist

- [ ] Dùng được bằng keyboard.
- [ ] Focus visible.
- [ ] Modal trap focus.
- [ ] Escape đóng modal nếu policy cho phép.
- [ ] Icon button có accessible name.
- [ ] Heading hierarchy hợp lý.
- [ ] Landmark `main` tồn tại.
- [ ] Form error được announce.
- [ ] Không chỉ dùng màu để báo trạng thái.
- [ ] Map/chart có text alternative.

## 9. Payment bug checklist

- [ ] Checkout dùng giá/backend plan, không tự suy luận.
- [ ] Return URL không tự coi là success.
- [ ] Cancel URL không polling sai nếu flow đã hủy.
- [ ] Pending state rõ.
- [ ] Failed/cancelled/expired state rõ.
- [ ] User không xem được payment/subscription của user khác.
- [ ] Không log order/payment sensitive data.
- [ ] Không gọi webhook từ frontend.

## 10. AI/symptom bug checklist

- [ ] Empty user input được validate.
- [ ] Suggest questions empty array có UI rõ.
- [ ] Submit answers thiếu field không gửi.
- [ ] Timeout/error có retry.
- [ ] Result không trình bày như chẩn đoán chắc chắn.
- [ ] Emergency/safety notice không bị ẩn.
- [ ] Handoff sang map không mất context.
- [ ] Không log triệu chứng/câu trả lời/kết quả AI.
- [ ] Không dùng hospital mock như recommendation production.

## 11. Map/facility bug checklist

- [ ] Map load state rõ.
- [ ] Map style/WebGL error có fallback.
- [ ] Facility thiếu tọa độ vẫn có list text.
- [ ] Marker chỉ render khi tọa độ hợp lệ.
- [ ] Search/filter không crash với null field.
- [ ] Denied geolocation có state rõ.
- [ ] Review create success/fail rõ.
- [ ] Long facility name/address không vỡ layout.
- [ ] Không dùng dữ liệu giả nếu API active có data.

## 12. Admin/operator bug checklist

- [ ] Table không vỡ mobile/tablet.
- [ ] Filter/search giữ sau refresh nếu yêu cầu.
- [ ] Pagination boundary đúng.
- [ ] Create/edit/delete có loading/error/success.
- [ ] Delete có confirm.
- [ ] 403 permission state rõ.
- [ ] Empty data không blank page.
- [ ] Form error từ backend hiển thị đúng.
- [ ] Admin route không public.

## 13. Severity classification

| Severity | Điều kiện |
| --- | --- |
| P0 | Crash luồng chính; login/payment/admin security hỏng; lộ PII/token/medical data |
| P1 | Luồng chính sai hoặc không hoàn thành được; không có workaround hợp lý |
| P2 | Có workaround nhưng gây khó chịu, giảm UX hoặc gây hiểu nhầm |
| P3 | Polish, copy, spacing, small consistency issue |

## 14. Bug report template

```md
# Bug report

## Summary

...

## Severity

P0/P1/P2/P3

## Environment

- Branch/commit:
- Browser:
- Viewport:
- User role:
- Backend environment:

## Route/surface

...

## Steps to reproduce

1.
2.
3.

## Expected result

...

## Actual result

...

## Evidence

- Screenshot/video:
- Console:
- Network:
- Test failure:

## Suspected area

- Route:
- API:
- State:
- UI:
- CSS:
- Auth:
- Payment:
- Backend contract:

## Regression guard

- [ ] Add/update Playwright test
- [ ] Add unit/component test
- [ ] Manual only, reason:
```

## 15. Bug hunting cadence đề xuất

- Hằng ngày: route đang phát triển.
- Trước PR: route/surface bị ảnh hưởng.
- Trước release: full critical route matrix.
- Mỗi tuần: auth/payment/map/admin sweep.
- Mỗi phase UI: visual + accessibility sweep.
