import { useEffect, useRef, useState } from "react";

const mockScanResult = {
  medicineName: "Amoxicillin",
  activeIngredient: "Amoxicillin trihydrate",
  dosageForm: "Viên nang",
  strength: "500mg",
  manufacturer: "Pymepharco",
  confidence: 94,
  usage: "Điều trị một số nhiễm khuẩn đường hô hấp, tiết niệu và mô mềm theo chỉ định của bác sĩ.",
  dosage: "Người lớn thường dùng 500mg x 3 lần/ngày, cách 8 giờ. Liều thực tế cần theo đơn.",
  sideEffects: ["Buồn nôn", "Tiêu chảy", "Phát ban", "Dị ứng"],
  requiresPrescription: true,
};

const mockInteraction = {
  medicineA: "Amoxicillin",
  medicineB: "Metformin",
  severity: "Low",
  description: "Kết hợp này thường an toàn với đa số người dùng, nhưng vẫn nên theo dõi phản ứng tiêu hoá.",
  recommendation: "Không tự ý điều chỉnh liều. Hỏi bác sĩ nếu có bệnh thận hoặc triệu chứng bất thường.",
};

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function goTo(path) {
  window.location.href = path;
}

function MedicationScanPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanStatus, setScanStatus] = useState("idle");
  const [scanStep, setScanStep] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [drugList, setDrugList] = useState([]);
  const [drugInput, setDrugInput] = useState("");
  const [interactions, setInteractions] = useState([]);
  const previewRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const acceptFile = (nextFile) => {
    if (!nextFile) return;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const objectUrl = URL.createObjectURL(nextFile);
    previewRef.current = objectUrl;
    setFile(nextFile);
    setPreview(objectUrl);
    setScanStatus("idle");
    setScanResult(null);
    setInteractions([]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const handleScan = async () => {
    if (!file) return;
    setScanStatus("scanning");
    setScanStep("Đang trích xuất văn bản từ ảnh...");
    await delay(1200);
    setScanStep("Đang tra cứu cơ sở dữ liệu thuốc...");
    await delay(1200);
    setScanResult(mockScanResult);
    setScanStatus("done");
  };

  const addDrug = () => {
    const name = drugInput.trim();
    if (!name || drugList.includes(name)) return;
    setDrugList((current) => [...current, name]);
    setDrugInput("");
  };

  const checkInteraction = () => {
    if (!scanResult || drugList.length === 0) return;
    setInteractions(drugList.map((drug) => ({ ...mockInteraction, medicineB: drug })));
  };

  return (
    <main className="medication-page">
      <style>{styles}</style>
      <section className="scan-panel">
        <nav className="medication-quick-nav" aria-label="Dieu huong nhanh">
          <button type="button" onClick={() => goTo("/dashboard")}>← Trang chủ</button>
          <button type="button" onClick={() => goTo("/chat")}>Chat AI</button>
          <button type="button" onClick={() => goTo("/records")}>Hồ sơ y tế</button>
        </nav>
        <p className="mini-label">Nhận diện thuốc qua ảnh</p>
        <h1>Chụp ảnh hoặc tải lên nhãn thuốc</h1>
        <label
          className={`upload-zone ${preview ? "has-preview" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <input type="file" accept="image/*" onChange={(event) => acceptFile(event.target.files?.[0])} />
          {preview ? (
            <img src={preview} alt="Ảnh thuốc đã chọn" />
          ) : (
            <div>
              <span>📷</span>
              <strong>Chọn ảnh nhãn thuốc</strong>
              <small>Hỗ trợ JPG, PNG, WEBP · Tối đa 10MB</small>
            </div>
          )}
        </label>
        <div className="upload-actions">
          <label>
            Chọn ảnh
            <input type="file" accept="image/*" onChange={(event) => acceptFile(event.target.files?.[0])} />
          </label>
          <label>
            Chụp ảnh
            <input type="file" accept="image/*" capture="environment" onChange={(event) => acceptFile(event.target.files?.[0])} />
          </label>
        </div>
        <button className="primary-action" type="button" disabled={!file || scanStatus === "scanning"} onClick={handleScan}>
          Nhận diện →
        </button>

        {scanStatus === "scanning" && (
          <div className="scan-progress">
            <span />
            <strong>{scanStep}</strong>
          </div>
        )}
      </section>

      <section className="scan-result-panel">
        {!scanResult ? (
          <div className="empty-result">
            <div>+</div>
            <h2>Kết quả nhận diện sẽ hiển thị tại đây</h2>
            <p>Sau khi quét, bạn có thể xem hoạt chất, hàm lượng và kiểm tra tương tác thuốc cơ bản.</p>
          </div>
        ) : (
          <>
            <article className="medicine-card">
              <div className="medicine-head">
                <h2>{scanResult.medicineName}</h2>
                <span>{scanResult.confidence}% khớp</span>
              </div>
              <div className="medicine-grid">
                <p><span>Hoạt chất</span>{scanResult.activeIngredient}</p>
                <p><span>Dạng bào chế</span>{scanResult.dosageForm}</p>
                <p><span>Hàm lượng</span>{scanResult.strength}</p>
                <p><span>Nhà sản xuất</span>{scanResult.manufacturer}</p>
              </div>
              <div className="medicine-copy">
                <strong>Công dụng</strong>
                <p>{scanResult.usage}</p>
                <strong>Liều dùng</strong>
                <p>{scanResult.dosage}</p>
                <strong>Tác dụng phụ thường gặp</strong>
                <div className="side-effects">
                  {scanResult.sideEffects.map((item) => <span key={item}>{item}</span>)}
                </div>
              </div>
              <em>{scanResult.requiresPrescription ? "Cần kê đơn bác sĩ" : "Không kê đơn"}</em>
            </article>

            <div className="med-disclaimer">Thông tin thuốc chỉ dùng để tham khảo. Luôn dùng thuốc theo hướng dẫn của bác sĩ hoặc dược sĩ.</div>

            <article className="interaction-card">
              <p className="mini-label">Kiểm tra tương tác thuốc</p>
              <h2>Bạn đang dùng thuốc nào khác?</h2>
              <div className="drug-input-row">
                <input
                  value={drugInput}
                  onChange={(event) => setDrugInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addDrug(); } }}
                  placeholder="Nhập tên thuốc..."
                />
                <button type="button" onClick={addDrug}>+</button>
              </div>
              <div className="drug-tags">
                {drugList.map((drug) => (
                  <span key={drug}>{drug}<button type="button" onClick={() => setDrugList((current) => current.filter((item) => item !== drug))}>×</button></span>
                ))}
              </div>
              <button className="dark-action" type="button" disabled={drugList.length === 0} onClick={checkInteraction}>Kiểm tra tương tác</button>

              {interactions.length > 0 && (
                <div className="interaction-list">
                  {interactions.map((item) => (
                    <article key={`${item.medicineA}-${item.medicineB}`}>
                      <span className={`severity ${item.severity.toLowerCase()}`}>{item.severity}</span>
                      <strong>{item.medicineA} + {item.medicineB}</strong>
                      <p>{item.description}</p>
                      <small>{item.recommendation}</small>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </>
        )}
      </section>
    </main>
  );
}

const styles = `
.medication-page { min-height: 100svh; display: grid; grid-template-columns: minmax(0, .9fr) minmax(360px, 1.1fr); gap: 18px; background: var(--bg); color: var(--ink); padding: 22px; }
.scan-panel, .scan-result-panel > article, .empty-result, .med-disclaimer { border: 1.5px solid var(--ink); border-radius: 14px; background: var(--paper); box-shadow: 4px 4px 0 var(--ink); }
.scan-panel { padding: clamp(20px, 3vw, 28px); align-self: start; }
.medication-quick-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.medication-quick-nav button { min-height: 38px; border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); padding: 0 13px; font-weight: 900; }
.medication-quick-nav button:first-child { background: var(--lime); }
.mini-label { display: inline-flex; align-items: center; gap: 9px; margin: 0 0 12px; color: var(--lime-dark); font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.mini-label::before { content: ""; width: 12px; height: 2px; background: currentColor; }
.scan-panel h1 { margin: 0 0 16px; font-family: var(--display); font-size: clamp(30px, 5vw, 46px); line-height: 1.06; }
.upload-zone { min-height: 280px; display: grid; place-items: center; border: 1.5px dashed var(--ink); border-radius: 12px; background: var(--paper-soft); padding: 22px; text-align: center; cursor: pointer; }
.upload-zone input, .upload-actions input { display: none; }
.upload-zone span { display: grid; place-items: center; width: 62px; height: 62px; margin: 0 auto 12px; border-radius: 50%; background: var(--mint); font-size: 28px; }
.upload-zone strong, .upload-zone small { display: block; }
.upload-zone small { margin-top: 7px; color: var(--muted); }
.upload-zone img { width: 100%; height: 300px; object-fit: cover; border: 1.5px solid var(--ink); border-radius: 10px; }
.upload-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.upload-actions label, .primary-action, .dark-action { min-height: 44px; display: grid; place-items: center; border: 1.5px solid var(--ink); border-radius: 9px; font-weight: 900; }
.upload-actions label { background: #fff; cursor: pointer; }
.primary-action { width: 100%; margin-top: 12px; background: var(--lime); color: var(--ink); box-shadow: 3px 3px 0 var(--ink); }
.primary-action:disabled, .dark-action:disabled { opacity: .46; cursor: not-allowed; box-shadow: none; }
.scan-progress { display: grid; gap: 10px; margin-top: 16px; }
.scan-progress span { height: 10px; overflow: hidden; border: 1.5px solid var(--ink); border-radius: 999px; background: linear-gradient(90deg, var(--lime), var(--teal), var(--lime)); background-size: 200% 100%; animation: slide 1s linear infinite; }
.scan-progress strong { color: var(--muted); font-size: 13px; }
.scan-result-panel { display: grid; gap: 14px; align-content: start; }
.empty-result { min-height: 500px; display: grid; place-items: center; align-content: center; gap: 10px; padding: 28px; text-align: center; }
.empty-result div { width: 74px; height: 74px; display: grid; place-items: center; border: 1.5px solid var(--ink); border-radius: 50%; background: var(--lime); box-shadow: 4px 4px 0 var(--ink); font-size: 42px; font-weight: 900; }
.empty-result h2 { margin: 0; font-size: clamp(24px, 4vw, 34px); }
.empty-result p { max-width: 520px; margin: 0; color: var(--muted); line-height: 1.6; }
.medicine-card, .interaction-card { padding: clamp(18px, 3vw, 24px); }
.medicine-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.medicine-head h2, .interaction-card h2 { margin: 0; font-size: 26px; }
.medicine-head span { border-radius: 999px; background: var(--lime); padding: 7px 10px; font-size: 12px; font-weight: 900; white-space: nowrap; }
.medicine-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 16px; }
.medicine-grid p { margin: 0; border: 1px solid var(--line); border-radius: 10px; background: var(--paper-soft); padding: 12px; font-weight: 900; }
.medicine-grid span { display: block; margin-bottom: 5px; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
.medicine-copy { border-top: 1px solid var(--line); margin-top: 16px; padding-top: 16px; }
.medicine-copy p { margin: 7px 0 14px; color: var(--muted); line-height: 1.6; }
.side-effects { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 9px; }
.side-effects span { border-radius: 999px; background: rgba(239,111,97,.12); color: #b42318; padding: 6px 9px; font-size: 12px; font-weight: 900; }
.medicine-card em { display: inline-flex; margin-top: 16px; border-radius: 999px; background: var(--ink); color: #fff; padding: 7px 11px; font-style: normal; font-weight: 900; }
.med-disclaimer { padding: 12px; background: rgba(245,158,11,.14); color: #7c3f00; font-size: 13px; font-weight: 800; line-height: 1.5; box-shadow: none; }
.drug-input-row { display: grid; grid-template-columns: minmax(0,1fr) 44px; gap: 8px; margin-top: 14px; }
.drug-input-row input { min-width: 0; border: 1.5px solid var(--ink); border-radius: 9px; padding: 11px; outline: none; }
.drug-input-row button { border: 1.5px solid var(--ink); border-radius: 9px; background: var(--lime); font-size: 22px; font-weight: 900; }
.drug-tags { display: flex; flex-wrap: wrap; gap: 8px; min-height: 36px; margin: 12px 0; }
.drug-tags span { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; background: var(--mint); color: var(--teal); padding: 6px 8px 6px 10px; font-size: 12px; font-weight: 900; }
.drug-tags button { border: 0; background: transparent; color: inherit; font-size: 16px; font-weight: 900; }
.dark-action { width: 100%; background: var(--ink); color: #fff; }
.interaction-list { display: grid; gap: 10px; margin-top: 14px; }
.interaction-list article { border: 1px solid var(--line); border-radius: 10px; background: var(--paper-soft); padding: 13px; }
.interaction-list strong { display: block; margin-top: 8px; }
.interaction-list p { color: var(--muted); line-height: 1.55; }
.interaction-list small { color: var(--teal); font-weight: 900; line-height: 1.5; }
.severity { border-radius: 999px; padding: 5px 8px; background: #eef1e8; font-size: 11px; font-weight: 900; }
.severity.low { background: #eef1e8; color: var(--muted); }
.severity.moderate { background: rgba(245,158,11,.18); color: #92400e; }
.severity.high { background: rgba(249,115,22,.18); color: #9a3412; }
.severity.critical { background: rgba(239,111,97,.16); color: #b42318; }
@keyframes slide { to { background-position: -200% 0; } }
@media (max-width: 860px) {
  .medication-page { grid-template-columns: 1fr; padding: 14px; }
  .medicine-grid { grid-template-columns: 1fr; }
}
`;

export default MedicationScanPage;
