# Kế hoạch tổ chức lại thư mục và migration sang feature-first cho MediMate AI Frontend

> Phiên bản tài liệu: 2026-06-17  
> Phạm vi: frontend React/Vite của MediMate AI  
> Mục đích: cung cấp kế hoạch migration thư mục có thể triển khai trực tiếp trong team, không rewrite toàn bộ, không phá app đang chạy.  
> Đối tượng đọc: Senior/Tech Lead, Frontend Developer, Reviewer, QA, PM kỹ thuật.  
> Nguyên tắc bắt buộc: mọi thay đổi migration vẫn phải qua lint, build, test, review và evidence rõ ràng.

---

## 0. Tóm tắt điều hành

Repo hiện tại đang đi theo cấu trúc phổ biến ở giai đoạn đầu của dự án React:

```txt
src/
├── pages/
├── components/
├── services/
├── router/
├── styles/
├── state/
└── utils/
```

Cấu trúc này không sai. Nó giúp đội phát triển nhanh ở giai đoạn MVP. Tuy nhiên, khi MediMate AI đã có nhiều capability như auth, symptom analysis, chat AI, map, payment, patient dashboard, doctor invitation, staff workspace và admin workspace, code của một feature đang bị rải qua nhiều thư mục theo loại file. Developer muốn sửa một chức năng phải nhảy qua `pages`, `components`, `services`, `styles`, `utils`, `router`, test và docs. Khi số lượng feature tăng, cách tổ chức này làm tăng chi phí bảo trì.

Mục tiêu của tài liệu này là đưa repo sang hướng **feature-first có shared layer**, nhưng thực hiện theo chiến lược **migration từng phần**. Không rewrite toàn bộ. Không đổi folder chỉ để đẹp. Mỗi bước di chuyển file phải tạo ra lợi ích thật: giảm complexity, giảm duplicate, tăng khả năng test, tăng ownership, hoặc giảm rủi ro production.

Target dài hạn:

```txt
src/
├── app/
├── features/
├── shared/
└── main.jsx
```

Trong đó:

- `app/` chứa bootstrap, provider, route composition và app shell cấp cao.
- `features/` chứa code theo capability/domain.
- `shared/` chứa UI primitive, API client, hooks, lib, config, styles và constants dùng chung.

Thứ tự migration khuyến nghị:

1. Chuẩn bị guardrails: branch, PR template, alias, lint/build baseline, checklist import boundary.
2. Tách `AdminWorkspacePage.jsx` theo từng section vì đây là vùng rủi ro lớn.
3. Tách các flow user-facing quan trọng: symptom, dashboard, map, payment, auth.
4. Chuẩn hóa shared UI/API/config/styles.
5. Di chuyển `app/router` sau khi feature đã ổn định.
6. Dọn compatibility export, import cũ, CSS chết và docs stale.

---

## 1. Mục tiêu của migration thư mục

### 1.1. Mục tiêu kỹ thuật

Migration thư mục không phải để repo “trông hiện đại hơn”. Nó phải đạt các mục tiêu đo được:

| Mục tiêu | Ý nghĩa thực tế | Cách đo/quan sát |
| --- | --- | --- |
| Dễ tìm code | Developer biết feature nằm ở đâu | Người mới tìm đúng file trong dưới 5 phút |
| Dễ bảo trì | Mỗi PR ít file không liên quan | Diff nhỏ hơn, reviewer ít bị quá tải |
| Dễ mở rộng | Thêm feature không phải sửa nhiều thư mục rải rác | Feature mới có folder riêng, public API rõ |
| Dễ test | Logic tách khỏi render/page lớn | Có hook/model/service test được |
| Giảm duplicate | UI/API pattern dùng chung | Button/Dialog/Table/API error không tự chế mỗi page |
| Rõ ownership | Team biết ai phụ trách vùng nào | CODEOWNERS hoặc owner map theo feature |
| Giảm risk | Route/auth/payment/admin không bị sửa dây chuyền | Test và reviewer gate đúng vùng |
| Onboarding nhanh | Dev mới hiểu repo theo capability | Onboarding task có đường dẫn rõ |

### 1.2. Mục tiêu sản phẩm

Vì MediMate AI thuộc domain sức khỏe, cấu trúc code phải hỗ trợ kiểm soát sản phẩm:

- Dễ xác định feature nào là production, feature nào là demo.
- Dễ gắn safety disclaimer vào symptom/chat/medication/records.
- Dễ kiểm tra route nào cần auth, premium, role hoặc profile setup.
- Dễ chặn mock y tế xuất hiện như dữ liệu thật.
- Dễ audit API nào gửi dữ liệu sức khỏe.
- Dễ tách AI provider boundary qua backend gateway.

### 1.3. Không phải mục tiêu

Không dùng migration này để làm các việc sau nếu chưa có kế hoạch riêng:

- Không rewrite toàn bộ app.
- Không chuyển framework.
- Không chuyển TypeScript đồng loạt trong cùng PR migration thư mục.
- Không đổi UI design system toàn bộ cùng lúc với move file.
- Không đổi API contract nếu task chỉ là refactor folder.
- Không đổi route path nếu task chỉ là move/refactor.
- Không xóa test để migration dễ hơn.
- Không đổi behavior ngầm mà không ghi rõ trong PR.

---

## 2. Định nghĩa feature-first trong repo này

### 2.1. Feature-first là gì

Feature-first nghĩa là code được tổ chức quanh capability/domain, thay vì chỉ tổ chức theo loại file.

Ví dụ với symptom analysis, thay vì nằm rải rác:

```txt
src/pages/SymptomAnalysisPage.jsx
src/services/symptomAnalysisService.js
src/components/medicalAssistant/*
src/styles/global.css
src/utils/symptomHelpers.js
```

Target là gom các phần thuộc cùng capability vào một vùng:

```txt
src/features/symptom-analysis/
├── pages/
├── components/
├── hooks/
├── services/
├── model/
├── styles/
└── index.js
```

### 2.2. Feature-first không có nghĩa là mọi thứ đều nằm trong feature

Các phần dùng chung vẫn phải nằm ở `shared/`:

- `Button`, `Card`, `Dialog`, `Field`, `Table` không thuộc riêng feature nào.
- `apiClient`, `endpoints`, error normalizer là foundation.
- `useDebounce`, `useDisclosure`, `formatDate`, `cn` là shared utility.
- Design tokens, reset, base CSS là shared styles.

Nếu mỗi feature tự viết Button/Table/Dialog riêng, repo sẽ tệ hơn chứ không tốt hơn.

### 2.3. Dấu hiệu một folder nên là feature

Một vùng nên được tách thành feature nếu có nhiều hơn hai điều kiện sau:

- Có route/page riêng.
- Có API service riêng.
- Có business rule riêng.
- Có form/state riêng.
- Có test riêng.
- Có owner/reviewer riêng.
- Có thể bật/tắt capability.
- Có thể cần docs riêng.
- Có UI components nội bộ chỉ phục vụ feature đó.

Ví dụ đủ điều kiện:

- `admin`
- `auth`
- `symptom-analysis`
- `map`
- `payment`
- `patient-dashboard`
- `doctor-invitation`
- `profile`

---

## 3. Cấu trúc hiện tại và vấn đề phát sinh

### 3.1. Cấu trúc hiện tại

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
```

### 3.2. Điểm mạnh của cấu trúc hiện tại

| Điểm mạnh | Vì sao nên giữ |
| --- | --- |
| Dễ hiểu với dự án nhỏ | Developer React quen `pages/components/services` |
| API layer đã tập trung | Có `apiClient`, `endpoints`, domain service |
| Route metadata tập trung | Có `router/routes.js`, access/navigation/alias rõ |
| UI primitive đã có nền | `components/ui` có Button/Card/Dialog/Field/Table |
| E2E tests đã tồn tại | Hỗ trợ migration không phá flow |

### 3.3. Vấn đề khi repo lớn lên

| Vấn đề | Ví dụ | Hệ quả |
| --- | --- | --- |
| Code một feature bị rải | Symptom có page/service/component/style nhiều nơi | Dev mới khó tìm code |
| Page lớn | `AdminWorkspacePage.jsx`, `DashboardPage.jsx`, `NearbyClinicPage.jsx` | Khó review, khó test |
| CSS global phình | `global.css`, `operator-workspace.css` | Dễ regression UI |
| Import lộn tầng | UI có nguy cơ gọi API hoặc dùng service trực tiếp | Tăng coupling |
| Duplicate pattern | Mỗi page tự handling loading/error/form | UX không nhất quán |
| Ownership mờ | Không rõ ai review admin/auth/payment | PR rủi ro bị merge thiếu kiểm soát |

---

## 4. Cấu trúc mục tiêu

### 4.1. Tree mục tiêu cấp cao

```txt
src/
├── main.jsx
├── app/
│   ├── App.jsx
│   ├── SpaRoot.jsx
│   ├── providers/
│   │   ├── AppProviders.jsx
│   │   └── index.js
│   ├── router/
│   │   ├── routes.js
│   │   ├── access.js
│   │   ├── navigation.js
│   │   ├── returnIntent.js
│   │   └── index.js
│   └── styles/
│       └── app.css
├── features/
│   ├── auth/
│   ├── landing/
│   ├── patient-dashboard/
│   ├── symptom-analysis/
│   ├── chatbot/
│   ├── map/
│   ├── profile/
│   ├── payment/
│   ├── doctor-invitation/
│   ├── staff/
│   └── admin/
└── shared/
    ├── api/
    ├── config/
    ├── ui/
    ├── hooks/
    ├── lib/
    ├── styles/
    └── constants/
```

### 4.2. Vai trò từng layer

| Layer | Được phép làm | Không được phép làm |
| --- | --- | --- |
| `app` | Bootstrap app, provider, route composition, shell cấp cao | Business logic chi tiết của feature |
| `features` | Chứa page/component/hook/service/model theo capability | Import sâu vào feature khác không qua public API |
| `shared/api` | API client, endpoint base, error parser, auth header, retry/timeout helper | Render UI hoặc chứa copy của page |
| `shared/ui` | Component primitive không biết domain | Gọi API, đọc route business, gọi auth service |
| `shared/hooks` | Hook dùng chung, không biết domain cụ thể | Chứa rule admin/payment/symptom |
| `shared/lib` | Utility thuần, guards, formatters | Phụ thuộc component hoặc browser nếu không cần |
| `shared/config` | Env validation, feature flags, app constants | Chứa secret hoặc business logic UI |
| `shared/styles` | tokens, reset, base, layout, utilities | Feature-specific selector/hack |

### 4.3. Rule một chiều

Import phải đi theo hướng:

```txt
app -> features -> shared
app -> shared
features -> shared
shared -> không import app/features
```

Nếu cần feature A dùng logic của feature B, ưu tiên một trong các cách:

1. Đưa phần logic đó xuống `shared/` nếu nó thật sự dùng chung.
2. Feature B expose public API qua `index.js` nếu đó là contract chính thức.
3. Tạo orchestration ở `app/` nếu logic là composition cấp app.
4. Không import sâu vào file nội bộ của feature khác.

---

## 5. Mapping từ cấu trúc hiện tại sang target

### 5.1. Mapping tổng quan

| Hiện tại | Target | Migration strategy |
| --- | --- | --- |
| `src/App.jsx` | `src/app/App.jsx` | Move sau khi route/feature ổn, giữ re-export nếu cần |
| `src/SpaRoot.jsx` | `src/app/SpaRoot.jsx` | Move cùng app layer |
| `src/router/*` | `src/app/router/*` | Vì router composition gắn app, ưu tiên app/router |
| `src/services/apiClient.js` | `src/shared/api/apiClient.js` | Move bằng compatibility export |
| `src/services/endpoints.js` | `src/shared/api/endpoints.js` | Move sau khi services ổn |
| `src/components/ui/*` | `src/shared/ui/*` | Move khi alias import đã có |
| `src/styles/*` | `src/shared/styles/*` + `features/*/styles` | Tách từng cụm selector, không move một lần |
| `src/pages/AuthPages.jsx` | `src/features/auth/pages/*` | Tách form trước, page sau |
| `src/pages/AdminWorkspacePage.jsx` | `src/features/admin/AdminWorkspacePage.jsx` + sections | Ưu tiên cao nhất |
| `src/pages/SymptomAnalysisPage.jsx` | `src/features/symptom-analysis/*` | Tách hook flow và UI nhỏ |
| `src/pages/DashboardPage.jsx` | `src/features/patient-dashboard/*` | Tách intake/result/facility recommendation |
| `src/pages/NearbyClinicPage.jsx` | `src/features/map/*` | Tách map/list/filter/review |
| `src/pages/PricingPage.jsx` | `src/features/payment/pricing/*` | Tách plan list/card/checkout hook |
| `src/pages/PaymentResultPage.jsx` | `src/features/payment/result/*` | Tách status resolver |
| `src/pages/DoctorRegisterInvitationPage.jsx` | `src/features/doctor-invitation/*` | Tách validate/register flow |
| `src/utils/roles.js` | `src/shared/lib/auth/roles.js` hoặc `src/features/auth/model` | Chọn theo ownership lâu dài |
| `src/state/displayPreferences.js` | `src/shared/config` hoặc `src/shared/state` | Nếu generic, đưa shared |

### 5.2. Mapping service domain

| Service hiện tại | Target đề xuất | Ghi chú |
| --- | --- | --- |
| `authService.js` | `features/auth/services/authApi.js` | Auth domain ownership |
| `userService.js` | `features/admin/users/services/usersApi.js` hoặc `features/user/services` | Tùy user dùng chủ yếu trong admin hay toàn app |
| `departmentService.js` | `features/admin/departments/services/departmentApi.js` + shared nếu public | Nếu department dùng symptom/map, cân nhắc shared domain API |
| `facilityService.js` | `features/map/services/facilityApi.js` hoặc `features/admin/facilities/services` | Có thể chia public/admin API |
| `doctorService.js` | `features/admin/doctors/services/doctorApi.js` | Nếu public doctor search có feature riêng |
| `doctorInvitationService.js` | `features/doctor-invitation/services/doctorInvitationApi.js` | Flow riêng |
| `symptomAnalysisService.js` | `features/symptom-analysis/services/symptomAnalysisApi.js` | Flow y tế quan trọng |
| `subscriptionService.js` | `features/payment/services/subscriptionApi.js` | Pricing/payment domain |
| `aiConfigService.js` | `features/admin/ai-configs/services/aiConfigApi.js` | Admin-only |
| `chatbotService.js` | `features/chatbot/services/chatbotApi.js` | Không gọi provider trực tiếp từ client |

### 5.3. Mapping component domain

| Component hiện tại | Target | Ghi chú |
| --- | --- | --- |
| `components/adminAIConfigs/*` | `features/admin/ai-configs/components/*` | Move sau khi section ổn |
| `components/adminDoctors/*` | `features/admin/doctors/components/*` | Có module tương đối rõ |
| `components/adminSubscriptions/*` | `features/admin/subscriptions/components/*` | Liên quan payment/admin plan |
| `components/landing/*` | `features/landing/components/*` | Landing feature riêng |
| `components/landingChat/*` | `features/chatbot/landing-chat/components/*` hoặc `features/landing/components` | Chọn theo ownership |
| `components/medicalAssistant/*` | `features/symptom-analysis/components/*` hoặc `features/chatbot/components/*` | Cần phân loại kỹ |
| `components/patient/*` | `features/profile` hoặc `features/patient-dashboard` | Không để patient trở thành bucket chung |
| `components/preferences/*` | `shared/config/preferences` hoặc feature profile | Tùy dùng chung hay cá nhân |
| `components/workspace/*` | `app/shells` hoặc `shared/ui/layout` | Nếu là shell layout dùng nhiều role |
| `components/ui/*` | `shared/ui/*` | Primitive dùng chung |

---

## 6. Quy tắc đặt tên thư mục và file

### 6.1. Tên feature folder

Dùng `kebab-case` cho folder feature:

```txt
symptom-analysis
patient-dashboard
doctor-invitation
ai-configs
```

Không dùng:

```txt
SymptomAnalysis
symptom_analysis
symptom
feature1
newFeature
```

Lý do:

- Dễ đọc trong URL/path.
- Nhất quán với nhiều repo frontend chuyên nghiệp.
- Tránh trộn PascalCase component với folder domain.

### 6.2. Tên component

Component React dùng `PascalCase`:

```txt
SymptomInputForm.jsx
ClinicalQuestionList.jsx
PaymentStatusCard.jsx
AdminUsersSection.jsx
```

Quy tắc:

- Tên phải nói rõ trách nhiệm.
- Không đặt tên chung chung như `Form.jsx`, `List.jsx`, `Modal.jsx` trong folder lớn nếu dễ gây nhầm.
- Nếu nằm trong feature nhỏ, tên có thể ngắn hơn nhưng vẫn phải rõ khi import.

### 6.3. Tên hook

Hook dùng `useXxx`:

```txt
useSymptomAnalysisFlow.js
usePaymentStatus.js
useAdminUsers.js
useFacilityFilters.js
```

Hook feature nên expose state/action cần thiết, không expose quá nhiều internal setter.

### 6.4. Tên service

Service API nên dùng hậu tố `Api`:

```txt
authApi.js
symptomAnalysisApi.js
paymentApi.js
adminUsersApi.js
facilityApi.js
```

Không dùng tên mơ hồ:

```txt
service.js
api.js
helper.js
handler.js
```

### 6.5. Tên model/normalize

Model/normalizer nên rõ input/output:

```txt
normalizePaymentStatus.js
normalizeFacility.js
symptomAnalysisModel.js
adminUserModel.js
```

Không để normalize phức tạp nằm trực tiếp trong JSX render.

### 6.6. Tên style file

Style theo feature:

```txt
symptom-analysis.css
admin-users.css
payment-result.css
map-page.css
```

Style shared:

```txt
tokens.css
base.css
layout.css
utilities.css
ui.css
```

---

## 7. Feature folder template chuẩn

### 7.1. Feature vừa và nhỏ

```txt
features/example-feature/
├── pages/
│   └── ExamplePage.jsx
├── components/
│   ├── ExampleForm.jsx
│   ├── ExampleList.jsx
│   └── ExampleEmptyState.jsx
├── hooks/
│   └── useExampleFeature.js
├── services/
│   └── exampleApi.js
├── model/
│   ├── normalizeExample.js
│   └── exampleValidation.js
├── styles/
│   └── example-feature.css
└── index.js
```

### 7.2. Feature đơn giản chỉ có UI

```txt
features/landing/
├── LandingPage.jsx
├── components/
│   ├── HeroSection.jsx
│   ├── FeatureGrid.jsx
│   └── SymptomDemoSection.jsx
├── data/
│   └── landingContent.js
├── styles/
│   └── landing.css
└── index.js
```

### 7.3. Feature phức tạp nhiều subdomain

```txt
features/admin/
├── AdminWorkspacePage.jsx
├── AdminShell.jsx
├── AdminSectionRenderer.jsx
├── shared/
│   ├── AdminPageHeader.jsx
│   ├── AdminToolbar.jsx
│   ├── adminPermissions.js
│   └── adminFormatters.js
├── overview/
├── users/
├── doctors/
├── ai-configs/
├── subscriptions/
├── departments/
├── facilities/
└── staff/
```

### 7.4. Public API qua `index.js`

Mỗi feature nên có `index.js`, nhưng chỉ export những gì bên ngoài thật sự cần:

Tốt:

```js
export { SymptomAnalysisPage } from './pages/SymptomAnalysisPage';
export { useSymptomAnalysisFlow } from './hooks/useSymptomAnalysisFlow';
```

Không tốt:

```js
export * from './components/InternalQuestionRow';
export * from './model/privateStateMachine';
export * from './constants/internalCopy';
```

Nguyên tắc: public API càng nhỏ, refactor nội bộ càng dễ.

---

## 8. Import boundary rules

### 8.1. Quy tắc bắt buộc

| From | Được import | Không được import |
| --- | --- | --- |
| `app/*` | `features/*`, `shared/*` | File nội bộ sâu nếu có public API tốt hơn |
| `features/*` | `shared/*`, public API của feature khác nếu được phép | `app/*`, file nội bộ của feature khác |
| `shared/ui/*` | `shared/lib`, `shared/styles` | `features/*`, `services/auth`, `router` business |
| `shared/api/*` | `shared/config`, `shared/lib` | React component, page, feature UI |
| `shared/lib/*` | `shared/lib` khác nếu thuần | DOM/UI/API nếu không cần |
| `features/admin/users/*` | `features/admin/shared`, `shared/*` | `features/admin/doctors/components/*` trực tiếp |

### 8.2. Ví dụ import tốt

```js
import { Button, Dialog } from '@/shared/ui';
import { formatDate } from '@/shared/lib/date';
import { adminUsersApi } from '../services/adminUsersApi';
```

### 8.3. Ví dụ import xấu

```js
import { Button } from '../../components/ui/Button';
import { apiRequest } from '../../../services/apiClient';
import DoctorInternalRow from '@/features/admin/doctors/components/DoctorInternalRow';
```

### 8.4. Khi nào được import từ feature khác

Chỉ import từ feature khác khi:

- Feature đó export public API qua `index.js`.
- Có lý do domain rõ ràng.
- Không tạo circular dependency.
- Reviewer của cả hai feature đồng ý nếu thay đổi contract.

Ví dụ hợp lệ:

```js
import { getPaymentReturnPath } from '@/features/payment';
```

Ví dụ không hợp lệ:

```js
import { PaymentStatusInternalBadge } from '@/features/payment/result/components/PaymentStatusInternalBadge';
```

---

## 9. Path alias và cấu hình import

### 9.1. Alias đề xuất

Trong `vite.config.js`:

```js
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

### 9.2. Lợi ích

Trước:

```js
import { Button } from '../../../components/ui/Button';
import { apiRequest } from '../../services/apiClient';
```

Sau:

```js
import { Button } from '@/shared/ui';
import { apiRequest } from '@/shared/api';
```

Lợi ích:

- Move file ít gây vỡ import tương đối.
- Dễ nhìn dependency direction.
- Giảm `../../../` khó review.

### 9.3. Thời điểm áp dụng

Nên áp dụng alias ở giai đoạn chuẩn bị hoặc đầu migration. Tuy nhiên, không nên đổi toàn bộ import trong một PR khổng lồ. Quy tắc:

- PR alias chỉ thêm config và update một vài import mẫu.
- Các PR migration sau update import theo vùng đang sửa.
- Không mở PR chỉ đổi hàng trăm import nếu không có test/build evidence.

---

## 10. Compatibility export strategy

### 10.1. Vì sao cần compatibility export

Nếu move `src/services/apiClient.js` sang `src/shared/api/apiClient.js` và sửa mọi import ngay, PR sẽ rất lớn. Thay vào đó, dùng compatibility export để migration dần.

Ví dụ:

```js
// src/services/apiClient.js
export * from '../shared/api/apiClient';
```

Code cũ vẫn chạy:

```js
import { apiRequest } from '../services/apiClient';
```

Code mới dùng path mới:

```js
import { apiRequest } from '@/shared/api';
```

### 10.2. Quy tắc compatibility export

- Chỉ re-export, không thêm logic mới.
- Có comment ngày tạo và điều kiện xóa.
- Không để tồn tại vô hạn mà không owner.
- Mỗi sprint kiểm tra import cũ giảm chưa.

Mẫu comment:

```js
// Compatibility export created during feature-first migration.
// TODO: remove after all imports migrate to '@/shared/api'. Owner: frontend-platform.
export * from '../shared/api/apiClient';
```

### 10.3. Khi nào được xóa compatibility export

Chỉ xóa khi:

```bash
rg "services/apiClient|services/endpoints|components/ui" src tests
```

không còn import cũ hoặc chỉ còn trong file compatibility đã biết.

---

## 11. Lộ trình migration theo phase

### 11.1. Phase 0 — Chuẩn bị guardrails

Mục tiêu: giảm rủi ro trước khi move file.

#### Việc cần làm

- Chốt target folder structure.
- Chốt naming convention.
- Thêm path alias nếu team đồng ý.
- Tạo PR template có checklist migration.
- Ghi baseline lint/build/test.
- Xác định owner cho `admin`, `auth`, `api`, `payment`, `symptom`, `css`.
- Tạo issue tracking cho từng phase.
- Tạo rule “không refactor nhiều vùng cùng lúc”.

#### Acceptance criteria

- Tài liệu migration được team thống nhất.
- `npm run lint` và `npm run build` baseline được ghi nhận.
- PR template có mục scope, risk, test evidence.
- Migration task có owner.

#### Rủi ro

- Bỏ qua phase chuẩn bị khiến migration thành một chuỗi PR lớn khó review.
- Không có baseline nên không biết lỗi do migration hay tồn tại từ trước.

### 11.2. Phase 1 — Tách admin sections

Mục tiêu: giảm rủi ro lớn nhất từ page lớn.

#### Trạng thái target sau phase 1

```txt
src/features/admin/
├── AdminSectionRenderer.jsx
├── overview/AdminOverviewSection.jsx
├── ai-configs/AdminAiConfigsSection.jsx
├── doctors/AdminDoctorsSection.jsx
├── subscriptions/AdminSubscriptionsSection.jsx
├── users/AdminUsersSection.jsx
├── departments/AdminDepartmentsSection.jsx
├── facilities/AdminFacilitiesSection.jsx
└── staff/AdminStaffSection.jsx
```

`src/pages/AdminWorkspacePage.jsx` có thể vẫn tồn tại, nhưng chỉ điều phối section và shell.

#### Thứ tự PR khuyến nghị

| PR | Nội dung | Lý do | Test tối thiểu |
| --- | --- | --- | --- |
| PR1 | Tạo `features/admin`, tách overview | Ít rủi ro | lint/build/routes |
| PR2 | Tách AI configs | Có component riêng sẵn | admin-ai-configs |
| PR3 | Tách doctors | Có component riêng sẵn | admin-doctors |
| PR4 | Tách subscriptions | Có component riêng sẵn | admin-subscriptions/pricing smoke |
| PR5 | Tách users | CRUD nhạy hơn | admin-users |
| PR6 | Tách departments | CRUD vừa | admin-facilities/departments smoke |
| PR7 | Tách facilities | Có location/form risk | admin-facilities + map smoke nếu liên quan |
| PR8 | Tách staff | Liên quan role/approval | staff/admin role tests |
| PR9 | Dọn AdminWorkspacePage còn shell | Hoàn tất phase | full admin smoke |

### 11.3. Phase 2 — Tách user-facing medical flows

Mục tiêu: tách các flow ảnh hưởng trực tiếp người dùng và dữ liệu sức khỏe.

Feature ưu tiên:

1. `symptom-analysis`
2. `patient-dashboard`
3. `map`
4. `profile`
5. `chatbot`

Nguyên tắc:

- Medical safety copy không được mất khi tách component.
- API error/empty/loading phải rõ hơn hoặc ít nhất không tệ hơn trước.
- Mock/fallback phải được gắn nhãn nếu còn dùng.
- Không đổi flow y tế trong cùng PR move file nếu không có test.

### 11.4. Phase 3 — Tách payment/auth/doctor invitation

Mục tiêu: tách các flow nhạy về tiền, account và onboarding doctor.

Feature ưu tiên:

1. `auth`
2. `payment`
3. `doctor-invitation`
4. `staff`

Nguyên tắc:

- Không đổi route/access trong PR tách UI nếu không cần.
- Auth token/session logic phải có reviewer riêng.
- Payment status phải có fixture hoặc manual evidence cho success/pending/cancel/fail.
- Doctor invitation phải test token hợp lệ/hết hạn/đã dùng nếu có mock được.

### 11.5. Phase 4 — Chuẩn hóa shared layer

Mục tiêu: đưa API/UI/config/styles dùng chung vào đúng chỗ.

Target:

```txt
shared/
├── api/
│   ├── apiClient.js
│   ├── endpoints.js
│   ├── apiError.js
│   ├── authStorage.js
│   └── index.js
├── ui/
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Dialog.jsx
│   ├── Field.jsx
│   ├── Table.jsx
│   └── index.js
├── hooks/
├── lib/
├── config/
└── styles/
```

Không nên move toàn bộ shared trong một PR nếu import quá nhiều.

### 11.6. Phase 5 — Move app/router và dọn cũ

Mục tiêu: hoàn thiện cấu trúc và xóa nợ migration.

Việc cần làm:

- Move `App.jsx` vào `app/App.jsx`.
- Move `SpaRoot.jsx` vào `app/SpaRoot.jsx`.
- Move `router/*` vào `app/router/*`.
- Update imports.
- Chạy full route/navigation tests.
- Xóa compatibility exports đã hết dùng.
- Cập nhật docs.

---

## 12. Kế hoạch migration chi tiết theo feature

## 12.1. Admin workspace

### Mục tiêu

Biến admin từ một page lớn thành feature có section rõ ràng, giúp mỗi CRUD có owner, hook, component, service/model riêng.

### Target structure

```txt
features/admin/
├── AdminWorkspacePage.jsx
├── AdminShell.jsx
├── AdminSectionRenderer.jsx
├── shared/
│   ├── AdminPageHeader.jsx
│   ├── AdminTableActions.jsx
│   ├── AdminStatusBadge.jsx
│   ├── adminConstants.js
│   └── adminFormatters.js
├── overview/
│   └── AdminOverviewSection.jsx
├── users/
│   ├── AdminUsersSection.jsx
│   ├── components/
│   │   ├── AdminUsersTable.jsx
│   │   ├── AdminUserFormDialog.jsx
│   │   └── AdminUserFilters.jsx
│   ├── hooks/
│   │   └── useAdminUsers.js
│   ├── services/
│   │   └── adminUsersApi.js
│   ├── model/
│   │   └── adminUserModel.js
│   └── index.js
├── doctors/
├── ai-configs/
├── subscriptions/
├── departments/
├── facilities/
└── staff/
```

### Migration steps

1. Tạo folder `features/admin`.
2. Tạo `AdminSectionRenderer.jsx` nhưng chưa đổi behavior.
3. Tách `overview` trước.
4. Với mỗi section, copy logic từ `AdminWorkspacePage.jsx` sang section/hook tương ứng.
5. Giữ selector/test id cũ nếu test đang phụ thuộc.
6. Không đổi service call trong PR đầu.
7. Sau khi section ổn, mới move components hiện có vào feature.
8. Sau khi tất cả section tách, giảm `AdminWorkspacePage` thành shell/renderer.

### Before

```jsx
// AdminWorkspacePage.jsx
function AdminWorkspacePage({ initialSection }) {
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [aiConfigs, setAiConfigs] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  async function loadUsers() {}
  async function loadDoctors() {}
  async function loadAiConfigs() {}

  return (
    <main>
      {activeSection === 'users' && renderUsersSection()}
      {activeSection === 'doctors' && renderDoctorsSection()}
      {activeSection === 'ai-configs' && renderAiConfigsSection()}
    </main>
  );
}
```

### After

```jsx
// features/admin/AdminWorkspacePage.jsx
import { AdminSectionRenderer } from './AdminSectionRenderer';

export function AdminWorkspacePage({ initialSection }) {
  return (
    <AdminShell activeSection={initialSection}>
      <AdminSectionRenderer section={initialSection} />
    </AdminShell>
  );
}
```

```jsx
// features/admin/ai-configs/AdminAiConfigsSection.jsx
import { useAdminAiConfigs } from './hooks/useAdminAiConfigs';

export function AdminAiConfigsSection() {
  const {
    items,
    loading,
    error,
    createConfig,
    updateConfig,
    deleteConfig,
    refresh,
  } = useAdminAiConfigs();

  return (
    <section>
      {/* toolbar/table/modal */}
    </section>
  );
}
```

### Risks

- Tách logic làm mất state reset cũ.
- CSS selector phụ thuộc DOM hierarchy cũ.
- Test E2E dùng selector brittle.
- Section import chéo nhau gây circular dependency.
- CRUD behavior đổi ngầm.

### Verification

- `npm run lint`
- `npm run build`
- Admin section E2E tương ứng.
- Manual test list/create/update/delete/status.
- Screenshot trước/sau nếu UI thay đổi.

---

## 12.2. Symptom analysis

### Mục tiêu

Tách flow symptom thành hook/state machine nhẹ và component nhỏ. Đây là vùng y tế nên phải giữ safety copy, error copy và empty state rõ ràng.

### Target structure

```txt
features/symptom-analysis/
├── pages/
│   └── SymptomAnalysisPage.jsx
├── components/
│   ├── SymptomInputForm.jsx
│   ├── ClinicalQuestionList.jsx
│   ├── ClinicalQuestionAnswerForm.jsx
│   ├── SymptomResultPanel.jsx
│   ├── SymptomEmptyQuestionsState.jsx
│   ├── SymptomErrorState.jsx
│   └── MedicalSafetyNotice.jsx
├── hooks/
│   └── useSymptomAnalysisFlow.js
├── services/
│   └── symptomAnalysisApi.js
├── model/
│   ├── normalizeClinicalQuestions.js
│   ├── normalizeSymptomResult.js
│   ├── emergencyKeywords.js
│   └── symptomFlowSteps.js
├── styles/
│   └── symptom-analysis.css
└── index.js
```

### Hook contract đề xuất

```js
const flow = useSymptomAnalysisFlow();

return {
  step,
  input,
  questions,
  answers,
  result,
  loading,
  error,
  sessionId,
  setInput,
  answerQuestion,
  submitInput,
  submitAnswers,
  reset,
};
```

### Rules

- Component con không gọi API.
- API call nằm trong hook hoặc service.
- Normalization nằm trong model/service.
- Emergency/safety copy không được xóa.
- Backend trả `questions: []` phải có UI riêng, không crash.

### Acceptance criteria

- Nhập triệu chứng vẫn gợi ý câu hỏi.
- Backend trả câu hỏi rỗng vẫn có hướng dẫn tiếp theo.
- Submit answers vẫn hiển thị result hoặc error rõ.
- Loading/error/empty state không bị mất.
- Không có wording khẳng định chẩn đoán.
- Test symptom hoặc manual evidence có đủ.

---

## 12.3. Patient dashboard

### Mục tiêu

Tách `DashboardPage` thành các phần: shell dashboard, symptom intake, recommendation result, facility/doctor suggestion, summary cards.

### Target structure

```txt
features/patient-dashboard/
├── pages/
│   └── DashboardPage.jsx
├── components/
│   ├── DashboardHero.jsx
│   ├── SymptomIntakeCard.jsx
│   ├── RecommendationResult.jsx
│   ├── FacilityRecommendationList.jsx
│   ├── DoctorSuggestionList.jsx
│   └── DashboardQuickActions.jsx
├── hooks/
│   ├── useDashboardSymptomIntake.js
│   └── useFacilityRecommendations.js
├── services/
│   └── dashboardRecommendationApi.js
├── model/
│   ├── normalizeRecommendation.js
│   └── recommendationFallbackPolicy.js
└── index.js
```

### Rules

- Fallback/mock hospital không được hiển thị như dữ liệu live nếu API lỗi.
- Ranking/normalize không nằm trong JSX.
- Facility thiếu tọa độ vẫn phải render an toàn.
- Symptom copy phải giữ tính hỗ trợ, không chẩn đoán.

### Verification

- Dashboard load khi user auth.
- Submit symptom intake không crash.
- API fail có fallback/error rõ.
- Empty recommendation có CTA phù hợp.
- Mobile layout không vỡ.

---

## 12.4. Map/facility

### Mục tiêu

Tách `NearbyClinicPage` thành map container, marker layer, facility list, filters, review panel và geolocation handling.

### Target structure

```txt
features/map/
├── pages/
│   └── NearbyClinicPage.jsx
├── components/
│   ├── ClinicMap.jsx
│   ├── ClinicMarkerLayer.jsx
│   ├── ClinicList.jsx
│   ├── ClinicFilters.jsx
│   ├── ClinicReviewPanel.jsx
│   ├── GeolocationPrompt.jsx
│   └── MapFallbackState.jsx
├── hooks/
│   ├── useClinics.js
│   ├── useClinicFilters.js
│   ├── useGeolocation.js
│   └── useMapSelection.js
├── services/
│   └── facilityApi.js
├── model/
│   ├── normalizeFacility.js
│   ├── facilityFilters.js
│   └── geoDistance.js
├── styles/
│   └── map.css
└── index.js
```

### Lazy loading rule

Map libraries nên chỉ load ở route map hoặc route thực sự cần map:

```jsx
const NearbyClinicPage = lazy(() => import('@/features/map'));
```

Không import `maplibre-gl` ở landing/app root nếu không cần.

### Edge cases phải giữ

- User từ chối geolocation.
- Browser không hỗ trợ geolocation.
- Facility thiếu lat/lng.
- API trả list rỗng.
- Map tile load chậm/lỗi.
- User dùng mobile.

---

## 12.5. Payment

### Mục tiêu

Tách pricing và payment result, chuẩn hóa checkout loading/error/status.

### Target structure

```txt
features/payment/
├── pricing/
│   ├── PricingPage.jsx
│   ├── PricingPlanList.jsx
│   ├── PricingPlanCard.jsx
│   ├── PricingCheckoutNotice.jsx
│   └── usePricingCheckout.js
├── result/
│   ├── PaymentResultPage.jsx
│   ├── PaymentStatusCard.jsx
│   ├── PaymentReturnActions.jsx
│   └── usePaymentReturnStatus.js
├── services/
│   ├── paymentApi.js
│   └── subscriptionApi.js
├── model/
│   ├── normalizePaymentStatus.js
│   ├── paymentStatusLabels.js
│   └── paymentReturnParser.js
└── index.js
```

### Status cases cần support

| Case | UI cần có |
| --- | --- |
| Success | Thông báo thành công, CTA về dashboard/chat |
| Pending | Nói rõ đang chờ xác nhận, có retry/check lại |
| Cancel | Thông báo hủy, CTA về pricing |
| Failed | Thông báo lỗi, hướng dẫn thử lại/support |
| Missing orderCode | Không crash, hướng dẫn quay lại pricing/support |
| Unauthorized | Redirect login có returnTo |

### Không làm trong PR folder migration

- Không đổi provider payment.
- Không đổi API contract checkout.
- Không đổi pricing copy lớn.
- Không đổi premium gate nếu không có task riêng.

---

## 12.6. Auth

### Mục tiêu

Tách `AuthPages.jsx` thành form riêng, hook riêng và service/model rõ. Auth là vùng rủi ro cao nên không trộn UI refactor với token strategy change.

### Target structure

```txt
features/auth/
├── pages/
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── ForgotPasswordPage.jsx
│   └── ChangePasswordPage.jsx
├── components/
│   ├── AuthLayout.jsx
│   ├── LoginForm.jsx
│   ├── SignupForm.jsx
│   ├── GoogleLoginButton.jsx
│   └── AuthErrorMessage.jsx
├── hooks/
│   ├── useLoginForm.js
│   ├── useSignupForm.js
│   └── useAuthRedirect.js
├── services/
│   └── authApi.js
├── model/
│   ├── normalizeAuthResponse.js
│   ├── authValidation.js
│   └── authStoragePolicy.js
└── index.js
```

### Rules

- PR tách form không đổi token storage.
- Logout clear session không phụ thuộc UI page.
- `returnTo` phải giữ đúng.
- Error message auth phải thống nhất.
- Không log token/user profile.

---

## 12.7. Doctor invitation

### Mục tiêu

Tách flow validate invitation token và register doctor thành hook/form/model rõ.

### Target structure

```txt
features/doctor-invitation/
├── pages/
│   └── DoctorRegisterInvitationPage.jsx
├── components/
│   ├── InvitationTokenState.jsx
│   ├── DoctorInvitationForm.jsx
│   ├── DoctorInvitationSuccess.jsx
│   └── DoctorInvitationError.jsx
├── hooks/
│   └── useDoctorInvitationRegistration.js
├── services/
│   └── doctorInvitationApi.js
├── model/
│   ├── doctorInvitationValidation.js
│   └── normalizeInvitation.js
└── index.js
```

### Edge cases

- Token thiếu.
- Token invalid.
- Token expired.
- Token already used.
- API validate success nhưng register fail.
- User nhập form thiếu field.
- Network error.

---

## 12.8. Shared API

### Mục tiêu

Tách API foundation khỏi domain service, chuẩn hóa request/response/error/auth/pagination.

### Target structure

```txt
shared/api/
├── apiClient.js
├── endpoints.js
├── apiError.js
├── apiRequestConfig.js
├── authStorage.js
├── pagination.js
├── retryPolicy.js
└── index.js
```

### Boundary

`shared/api` được phép biết:

- base URL;
- auth token header;
- parse JSON;
- timeout/retry nếu có;
- normalize error dạng generic;
- pagination helper.

`shared/api` không được biết:

- UI copy của page;
- domain-specific business rule;
- symptom emergency logic;
- payment status display text;
- admin table state.

---

## 12.9. Shared UI

### Mục tiêu

Di chuyển primitive UI vào `shared/ui`, bảo đảm chúng không phụ thuộc domain.

### Target structure

```txt
shared/ui/
├── Button.jsx
├── Card.jsx
├── Dialog.jsx
├── Field.jsx
├── Table.jsx
├── Badge.jsx
├── Spinner.jsx
├── EmptyState.jsx
├── ErrorState.jsx
├── index.js
└── ui.css
```

### Rule primitive UI

Primitive UI được phép nhận props generic:

```jsx
<Button variant="primary" loading disabled>Save</Button>
<Field label="Email" error={error} />
<Dialog title="Confirm delete" open={open} onClose={close} />
```

Primitive UI không được nhận props domain kiểu:

```jsx
<Button isPremiumPlan />
<Field symptomSeverity="high" />
<Dialog doctorApprovalMode />
```

Nếu có domain behavior, đặt ở feature component bao ngoài.

---

## 12.10. Shared styles

### Mục tiêu

Tách CSS foundation khỏi CSS feature.

### Target structure

```txt
shared/styles/
├── tokens.css
├── reset.css
├── base.css
├── typography.css
├── layout.css
├── utilities.css
└── index.css
```

Feature styles:

```txt
features/admin/styles/admin.css
features/map/styles/map.css
features/payment/styles/payment.css
features/symptom-analysis/styles/symptom-analysis.css
```

### Move CSS rule

- Không move CSS hàng loạt nếu không có visual evidence.
- Không đổi tên class cùng lúc với move nếu không cần.
- Không dùng `!important` để chữa regression do order sai.
- Selector feature phải có prefix rõ, ví dụ `.admin-users-*`, `.symptom-*`, `.payment-*`.

---

## 13. Task cards migration có thể đưa vào backlog


### M0-01. Thiết lập path alias `@`

#### Mục tiêu

Giảm import tương đối phức tạp và chuẩn bị migration thư mục.

#### Phạm vi dự kiến

- vite.config.js, jsconfig.json nếu có, một vài import mẫu
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M0-02. Tạo PR template cho migration

#### Mục tiêu

Bắt buộc developer khai báo scope, risk, test evidence và docs update.

#### Phạm vi dự kiến

- .github/pull_request_template.md hoặc docs/process
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M0-03. Ghi baseline lint/build/test trước migration

#### Mục tiêu

Biết trạng thái ban đầu để phân biệt lỗi cũ và lỗi do migration.

#### Phạm vi dự kiến

- package scripts, CI logs, docs tracking
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M0-04. Tạo owner map cho các vùng rủi ro

#### Mục tiêu

Đảm bảo auth/API/admin/payment/symptom/CSS có reviewer phù hợp.

#### Phạm vi dự kiến

- CODEOWNERS hoặc docs ownership
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

Medium

### M1-01. Tạo `features/admin` và tách Admin overview

#### Mục tiêu

Bắt đầu migration admin bằng section ít rủi ro.

#### Phạm vi dự kiến

- src/pages/AdminWorkspacePage.jsx, src/features/admin/overview
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M1-02. Tách Admin AI Configs section

#### Mục tiêu

Giảm logic AI config khỏi AdminWorkspacePage và chuẩn bị ownership riêng.

#### Phạm vi dự kiến

- src/features/admin/ai-configs, components/adminAIConfigs, aiConfigService
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M1-03. Tách Admin Doctors section

#### Mục tiêu

Tách logic doctor CRUD và approval khỏi page lớn.

#### Phạm vi dự kiến

- src/features/admin/doctors, components/adminDoctors, doctorService
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M1-04. Tách Admin Subscriptions section

#### Mục tiêu

Tách plan/subscription admin để tránh lẫn pricing UI.

#### Phạm vi dự kiến

- src/features/admin/subscriptions, subscriptionService
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M1-05. Tách Admin Users section

#### Mục tiêu

Tách user management, approve/delete/filter khỏi page lớn.

#### Phạm vi dự kiến

- src/features/admin/users, userService
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M1-06. Tách Admin Departments section

#### Mục tiêu

Tách department CRUD thành module riêng.

#### Phạm vi dự kiến

- src/features/admin/departments, departmentService
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

Medium

### M1-07. Tách Admin Facilities section

#### Mục tiêu

Tách facility CRUD/location/form validation khỏi page lớn.

#### Phạm vi dự kiến

- src/features/admin/facilities, facilityService
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M1-08. Tách Admin Staff section

#### Mục tiêu

Tách staff approval/role logic thành module riêng.

#### Phạm vi dự kiến

- src/features/admin/staff
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M1-09. Dọn AdminWorkspacePage thành shell/renderer

#### Mục tiêu

Hoàn tất phase admin, page chỉ điều phối section.

#### Phạm vi dự kiến

- AdminWorkspacePage, AdminShell, AdminSectionRenderer
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M2-01. Tách SymptomAnalysisPage thành feature

#### Mục tiêu

Tách flow y tế quan trọng thành components/hook/model/service.

#### Phạm vi dự kiến

- features/symptom-analysis, symptomAnalysisService
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M2-02. Tách DashboardPage thành patient-dashboard

#### Mục tiêu

Giảm logic intake/recommendation/fallback khỏi page lớn.

#### Phạm vi dự kiến

- features/patient-dashboard, DashboardPage
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M2-03. Tách NearbyClinicPage thành map feature

#### Mục tiêu

Tách map/list/filter/review/geolocation, chuẩn bị lazy loading.

#### Phạm vi dự kiến

- features/map, NearbyClinicPage
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M2-04. Tách Profile feature

#### Mục tiêu

Tách patient profile setup/form/model/service.

#### Phạm vi dự kiến

- features/profile, patientProfileService
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

Medium

### M2-05. Tách Chatbot feature

#### Mục tiêu

Tách chat UI/service và chuẩn bị backend AI gateway boundary.

#### Phạm vi dự kiến

- features/chatbot, chatbotService, landingChat
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M3-01. Tách AuthPages thành auth feature

#### Mục tiêu

Tách login/signup/forgot/change form, giữ returnTo và session behavior.

#### Phạm vi dự kiến

- features/auth, AuthPages, authService
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M3-02. Tách PricingPage thành payment/pricing

#### Mục tiêu

Tách plan list/card/checkout loading state.

#### Phạm vi dự kiến

- features/payment/pricing, PricingPage
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M3-03. Tách PaymentResultPage thành payment/result

#### Mục tiêu

Tách status resolver cho success/pending/cancel/fail.

#### Phạm vi dự kiến

- features/payment/result, PaymentResultPage
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M3-04. Tách DoctorRegisterInvitationPage

#### Mục tiêu

Tách validate token/register form edge cases.

#### Phạm vi dự kiến

- features/doctor-invitation
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

Medium

### M4-01. Move apiClient/endpoints sang shared/api

#### Mục tiêu

Chuẩn hóa API foundation và giữ compatibility exports.

#### Phạm vi dự kiến

- shared/api, services/apiClient.js, services/endpoints.js
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M4-02. Move components/ui sang shared/ui

#### Mục tiêu

Chuẩn hóa UI primitive dùng chung.

#### Phạm vi dự kiến

- shared/ui, components/ui
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

Medium

### M4-03. Tách shared hooks/lib/config

#### Mục tiêu

Đưa utility/hook generic khỏi feature/page.

#### Phạm vi dự kiến

- shared/hooks, shared/lib, shared/config
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

Medium

### M4-04. Tách shared/styles foundation

#### Mục tiêu

Giảm global CSS và tách token/base/layout/utilities.

#### Phạm vi dự kiến

- shared/styles, styles/global.css
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M5-01. Move App/SpaRoot vào app layer

#### Mục tiêu

Hoàn thiện bootstrap/app composition.

#### Phạm vi dự kiến

- app/App.jsx, app/SpaRoot.jsx, main.jsx
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

Medium

### M5-02. Move router vào app/router

#### Mục tiêu

Hoàn thiện app routing layer và giữ route tests pass.

#### Phạm vi dự kiến

- app/router, src/router compatibility
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

High

### M5-03. Xóa compatibility exports đã hết dùng

#### Mục tiêu

Dọn nợ migration sau khi import mới ổn định.

#### Phạm vi dự kiến

- services re-export, components old paths
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

Medium

### M5-04. Dọn dead code/CSS sau migration

#### Mục tiêu

Giảm code chết và tránh docs/source mâu thuẫn.

#### Phạm vi dự kiến

- src, styles, docs
- Test liên quan trong `tests/e2e/` nếu feature đã có coverage.
- Docs liên quan nếu path/import/ownership thay đổi.

#### Cách thực hiện

1. Đọc file hiện tại và xác định import đang dùng.
2. Tạo folder target theo đúng feature/shared/app layer.
3. Move hoặc copy logic theo từng cụm nhỏ.
4. Giữ compatibility export nếu import cũ còn nhiều.
5. Không đổi behavior nếu task chỉ là migration folder.
6. Chạy lint/build trước khi mở PR.
7. Chạy test liên quan hoặc ghi manual evidence rõ.
8. Cập nhật mapping trong tài liệu nếu cấu trúc target thay đổi.

#### Ví dụ trước khi sửa

```txt
src/pages hoặc src/components chứa logic/domain đang bị rải theo loại file.
Import dùng relative path dài hoặc import trực tiếp vào file cũ.
```

#### Ví dụ sau khi sửa

```txt
src/features hoặc src/shared chứa module đúng trách nhiệm.
File bên ngoài dùng public export hoặc path alias rõ ràng.
```

#### Rủi ro

- Import bị sai path hoặc tạo circular dependency.
- Test selector phụ thuộc DOM cũ bị fail.
- CSS order thay đổi gây regression.
- Developer vô tình đổi behavior trong lúc move file.
- Compatibility export tồn tại quá lâu nếu không có owner.

#### Cách kiểm tra

```bash
npm run lint
npm run build
```

Nếu đụng route/admin/payment/symptom/map/auth, chạy thêm spec tương ứng hoặc ghi manual evidence.

#### Acceptance criteria

- Import không lỗi.
- App build được.
- Behavior chính giữ nguyên.
- Không thêm dependency ngược layer.
- Không tăng CSS global nếu task không liên quan.
- Docs/checklist cập nhật nếu cần.

#### Độ ưu tiên

Medium

---

## 14. Checklist cho từng PR migration

Mỗi PR migration phải copy checklist này vào mô tả PR.

```md
## Migration scope
- [ ] Feature/shared/app layer được xác định rõ
- [ ] Không đổi behavior ngoài scope
- [ ] Không đổi route path nếu không ghi rõ
- [ ] Không đổi API contract nếu không ghi rõ
- [ ] Không đổi CSS class nếu không cần

## Import boundary
- [ ] Không import từ `shared` lên `features/app`
- [ ] Không import sâu vào feature khác nếu có public API
- [ ] Không tạo circular dependency
- [ ] Compatibility export có comment nếu dùng

## Test evidence
- [ ] npm run lint
- [ ] npm run build
- [ ] Test feature liên quan: ...
- [ ] Manual test: ...

## Risk
- [ ] Auth/session
- [ ] Payment/subscription
- [ ] Medical/symptom/chat safety
- [ ] Admin CRUD
- [ ] Map/geolocation
- [ ] CSS/layout
- [ ] None

## Docs
- [ ] Không cần cập nhật docs
- [ ] Đã cập nhật docs: ...
```

---

## 15. Definition of Ready cho migration task

Một task migration chỉ nên bắt đầu khi có đủ:

| Điều kiện | Bắt buộc | Ghi chú |
| --- | --- | --- |
| Target folder đã rõ | Có | Không move file vào folder tạm mơ hồ |
| Owner đã rõ | Có | Nhất là admin/auth/payment/API/CSS |
| Scope file dự kiến | Có | Ghi trong issue |
| Out of scope | Có | Tránh PR phình |
| Test cần chạy | Có | Ít nhất lint/build |
| Rollback path | Nên có | Bắt buộc nếu đụng auth/payment/deploy |
| Compatibility strategy | Có nếu move shared/API/UI | Re-export hoặc update hết import |
| Rủi ro được ghi | Có | Dùng risk area trong PR template |

---

## 16. Definition of Done cho migration task

Một migration task được xem là hoàn thành khi:

- File đã nằm đúng layer hoặc có lý do giữ tạm.
- Import path đã cập nhật hoặc có compatibility export rõ.
- Không có circular dependency mới.
- Lint/build pass hoặc có lý do trung thực nếu local không chạy được.
- Test liên quan pass hoặc manual evidence đủ rõ.
- Không đổi behavior ngoài scope.
- Không làm mất loading/error/empty/safety UI.
- Docs mapping được cập nhật nếu cấu trúc thay đổi.
- Reviewer phù hợp đã approve.

---

## 17. Quy trình rollback migration

Nếu PR migration gây lỗi production hoặc preview:

### 17.1. Trường hợp lỗi import/build

1. Revert PR migration.
2. Kiểm tra import path bị sai.
3. Thêm compatibility export nếu cần.
4. Chia lại PR nhỏ hơn.

### 17.2. Trường hợp lỗi behavior

1. Xác định behavior nào đổi.
2. Nếu migration chỉ nên move file, revert behavior change.
3. Tạo bug task riêng nếu phát hiện bug cũ.
4. Bổ sung test regression.

### 17.3. Trường hợp lỗi CSS/layout

1. So sánh screenshot trước/sau.
2. Kiểm tra thứ tự import CSS.
3. Revert phần move CSS nếu không chắc.
4. Tách CSS migration thành PR nhỏ hơn theo selector group.

### 17.4. Trường hợp lỗi route/auth/payment

1. Rollback deployment nếu production bị ảnh hưởng.
2. Revert PR hoặc hotfix trực tiếp path/guard bị lỗi.
3. Chạy test route/auth/payment liên quan.
4. Cập nhật risk register.

---

## 18. Risk matrix cho migration thư mục

| Rủi ro | Khả năng | Ảnh hưởng | Mức | Giảm thiểu |
| --- | --- | --- | --- | --- |
| Import path sai làm build fail | Cao | Trung bình | Cao | Chạy build, dùng alias, compatibility export |
| Circular dependency | Trung bình | Cao | Cao | Import boundary, review dependency direction |
| CSS regression do move file | Cao | Cao | Rất cao | Move CSS theo cụm, visual evidence |
| Admin CRUD đổi behavior | Trung bình | Cao | Cao | Tách từng section, chạy E2E admin |
| Auth redirect/token lỗi | Thấp-trung bình | Rất cao | Rất cao | Không trộn auth strategy với folder migration |
| Payment status lỗi | Thấp-trung bình | Rất cao | Rất cao | Payment fixtures/manual evidence |
| Safety copy bị mất | Trung bình | Rất cao | Rất cao | Checklist medical copy, reviewer domain |
| Compatibility export tồn tại lâu | Cao | Trung bình | Trung bình | Owner và deadline cleanup |
| PR quá lớn | Cao | Cao | Cao | Giới hạn scope, chia phase |
| Docs stale | Trung bình | Trung bình | Trung bình | Update docs trong PR hoặc follow-up bắt buộc |

---

## 19. Công cụ kiểm tra gợi ý

### 19.1. Tìm import cũ

```bash
rg "\.\./\.\./\.\./|src/services|components/ui|pages/AdminWorkspacePage" src tests
```

### 19.2. Tìm fetch trực tiếp ngoài service

```bash
rg "fetch\(" src --glob '!src/services/**' --glob '!src/shared/api/**'
```

### 19.3. Tìm mock/demo trong production surface

```bash
rg -n "MOCK_|mock|demo|placeholder|TODO: Replace" src
```

### 19.4. Tìm CSS global tăng thêm

```bash
git diff -- src/styles/global.css src/styles/operator-workspace.css
```

### 19.5. Tìm import sâu vào feature khác

```bash
rg "features/.+/components|features/.+/hooks|features/.+/model" src
```

Kết quả không phải lúc nào cũng sai, nhưng cần reviewer kiểm tra.

---

## 20. Quy tắc migration CSS chi tiết

### 20.1. Không thêm CSS feature mới vào global

Sai:

```css
/* global.css */
.admin-user-form-modal { ... }
.payment-result-card { ... }
```

Đúng:

```txt
features/admin/users/styles/admin-users.css
features/payment/result/styles/payment-result.css
```

### 20.2. Tách CSS theo cụm

Nên tách theo cụm selector:

```txt
1. tokens/base
2. shared UI primitives
3. landing
4. patient workspace
5. admin/operator workspace
6. map
7. payment
8. symptom
```

Không tách kiểu:

```txt
Move 300 dòng ngẫu nhiên vì nằm gần nhau trong file.
```

### 20.3. CSS import order đề xuất

```js
import '@/shared/styles/tokens.css';
import '@/shared/styles/reset.css';
import '@/shared/styles/base.css';
import '@/shared/ui/ui.css';
import '@/app/styles/app.css';
```

Feature style được import trong feature entry/page nếu cần:

```js
import './styles/symptom-analysis.css';
```

### 20.4. Acceptance criteria khi move CSS

- Visual không đổi ngoài phạm vi.
- Mobile layout vẫn ổn.
- Focus-visible không mất.
- Dialog/table/form vẫn usable.
- Không dùng `!important` để che lỗi order.
- Global CSS giảm hoặc ít nhất không tăng.

---

## 21. Chiến lược test theo phase

| Phase | Test tối thiểu | Test bổ sung nếu có thay đổi lớn |
| --- | --- | --- |
| Phase 0 | lint/build | route smoke |
| Phase 1 Admin | lint/build + admin spec section | visual/admin full smoke |
| Phase 2 Medical/user-facing | lint/build + symptom/map/dashboard specs | a11y/performance/visual |
| Phase 3 Auth/payment | lint/build + auth/route/payment specs | manual returnTo/payment cases |
| Phase 4 Shared API/UI/CSS | lint/build + affected specs | full route/a11y/visual |
| Phase 5 App/router cleanup | lint/build + route/navigation | full E2E smoke |

### 21.1. Khi không chạy được test automation

Phải ghi rõ:

```txt
Chưa chạy được Playwright do môi trường local thiếu backend/test server. Đã chạy lint/build và manual test các route: /app/admin/ai-configs, /app/admin, /login.
```

Không ghi “test pass” nếu chưa chạy.

---

## 22. Review checklist cho Tech Lead

Reviewer cần kiểm tra:

- PR có đúng phase không?
- Có move quá nhiều vùng không?
- Có đổi behavior ngoài scope không?
- Import direction có đúng không?
- Có compatibility export không? Nếu có, có deadline/owner không?
- Có circular dependency không?
- Có CSS global tăng không?
- Có làm mất loading/error/empty state không?
- Có làm mất medical safety copy không?
- Có test/evidence phù hợp không?
- Docs mapping có cần update không?

---

## 23. Reviewer comment mẫu

### 23.1. Khi PR move quá rộng

```txt
PR này đang move nhiều feature cùng lúc nên khó xác nhận behavior không đổi. Vui lòng tách theo từng feature hoặc từng admin section để reviewer có thể kiểm tra chính xác và chạy test tương ứng.
```

### 23.2. Khi import sai boundary

```txt
File trong `shared` đang import từ `features`, điều này tạo dependency ngược layer. Hãy chuyển logic dùng chung xuống `shared/lib` hoặc để feature bọc UI primitive thay vì đưa domain vào shared.
```

### 23.3. Khi thiếu compatibility strategy

```txt
PR move file API/UI nhưng chưa có compatibility export hoặc chưa update hết import cũ. Vui lòng chọn một trong hai hướng: update toàn bộ import có evidence build pass, hoặc thêm re-export tạm với TODO cleanup.
```

### 23.4. Khi CSS regression risk cao

```txt
Phần CSS được move khá rộng nhưng chưa có screenshot/visual evidence. Vui lòng bổ sung ảnh trước/sau hoặc tách CSS migration thành cụm nhỏ hơn.
```

### 23.5. Khi safety copy bị ảnh hưởng

```txt
Feature này thuộc domain sức khỏe. Vui lòng xác nhận các safety/disclaimer/emergency copy vẫn còn sau khi tách component và bổ sung manual evidence cho severe/error/empty cases.
```

---

## 24. Bảng tracking migration

Dùng bảng này trong issue epic hoặc docs tracking.

| Module | Owner | Phase | Trạng thái | PR | Test evidence | Ghi chú |
| --- | --- | --- | --- | --- | --- | --- |
| Admin overview |  | 1 | Todo |  |  |  |
| Admin AI configs |  | 1 | Todo |  |  |  |
| Admin doctors |  | 1 | Todo |  |  |  |
| Admin subscriptions |  | 1 | Todo |  |  |  |
| Admin users |  | 1 | Todo |  |  |  |
| Admin departments |  | 1 | Todo |  |  |  |
| Admin facilities |  | 1 | Todo |  |  |  |
| Admin staff |  | 1 | Todo |  |  |  |
| Symptom analysis |  | 2 | Todo |  |  |  |
| Patient dashboard |  | 2 | Todo |  |  |  |
| Map/facility |  | 2 | Todo |  |  |  |
| Profile |  | 2 | Todo |  |  |  |
| Chatbot |  | 2 | Todo |  |  |  |
| Auth |  | 3 | Todo |  |  |  |
| Payment pricing |  | 3 | Todo |  |  |  |
| Payment result |  | 3 | Todo |  |  |  |
| Doctor invitation |  | 3 | Todo |  |  |  |
| Shared API |  | 4 | Todo |  |  |  |
| Shared UI |  | 4 | Todo |  |  |  |
| Shared styles |  | 4 | Todo |  |  |  |
| App/router |  | 5 | Todo |  |  |  |
| Cleanup compatibility |  | 5 | Todo |  |  |  |

---

## 25. Câu hỏi thường gặp

### 25.1. Có nên move hết `pages` vào `features` ngay không?

Không. Move hết một lần tạo PR rất lớn và dễ phá route/import. Nên move theo feature, ưu tiên vùng có rủi ro cao hoặc đang cần phát triển.

### 25.2. Có nên xóa `src/services` ngay sau khi tạo `shared/api` không?

Không. Nên giữ compatibility export cho đến khi import cũ đã được migrate và test pass.

### 25.3. Có nên dùng barrel export ở mọi folder không?

Không. Chỉ dùng `index.js` ở boundary có ý nghĩa. Không export toàn bộ internal file vì sẽ làm public API phình và khó refactor.

### 25.4. Có nên tách component càng nhỏ càng tốt không?

Không. Tách theo trách nhiệm. Một component nhỏ nhưng chỉ dùng một lần và không giảm complexity có thể làm code khó đọc hơn.

### 25.5. Có nên chuyển TypeScript trong cùng migration này không?

Không nên làm đồng loạt. Nếu team muốn TypeScript, tạo ADR/plan riêng. Có thể áp dụng dần cho `shared/lib`, `shared/api` hoặc feature mới sau khi cấu trúc ổn.

### 25.6. Có nên dùng React Router thay navigation custom trong migration này không?

Không nên trộn. Migration thư mục và đổi routing library là hai thay đổi lớn khác nhau. Nếu muốn đổi router, cần ADR và plan riêng.

---

## 26. Kết luận

Migration sang feature-first là hướng phù hợp cho MediMate AI Frontend vì repo đã đủ lớn, có nhiều capability và có domain sức khỏe cần kiểm soát rõ. Tuy nhiên, giá trị thật không nằm ở việc đổi folder, mà nằm ở việc tạo boundary rõ, giảm page lớn, chuẩn hóa shared layer, tăng testability và giúp team làm việc nhất quán.

Chiến lược đúng là:

1. Chuẩn bị guardrails.
2. Tách admin page lớn trước.
3. Tách flow y tế/user-facing.
4. Tách auth/payment nhạy cảm có test rõ.
5. Chuẩn hóa shared API/UI/styles.
6. Move app/router cuối.
7. Dọn compatibility và docs.

Không rewrite. Không PR khổng lồ. Không đổi behavior ngầm. Mỗi bước phải có evidence.
