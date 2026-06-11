# Phase 0 baseline

## Pham vi da tu dong hoa

- Route smoke: moi route/alias/redirect trong `src/App.jsx` va moi static route.
- Accessibility smoke: 10 surface dai dien, gate o muc violation `critical`.
- Visual baseline: 7 surface dai dien tai 320, 375, 768 va 1440 px.
- Performance smoke: landing, login, patient dashboard va nearby clinic.
- Runtime guard: moi route smoke khong duoc phat sinh uncaught page error.

## Lenh chay

```bash
npm run test:e2e:routes
npm run test:e2e:a11y
npm run test:e2e:performance
npm run test:e2e:visual
```

Tao hoac cap nhat anh baseline sau khi thay doi da duoc review:

```bash
npm run test:e2e:visual:update
```

Bao cao HTML duoc tao tai `playwright-report/`; trace, video va screenshot khi loi
nam trong `test-results/`. Hai thu muc nay khong commit.

## Quy tac cap nhat visual baseline

1. Chay route va accessibility test truoc.
2. Xem tung visual diff o cac viewport bi anh huong.
3. Chi cap nhat snapshot khi thay doi la co chu dich va da duoc review.
4. Commit snapshot cung thay doi UI tao ra snapshot.

## Gioi han baseline hien tai

- Route can auth/role duoc test tai gate khi chua dang nhap.
- Chua mock backend cho patient premium, staff CRUD va admin data section.
- Axe tu dong khong thay the keyboard, zoom, screen reader va contrast review thu cong.
- Performance smoke dung lab Navigation Timing, LCP va CLS; day la regression guard,
  khong thay the du lieu Real User Monitoring.

## Performance budget ban dau

| Metric | Budget |
| --- | --- |
| DOMContentLoaded | < 5,000 ms |
| Load | < 8,000 ms |
| Largest Contentful Paint | < 5,000 ms |
| Cumulative Layout Shift | < 0.25 |

Budget nay co chu dich rong cho baseline local. Phase hardening se dieu chinh theo
Lighthouse va du lieu thiet bi/mang dai dien.

## Known baseline issue

- `/api` co noi dung trong `StaticPage` nhung bi Vite proxy va production API rewrite
  giu truoc khi React render. Route smoke danh dau `fixme` cho den khi trang public nay
  duoc doi URL hoac bo khoi content registry.

## Verification hien tai

- Full Playwright suite: 84 passed, 1 skipped (`/api` known conflict).
- Route smoke: 41 passed, 1 skipped.
- Accessibility smoke: 10 passed.
- Performance smoke: 4 passed.
- Visual regression: 28 passed, 28 baseline snapshots.
- Specialty intake interaction: 1 passed.
- `npm run lint` va `npm run build`: passed.
- Build van canh bao MapLibre chunk lon hon 500 kB; backlog `P2-06` theo doi viec nay.
