const DEFAULT_BASE_URL = "http://52.77.210.243:8080";

const chapters = [
  {
    chapterCode: "A-B",
    chapterName: "Hệ truyền nhiễm và siêu vi",
    keywordWeights: { "sốt": 5, "nhiễm trùng": 5, "virus": 4, "ký sinh trùng": 4 },
  },
  {
    chapterCode: "C-D",
    chapterName: "Khối u và bệnh tân sinh",
    keywordWeights: { "khối u": 5, "ung thư": 5, "tân sinh": 4 },
  },
  {
    chapterCode: "D50-D89",
    chapterName: "Bệnh máu và cơ quan tạo máu",
    keywordWeights: { "thiếu máu": 5, "đông máu": 4, "huyết học": 4 },
  },
  {
    chapterCode: "E",
    chapterName: "Bệnh nội tiết, dinh dưỡng và chuyển hóa",
    keywordWeights: { "đái tháo đường": 5, "tuyến giáp": 4, "chuyển hóa": 4 },
  },
  {
    chapterCode: "F",
    chapterName: "Rối loạn tâm thần và hành vi",
    keywordWeights: { "lo âu": 5, "trầm cảm": 5, "mất ngủ": 3 },
  },
  {
    chapterCode: "G",
    chapterName: "Bệnh hệ thần kinh",
    keywordWeights: { "đau đầu": 4, "co giật": 5, "thần kinh": 4 },
  },
  {
    chapterCode: "H",
    chapterName: "Bệnh mắt, tai và cấu trúc liên quan",
    keywordWeights: { "mắt": 4, "tai": 4, "ù tai": 3 },
  },
  {
    chapterCode: "I",
    chapterName: "Bệnh hệ tuần hoàn",
    keywordWeights: { "tim mạch": 5, "huyết áp": 5, "đau ngực": 4 },
  },
  {
    chapterCode: "J",
    chapterName: "Bệnh hệ hô hấp",
    keywordWeights: { "ho": 5, "khó thở": 5, "hô hấp": 4 },
  },
  {
    chapterCode: "K",
    chapterName: "Bệnh hệ tiêu hóa",
    keywordWeights: { "đau bụng": 5, "tiêu hóa": 5, "buồn nôn": 4 },
  },
  {
    chapterCode: "L",
    chapterName: "Bệnh da và mô dưới da",
    keywordWeights: { "phát ban": 5, "ngứa": 4, "da liễu": 4 },
  },
  {
    chapterCode: "M00-M99",
    chapterName: "Bệnh cơ xương khớp và mô liên kết",
    keywordWeights: { "đau khớp": 5, "đau lưng": 4, "cơ xương khớp": 5 },
  },
  {
    chapterCode: "N",
    chapterName: "Bệnh hệ tiết niệu sinh dục",
    keywordWeights: { "tiết niệu": 5, "đau khi tiểu": 4, "thận": 4 },
  },
  {
    chapterCode: "O",
    chapterName: "Thai kỳ, sinh đẻ và hậu sản",
    keywordWeights: { "thai kỳ": 5, "sinh nở": 4, "sản khoa": 4 },
  },
  {
    chapterCode: "P",
    chapterName: "Một số tình trạng khởi phát trong thời kỳ chu sinh",
    keywordWeights: { "sơ sinh": 5, "chu sinh": 5, "non tháng": 4 },
  },
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    args[key] = argv[index + 1];
    index += 1;
  }
  return args;
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `${options.method || "GET"} ${url} failed with ${response.status}`);
  }
  return payload;
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

const args = parseArgs(process.argv.slice(2));
const baseUrl = (args.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
let token = args.token || process.env.MEDIMATE_ADMIN_TOKEN;

if (!token && args.email && args.password) {
  const login = await request(`${baseUrl}/api/authentication/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: args.email, password: args.password }),
  });
  token = login.data?.accessToken;
}

if (!token) {
  throw new Error("Missing admin token. Pass --token or --email and --password.");
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

const list = await request(`${baseUrl}/api/icd-chapters?PageNumber=1&PageSize=200`, { headers });
const items = Array.isArray(list.data) ? list.data : list.data?.items ?? [];
const existingByCode = new Map(items.map((item) => [normalizeCode(item.chapterCode), item]).filter(([code]) => code));
const updateExisting = args.updateExisting === "true";

let createdCount = 0;
let skippedCount = 0;
let updatedCount = 0;
let failedCount = 0;

for (const chapter of chapters) {
  const existing = existingByCode.get(normalizeCode(chapter.chapterCode));
  if (existing) {
    if (updateExisting && existing.id) {
      try {
        await request(`${baseUrl}/api/icd-chapters/${existing.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            chapterName: chapter.chapterName,
            keywordWeights: chapter.keywordWeights,
          }),
        });
        updatedCount += 1;
        console.log(`Updated ${chapter.chapterCode}: ${chapter.chapterName}`);
      } catch (error) {
        failedCount += 1;
        console.error(`Failed update ${chapter.chapterCode}: ${error.message}`);
      }
      continue;
    }
    skippedCount += 1;
    console.log(`Skip existing ${chapter.chapterCode}`);
    continue;
  }

  try {
    const created = await request(`${baseUrl}/api/icd-chapters`, {
      method: "POST",
      headers,
      body: JSON.stringify(chapter),
    });
    createdCount += 1;
    existingByCode.set(normalizeCode(chapter.chapterCode), created.data || chapter);
    console.log(`Created ${created.data?.chapterCode || chapter.chapterCode}: ${created.data?.chapterName || chapter.chapterName}`);
  } catch (error) {
    failedCount += 1;
    console.error(`Failed ${chapter.chapterCode}: ${error.message}`);
  }
}

console.log(`Done. Created ${createdCount}, updated ${updatedCount}, skipped ${skippedCount}, failed ${failedCount}.`);
