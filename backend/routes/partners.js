const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  db.all("SELECT * FROM partners", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post("/", (req, res) => {
  const { name, description, logo } = req.body;
  db.run(
    "INSERT INTO partners (name, description, logo) VALUES (?, ?, ?)",
    [name, description, logo],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name });
    },
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, logo } = req.body;
  db.run(
    "UPDATE partners SET name = ?, description = ?, logo = ? WHERE id = ?",
    [name, description, logo, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ message: "Partner not found" });
      res.json({ message: "Partner updated successfully" });
    },
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM partners WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ message: "Partner not found" });
    res.json({ message: "Partner deleted successfully" });
  });
});

module.exports = router;
