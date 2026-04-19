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

function ensureColumn(table, column, definition) {
  db.all(`PRAGMA table_info(${table})`, [], (err, columns) => {
    if (err) {
      console.error(`Error checking ${table}.${column}:`, err.message);
      return;
    }

    const hasColumn = columns.some((existingColumn) => existingColumn.name === column);
    if (!hasColumn) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (alterErr) => {
        if (alterErr) {
          console.error(`Error adding ${table}.${column}:`, alterErr.message);
        }
      });
    }
  });
}

// Create tables if they don't exist
db.serialize(() => {
  // Events table
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      date TEXT,
      time TEXT,
      location TEXT,
      image TEXT
    )
  `);

  ensureColumn("events", "time", "TEXT");

  // Registrations table
  db.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      name TEXT,
      email TEXT,
      phone TEXT,
      food_allergies TEXT,
      additional_info TEXT,
      registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
      paid INTEGER DEFAULT 0,
      ticket_sent INTEGER DEFAULT 0
    )
  `);

  ensureColumn("registrations", "food_allergies", "TEXT");
  ensureColumn("registrations", "additional_info", "TEXT");

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

  // Partners table
  db.run(`
    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      logo TEXT
    )
  `);

  ensureColumn("partners", "facebook_url", "TEXT");
  ensureColumn("partners", "tiktok_url", "TEXT");

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
