const sqlite3 = require("sqlite3").verbose();

// Connecting to SQLite database
const db = new sqlite3.Database("./database/database.db", (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});

module.exports = db;
