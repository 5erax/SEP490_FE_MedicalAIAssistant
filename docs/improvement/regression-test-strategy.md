# Regression test strategy

Ngày cập nhật: **2026-06-26**.

Tài liệu này hướng dẫn chọn test để đảm bảo sửa bug/nâng cấp không làm hỏng tính năng khác.

## 1. Nguyên tắc

- Regression guard phải bám vào hành vi người dùng.
- Không test implementation chi tiết nếu không cần.
- Bug P0/P1 nên có test tái hiện.
- Visual snapshot chỉ update khi thay đổi có chủ đích.
- Không dùng test để hợp thức hóa behavior sai.

## 2. Test layers

| Layer | Dùng khi | Công cụ hiện tại/đề xuất |
| --- | --- | --- |
| Route smoke | Route/access/redirect | Playwright |
| Interaction E2E | Critical flow | Playwright |
| Accessibility smoke | UI surface | Playwright + axe |
| Visual regression | Layout/visual | Playwright screenshot |
| Performance smoke | Route nặng | Playwright |
| Unit test | Mapper/utility/schema | Đề xuất Vitest khi thêm |
| Component test | Form/component behavior | Đề xuất Testing Library khi thêm |
| API mock test | Error/loading states | Playwright route mock hoặc MSW khi thêm |

## 3. Test selection matrix

| Change type | Required |
| --- | --- |
| Route add/change | Route smoke |
| Access/role change | Role/access E2E |
| Auth flow | Auth E2E + storage check |
| API service | Payload/error tests |
| Form | Interaction + validation |
| Payment | Status-state E2E |
| Map | Map/list/fallback E2E |
| Admin CRUD | CRUD path + error state |
| UI layout | A11Y + visual |
| Performance | Performance smoke |
| Security/privacy | Storage/log/route test |

## 4. Critical flows cần bảo vệ

- Public landing không crash.
- Login/logout.
- Signup.
- Forgot/change password.
- Patient dashboard/intake.
- Symptom analysis.
- Map facility search.
- Profile view/update.
- Pricing/checkout.
- Payment return/cancel.
- Staff/Doctor workspace access.
- Admin users.
- Admin doctors.
- Admin facilities.
- Admin AI configs.
- Admin subscriptions.

## 5. Regression test template

```md
# Regression test plan

## Bug/improvement

...

## Risk

...

## Test added/updated

- File:
- Scenario:
- Assertion:

## Manual verification

- Browser:
- Viewport:
- Role:
- Result:
```

## 6. Route smoke standard

Route smoke must assert:

- Path becomes expected path.
- No uncaught page error.
- Protected routes redirect or render permission state correctly.
- Known conflicts are documented.

## 7. Accessibility regression standard

A11Y tests must not be the only review. Manual checks:

- Keyboard tab order.
- Focus visible.
- Screen reader names for icon buttons.
- Dialog focus trap.
- Error message announcement.
- 200% zoom.
- Reduced motion.

## 8. Visual regression standard

Visual tests should cover:

- 320/375 mobile.
- 768 tablet.
- 1024 small desktop.
- 1440 desktop.
- Default state.
- Loading/empty/error if surface is critical.
- Dialog/drawer if changed.

## 9. Error-state regression

Every critical API surface should have at least one test or manual script for:

- 401/403.
- 404.
- 500.
- Timeout/network fail.
- Empty list.
- Invalid payload.

## 10. Payment regression

Payment tests should cover:

- Return success after backend confirms.
- Pending.
- Failed.
- Cancelled.
- Cancel does not poll or show success incorrectly.
- Missing/invalid orderCode.

## 11. Map regression

Map tests should cover:

- Facility with valid coordinates.
- Facility missing coordinates.
- No active facilities.
- Geolocation denied.
- Search no result.
- Review submit fail.

## 12. Test debt register

Nếu chưa thể viết test, ghi:

```md
| Debt ID | Missing test | Risk | Reason not automated | Owner | Target |
| --- | --- | --- | --- | --- | --- |
| TD-TEST-001 | Payment pending state | P0 | Backend mock not stable | FE | Sprint X |
```

## 13. Không được làm

- `test.skip` không lý do.
- `test.fixme` không ghi known issue.
- Tăng timeout để che race condition.
- Update screenshot khi layout thực sự lỗi.
- Assert text quá mơ hồ khiến bug lọt.
- Dùng dữ liệu thật trong test.
