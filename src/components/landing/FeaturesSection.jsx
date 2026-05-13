// src/components/landing/FeaturesSection.jsx

import { useState, useRef, useEffect } from "react";
import { C, FONT } from "../../styles/tokens";

// Hook tối ưu hơn với threshold linh hoạt
function useInView(options = { threshold: 0.1 }) {
  const ref = useRef(null);
  const [v, setV] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setV(true);
        io.unobserve(e.target);
      }
    }, options);

    if (ref.current) io.observe(ref.current);

    return () => io.disconnect();
  }, []);

  return [ref, v];
}

// ======================
// TICKER BAR
// ======================

export function TickerBar() {
  const items = [
    "AI Health Assistant",
    "Theo dõi triệu chứng",
    "Tư vấn sức khỏe",
    "Lộ trình phục hồi",
    "Nhắc lịch uống thuốc",
    "Kết nối bác sĩ",
  ];

  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        background: C.dark,
        color: "#fff",
        borderTop: `1px solid ${C.lime}`,
        borderBottom: `1px solid ${C.lime}`,
        padding: "12px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 40,
          whiteSpace: "nowrap",
          animation: "tickerMove 18s linear infinite",
          width: "max-content",
        }}
      >
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.lime,
            }}
          >
            ✦ {item}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes tickerMove {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

// ======================
// FEATURE CARD
// ======================

function FeatureCard({ f, delay, vis }) {
  const isDark = f.dark;

  return (
    <div
      className={`feat-card ${isDark ? "dark" : "light"}`}
      style={{
        gridColumn: f.wide ? "span 2" : "span 1",
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: `${delay}s`,
      }}
    >
      <style>{`
        .feat-card {
          border-radius: 20px;
          padding: clamp(24px, 4vw, 40px);
          border: 1.5px solid ${C.dark};
          position: relative;
          transition: all 0.3s ease;
          background: ${isDark ? C.dark : C.paper};
          cursor: pointer;
          display: flex;
          flex-direction: column;
        }

        .feat-card:hover {
          transform: translate(-4px, -4px) !important;
          box-shadow: 6px 6px 0 ${C.dark};
        }

        .feat-card.dark:hover {
          box-shadow: 6px 6px 0 ${C.lime};
        }
      `}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 40,
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
          }}
        >
          {f.icon}
        </div>

        <span
          style={{
            background: isDark ? "rgba(255,255,255,0.05)" : f.tagBg,
            color: isDark ? C.lime : f.tagC,
            border: `1px solid ${
              isDark ? "rgba(255,255,255,0.1)" : f.tagC + "33"
            }`,
            borderRadius: 100,
            padding: "5px 14px",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {f.tag}
        </span>
      </div>

      <div
        style={{
          width: 40,
          height: 4,
          background: isDark ? C.lime : C.dark,
          borderRadius: 2,
          marginBottom: 20,
        }}
      />

      <h3
        style={{
          fontSize: "clamp(18px, 2.5vw, 24px)",
          fontWeight: 700,
          color: isDark ? "#fff" : C.dark,
          marginBottom: 14,
          lineHeight: 1.2,
          fontFamily: FONT.display,
        }}
      >
        {f.title}
      </h3>

      <p
        style={{
          fontSize: 15,
          color: isDark ? "rgba(255,255,255,0.5)" : C.navy70,
          lineHeight: 1.6,
          marginBottom: f.extra ? 24 : 0,
        }}
      >
        {f.body}
      </p>

      {f.extra && (
        <div
          style={{
            marginTop: "auto",
            paddingTop: 20,
            borderTop: `1px solid ${
              isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)"
            }`,
          }}
        >
          {f.extra}
        </div>
      )}
    </div>
  );
}

// ======================
// FEATURES DATA
// ======================

const FEATS = [
  {
    icon: "🩺",
    tag: "AI Health",
    tagBg: "#E0F2FE",
    tagC: "#0369A1",
    title: "Theo dõi triệu chứng thông minh",
    body:
      "AI phân tích triệu chứng theo thời gian thực giúp bạn hiểu rõ tình trạng sức khỏe.",
  },
  {
    icon: "💊",
    tag: "Medication",
    tagBg: "#DCFCE7",
    tagC: "#15803D",
    title: "Nhắc lịch uống thuốc",
    body:
      "Không bỏ sót liệu trình điều trị với hệ thống nhắc nhở chính xác và cá nhân hóa.",
    dark: true,
  },
  {
    icon: "📈",
    tag: "Analytics",
    tagBg: "#FEF3C7",
    tagC: "#B45309",
    title: "Phân tích tiến trình phục hồi",
    body:
      "Theo dõi dữ liệu sức khỏe và nhận báo cáo trực quan về quá trình cải thiện.",
    wide: true,
  },
  {
    icon: "👨‍⚕️",
    tag: "Doctor",
    tagBg: "#F3E8FF",
    tagC: "#7E22CE",
    title: "Kết nối chuyên gia",
    body:
      "Dễ dàng chia sẻ dữ liệu sức khỏe với bác sĩ để được hỗ trợ nhanh chóng.",
  },
];

// ======================
// MAIN SECTION
// ======================

export function FeaturesSection() {
  const [ref, vis] = useInView();

  return (
    <section
      ref={ref}
      style={{
        background: C.bg,
        padding: "100px 0",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        <div style={{ marginBottom: 64 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 24,
                height: 2,
                background: C.lime,
              }}
            />

            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: C.limeDk,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Giá trị cốt lõi
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
              gap: 40,
              alignItems: "end",
            }}
            className="feat-header-grid"
          >
            <h2
              style={{
                fontFamily: FONT.display,
                fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 700,
                color: C.dark,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}
            >
              Đồng hành từ triệu chứng
              <br />
              <span
                style={{
                  color: C.teal,
                  background: `linear-gradient(120deg, ${C.teal} 0%, #2DD4BF 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                đến khi phục hồi.
              </span>
            </h2>

            <p
              style={{
                fontSize: 17,
                color: C.navy70,
                lineHeight: 1.6,
                borderLeft: `2px solid ${C.lime}`,
                paddingLeft: 24,
              }}
            >
              Ứng dụng AI tiên tiến giúp cá nhân hóa lộ trình chăm sóc sức
              khỏe, giảm bớt lo âu và tối ưu hóa thời gian khám chữa bệnh.
            </p>
          </div>
        </div>

        <style>{`
          .feat-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }

          @media(max-width: 768px) {
            .feat-grid {
              grid-template-columns: 1fr;
            }

            .feat-header-grid {
              grid-template-columns: 1fr;
              gap: 20px;
            }
          }
        `}</style>

        <div className="feat-grid">
          {FEATS.map((f, i) => (
            <FeatureCard
              key={i}
              f={f}
              delay={i * 0.1}
              vis={vis}
            />
          ))}
        </div>
      </div>
    </section>
  );
}