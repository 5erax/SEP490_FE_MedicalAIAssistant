// src/components/landing/HeroSection.jsx
import { useState, useEffect } from "react";
import { C, FONT } from "../../styles/tokens";

/* Typewriter hook */
function useTypewriter(phrases) {
  const [text, setText]       = useState("");
  const [pi,   setPi]         = useState(0);
  const [ci,   setCi]         = useState(0);
  const [del,  setDel]        = useState(false);

  useEffect(() => {
    const cur = phrases[pi];
    const id  = setTimeout(() => {
      if (!del) {
        if (ci < cur.length) { setText(cur.slice(0, ci + 1)); setCi(c => c + 1); }
        else setTimeout(() => setDel(true), 1800);
      } else {
        if (ci > 0) { setText(cur.slice(0, ci - 1)); setCi(c => c - 1); }
        else { setDel(false); setPi(p => (p + 1) % phrases.length); }
      }
    }, del ? 32 : 60);
    return () => clearTimeout(id);
  }, [ci, del, pi, phrases]);

  return text;
}

/* Decorative medical cross SVG */
function CrossIcon({ size = 48, color = C.lime }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="18" y="6"  width="12" height="36" rx="4" fill={color} />
      <rect x="6"  y="18" width="36" height="12" rx="4" fill={color} />
    </svg>
  );
}

/* Mini AI result preview */
function ResultPreview() {
  const rows = [
    { label: "Chuyên khoa gợi ý", value: "Nội khoa tổng quát", pct: 91, ok: true },
    { label: "Mức độ ưu tiên",    value: "Trong 48–72 giờ",   pct: 74, ok: null },
    { label: "Tương tác thuốc",   value: "Không phát hiện",   pct: 98, ok: true },
  ];
  return (
    <div style={{
      background: C.dark, borderRadius: 16, overflow: "hidden",
      boxShadow: "0 16px 48px rgba(0,0,0,.18)",
    }}>
      {/* header bar */}
      <div style={{
        background: "#1A1E19", padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.45)", letterSpacing: ".1em", textTransform: "uppercase" }}>
          Kết quả phân tích AI
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.lime, animation: "pulseDot 2s ease infinite" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: C.lime }}>Live</span>
        </span>
      </div>
      {/* rows */}
      {rows.map((r, i) => (
        <div key={i} style={{
          padding: "14px 20px",
          borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".05em" }}>{r.label}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 4,
              background: r.ok === true ? "rgba(170,237,99,.15)" : "rgba(255,184,0,.12)",
              color: r.ok === true ? C.lime : C.amber,
            }}>{r.pct}%</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#fff", flex: 1 }}>{r.value}</span>
            <div style={{ width: 72, height: 3, background: "rgba(255,255,255,.08)", borderRadius: 99 }}>
              <div style={{ height: "100%", width: `${r.pct}%`, background: r.ok === true ? C.lime : "#FBBF24", borderRadius: 99 }} />
            </div>
          </div>
        </div>
      ))}
      {/* disclaimer */}
      <div style={{ padding: "12px 20px", background: "rgba(255,255,255,.03)", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span style={{ color: "#F59E0B", fontSize: 13, flexShrink: 0 }}>⚕</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)", lineHeight: 1.6 }}>
          Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán y khoa.
        </span>
      </div>
    </div>
  );
}

export function HeroSection() {
  const typed = useTypewriter([
    "Đau đầu, sốt nhẹ kéo dài 3 ngày...",
    "Khó thở khi leo cầu thang...",
    "Đau bụng âm ỉ sau bữa ăn...",
    "Mất ngủ, hồi hộp không rõ nguyên nhân...",
  ]);

  return (
    <section style={{ background: C.bg, paddingTop: 60 }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 20px",
      }}>
        {/* ── Main hero row ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 40,
          padding: "64px 0 0",
        }}
          /* desktop override via inline — handled via className trick below */
        >
          {/* Dùng style tag để override responsive */}
          <style>{`
            @media (min-width: 900px) {
              .hero-grid { grid-template-columns: 1fr 1fr !important; align-items: center; gap: 60px !important; }
              .hero-visual { display: flex !important; }
            }
          `}</style>

          <div className="hero-grid" style={{
            display: "grid", gridTemplateColumns: "1fr",
            gap: 40,
          }}>
            {/* LEFT TEXT */}
            <div style={{ animation: "fadeUp .6s ease both" }}>
              {/* badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: C.limeLt, border: `1px solid ${C.lime}`,
                borderRadius: 100, padding: "5px 14px", marginBottom: 28,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.limeDk }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.limeDk }}>Trợ lý y khoa AI thế hệ mới</span>
              </div>

              {/* headline */}
              <h1 style={{
                fontFamily: FONT.display,
                fontSize: "clamp(36px, 5.5vw, 72px)",
                fontWeight: 600, lineHeight: 1.08,
                letterSpacing: "-.5px", color: C.dark,
                marginBottom: 24,
              }}>
                Chăm sóc sức khoẻ{" "}
                <em style={{ color: C.teal, fontStyle: "italic" }}>thông minh hơn</em>
                <br />— từ triệu chứng đến phục hồi.
              </h1>

              <p style={{
                fontSize: "clamp(14px,1.5vw,17px)",
                color: C.navy70, lineHeight: 1.75,
                maxWidth: 480, marginBottom: 36,
              }}>
                MediMate AI phân tích triệu chứng, giải thích kết quả xét nghiệm
                và theo dõi hành trình điều trị — bằng tiếng Việt tự nhiên.
              </p>

              {/* Typewriter input */}
              <div style={{
                background: C.paper,
                border: `2px solid ${C.dark}`,
                borderRadius: 12, padding: "14px 18px",
                display: "flex", alignItems: "center", gap: 12,
                marginBottom: 24,
                boxShadow: "4px 4px 0 " + C.dark,
              }}>
                <span style={{ fontSize: 18 }}>🩺</span>
                <span style={{ fontSize: 14, color: C.dark, flex: 1, lineHeight: 1.5, minHeight: 22 }}>
                  {typed}
                  <span style={{
                    display: "inline-block", width: 0,
                    borderRight: `2px solid ${C.teal}`,
                    marginLeft: 1, height: "1em",
                    verticalAlign: "text-bottom",
                    animation: "blink 1s step-end infinite",
                  }} />
                </span>
                <button style={{
                  background: C.dark, color: "#fff",
                  border: "none", borderRadius: 8,
                  padding: "9px 18px", fontSize: 13, fontWeight: 700,
                  flexShrink: 0, transition: "opacity .15s",
                }}
                  onMouseEnter={e => e.target.style.opacity = ".8"}
                  onMouseLeave={e => e.target.style.opacity = "1"}
                >Phân tích →</button>
              </div>

              {/* CTAs */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
                <button style={{
                  background: C.lime, color: C.dark,
                  border: `2px solid ${C.dark}`,
                  borderRadius: 10, padding: "13px 28px",
                  fontSize: 15, fontWeight: 800,
                  boxShadow: "3px 3px 0 " + C.dark,
                  transition: "transform .15s, box-shadow .15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = "5px 5px 0 " + C.dark; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "3px 3px 0 " + C.dark; }}
                >Bắt đầu miễn phí</button>

                <button style={{
                  background: "transparent", color: C.dark,
                  border: `2px solid ${C.dark}`,
                  borderRadius: 10, padding: "13px 24px",
                  fontSize: 15, fontWeight: 700,
                  transition: "background .15s",
                }}
                  onMouseEnter={e => e.target.style.background = C.navy06}
                  onMouseLeave={e => e.target.style.background = "transparent"}
                >▶ Xem demo</button>
              </div>

              {/* Trust chips */}
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {["✓ Nguồn y khoa RAG", "✓ Hỗ trợ tiếng Việt", "✓ Bảo mật dữ liệu"].map(t => (
                  <span key={t} style={{ fontSize: 12, fontWeight: 600, color: C.navy40 }}>{t}</span>
                ))}
              </div>
            </div>

            {/* RIGHT — visual */}
            <div className="hero-visual" style={{
              display: "none",
              flexDirection: "column", gap: 20,
              animation: "fadeUp .6s .15s ease both",
            }}>
              {/* decorative element */}
              <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 8 }}>
                <div style={{
                  width: 80, height: 80, background: C.limeLt,
                  border: `2px solid ${C.lime}`,
                  borderRadius: 16, display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <CrossIcon size={40} color={C.lime} />
                </div>
              </div>
              <ResultPreview />
              {/* stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[["50,000+", "Người dùng tin tưởng"], ["98.4%", "Độ chính xác AI"], ["< 2.5s", "Thời gian phản hồi"], ["24/7", "Hỗ trợ liên tục"]].map(([n, l]) => (
                  <div key={l} style={{
                    background: C.paper,
                    border: `1.5px solid ${C.dark}`,
                    borderRadius: 12, padding: "16px 18px",
                    boxShadow: "2px 2px 0 " + C.dark,
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.dark, letterSpacing: "-.5px" }}>{n}</div>
                    <div style={{ fontSize: 11, color: C.navy40, marginTop: 2, fontWeight: 500 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Logos / Partners ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          flexWrap: "wrap", gap: "12px 32px",
          padding: "40px 0 48px",
          borderTop: `1px solid ${C.line}`,
          marginTop: 48,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.navy40, letterSpacing: ".08em", textTransform: "uppercase", width: "100%", textAlign: "center", marginBottom: 12 }}>
            Được tin dùng bởi
          </span>
          {["Bộ Y tế", "Vinmec", "FPT Healthcare", "Medlatec", "VNPT Health", "Pharmacity"].map(p => (
            <span key={p} style={{
              fontSize: 13, fontWeight: 700, color: C.navy40,
              padding: "6px 16px", borderRadius: 100,
              border: `1px solid ${C.line}`,
            }}>{p}</span>
          ))}
        </div>
      </div>
    </section>
  );
}