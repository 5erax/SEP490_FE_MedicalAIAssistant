# Checklist cải thiện UI/UX toàn bộ màn hình

Cập nhật gần nhất: **2026-06-20**
Nhánh theo dõi: `FE-5era/diagnosis-ui-admin-tasks`

Tài liệu này là bảng tiến độ thực thi. Đọc cùng [UI/UX audit](./ui-audit.md),
[roadmap](./roadmap.md) và [product definition](../product-definition/README.md).
Checklist chỉ thay đổi cách trình bày và trải nghiệm; không tự ý đổi API, route,
quyền, validation, dữ liệu y tế hoặc nghiệp vụ.

## Quy ước trạng thái

- `[x]` Hoàn tất: đạt tiêu chí và đã có bằng chứng kiểm thử.
- `[~]` Đang làm: đã có nền tảng hoặc đã cải thiện một phần, còn tiêu chí chưa đạt.
- `[ ]` Chưa làm.
- `[-]` Bị chặn: cần backend hoặc quyết định sản phẩm trước khi triển khai.

Khi cập nhật một mục, ghi thêm bằng chứng ngay cuối dòng: file, test, ảnh kiểm tra
hoặc commit. Không đánh dấu `[x]` chỉ vì giao diện nhìn tốt ở một viewport.

### Snapshot tiến độ

| Trạng thái | Số tiêu chí |
| --- | ---: |
| Hoàn tất | 37 |
| Đang làm | 47 |
| Chưa làm | 90 |
| Bị chặn | 5 |
| **Tổng** | **179** |

Các số trên tính toàn bộ checkbox, gồm Definition of done, foundation, từng màn
hình và batch triển khai. Cập nhật bảng này trong cùng commit khi đổi trạng thái.

## Definition of done cho một màn hình

Mỗi màn hình chỉ được đánh dấu hoàn tất khi đáp ứng đủ các điều kiện áp dụng:

- [ ] Không đổi route, access gate, API contract, validation và hành vi nghiệp vụ.
- [ ] Có heading, mô tả ngữ cảnh và hành động chính rõ ràng.
- [ ] Có trạng thái loading, empty, error/retry, success, disabled và partial data.
- [ ] Form có label, hint/error liên kết đúng; lỗi có cách khắc phục rõ ràng.
- [ ] Hoàn thành tác vụ chính bằng bàn phím, focus nhìn thấy và thứ tự hợp lý.
- [ ] Không dựa vào màu, hover hoặc pointer để truyền đạt/thao tác thiết yếu.
- [ ] Không overflow tại 320, 375, 768, 1024 và 1440 px.
- [ ] Hỗ trợ text dài, dữ liệu trống, dữ liệu thiếu và zoom 200%.
- [ ] Tôn trọng theme hệ thống, reduced motion, contrast và forced colors.
- [ ] Không để lộ token, dữ liệu cá nhân, dữ liệu sức khỏe hoặc lỗi nội bộ.
- [ ] Targeted E2E, accessibility, visual regression, lint và build đạt.
- [ ] Đã kiểm tra thủ công desktop, mobile và một luồng keyboard-only.

## 0. Nền tảng dùng chung

### Design system và personalization

- [~] Hợp nhất semantic token; hiện vẫn còn alias `--ink`, `--lime`, token workspace và giá trị page-local.
- [x] Có primitive `Button`, `Field`, `Alert`, `Dialog`, data state và table dùng lại được.
- [~] Chuẩn hóa page header, toolbar, filter, pagination và responsive table cho mọi workspace.
- [x] Tùy chọn hiển thị hỗ trợ theme, motion, contrast, text scale và spacing; có persistence và announcement.
- [~] Rà contrast trong light, dark, high contrast và forced colors cho mọi vertical slice.
- [~] Giảm inline `<style>` và CSS trùng lặp theo từng màn hình, không migration hàng loạt.

### Navigation, feedback và state

- [x] Route registry tập trung có title, shell, access, alias và admin deep link.
- [x] Dialog/drawer chính có Escape, focus trap, inert và trả focus.
- [x] Toast/confirmation có vùng live dùng chung.
- [~] Migrate toàn bộ data surface sang `LoadingState`, `EmptyState`, `ErrorState` và retry chung.
- [~] Chuẩn hóa skeleton để giữ layout, tránh chỉ hiện text loading thoáng qua.
- [ ] Chuẩn hóa offline, timeout, expired-session và partial-data copy toàn ứng dụng.
- [ ] Thêm validation summary/focus-first-error cho mọi form dài.

### Test baseline

- [x] Route smoke bao phủ route, alias, redirect và role gate hiện có.
- [~] Axe baseline mới bao phủ các template/route chính, chưa bao phủ mọi trạng thái có đăng nhập.
- [~] Visual baseline có landing, login, dashboard, map, staff/admin gate và 404; chưa đủ mọi màn hình.
- [x] Viewport baseline có 320, 375, 768 và 1440 px.
- [~] Performance baseline có landing, login, dashboard và map; thiếu chat/admin nặng.
- [ ] Manual matrix: Chrome, Edge, Firefox, Safari/iOS, screen reader, zoom 200%, forced colors.

## 1. Public và acquisition

### `/` Landing page - P1

- [~] Rà hierarchy hero, trust, CTA chính/phụ và độ dài nội dung.
- [~] Rà mobile navigation, floating chat và tránh che CTA/nội dung.
- [~] Phân biệt rõ demo, dữ liệu thật và giới hạn y tế.
- [ ] Hoàn thiện loading/error khi nội dung động hoặc chat không khả dụng.
- [x] Có route, accessibility, visual và performance baseline.

### `/pricing` - P1

- [~] Làm rõ plan hiện tại, plan đề xuất, chu kỳ và feature comparison.
- [~] Chuẩn hóa premium gate, checkout loading/error/cancel/success.
- [ ] Rà bàn phím, mobile stacking, text dài và trạng thái không có plan backend.
- [ ] Thêm visual baseline cho pricing và checkout dialog.

### `/map` - P0/P1

- [x] Có hierarchy danh sách trước, search/filter, map/list parity và responsive layout.
- [x] Chi tiết, thông tin và đánh giá chỉ mở sau khi chọn cơ sở/marker.
- [x] Có loading, map-error/retry, denied geolocation và facility thiếu tọa độ.
- [x] Marker và chọn cơ sở thao tác bằng bàn phím, không có nested interactive control.
- [~] Bổ sung empty/search-no-result rõ hơn và giữ filter/search trong URL khi cần.
- [~] Rà dark/high-contrast/forced-colors và map attribution ở zoom 200%.
- [x] Có targeted E2E, axe, visual desktop/mobile/tablet và performance baseline.

### `/medical-assistant`, `/symptom-chat` - P1

- [ ] Thống nhất hierarchy chat, danh sách cơ sở và map trên desktop/mobile.
- [ ] Hoàn thiện empty, typing, retry, partial hospital data và mất kết nối.
- [ ] Giữ draft sau lỗi; làm rõ nguồn kết quả và hành động tiếp theo.
- [ ] Rà vùng live để tránh đọc lặp toàn bộ hội thoại.
- [ ] Thêm visual/interaction baseline ở desktop và mobile.

### Static content và 404 - P2

Áp dụng cho `/product`, `/features`, `/roadmap`, `/support`, `/help`, `/contact`,
`/status`, `/community`, `/legal`, `/terms`, `/privacy`, `/cookies`,
`/medical-disclaimer`, `/demo` và route không tồn tại.

- [~] Chuẩn hóa một static-page template, heading hierarchy, readable width và CTA.
- [ ] Xóa/đánh dấu content registry bị shadow bởi route thật.
- [ ] Thay form minh họa không hoạt động bằng nội dung hoặc form có trạng thái thật.
- [ ] Rà link, focus, long content, mobile và print/legal readability.
- [~] 404 có recovery action và visual baseline; các static route khác chưa có visual baseline.
- [-] `/api` bị giữ bởi proxy/rewrite; không triển khai như React static route.

## 2. Authentication và onboarding

### `/login` - P1

- [~] Form có label, busy/error, Google login và return intent.
- [ ] Làm rõ session-expired, permission redirect và lỗi provider.
- [ ] Rà password manager, autocomplete, mobile keyboard và zoom 200%.
- [x] Có route, accessibility và visual baseline.

### `/signup` - P1

- [~] Có consent, confirm password và lỗi request.
- [ ] Hiển thị password requirements trước lỗi; focus tới lỗi đầu tiên.
- [ ] Hoàn thiện success/verification state và giữ input khi lỗi recoverable.
- [ ] Thêm visual baseline cho default, validation error và success.

### `/forgot-password`, `/change-password` - P1

- [~] Có form và feedback API cơ bản.
- [ ] Hoàn thiện email-sent, invalid/expired token, resend và retry state.
- [ ] Rà focus, copy an toàn, password rules và mobile layout.
- [ ] Thêm visual/interaction baseline.

### `/register-doctor` - P1

- [~] Có invitation validation, account/professional flow và field errors.
- [~] Có invalid, used, expired token và inactive/incorrect-role states.
- [ ] Chia section/progress rõ hơn trên mobile; rà long facility/department labels.
- [ ] Rà success handoff, back navigation và dữ liệu đã nhập khi request lỗi.
- [ ] Thêm visual baseline và keyboard-only flow đầy đủ.

### `/staff/register`, `/staff-register` - P1

- [~] Có long form, alias route và backend payload đúng.
- [ ] Chuẩn hóa field/error summary, progress, required/optional và success handoff.
- [ ] Rà mobile, keyboard, text dài và duplicate account errors.
- [ ] Thêm visual/interaction baseline.

### `/patient/profile/setup` - P1

- [~] Có validation dữ liệu liên hệ/sức khỏe và trạng thái submit.
- [ ] Chia form dài theo section/progress mà không đổi payload.
- [ ] Có dirty-state warning, save recovery và focus-first-error.
- [ ] Rà privacy copy, sensitive-data handling, mobile và zoom 200%.

## 3. Patient workspace

### Patient shell - P0/P1

- [x] Có desktop sidebar, mobile drawer/bottom nav, active state và account menu.
- [x] Profile nằm trong account menu; navigation giữ route/deep-link đúng.
- [x] Search workspace chuyển query sang map.
- [~] Rà nav density, nhãn dài, locked feature và breakpoint 768-1024.
- [~] Rà theme/contrast/text-scale cho header, drawer, bottom nav và premium card.

### `/dashboard` tư vấn chuyên khoa - P0/P1

- [x] Có tiến trình ba bước và một câu hỏi tại một thời điểm.
- [x] Chẩn đoán, chuyên khoa và cơ sở có hierarchy rõ; handoff sang map hoạt động.
- [x] Có no-question, API error/retry, loading, profile nudge và emergency notice.
- [x] API/analytics/route contract được giữ nguyên và có E2E contract test.
- [~] Rà clinical copy với domain owner; làm rõ provenance/model/timestamp khi cần.
- [~] Bổ sung visual state cho questions, result, error và long clinical reasoning.
- [x] Có axe, visual responsive, performance và interaction baseline.

### `/symptom` phân tích lâm sàng - P1

- [x] Dùng endpoint chẩn đoán riêng, hỏi từng câu và ghép kết quả chuyên khoa theo session.
- [~] Đồng bộ visual language với dashboard để tránh hai trải nghiệm gần giống nhưng khác pattern.
- [~] Hoàn thiện error/retry/no-question và partial result ở cùng mức với dashboard.
- [ ] Rà emergency escalation, long diagnosis list, model/source metadata và zoom 200%.
- [ ] Thêm visual baseline cho toàn bộ state.

### `/chat` - P1

- [x] Browser gọi backend web-chatbot, không chứa Anthropic secret/API trực tiếp.
- [~] Có empty conversation, sending và error cơ bản.
- [ ] Giữ draft/retry message, làm rõ failed message và tránh duplicate submit.
- [ ] Rà live-region, auto-scroll, keyboard, mobile composer và long content/code/link.
- [ ] Thêm visual/interaction baseline.

### `/profile` - P1

- [~] Đọc/cập nhật dữ liệu backend và có account-menu entry.
- [ ] Chuẩn hóa section, save/cancel, dirty state, validation summary và success persistence.
- [ ] Rà loading, missing profile, partial data, unauthorized và API failure/retry.
- [ ] Rà dữ liệu nhạy cảm, autocomplete, mobile, zoom và text scale.
- [ ] Thêm visual/interaction baseline.

### `/recovery-plan` - P1

- [ ] Xác định rõ capability thật, dữ liệu nguồn và trạng thái khả dụng.
- [ ] Thiết kế empty state dẫn về phân tích/khám thay vì tạo cảm giác đã có kế hoạch.
- [ ] Hoàn thiện responsive, accessibility và state matrix sau khi contract rõ.
- [-] Cần product/backend decision cho dữ liệu kế hoạch phục hồi.

### `/records` - đã có contract backend

- [x] Dùng đúng `POST /api/lab-tests/analyze`, `GET /api/lab-tests/my-sessions` và `GET /api/lab-tests/{sessionId}`.
- [x] Lấy giới tính/ngày sinh từ hồ sơ tài khoản, tính tuổi tại ngày xét nghiệm và chỉ yêu cầu người dùng nhập ngày xét nghiệm.
- [x] Có upload JPG/PNG/PDF, validation, trạng thái xử lý, lịch sử và master/detail responsive.
- [x] Có error summary, keyboard flow, forced-colors và kiểm tra accessibility tự động.
- [~] Cần tiếp tục rà chính sách lưu trữ tài liệu y tế và kiểm thử screen reader thủ công trước production.

### `/medication` - bị chặn

- [x] Có cảnh báo rõ nhận diện/tương tác thuốc hiện là demo và không được lưu.
- [~] Có validation file cơ bản và image preview test.
- [ ] Rà camera/upload permission, drag/drop, processing/error và result hierarchy ở chế độ demo.
- [-] Không nâng thành capability production trước khi có backend medication API.

### Payment result - P1

- [x] `/payment/return` và `/payment/cancel` có verify/cancel flow và recovery action.
- [x] Có reduced-motion, forced-colors và targeted E2E.
- [ ] Thêm visual baseline cho verifying, success, failure, cancel và mobile.

### `/app`, `/account`, `/app/patient` - P2

- [x] Redirect/access behavior có route test.
- [ ] Rà loading announcement và tránh flash sai workspace trên mạng chậm.

## 4. Staff workspace

### `/app/staff` - P1

- [~] Có role gate, operator shell và department CRUD.
- [ ] Migrate form sang shared Field/Alert/Dialog/DataState hoàn chỉnh.
- [ ] Hoàn thiện loading, empty, error/retry, success, delete confirm và partial data.
- [ ] Rà table/card responsive, keyboard, long content và permissions.
- [ ] Thêm authenticated visual/interaction/accessibility baseline.

## 5. Admin workspace

### Admin shell và overview - P1

- [x] Mỗi section có deep link, back/forward và active navigation.
- [x] Sidebar đã bỏ icon AI dư thừa theo yêu cầu trước.
- [~] Rà responsive shell, header/search scope, mobile navigation và text scale.
- [ ] Overview metric cần nguồn/thời điểm; chart cần text/data alternative tương đương.
- [ ] Thêm authenticated visual/accessibility baseline cho shell và overview.

### Users `/app/admin/users` - P1

- [x] Có loading, empty, safe error/retry, pagination và pending queue test.
- [~] Rà filter/search hierarchy, batch action, row density và mobile table/card fallback.
- [ ] Rà approval/status confirmation, focus return và success announcement.

### Doctors `/app/admin/doctors` - P1

- [x] Có filter URL state, CRUD/status/delete, form validation và state matrix.
- [x] DTO gồm specialty và FacilityDepartment UUID đúng backend.
- [~] Rà long record, mobile actions, filter reset và pagination hierarchy.
- [ ] Thêm authenticated visual/accessibility baseline cho list/form/error.

### AI configs `/app/admin/ai-configs` - P1

- [x] Có CRUD/status/delete, filter, pagination và loading/error/retry/empty.
- [~] Rà prompt editor, long model/task names, destructive action và active config clarity.
- [ ] Không hiển thị secret; thêm copy cảnh báo thay đổi ảnh hưởng production.
- [ ] Thêm authenticated visual/accessibility baseline.

### Subscriptions `/app/admin/subscriptions` - P1

- [x] Có CRUD/status/delete, validation JSON và state matrix.
- [~] Rà price/duration formatting, feature limits, plan status và responsive table.
- [ ] Thêm confirmation/copy rõ tác động tới subscriber hiện tại nếu backend hỗ trợ.
- [ ] Thêm authenticated visual/accessibility baseline.

### Staff creation `/app/admin/staff` - P1

- [~] Có create form và feedback cơ bản.
- [ ] Hoàn thiện loading/error/success, validation summary, duplicate account và form persistence.
- [ ] Rà permissions, mobile, keyboard và sensitive error copy.
- [ ] Thêm interaction/accessibility baseline.

### Departments `/app/admin/departments` - P1

- [~] Có CRUD và `chapterCode` đúng DTO.
- [ ] Migrate loading/error/retry/empty sang state primitive chung.
- [ ] Rà validation, delete dependency error, responsive layout và success feedback.
- [ ] Thêm contract/interaction/accessibility baseline.

### ICD chapters `/app/admin/icd-chapters` - P1

- [~] Có CRUD và `keywordWeights` JSON đúng DTO.
- [ ] Cải thiện JSON editor/help/validation; không bắt người dùng đoán schema.
- [ ] Hoàn thiện loading/error/retry/empty, delete error và mobile layout.
- [ ] Thêm contract/interaction/accessibility baseline đầy đủ.

### Clinical questions `/app/admin/clinical-questions` - P1

- [~] Có CRUD với `chapterId`, `chapterCode`, `questionVi`, `englishPrefix`, `sortOrder` đúng DTO.
- [ ] Hoàn thiện chapter selector, numeric validation, loading/error/retry/empty và delete confirm.
- [ ] Rà long bilingual content, mobile form/list và keyboard.
- [ ] Thêm contract/interaction/accessibility baseline đầy đủ.

### Facilities `/app/admin/facilities` - P1

- [x] Có CRUD/status/delete, department link, state matrix và targeted E2E.
- [~] Rà coordinate input, URL/phone/opening-hours validation và map preview.
- [~] Rà responsive table/form, long address, missing coordinates và delete dependency error.
- [ ] Thêm authenticated visual/accessibility baseline.

## 6. Thứ tự triển khai đề xuất

Không làm tất cả màn hình trong một PR. Mỗi batch phải có thể review, test và rollback độc lập.

1. [~] **Batch A - Foundation gap:** data states, form summary, page header/filter/pagination, contrast guardrails.
2. [ ] **Batch B - Auth/onboarding:** signup, password flows, doctor/staff registration, profile setup.
3. [ ] **Batch C - Patient core:** đồng bộ dashboard/symptom/chat/profile và clinical safety pattern.
4. [ ] **Batch D - Public:** landing, pricing, medical assistant và static content.
5. [ ] **Batch E - Operator:** staff, admin overview/users/doctors/facilities.
6. [ ] **Batch F - Admin catalog:** AI config, subscription, department, ICD, clinical question, staff creation.
7. [ ] **Batch G - Hardening:** authenticated visual/a11y coverage, cross-browser, screen reader, zoom/contrast.
8. [-] **Batch H - Blocked capabilities:** records, medication và recovery chỉ tiếp tục sau product/backend decision.

## 7. Mẫu cập nhật sau mỗi batch

Sao chép khối này vào PR/commit notes và cập nhật checklist trong cùng commit:

```text
Batch:
Route/section:
Behavior contract giữ nguyên:
Checklist chuyển trạng thái:
Files chính:
Tests đã chạy:
Desktop/mobile/keyboard evidence:
Rủi ro còn lại:
Commit:
```

Quy trình cập nhật:

1. Chuyển mục đang xử lý từ `[ ]` sang `[~]` trước khi code.
2. Chỉ chuyển sang `[x]` khi đạt Definition of done và có bằng chứng test.
3. Nếu thiếu backend/product decision, chuyển sang `[-]` và ghi điều kiện gỡ chặn.
4. Sau mỗi batch, cập nhật ngày ở đầu tài liệu và link commit liên quan.
5. Không giảm trạng thái test hoặc bỏ acceptance criterion để đóng mục nhanh hơn.
