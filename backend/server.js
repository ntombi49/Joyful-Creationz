const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Test route

app.get("/", (req, res) => {
  res.send("Event API is running");
});

// Get all events

app.get("/events", (req, res) => {
  db.all("SELECT * FROM events", [], (err, rows) => {
    if (err) {
      res.status(500).json(err);
      return;
    }
    res.json(rows);
  });
});

// Register for event

app.post("/register", (req, res) => {
  const { event_id, name, email, phone } = req.body;

  const sql = `
    INSERT INTO registrations (event_id, name, email, phone)
    VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [event_id, name, email, phone], function (err) {
    if (err) {
      res.status(500).json(err);
      return;
    }

    res.json({
      message: "Registration successful",
      id: this.lastID,
    });
  });
});

// Add a new event (Admin)

app.post("/events", (req, res) => {
  const { name, description, date, location } = req.body;

  const sql = `
    INSERT INTO events (name, description, date, location)
    VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [name, description, date, location], function (err) {
    if (err) {
      res.status(500).json(err);
      return;
    }

    res.json({
      message: "Event created successfully",
      eventId: this.lastID,
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
