const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "joyful123";

app.use(cors());
app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "public", "images")));
app.use("/api/events", require("./routes/events"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/users", require("./routes/users"));
app.use("/api/partners", require("./routes/partners"));
app.use("/api/registrations", require("./routes/registrations"));
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

function validateEventInput(req, res, next) {
  const { name, date, location } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Event name is required." });
  }
  if (!date || !date.trim()) {
    return res.status(400).json({ message: "Event date is required." });
  }
  if (!location || !location.trim()) {
    return res.status(400).json({ message: "Event location is required." });
  }
  next();
}

function validateRegistrationInput(req, res, next) {
  const { event_id, name, email, phone } = req.body;
  if (!event_id) {
    return res.status(400).json({ message: "Event ID is required." });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Your name is required." });
  }
  if (!email || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res
      .status(400)
      .json({ message: "A valid email address is required." });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ message: "Phone number is required." });
  }

  db.get("SELECT id FROM events WHERE id = ?", [event_id], (err, row) => {
    if (err) {
      return res.status(500).json({ message: "Unable to validate event." });
    }
    if (!row) {
      return res
        .status(400)
        .json({ message: "Selected event does not exist." });
    }
    next();
  });
}

app.get("/events", (req, res) => {
  db.all("SELECT * FROM events ORDER BY date ASC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Unable to load events." });
    }
    res.json(rows);
  });
});

app.post("/events", validateEventInput, (req, res) => {
  const { name, description, date, location } = req.body;
  const sql = `INSERT INTO events (name, description, date, location) VALUES (?, ?, ?, ?)`;

  db.run(
    sql,
    [name.trim(), description || "", date.trim(), location.trim()],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Unable to create event." });
      }
      res.json({
        message: "Event created successfully.",
        eventId: this.lastID,
      });
    },
  );
});

app.put("/events/:id", validateEventInput, (req, res) => {
  const { id } = req.params;
  const { name, description, date, location } = req.body;
  const sql = `UPDATE events SET name = ?, description = ?, date = ?, location = ? WHERE id = ?`;

  db.run(
    sql,
    [name.trim(), description || "", date.trim(), location.trim(), id],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Unable to update event." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Event not found." });
      }
      res.json({ message: "Event updated successfully." });
    },
  );
});

app.delete("/events/:id", (req, res) => {
  const { id } = req.params;
  const deleteRegistrations = `DELETE FROM registrations WHERE event_id = ?`;
  const deleteEvent = `DELETE FROM events WHERE id = ?`;

  db.run(deleteRegistrations, [id], (err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Unable to remove event registrations." });
    }
    db.run(deleteEvent, [id], function (deleteErr) {
      if (deleteErr) {
        return res.status(500).json({ message: "Unable to remove event." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Event not found." });
      }
      res.json({ message: "Event removed successfully." });
    });
  });
});

app.post("/register", validateRegistrationInput, (req, res) => {
  const { event_id, name, email, phone } = req.body;
  const sql = `INSERT INTO registrations (event_id, name, email, phone) VALUES (?, ?, ?, ?)`;

  db.run(
    sql,
    [event_id, name.trim(), email.trim(), phone.trim()],
    function (err) {
      if (err) {
        return res
          .status(500)
          .json({ message: "Unable to submit registration." });
      }
      res.json({ message: "Registration successful.", id: this.lastID });
    },
  );
});

app.get("/registrations", (req, res) => {
  const sql = `
    SELECT r.id, r.name, r.email, r.phone, e.name AS event_name, e.date AS event_date
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    ORDER BY r.registered_at DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Unable to load registrations." });
    }
    res.json(rows);
  });
});

app.delete("/registrations/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM registrations WHERE id = ?", [id], function (err) {
    if (err) {
      return res
        .status(500)
        .json({ message: "Unable to remove registration." });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "Registration not found." });
    }
    res.json({ message: "Registration removed successfully." });
  });
});

app.get("/registrations/export", (req, res) => {
  const sql = `
    SELECT r.id, r.name, r.email, r.phone, e.name AS event_name, e.date AS event_date, r.registered_at
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    ORDER BY r.registered_at DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Unable to export registrations." });
    }

    const headers = [
      "Registration ID",
      "Name",
      "Email",
      "Phone",
      "Event",
      "Event Date",
      "Registered At",
    ];
    const csv = [headers.join(",")]
      .concat(
        rows.map((row) =>
          [
            row.id,
            row.name,
            row.email,
            row.phone,
            `"${row.event_name.replace(/"/g, '""')}"`,
            row.event_date,
            row.registered_at,
          ].join(","),
        ),
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=registrations.csv",
    );
    res.send(csv);
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
