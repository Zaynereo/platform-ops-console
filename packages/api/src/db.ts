import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { DB_PATH } from "./config.js";
import { seedDatabase } from "./seed.js";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    migrate(db);
    const count = db.prepare("SELECT COUNT(*) AS c FROM deliveries").get() as { c: number };
    if (count.c === 0) {
      seedDatabase(db);
    }
  }
  return db;
}

export function resetDbForTests(): Database.Database {
  if (db) {
    db.close();
    db = null;
  }
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  return getDb();
}

function migrate(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      destination TEXT NOT NULL,
      status TEXT NOT NULL,
      attempt_count INTEGER NOT NULL,
      last_attempt_at TEXT,
      created_at TEXT NOT NULL,
      payload_preview TEXT NOT NULL,
      error_message TEXT,
      provenance TEXT NOT NULL DEFAULT 'SYNTHETIC_FIXTURE'
    );

    CREATE TABLE IF NOT EXISTS dead_letters (
      id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL REFERENCES deliveries(id),
      event_type TEXT NOT NULL,
      destination TEXT NOT NULL,
      failed_at TEXT NOT NULL,
      reason TEXT NOT NULL,
      replay_eligible INTEGER NOT NULL,
      provenance TEXT NOT NULL DEFAULT 'SYNTHETIC_FIXTURE'
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at TEXT NOT NULL,
      provenance TEXT NOT NULL DEFAULT 'SYNTHETIC_FIXTURE'
    );

    CREATE TABLE IF NOT EXISTS replay_idempotency (
      idempotency_key TEXT PRIMARY KEY,
      dead_letter_id TEXT NOT NULL,
      delivery_id TEXT NOT NULL,
      actor TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
    CREATE INDEX IF NOT EXISTS idx_deliveries_event_type ON deliveries(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
  `);
}
