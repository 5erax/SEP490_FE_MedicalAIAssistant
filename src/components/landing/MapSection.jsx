import {
  ArrowRight,
  Building2,
  LoaderCircle,
  MapPin,
  MapPinned,
} from "lucide-react";
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { medicalFacilitiesApi } from "../../services/api";

const LandingFacilityMap = lazy(() =>
  import("./LandingFacilityMap")
);

// Chỉ giới hạn danh sách text bên dưới để landing page không quá dài.
// Bản đồ vẫn nhận TOÀN BỘ cơ sở có tọa độ hợp lệ.
const MAX_LIST_PREVIEW_FACILITIES = 3;

function getArrayData(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }
  return [];
}

function getCoordinate(value, min, max) {
  const coordinate = Number(value);

  return (
    Number.isFinite(coordinate) &&
    coordinate >= min &&
    coordinate <= max
  )
    ? coordinate
    : null;
}

function normalizeFacility(facility) {
  const name = String(
    facility?.facilityName ?? facility?.name ?? "",
  ).trim();

  return {
    id:
      facility?.facilityId ??
      facility?.id ??
      name,
    name,
    address: String(
      facility?.address ?? "",
    ).trim(),
    latitude: getCoordinate(
      facility?.latitude,
      -90,
      90,
    ),
    longitude: getCoordinate(
      facility?.longitude,
      -180,
      180,
    ),
  };
}

function getMapCountLabel(
  totalFacilities,
  mapFacilities,
) {
  if (totalFacilities === mapFacilities) {
    return `${mapFacilities} cơ sở`;
  }

  return `${mapFacilities}/${totalFacilities} có tọa độ`;
}

export function MapSection() {
  const [facilities, setFacilities] =
    useState([]);
  const [status, setStatus] =
    useState("loading");

  useEffect(() => {
    let active = true;

    medicalFacilitiesApi
      .active()
      .then((response) => {
        if (!active) return;

        const normalizedFacilities =
          getArrayData(response)
            .map(normalizeFacility)
            .filter(
              (facility) => facility.name,
            );

        setFacilities(normalizedFacilities);
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

  /*
   * Quan trọng:
   * Không slice() dữ liệu trước khi truyền vào map.
   * Landing map phải hiển thị cùng tập cơ sở active
   * có tọa độ như trang /map.
   */
  const mapFacilities = useMemo(
    () =>
      facilities.filter(
        (facility) =>
          facility.latitude !== null &&
          facility.longitude !== null,
      ),
    [facilities],
  );

  /*
   * Danh sách text chỉ là preview ngắn.
   * Nó không quyết định số marker trên bản đồ.
   */
  const listPreviewFacilities = useMemo(
    () =>
      mapFacilities.slice(
        0,
        MAX_LIST_PREVIEW_FACILITIES,
      ),
    [mapFacilities],
  );

  const mapCountLabel = useMemo(
    () =>
      getMapCountLabel(
        facilities.length,
        mapFacilities.length,
      ),
    [facilities.length, mapFacilities.length],
  );

  return (
    <section
      id="map"
      className="care-section care-facility-section"
      aria-labelledby="facility-title"
    >
      <div className="container">
        <div className="care-section-heading care-section-header">
          <div>
            <p className="care-eyebrow">
              Bản đồ cơ sở y tế
            </p>
            <h2 id="facility-title">
              Tìm cơ sở và chuẩn bị cho buổi khám.
            </h2>
          </div>

          <div className="care-section-summary">
            <p>
              Bản đồ trực tiếp hiển thị các cơ sở
              đang hoạt động có thông tin tọa độ.
              Chọn một cơ sở để xem thông tin,
              các khoa đã cập nhật và dùng trợ lý
              trước khám khi tính năng khả dụng.
            </p>

            <a
              className="care-button care-button-primary"
              href="/map"
            >
              <MapPinned
                size={19}
                aria-hidden="true"
              />
              Khám phá bản đồ cơ sở y tế
            </a>
          </div>
        </div>

        <div
          className="care-map-preview"
          aria-live="polite"
        >
          <div className="care-map-preview-head">
            <div>
              <span>
                <MapPin
                  size={18}
                  aria-hidden="true"
                />
              </span>

              <div>
                <small>Bản đồ trực tiếp</small>
                <strong>
                  Cơ sở đang có trên MediMate
                </strong>
              </div>
            </div>

            {status === "ready" &&
              facilities.length > 0 && (
                <span className="care-map-count">
                  {mapCountLabel}
                </span>
              )}
          </div>

          {status === "loading" && (
            <div
              className="care-map-state"
              role="status"
            >
              <LoaderCircle
                className="care-spin"
                size={24}
                aria-hidden="true"
              />
              <span>
                Đang tải dữ liệu cơ sở…
              </span>
            </div>
          )}

          {status === "error" && (
            <div
              className="care-map-state"
              role="status"
            >
              <MapPinned
                size={24}
                aria-hidden="true"
              />
              <span>
                Chưa thể tải dữ liệu cơ sở.
                Bạn vẫn có thể mở trang bản đồ
                để thử lại.
              </span>
            </div>
          )}

          {status === "ready" &&
            mapFacilities.length === 0 && (
              <div
                className="care-map-state"
                role="status"
              >
                <MapPinned
                  size={24}
                  aria-hidden="true"
                />
                <span>
                  Chưa có cơ sở đủ dữ liệu tọa độ
                  để hiển thị trên bản đồ.
                </span>
              </div>
            )}

          {status === "ready" &&
            mapFacilities.length > 0 && (
              <>
                <a
                  className="care-map-skip"
                  href="#landing-map-details"
                >
                  Bỏ qua bản đồ, xem danh sách cơ sở
                </a>

                <Suspense
                  fallback={
                    <div
                      className="care-map-state"
                      role="status"
                    >
                      Đang mở bản đồ trực tiếp…
                    </div>
                  }
                >
                  <LandingFacilityMap
                    facilities={mapFacilities}
                  />
                </Suspense>
              </>
            )}

          <div
            id="landing-map-details"
            className="care-map-details"
            tabIndex="-1"
          >
            {listPreviewFacilities.length >
              0 && (
              <ul
                className="care-map-facilities"
                aria-label="Một số cơ sở xuất hiện trên bản đồ"
              >
                {listPreviewFacilities.map(
                  (facility) => (
                    <li
                      key={
                        facility.id ||
                        facility.name
                      }
                    >
                      <MapPin
                        size={17}
                        aria-hidden="true"
                      />
                      <div>
                        <strong>
                          {facility.name}
                        </strong>
                        {facility.address && (
                          <small>
                            {facility.address}
                          </small>
                        )}
                      </div>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>

          <div className="care-map-preview-foot">
            <Building2
              size={17}
              aria-hidden="true"
            />
            <span>
              {status === "ready"
                ? `${facilities.length} cơ sở đang hoạt động được đồng bộ từ hệ thống.`
                : "Danh sách được cập nhật theo các cơ sở đang hoạt động."}
            </span>

            <a href="/map">
              Xem tất cả cơ sở
              <ArrowRight
                size={16}
                aria-hidden="true"
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}