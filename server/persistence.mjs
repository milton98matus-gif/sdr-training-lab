const BACKUP_FILENAME = 'sdr_lab_backup.json';
const BACKUP_DESCRIPTION = 'SDR_LAB_AUTO_BACKUP_DB';

const TABLES = [
  'training_msp_accounts',
  'training_user_credentials',
  'training_profiles',
  'training_participant_details',
  'training_role_audit',
  'training_snapshots',
  'training_assignments',
  'training_onboarding_entries',
  'training_readiness_reviews',
  'training_ai_reviews',
  'training_portal_sessions',
  'training_time_buckets',
  'training_section_time_buckets',
  'training_game_runs',
  'training_events',
  'training_audit_log',
  'training_profile_change_requests'
];

let cachedGistId = process.env.GITHUB_GIST_ID || null;
let syncTimer = null;
let syncInProgress = false;
let pendingSync = false;
let lastSyncAt = null;
let lastSyncError = null;

function getGithubToken() {
  return (process.env.GITHUB_BACKUP_TOKEN || '').trim();
}

export function getPersistenceStatus() {
  const token = getGithubToken();
  return {
    cloudEnabled: Boolean(token),
    provider: token ? 'github-gist' : 'local-and-browser',
    gistId: cachedGistId,
    lastSyncAt,
    lastSyncError
  };
}

export async function exportDatabase(db) {
  const tables = {};
  for (const table of TABLES) {
    try {
      const colInfo = (await db.prepare(`PRAGMA table_info(${table})`).all()).results || [];
      const colNames = colInfo.map(c => c.name);
      if (!colNames.length) continue;
      const selectSql = `SELECT ${colNames.map(c => `"${c}"`).join(', ')} FROM "${table}"`;
      const rows = (await db.prepare(selectSql).all()).results || [];
      tables[table] = rows;
    } catch (err) {
      console.error(`[Persistence] Failed to export table ${table}:`, err.message);
    }
  }
  return {
    version: 1,
    exportedAt: Date.now(),
    tables
  };
}

export async function importDatabase(db, backup) {
  if (!backup || typeof backup !== 'object' || !backup.tables) {
    throw new Error('Invalid backup format.');
  }

  let totalRestored = 0;
  for (const table of TABLES) {
    const rows = backup.tables[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const colInfo = (await db.prepare(`PRAGMA table_info(${table})`).all()).results || [];
    const validCols = colInfo.map(c => c.name);
    if (!validCols.length) continue;

    const placeholders = validCols.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO "${table}" (${validCols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

    const statements = [];
    for (const row of rows) {
      const values = validCols.map(col => (row[col] !== undefined ? row[col] : null));
      statements.push(db.prepare(sql).bind(values));
    }

    // Batch in chunks of 200 statements
    for (let i = 0; i < statements.length; i += 200) {
      await db.batch(statements.slice(i, i + 200));
    }
    totalRestored += rows.length;
  }

  return { restoredRows: totalRestored, exportedAt: backup.exportedAt || null };
}

async function findOrCreateBackupGist(token) {
  if (cachedGistId) return cachedGistId;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'SDR-Training-Lab-Persistence'
  };

  // Search existing gists for our backup file or description
  const listRes = await fetch('https://api.github.com/gists?per_page=100', { headers });
  if (listRes.ok) {
    const gists = await listRes.json();
    const match = gists.find(g => g.description === BACKUP_DESCRIPTION || (g.files && g.files[BACKUP_FILENAME]));
    if (match) {
      cachedGistId = match.id;
      return cachedGistId;
    }
  }

  // Create new private gist
  const createRes = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: BACKUP_DESCRIPTION,
      public: false,
      files: {
        [BACKUP_FILENAME]: {
          content: JSON.stringify({ version: 1, exportedAt: Date.now(), tables: {} })
        }
      }
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`GitHub Gist creation failed (${createRes.status}): ${errText}`);
  }

  const created = await createRes.json();
  cachedGistId = created.id;
  return cachedGistId;
}

export async function restoreFromCloud(db) {
  const token = getGithubToken();
  if (!token) return { restored: false, reason: 'no_token' };

  try {
    const gistId = await findOrCreateBackupGist(token);
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'SDR-Training-Lab-Persistence'
    };

    const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch Gist ${gistId}: ${res.status}`);

    const gist = await res.json();
    const file = gist.files?.[BACKUP_FILENAME];
    if (!file) return { restored: false, reason: 'empty_gist' };

    let content = file.content;
    if (file.truncated && file.raw_url) {
      const rawRes = await fetch(file.raw_url, { headers });
      content = await rawRes.text();
    }

    if (!content) return { restored: false, reason: 'no_content' };
    const backup = JSON.parse(content);
    if (!backup?.tables || Object.keys(backup.tables).length === 0) {
      return { restored: false, reason: 'initial_empty_gist' };
    }

    const result = await importDatabase(db, backup);
    lastSyncAt = Date.now();
    lastSyncError = null;
    console.log(`[Persistence] Restored ${result.restoredRows} rows from GitHub Cloud Gist (${gistId})`);
    return { restored: true, ...result };
  } catch (err) {
    lastSyncError = err.message;
    console.error('[Persistence] Cloud restore error:', err.message);
    return { restored: false, error: err.message };
  }
}

export async function syncToCloudNow(db) {
  const token = getGithubToken();
  if (!token) return { synced: false, reason: 'no_token' };

  if (syncInProgress) {
    pendingSync = true;
    return { synced: false, reason: 'in_progress' };
  }

  syncInProgress = true;
  try {
    const gistId = await findOrCreateBackupGist(token);
    const snapshot = await exportDatabase(db);
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'SDR-Training-Lab-Persistence'
    };

    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        description: BACKUP_DESCRIPTION,
        files: {
          [BACKUP_FILENAME]: {
            content: JSON.stringify(snapshot)
          }
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub Gist sync failed (${res.status}): ${errText}`);
    }

    lastSyncAt = Date.now();
    lastSyncError = null;
    return { synced: true, gistId, lastSyncAt };
  } catch (err) {
    lastSyncError = err.message;
    console.error('[Persistence] Cloud sync error:', err.message);
    return { synced: false, error: err.message };
  } finally {
    syncInProgress = false;
    if (pendingSync) {
      pendingSync = false;
      scheduleCloudSync(db, 3000);
    }
  }
}

export function scheduleCloudSync(db, delayMs = 4000) {
  if (!getGithubToken()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncToCloudNow(db).catch(() => {});
  }, delayMs);
}
