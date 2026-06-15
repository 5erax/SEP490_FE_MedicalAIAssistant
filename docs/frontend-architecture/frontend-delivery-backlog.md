# Frontend delivery backlog

Ngày đối chiếu: 2026-06-15.

Tài liệu này chuyển các vấn đề chức năng và giao diện hiện tại thành ticket có
thể giao trực tiếp cho frontend developer. Trạng thái thực hiện được theo dõi
tại [Frontend task checklist](./task-checklist.md).

## 1. Bằng chứng và giới hạn hiện tại

- Doctor invitation đã có validate/register và test riêng, nhưng test dừng ở
  trang đăng nhập. Chưa có E2E bao phủ toàn bộ chuỗi invitation -> đăng ký ->
  đăng nhập -> mở đúng Doctor workspace.
- Role `Doctor` hiện được ánh xạ vào `/app/staff`, nhưng trang này chỉ quản lý
  danh mục chuyên khoa. Nội dung và quyền thao tác chưa phù hợp với một bác sĩ.
- Swagger hiện có auth, user profile, doctor directory và invitation; chưa có
  endpoint Doctor workspace, lịch khám, danh sách bệnh nhân hoặc hồ sơ lâm sàng.
  Frontend không được dựng các số liệu hoặc tác vụ này bằng dữ liệu giả.
- Bảng Admin Doctors có `min-width: 940px`, cột bác sĩ có `min-width: 220px` và
  nhóm thao tác nhiều nút. Ở chiều rộng hẹp, cột đầu bị khuất, nội dung xuống
  dòng quá mức và thanh cuộn ngang xuất hiện ngay cả khi chỉ có một bản ghi.
- Landing page đang dùng `MEDICAL_LOCATIONS` hard-code, gồm khoảng cách và thời
  gian chờ không đến từ backend. `hospitalRecommendations.js` cũng còn danh sách
  bệnh viện giả dùng trong luồng medical assistant.
- Route `/map` đã dùng API cơ sở y tế thật và có fallback khi thiếu tọa độ. Đây
  phải là nguồn trải nghiệm bản đồ production, không nhân đôi một bản đồ demo ở
  landing page.
- Swagger live ngày 2026-06-15 đã có luồng chẩn đoán theo câu hỏi lâm sàng:
  `POST /api/symptom-analysis/suggest-clinical-questions` nhận `userInput`,
  trả `sessionId` và danh sách câu hỏi; `POST
  /api/symptom-analysis/submit-clinical-question-answers` nhận câu trả lời
  yes/no và trả `analysis`, `primaryDiagnosis`, `recommendedDepartment` và
  `recommendedFacilities`.
- Hồ sơ bệnh nhân đã có contract riêng ở `/api/patient-profiles`; vì vậy xem và
  cập nhật hồ sơ không nên bị khóa sau gói Premium. Hồ sơ là dữ liệu nền tảng
  của trải nghiệm, không phải quyền lợi trả phí.

## 2. Thứ tự triển khai

| Thứ tự | Ticket | Ưu tiên | Kết quả cần đạt |
| --- | --- | --- | --- |
| 1 | FE-AUTH-016 | P0 | Người nhận invitation đăng nhập và vào đúng Doctor workspace |
| 2 | FE-ADMIN-018 | P0 | Bảng quản lý bác sĩ không vỡ ở desktop, tablet và mobile |
| 3 | FE-LANDING-019 | P0 | Landing không hiển thị dữ liệu cơ sở y tế giả |
| 4 | FE-TEST-024 | P0 | Có regression guard cho ba lỗi trên |
| 5 | FE-DOCTOR-017 | P1 | Doctor workspace có cấu trúc chuyên nghiệp, đúng contract |
| 6 | FE-PROD-020 | P1 | Không còn capability demo bị trình bày như dữ liệu production |
| 7 | FE-UX-021 | P1 | Trạng thái, copy và luồng phục hồi nhất quán |
| 8 | FE-PERF-022 | P2 | Giảm tải ban đầu và cô lập bundle nặng |
| 9 | FE-A11Y-023 | P2 | Critical flow dùng được bằng keyboard, zoom và screen reader |
| 10 | FE-PROFILE-025 | P0 | Hồ sơ, cài đặt hiển thị, lịch sử giao dịch và đăng xuất nằm trong menu avatar |
| 11 | FE-DX-026 | P0 | Chẩn đoán triệu chứng theo câu hỏi yes/no và trả kết quả có điều hướng bệnh viện |
| 12 | FE-ONBOARD-027 | P0 | Người dùng vào app ngay sau đăng nhập; cập nhật hồ sơ là gợi ý nhẹ nhàng |
| 13 | FE-FACILITY-028 | P1 | Xếp hạng bệnh viện theo chuyên khoa liên quan, khoảng cách, đánh giá và dữ liệu sẵn có |
| 14 | FE-POLISH-029 | P1 | Nâng trải nghiệm frontend lên mức sản phẩm chuyên nghiệp, ưu tiên luồng chính |

Không bắt đầu FE-DOCTOR-017 bằng cách tự tạo lịch khám, bệnh nhân hoặc chỉ số
hoạt động. Những capability đó chỉ được thêm sau khi product scope và backend
contract được duyệt.

## 3. Ticket triển khai

### FE-AUTH-016: Hoàn tất luồng Doctor invitation đến workspace

**Mục tiêu:** người được mời tạo tài khoản xong có thể đăng nhập bằng chính email
được mời và được điều hướng ổn định đến không gian Doctor.

**Phạm vi dự kiến**

- `src/pages/DoctorRegisterInvitationPage.jsx`
- `src/pages/AuthPages.jsx`
- `src/services/authService.js`
- `src/router/returnIntent.js`
- `src/utils/roles.js`
- `tests/e2e/doctor-invitation.spec.js`
- `tests/e2e/navigation-ux.spec.js`

**Checklist**

- [x] Giữ email invitation trong bước chuyển sang đăng nhập mà không lưu token
  invitation hoặc PII vào `localStorage`.
- [x] Hiển thị success state có CTA rõ ràng; không phụ thuộc duy nhất vào redirect
  theo timer.
- [x] Gửi login request đúng contract và kiểm tra role từ response lẫn JWT claim.
- [x] Xác minh `Doctor`, `doctor`, role đơn và mảng role đều mở `/app/staff`.
- [x] Không đưa Doctor qua onboarding hồ sơ Patient khi
  `firstLogin=true/isProfileCompleted=false`.
- [x] Khi `/api/users/me` trả role khác login response, áp dụng một quy tắc ưu
  tiên nhất quán và hiển thị permission state thay vì vòng redirect.
- [x] Thêm E2E nối liền validate invitation, register, login và Doctor workspace.
- [x] Thêm case account inactive, invitation đã dùng, login sai mật khẩu và role
  bị thiếu.

**Tiêu chí nghiệm thu**

- Doctor đăng ký từ invitation có thể đăng nhập ngay mà không nhập lại hồ sơ.
- URL cuối là `/app/staff`; refresh và Back/Forward không đưa về Patient setup.
- Không lưu email, số điện thoại hoặc invitation token trong auth storage.
- Lỗi backend được hiển thị an toàn, có hướng xử lý và không lộ chi tiết nội bộ.

### FE-DOCTOR-017: Xây Doctor workspace chuyên nghiệp theo contract thật

**Mục tiêu:** thay giao diện quản lý chuyên khoa chung bằng một workspace có cấu
trúc phù hợp với Doctor, đồng thời giữ Staff/Admin capability đúng quyền.

**Thiết kế đề xuất**

- Header: tên hiển thị, role, trạng thái tài khoản và cơ sở/khoa đang công tác.
- Khối hồ sơ nghề nghiệp: học hàm/học vị, vai trò khoa, kinh nghiệm và trạng thái
  liên kết tài khoản.
- Quick actions chỉ trỏ đến capability đang tồn tại thật, ví dụ xem hồ sơ tài
  khoản, tìm cơ sở, mở trợ lý chuyên khoa và đăng xuất.
- Khu vực quản lý danh mục chuyên khoa chỉ xuất hiện nếu backend xác nhận quyền
  Staff/Admin tương ứng; Doctor thông thường không mặc định có quyền CRUD.
- Loading, empty, partial-data, permission-denied và retry state riêng.

**Checklist**

- [ ] Tách shell Doctor/Staff khỏi business form quản lý chuyên khoa.
- [ ] Tạo navigation model và page title riêng cho Doctor.
- [ ] Dùng `/api/users/me` cho thông tin tài khoản hiện có.
- [ ] Không gọi danh sách toàn bộ doctors để suy đoán hồ sơ của người đang đăng
  nhập.
- [ ] Chỉ render trường nghề nghiệp đã có contract; không hiển thị KPI, lịch khám,
  bệnh nhân hoặc lượt tư vấn giả.
- [ ] Giữ mobile layout một cột, CTA tối thiểu 44 px và không tràn ngang.
- [ ] Thêm skeleton/data states và error recovery tại từng vùng dữ liệu.
- [ ] Thêm test role Doctor, Staff, Admin và role không hợp lệ.

**Phụ thuộc backend**

- Cần endpoint an toàn như `GET /api/doctors/me`, trả `DoctorResponse` của tài
  khoản hiện tại và phân biệt rõ `404 profile not linked` với `403 forbidden`.
- Nếu endpoint chưa sẵn sàng, phase đầu chỉ hiển thị account summary từ
  `/api/users/me` và trạng thái “Hồ sơ nghề nghiệp chưa được liên kết”.

**Tiêu chí nghiệm thu**

- Doctor nhìn thấy danh tính và bối cảnh nghề nghiệp của chính mình.
- Không thấy nút CRUD danh mục nếu không có quyền.
- Không có dữ liệu lâm sàng, lịch khám hoặc thống kê được hard-code.

### FE-ADMIN-018: Sửa responsive layout quản lý bác sĩ

**Mục tiêu:** danh sách bác sĩ đọc và thao tác được ở mọi viewport mà không làm
khuất cột đầu hoặc ép nút thao tác thành nhiều dòng khó dùng.

**Phạm vi dự kiến**

- `src/components/adminDoctors/DoctorFilters.jsx`
- `src/components/adminDoctors/DoctorTable.jsx`
- `src/components/ui/Table.jsx`
- `src/styles/operator-workspace.css`
- `tests/e2e/admin-doctors.spec.js`
- `tests/e2e/visual.spec.js`

**Checklist**

- [x] Chốt chiến lược responsive: table đầy đủ ở desktop; compact row/card hoặc
  cột ưu tiên + action menu ở mobile.
- [x] Loại việc cột “Bác sĩ” bị khuất ở vị trí cuộn mặc định.
- [x] Không ép bảng `940px` cho viewport không đủ chỗ nếu không có chỉ dẫn cuộn
  và keyboard access rõ ràng.
- [x] Giới hạn hợp lý độ rộng tên bệnh viện/khoa; cho phép wrap có kiểm soát.
- [x] Nhóm Sửa/Tạm ẩn/Xóa trong vùng thao tác riêng của card ở viewport hẹp.
- [x] Giữ caption, `scope="col"` và tên truy cập cho vùng cuộn/card.
- [x] Đồng bộ filter vào URL để refresh/Back giữ search, filter, page và page size.
- [x] Kiểm tra tên bác sĩ, khoa và bệnh viện tiếng Việt dài.
- [x] Kiểm tra 390, 640, 768, 1024, 1280 và 1440 px.

**Tiêu chí nghiệm thu**

- Không có nội dung bị cắt ở cột đầu và không có overflow toàn trang.
- Một bản ghi không tạo thanh cuộn ngang vô nghĩa ở desktop đủ rộng.
- Mọi action dùng được bằng keyboard và có confirm cho thao tác phá hủy.
- Filter và phân trang không mất sau refresh hoặc Back.

### FE-LANDING-019: Loại dữ liệu bản đồ giả khỏi landing page

**Mục tiêu:** landing chỉ mô tả capability có thật và không trình bày khoảng
cách, thời gian chờ hoặc khả năng đặt lịch không có nguồn dữ liệu.

**Phương án khuyến nghị**

Thay bản đồ tương tác ở landing bằng preview nhẹ gồm nội dung giới thiệu và CTA
“Mở bản đồ cơ sở y tế”. Preview có thể hiển thị tối đa một số cơ sở từ
`medicalFacilitiesApi.active()` nếu dữ liệu hợp lệ, nhưng không tự tính khoảng
cách và không dựng marker khi thiếu tọa độ.

**Checklist**

- [x] Xóa `MEDICAL_LOCATIONS`, thời gian chờ và khoảng cách hard-code.
- [x] Xóa copy “đặt lịch” hoặc “lưu địa điểm” nếu chưa có capability production.
- [x] Dùng CTA điều hướng SPA đến `/map`.
- [x] Dùng preview tĩnh không cần giả lập loading hoặc dữ liệu cơ sở.
- [x] Không thay tọa độ thiếu bằng tọa độ mặc định để tạo marker giả.
- [x] Không tải MapLibre trên landing nếu người dùng chưa mở `/map`.
- [x] Thêm test bảo đảm tên bệnh viện mẫu cũ không còn trên landing.

**Tiêu chí nghiệm thu**

- Landing không còn cơ sở, khoảng cách hoặc thời gian chờ hard-code.
- Người dùng hiểu đây là đường dẫn đến công cụ tìm cơ sở, không phải đặt lịch.
- `/map` tiếp tục là nơi duy nhất render bản đồ cơ sở production.

### FE-PROD-020: Audit và kiểm soát capability demo

**Checklist**

- [ ] Lập danh sách mọi `MOCK_`, `DEMO_`, fixture và TODO thay API trong `src/`.
- [ ] Xử lý `hospitalRecommendations.js`: nối contract thật hoặc loại khỏi luồng
  production.
- [ ] Audit `/records`, `/medication` và các kết quả AI mẫu.
- [ ] Ẩn capability chưa sẵn sàng khỏi production navigation hoặc gắn nhãn demo
  rõ ràng theo product decision.
- [ ] Không dùng mock fallback sau lỗi API production.
- [ ] Thêm test phát hiện chuỗi/dataset demo quan trọng trên production surface.

### FE-UX-021: Chuẩn hóa UX cho critical flow

**Checklist**

- [ ] Chuẩn hóa busy, success, error, empty, permission và retry copy.
- [ ] Mọi submit chống double-submit và giữ dữ liệu form khi lỗi có thể sửa.
- [ ] Mọi lỗi validation liên kết đúng field và đưa focus đến error summary.
- [ ] Mọi tác vụ dài có progress; không để trạng thái “đang kiểm tra” vô hạn.
- [ ] Trạng thái filter/tab/page quan trọng được lưu trong URL.
- [ ] Audit copy trộn Anh/Việt, internal ID và thông tin kỹ thuật lộ ra UI.
- [ ] Thêm đường lui rõ ràng cho auth expired, permission denied và API timeout.

### FE-PERF-022: Tối ưu tải trang và bundle

**Checklist**

- [ ] Ghi baseline bundle, LCP và request theo route trước khi sửa.
- [ ] Lazy-load `/map`, admin, medical assistant và các page hiếm dùng.
- [ ] Đảm bảo landing không request MapLibre hoặc map style.
- [ ] Tách section nặng khỏi initial `App.jsx` import graph.
- [ ] Tránh refetch trùng dữ liệu profile/facility trong cùng navigation.
- [ ] Kiểm tra slow network và không dùng skeleton làm dịch chuyển layout.
- [ ] Cập nhật performance budget bằng số đo trước/sau, không đặt số tùy ý.

### FE-A11Y-023: Hoàn thiện accessibility cho luồng mới

**Checklist**

- [ ] Keyboard-only cho invitation, Doctor workspace, filter và row action.
- [ ] Focus visible, restore focus và Escape cho menu/dialog.
- [ ] Live region cho kết quả tải, lưu và lỗi không đồng bộ.
- [ ] Table/card mobile giữ tên trường và quan hệ dữ liệu.
- [ ] Kiểm tra 200% zoom, forced colors, reduced motion và contrast AA.
- [ ] Screen reader smoke cho login Doctor và quản lý bác sĩ.
- [ ] Axe không có critical/serious issue trên surface đã thay đổi.

### FE-TEST-024: Regression suite cho Doctor và production data

**Checklist**

- [ ] E2E invitation -> register -> login -> Doctor workspace.
- [ ] E2E role matrix Doctor/Staff/Admin/Patient và missing role.
- [ ] Admin Doctors visual test với dữ liệu dài ở 390/768/1024/1440 px.
- [ ] Landing test không chứa cơ sở/thời gian chờ/khoảng cách giả.
- [ ] Test `/map` không hồi quy khi landing bỏ MapLibre.
- [ ] Route, accessibility, performance và visual suite chạy trong CI.
- [ ] Lưu screenshot/trace khi lỗi nhưng không commit dữ liệu người dùng thật.

### FE-PROFILE-025: Mở hồ sơ cho mọi người dùng và gom menu tài khoản

**Mục tiêu:** bỏ premium gate khỏi xem/cập nhật hồ sơ, đồng thời chuyển các tác
vụ tài khoản vào menu avatar để app gọn và dễ dùng hơn.

**Phạm vi dự kiến**

- `src/router/routes.js`
- `src/router/access.js`
- `src/components/workspace/UserWorkspaceShell.jsx`
- `src/components/preferences/DisplayPreferences.jsx`
- `src/pages/UserProfilePage.jsx`
- `src/pages/PersonalPatientProfilePage.jsx`
- `src/pages/PaymentResultPage.jsx`
- `tests/e2e/navigation-ux.spec.js`
- `tests/e2e/personalization.spec.js`

**Checklist**

- [ ] Bỏ yêu cầu Premium khỏi route xem hồ sơ và cập nhật hồ sơ.
- [ ] Khi bấm avatar hoặc vùng tài khoản, mở menu có Hồ sơ, Cài đặt hiển thị,
  Lịch sử giao dịch, Đăng xuất và các mục tài khoản thật sự có route.
- [ ] Chuyển cài đặt app/tùy chỉnh hiển thị khỏi vị trí ngoài app vào menu hoặc
  dialog tài khoản.
- [ ] Giữ keyboard access: mở bằng Enter/Space, đóng bằng Escape, restore focus.
- [ ] Không lộ email, số điện thoại hoặc dữ liệu y tế nhạy cảm trong menu tóm tắt.
- [ ] Thêm test cho user free mở hồ sơ, cập nhật hồ sơ và mở cài đặt hiển thị.

**Tiêu chí nghiệm thu**

- Người dùng free vào được hồ sơ và chỉnh sửa dữ liệu được backend cho phép.
- Menu avatar dùng được trên desktop/mobile, không che nội dung hoặc tràn màn hình.
- Đăng xuất vẫn xóa phiên an toàn và không lưu PII vào storage.

### FE-DX-026: Xây luồng chẩn đoán triệu chứng bằng câu hỏi yes/no

**Mục tiêu:** người dùng nhập triệu chứng, frontend gọi backend lấy câu hỏi lâm
sàng dạng yes/no, thu câu trả lời, sau đó hiển thị kết quả chẩn đoán và điều
hướng đến cơ sở y tế phù hợp.

**Contract đã xác minh**

- `POST /api/symptom-analysis/suggest-clinical-questions`
  - request: `{ userInput: string }`
  - response data: `{ sessionId, questions[] }`
- `POST /api/symptom-analysis/submit-clinical-question-answers`
  - request: `{ sessionId, answers: [{ questionId, answer: boolean }] }`
  - response data: `{ sessionId, userInput, answers, analysis }`
- `analysis` có `diagnoses`, `primaryDiagnosis`, `recommendedDepartment` và
  `recommendedFacilities`.

**Checklist**

- [ ] Thiết kế flow nhập triệu chứng -> câu hỏi yes/no -> kết quả -> CTA tìm
  bệnh viện.
- [ ] Tạo service cho hai endpoint mới, không tái dùng mock `hospitalRecommendations`.
- [ ] Hiển thị câu hỏi từng bước hoặc theo nhóm nhỏ, có tiến độ và lưu draft tạm
  trong memory/session an toàn.
- [ ] Kết quả phải có cảnh báo y tế: chỉ hỗ trợ định hướng, không thay thế bác sĩ.
- [ ] Xử lý `processing`, `completed`, `failed`, 400, 401 và 502 bằng copy an toàn.
- [ ] Cho phép người dùng xem lại câu trả lời và quay lại sửa trước khi gửi.
- [ ] Thêm lịch sử phiên từ `GET /api/symptom-analysis/my-sessions` nếu có đăng nhập.
- [ ] Thêm E2E cho success, không có câu hỏi, lỗi backend và kết quả cần cấp cứu.

**Tiêu chí nghiệm thu**

- Không có dữ liệu bệnh, bệnh viện hoặc kết quả AI hard-code trên production.
- Người dùng hiểu rõ bước hiện tại và có thể hoàn tất chỉ bằng bàn phím.
- Kết quả chẩn đoán luôn đi kèm khuyến cáo khám chuyên môn khi cần.

### FE-ONBOARD-027: Làm onboarding hồ sơ nhẹ nhàng sau đăng nhập

**Mục tiêu:** bỏ việc ép người dùng hoàn tất toàn bộ hồ sơ ngay sau đăng ký hoặc
đăng nhập; thay bằng hướng dẫn mềm, nhắc đúng thời điểm và không chặn luồng chính.

**Checklist**

- [ ] Sửa route guard để Patient vào app ngay cả khi `isProfileCompleted=false`.
- [ ] Không redirect cứng sang màn hình hồ sơ sau login/signup, trừ khi backend yêu
  cầu bắt buộc cho một tác vụ cụ thể.
- [ ] Thêm prompt nhẹ trong dashboard/menu avatar để cập nhật hồ sơ.
- [ ] Có tour hoặc checklist nhỏ cho người mới: mô tả triệu chứng, tìm cơ sở y tế,
  cập nhật hồ sơ, xem lịch sử giao dịch.
- [ ] Khi người dùng bắt đầu chẩn đoán hoặc tìm bệnh viện, nhắc bổ sung hồ sơ nếu
  thiếu dữ liệu hữu ích nhưng vẫn cho bỏ qua.
- [ ] Thêm test đảm bảo người dùng mới không bị kẹt ở profile setup.

### FE-FACILITY-028: Xếp hạng cơ sở y tế sau chẩn đoán

**Mục tiêu:** sau khi có `recommendedDepartment` hoặc danh sách cơ sở từ backend,
frontend trình bày lựa chọn bệnh viện theo thứ tự logic và minh bạch.

**Checklist**

- [ ] Ưu tiên 1: cơ sở có chuyên khoa/khoa liên quan với chẩn đoán hoặc ICD chapter.
- [ ] Ưu tiên 2: cơ sở gần người dùng nếu có quyền vị trí và tọa độ hợp lệ.
- [ ] Ưu tiên 3: đánh giá/số sao nếu backend cung cấp dữ liệu đáng tin cậy.
- [ ] Ưu tiên 4: trạng thái hoạt động, giờ mở cửa, loại cơ sở, số điện thoại và website.
- [ ] Không tự dựng rating, khoảng cách hoặc thời gian chờ khi backend không trả.
- [ ] Giải thích ngắn lý do xếp hạng từng cơ sở bằng dữ liệu thật có sẵn.
- [ ] Có fallback khi người dùng từ chối vị trí hoặc cơ sở thiếu tọa độ.

### FE-POLISH-029: Hoàn thiện UX frontend theo hướng sản phẩm chuyên nghiệp

**Checklist**

- [ ] Rà lại navigation chính để các tác vụ người dùng thật xuất hiện trước: chẩn
  đoán, tìm cơ sở, hồ sơ, giao dịch, cài đặt.
- [ ] Chuẩn hóa dashboard theo vai trò, bỏ card demo và CTA không dẫn đến chức năng thật.
- [ ] Chuẩn hóa empty/error/loading state trên profile, diagnosis, payment và map.
- [ ] Cải thiện mobile bottom/side navigation nếu tác vụ chính khó chạm.
- [ ] Rà copy y tế để không hứa hẹn chẩn đoán chắc chắn hoặc thay thế bác sĩ.
- [ ] Thêm kiểm tra responsive, accessibility và visual cho luồng avatar menu,
  onboarding mềm và diagnosis.

## 4. Definition of Ready

Một ticket chỉ bắt đầu khi:

- API path, method, auth, request và response liên quan đã được xác minh.
- Quyền của Doctor/Staff/Admin đã được product và backend thống nhất.
- Có fixture cho success, empty, partial, error và permission state.
- Không phụ thuộc vào dữ liệu sức khỏe hoặc tài khoản thật để test.
- Thiết kế responsive và copy chính đã được chốt.

## 5. Definition of Done

- Checklist ticket hoàn thành và được cập nhật trong `task-checklist.md`.
- Không thêm mock production, secret, PII hoặc medical data vào code/test/log.
- `npm.cmd run lint` và `npm.cmd run build` đạt.
- Test theo ticket, route và accessibility đạt; visual diff được review.
- Desktop/mobile, keyboard và 200% zoom đã được kiểm tra thủ công.
- Commit dùng Conventional Commit và PR description có `Summary`, `Testing`,
  `Notes`, gồm ticket ID, thay đổi, giới hạn và phụ thuộc backend còn lại.
