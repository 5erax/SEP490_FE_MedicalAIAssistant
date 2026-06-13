# Audit luồng nghiệp vụ và điều hướng

Ngay audit: 2026-06-13

## Pham vi

Bo skill da ap dung:

- `web-design-guidelines`
- `navigation`
- `react-best-practices`
- `frontend-testing-debugging`
- `playwright-skill`

Luong Browser da kiem tra:

1. Landing tai `/`.
2. Click `Trai nghiem ngay` sang `/dashboard`.
3. Kiem tra title, DOM, console va focus sau dieu huong.
4. Kiem tra dashboard desktop va mobile 375 x 812.
5. Mo drawer mobile, kiem tra focus, `aria-expanded`, `inert` va Escape.

## Findings

### P1 - SPA khong chuyen focus hoac announce trang moi

- `src/SpaRoot.jsx:8-19` chi scroll sau khi route thay doi.
- Browser xac nhan sau khi click tu landing sang dashboard, `document.activeElement`
  la `BODY`.
- Screen reader co the khong nhan duoc tin hieu trang da thay doi.

De xuat:

- Sau route change, focus vao page heading hoac `#main-content`.
- Them live region thong bao document title.
- Bo sung Playwright test cho active element va announcement sau navigate/back/forward.

### P1 - Mobile drawer khong co focus isolation

- `src/components/workspace/UserWorkspaceShell.jsx:135-146` chi xu ly Escape.
- `src/components/workspace/UserWorkspaceShell.jsx:148-221` khong dat `inert` cho
  main content va bottom navigation khi drawer mo.
- Browser xac nhan `mainInert=false`, `bottomNavInert=false`; focus van nam tren nut
  `Mo menu` ngoai drawer sau khi mo.

De xuat:

- Chuyen focus vao link dau tien hoac nut dong khi drawer mo.
- Dat `inert` va `aria-hidden` phu hop cho noi dung nen.
- Trap focus trong drawer; khi dong tra focus ve toggle.

### P1 - Landmark va heading bi long nhau trong patient workspace

- Shell render `<main>` tai `src/components/workspace/UserWorkspaceShell.jsx:223`.
- Cac page con tiep tuc render `<main>`, vi du `src/pages/DashboardPage.jsx:55`.
- Shell co `h1` tai `UserWorkspaceShell.jsx:239`, page dashboard co `h1` tai
  `DashboardPage.jsx:59`.
- Browser snapshot xac nhan `<main>` long `<main>` va hai heading cap 1.

De xuat:

- Shell so huu mot `<main>` duy nhat.
- Page con render `section`/`article` va dung `h2`, hoac shell chi render layout
  container va de page so huu `<main>`/`h1`.

### P1 - Signup co the bo qua first-login profile setup

- Login dung `getPostLoginPath`.
- Signup tai `src/pages/AuthPages.jsx:271` dung `getWorkspacePath`, khong kiem tra
  `isFirstLogin`.

De xuat:

- Dung `getPostLoginPath` cho signup.
- Them test response `isFirstLogin=true` phai den `/patient/profile/setup`.

### P1 - Premium return intent duoc tao nhung khong duoc khoi phuc

- `src/App.jsx:72-75` tao `/pricing?locked=<route>`.
- `src/pages/PricingPage.jsx` khong doc tham so `locked`.
- Signup tu pricing chi quay lai `/pricing?upgrade=premium`.
- Sau checkout, nguoi dung khong duoc dua ve tinh nang da chon ban dau.

De xuat:

- Chuan hoa tham so same-origin `returnTo`.
- Truyen qua login, signup, profile setup, pricing va payment result.
- Khong dua noi dung y te hoac token vao URL.

### P1 - Admin section khong deep-link va khong ho tro Back/Forward

- `src/pages/AdminWorkspacePage.jsx:164` khoi tao section bang local state.
- `src/pages/AdminWorkspacePage.jsx:1088-1121` dung button thay doi state, khong
  cap nhat URL.
- Reload, chia se link va browser history lam mat section dang lam viec.

De xuat:

- Dung route `/app/admin/:section` hoac query `?section=users`.
- Section navigation dung link va `aria-current="page"`.
- Giu alias `/admin` va `/admin/users` trong migration.

### P2 - Navigation landmark patient thieu ten

- `src/components/workspace/UserWorkspaceShell.jsx:175` co `<nav>` khong co
  `aria-label`.
- Cung trang co mobile nav da co nhan, nen desktop nav can ten rieng.

De xuat:

- Them `aria-label="Dieu huong chinh trong khong gian ca nhan"`.

### P2 - Landing va patient drawer chua du pattern mobile navigation day du

- Landing tai `src/components/landing/Navbar.jsx:24-33` dong menu bang Escape
  nhung khong tra focus ve toggle.
- `Navbar.jsx:73-88` khong move focus vao menu va khong inert background.
- Patient drawer co cung thieu sot focus-enter/inert.

De xuat:

- Dung mot disclosure/drawer primitive chung.
- Test open, focus enter, Tab cycle, Escape va focus restore.

### P2 - URL chua phan anh nhieu state co y nghia

- Admin section, record tab, profile tab, symptom step va map filter phan lon la
  local state.
- Guideline hien tai yeu cau tab/filter/pagination quan trong co deep link khi
  nguoi dung can reload, chia se hoac Back/Forward.

De xuat:

- Uu tien URL sync cho admin section, record tab, map filter va pagination.
- Khong dua draft y te nhay cam vao URL; draft luu bang opaque ID hoac session state.

### P2 - Bundle can code splitting

Production build:

- App chunk: 581.11 kB.
- MapLibre chunk: 1,027.57 kB.
- Vite canh bao chunk lon hon 500 kB.

De xuat:

- Lazy-load map, medical assistant va admin sections.
- Tranh import map code vao route khong su dung.
- Them performance budget cho landing va dashboard.

### P2 - Anh preview thuoc khong co kich thuoc on dinh

- `src/pages/MedicationScanPage.jsx:107` render anh preview khong co `width`,
  `height` hoac `aspect-ratio` contract.

De xuat:

- Dat container aspect ratio va kich thuoc on dinh de tranh layout shift.
- Thu hoi object URL khi thay file/unmount neu preview dung `URL.createObjectURL`.

## Ket qua validation

### Dat

- Browser page identity, meaningful DOM va console health cho `/` va `/dashboard`.
- SPA link giu document, Back/Forward va route title.
- Premium dialog Escape va focus restore.
- Mobile drawer dong bang Escape va tra focus ve toggle.
- `npm run lint`.
- `npm run build`.
- 65 Playwright tests passed, 1 known `/api` conflict skipped.
- Axe baseline khong co critical/serious violation tren route matrix hien tai.

### Khoang trong cua test hien tai

- Chua assert focus sau SPA route change.
- Chua assert drawer `inert`, focus enter va Tab containment.
- Chua assert mot main landmark va heading hierarchy.
- Chua test signup first-login redirect.
- Chua test premium `returnTo` sau checkout.
- Chua test deep-link/Back/Forward cho admin section.
- Axe tu dong khong thay the keyboard va screen reader manual testing.

## Thu tu sua de xuat

1. Sua focus/announcement sau route change.
2. Chuan hoa drawer focus + inert.
3. Sua landmark va heading ownership trong patient shell.
4. Sua signup onboarding va premium return intent.
5. Tao route registry va admin deep link.
6. Lazy-load map/admin va dat performance budget.
