import { ArrowRight, ChevronDown, Info, Stethoscope } from "lucide-react";

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

export default function ClinicalRecommendationPanel({ context, status, notice, chatContext }) {
  const department = context?.recommendedDepartment;
  const diagnoses = context?.diagnoses ?? [];
  return <section className="explorer-advice" aria-label="Kết quả tư vấn">
    <h2>Kết quả tư vấn</h2>
    {status === "loading" && <p className="explorer-notice" role="status">Đang khôi phục kết quả tư vấn…</p>}
    {notice && <p className="explorer-notice" role={status === "error" ? "alert" : "status"}>{notice}</p>}
    {status === "ready" && <>
      <section className="explorer-card explorer-specialty" aria-labelledby="explorer-specialty-title">
        <span className="explorer-eyebrow"><Stethoscope size={20} aria-hidden="true" /> Chuyên khoa được gợi ý</span>
        <h3 id="explorer-specialty-title">{department?.departmentName || "Chưa xác định chuyên khoa"}</h3>
        {department?.reason && <div className="explorer-reason"><span className="explorer-label">Lý do gợi ý</span><p>{department.reason}</p></div>}
        <details className="explorer-description">
          <summary>Xem mô tả chuyên khoa <ChevronDown size={20} aria-hidden="true" /></summary>
          <p>{department?.description || "Chưa có mô tả chuyên khoa."}</p>
        </details>
      </section>
      <section className="explorer-card explorer-reference-results" aria-labelledby="explorer-results-title">
        <h3 id="explorer-results-title">Các kết quả tham khảo</h3>
        <p className="explorer-muted">{diagnoses.length ? "Chọn từng mục để đọc giải thích. Mức độ phù hợp không phải xác suất mắc bệnh." : "Chưa có kết quả tham khảo bổ sung cho lần tư vấn này."}</p>
        {diagnoses.map((diagnosis, index) => {
          const score = Number(diagnosis.confidenceScore);
          const percent = Math.max(0, Math.min(100, Math.round(score <= 1 ? score * 100 : score)));
          return <details className="explorer-diagnosis" key={`${diagnosis.icd10Code || diagnosis.diseaseName}-${index}`}>
            <summary><span><strong>{diagnosis.diseaseName || "Kết quả tham khảo"}</strong>{Number.isFinite(score) && score > 0 && <small>Độ phù hợp: {percent}%</small>}</span><ChevronDown size={20} aria-hidden="true" /></summary>
            <div className="explorer-diagnosis-content"><p>{diagnosis.clinicalReasoning || "Chưa có giải thích chi tiết."}</p>{diagnosis.icd10Code && <small>ICD-10: {diagnosis.icd10Code}</small>}</div>
          </details>;
        })}
      </section>
    </>}
    {chatContext && <details className="explorer-card explorer-chat-context"><summary>Nội dung trao đổi trước đó <ChevronDown size={20} aria-hidden="true" /></summary><p>{chatContext.symptom}</p><p>{chatContext.answer}</p></details>}
    <p className="explorer-disclaimer explorer-clinical-disclaimer"><Info size={20} aria-hidden="true" /><span>Thông tin tham khảo, không thay thế chẩn đoán của bác sĩ.</span></p>
  </section>;
}
