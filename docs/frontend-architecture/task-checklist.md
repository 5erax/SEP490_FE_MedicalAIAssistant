# Frontend task checklist

Tài liệu này theo dõi các nhiệm vụ frontend được thực hiện trên nhánh
`5era/frontend-docs-task-checklist`. Mỗi thay đổi phải được cập nhật tại đây
trước khi commit để phạm vi, trạng thái và kết quả kiểm tra có thể được rà soát.

## Quy ước trạng thái

- `[ ]` Chưa bắt đầu.
- `[-]` Đang thực hiện hoặc đang bị chặn.
- `[x]` Đã hoàn thành và đã cập nhật nhật ký thay đổi.

## Checklist chung cho mỗi nhiệm vụ

- [ ] Xác định mục tiêu, phạm vi và tiêu chí hoàn thành.
- [ ] Kiểm tra component, route, service, API contract và biến môi trường liên quan.
- [ ] Triển khai thay đổi nhỏ, đúng kiến trúc và không sửa file ngoài phạm vi.
- [ ] Kiểm tra responsive, accessibility và trạng thái lỗi nếu có thay đổi UI.
- [ ] Chạy các lệnh kiểm tra phù hợp và ghi kết quả bên dưới.
- [ ] Cập nhật tài liệu kiến trúc hoặc tích hợp khi hành vi hệ thống thay đổi.
- [ ] Ghi đầy đủ file đã đổi, tác động và giới hạn trong nhật ký thay đổi.
- [ ] Dùng Conventional Commit và phản ánh checklist trong PR description.

## Nhiệm vụ

### FE-DOC-001: Thiết lập cơ chế theo dõi nhiệm vụ frontend

- [x] Tạo nhánh riêng cho các nhiệm vụ frontend trong tài liệu.
- [x] Tạo checklist chung cho quá trình phân tích, triển khai và kiểm tra.
- [x] Thêm nhật ký thay đổi để commit và PR có thể đối chiếu.
- [x] Liên kết checklist từ mục lục tài liệu frontend.

### FE-ROUTE-001: Chuẩn hóa route và luồng quay lại tác vụ

- [x] Xác nhận phạm vi và tiêu chí hoàn thành từ navigation roadmap.
- [x] Kiểm tra `App.jsx`, navigation, auth/signup, pricing và admin workspace.
- [x] Tạo route registry cho title, access, alias và admin section.
- [x] Chuẩn hóa `returnTo` nội bộ cho login, signup, profile setup và premium gate.
- [x] Thêm URL riêng cho admin section và hỗ trợ refresh, Back/Forward.
- [x] Bổ sung route, auth redirect và admin deep-link tests.
- [x] Chạy lint, build, route tests và accessibility smoke tests.
- [x] Cập nhật nhật ký thay đổi với file, tác động và kết quả kiểm tra.

### FE-ROUTE-002: Hợp nhất guard pipeline và navigation model

- [x] Xác nhận hai hạng mục P0 còn lại trong navigation roadmap.
- [x] Kiểm tra role/profile guard và navigation đang khai báo trong page/component.
- [x] Thực thi auth, role, first-login và premium guard từ route metadata.
- [x] Tạo navigation model dùng chung cho Patient, Staff và Admin.
- [x] Chuyển sidebar Patient/Admin sang dữ liệu từ registry, không đổi giao diện.
- [x] Bổ sung permission matrix và first-login route tests.
- [x] Chạy lint, build, route, navigation và accessibility tests.
- [x] Cập nhật nhật ký thay đổi với file, tác động và kết quả kiểm tra.

### FE-UI-003: Chuẩn hóa Dialog và Drawer focus foundation

- [x] Xác nhận phạm vi và tiêu chí nghiệm thu từ P0-03.
- [x] Audit premium notice, patient drawer và các admin modal hiện tại.
- [x] Tạo foundation dùng chung cho focus trap, Escape, backdrop và restore focus.
- [x] Chuyển premium notice và admin modal sang Dialog foundation.
- [x] Chuyển patient mobile drawer sang cùng focus-management contract.
- [x] Bổ sung keyboard tests cho Tab cycle, inert background và restore focus.
- [x] Chạy lint, build, route, navigation và accessibility tests.
- [x] Cập nhật roadmap và nhật ký thay đổi với kết quả thực tế.

### FE-STATE-004: Chuẩn hóa trạng thái dữ liệu Admin Doctors

- [x] Xác nhận phạm vi và tiêu chí nghiệm thu từ P0-04.
- [x] Audit luồng tải danh sách, phân trang, thông báo lỗi và empty state hiện tại.
- [x] Tách lỗi tải dữ liệu khỏi thông báo thao tác và bổ sung retry tại chỗ.
- [x] Chuyển loading, error và empty state sang primitive dùng chung.
- [x] Bổ sung kiểm thử cho lỗi tải, keyboard retry và kết quả rỗng sau retry.
- [x] Chạy lint, build, kiểm thử liên quan và kiểm tra responsive/accessibility.
- [x] Cập nhật roadmap và nhật ký thay đổi với kết quả thực tế.

### FE-STATE-005: Chuẩn hóa trạng thái dữ liệu Admin AI Configs

- [x] Xác nhận phạm vi và tiêu chí nghiệm thu từ P0-04.
- [x] Audit luồng tải, lọc, phân trang, thông báo lỗi và empty state hiện tại.
- [x] Tách lỗi tải dữ liệu khỏi thông báo thao tác và bổ sung retry tại chỗ.
- [x] Chuyển loading, error và empty state sang primitive dùng chung.
- [x] Bổ sung kiểm thử cho lỗi tải, keyboard retry và kết quả rỗng sau retry.
- [x] Chạy lint, build, kiểm thử liên quan và kiểm tra responsive/accessibility.
- [x] Cập nhật roadmap và nhật ký thay đổi với kết quả thực tế.

### FE-STATE-006: Chuẩn hóa trạng thái dữ liệu Admin Subscription Plans

- [x] Xác nhận phạm vi và tiêu chí nghiệm thu từ P0-04.
- [x] Audit luồng tải, đồng bộ, thông báo lỗi và empty state hiện tại.
- [x] Tách lỗi tải dữ liệu khỏi thông báo thao tác và bổ sung retry tại chỗ.
- [x] Chuyển loading, error và empty state sang primitive dùng chung.
- [x] Bổ sung kiểm thử cho lỗi tải, keyboard retry và kết quả rỗng sau retry.
- [x] Chạy lint, build, kiểm thử liên quan và kiểm tra responsive/accessibility.
- [x] Cập nhật roadmap và nhật ký thay đổi với kết quả thực tế.

### FE-STATE-007: Chuẩn hóa trạng thái dữ liệu Admin Users

- [x] Xác nhận phạm vi và tiêu chí nghiệm thu từ P0-04.
- [x] Audit luồng tải, tìm kiếm, phân trang, thông báo thao tác và empty state hiện tại.
- [x] Tách lỗi tải dữ liệu khỏi thông báo thao tác và bổ sung retry tại chỗ.
- [x] Chuẩn hóa loading, error và empty state bằng primitive dùng chung.
- [x] Bổ sung kiểm thử cho lỗi tải, keyboard retry và kết quả rỗng sau retry.
- [x] Chạy lint, build, kiểm thử liên quan và kiểm tra responsive/accessibility.
- [x] Cập nhật roadmap và nhật ký thay đổi với kết quả thực tế.

### FE-STATE-008: Chuẩn hóa trạng thái dữ liệu Admin Facilities

- [x] Xác nhận phạm vi và tiêu chí nghiệm thu từ P0-04.
- [x] Audit luồng tải cơ sở, liên kết chuyên khoa, thông báo submit và empty state hiện tại.
- [x] Tách lỗi tải dữ liệu khỏi thông báo tạo cơ sở và bổ sung retry tại chỗ.
- [x] Chuẩn hóa loading, error và empty state bằng primitive dùng chung.
- [x] Bổ sung kiểm thử cho lỗi tải, keyboard retry và kết quả rỗng sau retry.
- [x] Chạy lint, build, kiểm thử liên quan và kiểm tra responsive/accessibility.
- [x] Cập nhật roadmap và nhật ký thay đổi với kết quả thực tế.

### FE-AUTH-009: Ổn định onboarding hồ sơ và validation

- [x] Đối chiếu route guard, auth response, `/api/users/me` và patient profile contract.
- [x] Hợp nhất `firstLogin` với `isProfileCompleted` và chỉ áp dụng onboarding cho Patient.
- [x] Chuẩn hóa validation thông tin cá nhân và sức khỏe ở màn hình tạo/chỉnh sửa hồ sơ.
- [x] Bổ sung test đăng nhập lại sau khi hoàn tất hồ sơ và test role Doctor.
- [x] Chạy lint, build, kiểm thử liên quan và cập nhật nhật ký thay đổi.

### FE-PAY-010: Kết thúc ngay luồng PayOS cancel

- [x] Audit callback `/payment/cancel`, status polling và contract `payos-status`.
- [x] Hiển thị trạng thái đã hủy ngay, không poll kéo dài hoặc suy diễn quyền lợi thanh toán.
- [x] Bổ sung test đảm bảo cancel không gọi status API tự động.
- [x] Chạy kiểm thử liên quan và cập nhật nhật ký thay đổi.

### FE-SEC-011: Khắc phục cảnh báo CodeQL frontend và workflow

- [x] Xác minh đường truyền file upload tới DOM và quyền `GITHUB_TOKEN` hiện tại.
- [x] Loại bỏ URL file không tin cậy khỏi thuộc tính DOM, đồng thời validate loại/kích thước ảnh.
- [x] Khai báo quyền đọc tối thiểu ở cấp workflow và giữ quyền ghi package riêng cho publish job.
- [x] Bổ sung kiểm thử upload ảnh không hợp lệ/hợp lệ.
- [x] Chạy lint, build, kiểm thử liên quan và cập nhật nhật ký thay đổi.

### FE-SEC-012: Loại PII khỏi auth storage

- [x] Xác minh đường truyền `phoneNumber` từ auth/profile response tới localStorage.
- [x] Chỉ lưu token, role, ID kỹ thuật, onboarding và entitlement bằng whitelist rõ ràng.
- [x] Loại email, tên, địa chỉ, số điện thoại và refresh token khỏi auth storage.
- [x] Tự làm sạch auth storage cũ khi phiên được đọc.
- [x] Bổ sung test cho login response và phiên cũ có chứa PII.
- [x] Chạy lint, build, kiểm thử liên quan và cập nhật nhật ký thay đổi.

### FE-DOC-013: Chuẩn hóa backend backlog để giao việc

- [x] Xác minh lại Swagger và dữ liệu deploy ngày 2026-06-14.
- [x] Loại các blocker đã lỗi thời về facility, symptom history và Bearer security.
- [x] Thêm bảng ưu tiên, trạng thái đề xuất, phụ thuộc, Definition of Ready và Definition of Done.
- [x] Chi tiết hóa contract, error, kiểm thử và tiêu chí nghiệm thu cho các ticket backend trọng yếu.
- [x] Đồng bộ contract status và ghi chú Doctor invitation.
- [x] Kiểm tra mã ticket, code fence, link Markdown và `git diff --check`.

### FE-MAP-014: Khôi phục và ổn định bản đồ cơ sở y tế

- [x] Kiểm tra route, component, service, API live, local và production.
- [x] Xác định rủi ro loading/error không hiển thị, style ngoài và tọa độ fallback giả.
- [x] Tạo kế hoạch triển khai theo giai đoạn và tiêu chí đóng task.
- [x] Thêm quan sát runtime và trạng thái map loading/ready/error.
- [x] Loại tọa độ giả và chuẩn hóa facility thiếu tọa độ.
- [x] Thêm fallback/retry khi style hoặc WebGL lỗi.
- [x] Hoàn thiện keyboard, skip link, reduced motion và responsive.
- [x] Bổ sung test hồi quy map, contract và accessibility.
- [x] Chạy lint, build, test và cập nhật nhật ký sau triển khai.

### FE-PLAN-015: Lập backlog hoàn thiện chức năng và trải nghiệm frontend

- [x] Đối chiếu Doctor invitation, role routing và workspace hiện tại.
- [x] Đối chiếu Swagger ngày 2026-06-15 và ghi rõ capability chưa có contract.
- [x] Phân tích lỗi responsive của bảng Admin Doctors từ code và ảnh lỗi.
- [x] Xác định dữ liệu bản đồ/bệnh viện giả còn xuất hiện trên production surface.
- [x] Tạo backlog theo P0/P1/P2, phụ thuộc, tiêu chí nghiệm thu và test.
- [x] Liên kết backlog từ tài liệu kiến trúc frontend.

### FE-AUTH-016: Hoàn tất Doctor invitation đến workspace

- [x] Giữ đúng login intent sau khi đăng ký bằng invitation.
- [x] Xác minh role Doctor từ login response/JWT và mở `/app/staff`.
- [x] Không đưa Doctor qua onboarding Patient.
- [x] Xử lý missing role, account inactive và permission mismatch.
- [x] Thêm E2E invitation -> register -> login -> Doctor workspace.
- [x] Kiểm tra không lưu invitation token hoặc PII trong auth storage.

### FE-DOCTOR-017: Xây Doctor workspace chuyên nghiệp

- [ ] Tách Doctor/Staff shell khỏi form quản lý chuyên khoa.
- [ ] Hiển thị account summary và hồ sơ nghề nghiệp từ contract thật.
- [ ] Chỉ hiển thị tác vụ đúng quyền và capability production.
- [ ] Hoàn thiện responsive, loading, empty, error và permission state.
- [ ] Bổ sung test Doctor/Staff/Admin và dữ liệu hồ sơ thiếu.
- [-] Phụ thuộc backend `GET /api/doctors/me` cho hồ sơ Doctor hiện tại.

### FE-ADMIN-018: Sửa layout quản lý bác sĩ

- [x] Thiết kế table desktop và compact row/card hoặc action menu trên mobile.
- [x] Loại cột đầu bị khuất, wrap quá mức và overflow toàn trang.
- [x] Đồng bộ search/filter/page/page size vào URL.
- [x] Kiểm tra nội dung tiếng Việt dài và không gian tương đương zoom 200%.
- [x] Thêm visual/E2E ở 390, 640, 768, 1024, 1280 và 1440 px.

### FE-LANDING-019: Loại dữ liệu bản đồ giả khỏi landing

- [x] Xóa `MEDICAL_LOCATIONS`, khoảng cách và thời gian chờ hard-code.
- [x] Xóa copy đặt lịch/lưu địa điểm chưa có capability thật.
- [x] Thay bằng preview nhẹ và CTA SPA đến `/map`.
- [x] Không tải MapLibre trên landing.
- [x] Thêm test ngăn dữ liệu bệnh viện mẫu quay lại production surface.

### FE-PROD-020: Audit capability demo và mock production

- [ ] Lập inventory `MOCK_`, `DEMO_`, fixture và TODO thay API trong `src/`.
- [ ] Xử lý mock trong `hospitalRecommendations.js`.
- [ ] Audit records, medication và kết quả AI mẫu.
- [ ] Ẩn hoặc gắn nhãn demo cho capability chưa sẵn sàng.
- [ ] Thêm regression guard cho production navigation và surface.

### FE-UX-021: Chuẩn hóa critical-flow UX

- [ ] Chuẩn hóa busy/success/error/empty/permission/retry state.
- [ ] Chống double-submit và giữ form khi lỗi có thể sửa.
- [ ] Chuẩn hóa validation summary, focus và lỗi field.
- [ ] Không để trạng thái kiểm tra vô hạn; luôn có timeout/recovery.
- [ ] Audit copy trộn ngôn ngữ, internal ID và lỗi kỹ thuật.

### FE-PERF-022: Tối ưu tải trang và bundle

- [x] Ghi baseline bundle, LCP và request theo route.
- [-] Lazy-load map và medical assistant; admin/page hiếm dùng còn lại chưa tách.
- [x] Không tải MapLibre/map style trên landing.
- [ ] Giảm request trùng và layout shift.
- [ ] Cập nhật performance budget theo số đo trước/sau.

### FE-A11Y-023: Accessibility hardening

- [-] Keyboard-only đã có cho invitation và Admin Doctors; Doctor workspace còn mở.
- [x] Kiểm tra focus, live region và table/card semantics ở các surface đã sửa.
- [ ] Kiểm tra 200% zoom, forced colors, reduced motion và contrast.
- [ ] Chạy screen reader smoke và axe cho surface đã thay đổi.

### FE-TEST-024: Regression suite cho Doctor và production data

- [x] Bao phủ invitation -> login -> workspace và role matrix.
- [x] Bao phủ Admin Doctors bằng dữ liệu dài và nhiều viewport.
- [x] Bảo đảm landing không còn dữ liệu cơ sở giả.
- [x] Bảo đảm `/map` không hồi quy sau khi tách khỏi landing.
- [ ] Chạy route, accessibility, performance và visual suite trong CI.

### FE-PROFILE-025: Mở hồ sơ và gom menu tài khoản

- [x] Bỏ premium gate khỏi xem/cập nhật hồ sơ.
- [x] Tạo menu avatar gồm Hồ sơ, Cài đặt hiển thị, Lịch sử giao dịch và Đăng xuất.
- [x] Chuyển cài đặt trải nghiệm/hiển thị vào trong app, không để ngoài shell chính.
- [x] Đảm bảo menu dùng được bằng keyboard, mobile và không lộ dữ liệu nhạy cảm.
- [-] Thêm test user free mở hồ sơ và thấy cài đặt hiển thị; còn thiếu test submit cập nhật hồ sơ.

### FE-DX-026: Chẩn đoán triệu chứng bằng câu hỏi yes/no

- [x] Tạo service cho `suggest-clinical-questions` và `submit-clinical-question-answers`.
- [x] Xây flow nhập triệu chứng -> trả lời yes/no -> xem kết quả chẩn đoán.
- [x] Hiển thị `primaryDiagnosis`, danh sách chẩn đoán, khoa đề xuất và cảnh báo y tế.
- [x] Thêm CTA điều hướng đến cơ sở y tế liên quan sau khi có kết quả.
- [-] Xử lý loading, empty questions và submit error; cần bổ sung test riêng cho 400, 401, 502.
- [-] Thêm test success; còn thiếu test empty questions, backend error và emergency suggestion.

### FE-ONBOARD-027: Onboarding hồ sơ nhẹ nhàng

- [x] Cho người dùng mới vào app ngay cả khi hồ sơ chưa hoàn tất.
- [x] Gỡ redirect cứng sang profile setup sau login/signup nếu không có yêu cầu bắt buộc.
- [x] Thêm prompt hoặc tour hướng dẫn cập nhật hồ sơ ở dashboard/menu avatar.
- [x] Cho phép bỏ qua nhắc hồ sơ khi bắt đầu chẩn đoán hoặc tìm cơ sở y tế.
- [x] Thêm regression test đảm bảo user mới không bị kẹt ở profile setup.

### FE-DX-030: Gom chẩn đoán vào Tư vấn chuyên khoa

- [x] Bỏ mục Triệu chứng khỏi sidebar và mobile navigation.
- [x] Giữ `/symptom` như URL tương thích nhưng không dùng làm entry chính.
- [x] Đưa CTA phân tích triệu chứng nội bộ về `/dashboard`.
- [x] Đọc prefill triệu chứng ngay trong dashboard để câu hỏi yes/no hiển thị tại chỗ.
- [x] Thêm regression test cho sidebar không có `/symptom` và prefill dashboard.

### FE-AUTH-031: Xác minh Doctor invitation khi đăng nhập Google

- [x] Sau Google login, gọi `/api/users/me` để lấy role mới nhất từ backend.
- [x] Nếu login trong context invitation mà tài khoản không có Doctor/Staff/Admin, xóa phiên và giữ người dùng ở login.
- [x] Điều hướng Doctor/Staff/Admin về `/app/staff`, không rơi về patient dashboard.
- [ ] Cần backend đảm bảo Google OAuth gán đúng role Doctor cho email invitation.

### FE-FACILITY-028: Xếp hạng bệnh viện sau chẩn đoán

- [x] Ưu tiên cơ sở có khoa/chuyên khoa liên quan đến kết quả chẩn đoán.
- [x] Dùng khoảng cách khi người dùng cấp quyền vị trí và cơ sở có tọa độ hợp lệ.
- [x] Dùng rating/số sao chỉ khi backend trả dữ liệu thật.
- [x] Không tự dựng thời gian chờ, khoảng cách, rating hoặc dữ liệu bệnh viện.
- [x] Hiển thị lý do xếp hạng và fallback khi thiếu vị trí/tọa độ.

### FE-POLISH-029: Hoàn thiện UX frontend chuyên nghiệp

- [x] Rà navigation để ưu tiên chẩn đoán, tìm cơ sở, hồ sơ, giao dịch và cài đặt.
- [x] Bỏ hoặc hạ nhãn các card demo/CTA chưa có capability production.
- [x] Chuẩn hóa loading, empty, error và recovery state cho luồng chính.
- [x] Kiểm tra mobile, keyboard, 200% zoom và visual cho menu avatar/onboarding/diagnosis.
- [x] Rà copy y tế để không hứa hẹn chẩn đoán chắc chắn hoặc thay thế bác sĩ.

### FE-REFACTOR-032: Tách Admin overview và users section

- [x] Xác nhận baseline lint, build và route trước khi refactor.
- [x] Tách Admin overview sang component riêng, giữ nguyên số liệu, CSS class và điều hướng section.
- [x] Tách Admin users sang component riêng, giữ API, mutation và confirmation ở page cha.
- [x] Không đổi route, backend contract, auth/role gate hoặc giao diện.
- [x] Chạy lint, build và các regression test Admin liên quan.

## Nhật ký thay đổi

| Ngày | Mã nhiệm vụ | Trạng thái | Thay đổi | Kiểm tra |
| --- | --- | --- | --- | --- |
| 2026-06-13 | FE-DOC-001 | Hoàn thành | Thêm checklist nhiệm vụ frontend và liên kết từ mục lục tài liệu | Kiểm tra Markdown, link tương đối và `git diff --check` |
| 2026-06-13 | FE-ROUTE-001 | Hoàn thành | Thêm route registry; bảo vệ `returnTo`; giữ tác vụ qua signup/profile/PayOS; canonical alias; thêm URL cho 8 admin section | `npm.cmd run lint`; `npm.cmd run build`; route 50 passed, 1 skipped; navigation 10 passed; accessibility 14 passed; browser kiểm tra admin alias và premium gate |
| 2026-06-13 | FE-ROUTE-002 | Hoàn thành | Hợp nhất auth/role/first-login/premium guard; tạo navigation model Patient/Staff/Admin; chuyển sidebar Patient/Admin sang route registry; bổ sung permission matrix | `npm.cmd run lint`; `npm.cmd run build`; route 50 passed, 1 skipped; navigation 12 passed; accessibility 14 passed; browser kiểm tra admin guard và return intent |
| 2026-06-13 | FE-UI-003 | Hoàn thành | Thêm Dialog/focus foundation; migrate premium notice, 4 admin modal và patient drawer; chuẩn hóa inert, Tab cycle, Escape, backdrop và restore focus | `npm.cmd run lint`; `npm.cmd run build`; route 50 passed, 1 skipped; navigation 13 passed; accessibility 14 passed; browser kiểm tra premium dialog và inert background |
| 2026-06-13 | FE-STATE-004 | Hoàn thành | Tách lỗi tải khỏi thông báo thao tác; migrate loading/error/empty state; thêm retry an toàn và CTA 44 px cho Admin Doctors | `npm.cmd run lint`; `npm.cmd run build`; Admin Doctors 2 passed; accessibility 14 passed; browser kiểm tra mobile 390x844 không tràn ngang |
| 2026-06-14 | FE-STATE-005 | Hoàn thành | Tách lỗi tải khỏi thông báo thao tác; migrate loading/error/empty state; thêm retry an toàn và CTA 44 px cho Admin AI Configs | `npm.cmd run lint`; `npm.cmd run build`; Admin state 3 passed; accessibility 14 passed; browser kiểm tra mobile 390x844 không tràn ngang |
| 2026-06-14 | FE-STATE-006 | Hoàn thành | Tách lỗi tải khỏi thông báo thao tác; migrate loading/error/empty state; thêm retry an toàn và CTA 44 px cho Admin Subscription Plans | `npm.cmd run lint`; `npm.cmd run build`; Admin state 5 passed; Subscription Plans 2 passed ở 390x844; accessibility 14 passed; browser kiểm tra bảng mobile không tràn trang |
| 2026-06-14 | FE-STATE-007 | Hoàn thành | Tách lỗi tải khỏi thông báo approve/delete; thêm retry an toàn, ẩn phân trang khi lỗi và ổn định assertion retry cho bộ Admin state | `npm.cmd run lint`; `npm.cmd run build`; Admin state 6 passed; Admin Users 1 passed ở 390x844; accessibility 14 passed; CTA retry 44 px và không tràn ngang |
| 2026-06-14 | FE-STATE-008 | Hoàn thành | Tách lỗi tải cơ sở/liên kết chuyên khoa khỏi thông báo submit; migrate loading/error/empty state và thêm retry an toàn | `npm.cmd run lint`; `npm.cmd run build`; Admin state 8 passed; Facilities 2 passed, gồm viewport 390x844; accessibility 14 passed; CTA retry 44 px và không tràn ngang |
| 2026-06-14 | FE-AUTH-009 | Hoàn thành | Hợp nhất `firstLogin`/`isProfileCompleted`; giới hạn onboarding cho Patient; không dùng auth storage cho phone; dùng validation chung và lỗi field có liên kết ARIA | `npm.cmd run lint`; `npm.cmd run build`; auth/profile/payment/upload 19 passed; accessibility 14 passed |
| 2026-06-14 | FE-PAY-010 | Hoàn thành | `/payment/cancel` kết thúc ngay ở trạng thái đã hủy, không poll status API và không thay đổi entitlement | Payment result 2 passed; browser xác nhận trạng thái `Đã hủy` hiển thị ngay |
| 2026-06-14 | FE-SEC-011 | Hoàn thành | Decode ảnh hợp lệ vào canvas thay vì gắn file URL vào DOM; giới hạn JPG/PNG/WEBP 10 MB; thêm quyền workflow tối thiểu | Medication upload 1 passed; không còn `createObjectURL`/`img src={preview}`; `git diff --check` passed |
| 2026-06-14 | FE-SEC-012 | Hoàn thành | Whitelist auth storage và tự làm sạch phiên cũ; loại email, tên, địa chỉ, số điện thoại và refresh token khỏi localStorage | `npm.cmd run lint`; `npm.cmd run build`; auth/profile/backend contract 22 passed; payment/upload 3 passed; accessibility 14 passed; không còn đường `phoneNumber` tới `setStoredAuth` |
| 2026-06-14 | FE-DOC-013 | Hoàn thành | Chuẩn hóa backend backlog; cập nhật contract live; thêm delivery status, phụ thuộc, contract, test và bằng chứng nghiệm thu | 18 ticket hợp lệ; code fence/link Markdown hợp lệ; `git diff --check` passed |
| 2026-06-14 | FE-MAP-014 | Hoàn thành | Thêm map loading/error/retry; loại tọa độ giả; giữ list fallback; thêm keyboard, skip link, reduced motion và responsive | `npm.cmd run lint`; `npm.cmd run build`; map 4 passed; backend contract 5 passed; accessibility 14 passed; browser desktop/mobile không tràn ngang và không console error |
| 2026-06-15 | FE-PLAN-015 | Hoàn thành | Tạo frontend delivery backlog cho Doctor invitation/workspace, Admin Doctors responsive, landing fake map, production mock audit, UX, performance, accessibility và regression test | Đối chiếu code, test, Swagger và ảnh lỗi; kiểm tra Markdown/link và `git diff --check` |
| 2026-06-15 | FE-AUTH-016 | Hoàn thành | Chuyển email invitation sang login bằng History state tạm thời; giữ `returnTo=/app/staff`; xác minh role Doctor/Staff từ response hoặc JWT; xóa phiên khi role không khớp; giữ tài khoản inactive/sai mật khẩu tại login | `npm.cmd run lint`; `npm.cmd run build`; Doctor invitation 14 passed; navigation 16 passed; accessibility 14 passed |
| 2026-06-15 | FE-ADMIN-018 | Hoàn thành | Chuyển Admin Doctors sang table semantic ở desktop và card có nhãn ở viewport hẹp; giữ action; đồng bộ filter/page vào URL; sửa overflow với dữ liệu tiếng Việt dài | Admin Doctors 3 passed trên 390/640/768/1024/1280/1440 px; visual 28 passed |
| 2026-06-15 | FE-LANDING-019 | Hoàn thành | Xóa cơ sở, khoảng cách và thời gian chờ giả; thay landing map bằng preview/CTA thật; lazy-load route MapLibre; sửa semantics danh sách `/map` | Landing production 2 passed; map 4 passed; accessibility `/map` passed; performance 4 passed; browser desktop/mobile không console error |
| 2026-06-15 | FE-PROFILE-025..FE-POLISH-029 | Chưa bắt đầu | Cập nhật backlog theo Swagger live và yêu cầu UX mới: mở hồ sơ cho mọi gói, menu avatar, diagnosis yes/no, onboarding hồ sơ nhẹ nhàng, xếp hạng bệnh viện và polish luồng chính | Đối chiếu Swagger live `http://52.77.210.243:8080/swagger/v1/swagger.json`; chưa chạy test vì chỉ cập nhật tài liệu |
| 2026-06-15 | FE-PROFILE-025, FE-ONBOARD-027 | Đang thực hiện | Bỏ premium gate hồ sơ; chuyển cài đặt hiển thị vào menu avatar cùng Hồ sơ, Lịch sử giao dịch, Đăng xuất; bỏ redirect cứng profile setup sau auth | `npm.cmd run lint`; `npm.cmd run build`; route 50 passed, 1 skipped; navigation 17 passed; personalization 1 passed |
| 2026-06-15 | FE-DX-026 | Đang thực hiện | Thay `/symptom` bằng flow diagnosis theo Swagger mới: nhập triệu chứng, lấy câu hỏi yes/no, gửi câu trả lời, hiển thị chẩn đoán/khoa/cơ sở y tế và CTA bản đồ | `npm.cmd run lint`; `npm.cmd run build`; symptom diagnosis 1 passed; backend contract 4 passed, 1 skipped legacy `/analyze` |
| 2026-06-16 | FE-DX-030, FE-AUTH-031 | Hoàn thành | Gom entry chẩn đoán vào dashboard; bỏ `/symptom` khỏi sidebar/mobile; chuyển CTA phân tích về `/dashboard`; Google login trong context Doctor invitation xác minh role qua `/api/users/me` và chặn tài khoản Patient | `npm.cmd run lint`; `npm.cmd run build`; Playwright dashboard/navigation/doctor-invitation/routes 84 passed, 1 skipped |
| 2026-06-16 | FE-ONBOARD-027, FE-FACILITY-028 | Hoàn thành | Thêm prompt hồ sơ nhẹ nhàng trong dashboard có thể bỏ qua; bổ sung xếp hạng cơ sở theo chuyên khoa, vị trí người dùng nếu được cấp quyền, tọa độ/rating thật từ backend và lý do xếp hạng | `npm.cmd run lint`; dashboard UX 4 passed |
| 2026-06-16 | FE-POLISH-029 | Hoàn thành | Đưa Hồ sơ vào navigation chính; giữ giao dịch/cài đặt trong menu avatar; thêm recovery action cho lỗi/empty/result của tư vấn chuyên khoa; hạ copy y tế từ chẩn đoán chắc chắn sang nhận định tham khảo; xác nhận các capability demo đã được gắn nhãn | `npm.cmd run lint`; `npm.cmd run build`; dashboard UX/navigation/doctor-invitation/routes; `git diff --check` |

| 2026-06-17 | FE-PROD-020, P0/P1 hardening | Hoàn thành | Loại AI provider trực tiếp khỏi client; chuyển chatbot qua API backend; chuẩn hóa env/Vercel rewrite và security headers; thêm centralized API auth error helpers; lập mock/demo inventory; render lại `/#demo` với safety note; gắn nhãn demo/fallback cho records, medication và patient map; bổ sung route role/premium guard và production safety regression | `npm.cmd run lint`; `npm.cmd run build`; route 51 passed, 1 skipped; landing production 3 passed; accessibility 14 passed; performance 4 passed; visual 28 passed; `git diff --check` |
| 2026-06-18 | FE-PROD-020 Vercel CI | Hoàn thành | Thay programmatic config bị Git integration parse sai bằng `vercel.json` tĩnh; giữ backend origin qua `$BACKEND_API_ORIGIN`; giữ SPA fallback và security headers; ignore metadata `.vercel` cục bộ | `npm.cmd run lint`; `npm.cmd run build`; Vercel preview `READY`; kiểm tra `/`, SPA route và response security headers bằng `vercel curl` |
| 2026-06-19 | FE-REFACTOR-032 | Hoàn thành | Tách overview và users khỏi `AdminWorkspacePage.jsx` thành component theo domain; giữ state, API, mutation, route, selector và CSS contract hiện tại | Baseline: lint/build pass, route 51 passed/1 skipped; sau refactor: lint/build pass; route, accessibility và Admin 76 passed/1 skipped; `git diff --check` |


## Mẫu cập nhật

Sao chép khối sau khi bắt đầu nhiệm vụ mới:

```md
### FE-XXX: Tên nhiệm vụ

- [ ] Xác nhận phạm vi và tiêu chí hoàn thành.
- [ ] Kiểm tra code và API contract liên quan.
- [ ] Hoàn thành triển khai.
- [ ] Hoàn thành kiểm tra phù hợp.
- [ ] Cập nhật tài liệu và nhật ký thay đổi.
```

Thêm một dòng vào bảng nhật ký với ngày cập nhật, mã nhiệm vụ, trạng thái, mô tả
file hoặc hành vi đã thay đổi và các lệnh kiểm tra thực tế đã chạy.
