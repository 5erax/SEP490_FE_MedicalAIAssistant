# Kế hoạch nâng cấp luồng nghiệp vụ và điều hướng

> Ke hoach nay phai tuan theo pham vi trong
> [Product definition](../product-definition/README.md). Capability duoc danh
> dau thu nghiem hoac hoan khong duoc dua vao navigation production.

## 1. Muc tieu

- Bien cac man hinh roi rac thanh hanh trinh ro rang theo muc tieu cua nguoi dung.
- Tap trung route metadata, auth gate, role gate va premium gate vao mot nguon.
- Giu nguyen endpoint, payload, URL cong khai va business rule hien tai trong dot dau.
- Uu tien an toan y khoa, bao mat du lieu va kha nang khoi phuc tac vu dang do.

## 2. Van de hien tai

### Dieu huong va quyen truy cap

- `App.jsx` tu xu ly route bang chuoi `if`, trong khi title, nav item, premium gate
  va role redirect nam o nhieu file khac nhau.
- `/dashboard` cho phep guest, nhung cac route patient khac dung premium gate; quy tac
  free/auth/premium chua duoc mo ta bang metadata chung.
- Signup dieu huong bang `getWorkspacePath`, khong dung `getPostLoginPath`, nen co the
  bo qua `/patient/profile/setup` neu backend tra `isFirstLogin`.
- Premium gate chuyen sang `/pricing?locked=...`, nhung sau thanh toan chua co mot quy
  tac chung de quay lai dung tac vu bi khoa.
- Admin section chi la local state. Reload, Back/Forward va chia se URL khong giu duoc
  section dang lam viec.
- Alias va redirect (`/account`, `/app/patient`, `/admin`, `/admin/users`,
  `/staff-register`) chua co mot compatibility registry duy nhat.

### Luong patient

- Cac route `dashboard`, `symptom`, `map`, `records`, `medication`, `chat` dang duoc
  trinh bay nhu cac tinh nang ngang hang, chua phan anh thu tu hanh trinh cham soc.
- Ket qua chuyen khoa co the dua sang map, nhung context trieu chung/chuyen khoa khong
  duoc mo ta thanh mot object handoff co the khoi phuc.
- Chua co diem tong hop cho "viec tiep theo": hoan thanh ho so, tiep tuc phien dang do,
  chon noi kham, luu luot kham, tai ket qua sau kham.
- Guest co the trai nghiem, nhung khi bi yeu cau dang nhap/nang cap, draft va y dinh
  ban dau co nguy co bi mat.

### Luong staff va admin

- Staff va admin co workspace rieng, nhung dieu huong chua dua tren task va trang thai.
- Admin gom nhieu nghiep vu trong mot page lon; section khong co deep link va khong
  co breadcrumb/context title rieng.
- Cac thao tac phu thuoc nhau chua duoc huong dan: tao chuyen khoa -> tao co so ->
  gan chuyen khoa -> them bac si -> moi bac si/nhan vien.

## 3. Kien truc dieu huong de xuat

### Route registry

Tao mot registry co cau truc cho moi route:

```js
{
  id: "patient.symptom",
  path: "/symptom",
  title: "Phan tich trieu chung",
  shell: "patient",
  access: "premium",
  roles: ["user"],
  aliases: [],
  parent: "patient.home",
  analyticsId: "patient_symptom",
}
```

Registry la nguon cho:

- Render route va document title.
- Side navigation, mobile navigation va breadcrumb.
- Auth, premium va role gate.
- Alias/redirect compatibility.
- Route smoke test va analytics an toan, khong chua du lieu y te.

Khong doi sang router dependency trong cung dot. Truoc tien chuan hoa metadata va
giu `navigate()` hien tai; chi danh gia React Router sau khi compatibility test day du.

### Return intent

Chuan hoa mot tham so `returnTo` noi bo:

1. Guest bat dau mot tac vu.
2. Gate luu route, query va draft ID an toan.
3. Login/signup/profile setup hoan tat.
4. Premium checkout hoan tat neu can.
5. App quay lai dung buoc va tai lai draft tu service/state.

Chi cho phep same-origin path trong allowlist. Khong dua noi dung trieu chung, token,
email hoac du lieu y te vao URL va analytics.

### Guard pipeline

Moi route di qua thu tu:

1. Resolve alias.
2. Kiem tra auth.
3. Kiem tra role.
4. Kiem tra first-login/profile setup.
5. Kiem tra premium.
6. Render shell va page.

Canh bao khan cap va noi dung an toan co ban khong duoc bi chan boi paywall.

## 4. Hanh trinh patient muc tieu

### Luong A - Tu trieu chung den noi kham

1. Mo ta trieu chung.
2. Xac nhan thong tin va disclaimer.
3. Nhan muc do uu tien va chuyen khoa goi y.
4. Chon chuyen khoa.
5. Xem danh sach/map co so phu hop.
6. Chon co so, khoa va bac si neu co.
7. Tao ban chuan bi di kham.
8. Luu ke hoach/luot kham.

Moi buoc can co `Tiep theo`, `Quay lai`, `Luu de lam sau` va trang thai dang do.

### Luong B - Sau khi kham

1. Danh dau luot kham da hoan tat.
2. Them ho so, file va ket qua xet nghiem.
3. Them thuoc dang dung.
4. Chay phan tich co disclaimer va provenance.
5. Tao ke hoach theo doi/phuc hoi.
6. Nhan nhac viec va danh gia sau kham.

Dashboard nen hien "Viec tiep theo" theo du lieu thuc thay vi chi liet ke tinh nang.

### Luong C - Guest sang user/premium

1. Cho guest hoan thanh phan input an toan.
2. Truoc thao tac can luu/phan tich sau, giai thich ro ly do can tai khoan.
3. Sau signup, dua patient moi qua profile setup neu can.
4. Sau premium checkout, quay lai tinh nang bi khoa.
5. Neu nguoi dung huy, giu draft va cung cap duong lui ve tinh nang free.

## 5. Information architecture de xuat

### Patient navigation

- Hom nay: dashboard, viec tiep theo, phien dang do.
- Tim noi kham: trieu chung, chuyen khoa, ban do/co so.
- Ho so suc khoe: ho so ca nhan, y ba, ket qua.
- Thuoc va theo doi: thuoc, nhac viec, hanh trinh dieu tri.
- Tro ly: chat va cac phien tu van.
- Tai khoan: goi dich vu, tuy chon hien thi, dang xuat.

Mobile bottom nav chi giu 4-5 muc cap cao; cac tinh nang con nam trong menu "Them"
hoac trong trang hub, khong cat danh sach theo thu tu mang.

### Staff navigation

- Tong quan cong viec.
- Chuyen khoa.
- Co so va khoa tai co so.
- Bac si.
- Review cho duyet.

### Admin navigation

- Tong quan.
- Nguoi dung va quyen.
- Nhan su.
- Co so, chuyen khoa va bac si.
- Goi dich vu va giao dich.
- Cau hinh AI va knowledge base.
- Trang thai he thong/audit.

Moi section admin can co URL, vi du `/app/admin/users`,
`/app/admin/ai-configs`, va giu alias cu trong giai doan migration.

## 6. Backlog theo thu tu

### P0 - Nen tang va loi dieu huong

1. Tao route registry va route compatibility tests.
2. Hop nhat auth/role/profile/premium guard.
3. Sua signup dung post-login path va test first-login.
4. Chuan hoa `returnTo` cho login, signup, profile setup va pricing.
5. Them deep link cho admin section va Back/Forward behavior.
6. Dinh nghia navigation model rieng cho patient, staff va admin.

### P1 - Hanh trinh patient

1. Tao patient home voi "Viec tiep theo" va phien dang do.
2. Tao context handoff tu symptom -> department -> facility -> consultation.
3. Giu draft qua login/premium gate ma khong dua du lieu y te vao URL.
4. Them progress va CTA tiep theo/quay lai/luu sau cho luong di kham.
5. Gan nhan demo hoac an records/medication; chi mo luong sau kham khi co
   product decision, backend contract, consent va du lieu production.
6. Thong nhat emergency, permission denied, loading, retry va offline states.

### P2 - Operator workflow

1. Tach admin page theo route/section container.
2. Tao guided dependency flow cho department -> facility -> doctor.
3. Them task queue cho review, invitation va config can xu ly.
4. Them breadcrumb, unsaved-change guard va confirmation cho thao tac quan trong.
5. Them permission matrix test cho user/staff/admin va tai khoan bi khoa.

### P3 - Do luong va toi uu

1. Do completion, drop-off, retry va time-to-complete bang event khong chua PHI.
2. Usability test cac luong patient va operator.
3. Toi uu mobile, keyboard, screen reader va slow-network recovery.
4. Danh gia React Router chi khi registry va compatibility suite da on dinh.

## 7. Tieu chi nghiem thu

- Refresh, Back/Forward va deep link khong lam mat section hoac tac vu.
- Redirect sau login/signup/profile/premium quay dung noi nguoi dung dang lam.
- Khong co open redirect; URL va analytics khong chua token, email hay du lieu y te.
- Guest, free, premium, staff va admin co route matrix duoc test.
- Emergency guidance luon truy cap duoc, khong bi paywall chan.
- Luong patient chinh hoan thanh duoc tai 320, 375, 768, 1024 va 1440 px.
- Moi data surface co loading, empty, error, retry va permission-denied state.
- `npm run lint`, `npm run build`, route tests va accessibility smoke tests dat.

## 8. Dot trien khai dau tien de xuat

Pham vi nho, it rui ro va co gia tri ngay:

1. Them route registry ma chua doi URL.
2. Chuyen title, alias, access va navigation label vao registry.
3. Sua signup post-login onboarding.
4. Them `returnTo` an toan cho login va pricing.
5. Chuyen admin section sang query/path deep link co compatibility.
6. Bo sung test cho guest/free/premium/role/first-login va Back/Forward.

Dot nay khong thay giao dien lon, khong doi API va tao nen de phat trien cac luong
patient/staff/admin o cac dot tiep theo.
