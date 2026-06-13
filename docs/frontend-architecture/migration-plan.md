# Kế hoạch migration frontend

Mục tiêu là cải tổ từng vertical slice mà không dừng phát triển tính năng.

## Phase 0 - Ổn định nền tảng

- Chuyển React/React DOM từ canary sang bản stable tương thích sau khi xác minh
  `ViewTransition` đang dùng.
- Thêm TypeScript config ở chế độ cho phép JS.
- Thêm Vitest, Testing Library và MSW.
- Tạo test cho role normalization, API error và route guard hiện tại.
- Chuẩn hóa `shared/api` trước khi di chuyển feature.

Không đổi giao diện trong phase này.

## Phase 1 - Router và provider

- Thêm React Router.
- Tạo route tree, nested layout và metadata.
- Chuyển auth/profile/role/capability guard ra khỏi `App.jsx`.
- Lazy-load Admin, map, chat và các route ít dùng.
- Giữ alias URL cũ và route compatibility test.
- Chuyển `FeedbackProvider`, Query provider và preference provider vào
  `AppProviders`.

Kết thúc phase khi custom `if` router và link interceptor không còn cần thiết.

## Phase 2 - Server state

- Thêm TanStack Query.
- Chuyển lần lượt facilities, subscription và current user.
- Sau đó chuyển symptom analysis, reviews và admin CRUD.
- Giữ API function hiện có nhưng đặt gần feature.
- Xóa loading/error/refetch state thủ công sau khi query tương ứng ổn định.

Không chuyển mọi service trong một PR.

## Phase 3 - Form và validation

- Thêm React Hook Form, Zod và resolver.
- Migration theo thứ tự: login -> profile -> staff application -> doctor
  invitation -> admin CRUD.
- Schema form nằm trong feature.
- Mapper tạo request backend, không gửi trực tiếp toàn bộ form state.
- Validation backend vẫn là nguồn cuối cùng; frontend chỉ cải thiện UX.

## Phase 4 - CSS và design system

- Tạo cascade layer và semantic token chuẩn.
- Chuyển Button, Field, Alert, Card, Dialog, Table và DataState sang CSS Modules.
- Xóa `<style>` trong từng page theo vertical slice.
- Chuyển dynamic style sang CSS custom property.
- Thêm component test và visual snapshot cho primitive.
- Chỉ thêm Storybook sau khi primitive API ổn định.

## Phase 5 - Tách feature lớn

Ưu tiên:

1. `AdminWorkspacePage.jsx`
2. `DoctorRegisterInvitationPage.jsx`
3. `PricingPage.jsx`
4. `NearbyClinicPage.jsx`
5. `AuthPages.jsx`

Admin cần tách theo route:

```text
routes/admin/
├── AdminLayout.jsx
├── AdminOverviewRoute.jsx
├── AdminUsersRoute.jsx
├── AdminDoctorsRoute.jsx
├── AdminInvitationsRoute.jsx
├── AdminFacilitiesRoute.jsx
├── AdminPlansRoute.jsx
└── AdminAIConfigsRoute.jsx
```

Mỗi route chỉ compose feature management tương ứng.

## Phase 6 - Cleanup và enforcement

- Xóa service alias một dòng và API wrapper trùng.
- Thêm ESLint rule cho import boundary nếu cần.
- Bật TypeScript strict cho vùng đã migration.
- Thêm bundle report và performance budget.
- Viết Storybook cho primitive và state quan trọng.
- Cập nhật README khi cấu trúc mới đã trở thành hiện trạng.

## Definition of done cho mỗi vertical slice

- Không thay đổi contract backend ngoài phạm vi đã thống nhất.
- Route, auth, role và return intent không regression.
- Không có API call trực tiếp trong component.
- Không có CSS string hoặc style global mới.
- Có loading, empty, error, success và permission state.
- Có unit/component test cho logic mới.
- Playwright critical flow, accessibility, lint và build đạt.

## Những việc không làm cùng lúc

- Không đổi router, state library, CSS framework và TypeScript toàn repo trong
  một pull request.
- Không rewrite UI chỉ để phù hợp cấu trúc thư mục.
- Không di chuyển file mà không sửa dependency boundary.
- Không tạo abstraction chung trước khi có ít nhất hai use case thật.
- Không migration module records/medication trước khi chúng được duyệt là
  capability production.
