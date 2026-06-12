import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

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
          type="button"
          aria-label={open ? "Đóng menu" : "Mở menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "×" : "☰"}
        </button>
      </div>

      {open && (
        <nav id="mobile-navigation" className="container mobile-menu" aria-label="Điều hướng di động">
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
