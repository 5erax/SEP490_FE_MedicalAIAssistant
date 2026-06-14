# Kế hoạch khôi phục và ổn định bản đồ cơ sở y tế

Kế hoạch này xử lý tình trạng người dùng không xem được bản đồ tại `/map`. Phạm vi gồm khả năng render MapLibre, tải map style, dữ liệu tọa độ, trạng thái lỗi, responsive, accessibility và kiểm thử hồi quy.

**Trạng thái triển khai:** Hoàn thành ngày 2026-06-14.

## Kết quả chẩn đoán ngày 2026-06-14

Không tái hiện được lỗi liên tục tại thời điểm kiểm tra:

- Local `http://127.0.0.1:3000/map` render canvas, map style và một facility
- Production `https://sep-490-fe-medical-ai-assistant.vercel.app/map` render canvas, map style và một facility
- Console không ghi nhận lỗi hoặc cảnh báo liên quan
- API active facilities trả một facility nhưng `latitude` và `longitude` là `null`

Các rủi ro đã xác định:

1. `NearbyClinicPage` render vùng bản đồ trống trong lúc MapLibre và style bên ngoài đang tải, nhưng không có loading hoặc error overlay.
2. Map style phụ thuộc trực tiếp vào `https://basemaps.cartocdn.com`. Khi request bị chặn, timeout hoặc mất mạng, người dùng không nhận được thông báo và thao tác thay thế.
3. `normalizeFacility` thay tọa độ thiếu bằng tọa độ mặc định. Marker vì vậy hiển thị sai vị trí và nút chỉ đường có thể mở địa điểm không chính xác.
4. Kiểm thử hiện tại xác nhận review payload và facility card, nhưng chưa xác nhận canvas, style load, map error hoặc dữ liệu tọa độ thiếu.
5. Interactive map chưa có skip link riêng, trạng thái lỗi có thể truy cập và danh sách địa điểm làm text alternative rõ ràng.

## Mục tiêu

- `/map` luôn hiển thị một trong ba trạng thái rõ ràng: đang tải, bản đồ tương tác, hoặc fallback có danh sách cơ sở
- Không hiển thị marker hoặc chỉ đường bằng tọa độ giả
- Lỗi tải style, WebGL hoặc API không làm mất danh sách cơ sở và hành động gọi điện
- Desktop và mobile giữ được list/map parity
- Có test hồi quy cho route, canvas, dữ liệu thiếu và lỗi style

## Ngoài phạm vi

- Không xây API tìm kiếm theo bán kính trong task này
- Không tự geocode địa chỉ ở frontend
- Không thêm map provider trả phí hoặc API key mới
- Không thay đổi business rule của feedback review

## Giai đoạn 1: Tái hiện và thêm quan sát runtime

**File dự kiến**

- `src/pages/NearbyClinicPage.jsx`
- `tests/e2e/map-ux.spec.js`

**Công việc**

- Ghi nhận `onLoad`, `onError` và timeout tải map
- Phân biệt lỗi API facility, lỗi map style và lỗi WebGL
- Thêm trạng thái `mapStatus`: `loading`, `ready`, `error`
- Hiển thị thông báo an toàn, không đưa raw exception hoặc URL nhạy cảm ra UI
- Chụp bằng chứng trên desktop và mobile cho từng trạng thái

**Hoàn thành khi**

- Có thể tái hiện trạng thái lỗi bằng cách chặn request map style trong Playwright
- UI phân biệt rõ lỗi dữ liệu và lỗi renderer
- Console không có unhandled exception

## Giai đoạn 2: Loại tọa độ giả và chuẩn hóa dữ liệu facility

**File dự kiến**

- `src/pages/NearbyClinicPage.jsx`
- `src/services/facilityService.js` hoặc utility normalize riêng nếu cần dùng lại
- `tests/e2e/backend-contract-ui.spec.js`

**Công việc**

- Chỉ chấp nhận latitude trong `[-90, 90]` và longitude trong `[-180, 180]`
- Đánh dấu facility thiếu tọa độ bằng `hasValidCoordinates: false`
- Không tạo marker, không fly-to và không tạo Google Maps direction URL khi tọa độ không hợp lệ
- Vẫn hiển thị facility trong danh sách với nhãn “Chưa có vị trí trên bản đồ”
- Chỉ chọn facility đầu tiên có tọa độ hợp lệ để mở popup
- Yêu cầu backend bổ sung tọa độ thật theo `BE-006`

**Hoàn thành khi**

- Facility thiếu tọa độ không xuất hiện tại vị trí mặc định
- Nút chỉ đường bị ẩn hoặc disabled với mô tả rõ
- Facility có tọa độ hợp lệ vẫn hoạt động như trước

## Giai đoạn 3: Thêm fallback khi map style hoặc WebGL lỗi

**File dự kiến**

- `src/pages/NearbyClinicPage.jsx`
- Có thể thêm `src/components/map/MapFallback.jsx` nếu component đủ dùng lại

**Công việc**

- Thêm overlay loading trong vùng map thay vì để vùng trắng
- Khi style hoặc WebGL lỗi, thay canvas bằng fallback có:
  - Tên và địa chỉ cơ sở
  - Trạng thái tọa độ
  - Gọi điện nếu có số hợp lệ
  - Mở chỉ đường nếu có tọa độ hợp lệ
  - Nút thử tải lại bản đồ
- Giữ danh sách facility bên cạnh hoặc phía dưới trên mobile
- Không retry vô hạn; giới hạn một retry chủ động từ người dùng

**Hoàn thành khi**

- Chặn CARTO style không làm trang trắng
- Người dùng vẫn xem và chọn được cơ sở
- Retry thành công chuyển từ fallback sang map mà không reload toàn trang

## Giai đoạn 4: Responsive và accessibility

**File dự kiến**

- `src/pages/NearbyClinicPage.jsx`
- Styles liên quan đến map nếu được tách khỏi component

**Công việc**

- Thêm skip link “Bỏ qua bản đồ, đến danh sách cơ sở”
- Đặt tên truy cập rõ cho vùng map và trạng thái loading/error
- Đổi marker thành button có accessible name
- Cho phép chọn facility hoàn toàn bằng keyboard từ danh sách
- Giữ focus khi mở/đóng popup và khi retry map
- Tắt animation fly-to khi `prefers-reduced-motion: reduce`
- Kiểm tra viewport desktop, `390x844` và landscape mobile

**Hoàn thành khi**

- Thông tin facility trên map có bản text tương đương
- Search, filter, chọn facility và retry dùng được bằng keyboard
- Không tràn ngang hoặc che toàn bộ danh sách trên mobile

## Giai đoạn 5: Kiểm thử hồi quy

**Test mới hoặc mở rộng**

- Route `/map` render đúng page title và nội dung chính
- Map canvas xuất hiện khi style load thành công
- Chặn map style hiển thị fallback và retry
- API facility lỗi hiển thị data error riêng
- Facility thiếu tọa độ không tạo marker hoặc direction URL
- Facility có tọa độ tạo marker và chọn từ list cập nhật popup
- Search/filter giữ list và marker đồng bộ
- Geolocation denied hiển thị lỗi nhưng không làm mất map
- Mobile giữ được map và danh sách
- Axe không có lỗi nghiêm trọng mới

**Lệnh kiểm tra**

```powershell
npm.cmd run lint
npm.cmd run build
npx.cmd playwright test tests/e2e/map-ux.spec.js
npx.cmd playwright test tests/e2e/backend-contract-ui.spec.js
npm.cmd run test:e2e:a11y
```

## Thứ tự triển khai

1. Giai đoạn 1 để có bằng chứng lỗi và trạng thái runtime
2. Giai đoạn 2 để loại dữ liệu sai
3. Giai đoạn 3 để trang không còn trắng khi provider lỗi
4. Giai đoạn 4 để hoàn thiện responsive và accessibility
5. Giai đoạn 5 để khóa hồi quy trước khi merge

## Tiêu chí đóng task

- Production `/map` không có blank state không giải thích
- Facility thiếu tọa độ không được hiển thị tại tọa độ giả
- Lỗi style, API hoặc WebGL đều có fallback và retry rõ ràng
- Danh sách facility vẫn dùng được khi map không render
- Toàn bộ kiểm thử map, contract, accessibility, lint và build pass
- Checklist `FE-MAP-014` và PR description ghi đủ thay đổi, kiểm thử và giới hạn backend

## Kết quả triển khai

- Thêm `mapStatus` với các trạng thái `loading`, `ready` và `error`
- Thêm timeout, `onLoad`, `onError`, error boundary và retry bằng remount MapLibre
- Không còn thay tọa độ `null` bằng tọa độ mặc định
- Facility thiếu tọa độ vẫn có trong danh sách nhưng không tạo marker hoặc direction URL
- Thêm loading overlay, fallback, skip link, marker button và keyboard selection
- Tôn trọng `prefers-reduced-motion` khi fly-to và scroll
- Thêm `tests/e2e/map-ux.spec.js` cho success, missing coordinates, style failure/retry và geolocation denied

Kết quả kiểm tra:

- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass, còn cảnh báo chunk size hiện có
- Map E2E: 4 passed
- Backend contract E2E: 5 passed
- Accessibility: 14 passed
- Browser desktop `1280x720`: không tràn ngang, không console error
- Browser mobile `390x844`: map và danh sách cùng hiển thị, không tràn ngang
