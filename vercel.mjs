const backendApiOrigin = process.env.BACKEND_API_ORIGIN;

function normalizeBackendOrigin(value) {
  const origin = value?.trim().replace(/\/+$/, "");

  if (!origin) {
    throw new Error("Missing BACKEND_API_ORIGIN. Set it in Vercel environment variables.");
  }

  if (!/^https:\/\/[^/]+$/i.test(origin)) {
    throw new Error(
      "BACKEND_API_ORIGIN must be an HTTPS origin without a path, for example https://api.example.com.",
    );
  }

  return origin;
}

const backendOrigin = normalizeBackendOrigin(backendApiOrigin);
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${backendOrigin} https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://accounts.google.com`,
  "frame-src https://accounts.google.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()",
  },
];

export const config = {
  headers: [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
  rewrites: [
    {
      source: "/api/:path*",
      destination: `${backendOrigin}/api/:path*`,
    },
    {
      source: "/((?!api/.*).*)",
      destination: "/index.html",
    },
  ],
};
