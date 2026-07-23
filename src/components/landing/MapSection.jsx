import { ArrowRight, Building2, LoaderCircle, MapPin, MapPinned } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { medicalFacilitiesApi } from "../../services/api";

const LandingFacilityMap = lazy(() => import("./LandingFacilityMap"));
const MAX_PREVIEW_FACILITIES = 4;

function getArrayData(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
}

function getCoordinate(value, min, max) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max
    ? coordinate
    : null;
}

function normalizeFacility(facility) {
  const name = String(facility?.facilityName ?? facility?.name ?? "").trim();
  return {
    id: facility?.facilityId ?? facility?.id ?? name,
    name,
    address: String(facility?.address ?? "").trim(),
    latitude: getCoordinate(facility?.latitude, -90, 90),
    longitude: getCoordinate(facility?.longitude, -180, 180),
  };
}

export function MapSection() {
  const [facilities, setFacilities] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    medicalFacilitiesApi.active()
      .then((response) => {
        if (!active) return;
        setFacilities(getArrayData(response).map(normalizeFacility).filter((facility) => facility.name));
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setFacilities([]);
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  const previewFacilities = useMemo(
    () => facilities
      .filter((facility) => facility.latitude !== null && facility.longitude !== null)
      .slice(0, MAX_PREVIEW_FACILITIES),
    [facilities],
  );

  return (
    <section id="map" className="care-section care-facility-section" aria-labelledby="facility-title">
      <div className="container care-facility-shell">
        <div className="care-facility-copy">
          <p className="care-eyebrow">Bản đồ cơ sở y tế</p>
          <h2 id="facility-title">Xem nơi bạn có thể tiếp tục thăm khám.</h2>
          <p>
            Bản đồ trực tiếp hiển thị các cơ sở đang hoạt động có thông tin tọa độ. Bạn có thể phóng to, thu nhỏ
            hoặc chọn một điểm để xem tên và địa chỉ.
          </p>
          <a className="care-button care-button-primary" href="/map">
            <MapPinned size={19} aria-hidden="true" />
            Mở bản đồ đầy đủ
          </a>
        </div>

        <div className="care-map-preview" aria-live="polite">
          <div className="care-map-preview-head">
            <div>
              <span><MapPin size={18} aria-hidden="true" /></span>
              <div>
                <small>Bản đồ trực tiếp</small>
                <strong>Cơ sở đang có trên MediMate</strong>
              </div>
            </div>
            {status === "ready" && previewFacilities.length > 0 && (
              <span className="care-map-count">{previewFacilities.length} cơ sở</span>
            )}
          </div>

          {status === "loading" && (
            <div className="care-map-state" role="status">
              <LoaderCircle className="care-spin" size={24} aria-hidden="true" />
              <span>Đang tải dữ liệu cơ sở…</span>
            </div>
          )}
          {status === "error" && (
            <div className="care-map-state" role="status">
              <MapPinned size={24} aria-hidden="true" />
              <span>Chưa thể tải dữ liệu cơ sở. Bạn vẫn có thể mở trang bản đồ để thử lại.</span>
            </div>
          )}
          {status === "ready" && previewFacilities.length === 0 && (
            <div className="care-map-state" role="status">
              <MapPinned size={24} aria-hidden="true" />
              <span>Chưa có cơ sở đủ dữ liệu tọa độ để hiển thị trên bản đồ.</span>
            </div>
          )}

          {status === "ready" && previewFacilities.length > 0 && (
            <>
              <a className="care-map-skip" href="#landing-map-details">Bỏ qua bản đồ, xem danh sách cơ sở</a>
              <Suspense fallback={<div className="care-map-state" role="status">Đang mở bản đồ trực tiếp…</div>}>
                <LandingFacilityMap facilities={previewFacilities} />
              </Suspense>
            </>
          )}

          <div id="landing-map-details" className="care-map-details" tabIndex="-1">
            {previewFacilities.length > 0 && (
              <ul className="care-map-facilities" aria-label="Cơ sở xuất hiện trên bản đồ">
                {previewFacilities.map((facility) => (
                  <li key={facility.id || facility.name}>
                    <MapPin size={17} aria-hidden="true" />
                    <div>
                      <strong>{facility.name}</strong>
                      {facility.address && <small>{facility.address}</small>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="care-map-preview-foot">
            <Building2 size={17} aria-hidden="true" />
            <span>Danh sách được cập nhật theo các cơ sở đang hoạt động.</span>
            <a href="/map">
              Xem tất cả cơ sở
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
