import { useEffect, useState } from "react";
import { ClipboardPlus, History, MapPin, UserRound } from "lucide-react";
import { Alert, Button, EmptyState, ErrorState, LoadingState } from "../components/ui";
import { navigate } from "../router/navigation";
import { getStoredAuth } from "../services/api";
import { symptomAnalysisApi } from "../services/symptomAnalysisService";
import "../styles/dashboard.css";

function unwrapData(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function getPagedItems(response) {
  const data = unwrapData(response);
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function formatDate(value) {
  if (!value) return "Chua co ngay tao";
  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return "Chua co ngay tao";
  }
}

function getProfileStatus(auth) {
  if (auth?.isProfileCompleted === true) return "Ho so da hoan thien";
  if (auth?.isProfileCompleted === false || auth?.firstLogin === true || auth?.isFirstLogin === true) {
    return "Can bo sung ho so";
  }
  return "Dang cap nhat";
}

export default function DashboardPage() {
  const auth = getStoredAuth();
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    symptomAnalysisApi.listMySessions(1, 5)
      .then((response) => {
        if (active) setSessions(getPagedItems(response));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Khong the tai lich su danh gia.");
      })
      .finally(() => {
        if (active) setStatus("idle");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="patient-dashboard-page">
      <section className="patient-dashboard-shell">
        <header className="patient-dashboard-hero">
          <div>
            <p className="eyebrow">Patient hub</p>
            <h1>Xin chao, {auth?.email || "ban"}</h1>
            <p>Day la noi bat dau danh gia trieu chung moi, xem lai phien gan day va tiep tuc dieu huong den co so y te phu hop.</p>
          </div>
          <Button size="lg" onClick={() => navigate("/medical-assistant/safety")}>
            <ClipboardPlus size={18} />
            Danh gia trieu chung moi
          </Button>
        </header>

        <section className="patient-dashboard-grid" aria-label="Tong quan benh nhan">
          <article>
            <span><UserRound size={20} aria-hidden="true" /></span>
            <strong>{getProfileStatus(auth)}</strong>
            <p>Ho so giup MediMate dat cau hoi va goi y theo boi canh suc khoe tot hon.</p>
            <Button tone="secondary" onClick={() => navigate(auth?.isProfileCompleted === false ? "/patient/profile/setup" : "/profile")}>Cap nhat ho so</Button>
          </article>
          <article>
            <span><History size={20} aria-hidden="true" /></span>
            <strong>{sessions.length} phien gan day</strong>
            <p>Du lieu lay tu endpoint my-sessions cua backend.</p>
            <Button tone="secondary" onClick={() => navigate("/assessment/history")}>Xem lich su</Button>
          </article>
          <article>
            <span><MapPin size={20} aria-hidden="true" /></span>
            <strong>Co so y te</strong>
            <p>Mo ban do de tim co so active theo ten, dia chi hoac chuyen khoa.</p>
            <Button tone="secondary" onClick={() => navigate("/map")}>Mo ban do</Button>
          </article>
        </section>

        <section className="patient-dashboard-panel" aria-labelledby="recent-sessions-title">
          <div className="patient-dashboard-panel-head">
            <div>
              <p className="eyebrow">Recent sessions</p>
              <h2 id="recent-sessions-title">Lich su danh gia gan day</h2>
            </div>
            <Button tone="secondary" onClick={() => navigate("/assessment/history")}>Tat ca phien</Button>
          </div>

          {status === "loading" && <LoadingState label="Dang tai lich su danh gia..." />}
          {error && (
            <ErrorState
              title="Khong the tai lich su"
              description={error}
              action={<Button onClick={() => window.location.reload()}>Thu lai</Button>}
            />
          )}
          {status !== "loading" && !error && sessions.length === 0 && (
            <EmptyState
              title="Chua co phien danh gia nao"
              description="Bat dau phien moi de MediMate tao cau hoi lam sang va luu lich su cho lan sau."
              action={<Button onClick={() => navigate("/medical-assistant/safety")}>Danh gia trieu chung moi</Button>}
            />
          )}
          {sessions.length > 0 && (
            <div className="patient-session-list">
              {sessions.map((session) => (
                <article key={session.sessionId}>
                  <div>
                    <strong>{session.inputText || "Phien danh gia"}</strong>
                    <span>{formatDate(session.createdAt)}</span>
                  </div>
                  <small>{session.severityLevel || session.status || "Dang cap nhat"}</small>
                  <Button tone="secondary" onClick={() => navigate(`/assessment/${session.sessionId}/result`)}>Xem chi tiet</Button>
                </article>
              ))}
            </div>
          )}
        </section>

        <Alert tone="warning" title="Luu y y te">
          MediMate chi ho tro dinh huong truoc khi di kham. Neu co dau hieu nguy hiem nhu kho tho, dau nguc du doi, yeu liet hoac mat y thuc, hay lien he cap cuu.
        </Alert>
      </section>
    </main>
  );
}
