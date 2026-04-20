const express = require("express");
const router = express.Router();
const db = require("../db");
const QRCode = require("qrcode");
const { sendTicketMessage } = require("../services/whatsapp");
const { requireAdmin } = require("../middleware/adminAuth");

function generateTicketNumber() {
  return `JC-TICKET-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)
    .toUpperCase()}`;
}

async function generateQRCodeArtifacts(ticketNumber) {
  try {
    const [dataUrl, buffer] = await Promise.all([
      QRCode.toDataURL(ticketNumber, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      }),
      QRCode.toBuffer(ticketNumber, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      }),
    ]);

    return { dataUrl, buffer };
  } catch (err) {
    console.error("QR Code generation error:", err);
    throw err;
  }
}

async function sendTicketViaWhatsApp({
  phone,
  ticketNumber,
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  registrationName,
  qrBuffer,
}) {
  return sendTicketMessage({
    to: phone,
    eventName,
    eventDate,
    eventTime,
    eventLocation,
    registrantName: registrationName,
    ticketNumber,
    qrBuffer,
    templateName: process.env.WHATSAPP_TICKET_TEMPLATE_NAME || "",
  });
}

router.get("/", requireAdmin, (req, res) => {
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

router.post("/send/:registrationId", requireAdmin, async (req, res) => {
  const { registrationId } = req.params;

  try {
    db.get(
      `SELECT r.*, e.name as event_name, e.date as event_date, e.time as event_time, e.location as event_location FROM registrations r
       JOIN events e ON r.event_id = e.id WHERE r.id = ?`,
      [registrationId],
      async (err, registration) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!registration) {
          return res.status(404).json({ message: "Registration not found." });
        }

        db.get(
          "SELECT id FROM tickets WHERE registration_id = ?",
          [registrationId],
          async (ticketErr, existingTicket) => {
            if (ticketErr) {
              return res.status(500).json({ error: ticketErr.message });
            }

            if (existingTicket) {
              db.get(
                "SELECT * FROM tickets WHERE registration_id = ?",
                [registrationId],
                async (foundErr, foundTicket) => {
                  if (foundErr) {
                    return res.status(500).json({ error: foundErr.message });
                  }

                  try {
                    const qrArtifacts = await generateQRCodeArtifacts(
                      foundTicket.ticket_number,
                    );

                    await sendTicketViaWhatsApp({
                      phone: registration.phone,
                      ticketNumber: foundTicket.ticket_number,
                      eventName: registration.event_name,
                      eventDate: registration.event_date,
                      eventTime: registration.event_time,
                      eventLocation: registration.event_location,
                      registrationName: registration.name,
                      qrBuffer: qrArtifacts.buffer,
                    });

                    db.run(
                      "UPDATE tickets SET sent_at = ? WHERE registration_id = ?",
                      [new Date().toISOString(), registrationId],
                      (updateErr) => {
                        if (updateErr) {
                          return res.status(500).json({ error: updateErr.message });
                        }

                        db.run(
                          "UPDATE registrations SET ticket_sent = 1 WHERE id = ?",
                          [registrationId],
                          (registrationErr) => {
                            if (registrationErr) {
                              return res
                                .status(500)
                                .json({ error: registrationErr.message });
                            }
                            res.json({ message: "Ticket sent successfully!" });
                          },
                        );
                      },
                    );
                  } catch (whatsappErr) {
                    return res
                      .status(500)
                      .json({
                        message: "Failed to send WhatsApp: " + whatsappErr.message,
                      });
                  }
                },
              );
              return;
            }

            try {
              const ticketNumber = generateTicketNumber();
              const qrArtifacts = await generateQRCodeArtifacts(ticketNumber);

              db.run(
                "INSERT INTO tickets (registration_id, ticket_number, qr_code, sent_at) VALUES (?, ?, ?, ?)",
                [
                  registrationId,
                  ticketNumber,
                  qrArtifacts.dataUrl,
                  null,
                ],
                async (insertErr) => {
                  if (insertErr) {
                    return res.status(500).json({ error: insertErr.message });
                  }

                  try {
                    await sendTicketViaWhatsApp({
                      phone: registration.phone,
                      ticketNumber,
                      eventName: registration.event_name,
                      eventDate: registration.event_date,
                      eventTime: registration.event_time,
                      eventLocation: registration.event_location,
                      registrationName: registration.name,
                      qrBuffer: qrArtifacts.buffer,
                    });

                    const sentAt = new Date().toISOString();
                    db.run(
                      "UPDATE tickets SET sent_at = ? WHERE registration_id = ?",
                      [sentAt, registrationId],
                      (ticketUpdateErr) => {
                        if (ticketUpdateErr) {
                          return res
                            .status(500)
                            .json({ error: ticketUpdateErr.message });
                        }

                        db.run(
                          "UPDATE registrations SET ticket_sent = 1 WHERE id = ?",
                          [registrationId],
                          (registrationErr) => {
                            if (registrationErr) {
                              return res
                                .status(500)
                                .json({ error: registrationErr.message });
                            }
                            res.json({
                              message: "Ticket created and sent successfully!",
                            });
                          },
                        );
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
                .json({ message: "QR Code generation failed: " + qrErr.message });
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

router.post("/resend/:ticketId", requireAdmin, async (req, res) => {
  const { ticketId } = req.params;

  db.get(
    `SELECT t.*, r.name, r.phone, e.name as event_name, e.date as event_date, e.time as event_time, e.location as event_location FROM tickets t
     JOIN registrations r ON t.registration_id = r.id
     JOIN events e ON r.event_id = e.id WHERE t.id = ?`,
    [ticketId],
    async (err, ticket) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!ticket) return res.status(404).json({ message: "Ticket not found." });

      try {
        const qrArtifacts = await generateQRCodeArtifacts(ticket.ticket_number);

        await sendTicketViaWhatsApp({
          phone: ticket.phone,
          ticketNumber: ticket.ticket_number,
          eventName: ticket.event_name,
          eventDate: ticket.event_date,
          eventTime: ticket.event_time,
          eventLocation: ticket.event_location,
          registrationName: ticket.name,
          qrBuffer: qrArtifacts.buffer,
        });

        db.run(
          "UPDATE tickets SET sent_at = ? WHERE id = ?",
          [new Date().toISOString(), ticketId],
          (updateErr) => {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
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
