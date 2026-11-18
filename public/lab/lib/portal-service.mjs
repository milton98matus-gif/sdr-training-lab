import crypto from 'node:crypto';
import { recordAudit } from '../server/audit.mjs';

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const isAdmin = user => ['owner', 'admin'].includes(user.role);
const name = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').normalize('NFC') : '';
const validName = value => value.length >= 1 && value.length <= 60 && /^[\p{L}\p{M} .’'\-]+$/u.test(value) && /\p{L}/u.test(value);

export async function participantDetails(db, userId) {
  const row = await db.prepare(`
    SELECT d.*, a.name AS approved_msp, r.name AS requested_msp 
    FROM training_participant_details d 
    LEFT JOIN training_msp_accounts a ON a.id = d.approved_msp_id AND a.id != 'osr-manage'
    LEFT JOIN training_msp_accounts r ON r.id = d.requested_msp_id AND r.id != 'osr-manage'
    WHERE d.user_id = ?
  `).bind(userId).first();

  if (!row) {
    return {
      firstName: '',
      lastName: '',
      complete: false,
      requestedMspId: null,
      requestedMsp: null,
      approvedMspId: null,
      approvedMsp: null,
      verified: false,
      verifiedAt: null,
      tourCompletedAt: null
    };
  }

  // Treat 'osr-manage' as unassigned MSP (OSR Manage is parent organization)
  const approvedMspId = row.approved_msp_id === 'osr-manage' ? null : row.approved_msp_id;
  const requestedMspId = row.requested_msp_id === 'osr-manage' ? null : row.requested_msp_id;
  const approvedMsp = approvedMspId ? row.approved_msp : null;
  const requestedMsp = requestedMspId ? row.requested_msp : null;

  return {
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    complete: !!row.first_name && !!row.last_name,
    requestedMspId,
    requestedMsp,
    approvedMspId,
    approvedMsp,
    verified: row.verified_at !== null && approvedMspId !== null,
    verifiedAt: row.verified_at,
    tourCompletedAt: row.tour_completed_at,
    updatedAt: row.updated_at
  };
}

export async function participantLabel(db, row) {
  const profile = await participantDetails(db, row.user_id);
  let creds = null;
  try {
    creds = await db.prepare('SELECT organization, title, reset_requested, reset_requested_at, is_active FROM training_user_credentials WHERE user_id=?').bind(row.user_id).first();
  } catch (e) {}

  const isLeadership = ['owner', 'admin'].includes(row.role);
  const mspDisplay = isLeadership ? (profile.approvedMsp || 'All MSPs (Leadership)') : (profile.approvedMsp || 'Pending Assignment');

  return {
    id: row.user_id,
    name: profile.complete ? (profile.firstName + ' ' + profile.lastName).trim() : (row.display_name || row.email),
    email: row.email,
    role: row.role,
    isActive: creds?.is_active !== undefined ? Boolean(creds.is_active) : (row.is_active !== undefined ? Boolean(row.is_active) : true),
    joinedAt: row.created_at,
    organization: 'OSR Manage',
    msp: mspDisplay,
    title: creds?.title || (row.role === 'owner' ? 'Platform Owner' : row.role === 'admin' ? 'Reporting Administrator' : 'SDR Trainee'),
    resetRequested: !!creds?.reset_requested,
    resetRequestedAt: creds?.reset_requested_at || null,
    profile
  };
}

export async function mspAccounts(db, all = false) {
  // Never return 'osr-manage' as an ordinary MSP account
  const sql = `
    SELECT m.id, m.name, m.active, m.updated_at,
      (SELECT COUNT(*) FROM training_participant_details d JOIN training_profiles p ON p.user_id = d.user_id WHERE d.approved_msp_id = m.id AND p.role = 'participant') AS sdr_count
    FROM training_msp_accounts m
    WHERE m.id != 'osr-manage' ${all ? '' : 'AND m.active = 1'}
    ORDER BY m.name ASC
  `;
  return (await db.prepare(sql).all()).results || [];
}

export async function saveParticipant(db, userId, b) {
  const previous = await participantDetails(db, userId);
  if (b.tourCompleted === true && b.firstName === undefined) {
    await db.prepare(`
      INSERT INTO training_participant_details 
      (user_id, first_name, last_name, requested_msp_id, approved_msp_id, verified_at, verified_by, tour_completed_at, updated_at) 
      VALUES (?, '', '', NULL, NULL, NULL, NULL, ?, ?) 
      ON CONFLICT(user_id) DO UPDATE SET tour_completed_at = excluded.tour_completed_at
    `).bind(userId, Date.now(), Date.now()).run();
    return participantDetails(db, userId);
  }

  const first = name(b.firstName);
  const last = name(b.lastName);
  let requested = b.requestedMspId || null;

  if (requested === 'osr-manage') requested = null;
  if (requested !== null && (typeof requested !== 'string' || requested.length > 100)) {
    fail(400, 'Choose a valid MSP account.');
  }

  if (!validName(first) || !validName(last)) {
    fail(400, 'Enter your real first and last name using letters, spaces, or hyphens.');
  }

  if (requested && !(await db.prepare("SELECT id FROM training_msp_accounts WHERE id = ? AND active = 1 AND id != 'osr-manage'").bind(requested).first())) {
    fail(400, 'Selected MSP account is not active. Choose an active account or Not assigned yet.');
  }

  const changed = first !== previous.firstName || last !== previous.lastName || requested !== previous.requestedMspId;
  const at = Date.now();

  await db.prepare(`
    INSERT INTO training_participant_details 
    (user_id, first_name, last_name, requested_msp_id, approved_msp_id, verified_at, verified_by, tour_completed_at, updated_at) 
    VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?) 
    ON CONFLICT(user_id) DO UPDATE SET 
      first_name = excluded.first_name, 
      last_name = excluded.last_name, 
      requested_msp_id = excluded.requested_msp_id, 
      approved_msp_id = CASE WHEN ? THEN NULL ELSE training_participant_details.approved_msp_id END, 
      verified_at = CASE WHEN ? THEN NULL ELSE training_participant_details.verified_at END, 
      verified_by = CASE WHEN ? THEN NULL ELSE training_participant_details.verified_by END, 
      updated_at = excluded.updated_at
  `).bind(userId, first, last, requested, previous.tourCompletedAt || null, at, changed, changed, changed).run();

  return participantDetails(db, userId);
}

export async function verifyParticipant(db, adminUser, b) {
  if (!isAdmin(adminUser)) fail(403, 'Only administrators can verify participant assignments.');
  const targetId = typeof b?.userId === 'string' ? b.userId.trim() : '';
  if (!targetId) fail(400, 'Choose a participant to assign.');

  const person = await db.prepare('SELECT user_id, display_name FROM training_profiles WHERE user_id=?').bind(targetId).first();
  if (!person) fail(404, 'Participant not found.');

  const mspId = typeof b?.approvedMspId === 'string' ? b.approvedMspId.trim() : (typeof b?.mspId === 'string' ? b.mspId.trim() : '');
  if (!mspId) fail(400, 'Choose an approved MSP account.');
  if (mspId === 'osr-manage') fail(400, 'OSR Manage is the coordinating parent organization, not an MSP account.');

  const account = await db.prepare("SELECT id, name FROM training_msp_accounts WHERE id = ? AND active = 1 AND id != 'osr-manage'").bind(mspId).first();
  if (!account) fail(400, 'The selected MSP account is not active.');

  const at = Date.now();
  await db.prepare(`
    INSERT INTO training_participant_details 
    (user_id, first_name, last_name, requested_msp_id, approved_msp_id, verified_at, verified_by, tour_completed_at, updated_at) 
    VALUES (?, '', '', ?, ?, ?, ?, NULL, ?) 
    ON CONFLICT(user_id) DO UPDATE SET 
      approved_msp_id = excluded.approved_msp_id, 
      verified_at = excluded.verified_at, 
      verified_by = excluded.verified_by, 
      updated_at = excluded.updated_at
  `).bind(targetId, mspId, mspId, at, adminUser.user_id, at).run();

  await recordAudit(db, adminUser, 'user_msp_assigned', targetId, {
    assignedMspId: mspId,
    assignedMspName: account.name,
    targetName: person.display_name
  });

  return participantDetails(db, targetId);
}

export async function saveMspAccount(db, adminUser, b) {
  if (!isAdmin(adminUser)) fail(403, 'Only administrators can manage MSP accounts.');
  const accountName = typeof b?.name === 'string' ? b.name.trim().replace(/\s+/g, ' ') : '';
  if (accountName.length < 2 || accountName.length > 80) {
    fail(400, 'Enter an account name between 2 and 80 characters.');
  }

  const normalized = accountName.toLowerCase();
  if (normalized === 'osr manage' || normalized === 'osrmanage' || normalized === 'osr-manage') {
    fail(400, 'OSR Manage is the coordinating parent organization, not an individual MSP account.');
  }

  const active = b.active === false ? 0 : 1;
  const hasExplicitId = typeof b?.id === 'string' && Boolean(b.id.trim());
  const id = hasExplicitId
    ? b.id.trim()
    : normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  if (!id) fail(400, 'Invalid MSP account identifier.');

  const existing = await db.prepare("SELECT id, name, active FROM training_msp_accounts WHERE (normalized_name = ? OR id = ?) AND id != 'osr-manage'").bind(normalized, id).first();
  const at = Date.now();

  if (existing) {
    if (!hasExplicitId || existing.id !== id) {
      fail(409, `An MSP account named "${existing.name}" already exists.`);
    }
  }

  const isNew = !existing;
  const action = isNew ? 'msp_created' : (active === 0 ? 'msp_archived' : 'msp_restored');

  await db.prepare(`
    INSERT INTO training_msp_accounts (id, name, normalized_name, active, updated_at, updated_by) 
    VALUES (?, ?, ?, ?, ?, ?) 
    ON CONFLICT(id) DO UPDATE SET 
      name = excluded.name, 
      normalized_name = excluded.normalized_name, 
      active = excluded.active, 
      updated_at = excluded.updated_at, 
      updated_by = excluded.updated_by
  `).bind(id, accountName, normalized, active, at, adminUser.user_id).run();

  await recordAudit(db, adminUser, action, id, {
    mspId: id,
    mspName: accountName,
    active: Boolean(active)
  });

  return { id, name: accountName, active: Boolean(active) };
}

export function executiveSignal(person) {
  const p = person?.report;
  const reasons = [];

  if (!p) {
    return {
      status: 'Pending start',
      color: 'muted',
      reasons: [{ text: 'Account created · awaiting first session' }],
      nextAction: 'Sign in and explore onboarding'
    };
  }

  if (!person?.profile?.verified && person?.role === 'participant') {
    reasons.push({ text: 'MSP profile unconfirmed' });
  }
  if (p.onboarding?.openHelp) {
    reasons.push({ text: `${p.onboarding.openHelp} open question${p.onboarding.openHelp === 1 ? '' : 's'}` });
  }
  if (p.onboarding?.overdue) {
    reasons.push({ text: 'Onboarding past target date' });
  }
  if (p.onboarding?.status === 'Needs review') {
    reasons.push({ text: 'Readiness review pending' });
  }
  const tasksRemaining = Math.max(0, 5 - (p.onboarding?.tasksSubmitted || 0));
  if (tasksRemaining > 0 && person?.role === 'participant') {
    reasons.push({ text: `${tasksRemaining} applied task${tasksRemaining === 1 ? '' : 's'} remaining` });
  }

  if ((p.onboarding?.tasksSubmitted || 0) >= 5 && p.casesCompleted >= 50 && p.callsCompleted >= 3) {
    return {
      status: 'Ready for live execution',
      color: 'green',
      reasons: reasons.length ? reasons : [{ text: 'All milestones cleared' }],
      nextAction: 'Schedule first live call'
    };
  }

  if ((p.onboarding?.tasksSubmitted || 0) > 0 || p.casesCompleted > 10) {
    return {
      status: 'Active practice',
      color: 'blue',
      reasons: reasons.length ? reasons : [{ text: 'Active learning underway' }],
      nextAction: 'Complete mission simulations'
    };
  }

  return {
    status: 'Onboarding foundations',
    color: 'orange',
    reasons: reasons.length ? reasons : [{ text: 'Foundational modules in progress' }],
    nextAction: 'Finish core onboarding modules'
  };
}

export async function submitProfileChangeRequest(db, user, b) {
  const fieldName = (b?.fieldName || '').trim();
  const proposedValue = (b?.proposedValue || '').trim();
  const reason = (b?.reason || '').trim();

  if (!['firstName', 'lastName', 'email', 'requestedMspId', 'other'].includes(fieldName)) {
    fail(400, 'Choose a valid profile field to update.');
  }
  if (!proposedValue) {
    fail(400, 'Enter the proposed value for the requested correction.');
  }

  const profile = await participantDetails(db, user.user_id);
  let currentValue = '';
  if (fieldName === 'firstName') currentValue = profile.firstName;
  else if (fieldName === 'lastName') currentValue = profile.lastName;
  else if (fieldName === 'email') currentValue = user.email;
  else if (fieldName === 'requestedMspId') currentValue = profile.approvedMsp || profile.requestedMsp || 'None';
  else currentValue = b?.currentValue || '';

  const id = crypto.randomUUID();
  const at = Date.now();

  await db.prepare(`
    INSERT INTO training_profile_change_requests 
    (id, user_id, user_name, user_email, field_name, current_value, proposed_value, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).bind(id, user.user_id, user.displayName || user.email, user.email, fieldName, currentValue, proposedValue, reason, at).run();

  await recordAudit(db, user, 'profile_change_requested', id, {
    fieldName,
    proposedValue,
    reason
  });

  return {
    id,
    fieldName,
    currentValue,
    proposedValue,
    reason,
    status: 'pending',
    createdAt: at
  };
}

export async function listProfileChangeRequests(db, userId = null) {
  let sql = 'SELECT * FROM training_profile_change_requests';
  const args = [];
  if (userId) {
    sql += ' WHERE user_id = ?';
    args.push(userId);
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';

  const rows = (await db.prepare(sql).bind(...args).all()).results || [];
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    userEmail: r.user_email,
    fieldName: r.field_name,
    currentValue: r.current_value,
    proposedValue: r.proposed_value,
    reason: r.reason,
    status: r.status,
    adminNotes: r.admin_notes,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
    createdAt: r.created_at
  }));
}

export async function resolveProfileChangeRequest(db, adminUser, b) {
  if (!isAdmin(adminUser)) fail(403, 'Administrator access required.');
  const requestId = (b?.requestId || '').trim();
  const decision = (b?.decision || '').trim().toLowerCase();
  const adminNotes = (b?.adminNotes || '').trim();

  if (!requestId) fail(400, 'Missing request ID.');
  if (!['approved', 'rejected'].includes(decision)) fail(400, 'Decision must be approved or rejected.');

  const req = await db.prepare('SELECT * FROM training_profile_change_requests WHERE id = ?').bind(requestId).first();
  if (!req) fail(404, 'Profile change request not found.');
  if (req.status !== 'pending') fail(400, `This request has already been ${req.status}.`);

  const at = Date.now();

  // If approved, apply the change directly to the target record
  if (decision === 'approved') {
    if (req.field_name === 'firstName') {
      await db.prepare('UPDATE training_participant_details SET first_name = ?, updated_at = ? WHERE user_id = ?').bind(req.proposed_value, at, req.user_id).run();
      await db.prepare('UPDATE training_user_credentials SET display_name = ?, updated_at = ? WHERE user_id = ?').bind(req.proposed_value + ' ' + (await participantDetails(db, req.user_id)).lastName, at, req.user_id).run();
    } else if (req.field_name === 'lastName') {
      await db.prepare('UPDATE training_participant_details SET last_name = ?, updated_at = ? WHERE user_id = ?').bind(req.proposed_value, at, req.user_id).run();
      await db.prepare('UPDATE training_user_credentials SET display_name = ?, updated_at = ? WHERE user_id = ?').bind((await participantDetails(db, req.user_id)).firstName + ' ' + req.proposed_value, at, req.user_id).run();
    } else if (req.field_name === 'requestedMspId') {
      await db.prepare('UPDATE training_participant_details SET approved_msp_id = ?, verified_at = ?, verified_by = ?, updated_at = ? WHERE user_id = ?').bind(req.proposed_value, at, adminUser.user_id, at, req.user_id).run();
    }
  }

  await db.prepare(`
    UPDATE training_profile_change_requests 
    SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = ? 
    WHERE id = ?
  `).bind(decision, adminNotes || null, adminUser.displayName || adminUser.email, at, requestId).run();

  await recordAudit(db, adminUser, decision === 'approved' ? 'profile_change_approved' : 'profile_change_rejected', req.user_id, {
    requestId,
    fieldName: req.field_name,
    proposedValue: req.proposed_value,
    decision,
    adminNotes
  });

  return { ok: true, id: requestId, status: decision };
}

export async function listAuditLog(db, options = {}) {
  let sql = 'SELECT * FROM training_audit_log WHERE 1=1';
  const args = [];

  if (options.action) {
    sql += ' AND action = ?';
    args.push(options.action);
  }
  if (options.actorId) {
    sql += ' AND actor_id = ?';
    args.push(options.actorId);
  }
  if (options.query) {
    sql += ' AND (actor_name LIKE ? OR target_id LIKE ? OR details LIKE ?)';
    const q = `%${options.query.trim()}%`;
    args.push(q, q, q);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
  const offset = Math.max(0, Number(options.offset) || 0);
  args.push(limit, offset);

  const rows = (await db.prepare(sql).bind(...args).all()).results || [];
  return rows.map(r => ({
    id: r.id,
    actorId: r.actor_id,
    actorName: r.actor_name,
    actorRole: r.actor_role,
    targetId: r.target_id,
    action: r.action,
    details: r.details ? JSON.parse(r.details) : null,
    createdAt: r.created_at
  }));
}
