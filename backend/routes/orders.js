const express = require("express");
const router = express.Router();
const db = require("../db");
const { sendAdminAlert } = require("../services/whatsapp");

function validateOrderInput(req, res, next) {
  const { product_id, quantity, customer_name, customer_email, customer_phone } =
    req.body;

  if (!product_id) {
    return res.status(400).json({ message: "Product ID is required." });
  }

  const numericQuantity = Number(quantity);
  if (!Number.isInteger(numericQuantity) || numericQuantity < 1) {
    return res.status(400).json({ message: "Quantity must be at least 1." });
  }

  if (!customer_name || !customer_name.trim()) {
    return res.status(400).json({ message: "Customer name is required." });
  }
  if (
    !customer_email ||
    !customer_email.trim() ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)
  ) {
    return res
      .status(400)
      .json({ message: "A valid customer email is required." });
  }
  if (!customer_phone || !customer_phone.trim()) {
    return res.status(400).json({ message: "Customer phone is required." });
  }

  req.body.quantity = numericQuantity;
  next();
}

router.get("/", (req, res) => {
  db.all(
    `
    SELECT o.*, p.name as product_name, p.price
    FROM orders o
    JOIN products p ON o.product_id = p.id
    ORDER BY o.order_date DESC
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

router.post("/", validateOrderInput, async (req, res) => {
  const {
    product_id,
    quantity,
    customer_name,
    customer_email,
    customer_phone,
  } = req.body;

  db.get(
    "SELECT name, price FROM products WHERE id = ?",
    [product_id],
    async (err, product) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!product) {
        return res.status(404).json({ message: "Product not found." });
      }

      const total = product.price * quantity;

      db.run(
        "INSERT INTO orders (product_id, quantity, customer_name, customer_email, customer_phone, total) VALUES (?, ?, ?, ?, ?, ?)",
        [
          product_id,
          quantity,
          customer_name.trim(),
          customer_email.trim(),
          customer_phone.trim(),
          total,
        ],
        async function (runErr) {
          if (runErr) return res.status(500).json({ error: runErr.message });

          try {
            const adminTo =
              process.env.WHATSAPP_ADMIN_TO || process.env.ADMIN_PHONE;
            if (adminTo) {
              const message = `New Order!\n\nProduct: ${product.name}\nQuantity: ${quantity}\nTotal: R${total}\n\nCustomer: ${customer_name}\nEmail: ${customer_email}\nPhone: ${customer_phone}`;
              await sendAdminAlert(adminTo, message);
            }
          } catch (whatsappErr) {
            console.error("WhatsApp send failed:", whatsappErr);
          }

          res.json({ id: this.lastID, message: "Order placed successfully." });
        },
      );
    },
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const normalizedStatus = status === "completed" ? "completed" : "pending";

  db.run(
    "UPDATE orders SET status = ? WHERE id = ?",
    [normalizedStatus, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ message: "Order not found." });
      res.json({ message: "Order updated successfully." });
    },
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM orders WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ message: "Order not found." });
    res.json({ message: "Order removed successfully." });
  });
});

module.exports = router;
