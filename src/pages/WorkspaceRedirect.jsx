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
            <p className="eyebrow">Workspace</p>
            <h1>Bạn cần đăng nhập để mở MediMate AI.</h1>
            <p>Hệ thống sẽ tự đưa bạn tới workspace phù hợp sau khi đăng nhập: Patient, Staff hoặc Admin.</p>
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
    <main className="landing-page">
      <Navbar />
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">Đang điều hướng</p>
          <h1>Đang mở workspace phù hợp với tài khoản của bạn.</h1>
        </div>
      </section>
    </main>
  );
}

