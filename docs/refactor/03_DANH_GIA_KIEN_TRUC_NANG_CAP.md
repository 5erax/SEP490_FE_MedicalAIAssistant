# Đánh giá kiến trúc hiện tại và kiến trúc mục tiêu MediMate AI Frontend

> Phiên bản nâng cấp: 2026-06-17  
> Phạm vi: frontend React/Vite của MediMate AI, review tĩnh dựa trên source đã cung cấp.  
> Đối tượng đọc: Tech Lead, Senior Frontend Engineer, Reviewer, Developer mới, PM/Founder cần hiểu rủi ro kỹ thuật.  
> Mục tiêu: biến đánh giá kiến trúc thành tài liệu ra quyết định, lập backlog refactor, review PR và kiểm soát rủi ro production.  
> Nguyên tắc đọc: tài liệu này không thay thế kiểm thử runtime. Mọi thay đổi code vẫn phải qua lint, build, test, review và kiểm tra manual ở flow liên quan.

---

## 1. Executive summary

Frontend MediMate AI đã vượt qua giai đoạn prototype đơn giản. Repo hiện có nhiều capability sản phẩm: landing, auth, symptom analysis, chat AI, map/facility, patient dashboard, payment/subscription, admin workspace, staff workspace, doctor invitation, records và medication. Kiến trúc hiện tại có một số nền tảng tốt như route metadata tập trung, API layer có service/endpoints, test E2E khá rộng, và đã có docs nội bộ. Đây là điểm mạnh quan trọng, vì repo không cần rewrite toàn bộ.

Tuy nhiên, dự án cũng đã xuất hiện các dấu hiệu nợ kỹ thuật có thể ảnh hưởng trực tiếp đến tốc độ phát triển, chất lượng vận hành và an toàn sản phẩm sức khỏe:

- một số page lớn đang gom quá nhiều trách nhiệm;
- CSS global quá lớn, khó kiểm soát regression;
- nguy cơ secret/provider key và hard-code environment ở frontend;
- demo/mock ở domain y tế cần policy chặt chẽ;
- API response/error/loading chưa được chuẩn hóa đủ mạnh;
- test hiện nghiêng nhiều về E2E, còn thiếu unit/integration cho logic nhỏ;
- chưa có boundary enforcement để ngăn import sai layer;
- documentation nhiều nhưng cần governance để không stale.

Kết luận kiến trúc: **không nên rewrite**, cũng **không nên tiếp tục thêm feature theo cách hiện tại mà không kiểm soát**. Hướng đúng là **progressive refactor**: xử lý rủi ro P0 trước, sau đó tách dần page lớn, chuẩn hóa CSS/API/error/loading, bổ sung test guard, rồi mới migration feature-first toàn diện.

---

## 2. Mục tiêu của tài liệu

Tài liệu này không chỉ đánh giá hiện trạng, mà phải trả lời được các câu hỏi thực tế khi team triển khai:

1. Kiến trúc hiện tại đang tốt ở đâu?
2. Kiến trúc hiện tại đang yếu ở đâu?
3. Yếu điểm nào cần sửa ngay, yếu điểm nào có thể để sau?
4. Target architecture nên trông như thế nào?
5. Làm sao migrate từng phần mà không phá app?
6. Reviewer dùng tiêu chí nào để chặn PR sai kiến trúc?
7. Developer mới cần hiểu boundary nào trước khi sửa code?
8. Quyết định kiến trúc nào cần ADR?
9. Làm sao đo refactor đã thành công?
10. Làm sao tránh biến refactor thành rewrite rủi ro cao?

---

## 3. Nguyên tắc kiến trúc bắt buộc

Các nguyên tắc dưới đây nên được xem như tiêu chuẩn kỹ thuật nội bộ. Khi PR vi phạm, reviewer có quyền yêu cầu sửa trước khi merge.

| Nguyên tắc | Ý nghĩa thực tế | Cách áp dụng trong MediMate AI | Dấu hiệu vi phạm |
| --- | --- | --- | --- |
| Single Responsibility | Một module chỉ nên có một lý do chính để thay đổi | `AdminUsersSection` chỉ quản lý users, không chứa doctor/payment logic | Một file có nhiều API domain, nhiều modal/form/table không liên quan |
| Clear Boundary | UI, service, router, state, utility có ranh giới rõ | Component không gọi `fetch`; endpoint nằm trong `endpoints.js` | Page hard-code `/api/...`, UI parse response phức tạp |
| Progressive Refactor | Sửa từng phần có test bảo vệ | Tách admin từng section, không rewrite cả workspace | PR đổi hàng chục file không có test/evidence |
| Fail Safely | Lỗi phải có fallback an toàn, không crash hoặc gây hiểu nhầm | API error có message, empty state, retry, fallback UI | Lỗi backend làm trắng trang hoặc hiển thị dữ liệu demo như thật |
| Security by Default | Không expose secret, không log dữ liệu nhạy cảm | AI provider qua backend gateway; env được validate | `VITE_*_SECRET`, token/PII xuất hiện trong console/log |
| Product Honesty | Demo/mock phải ghi rõ demo | Records/Medication nếu chưa production phải có nhãn | Người dùng thấy mock như dữ liệu y tế thật |
| Testable Design | Logic quan trọng phải tách ra để test được | Role/premium/profile validation nằm trong helper/hook | Logic nhúng sâu trong JSX/render condition |
| Accessibility First | UI quan trọng dùng được bằng keyboard/screen reader | Dialog, form, table có label/focus/error | Modal không trap focus, input lỗi không liên kết message |
| Backward Compatibility | Refactor không phá route/API cũ nếu chưa có migration | Alias route có test, service adapter giữ shape cũ | Đổi response shape khiến nhiều page lỗi |
| Observability Mindset | Lỗi quan trọng cần có chiến lược log an toàn | Log technical error không chứa PII/medical data | Không biết lỗi production xảy ra ở đâu |

---

## 4. Scorecard kiến trúc hiện tại

Điểm dưới đây là đánh giá định hướng để lập ưu tiên, không phải chấm điểm cá nhân.

| Hạng mục | Điểm hiện tại | Điểm mục tiêu | Mức ưu tiên | Nhận xét |
| --- | ---: | ---: | --- | --- |
| Route architecture | 7/10 | 9/10 | P1 | Metadata tập trung là nền tốt; cần test access/alias/returnTo kỹ hơn |
| API layer | 7/10 | 9/10 | P1 | Có `apiClient`, `endpoints`, domain service; cần chuẩn hóa DTO/error/retry/401 |
| Component structure | 5/10 | 8/10 | P1 | Page lớn gây khó review/test; cần tách feature sections/hooks/components |
| CSS architecture | 4/10 | 8/10 | P1 | CSS global lớn là bottleneck; cần freeze, audit, tách layer và feature CSS |
| Security posture | 4/10 | 8/10 | P0 | Secret ở client, hard-code env, auth localStorage cần hardening |
| Product safety | 5/10 | 9/10 | P0 | Demo/mock và medical wording phải kiểm soát nghiêm túc |
| Testing strategy | 6/10 | 8/10 | P1/P2 | E2E tốt; thiếu unit/integration/contract cho logic nhỏ |
| Documentation | 7/10 | 9/10 | P2 | Có docs nhiều; cần owner, update rule, review docs như code |
| Performance | 5/10 | 8/10 | P2 | Cần lazy loading đúng chỗ, bundle audit, image/assets optimization |
| Maintainability | 5/10 | 8/10 | P1 | Đang tới ngưỡng cần feature-first migration có kiểm soát |
| Onboarding | 6/10 | 9/10 | P2 | Docs giúp nhiều nhưng cần SOP, issue template, PR template, route/API guide |

---

## 5. Kiến trúc hiện tại: các điểm mạnh cần giữ

### 5.1. Route metadata tập trung

Việc có `src/router/routes.js` là một điểm mạnh lớn. Route metadata tập trung giúp team quản lý:

- `path`;
- `title`;
- `access`;
- `roles`;
- navigation metadata;
- alias/canonical path;
- admin generated routes.

#### Giá trị kiến trúc

Route không bị rải rác trong nhiều component. Điều này giúp reviewer dễ kiểm tra khi thêm route mới và giúp test route manifest dễ hơn.

#### Quy tắc giữ lại

```txt
Mọi route mới phải đi qua route metadata.
Không tạo route ẩn bằng điều kiện render riêng trong component nếu đó là capability chính.
Không bypass access control bằng redirect thủ công rải rác.
```

#### Việc cần nâng cấp

- Bổ sung test access cho public/auth/premium/role.
- Bổ sung test alias không bypass access.
- Bổ sung snapshot/manifest test cho route navigation.
- Thêm ownership cho route thay đổi lớn.

---

### 5.2. API service đã theo domain

Repo đã có API layer với `apiClient.js`, `endpoints.js`, và các domain service như auth, user, doctor, facility, subscription, symptom analysis, AI config. Đây là hướng đúng cho frontend có nhiều business domain.

#### Giá trị kiến trúc

Luồng chuẩn nên là:

```txt
Page/Component
  -> Feature hook hoặc domain service
  -> ENDPOINTS
  -> apiRequest()
  -> Backend
```

Ưu điểm:

- UI không phụ thuộc endpoint string;
- dễ thay đổi base URL;
- dễ chuẩn hóa auth header;
- dễ normalize error;
- dễ mock API trong test;
- dễ review API contract.

#### Rủi ro hiện tại

API layer có nền tốt nhưng chưa đủ chặt nếu team vẫn có thể:

- gọi `fetch` trực tiếp trong page;
- hard-code `/api/...` trong component;
- xử lý lỗi API mỗi nơi một kiểu;
- normalize response trong JSX;
- dùng nhiều shape response khác nhau cho cùng một domain.

#### Việc cần nâng cấp

- ESLint/grep CI chặn `fetch(`/`axios` ngoài service nếu không được allowlist.
- Chuẩn hóa `ApiError`.
- Chuẩn hóa `ApiResponse<T>` hoặc runtime schema nếu chưa dùng TypeScript.
- Chuẩn hóa 401/403/timeout/retry.
- Viết docs API contract theo domain.

---

### 5.3. E2E test baseline khá tốt

Repo có E2E tests cho route, admin, payment, map, visual, accessibility, performance. Đây là lợi thế lớn khi refactor.

#### Giá trị kiến trúc

Test E2E giúp bảo vệ các flow chính:

- route không chết;
- navigation không lệch;
- payment return/cancel không crash;
- admin CRUD UI không mất nút chính;
- map UX không trắng trang;
- accessibility regression được phát hiện sớm.

#### Rủi ro hiện tại

E2E thường chậm và khó pinpoint lỗi. Nếu mọi logic chỉ được test bằng E2E thì khi fail, developer khó biết lỗi nằm ở route, service, normalize, component hay CSS.

#### Việc cần nâng cấp

Bổ sung testing pyramid:

```txt
Unit test: utility/helper/normalizer/role/profile logic
Integration test: hook + service mock + component state
E2E test: flow chính, route, payment, admin, symptom, map
Visual/a11y test: UI critical states
```

---

### 5.4. Có nền UI primitives

Các component như Button, Card, Dialog, Field, Table là nền tốt cho design system.

#### Giá trị kiến trúc

Shared UI primitives giúp:

- giảm duplicate UI;
- thống nhất spacing, variant, loading, disabled;
- giảm lỗi accessibility;
- tăng tốc build feature mới;
- reviewer không phải review lại button/table/form từ đầu.

#### Việc cần nâng cấp

- Chuẩn hóa props cho Button/Dialog/Field/Table.
- Tạo docs component usage.
- Không để page tự tạo button/table/form phức tạp nếu shared UI đã có.
- Thêm story/example nội bộ nếu chưa có Storybook.

---

### 5.5. Docs nội bộ đã có nhiều nền tảng

Repo có nhiều tài liệu về product, frontend architecture, backend contract, quality/testing, UI/UX. Đây là lợi thế onboarding.

#### Rủi ro

Docs nhiều nhưng không có governance sẽ nhanh stale. Docs stale còn nguy hiểm hơn thiếu docs, vì nhân viên mới có thể làm theo hướng dẫn sai.

#### Việc cần nâng cấp

- Gán owner cho từng file docs.
- Mỗi PR đổi route/API/auth/payment/admin phải check docs.
- Docs update là một phần Definition of Done.
- Có changelog docs theo ngày.

---

## 6. Kiến trúc hiện tại: các vấn đề chính

### 6.1. Page lớn vượt ngưỡng maintainability

Các page lớn đang có nguy cơ thành god component. Một file page nên chủ yếu compose layout và feature sections, không nên chứa toàn bộ state, API, form, modal, table, validation, normalize và render chi tiết.

#### Dấu hiệu nhận biết

Một page cần được tách nếu có các dấu hiệu sau:

- nhiều hơn 500-700 dòng và vẫn tiếp tục tăng;
- có nhiều `useState` cho nhiều domain khác nhau;
- import nhiều service không cùng domain;
- có nhiều form/modal/table trong cùng file;
- có nhiều hàm handler `handleCreate`, `handleUpdate`, `handleDelete`, `handleApprove` cho nhiều entity;
- JSX render dài, nhiều conditional branch;
- logic normalize hoặc validate nằm trong render;
- mỗi PR nhỏ đều dễ conflict với PR khác.

#### Tác hại thực tế

- Developer mới khó hiểu nơi sửa.
- Reviewer khó đọc diff.
- Bug nhỏ có thể gây regression nhiều section.
- Khó viết unit test.
- State update dễ làm render thừa.
- Merge conflict tăng.
- Performance tuning khó.

#### Target

```txt
Page lớn -> Page composition nhỏ
Business logic -> hook/model/service
Table/form/dialog -> component riêng
Normalize/validate -> model/helper có test
```

---

### 6.2. CSS global quá lớn

CSS global lớn khiến mọi thay đổi UI đều rủi ro. Khi class không có scope rõ, developer khó biết class nào còn dùng, class nào thuộc page nào, class nào override class nào.

#### Dấu hiệu nhận biết

- `global.css` liên tục tăng.
- Có nhiều class generic như `.title`, `.card`, `.section`, `.grid`, `.actions`.
- Responsive fix nằm cuối file, override nhiều nơi.
- Feature-specific styles nằm trong global.
- Không có visual evidence khi sửa CSS lớn.
- Developer sợ xóa CSS vì không biết ảnh hưởng.

#### Target

```txt
styles/
  tokens.css
  reset.css
  base.css
  typography.css
  layout.css
  utilities.css
components/ui/ui.css
features/<feature>/<feature>.css
```

#### Quy tắc

- Không thêm CSS feature mới vào global nếu không phải foundation.
- CSS global chỉ chứa token, reset, base, typography, utility thật sự dùng chung.
- Class feature phải có prefix hoặc scope rõ.
- Mỗi PR sửa CSS lớn phải có screenshot hoặc visual test.

---

### 6.3. Dependency boundary chưa được enforce

Khi không có boundary enforcement, repo dễ rơi vào tình trạng import vòng hoặc import sai layer.

#### Ví dụ sai

```txt
components/ui/Button.jsx import authService
services/userService.js import component UI
features/admin/users import trực tiếp file sâu của features/payment
router/access.js phụ thuộc page-specific helper
```

#### Tác hại

- Khó tách feature.
- Khó test từng module.
- Bundle dễ kéo code không cần thiết.
- Refactor một feature phá feature khác.
- Developer mới học sai pattern.

#### Target dependency direction

```txt
app -> pages/features -> shared
features -> shared
shared/ui -> shared/lib/styles
shared/api -> shared/config/lib
services/api -> config/lib

Không đi ngược:
shared -> features
services -> components
components/ui -> services/domain
```

---

### 6.4. Env/deploy chưa đủ chuyên nghiệp

Frontend không nên hard-code backend IP hoặc production endpoint trong source theo cách khó kiểm soát.

#### Rủi ro

- Deploy nhầm backend.
- Không phân biệt dev/staging/prod.
- Khó rollback.
- Khó audit.
- Có thể lộ endpoint nội bộ.
- Khi backend đổi IP/domain phải sửa code.

#### Target

```txt
.env.local           chỉ dùng local, không commit secret
.env.development     dev API
.env.staging         staging API
.env.production      production HTTPS domain
Vercel/CI env        cấu hình qua dashboard/secret manager
```

#### Quy tắc

- `VITE_API_BASE_URL` phải được validate lúc build/runtime.
- Production không dùng IP hard-code nếu có thể dùng domain HTTPS.
- Không commit secret vào repo.
- `.env.example` chỉ chứa placeholder an toàn.

---

### 6.5. AI provider boundary chưa an toàn

Nếu frontend gọi trực tiếp AI provider bằng provider key, key đó có nguy cơ bị lộ vì biến `VITE_*` được bundle vào client.

#### Rủi ro

- Lộ API key.
- Bị abuse quota/cost.
- Không kiểm soát prompt/data gửi ra provider.
- Không có rate limit user-level.
- Không có audit/safety policy tập trung.
- Với dữ liệu sức khỏe, đây là rủi ro rất cao.

#### Target

```txt
Frontend
  -> Backend AI Gateway
    -> auth/rate limit/audit/safety filter
    -> AI Provider
```

#### Frontend chỉ nên biết

- endpoint nội bộ của backend;
- trạng thái loading/error;
- response đã được backend normalize;
- disclaimer/safety UI.

Frontend không nên biết:

- provider secret;
- provider raw endpoint;
- prompt system nhạy cảm;
- policy nội bộ chỉ dùng server.

---

### 6.6. Demo/mock chưa có production policy đủ rõ

Trong sản phẩm sức khỏe, demo/mock không được hiển thị như dữ liệu thật.

#### Rủi ro

- Người dùng tưởng records/medication là capability thật.
- Nhân viên support hiểu nhầm trạng thái sản phẩm.
- PM release nhầm feature demo.
- Reviewer không biết mock nào được phép tồn tại.

#### Target policy

Mỗi demo/mock phải có metadata:

```txt
Tên capability
Route liên quan
Loại mock: UI demo / fallback / fixture test / seed dev
Có hiển thị production không?
Copy cảnh báo là gì?
Owner là ai?
Ngày review lại
Điều kiện để chuyển production
```

---

## 7. Kiến trúc mục tiêu tổng thể

### 7.1. Layer architecture mục tiêu

```txt
src/
├── app/
│   ├── App.jsx
│   ├── SpaRoot.jsx
│   ├── providers/
│   └── router/
├── pages/
│   └── route-level composition only
├── features/
│   ├── auth/
│   ├── symptom-analysis/
│   ├── patient-dashboard/
│   ├── map/
│   ├── payment/
│   ├── admin/
│   ├── staff/
│   ├── doctor-invitation/
│   ├── profile/
│   └── landing/
├── shared/
│   ├── api/
│   ├── config/
│   ├── ui/
│   ├── hooks/
│   ├── lib/
│   ├── styles/
│   └── constants/
└── tests/
```

Đây là target dài hạn. Không cần đổi ngay một PR. Migration phải incremental.

---

### 7.2. Trách nhiệm từng layer

| Layer | Trách nhiệm | Được phép phụ thuộc | Không được làm |
| --- | --- | --- | --- |
| `app` | Bootstrap, providers, route composition, global shell | `shared`, `features` public API | Business logic chi tiết, API CRUD trực tiếp |
| `pages` | Route-level page wrapper, chọn feature/shell | `features`, `shared/ui` | Chứa form/table/API logic dài |
| `features` | Capability/domain cụ thể | `shared` | Import sâu feature khác nếu không qua public API |
| `shared/api` | API client, base config, error, auth header | `shared/config`, `shared/lib` | Render UI, chứa business copy |
| `shared/ui` | Primitive component | `shared/lib`, `shared/styles` | Gọi API, đọc localStorage auth domain |
| `shared/hooks` | Hook dùng chung không domain hoặc rất generic | `shared` | Chứa logic domain sâu |
| `shared/lib` | Utility thuần | Không hoặc rất ít dependency | Phụ thuộc UI/page |
| `shared/styles` | Token, base, utility | Không | CSS feature-specific |

---

### 7.3. Feature module chuẩn

Mỗi feature nên có cấu trúc đủ rõ nhưng không quá máy móc.

```txt
features/<feature-name>/
├── components/
│   ├── <Feature>Panel.jsx
│   ├── <Feature>Table.jsx
│   └── <Feature>FormDialog.jsx
├── hooks/
│   └── use<Feature>.js
├── services/
│   └── <feature>Api.js
├── model/
│   ├── normalize<Feature>.js
│   ├── validate<Feature>.js
│   └── <feature>.constants.js
├── styles/
│   └── <feature>.css
├── <Feature>PageSection.jsx
└── index.js
```

#### Public API rule

File ngoài feature chỉ nên import từ `index.js`:

```js
import { AdminUsersSection } from '@/features/admin/users';
```

Tránh import sâu:

```js
// Không khuyến khích nếu không có lý do rõ
import { AdminUsersTable } from '@/features/admin/users/components/AdminUsersTable';
```

#### Lợi ích

- Dễ move feature.
- Dễ review public surface.
- Dễ thay implementation bên trong.
- Giảm coupling.

---

## 8. Kiến trúc mục tiêu cho từng vùng quan trọng

### 8.1. Admin workspace

#### Hiện tại

```txt
AdminWorkspacePage.jsx
  overview
  users
  doctors
  ai-configs
  subscriptions
  staff
  departments
  facilities
  many states
  many handlers
  many forms
  many tables
```

#### Mục tiêu

```txt
features/admin/
├── AdminWorkspacePage.jsx
├── AdminShell.jsx
├── AdminSectionRouter.jsx
├── overview/
│   ├── AdminOverviewSection.jsx
│   └── index.js
├── users/
│   ├── AdminUsersSection.jsx
│   ├── components/
│   ├── hooks/useAdminUsers.js
│   ├── model/
│   └── index.js
├── doctors/
├── ai-configs/
├── subscriptions/
├── staff/
├── departments/
└── facilities/
```

#### Nguyên tắc tách

- Tách từng section một PR.
- Không đổi UI/behavior nếu PR chỉ refactor.
- Mỗi section có hook quản lý data/loading/error/action.
- Table/form/dialog tách component.
- Normalize/validate tách model.
- Admin shell giữ navigation/layout.

#### Acceptance criteria

- `AdminWorkspacePage` giảm dần xuống vai trò composition.
- Mỗi section có loading/error/empty rõ.
- CRUD action có optimistic/refresh strategy rõ.
- Test admin navigation vẫn pass.
- Không mất route `/app/admin/<section>`.

---

### 8.2. API layer

#### Hiện tại tốt

Có `apiClient`, `endpoints`, domain services.

#### Target structure

```txt
shared/api/
├── apiClient.js
├── endpoints.js
├── apiError.js
├── authStorage.js
├── requestConfig.js
├── responseParser.js
├── pagination.js
└── index.js
features/<feature>/services/<feature>Api.js
```

#### Chuẩn `ApiError`

```js
export class ApiError extends Error {
  constructor({ message, status, code, details, requestId, isTimeout, isUnauthorized }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.isTimeout = Boolean(isTimeout);
    this.isUnauthorized = Boolean(isUnauthorized);
  }
}
```

#### Chuẩn service

```js
export const adminUsersApi = {
  async list(params) {
    return apiRequest(ENDPOINTS.USERS.LIST, {
      method: 'GET',
      auth: true,
      query: params,
    });
  },

  async updateStatus(userId, payload) {
    return apiRequest(ENDPOINTS.USERS.STATUS(userId), {
      method: 'PATCH',
      auth: true,
      body: payload,
    });
  },
};
```

#### Không chấp nhận

```js
// Không gọi API trực tiếp trong component
const res = await fetch('/api/users');
const json = await res.json();
```

#### API governance

Mỗi endpoint mới cần:

- khai báo trong `endpoints.js`;
- service domain;
- request/response example;
- error states;
- auth requirement;
- test hoặc mock fixture;
- docs contract nếu là capability chính.

---

### 8.3. Auth/session

#### Target

```txt
Auth UI
  -> auth feature hook
  -> auth service
  -> apiClient
  -> auth storage/session manager
  -> route access resolver
```

#### Quy tắc

- Không đọc/ghi localStorage auth rải rác.
- Không parse JWT ở nhiều nơi.
- 401 xử lý tập trung.
- Logout luôn clear local auth kể cả API logout fail.
- Không log token/user medical data.
- Auth state update phải làm route/access sync.

#### Hardening dài hạn

- Nếu backend hỗ trợ, cân nhắc httpOnly secure cookie.
- Có CSP để giảm XSS risk.
- Token refresh strategy rõ.
- Session expiration UI rõ.

---

### 8.4. Symptom analysis và chat AI

#### Đặc thù domain

Symptom analysis và chat AI là vùng nhạy cảm vì liên quan sức khỏe. Kiến trúc phải ưu tiên safety hơn tốc độ.

#### Target flow

```txt
Symptom UI
  -> useSymptomAnalysis hook
  -> symptomAnalysisApi
  -> backend symptom service
  -> normalized result
  -> UI safety presentation
```

```txt
Chat UI
  -> chatbotApi/webChatbotApi
  -> backend AI gateway
  -> provider
```

#### Quy tắc safety UI

- Không wording khẳng định chẩn đoán.
- Có disclaimer rõ.
- Có emergency guidance cho triệu chứng nguy hiểm.
- Có fallback khi API trả empty questions.
- Không hiển thị provider raw error cho user.
- Không log input y tế nhạy cảm ở console.

---

### 8.5. Payment/subscription

#### Target flow

```txt
PricingPage
  -> useSubscriptionPlans
  -> subscriptionPlansApi
  -> checkout action
  -> payment provider redirect
  -> PaymentResultPage
  -> paymentsApi.status(orderCode)
  -> sync premium/auth state
```

#### Kiến trúc cần có

- Payment status enum tập trung.
- Mapping provider status -> UI state tập trung.
- Retry/polling có giới hạn.
- `returnTo` rõ sau payment.
- Sync premium state sau success.
- Không tin client-only status để cấp quyền.

#### Test bắt buộc

- missing orderCode;
- success;
- pending;
- failed;
- cancelled;
- unauthorized;
- network error;
- refresh return page.

---

### 8.6. Map/facility

#### Target structure

```txt
features/map/
├── MapPage.jsx
├── components/
│   ├── FacilityMap.jsx
│   ├── FacilityList.jsx
│   ├── FacilityFilters.jsx
│   └── FacilityCard.jsx
├── hooks/
│   ├── useFacilities.js
│   ├── useUserLocation.js
│   └── useMapViewport.js
├── model/
│   ├── normalizeFacility.js
│   └── facilityDistance.js
└── services/facilitySearchApi.js
```

#### Kiến trúc cần có

- Geolocation hook riêng.
- Facility normalize riêng.
- Map render tách khỏi list/filter.
- Fallback nếu location denied.
- Fallback nếu facility thiếu tọa độ.
- Lazy load map library nếu ảnh hưởng bundle.

---

### 8.7. CSS/design system

#### Target CSS layering

```txt
shared/styles/
├── tokens.css
├── reset.css
├── base.css
├── typography.css
├── layout.css
├── utilities.css
└── index.css
shared/ui/ui.css
features/<feature>/styles/<feature>.css
```

#### Token policy

Mọi style mới nên dùng token:

```css
.example-card {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  color: var(--color-text-primary);
  background: var(--color-surface);
}
```

Tránh:

```css
.example-card {
  padding: 17px;
  border-radius: 13px;
  color: #222;
}
```

#### Component primitive target

- Button
- IconButton
- Card
- Dialog
- Drawer
- Field/Input/Textarea/Select
- Table
- Badge
- Alert
- Spinner/Skeleton
- EmptyState
- ErrorState
- Tabs
- Pagination

---

## 9. Architecture Decision Records cần tạo

Nên tạo thư mục:

```txt
docs/architecture/adr/
```

### 9.1. Mẫu ADR

```md
# ADR-001: Tên quyết định

## Status
Proposed | Accepted | Superseded | Deprecated

## Context
Vấn đề hiện tại là gì? Vì sao cần quyết định?

## Decision
Team quyết định làm gì?

## Alternatives Considered
Các phương án khác đã cân nhắc là gì?

## Consequences
Tác động tích cực, trade-off và rủi ro.

## Migration Plan
Các bước chuyển đổi.

## Validation
Cách kiểm tra quyết định có hiệu quả.
```

### 9.2. Danh sách ADR đề xuất

| ADR | Chủ đề | Ưu tiên | Lý do |
| --- | --- | --- | --- |
| ADR-001 | Feature-first architecture | P1 | Cần thống nhất target folder trước khi refactor lớn |
| ADR-002 | API layer, endpoint và error policy | P1 | Cần chặn fetch trực tiếp và lỗi mỗi nơi một kiểu |
| ADR-003 | Auth/session/token storage strategy | P0/P1 | Liên quan security và access control |
| ADR-004 | AI provider phải qua backend gateway | P0 | Tránh lộ secret và tăng safety |
| ADR-005 | Demo/mock production policy | P0 | Domain y tế cần product honesty |
| ADR-006 | CSS/design token strategy | P1 | Chặn CSS global tiếp tục phình |
| ADR-007 | Testing pyramid và CI gates | P1/P2 | Cần chuẩn hóa test khi refactor |
| ADR-008 | Route/access/returnTo policy | P1 | Auth/premium/role cần nhất quán |
| ADR-009 | Logging/observability policy | P2 | Không log PII/medical data, có tracking lỗi an toàn |
| ADR-010 | Type/schema strategy | P2 | JS hiện tại cần DTO/schema hoặc cân nhắc TypeScript |

---

## 10. Migration strategy

### 10.1. Nguyên tắc migration

Không migrate toàn bộ repo một lần. Mỗi migration phải có:

- scope rõ;
- test guard;
- rollback path;
- owner;
- acceptance criteria;
- docs update;
- PR nhỏ nhất có thể.

### 10.2. Thứ tự migration đề xuất

```txt
Phase 0: Freeze rule
  - Không thêm fetch trực tiếp
  - Không thêm CSS feature vào global
  - Không thêm secret/env hard-code

Phase 1: P0 safety/security
  - AI provider gateway
  - env validation
  - demo/mock policy

Phase 2: Admin split
  - Tách overview
  - Tách users
  - Tách doctors
  - Tách facilities/departments
  - Tách subscriptions/ai-configs/staff

Phase 3: API/error/loading standard
  - ApiError
  - useAsync/useApiState pattern
  - 401/403/timeout handling

Phase 4: CSS architecture
  - tokens/base/layout/utilities
  - shared UI states
  - feature CSS migration

Phase 5: Testing pyramid
  - unit tests for role/profile/normalizers
  - integration tests for hooks
  - E2E critical paths

Phase 6: Feature-first expansion
  - symptom
  - payment
  - map
  - auth
  - profile
```

---

## 11. Detailed migration checklist by area

### 11.1. AdminWorkspacePage migration

#### Step 1: Tạo shell không đổi behavior

- Tạo `features/admin/AdminShell.jsx`.
- Di chuyển layout sidebar/header wrapper vào shell.
- Giữ section render cũ.
- Chạy route/admin tests.

#### Step 2: Tách overview

- Tạo `features/admin/overview/AdminOverviewSection.jsx`.
- Di chuyển UI overview ít rủi ro trước.
- Không sửa CRUD.
- Verify `/app/admin`.

#### Step 3: Tách users

- Tạo `features/admin/users`.
- Di chuyển state users vào `useAdminUsers`.
- Di chuyển table/form/dialog.
- Tách normalize/validate.
- Test users list/action.

#### Step 4: Tách từng section còn lại

Ưu tiên tách section theo độ rủi ro:

1. overview;
2. users;
3. departments;
4. facilities;
5. doctors;
6. staff;
7. subscriptions;
8. ai-configs.

Thứ tự có thể đổi theo sprint, nhưng không nên tách nhiều section trong một PR.

---

### 11.2. CSS migration

#### Step 1: Freeze global

- Thêm rule trong docs: không thêm CSS feature mới vào `global.css`.
- Reviewer chặn PR thêm class feature vào global.

#### Step 2: Tạo layer foundation

- Tách token/reset/base/typography/layout/utilities nếu có thể.
- Không đổi visual nếu chỉ move CSS.
- Chạy visual test.

#### Step 3: Tách CSS theo feature

- Admin CSS -> `features/admin/styles/admin.css` hoặc theo section.
- Patient CSS -> patient feature/shell.
- Map CSS -> map feature.
- Auth CSS -> auth feature.

#### Step 4: Dọn class chết

- Dùng grep/coverage CSS nếu có.
- Xóa từng cụm nhỏ.
- Mỗi lần xóa có visual evidence.

---

### 11.3. API standard migration

#### Step 1: Audit API calls

Tìm:

```bash
grep -R "fetch(" src
grep -R "axios" src
grep -R "\/api\/" src
```

Phân loại:

- hợp lệ trong `apiClient`;
- cần chuyển vào service;
- test/mock được phép;
- external provider phải đi backend.

#### Step 2: Chuẩn hóa errors

- Tạo `ApiError`.
- Tất cả `apiRequest` throw cùng shape.
- UI không parse raw error tùy ý.

#### Step 3: Chuẩn hóa hook state

Tạo pattern thống nhất:

```js
const state = {
  data,
  isLoading,
  error,
  isEmpty,
  refetch,
};
```

#### Step 4: Chuẩn hóa unauthorized

- 401 clear session hoặc trigger login tùy policy.
- 403 hiển thị access denied.
- Không hiển thị technical stack trace cho user.

---

### 11.4. Testing migration

#### Step 1: Unit tests cho logic thuần

Ưu tiên:

- role/access helper;
- returnTo helper;
- profile validation;
- payment status mapper;
- API normalizers;
- facility distance/filter;
- symptom answer payload builder.

#### Step 2: Integration tests cho hooks/components

Ưu tiên:

- admin users hook;
- payment result state;
- symptom question empty/error;
- auth submit handling;
- map location denied.

#### Step 3: E2E chỉ giữ critical flow

E2E không nên test mọi branch nhỏ. E2E nên tập trung:

- route smoke;
- login/access gates;
- symptom happy/error path;
- payment return/cancel;
- admin navigation;
- map basic UX;
- doctor invitation.

---

## 12. Architecture risk register

| ID | Rủi ro | Mức | Xác suất | Ảnh hưởng | Dấu hiệu | Mitigation |
| --- | --- | --- | --- | --- | --- | --- |
| ARCH-001 | Secret/provider key ở client | Critical | Medium/High | Chi phí, bảo mật, uy tín | `VITE_*KEY`, direct provider endpoint | Backend gateway, env scan CI |
| ARCH-002 | Demo y tế hiển thị như thật | Critical | Medium | Product/legal/safety | Mock records/medication production route | Demo policy, labels, feature flags |
| ARCH-003 | Admin god component gây regression | High | High | Vận hành/admin CRUD lỗi | File lớn, nhiều domain state | Tách section incremental |
| ARCH-004 | CSS global phá UI diện rộng | High | High | Visual regression | CSS global tăng, generic classes | CSS freeze, layer, visual tests |
| ARCH-005 | Hard-code env deploy sai backend | High | Medium | Downtime/data mismatch | IP trong config/env | Env validation, CI/Vercel vars |
| ARCH-006 | API error mỗi nơi một kiểu | High | High | UX xấu, khó debug | nhiều catch custom | ApiError + hook state chuẩn |
| ARCH-007 | Route/access bypass | High | Medium | Lộ chức năng private | redirect thủ công, alias sai | Route tests, access resolver central |
| ARCH-008 | Payment state không sync premium | High | Medium | Mất tiền/không cấp quyền | success provider nhưng UI chưa premium | Payment status contract, sync auth |
| ARCH-009 | E2E flaky che lỗi thật | Medium | Medium | Mất niềm tin CI | test fail không ổn định | stabilize selectors, unit coverage |
| ARCH-010 | Docs stale | Medium | High | Onboarding sai | docs khác source | docs owner, DoD, review |
| ARCH-011 | Bundle phình do import sai | Medium | Medium | Load chậm | route load nặng | lazy loading, bundle analyzer |
| ARCH-012 | PII/medical data bị log | High | Medium | Privacy risk | console.log payload | logging policy, grep CI |

---

## 13. Decision framework cho tech lead

Khi có đề xuất refactor hoặc thêm feature, tech lead nên hỏi các câu sau.

### 13.1. Câu hỏi về boundary

- Code mới thuộc feature nào?
- Có cần shared không, hay chỉ dùng trong một feature?
- Có gọi API không? Nếu có, service ở đâu?
- Có route mới không? Metadata/access ở đâu?
- Có state global không? Vì sao local state không đủ?
- Có CSS mới không? CSS đó là global hay feature?

### 13.2. Câu hỏi về risk

- Có đụng auth/payment/admin/symptom/AI không?
- Có thay đổi behavior không hay chỉ refactor?
- Có nguy cơ expose data/secret không?
- Có ảnh hưởng production demo/mock không?
- Có rollback được không?
- Có test nào bảo vệ không?

### 13.3. Câu hỏi về delivery

- PR có thể nhỏ hơn không?
- Có thể tách behavior change và refactor không?
- Có acceptance criteria rõ không?
- Có evidence lint/build/test/manual không?
- Docs nào cần cập nhật?

---

## 14. PR architecture review checklist

Reviewer dùng checklist này khi review PR có thay đổi kiến trúc, route, API, component lớn hoặc CSS.

### 14.1. Boundary checklist

- [ ] Component UI primitive không gọi API.
- [ ] Page không hard-code endpoint.
- [ ] Service không import component.
- [ ] Router không chứa business logic page-specific.
- [ ] Shared không import feature.
- [ ] Feature không import sâu feature khác nếu không có public API.
- [ ] Auth/session access qua helper/service tập trung.

### 14.2. API checklist

- [ ] Endpoint khai báo trong `endpoints.js` hoặc vị trí chuẩn.
- [ ] API call đi qua `apiRequest`/service.
- [ ] Có loading/error/empty/success state.
- [ ] 401/403 được xử lý đúng.
- [ ] Timeout/network error có fallback.
- [ ] Không log payload nhạy cảm.
- [ ] Request/response được normalize nếu cần.

### 14.3. Component checklist

- [ ] Component có trách nhiệm rõ.
- [ ] Props không quá rộng hoặc truyền nguyên object lớn nếu không cần.
- [ ] Handler naming rõ.
- [ ] Không duplicate UI đã có trong shared.
- [ ] List item có key ổn định.
- [ ] Form có label/error/disabled/loading.
- [ ] Dialog/modal có focus/accessibility.

### 14.4. CSS checklist

- [ ] Không thêm feature CSS vào global nếu không cần.
- [ ] Dùng token thay vì hard-code magic values.
- [ ] Có responsive state nếu UI public.
- [ ] Có hover/focus/disabled state.
- [ ] Không dùng class generic dễ conflict.
- [ ] Có screenshot/visual test nếu thay UI lớn.

### 14.5. Test/docs checklist

- [ ] Lint pass.
- [ ] Build pass.
- [ ] Unit/integration/E2E liên quan pass.
- [ ] Manual test evidence có route/flow rõ.
- [ ] Docs cập nhật nếu đổi route/API/auth/payment/admin/architecture.
- [ ] PR mô tả rủi ro và rollback.

---

## 15. Architecture fitness functions

Fitness function là tiêu chí đo tự động hoặc bán tự động để biết kiến trúc có đang tốt lên không.

### 15.1. File size budget

Mục tiêu:

| Loại file | Ngưỡng cảnh báo | Ngưỡng cần refactor |
| --- | ---: | ---: |
| Page component | > 500 dòng | > 800 dòng |
| Feature section | > 400 dòng | > 700 dòng |
| Hook | > 200 dòng | > 350 dòng |
| CSS feature | > 500 dòng | > 900 dòng |
| Global CSS | Không tăng | Cần giảm dần |

Có thể dùng script CI cảnh báo:

```bash
find src -name "*.jsx" -o -name "*.js" | xargs wc -l | sort -nr | head -20
find src -name "*.css" | xargs wc -l | sort -nr | head -20
```

### 15.2. Direct API call scanner

```bash
grep -R "fetch(" src --exclude="apiClient.js"
grep -R "\/api\/" src --exclude="endpoints.js"
```

Mục tiêu: không có API call trực tiếp trong page/component.

### 15.3. Secret scanner cơ bản

```bash
grep -R "VITE_.*KEY\|SECRET\|TOKEN\|ANTHROPIC\|OPENAI" src .env* vite.config.* vercel.json
```

Mục tiêu: không có provider secret trong client.

### 15.4. Mock/demo scanner

```bash
grep -R "MOCK_\|mock\|demo\|TODO.*backend" src
```

Mục tiêu: mọi mock/demo production surface có owner và policy.

### 15.5. Boundary scanner sơ bộ

Trước khi có ESLint boundary, có thể grep:

```bash
grep -R "from .*pages" src/components src/services src/router
grep -R "from .*services" src/components/ui
grep -R "from .*features" src/shared
```

Mục tiêu: phát hiện import sai layer.

---

## 16. Target metrics theo giai đoạn

### 16.1. Trong 30 ngày

| Metric | Target |
| --- | --- |
| Secret/provider direct call | Không còn ở frontend production |
| Hard-code backend IP | Không còn trong config production |
| Demo/mock inventory | Có danh sách và owner |
| AdminWorkspacePage | Bắt đầu tách ít nhất 1-2 section |
| CSS global | Freeze, không tăng thêm feature CSS |
| Route/access tests | Có baseline cho public/auth/premium/role |

### 16.2. Trong 60 ngày

| Metric | Target |
| --- | --- |
| AdminWorkspacePage | Tách phần lớn section rủi ro cao |
| API error handling | Có `ApiError`/pattern thống nhất |
| Unit tests | Có tests cho role/payment/profile/normalizers |
| CSS architecture | Token/base/layout/utilities tách rõ hơn |
| PR template | Có architecture checklist |
| ADR | Ít nhất 5 ADR quan trọng được accepted |

### 16.3. Trong 90 ngày

| Metric | Target |
| --- | --- |
| Feature-first | Admin, symptom, payment, map có structure rõ |
| Testing pyramid | Unit/integration/E2E cân bằng hơn |
| CI gates | Lint/build/test/secret scan/mock scan cơ bản |
| Docs governance | Docs update theo DoD, không stale nghiêm trọng |
| Performance | Có bundle/performance budget cơ bản |

---

## 17. Không nên làm

### 17.1. Không rewrite toàn bộ frontend

Rewrite toàn bộ thường tạo rủi ro lớn hơn lợi ích:

- mất behavior ngầm;
- phá route/access;
- tốn nhiều sprint không tạo giá trị trực tiếp;
- test không đủ bao phủ rewrite;
- business vẫn cần feature mới.

Chỉ rewrite khi module quá nhỏ hoặc không còn cách migration an toàn.

### 17.2. Không refactor nhiều vùng nhạy cảm trong một PR

Không nên có PR vừa đổi:

- auth;
- route;
- payment;
- API client;
- CSS global;
- admin logic.

PR như vậy rất khó review và rollback.

### 17.3. Không trộn refactor với redesign lớn

Nếu refactor behavior-preserving, UI không nên đổi. Nếu redesign, phải có visual evidence và acceptance riêng.

### 17.4. Không tạo shared quá sớm

Không đưa code vào shared chỉ vì “có thể dùng lại sau”. Chỉ đưa vào shared khi:

- dùng ít nhất 2 nơi;
- API ổn định;
- có naming generic đúng;
- không chứa domain logic.

### 17.5. Không tối ưu performance khi structure chưa ổn

Memoization/lazy loading nên làm đúng chỗ. Nếu state/component còn rối, tối ưu sớm có thể làm code khó hiểu hơn.

---

## 18. Ví dụ refactor kiến trúc cụ thể

### 18.1. Trước: page gọi API và render table trực tiếp

```jsx
export function AdminWorkspacePage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const result = await userApi.listUsers();
      setUsers(result.data || []);
    } catch (err) {
      setError(err.message || 'Không tải được người dùng');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      {loading ? <p>Đang tải...</p> : null}
      {error ? <p>{error}</p> : null}
      <table>{users.map((user) => <tr key={user.id}><td>{user.name}</td></tr>)}</table>
    </section>
  );
}
```

### 18.2. Sau: tách hook, table, section

```jsx
export function AdminUsersSection() {
  const {
    users,
    isLoading,
    error,
    refetch,
    updateUserStatus,
  } = useAdminUsers();

  if (isLoading) return <AdminUsersSkeleton />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!users.length) return <EmptyState title="Chưa có người dùng" />;

  return (
    <AdminUsersTable
      users={users}
      onUpdateStatus={updateUserStatus}
    />
  );
}
```

```js
export function useAdminUsers() {
  const [state, setState] = useState({
    users: [],
    isLoading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await adminUsersApi.list();
      setState({ users: normalizeUsers(response), isLoading: false, error: null });
    } catch (error) {
      setState({ users: [], isLoading: false, error: normalizeApiError(error) });
    }
  }, []);

  return {
    ...state,
    refetch,
  };
}
```

#### Lợi ích

- Page/section dễ đọc.
- Hook test được.
- Table không biết API.
- Error/loading/empty thống nhất.
- Dễ migrate sang feature-first.

---

## 19. Training notes cho developer mới

Developer mới cần hiểu những điều sau trước khi nhận task refactor:

1. Route không thêm tự do trong component; phải qua route metadata.
2. API không gọi trực tiếp trong page/component; phải qua service.
3. UI primitive không được biết business domain.
4. CSS global không phải nơi đặt mọi style mới.
5. Auth/premium/role là vùng nhạy cảm, không sửa nếu chưa đọc access flow.
6. Payment và symptom analysis phải có test/error state rõ.
7. Demo/mock y tế phải gắn nhãn và có owner.
8. Refactor không đồng nghĩa đổi behavior.
9. PR lớn khó review; chia nhỏ theo section/flow.
10. Docs phải cập nhật khi đổi route/API/auth/architecture.

---

## 20. Roadmap kiến trúc khuyến nghị

### Sprint 1: Safety freeze và audit

- Freeze global CSS growth.
- Audit direct API calls.
- Audit secret/env.
- Audit mock/demo.
- Tạo ADR draft cho AI gateway và demo policy.
- Thêm PR template architecture checklist.

### Sprint 2: P0 fixes

- Loại direct AI provider secret khỏi frontend production.
- Chuẩn hóa env production/staging/dev.
- Gắn nhãn hoặc ẩn capability demo nhạy cảm.
- Thêm route/access tests cho premium/role.

### Sprint 3: Admin split phase 1

- Tạo admin shell.
- Tách overview.
- Tách users hoặc departments.
- Thêm hook/component/model cho section đầu tiên.
- Ghi pattern để section sau follow.

### Sprint 4: API/error/loading standard

- Tạo `ApiError`.
- Tạo shared `ErrorState`, `EmptyState`, `LoadingState` nếu chưa có.
- Áp dụng cho admin section đã tách.
- Áp dụng cho payment/symptom critical states.

### Sprint 5: CSS foundation

- Tách token/base/layout/utilities.
- Document CSS rules.
- Dọn class feature khỏi global theo từng cụm.
- Chạy visual/a11y evidence.

### Sprint 6+: Feature-first expansion

- Hoàn thành admin sections.
- Tách symptom analysis.
- Tách payment.
- Tách map.
- Bổ sung unit/integration tests.

---

## 21. Kết luận

Kiến trúc hiện tại của MediMate AI Frontend có nền tốt và không cần rewrite. Các điểm mạnh như route metadata tập trung, API service theo domain, E2E baseline và docs nội bộ nên được giữ lại và làm chặt hơn. Rủi ro lớn nhất hiện nay nằm ở security/env/demo, page lớn, CSS global, chuẩn hóa API/error/loading, và thiếu boundary enforcement.

Hướng đi đúng là:

1. xử lý P0 security/product safety trước;
2. freeze các pattern xấu để nợ kỹ thuật không tăng thêm;
3. refactor incremental từng module có test;
4. chuyển dần sang feature-first;
5. biến các quyết định quan trọng thành ADR;
6. dùng CI/review/docs để giữ kiến trúc không bị phá lại.

Nếu team follow tài liệu này, repo sẽ tiến dần tới trạng thái dễ hiểu hơn, dễ maintain hơn, dễ test hơn, dễ onboarding hơn và chuyên nghiệp hơn mà không cần đánh đổi bằng một lần rewrite rủi ro cao.

---

## 22. Phụ lục: Checklist quyết định nhanh

### Khi thêm feature mới

- [ ] Feature thuộc domain nào?
- [ ] Có route mới không?
- [ ] Có endpoint mới không?
- [ ] Có cần service/hook/model riêng không?
- [ ] Có shared UI nào dùng lại được không?
- [ ] Có loading/error/empty không?
- [ ] Có test gì?
- [ ] Có docs cần cập nhật không?

### Khi refactor page lớn

- [ ] PR có behavior-preserving không?
- [ ] Có tách theo section không?
- [ ] Có test route/flow liên quan không?
- [ ] Có rollback dễ không?
- [ ] Có tránh sửa CSS rộng không?
- [ ] Có giữ public API ổn định không?

### Khi sửa API layer

- [ ] Có ảnh hưởng mọi service không?
- [ ] Có backward compatibility không?
- [ ] Có xử lý 401/403/timeout không?
- [ ] Có update tests không?
- [ ] Có thông báo cho backend team nếu contract đổi không?

### Khi sửa CSS global

- [ ] Có thật sự cần global không?
- [ ] Có dùng token không?
- [ ] Có ảnh hưởng nhiều page không?
- [ ] Có visual evidence không?
- [ ] Có thể colocate trong feature không?

### Khi release

- [ ] Không có secret client.
- [ ] Không có demo y tế gây hiểu nhầm.
- [ ] Lint/build/test pass.
- [ ] Auth/premium/role route pass.
- [ ] Payment/symptom/admin critical flow pass.
- [ ] Docs cập nhật.
- [ ] Rollback path rõ.
