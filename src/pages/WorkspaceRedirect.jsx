import { useEffect } from "react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import { getStoredAuth } from "../services/api";
import { getWorkspacePath } from "../utils/roles";

export default function WorkspaceRedirect() {
  const auth = getStoredAuth();

  useEffect(() => {
    if (!auth) return;
    window.location.replace(getWorkspacePath(auth));
  }, [auth]);

  if (!auth) {
    return (
      <main className="landing-page">
        <Navbar />
        <section className="app-page">
          <div className="container app-empty">
            <p className="eyebrow">MediMate AI</p>
            <h1>Bạn cần đăng nhập để tiếp tục.</h1>
            <p>Sau khi đăng nhập, MediMate AI sẽ mở đúng không gian làm việc dành cho tài khoản của bạn.</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="/login">Đăng nhập</a>
              <a className="btn btn-ghost" href="/signup">Tạo tài khoản</a>
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
