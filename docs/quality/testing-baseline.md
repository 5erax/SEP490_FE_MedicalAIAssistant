# Baseline kiểm thử frontend

Ngày cập nhật: **2026-06-26**.

Tài liệu này ghi baseline kiểm thử route, accessibility, visual và performance cho MediMate AI Frontend. Finding UI/UX được quản lý trong [UI/UX roadmap](../ui-ux/roadmap.md). Tiêu chuẩn production bắt buộc nằm tại [Frontend production standards](../frontend-architecture/production-frontend-standards.md).

## 1. Công cụ

Repo đang dùng Playwright cho:

- Route smoke.
- Accessibility smoke với axe-core.
- Performance smoke.
- Visual regression.
- Runtime page error guard.

Cấu hình chính:

- Test directory: `tests/e2e`.
- Base URL: `http://127.0.0.1:3000`.
- Web server: `npm run dev -- --host 127.0.0.1`.
- Browser project chính: Chromium Desktop Chrome.
- Trace/screenshot/video được giữ khi fail.

## 2. Script hiện có

| Lệnh | Mục đích |
| --- | --- |
| `npm run test:e2e` | Chạy toàn bộ Playwright suite |
| `npm run test:e2e:routes` | Route, alias, redirect và page error smoke |
| `npm run test:e2e:a11y` | Accessibility smoke |
| `npm run test:e2e:performance` | Performance smoke |
| `npm run test:e2e:visual` | Visual regression |
| `npm run test:e2e:visual:update` | Update snapshot sau khi thay đổi UI đã review |

## 3. Gate tối thiểu

Mọi PR frontend phải chạy:

```bash
npm run lint
npm run build
npm run test:e2e:routes
```

PR có thay đổi UI phải chạy thêm:

```bash
npm run test:e2e:a11y
```

PR có thay đổi visual/layout quan trọng phải chạy thêm:

```bash
npm run test:e2e:visual
```

PR có thay đổi landing, dashboard, map, admin shell, route loading hoặc dependency lớn phải chạy thêm:

```bash
npm run test:e2e:performance
```

PR có thay đổi route/access/payment/map/admin phải ưu tiên chạy:

```bash
npm run test:e2e
```

## 4. Phạm vi đã tự động hóa

- Route smoke cho app routes, aliases, redirects và static routes.
- Runtime guard: route smoke không được phát sinh uncaught page error.
- Accessibility smoke cho các surface đại diện.
- Visual baseline ở nhiều viewport.
- Performance smoke cho surface quan trọng.
- Một số interaction/regression test cho các luồng đặc thù.

## 5. Route smoke

Route smoke phải đảm bảo:

- Mỗi route render không crash.
- Alias redirect/canonicalize đúng.
- Route protected không leak page sai.
- Back/Forward hoặc reload không phá route chính.
- Known conflict phải được đánh dấu rõ bằng `test.fixme` kèm lý do.

Khi thêm route:

- Cập nhật route manifest/test nếu cần.
- Kiểm tra expected path.
- Kiểm tra route access.
- Kiểm tra title/navigation nếu route có shell.

## 6. Accessibility smoke

Accessibility smoke không thay thế review thủ công, nhưng là gate bắt buộc.

Bắt buộc kiểm tra thủ công khi UI đổi:

- Keyboard navigation.
- Focus visible.
- Dialog/drawer focus trap.
- Form label/error.
- Contrast.
- Heading/landmark.
- Screen-reader name cho icon button.
- Text alternative cho map hoặc chart.

Không merge nếu có critical violation không được giải thích và xử lý.

## 7. Visual regression

Quy tắc update snapshot:

1. Chạy route test trước.
2. Chạy accessibility test trước.
3. Xem từng visual diff.
4. Chỉ update khi thay đổi có chủ đích.
5. Commit snapshot cùng PR tạo thay đổi.
6. Ghi rõ lý do trong PR.

Không update snapshot để che bug layout.

## 8. Performance smoke

Budget baseline local:

| Metric | Budget |
| --- | --- |
| DOMContentLoaded | `< 5,000 ms` |
| Load | `< 8,000 ms` |
| Largest Contentful Paint | `< 5,000 ms` |
| Cumulative Layout Shift | `< 0.25` |

Budget hiện tại còn rộng để tránh flaky local test. Nếu production cần tối ưu, tạo task riêng với Lighthouse/RUM hoặc profile bundle.

## 9. Test data và privacy

Không được đưa vào test output:

- Token thật.
- Email/số điện thoại thật.
- Nội dung triệu chứng thật.
- Câu trả lời lâm sàng thật.
- Kết quả AI thật.
- Payment/order thật.
- Hồ sơ y tế thật.

Test phải dùng mock hoặc dữ liệu giả rõ ràng.

## 10. Khi test fail

Không được:

- Xóa test.
- Tăng timeout tùy tiện.
- Update snapshot ngay.
- Bỏ qua bằng `test.skip` không lý do.
- Chuyển lỗi thành known issue nếu chưa có phân tích.

Phải làm:

1. Đọc trace/screenshot/video.
2. Xác định lỗi code, test hay môi trường.
3. Fix nguyên nhân.
4. Nếu là known issue thật, dùng `test.fixme` kèm lý do cụ thể và link/ticket nếu có.
5. Cập nhật docs/backlog nếu baseline thay đổi.

## 11. Báo cáo HTML và artifacts

- `playwright-report/` không commit.
- `test-results/` không commit.
- Trace/video/screenshot failure không commit trừ khi được dùng tạm trong issue/PR và xóa trước merge.

## 12. Coverage cần bổ sung tiếp theo

Ưu tiên bổ sung test cho:

- Full symptom flow: suggest -> submit -> result.
- Empty clinical questions và AI timeout.
- Symptom history list/detail.
- Payment result success/pending/failed/cancelled.
- Subscription cancel.
- Map marker only when valid coordinates.
- Review create success/failure.
- Admin CRUD critical paths.
- Auth storage không chứa PII.
- API error message UTF-8 fallback.
- Route/access for Doctor Invitee và Staff Applicant.

## 13. Verification record

Khi cập nhật baseline, ghi trong PR:

```md
## Verification

- npm run lint: passed/failed
- npm run build: passed/failed
- npm run test:e2e:routes: passed/failed
- npm run test:e2e:a11y: passed/failed
- npm run test:e2e:performance: passed/failed/not run
- npm run test:e2e:visual: passed/failed/not run
```

Không ghi “tested locally” nếu không có lệnh cụ thể.
