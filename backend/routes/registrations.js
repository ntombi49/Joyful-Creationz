const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  db.all(
    "SELECT r.*, e.name as event_name, e.date as event_date FROM registrations r JOIN events e ON r.event_id = e.id",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

router.post("/", (req, res) => {
  const { event_id, name, email, phone } = req.body;
  db.run(
    "INSERT INTO registrations (event_id, name, email, phone) VALUES (?, ?, ?, ?)",
    [event_id, name, email, phone],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: "Registration successful" });
    },
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { paid } = req.body;
  db.run(
    "UPDATE registrations SET paid = ? WHERE id = ?",
    [paid, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ message: "Registration not found" });
      res.json({ message: "Registration updated successfully" });
    },
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM registrations WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ message: "Registration not found" });
    res.json({ message: "Registration deleted successfully" });
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
        csv += `"${row.name}","${row.email}","${row.phone}","${row.event_name}","${row.event_date}"\n`;
      });

      res.header("Content-Type", "text/csv");
      res.attachment("registrations.csv");
      res.send(csv);
    },
  );
});

module.exports = router;
