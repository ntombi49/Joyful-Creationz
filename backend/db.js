const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database path
const dbPath = path.join(__dirname, "database", "database.db");

// Connect to SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Create tables if they don't exist
db.serialize(() => {
  // Events table
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      date TEXT,
      location TEXT
    )
  `);

  // Registrations table
  db.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      name TEXT,
      email TEXT,
      phone TEXT,
      registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
      paid INTEGER DEFAULT 0,
      ticket_sent INTEGER DEFAULT 0
    )
  `);

  // Add payment tracking columns if they don't exist
  db.run(
    `ALTER TABLE registrations ADD COLUMN paid INTEGER DEFAULT 0`,
    (err) => {
      if (err && !err.message.includes("duplicate column name"))
        console.error("Alter table error:", err);
    },
  );
  db.run(
    `ALTER TABLE registrations ADD COLUMN ticket_sent INTEGER DEFAULT 0`,
    (err) => {
      if (err && !err.message.includes("duplicate column name"))
        console.error("Alter table error:", err);
    },
  );

  // Products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL,
      image TEXT
    )
  `);

  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      password TEXT
    )
  `);

  // Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      order_date TEXT DEFAULT CURRENT_TIMESTAMP,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      total REAL,
      status TEXT DEFAULT 'pending'
    )
  `);

  // Add new columns if they don't exist (for existing databases)
  db.run(`ALTER TABLE orders ADD COLUMN customer_name TEXT`, (err) => {
    if (err && !err.message.includes("duplicate column name"))
      console.error("Alter table error:", err);
  });
  db.run(`ALTER TABLE orders ADD COLUMN customer_email TEXT`, (err) => {
    if (err && !err.message.includes("duplicate column name"))
      console.error("Alter table error:", err);
  });
  db.run(`ALTER TABLE orders ADD COLUMN customer_phone TEXT`, (err) => {
    if (err && !err.message.includes("duplicate column name"))
      console.error("Alter table error:", err);
  });
  db.run(`ALTER TABLE orders ADD COLUMN total REAL`, (err) => {
    if (err && !err.message.includes("duplicate column name"))
      console.error("Alter table error:", err);
  });
  db.run(
    `ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'pending'`,
    (err) => {
      if (err && !err.message.includes("duplicate column name"))
        console.error("Alter table error:", err);
    },
  );

  // Partners table
  db.run(`
    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      logo TEXT
    )
  `);

  // Tickets table
  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER UNIQUE,
      ticket_number TEXT UNIQUE NOT NULL,
      qr_code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sent_at TEXT,
      scanned INTEGER DEFAULT 0
    )
  `);
});

module.exports = db;
