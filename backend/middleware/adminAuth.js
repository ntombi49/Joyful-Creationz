const crypto = require("crypto");

const COOKIE_NAME = "mummys_admin_session";
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "mummys-club-admin-session"
  );
}

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, pair) => {
    const [rawName, ...rest] = pair.split("=");
    if (!rawName) return cookies;
    const name = rawName.trim();
    if (!name) return cookies;
    cookies[name] = decodeURIComponent(rest.join("=").trim());
    return cookies;
  }, {});
}

function timingSafeEqualStrings(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionToken() {
  const issuedAt = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(issuedAt)
    .digest("base64url");

  return `${issuedAt}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== "string") return false;

  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;

  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs)) return false;
  if (Date.now() - issuedAtMs > SESSION_MAX_AGE_MS) return false;

  const expectedSignature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(issuedAt)
    .digest("base64url");

  return timingSafeEqualStrings(signature, expectedSignature);
}

function buildCookieValue(token) {
  const segments = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`,
  ];

  if (process.env.NODE_ENV === "production") {
    segments.push("Secure");
  }

  return segments.join("; ");
}

function buildExpiredCookieValue() {
  const segments = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (process.env.NODE_ENV === "production") {
    segments.push("Secure");
  }

  return segments.join("; ");
}

function setAdminCookie(res) {
  const token = createSessionToken();
  res.setHeader("Set-Cookie", buildCookieValue(token));
  return token;
}

function clearAdminCookie(res) {
  res.setHeader("Set-Cookie", buildExpiredCookieValue());
}

function isAdminRequest(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return verifySessionToken(cookies[COOKIE_NAME]);
}

function requireAdmin(req, res, next) {
  if (!isAdminRequest(req)) {
    return res.status(401).json({ message: "Admin access required." });
  }

  return next();
}

module.exports = {
  clearAdminCookie,
  isAdminRequest,
  requireAdmin,
  setAdminCookie,
};
