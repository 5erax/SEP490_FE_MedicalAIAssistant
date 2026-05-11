import { useState, useEffect, useRef } from "react";

/* ════════════════════════════════════════════════════════════
   DESIGN TOKENS
   Font: Be Vietnam Pro — thiết kế riêng cho tiếng Việt,
         hỗ trợ đầy đủ dấu, nét thanh lịch, dùng được
         ở mọi size. Pair với Lora cho headline display.
════════════════════════════════════════════════════════════ */
const C = {
  bg:       "#F5F7FA",
  paper:    "#FFFFFF",
  navy:     "#0B1829",
  navy70:   "rgba(11,24,41,.7)",
  navy40:   "rgba(11,24,41,.4)",
  navy12:   "rgba(11,24,41,.12)",
  navy06:   "rgba(11,24,41,.06)",
  teal:     "#0891B2",        // Cyan-700 — đủ contrast trên trắng
  tealLt:   "#E0F2FE",
  tealMid:  "#38BDF8",
  green:    "#059669",
  greenLt:  "#D1FAE5",
  amber:    "#B45309",
  amberLt:  "#FEF3C7",
  red:      "#DC2626",
  line:     "#E2E8F0",
  lineDk:   "#CBD5E1",
};

const FONT_BODY    = "'Be Vietnam Pro', sans-serif";
const FONT_DISPLAY = "'Lora', serif";
const FONT_MONO    = "'Be Vietnam Pro', monospace";

/* ════════════════════════════════════════════════════════════
   GLOBAL CSS
════════════════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Lora:ital,wght@0,400;0,600;1,400;1,600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; font-size: 16px; }
  body {
    background: ${C.bg};
    color: ${C.navy};
    font-family: ${FONT_BODY};
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  ::selection { background: ${C.tealLt}; color: ${C.teal}; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: ${C.bg}; }
  ::-webkit-scrollbar-thumb { background: ${C.lineDk}; border-radius: 99px; }

  /* Animations */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes marq {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes pulseDot {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%       { transform: scale(1.6); opacity: .5; }
  }
  @keyframes blink {
    0%, 49% { border-color: ${C.teal}; }
    50%, 100%{ border-color: transparent; }
  }
  @keyframes slideBar {
    from { width: 0; } to { width: var(--bar-w); }
  }

  /* Utility */
  .vis { animation: fadeUp .55s ease both; }
  a { text-decoration: none; color: inherit; }
  button { cursor: pointer; font-family: ${FONT_BODY}; }
`;

/* ════════════════════════════════════════════════════════════
   HOOKS
════════════════════════════════════════════════════════════ */
function useInView(th = 0.1) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: th });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, v];
}

/* ════════════════════════════════════════════════════════════
   SHARED COMPONENTS
════════════════════════════════════════════════════════════ */
function Tag({ children, color = C.teal, bg = C.tealLt }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: bg, color, borderRadius: 4,
      padding: "3px 10px", fontSize: 11, fontWeight: 600,
      letterSpacing: ".06em", textTransform: "uppercase",
    }}>{children}</span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
      <div style={{ width: 20, height: 1.5, background: C.teal }} />
      <span style={{
        fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600,
        letterSpacing: ".1em", textTransform: "uppercase", color: C.teal,
      }}>{children}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.line, width: "100%" }} />;
}

/* ════════════════════════════════════════════════════════════
   NAVBAR
════════════════════════════════════════════════════════════ */
const NAV_LINKS = ["Tính năng", "Giải pháp", "Bảng giá", "Liên hệ"];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 300,
      height: 64,
      background: scrolled ? "rgba(245,247,250,.94)" : "transparent",
      backdropFilter: scrolled ? "blur(16px)" : "none",
      borderBottom: scrolled ? `1px solid ${C.line}` : "none",
      transition: "background .3s, border-color .3s",
      display: "flex", alignItems: "center",
      padding: "0 max(40px, calc((100% - 1200px)/2))",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto" }}>
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <rect width="30" height="30" rx="6" fill={C.navy} />
          <path d="M9 15h4m0 0v-4m0 4v4m0-4h4" stroke={C.tealMid} strokeWidth="2" strokeLinecap="round" />
          <circle cx="21" cy="10" r="2" fill={C.teal} />
        </svg>
        <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 15, color: C.navy, letterSpacing: "-.3px" }}>
          MediMate <span style={{ color: C.teal }}>AI</span>
        </span>
      </div>

      {/* Links */}
      <nav style={{ display: "flex", gap: 36 }}>
        {NAV_LINKS.map(l => (
          <a key={l} href="#" style={{
            fontSize: 14, fontWeight: 500, color: C.navy70,
            transition: "color .18s",
          }}
            onMouseEnter={e => e.target.style.color = C.navy}
            onMouseLeave={e => e.target.style.color = C.navy70}
          >{l}</a>
        ))}
      </nav>

      {/* CTA */}
      <div style={{ display: "flex", gap: 10, marginLeft: 40 }}>
        <button style={{
          background: "transparent", border: "none",
          fontSize: 14, fontWeight: 500, color: C.navy70, padding: "0 4px",
          transition: "color .18s",
        }}
          onMouseEnter={e => e.target.style.color = C.navy}
          onMouseLeave={e => e.target.style.color = C.navy70}
        >Đăng nhập</button>
        <button style={{
          background: C.navy, color: "#fff", border: "none",
          borderRadius: 8, padding: "9px 22px",
          fontSize: 14, fontWeight: 600,
          transition: "opacity .18s, transform .18s",
          boxShadow: `0 2px 12px ${C.navy12}`,
        }}
          onMouseEnter={e => { e.target.style.opacity = ".88"; e.target.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.target.style.opacity = "1"; e.target.style.transform = "none"; }}
        >Dùng thử miễn phí</button>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════════════════════
   HERO
════════════════════════════════════════════════════════════ */
function TypewriterInput() {
  const phrases = [
    "Đau đầu, sốt nhẹ kéo dài 3 ngày...",
    "Khó thở khi leo cầu thang...",
    "Đau bụng âm ỉ sau bữa ăn...",
    "Mất ngủ, hay hồi hộp không rõ nguyên nhân...",
  ];
  const [pi, setPi] = useState(0);
  const [ci, setCi] = useState(0);
  const [del, setDel] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    const cur = phrases[pi];
    const id = setTimeout(() => {
      if (!del) {
        if (ci < cur.length) { setText(cur.slice(0, ci + 1)); setCi(c => c + 1); }
        else setTimeout(() => setDel(true), 1800);
      } else {
        if (ci > 0) { setText(cur.slice(0, ci - 1)); setCi(c => c - 1); }
        else { setDel(false); setPi(p => (p + 1) % phrases.length); }
      }
    }, del ? 32 : 62);
    return () => clearTimeout(id);
  }, [ci, del, pi]);

  return (
    <div style={{
      background: C.paper, border: `1.5px solid ${C.teal}`,
      borderRadius: 12, padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: `0 0 0 4px ${C.tealLt}`,
    }}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="9" cy="9" r="8" stroke={C.teal} strokeWidth="1.5" />
        <path d="M6 9h6M9 6v6" stroke={C.teal} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: 15, color: C.navy, flex: 1, lineHeight: 1.5 }}>
        {text}
        <span style={{ display: "inline-block", width: 0, borderRight: `2px solid ${C.teal}`, marginLeft: 1, height: "1.1em", verticalAlign: "text-bottom", animation: "blink 1s step-end infinite" }} />
      </span>
      <button style={{
        background: C.teal, color: "#fff", border: "none",
        borderRadius: 7, padding: "8px 18px",
        fontSize: 13, fontWeight: 600, flexShrink: 0,
        transition: "opacity .18s",
      }}
        onMouseEnter={e => e.target.style.opacity = ".85"}
        onMouseLeave={e => e.target.style.opacity = "1"}
      >Phân tích</button>
    </div>
  );
}

/* Result card shown beside typewriter */
function MiniResultCard() {
  const rows = [
    { label: "Chuyên khoa gợi ý", value: "Nội khoa tổng quát", conf: 91, color: C.green },
    { label: "Mức độ ưu tiên", value: "Trong 48–72 giờ", conf: 74, color: C.amber },
    { label: "Tương tác thuốc", value: "Không phát hiện", conf: 98, color: C.green },
  ];
  return (
    <div style={{
      background: C.paper, border: `1px solid ${C.line}`,
      borderRadius: 14, overflow: "hidden",
      boxShadow: "0 8px 40px rgba(11,24,41,.09)",
    }}>
      {/* header */}
      <div style={{
        background: C.navy, padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", letterSpacing: ".04em" }}>
          KẾT QUẢ PHÂN TÍCH AI
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.tealMid, animation: "pulseDot 2s ease infinite" }} />
          <span style={{ fontSize: 11, color: C.tealMid, fontWeight: 500 }}>Đang xử lý</span>
        </span>
      </div>
      {/* rows */}
      <div style={{ padding: "6px 0" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ padding: "14px 20px", borderBottom: i < rows.length - 1 ? `1px solid ${C.navy06}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.navy40, textTransform: "uppercase", letterSpacing: ".05em" }}>{r.label}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: r.color,
                background: r.color === C.green ? C.greenLt : C.amberLt,
                padding: "1px 8px", borderRadius: 4,
              }}>{r.conf}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: C.navy, flex: 1 }}>{r.value}</span>
              <div style={{ width: 80, height: 3, background: C.navy06, borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", background: r.color, borderRadius: 99,
                  width: `${r.conf}%`, transition: "width 1.2s ease",
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* disclaimer */}
      <div style={{
        background: C.amberLt, borderTop: `1px solid ${C.line}`,
        padding: "10px 20px", display: "flex", gap: 8, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>⚕</span>
        <span style={{ fontSize: 11, color: C.amber, lineHeight: 1.6 }}>
          Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán y khoa chuyên nghiệp.
        </span>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section style={{
      minHeight: "100vh", paddingTop: 64,
      display: "grid", gridTemplateColumns: "1fr 1fr",
      maxWidth: 1200, margin: "0 auto",
      padding: "64px max(40px, calc((100% - 1200px)/2)) 80px",
    }}>
      {/* LEFT */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: 64, animation: "fadeUp .65s ease both" }}>
        <div style={{ marginBottom: 28 }}>
          <Tag>✦ Trợ lý y khoa AI thế hệ mới</Tag>
        </div>

        <h1 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: "clamp(42px, 5vw, 68px)",
          fontWeight: 600, lineHeight: 1.1,
          letterSpacing: "-.5px", color: C.navy,
          marginBottom: 24,
        }}>
          Chăm sóc sức khoẻ{" "}
          <em style={{ color: C.teal, fontStyle: "italic" }}>thông minh hơn</em>{" "}
          — từ triệu chứng đến phục hồi.
        </h1>

        <p style={{
          fontSize: 17, color: C.navy70, lineHeight: 1.75,
          maxWidth: 480, marginBottom: 40, fontWeight: 400,
        }}>
          MediMate AI phân tích triệu chứng, giải thích kết quả xét nghiệm và theo dõi hành trình điều trị — bằng tiếng Việt tự nhiên, dựa trên nguồn y khoa đáng tin cậy.
        </p>

        <div style={{ marginBottom: 48 }}>
          <TypewriterInput />
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <button style={{
            background: C.navy, color: "#fff", border: "none",
            borderRadius: 10, padding: "14px 32px",
            fontSize: 15, fontWeight: 600,
            boxShadow: `0 4px 20px ${C.navy12}`,
            transition: "transform .18s, box-shadow .18s",
          }}
            onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = `0 8px 28px ${C.navy12}`; }}
            onMouseLeave={e => { e.target.style.transform = "none"; e.target.style.boxShadow = `0 4px 20px ${C.navy12}`; }}
          >Bắt đầu miễn phí</button>
          <button style={{
            background: "transparent", color: C.navy,
            border: `1.5px solid ${C.lineDk}`,
            borderRadius: 10, padding: "13px 28px",
            fontSize: 15, fontWeight: 500,
            transition: "border-color .18s",
          }}
            onMouseEnter={e => e.target.style.borderColor = C.navy}
            onMouseLeave={e => e.target.style.borderColor = C.lineDk}
          >▶ Xem demo</button>
        </div>

        {/* Trust row */}
        <div style={{ display: "flex", gap: 24, marginTop: 44, flexWrap: "wrap" }}>
          {[
            ["✓", C.green, "Nguồn y khoa RAG đáng tin cậy"],
            ["✓", C.green, "Hỗ trợ tiếng Việt toàn diện"],
            ["✓", C.green, "Dữ liệu bảo mật riêng tư"],
          ].map(([ic, col, txt]) => (
            <span key={txt} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.navy70, fontWeight: 500 }}>
              <span style={{ color: col, fontSize: 14 }}>{ic}</span>{txt}
            </span>
          ))}
        </div>
      </div>

      {/* RIGHT — Result card */}
      <div style={{
        display: "flex", flexDirection: "column", justifyContent: "center", gap: 24,
        animation: "fadeUp .65s .15s ease both",
      }}>
        {/* floating label */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal, animation: "pulseDot 2s ease infinite" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.teal, letterSpacing: ".06em", textTransform: "uppercase" }}>AI đang xử lý · Thời gian thực</span>
        </div>
        <MiniResultCard />

        {/* Stats chips */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            ["50,000+", "Người dùng tin tưởng"],
            ["98.4%", "Độ chính xác phân tích"],
            ["< 2.5s", "Thời gian phản hồi AI"],
            ["24/7", "Hỗ trợ không gián đoạn"],
          ].map(([num, label]) => (
            <div key={label} style={{
              background: C.paper, border: `1px solid ${C.line}`,
              borderRadius: 10, padding: "16px 20px",
              boxShadow: "0 2px 8px rgba(11,24,41,.04)",
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, letterSpacing: "-.5px", marginBottom: 2 }}>{num}</div>
              <div style={{ fontSize: 12, color: C.navy40, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════
   TICKER
════════════════════════════════════════════════════════════ */
const TICKER = ["Phân tích triệu chứng", "Nhận diện nhãn thuốc", "Giải thích xét nghiệm", "Theo dõi điều trị", "Cảnh báo tương tác thuốc", "Nhắc lịch tái khám", "Tóm tắt hồ sơ y tế", "Gợi ý chuyên khoa"];

function TickerBar() {
  const items = [...TICKER, ...TICKER];
  return (
    <div style={{ background: C.navy, overflow: "hidden", padding: "13px 0" }}>
      <div style={{ display: "flex", width: "max-content", animation: "marq 28s linear infinite" }}>
        {items.map((it, i) => (
          <span key={i} style={{
            display: "flex", alignItems: "center", gap: 28,
            padding: "0 32px", whiteSpace: "nowrap",
            fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.55)",
          }}>
            {it}
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.teal, opacity: .7, flexShrink: 0 }} />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FEATURES — bento grid hợp lý
════════════════════════════════════════════════════════════ */
const FEATS = [
  {
    tag: "Trước khi khám",
    tagColor: C.teal, tagBg: C.tealLt,
    icon: "🧬",
    title: "Phân tích triệu chứng tức thì",
    body: "Nhập triệu chứng bằng tiếng Việt tự nhiên. NLP + LLM phân tích và gợi ý chuyên khoa phù hợp kèm danh sách câu hỏi nên hỏi bác sĩ.",
    wide: true,
    extra: (
      <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["Nội khoa", "Tim mạch", "Tiêu hoá", "Thần kinh", "Da liễu"].map(s => (
          <span key={s} style={{
            background: C.tealLt, color: C.teal,
            borderRadius: 6, padding: "4px 12px",
            fontSize: 12, fontWeight: 600,
          }}>{s}</span>
        ))}
      </div>
    ),
  },
  {
    tag: "Nhận diện hình ảnh",
    tagColor: C.green, tagBg: C.greenLt,
    icon: "📷",
    title: "Nhận diện thuốc qua ảnh",
    body: "Chụp ảnh nhãn thuốc — Computer Vision & OCR trích xuất thông tin, cảnh báo tác dụng phụ và tương tác thuốc tức thì.",
    wide: false,
  },
  {
    tag: "Sau khi khám",
    tagColor: C.amber, tagBg: C.amberLt,
    icon: "🔬",
    title: "Giải thích kết quả xét nghiệm",
    body: "Chỉ số y tế phức tạp được dịch sang ngôn ngữ dễ hiểu, so sánh với dải bình thường và giải thích ý nghĩa lâm sàng.",
    wide: false,
  },
  {
    tag: "Dài hạn",
    tagColor: C.teal, tagBg: C.tealLt,
    icon: "📋",
    title: "Hồ sơ & theo dõi điều trị",
    body: "Lưu lịch sử điều trị, nhắc uống thuốc qua thông báo / SMS, cảnh báo tái khám và theo dõi xu hướng sức khoẻ theo thời gian.",
    wide: true,
    extra: (
      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { icon: "💊", label: "Nhắc thuốc", sub: "8:00 · 12:00 · 20:00" },
          { icon: "📅", label: "Tái khám", sub: "Còn 3 ngày" },
          { icon: "📈", label: "Xu hướng", sub: "Huyết áp ổn định" },
        ].map(({ icon, label, sub }) => (
          <div key={label} style={{
            background: C.bg, borderRadius: 10, padding: "14px 14px",
            border: `1px solid ${C.line}`,
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 11, color: C.navy40 }}>{sub}</div>
          </div>
        ))}
      </div>
    ),
  },
];

function Features() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ padding: "100px max(40px, calc((100% - 1200px)/2))", background: C.bg }}>
      <div style={{ marginBottom: 56 }}>
        <SectionLabel>Tính năng</SectionLabel>
        <h2 style={{
          fontFamily: FONT_DISPLAY, fontSize: "clamp(30px,4vw,50px)",
          fontWeight: 600, color: C.navy, lineHeight: 1.15,
          letterSpacing: "-.5px", maxWidth: 560,
        }}>
          Đồng hành từ triệu chứng đến phục hồi hoàn toàn.
        </h2>
      </div>

      {/* Bento: row 1 — wide + narrow */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        {FEATS.slice(0, 2).map((f, i) => (
          <FeatureCard key={i} f={f} delay={i * .1} vis={vis} />
        ))}
      </div>
      {/* Bento: row 2 — narrow + wide */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        {FEATS.slice(2, 4).map((f, i) => (
          <FeatureCard key={i} f={f} delay={(i + 2) * .1} vis={vis} />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ f, delay, vis }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{
      background: C.paper, borderRadius: 16,
      border: `1px solid ${hov ? f.tagColor + "55" : C.line}`,
      padding: "36px 36px",
      transition: "border-color .25s, box-shadow .25s, transform .25s",
      boxShadow: hov ? `0 8px 40px ${f.tagColor}14` : "0 2px 12px rgba(11,24,41,.05)",
      transform: hov ? "translateY(-3px)" : "none",
      opacity: vis ? 1 : 0,
      transitionDelay: `${delay}s`,
      cursor: "default",
    }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <span style={{ fontSize: 32 }}>{f.icon}</span>
        <Tag color={f.tagColor} bg={f.tagBg}>{f.tag}</Tag>
      </div>
      <h3 style={{ fontSize: 19, fontWeight: 700, color: C.navy, marginBottom: 12, lineHeight: 1.3 }}>{f.title}</h3>
      <p style={{ fontSize: 14, color: C.navy70, lineHeight: 1.75, fontWeight: 400 }}>{f.body}</p>
      {f.extra}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   HOW IT WORKS — timeline vertical per step
════════════════════════════════════════════════════════════ */
const STEPS = [
  {
    n: "01", icon: "✏️",
    title: "Nhập triệu chứng của bạn",
    body: "Mô tả triệu chứng bằng tiếng Việt tự nhiên — không cần biết thuật ngữ y khoa. Hệ thống hỗ trợ cả nhập liệu giọng nói.",
    tip: "Ví dụ: \"Đau đầu, sốt nhẹ 3 ngày, mệt mỏi toàn thân\"",
  },
  {
    n: "02", icon: "🧠",
    title: "AI phân tích và tìm kiếm nguồn y khoa",
    body: "NLP phân tích nội dung, RAG tra cứu cơ sở y khoa đáng tin cậy để giảm thiểu tối đa tình trạng AI trả lời sai lệch.",
    tip: "Dữ liệu từ Bộ Y tế và tài liệu y tế chuẩn hoá",
  },
  {
    n: "03", icon: "📊",
    title: "Nhận gợi ý chuyên khoa và câu hỏi cho bác sĩ",
    body: "Kết quả gồm chuyên khoa phù hợp, mức độ ưu tiên khám và danh sách câu hỏi giúp bạn tận dụng tối đa thời gian với bác sĩ.",
    tip: "Luôn kèm disclaimer rõ ràng về giới hạn của AI",
  },
  {
    n: "04", icon: "📅",
    title: "Theo dõi dài hạn và nhắc nhở thông minh",
    body: "Sau khám, hệ thống lưu hồ sơ, nhắc uống thuốc và tái khám theo đúng lịch bác sĩ — qua thông báo hoặc SMS.",
    tip: "Hỗ trợ theo dõi nhiều thành viên trong gia đình",
  },
];

function HowItWorks() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ background: C.paper, borderTop: `1px solid ${C.line}`, padding: "100px max(40px, calc((100% - 1200px)/2))" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
        {/* Left sticky header */}
        <div style={{ position: "sticky", top: 100 }}>
          <SectionLabel>Quy trình</SectionLabel>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,3.5vw,48px)",
            fontWeight: 600, color: C.navy, lineHeight: 1.15, marginBottom: 24,
            letterSpacing: "-.4px",
          }}>
            Từ triệu chứng đến{" "}
            <em style={{ color: C.teal }}>hành động đúng đắn.</em>
          </h2>
          <p style={{ fontSize: 16, color: C.navy70, lineHeight: 1.75, marginBottom: 40, fontWeight: 400 }}>
            Bốn bước đơn giản giúp bạn hiểu sức khoẻ của mình và đưa ra quyết định chăm sóc thông minh hơn.
          </p>
          <button style={{
            background: C.teal, color: "#fff", border: "none",
            borderRadius: 10, padding: "13px 28px",
            fontSize: 15, fontWeight: 600,
            boxShadow: `0 4px 16px ${C.teal}33`,
            transition: "opacity .18s",
          }}
            onMouseEnter={e => e.target.style.opacity = ".85"}
            onMouseLeave={e => e.target.style.opacity = "1"}
          >Thử ngay miễn phí →</button>
        </div>

        {/* Right steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{
              display: "flex", gap: 24,
              paddingBottom: i < STEPS.length - 1 ? 36 : 0,
              opacity: vis ? 1 : 0,
              transform: vis ? "none" : "translateX(20px)",
              transition: `opacity .5s ${i * .12}s ease, transform .5s ${i * .12}s ease`,
            }}>
              {/* timeline */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: C.tealLt, border: `1.5px solid ${C.teal}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>{s.icon}</div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 1.5, flex: 1, background: C.line, marginTop: 12, marginBottom: 0, minHeight: 32 }} />
                )}
              </div>
              {/* content */}
              <div style={{ paddingTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: ".08em", textTransform: "uppercase" }}>Bước {s.n}</span>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginTop: 6, marginBottom: 10, lineHeight: 1.3 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: C.navy70, lineHeight: 1.75, marginBottom: 12 }}>{s.body}</p>
                <div style={{
                  background: C.bg, borderLeft: `3px solid ${C.teal}`,
                  padding: "8px 14px", borderRadius: "0 6px 6px 0",
                }}>
                  <span style={{ fontSize: 12, color: C.navy40, fontStyle: "italic" }}>{s.tip}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════
   SOCIAL PROOF
════════════════════════════════════════════════════════════ */
const REVIEWS = [
  {
    name: "Nguyễn Thị Lan",
    role: "Kế toán, Hà Nội",
    avatar: "N",
    text: "Ứng dụng giải thích kết quả xét nghiệm rất dễ hiểu. Trước đây tôi luôn hoang mang với những chỉ số, giờ thì hiểu được cơ bản trước khi gặp bác sĩ.",
    stars: 5,
  },
  {
    name: "Trần Minh Khoa",
    role: "Kỹ sư, TP.HCM",
    avatar: "T",
    text: "Tính năng nhắc uống thuốc rất hữu ích, tôi hay quên. Phần phân tích triệu chứng cũng khá chính xác, đã gợi ý đúng chuyên khoa cần khám.",
    stars: 5,
  },
  {
    name: "Lê Phương Anh",
    role: "Giáo viên, Đà Nẵng",
    avatar: "L",
    text: "Dùng cho cả gia đình, rất tiện. Chatbot trả lời tiếng Việt tự nhiên, không cần biết thuật ngữ y khoa phức tạp gì cả.",
    stars: 4,
  },
];

function SocialProof() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ padding: "100px max(40px, calc((100% - 1200px)/2))", background: C.bg }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <SectionLabel>Người dùng nói gì</SectionLabel>
        <h2 style={{
          fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,3.5vw,46px)",
          fontWeight: 600, color: C.navy, lineHeight: 1.15,
          letterSpacing: "-.4px",
        }}>
          Được tin dùng bởi hàng chục nghìn{" "}
          <em style={{ color: C.teal }}>người Việt.</em>
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {REVIEWS.map((r, i) => (
          <div key={i} style={{
            background: C.paper, borderRadius: 14, padding: "32px 28px",
            border: `1px solid ${C.line}`,
            boxShadow: "0 2px 12px rgba(11,24,41,.05)",
            opacity: vis ? 1 : 0,
            transform: vis ? "none" : "translateY(18px)",
            transition: `all .5s ${i * .1}s ease`,
          }}>
            <div style={{ display: "flex", gap: 2, marginBottom: 20 }}>
              {Array(r.stars).fill(0).map((_, j) => (
                <span key={j} style={{ color: "#F59E0B", fontSize: 15 }}>★</span>
              ))}
            </div>
            <p style={{ fontSize: 14, color: C.navy70, lineHeight: 1.75, marginBottom: 24, fontStyle: "italic" }}>
              "{r.text}"
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: C.teal, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 700, color: "#fff",
              }}>{r.avatar}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{r.name}</div>
                <div style={{ fontSize: 12, color: C.navy40 }}>{r.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════
   PRICING
════════════════════════════════════════════════════════════ */
const PLANS = [
  {
    code: "MIỄN PHÍ",
    name: "Cơ bản",
    price: "0",
    unit: "₫",
    period: "mãi mãi",
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
    highlight: false,
  },
  {
    code: "PHỔ BIẾN",
    name: "MediMate+",
    price: "149,000",
    unit: "₫",
    period: "/ tháng",
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
    highlight: true,
  },
];

function Pricing() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ background: C.paper, borderTop: `1px solid ${C.line}`, padding: "100px max(40px, calc((100% - 1200px)/2))" }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <SectionLabel>Bảng giá</SectionLabel>
        <h2 style={{
          fontFamily: FONT_DISPLAY, fontSize: "clamp(28px,3.5vw,46px)",
          fontWeight: 600, color: C.navy, lineHeight: 1.15, letterSpacing: "-.4px",
        }}>
          Minh bạch. Không phí ẩn.<br />
          <em style={{ color: C.teal }}>Huỷ bất cứ lúc nào.</em>
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 860, margin: "0 auto" }}>
        {PLANS.map((p, i) => (
          <div key={i} style={{
            background: p.highlight ? C.navy : C.paper,
            border: p.highlight ? `2px solid ${C.teal}` : `1px solid ${C.line}`,
            borderRadius: 18, padding: "44px 40px",
            position: "relative", overflow: "hidden",
            boxShadow: p.highlight ? `0 16px 60px ${C.teal}20` : "0 2px 12px rgba(11,24,41,.05)",
            opacity: vis ? 1 : 0,
            transform: vis ? "none" : "translateY(20px)",
            transition: `all .5s ${i * .15}s ease`,
          }}>
            {p.highlight && (
              <div style={{
                position: "absolute", top: 20, right: 20,
                background: C.teal, color: "#fff",
                borderRadius: 6, padding: "3px 12px",
                fontSize: 11, fontWeight: 700, letterSpacing: ".06em",
              }}>✦ PHỔ BIẾN NHẤT</div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, color: p.highlight ? C.tealMid : C.teal, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 20 }}>{p.code}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: p.highlight ? "#fff" : C.navy, marginBottom: 6 }}>{p.name}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: p.highlight ? "rgba(255,255,255,.5)" : C.navy40 }}>{p.unit}</span>
              <span style={{ fontSize: 40, fontWeight: 800, color: p.highlight ? "#fff" : C.navy, letterSpacing: "-1.5px", lineHeight: 1 }}>{p.price}</span>
              <span style={{ fontSize: 14, color: p.highlight ? "rgba(255,255,255,.5)" : C.navy40 }}>{p.period}</span>
            </div>
            <p style={{ fontSize: 13, color: p.highlight ? "rgba(255,255,255,.55)" : C.navy70, lineHeight: 1.65, marginBottom: 28 }}>{p.desc}</p>

            <div style={{ height: 1, background: p.highlight ? "rgba(255,255,255,.1)" : C.line, marginBottom: 28 }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 13, marginBottom: 36 }}>
              {p.feats.map((f, j) => (
                <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1,
                    color: f.ok ? C.green : (p.highlight ? "rgba(255,255,255,.2)" : C.lineDk),
                  }}>{f.ok ? "✓" : "✕"}</span>
                  <span style={{
                    fontSize: 14, lineHeight: 1.55,
                    color: f.ok
                      ? (p.highlight ? "rgba(255,255,255,.85)" : C.navy70)
                      : (p.highlight ? "rgba(255,255,255,.25)" : C.navy40),
                    textDecoration: f.ok ? "none" : "line-through",
                  }}>{f.text}</span>
                </div>
              ))}
            </div>

            <button style={{
              width: "100%", padding: "14px",
              background: p.highlight ? C.teal : "transparent",
              color: p.highlight ? "#fff" : C.navy,
              border: p.highlight ? "none" : `1.5px solid ${C.lineDk}`,
              borderRadius: 10, fontSize: 15, fontWeight: 600,
              transition: "opacity .18s, transform .18s",
              boxShadow: p.highlight ? `0 4px 20px ${C.teal}44` : "none",
            }}
              onMouseEnter={e => { e.target.style.opacity = ".85"; e.target.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.target.style.opacity = "1"; e.target.style.transform = "none"; }}
            >{p.cta}</button>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: C.navy40 }}>
        Thanh toán qua VNPay · MoMo · Thẻ tín dụng quốc tế
      </p>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════
   CTA SECTION
════════════════════════════════════════════════════════════ */
function CtaSection() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ padding: "0 max(40px, calc((100% - 1200px)/2)) 100px", background: C.bg }}>
      <div style={{
        background: C.navy, borderRadius: 20, padding: "72px 80px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 48,
        opacity: vis ? 1 : 0,
        transform: vis ? "none" : "translateY(20px)",
        transition: "all .6s ease",
        position: "relative", overflow: "hidden",
      }}>
        {/* bg accent */}
        <div style={{ position: "absolute", right: -60, top: -60, width: 300, height: 300, borderRadius: "50%", background: `${C.teal}14`, pointerEvents: "none" }} />
        <div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(26px,3vw,42px)", fontWeight: 600, color: "#fff", lineHeight: 1.2, letterSpacing: "-.4px", marginBottom: 16 }}>
            Bắt đầu hành trình<br />
            <em style={{ color: C.tealMid }}>chăm sóc sức khoẻ thông minh.</em>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.55)", fontWeight: 400 }}>
            Miễn phí · Không cần thẻ tín dụng · Cài đặt trong 2 phút
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          <button style={{
            background: C.teal, color: "#fff", border: "none",
            borderRadius: 10, padding: "15px 36px",
            fontSize: 16, fontWeight: 600,
            boxShadow: `0 4px 24px ${C.teal}44`,
            transition: "opacity .18s, transform .18s",
          }}
            onMouseEnter={e => { e.target.style.opacity = ".85"; e.target.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.target.style.opacity = "1"; e.target.style.transform = "none"; }}
          >Dùng thử miễn phí</button>
          <button style={{
            background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.8)",
            border: "1.5px solid rgba(255,255,255,.15)",
            borderRadius: 10, padding: "15px 28px",
            fontSize: 16, fontWeight: 500,
            transition: "border-color .18s",
          }}
            onMouseEnter={e => e.target.style.borderColor = "rgba(255,255,255,.35)"}
            onMouseLeave={e => e.target.style.borderColor = "rgba(255,255,255,.15)"}
          >Liên hệ tư vấn</button>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════
   FOOTER
════════════════════════════════════════════════════════════ */
function Footer() {
  const cols = [
    { h: "Sản phẩm", ls: ["Tính năng", "Bảng giá", "Changelog", "API"] },
    { h: "Pháp lý",  ls: ["Điều khoản sử dụng", "Chính sách bảo mật", "Cookie", "Disclaimer"] },
    { h: "Hỗ trợ",  ls: ["Tài liệu hướng dẫn", "Liên hệ", "Cộng đồng", "Tình trạng hệ thống"] },
  ];
  return (
    <footer style={{ background: C.navy, borderTop: `1px solid rgba(255,255,255,.06)` }}>
      <div style={{
        padding: "72px max(40px, calc((100% - 1200px)/2)) 48px",
        display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 56,
      }}>
        {/* Brand */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
              <rect width="30" height="30" rx="6" fill={C.teal} />
              <path d="M9 15h4m0 0v-4m0 4v4m0-4h4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <circle cx="21" cy="10" r="2" fill="white" opacity=".7" />
            </svg>
            <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 15, color: "#fff" }}>MediMate AI</span>
          </div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", lineHeight: 1.75, maxWidth: 240, fontWeight: 400, marginBottom: 24 }}>
            Trợ lý y khoa thông minh hỗ trợ người Việt chăm sóc sức khoẻ tốt hơn.
          </p>
          <div style={{
            background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,184,0,.25)",
            borderRadius: 8, padding: "10px 14px",
            display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <span style={{ color: "#F59E0B", fontSize: 14, flexShrink: 0 }}>⚕</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", lineHeight: 1.7 }}>
              Kết quả AI chỉ mang tính tham khảo, không thay thế chẩn đoán y khoa chuyên nghiệp.
            </span>
          </div>
        </div>

        {cols.map(({ h, ls }) => (
          <div key={h}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 20 }}>{h}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ls.map(l => (
                <a key={l} href="#" style={{
                  fontSize: 14, color: "rgba(255,255,255,.5)", fontWeight: 400, transition: "color .18s",
                }}
                  onMouseEnter={e => e.target.style.color = "#fff"}
                  onMouseLeave={e => e.target.style.color = "rgba(255,255,255,.5)"}
                >{l}</a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        borderTop: "1px solid rgba(255,255,255,.06)",
        padding: "20px max(40px, calc((100% - 1200px)/2))",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,.25)" }}>© 2026 MediMate AI. Bảo lưu mọi quyền.</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,.25)" }}>Được xây dựng tại Việt Nam 🇻🇳</span>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════
   APP ROOT
════════════════════════════════════════════════════════════ */
export default function App() {
  return (
    <>
      <style>{CSS}</style>
      <Navbar />
      <Hero />
      <TickerBar />
      <Features />
      <HowItWorks />
      <SocialProof />
      <Pricing />
      <CtaSection />
      <Footer />
    </>
  );
}