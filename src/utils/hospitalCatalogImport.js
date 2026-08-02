function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findCatalogFacilityMatch(catalogEntry, facilities) {
  const knownNames = new Set([
    catalogEntry.facilityName,
    ...(catalogEntry.aliases ?? []),
  ].map(normalizeText));

  return facilities.find((facility) => knownNames.has(normalizeText(facility.facilityName))) ?? null;
}

function getDepartmentChapterCode(department) {
  return normalizeText(department.chapterCode ?? department.icdChapterCode).replace(/\s/g, "");
}

export function resolveCatalogDepartmentIds(catalogEntry, departments) {
  const requestedCodes = new Set(
    (catalogEntry.departmentChapterCodes ?? []).map((code) => normalizeText(code).replace(/\s/g, "")),
  );
  const matchedIds = departments
    .filter((department) => requestedCodes.has(getDepartmentChapterCode(department)))
    .map((department) => department.id)
    .filter(Boolean);

  if (matchedIds.length > 0) return matchedIds;

  const generalDepartment = departments.find((department) => {
    const name = normalizeText(department.departmentName ?? department.name);
    return name.includes("tong quat") || name.includes("general");
  });

  return generalDepartment?.id ? [generalDepartment.id] : [];
}

export function buildCatalogFacilityPayload(catalogEntry, departmentIds, existingFacility = null) {
  const currentImageUrl = existingFacility?.imageUrl
    ?? existingFacility?.thumbnailUrl
    ?? existingFacility?.photoUrl
    ?? null;

  return {
    facilityName: catalogEntry.facilityName,
    address: catalogEntry.address,
    latitude: catalogEntry.latitude,
    longitude: catalogEntry.longitude,
    phone: catalogEntry.phone || null,
    website: catalogEntry.website || null,
    imageUrl: catalogEntry.imageUrl || currentImageUrl,
    openingHours: catalogEntry.openingHours || null,
    facilityType: "hospital",
    isActive: true,
    departmentIds: Array.from(new Set(departmentIds.filter(Boolean))),
  };
}

export function getCatalogSourceHosts(catalog) {
  return Array.from(new Set(catalog.map((entry) => {
    try {
      return new URL(entry.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }).filter(Boolean)));
}
