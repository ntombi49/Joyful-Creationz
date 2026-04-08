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

module.exports = router;
