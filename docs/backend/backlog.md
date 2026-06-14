# Backlog backend để hoàn thiện chức năng web

Tài liệu này là backlog giao việc cho backend. Mỗi ticket mô tả vấn đề, contract cần cung cấp, phụ thuộc, kiểm thử và bằng chứng nghiệm thu để frontend không phải suy đoán business rule.

Nguồn đối chiếu:

- Product definition và route/service frontend hiện tại.
- Swagger deploy `http://52.77.210.243:8080/swagger/v1/swagger.json`.
- Kiểm tra live ngày 2026-06-14.

## Cách đọc và cập nhật backlog

Mỗi ticket dùng các trường sau:

- **Trạng thái**: `Blocked`, `Ready`, `In progress`, `Ready for FE`, `Done`
- **Phụ thuộc**: ticket hoặc dữ liệu phải hoàn thành trước
- **Contract đầu ra**: endpoint, request, response và error code frontend được phép dựa vào
- **Kiểm thử bắt buộc**: test backend phải chạy trước khi giao frontend
- **Bằng chứng hoàn thành**: Swagger, test result và dữ liệu staging dùng để nghiệm thu

Các trạng thái trong bảng là đánh giá kỹ thuật đề xuất từ contract ngày 2026-06-14, chưa thay thế trạng thái trên công cụ quản lý công việc. `Ready for FE` chỉ được dùng khi contract đã deploy lên môi trường tích hợp. `Done` yêu cầu frontend đã nghiệm thu luồng liên quan hoặc xác nhận không cần thay đổi frontend.

Tài liệu dùng PII cho thông tin nhận dạng cá nhân và PHI cho thông tin sức khỏe được bảo vệ.

## Trạng thái backend đã xác minh

Swagger và dữ liệu deploy được kiểm tra lại ngày **2026-06-14**:

- Auth, user, patient profile, symptom analysis, web chatbot, directory y tế,
  feedback review, subscription, PayOS, AI config và doctor invitation đã có API.
- `/api/medical-facilities/active` và `/api/facility-departments/active` đã có một quan hệ facility-department dùng được cho luồng invitation.
- `/api/subscription-plans/active` đã có gói active.
- `/api/symptom-analysis/my-sessions` đã có pagination theo current user.
- OpenAPI đã khai báo Bearer security scheme ở cấp tài liệu.
- Doctor invitation chưa có API list/resend.
- `ApplicationUserResponse` chưa trả `phoneNumber` dù `UpdateUserRequest` nhận trường này.
- Facility hiện có dữ liệu nhưng chưa có tọa độ, nên chưa đủ điều kiện nghiệm thu tìm kiếm theo khoảng cách.
- Records, medication, appointment và treatment tracking chưa có API production.

## Bảng ưu tiên giao việc

| Ticket | Kết quả cần đạt | Trạng thái | Phụ thuộc | Frontend bị chặn |
|---|---|---|---|---|
| BE-001 | Phiên đăng nhập và hồ sơ nhất quán | Ready | Không | Tải lại số điện thoại và trạng thái onboarding |
| BE-002 | Capability và entitlement do server quyết định | Ready | BE-001 | Premium gate và số lượt còn lại |
| BE-003 | Quota được enforce ở server | Ready | BE-002 | Chặn usage vượt hạn mức |
| BE-004 | Kết quả phân tích có contract ổn định | Ready | BE-006, BE-010 | Recommendation và trạng thái lỗi |
| BE-005 | Lịch sử phân tích an toàn và đủ dữ liệu | In progress | BE-004 | Trang lịch sử thật |
| BE-006 | Facility-department có CRUD và dữ liệu hợp lệ | In progress | BE-010 | Quản trị quan hệ khoa, map |
| BE-007 | Tìm kiếm facility theo vị trí/chuyên khoa | Blocked | BE-006 | Map search và sort khoảng cách |
| BE-008 | Mọi AI call đi qua backend | Ready | BE-002, BE-003 | Loại provider key khỏi frontend |
| BE-009 | PayOS xác minh giao dịch và trạng thái nhất quán | In progress | BE-002, BE-010 | Entitlement sau thanh toán |
| BE-010 | Error contract và OpenAPI đầy đủ | In progress | Không | Xử lý lỗi theo field/code |
| BE-011 | Vòng đời Staff application đầy đủ | Ready | BE-010, BE-015 | Queue duyệt Staff |
| BE-012 | Doctor invitation có list/resend/audit | Ready | BE-006, BE-010, BE-015 | Quản lý invitation sau reload |
| BE-013 | Review có policy moderation rõ | Ready | BE-010, BE-015 | Queue duyệt và rating public |
| BE-014 | Authorization theo resource scope | Ready | BE-006 | Giới hạn dữ liệu Staff |
| BE-015 | Audit log cho thao tác quản trị | Ready | BE-010 | Truy vết thay đổi |
| BE-016 | Validation và conflict cho directory | Ready | BE-006, BE-010 | Xử lý ghi đè và dữ liệu trùng |
| BE-017 | Analytics không thu thập PHI/PII | Blocked | Product/privacy decision | Product funnel an toàn |
| BE-018 | Health check và observability | Ready | BE-010 | Phân loại lỗi production |

## Definition of Ready

Một ticket có thể vào sprint khi đáp ứng đủ:

- Product Owner đã chốt business rule còn mở
- Backend owner đã xác định entity, migration và policy authorization
- Request, response, status code và error code đã được đề xuất
- Dữ liệu test không chứa thông tin sức khỏe hoặc thông tin nhận dạng thật
- Frontend owner đã xác nhận contract đủ để tích hợp

## Definition of Done

Một ticket chỉ được đóng khi đáp ứng đủ:

- Unit test và integration test cho happy path, validation, authorization và conflict đã pass
- Migration và seed data chạy được trên môi trường staging
- Swagger mô tả request, response, error và yêu cầu Bearer token
- Log không chứa token, số điện thoại, email, nội dung triệu chứng hoặc payload thanh toán nhạy cảm
- Backend đã cung cấp ví dụ request/response đã ẩn dữ liệu nhạy cảm
- Frontend đã nghiệm thu bằng contract deploy, không chỉ bằng mock

## P0: Bắt buộc cho luồng MVP

### BE-001 - Chuẩn hóa trạng thái phiên đăng nhập

**Trạng thái:** Ready

**Phụ thuộc:** Không

**Vấn đề đã xác minh**

- `PUT /api/users/{id}` nhận `phoneNumber`.
- `GET /api/users/me` trả `ApplicationUserResponse` nhưng chưa có `phoneNumber`.
- Frontend không lưu số điện thoại trong auth storage vì đây là thông tin nhận dạng cá nhân.
- Sau khi đăng nhập lại, frontend không có nguồn an toàn để tải số điện thoại đã lưu.

**Backend cần làm**

- Dùng `GET /api/users/me` làm nguồn hồ sơ hiện tại sau login và refresh.
- Bổ sung `phoneNumber` vào `ApplicationUserResponse`.
- Chuẩn hóa tên trường giữa auth và user response: `id`, `roles`, `status`,
  `isFirstLogin`, `isProfileCompleted`.
- Không yêu cầu frontend lưu `phoneNumber`, email, tên hoặc địa chỉ trong local storage.
- Trả mã lỗi riêng cho pending, disabled, deleted, invalid credential và token hết hạn.
- Không trả token hoặc thông tin nhạy cảm trong message/log.

**Contract đầu ra**

```json
{
  "data": {
    "id": "11111111-1111-1111-1111-111111111111",
    "displayName": "Nguyen Van A",
    "email": "user@example.com",
    "phoneNumber": "0912345678",
    "status": "Active",
    "isFirstLogin": false,
    "isProfileCompleted": true,
    "roles": ["Patient"]
  },
  "success": true,
  "message": "OK",
  "errors": []
}
```

Login và refresh có thể trả token, nhưng phải trả cùng giá trị role/onboarding với `/api/users/me`. Nếu backend không muốn trả hồ sơ trong auth response, frontend sẽ gọi `/api/users/me` ngay sau khi xác thực.

**Web dùng để**

- Đưa Admin tới `/app/admin`, Staff/Doctor tới `/app/staff`.
- Đưa Patient chưa hoàn tất hồ sơ tới `/patient/profile/setup`.
- Hiển thị đúng thông báo khi tài khoản chờ duyệt hoặc bị khóa.
- Tránh redirect loop sau login/refresh.

**Hoàn thành khi**

- Cùng một tài khoản có trạng thái giống nhau ở login, refresh và `/users/me`.
- Backend từ chối tài khoản không active ngay cả khi frontend route guard bị bỏ qua.
- Patient đã nhập số điện thoại thấy lại đúng dữ liệu sau logout và login.
- Doctor/Staff không bị chuyển vào onboarding Patient.

**Kiểm thử bắt buộc**

- Cập nhật số điện thoại, logout, login và gọi `/api/users/me`
- Login thường, Google login và refresh trả cùng role/onboarding state
- Pending, disabled và deleted account không nhận access token hợp lệ
- Response và log không chứa password hoặc refresh token ngoài endpoint auth cần thiết

### BE-002 - Trả capability và entitlement đã chuẩn hóa

**Backend cần làm**

- Tạo response entitlement cho user hiện tại, có thể mở rộng
  `/api/user-subscriptions/me` hoặc thêm `/api/users/me/capabilities`.
- Trả các capability đã tính sẵn, ví dụ:
  `canAnalyzeSymptoms`, `symptomAnalysisRemaining`, `canUseAiChat`,
  `aiChatRemaining`, `subscriptionStatus`, `expiresAt`.
- Backend tự đọc `featureLimitJson`; frontend không tự parse và quyết định quyền.
- Admin/Staff có policy riêng, không giả định mọi role đều là Premium.

**Web dùng để**

- Hiển thị đúng tính năng Free/Premium.
- Hiển thị số lượt còn lại và CTA nâng cấp.
- Refresh quyền ngay sau thanh toán hoặc hủy subscription.

**Hoàn thành khi**

- Frontend chỉ cần đọc capability, không lặp lại business rule về plan.
- Thay đổi cấu hình gói không yêu cầu deploy lại frontend.

### BE-003 - Enforce quota ở server

**Backend cần làm**

- Kiểm tra entitlement và quota trong symptom analysis và web chatbot.
- Ghi nhận usage theo user, capability và chu kỳ.
- Xử lý request đồng thời để không vượt quota.
- Trả lỗi ổn định như `QUOTA_EXCEEDED`, kèm `limit`, `remaining`,
  `resetAt` nhưng không lộ nội dung y tế.
- Không chặn emergency guidance vì hết quota.

**Web dùng để**

- Ngăn người dùng gọi API vượt hạn mức.
- Hiển thị khi nào hạn mức được làm mới và điều hướng tới pricing.
- Không dựa vào premium gate phía trình duyệt để bảo vệ chi phí AI.

**Hoàn thành khi**

- Gọi API trực tiếp ngoài frontend vẫn bị kiểm tra quota.
- Request lỗi hoặc timeout không bị tính usage sai.

### BE-004 - Hoàn thiện kết quả phân tích triệu chứng

**Backend cần làm**

- Giữ contract hiện có nhưng bảo đảm mọi kết quả trả:
  `sessionId`, `severityLevel`, trạng thái, danh sách triệu chứng,
  department/facility ID, confidence, reason, priority và emergency flag.
- Chỉ gợi ý department/facility đang active.
- Trả trạng thái riêng khi AI lỗi, dữ liệu không đủ hoặc không tìm thấy cơ sở.
- Lưu model/config version, thời điểm phân tích và audit kỹ thuật phía server.
- Không mô tả kết quả như chẩn đoán xác định.

**Web dùng để**

- Render urgency, lý do gợi ý và disclaimer trên `/symptom`.
- Chuyển đúng `departmentId`/`facilityId` sang `/map`.
- Hiển thị retry/fallback mà không tạo kết quả giả.

**Hoàn thành khi**

- Mọi ID trong kết quả có thể truy vấn được từ API directory.
- Emergency result luôn có hành động an toàn dù không có facility phù hợp.

### BE-005 - API lịch sử phân tích của Patient

**Trạng thái:** In progress

**Phụ thuộc:** BE-004, BE-010

**Phần đã có**

`GET /api/symptom-analysis/my-sessions` hiện nhận `PageNumber` và `PageSize`, sau đó trả `sessionId`, `inputText`, `severityLevel`, `status` và `createdAt`.

**Backend cần làm**

- Giữ endpoint `GET /api/symptom-analysis/my-sessions` làm contract chính.
- Thêm sort ổn định theo `createdAt` và `sessionId`.
- Thêm filter `from`, `to`, `severityLevel` và `status` khi frontend cần.
- Thay `inputText` đầy đủ bằng `inputPreview` đã giới hạn độ dài, hoặc bỏ khỏi list response.
- Chỉ trả summary tối thiểu; lấy chi tiết bằng session ID.
- Kiểm tra ownership ở get-by-session.
- Cân nhắc `DELETE` hoặc retention policy nếu Patient được quyền xóa dữ liệu.

**Contract đầu ra đề xuất**

```json
{
  "pageNumber": 1,
  "pageSize": 20,
  "totalCount": 1,
  "totalPages": 1,
  "items": [
    {
      "sessionId": "22222222-2222-2222-2222-222222222222",
      "inputPreview": "Đau đầu và mệt…",
      "severityLevel": "Medium",
      "status": "Completed",
      "createdAt": "2026-06-14T08:00:00Z"
    }
  ]
}
```

**Web dùng để**

- Hiển thị “Phiên gần đây” và “Tiếp tục xem kết quả”.
- Thay link `/records` giả bằng lịch sử phân tích thật.
- Cho Patient quay lại một kết quả cũ mà không nhập lại triệu chứng.

**Hoàn thành khi**

- User A không thể lấy session của user B bằng cách thay ID.
- Pagination không trả toàn bộ nội dung triệu chứng trong danh sách.
- Hai request liên tiếp cùng page/sort không làm trùng hoặc bỏ sót session.
- Session đã xóa hoặc hết retention không còn truy cập được bằng ID.

**Kiểm thử bắt buộc**

- Pagination với `PageNumber` và `PageSize` không hợp lệ
- Ownership của list và get-by-session
- Sort ổn định khi nhiều session có cùng `createdAt`
- Response list không lộ toàn bộ nội dung triệu chứng

### BE-006 - Hoàn thiện dữ liệu cơ sở và khoa tại cơ sở

**Trạng thái:** In progress

**Phụ thuộc:** BE-010, BE-016

**Phần đã có**

Deploy hiện có một facility và một facility-department hợp lệ. `GET /api/facility-departments/active` đã trả `id`, `facilityId`, `facilityName`, `departmentId` và `departmentName`.

**Backend cần làm**

- Bổ sung dữ liệu staging đủ để kiểm thử nhiều cơ sở và nhiều khoa.
- Bổ sung CRUD/status cho facility department, không chỉ endpoint `/active`.
- Bổ sung `latitude` và `longitude` hợp lệ cho facility dùng trên bản đồ.
- Kiểm tra quan hệ facility, department và doctor trước khi activate.
- Ngăn xóa cứng dữ liệu đang được doctor hoặc analysis tham chiếu.

**Contract quản trị đề xuất**

```http
GET    /api/facility-departments
POST   /api/facility-departments
PUT    /api/facility-departments/{id}
PATCH  /api/facility-departments/{id}/status
DELETE /api/facility-departments/{id}
```

Create/update nhận `facilityId`, `departmentId` và các thuộc tính vận hành nếu có. Backend trả `409 FACILITY_DEPARTMENT_EXISTS` khi quan hệ đã tồn tại.

**Web dùng để**

- Hiển thị cơ sở thật trên `/map`.
- Cho Admin/Staff gán chuyên khoa vào cơ sở.
- Cung cấp `facilityDepartmentId` hợp lệ khi tạo doctor hoặc đăng ký bằng invitation.
- Cho symptom analysis trả cơ sở phù hợp có tọa độ và quan hệ khoa hợp lệ.

**Hoàn thành khi**

- `/medical-facilities/active` và `/facility-departments/active` có dữ liệu liên kết hợp lệ.
- Mỗi facility department trả đủ `id`, `facilityId`, `departmentId` và tên hiển thị.
- Facility dùng trên map có tọa độ nằm trong phạm vi hợp lệ.
- Không thể deactivate quan hệ đang được Doctor active sử dụng nếu chưa xử lý dependency.

**Kiểm thử bắt buộc**

- Tạo quan hệ trùng facility-department
- Dùng facility hoặc department không tồn tại/inactive
- Deactivate quan hệ đang có Doctor active
- Public active list không trả quan hệ inactive

### BE-007 - API tìm kiếm cơ sở phục vụ bản đồ

**Backend cần làm**

- Bổ sung query cho active facilities: keyword, department ID, facility type,
  latitude, longitude, radius, pagination và sort theo khoảng cách.
- Trả tổng số kết quả và dữ liệu tọa độ hợp lệ.
- Có endpoint chi tiết public cho một cơ sở active, gồm department, doctor,
  giờ mở cửa, liên hệ và tổng hợp review.

**Web dùng để**

- Tìm cơ sở theo chuyên khoa từ kết quả symptom analysis.
- Lọc danh sách và bản đồ mà không tải toàn bộ dữ liệu về trình duyệt.
- Hiển thị trang/khung chi tiết cơ sở, gọi điện và chỉ đường.

**Hoàn thành khi**

- List và map nhận cùng tập kết quả với cùng filter.
- Cơ sở inactive không xuất hiện ở API public.

### BE-008 - Đưa toàn bộ AI call qua backend

**Backend cần làm**

- Dùng `/api/web-chatbot/message` hoặc endpoint chuyên biệt làm AI gateway.
- Quản lý provider key, timeout, retry, rate limit và model config ở server.
- Trả response có `answer`, `intent`, `needsMoreInformation` và request ID an toàn.
- Lọc log để không ghi nguyên văn triệu chứng/nội dung hội thoại nếu không cần thiết.

**Web dùng để**

- Loại bỏ việc `/chat` gọi Anthropic trực tiếp bằng `VITE_ANTHROPIC_KEY`.
- Dùng chung policy AI, quota, error handling và cấu hình model.

**Hoàn thành khi**

- Production bundle không cần khóa bí mật của AI provider.
- Provider lỗi được chuyển thành error code an toàn để frontend retry.

### BE-009 - Làm cứng thanh toán PayOS

**Trạng thái:** In progress

**Phụ thuộc:** BE-002, BE-010

**Phần đã có**

- Checkout trả `subscriptionId`, `paymentId`, `transactionId`, `paymentUrl` và `paymentProvider`.
- Status theo `orderCode` trả `paymentStatus`, `subscriptionStatus`, `isPaid`, `isActive`, `isCancelled` và `message`.
- Frontend `/payment/cancel` hiện kết thúc ngay ở trạng thái đã hủy, không poll kéo dài.

**Backend cần làm**

- Cấu hình return/cancel URL theo môi trường.
- Xác minh chữ ký webhook và xử lý idempotent theo order/payment ID.
- Chỉ activate subscription sau khi backend xác minh thanh toán.
- Bảo vệ endpoint payment status bằng ownership hoặc opaque reference khó đoán.
- Trả trạng thái pending/paid/cancelled/expired/failed nhất quán.
- Ghi rõ `orderCode` là số nguyên 64-bit trong checkout response hoặc cung cấp một status reference riêng.
- Không trả `404` trong khoảng chờ webhook nếu payment/order đã được backend tạo.
- Giới hạn thời gian pending và chuyển giao dịch hết hạn sang trạng thái terminal.

**State transition bắt buộc**

```text
Pending -> Paid
Pending -> Cancelled
Pending -> Expired
Pending -> Failed
Paid -> Refunded
```

Không chuyển `Cancelled`, `Expired` hoặc `Failed` trở lại `Paid` nếu không có quy trình reconciliation được audit.

**Web dùng để**

- Render `/payment/return` và `/payment/cancel`.
- Poll trạng thái thật, refresh entitlement và quay về tính năng ban đầu.
- Không hiển thị thanh toán thành công chỉ vì URL có query parameter.

**Hoàn thành khi**

- Gửi webhook lặp không tạo nhiều subscription.
- User không xem được payment/subscription của user khác.
- Cancel callback trả trạng thái terminal trong một request, không yêu cầu frontend chờ hai phút.
- Return callback có thể trả `Pending` trong race condition với webhook.
- Subscription chỉ active khi amount, plan, user và chữ ký PayOS đều khớp.

**Kiểm thử bắt buộc**

- Webhook đúng/sai signature
- Webhook lặp và webhook đến sai thứ tự
- Return đến trước webhook
- Cancel trước và sau webhook
- User A truy vấn order của user B
- Amount hoặc plan không khớp payment đã tạo

### BE-010 - Chuẩn hóa error, auth và OpenAPI

**Trạng thái:** In progress

**Phụ thuộc:** Không

**Phần đã có**

OpenAPI hiện khai báo Bearer JWT ở cấp tài liệu. Công việc còn lại là mô tả override cho endpoint public, response lỗi và authorization theo từng operation.

**Backend cần làm**

- Giữ Bearer security scheme ở cấp tài liệu.
- Khai báo `security: []` cho endpoint public như validate/register invitation và callback PayOS nếu chúng thực sự public.
- Khai báo response `401` và `403` cho endpoint cần đăng nhập hoặc role.
- Chuẩn hóa envelope lỗi với `code`, `message`, `fieldErrors`, `traceId`.
- Dùng đúng `400`, `401`, `403`, `404`, `409`, `422`, `429`.
- Cung cấp HTTPS production hoặc đặt backend sau gateway/proxy HTTPS.

**Error contract đề xuất**

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

`message` phải an toàn để hiển thị. `traceId` dùng để đối chiếu log nội bộ và không chứa dữ liệu người dùng.

**Web dùng để**

- Phân biệt chưa đăng nhập, không đủ quyền, validation, conflict và hết quota.
- Đưa lỗi form tới đúng field và cung cấp retry phù hợp.
- Tích hợp API mà không phải suy đoán endpoint nào cần token.

**Hoàn thành khi**

- Swagger mô tả auth, request, response và error cho mọi endpoint.
- Không yêu cầu browser gọi HTTP từ trang HTTPS.
- Client có thể xác định endpoint public/authenticated từ OpenAPI mà không đọc source backend.
- Validation cùng loại trả cùng `code` và `fieldErrors` trên các controller.

**Kiểm thử bắt buộc**

- Contract test kiểm tra endpoint authenticated có `401` và role-restricted có `403`
- OpenAPI test kiểm tra endpoint public có security override rõ
- Validation test cho field, conflict, quota và resource không tồn tại
- Security test xác nhận exception nội bộ không xuất hiện trong `message`

## P1 - Vận hành và độ tin cậy

### BE-011 - Hoàn thiện vòng đời Staff application

**Backend cần làm**

- Thêm trạng thái `Pending`, `Approved`, `Rejected`, `Disabled`.
- Cho Admin list/filter ứng viên, xem dữ liệu cần xác minh, approve hoặc reject.
- Lưu người xử lý, thời gian và lý do; không dùng delete để thay cho reject.
- Gửi email thông báo kết quả mà không lộ dữ liệu nội bộ.

**Web dùng để**

- Tạo hàng đợi duyệt Staff trong Admin workspace.
- Hiển thị trạng thái rõ cho ứng viên khi đăng nhập.

### BE-012 - Hoàn thiện Doctor invitation

**Trạng thái:** Ready

**Phụ thuộc:** BE-006, BE-010, BE-015

**Phần đã có**

- Create nhận `email` và `doctorId` tùy chọn.
- Validate trả email, hạn dùng, doctor linkage và `suggestedFullName`.
- Register nhận `token`, `fullName`, `password`, `phoneNumber` và thông tin chuyên môn khi tạo Doctor mới.
- Revoke đã có endpoint riêng.

**Backend cần làm**

- Thêm `GET /api/admin/doctor-invitations` có filter trạng thái và pagination.
- Thêm resend invitation với token mới hoặc thời hạn mới.
- Giữ revoke, validate và register idempotent/an toàn.
- Ràng buộc invitation với doctor profile và facility department hợp lệ.
- Không trả token invitation trong list/log/analytics.

**Contract list/resend đề xuất**

```http
GET  /api/admin/doctor-invitations?status=Pending&pageNumber=1&pageSize=20
POST /api/admin/doctor-invitations/{id}/resend
```

List trả `id`, email đã mask khi phù hợp, doctor linkage, status, `expiresAt`, `createdAt`, `createdBy` và thời điểm resend gần nhất. Resend phải vô hiệu token cũ.

**Web dùng để**

- Admin xem lời mời pending, used, expired, revoked.
- Resend hoặc revoke sau khi reload trang, không phụ thuộc state tạm ở frontend.
- Doctor nhận đúng cơ sở/khoa khi kích hoạt tài khoản.

**Hoàn thành khi**

- Admin có thể list, filter, resend và revoke sau khi reload.
- Token cũ không dùng được sau resend.
- Hai request register đồng thời không tạo hai user hoặc hai Doctor profile.
- Invitation cho Doctor mới chỉ chấp nhận `facilityDepartmentId` active.

**Kiểm thử bắt buộc**

- Email trùng invitation pending
- Resend invitation expired, used và revoked
- Register lặp hoặc đồng thời
- Non-Admin gọi list/resend/revoke
- Invitation token không xuất hiện trong list response và application log

### BE-013 - Kiểm duyệt feedback review

**Backend cần làm**

- Cho review mới vào `Pending` theo policy MVP.
- Thêm list/filter cho Staff/Admin theo facility, rating và status.
- Cho approve/reject/hide với lý do và audit.
- API public chỉ trả review được duyệt.
- Trả aggregate `averageRating`, `reviewCount` theo facility.

**Web dùng để**

- Patient gửi review và thấy trạng thái chờ duyệt.
- Staff/Admin có queue kiểm duyệt.
- Trang cơ sở hiển thị điểm trung bình đáng tin cậy.

### BE-014 - Phân quyền dữ liệu y tế theo phạm vi

**Backend cần làm**

- Chốt policy Staff được quản lý department/facility/doctor nào.
- Áp dụng authorization theo resource, không chỉ kiểm tra role chung.
- Admin có thể assign/revoke scope cho Staff.
- Không cấp quyền đọc dữ liệu sức khỏe Patient cho Staff/Doctor trong MVP.

**Web dùng để**

- Chỉ hiện các menu và bản ghi Staff được phép vận hành.
- Tránh Staff sửa dữ liệu ngoài cơ sở/phạm vi được giao.

### BE-015 - Audit log cho thao tác quản trị

**Backend cần làm**

- Ghi audit cho thay đổi role/status, Staff approval, invitation, directory,
  review moderation, AI config và subscription plan.
- Lưu actor ID, action, resource, timestamp và thay đổi tối thiểu cần thiết.
- Không lưu password, token, nội dung triệu chứng hoặc dữ liệu y tế dư thừa.
- Cung cấp API audit read-only cho Admin với filter và pagination.

**Web dùng để**

- Admin truy vết ai đã thay đổi dữ liệu hoặc quyền.
- Hỗ trợ điều tra lỗi vận hành mà không phải xem log server thô.

### BE-016 - Validation và conflict cho danh mục y tế

**Backend cần làm**

- Kiểm tra trùng department, facility, facility-department và doctor assignment.
- Dùng optimistic concurrency/version hoặc `updatedAt` khi cập nhật.
- Trả `409` khi dữ liệu đã thay đổi hoặc quan hệ đang được sử dụng.
- Soft-delete/inactive thay vì xóa cứng dữ liệu đã được tham chiếu.

**Web dùng để**

- Hiển thị cảnh báo xung đột trong form Admin/Staff.
- Tránh ghi đè thay đổi của người vận hành khác.

## P2 - Đo lường và vận hành production

### BE-017 - Analytics bảo vệ dữ liệu sức khỏe

**Backend cần làm**

- Chỉ nhận event allowlist như analysis completed, facility opened,
  directions opened và checkout started.
- Loại bỏ message, symptom text, profile data, token và provider response.
- Có retention, access control và cơ chế tắt analytics theo policy.

**Web dùng để**

- Đo funnel từ phân tích triệu chứng tới chọn nơi khám và nâng cấp Premium.
- Tìm điểm rơi của luồng mà không thu thập PHI/PII.

### BE-018 - Health check và observability

**Backend cần làm**

- Có health/readiness check cho database, AI provider, email và PayOS.
- Theo dõi latency/error rate theo endpoint mà không log payload nhạy cảm.
- Gắn `traceId` vào response lỗi và log nội bộ.

**Web dùng để**

- Hiển thị trạng thái tạm gián đoạn và retry hợp lý.
- Đội vận hành xác định lỗi thuộc AI, payment, email hay database.

## Chưa triển khai backend trong MVP

Không tạo API cho các nhóm sau trước khi Product Owner xác nhận phạm vi, consent,
data model và clinical owner:

| Nhóm | Backend sẽ phải có nếu được duyệt | Chức năng web tương lai |
|---|---|---|
| Medical records | Record/file metadata, object storage, ownership, encryption, retention, audit | `/records` lưu hồ sơ, xét nghiệm và tài liệu thật |
| Medication | Drug data source, image processing, interaction engine, provenance, safety review | `/medication` nhận diện và kiểm tra thuốc thật |
| Appointment | Availability, booking, cancellation, facility integration, notification | Đặt lịch từ cơ sở/bác sĩ |
| Treatment tracking | Care plan, reminder, adherence, clinician consent và sharing policy | Theo dõi điều trị/phục hồi |

## Ma trận chức năng web và backend phụ thuộc

| Chức năng web | Route/khu vực | Backend bắt buộc | Kết quả người dùng nhận được |
|---|---|---|---|
| Đăng nhập và vào đúng workspace | Login, Google login | BE-001, BE-010 | Không vào nhầm role hoặc mắc redirect loop |
| Hoàn tất hồ sơ Patient | `/patient/profile/setup`, `/profile` | BE-001 | Onboarding và hồ sơ cơ bản không phụ thuộc Premium |
| Hiển thị Free/Premium và lượt còn lại | Patient navigation, `/pricing` | BE-002, BE-003 | Biết quyền đang có và khi nào cần nâng cấp |
| Phân tích triệu chứng | `/dashboard`, `/symptom` | BE-003, BE-004, BE-008 | Nhận urgency, chuyên khoa và lý do gợi ý |
| Xem lại phiên phân tích | Dashboard, symptom history | BE-005 | Mở lại kết quả thật thay cho records mẫu |
| Tìm nơi khám trên bản đồ | `/map` | BE-006, BE-007 | Có cơ sở/khoa thật để lọc, gọi và chỉ đường |
| Xem chi tiết cơ sở | Map/detail panel | BE-007, BE-013 | Xem department, doctor, giờ mở cửa và rating |
| Chat AI | `/chat` hoặc assistant | BE-002, BE-003, BE-008 | Chat qua backend, không lộ provider key |
| Mua Premium | `/pricing`, payment result | BE-002, BE-009 | Thanh toán được xác minh và quyền được cập nhật |
| Duyệt Staff | `/app/admin` | BE-011, BE-015 | Admin xử lý application có trạng thái và audit |
| Mời Doctor | `/app/admin`, invitation register | BE-006, BE-012, BE-015 | Lời mời có thể list, resend, revoke và gán đúng khoa |
| Quản lý danh mục y tế | `/app/staff`, `/app/admin` | BE-006, BE-014, BE-016 | Staff chỉ sửa dữ liệu thuộc phạm vi được giao |
| Kiểm duyệt review | Staff/Admin workspace | BE-013, BE-015 | Review public đã qua policy kiểm duyệt |
| Theo dõi lỗi production | Toàn bộ web | BE-010, BE-018 | Frontend có error code/trace ID và retry phù hợp |

## Thứ tự triển khai đề xuất

1. `BE-001`, `BE-010`: sửa contract hồ sơ và error/OpenAPI để frontend tích hợp ổn định.
2. `BE-002`, `BE-003`, `BE-009`: hoàn thiện entitlement, quota và thanh toán.
3. `BE-006`, `BE-007`: hoàn thiện dữ liệu, tọa độ và tìm kiếm facility.
4. `BE-004`, `BE-005`, `BE-008`: hoàn thiện hành trình triệu chứng và AI.
5. `BE-011` đến `BE-016`: vận hành Staff/Admin và độ tin cậy dữ liệu.
6. `BE-018`: health check và observability trước production.
7. `BE-017`: chỉ bắt đầu sau khi có product/privacy decision.

## Checklist bàn giao backend cho frontend

Backend owner cập nhật checklist này trong pull request hoặc ticket:

- [ ] Link Swagger của môi trường tích hợp
- [ ] Endpoint và method cuối cùng
- [ ] Request example không chứa dữ liệu thật
- [ ] Success response example
- [ ] Danh sách error code và HTTP status
- [ ] Authorization policy và role được phép
- [ ] Migration/seed đã chạy
- [ ] Unit test và integration test đã pass
- [ ] Log không chứa thông tin nhận dạng cá nhân (PII), thông tin sức khỏe được bảo vệ (PHI), token hoặc secret
- [ ] Frontend owner đã xác nhận contract
