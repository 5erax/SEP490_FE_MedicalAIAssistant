import { useEffect, useState } from "react";

const QUICK_SYMPTOMS = ["Đau đầu", "Sốt", "Ho", "Đau bụng", "Mệt mỏi", "Khó thở", "Đau họng", "Chóng mặt"];

const RECOMMENDATIONS = [
  {
    dept: "Nội khoa tổng quát",
    confidence: 91,
    priority: 1,
    isEmergency: false,
    reason: "Phù hợp để đánh giá tổng quát khi triệu chứng kéo dài và có nhiều biểu hiện toàn thân.",
  },
  {
    dept: "Tai mũi họng",
    confidence: 67,
    priority: 2,
    isEmergency: false,
    reason: "Nên cân nhắc nếu có ho, đau họng, nghẹt mũi hoặc sốt kèm khó chịu vùng hô hấp trên.",
  },
  {
    dept: "Cấp cứu",
    confidence: 12,
    priority: 3,
    isEmergency: true,
    reason: "Chỉ cần đi cấp cứu ngay nếu có khó thở, đau ngực, lơ mơ, co giật hoặc sốt rất cao.",
  },
];

const DOCTOR_QUESTIONS = [
  "Triệu chứng này có nguy hiểm không?",
  "Tôi có cần xét nghiệm máu không?",
  "Có cần nhịn ăn trước khi xét nghiệm không?",
  "Tôi nên tái khám sau bao lâu?",
  "Có thuốc nào cần tránh trong thời gian này không?",
];

function goTo(path) {
  window.location.href = path;
}

function SymptomAnalysisPage() {
  const [step, setStep] = useState(1);
  const [symptoms, setSymptoms] = useState(() => {
    const prefill = sessionStorage.getItem("medimate.symptom.prefill");
    if (prefill) sessionStorage.removeItem("medimate.symptom.prefill");
    return prefill || "";
  });
  const [severity, setSeverity] = useState("medium");
  const [duration, setDuration] = useState("");
  const [checkedQs, setCheckedQs] = useState(new Set());
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (step !== 2) return undefined;

    const intervalId = window.setInterval(() => {
      setProgress((value) => {
        const nextValue = Math.min(value + 4, 100);
        if (nextValue >= 100) {
          window.clearInterval(intervalId);
          window.setTimeout(() => setStep(3), 260);
        }
        return nextValue;
      });
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [step]);

  const appendSymptom = (label) => {
    setSymptoms((value) => {
      if (!value.trim()) return label;
      if (value.toLowerCase().includes(label.toLowerCase())) return value;
      return `${value}, ${label.toLowerCase()}`;
    });
  };

  const toggleQuestion = (question) => {
    setCheckedQs((current) => {
      const next = new Set(current);
      if (next.has(question)) next.delete(question);
      else next.add(question);
      return next;
    });
  };

  const copyQuestions = async () => {
    const text = DOCTOR_QUESTIONS.map((question) => `- ${question}`).join("\n");
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const startAnalysis = () => {
    if (!symptoms.trim()) return;
    setProgress(0);
    setStep(2);
  };

  return (
    <main className="symptom-page">
      <style>{styles}</style>
      <section className="symptom-shell">
        <nav className="workspace-nav" aria-label="Dieu huong tinh nang">
          <button type="button" onClick={() => goTo("/dashboard")}>← Trang chủ</button>
          <button type="button" onClick={() => goTo("/chat")}>Chat AI</button>
          <button type="button" onClick={() => goTo("/map")}>Bản đồ</button>
          <button type="button" onClick={() => goTo("/records")}>Hồ sơ y tế</button>
        </nav>
        <header className="symptom-stepper" aria-label="Quy trình phân tích triệu chứng">
          {["Nhập triệu chứng", "AI phân tích", "Kết quả", "Lưu"].map((label, index) => {
            const number = index + 1;
            const state = step > number ? "done" : step === number ? "active" : "todo";
            return (
              <div className={`symptom-step ${state}`} key={label}>
                <span>{state === "done" ? "✓" : number}</span>
                <strong>{number}. {label}</strong>
              </div>
            );
          })}
        </header>

        {step === 1 && (
          <section className="symptom-card">
            <p className="mini-label">Nhập triệu chứng</p>
            <h1>Bạn đang cảm thấy thế nào?</h1>
            <textarea
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder={"Mô tả triệu chứng bằng tiếng Việt tự nhiên.\nVí dụ: Tôi bị đau đầu kéo dài 3 ngày, sốt nhẹ, người mệt mỏi, không muốn ăn..."}
            />
            <div className="chip-row">
              {QUICK_SYMPTOMS.map((item) => (
                <button type="button" key={item} onClick={() => appendSymptom(item)}>{item}</button>
              ))}
            </div>
            <div className="symptom-form-grid">
              <fieldset>
                <legend>Mức độ nghiêm trọng</legend>
                {[
                  ["mild", "Nhẹ"],
                  ["medium", "Vừa"],
                  ["heavy", "Nặng"],
                  ["critical", "Rất nặng"],
                ].map(([value, label]) => (
                  <label key={value} className="radio-line">
                    <input
                      type="radio"
                      checked={severity === value}
                      onChange={() => setSeverity(value)}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <label className="field">
                Thời gian xuất hiện
                <select value={duration} onChange={(event) => setDuration(event.target.value)}>
                  <option value="">Chọn thời gian</option>
                  <option value="today">Hôm nay</option>
                  <option value="2-3">2-3 ngày</option>
                  <option value="week">1 tuần</option>
                  <option value="over-week">Hơn 1 tuần</option>
                </select>
              </label>
            </div>
            <button className="primary-action" type="button" disabled={!symptoms.trim()} onClick={startAnalysis}>
              Phân tích →
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="symptom-card analyzing-card">
            <div className="large-spinner" />
            <h1>MediMate AI đang phân tích triệu chứng của bạn...</h1>
            <div className="progress-track" aria-label={`Tiến độ ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>{progress}%</p>
          </section>
        )}

        {step === 3 && (
          <section className="result-layout">
            <div className="disclaimer">⚕ Kết quả chỉ mang tính tham khảo và không thay thế chẩn đoán y khoa chuyên nghiệp.</div>
            <article className="symptom-card">
              <p className="mini-label">Chuyên khoa gợi ý</p>
              <div className="recommendation-list">
                {RECOMMENDATIONS.map((item) => (
                  <div className="recommendation-row" key={item.dept}>
                    <div>
                      <strong>{item.dept}</strong>
                      <p>{item.reason}</p>
                    </div>
                    <div className="confidence-box">
                      <span>{item.confidence}%</span>
                      <div><i style={{ width: `${item.confidence}%` }} /></div>
                      <small>Ưu tiên {item.priority}</small>
                      {item.isEmergency && <b>Cấp cứu</b>}
                    </div>
                  </div>
                ))}
              </div>
            </article>
            <article className="symptom-card">
              <p className="mini-label">Câu hỏi nên hỏi bác sĩ</p>
              <div className="question-list">
                {DOCTOR_QUESTIONS.map((question) => (
                  <label key={question}>
                    <input
                      type="checkbox"
                      checked={checkedQs.has(question)}
                      onChange={() => toggleQuestion(question)}
                    />
                    <span>{question}</span>
                  </label>
                ))}
              </div>
              <button className="outline-action" type="button" onClick={copyQuestions}>
                {copied ? "Đã sao chép" : "Sao chép danh sách"}
              </button>
            </article>
            <div className="result-actions">
              <button className="primary-action" type="button" onClick={() => goTo("/map")}>Tìm cơ sở y tế gần đây</button>
              <button className="dark-action" type="button" onClick={() => setStep(4)}>Lưu kết quả</button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="symptom-card saved-card">
            <div className="saved-mark">✓</div>
            <h1>Đã lưu phiên phân tích!</h1>
            <p>Bạn có thể xem lại kết quả trong không gian cá nhân hoặc tiếp tục tìm cơ sở phù hợp để thăm khám.</p>
            <div className="result-actions">
              <button className="primary-action" type="button" onClick={() => goTo("/dashboard")}>Về trang chủ</button>
              <button className="outline-action" type="button" onClick={() => goTo("/records")}>Xem lịch sử</button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

const styles = `
.symptom-page { min-height: 100svh; background: var(--bg); color: var(--ink); padding: 24px; }
.symptom-shell { width: min(1080px, 100%); margin: 0 auto; display: grid; gap: 18px; }
.workspace-nav { display: flex; flex-wrap: wrap; gap: 8px; }
.workspace-nav button { min-height: 38px; border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); padding: 0 13px; font-weight: 900; }
.workspace-nav button:first-child { background: var(--lime); }
.symptom-stepper { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; border: 1.5px solid var(--ink); background: var(--paper); padding: 12px; box-shadow: 4px 4px 0 var(--ink); }
.symptom-step { display: flex; align-items: center; gap: 10px; min-width: 0; color: var(--muted); }
.symptom-step span { width: 30px; height: 30px; flex: 0 0 auto; display: grid; place-items: center; border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; font-weight: 900; }
.symptom-step strong { font-size: 13px; overflow-wrap: anywhere; }
.symptom-step.active { color: var(--ink); }
.symptom-step.active span { background: var(--lime); }
.symptom-step.done span { background: var(--ink); color: var(--lime); }
.symptom-card { border: 1.5px solid var(--ink); border-radius: 12px; background: var(--paper); padding: clamp(20px, 4vw, 32px); box-shadow: 4px 4px 0 var(--ink); }
.mini-label { display: inline-flex; align-items: center; gap: 9px; margin: 0 0 12px; color: var(--lime-dark); font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.mini-label::before { content: ""; width: 12px; height: 2px; background: currentColor; }
.symptom-card h1 { margin: 0 0 18px; font-family: var(--display); font-size: clamp(30px, 5vw, 48px); line-height: 1.06; }
.symptom-card textarea { width: 100%; min-height: 150px; resize: vertical; border: 1.5px solid var(--ink); border-radius: 10px; padding: 14px; line-height: 1.65; outline: none; background: var(--paper-soft); }
.symptom-card textarea:focus, .field select:focus { box-shadow: 0 0 0 4px rgba(196, 233, 149, .28); }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 18px; }
.chip-row button, .outline-action { border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); padding: 9px 12px; font-weight: 800; }
.chip-row button:hover, .outline-action:hover { background: var(--mint); transform: translateY(-1px); }
.symptom-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
fieldset, .field { min-width: 0; border: 1px solid var(--line-strong); border-radius: 10px; padding: 14px; background: var(--paper-soft); }
legend, .field { color: var(--muted); font-size: 12px; font-weight: 900; }
.radio-line { display: inline-flex; align-items: center; gap: 8px; margin: 10px 16px 0 0; color: var(--ink); font-size: 14px; font-weight: 800; }
.field { display: grid; gap: 9px; }
.field select { width: 100%; border: 1.5px solid var(--ink); border-radius: 8px; background: #fff; padding: 11px; outline: none; }
.primary-action, .dark-action { min-height: 48px; border: 1.5px solid var(--ink); border-radius: 10px; padding: 0 18px; font-weight: 900; box-shadow: 3px 3px 0 var(--ink); }
.primary-action { width: 100%; margin-top: 18px; background: var(--lime); color: var(--ink); }
.primary-action:disabled { cursor: not-allowed; opacity: .48; box-shadow: none; }
.dark-action { background: var(--ink); color: #fff; }
.analyzing-card { min-height: 420px; display: grid; place-items: center; text-align: center; align-content: center; gap: 16px; }
.large-spinner { width: 74px; height: 74px; border: 6px solid rgba(17,20,18,.1); border-top-color: var(--lime); border-radius: 50%; animation: spin .8s linear infinite; }
.progress-track { width: min(520px, 100%); height: 12px; overflow: hidden; border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; }
.progress-track span, .confidence-box i { display: block; height: 100%; background: linear-gradient(90deg, var(--lime), var(--teal)); }
.result-layout { display: grid; gap: 16px; }
.disclaimer { border: 1px solid rgba(217,119,6,.35); border-radius: 10px; background: rgba(245,158,11,.14); padding: 13px 14px; color: #7c3f00; font-weight: 800; line-height: 1.5; }
.recommendation-list, .question-list { display: grid; gap: 12px; }
.recommendation-row { display: grid; grid-template-columns: minmax(0, 1fr) 180px; gap: 16px; align-items: center; border: 1px solid var(--line); border-radius: 10px; background: var(--paper-soft); padding: 14px; }
.recommendation-row strong { font-size: 17px; }
.recommendation-row p { margin: 7px 0 0; color: var(--muted); line-height: 1.55; }
.confidence-box { display: grid; gap: 7px; }
.confidence-box span { font-weight: 900; text-align: right; }
.confidence-box div { height: 8px; overflow: hidden; border-radius: 999px; background: #e9eee1; }
.confidence-box small, .confidence-box b { justify-self: end; border-radius: 999px; padding: 5px 9px; font-size: 11px; font-weight: 900; background: var(--mint); color: var(--teal); }
.confidence-box b { background: rgba(239,111,97,.15); color: #b42318; }
.question-list label { display: flex; gap: 10px; align-items: flex-start; border: 1px solid var(--line); border-radius: 10px; padding: 12px; background: var(--paper-soft); font-weight: 800; }
.result-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.result-actions .primary-action { width: auto; margin-top: 0; }
.saved-card { min-height: 420px; display: grid; place-items: center; align-content: center; gap: 14px; text-align: center; }
.saved-card p { max-width: 560px; margin: 0; color: var(--muted); line-height: 1.65; }
.saved-mark { width: 82px; height: 82px; display: grid; place-items: center; border: 1.5px solid var(--ink); border-radius: 50%; background: var(--lime); box-shadow: 4px 4px 0 var(--ink); font-size: 42px; font-weight: 900; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 760px) {
  .symptom-page { padding: 14px; }
  .symptom-stepper { display: flex; overflow-x: auto; }
  .symptom-step { min-width: 160px; }
  .symptom-form-grid, .recommendation-row { grid-template-columns: 1fr; }
  .confidence-box span, .confidence-box small, .confidence-box b { justify-self: start; text-align: left; }
  .result-actions, .result-actions .primary-action, .result-actions .dark-action, .outline-action { width: 100%; }
}
`;

export default SymptomAnalysisPage;
