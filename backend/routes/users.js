const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAdmin } = require("../middleware/adminAuth");

// fetching all users from the database
router.get("/", requireAdmin, (req, res) => {
  const sql = "SELECT * FROM users";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Create a new user
router.post("/", requireAdmin, (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required." });
  }
  const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
  db.run(sql, [name, email, password], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, name, email });
  });
});

module.exports = router;
