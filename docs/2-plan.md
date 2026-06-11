# Kế hoạch triển khai đăng ký tài khoản bác sĩ bằng invitation link

## 1. Mục tiêu

Triển khai trang public `/register-doctor?token=...` theo đặc tả trong `docs/2.md`.

Trang phải:

- Đọc invitation token trực tiếp từ query string, không lưu token vào `localStorage`.
- Kiểm tra token qua API trước khi hiển thị form.
- Hỗ trợ hai luồng:
  - Bác sĩ mới, chưa có Doctor profile.
  - Bác sĩ đã có Doctor profile nhưng chưa có tài khoản đăng nhập.
- Gửi payload đăng ký phù hợp với từng luồng.
- Hiển thị rõ trạng thái đang tải, lỗi token, lỗi validation, lỗi backend và đăng ký thành công.
- Điều hướng người dùng tới `/login` sau khi đăng ký thành công.

## 2. Phạm vi thay đổi dự kiến

### Routing

- Cập nhật `src/App.jsx`.
- Thêm route public `/register-doctor`.
- Route không yêu cầu đăng nhập và phải giữ nguyên query string để đọc token.

### API layer

- Cập nhật `src/services/endpoints.js` với:
  - `GET /api/doctor-invitations/validate?token={token}`
  - `POST /api/doctor-invitations/register`
- Tạo `src/services/doctorInvitationService.js`.
- Export service mới từ `src/services/api.js`.
- Dùng `apiRequest` hiện có với `auth: false`.
- Encode token bằng `URLSearchParams` hoặc `encodeURIComponent`.

### Trang đăng ký

- Tạo `src/pages/DoctorRegisterInvitationPage.jsx`.
- Tách rõ các trạng thái giao diện:
  - `validating`: đang kiểm tra invitation.
  - `invalid`: thiếu token, token sai, hết hạn hoặc đã dùng.
  - `ready-new`: token hợp lệ cho bác sĩ mới.
  - `ready-linked`: token hợp lệ và liên kết Doctor profile cũ.
  - `submitting`: đang gửi đăng ký.
  - `success`: đăng ký thành công.
- Email chỉ lấy từ response validate và hiển thị read-only.
- Hiển thị `doctorName` khi invitation đã liên kết profile cũ.

### Giao diện

- Tái sử dụng hệ thống class và component UI hiện có nếu phù hợp.
- Bổ sung style riêng trong một file CSS tập trung cho trang invitation, hoặc mở rộng style auth hiện có nếu cấu trúc tương thích.
- Bảo đảm responsive trên desktop và mobile.
- Bảo đảm label, trạng thái disabled, thông báo lỗi và focus có thể sử dụng bằng bàn phím.

## 3. Kế hoạch triển khai chi tiết

### Bước 1: Khai báo endpoint và service

1. Thêm nhóm `DOCTOR_INVITATIONS` vào `ENDPOINTS`.
2. Viết hàm `validateDoctorInvitation(token)`:
   - Từ chối sớm khi token rỗng.
   - Gọi endpoint validate bằng query string đã encode.
   - Trả về payload chuẩn của `apiRequest`.
3. Viết hàm `registerDoctorInvitation(payload)`:
   - Gửi `POST`.
   - Không gắn access token.
4. Giữ toàn bộ xử lý HTTP và lỗi backend trong API layer, tránh gọi `fetch` trực tiếp từ page.

### Bước 2: Khởi tạo và validate invitation

1. Đọc token một lần từ `window.location.search`.
2. Khi page mount:
   - Nếu không có token, chuyển ngay sang trạng thái invalid.
   - Nếu có token, gọi API validate.
3. Chỉ coi invitation hợp lệ khi `response.data.isValid === true`.
4. Lưu các dữ liệu cần thiết:
   - `email`
   - `expiresAt`
   - `doctorId`
   - `isLinkedToExistingDoctorProfile`
   - `doctorName`
5. Nếu request lỗi hoặc `isValid === false`, hiển thị màn hình lỗi và không render form.
6. Có cơ chế tránh cập nhật state sau khi component unmount trong môi trường React StrictMode.

### Bước 3: Xây dựng form theo hai luồng

Các trường dùng chung:

- Email, read-only.
- Full name.
- Password.
- Confirm password, chỉ dùng để validation phía FE.
- Phone number.

Các trường chỉ dành cho bác sĩ mới:

- Facility department.
- Department role.
- Qualification.
- Years of experience.

Với profile đã tồn tại:

- Hiển thị tên profile hiện có.
- Không yêu cầu các trường chuyên môn.
- Không gửi các field chuyên môn để tránh ghi đè dữ liệu cũ.

### Bước 4: Nạp lựa chọn FacilityDepartment

1. Kiểm tra response thực tế của API medical facilities hiện có.
2. Nếu facility detail/list có mảng departments:
   - Chuẩn hóa thành option `{ id, label }`.
   - `id` bắt buộc là `facilityDepartmentId`, không dùng `departmentId`.
   - Label nên có dạng `Tên cơ sở - Tên khoa`.
3. Nếu backend có endpoint FacilityDepartment riêng, bổ sung service tương ứng và ưu tiên endpoint đó.
4. Hiển thị trạng thái đang tải và lỗi tải danh sách.
5. Không cho submit luồng bác sĩ mới khi chưa chọn được `facilityDepartmentId`.

Điểm cần xác minh trước khi hoàn tất bước này:

- Shape chính xác của departments trong response medical facility.
- Endpoint public nào trả về `facilityDepartmentId`.
- Endpoint đó có yêu cầu authentication hay không.

### Bước 5: Validation phía frontend

Validation dùng chung:

- Token phải tồn tại và đã được validate hợp lệ.
- Full name không được rỗng.
- Password tối thiểu 8 ký tự.
- Password có chữ thường, chữ hoa, số và ký tự đặc biệt.
- Confirm password phải khớp password.
- Phone number chỉ được kiểm tra khi người dùng có nhập; dùng rule phù hợp số điện thoại Việt Nam nhưng không chặn các format backend chấp nhận.

Validation cho bác sĩ mới:

- `facilityDepartmentId` bắt buộc.
- `departmentRole` bắt buộc và phải là số từ 0 đến 4.
- `yearsOfExperience` phải là số nguyên không âm nếu có giá trị.
- Qualification được trim trước khi gửi.

Validation cho profile cũ:

- Không validate các field chuyên môn không hiển thị.

### Bước 6: Tạo payload và submit

Payload bác sĩ mới:

```json
{
  "token": "token-from-url",
  "fullName": "Doctor Test",
  "password": "Password123!",
  "phoneNumber": "0900000000",
  "facilityDepartmentId": "facility-department-id",
  "departmentRole": 0,
  "qualification": "General Doctor",
  "yearsOfExperience": 3
}
```

Payload profile cũ:

```json
{
  "token": "token-from-url",
  "fullName": "Doctor Test",
  "password": "Password123!",
  "phoneNumber": "0900000000"
}
```

Quy tắc submit:

- Không gửi `email`.
- Không gửi `confirmPassword`.
- Không gửi field chuyên môn trong luồng profile cũ.
- Disable nút submit trong lúc request đang chạy.
- Hiển thị đầy đủ `error.payload.errors` nếu backend trả về nhiều lỗi.
- Nếu token hết hạn hoặc đã dùng trong lúc submit, chuyển sang thông báo invitation không còn hợp lệ.

### Bước 7: Xử lý thành công và điều hướng

1. Hiển thị thông báo:
   - `Đăng ký tài khoản bác sĩ thành công. Vui lòng đăng nhập để tiếp tục.`
2. Cung cấp nút tới `/login`.
3. Có thể tự động điều hướng sau một khoảng ngắn, nhưng phải tránh khiến người dùng không kịp đọc trạng thái thành công.
4. Không tự động đăng nhập hoặc lưu response đăng ký vào auth storage.

### Bước 8: Hoàn thiện UX và accessibility

- Loading message khi validate token.
- Màn hình invalid/expired có hướng dẫn liên hệ quản trị viên.
- Các lỗi field hiển thị sát input tương ứng.
- Lỗi backend tổng quát hiển thị phía trên form.
- Input email có `readOnly`.
- Password inputs dùng `autoComplete="new-password"`.
- Nút submit có trạng thái disabled và text đang xử lý.
- Bố cục mobile không tạo horizontal scroll.

## 4. File dự kiến tạo hoặc sửa

- `src/App.jsx`
- `src/services/endpoints.js`
- `src/services/api.js`
- `src/services/doctorInvitationService.js` mới
- `src/pages/DoctorRegisterInvitationPage.jsx` mới
- File CSS phù hợp với cấu trúc style hiện tại
- Có thể cập nhật `src/services/facilityService.js` nếu cần chuẩn hóa danh sách FacilityDepartment

## 5. Kế hoạch kiểm thử

### Kiểm thử tự động/tĩnh

- Chạy `npm run lint`.
- Chạy `npm run build`.
- Nếu dự án bổ sung test runner sau này, tách validation và payload builder thành hàm thuần để unit test.

### Kiểm thử thủ công

1. Không có token:
   - Mở `/register-doctor`.
   - Kỳ vọng màn hình invalid, không gọi register.
2. Token hợp lệ cho bác sĩ mới:
   - API validate trả `isLinkedToExistingDoctorProfile: false`.
   - Kỳ vọng form đầy đủ.
   - Kỳ vọng payload có các field chuyên môn.
3. Token hợp lệ cho profile cũ:
   - API validate trả `isLinkedToExistingDoctorProfile: true`.
   - Kỳ vọng hiển thị `doctorName`.
   - Kỳ vọng payload không có các field chuyên môn.
4. Token hết hạn hoặc sai:
   - Kỳ vọng không hiển thị form.
5. Token hết hạn trong lúc submit:
   - Kỳ vọng hiển thị lỗi backend rõ ràng.
6. Token đã dùng:
   - Kỳ vọng hiển thị lỗi và không cho hiểu nhầm là đăng ký thành công.
7. Password không đạt rule:
   - Kỳ vọng FE chặn submit.
   - Nếu backend trả nhiều lỗi, hiển thị đủ từng lỗi.
8. Đăng ký thành công:
   - Kỳ vọng hiển thị success.
   - Kỳ vọng điều hướng tới `/login`.
9. Responsive:
   - Kiểm tra mobile và desktop.
10. Bảo mật:
   - Xác nhận token không xuất hiện trong `localStorage` hoặc auth storage.
   - Xác nhận email không có trong body register.

## 6. Tiêu chí hoàn thành

- Route `/register-doctor` hoạt động khi mở trực tiếp từ invitation email.
- Token được validate trước khi form xuất hiện.
- Hai loại invitation render đúng hai form khác nhau.
- Payload register đúng schema của từng loại invitation.
- Email không thể chỉnh sửa và không được gửi trong body register.
- Token không được lưu lâu dài phía client.
- FacilityDepartment sử dụng đúng `facilityDepartmentId`.
- Các lỗi phổ biến từ backend được hiển thị rõ ràng.
- Đăng ký thành công dẫn người dùng về login.
- `npm run lint` và `npm run build` hoàn tất không lỗi.

## 7. Thứ tự thực hiện đề xuất

1. Endpoint và service invitation.
2. Route và state machine của trang.
3. Form chung và validation.
4. Nhánh form bác sĩ mới/profile cũ.
5. Tích hợp FacilityDepartment.
6. Submit, lỗi backend và success redirect.
7. Styling, accessibility và responsive.
8. Lint, build và kiểm thử các case trong `docs/2.md`.
