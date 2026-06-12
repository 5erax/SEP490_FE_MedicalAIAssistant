import { useState } from "react";
import { navigate as goTo } from "../router/navigation";

const MOCK_RECORDS = [
  { id: "r1", title: "Xét nghiệm máu tổng quát", type: "LabResult", date: "2024-08-15", status: "Analyzed", labName: "Bệnh viện Chợ Rẫy" },
  { id: "r2", title: "Toa thuốc viêm họng", type: "Prescription", date: "2024-07-20", status: "Uploaded", labName: "Phòng khám đa khoa" },
  { id: "r3", title: "Giấy xuất viện", type: "DischargeSummary", date: "2024-06-10", status: "Archived", labName: "Bệnh viện Đại học Y Dược" },
];

const LAB_ITEMS = [
  { name: "Glucose", value: 5.8, unit: "mmol/L", min: 3.9, max: 5.5 },
  { name: "Cholesterol", value: 4.2, unit: "mmol/L", min: 0, max: 5.2 },
  { name: "WBC", value: 11.2, unit: "G/L", min: 4.0, max: 10.0 },
  { name: "Hemoglobin", value: 130, unit: "g/L", min: 120, max: 160 },
  { name: "Creatinine", value: 85, unit: "µmol/L", min: 53, max: 97 },
];

const TYPE_META = {
  LabResult: ["🧪", "Xét nghiệm"],
  Prescription: ["💊", "Toa thuốc"],
  DischargeSummary: ["📄", "Xuất viện"],
  ImagingResult: ["▣", "Hình ảnh"],
};

function getStatus(item) {
  if (Number(item.value) > item.max) return ["Cao", "high"];
  if (Number(item.value) < item.min) return ["Thấp", "low"];
  return ["Bình thường", "normal"];
}

function MedicalRecordPage() {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("detail");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleSelect = (record) => {
    setSelectedRecord(record);
    setActiveTab("detail");
    setAiResult(null);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAiResult(null);
    await new Promise((resolve) => window.setTimeout(resolve, 2500));
    setAiResult({
      summary: "Một số chỉ số viêm và đường huyết hơi cao. Bạn nên mang kết quả này khi đi khám, nhắc bác sĩ về triệu chứng hiện tại và các thuốc đang sử dụng.",
      model: "MediMate Clinical AI",
      createdAt: new Date().toLocaleString("vi-VN"),
    });
    setIsAnalyzing(false);
  };

  const renderRecordList = (mobile = false) => (
    <div className={mobile ? "mobile-record-list" : "record-list"}>
      {MOCK_RECORDS.map((record) => {
        const [icon, label] = TYPE_META[record.type] ?? ["□", record.type];
        return (
          <button
            type="button"
            className={selectedRecord?.id === record.id ? "active" : ""}
            key={record.id}
            onClick={() => handleSelect(record)}
          >
            <span>{icon}</span>
            <strong>{record.title}</strong>
            <small>{record.date}</small>
            <em className={`status ${record.status.toLowerCase()}`}>{label} · {record.status}</em>
          </button>
        );
      })}
    </div>
  );

  return (
    <main className="records-page">
      <style>{styles}</style>
      <aside className="records-sidebar">
        <p className="mini-label">Hồ sơ y tế</p>
        <button className="add-record" type="button" onClick={() => { setSelectedRecord(MOCK_RECORDS[0]); setActiveTab("files"); }}>+ Thêm hồ sơ</button>
        {renderRecordList()}
      </aside>

      <section className="records-content">
        <nav className="records-quick-nav" aria-label="Dieu huong nhanh">
          <button type="button" onClick={() => goTo("/dashboard")}>← Trang chủ</button>
          <button type="button" onClick={() => goTo("/profile")}>Hồ sơ cá nhân</button>
          <button type="button" onClick={() => goTo("/medication")}>Nhận diện thuốc</button>
          <button type="button" onClick={() => goTo("/chat")}>Chat AI</button>
        </nav>
        {renderRecordList(true)}

        {!selectedRecord ? (
          <div className="records-empty">
            <div>▤</div>
            <h1>Chọn một hồ sơ để xem chi tiết</h1>
            <p>Các kết quả xét nghiệm, toa thuốc và file y tế của bạn sẽ được gom tại đây để theo dõi dễ hơn.</p>
          </div>
        ) : (
          <article className="record-detail">
            <header className="record-header">
              <div>
                <h1>{selectedRecord.title}</h1>
                <p>{selectedRecord.date}</p>
                <div className="badge-row">
                  <span>{TYPE_META[selectedRecord.type]?.[1] ?? selectedRecord.type}</span>
                  <span className={`status ${selectedRecord.status.toLowerCase()}`}>{selectedRecord.status}</span>
                </div>
              </div>
              <div className="record-actions">
                <button type="button" onClick={() => { setActiveTab("ai"); handleAnalyze(); }}>Phân tích bằng AI</button>
                <button type="button" onClick={() => window.print()}>Tải xuống</button>
              </div>
            </header>

            <nav className="record-tabs" aria-label="Nội dung hồ sơ">
              {[
                ["detail", "Chi tiết"],
                ["lab", "Chỉ số xét nghiệm"],
                ["ai", "Phân tích AI"],
                ["files", "File đính kèm"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={activeTab === value ? "active" : ""}
                  onClick={() => setActiveTab(value)}
                >
                  {label}
                </button>
              ))}
            </nav>

            {activeTab === "detail" && (
              <section className="tab-panel detail-grid">
                <div><span>Tên xét nghiệm</span><strong>{selectedRecord.title}</strong></div>
                <div><span>Phòng lab</span><strong>{selectedRecord.labName}</strong></div>
                <div><span>Ngày xét nghiệm</span><strong>{selectedRecord.date}</strong></div>
                <label>
                  Kết luận tổng quát
                  <textarea readOnly value="Kết quả cần được đối chiếu với triệu chứng hiện tại, tiền sử bệnh và khám lâm sàng. Vui lòng trao đổi trực tiếp với bác sĩ phụ trách." />
                </label>
              </section>
            )}

            {activeTab === "lab" && (
              <section className="tab-panel">
                {selectedRecord.type === "LabResult" ? (
                  <div className="lab-table-wrap">
                    <table className="lab-table">
                      <thead>
                        <tr>
                          <th>Tên</th>
                          <th>Giá trị</th>
                          <th>Đơn vị</th>
                          <th>Bình thường</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {LAB_ITEMS.map((item) => {
                          const [label, tone] = getStatus(item);
                          return (
                            <tr key={item.name}>
                              <td>{item.name}</td>
                              <td>{item.value}</td>
                              <td>{item.unit}</td>
                              <td>{item.min}-{item.max}</td>
                              <td><span className={`lab-status ${tone}`}>{label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="soft-empty">Hồ sơ này không có bảng chỉ số xét nghiệm.</div>
                )}
              </section>
            )}

            {activeTab === "ai" && (
              <section className="tab-panel ai-panel">
                {!aiResult && !isAnalyzing && (
                  <div className="soft-empty">
                    <strong>Phân tích hồ sơ bằng AI</strong>
                    <p>AI sẽ tóm tắt điểm cần chú ý và gợi ý câu hỏi nên trao đổi khi đi khám.</p>
                    <button type="button" onClick={handleAnalyze}>Phân tích ngay</button>
                  </div>
                )}
                {isAnalyzing && <div className="ai-loading"><span />AI đang đọc và phân tích hồ sơ...</div>}
                {aiResult && (
                  <>
                    <div className="ai-result">
                      <strong>Kết quả phân tích</strong>
                      <p>{aiResult.summary}</p>
                      <small>{aiResult.createdAt} · {aiResult.model}</small>
                    </div>
                    <div className="records-disclaimer">Kết quả AI chỉ hỗ trợ tham khảo, không thay thế tư vấn từ bác sĩ.</div>
                  </>
                )}
              </section>
            )}

            {activeTab === "files" && (
              <section className="tab-panel file-grid">
                <div className="file-thumb">PDF<br />Kết quả xét nghiệm</div>
                <div className="file-thumb">Ảnh<br />Phiếu chỉ định</div>
                <button className="upload-tile" type="button">+ Tải file mới</button>
              </section>
            )}
          </article>
        )}
      </section>
    </main>
  );
}

const styles = `
.records-page { min-height: 100svh; display: flex; background: var(--bg); color: var(--ink); }
.records-sidebar { width: 220px; flex: 0 0 220px; border-right: 1.5px solid var(--ink); background: var(--paper); padding: 18px; }
.mini-label { display: inline-flex; align-items: center; gap: 9px; margin: 0 0 14px; color: var(--lime-dark); font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.mini-label::before { content: ""; width: 12px; height: 2px; background: currentColor; }
.add-record, .record-actions button, .soft-empty button { width: 100%; min-height: 42px; border: 1.5px solid var(--ink); border-radius: 9px; background: var(--lime); color: var(--ink); font-weight: 900; box-shadow: 2px 2px 0 var(--ink); }
.record-list, .mobile-record-list { display: grid; gap: 9px; margin-top: 14px; }
.record-list button, .mobile-record-list button { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 9px; border: 1px solid var(--line); border-radius: 10px; background: var(--paper-soft); padding: 11px; color: var(--ink); text-align: left; }
.record-list button.active, .record-list button:hover, .mobile-record-list button.active { border-color: var(--ink); box-shadow: 2px 2px 0 var(--ink); }
.record-list span, .mobile-record-list span { grid-row: span 3; width: 30px; height: 30px; display: grid; place-items: center; border-radius: 8px; background: var(--mint); }
.record-list strong, .mobile-record-list strong { font-size: 13px; line-height: 1.35; }
.record-list small, .mobile-record-list small { color: var(--muted); font-size: 11px; }
.status { display: inline-flex; width: fit-content; border-radius: 999px; background: #eef1e8; color: var(--muted); padding: 4px 8px; font-size: 10px; font-style: normal; font-weight: 900; }
.status.analyzed, .lab-status.normal { background: var(--lime); color: var(--ink); }
.status.uploaded { background: #eef1e8; color: var(--muted); }
.status.failed, .lab-status.high { background: rgba(239,111,97,.16); color: #b42318; }
.status.ocrprocessing, .lab-status.low { background: rgba(245,158,11,.18); color: #92400e; }
.records-content { flex: 1; min-width: 0; padding: 22px; }
.records-quick-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.records-quick-nav button { min-height: 38px; border: 1.5px solid var(--ink); border-radius: 999px; background: #fff; color: var(--ink); padding: 0 13px; font-weight: 900; }
.records-quick-nav button:first-child { background: var(--lime); }
.mobile-record-list { display: none; grid-template-columns: repeat(3, minmax(190px, 1fr)); overflow-x: auto; margin: 0 0 14px; }
.records-empty, .record-detail { min-height: calc(100svh - 44px); border: 1.5px solid var(--ink); border-radius: 14px; background: var(--paper); box-shadow: 4px 4px 0 var(--ink); }
.records-empty { display: grid; place-items: center; align-content: center; gap: 12px; padding: 28px; text-align: center; }
.records-empty div { font-size: 56px; }
.records-empty h1, .record-header h1 { margin: 0; font-family: var(--display); font-size: clamp(30px, 5vw, 48px); line-height: 1.05; }
.records-empty p { max-width: 540px; margin: 0; color: var(--muted); line-height: 1.65; }
.record-detail { padding: clamp(18px, 3vw, 28px); }
.record-header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
.record-header p { margin: 8px 0 0; color: var(--muted); font-weight: 800; }
.badge-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.badge-row span:first-child { border-radius: 999px; background: var(--mint); color: var(--teal); padding: 6px 10px; font-size: 11px; font-weight: 900; }
.record-actions { display: grid; gap: 9px; min-width: 180px; }
.record-actions button:last-child { background: #fff; }
.record-tabs { display: flex; gap: 8px; overflow-x: auto; border-bottom: 1px solid var(--line); margin-top: 22px; padding-bottom: 10px; }
.record-tabs button { flex: 0 0 auto; border: 1px solid var(--line); border-radius: 999px; background: #fff; padding: 9px 12px; color: var(--muted); font-weight: 900; }
.record-tabs button.active { border-color: var(--ink); background: var(--ink); color: #fff; }
.tab-panel { margin-top: 18px; }
.detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.detail-grid div, .detail-grid label { border: 1px solid var(--line); border-radius: 10px; background: var(--paper-soft); padding: 14px; }
.detail-grid span, .detail-grid label { color: var(--muted); font-size: 12px; font-weight: 900; }
.detail-grid strong { display: block; margin-top: 6px; }
.detail-grid label { grid-column: 1 / -1; display: grid; gap: 9px; }
.detail-grid textarea { min-height: 110px; resize: vertical; border: 1.5px solid var(--ink); border-radius: 9px; background: #fff; padding: 12px; color: var(--ink); line-height: 1.6; }
.lab-table-wrap { max-height: 440px; overflow: auto; border: 1.5px solid var(--ink); border-radius: 10px; }
.lab-table { width: 100%; border-collapse: collapse; background: #fff; }
.lab-table th { position: sticky; top: 0; background: var(--ink); color: #fff; text-align: left; }
.lab-table th, .lab-table td { border-bottom: 1px solid var(--line); padding: 12px; white-space: nowrap; }
.lab-status { border-radius: 999px; padding: 5px 8px; font-size: 11px; font-weight: 900; }
.soft-empty { display: grid; gap: 10px; border: 1px dashed var(--line-strong); border-radius: 12px; background: var(--paper-soft); padding: 22px; color: var(--muted); line-height: 1.6; }
.soft-empty strong { color: var(--ink); font-size: 18px; }
.soft-empty button { width: fit-content; padding-inline: 16px; }
.ai-loading { display: flex; gap: 10px; align-items: center; border: 1px solid var(--line); border-radius: 12px; background: var(--paper-soft); padding: 18px; font-weight: 900; }
.ai-loading span { width: 24px; height: 24px; border: 4px solid rgba(17,20,18,.12); border-top-color: var(--lime); border-radius: 50%; animation: spin .8s linear infinite; }
.ai-result { border: 1.5px solid var(--ink); border-radius: 12px; background: var(--ink); color: #fff; padding: 20px; }
.ai-result p { color: rgba(255,255,255,.72); line-height: 1.7; }
.ai-result small { color: var(--lime); font-weight: 800; }
.records-disclaimer { margin-top: 12px; border: 1px solid rgba(217,119,6,.32); border-radius: 10px; background: rgba(245,158,11,.14); color: #7c3f00; padding: 12px; font-weight: 800; }
.file-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.file-thumb, .upload-tile { min-height: 150px; display: grid; place-items: center; border: 1.5px solid var(--ink); border-radius: 12px; background: var(--paper-soft); color: var(--muted); text-align: center; font-weight: 900; }
.upload-tile { border-style: dashed; background: #fff; color: var(--ink); }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 760px) {
  .records-page { display: block; }
  .records-sidebar { display: none; }
  .records-content { padding: 14px; }
  .mobile-record-list { display: grid; }
  .record-header { display: grid; }
  .record-actions { min-width: 0; grid-template-columns: 1fr 1fr; }
  .detail-grid, .file-grid { grid-template-columns: 1fr; }
}
`;

export default MedicalRecordPage;
