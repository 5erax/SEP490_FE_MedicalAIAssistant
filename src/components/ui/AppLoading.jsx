export function AppLoading({ label = "Đang chuẩn bị dữ liệu y tế..." }) {
  return (
    <main className="workspace-root" data-route-loading>
      <section className="app-page app-route-loading" aria-busy="true">
        <div className="container route-loading-state" role="status" aria-live="polite">
          <span className="route-loading-mark" aria-hidden="true">
            <span className="route-loading-cross">+</span>
            <svg className="route-loading-pulse" viewBox="0 0 120 36" focusable="false">
              <polyline points="4 18 28 18 37 9 49 29 60 14 70 18 116 18" />
            </svg>
          </span>
          <span>{label}</span>
        </div>
      </section>
    </main>
  );
}
