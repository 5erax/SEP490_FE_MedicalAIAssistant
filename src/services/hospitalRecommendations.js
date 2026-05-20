const DEFAULT_LOCATION = {
  longitude: 105.846,
  latitude: 21.026,
};

const MOCK_HOSPITALS = [
  {
    id: "bach-mai",
    name: "Bệnh viện Bạch Mai",
    department: "Nội tổng quát",
    specialties: ["sốt", "đau đầu", "đau bụng", "nội khoa"],
    distanceKm: 2.4,
    address: "78 Giải Phóng, Hà Nội",
    phone: "024 3869 3731",
    status: "Đang mở cửa",
    longitude: 105.8412,
    latitude: 21.0017,
  },
  {
    id: "viet-duc",
    name: "Bệnh viện Việt Đức",
    department: "Cấp cứu & Ngoại khoa",
    specialties: ["cấp cứu", "đau bụng", "chấn thương", "đau dữ dội"],
    distanceKm: 1.1,
    address: "40 Tràng Thi, Hà Nội",
    phone: "024 3825 3531",
    status: "Phù hợp khi triệu chứng nặng",
    longitude: 105.8463,
    latitude: 21.0286,
  },
  {
    id: "vinmec-times-city",
    name: "Vinmec Times City",
    department: "Khám chuyên khoa",
    specialties: ["khám chuyên khoa", "đau đầu", "hô hấp", "nhi khoa"],
    distanceKm: 4.1,
    address: "458 Minh Khai, Hà Nội",
    phone: "024 3974 3556",
    status: "Có đặt lịch trong ngày",
    longitude: 105.8675,
    latitude: 20.9957,
  },
  {
    id: "medlatec-nghia-dung",
    name: "Medlatec Nghĩa Dũng",
    department: "Xét nghiệm & chẩn đoán",
    specialties: ["xét nghiệm", "sốt", "mệt mỏi", "theo dõi"],
    distanceKm: 3.2,
    address: "42 Nghĩa Dũng, Hà Nội",
    phone: "1900 565656",
    status: "Phù hợp xét nghiệm cơ bản",
    longitude: 105.8419,
    latitude: 21.0451,
  },
];

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function scoreHospital(hospital, symptomText) {
  const text = normalizeText(symptomText);
  const specialtyScore = hospital.specialties.reduce((score, specialty) => {
    return text.includes(normalizeText(specialty)) ? score + 2 : score;
  }, 0);
  const emergencyScore = text.includes("cấp cứu") || text.includes("khó thở") ? 2 : 0;

  return specialtyScore + emergencyScore;
}

function sortHospitalsBySymptom(hospitals, symptomText) {
  return [...hospitals].sort((first, second) => {
    const scoreDiff = scoreHospital(second, symptomText) - scoreHospital(first, symptomText);
    if (scoreDiff !== 0) return scoreDiff;
    return first.distanceKm - second.distanceKm;
  });
}

export function getDefaultMapLocation() {
  return DEFAULT_LOCATION;
}

export async function getHospitalRecommendations({ symptomText }) {
  // TODO: Replace this mock with the backend facility/map endpoint when it is exposed in Swagger.
  await new Promise((resolve) => {
    window.setTimeout(resolve, 420);
  });

  return {
    data: sortHospitalsBySymptom(MOCK_HOSPITALS, symptomText),
  };
}
