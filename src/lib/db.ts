import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@/drizzle/schema";
import path from "path";

// Database file path
const dbPath = path.join(process.cwd(), "veritas.db");

// Lazy initialization to avoid database connection during build
let _sqlite: Database.Database | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _initialized = false;

function getSqlite(): Database.Database {
  if (!_sqlite) {
    _sqlite = new Database(dbPath);
    _sqlite.pragma("journal_mode = WAL");
  }
  return _sqlite;
}

function getDb() {
  if (!_db) {
    _db = drizzle(getSqlite(), { schema });
    initializeDatabase();
  }
  return _db;
}

// Initialize tables if they don't exist
function initializeDatabase() {
  if (_initialized) return;

  const sqlite = getSqlite();
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT NOT NULL,
      photo_url TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      severity TEXT NOT NULL DEFAULT 'medium',
      suggested_department TEXT,
      triage_explanation TEXT,
      triage_title TEXT,
      session_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      embedding BLOB
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      prev_hash TEXT,
      hash TEXT NOT NULL,
      solana_tx_signature TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      messages TEXT NOT NULL,
      intent TEXT,
      extracted_data TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report_votes (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report_subscriptions (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  _initialized = true;
}

// Export a proxy that lazily initializes
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(target, prop) {
    const realDb = getDb();
    const value = (realDb as any)[prop];
    if (typeof value === "function") {
      return value.bind(realDb);
    }
    return value;
  },
});

export const sqlite = new Proxy({} as Database.Database, {
  get(target, prop) {
    const realSqlite = getSqlite();
    const value = (realSqlite as any)[prop];
    if (typeof value === "function") {
      return value.bind(realSqlite);
    }
    return value;
  },
});
