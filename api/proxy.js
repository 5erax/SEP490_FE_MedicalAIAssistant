import { Buffer } from "node:buffer";
import process from "node:process";

const HOP_BY_HOP_HEADERS = new Set([
  "accept-encoding",
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function getBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
    request.on("error", reject);
  });
}

function copyRequestHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([key]) => !HOP_BY_HOP_HEADERS.has(key.toLowerCase()))
      .filter(([, value]) => value !== undefined),
  );
}

function copyResponseHeaders(sourceHeaders, response) {
  sourceHeaders.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      response.setHeader(key, value);
    }
  });
}

function getTargetPath(request) {
  const path = request.query?.path;
  if (Array.isArray(path)) return path.join("/");
  return typeof path === "string" ? path : "";
}

function buildTargetUrl(request, baseUrl) {
  const targetPath = getTargetPath(request).replace(/^\/+/, "");
  const targetUrl = new URL(`/api/${targetPath}`, baseUrl);
  const requestUrl = new URL(request.url, "http://vercel.local");

  requestUrl.searchParams.delete("path");
  requestUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  return targetUrl;
}

function getApiBaseUrl() {
  return (process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
}

export default async function handler(request, response) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    response.status(500).json({ success: false, message: "API_BASE_URL is not configured." });
    return;
  }

  if (!getTargetPath(request)) {
    response.status(400).json({ success: false, message: "Missing API proxy path." });
    return;
  }

  try {
    const body = ["GET", "HEAD"].includes(request.method) ? undefined : await getBody(request);
    const upstreamResponse = await fetch(buildTargetUrl(request, baseUrl), {
      method: request.method,
      headers: copyRequestHeaders(request.headers),
      body,
      redirect: "manual",
    });

    response.statusCode = upstreamResponse.status;
    copyResponseHeaders(upstreamResponse.headers, response);
    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    response.end(buffer);
  } catch {
    response.status(502).json({ success: false, message: "Backend API is unavailable." });
  }
}
