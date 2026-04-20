function resolveAssetUrl(src) {
  if (!src) return "";
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return encodeURI(trimmed);
  if (trimmed.toLowerCase().startsWith("images/")) return encodeURI(`/${trimmed}`);
  return encodeURI(`${window.location.origin}/images/${trimmed}`);
}

function showMessage(element, text, type = "success") {
  if (!element) return;
  element.textContent = text;
  element.classList.remove("hidden", "success", "error");
  element.classList.add(type, "visible");
}

function hideMessage(element) {
  if (!element) return;
  element.textContent = "";
  element.classList.add("hidden");
  element.classList.remove("visible", "success", "error");
}

function formatDate(value) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(value) {
  if (!value) return "TBA";
  const rawTime = String(value).trim();
  if (!rawTime) return "TBA";

  const parsedTime = new Date(`1970-01-01T${rawTime}`);
  if (Number.isNaN(parsedTime.valueOf())) return rawTime;

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedTime);
}

function formatCurrency(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return `R ${value}`;
  return `R ${amount.toFixed(2)}`;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
