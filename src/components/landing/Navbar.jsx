import { Menu, X } from "lucide-react";
import { createRef, useEffect, useMemo, useRef, useState } from "react";
import { getStoredAuth } from "../../services/api";
import { useOverlayFocus } from "../ui";

const NAV_LINKS = [
  { name: "Tính năng", href: "/#support", sectionId: "support" },
  { name: "Bản đồ", href: "/#map", sectionId: "map" },
  { name: "Bảng giá", href: "/#pricing-preview", sectionId: "pricing-preview" },
];

function Logo() {
  return (
    <a className="brand" href="/" aria-label="MediMate AI">
      <span className="brand-mark" aria-hidden="true">
        <img src="/logo.svg" alt="" width="36" height="36" />
      </span>
      <span>MediMate AI</span>
    </a>
  );
}

export function Navbar({ variant = "default" }) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(() => (
    typeof window === "undefined" ? "" : window.location.hash.slice(1)
  ));
  const [auth] = useState(() => getStoredAuth());
  const headerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const menuCloseButtonRef = useRef(null);
  const mobileDialogRef = useRef(null);
  const mobileNavRef = useRef(null);
  const inertRefs = useMemo(
    () => Array.from({ length: 8 }, () => createRef()),
    [],
  );

  useEffect(() => {
    const header = headerRef.current;
    const main = document.querySelector("main");
    const elements = [];

    if (main?.contains(header)) {
      elements.push(...Array.from(main.children).filter((element) => element !== header));
    } else if (main) {
      elements.push(main);
    }

    const footer = document.querySelector("footer");
    const chatbox = document.querySelector(".landing-ai-chatbox");
    const chatLauncher = document.querySelector(".landing-chat-launcher");
    if (footer && !elements.includes(footer)) elements.push(footer);
    if (chatbox) elements.push(chatbox);
    if (chatLauncher) elements.push(chatLauncher);

    inertRefs.forEach((ref, index) => {
      ref.current = elements[index] ?? null;
    });
  }, [inertRefs]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 960px)");
    function closeMenuOnDesktop(event) {
      if (!event.matches) setOpen(false);
    }
    mobileQuery.addEventListener("change", closeMenuOnDesktop);
    return () => mobileQuery.removeEventListener("change", closeMenuOnDesktop);
  }, []);

  useOverlayFocus({
    active: open,
    containerRef: mobileDialogRef,
    initialFocusRef: menuCloseButtonRef,
    restoreFocusRef: menuButtonRef,
    inertRefs,
    onClose: () => setOpen(false),
  });

  useEffect(() => {
    const navSectionIds = new Set(NAV_LINKS.map(({ sectionId }) => sectionId));
    const sections = [...document.querySelectorAll(".landing-page > section")];
    let animationFrame = 0;

    function updateActiveSection() {
      animationFrame = 0;
      const navHeight = document.querySelector(".nav")?.getBoundingClientRect().height ?? 0;
      const viewportTop = navHeight;
      const viewportBottom = window.innerHeight;
      let currentSection = null;
      let largestVisibleArea = 0;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const visibleArea = Math.max(
          0,
          Math.min(rect.bottom, viewportBottom) - Math.max(rect.top, viewportTop),
        );

        if (visibleArea > largestVisibleArea) {
          largestVisibleArea = visibleArea;
          currentSection = section;
        }
      });

      const nextSection = currentSection && navSectionIds.has(currentSection.id)
        ? currentSection.id
        : "";
      setActiveSection((current) => current === nextSection ? current : nextSection);
    }

    function scheduleUpdate() {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateActiveSection);
    }

    function syncHash() {
      const hashSection = window.location.hash.slice(1);
      if (navSectionIds.has(hashSection)) setActiveSection(hashSection);
      scheduleUpdate();
    }

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", syncHash);
    scheduleUpdate();

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  return (
    <header ref={headerRef} className={`nav ${variant === "landing" ? "nav-care" : ""}`}>
      <div className="container nav-inner">
        <Logo />

        <nav className="nav-links" aria-label="Điều hướng chính">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={activeSection === link.sectionId ? "location" : undefined}
              onClick={() => setActiveSection(link.sectionId)}
            >
              {link.name}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          {auth ? (
            <a href="/app" className="btn btn-dark">
              Vào ứng dụng
            </a>
          ) : (
            <a href="/login" className="btn btn-dark">Đăng nhập</a>
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
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div
            ref={mobileDialogRef}
            className="mobile-menu-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
          >
            <nav
              ref={mobileNavRef}
              id="mobile-navigation"
              className="container mobile-menu"
              aria-label="Điều hướng di động"
            >
              <button
                ref={menuCloseButtonRef}
                className="mobile-menu-close"
                type="button"
                onClick={() => setOpen(false)}
              >
                <span>Đóng menu</span>
                <X size={19} aria-hidden="true" />
              </button>
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={activeSection === link.sectionId ? "location" : undefined}
                  onClick={() => {
                    setActiveSection(link.sectionId);
                    setOpen(false);
                  }}
                >
                  {link.name}
                </a>
              ))}
              {!auth && (
                <a className="btn care-nav-login" href="/login" onClick={() => setOpen(false)}>
                  Đăng nhập
                </a>
              )}
              {auth && (
                <a className="btn btn-primary" href="/app" onClick={() => setOpen(false)}>
                  Vào ứng dụng
                </a>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
