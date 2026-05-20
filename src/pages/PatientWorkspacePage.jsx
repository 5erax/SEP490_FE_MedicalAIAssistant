import { useEffect, useMemo, useState } from "react";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/PricingSection";
import SymptomChatBox from "../components/patient/SymptomChatBox";
import {
  authApi,
  clearStoredAuth,
  getStoredAuth,
  medicalDepartmentsApi,
  patientProfilesApi,
} from "../services/api";

const EMPTY_ACCOUNT_PROFILE = {
  displayName: "",
  address: "",
  gender: "1",
  dateOfBirth: "",
  phoneNumber: "",
};

const EMPTY_PATIENT_PROFILE = {
  bloodType: "",
  height: "",
  weight: "",
  allergyNote: "",
  chronicDiseaseNote: "",
};

const DEFAULT_VIEW_STATE = {
  longitude: 105.846,
  latitude: 21.026,
  zoom: 12,
  pitch: 30,
  bearing: -10,
};

const FALLBACK_FACILITIES = [
  {
    id: "bach-mai",
    name: "Bệnh viện Bạch Mai",
    department: "Nội tổng quát",
    distance: "2.4 km",
    status: "Đang mở cửa",
    address: "78 Giải Phóng, Hà Nội",
    longitude: 105.8412,
    latitude: 21.0017,
  },
  {
    id: "viet-duc",
    name: "Bệnh viện Việt Đức",
    department: "Cấp cứu & Ngoại khoa",
    distance: "1.1 km",
    status: "Phù hợp khi triệu chứng nặng",
    address: "40 Tràng Thi, Hà Nội",
    longitude: 105.8463,
    latitude: 21.0286,
  },
  {
    id: "vinmec",
    name: "Vinmec Times City",
    department: "Khám chuyên khoa",
    distance: "4.1 km",
    status: "Có đặt lịch trong ngày",
    address: "458 Minh Khai, Hà Nội",
    longitude: 105.8675,
    latitude: 20.9957,
  },
  {
    id: "medlatec",
    name: "Medlatec Nghĩa Dũng",
    department: "Xét nghiệm & chẩn đoán",
    distance: "3.2 km",
    status: "Phù hợp xét nghiệm cơ bản",
    address: "42 Nghĩa Dũng, Hà Nội",
    longitude: 105.8419,
    latitude: 21.0451,
  },
];

function ApiMessage({ message }) {
  if (!message) return null;
  return <div className={`api-message ${message.type}`}>{message.text}</div>;
}

function Field({ label, children }) {
  return (
    <label className="clean-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getUserId(user, auth) {
  return user?.userId ?? user?.identityId ?? auth?.userId ?? auth?.identityId ?? "";
}

function toPatientForm(profile) {
  if (!profile) return EMPTY_PATIENT_PROFILE;
  return {
    bloodType: profile.bloodType ?? "",
    height: profile.height ?? "",
    weight: profile.weight ?? "",
    allergyNote: profile.allergyNote ?? "",
    chronicDiseaseNote: profile.chronicDiseaseNote ?? "",
  };
}

function EmptyAuth() {
  return (
    <main className="landing-page">
      <Navbar />
      <section className="app-page">
        <div className="container app-empty">
          <p className="eyebrow">Hồ sơ cá nhân</p>
          <h1>Bạn cần đăng nhập để mở không gian chăm sóc sức khỏe.</h1>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/login">Đăng nhập</a>
            <a className="btn btn-ghost" href="/signup">Tạo tài khoản</a>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function PatientMap({ userLocation, viewState, setViewState, onLocate, locating }) {
  const [selectedId, setSelectedId] = useState(FALLBACK_FACILITIES[0].id);

  const selectedFacility = useMemo(
    () => FALLBACK_FACILITIES.find((facility) => facility.id === selectedId),
    [selectedId],
  );

  return (
    <section className="app-card patient-map-card">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Bản đồ</p>
          <h2>Cơ sở y tế gần bạn</h2>
        </div>
        <button className="btn btn-ghost btn-small" type="button" onClick={onLocate} disabled={locating}>
          {locating ? "Đang định vị..." : "Định vị tôi"}
        </button>
      </div>

      <div className="patient-map-live">
        <Map
          {...viewState}
          onMove={(event) => setViewState(event.viewState)}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          attributionControl={false}
        >
          <NavigationControl position="top-right" />

          {userLocation && (
            <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="center">
              <div className="user-location-marker">
                <span />
              </div>
            </Marker>
          )}

          {FALLBACK_FACILITIES.map((facility) => (
            <Marker
              key={facility.id}
              longitude={facility.longitude}
              latitude={facility.latitude}
              anchor="bottom"
              onClick={(event) => {
                event.originalEvent.stopPropagation();
                setSelectedId(facility.id);
              }}
            >
              <button className={`map-marker ${selectedId === facility.id ? "active" : ""}`} type="button" aria-label={facility.name}>
                <span>+</span>
              </button>
            </Marker>
          ))}

          {selectedFacility && (
            <Popup
              longitude={selectedFacility.longitude}
              latitude={selectedFacility.latitude}
              anchor="top"
              closeButton={false}
              offset={18}
            >
              <div className="map-popup">
                <strong>{selectedFacility.name}</strong>
                <span>{selectedFacility.department}</span>
                <p>{selectedFacility.address}</p>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      <div className="facility-list facility-list-horizontal">
        {FALLBACK_FACILITIES.map((facility, index) => (
          <button
            className={`facility-card-button ${selectedId === facility.id ? "active" : ""}`}
            key={facility.id}
            type="button"
            onClick={() => {
              setSelectedId(facility.id);
              setViewState((current) => ({
                ...current,
                longitude: facility.longitude,
                latitude: facility.latitude,
                zoom: Math.max(current.zoom, 13),
              }));
            }}
          >
            <span>{index + 1}</span>
            <div>
              <strong>{facility.name}</strong>
              <small>{facility.department} · {facility.distance}</small>
              <p>{facility.address}</p>
              <em>{facility.status}</em>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function PatientWorkspacePage() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [user, setUser] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT_PROFILE);
  const [patientForm, setPatientForm] = useState(EMPTY_PATIENT_PROFILE);
  const [loading, setLoading] = useState(Boolean(auth));
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [mapViewState, setMapViewState] = useState(DEFAULT_VIEW_STATE);
  const [message, setMessage] = useState(null);
  const [accountMessage, setAccountMessage] = useState(null);
  const [patientMessage, setPatientMessage] = useState(null);
  const [departmentMessage, setDepartmentMessage] = useState(null);
  const [mapMessage, setMapMessage] = useState(null);

  const displayName = user?.name || user?.displayName || auth?.email?.split("@")[0] || "bạn";
  const currentUserId = getUserId(user, auth);

  useEffect(() => {
    if (!auth) return;
    let active = true;

    async function loadWorkspace() {
      setLoading(true);
      const [profileResult, departmentResult, patientResult] = await Promise.allSettled([
        authApi.me(),
        medicalDepartmentsApi.list(),
        patientProfilesApi.list(1, 100),
      ]);

      if (!active) return;

      let resolvedUserId = auth.userId ?? auth.identityId ?? "";

      if (profileResult.status === "fulfilled") {
        const data = profileResult.value.data ?? {};
        resolvedUserId = getUserId(data, auth);
        setUser(data);
        setAccountForm({
          displayName: data.name ?? data.displayName ?? auth.email ?? "",
          address: data.address ?? "",
          gender: String(data.gender ?? "1"),
          dateOfBirth: toDateInput(data.dateOfBirth),
          phoneNumber: data.phoneNumber ?? "",
        });
      } else {
        setMessage({ type: "warning", text: profileResult.reason.message });
      }

      if (departmentResult.status === "fulfilled") {
        setDepartments(departmentResult.value.data ?? []);
      } else {
        setDepartmentMessage({ type: "error", text: departmentResult.reason.message });
      }

      if (patientResult.status === "fulfilled") {
        const items = patientResult.value.data?.items ?? [];
        const matchedProfile = items.find((item) => String(item.userId).toLowerCase() === String(resolvedUserId).toLowerCase()) ?? null;
        setPatientProfile(matchedProfile);
        setPatientForm(toPatientForm(matchedProfile));
      } else {
        setPatientMessage({ type: "warning", text: "Bạn có thể tạo hồ sơ sức khỏe cá nhân bên dưới." });
      }

      setLoading(false);
    }

    loadWorkspace();

    return () => {
      active = false;
    };
  }, [auth]);

  if (!auth) return <EmptyAuth />;

  function updateAccountProfile(key, value) {
    setAccountForm((current) => ({ ...current, [key]: value }));
  }

  function updatePatientProfile(key, value) {
    setPatientForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveAccountProfile(event) {
    event.preventDefault();
    if (!currentUserId) {
      setAccountMessage({ type: "error", text: "Không tìm thấy tài khoản trong phiên đăng nhập." });
      return;
    }

    setSavingAccount(true);
    setAccountMessage(null);
    try {
      const response = await authApi.updateUser(currentUserId, {
        ...accountForm,
        gender: Number(accountForm.gender),
        dateOfBirth: accountForm.dateOfBirth || null,
      });
      setAccountMessage({ type: "success", text: response.message || "Đã cập nhật thông tin cá nhân." });
    } catch (error) {
      setAccountMessage({ type: "error", text: error.message });
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleSavePatientProfile(event) {
    event.preventDefault();
    if (!currentUserId) {
      setPatientMessage({ type: "error", text: "Không tìm thấy tài khoản trong phiên đăng nhập." });
      return;
    }

    const payload = {
      bloodType: patientForm.bloodType || null,
      height: numberOrNull(patientForm.height),
      weight: numberOrNull(patientForm.weight),
      allergyNote: patientForm.allergyNote || null,
      chronicDiseaseNote: patientForm.chronicDiseaseNote || null,
    };

    setSavingPatient(true);
    setPatientMessage(null);
    try {
      const response = patientProfile?.id
        ? await patientProfilesApi.update(patientProfile.id, payload)
        : await patientProfilesApi.create({ ...payload, userId: currentUserId });
      const savedProfile = response.data ?? null;
      setPatientProfile(savedProfile);
      setPatientForm(toPatientForm(savedProfile));
      setPatientMessage({ type: "success", text: response.message || "Đã lưu hồ sơ sức khỏe." });
    } catch (error) {
      setPatientMessage({ type: "error", text: error.message });
    } finally {
      setSavingPatient(false);
    }
  }

  function handleLocate() {
    setMapMessage(null);
    if (!navigator.geolocation) {
      setMapMessage({ type: "error", text: "Trình duyệt chưa hỗ trợ định vị." });
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
        };
        setUserLocation(nextLocation);
        setMapViewState((current) => ({
          ...current,
          ...nextLocation,
          zoom: Math.max(current.zoom, 13),
        }));
        setLocating(false);
      },
      () => {
        setMapMessage({ type: "error", text: "Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền định vị của trình duyệt." });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // Keep local logout reliable when the server session has already expired.
    } finally {
      clearStoredAuth();
      setAuth(null);
      window.location.href = "/";
    }
  }

  return (
    <main className="workspace-root patient-workspace">
      <section className="app-page">
        <div className="container app-main">
          <header className="app-topbar workspace-topbar">
            <div>
              <p className="eyebrow">Không gian cá nhân</p>
              <h1>Chào {displayName}</h1>
              <p className="muted-text">Theo dõi hồ sơ, chuẩn bị câu hỏi khi đi khám và tìm nơi chăm sóc phù hợp.</p>
            </div>
            <button className="btn btn-dark btn-small" type="button" onClick={handleLogout}>Đăng xuất</button>
          </header>

          <ApiMessage message={message} />

          <div className="app-stats">
            <article>
              <span>Trạng thái</span>
              <strong>{loading ? "Đang tải" : Number(user?.status) === 1 ? "Đã xác thực" : "Đang chờ"}</strong>
            </article>
            <article>
              <span>Hồ sơ sức khỏe</span>
              <strong>{patientProfile?.isProfileCompleted ? "Đã đủ" : patientProfile ? "Đang bổ sung" : "Chưa tạo"}</strong>
            </article>
            <article>
              <span>Chuyên khoa</span>
              <strong>{departments.length}</strong>
            </article>
            <article>
              <span>Gợi ý bản đồ</span>
              <strong>{FALLBACK_FACILITIES.length}</strong>
            </article>
          </div>

          <div className="app-work-grid patient-profile-grid">
            <form className="app-card clean-form" onSubmit={handleSaveAccountProfile}>
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Tài khoản</p>
                  <h2>Thông tin cá nhân</h2>
                </div>
                <span className="soft-badge">Cơ bản</span>
              </div>
              <ApiMessage message={accountMessage} />
              <Field label="Tên hiển thị">
                <input value={accountForm.displayName} onChange={(event) => updateAccountProfile("displayName", event.target.value)} />
              </Field>
              <Field label="Địa chỉ">
                <input value={accountForm.address} onChange={(event) => updateAccountProfile("address", event.target.value)} />
              </Field>
              <div className="form-two-cols">
                <Field label="Giới tính">
                  <select value={accountForm.gender} onChange={(event) => updateAccountProfile("gender", event.target.value)}>
                    <option value="1">Nam</option>
                    <option value="2">Nữ</option>
                  </select>
                </Field>
                <Field label="Ngày sinh">
                  <input type="date" value={accountForm.dateOfBirth} onChange={(event) => updateAccountProfile("dateOfBirth", event.target.value)} />
                </Field>
              </div>
              <Field label="Số điện thoại">
                <input value={accountForm.phoneNumber} onChange={(event) => updateAccountProfile("phoneNumber", event.target.value)} />
              </Field>
              <button className="btn btn-primary" type="submit" disabled={savingAccount}>
                {savingAccount ? "Đang lưu..." : "Lưu thông tin"}
              </button>
            </form>

            <form className="app-card clean-form" onSubmit={handleSavePatientProfile}>
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Sức khỏe</p>
                  <h2>Hồ sơ bệnh nhân</h2>
                </div>
                <span className="soft-badge">{patientProfile?.id ? "Cập nhật" : "Tạo mới"}</span>
              </div>
              <ApiMessage message={patientMessage} />
              <div className="form-three-cols">
                <Field label="Nhóm máu">
                  <input value={patientForm.bloodType} onChange={(event) => updatePatientProfile("bloodType", event.target.value)} placeholder="Ví dụ: O+" />
                </Field>
                <Field label="Chiều cao (cm)">
                  <input type="number" min="0" step="0.1" value={patientForm.height} onChange={(event) => updatePatientProfile("height", event.target.value)} />
                </Field>
                <Field label="Cân nặng (kg)">
                  <input type="number" min="0" step="0.1" value={patientForm.weight} onChange={(event) => updatePatientProfile("weight", event.target.value)} />
                </Field>
              </div>
              <Field label="Dị ứng">
                <textarea rows={4} value={patientForm.allergyNote} onChange={(event) => updatePatientProfile("allergyNote", event.target.value)} placeholder="Thuốc, thức ăn hoặc yếu tố cần tránh..." />
              </Field>
              <Field label="Bệnh nền">
                <textarea rows={4} value={patientForm.chronicDiseaseNote} onChange={(event) => updatePatientProfile("chronicDiseaseNote", event.target.value)} placeholder="Ví dụ: hen suyễn, tăng huyết áp, tiểu đường..." />
              </Field>
              <button className="btn btn-primary" type="submit" disabled={savingPatient}>
                {savingPatient ? "Đang lưu..." : patientProfile?.id ? "Cập nhật hồ sơ" : "Tạo hồ sơ"}
              </button>
            </form>
          </div>

          <div className="patient-tools-grid">
            <div>
              <PatientMap
                userLocation={userLocation}
                viewState={mapViewState}
                setViewState={setMapViewState}
                onLocate={handleLocate}
                locating={locating}
              />
              <ApiMessage message={mapMessage} />
            </div>
            <div className="patient-side-stack">
              <div className="patient-assistant-stack">
                <SymptomChatBox />
                <a className="btn btn-primary patient-assistant-cta" href="/medical-assistant">
                  Tư vấn triệu chứng nâng cao
                </a>
              </div>
              <section className="app-card">
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Tra cứu</p>
                    <h2>Chuyên khoa phù hợp</h2>
                  </div>
                  <span className="soft-badge">Danh mục</span>
                </div>
                <ApiMessage message={departmentMessage} />
                <div className="mini-list">
                  {departments.length === 0 && <p className="muted-text">Chưa có chuyên khoa để hiển thị.</p>}
                  {departments.slice(0, 5).map((department) => (
                    <article key={department.id}>
                      <strong>{department.departmentName || "Chưa đặt tên"}</strong>
                      <span>{department.description || "Chưa có mô tả."}</span>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
