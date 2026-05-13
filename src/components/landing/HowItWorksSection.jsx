// src/components/landing/HowItWorksSection.jsx
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

const STEPS = [
  {
    n: "01", icon: "✏️",
    title: "Nhập triệu chứng",
    body: "Mô tả triệu chứng bằng tiếng Việt tự nhiên — không cần biết thuật ngữ y khoa. Hỗ trợ cả nhập liệu giọng nói.",
    tip: "\"Đau đầu, sốt nhẹ 3 ngày, mệt mỏi toàn thân\"",
  },
  {
    n: "02", icon: "🧠",
    title: "AI phân tích nguồn y khoa",
    body: "NLP phân tích nội dung, RAG tra cứu cơ sở y khoa đáng tin cậy — giảm thiểu tối đa tình trạng AI trả lời sai lệch.",
    tip: "Dữ liệu từ Bộ Y tế và tài liệu y tế chuẩn hoá",
  },
  {
    n: "03", icon: "📊",
    title: "Nhận gợi ý & câu hỏi",
    body: "Kết quả gồm chuyên khoa phù hợp, mức độ ưu tiên và danh sách câu hỏi giúp bạn tận dụng tối đa thời gian với bác sĩ.",
    tip: "Luôn kèm disclaimer rõ ràng về giới hạn của AI",
  },
  {
    n: "04", icon: "📅",
    title: "Theo dõi dài hạn",
    body: "Sau khám, hệ thống lưu hồ sơ, nhắc uống thuốc và tái khám theo đúng lịch bác sĩ — qua thông báo hoặc SMS.",
    tip: "Hỗ trợ theo dõi nhiều thành viên trong gia đình",
  },
];

export function HowItWorksSection() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{
      background: C.paper,
      borderTop: `2px solid ${C.dark}`,
      borderBottom: `2px solid ${C.dark}`,
      padding: "80px 0",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        {/* Label + heading */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 16, height: 3, background: C.lime, borderRadius: 2 }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.limeDk }}>Quy trình</span>
          </div>
          <h2 style={{
            fontFamily: FONT.display,
            fontSize: "clamp(26px,4vw,50px)",
            fontWeight: 600, color: C.dark, lineHeight: 1.12, letterSpacing: "-.4px",
          }}>
            Bốn bước đơn giản —{" "}
            <em style={{ color: C.teal }}>kết quả thực sự.</em>
          </h2>
        </div>

        {/* Steps */}
        <style>{`
          .steps-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
          @media(min-width:640px)  { .steps-grid { grid-template-columns: 1fr 1fr; } }
          @media(min-width:1024px) { .steps-grid { grid-template-columns: repeat(4,1fr); } }
        `}</style>
        <div className="steps-grid">
          {STEPS.map((s, i) => (
            <div key={i} style={{
              background: i % 2 === 1 ? C.dark : C.bg,
              border: `1.5px solid ${C.dark}`,
              borderRadius: 14, padding: "28px 24px",
              opacity: vis ? 1 : 0,
              transform: vis ? "none" : "translateY(20px)",
              transition: `opacity .5s ${i * .1}s ease, transform .5s ${i * .1}s ease`,
              boxShadow: `3px 3px 0 ${C.dark}`,
            }}>
              {/* step number */}
              <div style={{
                fontSize: 11, fontWeight: 800, letterSpacing: ".12em",
                color: i % 2 === 1 ? C.lime : C.limeDk,
                textTransform: "uppercase", marginBottom: 16,
              }}>Bước {s.n}</div>

              {/* icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: i % 2 === 1 ? "rgba(170,237,99,.12)" : C.limeLt,
                border: `1.5px solid ${i % 2 === 1 ? "rgba(170,237,99,.25)" : C.lime}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, marginBottom: 20,
              }}>{s.icon}</div>

              <h3 style={{ fontSize: 16, fontWeight: 700, color: i % 2 === 1 ? "#fff" : C.dark, marginBottom: 10, lineHeight: 1.3 }}>
                {s.title}
              </h3>
              <p style={{ fontSize: 13, color: i % 2 === 1 ? "rgba(255,255,255,.55)" : C.navy70, lineHeight: 1.7, marginBottom: 16 }}>
                {s.body}
              </p>
              <div style={{
                borderLeft: `3px solid ${i % 2 === 1 ? C.lime : C.teal}`,
                paddingLeft: 10,
              }}>
                <span style={{ fontSize: 11, color: i % 2 === 1 ? "rgba(255,255,255,.4)" : C.navy40, fontStyle: "italic" }}>{s.tip}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA below steps */}
        <div style={{ textAlign: "center", marginTop: 48 }}>
          <button style={{
            background: C.lime, color: C.dark,
            border: `2px solid ${C.dark}`,
            borderRadius: 10, padding: "14px 36px",
            fontSize: 15, fontWeight: 800,
            boxShadow: "3px 3px 0 " + C.dark,
            transition: "transform .15s, box-shadow .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = "5px 5px 0 " + C.dark; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "3px 3px 0 " + C.dark; }}
          >Thử ngay miễn phí →</button>
        </div>
      </div>
    </section>
  );
}


// ─────────────────────────────────────────────────────────────
// src/components/landing/SocialProofSection.jsx
// ─────────────────────────────────────────────────────────────

const REVIEWS = [
  {
    name: "Nguyễn Thị Lan", role: "Kế toán · Hà Nội", av: "NL", stars: 5,
    text: "Ứng dụng giải thích kết quả xét nghiệm rất dễ hiểu. Trước đây tôi luôn hoang mang với những chỉ số, giờ thì hiểu được cơ bản trước khi gặp bác sĩ.",
  },
  {
    name: "Trần Minh Khoa", role: "Kỹ sư phần mềm · TP.HCM", av: "TK", stars: 5,
    text: "Tính năng nhắc uống thuốc rất hữu ích, tôi hay quên. Phần phân tích triệu chứng cũng khá chính xác, gợi ý đúng chuyên khoa cần khám.",
  },
  {
    name: "Lê Phương Anh", role: "Giáo viên · Đà Nẵng", av: "LA", stars: 5,
    text: "Dùng cho cả gia đình, rất tiện. Chatbot trả lời tiếng Việt tự nhiên, không cần biết thuật ngữ y khoa phức tạp gì cả.",
  },
];

export function SocialProofSection() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ background: C.bg, padding: "80px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 16, height: 3, background: C.lime, borderRadius: 2 }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.limeDk }}>Người dùng nói gì</span>
          </div>
          <h2 style={{
            fontFamily: FONT.display,
            fontSize: "clamp(26px,4vw,48px)",
            fontWeight: 600, color: C.dark, lineHeight: 1.12, letterSpacing: "-.4px",
          }}>
            Được tin dùng bởi{" "}
            <em style={{ color: C.teal }}>hàng chục nghìn người Việt.</em>
          </h2>
        </div>

        <style>{`
          .reviews-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
          @media(min-width:640px)  { .reviews-grid { grid-template-columns: 1fr 1fr; } }
          @media(min-width:1024px) { .reviews-grid { grid-template-columns: repeat(3,1fr); } }
        `}</style>
        <div className="reviews-grid">
          {REVIEWS.map((r, i) => (
            <div key={i} style={{
              background: C.paper,
              border: `1.5px solid ${C.dark}`,
              borderRadius: 14, padding: "28px 24px",
              boxShadow: "3px 3px 0 " + C.dark,
              opacity: vis ? 1 : 0,
              transform: vis ? "none" : "translateY(18px)",
              transition: `all .5s ${i * .1}s ease`,
            }}>
              <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                {Array(r.stars).fill(0).map((_, j) => (
                  <span key={j} style={{ color: C.lime, fontSize: 16 }}>★</span>
                ))}
              </div>
              <p style={{ fontSize: 14, color: C.navy70, lineHeight: 1.75, marginBottom: 24, fontStyle: "italic" }}>
                "{r.text}"
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: C.dark,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: C.lime,
                  border: `2px solid ${C.dark}`,
                }}>{r.av}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: C.navy40 }}>{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}