# Kiến trúc frontend MediMate AI

Ngày cập nhật: **2026-06-26**.

Tài liệu này xác định kiến trúc frontend hiện tại, kiến trúc mục tiêu và quy tắc bắt buộc khi phát triển React/Vite cho MediMate AI. Phạm vi nghiệp vụ vẫn phải tuân theo [product definition](../product-definition/README.md).

## Tài liệu liên quan

1. [Frontend production standards](./production-frontend-standards.md)
2. [Developer workflow](./developer-workflow.md)
3. [Refactor & cleanup guide](./refactor-cleanup-guide.md)
4. [API layer](./api-layer.md)
5. [Chiến lược styling và design system](./styling-strategy.md)
6. [Kế hoạch migration frontend](./migration-plan.md)
7. [Checklist nhiệm vụ frontend](./task-checklist.md)
8. [Kế hoạch khôi phục bản đồ](./map-recovery-plan.md)
9. [Frontend delivery backlog](./frontend-delivery-backlog.md)
10. [Frontend web-scale checklist](./frontend-web-scale-checklist.md)

## 1. Stack hiện tại

Repo hiện dùng:

- React `19.3.0-canary-dbc37501-20260612`.
- React DOM `19.3.0-canary-dbc37501-20260612`.
- Vite `8.0.16`.
- JavaScript/JSX là nguồn chính.
- Playwright cho E2E, accessibility, performance và visual regression.
- ESLint flat config.
- MapLibre GL và React Map GL.
- Google OAuth.
- Vercel rewrite cho `/api/*`.

Quy tắc bắt buộc:

- Không nâng React canary, Vite, Playwright hoặc MapLibre trong PR tính năng thông thường.
- Không đổi sang Next.js, React Router framework mode, Tailwind, Redux/Zustand hoặc UI framework lớn nếu chưa có ADR.
- Không thêm TypeScript đại trà trong PR refactor nhỏ. TypeScript phải được migration theo phase.

## 2. Cấu trúc hiện tại

```text
src/
├── components/   # Component dùng chung, workspace shell, UI primitive
├── pages/        # Route/page hiện tại
├── router/       # Route registry, access guard, navigation helper
├── services/     # API client, endpoints và service theo domain
├── state/        # State/personalization dùng chung
├── styles/       # CSS, design token, layout, utility
└── utils/        # Hàm tiện ích thuần

tests/e2e/         # Playwright tests
docs/              # Product, backend, architecture, UI/UX, quality
```

Luồng route hiện tại:

```text
URL
  -> src/router/routes.js
  -> src/router/access.js
  -> src/App.jsx
  -> Page hoặc Workspace Shell
```

Luồng API hiện tại:

```text
Page/Component
  -> Domain Service
  -> ENDPOINTS
  -> apiRequest()
  -> Backend
```

## 3. Điểm đã cải thiện so với docs cũ

- Route metadata đã được gom trong `src/router/routes.js`.
- Access guard được tách khỏi page bằng `src/router/access.js`.
- `src/App.jsx` đã giảm trách nhiệm so với trạng thái trước: chủ yếu resolve route, canonicalize và render page.
- Một số route nặng đã được lazy-load bằng `React.lazy`/`Suspense`.
- Endpoint backend đã được tập trung trong `src/services/endpoints.js`.
- `apiClient` giữ request behavior, auth header, JSON parse, error normalization và auth storage whitelist.
- Admin navigation có route riêng cho từng section.
- Playwright đã có route/accessibility/performance/visual baseline.

## 4. Vấn đề còn phải kiểm soát

Các vấn đề sau không nhất thiết phải sửa trong một PR, nhưng phải được xem là rủi ro kiến trúc:

- Nhiều page vẫn chứa business logic, form logic và UI logic trong cùng file.
- `AdminWorkspacePage.jsx` và các workspace lớn cần tiếp tục tách theo domain.
- Server state vẫn được quản lý thủ công ở nhiều nơi; dễ lặp loading/error/refetch/cache.
- Một số capability thử nghiệm phải được gắn nhãn demo hoặc ẩn khỏi production navigation.
- ESLint hiện chỉ target `**/*.{js,jsx}`; nếu thêm TypeScript phải cập nhật lint config.
- `apiClient.js` đang có chuỗi lỗi fallback bị mojibake; cần sửa thành UTF-8 rõ ràng trong task code riêng.
- Cấu hình production đang rewrite đến backend IP cố định; cần thay bằng config môi trường khi có deployment strategy ổn định.
- MapLibre/React Map GL có nguy cơ chunk lớn; cần tiếp tục lazy-load và kiểm soát budget.

## 5. Nguyên tắc kiến trúc bắt buộc

1. Tổ chức theo business capability khi refactor, không tạo thêm layer kỹ thuật vô nghĩa.
2. Route chỉ compose page/shell; không chứa chi tiết API hoặc business rule sâu.
3. Component không gọi `fetch` trực tiếp đến backend.
4. Component/page không hard-code `/api/...`.
5. Service không điều hướng, không toast, không đọc DOM và không chứa copy UI.
6. Endpoint mới phải khai báo trong `src/services/endpoints.js`.
7. Access rule mới phải đi qua route metadata và `src/router/access.js`.
8. Shared code chỉ được tạo khi có ít nhất hai nơi dùng thật hoặc có lý do foundation rõ ràng.
9. Không tạo barrel export lớn cho toàn repo.
10. Không để file compatibility facade phình to; facade chỉ re-export hoặc adapter mỏng.
11. Không mix mock/demo data vào production flow nếu chưa gắn nhãn rõ.
12. Không thêm dependency nếu vấn đề có thể giải quyết bằng code hiện có với chi phí hợp lý.

## 6. Cấu trúc mục tiêu khi refactor lớn

```text
src/
├── app/
│   ├── App.jsx
│   ├── providers/
│   ├── router/
│   └── config/
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
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── hooks/
│   ├── lib/
│   ├── config/
│   └── styles/
└── main.jsx

tests/
├── unit/
├── component/
└── e2e/
```

Không cần tạo toàn bộ thư mục rỗng ngay. Mỗi thư mục chỉ được tạo khi có code thật được chuyển vào.

## 7. Cấu trúc một feature

Ví dụ `features/symptom-analysis/`:

```text
features/symptom-analysis/
├── api/
│   ├── symptom-analysis.api.js
│   └── symptom-analysis.queries.js
├── components/
│   ├── SymptomForm.jsx
│   ├── ClinicalQuestionStep.jsx
│   └── AnalysisResult.jsx
├── hooks/
│   └── useSymptomDraft.js
├── model/
│   ├── symptom-analysis.schema.js
│   └── symptom-analysis.mapper.js
├── pages/
│   └── SymptomAnalysisPage.jsx
├── styles/
│   └── SymptomAnalysisPage.module.css
└── index.js
```

Quy tắc:

- `api/`: gọi backend và chuẩn hóa request/response boundary.
- `model/`: schema, mapper và business calculation thuần.
- `components/`: UI thuộc riêng feature.
- `hooks/`: orchestration phía React, không thay thế service API.
- `pages/`: compose feature thành route, không chứa CSS string hoặc raw API URL.
- `index.js`: public API nhỏ của feature; code nội bộ dùng import tương đối.

## 8. Phân loại state

| Loại state | Cách xử lý hiện tại | Hướng mục tiêu |
| --- | --- | --- |
| URL state | Route registry, query string, History API helper | Chuẩn hóa qua router layer |
| Server state | `useState`/`useEffect` thủ công trong page | TanStack Query khi migration |
| Form state | Local state trong form/page | React Hook Form + schema khi form phức tạp |
| Validation/schema | Logic thủ công | Zod khi migration TypeScript/form boundary |
| UI local state | `useState`/`useReducer` | Giữ local nếu chỉ thuộc component |
| Global UI preference | Context/state riêng | Chỉ giữ trạng thái thật sự global |

Không thêm Redux/Zustand ở giai đoạn này nếu chưa có global client state đủ phức tạp.

## 9. Routing bắt buộc

- Route mới phải khai báo trong `src/router/routes.js`.
- Route phải có `id`, `path`, `title`, `access`.
- Route cần navigation phải có `navigation.shell`, `label`, `icon`, `order`.
- Admin section mới phải cập nhật `ADMIN_SECTIONS`, title và navigation.
- Route auth/role/premium phải được kiểm soát qua `resolveRouteAccess`.
- Alias phải có canonical path rõ ràng.
- Không dùng `window.location.href` để điều hướng nội bộ nếu navigation helper đáp ứng được.
- Route mới phải có route smoke test hoặc được thêm vào route manifest tương ứng.

## 10. Data access bắt buộc

```text
Route/Page
  -> domain service
    -> ENDPOINTS
      -> apiRequest()
        -> backend
```

Quy tắc:

- Component không import `ENDPOINTS` trừ trường hợp rất đặc biệt có ghi lý do.
- Service không hard-code string endpoint.
- API function không hiển thị toast hoặc điều hướng.
- Mapper chuyển response backend thành model UI tại boundary.
- Không sao chép server response vào global context nếu local/page state đủ.
- Không gọi PayOS webhook/return/cancel như API sản phẩm từ frontend.
- AI provider key không được đặt trong Vite/client.

## 11. Quy ước file và tên

- Component/page: `PascalCase.jsx` hoặc `.tsx`.
- Hook: `useSomething.js`.
- API/service: `domainService.js` hoặc `domain.api.js` khi migration.
- Query: `domain.queries.js` khi migration sang Query.
- Schema: `domain.schema.js`.
- Mapper: `domain.mapper.js`.
- CSS module: `ComponentName.module.css`.
- Test E2E: `feature-name.spec.js`.
- Tên file phải mô tả chức năng thật; không dùng `new`, `old`, `final`, `test2`.

## 12. Dependency policy

Được cân nhắc khi có task nền tảng rõ ràng:

- `react-router`
- `@tanstack/react-query`
- `react-hook-form`
- `zod`
- `@hookform/resolvers`
- `clsx`
- `vitest`
- `@testing-library/react`
- `msw`

Không đề xuất thêm ở thời điểm này nếu chưa có ADR:

- Tailwind CSS nếu đang tiếp tục CSS token/module hiện tại.
- Redux/Zustand nếu chưa có global client state rõ.
- Axios nếu `fetch` + `apiRequest` vẫn đủ.
- Material UI/Ant Design nếu chưa có quyết định đổi design system.
- CSS-in-JS runtime nếu CSS hiện tại đáp ứng được.
- Storybook nếu component API chưa ổn định.

## 13. Definition of Done kiến trúc

Một PR frontend chỉ đạt khi:

- Scope nhỏ, đúng một vertical slice hoặc một refactor có boundary rõ.
- Không phá route/access/navigation hiện có.
- Không hard-code endpoint hoặc duplicate service logic.
- Không làm tăng coupling giữa page lớn và service/domain khác.
- Không thêm code chết, file rỗng, facade dày hoặc dependency không dùng.
- Loading, empty, error và permission state được xử lý.
- Docs/test được cập nhật khi hành vi thay đổi.
