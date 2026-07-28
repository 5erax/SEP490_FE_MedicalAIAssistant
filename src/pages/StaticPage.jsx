import { ArrowRight, LifeBuoy, SearchX, Tags } from "lucide-react";
import { Navbar } from "../components/landing/Navbar";
import "../styles/public/not-found.css";

const RECOVERY_LINKS = [
  {
    href: "/pricing",
    label: "Xem bảng giá",
    description: "Xem các gói đang được hệ thống cung cấp.",
    icon: Tags,
  },
  {
    href: "/support",
    label: "Mở trang hỗ trợ",
    description: "Tìm hướng dẫn cho vấn đề bạn đang gặp.",
    icon: LifeBuoy,
  },
];

export default function StaticPage() {
  return (
    <div className="landing-page not-found-page">
      <Navbar variant="landing" />

      <main className="not-found-main" id="main-content">
        <section className="not-found-card" aria-labelledby="not-found-title">
          <span className="not-found-icon" aria-hidden="true">
            <SearchX size={28} />
          </span>
          <p className="care-eyebrow">Lỗi 404</p>
          <h1 id="not-found-title">Trang này chưa tồn tại.</h1>
          <p className="not-found-description">
            Đường dẫn có thể đã thay đổi hoặc không còn khả dụng. Chọn một trang bên dưới để tiếp tục.
          </p>

          <a className="not-found-primary" href="/">
            Về trang chủ
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </section>

        <nav className="not-found-links" aria-label="Các trang có thể mở">
          {RECOVERY_LINKS.map(({ href, label, description, icon: Icon }) => (
            <a href={href} key={href}>
              <span aria-hidden="true"><Icon size={19} /></span>
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          ))}
        </nav>
      </main>
    </div>
  );
}
