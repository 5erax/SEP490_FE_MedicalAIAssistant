# 02 - Cấu trúc code và luồng hoạt động MediMate AI Frontend

> Phiên bản tài liệu: 2026-06-17  
> Đối tượng sử dụng: Frontend Developer, Reviewer, Technical Lead, QA, nhân sự mới onboarding  
> Phạm vi: React/Vite frontend MediMate AI, dựa trên tài liệu và source đã cung cấp  
> Mục tiêu: giải thích app chạy như thế nào, code nên đặt ở đâu, flow đi qua những tầng nào, và cách mở rộng/refactor mà không phá ứng dụng.

---

## 0. Cách đọc tài liệu này

Tài liệu này không chỉ mô tả cấu trúc thư mục. Đây là bản hướng dẫn vận hành kỹ thuật cho toàn bộ frontend. Khi developer sửa bug, thêm màn hình, thêm API, chỉnh route, chỉnh auth, refactor page lớn hoặc review Pull Request, cần dùng tài liệu này để trả lời các câu hỏi sau:

| Câu hỏi | Phần cần đọc |
|---|---|
| App bắt đầu chạy từ đâu? | Phần 3 - Entry point và vòng đời render |
| Route được resolve như thế nào? | Phần 4 - Routing system |
| Auth, role, premium được kiểm tra ở đâu? | Phần 5 - Access control flow |
| Khi thêm API mới cần đặt ở đâu? | Phần 7 - API layer |
| Khi component cần data thì gọi service thế nào? | Phần 7 và 9 |
| State nên đặt ở component, hook hay global? | Phần 10 - Data/state flow |
| Muốn thêm feature mới phải đi qua những bước nào? | Phần 18 - Quy trình thêm feature mới |
| Những file nào rủi ro cao khi sửa? | Phần 21 - Vùng rủi ro cao |
| Cần test gì trước khi merge? | Phần 24 - Test theo tầng |
| Developer mới nên đọc/làm gì trong 3 ngày đầu? | Phần 27 - Onboarding theo vai trò |

Nguyên tắc quan trọng: tài liệu này giúp định hướng refactor và phát triển, nhưng không thay thế kiểm thử thực tế. Mọi thay đổi vẫn phải qua lint, build, test, review và kiểm tra thủ công nếu cần.

---

## 1. Tóm tắt kiến trúc hiện tại

MediMate AI Frontend là ứng dụng React/Vite. App có nhiều capability: landing, auth, dashboard patient, symptom analysis, chat AI, map/facility, profile, payment/subscription, admin workspace, staff workspace, doctor invitation, records và medication demo.

Kiến trúc hiện tại có các điểm tốt cần giữ:

1. Route metadata được gom ở `src/router/routes.js`.
2. API layer đã có `apiClient.js`, `endpoints.js` và các domain service.
3. E2E test đã có nhiều nhóm như route, admin, payment, accessibility, visual và performance.
4. Docs nội bộ đã có nền tốt.
5. Một số UI/components đã được chia theo module.

Tuy nhiên, source cũng có các điểm cần kiểm soát:

1. Một số page quá lớn, đặc biệt `AdminWorkspacePage.jsx`.
2. CSS toàn cục quá lớn, đặc biệt `global.css`.
3. Có capability demo/mock cần quản trị chặt để không gây hiểu nhầm.
4. Có rủi ro provider key/API secret ở client nếu dùng `VITE_*` cho secret.
5. Cấu hình backend/env có dấu hiệu hard-code.
6. State và logic nghiệp vụ ở một số page còn tập trung quá nhiều.

Kiến trúc mục tiêu không phải viết lại toàn bộ. Mục tiêu đúng là refactor dần theo nguyên tắc:

```txt
Không phá route.
Không phá auth.
Không phá API contract.
Không phá UX hiện có.
Không refactor lớn khi chưa có test bảo vệ.
Tách dần page lớn thành feature module, hook, service và component nhỏ.
```

---

## 2. Sơ đồ luồng tổng quát

Luồng xử lý chuẩn từ người dùng đến backend và ngược lại:

```txt
User action
  -> UI component
  -> Page hoặc feature hook
  -> Domain service
  -> ENDPOINTS
  -> apiRequest()
  -> Backend API
  -> response/error normalization
  -> hook/page state update
  -> UI render loading/error/empty/success
```

Luồng route/render cấp cao:

```txt
index.html
  -> src/main.jsx
  -> React root
  -> SpaRoot
  -> App
  -> resolveRoute(pathname)
  -> resolveRouteAccess(route, auth, requestedPath)
  -> render page/layout/shell
```

Luồng access cấp cao:

```txt
Requested path
  -> resolve route metadata
  -> check access type
  -> if public: allow
  -> if auth and unauthenticated: redirect login with returnTo
  -> if premium and no premium: redirect pricing with returnTo
  -> if role and wrong role: redirect workspace
  -> if profile setup required: redirect setup/profile flow
  -> else: render page
```

Luồng API chuẩn:

```txt
Page/Hook
  -> authApi / userApi / symptomAnalysisApi / facilityApi / paymentApi / ...
  -> apiRequest(endpoint, options)
  -> attach auth header if needed
  -> parse JSON
  -> normalize error
  -> return typed/normalized data to UI boundary
```

---

## 3. Cấu trúc thư mục hiện tại

Cấu trúc chính quan sát được:

```txt
src/
├── App.jsx
├── SpaRoot.jsx
├── main.jsx
├── index.css
├── components/
│   ├── adminAIConfigs/
│   ├── adminDoctors/
│   ├── adminSubscriptions/
│   ├── feedback/
│   ├── landing/
│   ├── landingChat/
│   ├── medicalAssistant/
│   ├── patient/
│   ├── preferences/
│   ├── ui/
│   └── workspace/
├── pages/
├── router/
├── services/
├── state/
├── styles/
└── utils/

tests/e2e/
docs/
dist/
playwright-report/
test-results/
```

### 3.1. Vai trò từng thư mục

| Khu vực | Vai trò đúng | Không nên chứa | Ví dụ việc nên làm |
|---|---|---|---|
| `src/main.jsx` | Bootstrap React app | API call, auth logic, business logic | Mount root, import CSS nền |
| `src/SpaRoot.jsx` | Quản lý subscription location, SPA re-render, scroll/hash behavior | Logic nghiệp vụ page | Sửa behavior back/forward/hash |
| `src/App.jsx` | Resolve route và render page tương ứng | Form logic, API logic, state dài | Thêm case route mới |
| `src/router/` | Route metadata, navigation, access control | UI detail của page | Thêm route, role gate, navigation model |
| `src/services/` | API client, endpoint, domain service | JSX/UI copy dài, component state | Thêm service cho domain mới |
| `src/pages/` | Page-level composition | Logic quá dài, nhiều modal/table/form trong cùng file | Compose section/hook/component |
| `src/components/` | UI component dùng chung hoặc theo module | API call trực tiếp trong primitive | Shared button, modal, landing section |
| `src/state/` | State dùng chung nhẹ | Store lớn không kiểm soát | Theme/display preference, session UI preference |
| `src/styles/` | CSS token, global, layout, feature style | Style rác không owner | Token, shell, admin/user workspace CSS |
| `src/utils/` | Helper thuần, normalize, role/profile helper | Code phụ thuộc DOM/UI nếu không cần | formatDate, parseJwt, role helper |

### 3.2. Quy tắc đặt code hiện tại

Khi thêm code mới, developer phải tự hỏi:

1. Code này có render UI không?
   - Có: đặt trong `components/`, `pages/` hoặc feature component.
   - Không: xét `services/`, `utils/`, `state/`.

2. Code này có gọi API không?
   - Có: phải đi qua `src/services/`.
   - Không gọi API trực tiếp trong page/component, trừ khi đang sửa code legacy và đã có task refactor rõ.

3. Code này có route/path không?
   - Có: phải cập nhật `src/router/routes.js`.

4. Code này là logic tái sử dụng giữa nhiều component?
   - Có: đưa vào hook hoặc utility.

5. Code này chỉ phục vụ một feature?
   - Có: đặt gần feature đó, không đưa vào shared quá sớm.

---

## 4. Cấu trúc thư mục mục tiêu

Hiện tại repo vẫn có cấu trúc theo `pages/components/services`. Điều này chấp nhận được ở MVP, nhưng khi app lớn hơn nên chuyển dần sang feature-first cho các module phức tạp.

### 4.1. Target structure đề xuất

```txt
src/
├── app/
│   ├── App.jsx
│   ├── SpaRoot.jsx
│   ├── providers/
│   └── bootstrap/
├── router/
│   ├── routes.js
│   ├── access.js
│   ├── navigation.js
│   ├── returnIntent.js
│   └── routeGuards.test.js
├── services/
│   ├── apiClient.js
│   ├── endpoints.js
│   ├── errors.js
│   ├── auth/
│   ├── symptom-analysis/
│   ├── facilities/
│   ├── payments/
│   └── admin/
├── features/
│   ├── auth/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.js
│   ├── symptom-analysis/
│   ├── map/
│   ├── payment/
│   ├── admin/
│   ├── staff/
│   ├── patient-profile/
│   └── doctor-invitation/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── feedback/
│   └── shared/
├── hooks/
├── utils/
├── state/
├── styles/
└── assets/
```

### 4.2. Quy tắc migration sang feature-first

Không chuyển toàn bộ trong một PR. Migration đúng nên theo từng feature:

```txt
Bước 1: Chọn feature có ranh giới rõ.
Bước 2: Tạo thư mục features/<feature-name>/.
Bước 3: Di chuyển component nhỏ trước, giữ export tương thích.
Bước 4: Tách hook xử lý state/API.
Bước 5: Di chuyển page cuối cùng.
Bước 6: Cập nhật import.
Bước 7: Chạy lint/build/test liên quan.
Bước 8: Cập nhật docs.
```

Ví dụ migration admin:

```txt
src/pages/AdminWorkspacePage.jsx
  -> src/features/admin/AdminWorkspacePage.jsx
  -> src/features/admin/sections/users/AdminUsersSection.jsx
  -> src/features/admin/sections/doctors/AdminDoctorsSection.jsx
  -> src/features/admin/sections/facilities/AdminFacilitiesSection.jsx
  -> src/features/admin/hooks/useAdminUsers.js
  -> src/features/admin/hooks/useAdminDoctors.js
  -> src/features/admin/api/adminUsersService.js hoặc dùng services domain hiện có
```

### 4.3. Nguyên tắc giữ backward compatibility khi di chuyển file

Trong giai đoạn migration, có thể dùng file re-export để tránh sửa import quá rộng:

```js
// src/pages/AdminWorkspacePage.jsx
export { default } from "../features/admin/AdminWorkspacePage";
```

Khi codebase đã ổn định, xóa file bridge ở PR riêng.

### 4.4. Rủi ro migration thư mục

| Rủi ro | Cách giảm thiểu |
|---|---|
| Import path sai | Dùng lint/build, search toàn repo |
| Circular dependency | Không cho feature import ngược page cũ |
| Snapshot/visual thay đổi | Chạy visual/a11y nếu UI bị ảnh hưởng |
| Test selector gãy | Không đổi DOM/test id trong PR di chuyển file |
| PR quá lớn khó review | Mỗi PR chỉ một feature hoặc một section |

---

## 5. Entry point và vòng đời render

### 5.1. `index.html`

`index.html` là HTML shell do Vite dùng. File này thường chỉ nên chứa:

- root element để React mount;
- metadata cơ bản;
- link favicon/icon nếu có;
- script entry do Vite inject.

Không nên đặt business script, tracking script chưa kiểm duyệt hoặc secret/config nhạy cảm trực tiếp tại đây.

### 5.2. `src/main.jsx`

Vai trò:

1. Import CSS nền.
2. Render React root.
3. Kết nối `SpaRoot` vào DOM.
4. Cài navigation handler nếu app đang dùng custom SPA navigation.

Code minh họa đúng:

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import SpaRoot from "./SpaRoot";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SpaRoot />
  </React.StrictMode>
);
```

Không nên làm:

```jsx
// Không đặt API call ở main.jsx
fetch("/api/me").then(...);

// Không đọc route rồi tự render nhiều page tại đây
if (window.location.pathname === "/admin") {
  renderAdmin();
}
```

Checklist khi sửa `main.jsx`:

- [ ] App vẫn mount được.
- [ ] Console không có lỗi root duplicated.
- [ ] React StrictMode vẫn hoạt động nếu đang dùng.
- [ ] Không thêm business logic.
- [ ] Build production pass.

### 5.3. `src/SpaRoot.jsx`

`SpaRoot` quản lý việc app phản ứng với thay đổi URL. Theo tài liệu gốc, file này dùng `useSyncExternalStore` để subscribe location snapshot và render `<App key={location} />`. Nó cũng xử lý scroll khi location/hash đổi và dùng ViewTransition nếu có.

Vai trò đúng:

```txt
History API event
  -> location snapshot changed
  -> SpaRoot re-render
  -> App resolve route mới
  -> page tương ứng được render
```

Không nên đặt tại đây:

- logic login/logout;
- kiểm tra premium;
- fetch dữ liệu page;
- render fallback theo role;
- business decision.

Rủi ro khi sửa:

1. Browser back/forward không hoạt động.
2. Link nội bộ click không đổi page.
3. Hash anchor không scroll đúng.
4. ViewTransition gây lỗi ở browser không hỗ trợ.
5. App re-render quá nhiều vì key không ổn định.

Checklist kiểm tra `SpaRoot.jsx`:

- [ ] Click link từ landing sang login hoạt động.
- [ ] Click link từ dashboard sang symptom hoạt động.
- [ ] Back/forward browser hoạt động.
- [ ] Route có hash scroll đúng vị trí.
- [ ] Unknown route vẫn render Not Found.
- [ ] Không có memory leak event listener.
- [ ] Không có loop render khi route không đổi.

### 5.4. `src/App.jsx`

`App.jsx` là điểm điều phối route cấp cao. Tài liệu gốc mô tả `App.jsx` đang làm các việc:

- lấy `window.location.pathname`;
- resolve route từ `router/routes.js`;
- set `document.title`;
- canonicalize alias path;
- check access bằng `resolveRouteAccess`;
- redirect nếu cần;
- switch theo `route.id` để render page.

Nguyên tắc:

```txt
App.jsx = route resolver + page dispatcher.
App.jsx không phải nơi chứa business logic.
App.jsx không phải nơi gọi API.
App.jsx không phải nơi quản lý form/page state.
```

Ví dụ đúng khi thêm page:

```jsx
import NewFeaturePage from "./pages/NewFeaturePage";

function renderRoute(route) {
  switch (route.id) {
    case "patient.newFeature":
      return <NewFeaturePage />;
    default:
      return <NotFoundPage />;
  }
}
```

Ví dụ sai:

```jsx
case "patient.newFeature": {
  const [items, setItems] = useState([]); // Sai: hook trong switch và logic page ở App
  useEffect(() => {
    fetch("/api/items").then(...); // Sai: fetch trực tiếp ở App
  }, []);
  return <div>{items.map(...)}</div>;
}
```

Checklist khi sửa `App.jsx`:

- [ ] Không thêm API call.
- [ ] Không thêm form state.
- [ ] Không thêm logic nghiệp vụ.
- [ ] Route mới có metadata trong `routes.js`.
- [ ] Route mới có page/component riêng.
- [ ] Access check vẫn đi qua `resolveRouteAccess`.
- [ ] Alias/canonical path không tạo redirect loop.
- [ ] `document.title` đúng.
- [ ] Test route liên quan pass.

---

## 6. Routing system

### 6.1. Vai trò của `src/router/routes.js`

`routes.js` là route registry. Đây là nơi khai báo đường dẫn, title, access level, role, shell, navigation và alias. Việc route metadata tập trung là điểm mạnh của repo và phải giữ.

Một route chuẩn nên có các field:

| Field | Bắt buộc? | Ý nghĩa |
|---|---:|---|
| `id` | Có | Định danh route ổn định, dùng trong App/test/navigation |
| `path` | Có | URL canonical |
| `title` | Có | `document.title` |
| `access` | Có | `public`, `auth`, `premium`, `role` |
| `roles` | Nếu access là `role` | Danh sách role được phép |
| `shell` | Nếu route thuộc workspace | Layout shell liên quan |
| `navigation` | Nếu hiện menu | Label/icon/order/mobile/hint |
| `aliases` | Nếu cần | Backward compatibility hoặc UX redirect |
| `profileSetup` | Nếu cần | Điều kiện setup hồ sơ |

Ví dụ route tốt:

```js
{
  id: "patient.symptom",
  path: "/symptom",
  title: "Phân tích triệu chứng | MediMate AI",
  access: "auth",
  shell: "patient",
  navigation: {
    shell: "patient",
    label: "Triệu chứng",
    hint: "Mô tả và trả lời câu hỏi lâm sàng",
    icon: "activity",
    order: 20,
    mobile: true,
  },
}
```

Ví dụ route không nên có:

```js
{
  path: "/new-page",
  component: "NewPage",
}
```

Lý do không tốt:

- thiếu `id` nên test/navigation khó ổn định;
- thiếu `title`;
- thiếu `access` nên dễ public nhầm;
- không rõ có hiện menu không;
- khó review.

### 6.2. Access levels

| Access | Ý nghĩa | Ví dụ | Quy tắc review |
|---|---|---|---|
| `public` | Ai cũng truy cập được | `/`, `/map`, `/pricing` | Không hiển thị dữ liệu cá nhân |
| `auth` | Cần đăng nhập | `/dashboard`, `/symptom`, `/profile` | Chưa login phải về login có returnTo |
| `premium` | Cần quyền premium | `/chat`, `/records`, `/medication` | Không premium phải về pricing có returnTo |
| `role` | Cần role cụ thể | `/app/admin`, `/app/staff` | Sai role phải bị redirect đúng workspace |

Không được dùng `public` cho route chứa:

- dữ liệu hồ sơ người dùng;
- kết quả triệu chứng cá nhân;
- payment/session cá nhân;
- admin/staff operation;
- medication/record cá nhân;
- token invitation nhạy cảm nếu không có validate rõ.

### 6.3. Admin route generation

Admin route được generate từ `ADMIN_SECTIONS`. Đây là pattern tốt vì admin route không bị lặp thủ công.

Danh sách section quan sát từ tài liệu gốc:

```txt
overview
users
doctors
ai-configs
subscriptions
staff
departments
facilities
```

Khi thêm section admin mới, phải cập nhật đồng bộ:

1. `ADMIN_SECTIONS`.
2. `ADMIN_SECTION_TITLES`.
3. `ADMIN_SECTION_NAVIGATION`.
4. Handler/render section trong admin workspace.
5. Permission nếu section cần role nhỏ hơn admin.
6. Test navigation admin.
7. Docs admin nếu là capability mới.

Ví dụ thêm section `reports`:

```js
export const ADMIN_SECTIONS = [
  "overview",
  "users",
  "doctors",
  "reports",
];

export const ADMIN_SECTION_TITLES = {
  reports: "Báo cáo hệ thống",
};

export const ADMIN_SECTION_NAVIGATION = {
  reports: {
    label: "Báo cáo",
    icon: "chart",
    order: 90,
  },
};
```

Checklist:

- [ ] `/app/admin/reports` render đúng.
- [ ] `/admin/reports` alias nếu cần vẫn redirect/canonical đúng.
- [ ] Staff/patient không vào được.
- [ ] Navigation active state đúng.
- [ ] Refresh trực tiếp URL không lỗi.
- [ ] Unknown section hiển thị fallback hợp lý hoặc Not Found.

### 6.4. Alias và canonical path

Alias dùng cho backward compatibility hoặc UX, không dùng để tạo nhiều đường đi tùy tiện.

Ví dụ alias quan sát:

| Alias | Canonical | Lý do có thể có |
|---|---|---|
| `/account` | `/dashboard` | Đường cũ hoặc UX shortcut |
| `/app/patient` | `/dashboard` | Workspace shortcut |
| `/admin` | `/app/admin` | Đường ngắn |
| `/admin/users` | `/app/admin/users` | Đường cũ/shortcut |
| `/staff-register` | `/staff/register` | Backward compatibility |

Quy tắc alias:

1. Alias không được bypass access.
2. Alias không được redirect loop.
3. Alias phải có test nếu dùng trong production hoặc đã public.
4. Không tạo alias chỉ vì developer thích URL khác.
5. Khi bỏ alias, phải có migration note.

### 6.5. Quy trình thêm route mới

```txt
Bước 1: Xác định capability và access level.
Bước 2: Tạo page hoặc feature page.
Bước 3: Thêm metadata vào routes.js.
Bước 4: Nếu route có menu, thêm navigation metadata.
Bước 5: Nếu cần shell, gắn đúng shell.
Bước 6: Import page trong App.jsx.
Bước 7: Thêm case render trong App.jsx.
Bước 8: Test direct URL, navigation link, refresh, back/forward.
Bước 9: Test access chưa login/sai role/chưa premium.
Bước 10: Cập nhật docs nếu route là capability mới.
```

Ví dụ checklist PR:

```md
## Route added
- [ ] Route metadata added in `src/router/routes.js`
- [ ] Page rendered from `src/App.jsx`
- [ ] Access level reviewed
- [ ] Navigation metadata reviewed
- [ ] Direct URL works
- [ ] Refresh works
- [ ] Back/forward works
- [ ] Unknown sibling route handled
- [ ] E2E route manifest updated
- [ ] Docs updated
```

---

## 7. Navigation system

### 7.1. Custom SPA navigation

Repo không dùng React Router truyền thống theo tài liệu gốc. Dự án dùng navigation helper riêng dựa trên History API và custom event `medimate:navigation`.

Các helper chính:

- `getLocationSnapshot()`;
- `subscribeToLocation(callback)`;
- `navigate(path, options)`;
- `replaceRoute(path, options)`;
- `installLinkNavigation()`.

Luồng click link nội bộ:

```txt
User click <a href="/dashboard">
  -> installLinkNavigation intercept nếu là internal link hợp lệ
  -> navigate('/dashboard')
  -> history.pushState
  -> dispatch medimate:navigation
  -> SpaRoot nhận location mới
  -> App re-render route mới
```

### 7.2. Khi nào dùng `navigate()`

Dùng `navigate()` khi:

- chuyển page sau login/register;
- chuyển tới pricing khi thiếu premium;
- chuyển route nội bộ từ button/CTA;
- điều hướng trong wizard/form sau submit;
- redirect sau create/update/delete thành công.

Ví dụ:

```js
import { navigate } from "../router/navigation";

function handleDone() {
  navigate("/dashboard");
}
```

Không nên:

```js
window.location.href = "/dashboard";
```

Vì `window.location.href` reload toàn trang, mất SPA state, có thể làm UX chậm và gây lỗi test. Chỉ dùng khi cố ý rời khỏi app hoặc reload bắt buộc.

### 7.3. Khi nào dùng `replaceRoute()`

Dùng `replaceRoute()` khi:

- canonicalize alias;
- redirect từ auth guard;
- redirect từ profile setup guard;
- không muốn người dùng back về route trung gian.

Ví dụ:

```js
replaceRoute("/login?returnTo=/symptom");
```

### 7.4. Checklist navigation

- [ ] Link nội bộ dùng `href` hợp lệ hoặc `navigate()`.
- [ ] Không dùng `window.location.href` tùy tiện.
- [ ] Button điều hướng có type đúng, không submit form ngoài ý muốn.
- [ ] Back/forward hoạt động.
- [ ] Refresh trực tiếp URL hoạt động.
- [ ] Hash anchor hoạt động nếu page có section.
- [ ] Canonical alias không làm mất query cần thiết.
- [ ] ReturnTo được encode an toàn.

---

## 8. Access control flow

### 8.1. Trung tâm kiểm soát access

Access control nằm ở `src/router/access.js` với function `resolveRouteAccess(route, auth, requestedPath)`. Đây phải là nơi quyết định route có được render hay không.

Không nên rải logic như sau trong nhiều page:

```jsx
if (!user) return <LoginPage />;
if (role !== "admin") return <DashboardPage />;
```

Lý do:

- dễ tạo rule không nhất quán;
- khó test;
- route direct URL có thể khác navigation click;
- dễ bypass role/premium.

### 8.2. Access decision tree

```txt
Input: route, auth, requestedPath

1. Nếu route không tồn tại:
   -> Not Found

2. Nếu route.access = public:
   -> allow

3. Nếu route.access = auth/premium/role mà auth không hợp lệ:
   -> redirect /login?returnTo=<requestedPath>

4. Nếu route yêu cầu profile setup:
   -> nếu chưa setup -> redirect setup/profile route

5. Nếu route.access = premium:
   -> nếu không có premium -> redirect /pricing?returnTo=<requestedPath>

6. Nếu route.access = role:
   -> nếu role không thuộc allowed roles -> redirect workspace phù hợp

7. Nếu pass tất cả:
   -> allow
```

### 8.3. Auth object cần có gì

Auth object lưu ở client thường cần các field tối thiểu:

| Field | Mục đích |
|---|---|
| `accessToken` | Gửi Authorization header |
| `refreshToken` nếu có | Refresh session nếu backend hỗ trợ |
| `user` hoặc user fields | Hiển thị user và xác định profile |
| `role` | Route role gate |
| `premium/subscription` | Premium gate |
| `expiresAt` hoặc JWT exp | Hết hạn session |

Không lưu:

- provider secret;
- password;
- thông tin nhạy cảm không cần thiết;
- dữ liệu y tế chi tiết nếu không cần cache;
- toàn bộ API response không chọn lọc.

### 8.4. ReturnTo

ReturnTo giúp sau login/pricing user quay lại route ban đầu.

Ví dụ:

```txt
User vào /symptom khi chưa login
  -> redirect /login?returnTo=%2Fsymptom
  -> login success
  -> navigate('/symptom')
```

Quy tắc:

- returnTo chỉ nên chấp nhận internal path;
- không redirect tới domain ngoài;
- encode/decode đúng;
- giữ query nếu query có nghiệp vụ;
- tránh returnTo tới chính `/login` gây loop.

### 8.5. Role gate

Ví dụ rule:

| Role | Workspace mặc định | Route được phép |
|---|---|---|
| Patient/User | `/dashboard` | patient/auth/premium routes |
| Staff | `/app/staff` | staff workspace |
| Admin | `/app/admin` | admin workspace |
| Doctor nếu có | route doctor tương ứng | doctor workspace nếu sản phẩm có |

Rủi ro:

- user role string từ backend không đồng nhất chữ hoa/thường;
- role mới backend trả về nhưng frontend chưa biết;
- staff vào được admin do check lỏng;
- admin bị redirect về dashboard do thiếu normalize role.

Cách xử lý:

```js
export function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}
```

### 8.6. Premium gate

Route premium như chat, records, medication phải kiểm tra quyền premium. Nếu quyền premium dựa trên subscription từ auth cache, cần có cơ chế refresh sau payment.

Edge cases cần test:

- user vừa thanh toán xong nhưng auth cache chưa cập nhật;
- subscription expired;
- backend trả pending;
- user có trial;
- admin/staff có quyền bypass hay không cần policy rõ;
- premium false nhưng route vẫn render vì stale state.

### 8.7. Checklist access control

- [ ] Chưa login vào route `auth` phải về login.
- [ ] Chưa login vào route `premium` phải về login trước, không về pricing trước nếu pricing yêu cầu auth cho checkout.
- [ ] Login xong quay lại đúng returnTo.
- [ ] User thường không vào được admin.
- [ ] Staff không vào được admin nếu policy không cho.
- [ ] Admin vào admin refresh URL vẫn được.
- [ ] Không premium vào premium route phải về pricing.
- [ ] Thanh toán xong premium state được refresh hoặc route handle pending.
- [ ] Profile setup redirect không loop.
- [ ] Logout clear session và route protected bị chặn.

---

## 9. API layer

### 9.1. Mục tiêu của API layer

API layer phải giải quyết các vấn đề sau:

1. Không để component/page gọi `fetch` trực tiếp.
2. Không hard-code endpoint ở UI.
3. Chuẩn hóa Authorization header.
4. Chuẩn hóa timeout/retry/401.
5. Chuẩn hóa parse response.
6. Chuẩn hóa error object.
7. Cho phép backend đổi base URL theo môi trường.
8. Cho phép test bằng mock service/API fixture.

Luồng chuẩn:

```txt
Component/Page
  -> Feature hook
  -> Domain service
  -> ENDPOINTS
  -> apiRequest()
  -> Backend
```

### 9.2. `src/services/apiClient.js`

Trách nhiệm đúng:

| Trách nhiệm | Mô tả |
|---|---|
| Build URL | Ghép base URL và endpoint đúng |
| Auth header | Gắn `Authorization: Bearer <token>` khi `auth: true` |
| Token expiration | Decode/check exp nếu đang dùng JWT |
| Body serialization | JSON stringify body object |
| Response parsing | Parse JSON/text an toàn |
| Error normalization | Trả error có shape thống nhất |
| 401 handling | Clear auth/redirect/event nếu cần |
| Pagination helper | `withPagination()` nếu có |

Không nên chứa:

- endpoint domain cụ thể;
- copy tiếng Việt của UI;
- rule ranking facility;
- rule symptom/question;
- logic payment status riêng;
- mock data;
- AI provider secret.

### 9.3. Shape chuẩn cho API error

Đề xuất chuẩn hóa error object:

```js
export class ApiError extends Error {
  constructor({ message, status, code, details, requestId, raw }) {
    super(message || "Đã xảy ra lỗi.");
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.raw = raw;
  }
}
```

UI chỉ nên phụ thuộc vào field ổn định:

```js
try {
  const result = await symptomAnalysisApi.suggestClinicalQuestions(input);
} catch (error) {
  setError(getUserFriendlyApiMessage(error));
}
```

Không nên hiển thị raw backend error trực tiếp nếu có thể chứa thông tin nhạy cảm hoặc quá kỹ thuật.

### 9.4. `src/services/endpoints.js`

Endpoint phải được quản lý tập trung.

Ví dụ tốt:

```js
export const ENDPOINTS = {
  SYMPTOM_ANALYSIS: {
    SUGGEST_QUESTIONS: "/api/symptom-analysis/suggest-clinical-questions",
    SUBMIT_ANSWERS: "/api/symptom-analysis/submit-clinical-question-answers",
  },
};
```

Service dùng:

```js
apiRequest(ENDPOINTS.SYMPTOM_ANALYSIS.SUGGEST_QUESTIONS, {
  method: "POST",
  body: { userInput },
  auth: true,
});
```

Không làm:

```js
apiRequest("/api/symptom-analysis/suggest-clinical-questions", ...);
fetch("http://52.x.x.x:8080/api/...");
```

### 9.5. Domain service

Domain service là adapter giữa backend contract và frontend UI.

Ví dụ chuẩn:

```js
import { apiRequest } from "../apiClient";
import { ENDPOINTS } from "../endpoints";

export const symptomAnalysisApi = {
  async suggestClinicalQuestions(userInput) {
    const response = await apiRequest(
      ENDPOINTS.SYMPTOM_ANALYSIS.SUGGEST_QUESTIONS,
      {
        method: "POST",
        body: { userInput },
        auth: true,
      }
    );

    return normalizeSuggestQuestionsResponse(response);
  },
};

function normalizeSuggestQuestionsResponse(response) {
  return {
    sessionId: response?.data?.sessionId ?? null,
    questions: Array.isArray(response?.data?.questions)
      ? response.data.questions
      : [],
  };
}
```

Lý do normalize ở service:

- UI không cần biết backend bọc `data` thế nào;
- nếu backend đổi shape, sửa một nơi;
- test dễ hơn;
- giảm `?.` rải rác trong component.

### 9.6. Quy tắc service naming

| Loại service | Tên đề xuất | Ví dụ |
|---|---|---|
| Auth | `authApi` | `authApi.login()` |
| User | `usersApi` hoặc `userApi` | `usersApi.list()` |
| Patient profile | `patientProfilesApi` | `patientProfilesApi.update()` |
| Symptom analysis | `symptomAnalysisApi` | `symptomAnalysisApi.submitAnswers()` |
| Facility | `facilitiesApi` | `facilitiesApi.listActive()` |
| Payment | `paymentsApi` | `paymentsApi.getPayOsStatus()` |
| Subscription plan | `subscriptionPlansApi` | `subscriptionPlansApi.listActive()` |
| Admin AI configs | `aiConfigsApi` | `aiConfigsApi.update()` |

Không nên dùng tên mơ hồ:

```txt
api.doThing()
service.submit()
helper.fetchData()
requestApi.call()
```

### 9.7. Timeout

Nếu `apiClient.js` chưa có timeout, nên bổ sung bằng `AbortController`.

Ví dụ:

```js
export async function apiRequest(endpoint, options = {}) {
  const timeoutMs = options.timeoutMs ?? 30000;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildUrl(endpoint), {
      ...options,
      signal: controller.signal,
    });

    return await parseApiResponse(response);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiError({
        message: "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.",
        code: "TIMEOUT",
      });
    }
    throw normalizeNetworkError(error);
  } finally {
    window.clearTimeout(timeoutId);
  }
}
```

Quy tắc:

- timeout mặc định phải hợp lý;
- một số endpoint AI/phân tích có thể cần timeout dài hơn nhưng phải có loading rõ;
- không retry POST tạo payment nếu không idempotent;
- không retry vô hạn.

### 9.8. Retry

Chỉ retry tự động với request an toàn:

| Request | Retry tự động? | Ghi chú |
|---|---:|---|
| `GET` danh sách | Có thể | 1-2 lần nếu network/5xx |
| `GET` detail | Có thể | nếu không gây side effect |
| `POST` login | Không nên | tránh gửi lặp vô ích |
| `POST` payment checkout | Không | rủi ro tạo order lặp |
| `POST` submit medical answers | Cẩn trọng | chỉ retry nếu backend idempotency hỗ trợ |
| `PUT/PATCH` update form | Không mặc định | user có thể bấm lại |
| `DELETE` | Không mặc định | tránh xóa lặp/khó hiểu |

### 9.9. Unauthorized handling

Khi API trả 401:

1. Clear stored auth nếu token hết hạn/không hợp lệ.
2. Clear session cache liên quan nếu cần.
3. Emit event hoặc navigate login có returnTo.
4. Không hiển thị nhiều toast cùng lúc nếu nhiều API cùng 401.
5. Không retry 401 bằng cùng token.

Pseudo-flow:

```txt
API returns 401
  -> apiClient normalize ApiError(status=401)
  -> if request requires auth:
       clearStoredAuth()
       notify session expired once
       redirect login with returnTo
```

### 9.10. Checklist API layer khi thêm endpoint

- [ ] Endpoint được khai báo trong `endpoints.js`.
- [ ] Có domain service riêng.
- [ ] Không gọi fetch trực tiếp trong component/page.
- [ ] Request body được normalize trước khi gửi.
- [ ] Response được normalize trước khi trả cho UI.
- [ ] Error được handle bằng helper chuẩn.
- [ ] Loading/error/empty/success state có UI.
- [ ] Auth header đúng nếu endpoint protected.
- [ ] Timeout phù hợp.
- [ ] Không retry request có side effect nếu không an toàn.
- [ ] Có test hoặc mock fixture nếu flow quan trọng.
- [ ] Docs/API contract cập nhật nếu endpoint mới.

---

## 10. Auth/session flow

### 10.1. Login/register flow

Luồng chuẩn:

```txt
AuthPages.jsx hoặc feature auth page
  -> validate form client-side
  -> authApi.login/register/googleLogin
  -> normalize auth response
  -> setStoredAuth(selectStoredAuth(auth))
  -> resolve post-login destination
  -> navigate/replaceRoute(destination)
```

### 10.2. Login không nên làm gì

Không nên:

```jsx
const response = await fetch("/api/auth/login", ...);
localStorage.setItem("token", response.token);
window.location.href = "/dashboard";
```

Vấn đề:

- bypass service;
- token key không nhất quán;
- không normalize role/premium;
- reload app;
- không xử lý returnTo;
- khó test.

### 10.3. Google OAuth

Vì app có dùng `@react-oauth/google`, cần tách rõ:

```txt
Google client id = public config được phép ở frontend.
Google client secret = không bao giờ ở frontend.
Provider API secret = không bao giờ ở frontend.
```

Checklist:

- [ ] Env `VITE_GOOGLE_CLIENT_ID` không phải secret.
- [ ] Không có Google client secret trong source.
- [ ] OAuth response gửi về backend để verify nếu cần.
- [ ] Error OAuth có UI rõ.
- [ ] ReturnTo sau Google login hoạt động.

### 10.4. Stored auth

Nên có một wrapper duy nhất:

```js
getStoredAuth()
setStoredAuth(auth)
clearStoredAuth()
hasPremiumAccess(auth)
```

Không nên rải:

```js
localStorage.getItem("token")
localStorage.getItem("user")
localStorage.setItem("access_token", ...)
```

### 10.5. Logout flow

Luồng chuẩn:

```txt
User click logout
  -> logoutService.logout()
  -> try authApi.logout()
  -> finally clearStoredAuth + clear session cache
  -> replaceRoute('/login') hoặc landing
```

Quy tắc:

- logout phải clear client session dù API logout fail;
- không để token cũ còn trong localStorage;
- không để sessionStorage chứa dữ liệu flow y tế;
- sau logout vào dashboard phải bị chặn.

### 10.6. Token expiration

Nếu JWT có `exp`, client có thể check để chủ động logout. Nhưng backend vẫn là nguồn xác thực cuối cùng.

Rủi ro:

- đồng hồ máy user sai;
- JWT không có exp;
- backend revoke token nhưng client chưa biết;
- token refresh chưa hỗ trợ.

Cách xử lý:

- dùng check exp như guard UX;
- 401 từ backend vẫn phải clear session;
- không assume token valid chỉ vì client decode được.

---

## 11. Data/state flow

### 11.1. Phân loại state

| Loại state | Nơi đặt | Ví dụ | Có persist không? |
|---|---|---|---|
| UI state cục bộ | Component/page | modal open, tab active, form field | Không |
| Data loading state | Feature hook/page | users list, symptom questions | Không hoặc cache ngắn |
| Auth state | API client/auth service | token, role, user summary | Có, nhưng chọn lọc |
| Preference state | `src/state/` | theme, display preferences | Có thể |
| Cross-feature state | context/store có kiểm soát | current user, subscription | Có thể |
| Backend source of truth | Backend API | records, payments, admin CRUD | Không tự coi client là nguồn thật |

### 11.2. Local state nên đặt ở đâu

Đặt trong component nếu:

- chỉ dùng trong component đó;
- không cần chia sẻ;
- reset khi unmount là đúng;
- không liên quan route/auth.

Ví dụ:

```jsx
function SearchBox({ onSearch }) {
  const [keyword, setKeyword] = useState("");
  return (...);
}
```

### 11.3. Page state nên đặt ở đâu

Đặt trong page hoặc hook nếu:

- state thuộc flow của page;
- có loading/error/data;
- có nhiều handler;
- cần gọi API.

Tốt hơn nên tách hook:

```jsx
function SymptomAnalysisPage() {
  const {
    input,
    setInput,
    questions,
    loading,
    error,
    submitInput,
    submitAnswers,
  } = useSymptomAnalysisFlow();

  return <SymptomAnalysisView ... />;
}
```

### 11.4. Global state chỉ dùng khi cần

Không đưa mọi thứ vào global store/context. Global state dễ gây render rộng và khó debug.

Chỉ đưa global nếu:

- nhiều route cần cùng dữ liệu;
- dữ liệu thay đổi ở một nơi và nhiều nơi cần phản ứng;
- cần persist qua navigation;
- có policy update/clear rõ.

Ví dụ nên global/context:

- auth summary;
- display preferences;
- subscription status nếu nhiều route cần;
- notification/toast queue nếu có.

Ví dụ không nên global:

- input form symptom tạm thời;
- modal open của một page;
- table sorting chỉ trong admin users;
- map selected marker chỉ trong map page nếu không dùng ngoài.

### 11.5. Tránh prop drilling

Nếu prop đi qua hơn 2 tầng mà tầng giữa không dùng, cân nhắc:

1. Tách component gần nơi dùng.
2. Dùng composition slot.
3. Dùng custom hook ở common parent.
4. Dùng context feature-scoped, không global toàn app.

Ví dụ không tốt:

```jsx
<AdminPage userFilters={filters} setUserFilters={setFilters} />
  <AdminLayout userFilters={filters} setUserFilters={setFilters} />
    <AdminUsersPanel userFilters={filters} setUserFilters={setFilters} />
      <AdminUsersTable userFilters={filters} setUserFilters={setFilters} />
```

Tốt hơn:

```jsx
function AdminUsersSection() {
  const users = useAdminUsers();
  return <AdminUsersTable {...users} />;
}
```

### 11.6. State reset theo route

Khi chuyển route, cần xác định state nào reset:

| State | Reset khi đổi route? | Ghi chú |
|---|---:|---|
| Form chưa submit | Thường có | tránh dữ liệu cũ xuất hiện |
| Search/filter trong cùng section | Có thể giữ | nếu UX cần |
| Auth | Không | giữ qua toàn app |
| Toast | Có thể tồn tại ngắn | tránh spam |
| Symptom session | Cẩn trọng | có thể cần giữ trong flow, clear khi logout |
| Payment order status | Không tự clear quá sớm | user refresh return page |

---

## 12. Component architecture

### 12.1. Phân loại component

| Loại component | Nơi đặt | Được gọi API? | Ví dụ |
|---|---|---:|---|
| UI primitive | `components/ui/` | Không | Button, Input, Modal, Badge |
| Shared component | `components/shared/` hoặc module shared | Không hoặc rất hạn chế | EmptyState, ErrorMessage |
| Layout component | `components/layout/`, `workspace/` | Không gọi domain API trực tiếp | Shell, Sidebar, Header |
| Feature component | `features/<feature>/components/` | Không trực tiếp, nhận data từ hook/page | SymptomQuestionList |
| Page component | `pages/` hoặc `features/<feature>/pages/` | Có thể dùng hook gọi API | SymptomAnalysisPage |

### 12.2. Page nên là composition

Page tốt:

```jsx
export default function NearbyClinicPage() {
  const map = useNearbyClinics();

  return (
    <PatientShell>
      <NearbyClinicHeader />
      <NearbyClinicFilters filters={map.filters} onChange={map.setFilters} />
      <NearbyClinicContent {...map} />
    </PatientShell>
  );
}
```

Page không tốt:

```jsx
export default function NearbyClinicPage() {
  // 20 useState
  // 10 useEffect
  // fetch trực tiếp
  // normalize data
  // render map
  // render list
  // render modal
  // render review form
  // 700+ dòng JSX
}
```

### 12.3. Component props

Props nên rõ nghĩa và nhỏ.

Tốt:

```jsx
<FacilityCard
  facility={facility}
  distanceLabel={distanceLabel}
  isSelected={selectedId === facility.id}
  onSelect={() => selectFacility(facility.id)}
/>
```

Không tốt:

```jsx
<FacilityCard data={data} setData={setData} config={config} type="x" mode="y" />
```

Quy tắc:

- boolean props phải có tên rõ: `isLoading`, `isSelected`, `canSubmit`;
- handler props bắt đầu bằng `on`: `onSubmit`, `onSelect`, `onClose`;
- không truyền nguyên object lớn nếu component chỉ cần vài field;
- không truyền setter state xuống sâu nếu không cần;
- không dùng prop tên mơ hồ: `data`, `item`, `value` nếu domain rõ.

### 12.4. Shared UI không chứa business rule

Ví dụ Button không nên biết premium/auth:

```jsx
// Sai
function Button({ premiumOnly, user }) {
  if (premiumOnly && !user.premium) return <PricingButton />;
}
```

Đúng:

```jsx
function Button(props) {
  return <button {...props} />;
}

function PremiumFeatureCTA({ hasPremium }) {
  return hasPremium ? <Button>Open</Button> : <Button>Upgrade</Button>;
}
```

### 12.5. Checklist tách component lớn

- [ ] Xác định component/page đang quá dài hoặc quá nhiều trách nhiệm.
- [ ] Tách view không state trước.
- [ ] Tách section theo UI rõ ràng.
- [ ] Tách hook cho API/loading/error.
- [ ] Không đổi behavior trong PR tách file nếu mục tiêu là refactor.
- [ ] Không đổi CSS selector nếu không cần.
- [ ] Giữ test id/accessible name ổn định.
- [ ] Chạy test liên quan.
- [ ] Reviewer có thể so sánh before/after dễ.

---

## 13. CSS, layout và asset flow

### 13.1. Vấn đề CSS toàn cục lớn

Theo tài liệu gốc, `src/styles/global.css` là file rất lớn và rủi ro cao. Khi CSS global quá lớn:

- khó biết class nào còn dùng;
- sửa một class có thể ảnh hưởng nhiều page;
- dễ tạo specificity war;
- khó review visual regression;
- onboarding chậm vì không biết style nằm đâu.

### 13.2. CSS layer đề xuất

```txt
styles/
├── tokens.css              # màu, spacing, typography, radius, shadow
├── base.css                # reset, body, typography nền
├── utilities.css           # utility thật sự dùng chung
├── layout.css              # app shell, container, grid nền
├── components.css          # style primitive dùng chung nếu chưa CSS module
├── user-workspace.css      # shell patient/user
├── operator-workspace.css  # admin/staff shell
└── legacy-global.css       # phần chưa migrate, không thêm mới nếu không cần
```

### 13.3. Quy tắc thêm CSS mới

1. Nếu style thuộc UI primitive: đặt gần UI primitive hoặc component CSS.
2. Nếu style thuộc feature: đặt trong feature CSS/module.
3. Nếu style là token: đặt ở tokens.
4. Nếu style chỉ sửa một bug nhỏ: không đưa vào global nếu có scope tốt hơn.
5. Không thêm class global với tên quá chung như `.card`, `.title`, `.button` nếu chưa có namespace.

Nên dùng prefix domain:

```css
.symptom-analysis__question-card {}
.admin-users__toolbar {}
.facility-map__marker {}
.payment-result__status {}
```

Không nên:

```css
.card {}
.header {}
.section {}
.item {}
```

### 13.4. Asset/image flow

Quy tắc:

- asset tĩnh dùng ở UI nên đặt trong `src/assets/` hoặc public nếu cần URL trực tiếp;
- ảnh lớn cần tối ưu kích thước;
- không import ảnh không dùng;
- icon nên dùng thư viện thống nhất hoặc component icon wrapper;
- map assets/markers cần lazy hoặc memo nếu nhiều marker.

### 13.5. Checklist CSS thay đổi lớn

- [ ] Xác định scope ảnh hưởng.
- [ ] Không sửa global nếu component-level đủ.
- [ ] Dùng token thay vì hard-code màu/spacing tùy tiện.
- [ ] Test desktop/tablet/mobile.
- [ ] Test focus/hover/disabled state.
- [ ] Test dark/light nếu có.
- [ ] Chạy visual test nếu thay layout.
- [ ] Không làm tăng global CSS không kiểm soát.
- [ ] Xóa CSS cũ chỉ khi đã search usage và có visual evidence.

---

## 14. Flow nghiệp vụ chính

### 14.1. Landing flow

```txt
/ 
  -> LandingPage
  -> components/landing/*
  -> Symptom demo / CTA / landing chat nếu có
  -> navigate login/signup/pricing/map/symptom
```

Trách nhiệm:

| Tầng | Trách nhiệm |
|---|---|
| Landing page | Compose các section |
| Landing section | Render marketing/product content |
| Landing chat/demo | Demo có nhãn rõ, không giả làm dữ liệu chẩn đoán thật |
| Router | Chuyển CTA đúng route/access |

Rủi ro:

- demo symptom/chat khiến user hiểu là chẩn đoán thật;
- CTA dẫn tới route protected nhưng không chuẩn bị UX login;
- copy y tế dùng từ khẳng định quá mức;
- static content lỗi thời.

Checklist:

- [ ] Demo có nhãn rõ.
- [ ] CTA đúng route.
- [ ] Route protected có returnTo.
- [ ] Không có medical claim quá chắc chắn.
- [ ] Responsive landing ổn.
- [ ] Accessibility heading/order đúng.

### 14.2. Auth flow

```txt
/login hoặc /signup
  -> AuthPages.jsx hoặc feature auth
  -> validate form
  -> authApi.login/register/googleLogin
  -> setStoredAuth
  -> resolve redirect destination
  -> navigate/replaceRoute
```

Edge cases:

- sai email/password;
- account disabled;
- network error;
- Google login cancel;
- returnTo invalid;
- user đã login vào login page;
- role unknown;
- profile chưa setup.

Checklist:

- [ ] Form validate client-side.
- [ ] API error hiển thị thân thiện.
- [ ] Loading state chặn submit lặp.
- [ ] Password không log.
- [ ] ReturnTo hoạt động.
- [ ] Role redirect đúng.
- [ ] Auth stored qua wrapper.
- [ ] Không fetch trực tiếp.

### 14.3. Patient dashboard flow

```txt
/dashboard
  -> DashboardPage
  -> patient shell/layout
  -> symptom intake / summary / recommendation widgets
  -> service hoặc fallback data
  -> CTA tới symptom/map/chat/pricing
```

Vấn đề thường gặp:

- dashboard vừa làm layout vừa làm symptom intake vừa ranking facility;
- fallback/mock không có nhãn;
- nhiều state trong một file;
- CTA premium/auth không đồng bộ.

Target refactor:

```txt
features/dashboard/
├── DashboardPage.jsx
├── components/
│   ├── DashboardHeader.jsx
│   ├── SymptomIntakeCard.jsx
│   ├── FacilityRecommendationPanel.jsx
│   └── DashboardQuickActions.jsx
├── hooks/
│   ├── useDashboardSummary.js
│   └── useFacilityRecommendations.js
└── utils/
    └── normalizeDashboardData.js
```

Checklist:

- [ ] Dashboard page chỉ compose section.
- [ ] Facility recommendation logic tách khỏi JSX.
- [ ] Empty/loading/error có UI.
- [ ] Mock/fallback có nhãn rõ.
- [ ] Không gọi fetch trực tiếp.
- [ ] Route auth vẫn đúng.

### 14.4. Symptom analysis flow

```txt
/symptom
  -> SymptomAnalysisPage
  -> user nhập triệu chứng
  -> symptomAnalysisApi.suggestClinicalQuestions(userInput)
  -> nhận sessionId + questions
  -> user trả lời
  -> symptomAnalysisApi.submitClinicalQuestionAnswers(sessionId, answers)
  -> render result / recommendation / safety copy
```

State đề xuất:

```js
const initialState = {
  step: "input", // input | questions | result
  userInput: "",
  sessionId: null,
  questions: [],
  answers: {},
  result: null,
  loading: false,
  error: null,
};
```

Edge cases cần xử lý:

| Case | UI mong đợi |
|---|---|
| Input quá ngắn | Disable submit hoặc inline error |
| Backend trả `questions: []` | Hiển thị thông báo và CTA nhập lại/liên hệ bác sĩ |
| Có sessionId nhưng không có questions | Không crash, log dev-safe |
| Submit thiếu câu trả lời bắt buộc | Highlight câu thiếu |
| API timeout | Cho retry |
| 401 | Redirect login hoặc session expired |
| Có dấu hiệu cấp cứu | Copy khuyến nghị liên hệ cấp cứu/cơ sở y tế ngay |

Ví dụ normalize:

```js
function normalizeSuggestedQuestions(response) {
  const data = response?.data ?? response;
  return {
    sessionId: data?.sessionId ?? null,
    questions: Array.isArray(data?.questions) ? data.questions : [],
  };
}
```

Checklist:

- [ ] Không khẳng định chẩn đoán.
- [ ] Có disclaimer y tế.
- [ ] Có emergency copy.
- [ ] Empty questions được handle.
- [ ] Loading rõ khi AI/backend xử lý.
- [ ] Retry không gửi lặp nguy hiểm.
- [ ] SessionId được kiểm tra trước submit.
- [ ] Không lưu dữ liệu y tế nhạy cảm lâu trong storage nếu không cần.

### 14.5. Chat AI flow

```txt
/chat
  -> ChatbotPage
  -> auth/premium gate
  -> chatbot service hoặc backend AI gateway
  -> render messages/loading/error
```

Nguyên tắc quan trọng:

```txt
Frontend không được chứa AI provider secret key.
Frontend không nên gọi trực tiếp provider bằng secret.
Target đúng: Frontend -> Backend AI Gateway -> AI Provider.
```

Rủi ro:

- lộ provider key trong client bundle;
- user gửi dữ liệu y tế nhạy cảm trực tiếp tới provider không qua policy backend;
- không có rate limit;
- không có logging/redaction policy;
- copy trả lời giống tư vấn y tế chắc chắn.

Checklist:

- [ ] Không có `VITE_*_SECRET` cho provider secret.
- [ ] Chat gọi backend service nếu production.
- [ ] Có loading khi gửi message.
- [ ] Có error/retry.
- [ ] Có disclaimer.
- [ ] Có guard premium/auth.
- [ ] Không log full medical prompt ở console production.

### 14.6. Map/facility flow

```txt
/map
  -> NearbyClinicPage lazy loaded
  -> facilitiesApi.listActive / related service
  -> normalize lat/lng
  -> request geolocation nếu cần
  -> render list + map + marker + detail/review
```

State đề xuất:

```txt
facilities
selectedFacilityId
filters
userLocation
locationPermissionStatus
mapReady
loading
error
```

Edge cases:

- user từ chối location;
- browser không hỗ trợ geolocation;
- facility thiếu lat/lng;
- API trả empty;
- map library load chậm;
- tile server lỗi;
- mobile viewport nhỏ;
- quá nhiều markers.

Checklist:

- [ ] Không crash khi location denied.
- [ ] Facility thiếu tọa độ không phá map.
- [ ] Có fallback list nếu map lỗi.
- [ ] Loading map và loading data tách rõ.
- [ ] Marker render tối ưu.
- [ ] Review/rating không fetch lặp quá mức.
- [ ] Có empty state.
- [ ] Mobile layout dùng được.

### 14.7. Payment/subscription flow

```txt
/pricing
  -> subscriptionPlansApi.listActive
  -> user chọn plan
  -> userSubscriptionsApi.checkout(planId, autoRenew)
  -> redirect payment provider
  -> /payment/return hoặc /payment/cancel
  -> paymentsApi.payOsStatus(orderCode)
  -> sync subscription/premium state
  -> render result
```

Trạng thái cần support:

| Status | UI mong đợi |
|---|---|
| success/paid | Hiển thị thành công, refresh premium state |
| pending | Hiển thị đang xử lý, cho refresh/check lại |
| canceled | Hiển thị đã hủy, CTA quay lại pricing |
| failed | Hiển thị thất bại, CTA thử lại |
| missing orderCode | Thông báo không xác định, hướng dẫn kiểm tra lại |
| unauthorized | Login lại, giữ returnTo nếu hợp lý |

Rủi ro:

- tạo nhiều checkout session khi bấm nhiều lần;
- refresh return page mất state;
- premium cache không cập nhật;
- pending bị hiểu nhầm là success;
- auto renew copy không rõ.

Checklist:

- [ ] Disable button khi checkout loading.
- [ ] Không retry checkout tự động.
- [ ] Return/cancel route handle direct URL refresh.
- [ ] Missing/invalid orderCode có fallback.
- [ ] Payment status không chỉ dựa vào query client.
- [ ] Sau success có sync auth/subscription.
- [ ] Test payment result các status.

### 14.8. Admin workspace flow

```txt
/app/admin[/section]
  -> App resolve admin route
  -> access role admin
  -> AdminWorkspacePage initialSection
  -> section-specific hook/service
  -> table/form/modal/actions
```

Vấn đề chính: `AdminWorkspacePage.jsx` đang là vùng rủi ro cao vì gom nhiều CRUD/section/state.

Target structure:

```txt
features/admin/
├── AdminWorkspacePage.jsx
├── AdminLayout.jsx
├── sections/
│   ├── overview/
│   │   └── AdminOverviewSection.jsx
│   ├── users/
│   │   ├── AdminUsersSection.jsx
│   │   ├── AdminUserFormModal.jsx
│   │   ├── AdminUsersTable.jsx
│   │   └── useAdminUsers.js
│   ├── doctors/
│   ├── ai-configs/
│   ├── subscriptions/
│   ├── staff/
│   ├── departments/
│   └── facilities/
└── utils/
    ├── adminFormatters.js
    └── adminValidation.js
```

Quy tắc tách admin:

1. Tách từng section, không tách toàn bộ trong một PR.
2. Giữ route path và UI text chính trước.
3. Tách hook data cho section.
4. Tách table/form/modal.
5. Test section vừa tách.
6. Không đổi API behavior cùng PR refactor UI.

Checklist mỗi admin section:

- [ ] Load list.
- [ ] Empty state.
- [ ] Error state.
- [ ] Create form validation.
- [ ] Update form validation.
- [ ] Delete/disable confirm.
- [ ] Pagination/filter nếu có.
- [ ] 401/403 handle đúng.
- [ ] Role admin required.
- [ ] Không ảnh hưởng section khác.

### 14.9. Staff workspace flow

```txt
/app/staff
  -> role gate staff
  -> StaffWorkspacePage
  -> staff-specific service/sections
```

Rủi ro:

- staff dùng nhầm component admin có action vượt quyền;
- route role gate không rõ;
- CSS operator workspace chung ảnh hưởng cả admin/staff;
- staff API error 403 không xử lý.

Checklist:

- [ ] Staff không vào admin route.
- [ ] Admin vào staff route có policy rõ.
- [ ] Staff chỉ thấy action được phép.
- [ ] 403 hiển thị đúng.
- [ ] Operator CSS không gây regression admin.

### 14.10. Doctor invitation flow

```txt
/register-doctor
  -> DoctorRegisterInvitationPage
  -> validate invitation token/email
  -> render registration form
  -> submit doctor profile
  -> success/failure
```

Edge cases:

- token thiếu;
- token sai;
- token hết hạn;
- token đã dùng;
- email không khớp;
- form invalid;
- backend trả 409/422;
- mạng lỗi;
- user refresh giữa flow.

Checklist:

- [ ] Token loading state.
- [ ] Invalid token state.
- [ ] Expired/used token copy rõ.
- [ ] Form label/error accessible.
- [ ] Submit loading disable.
- [ ] Success state rõ bước tiếp theo.
- [ ] Không log token ở console.
- [ ] Test mobile.

### 14.11. Patient profile setup flow

```txt
/patient/profile/setup
  -> PersonalPatientProfilePage
  -> authApi.me hoặc stored auth
  -> patientProfilesApi.list/find/create/update
  -> save setup result
  -> redirect dashboard hoặc returnTo
```

Rủi ro:

- update user thành công nhưng patient profile lỗi;
- backend phân trang profile làm không tìm thấy user;
- field sức khỏe validate lỏng;
- log PII/health data;
- profile setup redirect loop.

Checklist:

- [ ] Required fields rõ.
- [ ] Validate number fields.
- [ ] Validate date/age nếu có.
- [ ] Handle partial failure.
- [ ] Không log PII.
- [ ] Redirect sau save đúng.
- [ ] ReturnTo không loop.

### 14.12. Records/Medication demo flow

Các capability records/medication cần được quản trị như demo nếu chưa có backend thật.

Quy tắc:

```txt
Nếu dùng mock data, UI phải nói rõ là demo/mẫu.
Không để user hiểu đây là hồ sơ/tương tác thuốc thật.
Không đưa medication advice chắc chắn nếu chưa có kiểm chứng/backend/professional review.
```

Checklist:

- [ ] Có badge “Demo” hoặc copy rõ.
- [ ] Không lưu dữ liệu người dùng như thật nếu chưa có backend.
- [ ] Không dùng wording “an toàn/chắc chắn” cho tương tác thuốc.
- [ ] Route premium/demo policy rõ.
- [ ] Nếu production không sẵn sàng, cân nhắc ẩn route/navigation.

---

## 15. Static/demo/content pages

`StaticPage.jsx` đang chứa nhiều route tĩnh như features, roadmap, support, legal, terms, privacy, demo. Cách này nhanh cho MVP nhưng dễ thành file lớn và khó kiểm soát nội dung.

### 15.1. Target structure

```txt
features/static-pages/
├── StaticPage.jsx
├── staticPageContent.js
├── legalContent.js
├── productContent.js
└── supportContent.js
```

### 15.2. Quy tắc content

- Legal/privacy/terms phải có owner review.
- Product claim phải đúng trạng thái capability.
- Demo phải có nhãn.
- Roadmap không cam kết quá mức nếu chưa chắc.
- Copy y tế cần tránh chẩn đoán hoặc tư vấn thay bác sĩ.

Checklist:

- [ ] Content không hard-code quá dài trong render JSX.
- [ ] Mỗi static route có metadata rõ.
- [ ] Legal pages được review.
- [ ] Demo pages có nhãn.
- [ ] Không có link chết.

---

## 16. Environment/config/deploy flow

### 16.1. Nguyên tắc env trong Vite

Trong Vite, biến `VITE_*` được expose vào client bundle. Vì vậy:

```txt
VITE_API_BASE_URL = có thể public nếu chỉ là base URL.
VITE_GOOGLE_CLIENT_ID = public config, được phép.
VITE_ANTHROPIC_KEY hoặc provider secret = không được.
DATABASE_URL/API_SECRET/CLIENT_SECRET = không được.
```

### 16.2. Env theo môi trường

Đề xuất:

```txt
.env.example          # template không có secret thật
.env.development      # local/dev backend
.env.staging          # staging backend nếu cần
.env.production       # production placeholder, không commit secret
Vercel/CI env         # cấu hình thật theo môi trường
```

Không nên hard-code IP production trong source nếu có thể quản lý qua env/deploy settings.

### 16.3. API base URL

Target:

```txt
Frontend build production
  -> đọc VITE_API_BASE_URL từ deploy env
  -> apiClient build endpoint từ base URL
```

Không nên:

```js
const API_BASE_URL = "http://52.77.210.243:8080";
```

### 16.4. Checklist env/deploy

- [ ] `.env.example` không chứa secret thật.
- [ ] Không có provider secret dạng `VITE_*`.
- [ ] Base URL cấu hình theo môi trường.
- [ ] Vercel rewrite/proxy không hard-code nhầm production nếu có env tốt hơn.
- [ ] Build local/dev/staging/prod dùng đúng backend.
- [ ] README setup env rõ.
- [ ] CI không in env nhạy cảm.

---

## 17. Error/loading/empty/success flow

### 17.1. State machine chuẩn cho API UI

Mọi UI gọi API nên có ít nhất 4 state:

```txt
idle/loading/error/success
```

Với list data nên có thêm:

```txt
empty
```

Ví dụ hook:

```js
function useAsyncData(loadFn) {
  const [state, setState] = useState({
    status: "idle",
    data: null,
    error: null,
  });

  const load = useCallback(async () => {
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await loadFn();
      setState({
        status: Array.isArray(data) && data.length === 0 ? "empty" : "success",
        data,
        error: null,
      });
    } catch (error) {
      setState({ status: "error", data: null, error });
    }
  }, [loadFn]);

  return { ...state, load };
}
```

### 17.2. UI rules

| State | UI cần có |
|---|---|
| Loading | Skeleton/spinner/copy rõ, disable action nguy hiểm |
| Error | Message dễ hiểu, retry nếu phù hợp, không lộ raw stack |
| Empty | Giải thích không có dữ liệu, CTA nếu có |
| Success | Render data, format đúng |
| Unauthorized | Session expired/login lại |
| Forbidden | Không đủ quyền, không redirect mơ hồ nếu user đang đúng workspace |

### 17.3. Checklist mỗi API UI

- [ ] Có loading state.
- [ ] Có error state.
- [ ] Có empty state nếu list.
- [ ] Có success state.
- [ ] Submit button disable khi loading.
- [ ] Không double submit.
- [ ] 401/403 xử lý đúng.
- [ ] Retry không tạo side effect nguy hiểm.
- [ ] Error message không leak technical detail.

---

## 18. Quy trình thêm feature mới

Khi team thêm feature mới, làm theo quy trình sau.

### 18.1. Bước 1 - Xác định capability

Trả lời:

- Feature này cho ai dùng?
- Route public/auth/premium/role?
- Có dữ liệu y tế/PII không?
- Có backend thật chưa?
- Có demo/mock không?
- Có ảnh hưởng payment/subscription không?
- Có cần docs/legal copy không?

### 18.2. Bước 2 - Thiết kế route

- Thêm route metadata.
- Chọn access level.
- Chọn shell/navigation.
- Chọn alias nếu cần.
- Cập nhật App dispatcher.

### 18.3. Bước 3 - Thiết kế API

- Thêm endpoint trong `endpoints.js`.
- Thêm domain service.
- Thêm normalize request/response.
- Thêm error mapping nếu cần.
- Không gọi API trong UI trực tiếp.

### 18.4. Bước 4 - Thiết kế state/hook

- Tạo hook nếu có API/loading/form nhiều.
- Xác định state local/global.
- Xác định reset khi unmount/route change.
- Xác định retry/cancel/timeout.

### 18.5. Bước 5 - Thiết kế UI

- Dùng shared UI nếu có.
- Tạo feature component nhỏ.
- Có loading/error/empty.
- Có accessibility label/error/focus.
- Dùng CSS scoped hoặc token.

### 18.6. Bước 6 - Test

- Unit test utility/normalize.
- Component test nếu UI quan trọng.
- E2E route/flow nếu là capability chính.
- Mock API edge cases.
- Manual test responsive nếu UI lớn.

### 18.7. Bước 7 - Docs

- Cập nhật docs route/API/feature.
- Cập nhật README nếu setup/env thay đổi.
- Cập nhật troubleshooting nếu có lỗi phổ biến.

---

## 19. Quy trình sửa bug API

Không sửa bug API bằng cách vá tùy tiện trong component.

Luồng đúng:

```txt
1. Reproduce lỗi.
2. Xác định endpoint liên quan.
3. Kiểm tra domain service.
4. Kiểm tra apiClient parse/normalize error.
5. Kiểm tra UI state handling.
6. Sửa ở tầng thấp nhất phù hợp.
7. Thêm test/fixture.
8. Verify flow end-to-end.
```

Ví dụ lỗi: backend trả `questions: []` nhưng UI crash.

Không nên sửa:

```jsx
{questions.map(q => ...)} // crash nếu undefined
```

bằng cách rải nhiều nơi:

```jsx
{(questions || []).map(q => ...)}
```

Tốt hơn:

```js
function normalizeSuggestQuestionsResponse(response) {
  return {
    sessionId: response?.data?.sessionId ?? null,
    questions: Array.isArray(response?.data?.questions)
      ? response.data.questions
      : [],
  };
}
```

và UI xử lý empty rõ:

```jsx
if (questions.length === 0) {
  return <EmptyQuestionsState onRetry={restart} />;
}
```

---

## 20. Quy trình sửa bug UI

Luồng đúng:

```txt
1. Xác định page/component lỗi.
2. Xác định lỗi do markup, state, CSS, data hay route.
3. Sửa tại scope nhỏ nhất.
4. Không sửa global nếu lỗi chỉ trong một component.
5. Test responsive/a11y nếu ảnh hưởng UI.
6. Ghi evidence trong PR.
```

Ví dụ lỗi button trong payment lệch layout.

Không nên sửa global:

```css
.button {
  margin-top: 16px;
}
```

Tốt hơn:

```css
.payment-plan-card__checkout-button {
  margin-top: var(--space-4);
}
```

---

## 21. Vùng code rủi ro cao

| Vùng | Rủi ro | Quy tắc sửa |
|---|---|---|
| `src/pages/AdminWorkspacePage.jsx` | File lớn, nhiều CRUD, dễ regression | Tách từng section, test section |
| `src/styles/global.css` | Ảnh hưởng toàn app | Không tăng thêm nếu không cần, có visual evidence |
| `src/styles/operator-workspace.css` | Ảnh hưởng admin/staff | Test cả admin và staff |
| `src/services/apiClient.js` | Ảnh hưởng mọi API | PR nhỏ, backward compatible, test nhiều flow |
| `src/services/endpoints.js` | Ảnh hưởng API contract | Không đổi path tùy tiện, cập nhật docs |
| `src/router/routes.js` | Ảnh hưởng navigation/access | Test route/access/alias |
| `src/router/access.js` | Ảnh hưởng bảo mật route | Test public/auth/premium/role |
| `src/pages/AuthPages.jsx` | Auth/session | Không mix UI refactor với auth behavior lớn |
| `src/pages/PaymentResultPage.jsx` | Tiền/subscription | Test status edge cases |
| `src/pages/SymptomAnalysisPage.jsx` | Domain y tế | Test safety/empty/error |
| `src/pages/NearbyClinicPage.jsx` | Map/location | Test geolocation denied/missing coords |

---

## 22. Refactor plan theo từng vùng

### 22.1. Refactor AdminWorkspacePage

Thứ tự khuyến nghị:

```txt
PR 1: Extract constants/helpers không đổi UI.
PR 2: Extract AdminLayout/Header/Sidebar.
PR 3: Extract Overview section.
PR 4: Extract Users section + hook.
PR 5: Extract Doctors section + hook.
PR 6: Extract Facilities/Departments section.
PR 7: Extract Subscriptions section.
PR 8: Extract AI Configs section.
PR 9: Remove legacy code/re-export.
```

Mỗi PR phải có:

- lint/build;
- test admin route liên quan;
- screenshot/manual evidence nếu UI thay đổi;
- mô tả “behavior unchanged” nếu chỉ refactor.

### 22.2. Refactor global CSS

Thứ tự:

```txt
1. Freeze: không thêm class global mới nếu không có lý do.
2. Audit: phân nhóm token/base/layout/component/feature/legacy.
3. Tách tokens/base trước.
4. Tách admin/user workspace CSS.
5. Tách feature CSS khi refactor page.
6. Xóa CSS dead theo từng cụm nhỏ.
```

Không nên xóa hàng trăm dòng trong một PR nếu không có visual baseline.

### 22.3. Refactor API layer

Thứ tự:

```txt
1. Chuẩn hóa ApiError.
2. Chuẩn hóa getUserFriendlyApiMessage.
3. Thêm timeout support.
4. Chuẩn hóa 401 handling.
5. Thêm response normalizer theo domain.
6. Audit fetch trực tiếp.
7. Thêm tests cho apiClient và service normalizers.
```

### 22.4. Refactor SymptomAnalysisPage

Target:

```txt
features/symptom-analysis/
├── SymptomAnalysisPage.jsx
├── hooks/useSymptomAnalysisFlow.js
├── components/SymptomInputStep.jsx
├── components/ClinicalQuestionsStep.jsx
├── components/SymptomResultStep.jsx
├── components/SymptomSafetyNotice.jsx
├── utils/normalizeSymptomAnalysis.js
└── utils/symptomValidation.js
```

### 22.5. Refactor NearbyClinicPage

Target:

```txt
features/map/
├── NearbyClinicPage.jsx
├── hooks/useNearbyClinics.js
├── hooks/useUserLocation.js
├── components/FacilityMap.jsx
├── components/FacilityList.jsx
├── components/FacilityCard.jsx
├── components/FacilityFilters.jsx
├── components/MapFallback.jsx
└── utils/facilityGeo.js
```

---

## 23. Import/export boundary

### 23.1. Quy tắc import

- Page có thể import feature, component, service hook.
- Feature component không import page.
- UI primitive không import feature.
- Service không import component/page.
- Utils không import UI nếu là utility thuần.
- Router không import page nếu routes metadata tách riêng; App mới import page.

Sơ đồ:

```txt
App -> pages/features
Page -> feature hooks/components
Feature hook -> services/utils
Service -> apiClient/endpoints
Component UI -> no service
Utils -> no UI
```

### 23.2. Bad dependency examples

```js
// Sai: service import component
import ErrorToast from "../components/ui/ErrorToast";

// Sai: util import page
import DashboardPage from "../pages/DashboardPage";

// Sai: ui primitive import auth service
import { getStoredAuth } from "../services/apiClient";
```

### 23.3. Checklist boundary

- [ ] Không có circular import.
- [ ] Service không import UI.
- [ ] UI primitive không import domain service.
- [ ] Feature không phụ thuộc ngược vào page cũ.
- [ ] Shared không import feature-specific code.
- [ ] Import path rõ, không quá nhiều `../../../` nếu có alias cấu hình.

---

## 24. Test theo tầng

### 24.1. Test pyramid đề xuất

```txt
Nhiều unit test cho utility/normalizer/validation.
Một số component/integration test cho UI quan trọng.
E2E test cho flow chính và regression route/access/payment/admin.
```

### 24.2. Unit test nên có

| Vùng | Test nên viết |
|---|---|
| `utils/roles.js` | normalize role, workspace path, profile setup decision |
| `router/access.js` | public/auth/premium/role redirect |
| `router/returnIntent.js` | encode/decode returnTo an toàn |
| `services/* normalize` | response shape edge cases |
| `apiClient` | error parsing, timeout, 401 handling |
| `payment utils` | status mapping |
| `symptom validation` | input, answers required |
| `facilityGeo` | missing lat/lng, distance calculation |

### 24.3. E2E test nên giữ/chạy

Theo tài liệu gốc, repo đã có nhiều spec như route, admin, payment, accessibility, visual, performance. Khi sửa vùng nào, chạy spec vùng đó.

| Vùng sửa | Test tối thiểu |
|---|---|
| Route/access | `routes.spec.js`, route manifest, access cases |
| Admin users/doctors/facilities | admin spec tương ứng |
| Payment | payment specs |
| Symptom | symptom diagnosis spec |
| Map | map UX spec |
| UI layout lớn | visual/a11y specs |
| Performance/lazy loading | performance spec |

### 24.4. Checklist trước merge

- [ ] `npm run lint` pass.
- [ ] `npm run build` pass.
- [ ] Unit/component tests liên quan pass nếu có.
- [ ] E2E liên quan pass hoặc có lý do rõ nếu chưa chạy.
- [ ] Manual evidence nếu UI thay đổi.
- [ ] Không có console log debug nhạy cảm.
- [ ] Không có secret/env nhạy cảm.
- [ ] Docs cập nhật nếu route/API/flow đổi.

---

## 25. Troubleshooting playbook

### 25.1. App không đổi route khi click link

Kiểm tra:

1. Link có phải internal link hợp lệ không?
2. `installLinkNavigation()` có chạy không?
3. `navigate()` có dispatch event không?
4. `SpaRoot` có subscribe location không?
5. Có preventDefault sai ở component không?
6. Console có lỗi render làm app đứng không?

### 25.2. Back/forward browser lỗi

Kiểm tra:

1. `popstate` listener.
2. `getLocationSnapshot()` có đổi khi URL đổi không?
3. `App key={location}` có làm remount đúng không?
4. Có code nào tự `replaceRoute` liên tục không?
5. Access guard có redirect loop không?

### 25.3. Route protected vẫn vào được

Kiểm tra:

1. Route metadata có `access` đúng không?
2. `resolveRouteAccess()` có được gọi không?
3. `getStoredAuth()` có trả auth stale không?
4. Role/premium normalize đúng không?
5. Alias có bypass route canonical không?
6. Test direct URL refresh chưa?

### 25.4. API trả 401 nhưng UI không logout

Kiểm tra:

1. Request có `auth: true` không?
2. apiClient có bắt 401 không?
3. `clearStoredAuth()` có chạy không?
4. Có nhiều stored auth key khác nhau không?
5. UI có swallow error không?
6. Route after logout có bị guard không?

### 25.5. API gọi sai backend

Kiểm tra:

1. `VITE_API_BASE_URL` ở môi trường hiện tại.
2. Vite proxy config.
3. Vercel rewrite config.
4. Hard-code IP trong source.
5. Browser network tab URL thực tế.
6. Build production có env đúng không?

### 25.6. CSS sửa một nơi hỏng nhiều nơi

Kiểm tra:

1. Class có quá chung không?
2. CSS nằm trong global không?
3. Selector có ảnh hưởng nhiều page không?
4. Có dùng token không?
5. Visual diff page nào bị hỏng?
6. Nên chuyển sang scoped class/feature CSS không?

### 25.7. Page render thừa/chậm

Kiểm tra:

1. State có đặt quá cao không?
2. Handler/object/array có tạo mới liên tục không?
3. List có key ổn định không?
4. Component lớn có bị re-render vì parent không cần thiết không?
5. Map markers/list có quá nhiều không?
6. Lazy loading page/library đã dùng chưa?

---

## 26. Definition of Done cho thay đổi liên quan cấu trúc/flow

Một PR thay đổi cấu trúc code hoặc luồng hoạt động chỉ được xem là hoàn tất khi:

- Code nằm đúng tầng.
- Không gọi API trực tiếp ngoài service.
- Route/access không bị bypass.
- Loading/error/empty/success rõ nếu gọi API.
- Không tạo duplicate logic không cần thiết.
- Không làm tăng file lớn vô kiểm soát.
- Không thêm secret/hard-code env nhạy cảm.
- Lint/build pass.
- Test liên quan pass hoặc có evidence.
- Docs cập nhật nếu thay đổi route/API/auth/flow/folder.

---

## 27. Onboarding theo vai trò

### 27.1. Developer mới ngày 1

Cần đọc:

1. File tổng quan dự án.
2. File cấu trúc code và luồng hoạt động này.
3. Quy ước code/chất lượng.
4. Checklist refactor.

Cần làm:

- chạy app local;
- mở DevTools xem route/API;
- đọc `routes.js`, `access.js`, `apiClient.js`, `endpoints.js`;
- chọn task nhỏ không rủi ro cao.

Không giao ngay:

- sửa `apiClient.js`;
- sửa `routes/access` lớn;
- sửa admin CRUD lớn;
- sửa payment/auth;
- xóa CSS global.

### 27.2. Reviewer

Reviewer cần check:

- code đúng tầng không;
- route/access đúng không;
- service/API có normalize không;
- error/loading/empty state có đủ không;
- mock/demo có nhãn không;
- UI có accessibility cơ bản không;
- test/evidence có đủ không;
- docs có cần update không.

### 27.3. Technical Lead

Technical Lead dùng tài liệu này để:

- định nghĩa boundary architecture;
- chia task refactor theo sprint;
- quyết định vùng P0/P1;
- tạo CODEOWNERS nếu cần;
- đặt CI gate;
- kiểm soát migration feature-first;
- review ADR cho quyết định lớn.

---

## 28. Checklist tổng hợp khi review Pull Request

```md
## Architecture/flow checklist

### Route
- [ ] Route mới/sửa có metadata đầy đủ.
- [ ] Access level đúng.
- [ ] Alias không bypass access.
- [ ] Navigation active state đúng.

### API
- [ ] Không gọi fetch trực tiếp trong component/page.
- [ ] Endpoint nằm trong endpoints.js.
- [ ] Domain service có normalize request/response.
- [ ] Error được handle chuẩn.
- [ ] 401/403 đúng.

### State
- [ ] State đặt đúng tầng.
- [ ] Không prop drilling quá sâu.
- [ ] Không đưa local state lên global không cần thiết.
- [ ] State reset đúng khi route/logout.

### UI
- [ ] Component lớn được tách hợp lý.
- [ ] Props rõ nghĩa.
- [ ] Loading/error/empty/success đầy đủ.
- [ ] Accessibility cơ bản đạt.

### CSS
- [ ] Không thêm CSS global tùy tiện.
- [ ] Dùng token/scoped class.
- [ ] Responsive/focus state kiểm tra.

### Security/safety
- [ ] Không có secret ở client.
- [ ] Không log token/PII/health data.
- [ ] Demo/mock có nhãn.
- [ ] Medical copy không khẳng định quá mức.

### Test/docs
- [ ] Lint/build pass.
- [ ] Test liên quan pass.
- [ ] Manual evidence nếu UI lớn.
- [ ] Docs cập nhật nếu route/API/flow đổi.
```

---

## 29. Ví dụ luồng thêm API + UI hoàn chỉnh

Giả sử thêm feature “Lịch sử phân tích triệu chứng”.

### 29.1. Endpoint

```js
// src/services/endpoints.js
export const ENDPOINTS = {
  ...,
  SYMPTOM_ANALYSIS: {
    ...,
    HISTORY: "/api/symptom-analysis/history",
  },
};
```

### 29.2. Service

```js
// src/services/symptomAnalysisService.js
export const symptomAnalysisApi = {
  ...,
  async listHistory({ pageNumber = 1, pageSize = 10 } = {}) {
    const query = withPagination(pageNumber, pageSize);
    const response = await apiRequest(
      `${ENDPOINTS.SYMPTOM_ANALYSIS.HISTORY}?${query}`,
      { auth: true }
    );

    return normalizeSymptomHistoryResponse(response);
  },
};

function normalizeSymptomHistoryResponse(response) {
  const data = response?.data ?? response;
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number(data?.total ?? 0),
  };
}
```

### 29.3. Hook

```js
function useSymptomHistory() {
  const [state, setState] = useState({
    status: "idle",
    items: [],
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const result = await symptomAnalysisApi.listHistory();
      setState({
        status: result.items.length ? "success" : "empty",
        items: result.items,
        error: null,
      });
    } catch (error) {
      setState({ status: "error", items: [], error });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
```

### 29.4. UI

```jsx
function SymptomHistoryPanel() {
  const { status, items, error, reload } = useSymptomHistory();

  if (status === "loading") return <LoadingState label="Đang tải lịch sử..." />;
  if (status === "error") return <ErrorState error={error} onRetry={reload} />;
  if (status === "empty") return <EmptyState title="Chưa có lịch sử phân tích" />;

  return <SymptomHistoryList items={items} />;
}
```

### 29.5. Review checklist

- [ ] Endpoint không hard-code trong component.
- [ ] Service có normalize.
- [ ] Hook giữ loading/error/empty.
- [ ] UI không biết backend raw shape.
- [ ] Route access nếu thêm page mới là `auth`.
- [ ] Không log dữ liệu triệu chứng.
- [ ] Test empty/error/success.

---

## 30. Kết luận kỹ thuật

Repo MediMate AI Frontend đã có nền kiến trúc tốt hơn mức MVP thông thường nhờ có route metadata, API layer, domain services, E2E tests và docs. Việc quan trọng trong giai đoạn tiếp theo không phải thay toàn bộ kiến trúc, mà là làm chặt boundary và giảm dần các vùng quá lớn.

Nguyên tắc cuối cùng cho team:

```txt
Route đi qua router.
Access đi qua access guard.
API đi qua service.
State phức tạp đi qua hook.
UI lớn tách thành component nhỏ.
CSS mới phải có scope.
Demo phải có nhãn.
Secret không bao giờ ở client.
Refactor phải có test/evidence.
Docs phải đi cùng code.
```
