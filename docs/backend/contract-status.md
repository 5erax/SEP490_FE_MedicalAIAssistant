# Trạng thái contract backend/frontend

## Kiểm tra live ngày 2026-06-20

Nguồn kiểm tra: `http://52.77.210.243:8080/swagger/v1/swagger.json` (HTTP 200).

- Swagger hiện có 63 path, 91 operation và 130 schema.
- Tất cả path và HTTP method được khai báo trong `src/services/endpoints.js` và các domain service đều tồn tại trên Swagger live.
- Query phân trang frontend dùng `PageNumber`/`PageSize`, khớp backend.
- Bộ lọc doctor (`search`, `facilityId`, `departmentId`, `isActive`, `departmentRole`) khớp Swagger.
- Response chung `{ success, message, errors, data }` khớp cách `apiRequest()` xử lý.
- Các GET dữ liệu danh mục/public mà frontend không gửi bearer đã được smoke test trực tiếp và trả HTTP 200.

Các lệch đã sửa trong đợt kiểm tra này:

- Chat chính chuyển từ gọi Anthropic trực tiếp sang `POST /api/web-chatbot/message` với `{ message }`.
- Chẩn đoán lâm sàng dùng `POST /api/symptom-analysis/submit-diagnosis`; frontend ghép danh sách chẩn đoán này với chuyên khoa/cơ sở từ `submit-clinical-question-answers` theo cùng session.
- Clinical question gửi đủ `chapterId`, `chapterCode`, `questionVi`, `englishPrefix`, `sortOrder`; `sortOrder` là số.
- ICD chapter dùng `keywordWeights` object; create gửi `chapterCode`, update chỉ gửi trường backend hỗ trợ.
- Medical department giữ và gửi `chapterCode`.
- Doctor create/update giữ trường `specialty`.

Giới hạn xác minh:

- Workspace không chứa source backend, nên authorization policy và mapping database chỉ được xác minh qua OpenAPI live, HTTP smoke test read-only và frontend contract tests.
- Swagger đang khai báo Bearer security toàn cục, kể cả một số endpoint thực tế cho phép đọc không token. Backend nên mô tả `security: []` cho endpoint public để tài liệu phản ánh đúng runtime.
- Không chạy thử mutation trên backend deploy để tránh tạo/sửa/xóa dữ liệu thật; payload mutation được xác minh bằng schema Swagger và Playwright interception.

Ngày kiểm tra: **2026-06-17**

Nguồn:

```text
http://52.77.210.243:8080/swagger/v1/swagger.json
```

Kết quả quét: Swagger live tải thành công với HTTP 200, có 62 path.

## Nhóm API đã có

- Authentication: login, register, Google login, refresh, logout, forgot/change password, Staff application và Staff approval.
- Users: list, current user, update và delete.
- Patient profiles: list, create, update và delete.
- Medical departments: public/management list và CRUD.
- Medical facilities: active list, management list, CRUD/status.
- Facility departments: public active list.
- Doctors: active list, management list, CRUD/status.
- Doctor invitations: create, revoke, validate và register.
- ICD chapters và clinical questions.
- Symptom analysis: suggest clinical questions, submit answers, lịch sử current user và get by session ID.
- Web chatbot.
- Feedback reviews: list, create, detail, by facility, status và delete.
- Subscription plans, checkout, current subscription và cancellation.
- Payments: detail, PayOS return/cancel/status/webhook.
- AI configurations: active, by task type, CRUD/status.

## Điểm đã xác minh từ schema Swagger

- `ApplicationUserResponse` gồm `id`, `displayName`, `email`, `address`, `status`, `isDeleted`, `deletedAt`, `gender`, `dateOfBirth`, `isFirstLogin`, `isProfileCompleted`, `roles`.
- `UpdateUserRequest` có `phoneNumber`, nhưng `ApplicationUserResponse` chưa có `phoneNumber`.
- `MedicalFacilityResponse` đã có `latitude` và `longitude`; frontend Admin có thể gửi hai trường này khi tạo facility qua API hiện có.
- `FacilityDepartmentActiveResponse` có `id`, `facilityId`, `facilityName`, `departmentId`, `departmentName`.
- `DoctorInvitationResponse` có `id`, `email`, `doctorId`, `doctorName`, `isLinkedToExistingDoctorProfile`, `expiresAt`, `status`, `createdAt`, `usedAt`.
- `PayOSPaymentStatusResponse` có `orderCode`, `paymentId`, `subscriptionId`, `paymentStatus`, `subscriptionStatus`, `isPaid`, `isActive`, `isCancelled`, `message`.
- `WebChatbotResponse` có `answer`, `recommendedPlans`, `intent`, `needsMoreInformation`.

## Giới hạn contract còn lại

- Doctor invitation chưa có endpoint list/filter hoặc resend.
- Facility department chưa có management CRUD/status riêng.
- Facility search chưa có filter vị trí, khoảng cách, chuyên khoa và pagination phù hợp cho map; tuy nhiên map MVP có thể chạy mức cơ bản nếu `/api/medical-facilities/active` trả facility đã được Admin nhập `latitude`/`longitude`.
- Backend chưa có endpoint capability/entitlement đã tính sẵn; frontend vẫn phải suy luận Premium từ subscription/auth fields nếu chưa bổ sung.
- OpenAPI có Bearer JWT scheme, nhưng cần mô tả rõ endpoint public, response `401`/`403` và error envelope chuẩn theo từng operation.
- Backend deploy dùng HTTP; frontend production cần same-origin HTTPS proxy hoặc backend HTTPS để tránh mixed content.
- Payment status theo `orderCode` cần ownership hoặc opaque reference khó đoán nếu endpoint public.
- Review có status nhưng policy Pending/Approved/Public cần được chốt rõ.
- Records, medication, appointment và treatment tracking chưa có API production.

## Frontend API utilization scan

Ngày quét frontend: **2026-06-17**

Kết quả đối chiếu `Swagger -> ENDPOINTS -> services/pages/tests`:

- Frontend đã khai báo và dùng hầu hết nhóm API sản phẩm: auth, users, patient profiles, departments, facilities, doctors, invitations, symptom analysis, chatbot, feedback reviews, subscriptions, payments và AI configs.
- Frontend chưa khai báo service cho `icd-chapters`: `/api/icd-chapters`, `/api/icd-chapters/{id}`, `/api/icd-chapters/bulk`.
- Frontend đã có `clinicalQuestionsApi.list/get`, nhưng chưa có `bulk` service cho `/api/clinical-questions/bulk`.
- PayOS `payos-return`, `payos-cancel` và `payos-webhook` là backend/callback surface; frontend không cần gọi trực tiếp, nhưng trang payment result phải dựa vào status/payment detail đã xác minh.
- `medical-facilities` đã có CRUD/status ở backend và service ở frontend; UI Admin cần dùng tiếp `PUT`, `PATCH status`, `DELETE` để khai thác đầy đủ API hiện có.
- `feedback-reviews` đã có management API và service; frontend còn thiếu moderation queue cho Staff/Admin.
- `ai-configs` đã có `active` và `by-task-type`; frontend cần bổ sung view giúp Admin biết config active nào đang áp dụng cho từng task.

Thứ tự thực thi frontend hiện được chốt là: phát triển tính năng trước, sau đó fix bug, cuối cùng mới cải thiện/tối ưu. Các tính năng P0 phải ưu tiên dùng API backend hiện có: facility CRUD/status cho Admin nhập dữ liệu bệnh viện, active facility list cho map, symptom-analysis history/detail, subscription/payment status, feedback moderation, ICD/clinical questions và AI config visibility.

Checklist frontend chi tiết nằm tại [Frontend web-scale checklist](../frontend-architecture/frontend-web-scale-checklist.md).

## Tài liệu backlog liên quan

Các khoảng trống trên đã được đồng bộ vào [backend backlog](./backlog.md), đặc biệt:

- BE-001: `/users/me` và `phoneNumber`.
- BE-002, BE-003: capability, entitlement và quota.
- BE-006, BE-007: facility-department CRUD và facility search cho map.
- BE-009: PayOS idempotency, ownership và state transition.
- BE-010: error/auth/OpenAPI.
- BE-012: doctor invitation list/resend/audit.

## Quy tắc cập nhật

Khi Swagger hoặc dữ liệu deploy thay đổi:

1. Cập nhật ngày kiểm tra.
2. Cập nhật nhóm API và giới hạn tương ứng.
3. Không ghi token, credential, email/số điện thoại thật hoặc dữ liệu sức khỏe thật vào tài liệu.
4. Đồng bộ nhiệm vụ trong [backend backlog](./backlog.md).
