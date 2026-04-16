const express = require("express");
const router = express.Router();
const db = require("../db");

function validateRegistrationInput(req, res, next) {
  const { event_id, name, email, phone } = req.body;

  if (!event_id) {
    return res.status(400).json({ message: "Event ID is required." });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Your name is required." });
  }
  if (!email || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "A valid email address is required." });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ message: "Phone number is required." });
  }

  db.get("SELECT id FROM events WHERE id = ?", [event_id], (err, row) => {
    if (err) return res.status(500).json({ message: "Unable to validate event." });
    if (!row) {
      return res.status(400).json({ message: "Selected event does not exist." });
    }
    next();
  });
}

router.get("/", (req, res) => {
  db.all(
    "SELECT r.*, e.name as event_name, e.date as event_date FROM registrations r JOIN events e ON r.event_id = e.id ORDER BY r.registered_at DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

router.post("/", validateRegistrationInput, (req, res) => {
  const { event_id, name, email, phone } = req.body;
  db.run(
    "INSERT INTO registrations (event_id, name, email, phone) VALUES (?, ?, ?, ?)",
    [event_id, name.trim(), email.trim(), phone.trim()],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: "Registration successful." });
    },
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { paid } = req.body;
  const normalizedPaid = Number(paid) ? 1 : 0;
  db.run(
    "UPDATE registrations SET paid = ? WHERE id = ?",
    [normalizedPaid, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ message: "Registration not found." });
      res.json({ message: "Registration updated successfully." });
    },
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM registrations WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ message: "Registration not found." });
    res.json({ message: "Registration removed successfully." });
  });
});

router.get("/export", (req, res) => {
  db.all(
    "SELECT r.*, e.name as event_name, e.date as event_date FROM registrations r JOIN events e ON r.event_id = e.id",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      let csv = "Name,Email,Phone,Event,Date\n";
      rows.forEach((row) => {
        const escapedName = String(row.name || "").replace(/"/g, '""');
        const escapedEmail = String(row.email || "").replace(/"/g, '""');
        const escapedPhone = String(row.phone || "").replace(/"/g, '""');
        const escapedEvent = String(row.event_name || "").replace(/"/g, '""');
        const escapedDate = String(row.event_date || "").replace(/"/g, '""');
        csv += `"${escapedName}","${escapedEmail}","${escapedPhone}","${escapedEvent}","${escapedDate}"\n`;
      });

      res.header("Content-Type", "text/csv");
      res.attachment("registrations.csv");
      res.send(csv);
    },
  );
});

module.exports = router;
