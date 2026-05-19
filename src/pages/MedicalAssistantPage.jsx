import { useMemo, useState } from "react";
import ChatSidebar from "../components/medicalAssistant/ChatSidebar";
import MedicalMap from "../components/medicalAssistant/MedicalMap";
import { getStoredAuth } from "../services/api";
import { getDefaultMapLocation, getHospitalRecommendations } from "../services/hospitalRecommendations";
import { sendSymptomMessage } from "../services/symptomChat";

const SUGGESTED_PROMPTS = [
  "Tôi bị sốt nhẹ 2 ngày",
  "Tôi nên khám khoa nào?",
  "Triệu chứng nào cần cấp cứu?",
  "Bệnh viện gần tôi nhất?",
];

function buildAssistantMessage(response) {
  const data = response.data ?? {};
  const answer = data.answer || response.message || "MediMate AI đã ghi nhận triệu chứng của bạn.";
  const moreInfo = data.needsMoreInformation
    ? "\n\nBạn nên bổ sung thêm thời gian xuất hiện, mức độ đau, bệnh nền và thuốc đang dùng nếu có."
    : "";

  return `${answer}${moreInfo}`;
}

function EmptyAuth() {
  return (
    <main className="workspace-root">
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">AI Assistant</p>
          <h1>Bạn cần đăng nhập để dùng trợ lý triệu chứng nâng cao.</h1>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/login">Đăng nhập</a>
            <a className="btn btn-ghost" href="/signup">Tạo tài khoản</a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function MedicalAssistantPage() {
  const auth = useMemo(() => getStoredAuth(), []);
  const defaultLocation = getDefaultMapLocation();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewState, setViewState] = useState({
    ...defaultLocation,
    zoom: 12.2,
    pitch: 20,
    bearing: -8,
  });

  function focusHospital(hospital) {
    if (!hospital) return;
    setSelectedHospital(hospital);
    setViewState((current) => ({
      ...current,
      longitude: hospital.longitude,
      latitude: hospital.latitude,
      zoom: Math.max(current.zoom, 13.2),
    }));
  }

  if (!auth) return <EmptyAuth />;

  async function handleSubmit(event) {
    event.preventDefault();
    const symptomText = draft.trim();
    if (!symptomText || chatLoading) return;

    setMessages((current) => [...current, { from: "user", text: symptomText }]);
    setDraft("");
    setChatLoading(true);
    setHospitalsLoading(true);
    setErrorMessage("");

    try {
      const [chatResponse, hospitalResponse] = await Promise.all([
        sendSymptomMessage(symptomText),
        getHospitalRecommendations({ symptomText }),
      ]);
      const recommendedHospitals = hospitalResponse.data ?? [];

      setMessages((current) => [...current, { from: "assistant", text: buildAssistantMessage(chatResponse) }]);
      setHospitals(recommendedHospitals);
      focusHospital(recommendedHospitals[0] ?? null);
    } catch (error) {
      setErrorMessage(error.message);
      setMessages((current) => [
        ...current,
        {
          from: "assistant",
          text: "Hiện chưa thể hoàn tất tư vấn. Bạn có thể thử lại hoặc đi khám sớm nếu triệu chứng nặng lên.",
        },
      ]);
    } finally {
      setChatLoading(false);
      setHospitalsLoading(false);
    }
  }

  function handlePromptSelect(prompt) {
    setDraft(prompt);
  }

  function handleSelectHospital(hospital) {
    focusHospital(hospital);
  }

  return (
    <main className="workspace-root medical-assistant-root">
      <section className="medical-assistant-shell">
        <ChatSidebar
          draft={draft}
          prompts={SUGGESTED_PROMPTS}
          messages={messages}
          hospitals={hospitals}
          chatLoading={chatLoading}
          hospitalsLoading={hospitalsLoading}
          errorMessage={errorMessage}
          selectedHospital={selectedHospital}
          onDraftChange={setDraft}
          onSubmit={handleSubmit}
          onPromptSelect={handlePromptSelect}
          onSelectHospital={handleSelectHospital}
        />
        <MedicalMap
          hospitals={hospitals}
          loading={mapLoading || hospitalsLoading}
          selectedHospital={selectedHospital}
          viewState={viewState}
          onMove={setViewState}
          onSelectHospital={handleSelectHospital}
          onMapLoad={() => setMapLoading(false)}
        />
      </section>
    </main>
  );
}
