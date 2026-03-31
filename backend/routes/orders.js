const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  db.all("SELECT * FROM orders", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post("/", (req, res) => {
  const { user_id, product_id, quantity, order_date } = req.body;
  db.run(
    "INSERT INTO orders (user_id, product_id, quantity, order_date) VALUES (?, ?, ?, ?)",
    [user_id, product_id, quantity, order_date],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, user_id, product_id, quantity });
    },
  );
});

module.exports = router;
