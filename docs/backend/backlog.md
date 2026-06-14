# Backlog backend theo chức năng web

Tài liệu này chuyển các luồng nghiệp vụ trong
[business flows](../product-definition/business-flows.md) thành nhiệm vụ backend
có thể giao việc.

Nguồn đối chiếu:

- Product definition và route/service frontend hiện tại.
- Swagger deploy `http://52.77.210.243:8080/swagger/v1/swagger.json`.
- Kiểm tra live ngày 2026-06-14.

## Trạng thái backend hiện tại

- Auth, user, patient profile, symptom analysis, web chatbot, directory y tế,
  feedback review, subscription, PayOS, AI config và doctor invitation đã có API.
- `/api/medical-facilities/active` và
  `/api/facility-departments/active` đang trả danh sách rỗng.
- `/api/subscription-plans/active` đã có gói active.
- Doctor invitation chưa có API list/resend.
- Symptom analysis mới có analyze và get-by-session, chưa có lịch sử theo user.
- OpenAPI chưa khai báo security requirement rõ cho các endpoint cần đăng nhập.
- Records, medication, appointment và treatment tracking chưa có API production.

## P0 - Bắt buộc cho luồng MVP

### BE-001 - Chuẩn hóa trạng thái phiên đăng nhập

**Backend cần làm**

- Bảo đảm login, Google login, refresh và `/api/users/me` trả nhất quán:
  `userId`, `roles`, `status`, `firstLogin`, `isProfileCompleted`, `phoneNumber`.
- Bổ sung `phoneNumber` vào `ApplicationUserResponse`; Swagger ngày 2026-06-14 chỉ
  khai báo trường này ở `UpdateUserRequest`, nên frontend không thể tải lại số đã lưu
  sau một phiên đăng nhập mới.
- Trả mã lỗi riêng cho pending, disabled, deleted, invalid credential và token hết hạn.
- Không trả token hoặc thông tin nhạy cảm trong message/log.

**Web dùng để**

- Đưa Admin tới `/app/admin`, Staff/Doctor tới `/app/staff`.
- Đưa Patient chưa hoàn tất hồ sơ tới `/patient/profile/setup`.
- Hiển thị đúng thông báo khi tài khoản chờ duyệt hoặc bị khóa.
- Tránh redirect loop sau login/refresh.

**Hoàn thành khi**

- Cùng một tài khoản có trạng thái giống nhau ở login, refresh và `/users/me`.
- Backend từ chối tài khoản không active ngay cả khi frontend route guard bị bỏ qua.

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

**Backend cần làm**

- Thêm `GET /api/symptom-analysis/me` có pagination, sort và thời gian.
- Chỉ trả summary tối thiểu cho danh sách; lấy chi tiết bằng session ID.
- Kiểm tra ownership ở get-by-session.
- Cân nhắc `DELETE` hoặc retention policy nếu Patient được quyền xóa dữ liệu.

**Web dùng để**

- Hiển thị “Phiên gần đây” và “Tiếp tục xem kết quả”.
- Thay link `/records` giả bằng lịch sử phân tích thật.
- Cho Patient quay lại một kết quả cũ mà không nhập lại triệu chứng.

**Hoàn thành khi**

- User A không thể lấy session của user B bằng cách thay ID.
- Pagination không trả toàn bộ nội dung triệu chứng trong danh sách.

### BE-006 - Hoàn thiện dữ liệu cơ sở và khoa tại cơ sở

**Backend cần làm**

- Tạo dữ liệu production cho medical facilities và facility departments.
- Bổ sung CRUD/status cho facility department, không chỉ endpoint `/active`.
- Kiểm tra quan hệ facility, department và doctor trước khi activate.
- Ngăn xóa cứng dữ liệu đang được doctor hoặc analysis tham chiếu.

**Web dùng để**

- Hiển thị cơ sở thật trên `/map`.
- Cho Admin/Staff gán chuyên khoa vào cơ sở.
- Cung cấp `facilityDepartmentId` hợp lệ khi tạo doctor hoặc đăng ký bằng invitation.
- Cho symptom analysis trả cơ sở thực tế thay vì danh sách rỗng.

**Hoàn thành khi**

- `/medical-facilities/active` và `/facility-departments/active` có dữ liệu liên kết hợp lệ.
- Mỗi facility department trả đủ `id`, `facilityId`, `departmentId` và tên hiển thị.

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

**Backend cần làm**

- Cấu hình return/cancel URL theo môi trường.
- Xác minh chữ ký webhook và xử lý idempotent theo order/payment ID.
- Chỉ activate subscription sau khi backend xác minh thanh toán.
- Bảo vệ endpoint payment status bằng ownership hoặc opaque reference khó đoán.
- Trả trạng thái pending/paid/cancelled/expired/failed nhất quán.

**Web dùng để**

- Render `/payment/return` và `/payment/cancel`.
- Poll trạng thái thật, refresh entitlement và quay về tính năng ban đầu.
- Không hiển thị thanh toán thành công chỉ vì URL có query parameter.

**Hoàn thành khi**

- Gửi webhook lặp không tạo nhiều subscription.
- User không xem được payment/subscription của user khác.

### BE-010 - Chuẩn hóa error, auth và OpenAPI

**Backend cần làm**

- Khai báo Bearer security scheme và security requirement trong Swagger.
- Chuẩn hóa envelope lỗi với `code`, `message`, `fieldErrors`, `traceId`.
- Dùng đúng `400`, `401`, `403`, `404`, `409`, `422`, `429`.
- Cung cấp HTTPS production hoặc đặt backend sau gateway/proxy HTTPS.

**Web dùng để**

- Phân biệt chưa đăng nhập, không đủ quyền, validation, conflict và hết quota.
- Đưa lỗi form tới đúng field và cung cấp retry phù hợp.
- Tích hợp API mà không phải suy đoán endpoint nào cần token.

**Hoàn thành khi**

- Swagger mô tả auth, request, response và error cho mọi endpoint.
- Không yêu cầu browser gọi HTTP từ trang HTTPS.

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

**Backend cần làm**

- Thêm `GET /api/admin/doctor-invitations` có filter trạng thái và pagination.
- Thêm resend invitation với token mới hoặc thời hạn mới.
- Giữ revoke, validate và register idempotent/an toàn.
- Ràng buộc invitation với doctor profile và facility department hợp lệ.
- Không trả token invitation trong list/log/analytics.

**Web dùng để**

- Admin xem lời mời pending, used, expired, revoked.
- Resend hoặc revoke sau khi reload trang, không phụ thuộc state tạm ở frontend.
- Doctor nhận đúng cơ sở/khoa khi kích hoạt tài khoản.

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

1. `BE-001`, `BE-002`, `BE-003`, `BE-010`: nền tảng auth, quyền và contract.
2. `BE-006`, `BE-007`: tạo dữ liệu thật để map và recommendation hoạt động.
3. `BE-004`, `BE-005`, `BE-008`: hoàn thiện hành trình triệu chứng và AI.
4. `BE-009`: đóng luồng monetization.
5. `BE-011` đến `BE-016`: vận hành Staff/Admin và độ tin cậy dữ liệu.
6. `BE-017`, `BE-018`: analytics và production operations.
