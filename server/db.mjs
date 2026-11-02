import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let DatabaseSyncClass = null;

try {
  const sqlite = await import('node:sqlite');
  DatabaseSyncClass = sqlite.DatabaseSync;
} catch (e) {
  // If node:sqlite is not natively available, import our bridge
  const bridge = await import('/tmp/sqlite_sync.mjs');
  DatabaseSyncClass = bridge.DatabaseSync;
}

export function createDatabase(dbLocation = ':memory:') {
  const sqlite = new DatabaseSyncClass(dbLocation);

  // Apply Drizzle migrations in alphabetical order
  const drizzleDir = path.resolve(__dirname, '../drizzle');
  if (fs.existsSync(drizzleDir)) {
    const migrationFiles = fs.readdirSync(drizzleDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const file of migrationFiles) {
      const sqlContent = fs.readFileSync(path.join(drizzleDir, file), 'utf8');
      try {
        sqlite.exec(sqlContent);
      } catch (err) {
        // If tables already exist, ignore duplication errors
        const msg = String(err).toLowerCase();
        if (!msg.includes('already exists')) {
          console.error(`Migration error on ${file}:`, err);
        }
      }
    }
  }

  function statement(sql, args = []) {
    return {
      bind(...values) {
        const flat = values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
        return statement(sql, flat);
      },
      async run() {
        const r = sqlite.prepare(sql).run(...args);
        return { success: true, meta: { changes: Number(r.changes) } };
      },
      async first() {
        const row = sqlite.prepare(sql).get(...args);
        return row !== undefined ? row : null;
      },
      async all() {
        const rows = sqlite.prepare(sql).all(...args);
        return { results: rows || [] };
      }
    };
  }

  const db = {
    prepare: statement,
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const s of statements) {
          results.push(await s.run());
        }
        sqlite.exec('COMMIT');
        return results;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
    close() {
      if (typeof sqlite.close === 'function') sqlite.close();
    }
  };

  return db;
}
