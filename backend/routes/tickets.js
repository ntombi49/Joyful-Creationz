  const express = require("express");
const router = express.Router();
const db = require("../db");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");

// Generate unique ticket number
function generateTicketNumber() {
  return `JC-TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

// Generate QR code as data URL
async function generateQRCode(ticketNumber) {
  try {
    const qrCode = await QRCode.toDataURL(ticketNumber, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    }); 
    return qrCode;
  } catch (err) {
    console.error("QR Code generation error:", err);
    throw err;
  }
}

// Send ticket via WhatsApp
async function sendTicketViaWhatsApp(
  phone,
  ticketNumber,
  eventName,
  registrationName,
  qrCodeUrl,
) {
  let phoneNumber = String(phone || "").trim();
  const apiKey = process.env.CALLMEBOT_API_KEY;
  const defaultCountryCode = process.env.WHATSAPP_COUNTRY_CODE || "27";

  if (!phoneNumber) {
    throw new Error("Registrant phone number is missing");
  }

  if (phoneNumber.startsWith("+")) {
    phoneNumber = phoneNumber.slice(1);
  }

  if (phoneNumber.startsWith("0")) {
    phoneNumber = `${defaultCountryCode}${phoneNumber.slice(1)}`;
  }

  if (!/^[0-9]+$/.test(phoneNumber)) {
    throw new Error("Registrant phone number must contain only digits");
  }

  const message = `🎫 Your Event Ticket!\n\nEvent: ${eventName}\nName: ${registrationName}\nTicket #: ${ticketNumber}\n\nPlease save this message. Show the ticket QR code at the event entrance.`;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumber}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;

  try {
    console.log("Sending WhatsApp ticket to", phoneNumber);
    const response = await fetch(url);
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status} ${response.statusText} - ${responseText}`);
    }
    console.log("Ticket WhatsApp message sent successfully", responseText);
    return true;
  } catch (error) {
    console.error("Failed to send ticket via WhatsApp:", error);
    throw error;
  }
}

// Get all tickets
router.get("/", (req, res) => {
  db.all(
    `SELECT t.*, r.name, r.email, r.phone, e.name as event_name
    FROM tickets t
    JOIN registrations r ON t.registration_id = r.id
    JOIN events e ON r.event_id = e.id
    ORDER BY t.created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

// Send ticket to registrant (called when admin clicks "Send Ticket")
router.post("/send/:registrationId", async (req, res) => {
  const { registrationId } = req.params;

  try {
    // Get registration details
    db.get(
      `SELECT r.*, e.name as event_name FROM registrations r
       JOIN events e ON r.event_id = e.id WHERE r.id = ?`,
      [registrationId],
      async (err, registration) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!registration)
          return res.status(404).json({ message: "Registration not found" });

        // Check if ticket already exists
        db.get(
          "SELECT id FROM tickets WHERE registration_id = ?",
          [registrationId],
          async (err, existingTicket) => {
            if (err) return res.status(500).json({ error: err.message });

            let ticketNumber;
            let ticket;

            if (existingTicket) {
              // Ticket exists, get it
              db.get(
                "SELECT * FROM tickets WHERE registration_id = ?",
                [registrationId],
                async (err, foundTicket) => {
                  if (err) return res.status(500).json({ error: err.message });
                  ticketNumber = foundTicket.ticket_number;

                  // Send via WhatsApp
                  try {
                    await sendTicketViaWhatsApp(
                      registration.phone,
                      ticketNumber,
                      registration.event_name,
                      registration.name,
                      foundTicket.qr_code,
                    );

                    // Update sent timestamp
                    db.run(
                      "UPDATE tickets SET sent_at = ? WHERE registration_id = ?",
                      [new Date().toISOString(), registrationId],
                      (err) => {
                        if (err)
                          return res.status(500).json({ error: err.message });

                        // Mark ticket_sent in registrations
                        db.run(
                          "UPDATE registrations SET ticket_sent = 1 WHERE id = ?",
                          [registrationId],
                          (err) => {
                            if (err)
                              return res
                                .status(500)
                                .json({ error: err.message });
                            res.json({ message: "Ticket sent successfully!" });
                          },
                        );
                      },
                    );
                  } catch (whatsappErr) {
                    return res
                      .status(500)
                      .json({
                        message:
                          "Failed to send WhatsApp: " + whatsappErr.message,
                      });
                  }
                },
              );
            } else {
              // Create new ticket
              ticketNumber = generateTicketNumber();

              try {
                const qrCode = await generateQRCode(ticketNumber);

                db.run(
                  "INSERT INTO tickets (registration_id, ticket_number, qr_code, sent_at) VALUES (?, ?, ?, ?)",
                  [
                    registrationId,
                    ticketNumber,
                    qrCode,
                    new Date().toISOString(),
                  ],
                  async (err) => {
                    if (err)
                      return res.status(500).json({ error: err.message });

                    // Send via WhatsApp
                    try {
                      await sendTicketViaWhatsApp(
                        registration.phone,
                        ticketNumber,
                        registration.event_name,
                        registration.name,
                        qrCode,
                      );

                      // Mark ticket_sent in registrations
                      db.run(
                        "UPDATE registrations SET ticket_sent = 1 WHERE id = ?",
                        [registrationId],
                        (err) => {
                          if (err)
                            return res.status(500).json({ error: err.message });
                          res.json({
                            message: "Ticket created and sent successfully!",
                          });
                        },
                      );
                    } catch (whatsappErr) {
                      return res
                        .status(500)
                        .json({
                          message:
                            "Ticket created but WhatsApp failed: " +
                            whatsappErr.message,
                        });
                    }
                  },
                );
              } catch (qrErr) {
                return res
                  .status(500)
                  .json({
                    message: "QR Code generation failed: " + qrErr.message,
                  });
              }
            }
          },
        );
      },
    );
  } catch (err) {
    console.error("Error in send ticket:", err);
    res.status(500).json({ error: err.message });
  }
});

// Resend ticket
router.post("/resend/:ticketId", async (req, res) => {
  const { ticketId } = req.params;

  db.get(
    `SELECT t.*, r.name, r.phone, e.name as event_name FROM tickets t
     JOIN registrations r ON t.registration_id = r.id
     JOIN events e ON r.event_id = e.id WHERE t.id = ?`,
    [ticketId],
    async (err, ticket) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });

      try {
        await sendTicketViaWhatsApp(
          ticket.phone,
          ticket.ticket_number,
          ticket.event_name,
          ticket.name,
          ticket.qr_code,
        );

        db.run(
          "UPDATE tickets SET sent_at = ? WHERE id = ?",
          [new Date().toISOString(), ticketId],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Ticket resent successfully!" });
          },
        );
      } catch (whatsappErr) {
        res
          .status(500)
          .json({ message: "Failed to resend: " + whatsappErr.message });
      }
    },
  );
});

module.exports = router;
