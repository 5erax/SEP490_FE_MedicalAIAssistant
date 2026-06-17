# 01 - Tổng quan dự án MediMate AI Frontend

> Phiên bản tài liệu: 2026-06-17  
> Loại tài liệu: Engineering Overview / Onboarding / Planning Baseline  
> Phạm vi: Frontend React/Vite của dự án MediMate AI  
> Đối tượng đọc: Developer mới, Frontend Engineer, Reviewer, Tech Lead, PM/Founder, QA  
> Cách sử dụng: đọc trước khi sửa code, lập sprint refactor, review PR, hoặc onboarding nhân sự mới.  
> Lưu ý: tài liệu này dựa trên review tĩnh source và tài liệu đã cung cấp. Mọi thay đổi production vẫn phải được xác nhận bằng `lint`, `build`, `test`, manual QA và review code.

---

## 0. Mục tiêu của tài liệu này

Tài liệu này trả lời các câu hỏi nền tảng mà mọi thành viên team frontend cần nắm trước khi tham gia dự án:

1. Dự án đang phục vụ sản phẩm gì?
2. Repo frontend hiện có những capability nào?
3. Phần nào đã có nền tốt và nên giữ?
4. Phần nào đang có rủi ro cao và cần xử lý trước?
5. Vì sao dự án cần refactor có kiểm soát thay vì sửa nhanh từng file?
6. Kiến trúc mục tiêu nên đi theo hướng nào?
7. Khi onboard nhân viên mới, họ phải hiểu gì trước khi nhận task?
8. Khi PM/Tech Lead lập sprint, nên ưu tiên việc gì?
9. Khi reviewer duyệt PR, vùng nào cần kiểm tra kỹ?
10. Khi chuẩn bị release, điều gì không được phép bỏ qua?

Tài liệu này không thay thế các file checklist chi tiết khác. Nó đóng vai trò là **bản đồ tổng quan** để hiểu toàn bộ repo trước, sau đó đọc tiếp:

| Nhu cầu | File nên đọc tiếp |
| --- | --- |
| Muốn hiểu luồng code chạy chi tiết | `02_CAU_TRUC_CODE_VA_LUONG_HOAT_DONG.md` |
| Muốn đánh giá kiến trúc | `03_DANH_GIA_KIEN_TRUC.md` |
| Muốn triển khai refactor theo checklist | `04_CHECKLIST_CAI_TIEN_REFACTOR.md` |
| Muốn biết quy trình làm task/PR/test | `05_HUONG_DAN_THUC_HIEN_CHECKLIST.md` |
| Muốn tổ chức lại folder | `06_KE_HOACH_TO_CHUC_LAI_THU_MUC.md` |
| Muốn biết coding standard | `07_QUY_UOC_CODE_CHAT_LUONG.md` |
| Muốn xem risk register và ưu tiên | `08_RUI_RO_VA_DE_XUAT_UU_TIEN.md` |

---

## 1. Executive summary

MediMate AI Frontend là ứng dụng React/Vite cho một nền tảng hỗ trợ người dùng trong bối cảnh sức khỏe/y tế. Dự án có nhiều capability đã được xây dựng tương đối rộng: landing page, đăng nhập/đăng ký, dashboard bệnh nhân, phân tích triệu chứng, chatbot, bản đồ cơ sở y tế, profile, pricing/payment, admin workspace, staff workspace, doctor invitation, medication/records demo.

Repo có nền tảng tốt hơn một MVP thông thường vì đã có:

- API layer riêng qua `src/services`;
- route metadata tập trung qua `src/router/routes.js`;
- nhiều test E2E bằng Playwright;
- awareness về accessibility qua axe-core;
- docs nội bộ khá nhiều;
- một số convention đã hình thành như endpoints tập trung, route access, layout shell.

Tuy nhiên, repo cũng đã vượt ngưỡng “nhỏ và dễ sửa nhanh”. Một số file rất lớn, CSS global quá rộng, có capability demo/mock cần quản lý nghiêm túc, có dấu hiệu direct AI provider call ở client, có hard-code backend URL/IP, và auth/token strategy cần hardening. Những vấn đề này nếu không xử lý có thể gây lỗi production, regression UI, chậm onboarding, tăng rủi ro security và làm team khó mở rộng.

Kết luận điều hành:

```txt
Repo có nền tốt để refactor thành sản phẩm chuyên nghiệp.
Không nên rewrite toàn bộ.
Nên refactor theo phase nhỏ, có test bảo vệ, có checklist, có owner rõ.
Ưu tiên đầu tiên phải là security/env/demo/auth/access/payment/symptom safety.
Sau đó mới xử lý cấu trúc folder, tách page lớn, giảm CSS global và tăng test.
```

---

## 2. Bối cảnh sản phẩm

### 2.1. MediMate AI là gì?

MediMate AI Frontend phục vụ một sản phẩm hỗ trợ người dùng:

- mô tả triệu chứng;
- nhận câu hỏi gợi ý lâm sàng;
- xem định hướng chuyên khoa;
- tìm cơ sở y tế phù hợp;
- quản lý thông tin hồ sơ/profile;
- dùng không gian làm việc cho bệnh nhân, nhân viên, admin;
- xử lý một số flow liên quan đến doctor invitation, subscription/payment và AI assistant.

Vì sản phẩm liên quan sức khỏe, repo frontend không chỉ cần đẹp và chạy đúng UI. Repo còn phải đảm bảo:

- người dùng không hiểu nhầm AI là bác sĩ;
- demo/mock không bị hiểu là dữ liệu thật;
- lỗi API không dẫn đến tư vấn sai;
- loading/error/empty state phải rõ;
- dữ liệu cá nhân/y tế không bị log hoặc lộ không cần thiết;
- quyền truy cập role/admin/staff/patient được kiểm soát;
- payment/subscription không bị sai trạng thái;
- mọi copy liên quan y tế phải có giới hạn và disclaimer phù hợp.

### 2.2. Tính chất domain sức khỏe ảnh hưởng tới frontend thế nào?

Trong nhiều dự án thương mại, frontend sai UI có thể chỉ làm xấu trải nghiệm. Trong dự án y tế, frontend sai còn có thể tạo hiểu nhầm nghiêm trọng. Ví dụ:

| Sai sót frontend | Hậu quả có thể xảy ra |
| --- | --- |
| Hiển thị kết quả demo như thật | Người dùng tin vào dữ liệu không có cơ sở |
| Không có disclaimer rõ | Người dùng hiểu AI thay thế bác sĩ |
| Error API nhưng vẫn hiển thị kết quả cũ | Người dùng nhận thông tin không còn đúng |
| Không phân biệt emergency symptoms | Người dùng trì hoãn tìm hỗ trợ y tế |
| Staff/Admin role gate sai | Lộ dữ liệu hoặc thao tác sai nghiệp vụ |
| Payment success/fail xử lý sai | Người dùng bị mất quyền lợi hoặc được cấp quyền sai |
| Token lưu/log sai | Rủi ro lộ dữ liệu nhạy cảm |

Do đó, tiêu chuẩn “done” của frontend MediMate phải cao hơn các app demo thông thường.

---

## 3. Phạm vi repo frontend

### 3.1. Phạm vi chính

Repo frontend hiện bao gồm các nhóm chức năng sau:

| Nhóm | Mô tả | Ví dụ route/file |
| --- | --- | --- |
| Public web | Trang landing, pricing, content tĩnh, auth entry | `/`, `/pricing`, `/login`, `/signup` |
| Patient app | Dashboard, symptom analysis, profile, workspace | `/dashboard`, `/symptom`, `/profile` |
| AI/chat | Chatbot, symptom chat, landing chat demo | `/chat`, `landingChat.js`, `symptomChat.js` |
| Facility/map | Cơ sở y tế, bản đồ, review, location fallback | `/map`, `NearbyClinicPage.jsx` |
| Payment/subscription | Gói dịch vụ, callback thanh toán, subscription status | `/pricing`, `/payment/return`, `/payment/cancel` |
| Admin workspace | CRUD users/doctors/facilities/AI configs/staff/subscriptions | `/app/admin/*` |
| Staff workspace | Không gian làm việc cho staff | `/app/staff` |
| Doctor invitation | Flow đăng ký bác sĩ qua invitation token | `/register-doctor` |
| Demo/experimental | Records, medication scan, mock health data | `/records`, `/medication` |
| Shared foundation | API client, endpoints, router, UI primitives, styles | `src/services`, `src/router`, `src/components/ui` |

### 3.2. Phạm vi không nên hiểu nhầm

Một số phần trong repo có UI nhưng chưa chắc đã là capability production đầy đủ. Team cần phân biệt:

| Loại capability | Định nghĩa | Cách xử lý |
| --- | --- | --- |
| Production-ready | Có backend thật, test tối thiểu, error/loading/empty state, copy rõ | Cho phép xuất hiện production |
| Production with hardening needed | Có backend hoặc flow gần hoàn chỉnh nhưng còn rủi ro | Cho production có kiểm soát, phải có backlog hardening |
| Demo/mock | Dùng dữ liệu giả, preview, chưa có backend hoặc chưa đủ safety | Phải gắn nhãn demo hoặc ẩn production |
| Internal/admin | Chỉ dành cho role cụ thể | Phải có route guard và role check |
| Experimental | Tính năng thử nghiệm | Không dùng làm cam kết sản phẩm nếu chưa có owner |

---

## 4. Người dùng, vai trò và quyền truy cập

### 4.1. Nhóm người dùng sản phẩm

| Vai trò | Mục tiêu sử dụng | Route/chức năng liên quan | Rủi ro cần kiểm soát |
| --- | --- | --- | --- |
| Guest | Xem landing, pricing, đăng ký/đăng nhập, demo | `/`, `/pricing`, `/login`, `/signup` | Không được thấy dữ liệu nội bộ; demo phải rõ |
| Patient/User | Nhập triệu chứng, xem dashboard, quản lý profile | `/dashboard`, `/symptom`, `/profile`, `/map` | Dữ liệu cá nhân/y tế, copy y tế, fallback API |
| Premium user | Dùng capability bị gate bởi subscription | Các route/capability premium | Sai subscription state gây mất doanh thu/quyền |
| Staff | Xử lý nghiệp vụ staff | `/app/staff` | Role gate và access boundary |
| Admin | Quản lý users, doctors, facilities, AI configs, subscription | `/app/admin/*` | CRUD sai, quyền sai, regression admin |
| Doctor | Nhận invitation và đăng ký | `/register-doctor` | Token edge cases, validation, lỗi đăng ký |

### 4.2. Nguyên tắc frontend access

Frontend route guard không thay thế backend authorization. Tuy nhiên frontend vẫn phải:

- không render route không phù hợp với role;
- không hiện menu không phù hợp;
- redirect rõ ràng khi chưa đăng nhập;
- xử lý unauthorized API tập trung;
- không dựa vào UI hidden để bảo mật dữ liệu;
- không cache nhầm dữ liệu của user cũ sau logout;
- không để guest truy cập admin/staff qua URL trực tiếp.

Checklist ngắn khi thêm route mới:

```txt
[ ] Route có khai báo trong manifest/metadata tập trung.
[ ] Route có access level rõ: public/auth/premium/role.
[ ] Nếu có role, roles được khai báo cụ thể.
[ ] Menu/navigation không hard-code rải rác.
[ ] Route 404/fallback hoạt động.
[ ] Có test hoặc manual evidence cho access behavior.
[ ] Docs route được cập nhật nếu là capability mới.
```

---

## 5. Capability inventory

### 5.1. Bảng capability hiện tại

| Capability | Route/module liên quan | Trạng thái quan sát | Rủi ro chính | Owner khuyến nghị |
| --- | --- | --- | --- | --- |
| Landing + symptom demo | `/`, `components/landing/*` | UI khá hoàn chỉnh | Demo vs real data, safety copy | Frontend + Product |
| Auth email/password | `/login`, `/signup`, `AuthPages.jsx`, `authService.js` | Có service và local auth state | Token storage, session clear, error copy | Frontend + Backend |
| Google OAuth | `@react-oauth/google`, auth service | Có tích hợp client ID | Env theo môi trường, callback error | Frontend + Backend |
| Patient dashboard | `/dashboard`, `DashboardPage.jsx` | Có intake/result/facility suggestion | Page lớn, fallback data, state phức tạp | Frontend |
| Symptom analysis | `/symptom`, `SymptomAnalysisPage.jsx`, `symptomAnalysisService.js` | Có suggest/submit/session | Empty questions, emergency, API fail | Frontend + Backend + Product |
| Chat AI | `/chat`, `ChatbotPage.jsx`, `anthropicService.js` | Có web chatbot/fallback | Secret/provider key ở client, safety | Backend gateway owner |
| Map/facility | `/map`, `NearbyClinicPage.jsx`, MapLibre | Có map/list/location/review | Permission, fallback/mock, performance | Frontend |
| Profile | `/profile`, `/patient/profile/setup` | Có form/service | Validation, sync user vs patient profile | Frontend + Backend |
| Pricing/payment | `/pricing`, `/payment/return`, `/payment/cancel` | Có PayOS/subscription service | Status edge cases, double submit | Frontend + Backend |
| Admin workspace | `/app/admin/*`, `AdminWorkspacePage.jsx` | Nhiều CRUD chung một page | God component, regression, state coupling | Frontend lead |
| Staff workspace | `/app/staff`, `StaffWorkspacePage.jsx` | Có flow staff | Role boundary, overlap admin | Frontend |
| Doctor invitation | `/register-doctor`, `DoctorRegisterInvitationPage.jsx` | Có token/form flow | Expired/invalid token, duplicate email | Frontend + Backend |
| Records | `/records`, `MedicalRecordPage.jsx` | Có mock/demo | Người dùng hiểu nhầm dữ liệu thật | Product + Frontend |
| Medication | `/medication`, `MedicationScanPage.jsx` | Có mock scan/interaction | Rủi ro y tế cao nếu hiểu nhầm | Product + Frontend |

### 5.2. Maturity matrix

| Capability | UI readiness | Backend readiness nhìn từ frontend | Safety readiness | Production recommendation |
| --- | --- | --- | --- | --- |
| Landing | Cao | Ít phụ thuộc backend | Trung bình | Có thể giữ production nếu demo copy rõ |
| Auth | Trung bình-cao | Có service | Trung bình | Production nhưng cần hardening session/env |
| Patient dashboard | Trung bình | Có service/fallback | Trung bình | Production có kiểm soát |
| Symptom analysis | Trung bình | Có endpoint | Thấp-trung bình | Cần hardening trước khi mở rộng |
| Chat AI | Trung bình | Có client/provider path | Thấp | Không production nếu còn provider secret ở client |
| Map/facility | Trung bình | Có endpoint/fallback | Trung bình | Production nếu fallback rõ |
| Profile | Trung bình | Có service | Trung bình | Production nếu validate/log policy tốt |
| Pricing/payment | Trung bình | Có service | Trung bình | Production sau test edge cases |
| Admin | Trung bình | Có nhiều service | Trung bình | Refactor để vận hành dài hạn |
| Staff | Trung bình | Có role flow | Trung bình | Cần access test |
| Doctor invitation | Trung bình-cao | Có service | Trung bình | Production nếu token edge case pass |
| Records | Thấp-trung bình | Có dấu hiệu mock | Thấp | Demo hoặc ẩn production |
| Medication | Thấp-trung bình | Có dấu hiệu mock | Thấp | Demo hoặc ẩn production |

### 5.3. Quy tắc đánh dấu trạng thái capability

Mỗi capability nên có trạng thái trong docs hoặc product manifest:

```md
Status: production | beta | internal | demo | hidden
Backend: real | partial | mock | unknown
Owner: <team/person>
Risk: high | medium | low
Required tests: <list>
Release note: <copy>
```

Ví dụ:

```md
Capability: Medication Scan
Status: demo
Backend: mock
Owner: Product + Frontend
Risk: high
Required tests:
- Route does not appear as production medical advice.
- UI contains demo disclaimer.
- Result copy says not for clinical decision.
- No medication interaction data is presented as verified.
```

---

## 6. Công nghệ và cấu hình

### 6.1. Stack chính

| Nhóm | Công nghệ/công cụ | Vai trò | Lưu ý |
| --- | --- | --- | --- |
| UI runtime | React | Xây dựng component/page | Cần kiểm soát render, hooks, state |
| Bundler | Vite | Dev server/build | `VITE_*` được expose ra client |
| Router | React Router hoặc router custom theo metadata | Điều hướng và route guard | Không hard-code route rải rác |
| Map | MapLibre / react-map-gl | Bản đồ và facility UI | Lazy load nếu bundle lớn |
| OAuth | Google OAuth package | Đăng nhập Google | Client ID tách môi trường |
| Icon | lucide-react | Icon UI | Chuẩn hóa size/label/accessibility |
| Test E2E | Playwright | Test flow route/UI | Cần chạy theo nhóm khi refactor |
| Accessibility | axe-core Playwright | Kiểm tra a11y | Bắt buộc cho healthcare UX |
| Lint | ESLint | Chặn lỗi code pattern | Nên thêm import boundary/complexity |
| Deploy | Vercel/config rewrite | Triển khai frontend | Không hard-code backend IP trong source |

### 6.2. Quy tắc với biến môi trường Vite

Mọi biến bắt đầu bằng `VITE_` sẽ có thể xuất hiện trong client bundle. Vì vậy:

Được phép đặt trong `VITE_*`:

```txt
VITE_PUBLIC_APP_NAME
VITE_PUBLIC_GOOGLE_CLIENT_ID
VITE_PUBLIC_MAP_STYLE_URL
VITE_API_BASE_URL nếu đó là URL public gateway/proxy
```

Không được đặt trong `VITE_*`:

```txt
Provider secret key
AI API secret
Private backend token
Service role key
Database connection string
Payment secret key
Webhook secret
```

Ví dụ sai:

```env
VITE_ANTHROPIC_KEY=sk-ant-...
VITE_PAYMENT_SECRET=...
```

Ví dụ đúng:

```env
VITE_API_BASE_URL=https://api.medimate.example.com
VITE_GOOGLE_CLIENT_ID=<public-client-id>
```

AI provider nên đi theo luồng:

```txt
Frontend
  -> Backend API Gateway
    -> AI Provider
```

Không dùng:

```txt
Frontend
  -> AI Provider trực tiếp bằng secret key
```

### 6.3. Quy tắc cấu hình môi trường

Repo nên có tối thiểu 3 môi trường:

| Môi trường | Mục tiêu | Backend target | Ghi chú |
| --- | --- | --- | --- |
| Development | Chạy local | local/staging dev API | Cho debug |
| Staging | QA trước release | staging API | Gần production nhất |
| Production | Người dùng thật | production API gateway | Không hard-code IP |

File/config nên rõ ràng:

```txt
.env.example
.env.development.example
.env.staging.example
.env.production.example
```

Không commit:

```txt
.env.local
.env.production.local
secret key thật
token thật
```

### 6.4. Rủi ro hard-code backend URL/IP

Hard-code backend IP trong source/config có thể gây:

- deploy nhầm backend;
- khó thay đổi hạ tầng;
- khó rollback;
- staging dùng nhầm production data;
- production gọi nhầm test API;
- reviewer không phát hiện khác biệt môi trường;
- security scan phát hiện endpoint nhạy cảm.

Checklist xử lý:

```txt
[ ] Tìm tất cả IP/URL hard-code trong repo.
[ ] Phân loại: dev fallback, staging, production, legacy.
[ ] Đưa URL vào env hoặc deploy secret/config.
[ ] Cập nhật Vite proxy.
[ ] Cập nhật Vercel rewrite.
[ ] Cập nhật README setup env.
[ ] Test local dev.
[ ] Test staging.
[ ] Test production build không chứa secret.
```

---

## 7. Quy mô và hiện trạng code

### 7.1. Nhận xét quy mô

Repo đã đủ lớn để cần governance. Khi `src/` có trên 100 file và hàng chục route/capability, cách tổ chức “page gọi API trực tiếp, CSS global thêm dần, component tự xử lý mọi thứ” sẽ gây nợ kỹ thuật nhanh.

Các dấu hiệu repo đã vào giai đoạn cần refactor có kiểm soát:

- page vượt 500-800 dòng;
- CSS global vượt vài nghìn dòng;
- nhiều capability có trạng thái khác nhau;
- nhiều role/access;
- có payment/auth/admin;
- có E2E test nhưng unit/integration chưa đủ;
- có docs nhưng cần đồng bộ với code;
- có API layer nhưng chưa chắc đã được enforce bằng lint/review.

### 7.2. Vùng file lớn cần ưu tiên audit

| File/khu vực | Mức rủi ro | Vì sao cần kiểm soát |
| --- | --- | --- |
| `src/styles/global.css` | Rất cao | CSS toàn cục ảnh hưởng rộng, dễ regression |
| `src/pages/AdminWorkspacePage.jsx` | Rất cao | Nhiều CRUD/state/form/modal/table trong một file |
| `src/styles/operator-workspace.css` | Cao | Admin/staff UI nhiều state nghiệp vụ |
| `src/pages/DashboardPage.jsx` | Cao | Intake/result/facility suggestion/fallback gom chung |
| `src/pages/NearbyClinicPage.jsx` | Cao | Map/list/location/review cùng state phức tạp |
| `src/pages/SymptomAnalysisPage.jsx` | Cao | Domain y tế, API/session/error/safety |
| `src/pages/AuthPages.jsx` | Cao | Login/signup/OAuth/token/error |
| `src/pages/DoctorRegisterInvitationPage.jsx` | Trung bình-cao | Token edge cases và form validation |
| `src/pages/PricingPage.jsx` | Trung bình-cao | Payment/subscription, double submit |
| `src/pages/StaticPage.jsx` | Trung bình | Content tĩnh/demo có thể lẫn production |

### 7.3. Ngưỡng cảnh báo maintainability

| Chỉ số | Ngưỡng cảnh báo | Hành động |
| --- | ---: | --- |
| Page component | > 500 dòng | Tách section/hook/service |
| Page component | > 800 dòng | Không thêm feature mới trước khi tách |
| CSS file | > 1.000 dòng | Audit scope và tách module |
| Function/component | > 120 dòng | Tách helper/subcomponent |
| Hook | > 150 dòng | Tách query/mutation/state helper |
| Props của component | > 8 props | Gom object hoặc tách component |
| useState trong page | > 10 state | Xem lại state ownership |
| useEffect trong page | > 4 effect | Tách hook hoặc query flow |
| PR đổi file lớn | > 500 dòng diff | Cần chia PR hoặc có test evidence rõ |

---

## 8. Kiến trúc hiện tại

### 8.1. Luồng chuẩn nên giữ

Luồng tốt hiện tại cần được giữ và enforce:

```txt
Page/Feature Component
  -> Custom Hook hoặc Domain Service
    -> ENDPOINTS
      -> apiRequest()
        -> Backend API
```

Ưu điểm:

- API không rải rác trong UI;
- endpoint dễ tìm;
- auth header/error handling có thể chuẩn hóa;
- dễ mock trong test;
- dễ đổi backend contract;
- reviewer dễ kiểm tra.

### 8.2. Luồng cần tránh

Không nên để component/page làm trực tiếp:

```txt
Component
  -> fetch('/api/...')
  -> tự parse response
  -> tự handle token
  -> tự set loading/error
  -> tự normalize DTO
```

Vấn đề:

- duplicate code;
- inconsistent error message;
- token xử lý không thống nhất;
- test khó mock;
- response shape thay đổi sẽ vỡ nhiều nơi;
- reviewer khó biết endpoint nào đang được gọi.

### 8.3. Tầng trách nhiệm khuyến nghị

| Tầng | Được làm | Không nên làm |
| --- | --- | --- |
| Page | Compose layout, gọi hook, điều phối route-level state | Gọi fetch trực tiếp, chứa toàn bộ form/table/modal logic |
| Feature component | Render UI theo domain, nhận props rõ | Biết chi tiết token/API base URL |
| Shared UI component | Button/Input/Modal/Table/Card reusable | Gắn nghiệp vụ symptom/payment/admin |
| Custom hook | Quản lý state/query/mutation của feature | Render JSX phức tạp |
| Domain service | Gọi API domain, map endpoint | Render UI, đọc DOM |
| apiClient | Auth header, timeout, parse response, error normalization | Biết business UI |
| endpoints | Khai báo path | Gọi network |
| utils | Pure function/helper | Gọi API hoặc mutate global state |

---

## 9. Đánh giá điểm mạnh

### 9.1. Có API layer nền tảng

Repo đã có các file kiểu:

```txt
src/services/apiClient.js
src/services/endpoints.js
src/services/authService.js
src/services/symptomAnalysisService.js
src/services/facilityService.js
src/services/subscriptionService.js
...
```

Đây là nền rất tốt. Không nên phá khi refactor. Thay vào đó cần làm chặt hơn:

- cấm `fetch` trực tiếp trong `src/pages` và `src/components`;
- chuẩn hóa response envelope;
- chuẩn hóa lỗi API;
- chuẩn hóa unauthorized handling;
- thêm timeout/retry policy;
- thêm mock service trong test.

### 9.2. Route metadata tập trung

Route metadata tập trung giúp:

- dễ audit route;
- dễ sinh menu;
- dễ kiểm soát access;
- dễ test route manifest;
- dễ onboard dev mới;
- giảm route string hard-code.

Cần giữ nguyên triết lý:

```txt
Không tạo route mới bằng cách rải path string nhiều nơi.
Không tự điều hướng bằng string magic trong nhiều component.
Không tạo menu riêng không đọc từ route metadata nếu không có lý do rõ.
```

### 9.3. Có Playwright E2E baseline

Đây là lợi thế lớn khi refactor. E2E test giúp bảo vệ:

- route/navigation;
- admin flows;
- payment callback;
- symptom diagnosis;
- doctor invitation;
- map UX;
- visual regression;
- accessibility;
- performance smoke.

Tuy nhiên, không nên chỉ dựa vào E2E. Cần bổ sung unit/integration cho logic nhỏ để feedback nhanh hơn.

### 9.4. Có docs nội bộ

Docs hiện có là nền tốt để chuyển repo sang quy trình chuyên nghiệp. Nhưng docs phải là “living documentation”, nghĩa là:

- thay route thì update docs;
- đổi API thì update docs;
- đổi env/deploy thì update docs;
- đổi auth/role/premium thì update docs;
- thêm capability demo/production thì update docs;
- PR lớn phải nói rõ docs có bị ảnh hưởng không.

### 9.5. Có awareness về accessibility

Sản phẩm y tế nên có baseline accessibility. Những phần cần duy trì:

- keyboard navigation;
- focus state;
- aria label cho icon button;
- error message liên kết với input;
- color contrast;
- responsive layout;
- text không chỉ dựa vào màu;
- modal/dialog có focus trap;
- loading state không làm screen reader khó hiểu.

---

## 10. Đánh giá điểm yếu và rủi ro chính

### 10.1. Page lớn/god component

Vấn đề:

- một file chứa nhiều section UI;
- nhiều `useState`/`useEffect`;
- nhiều handler;
- nhiều API call;
- nhiều conditional render;
- nhiều modal/table/form;
- khó review;
- khó test;
- khó tái sử dụng;
- dễ conflict khi nhiều dev sửa.

Ví dụ vùng cần chú ý:

```txt
AdminWorkspacePage.jsx
DashboardPage.jsx
NearbyClinicPage.jsx
AuthPages.jsx
SymptomAnalysisPage.jsx
```

Target:

```txt
pages/AdminWorkspacePage.jsx
  -> features/admin/AdminWorkspaceShell.jsx
  -> features/admin/users/AdminUsersSection.jsx
  -> features/admin/doctors/AdminDoctorsSection.jsx
  -> features/admin/facilities/AdminFacilitiesSection.jsx
  -> features/admin/ai-configs/AdminAiConfigsSection.jsx
  -> features/admin/hooks/useAdminUsers.js
  -> features/admin/hooks/useAdminDoctors.js
```

Nguyên tắc refactor:

```txt
Không tách tất cả cùng lúc.
Tách section ít phụ thuộc trước.
Mỗi PR chỉ tách một domain/section.
Giữ route và UI behavior như cũ.
Chạy test admin liên quan.
Có rollback đơn giản.
```

### 10.2. CSS global quá lớn

CSS global lớn gây:

- khó biết class nào còn dùng;
- sửa một class làm hỏng màn khác;
- specificity tăng dần;
- duplicate spacing/color;
- responsive breakpoints không nhất quán;
- khó xây design system;
- visual regression khó kiểm soát.

Target CSS:

```txt
styles/
  foundation/
    tokens.css
    reset.css
    typography.css
  components/
    button.css
    input.css
    modal.css
    table.css
  layouts/
    app-shell.css
    auth-layout.css
  features/
    admin.css
    symptom.css
    map.css
```

Quy tắc:

```txt
Không thêm CSS feature mới vào global.css.
Class global chỉ dành cho reset/token/base utility thật sự dùng chung.
Feature nào thì CSS nằm cùng feature hoặc layer feature.
PR sửa CSS global phải có visual/manual evidence.
```

### 10.3. Demo/mock không được quản trị đủ rõ

Trong healthcare, demo/mock phải có nhãn rõ. Các vùng như records/medication/hospital fallback cần policy:

```txt
[ ] Đây là demo hay production?
[ ] Dữ liệu đến từ backend thật hay mock?
[ ] Người dùng có thấy label demo không?
[ ] Có disclaimer không?
[ ] Có xuất hiện trong nav production không?
[ ] Có test để tránh nhầm trạng thái không?
```

Copy khuyến nghị:

```txt
Đây là tính năng minh họa. Thông tin hiển thị không thay thế tư vấn y tế chuyên môn và không nên dùng để ra quyết định điều trị.
```

### 10.4. Secret/API provider key ở client

Rủi ro:

- secret bị lộ trong browser;
- người khác dùng key gây tốn chi phí;
- khó kiểm soát quota;
- không audit được prompt/output;
- không enforce safety server-side;
- không che giấu provider implementation;
- khó rate limit theo user.

Target:

```txt
Frontend -> /api/ai/chat -> Backend AI Gateway -> Provider
```

Backend gateway nên xử lý:

- auth;
- rate limit;
- prompt policy;
- provider key;
- logging có kiểm soát;
- redaction dữ liệu nhạy cảm;
- fallback provider nếu cần;
- timeout/retry;
- response schema.

### 10.5. Token/session localStorage

LocalStorage token dễ bị ảnh hưởng bởi XSS. Nếu backend chưa hỗ trợ httpOnly cookie, frontend vẫn cần harden:

```txt
[ ] Không log token.
[ ] Clear token khi 401 hoặc logout.
[ ] Không lưu dữ liệu y tế nhạy cảm lâu trong localStorage.
[ ] Không parse JWT tùy tiện nhiều nơi.
[ ] apiClient xử lý unauthorized tập trung.
[ ] Có route redirect sau logout.
[ ] Có test session expired.
```

### 10.6. Thiếu schema/type boundary

Khi dùng JavaScript, lỗi backend contract thường chỉ phát hiện runtime. Nên có ít nhất một trong các giải pháp:

- DTO mapper rõ trong service;
- runtime validate nhẹ;
- JSDoc typedef;
- contract docs;
- test mock response;
- từng bước migrate sang TypeScript nếu team quyết định.

Ví dụ mapper:

```js
export function normalizeFacility(raw) {
  return {
    id: String(raw.id ?? raw.facilityId),
    name: raw.name ?? 'Cơ sở chưa có tên',
    address: raw.address ?? '',
    rating: Number(raw.rating ?? 0),
  };
}
```

---

## 11. Production readiness theo nhóm chức năng

### 11.1. Public landing

Checklist:

```txt
[ ] Copy không nói quá năng lực AI.
[ ] CTA dẫn đúng route.
[ ] Demo symptom có label rõ.
[ ] Mobile layout ổn.
[ ] Lighthouse/performance smoke đạt ngưỡng team đặt.
[ ] Không tải map/chat bundle nếu landing chưa cần.
[ ] Không có console error.
```

### 11.2. Auth

Checklist:

```txt
[ ] Login email/password handle sai mật khẩu.
[ ] Signup handle duplicate email.
[ ] Google OAuth handle cancel/fail.
[ ] Token lưu/clear nhất quán.
[ ] 401 redirect đúng.
[ ] Không log token/user sensitive data.
[ ] Auth error message không lộ chi tiết backend nhạy cảm.
[ ] Loading state chặn double submit.
```

### 11.3. Symptom analysis

Checklist:

```txt
[ ] Empty questions được xử lý rõ.
[ ] API fail có fallback an toàn.
[ ] Emergency symptom có copy khuyến cáo tìm hỗ trợ y tế.
[ ] Không hiển thị kết quả cũ sau request fail.
[ ] Loading rõ khi submit.
[ ] Không double submit.
[ ] Kết quả có disclaimer.
[ ] Session ID/request ID nếu có được lưu đúng.
[ ] Test happy path + empty questions + API error.
```

### 11.4. Chat AI

Checklist:

```txt
[ ] Không gọi provider trực tiếp bằng secret từ frontend.
[ ] Chat request đi qua backend gateway.
[ ] Có rate limit hoặc backend owner xác nhận.
[ ] Có timeout.
[ ] Có fallback khi provider lỗi.
[ ] Có disclaimer y tế.
[ ] Không gửi dữ liệu quá nhạy cảm nếu chưa có consent/copy rõ.
[ ] Không log prompt chứa dữ liệu cá nhân ở client.
```

### 11.5. Map/facility

Checklist:

```txt
[ ] Permission denied có fallback UX.
[ ] Loading map không làm trắng màn.
[ ] Facility list vẫn dùng được nếu map fail.
[ ] Mock/fallback facility được label nếu không phải backend thật.
[ ] Lazy load map bundle nếu route không cần ngay.
[ ] Search/filter không render thừa quá mức.
[ ] Mobile UX kiểm tra thực tế.
```

### 11.6. Payment/subscription

Checklist:

```txt
[ ] Pricing copy rõ.
[ ] Button submit có loading và disabled.
[ ] Không double create payment.
[ ] Return success/fail/pending/cancel được handle.
[ ] Subscription state refresh sau return.
[ ] Order code/payment id không bị mất.
[ ] Error message không lộ thông tin nhạy cảm.
[ ] Test callback states.
```

### 11.7. Admin workspace

Checklist:

```txt
[ ] Admin route guard hoạt động.
[ ] Menu chỉ hiện cho admin.
[ ] Mỗi CRUD có loading/error/empty state.
[ ] Delete/update có confirm nếu destructive.
[ ] Form validation rõ.
[ ] Pagination/search/filter không phá state section khác.
[ ] Refactor từng section, không rewrite toàn page.
[ ] Test admin critical flows.
```

### 11.8. Doctor invitation

Checklist:

```txt
[ ] Token missing/invalid/expired có UI riêng.
[ ] Loading validate token rõ.
[ ] Form validation đủ.
[ ] Submit disabled khi loading.
[ ] Duplicate/used invitation handle rõ.
[ ] Success state không tự động lộ thông tin nhạy cảm.
[ ] Test token edge cases.
```

### 11.9. Records/Medication demo

Checklist:

```txt
[ ] Có label demo.
[ ] Không xuất hiện như capability clinical thật.
[ ] Không đưa ra khuyến nghị điều trị như fact.
[ ] Không dùng dữ liệu mock nếu không hiển thị rõ.
[ ] Có quyết định product: hidden/demo/beta/production.
```

---

## 12. Architecture target

### 12.1. Cấu trúc target cấp cao

Target dài hạn nên là feature-first có foundation rõ:

```txt
src/
  app/
    App.jsx
    providers/
    router/
  assets/
  components/
    ui/
    layout/
    feedback/
  features/
    auth/
    symptom-analysis/
    dashboard/
    map/
    profile/
    payment/
    admin/
    staff/
    doctor-invitation/
    records/
    medication/
  services/
    api/
    domains/
  hooks/
  utils/
  styles/
    foundation/
    components/
    layouts/
    features/
  tests/
```

### 12.2. Không cần migrate một lần

Migration nên làm theo phase:

| Phase | Mục tiêu | Ví dụ |
| --- | --- | --- |
| 1 | Đóng băng pattern xấu | Cấm fetch trực tiếp, cấm thêm CSS global |
| 2 | Tách section ít rủi ro | Tách admin AI configs/users |
| 3 | Tách hooks/service mapper | `useAdminUsers`, `normalizeUser` |
| 4 | Tách UI primitives | Table, Modal, FormField |
| 5 | Chuyển folder feature-first | Di chuyển file theo domain |
| 6 | Thêm import boundary/lint | Enforce kiến trúc |
| 7 | Docs/test/CI gate | Chặn regression |

### 12.3. Quy tắc tránh phá app khi migrate

```txt
[ ] Không đổi route path nếu không cần.
[ ] Không đổi public API component khi chưa refactor xong.
[ ] Không đổi CSS class lớn cùng lúc với logic.
[ ] Không đổi service contract cùng lúc với UI layout.
[ ] Không tách nhiều feature trong một PR.
[ ] Có test/manual evidence trước và sau.
[ ] Giữ alias import hoặc barrel export tạm nếu cần.
[ ] Sau mỗi phase phải build được.
```

---

## 13. API/data flow overview

### 13.1. Flow chuẩn

```txt
User action
  -> Component event handler
    -> Feature hook
      -> Domain service
        -> ENDPOINTS
          -> apiClient
            -> Backend
              -> apiClient normalize error/response
                -> Hook set data/loading/error
                  -> Component render UI states
```

### 13.2. Response state bắt buộc ở UI

Mọi UI gọi API phải có 4 trạng thái:

| State | Khi nào | UI cần có |
| --- | --- | --- |
| Idle | Chưa gọi API | Form/CTA bình thường |
| Loading | Đang gọi API | Spinner/skeleton/disabled button |
| Success | Có data | Render kết quả |
| Error | API/network/validation fail | Message rõ, action retry nếu phù hợp |
| Empty | Success nhưng không có data | Empty state, hướng dẫn tiếp theo |

Không được để:

```txt
API đang loading nhưng button vẫn submit được nhiều lần.
API lỗi nhưng UI vẫn hiện data cũ như kết quả mới.
API success empty nhưng UI trắng.
Error object raw từ backend render trực tiếp ra user.
```

### 13.3. Error normalization

Nên chuẩn hóa error dạng:

```js
{
  status: 400,
  code: 'VALIDATION_ERROR',
  message: 'Thông tin chưa hợp lệ.',
  details: {},
  requestId: '...'
}
```

UI không nên phụ thuộc vào nhiều shape lỗi khác nhau.

---

## 14. State management overview

### 14.1. Phân loại state

| Loại state | Ví dụ | Nơi nên đặt |
| --- | --- | --- |
| UI local | modal open, tab active, input draft | Component/feature hook |
| Form state | field values, validation errors | Form hook |
| Server state | users, facilities, subscription | Query hook/service layer |
| Auth state | current user, token, role | Auth provider/store |
| App shell state | sidebar, layout mode | Layout provider |
| Cross-feature state | selected patient/context nếu cần | Store/context rõ owner |
| Derived state | filtered list, computed status | `useMemo` hoặc pure function |

### 14.2. Quy tắc state

```txt
Không đưa state lên global nếu chỉ một component dùng.
Không giữ cùng một data ở nhiều nơi nếu không có sync strategy.
Không truyền props qua 4-5 tầng nếu có feature context/hook phù hợp.
Không để page chứa toàn bộ state của nhiều section độc lập.
Không lưu server response raw nếu UI cần shape ổn định.
```

---

## 15. Routing overview

### 15.1. Route metadata là source of truth

Route nên có metadata:

```js
{
  id: 'admin.users',
  path: '/app/admin/users',
  title: 'Quản lý người dùng',
  access: 'role',
  roles: ['admin'],
  navigation: {
    label: 'Users',
    group: 'Admin'
  }
}
```

### 15.2. Quy tắc route

```txt
[ ] Route path dùng kebab-case.
[ ] Route id dùng dot notation theo domain.
[ ] Không hard-code cùng path nhiều nơi.
[ ] Private route phải khai báo access.
[ ] Role route phải khai báo roles.
[ ] Route 404 có fallback.
[ ] Page nặng nên lazy load.
[ ] Docs cập nhật khi thêm capability route.
```

---

## 16. Styling/UI overview

### 16.1. Nguyên tắc UI

```txt
Shared UI không biết nghiệp vụ.
Feature UI không định nghĩa token mới tùy tiện.
CSS global không chứa style feature mới.
Component phải có loading/error/empty nếu liên quan API.
Interactive element phải có focus/keyboard state.
Icon-only button phải có accessible label.
```

### 16.2. Design token nên có

```css
:root {
  --color-primary: ...;
  --color-danger: ...;
  --color-warning: ...;
  --color-success: ...;
  --space-1: ...;
  --space-2: ...;
  --radius-md: ...;
  --shadow-sm: ...;
}
```

### 16.3. UI primitive cần chuẩn hóa

| Primitive | Vì sao cần |
| --- | --- |
| Button | Tránh mỗi feature tự viết loading/disabled |
| Input | Validation/error/accessibility thống nhất |
| FormField | Label/help/error liên kết đúng |
| Modal/Dialog | Focus trap, close behavior |
| Table | Admin CRUD dùng nhiều |
| EmptyState | Không để màn trắng |
| ErrorState | Retry/copy thống nhất |
| LoadingState | Skeleton/spinner thống nhất |
| Badge/Status | Role/subscription/payment state |
| Toast/Alert | Feedback hành động |

---

## 17. Testing overview

### 17.1. Test pyramid khuyến nghị

```txt
Unit tests
  - utils
  - mappers
  - validators
  - pure business rules

Integration/component tests
  - form submit
  - API hook with mock
  - important UI states

E2E tests
  - auth
  - symptom flow
  - payment flow
  - admin CRUD smoke
  - doctor invitation
  - routing/access
  - a11y
```

### 17.2. Khi refactor phải chạy test nào?

| Thay đổi | Test tối thiểu |
| --- | --- |
| Sửa route/router | route/navigation E2E + build |
| Sửa auth/access | auth/access E2E + manual role check |
| Sửa API layer | unit service/mappers + affected flow E2E |
| Sửa payment | payment result specs + manual staging |
| Sửa symptom | symptom diagnosis specs + API error cases |
| Sửa admin | admin affected specs |
| Sửa CSS global/layout | visual/a11y/responsive check |
| Sửa map | map UX specs + permission denied manual |
| Sửa docs only | markdown review, link check nếu có |

### 17.3. Evidence trong PR

PR nên có phần:

```md
## Test evidence
- [ ] npm run lint
- [ ] npm run build
- [ ] npm run test:e2e:routes
- [ ] npm run test:e2e:<affected>
- [ ] Manual test: Chrome desktop
- [ ] Manual test: mobile viewport
- [ ] Screenshot/video nếu UI thay đổi
```

---

## 18. Security, privacy và safety

### 18.1. Security checklist trọng yếu

```txt
[ ] Không commit secret.
[ ] Không dùng provider secret trong VITE env.
[ ] Không log token.
[ ] Không log dữ liệu y tế nhạy cảm.
[ ] 401 clear session đúng.
[ ] Admin route không vào được bằng URL trực tiếp khi không có role.
[ ] Payment callback không tin hoàn toàn vào query string phía client.
[ ] Backend xác thực quyền cho mọi API.
[ ] Frontend không render raw HTML không kiểm soát.
[ ] Dependency không cần thiết được audit.
```

### 18.2. Privacy checklist

```txt
[ ] Không lưu triệu chứng/hồ sơ nhạy cảm vào localStorage nếu không cần.
[ ] Không gửi dữ liệu nhạy cảm tới third-party client-side nếu chưa có policy.
[ ] Không để screenshot/log chứa thông tin cá nhân trong PR public.
[ ] Error report nếu có phải redaction.
[ ] Demo data không giống người thật nếu không có consent.
```

### 18.3. Medical safety checklist

```txt
[ ] AI/symptom result không khẳng định chẩn đoán chắc chắn.
[ ] Có disclaimer rằng thông tin chỉ mang tính hỗ trợ.
[ ] Emergency condition có hướng dẫn tìm trợ giúp y tế.
[ ] Medication interaction demo không dùng làm quyết định điều trị.
[ ] Không dùng copy gây hiểu nhầm “được bác sĩ xác nhận” nếu không có thật.
```

---

## 19. Performance overview

### 19.1. Rủi ro performance hiện tại

| Khu vực | Rủi ro |
| --- | --- |
| Map route | Bundle map lớn, render marker/list nhiều |
| Admin workspace | Page lớn, nhiều state/table/modal |
| Global CSS | CSS tải rộng, khó tree-shake |
| Landing | Nếu tải chat/map sớm sẽ giảm performance |
| Icon library | Import không tối ưu có thể tăng bundle |
| Large static content | Content trong component lớn làm bundle tăng |

### 19.2. Performance checklist

```txt
[ ] Lazy load route nặng.
[ ] Lazy load map/chat/admin nếu không cần ban đầu.
[ ] Memoize derived list/filter lớn.
[ ] Không dùng useMemo/useCallback bừa bãi.
[ ] Virtualize list nếu quá dài.
[ ] Optimize image assets.
[ ] Loại dependency không dùng.
[ ] Kiểm tra bundle analyzer định kỳ.
[ ] Không import cả library lớn chỉ dùng 1 hàm.
[ ] Có performance smoke test cho route chính.
```

---

## 20. Documentation overview

### 20.1. Docs cần luôn đồng bộ

| Khi code thay đổi | Docs cần xem lại |
| --- | --- |
| Thêm route | Route docs, architecture docs, README |
| Thêm API | API docs, service convention, backend contract |
| Thay auth/role | Access docs, security docs |
| Thay env/deploy | Setup docs, README, deployment docs |
| Thêm feature demo | Product/capability matrix |
| Refactor folder | Project structure docs |
| Thêm UI primitive | Component docs |
| Thay test command | Contribution/testing docs |

### 20.2. Nguyên tắc docs

```txt
Docs phải hướng dẫn làm được, không chỉ mô tả.
Docs phải có ví dụ đúng/sai nếu là convention.
Docs phải có owner hoặc nơi kiểm tra.
Docs không được nói đã test nếu chưa test.
Docs phải cập nhật khi source thay đổi lớn.
Docs stale phải được coi là tech debt.
```

---

## 21. Onboarding guide cho nhân viên mới

### 21.1. Ngày 1: hiểu sản phẩm và chạy project

Mục tiêu:

```txt
Developer hiểu MediMate là sản phẩm y tế/sức khỏe,
biết capability chính,
chạy được app local,
biết route/API đi qua đâu.
```

Việc cần làm:

```txt
[ ] Đọc 00_INDEX.md.
[ ] Đọc 01_TONG_QUAN_DU_AN.md.
[ ] Đọc README setup.
[ ] Cài dependency.
[ ] Chạy dev server.
[ ] Chạy lint/build.
[ ] Mở các route chính: landing, login, dashboard, symptom, map.
[ ] Ghi lại lỗi setup nếu có.
```

Câu hỏi kiểm tra:

```txt
[ ] API call nên đặt ở đâu?
[ ] Vì sao không đặt provider secret trong VITE env?
[ ] Route admin được bảo vệ bằng gì?
[ ] Demo medication/records có được xem là production không?
[ ] Khi sửa CSS global cần lưu ý gì?
```

### 21.2. Ngày 2-3: task nhỏ có kiểm soát

Task phù hợp:

- sửa docs;
- tách một shared UI component nhỏ;
- viết unit test cho utility;
- chuẩn hóa một empty state;
- fix một route typo;
- thêm validation message cho form không rủi ro.

Task không phù hợp cho dev mới chưa pairing:

- sửa `apiClient.js`;
- đổi auth/token flow;
- đổi payment callback;
- sửa toàn bộ `AdminWorkspacePage.jsx`;
- sửa CSS global lớn;
- đổi route access;
- xử lý AI provider.

### 21.3. Tuần đầu: hiểu refactor process

Developer phải biết:

```txt
[ ] Cách tạo branch.
[ ] Cách viết PR description.
[ ] Cách ghi test evidence.
[ ] Cách cập nhật docs.
[ ] Cách hỏi backend contract.
[ ] Cách rollback thay đổi nhỏ.
[ ] Cách chia PR không quá lớn.
```

---

## 22. Reviewer guide

Reviewer không chỉ kiểm tra code chạy được. Reviewer phải kiểm tra code có đi đúng kiến trúc không.

### 22.1. Checklist review chung

```txt
[ ] Thay đổi có đúng scope không?
[ ] Có gọi API đúng service layer không?
[ ] Có hard-code endpoint/path/env không?
[ ] Có loading/error/empty state không?
[ ] Có duplicate UI/logic không?
[ ] Có làm tăng page/CSS lớn không?
[ ] Có ảnh hưởng auth/role/premium không?
[ ] Có test evidence đủ không?
[ ] Có cập nhật docs nếu cần không?
[ ] Có rủi ro security/safety/privacy không?
```

### 22.2. Khi PR chạm vùng rủi ro cao

Vùng rủi ro cao:

```txt
apiClient
authService
router/routes
router/access
AdminWorkspacePage
SymptomAnalysisPage
Pricing/Payment
Chatbot/AI provider
global.css
vercel/vite/env config
```

Reviewer cần yêu cầu:

```txt
[ ] Mô tả rủi ro trong PR.
[ ] Test affected flow.
[ ] Manual evidence nếu UI.
[ ] Rollback plan nếu production risk.
[ ] Approval từ owner nếu security/payment/auth.
```

---

## 23. PM/Founder guide

PM/Founder nên dùng tài liệu này để hiểu trade-off kỹ thuật.

### 23.1. Câu hỏi nên hỏi trong sprint planning

```txt
[ ] Có P0 security/env/demo nào chưa xử lý không?
[ ] Capability nào đang demo nhưng xuất hiện như production?
[ ] Page lớn nào đang chặn velocity?
[ ] Test nào bảo vệ flow payment/symptom/admin?
[ ] Có docs nào stale so với code không?
[ ] Nếu release hôm nay, rủi ro lớn nhất là gì?
```

### 23.2. Cách đo tiến độ refactor

Không nên đo bằng “đã sửa bao nhiêu dòng”. Nên đo bằng outcome:

| Outcome | Dấu hiệu hoàn thành |
| --- | --- |
| Secret không ở frontend | Không có provider secret trong `VITE_*`/bundle |
| Demo rõ ràng | Records/Medication có label hoặc hidden |
| Admin dễ maintain hơn | Admin page tách section/hook theo domain |
| API chuẩn hơn | Không còn fetch trực tiếp trong page |
| CSS ít rủi ro hơn | Không tăng global.css, có layer/token |
| Test tốt hơn | Flow rủi ro có test guard |
| Onboarding tốt hơn | Dev mới làm task nhỏ không cần hỏi quá nhiều |

---

## 24. Risk register tổng quan

| ID | Rủi ro | Mức | Ảnh hưởng | Hành động |
| --- | --- | --- | --- | --- |
| R01 | Provider secret ở client | Critical | Lộ key, tốn chi phí, mất kiểm soát safety | Chuyển qua backend gateway |
| R02 | Hard-code backend IP/URL | High | Deploy sai môi trường | Chuẩn hóa env/deploy config |
| R03 | Demo/mock y tế không rõ | High | Người dùng hiểu nhầm | Label/hidden/product decision |
| R04 | AdminWorkspacePage quá lớn | High | Regression, khó review | Tách theo section |
| R05 | global.css quá lớn | High | UI regression | Freeze/tách CSS layer |
| R06 | Auth token localStorage | High | XSS/session risk | Harden session, clear, consider cookie |
| R07 | Payment edge case thiếu test | High | Sai quyền/giao dịch | Test callback states |
| R08 | Symptom API empty/error chưa chuẩn | High | UX/safety risk | Error/loading/empty/safety copy |
| R09 | Unit/integration test thiếu | Medium | E2E feedback chậm | Bổ sung test pyramid |
| R10 | Docs stale | Medium | Dev làm sai theo docs cũ | Docs update gate |

---

## 25. Ưu tiên xử lý theo phase

### Phase 0 - Audit và khóa rủi ro

Thời điểm: trước khi refactor lớn.

```txt
[ ] Audit env/secret/hard-code URL.
[ ] Audit demo/mock production surface.
[ ] Audit direct fetch/direct provider call.
[ ] Audit route access admin/staff/premium.
[ ] Chạy lint/build/test baseline.
[ ] Ghi known issues vào backlog.
```

Output:

```txt
Security/env report
Demo capability report
Route/access report
Test baseline report
```

### Phase 1 - Stabilize production risk

```txt
[ ] Chuyển AI provider call qua backend gateway.
[ ] Tách env dev/staging/prod.
[ ] Label/hidden records/medication nếu demo.
[ ] Chuẩn hóa 401 handling.
[ ] Payment callback states có test.
[ ] Symptom empty/error states có test.
```

### Phase 2 - Maintainability refactor

```txt
[ ] Tách AdminWorkspacePage theo section.
[ ] Tách DashboardPage logic ra hooks/components.
[ ] Tách NearbyClinicPage map/list/search.
[ ] Freeze global.css.
[ ] Tạo UI primitives còn thiếu.
[ ] Chuẩn hóa service error handling.
```

### Phase 3 - Architecture upgrade

```txt
[ ] Chuyển dần feature-first.
[ ] Thêm import boundary lint.
[ ] Bổ sung unit/integration tests.
[ ] Viết ADR cho decisions lớn.
[ ] Thêm CI gate.
[ ] Bundle/performance budget.
```

### Phase 4 - Operational excellence

```txt
[ ] Release checklist theo môi trường.
[ ] Observability/logging policy.
[ ] Contract testing với backend.
[ ] Design system docs.
[ ] Onboarding checklist chính thức.
```

---

## 26. Definition of Ready cho task frontend

Một task chỉ nên bắt đầu khi có đủ:

```txt
[ ] Mục tiêu rõ.
[ ] Phạm vi file/thư mục rõ.
[ ] Rủi ro đã biết.
[ ] Test cần chạy rõ.
[ ] Acceptance criteria rõ.
[ ] Backend contract rõ nếu có API.
[ ] Product copy rõ nếu liên quan y tế/payment.
[ ] Rollback strategy nếu chạm vùng rủi ro cao.
```

Ví dụ task chưa ready:

```txt
"Refactor admin page cho sạch hơn"
```

Vì không rõ section nào, tiêu chí nào, test nào.

Ví dụ task ready:

```txt
Tách Admin Users section khỏi AdminWorkspacePage.

Scope:
- src/pages/AdminWorkspacePage.jsx
- src/features/admin/users/*
- src/services/userService.js nếu cần mapper

Acceptance:
- Route admin/users giữ nguyên behavior.
- Users table render như cũ.
- Create/update/delete vẫn chạy.
- Loading/error/empty state không mất.
- npm run build pass.
- admin-users.spec.js pass hoặc có evidence manual nếu test chưa chạy được.
```

---

## 27. Definition of Done cho PR frontend

PR chỉ nên merge khi:

```txt
[ ] Code đúng scope.
[ ] Không thêm secret.
[ ] Không hard-code endpoint/env mới.
[ ] Không gọi API bypass service layer.
[ ] Không làm tăng global.css nếu không có lý do.
[ ] Loading/error/empty state đầy đủ.
[ ] Auth/role/premium không bị bypass.
[ ] Lint/build pass.
[ ] Test affected flow pass hoặc có evidence rõ.
[ ] Docs cập nhật nếu thay đổi route/API/env/architecture/capability.
[ ] Reviewer hiểu được thay đổi qua PR description.
```

---

## 28. Các quyết định kỹ thuật cần chốt sớm

| Quyết định | Vì sao cần chốt | Đề xuất mặc định |
| --- | --- | --- |
| AI provider gateway | Secret/safety/quota | Bắt buộc qua backend |
| Demo capability policy | Tránh hiểu nhầm y tế | Demo phải label hoặc hidden |
| Env strategy | Deploy đúng môi trường | dev/staging/prod rõ |
| Auth session strategy | Security dài hạn | Harden localStorage, cân nhắc httpOnly cookie |
| CSS strategy | UI scale | Freeze global, tách layer |
| Feature-first migration | Maintainability | Migration từng domain |
| Test strategy | Refactor an toàn | Unit + integration + E2E |
| Docs governance | Onboarding/review | Docs update gate trong PR |

---

## 29. Engineering principles cho repo MediMate

### 29.1. Safety first

Không tối ưu tốc độ release bằng cách bỏ qua safety y tế, auth, payment, role hoặc secret.

### 29.2. Centralize contracts

Route, endpoint, API response, auth behavior, design tokens nên có source of truth.

### 29.3. Refactor incrementally

Không rewrite toàn bộ khi chưa có test guard. Tách nhỏ, verify, merge, rồi tiếp tục.

### 29.4. Make states explicit

Mọi flow API phải có loading/error/empty/success rõ.

### 29.5. Do not hide uncertainty

Nếu capability là demo, nói là demo. Nếu AI chỉ hỗ trợ tham khảo, nói rõ là tham khảo.

### 29.6. Optimize for onboarding

Code tốt không chỉ chạy đúng, mà dev mới có thể hiểu và sửa đúng nơi.

### 29.7. Documentation follows architecture

Khi kiến trúc đổi, docs đổi theo. Docs sai là tech debt.

---

## 30. Roadmap kỹ thuật 30/60/90 ngày

### 30 ngày đầu

Mục tiêu: giảm rủi ro production.

```txt
[ ] Audit và loại bỏ secret/provider key khỏi frontend.
[ ] Tách env config theo môi trường.
[ ] Kiểm soát demo/mock records/medication.
[ ] Thêm/ổn định test route/access/payment/symptom critical.
[ ] Freeze global.css.
[ ] Định nghĩa PR checklist bắt buộc.
[ ] Tạo backlog tách AdminWorkspacePage theo section.
```

Kết quả mong đợi:

```txt
Production surface an toàn hơn.
Dev không thêm code nguy hiểm mới.
Team có baseline test và checklist rõ.
```

### 60 ngày

Mục tiêu: tăng maintainability.

```txt
[ ] Tách AdminWorkspacePage phase 1-2.
[ ] Tách Dashboard/Symptom hooks.
[ ] Chuẩn hóa API error/loading.
[ ] Tạo UI primitives cho form/table/modal/empty/error.
[ ] Bổ sung unit test cho utils/mappers/validators.
[ ] Tách CSS foundation/components/features.
```

Kết quả mong đợi:

```txt
PR nhỏ hơn.
Reviewer dễ kiểm tra hơn.
Dev mới dễ nhận task hơn.
Regression UI giảm.
```

### 90 ngày

Mục tiêu: chuyên nghiệp hóa architecture.

```txt
[ ] Feature-first migration cho admin/symptom/payment/map.
[ ] Import boundary lint.
[ ] ADR cho AI gateway, env, auth, CSS.
[ ] CI gate đầy đủ.
[ ] Performance budget.
[ ] Contract testing với backend nếu backend ổn định.
[ ] Docs sống theo release process.
```

Kết quả mong đợi:

```txt
Repo sẵn sàng scale team.
Architecture có governance.
Release ít rủi ro hơn.
```

---

## 31. Mẫu báo cáo hiện trạng hàng tuần

Tech Lead có thể dùng mẫu này trong sprint:

```md
# Frontend Engineering Health Report

## Tuần
yyyy-mm-dd đến yyyy-mm-dd

## P0/P1 risk status
- Secret/client provider:
- Env hard-code:
- Demo/mock production:
- Auth/access:
- Payment:
- Symptom safety:

## Refactor progress
- Admin split:
- CSS global reduction:
- API layer standardization:
- Test coverage:

## New risks discovered
1.
2.
3.

## Decisions needed
1.
2.

## Test baseline
- lint:
- build:
- e2e routes:
- affected specs:

## Docs updated
- Yes/No
- Files:
```

---

## 32. Mẫu capability review

Dùng khi thêm hoặc đánh giá một feature:

```md
# Capability Review: <name>

## Status
production / beta / internal / demo / hidden

## User value
Mô tả người dùng được lợi gì.

## Routes
- ...

## Backend APIs
- ...

## Data sensitivity
low / medium / high

## Safety considerations
- ...

## Required UI states
- Loading
- Error
- Empty
- Success

## Access control
public / auth / premium / role

## Tests required
- Unit:
- Integration:
- E2E:
- Manual:

## Release decision
Go / No-go / Go with constraints
```

---

## 33. Kết luận

MediMate AI Frontend đang ở giai đoạn quan trọng: sản phẩm đã có nhiều capability, codebase đã đủ lớn, và domain y tế khiến các quyết định frontend có ảnh hưởng lớn tới an toàn, tin cậy và khả năng vận hành. Đây không còn là repo chỉ cần “chạy được”. Repo cần được quản trị như một sản phẩm production chuyên nghiệp.

Hướng đi đúng không phải là viết lại toàn bộ. Hướng đi đúng là:

```txt
Giữ lại nền tốt:
- API layer
- route metadata
- E2E baseline
- docs nội bộ
- UI foundation hiện có

Đồng thời xử lý có thứ tự:
- security/env/demo
- auth/access/payment/symptom safety
- page lớn
- CSS global
- API/error/loading standard
- test pyramid
- feature-first architecture
```

Nếu team follow tài liệu này cùng với checklist refactor và SOP triển khai, repo sẽ dần đạt các mục tiêu:

- dễ hiểu hơn;
- dễ bảo trì hơn;
- dễ mở rộng hơn;
- dễ test hơn;
- dễ onboarding nhân viên mới hơn;
- giảm duplicate code;
- chuẩn hóa cấu trúc;
- chuẩn hóa API/error/loading;
- tối ưu performance;
- tăng tính chuyên nghiệp khi review, release và vận hành.

---

## 34. Appendix A - Checklist đọc nhanh cho developer mới

```txt
[ ] Tôi hiểu MediMate là sản phẩm sức khỏe, không phải app demo bình thường.
[ ] Tôi biết capability nào là production, capability nào cần label demo.
[ ] Tôi biết không được đặt secret trong VITE env.
[ ] Tôi biết API call phải đi qua services.
[ ] Tôi biết route phải qua metadata/router.
[ ] Tôi biết CSS global không nên tăng thêm.
[ ] Tôi biết page lớn cần tách dần.
[ ] Tôi biết mọi API UI cần loading/error/empty/success.
[ ] Tôi biết PR phải có test evidence.
[ ] Tôi biết docs phải cập nhật khi đổi route/API/env/architecture.
```

---

## 35. Appendix B - Checklist đọc nhanh cho reviewer

```txt
[ ] PR có scope rõ.
[ ] Không có secret.
[ ] Không có hard-code endpoint mới.
[ ] Không bypass API layer.
[ ] Không bypass route/access.
[ ] Không làm demo trông như production.
[ ] Không tăng duplicate UI.
[ ] Không tăng global CSS thiếu lý do.
[ ] Có loading/error/empty.
[ ] Có test evidence.
[ ] Có docs update nếu cần.
```

---

## 36. Appendix C - Checklist đọc nhanh cho PM/Founder

```txt
[ ] Capability demo có được gắn nhãn hoặc ẩn chưa?
[ ] AI provider secret đã ra khỏi frontend chưa?
[ ] Payment callback đã được test chưa?
[ ] Symptom analysis có safety/error handling chưa?
[ ] Admin page đã được tách bớt chưa?
[ ] CSS global có đang tiếp tục phình to không?
[ ] Dev mới có tài liệu onboarding chưa?
[ ] Release có checklist chưa?
```
