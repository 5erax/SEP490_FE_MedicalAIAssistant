# Ke hoach nang cap UI/UX MediMate

Tai lieu trong thu muc nay la nguon tham chieu cho chuong trinh nang cap UI/UX
toan dien. Nhanh nay chi lap ke hoach, khong thay doi giao dien, API, schema hay
nghiep vu hien tai.

## Muc tieu

- Tao trai nghiem nhat quan cho public/auth, patient, staff, admin va cac luong AI.
- Uu tien accessibility, mobile-first, tinh ro rang cua tac vu va trang thai he thong.
- Chuan hoa design system truoc khi sua rieng tung man hinh.
- Chia cong viec thanh cac dot nho co the kiem thu va phat hanh doc lap.

## Tai lieu

1. [UI/UX audit](./audit.md): hien trang, ma tran route va cac van de theo nhom.
2. [Design principles](./design-principles.md): nguyen tac va guardrail cho implementation.
3. [Roadmap](./roadmap.md): phase, backlog P0/P1/P2, tieu chi nghiem thu va phu thuoc.
4. [Phase 0 baseline](./baseline.md): route, accessibility va visual regression smoke tests.
5. [Iteration 01](./iteration-01-foundation.md): foundation va specialty intake vertical slice.

## Pham vi va rang buoc

- Bao phu moi nhanh route trong `src/App.jsx`, ke ca alias, redirect va fallback.
- Giu React 19, Vite, service layer va cac hop dong backend hien tai.
- Tai su dung `src/styles/tokens.css`, `src/styles/ux-foundation.css`,
  `src/components/ui` va `FeedbackProvider` lam diem khoi dau.
- Khong thay doi subscription gating, role gating, auth flow hoac noi dung y khoa
  neu chua co yeu cau nghiep vu rieng.

## Definition of done cho chuong trinh

- Tat ca man hinh dung mot he token va component co tai lieu.
- Cac luong chinh hoat dong tai 320, 375, 768, 1024 va 1440 px.
- Tac vu chinh hoan thanh bang ban phim; focus va ten truy cap luon nhin/nhan biet duoc.
- Loading, empty, error, success va permission-denied co mau hien thi nhat quan.
- Khong co regression ve route, auth, premium gate, role gate va API contract.
- Build, lint, accessibility smoke test va visual regression deu dat.
