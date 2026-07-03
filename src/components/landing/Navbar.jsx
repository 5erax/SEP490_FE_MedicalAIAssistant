import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getStoredAuth } from "../../services/api";
import DisplayPreferences from "../preferences/DisplayPreferences";
import { useOverlayFocus } from "../ui/useOverlayFocus";

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
  const menuButtonRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useOverlayFocus({
    active: open,
    containerRef: mobileMenuRef,
    restoreFocusRef: menuButtonRef,
    onClose: () => setOpen(false),
  });

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
          <DisplayPreferences compact />
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
          ref={menuButtonRef}
          className="menu-btn"
          type="button"
          aria-label={open ? "Đóng menu" : "Mở menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <>
          <button
            className="mobile-menu-backdrop"
            type="button"
            aria-label="Đóng menu điều hướng"
            onClick={() => setOpen(false)}
          />
          <nav
            id="mobile-navigation"
            className="container mobile-menu"
            aria-label="Điều hướng di động"
            ref={mobileMenuRef}
            tabIndex={-1}
          >
            <DisplayPreferences />
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
        </>
      )}
    </header>
  );
}
