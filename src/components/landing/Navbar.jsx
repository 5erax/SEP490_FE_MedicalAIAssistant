// src/components/landing/Navbar.jsx
import { useState, useEffect } from "react";
import { C, FONT } from "../../styles/tokens";

const NAV_LINKS = [
  { name: "Tính năng", href: "#features" },
  { name: "Giải pháp", href: "#solutions" },
  { name: "Bảng giá", href: "#pricing" },
  { name: "Liên hệ", href: "#contact" }
];

const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill={C.dark} />
      <path d="M10 16h5m0 0v-5m0 5v5m0-5h5" stroke={C.lime} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="22" cy="10" r="2.5" fill={C.lime} opacity=".7" />
    </svg>
    <span style={{ 
      fontFamily: FONT.display || "inherit", 
      fontWeight: 800, 
      fontSize: 18, 
      color: C.dark, 
      letterSpacing: "-.5px" 
    }}>
      MediMate <span style={{ color: C.teal }}>AI</span>
    </span>
  </div>
);

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Khóa cuộn trang khi mở menu mobile
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <>
      {/* Global CSS cho Navbar */}
      <style>{`
        .nav-link { position: relative; color: ${C.navy70}; text-decoration: none; }
        .nav-link::after {
          content: ''; position: absolute; bottom: -4px; left: 0; width: 0; 
          height: 2px; background: ${C.teal}; transition: width 0.25s ease;
        }
        .nav-link:hover::after { width: 100%; }
        
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
        }
        @media (min-width: 769px) {
          .hide-desktop { display: none !important; }
        }
      `}</style>

      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        height: scrolled ? 64 : 80,
        background: scrolled || menuOpen ? "rgba(255,255,255,0.92)" : "transparent",
        backdropFilter: scrolled || menuOpen ? "blur(12px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.line || "rgba(0,0,0,0.05)"}` : "1px solid transparent",
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        display: "flex", alignItems: "center",
      }}>
        <div style={{
          width: "100%", maxWidth: 1200, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px",
        }}>
          <Logo />

          {/* Desktop Nav */}
          <nav className="hide-mobile" style={{ display: "flex", gap: 32, alignItems: "center" }}>
            {NAV_LINKS.map(l => (
              <a key={l.name} href={l.href} className="nav-link" style={{
                fontSize: 14, fontWeight: 600, transition: "color 0.2s"
              }}
                onMouseEnter={e => e.target.style.color = C.dark}
                onMouseLeave={e => e.target.style.color = C.navy70}
              >
                {l.name}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hide-mobile" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button style={{
              background: "transparent", border: "none",
              fontSize: 14, fontWeight: 600, color: C.dark,
              cursor: "pointer", padding: "8px 16px"
            }}>Đăng nhập</button>
            <button style={{
              background: C.dark, color: "#fff", border: "none",
              borderRadius: 10, padding: "10px 22px",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              transition: "transform 0.2s, background 0.2s"
            }}
              onMouseEnter={e => {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.background = "#222";
              }}
              onMouseLeave={e => {
                e.target.style.transform = "translateY(0)";
                e.target.style.background = C.dark;
              }}
            >Dùng thử miễn phí</button>
          </div>

          {/* Hamburger Menu Button */}
          <button
            className="hide-desktop"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: menuOpen ? "rgba(0,0,0,0.05)" : "transparent",
              border: "none", width: 40, height: 40, borderRadius: 10,
              display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 5,
              cursor: "pointer", transition: "0.2s", zIndex: 1001
            }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display: "block", width: 20, height: 2, background: C.dark,
                borderRadius: 2, transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                transform: menuOpen 
                  ? i === 0 ? "translateY(7px) rotate(45deg)" 
                  : i === 1 ? "opacity(0) scaleX(0)" 
                  : "translateY(-7px) rotate(-45deg)"
                  : "none"
              }} />
            ))}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "#fff",
        transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: menuOpen ? "translateX(0)" : "translateX(100%)",
        visibility: menuOpen ? "visible" : "hidden",
        display: "flex", flexDirection: "column",
        padding: "100px 24px 40px",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {NAV_LINKS.map((l, i) => (
            <a key={l.name} href={l.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontSize: 28, fontWeight: 700, color: C.dark,
                padding: "16px 0", textDecoration: "none",
                borderBottom: `1px solid ${C.line || "rgba(0,0,0,0.05)"}`,
                transform: menuOpen ? "translateY(0)" : "translateY(20px)",
                opacity: menuOpen ? 1 : 0,
                transition: `all 0.4s ease ${0.1 + i * 0.1}s`
              }}
            >
              {l.name}
            </a>
          ))}
        </div>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <button style={{
            background: C.dark, color: "#fff", border: "none",
            borderRadius: 12, padding: "18px", fontSize: 16, fontWeight: 700,
          }}>Bắt đầu ngay</button>
          <button style={{
            background: "transparent", border: `1.5px solid ${C.dark}`,
            borderRadius: 12, padding: "18px", fontSize: 16, fontWeight: 700, color: C.dark
          }}>Đăng nhập hệ thống</button>
        </div>
      </div>
    </>
  );
}