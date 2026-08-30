import { useEffect, useState } from "react";
import { medicalFacilitiesApi } from "../services/facilityService";
import { rankNearestFacilities } from "../utils/nearbyFacilities";
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
    const request = radiusKm === "nearest"
      ? medicalFacilitiesApi.active({ departmentId: departmentId === "all" ? undefined : departmentId }, { signal: controller.signal, cache: "no-store" })
      : medicalFacilitiesApi.nearby({ latitude, longitude, radiusKm, departmentId }, controller.signal);
    request
      .then((response) => {
        if (!Array.isArray(response?.data)) throw new Error("Invalid nearby response");
        const items = radiusKm === "nearest" ? rankNearestFacilities(response.data, latitude, longitude) : response.data;
        if (active) setResult({ key, items, error: "" });
      })
      .catch(() => {
        if (active) setResult({ key, items: [], error: "Không thể tải cơ sở gần bạn. Vui lòng thử lại." });
      });
    return () => { active = false; controller.abort(); };
  }, [key, latitude, longitude, radiusKm, departmentId]);
  // Never label results for an old radius/department as the current search.
  const current = Boolean(key) && result.key === key;
  return { items: current ? result.items : EMPTY_ITEMS, error: current ? result.error : "", loading: Boolean(key) && !current };
}
