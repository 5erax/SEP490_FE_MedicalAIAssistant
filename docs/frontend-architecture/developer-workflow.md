# Developer workflow cho frontend coder

Ngày cập nhật: **2026-06-26**.

Tài liệu này mô tả coder frontend phải làm gì ở từng giai đoạn: khởi tạo dự án, nhận task, phát triển feature, sửa bug, refactor, cleanup và chuẩn bị PR.

## 1. Quy trình tổng quát

Mọi task frontend đi theo chuỗi:

```text
Read scope
  -> Inspect current code
  -> Define acceptance criteria
  -> Implement small vertical slice
  -> Test
  -> Cleanup
  -> Update docs
  -> PR
```

Không được nhảy thẳng vào code nếu chưa xác định route, actor, API và tiêu chí nghiệm thu.

## 2. Giai đoạn khởi tạo dự án hoặc onboarding coder mới

### 2.1. Cài môi trường

```bash
git clone https://github.com/5erax/SEP490_FE_MedicalAIAssistant.git
cd SEP490_FE_MedicalAIAssistant
npm install
cp .env.example .env.local
npm run dev
```

Trên PowerShell:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

### 2.2. Kiểm tra máy local

Coder phải chạy được:

```bash
npm run lint
npm run build
npm run test:e2e:routes
```

Nếu không chạy được, không nhận task feature cho đến khi fix local environment.

### 2.3. Đọc tài liệu bắt buộc

Theo thứ tự:

1. `README.md`
2. `docs/README.md`
3. `docs/product-definition/README.md`
4. `docs/frontend-architecture/production-frontend-standards.md`
5. `docs/frontend-architecture/README.md`
6. `docs/frontend-architecture/api-layer.md`
7. `docs/quality/testing-baseline.md`
8. Tài liệu UI/UX liên quan nếu task có giao diện.

### 2.4. Hiểu cấu trúc code hiện tại

Coder phải biết vị trí các nhóm sau:

| Nhóm | Vị trí | Mục đích |
| --- | --- | --- |
| Route registry | `src/router/routes.js` | Khai báo route, alias, title, access, navigation |
| Access guard | `src/router/access.js` | Resolve auth/role/premium/profile guard |
| App composition | `src/App.jsx` | Resolve route và render page/shell |
| API endpoint | `src/services/endpoints.js` | Nguồn chuẩn cho backend path |
| API client | `src/services/apiClient.js` | Request, auth header, error handling |
| Domain services | `src/services/*Service.js` | API theo nghiệp vụ |
| Page | `src/pages/*` | Route-level UI hiện tại |
| Workspace shell | `src/components/workspace/*` | Layout và navigation workspace |
| Test | `tests/e2e/*` | Route/a11y/performance/visual regression |

## 3. Nhận task mới

Trước khi code, coder phải trả lời được:

- Task thuộc actor nào?
- Task ảnh hưởng route nào?
- Có cần auth/role/premium không?
- API nào đang có?
- API nào thiếu?
- Có state loading/error/empty/success không?
- Có dữ liệu y tế/PII/payment không?
- UI có responsive/accessibility requirement không?
- Test nào phải chạy?
- Docs nào phải cập nhật?

Nếu không trả lời được, phải kiểm tra code và docs trước; không đoán.

## 4. Tạo branch

```bash
git checkout main
git pull origin main
git checkout -b <type>/<short-task-name>
```

Ví dụ:

```bash
git checkout -b feature/symptom-history
git checkout -b fix/payment-cancel-state
git checkout -b refactor/admin-facility-form
git checkout -b docs/frontend-production-standards
```

Branch name dùng lowercase, kebab-case.

## 5. Phát triển feature mới

### 5.1. Thứ tự làm việc

1. Xác định product scope.
2. Kiểm tra backend contract trong `docs/backend` và Swagger nếu cần.
3. Thêm endpoint vào `src/services/endpoints.js`.
4. Thêm/cập nhật domain service.
5. Thêm mapper/normalizer nếu response không ổn định.
6. Thêm route metadata nếu có route mới.
7. Implement page/component.
8. Thêm loading/error/empty/success/permission state.
9. Thêm test.
10. Cập nhật docs.

### 5.2. Quy tắc vertical slice

Một PR feature nên đi theo lát cắt nhỏ:

```text
API endpoint/service
  -> route/page/component
  -> data state
  -> test
  -> docs
```

Không tách PR kiểu “chỉ tạo UI trước, service sau” nếu UI đó sẽ bị hiểu là production capability trong navigation.

### 5.3. Checklist feature

- [ ] Route/access đúng.
- [ ] Service dùng `ENDPOINTS` và `apiRequest`.
- [ ] Component không hard-code endpoint.
- [ ] UI có loading.
- [ ] UI có empty state.
- [ ] UI có error state và retry nếu phù hợp.
- [ ] Submit chống double-click.
- [ ] Success không tự suy diễn khi backend chưa xác nhận.
- [ ] Sensitive data không log/localStorage.
- [ ] Test route/API state chính.
- [ ] Docs cập nhật.

## 6. Sửa bug

### 6.1. Quy trình

1. Tái hiện bug.
2. Xác định bug thuộc route, API, state, UI, CSS, config hay backend contract.
3. Viết regression test nếu bug có thể tái hiện bằng Playwright.
4. Fix nhỏ nhất có thể.
5. Chạy test liên quan.
6. Ghi rõ nguyên nhân trong PR.

### 6.2. Không được làm khi sửa bug

- Không refactor lớn nếu bug chỉ cần fix nhỏ.
- Không đổi API contract để né lỗi UI.
- Không che lỗi bằng `catch {}` rỗng.
- Không thêm fallback fake data vào production.
- Không xóa test fail nếu chưa chứng minh test sai.

## 7. Refactor

Refactor chỉ được bắt đầu khi có một trong các lý do:

- File quá lớn, nhiều responsibility.
- Logic bị duplicate ở nhiều route/page.
- Service/API sai boundary.
- UI state thiếu pattern chung.
- Test khó viết vì code coupling.
- Có task feature cần refactor nhỏ để triển khai an toàn.

### 7.1. Quy tắc refactor an toàn

- Không đổi behavior nếu mục tiêu là refactor thuần.
- Có test hoặc manual verification rõ.
- Mỗi PR refactor chỉ xử lý một boundary.
- Không đổi tên nhiều file nếu không cần.
- Giữ compatibility facade tạm thời nếu nhiều import cũ.
- Xóa facade khi migration hoàn tất.

### 7.2. Thứ tự refactor page lớn

1. Chụp baseline behavior bằng test/manual notes.
2. Tách pure helper/mapper trước.
3. Tách UI primitive lặp lại.
4. Tách form section.
5. Tách data fetching/service boundary.
6. Tách route/page shell cuối cùng.
7. Xóa code cũ và import cũ.
8. Chạy full route/accessibility nếu page quan trọng.

## 8. Cleanup code và file dư thừa

Cleanup không phải bước phụ. Mọi PR phải kiểm tra:

- Import không dùng.
- Component không còn render.
- Service compatibility không còn import.
- CSS selector không còn DOM.
- Mock data không còn production path.
- Test snapshot cũ không còn route.
- File docs cũ bị thay thế.
- Env/config cũ không còn đọc.
- Comment/TODO không còn giá trị.

Chi tiết xem [Refactor & cleanup guide](./refactor-cleanup-guide.md).

## 9. Thêm route mới

Bắt buộc:

1. Thêm vào `src/router/routes.js`.
2. Đặt `id` theo namespace: `public.*`, `auth.*`, `patient.*`, `workspace.*`, `admin.*`.
3. Đặt `title`.
4. Đặt `access`.
5. Nếu có navigation, thêm `navigation`.
6. Nếu route thay route cũ, thêm alias/canonical.
7. Thêm route smoke test/manifest nếu cần.
8. Cập nhật docs nếu capability mới.

Không được tạo page và tự đọc `window.location.pathname` để route riêng.

## 10. Thêm API mới

Bắt buộc:

1. Thêm constant vào `src/services/endpoints.js`.
2. Tạo/cập nhật service domain.
3. Dùng `apiRequest`.
4. Ghi rõ `{ auth: true }` nếu cần token.
5. Normalize error nếu backend có envelope riêng.
6. Không gọi service từ UI primitive thuần.
7. Test payload/error chính.
8. Cập nhật [API layer](./api-layer.md) nếu thêm domain mới.

## 11. Thay đổi UI

Bắt buộc kiểm tra:

- Viewport 320, 375, 768, 1024, 1440.
- Keyboard flow.
- Focus state.
- Loading/error/empty/success.
- Contrast và text overflow.
- Long Vietnamese text.
- No horizontal scroll ngoài ý muốn.
- Dialog/drawer focus trap nếu có.
- Visual snapshot nếu surface đã có baseline.

## 12. Thay đổi payment

Bắt buộc:

- Không tin URL callback là kết quả cuối.
- Gọi API status/backend state.
- Có state pending, success, failed, cancelled, expired nếu backend hỗ trợ.
- Không gọi webhook từ frontend.
- Không log order/payment sensitive detail.
- Test cancel không polling sai.
- Test success/pending/fail khi có flow tương ứng.

## 13. Thay đổi AI/symptom flow

Bắt buộc:

- Không trình bày kết quả như chẩn đoán chắc chắn.
- Không log nội dung triệu chứng hoặc câu trả lời lâm sàng.
- Có timeout/error state.
- Có empty question state.
- Handoff sang map phải ghi rõ là gợi ý định hướng.
- Không đặt cảnh báo khẩn cấp sau paywall.
- Test full flow hoặc ít nhất route/state chính.

## 14. Thay đổi map/facility

Bắt buộc:

- Facility thiếu tọa độ vẫn có fallback text/list.
- Marker chỉ render khi latitude/longitude hợp lệ.
- Map load/error state rõ.
- Search/filter không phụ thuộc mock data nếu backend có active facilities.
- Review form chống double-submit.
- Có accessibility alternative cho thông tin bản đồ.
- Kiểm soát bundle/lazy-load.

## 15. PR description template

```md
## Summary

- ...

## Scope

- Route/surface:
- Actor:
- API/service:
- Risk:

## Verification

- [ ] npm run lint
- [ ] npm run build
- [ ] npm run test:e2e:routes
- [ ] npm run test:e2e:a11y
- [ ] npm run test:e2e:performance
- [ ] npm run test:e2e:visual

## Docs impact

- [ ] Updated docs
- [ ] Docs impact: none, reason: ...

## Screenshots / videos

...
```

## 16. Merge rule

Không merge nếu:

- Build fail.
- Route smoke fail.
- Critical accessibility issue tồn tại.
- PR có raw API call trong component.
- PR làm lộ PII/token/medical content.
- Payment success không xác minh backend.
- Feature mới không có product/API scope.
- Docs bắt buộc không cập nhật.
