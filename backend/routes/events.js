const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAdmin } = require("../middleware/adminAuth");

function parseEventDateTime(event) {
  const date = String(event.date || "").trim();
  const time = String(event.time || "").trim() || "00:00";

  if (!date) return null;

  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.valueOf())) return null;
  return parsed;
}

function getEventStatus(event) {
  const eventDateTime = parseEventDateTime(event);
  if (!eventDateTime) return "upcoming";
  return eventDateTime.getTime() < Date.now() ? "past" : "upcoming";
}

function validateEventInput(req, res, next) {
  const { name, date, time, location } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Event name is required." });
  }
  if (!date || !date.trim()) {
    return res.status(400).json({ message: "Event date is required." });
  }
  if (!time || !time.trim()) {
    return res.status(400).json({ message: "Event time is required." });
  }
  if (!location || !location.trim()) {
    return res.status(400).json({ message: "Event location is required." });
  }

  next();
}

router.get("/", (req, res) => {
  db.all("SELECT * FROM events ORDER BY date ASC, time ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map((row) => ({ ...row, status: getEventStatus(row) })));
  });
});

router.post("/", requireAdmin, validateEventInput, (req, res) => {
  const { name, description, date, time, location, image } = req.body;
  db.run(
    "INSERT INTO events (name, description, date, time, location, image) VALUES (?, ?, ?, ?, ?, ?)",
    [
      name.trim(),
      description || "",
      date.trim(),
      time ? time.trim() : "",
      location.trim(),
      image || "",
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        message: "Event created successfully.",
        eventId: this.lastID,
      });
    },
  );
});

router.put("/:id", requireAdmin, validateEventInput, (req, res) => {
  const { id } = req.params;
  const { name, description, date, time, location, image } = req.body;
  db.run(
    "UPDATE events SET name = ?, description = ?, date = ?, time = ?, location = ?, image = ? WHERE id = ?",
    [
      name.trim(),
      description || "",
      date.trim(),
      time ? time.trim() : "",
      location.trim(),
      image || "",
      id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ message: "Event not found." });
      res.json({ message: "Event updated successfully." });
    },
  );
});

router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM events WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ message: "Event not found." });
    res.json({ message: "Event removed successfully." });
  });
});

module.exports = router;
