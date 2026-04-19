const express = require("express");
const router = express.Router();
const db = require("../db");

function validatePartnerInput(req, res, next) {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Partner name is required." });
  }

  next();
}

router.get("/", (req, res) => {
  db.all("SELECT * FROM partners", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post("/", validatePartnerInput, (req, res) => {
  const { name, description, logo, facebook_url, tiktok_url } = req.body;
  db.run(
    "INSERT INTO partners (name, description, logo, facebook_url, tiktok_url) VALUES (?, ?, ?, ?, ?)",
    [
      name.trim(),
      description || "",
      logo || "",
      facebook_url || "",
      tiktok_url || "",
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        message: "Partner created successfully.",
        partnerId: this.lastID,
      });
    },
  );
});

router.put("/:id", validatePartnerInput, (req, res) => {
  const { id } = req.params;
  const { name, description, logo, facebook_url, tiktok_url } = req.body;
  db.run(
    "UPDATE partners SET name = ?, description = ?, logo = ?, facebook_url = ?, tiktok_url = ? WHERE id = ?",
    [
      name.trim(),
      description || "",
      logo || "",
      facebook_url || "",
      tiktok_url || "",
      id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ message: "Partner not found." });
      res.json({ message: "Partner updated successfully." });
    },
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM partners WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ message: "Partner not found." });
    res.json({ message: "Partner removed successfully." });
  });
});

module.exports = router;
