# UI/UX Audit

## 1. Tom tat hien trang

Ung dung da co mot nen tang tot de mo rong: token CSS, focus-visible,
`prefers-reduced-motion`, feedback toast/confirm, responsive breakpoint va mot bo
UI primitive gom Button, Card, Field, Badge, EmptyState, LoadingState, DataTable.
Landing, patient shell va operator workspace cung da co ngon ngu thi giac chung
xoay quanh mau lime, teal, nen kem va duong vien dam.

Van de chinh la nen tang nay chua duoc ap dung dong deu:

- Co hai he token song song: `--color-*` trong `tokens.css` va alias cu
  `--ink`, `--lime`, `--paper` trong `global.css`, them token rieng cua workspace.
- `tokens.js` co gia tri mau/font khac CSS token va chua phai nguon su that duy nhat.
- Nhieu page tu chen chuoi `<style>` va tu dinh nghia button, field, loading, error.
- UI primitive hien tai con thieu dialog, tabs, navigation, pagination, file upload,
  skeleton, alert, search/filter, drawer va map state.
- Dieu huong dung `window.location.href`/`history.replaceState`, lam mat state va
  khong co route metadata tap trung cho title, breadcrumb, permission va analytics.
- Cac page lon nhu AdminWorkspacePage, AccountPage, PatientWorkspacePage va
  StaticPage gom qua nhieu trach nhiem, khien consistency va regression kho kiem soat.
- Copy dang tron tieng Viet va tieng Anh; mot so aria-label khong dau hoac khong
  dong bo voi noi dung hien thi.
- Loading/empty/error/success co nhieu cach hien thi: text thuong, skeleton rieng,
  inline message, toast, modal va local notice.

## 2. Ma tran route

### Public, auth va static

| Route | Hanh vi hien tai | Muc tieu audit |
| --- | --- | --- |
| `/` | Landing + map preview + floating AI chat | CTA, trust, mobile nav, chat overlay, performance |
| `/login` | LoginPage | Form semantics, error recovery, redirect context |
| `/signup` | SignupPage | Validation, consent, password guidance |
| `/forgot-password` | ForgotPasswordPage | Confirmation and retry states |
| `/change-password` | ChangePasswordPage | Password rules and expired-link state |
| `/staff/register`, `/staff-register` | StaffRegisterPortalPage | Alias consistency, long-form completion |
| `/pricing` | PricingPage | Plan comparison, locked-feature context, checkout feedback |
| `/map` | NearbyClinicPage | Geolocation, filters, list/map parity, permission/error states |
| `/medical-assistant`, `/symptom-chat` | MedicalAssistantPage | Chat/map split view, safety copy, mobile flow |
| `/product`, `/features`, `/roadmap`, `/api`, `/support`, `/help`, `/contact`, `/status`, `/community`, `/legal`, `/terms`, `/privacy`, `/cookies`, `/medical-disclaimer`, `/demo` | StaticPage content | Information architecture, stale/placeholder actions, readability |
| Unknown route | StaticPage 404 fallback | Status semantics, recovery actions |

Luu y: `StaticPage` con khai bao `/login`, `/signup`, `/pricing`, nhung cac path nay
bi cac nhanh route trong `App.jsx` uu tien. Can xoa hoac danh dau ro du lieu khong
the truy cap khi refactor de tranh hai nguon noi dung.

`/api` la xung dot da duoc baseline xac nhan: Vite proxy va production rewrite giu
prefix nay cho backend, nen React khong render duoc static page tai URL do.

### Patient va premium

| Route | Hanh vi hien tai | Muc tieu audit |
| --- | --- | --- |
| `/dashboard` | UserWorkspaceShell + specialty intake | Task clarity, guest state, transition to map |
| `/profile` | Premium gate + UserProfilePage | Form consistency, save/cancel, destructive action |
| `/symptom` | Premium gate + SymptomAnalysisPage | Clinical hierarchy, emergency escalation |
| `/chat` | Premium gate + ChatbotPage | Conversation states, keyboard and screen reader flow |
| `/records` | Premium gate + MedicalRecordPage | Master/detail responsiveness, tables, files, AI analysis |
| `/medication` | Premium gate + MedicationScanPage | Camera/upload affordance, permission and result confidence |
| `/patient/profile/setup` | Auth gate + PersonalPatientProfilePage | Long form, progress, validation, completion |
| `/app` | WorkspaceRedirect | Redirect/loading announcement |
| `/account`, `/app/patient` | Redirect to `/dashboard` | Preserve query/intent and avoid confusing flash |

### Staff va admin

| Route | Hanh vi hien tai | Muc tieu audit |
| --- | --- | --- |
| `/app/staff` | StaffWorkspacePage | Role denial, department CRUD, responsive records |
| `/app/admin`, `/admin`, `/admin/users` | AdminWorkspacePage | Section navigation, data density, tables, dialogs, bulk states |
| `/departments` | Redirect to `/` | Remove dead navigation and document redirect intent |

Admin Workspace gom sau section noi bo: overview, users, doctors, AI configs, staff
creation va departments. Moi section phai duoc xem nhu mot man hinh trong test matrix.

## 3. Audit theo tieu chi

### Consistency

- Button ton tai it nhat ba implementation: `.btn`, `.ui-button` va style cuc bo.
- Field ton tai trong UI primitive, Auth, UserProfile, Staff va Admin.
- Radius, shadow, spacing va primary lime co nhieu gia tri gan giong nhung khong dong nhat.
- Page title, eyebrow, card header, toolbar va pagination chua co composition chuan.
- De xuat: chot mot CSS token layer va migrate theo component, khong thay tat ca CSS
  trong mot PR.

### Responsive

- Global CSS co breakpoint 980/760 px, mot so page inline lai dinh nghia breakpoint rieng.
- Patient shell co mobile bottom navigation nhung nut menu tren topbar chua the hien
  state drawer.
- Table dang horizontal-scroll; chua co quy tac cot uu tien hoac card alternative.
- Map/chat va record master/detail can test keyboard, resize va orientation change.
- De xuat: dat viewport matrix va quy tac layout theo component thay vi page.

### Accessibility

- Da co focus-visible va reduced-motion toan cuc; FeedbackProvider co `aria-live` va dialog semantics.
- Field primitive tao `aria-describedby` tu label text, co nguy co ID trung/khong hop le,
  va chua gan describedBy vao control con.
- Nhieu icon-only button da co aria-label, nhung dialog/notice cuc bo chua quan ly focus,
  Escape va tra focus.
- Chart trong admin chi co aria-label, chua co data alternative; table chua co caption/scope.
- Map marker va map/list selection can mot luong tuong duong khong phu thuoc pointer.
- De xuat: dat WCAG 2.2 AA lam muc tieu; keyboard, focus, name/role/value va contrast
  la gate cua moi phase.

### Trang thai he thong

- Loading co text, spinner, skeleton va `LoadingState`; can chon theo latency/ngu canh.
- Empty state da co primitive nhung staff, department va static page van dung paragraph.
- Error co API message, inline error, local error va fallback redirect; can phan biet
  recoverable, blocking, validation va safety-critical.
- Success dang tron toast va inline message; can quy dinh tac vu nao can persistence.
- De xuat: state matrix bat buoc cho moi data surface: initial, loading, empty, partial,
  success, validation error, request error, permission denied va offline/timeout.

### Navigation va task clarity

- Route metadata nam trong cac `if` cua App; navigation config lai nam trong tung shell.
- Premium item dang hien lock nhung click mo custom notice thay vi chia se mot pattern gate.
- Public static pages va alias co nguy co copy/action lech voi route that.
- Admin search o topbar va section users cung chia se state, de gay hieu nham pham vi tim kiem.
- De xuat: route registry + PageHeader/Breadcrumb + gate pattern chung; van giu URL va
  permission behavior hien tai.

### Medical AI trust

- Da co disclaimer tai mot so man, nhung cap do khan cap, do tin cay, nguon va hanh dong
  tiep theo chua nhat quan.
- Fallback AI co the van dieu huong den map ma khong phan biet ket qua API va du phong.
- De xuat: component SafetyNotice, urgency scale, source/timestamp metadata va explicit
  "khong phai chan doan"; copy can duoc domain owner duyet truoc release.

## 4. Inventory component nen tang

### Co the giu va mo rong

- CSS: tokens, global reset, ux foundation, feedback, workspace styles.
- UI: Button, Card, Badge, Field, TextInput, Textarea, Select, DataTable,
  EmptyState, LoadingState.
- Feedback: toast va confirmation dialog.
- Domain component: landing sections, medical assistant chat/map, doctor va AI config tables.

### Can bo sung

- AppShell/PageHeader/Breadcrumb/SideNav/MobileDrawer.
- Alert/InlineMessage/SafetyNotice/PermissionState/ResultConfidence.
- Dialog/Drawer/Popover voi focus management.
- Tabs/SegmentedControl/FilterBar/Pagination.
- Skeleton, ErrorState, SuccessState va RetryAction.
- FileUpload/ImagePreview/CameraPermission.
- ResponsiveDataTable va data-card fallback.
- ChatMessage/ChatComposer/TypingState/ConversationEmpty.
- MapStatus/LocationPermission/FacilityCard.

## 5. Rủi ro va guardrail

- Khong doi API payload hoac endpoint de phuc vu redesign.
- Khong thay URL/gate trong phase visual; route refactor phai co compatibility test.
- Khong gop patient, staff va admin thanh mot shell neu permission/navigation khac nhau.
- Khong dua clinical copy moi vao UI khi chua duoc duyet.
- Khong migrate moi page cung luc; dung vertical slice va visual baseline de giam regression.
