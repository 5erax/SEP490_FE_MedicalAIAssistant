# Kiến trúc frontend MediMate AI

Tài liệu này xác định cấu trúc frontend mục tiêu, dependency nên sử dụng và quy
ước tổ chức code cho React/Vite. Phạm vi nghiệp vụ vẫn phải tuân theo
[product definition](../product-definition/README.md).

Tài liệu liên quan:

1. [Chiến lược styling và design system](./styling-strategy.md)
2. [Kế hoạch migration frontend](./migration-plan.md)
3. [API layer hiện tại](./api-layer.md)
4. [Checklist nhiệm vụ frontend](./task-checklist.md)
5. [Kế hoạch khôi phục bản đồ](./map-recovery-plan.md)

## 1. Đánh giá cấu trúc hiện tại

Điểm tốt:

- API endpoint đã được tập trung trong `src/services/endpoints.js`.
- Có `apiClient`, service theo domain, design token và UI primitive ban đầu.
- Có Playwright cho route, accessibility, payment, visual và performance.
- SPA navigation đã phản ứng với History API mà không reload toàn trang.

Vấn đề cần xử lý:

- `src/App.jsx` đồng thời match route, đặt title, redirect và kiểm tra quyền.
- Tất cả page được import eager; map, admin và các trang lớn đi vào initial bundle.
- `AdminWorkspacePage.jsx` gần 1.900 dòng và chứa nhiều domain quản trị.
- `pages/` chứa cả route component, business logic, form và CSS string.
- `services/` có file trùng vai trò hoặc chỉ re-export một dòng.
- Server state được quản lý thủ công nên dễ lặp loading/error/refetch/cache logic.
- Nhiều page chèn `<style>` trực tiếp; CSS global và page style có thể ảnh hưởng nhau.
- Chưa có unit/component test; E2E phải gánh cả lỗi logic nhỏ.
- Repo đang dùng React canary theo ngày. Đây là rủi ro nếu dự án không chủ động
  thử nghiệm API chưa ổn định.

## 2. Nguyên tắc kiến trúc

1. Tổ chức theo business capability, không theo loại file trên toàn dự án.
2. Route chỉ compose feature; không chứa chi tiết API hoặc business rule.
3. Server state, form state, UI state và URL state là bốn loại state khác nhau.
4. Shared chỉ chứa code thật sự được dùng bởi ít nhất hai feature.
5. Dependency chỉ đi theo hướng:
   `app -> routes -> features -> shared`.
6. Feature không import trực tiếp implementation nội bộ của feature khác.
7. Không tạo barrel export lớn cho toàn repo; ưu tiên import trực tiếp để tránh
   dependency vòng và làm bundle khó phân tích.
8. Một file page trên 300 dòng hoặc component có nhiều hơn một business concern
   phải được xem xét tách.

## 3. Cấu trúc thư mục mục tiêu

```text
src/
├── app/
│   ├── App.jsx
│   ├── providers/
│   │   ├── AppProviders.jsx
│   │   └── QueryProvider.jsx
│   ├── router/
│   │   ├── router.jsx
│   │   ├── route-meta.js
│   │   └── guards.jsx
│   └── config/
│       └── env.js
├── routes/
│   ├── public/
│   ├── patient/
│   ├── staff/
│   └── admin/
├── features/
│   ├── auth/
│   ├── patient-profile/
│   ├── symptom-analysis/
│   ├── facility-search/
│   ├── feedback-review/
│   ├── subscription/
│   ├── doctor-invitation/
│   ├── medical-directory/
│   └── ai-configuration/
├── shared/
│   ├── api/
│   │   ├── client.js
│   │   ├── endpoints.js
│   │   └── errors.js
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── hooks/
│   ├── lib/
│   ├── config/
│   └── styles/
│       ├── index.css
│       ├── tokens.css
│       ├── reset.css
│       ├── base.css
│       ├── layouts.css
│       └── utilities.css
└── main.jsx

tests/
├── unit/
├── component/
└── e2e/
```

Không cần tạo toàn bộ thư mục rỗng ngay. Mỗi feature được tạo khi có code thật
được chuyển vào.

## 4. Cấu trúc một feature

Ví dụ `symptom-analysis`:

```text
features/symptom-analysis/
├── api/
│   ├── symptom-analysis.api.js
│   └── symptom-analysis.queries.js
├── components/
│   ├── SymptomForm.jsx
│   ├── AnalysisResult.jsx
│   └── EmergencyNotice.jsx
├── hooks/
│   └── useSymptomDraft.js
├── model/
│   ├── symptom-analysis.schema.js
│   └── symptom-analysis.mapper.js
├── pages/
│   └── SymptomAnalysisPage.jsx
├── styles/
│   ├── SymptomForm.module.css
│   └── AnalysisResult.module.css
└── index.js
```

Quy tắc:

- `api/`: gọi backend và query/mutation options.
- `model/`: schema, mapper và business calculation thuần.
- `components/`: UI thuộc riêng feature.
- `hooks/`: orchestration phía React, không thay thế service API.
- `pages/`: compose feature thành route, không chứa CSS string hoặc API URL.
- `index.js`: public API nhỏ của feature; code nội bộ dùng import tương đối.

## 5. Phân loại state

| Loại state | Công cụ | Ví dụ |
|---|---|---|
| URL state | React Router | route, search, filter, tab, return intent |
| Server state | TanStack Query | user, facilities, reviews, plans, analysis |
| Form state | React Hook Form | login, profile, admin CRUD |
| Validation/schema | Zod | form input, env và response boundary quan trọng |
| UI local state | `useState`/`useReducer` | dialog, drawer, selected row tạm thời |
| Global UI preference | Context hoặc external store nhỏ | theme, contrast, font size |

Không thêm Redux/Zustand ở giai đoạn này. Repo chưa có global client state đủ
phức tạp để biện minh cho một store tổng quát.

## 6. Dependency đề xuất

### Nên thêm trong giai đoạn nền tảng

| Package | Dùng để làm gì trên web | Lý do |
|---|---|---|
| `react-router` | Route tree, nested layout, guard, params, search và lazy route | Thay custom `if` router và metadata rải rác |
| `@tanstack/react-query` | Fetch/cache/refetch, mutation, retry và invalidation | Giảm state API thủ công và request trùng |
| `react-hook-form` | Quản lý form auth, profile và CRUD | Giảm re-render và chuẩn hóa dirty/error/submit |
| `zod` | Validate input, env và dữ liệu không tin cậy | Một schema dùng cho form và boundary API |
| `@hookform/resolvers` | Kết nối Zod với React Hook Form | Tránh viết adapter validation lặp lại |
| `clsx` | Ghép class theo state/variant | Thay nối chuỗi class thủ công |

Lệnh đề xuất khi bắt đầu migration:

```powershell
npm.cmd install react-router @tanstack/react-query react-hook-form zod @hookform/resolvers clsx
```

### Nên thêm cho kiểm thử

| Package | Dùng để làm gì |
|---|---|
| `vitest` | Unit test cho mapper, schema, role và query logic |
| `@testing-library/react` | Component test theo hành vi người dùng |
| `@testing-library/dom` | Peer dependency và DOM query |
| `@testing-library/user-event` | Mô phỏng tương tác bàn phím, nhập và click |
| `@testing-library/jest-dom` | Matcher DOM dễ đọc |
| `jsdom` | Môi trường DOM cho test nhanh |
| `msw` | Mock HTTP ở component test mà không sửa application code |

```powershell
npm.cmd install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom msw
```

Playwright vẫn giữ cho E2E, accessibility và visual regression. Vitest không
thay thế Playwright.

### Chỉ thêm khi design system đã có đủ component

| Package | Khi nào cần |
|---|---|
| `storybook` | Khi có khoảng 10-15 primitive/component cần tài liệu state độc lập |
| `class-variance-authority` | Khi Button, Badge, Alert, Input có nhiều variant chuẩn |
| `@tanstack/react-query-devtools` | Chỉ dùng development để kiểm tra cache/query |

Storybook nên được thêm sau khi Button, Field, Dialog, Table, Alert và DataState
đã có API ổn định. Thêm sớm sẽ tạo nhiều story cho component còn thay đổi liên tục.

### Không đề xuất lúc này

- **Tailwind CSS:** sẽ tạo hai hệ styling song song và buộc rewrite nhiều CSS.
- **Redux/Zustand:** chưa có nhu cầu global client state đủ lớn.
- **Axios:** `fetch` và `apiClient` hiện đủ; TanStack Query không yêu cầu Axios.
- **Material UI/Ant Design:** khó giữ nhận diện MediMate và làm bundle/style nặng.
- **Sass:** CSS custom properties và CSS Modules đã đủ cho kiến trúc đề xuất.
- **CSS-in-JS runtime:** không cần thêm runtime styling cho ứng dụng Vite này.

## 7. TypeScript

Khuyến nghị migration dần sang TypeScript, không đổi toàn bộ repo trong một PR.

Thứ tự:

1. Thêm `tsconfig.json` với `allowJs: true`, `checkJs: false`, `strict: true`.
2. Chuyển shared API types, schema và utility thuần trước.
3. Chuyển UI primitive và feature mới sang `.tsx`.
4. Chuyển page cũ khi đang được refactor, không đổi đuôi file chỉ để đạt chỉ tiêu.
5. Bật kiểm tra chặt hơn sau khi phần lớn boundary đã có type.

Zod chỉ phát huy đầy đủ type inference khi TypeScript strict được bật.

## 8. Routing mục tiêu

Sử dụng React Router theo declarative hoặc data mode trong SPA hiện tại:

- Public layout: landing, auth, pricing, map.
- Patient layout: dashboard, profile, symptom, chat.
- Staff layout: directory và review operations.
- Admin layout: users, doctors, invitations, plans, AI config.
- Guard tách riêng: authentication, account status, role, profile completion,
  capability/entitlement.
- Route metadata chứa title, navigation label, shell và breadcrumb.
- Route-level lazy loading cho map, admin, chat và trang hiếm dùng.

Không chuyển sang React Router framework mode hoặc đổi sang Next.js trong đợt
refactor này. Mục tiêu là sửa kiến trúc SPA, không đổi nền tảng deployment.

## 9. Data access mục tiêu

```text
Route/Page
  -> feature query/mutation hook
    -> feature API function
      -> shared api client
        -> backend
```

Quy tắc:

- Component không import `endpoints.js`.
- API function không hiển thị toast hoặc điều hướng.
- Query key nằm cùng feature và có factory nhất quán.
- Mutation thành công invalidate đúng query liên quan.
- Mapper chuyển response backend thành model UI ở boundary.
- Không sao chép server response vào global context nếu Query cache đã quản lý.

## 10. Quy ước file và tên

- Component/page: `PascalCase.jsx` hoặc `.tsx`.
- Hook: `useSomething.js`.
- API: `domain.api.js`.
- Query: `domain.queries.js`.
- Schema: `domain.schema.js`.
- Mapper: `domain.mapper.js`.
- CSS Module: `ComponentName.module.css`.
- Test colocated: `ComponentName.test.jsx`; E2E giữ trong `tests/e2e`.
- Boolean bắt đầu bằng `is`, `has`, `can`, `should`.
- Event handler bắt đầu bằng `handle`; callback prop bắt đầu bằng `on`.

## 11. Quality gate

Mỗi feature mới hoặc refactor phải đạt:

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e:routes
npm.cmd run test:e2e:a11y
```

Sau khi thêm Vitest, bổ sung script:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Critical flow như auth, symptom-to-map và payment tiếp tục có Playwright E2E.
Mapper, schema, guard và component form phải có unit/component test.

## 12. Nguồn tham khảo

- [React Router routing](https://reactrouter.com/start/declarative/routing)
- [TanStack Query overview](https://tanstack.com/query/latest/docs/framework/react/overview)
- [React Hook Form](https://react-hook-form.com/get-started)
- [Zod](https://zod.dev/)
- [Vite CSS Modules](https://vite.dev/guide/features)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest request mocking](https://vitest.dev/guide/mocking/requests)
- [Storybook](https://storybook.js.org/docs)
