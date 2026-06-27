// Uses Node.js built-in sqlite (Node 22.5+ / Node 24)
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../trading_academy.db');

let db: DatabaseSync;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec(`PRAGMA journal_mode = WAL`);
    db.exec(`PRAGMA foreign_keys = ON`);
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      delete_requested_at TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS trade_plans (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      market_bias TEXT,
      content TEXT,
      screenshot_url TEXT,
      screenshots TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft',
      grade TEXT,
      grade_comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trade_journals (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      symbol TEXT,
      direction TEXT,
      entry_price REAL,
      exit_price REAL,
      sl REAL,
      tp REAL,
      lot_size REAL,
      pnl REAL,
      rr_ratio REAL,
      screenshot_url TEXT,
      screenshots TEXT DEFAULT '[]',
      emotion TEXT,
      discipline_score INTEGER,
      notes TEXT,
      type TEXT NOT NULL DEFAULT 'idea',
      status TEXT NOT NULL DEFAULT 'open',
      linked_plan_id TEXT REFERENCES trade_plans(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      prop_firm TEXT,
      phase TEXT DEFAULT 'funded',
      currency TEXT DEFAULT 'USD',
      initial_balance REAL NOT NULL DEFAULT 10000,
      current_balance REAL NOT NULL DEFAULT 10000,
      max_daily_loss_pct REAL DEFAULT 5,
      max_total_drawdown_pct REAL DEFAULT 10,
      profit_target_pct REAL,
      status TEXT DEFAULT 'active',
      color TEXT DEFAULT '#38bdf8',
      logo_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_filters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      page TEXT NOT NULL,
      filters_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, page)
    );

    CREATE TABLE IF NOT EXISTS spend_payout (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'spend',
      category TEXT NOT NULL DEFAULT 'other',
      amount REAL NOT NULL,
      account_id TEXT REFERENCES accounts(id),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Lịch sử các mốc migration chính thức
  const migrations = [
    {
      name: '001_add_account_types_and_payouts',
      sqls: [
        `ALTER TABLE accounts ADD COLUMN account_type TEXT DEFAULT 'prop'`,
        `ALTER TABLE accounts ADD COLUMN challenge_type TEXT DEFAULT '2phase'`,
        `ALTER TABLE accounts ADD COLUMN start_date TEXT`,
        `ALTER TABLE accounts ADD COLUMN payout_amount REAL DEFAULT 0`,
        `ALTER TABLE accounts ADD COLUMN payout_count INTEGER DEFAULT 0`,
      ],
    },
    {
      name: '002_add_trade_journals_account_id',
      sqls: [
        `ALTER TABLE trade_journals ADD COLUMN account_id TEXT REFERENCES accounts(id)`,
      ],
    },
  ];

  for (const m of migrations) {
    const exists = db.prepare(`SELECT id FROM migrations WHERE name = ?`).get(m.name);
    if (!exists) {
      for (const sql of m.sqls) {
        try { db.exec(sql); } catch { /* column might already exist from legacy safeAlter */ }
      }
      db.prepare(`INSERT INTO migrations (name) VALUES (?)`).run(m.name);
      console.log(`📦 Applied migration: ${m.name}`);
    }
  }
}
