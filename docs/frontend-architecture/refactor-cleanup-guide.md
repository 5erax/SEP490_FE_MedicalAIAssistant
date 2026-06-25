# Refactor & cleanup guide

Ngày cập nhật: **2026-06-26**.

Tài liệu này quy định cách refactor và loại bỏ code/file dư thừa trong frontend MediMate AI. Mục tiêu là giảm rủi ro, không biến refactor thành rewrite không kiểm soát.

## 1. Khi nào được refactor

Refactor được phép khi có một trong các điều kiện:

- File quá lớn hoặc chứa nhiều responsibility.
- Logic bị duplicate ở nhiều page/component/service.
- Boundary sai: UI gọi API trực tiếp, service chứa UI logic, route chứa business rule.
- Test khó viết vì code coupling.
- Performance bị ảnh hưởng bởi import eager hoặc render dư.
- Accessibility/focus/data state phải chuẩn hóa.
- Cần refactor nhỏ để triển khai feature hoặc bug fix an toàn.

Không refactor chỉ vì “nhìn chưa đẹp” hoặc “muốn đổi style code” nếu không có tác động rõ.

## 2. Nguyên tắc bất biến

- Refactor thuần không đổi behavior.
- Nếu behavior đổi, PR phải ghi rõ là refactor + behavior change.
- Không refactor nhiều domain không liên quan trong một PR.
- Không đổi architecture và dependency cùng lúc.
- Không xóa compatibility layer khi chưa xác minh toàn repo không còn import.
- Không xóa test vì test fail sau refactor.
- Không tạo abstraction trước khi có pattern lặp lại thật.

## 3. Quy trình refactor chuẩn

```text
Inventory
  -> Baseline
  -> Define target boundary
  -> Move/Extract
  -> Replace imports
  -> Delete old code
  -> Test
  -> Update docs
```

### 3.1. Inventory

Ghi lại:

- File sẽ đổi.
- Component/service/helper liên quan.
- Route bị ảnh hưởng.
- API bị ảnh hưởng.
- Test hiện có.
- Known behavior cần giữ.

### 3.2. Baseline

Trước khi sửa:

- Chạy route/page liên quan.
- Chụp screenshot nếu UI quan trọng.
- Chạy test liên quan.
- Ghi lại error/loading/empty behavior hiện tại.
- Nếu chưa có test, thêm regression smoke nhỏ nếu có thể.

### 3.3. Define target boundary

Mỗi refactor phải chọn một boundary:

| Boundary | Mục tiêu |
| --- | --- |
| Route | Đưa route/access/navigation về registry |
| API | Đưa raw endpoint/fetch về service |
| UI | Tách component theo responsibility |
| Form | Tách form state/validation/submit |
| Data state | Chuẩn hóa loading/error/empty/retry |
| Style | Tách CSS string/inline style sang stylesheet/module/token |
| Utility | Tách logic thuần có test được |
| Feature | Gom capability theo domain |

Không refactor nhiều boundary nếu không cần.

## 4. Tách page lớn

Dấu hiệu page cần tách:

- Trên 300-400 dòng và tiếp tục tăng.
- Có nhiều form không liên quan.
- Có nhiều API domain trong cùng file.
- Có nhiều modal/table/filter/action.
- Có CSS string hoặc inline style dài.
- Có nhiều `useEffect` phụ thuộc chéo.
- Test chỉ có thể chạy E2E toàn trang.

Thứ tự tách:

1. Extract constants và pure helpers.
2. Extract mapper/normalizer.
3. Extract table/list section.
4. Extract form/modal section.
5. Extract data state primitive.
6. Extract service/API call.
7. Extract page shell.
8. Xóa code cũ.

Không tách bằng cách copy nguyên block rồi để cả bản cũ và bản mới cùng tồn tại.

## 5. Loại bỏ code dư thừa

### 5.1. Import/export

Kiểm tra:

```bash
npm run lint
npm run build
```

Sau đó tìm thủ công:

- Import không dùng.
- Export không còn consumer.
- Barrel export không còn cần.
- Re-export compatibility không còn import.

### 5.2. Component

Xóa component khi:

- Không được import ở đâu.
- Bị thay bằng primitive mới.
- Chỉ phục vụ route đã xóa.
- Chỉ là bản copy cũ.
- Không có product purpose.

Trước khi xóa, search theo tên component, tên file và class/test id liên quan.

### 5.3. Service/API

Xóa service hoặc function khi:

- Không còn import.
- Endpoint backend đã bỏ và không còn route dùng.
- Function chỉ wrap function khác mà không thêm giá trị.
- Compatibility facade đã hết consumer.

Không xóa endpoint nếu backend còn dùng cho feature đang phát triển mà docs/backlog đã ghi rõ.

### 5.4. CSS

Xóa CSS khi:

- Selector không còn xuất hiện trong JSX.
- Class bị rename và không còn dùng.
- Style thuộc component đã xóa.
- CSS global override gây ảnh hưởng ngoài phạm vi.

Không xóa design token nếu token còn dùng gián tiếp qua class chung.

### 5.5. Mock/demo data

Mock/demo data chỉ được giữ khi:

- Có label demo rõ.
- Không đi vào production flow.
- Có comment chỉ rõ lý do và ngày kiểm tra nếu tạm thời.
- Product definition cho phép capability thử nghiệm.

Phải xóa hoặc ẩn mock nếu backend API thật đã có và UI đang hiển thị như dữ liệu thật.

### 5.6. Test artifacts

Không commit:

- `playwright-report/`
- `test-results/`
- Video/screenshot failure
- Snapshot sai viewport
- Snapshot mới không liên quan thay đổi UI

Snapshot chỉ được update khi thay đổi UI có chủ đích.

## 6. Migration facade

Compatibility facade được phép khi cần migration import cũ.

Ví dụ:

```js
// src/services/api.js
export { authApi } from "./authService";
export { usersApi } from "./userService";
```

Quy tắc:

- Facade chỉ re-export hoặc adapter mỏng.
- Không thêm business logic mới vào facade.
- Mỗi facade phải có lý do tồn tại.
- Khi import cũ đã hết, xóa facade.
- Không tạo facade tổng cho toàn repo nếu làm dependency khó kiểm soát.

## 7. Checklist refactor PR

- [ ] Phạm vi refactor rõ.
- [ ] Behavior cần giữ đã được ghi.
- [ ] Route/API affected đã xác định.
- [ ] Không đổi capability ngoài phạm vi.
- [ ] Không thêm dependency nếu chưa cần.
- [ ] Không duplicate logic cũ/mới.
- [ ] Code cũ đã xóa.
- [ ] Import/export đã sạch.
- [ ] CSS/mock/test artifact đã sạch.
- [ ] Lint/build đạt.
- [ ] Test liên quan đạt.
- [ ] Docs cập nhật nếu cấu trúc/boundary đổi.

## 8. Checklist xóa file

Trước khi xóa file, trả lời:

- File này còn được import không?
- File này còn được route/test/config tham chiếu không?
- File này có side effect không?
- Có docs nào trỏ đến file này không?
- Có snapshot/test fixture phụ thuộc không?
- Có public asset path phụ thuộc không?
- File có đang là compatibility facade tạm thời không?
- Xóa file có cần migration note không?

Nếu không chắc, không xóa trong PR feature; tạo refactor/cleanup PR riêng.

## 9. Refactor route/navigation

Khi refactor route:

- Không phá URL cũ nếu route đã public; dùng alias/canonical.
- Route auth phải giữ return intent.
- Route role/admin phải refresh được.
- Navigation phải lấy từ route metadata.
- Static route/fallback không được xung đột `/api`.
- Route smoke phải pass.

## 10. Refactor API/service

Khi refactor API:

- Giữ request path giống cũ trừ khi backend contract đổi.
- Giữ auth behavior.
- Giữ error behavior hoặc cải thiện có test.
- Không đổi payload field tùy tiện.
- Mapper phải xử lý null/missing field an toàn.
- Không thêm retry ngầm cho mutation nguy hiểm.
- Payment/AI/medical data phải kiểm tra privacy.

## 11. Refactor UI

Khi refactor UI:

- Giữ layout chính ở các breakpoint.
- Giữ accessible name.
- Giữ keyboard behavior.
- Giữ focus management.
- Giữ visual baseline hoặc update snapshot có lý do.
- Không xóa text error/hint quan trọng.
- Không đổi product copy y tế nếu chưa review.

## 12. Refactor performance

Khi refactor performance:

- Lazy-load route nặng.
- Tránh import map/admin/chat vào landing nếu không cần.
- Memoize khi có bằng chứng render cost, không memo hóa mù.
- Không virtualize list nhỏ.
- Không debounce field bắt buộc nếu làm giảm accessibility.
- Chạy performance smoke nếu route quan trọng.

## 13. Dấu hiệu refactor sai

Request changes nếu thấy:

- PR đổi quá nhiều file không liên quan.
- Không có test hoặc manual verification.
- Code cũ và mới cùng tồn tại.
- Thêm abstraction không có consumer rõ.
- Tạo `utils`/`helpers` chung chứa logic domain cụ thể.
- Xóa error/loading/empty state.
- Xóa accessibility attribute mà không thay thế.
- Dùng mock data để pass UI.
- Docs không cập nhật dù boundary đổi.

## 14. Nhật ký cleanup trong PR

PR refactor/cleanup phải ghi:

```md
## Cleanup

- Removed:
- Kept intentionally:
- Compatibility facade:
- Follow-up:
```

Nếu còn nợ kỹ thuật, phải tạo follow-up cụ thể, không ghi “sẽ fix sau” chung chung.
