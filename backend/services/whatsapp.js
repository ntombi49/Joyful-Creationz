const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM =
  process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

function ensureConfigured() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in backend/.env.",
    );
  }
}

function normalizeWhatsAppNumber(phone) {
  let digits = String(phone || "").trim();

  if (!digits) {
    throw new Error("Recipient phone number is required.");
  }

  digits = digits.replace(/[^\d+]/g, "");

  if (digits.startsWith("whatsapp:")) {
    digits = digits.slice("whatsapp:".length);
  }

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  if (digits.startsWith("0")) {
    digits = `27${digits.slice(1)}`;
  }

  if (!/^[0-9]+$/.test(digits)) {
    throw new Error("Recipient phone number must contain digits only.");
  }

  return `whatsapp:+${digits}`;
}

function formatEventDate(value) {
  if (!value) {
    return "TBA";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.valueOf())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsedDate);
}

function formatEventTime(value) {
  if (!value) {
    return "TBA";
  }

  const rawValue = String(value).trim();
  if (!rawValue) {
    return "TBA";
  }

  const parsedTime = new Date(`1970-01-01T${rawValue}`);
  if (!Number.isNaN(parsedTime.valueOf())) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(parsedTime);
  }

  return rawValue;
}

function buildTicketMessage({
  registrantName,
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  ticketNumber,
}) {
  const formattedDate = formatEventDate(eventDate);
  const formattedTime = formatEventTime(eventTime);
  const formattedLocation = eventLocation ? String(eventLocation).trim() : "TBA";

  return [
    "EVENT TICKET",
    "",
    `Hello ${registrantName},`,
    "",
    `Your ticket for ${eventName} is confirmed.`,
    "",
    "Event Details",
    `Event: ${eventName}`,
    `Date: ${formattedDate}`,
    `Time: ${formattedTime}`,
    `Location: ${formattedLocation}`,
    "",
    "Ticket Information",
    `Ticket ID: ${ticketNumber}`,
    "",
    "Please present this ticket at the entrance, either printed or on your phone.",
    "",
    "We look forward to welcoming you.",
  ].join("\n");
}

function buildTwilioBodyParams({
  to,
  body,
  mediaUrl,
}) {
  const params = new URLSearchParams();
  params.set("To", normalizeWhatsAppNumber(to));
  params.set("From", TWILIO_WHATSAPP_FROM);
  params.set("Body", body);

  if (mediaUrl) {
    params.set("MediaUrl", mediaUrl);
  }

  return params;
}

async function twilioFetch(path, params) {
  ensureConfigured();

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}${path}`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString(
            "base64",
          ),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  const rawText = await response.text();
  let payload = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = rawText;
  }

  if (!response.ok) {
    const description =
      payload && typeof payload === "object" && payload.message
        ? payload.message
        : rawText || `HTTP ${response.status}`;
    const error = new Error(description);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function sendTextMessage(to, body) {
  const params = buildTwilioBodyParams({ to, body });
  return twilioFetch("/Messages.json", params);
}

async function sendImageMessage(to, imageUrl, caption) {
  const body = caption || "Your ticket is ready.";
  const params = buildTwilioBodyParams({
    to,
    body,
    mediaUrl: imageUrl,
  });
  return twilioFetch("/Messages.json", params);
}

async function sendTicketMessage({
  to,
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  registrantName,
  ticketNumber,
}) {
  const body = buildTicketMessage({
    registrantName,
    eventName,
    eventDate,
    eventTime,
    eventLocation,
    ticketNumber,
  });

  return sendTextMessage(to, body);
}

async function sendAdminAlert(to, message) {
  return sendTextMessage(to, message);
}

module.exports = {
  normalizeWhatsAppNumber,
  sendAdminAlert,
  sendImageMessage,
  sendTextMessage,
  sendTicketMessage,
};
