const { Blob } = require("buffer");

const API_VERSION =
  process.env.WHATSAPP_API_VERSION ||
  process.env.CLOUD_API_VERSION ||
  "v20.0";

const PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WA_PHONE_NUMBER_ID;

const ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN || process.env.CLOUD_API_ACCESS_TOKEN;

const DEFAULT_COUNTRY_CODE = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "27";
const TEMPLATE_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US";

function normalizeWhatsAppNumber(phone) {
  let digits = String(phone || "").trim();

  if (!digits) {
    throw new Error("Recipient phone number is required.");
  }

  digits = digits.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  if (digits.startsWith("0")) {
    digits = `${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  }

  if (!/^[0-9]+$/.test(digits)) {
    throw new Error("Recipient phone number must contain digits only.");
  }

  return digits;
}

function ensureConfigured() {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error(
      "Meta WhatsApp Cloud API is not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in backend/.env.",
    );
  }
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

function buildTicketCaption({
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  ticketNumber,
}) {
  return [
    eventName,
    formatEventDate(eventDate),
    formatEventTime(eventTime),
    eventLocation ? String(eventLocation).trim() : "TBA",
    `Ticket ID: ${ticketNumber}`,
  ].join("\n");
}

function apiUrl(path) {
  ensureConfigured();
  return `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}${path}`;
}

async function apiFetch(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      ...(options.headers || {}),
    },
  });

  const rawText = await response.text();
  let payload = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = rawText;
  }

  if (!response.ok) {
    const description =
      payload && typeof payload === "object" && payload.error
        ? payload.error.message || JSON.stringify(payload.error)
        : rawText || `HTTP ${response.status}`;
    const error = new Error(description);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function sendTextMessage(to, body) {
  const recipient = normalizeWhatsAppNumber(to);
  return apiFetch("/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "text",
      text: {
        preview_url: false,
        body,
      },
    }),
  });
}

async function sendTemplateMessage(to, templateName, parameters = []) {
  const recipient = normalizeWhatsAppNumber(to);
  const bodyParameters = parameters.map((parameter) => ({
    type: "text",
    text: String(parameter),
  }));

  return apiFetch("/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "template",
      template: {
        name: templateName,
        language: {
          policy: "deterministic",
          code: TEMPLATE_LANGUAGE,
        },
        components: [
          {
            type: "body",
            parameters: bodyParameters,
          },
        ],
      },
    }),
  });
}

async function uploadMedia({ buffer, mimeType, filename }) {
  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("type", mimeType);
  formData.append("file", new Blob([buffer], { type: mimeType }), filename);

  const response = await fetch(apiUrl("/media"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: formData,
  });

  const rawText = await response.text();
  let payload = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = rawText;
  }

  if (!response.ok) {
    const description =
      payload && typeof payload === "object" && payload.error
        ? payload.error.message || JSON.stringify(payload.error)
        : rawText || `HTTP ${response.status}`;
    const error = new Error(description);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (!payload || !payload.id) {
    throw new Error("Meta did not return a media ID.");
  }

  return payload.id;
}

async function sendImageMessage(to, imageId, caption) {
  const recipient = normalizeWhatsAppNumber(to);
  return apiFetch("/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "image",
      image: {
        id: imageId,
        ...(caption ? { caption } : {}),
      },
    }),
  });
}

async function sendTicketMessage({
  to,
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  registrantName,
  ticketNumber,
  qrBuffer,
  templateName,
}) {
  const recipient = normalizeWhatsAppNumber(to);
  const results = [];
  const errors = [];

  if (templateName) {
    try {
      const response = await sendTemplateMessage(recipient, templateName, [
        registrantName,
        eventName,
        formatEventDate(eventDate),
        formatEventTime(eventTime),
        eventLocation || "TBA",
        ticketNumber,
      ]);
      results.push({ channel: "template", response });
    } catch (error) {
      errors.push(`template: ${error.message}`);
    }
  }

  try {
    const mediaId = await uploadMedia({
      buffer: qrBuffer,
      mimeType: "image/png",
      filename: `${ticketNumber}.png`,
    });

    const response = await sendImageMessage(
      recipient,
      mediaId,
      buildTicketCaption({
        eventName,
        eventDate,
        eventTime,
        eventLocation,
        ticketNumber,
      }),
    );
    results.push({ channel: "image", response });
  } catch (error) {
    errors.push(`image: ${error.message}`);
  }

  try {
    const response = await sendTextMessage(
      recipient,
      buildTicketMessage({
        registrantName,
        eventName,
        eventDate,
        eventTime,
        eventLocation,
        ticketNumber,
      }),
    );
    results.push({ channel: "text", response });
  } catch (error) {
    errors.push(`text: ${error.message}`);
  }

  if (!results.length) {
    const error = new Error(
      `Unable to send ticket through Meta WhatsApp Cloud API. ${errors.join(
        " | ",
      )}`,
    );
    error.details = errors;
    throw error;
  }

  return {
    deliveredVia: results.map((result) => result.channel),
    errors,
  };
}

async function sendAdminAlert(to, message) {
  return sendTextMessage(to, message);
}

module.exports = {
  normalizeWhatsAppNumber,
  sendAdminAlert,
  sendImageMessage,
  sendTemplateMessage,
  sendTextMessage,
  sendTicketMessage,
  uploadMedia,
};
