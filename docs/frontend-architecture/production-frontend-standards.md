# Frontend production standards

Ngày cập nhật: **2026-06-26**.

Tài liệu này là bộ tiêu chí bắt buộc cho mọi PR frontend của MediMate AI. Reviewer dùng tài liệu này để approve hoặc request changes. Không xem đây là checklist tham khảo.

## 1. Mức độ bắt buộc

| Mức | Ý nghĩa | Cách xử lý |
| --- | --- | --- |
| `P0 - Blocker` | Có nguy cơ phá sản phẩm, bảo mật, dữ liệu y tế, route chính hoặc deployment | Không merge |
| `P1 - Required` | Ảnh hưởng maintainability, testability, accessibility hoặc production readiness | Không merge nếu chưa có lý do trì hoãn |
| `P2 - Improvement` | Tối ưu hoặc làm sạch nên thực hiện | Có thể tạo follow-up ticket |
| `P3 - Nice to have` | Cải thiện không cấp thiết | Không chặn merge |

## 2. Gate bắt buộc trước khi bắt đầu code

Mỗi task phải có:

- Mục tiêu rõ ràng.
- Actor liên quan: Public, Patient, Staff, Admin, Doctor Invitee, Staff Applicant.
- Route hoặc surface bị ảnh hưởng.
- API/backend contract liên quan.
- Quyền truy cập và entitlement liên quan.
- Tiêu chí nghiệm thu.
- Rủi ro y tế, bảo mật, PII hoặc payment nếu có.
- Test cần chạy.

Không bắt đầu code nếu task chỉ ghi chung chung như “fix UI”, “refactor page”, “improve code” mà không có phạm vi.

## 3. Product scope

### Bắt buộc

- Capability mới phải có actor, dữ liệu nguồn, API contract, quyền truy cập và tiêu chí nghiệm thu.
- Tính năng AI chỉ được trình bày là hỗ trợ định hướng, không phải chẩn đoán.
- Cảnh báo khẩn cấp không được đặt sau paywall.
- Tính năng mock/demo phải gắn nhãn rõ hoặc ẩn khỏi production navigation.
- Payment success chỉ được hiển thị khi frontend xác minh bằng API status/backend state.

### Không được phép

- Tự thêm nghiệp vụ không có trong product definition.
- Dùng dữ liệu mẫu như production data.
- Suy luận quyền Premium chỉ từ URL callback hoặc state client không xác minh.
- Viết copy khiến người dùng hiểu AI là bác sĩ hoặc kết luận y khoa chắc chắn.

## 4. Repository hygiene

### Bắt buộc

- Không commit `dist/`, `node_modules/`, `playwright-report/`, `test-results/`.
- Không commit `.env.local`, token, secret, credential hoặc real user data.
- Không để file `old`, `backup`, `copy`, `final`, `test2`, `temp`.
- Không để import/comment/TODO mơ hồ sau khi task hoàn tất.
- Xóa code/file dư thừa trong cùng PR nếu phát sinh từ thay đổi đó.
- File mới phải có lý do tồn tại rõ ràng.

### Tiêu chí file

| Loại file | Tiêu chí |
| --- | --- |
| Page | Compose route, shell, feature; không chứa raw endpoint |
| Component | Một trách nhiệm UI rõ, props dễ hiểu, không tự gọi backend nếu không phải container có chủ đích |
| Service | Chỉ xử lý request, endpoint, payload, response boundary |
| Utility | Hàm thuần, không phụ thuộc DOM/React nếu không cần |
| CSS | Token/semantic class rõ, không override global tùy tiện |
| Test | Assert hành vi, không assert implementation chi tiết không cần thiết |
| Doc | Đúng code hiện tại, có ngày nếu là trạng thái |

## 5. Routing và navigation

### Bắt buộc

- Route mới khai báo trong `src/router/routes.js`.
- Access control đi qua route metadata và `src/router/access.js`.
- Page title đi qua route metadata.
- Alias phải có canonical path.
- Admin section mới cập nhật `ADMIN_SECTIONS`, title và navigation.
- Deep-link admin phải refresh được.
- Back/Forward không làm mất section state quan trọng.
- Route mới phải có route smoke coverage.

### Không được phép

- Hard-code navigation string rải rác khi route registry đã có.
- Điều hướng nội bộ bằng full reload nếu helper có thể xử lý.
- Đặt guard role/premium sâu trong component con khiến route vẫn render sai shell.
- Tạo route public đến dữ liệu nhạy cảm.

## 6. API layer

### Bắt buộc

- Mọi endpoint backend nằm trong `src/services/endpoints.js`.
- Mọi request backend dùng `apiRequest()` hoặc service wrapper đã chuẩn hóa.
- Service domain đặt tên theo nghiệp vụ.
- Request có auth phải truyền `{ auth: true }`.
- Payload submit phải chỉ chứa field backend cần.
- Response phải được normalize/validate tại boundary nếu UI cần model ổn định.
- Error từ backend phải hiển thị được bằng ngôn ngữ rõ ràng.
- Không gọi AI provider hoặc payment provider trực tiếp từ client nếu backend là gateway.

### Không được phép

- `fetch("/api/...")` trực tiếp trong page/component.
- Hard-code backend host trong component/service.
- Service tự toast, redirect hoặc thao tác DOM.
- Gọi PayOS webhook/return/cancel như API sản phẩm.
- Lưu refresh token, email, tên, số điện thoại, địa chỉ hoặc nội dung y tế vào auth storage.
- Log payload triệu chứng/câu trả lời lâm sàng/kết quả AI.

## 7. State management

### Bắt buộc

- Phân biệt URL state, server state, form state, UI state.
- State chỉ đặt ở scope nhỏ nhất có thể.
- Loading/error/empty/success phải rõ ràng với người dùng.
- Mutation xong phải refetch/invalidate dữ liệu liên quan.
- Form submit phải chống double-submit.
- Dialog/drawer phải restore focus và hỗ trợ Escape.

### Không được phép

- Đẩy mọi state vào global context.
- Copy server response vào nhiều nơi rồi tự đồng bộ thủ công.
- Lưu state nhạy cảm lâu hơn nhu cầu sử dụng.
- Giấu lỗi backend bằng fallback success.

## 8. UI/UX

### Bắt buộc

- Mobile-first và responsive ở 320, 375, 768, 1024, 1440 px.
- Mỗi flow chính có loading, empty, error, success, permission/unauthorized.
- Tác vụ nguy hiểm có confirm rõ.
- Nút/link có accessible name.
- Form field có label, hint/error liên kết đúng.
- Keyboard có thể đi qua task chính.
- Focus visible không bị xóa.
- Dialog/drawer trap focus và restore focus.
- UI không phụ thuộc màu duy nhất để truyền đạt trạng thái.
- Copy y tế phải khiêm tốn, không chẩn đoán tuyệt đối.

### Không được phép

- Text quá nhỏ, contrast thấp, layout tràn ngang ở mobile.
- Skeleton/loading vô hạn không có timeout/error state.
- Toast là cách duy nhất để báo lỗi quan trọng.
- Click target quá nhỏ cho hành động chính.
- Animation gây cản trở hoặc không tôn trọng reduced motion ở surface quan trọng.

## 9. Accessibility

### Bắt buộc

- Chạy `npm run test:e2e:a11y` cho thay đổi UI.
- Không có axe critical violation ở surface được test.
- Heading hierarchy không bỏ cấp vô lý trên page chính.
- Landmark chính rõ: `main`, navigation nếu có.
- Form error được thông báo bằng text, không chỉ màu.
- Modal/drawer có role/label/focus management.
- Map phải có text alternative/list fallback cho thông tin quan trọng.

### Không được phép

- `div` click thay button khi có hành động tương tác.
- Icon-only button không có label.
- Disable focus outline không thay thế.
- Ẩn nội dung quan trọng khỏi screen reader chỉ để “sạch DOM”.

## 10. Performance

### Bắt buộc

- Page nặng phải lazy-load nếu không thuộc initial route.
- Map, admin, AI/chat và thư viện lớn phải được kiểm soát bundle.
- Không import eager dữ liệu/mock lớn vào route phổ biến.
- Không render list lớn không cần thiết.
- Không tạo effect polling vô hạn nếu không có cleanup/backoff.
- Không tạo state update loop.
- Performance smoke phải chạy khi thay đổi landing, dashboard, map, payment hoặc admin shell.

### Budget baseline hiện tại

| Metric | Budget local smoke |
| --- | --- |
| DOMContentLoaded | `< 5,000 ms` |
| Load | `< 8,000 ms` |
| LCP | `< 5,000 ms` |
| CLS | `< 0.25` |

Budget này là baseline local, không thay thế RUM hoặc Lighthouse production.

## 11. Security và privacy

### Bắt buộc

- Không đưa secret vào Vite/client.
- Không log token, PII, triệu chứng, câu trả lời lâm sàng, kết quả AI.
- Auth storage chỉ lưu whitelist kỹ thuật.
- File upload phải validate loại/kích thước trước khi hiển thị.
- URL/HTML từ backend không được đưa thẳng vào DOM nếu chưa sanitize/validate.
- Payment result phải xác minh ownership/status qua backend.
- Không expose admin/staff data ở public route.

### Không được phép

- Dùng `dangerouslySetInnerHTML` cho content không tin cậy.
- Lưu refresh token hoặc PII vào localStorage.
- Dùng query param làm nguồn sự thật cho quyền lợi, role hoặc payment success.
- Thêm analytics với dữ liệu y tế khi chưa có policy.

## 12. Testing gate

### Gate tối thiểu cho mọi PR frontend

```bash
npm run lint
npm run build
npm run test:e2e:routes
```

### Khi có thay đổi UI

```bash
npm run test:e2e:a11y
npm run test:e2e:visual
```

### Khi có thay đổi route/access/payment/map/admin

```bash
npm run test:e2e
```

### Khi thay đổi visual snapshot

- Chạy route và accessibility trước.
- Xem diff từng viewport.
- Chỉ update snapshot nếu thay đổi có chủ đích.
- Commit snapshot cùng PR tạo thay đổi UI.
- Ghi rõ lý do update snapshot trong PR.

## 13. Documentation gate

PR phải cập nhật docs khi thay đổi:

- Route, alias, navigation hoặc access rule.
- Endpoint, payload, response, auth behavior hoặc error mapping.
- Env var, Vite proxy, Vercel rewrite hoặc deployment.
- UI pattern/foundation.
- Test baseline hoặc script.
- Product capability hoặc trạng thái demo/production.
- Refactor làm đổi cấu trúc thư mục.

Nếu không cập nhật docs, PR description phải ghi: “Docs impact: none” kèm lý do.

## 14. PR review checklist

Reviewer kiểm tra:

- Scope có đúng issue/task không.
- Code mới có làm route/API/state phức tạp hơn không.
- Endpoint/service có đúng contract không.
- UI có đủ data states không.
- Accessibility có bị phá không.
- Test có đúng mức không.
- Docs có được cập nhật không.
- Có code chết/file dư/dependency thừa không.
- Có rủi ro PII/y tế/payment không.

Nếu một tiêu chí P0/P1 không đạt, reviewer phải request changes.
