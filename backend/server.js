const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON requests

// Test route
app.get("/", (req, res) => {
  res.send("Event API is running");
});

// GET all events
app.get("/events", (req, res) => {
  db.all("SELECT * FROM events", [], (err, rows) => {
    if (err) {
      return res.status(500).json(err);
    }
    res.json(rows);
  });
});

// POST new event (Admin)
app.post("/events", (req, res) => {
  const { name, description, date, location } = req.body;

  const sql = `
    INSERT INTO events (name, description, date, location)
    VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [name, description, date, location], function (err) {
    if (err) return res.status(500).json(err);

    res.json({
      message: "Event created successfully",
      eventId: this.lastID,
    });
  });
});

// POST registration
app.post("/register", (req, res) => {
  const { event_id, name, email, phone } = req.body;

  const sql = `
    INSERT INTO registrations (event_id, name, email, phone)
    VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [event_id, name, email, phone], function (err) {
    if (err) return res.status(500).json(err);

    res.json({
      message: "Registration successful",
      id: this.lastID,
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
