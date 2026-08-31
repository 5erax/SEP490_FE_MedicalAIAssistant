import ClinicalNote from "./ClinicalNote";
import ClinicalDisclosure from "./ClinicalDisclosure";
import { CLINICAL_NOTES } from "../../content/clinicalNotes";

export default function ClinicalConfidenceGuide() {
  return <div className="clinical-confidence-guide">
    <ClinicalNote>{CLINICAL_NOTES.confidence}</ClinicalNote>
    <ClinicalDisclosure title={CLINICAL_NOTES.confidenceTitle}>
      <p className="clinical-guidance">{CLINICAL_NOTES.confidenceDetail}</p>
    </ClinicalDisclosure>
  </div>;
}
