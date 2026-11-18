import crypto from 'node:crypto';

export async function recordAudit(db, actor, action, targetId, details = null) {
  try {
    const at = Date.now();
    const id = crypto.randomUUID();
    const actorId = actor?.userId || actor?.user_id || actor?.id || 'system';
    const actorName = actor?.displayName || actor?.display_name || actor?.name || actor?.email || 'System';
    const actorRole = actor?.role || 'system';

    let cleanDetails = null;
    if (details && typeof details === 'object') {
      const copy = { ...details };
      // Strip any sensitive data
      delete copy.password;
      delete copy.newPassword;
      delete copy.password_hash;
      delete copy.salt;
      delete copy.token;
      delete copy.sessionToken;
      delete copy.verification_code;
      cleanDetails = JSON.stringify(copy);
    } else if (typeof details === 'string') {
      cleanDetails = details;
    }

    await db.prepare(`
      INSERT INTO training_audit_log 
      (id, actor_id, actor_name, actor_role, target_id, action, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, actorId, actorName, actorRole, targetId || null, action, cleanDetails, at).run();

    return id;
  } catch (err) {
    console.error('[Audit Log Error]', err.message);
    return null;
  }
}
