const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post("/", (req, res) => {
  const { name, description, price, image } = req.body;
  db.run(
    "INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)",
    [name, description, price, image],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, price });
    },
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, price, image } = req.body;
  db.run(
    "UPDATE products SET name = ?, description = ?, price = ?, image = ? WHERE id = ?",
    [name, description, price, image, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ message: "Product not found" });
      res.json({ message: "Product updated successfully" });
    },
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  });
});

module.exports = router;
