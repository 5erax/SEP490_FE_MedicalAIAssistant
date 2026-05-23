import { useState } from "react";
import { getStoredAuth } from "../../services/api";

const NAV_LINKS = [
  { name: "Tính năng", href: "/features" },
  { name: "Quy trình", href: "/#process" },
  { name: "Bảng giá", href: "/pricing" },
];

function Logo() {
  return (
    <a className="brand" href="/" aria-label="MediMate AI">
      <span className="brand-mark">+</span>
      <span>MediMate AI</span>
    </a>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [auth] = useState(() => getStoredAuth());

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Logo />

        <nav className="nav-links" aria-label="Điều hướng chính">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.name}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          {auth ? (
            <a href="/app" className="btn btn-dark">
              Vào app
            </a>
          ) : (
            <a href="/login" className="btn btn-dark">
              Đăng nhập
            </a>
          )}
        </div>

        <button
          className="menu-btn"
          aria-label="Mở menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "×" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="container mobile-menu" aria-label="Điều hướng di động">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.name}
            </a>
          ))}
          <a
            className="btn btn-primary"
            href={auth ? "/app" : "/login"}
            onClick={() => setOpen(false)}
          >
            {auth ? "Vào app" : "Đăng nhập"}
          </a>
        </nav>
      )}
    </header>
  );
}
