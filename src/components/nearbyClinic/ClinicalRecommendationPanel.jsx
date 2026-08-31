import { ArrowRight, ChevronDown, Info, LocateFixed, Stethoscope } from "lucide-react";
import { getSpecialtyExplanation, readRankingScore } from "../../utils/clinicalExplanation";

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
  const explanation = getSpecialtyExplanation(department, diagnoses);
  return <section className="explorer-advice" aria-label="Kết quả tư vấn">
    <h2 tabIndex={-1}>Kết quả tư vấn</h2>
    {status === "loading" && <p className="explorer-notice" role="status">Đang khôi phục kết quả tư vấn…</p>}
    {notice && <p className="explorer-notice" role={status === "error" ? "alert" : "status"}>{notice}</p>}
    {(status !== "ready" || !department?.departmentId) && onBrowseFacilities && <button className="explorer-text-action" type="button" onClick={onBrowseFacilities}>Xem danh sách cơ sở</button>}
    {status === "ready" && <>
      <section className="explorer-card explorer-specialty" aria-labelledby="explorer-specialty-title">
        <span className="explorer-eyebrow"><Stethoscope size={20} aria-hidden="true" /> Chuyên khoa được gợi ý</span>
        <h3 id="explorer-specialty-title">{department?.departmentName || "Chưa xác định chuyên khoa"}</h3>
        <p className="explorer-reason-summary">{explanation.summary}</p>
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
          <summary>Vì sao gợi ý chuyên khoa này? <ChevronDown size={20} aria-hidden="true" /></summary>
          {explanation.relatedResult && <div className="explorer-reason"><span className="explorer-label">Kết quả tham khảo liên quan</span><p>{explanation.relatedResult}</p></div>}
          {explanation.reasoning ? <div className="explorer-source-reason"><h4>Giải thích từ lần phân tích</h4><p>{explanation.reasoning}</p><p className="explorer-muted">Giải thích này do AI tạo từ thông tin của phiên tư vấn, chưa được bác sĩ xác nhận.</p></div>
            : <p>Chưa có giải thích chi tiết cho gợi ý này. Bạn vẫn có thể xem thông tin chuyên khoa và các kết quả tham khảo bên dưới.</p>}
          <h4>Về chuyên khoa này</h4>
          <p>{department?.description || "Chưa có mô tả chuyên khoa."}</p>
        </details>
      </section>
      <p className="explorer-disclaimer explorer-clinical-disclaimer"><Info size={20} aria-hidden="true" /><span>Đây là gợi ý chuyên khoa để bạn tham khảo, không phải chẩn đoán bệnh và không thay thế việc khám với bác sĩ.</span></p>
      <details className="explorer-card explorer-reference-results">
        <summary><span>Xem các kết quả tham khảo{diagnoses.length > 0 ? ` (${diagnoses.length})` : ""}</span><ChevronDown size={20} aria-hidden="true" /></summary>
        <p className="explorer-muted">{diagnoses.length ? "Các kết quả được hệ thống sắp xếp để tham khảo từ thông tin bạn cung cấp. Đây không phải kết luận bạn mắc bệnh. Mở từng mục để xem giải thích." : "Chưa có kết quả tham khảo bổ sung cho lần tư vấn này."}</p>
        {diagnoses.some((diagnosis) => readRankingScore(diagnosis) !== null) && <div className="explorer-score-explanation"><strong>Điểm xếp hạng có ý nghĩa gì?</strong><p>Điểm trong phần chi tiết chỉ dùng để so sánh các kết quả AI đưa ra trong lần phân tích này. Đây không phải tỷ lệ triệu chứng trùng khớp hay xác suất mắc bệnh. Điểm cao hơn không có nghĩa bệnh nặng hơn.</p></div>}
        {diagnoses.map((diagnosis, index) => {
          const score = readRankingScore(diagnosis);
          return <details className="explorer-diagnosis" key={`${diagnosis.icd10Code || diagnosis.diseaseName}-${index}`}>
            <summary><span><strong>{diagnosis.diseaseName || "Kết quả tham khảo"}</strong><small>Xem giải thích</small></span><ChevronDown size={20} aria-hidden="true" /></summary>
            <div className="explorer-diagnosis-content"><p>{diagnosis.clinicalReasoning || "Chưa có giải thích chi tiết."}</p>{score !== null && <p className="explorer-muted">Điểm xếp hạng tham khảo của AI: {Math.round(score * 100)}/100. Điểm này không cho biết khả năng bạn mắc bệnh.</p>}{diagnosis.icd10Code && <small>Mã tham khảo ICD-10: {diagnosis.icd10Code}</small>}</div>
          </details>;
        })}
      </details>
    </>}
    {chatContext && <details className="explorer-card explorer-chat-context"><summary>Nội dung trao đổi trước đó <ChevronDown size={20} aria-hidden="true" /></summary><p>{chatContext.symptom}</p><p>{chatContext.answer}</p></details>}
    {status !== "ready" && chatContext && <p className="explorer-disclaimer explorer-clinical-disclaimer"><Info size={20} aria-hidden="true" /><span>Thông tin tham khảo, không thay thế chẩn đoán của bác sĩ.</span></p>}
  </section>;
}
