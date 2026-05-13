// src/components/landing/PricingSection.jsx
import { useRef, useState, useEffect } from "react";
import { C, FONT } from "../../styles/tokens";

function useInView(th = 0.08) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: th });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, v];
}

const PLANS = [
  {
    code: "MIỄN PHÍ", name: "Cơ bản",
    price: "0", unit: "₫", period: "mãi mãi",
    desc: "Dành cho người dùng cá nhân muốn khám phá tính năng cơ bản.",
    feats: [
      { ok: true,  text: "Phân tích triệu chứng cơ bản" },
      { ok: true,  text: "Gợi ý chuyên khoa" },
      { ok: true,  text: "Tìm kiếm cơ sở y tế" },
      { ok: false, text: "Tư vấn AI 24/7 sau khám" },
      { ok: false, text: "Cảnh báo tương tác thuốc" },
      { ok: false, text: "Theo dõi xu hướng sức khoẻ" },
    ],
    cta: "Bắt đầu ngay",
    dark: false,
  },
  {
    code: "PHỔ BIẾN", name: "MediMate+",
    price: "149,000", unit: "₫", period: "/ tháng",
    desc: "Đầy đủ tính năng cho bệnh nhân cần theo dõi sức khoẻ nghiêm túc.",
    feats: [
      { ok: true, text: "Phân tích triệu chứng nâng cao" },
      { ok: true, text: "Tư vấn AI 24/7 sau khám" },
      { ok: true, text: "Tóm tắt hồ sơ y tế chuyên sâu" },
      { ok: true, text: "Cảnh báo tương tác thuốc" },
      { ok: true, text: "Theo dõi xu hướng sức khoẻ" },
      { ok: true, text: "Nhắc tái khám ưu tiên" },
    ],
    cta: "Dùng thử 14 ngày",
    dark: true,
  },
];

export function PricingSection() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{
      background: C.paper,
      borderTop: `2px solid ${C.dark}`,
      borderBottom: `2px solid ${C.dark}`,
      padding: "80px 0",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        {/* header */}
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 16, height: 3, background: C.lime, borderRadius: 2 }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.limeDk }}>Bảng giá</span>
            <div style={{ width: 16, height: 3, background: C.lime, borderRadius: 2 }} />
          </div>
          <h2 style={{
            fontFamily: FONT.display,
            fontSize: "clamp(26px,4vw,48px)",
            fontWeight: 600, color: C.dark, lineHeight: 1.12, letterSpacing: "-.4px",
          }}>
            Minh bạch. Không phí ẩn.{" "}
            <em style={{ color: C.teal }}>Huỷ bất cứ lúc nào.</em>
          </h2>
        </div>

        {/* plans */}
        <style>{`
          .plans-grid { display: grid; grid-template-columns: 1fr; gap: 16px; max-width: 860px; margin: 0 auto; }
          @media(min-width:640px) { .plans-grid { grid-template-columns: 1fr 1fr; } }
        `}</style>
        <div className="plans-grid">
          {PLANS.map((p, i) => (
            <div key={i} style={{
              background: p.dark ? C.dark : C.paper,
              border: `2px solid ${C.dark}`,
              borderRadius: 16, padding: "clamp(28px,5vw,44px)",
              position: "relative", overflow: "hidden",
              boxShadow: `4px 4px 0 ${C.dark}`,
              opacity: vis ? 1 : 0,
              transform: vis ? "none" : "translateY(20px)",
              transition: `all .5s ${i * .15}s ease`,
            }}>
              {p.dark && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 4,
                  background: `linear-gradient(90deg, ${C.lime}, ${C.limeDk})`,
                }} />
              )}
              {p.dark && (
                <div style={{
                  position: "absolute", top: 20, right: 20,
                  background: C.lime, color: C.dark,
                  borderRadius: 6, padding: "3px 12px",
                  fontSize: 11, fontWeight: 800, letterSpacing: ".06em",
                }}>✦ PHỔ BIẾN</div>
              )}

              {/* code */}
              <div style={{ fontSize: 11, fontWeight: 800, color: p.dark ? C.lime : C.limeDk, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 20 }}>{p.code}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: p.dark ? "#fff" : C.dark, marginBottom: 8 }}>{p.name}</div>

              {/* price */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: p.dark ? "rgba(255,255,255,.4)" : C.navy40 }}>{p.unit}</span>
                <span style={{ fontSize: 42, fontWeight: 900, color: p.dark ? "#fff" : C.dark, letterSpacing: "-2px", lineHeight: 1 }}>{p.price}</span>
                <span style={{ fontSize: 13, color: p.dark ? "rgba(255,255,255,.4)" : C.navy40 }}>{p.period}</span>
              </div>

              <p style={{ fontSize: 13, color: p.dark ? "rgba(255,255,255,.5)" : C.navy70, lineHeight: 1.65, marginBottom: 24 }}>{p.desc}</p>
              <div style={{ height: 1, background: p.dark ? "rgba(255,255,255,.1)" : C.line, marginBottom: 24 }} />

              {/* features */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                {p.feats.map((f, j) => (
                  <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{
                      fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 1,
                      color: f.ok
                        ? (p.dark ? C.lime : C.green)
                        : (p.dark ? "rgba(255,255,255,.15)" : C.lineDk),
                    }}>{f.ok ? "✓" : "✕"}</span>
                    <span style={{
                      fontSize: 14, lineHeight: 1.5,
                      color: f.ok
                        ? (p.dark ? "rgba(255,255,255,.8)" : C.navy70)
                        : (p.dark ? "rgba(255,255,255,.2)" : C.navy40),
                      textDecoration: f.ok ? "none" : "line-through",
                    }}>{f.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button style={{
                width: "100%", padding: "14px",
                background: p.dark ? C.lime : "transparent",
                color: p.dark ? C.dark : C.dark,
                border: `2px solid ${p.dark ? C.lime : C.dark}`,
                borderRadius: 10, fontSize: 15, fontWeight: 800,
                boxShadow: p.dark ? `2px 2px 0 ${C.limeDk}` : `2px 2px 0 ${C.dark}`,
                transition: "transform .15s, box-shadow .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translate(-1px,-1px)"; e.currentTarget.style.boxShadow = p.dark ? `4px 4px 0 ${C.limeDk}` : `4px 4px 0 ${C.dark}`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = p.dark ? `2px 2px 0 ${C.limeDk}` : `2px 2px 0 ${C.dark}`; }}
              >{p.cta}</button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: C.navy40 }}>
          Thanh toán qua VNPay · MoMo · Thẻ tín dụng quốc tế
        </p>
      </div>
    </section>
  );
}


// ─────────────────────────────────────────────────────────────
// src/components/landing/CtaSection.jsx
// ─────────────────────────────────────────────────────────────

export function CtaSection() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ background: C.bg, padding: "80px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{
          background: C.lime,
          border: `2px solid ${C.dark}`,
          borderRadius: 20, padding: "clamp(40px,6vw,72px)",
          boxShadow: "6px 6px 0 " + C.dark,
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(20px)",
          transition: "all .6s ease",
          position: "relative", overflow: "hidden",
        }}>
          {/* decorative cross */}
          <div style={{ position: "absolute", right: 40, top: 40, opacity: .2 }}>
            <svg width="80" height="80" viewBox="0 0 48 48" fill="none">
              <rect x="18" y="6"  width="12" height="36" rx="4" fill={C.dark} />
              <rect x="6"  y="18" width="36" height="12" rx="4" fill={C.dark} />
            </svg>
          </div>
          <div style={{ position: "absolute", right: 160, bottom: 30, opacity: .12 }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="18" y="6"  width="12" height="36" rx="4" fill={C.dark} />
              <rect x="6"  y="18" width="36" height="12" rx="4" fill={C.dark} />
            </svg>
          </div>

          <style>{`
            .cta-inner { display: flex; flex-direction: column; gap: 32px; }
            @media(min-width:768px) { .cta-inner { flex-direction: row; align-items: center; justify-content: space-between; } }
          `}</style>
          <div className="cta-inner">
            <div>
              <h2 style={{
                fontFamily: FONT.display,
                fontSize: "clamp(24px,3.5vw,44px)",
                fontWeight: 600, color: C.dark, lineHeight: 1.15, letterSpacing: "-.4px",
                marginBottom: 12,
              }}>
                Bắt đầu hành trình chăm sóc<br />
                <em>sức khoẻ thông minh ngay hôm nay.</em>
              </h2>
              <p style={{ fontSize: 15, color: C.navyMid, fontWeight: 500 }}>
                Miễn phí · Không cần thẻ tín dụng · Cài đặt trong 2 phút
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
              <button style={{
                background: C.dark, color: "#fff", border: `2px solid ${C.dark}`,
                borderRadius: 10, padding: "14px 32px",
                fontSize: 15, fontWeight: 800,
                boxShadow: "3px 3px 0 rgba(0,0,0,.4)",
                transition: "transform .15s, box-shadow .15s",
                whiteSpace: "nowrap",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = "5px 5px 0 rgba(0,0,0,.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "3px 3px 0 rgba(0,0,0,.4)"; }}
              >Dùng thử miễn phí</button>
              <button style={{
                background: "rgba(0,0,0,.08)", color: C.dark,
                border: `2px solid ${C.dark}`,
                borderRadius: 10, padding: "14px 24px",
                fontSize: 15, fontWeight: 700,
                transition: "background .15s", whiteSpace: "nowrap",
              }}
                onMouseEnter={e => e.target.style.background = "rgba(0,0,0,.15)"}
                onMouseLeave={e => e.target.style.background = "rgba(0,0,0,.08)"}
              >Liên hệ tư vấn</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


// ─────────────────────────────────────────────────────────────
// src/components/landing/Footer.jsx
// ─────────────────────────────────────────────────────────────

const FOOTER_COLS = [
  { h: "Sản phẩm", ls: ["Tính năng", "Bảng giá", "Changelog", "API"] },
  { h: "Pháp lý",  ls: ["Điều khoản sử dụng", "Chính sách bảo mật", "Cookie", "Disclaimer"] },
  { h: "Hỗ trợ",  ls: ["Tài liệu hướng dẫn", "Liên hệ", "Cộng đồng", "Tình trạng hệ thống"] },
];

export function Footer() {
  return (
    <footer style={{
      background: C.dark,
      borderTop: `2px solid ${C.dark}`,
    }}>
      {/* main grid */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <style>{`
          .footer-grid { display: grid; grid-template-columns: 1fr; gap: 40px; padding: 56px 0 40px; }
          @media(min-width:640px) { .footer-grid { grid-template-columns: 1fr 1fr; } }
          @media(min-width:1024px){ .footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; } }
        `}</style>
        <div className="footer-grid">
          {/* brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill={C.lime} />
                <path d="M10 16h5m0 0v-5m0 5v5m0-5h5" stroke={C.dark} strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="22" cy="10" r="2.5" fill={C.dark} opacity=".6" />
              </svg>
              <span style={{ fontFamily: FONT.body, fontWeight: 800, fontSize: 15, color: "#fff" }}>MediMate AI</span>
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", lineHeight: 1.75, maxWidth: 240, marginBottom: 20 }}>
              Trợ lý y khoa thông minh hỗ trợ người Việt chăm sóc sức khoẻ tốt hơn.
            </p>
            <div style={{
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,184,0,.25)",
              borderRadius: 8, padding: "10px 14px",
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <span style={{ color: "#F59E0B", fontSize: 14, flexShrink: 0 }}>⚕</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)", lineHeight: 1.65 }}>
                Kết quả AI chỉ mang tính tham khảo, không thay thế chẩn đoán y khoa chuyên nghiệp.
              </span>
            </div>
          </div>

          {/* link columns */}
          {FOOTER_COLS.map(({ h, ls }) => (
            <div key={h}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.3)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 18 }}>{h}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {ls.map(l => (
                  <a key={l} href="#" style={{
                    fontSize: 14, color: "rgba(255,255,255,.45)", fontWeight: 400,
                    transition: "color .15s",
                  }}
                    onMouseEnter={e => e.target.style.color = "#fff"}
                    onMouseLeave={e => e.target.style.color = "rgba(255,255,255,.45)"}
                  >{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* bottom bar */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,.08)",
          padding: "20px 0",
          display: "flex", flexWrap: "wrap", gap: 12,
          justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.2)" }}>© 2026 MediMate AI. Bảo lưu mọi quyền.</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.2)" }}>Được xây dựng tại Việt Nam 🇻🇳</span>
        </div>
      </div>
    </footer>
  );
}