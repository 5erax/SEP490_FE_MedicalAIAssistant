export function AppLoading({ label = "Đang chuẩn bị dữ liệu y tế..." }) {
  return (
    <main className="workspace-root" data-route-loading>
      <section className="app-page app-route-loading" aria-busy="true">
        <div className="container route-loading-state" role="status" aria-live="polite">
          <span className="ui-state-spinner route-loading-spinner" aria-hidden="true" />
          <span>{label}</span>
        </div>
      </section>
    </main>
  );
}
