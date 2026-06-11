# UI/UX iteration 01 - Foundation va specialty intake

## Da thay doi

- Them semantic token va compatibility alias de component moi khong phu thuoc token cu.
- Nang cap Button voi size, ghost tone, loading state, `aria-busy` va disabled semantics.
- Nang cap Field voi ID on dinh, label/hint/error linkage, required/optional metadata.
- Them Alert va ErrorState; chuan hoa EmptyState va LoadingState.
- Them caption/scope semantics cho DataTable va cac bang admin dang su dung primitive.
- Migrate `/dashboard` khoi inline CSS sang `dashboard.css`.
- Cai thien specialty intake: label ro rang, hint, CTA ro nghia, prompt co the xem lai
  truoc khi gui, live status va canh bao cap cuu 115.

## Khong thay doi

- API endpoint, payload va service architecture.
- Auth, premium va role gate.
- Hanh vi handoff tu specialty intake sang `/map`.
- Clinical recommendation logic.

## Verification

- Full Playwright suite: 84 passed, 1 skipped (`/api` known conflict).
- Specialty intake interaction test: prompt -> review -> submit -> map context passed.
- Dashboard accessibility critical scan passed.
- Visual baseline cap nhat tai 320, 375, 768 va 1440 px.
- `npm run lint` va `npm run build`: passed.

## Viec tiep theo

- Migrate form auth/profile sang Field moi.
- Ap dung DataState chung cho staff/admin data surface.
- Dua Dialog foundation ra khoi FeedbackProvider de premium gate va modal tai su dung.
- Tiep tuc loai inline style tai chat, records, medication, map, pricing, profile va symptom.
