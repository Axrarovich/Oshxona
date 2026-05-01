const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'kitchen.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Ma'lumotlar bazasiga ulanishda xato:", err);
  } else {
    console.log("✅ SQLite ma'lumotlar bazasiga ulangan");
  }
});

// Initialize database with tables
const initializeDatabase = () => {
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');

    // Products table
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        unit TEXT NOT NULL,
        purchase_price REAL NOT NULL,
        quantity REAL NOT NULL DEFAULT 0,
        piece_weight_kg REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Lightweight migration for products
    db.all(`PRAGMA table_info(products)`, (err, columns) => {
      if (err) return;
      const hasPieceWeight = (columns || []).some((c) => c?.name === 'piece_weight_kg');
      if (!hasPieceWeight) {
        db.run('ALTER TABLE products ADD COLUMN piece_weight_kg REAL');
      }
    });

    // Recipes table
    db.run(`
      CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        meal_type TEXT CHECK(meal_type IN ('breakfast', 'lunch', 'dinner')),
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Recipe items table
    db.run(`
      CREATE TABLE IF NOT EXISTS recipe_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity_needed REAL NOT NULL,
        unit TEXT NOT NULL,
        FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    // Daily logs table
    db.run(`
      CREATE TABLE IF NOT EXISTS daily_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity_used REAL NOT NULL,
        recipe_id INTEGER,
        consumption_id INTEGER,
        date DATE NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY(consumption_id) REFERENCES consumption(id) ON DELETE CASCADE
      )
    `);

    // Migration for daily_logs: add consumption_id if it doesn't exist
    db.all(`PRAGMA table_info(daily_logs)`, (err, columns) => {
      if (err) return;
      const hasConsumptionId = (columns || []).some((c) => c?.name === 'consumption_id');
      if (!hasConsumptionId) {
        db.run('ALTER TABLE daily_logs ADD COLUMN consumption_id INTEGER');
      }
    });

    // Consumption table
    db.run(`
      CREATE TABLE IF NOT EXISTS consumption (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id INTEGER NOT NULL,
        meal_type TEXT CHECK(meal_type IN ('breakfast', 'lunch', 'dinner')),
        date DATE NOT NULL,
        expected_people INTEGER NOT NULL,
        actual_people INTEGER,
        leftovers REAL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      )
    `);

    // Wastage table
    db.run(`
      CREATE TABLE IF NOT EXISTS wastage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity_wasted REAL NOT NULL,
        reason TEXT,
        date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    // Expenses table
    db.run(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        product_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
      )
    `);

    console.log("✅ Ma'lumotlar bazasi jadvallari ishga tushirildi");
  });
};

// Utility functions
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const getAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const closeDatabase = () => {
  db.close((err) => {
    if (err) console.error(err);
    else console.log("Ma'lumotlar bazasiga ulanish uzildi");
  });
};

module.exports = {
  db,
  initializeDatabase,
  runQuery,
  getOne,
  getAll,
  closeDatabase
};
