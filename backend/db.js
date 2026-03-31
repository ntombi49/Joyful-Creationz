const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database/database.db", (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
  } else {
    console.log("Connected to SQLite database");

    // Creating Users table
    db.run(
      `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            whatsapp TEXT
        )
      `,
      (err) => {
        if (err) {
          console.error("Error creating users table:", err.message);
        } else {
          console.log("Users table ready");
        }
      },
    );

    // Creating Products table
    db.run(
      `
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            image TEXT
        )
      `,
      (err) => {
        if (err) {
          console.error("Error creating products table:", err.message);
        } else {
          console.log("Products table ready");
        }
      },
    );

    // Creating Orders table
    db.run(
      `
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            order_date TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
      `,
      (err) => {
        if (err) {
          console.error("Error creating orders table:", err.message);
        } else {
          console.log("Orders table ready");
        }
      },
    );

    // Creating Events table
    db.run(
      `
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            event_date TEXT NOT NULL,
            location TEXT
        )
      `,
      (err) => {
        if (err) {
          console.error("Error creating events table:", err.message);
        } else {
          console.log("Events table ready");
        }
      },
    );
  }
});

module.exports = db;
