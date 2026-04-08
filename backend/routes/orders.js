const express = require("express");
const router = express.Router();
const db = require("../db");

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

router.post("/", async (req, res) => {
  const {
    product_id,
    quantity,
    customer_name,
    customer_email,
    customer_phone,
  } = req.body;

  // Get product details
  db.get(
    "SELECT name, price FROM products WHERE id = ?",
    [product_id],
    async (err, product) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!product)
        return res.status(404).json({ message: "Product not found" });

      const total = product.price * quantity;

      db.run(
        "INSERT INTO orders (product_id, quantity, customer_name, customer_email, customer_phone, total) VALUES (?, ?, ?, ?, ?, ?)",
        [
          product_id,
          quantity,
          customer_name,
          customer_email,
          customer_phone,
          total,
        ],
        async function (err) {
          if (err) return res.status(500).json({ error: err.message });

          // Send WhatsApp notification
          try {
            const message = `🛒 New Order!\n\nProduct: ${product.name}\nQuantity: ${quantity}\nTotal: $${total}\n\nCustomer: ${customer_name}\nEmail: ${customer_email}\nPhone: ${customer_phone}`;
            await sendWhatsAppMessage(message);
          } catch (whatsappErr) {
            console.error("WhatsApp send failed:", whatsappErr);
            // Don't fail the order if WhatsApp fails
          }

          res.json({ id: this.lastID, message: "Order placed successfully" });
        },
      );
    },
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.run(
    "UPDATE orders SET status = ? WHERE id = ?",
    [status, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ message: "Order not found" });
      res.json({ message: "Order updated successfully" });
    },
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM orders WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order deleted successfully" });
  });
});

// WhatsApp sending function using CallMeBot (free service)
async function sendWhatsAppMessage(message) {
  const phoneNumber = process.env.ADMIN_PHONE || "1234567890"; // Replace with admin phone
  const apiKey = process.env.CALLMEBOT_API_KEY || "your-api-key"; // Get from https://www.callmebot.com/

  const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumber}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status}`);
    }
    console.log("WhatsApp message sent successfully");
  } catch (error) {
    console.error("Failed to send WhatsApp:", error);
    throw error;
  }
}

module.exports = router;
