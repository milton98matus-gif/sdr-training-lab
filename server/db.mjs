import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './auth.mjs';
import { restoreFromCloud } from './persistence.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let DatabaseSyncClass = null;

try {
  const sqlite = await import('node:sqlite');
  DatabaseSyncClass = sqlite.DatabaseSync;
} catch (e) {
  // If node:sqlite is not natively available, import bridge
  const bridge = await import('./sqlite-bridge.mjs');
  DatabaseSyncClass = bridge.DatabaseSync;
}

export const SEEDED_ACCOUNTS = [
  // Owners
  {
    name: 'Milton Matus',
    email: 'milton98matus@gmail.com',
    title: 'Owner',
    role: 'owner',
    organization: 'OSR Manage'
  },
  {
    name: 'Milton Matus',
    email: 'mmatus@osrmanage.com',
    title: 'Owner',
    role: 'owner',
    organization: 'OSR Manage'
  },
  // Admins
  {
    name: 'Allison Trisko',
    email: 'atrisko@osrmanage.com',
    title: 'Sales Director',
    role: 'admin',
    organization: 'OSR Manage'
  },
  {
    name: 'Tim McNeil',
    email: 'tmcneil@osrmanage.com',
    title: 'COO',
    role: 'admin',
    organization: 'OSR Manage'
  },
  {
    name: 'Allyson Rogers',
    email: 'arogers@osrmanage.com',
    title: 'Human Resources Director',
    role: 'admin',
    organization: 'OSR Manage'
  },
  {
    name: 'Robb Rogers',
    email: 'rrogers@osrmanage.com',
    title: 'CEO',
    role: 'admin',
    organization: 'OSR Manage'
  },
  {
    name: 'Sara Alvarez',
    email: 'salvarez@osrmanage.com',
    title: 'HR Manager',
    role: 'admin',
    organization: 'OSR Manage'
  }
];

export async function seedInitialUsers(db, defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || 'OSRlab2026!') {
  const at = Date.now();
  for (const acc of SEEDED_ACCOUNTS) {
    const email = acc.email.toLowerCase();
    const userId = `usr_${Buffer.from(email).toString('hex').slice(0, 24)}`;
    
    // Check if credentials exist
    const existingCreds = await db.prepare('SELECT user_id, password_hash, salt FROM training_user_credentials WHERE email = ?').bind(email).first();
    if (!existingCreds) {
      const { hash, salt } = hashPassword(defaultPassword);
      await db.prepare(`
        INSERT INTO training_user_credentials 
        (user_id, email, display_name, organization, title, password_hash, salt, reset_requested, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        ON CONFLICT(user_id) DO NOTHING
      `).bind(userId, email, acc.name, acc.organization, acc.title, hash, salt, at, at).run();
    }

    // Check or insert profile
    const existingProfile = await db.prepare('SELECT user_id, role FROM training_profiles WHERE user_id = ?').bind(userId).first();
    if (!existingProfile) {
      await db.prepare(`
        INSERT INTO training_profiles 
        (user_id, email, display_name, role, created_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET role = excluded.role, display_name = excluded.display_name
      `).bind(userId, email, acc.name, acc.role, at, at).run();
    } else if (existingProfile.role !== acc.role && acc.role === 'owner') {
      await db.prepare('UPDATE training_profiles SET role = ? WHERE user_id = ?').bind('owner', userId).run();
    }

    // Ensure organization is registered in training_msp_accounts
    const mspId = acc.organization.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'osr-manage';
    await db.prepare(`
      INSERT INTO training_msp_accounts (id, name, normalized_name, active, updated_at, updated_by)
      VALUES (?, ?, ?, 1, ?, 'system-seed')
      ON CONFLICT(id) DO NOTHING
    `).bind(mspId, acc.organization, acc.organization.toLowerCase(), at).run();

    // Participant details
    const [firstName, ...rest] = acc.name.split(' ');
    const lastName = rest.join(' ') || 'OSR';
    await db.prepare(`
      INSERT INTO training_participant_details
      (user_id, first_name, last_name, requested_msp_id, approved_msp_id, verified_at, verified_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET requested_msp_id = excluded.requested_msp_id, approved_msp_id = excluded.approved_msp_id, verified_at = excluded.verified_at, updated_at = excluded.updated_at
    `).bind(userId, firstName, lastName, mspId, mspId, at, 'system-seed', at).run();
  }
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
      _getSqlAndArgs() { return { sql, args }; },
      bind(...values) {
        const flat = values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
        return statement(sql, flat);
      },
      async run() {
        const r = await sqlite.prepare(sql).run(...args);
        return { success: true, meta: { changes: Number(r?.changes || 0) } };
      },
      async first() {
        const row = await sqlite.prepare(sql).get(...args);
        return row !== undefined ? row : null;
      },
      async all() {
        const rows = await sqlite.prepare(sql).all(...args);
        return { results: rows || [] };
      }
    };
  }

  const db = {
    prepare: statement,
    async batch(statements) {
      if (typeof sqlite.batch === 'function') {
        const stmts = statements.map(s => s._getSqlAndArgs ? s._getSqlAndArgs() : null).filter(Boolean);
        if (stmts.length === statements.length) {
          return sqlite.batch(stmts);
        }
      }
      try { sqlite.exec('BEGIN'); } catch {}
      try {
        const results = [];
        for (const s of statements) {
          results.push(await s.run());
        }
        try { sqlite.exec('COMMIT'); } catch {}
        return results;
      } catch (e) {
        try { sqlite.exec('ROLLBACK'); } catch {}
        throw e;
      }
    },
    close() {
      if (typeof sqlite.close === 'function') sqlite.close();
    }
  };

  // Seed default accounts asynchronously without blocking
  seedInitialUsers(db).then(() => restoreFromCloud(db)).catch(err => console.error('Init/Restore error:', err));

  return db;
}
