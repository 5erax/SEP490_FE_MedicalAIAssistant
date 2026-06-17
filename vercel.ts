declare const process: {
  env: Record<string, string | undefined>;
};

function normalizeBackendOrigin(value: string | undefined) {
  const rawValue = value?.trim();

  if (!rawValue) {
    return "";
  }

  let url: URL;

  try {
    url = new URL(rawValue);
  } catch {
    throw new Error(
      "BACKEND_API_ORIGIN must be a valid HTTPS origin, for example https://api.example.com.",
    );
  }

  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(
      "BACKEND_API_ORIGIN must be an HTTPS origin without a path, for example https://api.example.com.",
    );
  }

  return url.origin;
}

const backendOrigin = normalizeBackendOrigin(process.env.BACKEND_API_ORIGIN);
const apiRewrites = backendOrigin
  ? [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ]
  : [];

const connectSources = [
  "'self'",
  ...(backendOrigin ? [backendOrigin] : []),
  "https://basemaps.cartocdn.com",
  "https://*.basemaps.cartocdn.com",
  "https://accounts.google.com",
].join(" ");

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
  `connect-src ${connectSources}`,
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

const config = {
  buildCommand: "npm run build",
  outputDirectory: "dist",
  headers: [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
  rewrites: [
    ...apiRewrites,
    {
      source: "/((?!api/.*).*)",
      destination: "/index.html",
    },
  ],
};

export default config;
