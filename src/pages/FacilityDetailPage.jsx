import { useEffect, useMemo, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  Clock3,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Star,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Button } from "../components/ui";
import { navigate } from "../router/navigation";
import { feedbackReviewsApi, medicalFacilitiesApi } from "../services/api";
import { doctorManagementApi } from "../services/doctors";

const FREE_MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

function getArrayData(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
}

function getPayload(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function coordinateOrNull(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : null;
}

function normalizeFacility(facility = {}) {
  const latitude = coordinateOrNull(facility.latitude, -90, 90);
  const longitude = coordinateOrNull(facility.longitude, -180, 180);
  const departments = Array.isArray(facility.departments)
    ? facility.departments.map((item) => item.departmentName ?? item.name ?? item).filter(Boolean)
    : [];
  const phone = String(facility.phone ?? facility.phoneNumber ?? "").trim();

  return {
    ...facility,
    facilityId: facility.facilityId ?? facility.id,
    facilityName: facility.facilityName || facility.name || "Cơ sở y tế",
    address: facility.address || "Chưa cập nhật địa chỉ",
    description: facility.description || facility.summary || "",
    facilityType: facility.facilityType || "Cơ sở y tế",
    imageUrl: facility.imageUrl || facility.thumbnailUrl || facility.photoUrl || "",
    latitude,
    longitude,
    hasValidCoordinates: latitude !== null && longitude !== null,
    phone,
    phoneLabel: phone || "Chưa cập nhật số điện thoại",
    website: String(facility.website ?? "").trim(),
    openingHours: facility.openingHours || "Đang cập nhật",
    departments: departments.length ? departments : [],
  };
}

function getDoctorInitials(name) {
  return String(name || "BS")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "BS";
}

function formatReviewDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

export default function FacilityDetailPage({ facilityId }) {
  const [facility, setFacility] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!facilityId) return undefined;

    let active = true;

    Promise.allSettled([
      medicalFacilitiesApi.get(facilityId),
      doctorManagementApi.list({ facilityId, pageNumber: 1, pageSize: 24, isActive: true }),
      feedbackReviewsApi.byFacility(facilityId, 1, 12),
    ])
      .then(([facilityResult, doctorResult, reviewResult]) => {
        if (!active) return;
        if (facilityResult.status !== "fulfilled") throw facilityResult.reason;

        setFacility(normalizeFacility(getPayload(facilityResult.value)));
        setDoctors(doctorResult.status === "fulfilled" ? getArrayData(doctorResult.value) : []);
        setReviews(reviewResult.status === "fulfilled" ? getArrayData(reviewResult.value) : []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Không tải được thông tin cơ sở y tế.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [facilityId]);

  const viewState = useMemo(() => ({
    latitude: facility?.latitude ?? 10.8231,
    longitude: facility?.longitude ?? 106.6297,
    zoom: facility?.hasValidCoordinates ? 15 : 11,
  }), [facility]);

  function callFacility() {
    if (facility?.phone) window.location.href = `tel:${facility.phone}`;
  }

  function openDirections() {
    if (!facility?.hasValidCoordinates) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`,
      "_blank",
      "noreferrer",
    );
  }

  if (!facilityId) {
    return (
      <main className="facility-detail-page">
        <style>{styles}</style>
        <section className="facility-state error" role="alert">
          <Building2 size={34} />
          <h1>Không thể mở chi tiết cơ sở y tế</h1>
          <p>Không tìm thấy mã cơ sở y tế.</p>
          <Button type="button" onClick={() => navigate("/map")}>
            <ChevronLeft size={18} /> Quay lại bản đồ
          </Button>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="facility-detail-page">
        <style>{styles}</style>
        <section className="facility-state" role="status">
          <span />
          <h1>Đang tải chi tiết cơ sở y tế...</h1>
          <p>Hệ thống đang đồng bộ thông tin bệnh viện, bác sĩ và đánh giá.</p>
        </section>
      </main>
    );
  }

  if (error || !facility) {
    return (
      <main className="facility-detail-page">
        <style>{styles}</style>
        <section className="facility-state error" role="alert">
          <Building2 size={34} />
          <h1>Không thể mở chi tiết cơ sở y tế</h1>
          <p>{error || "Dữ liệu cơ sở y tế không khả dụng."}</p>
          <Button type="button" onClick={() => navigate("/map")}>
            <ChevronLeft size={18} /> Quay lại bản đồ
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="facility-detail-page">
      <style>{styles}</style>

      <button className="facility-back" type="button" onClick={() => navigate("/map")}>
        <ChevronLeft size={18} /> Bản đồ
      </button>

      <section className="facility-hero" aria-labelledby="facility-detail-title">
        <div className="facility-banner">
          {facility.imageUrl ? (
            <img src={facility.imageUrl} alt="" />
          ) : (
            <div className="facility-banner-empty" aria-hidden="true">
              <Building2 size={54} />
            </div>
          )}
        </div>

        <div className="facility-hero-card">
          <span className="facility-type"><Building2 size={16} /> {facility.facilityType}</span>
          <h1 id="facility-detail-title">{facility.facilityName}</h1>
          <p><MapPin size={17} /> {facility.address}</p>
          <div className="facility-departments" aria-label="Chuyên khoa">
            {facility.departments.length
              ? facility.departments.map((department) => <span key={department}>{department}</span>)
              : <span>Chưa cập nhật chuyên khoa</span>}
          </div>
          <div className="facility-hero-actions">
            <Button type="button" disabled={!facility.phone} onClick={callFacility}>
              <Phone size={18} /> Gọi ngay
            </Button>
            <Button type="button" tone="secondary" disabled={!facility.hasValidCoordinates} onClick={openDirections}>
              <Navigation size={18} /> Chỉ đường
            </Button>
          </div>
        </div>
      </section>

      <section className="facility-content-grid">
        <article className="facility-panel facility-info-panel">
          <div className="facility-section-heading">
            <span><ClipboardIcon /></span>
            <div>
              <p>Thông tin bệnh viện</p>
              <h2>Tổng quan cơ sở</h2>
            </div>
          </div>
          <p className="facility-description">
            {facility.description || "Backend chưa cung cấp mô tả chi tiết cho cơ sở y tế này."}
          </p>
          <dl className="facility-facts">
            <div>
              <dt><Phone size={16} /> Liên hệ</dt>
              <dd>{facility.phoneLabel}</dd>
            </div>
            <div>
              <dt><Clock3 size={16} /> Giờ mở cửa</dt>
              <dd>{facility.openingHours}</dd>
            </div>
            <div>
              <dt><ExternalLink size={16} /> Website</dt>
              <dd>
                {facility.website
                  ? <a href={facility.website} target="_blank" rel="noreferrer">{facility.website}</a>
                  : "Chưa cập nhật website"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="facility-panel">
          <div className="facility-section-heading">
            <span><Stethoscope size={18} /></span>
            <div>
              <p>Đội ngũ bác sĩ</p>
              <h2>Bác sĩ thuộc bệnh viện</h2>
            </div>
          </div>
          {doctors.length ? (
            <div className="doctor-detail-grid">
              {doctors.map((doctor) => (
                <article className="doctor-detail-card" key={doctor.id}>
                  <span>{getDoctorInitials(doctor.fullName)}</span>
                  <div>
                    <strong>{doctor.fullName || "Bác sĩ chưa cập nhật tên"}</strong>
                    <small>{doctor.academicTitle || doctor.specialty || "Chưa cập nhật chuyên môn"}</small>
                    <p>{doctor.departmentName || "Chưa cập nhật khoa"}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="facility-empty">
              <UserRound size={24} />
              <p>Chưa có bác sĩ được liên kết với cơ sở này từ backend.</p>
            </div>
          )}
        </article>

        <article className="facility-panel">
          <div className="facility-section-heading">
            <span><Star size={18} /></span>
            <div>
              <p>Đánh giá và phản hồi</p>
              <h2>Trải nghiệm người dùng</h2>
            </div>
          </div>
          {reviews.length ? (
            <div className="facility-review-list">
              {reviews.map((review) => (
                <article className="facility-review-card" key={review.id ?? review.feedbackReviewId ?? review.createdAt}>
                  <div>
                    <strong>{review.userName || review.patientName || "Người dùng MediMate"}</strong>
                    <span>{review.rating ? `${review.rating}/5` : "Đã gửi phản hồi"}</span>
                  </div>
                  <p>{review.comment || review.content || "Không có nội dung đánh giá."}</p>
                  {formatReviewDate(review.createdAt) && <small>{formatReviewDate(review.createdAt)}</small>}
                </article>
              ))}
            </div>
          ) : (
            <div className="facility-empty">
              <Star size={24} />
              <p>Chưa có đánh giá công khai cho bệnh viện này.</p>
            </div>
          )}
        </article>

        <article className="facility-panel facility-map-panel">
          <div className="facility-section-heading">
            <span><MapPin size={18} /></span>
            <div>
              <p>Bản đồ vị trí</p>
              <h2>Vị trí bệnh viện</h2>
            </div>
          </div>
          <div className="facility-map-box">
            {facility.hasValidCoordinates ? (
              <Map
                mapStyle={FREE_MAP_STYLE}
                initialViewState={viewState}
                onLoad={() => setMapReady(true)}
                style={{ width: "100%", height: "100%" }}
              >
                <NavigationControl position="top-right" />
                <Marker longitude={facility.longitude} latitude={facility.latitude}>
                  <span className="facility-detail-marker" aria-label={facility.facilityName}>
                    <span>+</span>
                  </span>
                </Marker>
              </Map>
            ) : (
              <div className="facility-empty map-empty">
                <MapPin size={28} />
                <p>Backend chưa cung cấp tọa độ chính xác cho cơ sở này.</p>
              </div>
            )}
            {facility.hasValidCoordinates && !mapReady && (
              <div className="facility-map-loading">Đang tải bản đồ...</div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function ClipboardIcon() {
  return <CalendarDays size={18} />;
}

const styles = `
.facility-detail-page {
  min-height: calc(100svh - 112px);
  display: grid;
  align-content: start;
  gap: 16px;
  padding: clamp(16px, 2.6vw, 28px);
  background:
    radial-gradient(circle at 16% 0%, rgba(196, 233, 149, .25), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,.96), rgba(247,250,243,.98));
  color: #111412;
}

.facility-back {
  width: fit-content;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(16, 20, 17, .16);
  border-radius: 999px;
  background: rgba(255,255,255,.82);
  color: #111412;
  padding: 0 14px;
  font-weight: 850;
}

.facility-hero {
  position: relative;
  overflow: hidden;
  min-height: 360px;
  display: grid;
  align-items: end;
  border: 1px solid rgba(16, 20, 17, .14);
  border-radius: 24px;
  background: #f4faed;
  box-shadow: 0 20px 58px rgba(16, 20, 17, .08);
}

.facility-banner {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(7, 93, 102, .14), rgba(196, 233, 149, .28)),
    #edf6e8;
}

.facility-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.facility-banner::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(17,20,18,.78), rgba(17,20,18,.34) 48%, rgba(17,20,18,.08));
}

.facility-banner-empty {
  height: 100%;
  display: grid;
  place-items: center;
  color: rgba(17, 20, 18, .34);
}

.facility-hero-card {
  position: relative;
  z-index: 1;
  width: min(820px, calc(100% - 32px));
  display: grid;
  gap: 13px;
  margin: 16px;
  border: 1px solid rgba(255, 255, 255, .48);
  border-radius: 22px;
  background: rgba(255, 255, 255, .9);
  box-shadow: 0 20px 60px rgba(16, 20, 17, .18);
  padding: clamp(20px, 4vw, 32px);
  backdrop-filter: blur(16px);
}

.facility-type,
.facility-hero-card p,
.facility-section-heading,
.facility-facts dt,
.facility-review-card > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.facility-type {
  width: fit-content;
  border-radius: 999px;
  background: #e4f4f2;
  color: #075d66;
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 900;
}

.facility-hero-card h1 {
  margin: 0;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 1.02;
  letter-spacing: 0;
}

.facility-hero-card p {
  margin: 0;
  color: rgba(17, 20, 18, .7);
  font-weight: 760;
}

.facility-departments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.facility-departments span {
  border: 1px solid rgba(49, 93, 24, .2);
  border-radius: 999px;
  background: #f4faed;
  color: #315d18;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 850;
}

.facility-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 6px;
}

.facility-content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, .82fr);
  gap: 16px;
}

.facility-panel {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 16px;
  border: 1px solid rgba(16, 20, 17, .14);
  border-radius: 22px;
  background: rgba(255, 255, 255, .86);
  box-shadow: 0 18px 48px rgba(16, 20, 17, .07);
  padding: clamp(18px, 2.6vw, 24px);
}

.facility-info-panel,
.facility-map-panel {
  grid-column: 1 / -1;
}

.facility-section-heading > span {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 14px;
  background: #e4f4f2;
  color: #075d66;
}

.facility-section-heading p,
.facility-section-heading h2 {
  margin: 0;
}

.facility-section-heading p {
  color: #315d18;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.facility-section-heading h2 {
  margin-top: 3px;
  font-size: 22px;
  line-height: 1.2;
}

.facility-description {
  max-width: 860px;
  margin: 0;
  color: rgba(17, 20, 18, .68);
  line-height: 1.65;
}

.facility-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.facility-facts div {
  min-width: 0;
  border: 1px solid rgba(16, 20, 17, .12);
  border-radius: 16px;
  background: #fbfcf7;
  padding: 14px;
}

.facility-facts dt {
  color: rgba(17, 20, 18, .55);
  font-size: 12px;
  font-weight: 900;
}

.facility-facts dd {
  margin: 7px 0 0;
  overflow-wrap: anywhere;
  color: #111412;
  font-weight: 820;
}

.facility-facts a {
  color: #075d66;
}

.doctor-detail-grid,
.facility-review-list {
  display: grid;
  gap: 12px;
}

.doctor-detail-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  border: 1px solid rgba(16, 20, 17, .12);
  border-radius: 16px;
  background: #fbfcf7;
  padding: 14px;
}

.doctor-detail-card > span {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #111412;
  color: #c4e995;
  font-weight: 950;
}

.doctor-detail-card strong,
.doctor-detail-card small,
.doctor-detail-card p {
  display: block;
  margin: 0;
}

.doctor-detail-card small {
  margin-top: 4px;
  color: rgba(17, 20, 18, .56);
  font-weight: 780;
}

.doctor-detail-card p {
  margin-top: 6px;
  color: #315d18;
  font-size: 13px;
  font-weight: 850;
}

.facility-empty {
  min-height: 140px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 9px;
  border: 1px dashed rgba(16, 20, 17, .18);
  border-radius: 16px;
  background: #fbfcf7;
  color: rgba(17, 20, 18, .62);
  text-align: center;
  padding: 18px;
}

.facility-empty p {
  max-width: 420px;
  margin: 0;
  line-height: 1.55;
}

.facility-review-card {
  display: grid;
  gap: 9px;
  border: 1px solid rgba(16, 20, 17, .12);
  border-radius: 16px;
  background: #fbfcf7;
  padding: 14px;
}

.facility-review-card > div {
  justify-content: space-between;
  gap: 10px;
}

.facility-review-card span {
  border-radius: 999px;
  background: #e4f4f2;
  color: #075d66;
  padding: 5px 8px;
  font-size: 12px;
  font-weight: 900;
}

.facility-review-card p {
  margin: 0;
  color: rgba(17, 20, 18, .68);
  line-height: 1.55;
}

.facility-review-card small {
  color: rgba(17, 20, 18, .52);
  font-weight: 760;
}

.facility-map-box {
  position: relative;
  min-height: 360px;
  overflow: hidden;
  border: 1px solid rgba(16, 20, 17, .12);
  border-radius: 18px;
  background: #edf4e7;
}

.facility-detail-marker {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 3px solid #111412;
  border-radius: 999px 999px 999px 5px;
  background: #d8f3bd;
  color: #111412;
  font-size: 24px;
  font-weight: 950;
  line-height: 1;
  box-shadow: 0 4px 12px rgba(17,20,18,.28);
  transform: rotate(-45deg);
}

.facility-detail-marker span {
  transform: rotate(45deg) translateY(-1px);
}

.facility-map-loading {
  position: absolute;
  left: 16px;
  bottom: 16px;
  border: 1px solid rgba(16, 20, 17, .12);
  border-radius: 999px;
  background: rgba(255,255,255,.9);
  padding: 8px 12px;
  color: rgba(17, 20, 18, .68);
  font-size: 12px;
  font-weight: 850;
}

.facility-state {
  min-height: 420px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  border: 1px solid rgba(16, 20, 17, .14);
  border-radius: 24px;
  background: rgba(255,255,255,.86);
  text-align: center;
  padding: 28px;
}

.facility-state span {
  width: 44px;
  height: 44px;
  border: 4px solid rgba(17,20,18,.16);
  border-top-color: #075d66;
  border-radius: 999px;
  animation: facilitySpin 800ms linear infinite;
}

.facility-state h1,
.facility-state p {
  margin: 0;
}

.facility-state p {
  color: rgba(17,20,18,.62);
}

@keyframes facilitySpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1020px) {
  .facility-content-grid,
  .facility-facts {
    grid-template-columns: 1fr;
  }

  .facility-hero {
    min-height: 420px;
  }
}

@media (max-width: 640px) {
  .facility-detail-page {
    padding: 14px;
  }

  .facility-hero-card {
    width: auto;
  }

  .facility-hero-actions,
  .facility-hero-actions .ui-button {
    width: 100%;
  }
}
`;
