import { ArrowRight, ChevronDown, Info, LocateFixed, Stethoscope } from "lucide-react";

// Keep the next step outside the sidebar's scrolling results.
export function ClinicalRecommendationAction({ context }) {
  const href = context?.sessionId
    ? `/pre-consultation?sessionId=${encodeURIComponent(context.sessionId)}`
    : "/pre-consultation";
  return <footer className="explorer-next-step" aria-label="Bước tiếp theo">
    <p>Chuẩn bị thông tin trước khi đi khám</p>
    <a className="explorer-primary" href={href}><span>Tiếp tục tư vấn trước khám</span><ArrowRight size={22} aria-hidden="true" /></a>
  </footer>;
}

export default function ClinicalRecommendationPanel({ context, status, notice, chatContext, onFindNearby, onBrowseFacilities, hasNearbyResults, locating, locationError }) {
  const department = context?.recommendedDepartment;
  const diagnoses = context?.diagnoses ?? [];
  return <section className="explorer-advice" aria-label="Kết quả tư vấn">
    <h2 tabIndex={-1}>Kết quả tư vấn</h2>
    {status === "loading" && <p className="explorer-notice" role="status">Đang khôi phục kết quả tư vấn…</p>}
    {notice && <p className="explorer-notice" role={status === "error" ? "alert" : "status"}>{notice}</p>}
    {(status !== "ready" || !department?.departmentId) && onBrowseFacilities && <button className="explorer-text-action" type="button" onClick={onBrowseFacilities}>Xem danh sách cơ sở</button>}
    {status === "ready" && <>
      <section className="explorer-card explorer-specialty" aria-labelledby="explorer-specialty-title">
        <span className="explorer-eyebrow"><Stethoscope size={20} aria-hidden="true" /> Chuyên khoa được gợi ý</span>
        <h3 id="explorer-specialty-title">{department?.departmentName || "Chưa xác định chuyên khoa"}</h3>
        {department?.departmentId && onFindNearby && <div className="explorer-specialty-nearby">
          <button type="button" className="explorer-location-button" onClick={onFindNearby} disabled={locating} aria-busy={locating}>
            <LocateFixed size={22} aria-hidden="true" />
            <span>{locating ? "Đang xác định vị trí…" : locationError ? "Thử lại vị trí" : "Tìm nơi khám gần tôi"}</span>
          </button>
          <p>Dùng vị trí của bạn để tìm cơ sở có chuyên khoa này ở gần bạn.</p>
          {locationError && <p className="explorer-notice" role="alert">{locationError}</p>}
          <button type="button" className="explorer-text-action" onClick={onBrowseFacilities} disabled={locating}>{hasNearbyResults ? "Trở lại các cơ sở đã tìm" : "Xem cơ sở mà không dùng vị trí"}</button>
        </div>}
        <details className="explorer-description">
          <summary>Thông tin chuyên khoa và lý do gợi ý <ChevronDown size={20} aria-hidden="true" /></summary>
          {department?.reason && <div className="explorer-reason"><span className="explorer-label">Lý do gợi ý</span><p>{department.reason}</p></div>}
          <h4>Về chuyên khoa này</h4>
          <p>{department?.description || "Chưa có mô tả chuyên khoa."}</p>
        </details>
      </section>
      <p className="explorer-disclaimer explorer-clinical-disclaimer"><Info size={20} aria-hidden="true" /><span>Đây là gợi ý chuyên khoa để bạn tham khảo, không phải chẩn đoán bệnh và không thay thế việc khám với bác sĩ.</span></p>
      <details className="explorer-card explorer-reference-results">
        <summary><span>Xem các kết quả tham khảo{diagnoses.length > 0 ? ` (${diagnoses.length})` : ""}</span><ChevronDown size={20} aria-hidden="true" /></summary>
        <p className="explorer-muted">{diagnoses.length ? "Chọn từng mục để đọc giải thích. Mức độ phù hợp không phải xác suất mắc bệnh." : "Chưa có kết quả tham khảo bổ sung cho lần tư vấn này."}</p>
        {diagnoses.map((diagnosis, index) => {
          const score = Number(diagnosis.confidenceScore);
          const percent = Math.max(0, Math.min(100, Math.round(score <= 1 ? score * 100 : score)));
          return <details className="explorer-diagnosis" key={`${diagnosis.icd10Code || diagnosis.diseaseName}-${index}`}>
            <summary><span><strong>{diagnosis.diseaseName || "Kết quả tham khảo"}</strong>{Number.isFinite(score) && score > 0 && <small>Độ phù hợp: {percent}%</small>}</span><ChevronDown size={20} aria-hidden="true" /></summary>
            <div className="explorer-diagnosis-content"><p>{diagnosis.clinicalReasoning || "Chưa có giải thích chi tiết."}</p>{diagnosis.icd10Code && <small>ICD-10: {diagnosis.icd10Code}</small>}</div>
          </details>;
        })}
      </details>
    </>}
    {chatContext && <details className="explorer-card explorer-chat-context"><summary>Nội dung trao đổi trước đó <ChevronDown size={20} aria-hidden="true" /></summary><p>{chatContext.symptom}</p><p>{chatContext.answer}</p></details>}
    {status !== "ready" && chatContext && <p className="explorer-disclaimer explorer-clinical-disclaimer"><Info size={20} aria-hidden="true" /><span>Thông tin tham khảo, không thay thế chẩn đoán của bác sĩ.</span></p>}
  </section>;
}
