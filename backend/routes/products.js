const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAdmin } = require("../middleware/adminAuth");

function validateProductInput(req, res, next) {
  const { name, price } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Product name is required." });
  }

  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ message: "A valid product price is required." });
  }

  req.body.price = numericPrice;
  next();
}

router.get("/", (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post("/", requireAdmin, validateProductInput, (req, res) => {
  const { name, description, price, image } = req.body;
  db.run(
    "INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)",
    [name.trim(), description || "", price, image || ""],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        message: "Product created successfully.",
        productId: this.lastID,
      });
    },
  );
});

router.put("/:id", requireAdmin, validateProductInput, (req, res) => {
  const { id } = req.params;
  const { name, description, price, image } = req.body;
  db.run(
    "UPDATE products SET name = ?, description = ?, price = ?, image = ? WHERE id = ?",
    [name.trim(), description || "", price, image || "", id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ message: "Product not found." });
      res.json({ message: "Product updated successfully." });
    },
  );
});

router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ message: "Product not found." });
    res.json({ message: "Product removed successfully." });
  });
});

module.exports = router;
