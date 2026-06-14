# FE Screen Inventory - MediMate AI

Tai lieu nay tong hop cac man hinh hien co trong `SEP490_FE_MedicalAIAssistant`, dua tren `src/App.jsx`, cac file trong `src/pages`, cac service API trong `src/services`, va cac workflow da duoc hien thuc hoa tren UI.

## Ghi chu phan quyen

| Ky hieu | Y nghia |
|---|---|
| Guest | Chua dang nhap. |
| Patient | User da dang nhap, role mac dinh khong phai Staff/Admin. |
| Staff | Role `staff` hoac alias `doctor`, `clinician`, `medicalstaff`. |
| Admin | Role `admin` hoac alias `administrator`, `superadmin`. |
| Premium | `hasPremiumAccess()` tra true: premium/subscribed/active subscription hoac Staff/Admin. |

## Active Routes trong `App.jsx`

| Man hinh | Route | Guest | Patient | Staff | Admin | Muc dich | API chinh | Workflow lien quan |
|---|---|---:|---:|---:|---:|---|---|---|
| Landing Page | `/` | Yes | Yes | Yes | Yes | Trang gioi thieu san pham, hero, features, pricing preview, demo/chat landing, dieu huong den auth va workspace. | `POST /api/web-chatbot/message` qua landing chat neu nguoi dung hoi AI; cac section con lai chu yeu static. | Guest discovery, demo san pham, chuyen sang signup/login, xem pricing/disclaimer. |
| Login | `/login` | Yes | Yes | Yes | Yes | Dang nhap email/password hoac Google neu co client id. Dieu huong sau login theo role va first-login flag. | `POST /api/authentication/login`, `POST /api/authentication/google`. | Authentication, role redirect, first-login patient setup. |
| Signup | `/signup` | Yes | Yes | Yes | Yes | Tao tai khoan user/patient moi, chap nhan dieu khoan va disclaimer. | `POST /api/authentication/register`. | Guest to Patient, tao session auth, vao workspace hoac setup profile. |
| Staff Register Portal | `/staff/register`, `/staff-register` | Yes | Yes | Yes | Yes | Form dang ky tai khoan nhan su y te, gui yeu cau cho admin duyet. | `POST /api/authentication/register/staff`. | Staff application, cho Admin approve staff. |
| Forgot Password | `/forgot-password` | Yes | Yes | Yes | Yes | Gui email khoi phuc mat khau. | `POST /api/authentication/forgot-password`. | Account recovery. |
| Change Password | `/change-password` | Yes | Yes | Yes | Yes | Doi mat khau bang email, OTP, password moi. | `POST /api/authentication/change-password`. | Account recovery, reset password. |
| Patient Dashboard / Specialty Intake | `/dashboard` | Yes | Yes | Yes | Yes | Man hinh nhap trieu chung nhanh de goi y chuyen khoa va chuyen sang ban do. La free path trong shell. | `POST /api/web-chatbot/message` voi auth optional. | Core triage: nhap trieu chung -> AI ghi nhan -> luu context sessionStorage -> `/map`. |
| User Profile | `/profile` | No | Premium | Yes | Yes | Quan ly thong tin ca nhan, ho so suc khoe mock/local form, bao mat, subscription tab. | Hien tai chu yeu local state/get auth; dieu huong pricing. Khong goi API save profile that trong page nay. | Premium profile management, cap nhat UI ho so, xoa tai khoan placeholder. |
| Symptom Analysis | `/symptom` | No | Premium | Yes | Yes | Flow tung buoc: nhap trieu chung, muc do, thoi gian, gia lap AI analyzing, hien thi goi y khoa va cau hoi hoi bac si. | Hien tai mock/static trong page; khong goi backend symptom session. | Symptom analysis, department recommendation, doctor question checklist, save result placeholder. |
| AI Chatbot | `/chat` | No | Premium | Yes | Yes | Chat voi tro ly AI, goi y prompt, dieu huong sang symptom/map/medication. | Goi truc tiep Anthropic qua `sendAnthropicMessage` neu co `VITE_ANTHROPIC_KEY`; fallback local khi loi. | AI health chat, hoi dap suc khoe, disclaimer AI, chuyen sang scan thuoc. |
| Nearby Clinics / Map | `/map` | Yes | Yes | Yes | Yes | Ban do co so y te, filter type, search, locate me, call, directions, hien context trieu chung tu dashboard. | `GET /api/medical-facilities/active`; fallback data TP.HCM khi API loi/khong co data. | Facility discovery, map/list sync, goi dien/chi duong, xem co so phu hop. |
| Medical Records | `/records` | No | Premium | Yes | Yes | Quan ly y ba: danh sach record mock, detail, lab table, AI analysis mock, file attachments mock. | Khong co API that; mock data va simulated delay. | Post-visit records, lab result review, AI analysis placeholder, upload file placeholder. |
| Medication Scan | `/medication` | No | Premium | Yes | Yes | Upload/chup anh thuoc, simulated scan, hien thong tin thuoc va check tuong tac mock. | Khong co API that; file preview local va simulated scan. | Medication OCR placeholder, drug interaction placeholder, medication safety disclaimer. |
| Pricing | `/pricing` | Yes | Yes | Yes | Yes | Hien Free vs MediMate+, billing toggle, FAQ, modal upgrade. | `GET /api/subscription-plans/active`. | Paywall, premium upgrade intent, subscription plan discovery. |
| Workspace Redirect | `/app` | Yes | Yes | Yes | Yes | Neu chua login: giai thich co the trai nghiem `/dashboard`; neu login: redirect theo role. | `getStoredAuth()` local only. | Entry point theo role: User -> `/dashboard`, Staff -> `/app/staff`, Admin -> `/app/admin`. |
| Account Redirect | `/account`, `/app/patient` | No | Yes | Yes | Yes | Legacy aliases, replace URL sang `/dashboard`. | `getStoredAuth()` local only. | Backward-compatible patient workspace redirect. |
| Staff Workspace | `/app/staff` | No | No | Yes | Yes | Workspace nhan su: xem/tai lai danh muc chuyen khoa, tao/sua/xoa chuyen khoa. Admin cung duoc vao. | `GET /api/users/me`, `GET /api/medical-departments`, `POST /api/medical-departments`, `PUT /api/medical-departments/{id}`, `DELETE /api/medical-departments/{id}`, `POST /api/authentication/logout`. | Staff operations, department CRUD, role guard Staff/Admin. |
| Admin Workspace | `/app/admin`, `/admin`, `/admin/users` | No | No | No | Yes | Console quan tri tong hop: overview, duyet user, quan ly doctor, AI config, staff account, departments. | `GET /api/users/me`, `GET /api/users`, `POST /api/authentication/{userId}/approve-staff`, `DELETE /api/users/{id}`, `GET/POST/PUT/DELETE /api/medical-departments`, `GET /api/medical-facilities`, `GET/POST/PUT/PATCH/DELETE /api/doctors`, `GET/POST/PUT/PATCH/DELETE /api/ai-configs`, `POST /api/authentication/register/staff`, `POST /api/authentication/logout`. | Admin operations, staff approval, user moderation, doctor management, AI prompt/config management, department CRUD. |
| Medical Assistant Advanced | `/medical-assistant`, `/symptom-chat` | No | Yes | Yes | Yes | Workspace chat + map nang cao: nhap trieu chung, goi AI backend, hien goi y benh vien mock tren map. Component tu choi Guest bang EmptyAuth. | `POST /api/web-chatbot/message` auth true; hospital recommendation hien dang mock trong `hospitalRecommendations.js`. | Advanced triage, symptom chat, hospital recommendation, map focus. |
| Patient Profile Setup | `/patient/profile/setup` | No | Yes | Yes* | Yes* | First-login setup: lay user, tim patient profile, cap nhat thong tin lien he va thong tin suc khoe nen. Intended cho Patient; route chi require auth. | `GET /api/users/me`, `GET /api/patient-profiles?PageNumber=1&PageSize=100`, `PUT /api/users/{userId}`, `POST /api/patient-profiles`, `PUT /api/patient-profiles/{id}`. | First login profile completion, patient health baseline, post-login redirect. |
| Departments Redirect | `/departments` | Yes | Yes | Yes | Yes | Route active hien bi replace sang `/` va render LandingPage. Component DepartmentsPage van ton tai nhung khong duoc dung. | Khong goi API do redirect. | Legacy redirect ve landing. |
| Static Content Pages | Xem bang static ben duoi | Yes | Yes | Yes | Yes | Trang noi dung marketing/legal/support/status/404 theo path. | Khong co API; form static. | Public content, legal/disclaimer, support, docs/roadmap, fallback 404. |

`*` Staff/Admin co the mo route ve mat ky thuat vi `requireAuth` khong chan role, nhung workflow dung la Patient first-login setup.

## Static Content Routes qua `StaticPage`

Tat ca cac route duoi day duoc render boi `StaticPage` neu khong bi `App.jsx` match truoc. Luu y: `StaticPage` co config cho `/login`, `/signup`, `/pricing`, nhung cac route nay da bi route active khac bat truoc nen static version khong chay.

| Man hinh static | Route | Guest | Patient | Staff | Admin | Muc dich | API chinh | Workflow lien quan |
|---|---|---:|---:|---:|---:|---|---|---|
| Product | `/product` | Yes | Yes | Yes | Yes | Mo ta san pham, cac buoc tu demo den Freemium/Premium. | None. | Discovery, product education. |
| Features | `/features` | Yes | Yes | Yes | Yes | Trinh bay tinh nang cot loi: symptom, records, medication, map, reports. | None. | Feature education, CTA signup. |
| Roadmap | `/roadmap` | Yes | Yes | Yes | Yes | Lo trinh phat trien san pham theo quy. | None. | Product roadmap, community/API CTA. |
| API Info | `/api` | Yes | Yes | Yes | Yes | Trang gioi thieu dinh huong API doi tac, khong phai API docs that. | None. | Partner/API discovery. |
| Support | `/support` | Yes | Yes | Yes | Yes | Gom cac kenh ho tro, help, contact, status, community. | None. | Support navigation. |
| Help Center | `/help` | Yes | Yes | Yes | Yes | Huong dan dung MediMate AI tung buoc. | None. | User education, demo guidance, emergency guidance. |
| Contact | `/contact` | Yes | Yes | Yes | Yes | Form lien he static cho support/partner/feedback. | None; form chua submit API. | Support lead/contact placeholder. |
| Status | `/status` | Yes | Yes | Yes | Yes | Trang trang thai dich vu static. | None. | Operational status display placeholder. |
| Community | `/community` | Yes | Yes | Yes | Yes | Gop y, beta, roadmap community. | None. | Feedback/community CTA. |
| Legal | `/legal` | Yes | Yes | Yes | Yes | Hub phap ly: terms, privacy, disclaimer. | None. | Legal navigation. |
| Terms | `/terms` | Yes | Yes | Yes | Yes | Dieu khoan su dung. | None. | Legal consent/reference. |
| Privacy | `/privacy` | Yes | Yes | Yes | Yes | Chinh sach bao ve du lieu suc khoe. | None. | Privacy/legal reference. |
| Cookies | `/cookies` | Yes | Yes | Yes | Yes | Chinh sach cookie. | None. | Cookie/legal reference. |
| Medical Disclaimer | `/medical-disclaimer` | Yes | Yes | Yes | Yes | Tuyen bo AI khong chan doan/ke don, can cap cuu khi nguy hiem. | None. | Medical safety/legal disclaimer. |
| Demo Info | `/demo` | Yes | Yes | Yes | Yes | Giai thich demo trieu chung va CTA ve landing demo. | None. | Demo education. |
| 404 Fallback | Any unmatched path | Yes | Yes | Yes | Yes | Trang khong tim thay voi CTA ve landing/contact/pricing. | None. | Fallback navigation. |

## Page Components ton tai nhung khong co active route truc tiep

| Component | Route hien tai | Guest | Patient | Staff | Admin | Muc dich | API chinh | Workflow lien quan |
|---|---|---:|---:|---:|---:|---|---|---|
| `DepartmentsPage.jsx` | Khong active. `/departments` hien redirect ve `/`. | Yes* | Yes* | Yes* | Yes* | Legacy/API demo page cho danh muc chuyen khoa, co CRUD form. | `GET/POST/PUT/DELETE /api/medical-departments`. | Department CRUD demo; da thay bang Staff/Admin Workspace. |
| `AdminUsersPage.jsx` | Khong active. `/admin/users` hien render `AdminWorkspacePage`. | No* | No* | Staff/Admin* | Admin* | Legacy user admin list/approve/delete. | `GET /api/users`, `POST /api/authentication/{userId}/approve-staff`, `DELETE /api/users/{id}`. | User approval/moderation; da hop nhat vao Admin Workspace. |
| `AccountPage.jsx` | Khong active. `/account` hien redirect ve `/dashboard`. | No* | Yes* | Staff* | Admin* | Legacy multi-actor workspace: user profile, staff departments, admin users/staff creation. | `GET /api/users/me`, `GET /api/medical-departments`, `GET /api/users`, `PUT /api/users/{id}`, `POST/PUT/DELETE /api/medical-departments`, `POST /api/authentication/register/staff`, approve/delete user, logout. | Older role-based account dashboard; da tach thanh patient dashboard, staff workspace, admin workspace. |
| `PatientWorkspacePage.jsx` | Khong active. `/app/patient` hien redirect ve `/dashboard`. | No* | Yes* | Yes* | Yes* | Legacy patient workspace: profile, patient profile, map fallback, symptom chat box, departments. | `GET /api/users/me`, `GET /api/medical-departments`, `GET /api/patient-profiles`, `PUT /api/users/{id}`, `POST/PUT /api/patient-profiles`, logout. | Older patient account/profile/map flow; da thay bang UserWorkspaceShell pages. |

`*` La quyen theo component neu duoc import lai; hien tai khong co active route tu `App.jsx`.

## Admin Workspace Sections

`AdminWorkspacePage` la mot man hinh route, nhung ben trong co nhieu section van hanh. Cac section nay can duoc tinh nhu sub-screen khi migrate hoac kiem thu.

| Section | Route/State | Guest | Patient | Staff | Admin | Muc dich | API chinh | Workflow lien quan |
|---|---|---:|---:|---:|---:|---|---|---|
| Overview | `/app/admin`, `activeSection=overview` | No | No | No | Yes | KPI tong quan ve pending users, doctors, AI configs, operations queue. | Initial load: `me`, `users`, `departments`, `doctors`, `ai-configs`, `medical-facilities`. | Admin monitoring, chon queue can xu ly. |
| Users Pending Approval | `activeSection=users` | No | No | No | Yes | Tim kiem, phan trang, duyet/xoa user chua duyet. | `GET /api/users`, `POST /api/authentication/{userId}/approve-staff`, `DELETE /api/users/{id}`. | Staff/user approval, moderation. |
| Doctor Management | `activeSection=doctors` | No | No | No | Yes | Loc, tao, sua, active/inactive, xoa bac si. | `GET/POST/PUT/DELETE /api/doctors`, `PATCH /api/doctors/{id}/status`, `GET /api/medical-facilities`, `GET /api/medical-departments`. | Doctor catalog management. |
| AI Config Management | `activeSection=ai-configs` | No | No | No | Yes | Quan ly prompt/model/taskType/environment/status cua AI config. | `GET/POST/PUT/DELETE /api/ai-configs`, `PATCH /api/ai-configs/{id}/status`. | AI platform operations, prompt/config governance. |
| Staff Account Creation | `activeSection=staff` | No | No | No | Yes | Tao tai khoan staff noi bo. | `POST /api/authentication/register/staff`. | Staff onboarding by admin. |
| Department Management | `activeSection=departments` | No | No | No | Yes | Danh sach va form tao/sua/xoa chuyen khoa. | `GET/POST/PUT/DELETE /api/medical-departments`. | Department taxonomy management. |

## Patient Workspace Sections

| Man hinh/section | Route | Guest | Patient | Staff | Admin | Muc dich | API chinh | Workflow lien quan |
|---|---|---:|---:|---:|---:|---|---|---|
| UserWorkspaceShell Navigation | Wrap `/dashboard`, `/profile`, `/symptom`, `/chat`, `/records`, `/medication` | Yes | Yes | Yes | Yes | Sidebar/topbar/bottom-nav cho patient workspace, premium gate UI cho tab khong free. | `getStoredAuth()` local; logout local. | Patient navigation, paywall notice, logout. |
| Profile - Info Tab | `/profile`, `activeTab=info` | No | Premium | Yes | Yes | Xem/sua local form thong tin ca nhan. | Khong save API trong page nay. | Profile management placeholder. |
| Profile - Medical Tab | `/profile`, `activeTab=medical` | No | Premium | Yes | Yes | Nhap blood type, height, weight, allergies, chronic disease, emergency contact. | Khong save API trong page nay. | Health profile placeholder. |
| Profile - Security Tab | `/profile`, `activeTab=security` | No | Premium | Yes | Yes | UI doi mat khau/xoa tai khoan placeholder. | Khong goi API; xoa tai khoan hien toast "chua ket noi API". | Account security placeholder. |
| Profile - Subscription Tab | `/profile`, `activeTab=subscription` | No | Premium | Yes | Yes | Hien plan hien tai va CTA pricing. | Khong goi API truc tiep; Pricing goi subscription API. | Subscription awareness/paywall. |
| Records Detail Tabs | `/records` | No | Premium | Yes | Yes | Detail, lab table, AI analysis, files. | Mock/local only. | Medical records/lab analysis placeholder. |
| Medication Scan Result | `/medication` | No | Premium | Yes | Yes | File preview, simulated OCR, result, interaction check. | Mock/local only. | Medication safety and interaction placeholder. |

## API Service Coverage hien co

| Domain | Service | Endpoints dang duoc FE dung | Man hinh su dung |
|---|---|---|---|
| Auth | `authService.js` | `/api/authentication/login`, `/register`, `/register/staff`, `/google`, `/refresh`, `/logout`, `/forgot-password`, `/change-password`, `/api/users/me`, `/api/users/{id}`, `/approve-staff` | Auth pages, StaffRegister, StaffWorkspace, AdminWorkspace, PatientProfileSetup, legacy workspaces. |
| Users | `userService.js` | `/api/users`, `/api/users/{id}`, `/approve-staff` | AdminWorkspace, legacy AdminUsers/Account. |
| Medical Departments | `departmentService.js` | `/api/medical-departments`, `/api/medical-departments/{id}` | StaffWorkspace, AdminWorkspace, PatientProfileSetup/legacy pages, DepartmentsPage legacy. |
| Medical Facilities | `facilityService.js` | `/api/medical-facilities`, `/active`, `/{id}`, `/{id}/status` | NearbyClinicPage, AdminWorkspace. |
| Doctors | `doctorService.js` | `/api/doctors`, `/active`, `/{id}`, `/{id}/status` | AdminWorkspace doctor management. |
| Patient Profiles | `patientProfileService.js` | `/api/patient-profiles`, `/{id}` | PatientProfileSetup, PatientWorkspace legacy. |
| Subscription Plans | `subscriptionService.js` | `/api/subscription-plans`, `/active`, `/{id}`, `/{id}/status` | PricingPage. |
| AI Configs | `aiConfigService.js` | `/api/ai-configs`, `/active`, `/by-task-type/{taskType}`, `/{id}`, `/{id}/status` | AdminWorkspace AI config section. |
| Web Chatbot | `chatbotService.js` | `/api/web-chatbot/message` | Landing chat, Dashboard, MedicalAssistantPage. |
| External Anthropic | `anthropicService.js` | `https://api.anthropic.com/v1/messages` | ChatbotPage only. |

## Workflow Summary

| Workflow | Man hinh tham gia | API/State | Ghi chu |
|---|---|---|---|
| Guest discovery | `/`, static pages, `/pricing`, `/dashboard`, `/map` | Landing chat optional; facilities active API on map. | Guest co the trai nghiem dashboard/map free. |
| Authentication | `/login`, `/signup`, `/forgot-password`, `/change-password` | Auth endpoints, local auth storage. | Login redirect theo role va first-login. |
| First-login patient setup | `/patient/profile/setup` | `me`, patient profile list/create/update, user update. | Intended cho Patient; route chi require auth. |
| Core triage free | `/dashboard` -> `/map` | `webChatbotApi.message`, sessionStorage context, facilities active API. | Free path theo UserWorkspaceShell. |
| Premium patient features | `/profile`, `/symptom`, `/chat`, `/records`, `/medication` | Mixed: some real, many mock/local. | Route guard `requirePremium`; Staff/Admin pass premium check. |
| Advanced symptom assistant | `/medical-assistant` | Auth local, `web-chatbot/message`, mock hospital recommendations. | Auth required inside component. |
| Staff operations | `/app/staff` | `me`, department list/create/update/delete, logout. | Staff/Admin only by component role guard. |
| Admin operations | `/app/admin`, `/admin`, `/admin/users` | Users, departments, doctors, facilities, AI configs, staff register, logout. | Admin only by component role guard. |
| Legal/support/static content | StaticPage routes | None. | Public static content and 404 fallback. |

