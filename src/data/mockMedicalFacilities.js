const DEFAULT_DEPARTMENTS = [
  {
    id: "mock-department-musculoskeletal",
    departmentName: "Khoa cơ - xương - khớp",
    chapterCode: "M",
  },
  {
    id: "mock-department-respiratory",
    departmentName: "Khoa Hô Hấp",
    chapterCode: "J",
  },
  {
    id: "mock-department-infectious",
    departmentName: "Khoa truyền nhiễm và siêu vi",
    chapterCode: "A-B",
  },
  {
    id: "mock-department-general",
    departmentName: "Khoa Tổng Quát",
    chapterCode: "R",
  },
];

const DEPARTMENT_KEYS = [
  {
    key: "musculoskeletal",
    aliases: ["co xuong khop", "cơ xương khớp", "co - xuong - khop", "chapter:m"],
  },
  {
    key: "respiratory",
    aliases: ["ho hap", "hô hấp", "chapter:j"],
  },
  {
    key: "infectious",
    aliases: ["truyen nhiem", "truyền nhiễm", "sieu vi", "siêu vi", "chapter:a-b"],
  },
  {
    key: "general",
    aliases: ["tong quat", "tổng quát", "da khoa", "đa khoa", "chapter:r"],
  },
];

const FACILITY_TEMPLATES = {
  musculoskeletal: [
    {
      facilityName: "Bệnh viện Chợ Rẫy",
      address: "201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP.HCM",
      latitude: 10.7578,
      longitude: 106.6601,
      imageUrl: "https://isofhcare-backup.s3-ap-southeast-1.amazonaws.com/guess/f8744e6c-a253-4b4a-ba84-9a0b791b5441.jpg",
      phone: "028 3855 4137",
      website: "https://choray.vn",
      openingHours: "24/7",
      description: "Cơ sở tuyến cuối phù hợp tiếp nhận các ca cơ xương khớp phức tạp, chấn thương và điều trị phối hợp đa chuyên khoa.",
    },
    {
      facilityName: "Bệnh viện Chấn thương Chỉnh hình TP.HCM",
      address: "929 Trần Hưng Đạo, Phường 1, Quận 5, TP.HCM",
      latitude: 10.7517,
      longitude: 106.6748,
      imageUrl: "https://cdn.medpro.vn/medpro-production/medpro/topics/benh-vien-chan-thuong-chinh-hinh(1).jpg",
      phone: "028 3923 5791",
      website: "https://bvctch.vn",
      openingHours: "Thứ 2 - Chủ nhật, 07:00 - 20:00",
      description: "Cơ sở chuyên sâu về chấn thương chỉnh hình, xương khớp, phục hồi vận động và theo dõi sau phẫu thuật.",
    },
    {
      facilityName: "Bệnh viện Đại học Y Dược TP.HCM - Cơ sở 1",
      address: "215 Hồng Bàng, Phường 11, Quận 5, TP.HCM",
      latitude: 10.7554,
      longitude: 106.6652,
      imageUrl: "https://bvdaihoc.com.vn/cover-homepage.jpg",
      phone: "028 3855 4269",
      website: "https://www.bvdaihoc.com.vn",
      openingHours: "Thứ 2 - Thứ 7, 06:30 - 16:30",
      description: "Bệnh viện đa chuyên khoa có phòng khám cơ xương khớp, cận lâm sàng và dịch vụ theo dõi điều trị ngoại trú.",
    },
  ],
  respiratory: [
    {
      facilityName: "Bệnh viện Phạm Ngọc Thạch",
      address: "120 Hồng Bàng, Phường 12, Quận 5, TP.HCM",
      latitude: 10.7547,
      longitude: 106.664,
      imageUrl: "https://cdn.youmed.vn/tin-tuc/wp-content/uploads/2019/05/benh-vien-pham-ngoc-thach-1024x634.png",
      phone: "028 3855 0207",
      website: "https://bvphamngocthach.vn",
      openingHours: "Thứ 2 - Thứ 6, 07:00 - 16:30",
      description: "Cơ sở chuyên khoa hô hấp, phù hợp đánh giá ho kéo dài, khó thở, bệnh phổi mạn tính và các vấn đề lồng ngực.",
    },
    {
      facilityName: "Bệnh viện Nhân dân Gia Định",
      address: "1 Nơ Trang Long, Phường 7, Bình Thạnh, TP.HCM",
      latitude: 10.8037,
      longitude: 106.6934,
      imageUrl: "https://bvndgiadinh.org.vn/wp-content/uploads/slider/cache/c13f44e3e64de0f302983044ab917200/1-2-1-scaled.jpg",
      phone: "028 3841 2692",
      website: "https://bvndgiadinh.org.vn",
      openingHours: "24/7",
      description: "Bệnh viện đa khoa có tiếp nhận cấp cứu và khám hô hấp, phù hợp khi người bệnh cần đánh giá kèm bệnh nền.",
    },
    {
      facilityName: "Bệnh viện Đại học Y Dược TP.HCM - Hô hấp",
      address: "215 Hồng Bàng, Phường 11, Quận 5, TP.HCM",
      latitude: 10.7554,
      longitude: 106.6652,
      imageUrl: "https://bvdaihoc.com.vn/cover-homepage.jpg",
      phone: "028 3855 4269",
      website: "https://www.bvdaihoc.com.vn",
      openingHours: "Thứ 2 - Thứ 7, 06:30 - 16:30",
      description: "Cơ sở đa chuyên khoa có khám hô hấp, xét nghiệm và chẩn đoán hình ảnh phục vụ đánh giá triệu chứng hô hấp.",
    },
  ],
  infectious: [
    {
      facilityName: "Bệnh viện Bệnh Nhiệt đới",
      address: "764 Võ Văn Kiệt, Phường 1, Quận 5, TP.HCM",
      latitude: 10.7529,
      longitude: 106.6784,
      imageUrl: "https://bvbnd.vn/wp-content/uploads/2020/07/IMG_7355-1024x683.jpg",
      phone: "028 3923 5804",
      website: "https://www.bvbnd.vn",
      openingHours: "24/7",
      description: "Cơ sở chuyên sâu về bệnh truyền nhiễm, sốt kéo dài, bệnh do virus và các tình huống cần cách ly hoặc theo dõi sát.",
    },
    {
      facilityName: "Bệnh viện Nhi Đồng 1",
      address: "341 Sư Vạn Hạnh, Phường 10, Quận 10, TP.HCM",
      latitude: 10.7679,
      longitude: 106.6697,
      imageUrl: "https://trungtamnhanhoa.vn/wp-content/uploads/2023/04/kham-tre-cham-noi-benh-vien-nhi-dong-1-scaled.jpg",
      phone: "028 3927 1119",
      website: "https://nhidong.org.vn",
      openingHours: "24/7",
      description: "Cơ sở nhi khoa có tiếp nhận bệnh nhi nghi nhiễm trùng, sốt virus và các vấn đề truyền nhiễm ở trẻ em.",
    },
    {
      facilityName: "Bệnh viện Nhi Đồng Thành Phố",
      address: "15 Võ Trần Chí, Tân Kiên, Bình Chánh, TP.HCM",
      latitude: 10.7153,
      longitude: 106.5555,
      imageUrl: "https://bvndtp.org.vn/wp-content/uploads/2019/09/tan-tam.jpg",
      phone: "028 2253 6688",
      website: "https://bvndtp.org.vn",
      openingHours: "24/7",
      description: "Bệnh viện nhi khoa quy mô lớn, phù hợp khi trẻ cần đánh giá triệu chứng nhiễm trùng hoặc theo dõi cấp cứu.",
    },
  ],
  general: [
    {
      facilityName: "Bệnh viện Đa khoa Quốc tế Vinmec Central Park",
      address: "208 Nguyễn Hữu Cảnh, Phường 22, Bình Thạnh, TP.HCM",
      latitude: 10.794,
      longitude: 106.7219,
      imageUrl: "https://www.vinmec.com/static/uploads/vinmec_central_park_a3d82b5b69.jpg",
      phone: "028 3622 1166",
      website: "https://www.vinmec.com",
      openingHours: "24/7",
      description: "Cơ sở đa khoa có khám tổng quát, cấp cứu và điều phối chuyên khoa khi cần đánh giá nhiều nhóm triệu chứng.",
    },
    {
      facilityName: "Bệnh viện FV",
      address: "6 Nguyễn Lương Bằng, Tân Phú, Quận 7, TP.HCM",
      latitude: 10.7308,
      longitude: 106.7198,
      imageUrl: "https://www.fvhospital.com/wp-content/uploads/2025/10/fv-hospital-view-6-1024x683.jpg",
      phone: "028 5411 3333",
      website: "https://www.fvhospital.com",
      openingHours: "24/7",
      description: "Bệnh viện đa khoa quốc tế có dịch vụ khám tổng quát, chẩn đoán hình ảnh và tư vấn chuyên khoa liên quan.",
    },
    {
      facilityName: "Bệnh viện Hoàn Mỹ Sài Gòn",
      address: "60-60A Phan Xích Long, Phường 1, Phú Nhuận, TP.HCM",
      latitude: 10.7985,
      longitude: 106.6874,
      imageUrl: "https://cdn.medpro.vn/medpro-production/medpro/topics/benh-vien-hoan-my-sai-gon.jpg",
      phone: "028 3995 9860",
      website: "https://www.hoanmysaigon.com",
      openingHours: "24/7",
      description: "Bệnh viện đa khoa phù hợp khám tổng quát, theo dõi bệnh nền và chuyển tuyến chuyên khoa khi có dấu hiệu cần ưu tiên.",
    },
  ],
};

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getDepartmentKey(department) {
  const searchText = [
    department?.departmentName,
    department?.name,
    department?.description,
    department?.chapterCode ? `chapter:${department.chapterCode}` : "",
  ].map(normalizeSearchText).join(" ");

  return DEPARTMENT_KEYS.find((item) => item.aliases.some((alias) => searchText.includes(normalizeSearchText(alias))))?.key
    ?? null;
}

function departmentName(department) {
  return department?.departmentName || department?.name || "Khoa Tổng Quát";
}

function departmentId(department) {
  return department?.id || department?.departmentId || normalizeSearchText(departmentName(department)).replaceAll(" ", "-");
}

function hasDepartment(facility, department) {
  const id = String(departmentId(department));
  const name = normalizeSearchText(departmentName(department));
  const facilityDepartmentIds = Array.isArray(facility.departmentIds) ? facility.departmentIds : [];
  const facilityDepartments = Array.isArray(facility.departments) ? facility.departments : [];

  return facilityDepartmentIds.some((item) => String(item) === id)
    || facilityDepartments.some((item) => {
      const itemId = item?.departmentId ?? item?.id;
      const itemName = normalizeSearchText(item?.departmentName ?? item?.name ?? item);
      return (itemId && String(itemId) === id) || (name && itemName.includes(name));
    });
}

function findTemplate(facility, key) {
  const name = normalizeSearchText(facility?.facilityName ?? facility?.name);
  return FACILITY_TEMPLATES[key]?.find((template) => {
    const templateName = normalizeSearchText(template.facilityName);
    return name && (name.includes(templateName) || templateName.includes(name));
  });
}

function isMissingValue(value) {
  const normalized = normalizeSearchText(value);
  return !normalized || normalized === "dang cap nhat" || normalized === "chua cap nhat";
}

function withDepartment(template, department, index) {
  return {
    id: `mock-${departmentId(department)}-${index + 1}`,
    facilityId: `mock-${departmentId(department)}-${index + 1}`,
    ...template,
    imageUrl: template.imageUrl,
    facilityType: "Bệnh viện",
    isActive: true,
    isMockFacility: true,
    departments: [{
      departmentId: departmentId(department),
      departmentName: departmentName(department),
      description: department?.description || "",
    }],
  };
}

function enrichFacility(facility, departments) {
  const matchedDepartment = departments.find((department) => hasDepartment(facility, department)) ?? departments[0];
  const departmentKey = getDepartmentKey(matchedDepartment);
  const key = departmentKey ?? "general";
  const template = departmentKey ? findTemplate(facility, key) : null;

  if (!departmentKey && !template) return facility;

  if (
    !template
    && !isMissingValue(facility.imageUrl)
    && !isMissingValue(facility.phone)
    && !isMissingValue(facility.website)
    && !isMissingValue(facility.openingHours)
    && !isMissingValue(facility.description)
  ) {
    return facility;
  }

  return {
    ...(template ?? {}),
    ...facility,
    phone: isMissingValue(facility.phone) ? (template?.phone || "028 0000 0000") : facility.phone,
    website: isMissingValue(facility.website) ? (template?.website || "https://example.com") : facility.website,
    openingHours: isMissingValue(facility.openingHours) ? (template?.openingHours || "Thứ 2 - Chủ nhật, 07:00 - 20:00") : facility.openingHours,
    imageUrl: isMissingValue(facility.imageUrl) ? (template?.imageUrl || "") : facility.imageUrl,
    description: isMissingValue(facility.description)
      ? (template?.description || "Cơ sở y tế demo có đầy đủ địa chỉ, tọa độ, liên hệ, website, giờ hoạt động và chuyên khoa liên kết để phục vụ kiểm thử giao diện.")
      : facility.description,
    isMockAugmented: (
      isMissingValue(facility.phone)
      || isMissingValue(facility.website)
      || isMissingValue(facility.openingHours)
      || isMissingValue(facility.description)
      || isMissingValue(facility.imageUrl)
    ),
  };
}

export function ensureMockFacilityCoverage(facilities, departments = [], targetPerDepartment = 3) {
  const knownDepartments = departments.length ? departments : (facilities.length ? [] : DEFAULT_DEPARTMENTS);
  if (knownDepartments.length === 0) return facilities;

  const output = facilities.map((facility) => enrichFacility(facility, knownDepartments));
  const facilityNames = new Set(output.map((facility) => normalizeSearchText(facility.facilityName ?? facility.name)));

  knownDepartments.forEach((department) => {
    const key = getDepartmentKey(department);
    if (!key) return;

    const templates = FACILITY_TEMPLATES[key] ?? FACILITY_TEMPLATES.general;
    let departmentFacilities = output.filter((facility) => hasDepartment(facility, department));

    templates.forEach((template, index) => {
      if (departmentFacilities.length >= targetPerDepartment) return;
      const name = normalizeSearchText(template.facilityName);
      if (facilityNames.has(name)) return;

      const mockFacility = withDepartment(template, department, index);
      output.push(mockFacility);
      departmentFacilities = [...departmentFacilities, mockFacility];
      facilityNames.add(name);
    });
  });

  return output;
}
