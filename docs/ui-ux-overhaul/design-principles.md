# Nguyen tac thiet ke va implementation

## 1. Safety before delight

Thong tin khan cap, hanh dong tiep theo, gioi han cua AI va trang thai du lieu phai ro
hon trang tri. Khong dung mau sac lam tin hieu duy nhat.

## 2. Mot tac vu chinh moi man hinh

Moi page co mot heading, mot primary action va mot duong lui ro rang. Secondary action
khong duoc canh tranh thi giac voi primary action; destructive action luon tach nhom.

## 3. Progressive disclosure

Patient thay tom tat va hanh dong tiep theo truoc chi tiet y khoa. Staff/admin thay queue,
filter va tac vu thuong dung truoc form nang cao. AI config chi hien technical detail khi can.

## 4. Consistency is a feature

Dung component chung cho button, field, message, dialog, table, tabs va pagination.
Khong tao style cuc bo neu primitive co the mo rong bang variant co y nghia.

## 5. Mobile is a primary workflow

Thiet ke tu 320 px, sau do mo rong. Primary action phai nam trong vung cham thuan loi;
table, map, chat va master/detail can alternative layout, khong chi thu nho desktop.

## 6. Accessible by default

- Muc tieu WCAG 2.2 AA.
- Moi control co accessible name; error/hint duoc lien ket bang ID on dinh.
- Moi overlay trap focus, dong bang Escape va tra focus ve trigger.
- Moi task hoan thanh bang keyboard; focus order theo visual order.
- Motion ton trong `prefers-reduced-motion`; target cham toi thieu 44 x 44 px.

## 7. State is part of the design

Moi data component phai co loading, empty, partial, success, validation error, request
error, permission denied va retry. Khong dung blank screen hoac chi doi text nut.

## 8. Trust through provenance

Ket qua AI can noi ro du lieu dau vao, thoi diem, muc do chac chan (neu backend co),
gioi han va next step. Khong suy dien confidence neu API khong tra ve.

## 9. Preserve product contracts

UI refactor khong doi endpoint, payload, role, premium rule, redirect hay analytics event
neu khong co migration duoc phe duyet rieng.

## 10. Measure outcomes

Theo doi completion, validation error, retry, locked-feature exposure va exit point theo
luong; khong thu thap noi dung trieu chung, ho so hoac du lieu nhay cam trong UX analytics.

## Quy uoc design system

### Token

- `tokens.css` la nguon su that runtime.
- Alias cu (`--ink`, `--lime`, ...) duoc map ve semantic token trong giai doan migration.
- Token nhom theo color semantic, typography, spacing, radius, elevation, motion,
  breakpoint va z-index.
- `tokens.js` chi ton tai neu JS thuc su can gia tri; gia tri phai duoc sinh/kiem tra tu
  cung mot nguon, khong duy tri thu cong song song.

### Component API

- Variant dat theo y nghia (`primary`, `secondary`, `danger`, `info`) thay vi mau.
- Component ho tro `className`, ref, native attributes va disabled/busy semantics.
- Form control dung ID duoc truyen hoac sinh on dinh; label, hint va error lien ket dung.
- Component domain duoc xay tren primitive, khong nhan ban primitive trong page.

### Content

- UI mac dinh dung tieng Viet nhat quan; thuat ngu tieng Anh chi giu khi la ten ky thuat.
- CTA bat dau bang dong tu; loading mo ta hanh dong; error noi ro dieu gi xay ra va cach tiep tuc.
- Khong dua endpoint, HTTP method, internal ID hay model detail vao patient-facing UI.

### Responsive va density

- Compact density chi dung cho staff/admin data table.
- Patient/public dung comfortable density va do rong dong van ban hop ly.
- Breakpoint duoc chon theo luc layout vo, nhung test suite dung bo viewport chuan
  320/375/768/1024/1440 px.
