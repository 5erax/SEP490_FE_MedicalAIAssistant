import { useEffect } from "react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { replaceRoute } from "../router/navigation";
import { getStoredAuth } from "../services/api";
import { getWorkspacePath } from "../utils/roles";

export default function WorkspaceRedirect() {
  const auth = getStoredAuth();

  useEffect(() => {
    if (!auth) return;
    replaceRoute(getWorkspacePath(auth));
  }, [auth]);

  if (!auth) {
    return (
      <main className="landing-page">
        <Navbar />
        <section className="app-page">
          <div className="container app-empty">
            <p className="eyebrow">MediMate AI</p>
            <h1>Bạn có thể trải nghiệm trước khi đăng ký.</h1>
            <p>Dùng tư vấn chuyên khoa và bản đồ ở chế độ khách. Khi cần lưu hồ sơ hoặc dùng tính năng nâng cao, hãy đăng nhập hoặc tạo tài khoản.</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="/medical-assistant">Trải nghiệm ngay</a>
              <a className="btn btn-ghost" href="/login">Đăng nhập</a>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="workspace-root">
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">Đang mở</p>
          <h1>Đang chuẩn bị không gian làm việc của bạn.</h1>
        </div>
      </section>
    </main>
  );
}
