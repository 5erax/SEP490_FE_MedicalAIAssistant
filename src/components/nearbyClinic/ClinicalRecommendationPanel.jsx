import { ArrowRight } from "lucide-react";
import { Alert, LoadingState } from "../ui";
import ClinicalNote from "../clinical/ClinicalNote";
import ClinicalDisclosure from "../clinical/ClinicalDisclosure";
import DepartmentRecommendation from "../clinical/DepartmentRecommendation";
import ClinicalConfidenceGuide from "../clinical/ClinicalConfidenceGuide";
import { CLINICAL_NOTES } from "../../content/clinicalNotes";
import { clinicalConfidencePercent, clinicalText } from "../../utils/clinicalPresentation";

export default function ClinicalRecommendationPanel({ context, status, notice, chatContext }) {
  // Reset native disclosure state only when the consultation changes, not when details arrive.
  return <RecommendationContent key={context?.sessionId || "current"} context={context} status={status} notice={notice} chatContext={chatContext} />;
}

function RecommendationContent({ context, status, notice, chatContext }) {
  const department = context?.recommendedDepartment;
  const diagnoses = Array.isArray(context?.diagnoses) ? context.diagnoses.filter(Boolean) : [];
  const hasScore = clinicalConfidencePercent(department?.confidenceScore) !== null
    || diagnoses.some((diagnosis) => clinicalConfidencePercent(diagnosis.confidenceScore) !== null);
  const symptom = clinicalText(chatContext?.symptom);
  const answer = clinicalText(chatContext?.answer);
  const href = context?.sessionId ? `/pre-consultation?sessionId=${encodeURIComponent(context.sessionId)}` : "/pre-consultation";
  return <section className="explorer-advice" aria-label="Kết quả tư vấn">
    <h2>Kết quả tư vấn</h2>
    {status === "loading" && <LoadingState label="Đang khôi phục kết quả tư vấn…" />}
    {notice && <Alert tone={status === "error" ? "danger" : "info"} title={status === "error" ? "Chưa tải được kết quả" : "Thông tin phiên tư vấn"} live>{notice}</Alert>}
    {status === "ready" && <>
      <DepartmentRecommendation department={department} />
      <section className="clinical-results" aria-label="Các kết quả tham khảo">
        <header><h3 className="clinical-section-title">Các kết quả tham khảo</h3>
          <p className="clinical-helper">{diagnoses.length ? CLINICAL_NOTES.resultHint : CLINICAL_NOTES.noAdditionalResults}</p>
        </header>
        {(hasScore || diagnoses.length > 0) && <ClinicalConfidenceGuide />}
        {diagnoses.length > 0 && <ul className="clinical-result-list">
          {diagnoses.map((diagnosis, index) => {
            const percent = clinicalConfidencePercent(diagnosis.confidenceScore);
            return <li key={`${diagnosis.icd10Code || diagnosis.diseaseName}-${index}`}>
              <ClinicalDisclosure title={diagnosis.diseaseName || "Kết quả tham khảo"} summaryMeta={percent !== null ? `Độ phù hợp: ${percent}%` : undefined}>
                <p className={clinicalText(diagnosis.clinicalReasoning) ? "clinical-body-text" : "clinical-helper"}>{clinicalText(diagnosis.clinicalReasoning) || CLINICAL_NOTES.noReasoning}</p>
                {diagnosis.icd10Code && <small className="clinical-metadata">ICD-10: {diagnosis.icd10Code}</small>}
              </ClinicalDisclosure>
            </li>;
          })}
        </ul>}
      </section>
      <a className="explorer-primary" href={href}>Tiếp tục tư vấn trước khám <ArrowRight size={16} aria-hidden="true" /></a>
    </>}
    {(symptom || answer) && <ClinicalDisclosure title="Nội dung trao đổi trước đó">
      <div className="clinical-transcript">
        {symptom && <div><h4 className="clinical-section-title">Nội dung bạn đã cung cấp</h4><p className="clinical-body-text">{symptom}</p></div>}
        {answer && <div><h4 className="clinical-section-title">Phản hồi trước đó</h4><p className="clinical-body-text">{answer}</p></div>}
      </div>
    </ClinicalDisclosure>}
    <ClinicalNote title={CLINICAL_NOTES.scopeTitle}>{CLINICAL_NOTES.scope}</ClinicalNote>
  </section>;
}
