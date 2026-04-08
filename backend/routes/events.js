const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  db.all("SELECT * FROM events", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post("/", (req, res) => {
  const { name, description, date, location } = req.body;
  db.run(
    "INSERT INTO events (name, description, date, location) VALUES (?, ?, ?, ?)",
    [name, description, date, location],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, date });
    },
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, date, location } = req.body;
  db.run(
    "UPDATE events SET name = ?, description = ?, date = ?, location = ? WHERE id = ?",
    [name, description, date, location, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ message: "Event not found" });
      res.json({ message: "Event updated successfully" });
    },
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM events WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event deleted successfully" });
  });
});

module.exports = router;
