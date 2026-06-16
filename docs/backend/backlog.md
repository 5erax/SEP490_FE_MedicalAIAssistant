# Backlog backend và hướng dẫn triển khai

Tài liệu này là backlog giao việc cho backend của MediMate AI. Mục tiêu là để backend có thể đọc từng ticket như một mini-spec: biết vì sao cần làm, endpoint nào cần có, request/response ra sao, phân quyền thế nào, test gì bắt buộc và frontend sẽ nghiệm thu bằng cách nào.

Ngày quét lại: **2026-06-16**

Nguồn đối chiếu:

- Frontend route/service hiện tại trong `src/services/*`, `src/router/*`, các trang Patient/Admin/Staff.
- Playwright contract/UI tests trong `tests/e2e/*`.
- Swagger deploy: `http://52.77.210.243:8080/swagger/v1/swagger.json`.
- Swagger live đã tải được ngày 2026-06-16, HTTP 200, có 62 path.

## Nguyên tắc contract chung

Backend cần giữ contract ổn định để frontend không phải suy đoán business rule.

- Tất cả API thành công nên trả envelope thống nhất:

```json
{
  "success": true,
  "message": "OK",
  "errors": [],
  "data": {}
}
```

- Tất cả API lỗi nên trả envelope thống nhất:

```json
{
  "success": false,
  "code": "VALIDATION_FAILED",
  "message": "Dữ liệu không hợp lệ.",
  "fieldErrors": {
    "phoneNumber": ["Số điện thoại không đúng định dạng."]
  },
  "traceId": "00-example-trace-id"
}
```

- `message` phải an toàn để hiển thị cho người dùng, không chứa stack trace, token, SQL, payload PayOS, nội dung triệu chứng hoặc dữ liệu nhạy cảm.
- Dùng đúng HTTP status: `400` request sai cú pháp, `401` chưa xác thực, `403` không đủ quyền, `404` không tìm thấy hoặc không thuộc quyền truy cập, `409` xung đột dữ liệu, `422` validation nghiệp vụ, `429` hết quota/rate limit.
- OpenAPI phải mô tả rõ auth, request, response, error và endpoint public bằng `security: []`.
- Không yêu cầu frontend lưu PII/PHI trong `localStorage`. Frontend chỉ lưu token và metadata phiên tối thiểu.
- Mọi quyền Premium, quota, trạng thái payment/subscription và quyền theo role/resource phải do backend quyết định.
- Log và audit không được chứa password, refresh token, invitation token, provider key, email/số điện thoại dạng đầy đủ nếu không cần thiết, nội dung triệu chứng hoặc nội dung chat y tế.

## Trạng thái Swagger live ngày 2026-06-16

### Nhóm API đã có trên Swagger

- Authentication: login, register, Google, refresh, logout, forgot/change password, Staff register, approve staff.
- Users: list, current user, update, delete.
- Patient profiles: list, create, update, delete.
- Medical departments: list, CRUD.
- Medical facilities: active list, management list, CRUD/status.
- Facility departments: mới có public active list.
- Doctors: active list, management list, CRUD/status.
- Doctor invitations: create, revoke, validate, register.
- Clinical questions và ICD chapters.
- Symptom analysis: suggest clinical questions, submit answers, my sessions, get by session.
- Web chatbot.
- Feedback reviews: list, by facility, create, update, status, delete.
- Subscription plans, user subscriptions, PayOS return/cancel/status/webhook.
- AI configs.

### Khoảng trống backend còn chặn frontend

- `ApplicationUserResponse` vẫn chưa có `phoneNumber`, trong khi `UpdateUserRequest` có nhận `phoneNumber`.
- Facility active có schema `latitude`/`longitude`, nhưng dữ liệu deploy trước đó có tọa độ `null`; Admin UI hiện có thể nhập tọa độ khi tạo facility, nên backend cần lưu và trả lại đúng dữ liệu này ở list public/management.
- `facility-departments` chỉ có `/active`, chưa có CRUD/status riêng cho vận hành.
- Doctor invitation chưa có API list/filter/resend.
- Facility search chưa có filter theo keyword, department, tọa độ, radius, sort khoảng cách và pagination phù hợp cho map.
- `user-subscriptions/me` trả subscription, nhưng chưa có capability/entitlement đã tính sẵn để frontend không phải parse `featureLimitJson`.
- Payment status public theo `orderCode` cần ownership hoặc reference khó đoán.
- Error contract trong Swagger vẫn dựa nhiều vào `message/errors`, chưa có `code`, `fieldErrors`, `traceId` thống nhất.
- Backend deploy đang là HTTP; production frontend cần same-origin HTTPS proxy hoặc backend HTTPS.
- Records, medication, appointment và treatment tracking chưa có API production, chỉ nên coi màn hình liên quan là demo đến khi Product chốt phạm vi.

## Bảng ưu tiên

| Ticket | Kết quả cần đạt | Ưu tiên | Trạng thái đề xuất | Chặn frontend |
|---|---|---:|---|---|
| BE-001 | Phiên đăng nhập và `/users/me` nhất quán | P0 | Ready | Role redirect, onboarding, profile phone |
| BE-002 | Entitlement/capability server-side | P0 | Ready | Premium gate, usage remaining |
| BE-003 | Enforce quota ở server | P0 | Ready | Chặn vượt hạn mức AI |
| BE-004 | Symptom analysis result ổn định | P0 | Ready | Render kết quả, map handoff |
| BE-005 | Lịch sử phân tích an toàn | P0 | In progress | Dashboard/history thật |
| BE-006 | Facility-department CRUD và dữ liệu map | P0 | In progress | Map, doctor assignment |
| BE-007 | Facility search cho map | P0 | Blocked by BE-006 | Search/sort/filter cơ sở |
| BE-008 | AI gateway backend-only | P0 | Ready | Không lộ provider key |
| BE-009 | PayOS chắc chắn và idempotent | P0 | In progress | Entitlement sau thanh toán |
| BE-010 | Error/auth/OpenAPI chuẩn hóa | P0 | In progress | Xử lý lỗi, contract test |
| BE-011 | Staff application lifecycle | P1 | Ready | Queue duyệt Staff |
| BE-012 | Doctor invitation list/resend/audit | P1 | Ready | Quản lý invitation sau reload |
| BE-013 | Feedback moderation policy | P1 | Ready | Review public và queue duyệt |
| BE-014 | Authorization theo resource scope | P1 | Ready | Staff chỉ thấy dữ liệu được giao |
| BE-015 | Audit log vận hành | P1 | Ready | Truy vết thay đổi |
| BE-016 | Validation/conflict directory | P1 | Ready | Tránh dữ liệu trùng/ghi đè |
| BE-017 | Analytics không thu PHI/PII | P2 | Blocked by policy | Product funnel an toàn |
| BE-018 | Health check/observability | P2 | Ready | Phân loại lỗi production |

## Definition of Ready

Một ticket sẵn sàng vào sprint khi có đủ:

- Business rule đã được Product Owner chốt hoặc phần còn mở được ghi rõ.
- Entity, migration, seed data và authorization policy đã được backend owner xác định.
- Endpoint, method, request, response, status code và error code đã được ghi trong ticket.
- Test data không chứa thông tin người thật hoặc dữ liệu sức khỏe thật.
- Frontend owner xác nhận contract đủ để tích hợp.

## Definition of Done

Một ticket chỉ được đóng khi có đủ:

- Unit test và integration test cho happy path, validation, authorization, conflict và race condition liên quan.
- Migration và seed chạy được trên staging.
- Swagger cập nhật request, response, error và Bearer/public security.
- Log không chứa PII, PHI, token, secret, nội dung triệu chứng/chat hoặc payload thanh toán nhạy cảm.
- Có ví dụ request/response đã ẩn dữ liệu nhạy cảm.
- Frontend nghiệm thu bằng backend deploy hoặc contract test, không chỉ bằng mock.

## BE-001 - Chuẩn hóa phiên đăng nhập và hồ sơ hiện tại

**Ưu tiên:** P0
**Trạng thái:** Ready
**Phụ thuộc:** BE-010

### Vấn đề

Frontend dùng login/Google/refresh để lấy token và dùng `/api/users/me` để tải hồ sơ hiện tại. Swagger live cho thấy `UpdateUserRequest` có `phoneNumber`, nhưng `ApplicationUserResponse` chưa trả `phoneNumber`. Điều này làm profile sau reload/login không thể hiển thị lại số điện thoại đã lưu nếu frontend không lưu PII trong local storage.

### Backend cần làm

- Dùng `GET /api/users/me` làm nguồn sự thật cho hồ sơ user hiện tại.
- Bổ sung `phoneNumber` vào `ApplicationUserResponse`.
- Đồng bộ naming giữa auth response và user response:
  - `id` hoặc `identityId` phải nhất quán, khuyến nghị trả cả `id` và `identityId` trong giai đoạn chuyển tiếp.
  - `roles` luôn là mảng string.
  - `isFirstLogin` và `isProfileCompleted` luôn có giá trị boolean.
  - `status` dùng enum rõ: `Active`, `Pending`, `Disabled`, `Deleted`.
- Login, Google login và refresh không cấp token hợp lệ cho user `Pending`, `Disabled`, `Deleted`.
- Không yêu cầu frontend lưu `phoneNumber`, `email`, `displayName`, `address` trong local storage.

### Contract đề xuất

```http
GET /api/users/me
Authorization: Bearer <access-token>
```

```json
{
  "success": true,
  "message": "OK",
  "errors": [],
  "data": {
    "id": "11111111-1111-1111-1111-111111111111",
    "identityId": "11111111-1111-1111-1111-111111111111",
    "displayName": "Nguyen Van A",
    "email": "user@example.com",
    "phoneNumber": "0912345678",
    "address": "Ha Noi",
    "gender": 1,
    "dateOfBirth": "1990-01-02",
    "status": "Active",
    "isFirstLogin": false,
    "isProfileCompleted": true,
    "roles": ["Patient"]
  }
}
```

### Error code cần có

| HTTP | Code | Khi nào |
|---:|---|---|
| 401 | `AUTH_REQUIRED` | Thiếu/invalid/expired access token |
| 403 | `ACCOUNT_PENDING` | Tài khoản chờ duyệt |
| 403 | `ACCOUNT_DISABLED` | Tài khoản bị khóa |
| 403 | `ACCOUNT_DELETED` | Tài khoản đã xóa mềm |
| 422 | `PROFILE_INCOMPLETE` | Luồng yêu cầu profile đã hoàn tất nhưng user chưa hoàn tất |

### Frontend dùng để

- Redirect Admin tới `/app/admin`, Staff/Doctor tới `/app/staff`.
- Redirect Patient chưa hoàn tất hồ sơ tới `/patient/profile/setup`.
- Render `/profile` bằng dữ liệu thật, không dùng mock hoặc local storage chứa PII.
- Tránh redirect loop sau refresh.

### Test bắt buộc

- Update số điện thoại, logout, login lại, gọi `/api/users/me` và thấy đúng `phoneNumber`.
- Login thường, Google login và refresh trả role/onboarding state giống `/users/me`.
- Pending/disabled/deleted không nhận token hợp lệ.
- `/users/me` không trả password hash, refresh token hoặc secret.

## BE-002 - Entitlement và capability server-side

**Ưu tiên:** P0
**Trạng thái:** Ready
**Phụ thuộc:** BE-001, BE-009, BE-010

### Vấn đề

Frontend hiện phải suy luận Premium từ nhiều trường như `isPremium`, `isSubscribed`, `subscriptionStatus`, `planName` hoặc role Admin/Staff. Đây không nên là business rule ở browser.

### Backend cần làm

- Tạo endpoint capability cho user hiện tại, khuyến nghị:

```http
GET /api/users/me/capabilities
```

hoặc mở rộng:

```http
GET /api/user-subscriptions/me
```

- Backend tự đọc `featureLimitJson`, subscription status, plan active, expiry, cancellation policy và usage hiện tại.
- Trả capability đã tính sẵn, không bắt frontend parse JSON plan.
- Role Admin/Staff/Doctor có policy riêng; không giả định mọi non-patient đều Premium.

### Contract đề xuất

```json
{
  "success": true,
  "data": {
    "subscriptionStatus": "Active",
    "planId": "plan-id",
    "planName": "MediMate Plus",
    "expiresAt": "2026-07-16T00:00:00Z",
    "capabilities": {
      "canAnalyzeSymptoms": true,
      "symptomAnalysisLimit": 100,
      "symptomAnalysisUsed": 7,
      "symptomAnalysisRemaining": 93,
      "canUseAiChat": true,
      "aiChatLimit": 100,
      "aiChatUsed": 3,
      "aiChatRemaining": 97
    }
  }
}
```

### Error code cần có

- `SUBSCRIPTION_NOT_FOUND`
- `SUBSCRIPTION_EXPIRED`
- `PLAN_INACTIVE`
- `ENTITLEMENT_UNAVAILABLE`

### Test bắt buộc

- User free nhận capability free.
- User active paid nhận capability premium.
- User expired/cancelled không còn premium sau thời điểm policy quy định.
- Đổi `featureLimitJson` không cần deploy frontend.

## BE-003 - Enforce quota ở server

**Ưu tiên:** P0
**Trạng thái:** Ready
**Phụ thuộc:** BE-002, BE-010

### Backend cần làm

- Enforce quota trong:
  - `POST /api/symptom-analysis/suggest-clinical-questions`
  - `POST /api/symptom-analysis/submit-clinical-question-answers`
  - `POST /api/web-chatbot/message`
- Ghi usage theo user, capability, cycle và request ID.
- Chống race condition bằng transaction/locking/idempotency để hai request đồng thời không vượt quota.
- Request lỗi do validation không tính usage.
- Request gọi provider thành công nhưng response tới frontend timeout cần có policy rõ: tính hoặc không tính, nhưng phải nhất quán và có trace.
- Không chặn emergency guidance chỉ vì hết quota; có thể trả hướng dẫn an toàn tối thiểu và không gọi AI provider.

### Error contract

```json
{
  "success": false,
  "code": "QUOTA_EXCEEDED",
  "message": "Bạn đã dùng hết lượt trong chu kỳ hiện tại.",
  "limit": 10,
  "remaining": 0,
  "resetAt": "2026-07-01T00:00:00Z",
  "traceId": "00-example"
}
```

### Test bắt buộc

- User free gọi quá hạn mức nhận `429 QUOTA_EXCEEDED`.
- Hai request đồng thời khi còn 1 lượt chỉ có 1 request được tiêu thụ quota.
- Provider lỗi không làm usage tăng sai nếu policy chọn không tính request lỗi.
- Gọi trực tiếp API ngoài frontend vẫn bị quota server chặn.

## BE-004 - Hoàn thiện kết quả phân tích triệu chứng

**Ưu tiên:** P0
**Trạng thái:** Ready
**Phụ thuộc:** BE-003, BE-006, BE-008, BE-010

### Swagger hiện có

- `POST /api/symptom-analysis/suggest-clinical-questions`
- `POST /api/symptom-analysis/submit-clinical-question-answers`
- `GET /api/symptom-analysis/{sessionId}`
- Schema liên quan: `SuggestClinicalQuestionsResponse`, `ClinicalQuestionAnswersResponse`, `SymptomAnalysisResponse`, `SymptomAnalysisAnalyzeResponse`.

### Backend cần làm

- Với mọi session hoàn tất, trả đủ:
  - `sessionId`
  - `status`: `PendingQuestions`, `Completed`, `Failed`, `NeedsMoreInformation`
  - triệu chứng đã trích xuất
  - câu trả lời clinical question
  - department recommendation có `departmentId`, `departmentName`, `confidenceScore`, `reason`, `priorityRank`, `isEmergencySuggested`
  - facility recommendation nếu có, chỉ gồm facility active có tọa độ hợp lệ
  - `model`, `modelConfigId` hoặc version config đã dùng
  - disclaimer/safety flag nếu emergency
- Chỉ trả department/facility đang active và còn quan hệ facility-department hợp lệ.
- Khi AI/provider lỗi, trả status riêng thay vì tạo kết quả giả.
- Không dùng ngôn ngữ khẳng định chẩn đoán; response nên dùng recommendation/risk/triage wording.

### Contract submit answers đề xuất

```json
{
  "success": true,
  "data": {
    "sessionId": "session-id",
    "status": "Completed",
    "severityLevel": "Medium",
    "symptoms": [
      {
        "symptomName": "Đau ngực",
        "confidenceScore": 0.91,
        "extractedText": "đau ngực nhẹ"
      }
    ],
    "recommendedDepartments": [
      {
        "departmentId": "department-id",
        "departmentName": "Tim mạch",
        "confidenceScore": 0.91,
        "reason": "Phù hợp với triệu chứng đã mô tả.",
        "priorityRank": 1,
        "isEmergencySuggested": false
      }
    ],
    "recommendedFacilities": [
      {
        "facilityId": "facility-id",
        "facilityName": "Bệnh viện A",
        "departmentId": "department-id",
        "latitude": 10.77,
        "longitude": 106.69,
        "distanceKm": 3.2
      }
    ],
    "model": "configured-model",
    "analyzedAt": "2026-06-16T08:00:00Z"
  }
}
```

### Test bắt buộc

- Không có department phù hợp trả status an toàn, không crash.
- Emergency result luôn có safety action.
- Facility inactive hoặc thiếu tọa độ không xuất hiện trong recommendation cho map.
- User A không đọc được session của user B.
- Provider timeout trả error/status ổn định và có `traceId`.

## BE-005 - Lịch sử phân tích của Patient

**Ưu tiên:** P0
**Trạng thái:** In progress
**Phụ thuộc:** BE-004, BE-010

### Swagger hiện có

`GET /api/symptom-analysis/my-sessions` nhận `PageNumber`, `PageSize` và trả `SymptomAnalysisSessionSummaryResponse` gồm `sessionId`, `inputText`, `severityLevel`, `status`, `createdAt`.

### Backend cần làm

- Giữ endpoint `GET /api/symptom-analysis/my-sessions` làm contract chính.
- Sort mặc định ổn định theo `createdAt DESC`, tie-break bằng `sessionId DESC`.
- Thêm filter khi cần: `from`, `to`, `severityLevel`, `status`.
- Không trả toàn bộ `inputText` trong list; thay bằng `inputPreview` giới hạn độ dài hoặc bỏ hẳn khỏi list.
- Detail lấy qua `GET /api/symptom-analysis/{sessionId}` và phải kiểm tra ownership.
- Có retention policy hoặc delete policy nếu Product cho phép người dùng xóa dữ liệu.

### Contract list đề xuất

```json
{
  "success": true,
  "data": {
    "pageNumber": 1,
    "pageSize": 20,
    "totalCount": 1,
    "totalPages": 1,
    "items": [
      {
        "sessionId": "session-id",
        "inputPreview": "Đau đầu và mệt...",
        "severityLevel": "Medium",
        "status": "Completed",
        "createdAt": "2026-06-16T08:00:00Z"
      }
    ]
  }
}
```

### Test bắt buộc

- `PageNumber`/`PageSize` không hợp lệ bị giới hạn hoặc trả `400`.
- User A không lấy được list/detail của user B.
- List không lộ nguyên văn nội dung triệu chứng dài.
- Sort ổn định khi nhiều session cùng `createdAt`.

## BE-006 - Facility-department CRUD và dữ liệu bản đồ

**Ưu tiên:** P0
**Trạng thái:** In progress
**Phụ thuộc:** BE-010, BE-016

### Swagger hiện có

- `GET /api/medical-facilities/active`
- CRUD/status `/api/medical-facilities`
- `GET /api/facility-departments/active`
- CRUD department và doctor.

### Tận dụng API hiện có trước

- Backend đã có CRUD/status `/api/medical-facilities`; frontend Admin dùng API này để tạo facility và gửi `facilityName`, `address`, `latitude`, `longitude`, `phone`, `website`, `openingHours`, `facilityType`, `isActive`, `departmentIds`.
- Vì vậy MVP không cần backend nhập tay toàn bộ database và cũng không cần chờ crawler/import lớn mới chạy được map.
- Quy trình thực dụng: Admin/Staff nhập hoặc copy từ nguồn đã kiểm chứng từng facility quan trọng ở miền Nam, có tọa độ lấy từ Google Maps/OpenStreetMap, sau đó backend trả lại ở `/api/medical-facilities/active`.
- Bulk import CSV/Excel là cải tiến vận hành, không phải blocker nếu CRUD hiện có lưu được tọa độ và department mapping.

### Khoảng trống còn lại

Facility-department mới có active list, chưa có management CRUD/status riêng. Frontend cần quan hệ này để tạo Doctor, invitation và lọc map theo chuyên khoa.

### Backend cần làm

- Thêm management API:

```http
GET    /api/facility-departments?PageNumber=1&PageSize=20&facilityId=&departmentId=&isActive=
POST   /api/facility-departments
PUT    /api/facility-departments/{id}
PATCH  /api/facility-departments/{id}/status
DELETE /api/facility-departments/{id}
```

- Request create/update gồm:

```json
{
  "facilityId": "facility-id",
  "departmentId": "department-id",
  "isActive": true
}
```

- Response trả đủ:

```json
{
  "id": "facility-department-id",
  "facilityId": "facility-id",
  "facilityName": "Bệnh viện A",
  "departmentId": "department-id",
  "departmentName": "Tim mạch",
  "isActive": true,
  "createdAt": "2026-06-16T08:00:00Z",
  "updatedAt": "2026-06-16T08:00:00Z"
}
```

- Seed hoặc nhập qua Admin ít nhất 5 facility active có tọa độ thật tại miền Nam Việt Nam, 5 department active và nhiều quan hệ facility-department.
- Facility dùng cho map bắt buộc có `latitude`/`longitude` hợp lệ.
- `POST /api/medical-facilities` và `PUT /api/medical-facilities/{id}` phải lưu chính xác `latitude`/`longitude` frontend gửi lên, không bỏ qua trong mapper/entity.
- `GET /api/medical-facilities` và `GET /api/medical-facilities/active` phải trả lại `latitude`/`longitude` dạng number hoặc `null`; không trả string rỗng.
- Không hard delete quan hệ đã được doctor hoặc symptom analysis tham chiếu; dùng inactive/soft delete.

### Error code cần có

- `FACILITY_NOT_FOUND`
- `DEPARTMENT_NOT_FOUND`
- `FACILITY_INACTIVE`
- `DEPARTMENT_INACTIVE`
- `FACILITY_DEPARTMENT_EXISTS`
- `FACILITY_DEPARTMENT_IN_USE`

### Test bắt buộc

- Tạo trùng facility-department trả `409`.
- Tạo bằng facility/department inactive trả `422`.
- Deactivate quan hệ đang có Doctor active trả `409`.
- `/facility-departments/active` không trả inactive relation.
- `/medical-facilities/active` không trả facility thiếu tọa độ nếu endpoint phục vụ map.
- Tạo facility từ Admin với `latitude`/`longitude`, sau đó gọi lại `/medical-facilities/active` thấy cùng tọa độ.

## BE-007 - Facility search cho bản đồ

**Ưu tiên:** P0
**Trạng thái:** Blocked by BE-006
**Phụ thuộc:** BE-006, BE-013, BE-010

### Backend cần làm

- Mở rộng public facility active list hoặc thêm endpoint search:

```http
GET /api/medical-facilities/search?keyword=&departmentId=&facilityType=&latitude=&longitude=&radiusKm=&PageNumber=1&PageSize=20&sort=distance
```

- Hỗ trợ filter:
  - `keyword`: tên facility, địa chỉ.
  - `departmentId`: chỉ facility có department active.
  - `facilityType`.
  - `latitude`, `longitude`, `radiusKm`: tìm quanh vị trí user.
  - `sort`: `distance`, `rating`, `name`.
- Response trả pagination, tọa độ, khoảng cách, department list, phone, website, openingHours, aggregate rating.
- Endpoint detail public:

```http
GET /api/medical-facilities/{id}
```

Detail chỉ trả facility active cho public; admin/staff có thể dùng endpoint management riêng nếu cần xem inactive.

### Contract search đề xuất

```json
{
  "success": true,
  "data": {
    "pageNumber": 1,
    "pageSize": 20,
    "totalCount": 1,
    "totalPages": 1,
    "items": [
      {
        "id": "facility-id",
        "facilityName": "Bệnh viện A",
        "address": "123 Nguyễn Trãi",
        "latitude": 10.77,
        "longitude": 106.69,
        "phone": "0123456789",
        "website": "https://example.com",
        "openingHours": "24/7",
        "facilityType": "Hospital",
        "distanceKm": 3.2,
        "averageRating": 4.3,
        "reviewCount": 12,
        "departments": [
          {
            "departmentId": "department-id",
            "departmentName": "Tim mạch"
          }
        ]
      }
    ]
  }
}
```

### Test bắt buộc

- Search theo department chỉ trả facility có quan hệ active.
- Sort distance đúng khi có tọa độ user.
- Facility inactive không xuất hiện public.
- Radius thiếu tọa độ trả `400 VALIDATION_FAILED`.
- Pagination không tải toàn bộ facility về frontend.

## BE-008 - Đưa toàn bộ AI call qua backend

**Ưu tiên:** P0
**Trạng thái:** Ready
**Phụ thuộc:** BE-002, BE-003, BE-010, BE-018

### Backend cần làm

- Dùng `POST /api/web-chatbot/message` và symptom-analysis endpoints làm AI gateway duy nhất.
- Provider key, model config, timeout, retry, rate limit và safety prompt nằm ở server.
- Web chatbot response cần ổn định:

```json
{
  "success": true,
  "data": {
    "answer": "Nội dung tư vấn an toàn.",
    "intent": "facility_search",
    "needsMoreInformation": false,
    "recommendedPlans": []
  }
}
```

- Không log nguyên văn message/symptom nếu không có consent và retention rõ ràng.
- Có request timeout và fallback an toàn khi provider lỗi.

### Test bắt buộc

- Production frontend không cần provider secret.
- Provider lỗi trả `AI_PROVIDER_UNAVAILABLE` hoặc `AI_TIMEOUT`.
- Quota/rate limit áp dụng cho web chatbot.
- Nội dung emergency luôn trả hướng dẫn tìm cấp cứu.

## BE-009 - Làm cứng PayOS subscription

**Ưu tiên:** P0
**Trạng thái:** In progress
**Phụ thuộc:** BE-002, BE-010

### Swagger hiện có

- `GET /api/subscription-plans/active`
- `POST /api/user-subscriptions/checkout`
- `GET /api/user-subscriptions/me`
- `POST /api/user-subscriptions/{id}/cancel`
- `GET /api/payments/payos-status/{orderCode}`
- `GET /api/payments/payos-return`
- `GET /api/payments/payos-cancel`
- `POST /api/payments/payos-webhook`

### Backend cần làm

- Checkout chỉ nhận `planId` active; giá, duration và quyền do backend lấy từ DB.
- Return/cancel URL cấu hình theo môi trường, không hard-code domain production cho local/staging.
- Webhook:
  - xác minh chữ ký PayOS;
  - idempotent theo order/payment ID;
  - chấp nhận webhook đến lặp hoặc sai thứ tự;
  - chỉ active subscription khi amount, plan, user và signature đều khớp.
- Status endpoint không được để user đoán `orderCode` và đọc trạng thái của người khác. Nếu public, dùng opaque reference khó đoán và chỉ trả tối thiểu.
- Không trả `404` trong race condition nếu backend đã tạo payment nhưng webhook chưa đến; trả `Pending`.
- Pending có TTL; hết TTL chuyển `Expired`.

### State transition bắt buộc

```text
Payment: Pending -> Paid | Cancelled | Expired | Failed
Payment: Paid -> Refunded
Subscription: Pending -> Active | Cancelled | Expired
```

Không chuyển `Cancelled`, `Expired`, `Failed` về `Paid` nếu không có quy trình reconciliation có audit.

### Test bắt buộc

- Webhook đúng/sai signature.
- Webhook lặp không tạo nhiều subscription.
- Return đến trước webhook trả Pending, sau webhook trả Paid/Active.
- Cancel trước/sau webhook trả trạng thái terminal đúng.
- User A không truy vấn được payment/subscription của user B.
- Amount hoặc plan không khớp không active subscription.

## BE-010 - Chuẩn hóa error, auth và OpenAPI

**Ưu tiên:** P0
**Trạng thái:** In progress
**Phụ thuộc:** Không

### Backend cần làm

- Giữ Bearer JWT security scheme ở cấp tài liệu.
- Endpoint public phải có `security: []`, ví dụ:
  - `POST /api/authentication/login`
  - `POST /api/authentication/register`
  - `POST /api/authentication/google`
  - `POST /api/authentication/forgot-password`
  - `GET /api/doctor-invitations/validate`
  - `POST /api/doctor-invitations/register`
  - PayOS callback/webhook nếu public.
- Endpoint authenticated phải khai báo `401`.
- Endpoint role-restricted phải khai báo `403`.
- Tất cả controller dùng chung error envelope có `code`, `message`, `fieldErrors`, `traceId`.
- Validation field trả đúng key field mà frontend đang gửi.
- Production phải là HTTPS hoặc same-origin proxy HTTPS để tránh mixed content.

### Test bắt buộc

- OpenAPI test kiểm tra endpoint public có `security: []`.
- Contract test kiểm tra endpoint authenticated có `401`.
- Role test kiểm tra Patient không gọi được Admin APIs.
- Exception nội bộ không lộ stack trace trong response.
- Validation cùng loại trả cùng `code` trên nhiều controller.

## BE-011 - Staff application lifecycle

**Ưu tiên:** P1
**Trạng thái:** Ready
**Phụ thuộc:** BE-010, BE-015

### Backend cần làm

- `POST /api/authentication/register/staff` tạo application ở `Pending`, không tự cấp quyền Staff active.
- Admin có API list/filter application:

```http
GET /api/staff-applications?status=&PageNumber=1&PageSize=20
POST /api/staff-applications/{id}/approve
POST /api/staff-applications/{id}/reject
POST /api/staff-applications/{id}/disable
```

Nếu muốn giữ endpoint hiện tại `POST /api/authentication/{userId}/approve-staff`, vẫn cần list/filter và reject/disable để vận hành đầy đủ.

- Lưu reviewer, reviewedAt, reason.
- Không dùng delete để thay reject.
- Email thông báo không lộ dữ liệu nội bộ.

### Test bắt buộc

- Staff pending không đăng nhập vào workspace vận hành.
- Admin approve chuyển user sang role/status đúng.
- Reject có reason và không tạo role Staff active.
- Non-admin không gọi được approve/reject.

## BE-012 - Doctor invitation list/resend/audit

**Ưu tiên:** P1
**Trạng thái:** Ready
**Phụ thuộc:** BE-006, BE-010, BE-015

### Swagger hiện có

- `POST /api/admin/doctor-invitations`
- `POST /api/admin/doctor-invitations/{id}/revoke`
- `GET /api/doctor-invitations/validate`
- `POST /api/doctor-invitations/register`

### Backend cần làm

- Thêm:

```http
GET  /api/admin/doctor-invitations?status=&email=&PageNumber=1&PageSize=20
POST /api/admin/doctor-invitations/{id}/resend
```

- List trả metadata, không trả token.
- Resend tạo token mới hoặc hạn dùng mới và vô hiệu token cũ.
- Register idempotent và an toàn với request đồng thời.
- Invitation cho Doctor mới chỉ nhận `facilityDepartmentId` active.
- Invitation liên kết doctor cũ phải kiểm tra doctor profile còn hợp lệ.

### Contract list đề xuất

```json
{
  "success": true,
  "data": {
    "pageNumber": 1,
    "pageSize": 20,
    "totalCount": 1,
    "totalPages": 1,
    "items": [
      {
        "id": "invitation-id",
        "email": "d***@example.com",
        "doctorId": "doctor-id",
        "doctorName": "Dr. A",
        "isLinkedToExistingDoctorProfile": true,
        "status": "Pending",
        "expiresAt": "2026-06-23T00:00:00Z",
        "createdAt": "2026-06-16T00:00:00Z",
        "createdBy": "admin-id",
        "lastResentAt": null
      }
    ]
  }
}
```

### Test bắt buộc

- Email đã có pending invitation trả `409`.
- Resend invitation expired được phép nếu policy cho phép; used/revoked phải theo rule rõ.
- Token cũ không dùng được sau resend.
- Hai request register đồng thời không tạo hai user/doctor.
- Token không xuất hiện trong list response hoặc log.

## BE-013 - Feedback review moderation

**Ưu tiên:** P1
**Trạng thái:** Ready
**Phụ thuộc:** BE-010, BE-015

### Swagger hiện có

- `GET /api/feedback-reviews`
- `GET /api/feedback-reviews/facility/{facilityId}`
- `POST /api/feedback-reviews`
- `PUT /api/feedback-reviews/{id}`
- `PATCH /api/feedback-reviews/{id}/status`
- `DELETE /api/feedback-reviews/{id}`

### Backend cần làm

- Chốt policy MVP: review mới vào `Pending` hay `Approved`. Khuyến nghị MVP: `Pending`.
- Public `GET /facility/{facilityId}` chỉ trả review `Approved`.
- Staff/Admin list được filter theo `facilityId`, `rating`, `status`.
- Status action cần reason/audit:

```json
{
  "status": "Rejected",
  "reason": "Nội dung không phù hợp"
}
```

- Facility detail/search trả `averageRating`, `reviewCount` từ review approved.

### Test bắt buộc

- Review mới không xuất hiện public nếu policy pending.
- Patient chỉ sửa/xóa review của chính mình nếu Product cho phép.
- Staff ngoài scope facility không moderate review của facility khác khi BE-014 áp dụng.
- Aggregate rating chỉ tính approved review.

## BE-014 - Authorization theo resource scope

**Ưu tiên:** P1
**Trạng thái:** Ready
**Phụ thuộc:** BE-006, BE-010

### Backend cần làm

- Chốt scope vận hành cho Staff: theo facility, department hoặc facility-department.
- Thêm model/API assign scope:

```http
GET  /api/staff-scopes?userId=
POST /api/staff-scopes
DELETE /api/staff-scopes/{id}
```

- Áp dụng authorization theo resource cho:
  - facility-departments
  - doctors
  - feedback moderation
  - facility management
  - department management nếu bị giới hạn
- Admin có toàn quyền vận hành, Staff chỉ theo scope được giao.
- MVP không cấp quyền Staff/Doctor đọc dữ liệu sức khỏe Patient nếu chưa có consent và policy.

### Test bắt buộc

- Staff facility A không sửa doctor/facility/review của facility B.
- Admin assign/revoke scope có hiệu lực ngay sau refresh token hoặc request kế tiếp.
- API không chỉ dựa vào frontend menu để ẩn chức năng.

## BE-015 - Audit log cho thao tác quản trị

**Ưu tiên:** P1
**Trạng thái:** Ready
**Phụ thuộc:** BE-010

### Backend cần làm

- Ghi audit cho:
  - role/status user;
  - Staff approval/reject;
  - Doctor invitation create/resend/revoke/register;
  - facility/department/facility-department/doctor changes;
  - feedback moderation;
  - AI config changes;
  - subscription plan changes;
  - payment reconciliation manual nếu có.
- Audit record tối thiểu:

```json
{
  "id": "audit-id",
  "actorUserId": "admin-id",
  "action": "DOCTOR_INVITATION_REVOKED",
  "resourceType": "DoctorInvitation",
  "resourceId": "invitation-id",
  "before": {},
  "after": {},
  "reason": "Optional reason",
  "createdAt": "2026-06-16T08:00:00Z",
  "traceId": "00-example"
}
```

- Mask/redact email, phone, tokens, payload y tế và payment secret.
- API read-only cho Admin:

```http
GET /api/audit-logs?action=&resourceType=&resourceId=&actorUserId=&from=&to=&PageNumber=1&PageSize=20
```

### Test bắt buộc

- Mỗi thao tác quản trị quan trọng tạo audit record.
- Audit không chứa invitation token, password, refresh token, provider key.
- Non-admin không đọc được audit.

## BE-016 - Validation và conflict cho danh mục y tế

**Ưu tiên:** P1
**Trạng thái:** Ready
**Phụ thuộc:** BE-006, BE-010

### Backend cần làm

- Kiểm tra trùng:
  - department name/chapter code theo rule Product.
  - facility name + address.
  - facility-department.
  - doctor assignment/userId.
- Dùng optimistic concurrency bằng `rowVersion` hoặc `updatedAt`.
- Trả `409` khi:
  - dữ liệu đã thay đổi từ lúc frontend mở form;
  - resource đang được tham chiếu;
  - unique constraint bị vi phạm.
- Dữ liệu đã tham chiếu chỉ inactive/soft delete, không hard delete.

### Test bắt buộc

- Hai admin update cùng một record, request thứ hai nhận conflict.
- Delete department đang được facility-department dùng nhận `409`.
- Create duplicate trả code cụ thể, không trả lỗi DB thô.

## BE-017 - Analytics bảo vệ PHI/PII

**Ưu tiên:** P2
**Trạng thái:** Blocked by Product/privacy decision
**Phụ thuộc:** Policy privacy, BE-010

### Backend cần làm sau khi Product chốt

- Chỉ nhận event allowlist:
  - `analysis_started`
  - `analysis_completed`
  - `facility_opened`
  - `directions_opened`
  - `checkout_started`
  - `payment_completed`
- Không nhận raw symptom, chat message, diagnosis text, profile fields, token, provider response.
- Có retention, access control và opt-out nếu policy yêu cầu.

### Test bắt buộc

- Event chứa field không allowlist bị loại hoặc redact.
- Analytics endpoint rate limit.
- Log analytics không chứa PHI/PII.

## BE-018 - Health check và observability

**Ưu tiên:** P2
**Trạng thái:** Ready
**Phụ thuộc:** BE-010

### Backend cần làm

- Thêm:

```http
GET /health
GET /ready
```

- `/health` kiểm tra service alive.
- `/ready` kiểm tra database, cache nếu có, email provider, AI provider config và PayOS config ở mức không lộ secret.
- Gắn `traceId` vào error response và log nội bộ.
- Theo dõi latency/error rate theo endpoint, không log body nhạy cảm.
- Có dashboard hoặc log query tối thiểu cho:
  - auth error;
  - AI timeout;
  - PayOS webhook fail;
  - database fail;
  - email delivery fail.

### Test bắt buộc

- DB down làm `/ready` fail nhưng `/health` vẫn có thể alive.
- Error response có `traceId`.
- Log không chứa request body symptom/chat/payment.

## Nhóm chưa triển khai backend trong MVP

Không tạo API production cho các nhóm dưới đây trước khi Product Owner xác nhận phạm vi, consent, data model, authorization, retention và clinical owner.

| Nhóm | Backend cần có nếu được duyệt | Chức năng web tương lai |
|---|---|---|
| Medical records | Record/file metadata, object storage, encryption, ownership, retention, audit | `/records` lưu hồ sơ, xét nghiệm, tài liệu thật |
| Medication | Drug source, image processing, interaction engine, provenance, safety review | `/medication` nhận diện/kiểm tra thuốc thật |
| Appointment | Availability, booking, cancellation, notification, facility integration | Đặt lịch từ facility/doctor |
| Treatment tracking | Care plan, reminder, adherence, clinician consent, sharing policy | Theo dõi điều trị/phục hồi |

## Ma trận frontend phụ thuộc backend

| Chức năng web | Route/khu vực | Backend bắt buộc | Nghiệm thu |
|---|---|---|---|
| Đăng nhập và workspace đúng role | Login, Google login | BE-001, BE-010 | Không redirect loop, không vào nhầm role |
| Hồ sơ Patient | `/patient/profile/setup`, `/profile` | BE-001 | Phone/profile tải lại từ backend |
| Premium/free gate | Patient nav, `/pricing` | BE-002, BE-003 | Hiển thị quyền và lượt còn lại từ server |
| Phân tích triệu chứng | `/dashboard`, `/symptom` | BE-003, BE-004, BE-008 | Có urgency, department, safety state |
| Lịch sử phân tích | Dashboard/history | BE-005 | Mở lại session thật, không lộ raw symptom ở list |
| Bản đồ cơ sở y tế | `/map` | BE-006, BE-007 | Search/filter/sort theo tọa độ và chuyên khoa |
| Chi tiết cơ sở | Map detail panel | BE-007, BE-013 | Có department, doctor, giờ mở cửa, rating |
| Chat AI | Landing/chat assistant | BE-002, BE-003, BE-008 | Chat qua backend, không lộ provider key |
| Thanh toán Premium | `/pricing`, payment result | BE-002, BE-009 | Payment verified, entitlement refresh đúng |
| Duyệt Staff | `/app/admin` | BE-011, BE-015 | Có queue, approve/reject/audit |
| Mời Doctor | `/app/admin`, `/register-doctor` | BE-006, BE-012, BE-015 | List/resend/revoke/register an toàn |
| Danh mục y tế | `/app/staff`, `/app/admin` | BE-006, BE-014, BE-016 | Staff chỉ sửa trong scope, conflict rõ |
| Review facility | `/map`, workspace | BE-013, BE-015 | Public chỉ thấy approved review |
| Theo dõi lỗi production | Toàn bộ web | BE-010, BE-018 | Có code/traceId/retry hợp lý |

## Thứ tự triển khai đề xuất

1. BE-010 và BE-001: ổn định auth, hồ sơ, error và Swagger.
2. BE-002, BE-003, BE-009: entitlement, quota và PayOS.
3. BE-006, BE-007: dữ liệu cơ sở, quan hệ khoa, tọa độ và search map.
4. BE-004, BE-005, BE-008: symptom journey và AI gateway.
5. BE-011 đến BE-016: vận hành Staff/Admin, invitation, review, scope, audit, conflict.
6. BE-018: health/observability trước production.
7. BE-017: chỉ bắt đầu sau quyết định privacy/product.

## Checklist bàn giao backend cho frontend

Backend owner cần điền checklist này trong PR hoặc ticket trước khi yêu cầu FE tích hợp:

- [ ] Link Swagger của môi trường tích hợp
- [ ] Endpoint và method cuối cùng
- [ ] Request example không chứa dữ liệu thật
- [ ] Success response example
- [ ] Error response example với `code`, `fieldErrors`, `traceId`
- [ ] HTTP status cho validation/auth/authorization/conflict/quota
- [ ] Authorization policy và role/scope được phép
- [ ] Migration và seed data đã chạy
- [ ] Unit test và integration test đã pass
- [ ] Log/audit đã kiểm tra không chứa PII, PHI, token hoặc secret
- [ ] Frontend owner đã xác nhận contract trên backend deploy
