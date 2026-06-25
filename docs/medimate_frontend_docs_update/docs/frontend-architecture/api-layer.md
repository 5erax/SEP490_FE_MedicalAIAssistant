# API layer hiện tại

Ngày cập nhật: **2026-06-26**.

Tài liệu này mô tả API layer đang dùng trong repo trước khi migration sang cấu trúc feature-first. Kiến trúc mục tiêu nằm tại [Frontend architecture](./README.md).

## 1. Mục tiêu

API layer đảm bảo:

- Endpoint được khai báo tập trung.
- Request đi qua một client thống nhất.
- Auth header được xử lý nhất quán.
- Error backend được normalize.
- Component/page không biết backend host.
- Dễ thay đổi backend contract mà không sửa rải rác UI.

## 2. Cấu trúc hiện tại

```text
src/services/
├── apiClient.js
├── endpoints.js
├── api.js
├── authService.js
├── userService.js
├── doctorService.js
├── aiConfigService.js
├── departmentService.js
├── facilityService.js
├── patientProfileService.js
├── subscriptionService.js
├── chatbotService.js
├── staffService.js
├── symptomAnalysisService.js
├── feedbackReviewService.js
├── doctorInvitationService.js
└── ...
```

## 3. Request flow bắt buộc

```text
Component/Page
  -> Domain Service
  -> ENDPOINTS
  -> apiRequest()
  -> Backend
```

Ví dụ:

```text
AdminWorkspacePage
  -> aiConfigManagementApi.create(payload)
  -> ENDPOINTS.AI_CONFIGS.BASE
  -> apiRequest(path, { method: "POST", body, auth: true })
  -> POST /api/ai-configs
```

## 4. `apiClient.js`

`apiClient.js` sở hữu request behavior chung:

- Same-origin request strategy.
- `apiRequest(path, options)`.
- Auth token storage helpers.
- Auth header injection.
- JSON parsing.
- Backend error normalization.
- Pagination query helper.
- Auth storage whitelist.

Không khai báo endpoint domain trong file này.

### Auth storage

Chỉ được lưu field kỹ thuật đã whitelist, ví dụ:

- `accessToken`
- `userId`
- `identityId`
- `roles`
- `role`
- `expiresAtUtc`
- `firstLogin` / `isFirstLogin`
- `isProfileCompleted`
- Premium/subscription flags kỹ thuật

Không lưu:

- Email
- Họ tên
- Số điện thoại
- Địa chỉ
- Refresh token
- Triệu chứng
- Câu trả lời lâm sàng
- Kết quả AI
- Hồ sơ y tế đầy đủ

### Known issue cần fix bằng task code riêng

Chuỗi fallback error trong `apiClient.js` đang có dấu hiệu mojibake. Khi sửa, phải dùng UTF-8 rõ ràng, ví dụ:

```js
"Dịch vụ đang phản hồi không ổn định. Vui lòng thử lại sau."
```

và

```js
`Yêu cầu thất bại với mã ${response.status}`
```

Không sửa lẫn trong PR docs nếu không chạy test code.

## 5. `endpoints.js`

`endpoints.js` là nguồn chuẩn cho mọi API path.

Nhóm endpoint hiện có:

- `AUTH`
- `USERS`
- `MEDICAL_DEPARTMENTS`
- `MEDICAL_FACILITIES`
- `FACILITY_DEPARTMENTS`
- `DOCTORS`
- `DOCTOR_INVITATIONS`
- `FEEDBACK_REVIEWS`
- `ICD_CHAPTERS`
- `CLINICAL_QUESTIONS`
- `SYMPTOM_ANALYSIS`
- `PATIENT_PROFILES`
- `SUBSCRIPTION_PLANS`
- `USER_SUBSCRIPTIONS`
- `PAYMENTS`
- `AI_CONFIGS`
- `WEB_CHATBOT`

Quy tắc:

- Không hard-code `/api/...` trong page/component.
- Service phải import từ `ENDPOINTS`.
- Endpoint có dynamic segment phải dùng function.
- Dynamic value đưa vào URL phải encode khi có thể chứa ký tự đặc biệt.
- Không khai báo PayOS webhook/return/cancel như API sản phẩm frontend nếu frontend không được gọi trực tiếp.

## 6. Domain service files

Domain service expose API theo ngôn ngữ sản phẩm:

```js
usersApi.list(1, 10)
doctorManagementApi.list(filters)
aiConfigManagementApi.setStatus(id, true)
webChatbotApi.message(message, { auth: true })
```

Service chỉ compose:

```text
apiRequest + ENDPOINTS + request payload/query params
```

Service không được chứa:

- Toast.
- Redirect.
- DOM access.
- UI copy dài.
- Component state.
- Raw endpoint string.
- Mock data production.
- Business text y tế.

## 7. `api.js`

`api.js` là compatibility facade để giữ import cũ hoạt động:

```js
import { authApi, usersApi } from "../services/api";
```

Quy tắc:

- Chỉ re-export hoặc adapter cực mỏng.
- Không thêm logic mới vào facade.
- Khi import cũ đã được migrate, xóa export/file liên quan.
- Không biến facade thành service tổng mới.

## 8. Thêm endpoint mới

### Bước 1: Thêm vào `endpoints.js`

```js
export const ENDPOINTS = {
  EXAMPLE: {
    BASE: "/api/examples",
    BY_ID: (id) => `/api/examples/${encodeURIComponent(id)}`,
  },
};
```

### Bước 2: Tạo hoặc cập nhật service

```js
import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const exampleApi = {
  list() {
    return apiRequest(ENDPOINTS.EXAMPLE.BASE, { auth: true });
  },
  get(id) {
    return apiRequest(ENDPOINTS.EXAMPLE.BY_ID(id), { auth: true });
  },
};
```

### Bước 3: Dùng service trong page/component

```js
import { exampleApi } from "../services/exampleService";
```

### Bước 4: Cập nhật compatibility nếu cần

```js
export { exampleApi } from "./exampleService";
```

Chỉ làm bước này nếu import cũ hoặc nhiều consumer cần facade.

## 9. Error handling

Bắt buộc:

- Backend error phải được hiển thị bằng message rõ.
- Không nuốt lỗi bằng `catch {}` rỗng.
- Không hiển thị success khi mutation fail.
- Error object nên giữ `status` và `payload`.
- UI phải phân biệt load error và mutation error nếu tác vụ cần.

Không được:

- Ghi raw stack/error payload chứa dữ liệu nhạy cảm vào console production.
- Hiển thị JSON thô cho người dùng cuối.
- Convert mọi lỗi thành message chung nếu backend có message cụ thể.

## 10. Pagination/query params

Dùng helper như `withPagination(pageNumber, pageSize)` khi phù hợp.

Quy tắc:

- Query param phải encode bằng `URLSearchParams`.
- Không nối chuỗi query thủ công nếu có nhiều param.
- Filter/search phải bỏ param rỗng nếu backend không chấp nhận.
- Pagination state phải có loading/error/empty rõ.

## 11. Auth và role

- Request cần user token phải truyền `{ auth: true }`.
- Guard route không thay thế auth header.
- Role/premium check cho navigation không thay thế backend authorization.
- Khi token hết hạn, auth storage phải được clear và UI điều hướng hợp lý.
- Không dựa vào client role để expose dữ liệu admin nếu backend chưa authorize.

## 12. Payment API

Frontend chỉ đọc trạng thái thanh toán qua API backend đã xác minh.

Bắt buộc:

- Dùng `PAYMENTS.PAYOS_STATUS(orderCode)` để xác minh kết quả nếu flow yêu cầu.
- Không gọi webhook từ frontend.
- Không coi URL `/payment/return` là thành công tự động.
- `/payment/cancel` phải hiển thị canceled state ngay nếu product đã quy định như vậy và không polling sai.
- Không tự tính amount/price khi checkout nếu backend là nguồn giá.

## 13. AI và symptom analysis API

Bắt buộc:

- Dùng backend API làm gateway.
- Không đặt AI provider key trong client.
- Không log nội dung triệu chứng hoặc câu trả lời lâm sàng.
- Xử lý empty questions, timeout và backend error.
- Kết quả chỉ là định hướng, không phải chẩn đoán.

## 14. Local và production proxy

Local:

```text
Browser -> /api/* -> Vite proxy -> VITE_API_BASE_URL
```

Production trên Vercel:

```text
Browser -> /api/* -> Vercel rewrite -> backend
```

Quy tắc:

- Component/service luôn gọi same-origin `/api/*`.
- Backend host không xuất hiện trong component/page.
- Không commit `.env.local`.
- Không giữ backend IP cố định lâu dài trong production config nếu có nhiều môi trường.

## 15. Checklist API PR

- [ ] Endpoint nằm trong `ENDPOINTS`.
- [ ] Service dùng `apiRequest`.
- [ ] Không có raw `/api/...` trong component/page.
- [ ] Auth request có `{ auth: true }`.
- [ ] Payload chỉ chứa field cần.
- [ ] Dynamic path được encode khi cần.
- [ ] Error/loading/empty state đã xử lý ở UI.
- [ ] Không log dữ liệu nhạy cảm.
- [ ] Test liên quan đã chạy.
- [ ] Docs/backend contract đã cập nhật nếu API đổi.
