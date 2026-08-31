import { useEffect, useState } from "react";
import { medicalFacilitiesApi } from "../services/facilityService";
import { findNearbySpecialtyFacilities, rankNearestFacilities } from "../utils/nearbyFacilities";
const EMPTY_ITEMS = [];

export default function useNearbyFacilities(location, radiusKm, departmentId, attempt) {
  const latitude = location?.lat;
  const longitude = location?.lng;
  const key = location ? JSON.stringify([latitude, longitude, radiusKm, departmentId, attempt]) : "";
  const [result, setResult] = useState({ key: "", items: [], error: "" });
  useEffect(() => {
    if (!key) return;
    let active = true;
    const controller = new AbortController();
    const timeoutId = radiusKm === "auto" ? setTimeout(() => controller.abort(), 20_000) : null;
    const request = radiusKm === "auto"
      ? findNearbySpecialtyFacilities(medicalFacilitiesApi.nearby, { latitude, longitude, departmentId }, controller.signal)
      : radiusKm === "nearest"
      ? medicalFacilitiesApi.active({ departmentId: departmentId === "all" ? undefined : departmentId }, { signal: controller.signal, cache: "no-store" })
      : medicalFacilitiesApi.nearby({ latitude, longitude, radiusKm, departmentId }, controller.signal);
    request
      .then((response) => {
        if (radiusKm === "auto") {
          if (active) setResult({ key, items: response.items, radiusKm: response.radiusKm, error: "" });
          return;
        }
        if (response?.success === false || !Array.isArray(response?.data)) throw new Error("Invalid nearby response");
        const items = radiusKm === "nearest" ? rankNearestFacilities(response.data, latitude, longitude) : response.data;
        if (active) setResult({ key, items, radiusKm, error: "" });
      })
      .catch(() => {
        if (active) setResult({ key, items: [], error: "Không thể tải cơ sở gần bạn. Vui lòng thử lại." });
      })
      .finally(() => clearTimeout(timeoutId));
    return () => { active = false; clearTimeout(timeoutId); controller.abort(); };
  }, [key, latitude, longitude, radiusKm, departmentId]);
  // Never label results for an old radius/department as the current search.
  const current = Boolean(key) && result.key === key;
  return { items: current ? result.items : EMPTY_ITEMS, radiusKm: current ? result.radiusKm : null, error: current ? result.error : "", loading: Boolean(key) && !current };
}
