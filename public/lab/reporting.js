'use strict';
const Reporting = (() => {
  const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dt = t => t ? new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Managua' }) : 'No practice recorded';
  
  let people = [], accounts = [], auditLogs = [], profileRequests = [];
  let query = '', topic = '', days = 'all', selected = null, loadingId = 0, requestedUser = null;
  let roleFilter = 'all', mspFilter = '', fromDate = '', toDate = '';
  let activeTab = 'overview', canManageRoles = false, currentUserRole = 'participant';
  let auditFilterAction = '', auditQuery = '';

  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';

  function periodBounds() {
    const end = Date.now();
    if (days === 'all') return { from: null, to: end };
    if (days === 'today') return { from: Date.parse(new Date(end - 21600000).toISOString().slice(0, 10) + 'T00:00:00-06:00'), to: end };
    if (days === 'custom') {
      const from = Date.parse(fromDate + 'T00:00:00-06:00'), to = Math.min(end, Date.parse(toDate + 'T23:59:59.999-06:00'));
      if (!Number.isFinite(from) || !Number.isFinite(to) || from > to || to - from > 90 * 86400000) throw new Error('Choose a valid date range of up to 90 days.');
      return { from, to };
    }
    return { from: end - Number(days) * 86400000, to: end };
  }

  function periodLabel() {
    return days === 'all' ? 'All time' : days === 'today' ? 'Today' : days === 'custom' ? fromDate + ' through ' + toDate : 'Last ' + days + ' days';
  }

  function filters() {
    const p = new URLSearchParams(), r = periodBounds();
    if (r.from !== null) p.set('from', String(r.from));
    p.set('to', String(r.to));
    if (topic) p.set('topic', topic);
    return p;
  }

  function error(message) {
    const el = document.querySelector('#main');
    if (!el) return;
    el.innerHTML = `<section class="report-empty"><span class="eyebrow orange">ADMIN PORTAL</span><h1>Portal is temporarily unavailable.</h1><p>${h(message)}</p><div style="display:flex;gap:10px;"><a class="button" href="#onboarding">Return to Training →</a> <button class="button secondary" data-admin-action="refresh">Try Again ↻</button></div></section>`;
  }

  function stats(r) {
    return `<div class="report-stats">
      <div><small>Cases practiced</small><strong>${r.casesCompleted}<span> / ${r.totalCases}</span></strong><p>${r.casesViewed} cases opened</p></div>
      <div><small>Full calls completed</small><strong>${r.callsCompleted}<span> / ${r.totalCalls}</span></strong><p>${r.callRuns} completed runs</p></div>
      <div><small>First-decision alignment</small><strong>${pct(r.firstAligned, r.firstDecisions)}</strong><p>${r.firstAligned} of ${r.firstDecisions} first decisions</p></div>
      <div><small>Latest-decision alignment</small><strong>${pct(r.latestAligned, r.firstDecisions)}</strong><p>Latest attempt per practiced case</p></div>
    </div>`;
  }

  function topicTable(r) {
    return `<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Topic</th><th>Items opened</th><th>Items practiced</th><th>First decisions aligned</th><th>Latest call decisions to revisit</th></tr></thead><tbody>${r.topics.length ? r.topics.map(t => `<tr><td>${h(t.name)}</td><td>${t.viewed}</td><td>${t.practiced}</td><td>${t.firstDecisions ? t.firstAligned + ' / ' + t.firstDecisions : '—'}</td><td>${t.callDecisions ? t.callGaps + ' / ' + t.callDecisions : '—'}</td></tr>`).join('') : '<tr><td colspan="5">No topics recorded yet. Start a practice case or full call.</td></tr>'}</tbody></table></div>`;
  }

  function onboardingStrip(person, r, adminView) {
    const o = r.onboarding;
    if (!o) return '';
    return '<section class="ob-summary-strip"><span class="ob-status">' + h(o.status) + '</span><p>' + o.unitsChecked + ' / ' + o.totalUnits + ' lessons checked · ' + o.tasksSubmitted + ' / ' + o.totalTasks + ' applied submissions · ' + o.openHelp + ' open questions' + (o.diagnosticScore != null ? '<br>Starting point: ' + o.diagnosticScore + ' / ' + o.diagnosticMax + ' · Context practice: ' + o.contextualChecks + ' / 9 submitted' : '') + '<br><small>All-time onboarding milestones</small></p>' + (adminView ? '<button class="text-button" data-ob-admin="' + h(person.id) + '">Open onboarding and review →</button>' : '<a class="text-button" href="#onboarding">Continue my onboarding →</a>') + '</section>';
  }

  function record(person, r, adminView = false) {
    return `<div class="report-record-heading">
      <div>
        <span class="eyebrow orange">${adminView ? 'PARTICIPANT TRAINING RECORD' : 'YOUR TRAINING SUMMARY'}</span>
        <h1>${h(person.name)}</h1>
        <p>${h(person.email)} · ${h(person.organization || 'OSR Manage')} · Assigned MSP: <strong>${h(PortalInsights.msp(person))}</strong> · Latest learning: ${dt(r.activity?.lastSubmitted)}</p>
      </div>
      <div class="report-actions">
        ${adminView ? '<button class="button secondary" data-report="back">← All participants</button>' : ''}
        <button class="button secondary" data-report="jump-time">Portal time ↓</button>
        <button class="button accent" data-report="print">Print / Save PDF</button>
      </div>
    </div>
    <div class="report-capture-note">
      <strong>Training practice record</strong>
      <span>Generated ${dt(Date.now())} · ${h(periodLabel())}${topic ? ' · ' + h(topic) : ''}</span>
      <p>Decisions submitted: ${r.firstDecisions} / ${r.totalDecisions}. Practice aligns with learning and coaching feedback, not a live SDR production quota.</p>
    </div>
    ${onboardingStrip(person, r, adminView)}
    ${stats(r)}
    ${PortalInsights.games(r.games)}
    <div id="portal-time-record"></div>
    <div id="activity-log"></div>
    <section class="content-card">
      <h2>Topics explored and practiced</h2>
      <p class="report-muted">${r.vocabularyOpened} / ${r.totalVocabulary} vocabulary entries opened.</p>
      ${topicTable(r)}
    </section>
    <div class="report-two">
      <section class="content-card">
        <h2>Practice next</h2>
        ${r.suggestions.length ? r.suggestions.slice(0, 5).map(s => `<div class="report-suggestion"><strong>${h(s.topic)}</strong><p>${s.latestGaps} of ${s.latestDecisions} latest case decisions to revisit${s.callDecisions ? ` · ${s.callGaps} of ${s.callDecisions} full-call decisions to revisit` : ''}.</p><a class="text-button" href="#lab">Open the practice lab ↗</a></div>`).join('') : '<p class="report-muted">No reinforcement signals yet. Complete more practice to build evidence.</p>'}
      </section>
      <section class="content-card">
        <h2>Behavior observations</h2>
        <p class="report-muted">Based on first response choices in scenario practice.</p>
        ${r.criteria.map(c => `<div class="report-criterion"><span>${h(c.name)}</span><strong>${c.observations ? c.points + ' / ' + c.possible : '—'}</strong><small>${c.observations} observations</small></div>`).join('')}
      </section>
    </div>`;
  }

  // Personal Training Record view (accessible to SDRs and Admins)
  async function training(userId = null) {
    const token = ++loadingId;
    document.querySelector('#main').innerHTML = '<p class="report-loading" role="status">Loading training record…</p>';
    try {
      await Training.flush();
      await SessionTiming.flush();
      if (!Training.user) throw new Error('Please sign in to view your training record.');
      const p = filters();
      if (userId) p.set('user', userId);
      const r = await Training.api('/api/report?' + p);
      if (token !== loadingId || !['training', 'reporting', 'admin'].includes(location.hash.slice(1))) return;
      selected = userId;
      document.querySelector('#main').innerHTML = `<div class="reporting-page">${record(r.person, r.report, !!userId)}</div>`;
      PortalTime.mount(r.person.id, days, periodBounds());
      ActivityLog.mount(r.person.id, days, periodBounds());
    } catch (e) {
      if (token === loadingId) error(e.message);
    }
  }

  // Admin Portal Navigation Tabs
  function renderAdminTabs() {
    const pendingReqCount = profileRequests.filter(r => r.status === 'pending').length;
    return `
      <div class="admin-portal-tabs" role="tablist">
        <button class="admin-tab ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview">📊 Overview</button>
        <button class="admin-tab ${activeTab === 'reports' ? 'active' : ''}" data-tab="reports">📈 Training Reports</button>
        <button class="admin-tab ${activeTab === 'users' ? 'active' : ''}" data-tab="users">👥 User Management</button>
        <button class="admin-tab ${activeTab === 'msps' ? 'active' : ''}" data-tab="msps">🏢 MSP Accounts</button>
        <button class="admin-tab ${activeTab === 'admins' ? 'active' : ''}" data-tab="admins">🛡️ Administrators</button>
        <button class="admin-tab ${activeTab === 'requests' ? 'active' : ''}" data-tab="requests">📝 Profile Requests ${pendingReqCount > 0 ? `<span class="badge-count">${pendingReqCount}</span>` : ''}</button>
        <button class="admin-tab ${activeTab === 'audit' ? 'active' : ''}" data-tab="audit">📜 Audit Log</button>
      </div>
    `;
  }

  function filteredPeople() {
    const q = query.trim().toLowerCase();
    return people.filter(p => {
      const roleMatch = roleFilter === 'all' || 
        (roleFilter === 'participant' && p.role === 'participant') || 
        (roleFilter === 'administrators' && ['admin', 'owner'].includes(p.role));
      const mspMatch = !mspFilter || PortalInsights.msp(p) === mspFilter;
      const textMatch = !q || [p.name, p.email, PortalInsights.msp(p)].join(' ').toLowerCase().includes(q);
      return roleMatch && mspMatch && textMatch;
    });
  }

  // Tab 1: Overview Render
  function renderOverviewTab() {
    const trainees = people.filter(p => p.role === 'participant');
    const totalCases = trainees.reduce((acc, p) => acc + (p.report?.casesCompleted || 0), 0);
    const totalCalls = trainees.reduce((acc, p) => acc + (p.report?.callsCompleted || 0), 0);
    const totalHours = Math.round(people.reduce((acc, p) => acc + (p.report?.presence?.connectedMs || 0), 0) / 3600000 * 10) / 10;
    const activeMsps = accounts.filter(a => a.active && a.id !== 'osr-manage').length;

    return `
      <div class="admin-overview-grid">
        <div class="overview-stat-card">
          <small>Trainees Enrolled</small>
          <strong>${trainees.length}</strong>
          <span>SDR participants across all accounts</span>
        </div>
        <div class="overview-stat-card">
          <small>Client MSP Accounts</small>
          <strong>${activeMsps}</strong>
          <span>Coordinated through OSR Manage</span>
        </div>
        <div class="overview-stat-card">
          <small>Practice Completed</small>
          <strong>${totalCases} <span>cases</span> · ${totalCalls} <span>calls</span></strong>
          <span>Submitted training simulations</span>
        </div>
        <div class="overview-stat-card">
          <small>Total Portal Time</small>
          <strong>${totalHours} <span style="font-size:18px;">hrs</span></strong>
          <span>Verified active session presence</span>
        </div>
      </div>
      <div id="report-overview"></div>
    `;
  }

  // Tab 2: Reports Tab
  function renderReportsTab(topics) {
    const activeMsps = accounts.filter(a => a.id !== 'osr-manage');
    return `
      <div class="report-toolbar">
        <label>People
          <select id="report-role-filter">
            <option value="all" ${roleFilter === 'all' ? 'selected' : ''}>Everyone (All roles)</option>
            <option value="participant" ${roleFilter === 'participant' ? 'selected' : ''}>SDRs / participants</option>
            <option value="administrators" ${roleFilter === 'administrators' ? 'selected' : ''}>Administrators &amp; Owners</option>
          </select>
        </label>
        <label>Search Trainee
          <input type="search" id="report-search" value="${h(query)}" placeholder="Search name or email…">
        </label>
        <label>MSP Client
          <select id="report-msp">
            <option value="">All MSP Accounts</option>
            ${activeMsps.map(m => `<option value="${h(m.name)}" ${m.name === mspFilter ? 'selected' : ''}>${h(m.name)}${!m.active ? ' · Archived' : ''}</option>`).join('')}
          </select>
        </label>
        <label>Period
          <select id="report-period">
            <option value="all" ${days === 'all' ? 'selected' : ''}>All time</option>
            <option value="today" ${days === 'today' ? 'selected' : ''}>Today</option>
            <option value="7" ${days === '7' ? 'selected' : ''}>Last 7 days</option>
            <option value="30" ${days === '30' ? 'selected' : ''}>Last 30 days</option>
            <option value="90" ${days === '90' ? 'selected' : ''}>Last 90 days</option>
            <option value="custom" ${days === 'custom' ? 'selected' : ''}>Custom dates</option>
          </select>
        </label>
        <label>Topic
          <select id="report-topic">
            <option value="">All topics</option>
            ${(topics || []).map(t => `<option ${t === topic ? 'selected' : ''}>${h(t)}</option>`).join('')}
          </select>
        </label>
        ${days === 'custom' ? `
          <label>From<input type="date" id="report-from" value="${h(fromDate)}"></label>
          <label>Through<input type="date" id="report-to" value="${h(toDate)}"></label>
          <button class="button secondary" data-report="apply-dates">Apply dates</button>
        ` : ''}
      </div>

      <section class="content-card">
        <div class="report-section-heading">
          <h2>Trainee Performance &amp; Practice Matrix</h2>
          <span id="report-count" role="status"></span>
        </div>
        <div class="report-table-wrap">
          <table class="report-table">
            <thead>
              <tr>
                <th>Participant &amp; MSP</th>
                <th>Onboarding Route</th>
                <th>Cases</th>
                <th>Full Calls</th>
                <th>First Alignment</th>
                <th>Reinforcement</th>
                <th>Activity Signals</th>
                <th>Portal Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="report-people"></tbody>
          </table>
        </div>
      </section>
    `;
  }

  // Tab 3: User Management Tab
  function renderUsersTab() {
    const list = filteredPeople();
    return `
      <section class="content-card">
        <div class="report-section-heading">
          <div>
            <h2>User Account Governance</h2>
            <p class="report-muted" style="margin-top:4px;">Manage accounts, assign client MSPs, provision temporary credentials, or deactivate trainees without destroying historical learning records.</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="button accent" data-report="open-create-user">➕ Provision User</button>
          </div>
        </div>

        <div class="report-table-wrap" style="margin-top:16px;">
          <table class="report-table">
            <thead>
              <tr>
                <th>Account Identity</th>
                <th>Assigned MSP</th>
                <th>Role</th>
                <th>Status</th>
                <th>Enrolled Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.length ? list.map(p => `
                <tr>
                  <td>
                    <strong>${h(p.name)}</strong>
                    <small>${h(p.email)}</small>
                  </td>
                  <td>
                    <strong>${h(PortalInsights.msp(p))}</strong>
                    <small>${p.profile?.verified ? '✓ Verified' : 'Pending Confirmation'}</small>
                  </td>
                  <td>
                    <span class="role-badge ${p.role}">${p.role === 'owner' ? 'Owner' : p.role === 'admin' ? 'Administrator' : 'SDR Trainee'}</span>
                  </td>
                  <td>
                    ${p.isActive !== false ? '<span style="color:#86efac;font-weight:700;">● Active</span>' : '<span style="color:#f87171;font-weight:700;">● Deactivated</span>'}
                  </td>
                  <td>
                    <small>${new Date(p.joinedAt).toLocaleDateString()}</small>
                  </td>
                  <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button class="text-button" data-pwd-reset-id="${h(p.id)}" data-pwd-reset-name="${h(p.name)}" data-pwd-reset-role="${h(p.role)}">🔑 Reset Pass</button>
                      <button class="text-button" data-edit-user-id="${h(p.id)}">✏️ Edit / MSP</button>
                      ${p.role === 'participant' ? `
                        <button class="text-button" data-toggle-active-id="${h(p.id)}" data-current-active="${p.isActive !== false}" style="color:${p.isActive !== false ? '#f87171' : '#86efac'};">
                          ${p.isActive !== false ? 'Deactivate' : 'Reactivate'}
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="6">No users found matching current filter criteria.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  // Tab 4: MSP Accounts Tab
  function renderMspsTab() {
    const list = accounts.filter(a => a.id !== 'osr-manage');
    return `
      <section class="content-card">
        <div class="report-section-heading">
          <div>
            <h2>Centralized MSP Account Registry</h2>
            <p class="report-muted" style="margin-top:4px;">Manage partner and client MSP accounts. Archiving removes an account from new assignments while preserving 100% of historical training records.</p>
          </div>
          <button class="button accent" data-insights="accounts">➕ Add New MSP</button>
        </div>

        <div class="msp-hierarchy-notice">
          <strong>Organizational Hierarchy</strong>
          <p><strong>OSR Manage</strong> is the coordinating parent organization. SDRs represent individual client MSPs (e.g. Advantage, JIG). OSR Manage is not an MSP account.</p>
        </div>

        <div class="report-table-wrap" style="margin-top:16px;">
          <table class="report-table">
            <thead>
              <tr>
                <th>MSP Account Name</th>
                <th>System ID</th>
                <th>Status</th>
                <th>Assigned SDRs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.length ? list.map(m => `
                <tr>
                  <td><strong>${h(m.name)}</strong></td>
                  <td><code>${h(m.id)}</code></td>
                  <td>${m.active ? '<span class="status-pill active">Active · Assignable</span>' : '<span class="status-pill archived">Archived · History Preserved</span>'}</td>
                  <td><strong>${m.sdr_count || 0}</strong> SDR${m.sdr_count === 1 ? '' : 's'}</td>
                  <td>
                    <button class="text-button" data-account-toggle="${h(m.id)}">${m.active ? 'Archive Account' : 'Restore Account'}</button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="5">No client MSP accounts registered yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  // Tab 5: Administrators Tab
  function renderAdminsTab() {
    const admins = people.filter(p => ['owner', 'admin'].includes(p.role));
    return `
      <section class="content-card">
        <div class="report-section-heading">
          <div>
            <h2>Administrative Access &amp; Governance</h2>
            <p class="report-muted" style="margin-top:4px;">Administrators can review cohort reports, export learning data, and provision SDR users. Only the Platform Owner can manage administrator privileges.</p>
          </div>
          <button class="button accent" data-report="open-add-admin">➕ Appoint Administrator</button>
        </div>

        <div class="report-table-wrap" style="margin-top:16px;">
          <table class="report-table">
            <thead>
              <tr>
                <th>Administrator Name</th>
                <th>Work Email</th>
                <th>Administrative Level</th>
                <th>Account Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${admins.map(a => `
                <tr>
                  <td><strong>${h(a.name)}</strong></td>
                  <td>${h(a.email)}</td>
                  <td><span class="role-badge ${a.role}">${a.role === 'owner' ? 'Platform Owner' : 'Reporting Administrator'}</span></td>
                  <td><span style="color:#86efac;font-weight:700;">● Authorized</span></td>
                  <td>
                    ${currentUserRole === 'owner' && a.role === 'admin' ? `
                      <button class="text-button" data-role-user="${h(a.id)}" data-new-role="participant" style="color:#f87171;">Remove Administrator Role</button>
                    ` : currentUserRole === 'owner' && a.id !== Training.user?.id ? `
                      <button class="text-button" data-role-user="${h(a.id)}" data-new-role="admin">Demote to Admin</button>
                    ` : a.role === 'owner' ? '<small style="color:#94a3b8;">Primary Platform Owner</small>' : '<small style="color:#94a3b8;">Protected</small>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  // Tab 6: Profile Change Requests Tab
  function renderRequestsTab() {
    return `
      <section class="content-card">
        <div class="report-section-heading">
          <div>
            <h2>Trainee Profile Correction Requests</h2>
            <p class="report-muted" style="margin-top:4px;">Review and resolve correction requests submitted by trainees. Approving automatically applies verified updates to the participant profile and logs an audit record.</p>
          </div>
          <button class="button secondary" data-report="refresh-requests">Refresh Requests ↻</button>
        </div>

        <div class="report-table-wrap" style="margin-top:16px;">
          <table class="report-table">
            <thead>
              <tr>
                <th>Trainee</th>
                <th>Field to Correct</th>
                <th>Current Value</th>
                <th>Proposed Correction</th>
                <th>Reason / Explanation</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Review Action</th>
              </tr>
            </thead>
            <tbody>
              ${profileRequests.length ? profileRequests.map(r => `
                <tr>
                  <td>
                    <strong>${h(r.userName)}</strong>
                    <small>${h(r.userEmail)}</small>
                  </td>
                  <td><code>${h(r.fieldName)}</code></td>
                  <td><small>${h(r.currentValue || 'None')}</small></td>
                  <td><strong>${h(r.proposedValue)}</strong></td>
                  <td><p style="margin:0;font-size:11px;color:#cbd5e1;">${h(r.reason || 'None provided')}</p></td>
                  <td><small>${new Date(r.createdAt).toLocaleString()}</small></td>
                  <td>
                    <span class="status-pill ${r.status}">
                      ${h(r.status.toUpperCase())}
                    </span>
                    ${r.adminNotes ? `<small style="display:block;margin-top:4px;color:#94a3b8;">Note: ${h(r.adminNotes)}</small>` : ''}
                  </td>
                  <td>
                    ${r.status === 'pending' ? `
                      <div style="display:flex;gap:6px;">
                        <button class="button accent" style="padding:4px 8px;font-size:11px;" data-pcr-action="approved" data-pcr-id="${h(r.id)}">Approve</button>
                        <button class="button secondary" style="padding:4px 8px;font-size:11px;" data-pcr-action="rejected" data-pcr-id="${h(r.id)}">Reject</button>
                      </div>
                    ` : `<small style="color:#94a3b8;">Resolved by ${h(r.reviewedBy || 'Admin')}</small>`}
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="8">No profile correction requests recorded.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  // Tab 7: Audit Log Tab
  function renderAuditTab() {
    return `
      <section class="content-card">
        <div class="report-section-heading">
          <div>
            <h2>Centralized Governance Audit Trail</h2>
            <p class="report-muted" style="margin-top:4px;">Append-only server-side security log. Sensitive credentials and passwords are never logged.</p>
          </div>
          <button class="button secondary" data-report="refresh-audit">Refresh Audit Trail ↻</button>
        </div>

        <div style="display:flex;gap:12px;margin:16px 0;align-items:center;">
          <label style="font-size:12px;color:#94a3b8;">Action Filter:
            <select id="audit-filter-action" style="padding:8px;background:#0b1730;border:1px solid #243c78;border-radius:6px;color:#fff;font-size:12px;margin-left:6px;">
              <option value="">All Governance Actions</option>
              <option value="user_created" ${auditFilterAction === 'user_created' ? 'selected' : ''}>User Provisioned</option>
              <option value="user_updated" ${auditFilterAction === 'user_updated' ? 'selected' : ''}>User Updated</option>
              <option value="user_deactivated" ${auditFilterAction === 'user_deactivated' ? 'selected' : ''}>User Deactivated</option>
              <option value="user_reactivated" ${auditFilterAction === 'user_reactivated' ? 'selected' : ''}>User Reactivated</option>
              <option value="user_role_changed" ${auditFilterAction === 'user_role_changed' ? 'selected' : ''}>Role Changed</option>
              <option value="user_msp_assigned" ${auditFilterAction === 'user_msp_assigned' ? 'selected' : ''}>MSP Assigned</option>
              <option value="password_reset_completed" ${auditFilterAction === 'password_reset_completed' ? 'selected' : ''}>Password Reset</option>
              <option value="msp_created" ${auditFilterAction === 'msp_created' ? 'selected' : ''}>MSP Created</option>
              <option value="msp_archived" ${auditFilterAction === 'msp_archived' ? 'selected' : ''}>MSP Archived</option>
              <option value="profile_change_approved" ${auditFilterAction === 'profile_change_approved' ? 'selected' : ''}>Profile Change Approved</option>
              <option value="profile_change_rejected" ${auditFilterAction === 'profile_change_rejected' ? 'selected' : ''}>Profile Change Rejected</option>
            </select>
          </label>
        </div>

        <div class="report-table-wrap">
          <table class="report-table">
            <thead>
              <tr>
                <th>Timestamp (UTC / Local)</th>
                <th>Actor (Administrator)</th>
                <th>Action Event</th>
                <th>Target ID</th>
                <th>Non-Sensitive Details</th>
              </tr>
            </thead>
            <tbody>
              ${auditLogs.length ? auditLogs.map(l => `
                <tr>
                  <td>
                    <strong>${new Date(l.createdAt).toLocaleTimeString()}</strong>
                    <small>${new Date(l.createdAt).toLocaleDateString()}</small>
                  </td>
                  <td>
                    <strong>${h(l.actorName)}</strong>
                    <small>${h(l.actorRole)} (${h(l.actorId)})</small>
                  </td>
                  <td><span class="audit-action-tag">${h(l.action)}</span></td>
                  <td><code>${h(l.targetId || 'N/A')}</code></td>
                  <td>
                    <div style="font-size:11px;color:#cbd5e1;max-width:320px;overflow:hidden;text-overflow:ellipsis;">
                      ${l.details ? Object.entries(l.details).map(([k, v]) => `<strong>${h(k)}:</strong> ${h(v)}`).join(' · ') : '—'}
                    </div>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="5">No audit records logged yet matching criteria.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  // Draw People Table for Reports Tab
  function drawPeople() {
    const list = filteredPeople();
    const countEl = document.querySelector('#report-count');
    if (countEl) countEl.textContent = `${list.length} participant${list.length === 1 ? '' : 's'}`;

    const overviewEl = document.querySelector('#report-overview');
    if (overviewEl) overviewEl.innerHTML = PortalInsights.cohort(list);

    const tbody = document.querySelector('#report-people');
    if (!tbody) return;

    tbody.innerHTML = list.length ? list.map(p => `
      <tr>
        <td>
          <strong>${h(p.name)}</strong>
          <small>${h(p.email)} · ${p.role === 'owner' ? '<span class="role-badge owner">OWNER</span>' : p.role === 'admin' ? '<span class="role-badge admin">ADMIN</span>' : '<span class="role-badge participant">LEARNER</span>'}</small>
          <small>${h(PortalInsights.msp(p))} · ${p.profile?.verified ? 'Profile confirmed' : 'Profile pending'}</small>
          <button class="text-button" data-profile-person="${h(p.id)}">Confirm profile / MSP</button>
        </td>
        <td>
          ${h(p.report?.onboarding?.status || 'Not started')}
          <small>${p.report?.onboarding?.unitsChecked || 0} / 18 lessons · ${p.report?.onboarding?.tasksSubmitted || 0} / 5 applied</small>
          <div class="ob-queue">${p.report?.onboarding?.openHelp ? '<span>Needs help</span>' : ''}${p.report?.onboarding?.overdue ? '<span>Past due</span>' : ''}${p.report?.onboarding?.status === 'Needs review' ? '<span>Review ready</span>' : ''}</div>
          <button class="text-button" data-ob-admin="${h(p.id)}">Onboarding ↗</button>
        </td>
        <td>${p.report?.casesCompleted || 0} / 84</td>
        <td>${p.report?.callsCompleted || 0} / 3</td>
        <td>${pct(p.report?.firstAligned || 0, p.report?.firstDecisions || 0)}<small>${p.report?.firstDecisions || 0} decisions</small></td>
        <td>${[...new Set([p.report?.onboarding?.nextRecommendedTopic, ...(p.report?.onboarding?.reinforcement || []).map(u => u.title), ...(p.report?.suggestions || []).map(s => s.topic)].filter(Boolean))].slice(0, 2).map(h).join(', ') || 'No signal yet'}</td>
        <td>
          <strong>${h(p.report?.activity?.status || 'No activity in this period')}</strong>
          <small>${p.report?.activity?.submissions || 0} submissions · ${p.report?.activity?.practiceDays || 0} practice day${p.report?.activity?.practiceDays === 1 ? '' : 's'}</small>
          <small>${dt(p.report?.activity?.lastSubmitted)}</small>
        </td>
        <td>
          <strong>${(p.report?.presence?.connectedMs || p.report?.presence?.sessions) ? PortalTime.duration(p.report?.presence?.connectedMs || 0) : 'Not recorded'}</strong>
          <small>Interaction: ${(p.report?.presence?.interactionMs || p.report?.presence?.sessions) ? PortalTime.duration(p.report?.presence?.interactionMs || 0) : '—'}</small>
          <small>${h(p.report?.presence?.status || 'Not recorded yet')}</small>
        </td>
        <td>
          <button class="text-button" data-report-user="${h(p.id)}">View record ↗</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="9">No matching participants found. Adjust your search or filters above.</td></tr>';
  }

  // Master Admin Portal view
  async function admin() {
    if (requestedUser) {
      const id = requestedUser;
      requestedUser = null;
      return training(id);
    }
    const token = ++loadingId;
    const mainEl = document.querySelector('#main');
    if (!mainEl) return;

    mainEl.innerHTML = '<p class="report-loading" role="status">Loading Admin Portal intelligence…</p>';
    try {
      if (!['owner', 'admin'].includes(Training.user?.role)) {
        throw new Error('This administrative area is restricted to authorized platform administrators.');
      }

      // Fetch master data
      const result = await Training.api('/api/admin/users?' + filters());
      if (token !== loadingId || !['training', 'reporting', 'admin'].includes(location.hash.slice(1))) return;

      people = result.people || [];
      accounts = (result.accounts || []).filter(a => a.id !== 'osr-manage');
      canManageRoles = result.canManageRoles;
      currentUserRole = result.currentUserRole || Training.user?.role || 'admin';

      PortalInsights.setPeople(people);
      PortalInsights.setAccounts(accounts);
      selected = null;

      // Also asynchronously fetch profile requests and audit logs
      try {
        profileRequests = (await Training.api('/api/admin/profile-requests')).requests || [];
      } catch (e) { profileRequests = []; }

      try {
        auditLogs = (await Training.api('/api/admin/audit?limit=50')).logs || [];
      } catch (e) { auditLogs = []; }

      renderAdminPortal(result.topics);
    } catch (e) {
      if (token === loadingId) error(e.message);
    }
  }

  function renderAdminPortal(topics) {
    const mainEl = document.querySelector('#main');
    if (!mainEl) return;

    let tabContentHtml = '';
    if (activeTab === 'overview') tabContentHtml = renderOverviewTab();
    else if (activeTab === 'reports') tabContentHtml = renderReportsTab(topics);
    else if (activeTab === 'users') tabContentHtml = renderUsersTab();
    else if (activeTab === 'msps') tabContentHtml = renderMspsTab();
    else if (activeTab === 'admins') tabContentHtml = renderAdminsTab();
    else if (activeTab === 'requests') tabContentHtml = renderRequestsTab();
    else if (activeTab === 'audit') tabContentHtml = renderAuditTab();

    const activeMspOptions = accounts.filter(a => a.active && a.id !== 'osr-manage');

    mainEl.innerHTML = `
      <div class="reporting-page">
        <div class="report-record-heading">
          <div>
            <span class="eyebrow orange">ADMIN PORTAL · OSR MANAGE GOVERNANCE</span>
            <h1>Administrative Operations &amp; Intelligence</h1>
            <p>Manage learning records, user accounts, client MSPs, and governance audit trails.</p>
          </div>
          <div class="report-actions">
            <button class="button accent" data-report="open-create-user">➕ Provision User</button>
            <button class="button secondary" data-report="open-backup">💾 Backup / Restore</button>
            <button class="button secondary" data-admin-action="refresh">Refresh ↻</button>
            <button class="button accent" data-report="csv">Export filtered CSV ↓</button>
          </div>
        </div>

        ${renderAdminTabs()}

        <div id="admin-tab-body" style="margin-top:20px;">
          ${tabContentHtml}
        </div>

        <!-- CREATE USER DIALOG -->
        <dialog id="report-create-user-dialog" class="admin-dialog">
          <div class="dialog-top">
            <span class="eyebrow">USER PROVISIONING</span>
            <button class="icon-button" data-report="close-create-user">×</button>
          </div>
          <h2 style="font-size:20px;margin-bottom:6px;color:#fff;">Provision Trainee or Administrator</h2>
          <p style="font-size:12px;color:#94a3b8;margin-bottom:14px;">Create an account with direct password credentials. Trainees are assigned to client MSP accounts.</p>
          <div id="create-user-error" style="display:none;background:rgba(239,68,68,0.2);color:#fca5a5;padding:8px 12px;border-radius:6px;font-size:13px;margin-bottom:12px;"></div>
          <form id="create-user-form" style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label style="display:block;font-size:12px;margin-bottom:4px;color:#94a3b8;">Full Name</label>
              <input type="text" id="cu-name" required placeholder="First and last name" style="width:100%;padding:10px;background:#0b1730;border:1px solid #243c78;border-radius:6px;color:#fff;">
            </div>
            <div>
              <label style="display:block;font-size:12px;margin-bottom:4px;color:#94a3b8;">Work Email Address</label>
              <input type="email" id="cu-email" required placeholder="username@osrmanage.com" style="width:100%;padding:10px;background:#0b1730;border:1px solid #243c78;border-radius:6px;color:#fff;">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px;color:#94a3b8;">Assigned MSP Account</label>
                <select id="cu-msp" style="width:100%;padding:10px;background:#0b1730;border:1px solid #243c78;border-radius:6px;color:#fff;">
                  <option value="">Not assigned yet (Pending)</option>
                  ${activeMspOptions.map(m => `<option value="${h(m.id)}">${h(m.name)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="display:block;font-size:12px;margin-bottom:4px;color:#94a3b8;">Role</label>
                <select id="cu-role" style="width:100%;padding:10px;background:#0b1730;border:1px solid #243c78;border-radius:6px;color:#fff;">
                  <option value="participant">Learner (SDR Trainee)</option>
                  <option value="admin">Administrator (Reporting)</option>
                  ${currentUserRole === 'owner' ? '<option value="owner">Owner (Full Platform Access)</option>' : ''}
                </select>
              </div>
            </div>
            <div>
              <label style="display:block;font-size:12px;margin-bottom:4px;color:#94a3b8;">Initial Password</label>
              <div style="display:flex;gap:8px;">
                <input type="text" id="cu-password" required value="OSRlab2026!" style="flex:1;padding:10px;background:#0b1730;border:1px solid #243c78;border-radius:6px;color:#fff;font-family:monospace;">
                <button type="button" class="button secondary" style="padding:8px 12px;font-size:12px;" onclick="document.getElementById('cu-password').value='OSR-'+Math.floor(100000+Math.random()*900000)+'!';" title="Generate random password">Generate</button>
              </div>
            </div>
            <div id="cu-credentials-card" style="display:none;background:#0b1730;border:1px solid #22c55e;border-radius:8px;padding:14px;margin-top:8px;">
              <p style="color:#86efac;font-size:13px;font-weight:700;margin-bottom:8px;">✅ User provisioned successfully</p>
              <textarea id="cu-copy-text" readonly style="width:100%;height:80px;background:#132247;border:1px solid #243c78;color:#e2e8f0;font-size:12px;padding:8px;border-radius:4px;resize:none;font-family:monospace;"></textarea>
              <button type="button" class="button accent" style="width:100%;margin-top:8px;" onclick="navigator.clipboard.writeText(document.getElementById('cu-copy-text').value);this.textContent='Copied to clipboard!';">Copy credentials to share</button>
            </div>
            <div class="dialog-actions" style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px;">
              <button type="button" class="button secondary" data-report="close-create-user">Close</button>
              <button type="submit" id="cu-submit-btn" class="button accent">Create User</button>
            </div>
          </form>
        </dialog>

        <!-- EDIT USER DIALOG -->
        <dialog id="report-edit-user-dialog" class="admin-dialog">
          <div class="dialog-top">
            <span class="eyebrow">USER GOVERNANCE</span>
            <button class="icon-button" data-admin-action="close-edit-user">×</button>
          </div>
          <h2 style="font-size:20px;margin-bottom:8px;color:#fff;">Edit User Profile &amp; Assignment</h2>
          <form id="edit-user-form" style="display:flex;flex-direction:column;gap:12px;">
            <input type="hidden" id="edit-user-id">
            <div>
              <label style="display:block;font-size:12px;margin-bottom:4px;color:#94a3b8;">Full Name</label>
              <input type="text" id="edit-user-name" required style="width:100%;padding:10px;background:#0b1730;border:1px solid #243c78;border-radius:6px;color:#fff;">
            </div>
            <div>
              <label style="display:block;font-size:12px;margin-bottom:4px;color:#94a3b8;">Assigned MSP Account</label>
              <select id="edit-user-msp" style="width:100%;padding:10px;background:#0b1730;border:1px solid #243c78;border-radius:6px;color:#fff;">
                <option value="">Unassigned (Pending)</option>
                ${activeMspOptions.map(m => `<option value="${h(m.id)}">${h(m.name)}</option>`).join('')}
              </select>
            </div>
            ${currentUserRole === 'owner' ? `
            <div>
              <label style="display:block;font-size:12px;margin-bottom:4px;color:#94a3b8;">Account Role</label>
              <select id="edit-user-role" style="width:100%;padding:10px;background:#0b1730;border:1px solid #243c78;border-radius:6px;color:#fff;">
                <option value="participant">Learner (SDR Trainee)</option>
                <option value="admin">Administrator (Reporting)</option>
                <option value="owner">Owner (Full Platform Access)</option>
              </select>
            </div>` : ''}
            <div id="edit-user-error" style="display:none;background:rgba(239,68,68,0.2);color:#fca5a5;padding:8px;border-radius:6px;font-size:12px;"></div>
            <div class="dialog-actions" style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px;">
              <button type="button" class="button secondary" data-admin-action="close-edit-user">Cancel</button>
              <button type="submit" id="btn-save-edit-user" class="button accent">Save Changes</button>
            </div>
          </form>
        </dialog>

        <!-- RESET PASSWORD DIALOG -->
        <dialog id="report-reset-pwd-dialog" class="admin-dialog">
          <div class="dialog-top">
            <span class="eyebrow">CREDENTIAL MANAGEMENT</span>
            <button class="icon-button" data-report="close-reset-pwd">×</button>
          </div>
          <h2 style="font-size:20px;margin-bottom:8px;color:#fff;">Reset User Password</h2>
          <p id="reset-pwd-subtitle" style="font-size:13px;color:#94a3b8;margin-bottom:14px;"></p>
          <div id="reset-pwd-error" style="display:none;background:rgba(239,68,68,0.2);color:#fca5a5;padding:8px 12px;border-radius:6px;font-size:13px;margin-bottom:12px;"></div>
          <form id="reset-pwd-form" style="display:flex;flex-direction:column;gap:12px;">
            <input type="hidden" id="reset-pwd-userid">
            <div>
              <label style="display:block;font-size:12px;margin-bottom:4px;color:#94a3b8;">New Password</label>
              <div style="display:flex;gap:8px;">
                <input type="text" id="reset-pwd-input" required value="OSRlab2026!" style="flex:1;padding:10px;background:#0b1730;border:1px solid #243c78;border-radius:6px;color:#fff;font-family:monospace;">
                <button type="button" class="button secondary" style="padding:8px 12px;font-size:12px;" onclick="document.getElementById('reset-pwd-input').value='OSR-'+Math.floor(100000+Math.random()*900000)+'!';" title="Generate password">Generate</button>
              </div>
            </div>
            <div id="reset-pwd-success-card" style="display:none;background:#0b1730;border:1px solid #22c55e;border-radius:8px;padding:14px;margin-top:8px;">
              <p style="color:#86efac;font-size:13px;font-weight:700;margin-bottom:8px;">✅ Password updated</p>
              <textarea id="reset-pwd-copy-text" readonly style="width:100%;height:80px;background:#132247;border:1px solid #243c78;color:#e2e8f0;font-size:12px;padding:8px;border-radius:4px;resize:none;font-family:monospace;"></textarea>
              <button type="button" class="button accent" style="width:100%;margin-top:8px;" onclick="navigator.clipboard.writeText(document.getElementById('reset-pwd-copy-text').value);this.textContent='Copied to clipboard!';">Copy new password</button>
            </div>
            <div class="dialog-actions" style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px;">
              <button type="button" class="button secondary" data-report="close-reset-pwd">Close</button>
              <button type="submit" id="reset-pwd-submit-btn" class="button accent">Save Password</button>
            </div>
          </form>
        </dialog>

        <!-- RESOLVE PROFILE CHANGE REQUEST DIALOG -->
        <dialog id="report-resolve-pcr-dialog" class="admin-dialog">
          <div class="dialog-top">
            <span class="eyebrow">PROFILE REQUEST RESOLUTION</span>
            <button class="icon-button" data-admin-action="close-pcr">×</button>
          </div>
          <h2 id="resolve-pcr-title" style="font-size:20px;margin-bottom:8px;color:#fff;">Resolve Request</h2>
          <p id="resolve-pcr-desc" style="font-size:13px;color:#cbd5e1;margin-bottom:14px;"></p>
          <form id="resolve-pcr-form" style="display:flex;flex-direction:column;gap:12px;">
            <input type="hidden" id="pcr-resolve-id">
            <input type="hidden" id="pcr-resolve-decision">
            <div>
              <label style="display:block;font-size:12px;margin-bottom:4px;color:#94a3b8;">Administrator Notes (Optional)</label>
              <textarea id="pcr-resolve-notes" rows="2" placeholder="Reason or context for the trainee" style="width:100%;padding:10px;background:#0b1730;border:1px solid #243c78;border-radius:6px;color:#fff;font-family:inherit;resize:none;"></textarea>
            </div>
            <div id="pcr-resolve-error" style="display:none;background:rgba(239,68,68,0.2);color:#fca5a5;padding:8px;border-radius:6px;font-size:12px;"></div>
            <div class="dialog-actions" style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px;">
              <button type="button" class="button secondary" data-admin-action="close-pcr">Cancel</button>
              <button type="submit" id="btn-submit-pcr-resolve" class="button accent">Confirm Decision</button>
            </div>
          </form>
        </dialog>

        <!-- BACKUP / RESTORE DIALOG -->
        <dialog id="report-backup-dialog" class="admin-dialog">
          <div class="dialog-top">
            <span class="eyebrow">DATABASE PERSISTENCE</span>
            <button class="icon-button" data-report="close-backup">×</button>
          </div>
          <h2 style="font-size:20px;margin-bottom:8px;color:#fff;">Database Backup &amp; Cloud Persistence</h2>
          <p style="font-size:13px;color:#94a3b8;margin-bottom:14px;">Protect all users, passwords, session times, and training records at $0 cost.</p>
          <div id="backup-status-box" style="background:#0b1730;border:1px solid #243c78;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;color:#cbd5e1;">
            Checking persistence status…
          </div>
          <div id="backup-msg" style="display:none;padding:10px 12px;border-radius:6px;font-size:13px;margin-bottom:14px;"></div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="background:#0b1730;border:1px solid #1e356d;border-radius:8px;padding:14px;">
              <strong style="display:block;font-size:14px;margin-bottom:4px;color:#fff;">1. Download Full Snapshot (.json)</strong>
              <p style="font-size:12px;color:#94a3b8;margin-bottom:10px;">Exports all 17 tables to your computer including users, cases, calls, and session timing.</p>
              <button type="button" class="button accent" data-report="download-backup" style="width:100%;">⬇ Download Full Database Backup</button>
            </div>
            ${currentUserRole === 'owner' ? `
            <div style="background:#0b1730;border:1px solid #1e356d;border-radius:8px;padding:14px;">
              <strong style="display:block;font-size:14px;margin-bottom:4px;color:#fff;">2. Restore from Backup File (.json)</strong>
              <p style="font-size:12px;color:#94a3b8;margin-bottom:10px;">Upload a previously downloaded backup file to restore all records immediately.</p>
              <input type="file" id="backup-file-input" accept=".json,application/json" style="width:100%;font-size:12px;color:#cbd5e1;margin-bottom:10px;">
              <button type="button" class="button secondary" data-report="restore-backup" style="width:100%;">⬆ Restore Database from File</button>
            </div>` : ''}
          </div>
          <div class="dialog-actions" style="margin-top:16px;display:flex;justify-content:flex-end;gap:8px;">
            <button type="button" class="button secondary" data-report="sync-cloud">☁ Sync to Cloud Now</button>
            <button type="button" class="button secondary" data-report="close-backup">Close</button>
          </div>
        </dialog>

        <!-- ROLE DIALOG -->
        <dialog id="report-role-dialog" class="admin-dialog">
          <div class="dialog-top">
            <span class="eyebrow">ROLE MODIFICATION</span>
            <button class="icon-button" data-report="cancel-role">×</button>
          </div>
          <h2 id="report-role-title" style="font-size:20px;color:#fff;"></h2>
          <p id="report-role-message" style="font-size:13px;color:#cbd5e1;margin-top:10px;"></p>
          <div class="dialog-actions" style="margin-top:16px;display:flex;justify-content:flex-end;gap:8px;">
            <button class="button secondary" data-report="cancel-role">Cancel</button>
            <button class="button accent" data-report="confirm-role">Confirm Change</button>
          </div>
        </dialog>
      </div>
    `;

    if (activeTab === 'reports') {
      drawPeople();
    } else if (activeTab === 'overview') {
      const overviewEl = document.querySelector('#report-overview');
      if (overviewEl) overviewEl.innerHTML = PortalInsights.cohort(people);
    }
  }

  function csv() {
    const rows = [
      ['Name', 'Email', 'Role', 'Assigned MSP', 'Onboarding status (all time)', 'Lessons checked', 'Applied submissions', 'Cases practiced', 'Full calls completed', 'First decisions', 'First aligned', 'Connected portal seconds', 'Interaction seconds estimate', 'Last active'],
      ...filteredPeople().map(p => [
        p.name,
        p.email,
        p.role,
        PortalInsights.msp(p),
        p.report?.onboarding?.status || 'Not started',
        p.report?.onboarding?.unitsChecked || 0,
        p.report?.onboarding?.tasksSubmitted || 0,
        p.report?.casesCompleted || 0,
        p.report?.callsCompleted || 0,
        p.report?.firstDecisions || 0,
        p.report?.firstAligned || 0,
        p.report?.presence?.sessions ? Math.round(p.report.presence.connectedMs / 1000) : 0,
        p.report?.presence?.sessions ? Math.round(p.report.presence.interactionMs / 1000) : 0,
        p.report?.activity?.lastSubmitted ? new Date(p.report.activity.lastSubmitted).toISOString() : 'None'
      ])
    ];
    PortalInsights.download('ld-sdrlab-training-report.csv', rows);
  }

  let roleTarget = null;

  // Master Click Event Listener
  document.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;

    // Tab switching
    if (b.dataset.tab) {
      activeTab = b.dataset.tab;
      admin();
      return;
    }

    if (b.dataset.adminAction === 'refresh') {
      admin();
      return;
    }

    if (b.dataset.reportUser) {
      training(b.dataset.reportUser);
      return;
    }

    // Provision user dialog
    if (b.dataset.report === 'open-create-user') {
      const errBox = document.getElementById('create-user-error');
      if (errBox) errBox.style.display = 'none';
      const card = document.getElementById('cu-credentials-card');
      if (card) card.style.display = 'none';
      const submitBtn = document.getElementById('cu-submit-btn');
      if (submitBtn) { submitBtn.style.display = 'inline-block'; submitBtn.disabled = false; submitBtn.textContent = 'Create User'; }
      const nameInput = document.getElementById('cu-name');
      const emailInput = document.getElementById('cu-email');
      const passInput = document.getElementById('cu-password');
      if (nameInput) nameInput.value = '';
      if (emailInput) emailInput.value = '';
      if (passInput) passInput.value = 'OSR-' + Math.floor(100000 + Math.random() * 900000) + '!';
      document.getElementById('report-create-user-dialog')?.showModal();
      return;
    }

    if (b.dataset.report === 'close-create-user') {
      document.getElementById('report-create-user-dialog')?.close();
      return;
    }

    // Edit user
    if (b.dataset.editUserId) {
      const targetUser = people.find(p => p.id === b.dataset.editUserId);
      if (!targetUser) return;
      document.getElementById('edit-user-id').value = targetUser.id;
      document.getElementById('edit-user-name').value = targetUser.name;
      const mspSelect = document.getElementById('edit-user-msp');
      if (mspSelect) mspSelect.value = targetUser.profile?.approvedMspId || '';
      const roleSelect = document.getElementById('edit-user-role');
      if (roleSelect) roleSelect.value = targetUser.role;
      const errBox = document.getElementById('edit-user-error');
      if (errBox) errBox.style.display = 'none';
      document.getElementById('report-edit-user-dialog')?.showModal();
      return;
    }

    if (b.dataset.adminAction === 'close-edit-user') {
      document.getElementById('report-edit-user-dialog')?.close();
      return;
    }

    // Toggle user active / deactivate
    if (b.dataset.toggleActiveId) {
      const targetId = b.dataset.toggleActiveId;
      const isCurrentlyActive = b.dataset.currentActive === 'true';
      const targetUser = people.find(p => p.id === targetId);
      const actionName = isCurrentlyActive ? 'deactivate' : 'reactivate';
      
      if (isCurrentlyActive && !confirm(`Are you sure you want to deactivate ${targetUser?.name || 'this user'}?\n\nDeactivating disables sign-in immediately while preserving 100% of their historical training and time records.`)) {
        return;
      }

      b.disabled = true;
      try {
        await Training.api(`/api/admin/users/${actionName}`, {
          method: 'POST',
          body: JSON.stringify({ userId: targetId })
        });
        admin();
      } catch (err) {
        alert(`Failed to ${actionName} user: ${err.message}`);
        b.disabled = false;
      }
      return;
    }

    // Reset password dialog
    if (b.dataset.pwdResetId) {
      const errBox = document.getElementById('reset-pwd-error');
      if (errBox) errBox.style.display = 'none';
      const card = document.getElementById('reset-pwd-success-card');
      if (card) card.style.display = 'none';
      const submitBtn = document.getElementById('reset-pwd-submit-btn');
      if (submitBtn) { submitBtn.style.display = 'inline-block'; submitBtn.disabled = false; submitBtn.textContent = 'Save Password'; }
      const idInput = document.getElementById('reset-pwd-userid');
      if (idInput) idInput.value = b.dataset.pwdResetId;
      const subTitle = document.getElementById('reset-pwd-subtitle');
      if (subTitle) subTitle.textContent = `User: ${b.dataset.pwdResetName} (${(b.dataset.pwdResetRole || '').toUpperCase()})`;
      const passInput = document.getElementById('reset-pwd-input');
      if (passInput) passInput.value = 'OSR-' + Math.floor(100000 + Math.random() * 900000) + '!';
      document.getElementById('report-reset-pwd-dialog')?.showModal();
      return;
    }

    if (b.dataset.report === 'close-reset-pwd') {
      document.getElementById('report-reset-pwd-dialog')?.close();
      return;
    }

    // Resolve Profile Change Request dialog
    if (b.dataset.pcrAction) {
      const reqId = b.dataset.pcrId;
      const decision = b.dataset.pcrAction;
      const req = profileRequests.find(r => r.id === reqId);
      if (!req) return;

      document.getElementById('pcr-resolve-id').value = reqId;
      document.getElementById('pcr-resolve-decision').value = decision;
      document.getElementById('resolve-pcr-title').textContent = `${decision === 'approved' ? 'Approve' : 'Reject'} Profile Request`;
      document.getElementById('resolve-pcr-desc').innerHTML = `Request by <strong>${h(req.userName)}</strong> to change <code>${h(req.fieldName)}</code> to <strong>&ldquo;${h(req.proposedValue)}&rdquo;</strong>.`;
      document.getElementById('pcr-resolve-notes').value = '';
      const errBox = document.getElementById('pcr-resolve-error');
      if (errBox) errBox.style.display = 'none';
      document.getElementById('report-resolve-pcr-dialog')?.showModal();
      return;
    }

    if (b.dataset.adminAction === 'close-pcr') {
      document.getElementById('report-resolve-pcr-dialog')?.close();
      return;
    }

    // Backup dialog
    if (b.dataset.report === 'open-backup') {
      const dlg = document.getElementById('report-backup-dialog');
      const statusBox = document.getElementById('backup-status-box');
      const msgBox = document.getElementById('backup-msg');
      if (msgBox) msgBox.style.display = 'none';
      dlg?.showModal();
      try {
        const st = await Training.api('/api/admin/backup/status');
        if (statusBox) {
          statusBox.innerHTML = st.cloudEnabled
            ? `<span style="color:#86efac;font-weight:700;">● Cloud Auto-Backup Active (GitHub Gist)</span><br><small style="color:#94a3b8;">Gist ID: ${h(st.gistId || 'Auto')} · Last synced: ${st.lastSyncAt ? new Date(st.lastSyncAt).toLocaleTimeString() : 'Ready'}</small>`
            : `<span style="color:#38bdf8;font-weight:700;">● Browser Auto-Resync Active</span><br><small style="color:#94a3b8;">Trainee browsers automatically re-upload practice & events. Add GITHUB_BACKUP_TOKEN in Render Environment to enable automatic GitHub Cloud sync.</small>`;
        }
      } catch (err) {
        if (statusBox) statusBox.textContent = 'Status unavailable: ' + err.message;
      }
      return;
    }

    if (b.dataset.report === 'close-backup') {
      document.getElementById('report-backup-dialog')?.close();
      return;
    }

    if (b.dataset.report === 'download-backup') {
      b.disabled = true;
      const origText = b.textContent;
      b.textContent = 'Preparing backup…';
      try {
        const snapshot = await Training.api('/api/admin/backup/export');
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `ld-sdrlab-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err) {
        const msgBox = document.getElementById('backup-msg');
        if (msgBox) { msgBox.style.display = 'block'; msgBox.style.background = 'rgba(239,68,68,0.2)'; msgBox.style.color = '#fca5a5'; msgBox.textContent = err.message; }
      } finally {
        b.disabled = false;
        b.textContent = origText;
      }
      return;
    }

    if (b.dataset.report === 'restore-backup') {
      const fileInput = document.getElementById('backup-file-input');
      const msgBox = document.getElementById('backup-msg');
      if (!fileInput?.files?.length) {
        if (msgBox) { msgBox.style.display = 'block'; msgBox.style.background = 'rgba(239,68,68,0.2)'; msgBox.style.color = '#fca5a5'; msgBox.textContent = 'Please select a .json backup file first.'; }
        return;
      }
      b.disabled = true;
      const origText = b.textContent;
      b.textContent = 'Restoring…';
      try {
        const text = await fileInput.files[0].text();
        const json = JSON.parse(text);
        const res = await Training.api('/api/admin/backup/import', { method: 'POST', body: JSON.stringify(json) });
        if (msgBox) { msgBox.style.display = 'block'; msgBox.style.background = 'rgba(34,197,94,0.2)'; msgBox.style.color = '#86efac'; msgBox.textContent = `✅ Restored ${res.restoredRows} records successfully!`; }
        admin();
      } catch (err) {
        if (msgBox) { msgBox.style.display = 'block'; msgBox.style.background = 'rgba(239,68,68,0.2)'; msgBox.style.color = '#fca5a5'; msgBox.textContent = 'Restore failed: ' + err.message; }
      } finally {
        b.disabled = false;
        b.textContent = origText;
      }
      return;
    }

    if (b.dataset.report === 'sync-cloud') {
      b.disabled = true;
      const msgBox = document.getElementById('backup-msg');
      try {
        const res = await Training.api('/api/admin/backup/sync', { method: 'POST', body: JSON.stringify({}) });
        if (msgBox) {
          msgBox.style.display = 'block';
          if (res.synced) {
            msgBox.style.background = 'rgba(34,197,94,0.2)';
            msgBox.style.color = '#86efac';
            msgBox.textContent = '✅ Synced to GitHub Cloud Gist!';
          } else {
            msgBox.style.background = 'rgba(239,68,68,0.2)';
            msgBox.style.color = '#fca5a5';
            msgBox.textContent = res.reason === 'no_token' ? 'Add GITHUB_BACKUP_TOKEN in Render Environment to enable automatic GitHub Cloud sync.' : ('Sync status: ' + (res.error || res.reason));
          }
        }
      } catch (err) {
        if (msgBox) { msgBox.style.display = 'block'; msgBox.style.background = 'rgba(239,68,68,0.2)'; msgBox.style.color = '#fca5a5'; msgBox.textContent = err.message; }
      } finally {
        b.disabled = false;
      }
      return;
    }

    // Role modification
    if (b.dataset.roleUser) {
      roleTarget = people.find(p => p.id === b.dataset.roleUser);
      if (!roleTarget) return;
      const nextRole = b.dataset.newRole || (roleTarget.role === 'admin' ? 'participant' : 'admin');
      roleTarget.nextRole = nextRole;
      document.querySelector('#report-role-title').textContent = nextRole === 'owner' ? 'Promote to Owner?' : nextRole === 'admin' ? 'Name as Administrator?' : 'Demote to Learner?';
      document.querySelector('#report-role-message').textContent = nextRole === 'owner'
        ? `Grant full Owner privileges to ${roleTarget.name}? They will have administrative and role-management access.`
        : nextRole === 'admin'
        ? `Grant Administrator privileges to ${roleTarget.name}? They will be able to review reports and provision SDRs.`
        : `Remove administrative access for ${roleTarget.name}? They will only see their own training record.`;
      document.querySelector('#report-role-dialog')?.showModal();
      return;
    }

    if (b.dataset.report === 'cancel-role') {
      document.querySelector('#report-role-dialog')?.close();
      return;
    }

    if (b.dataset.report === 'confirm-role') {
      if (!roleTarget) return;
      b.disabled = true;
      try {
        await Training.api('/api/admin/role', {
          method: 'POST',
          body: JSON.stringify({ userId: roleTarget.id, role: roleTarget.nextRole || 'participant' })
        });
        document.querySelector('#report-role-dialog')?.close();
        admin();
      } catch (err) {
        b.disabled = false;
        document.querySelector('#report-role-message').textContent = err.message;
      }
      return;
    }

    if (b.dataset.report === 'refresh-requests') {
      try {
        profileRequests = (await Training.api('/api/admin/profile-requests')).requests || [];
        admin();
      } catch (err) {}
      return;
    }

    if (b.dataset.report === 'refresh-audit') {
      try {
        auditLogs = (await Training.api('/api/admin/audit?limit=50')).logs || [];
        admin();
      } catch (err) {}
      return;
    }

    switch (b.dataset.report) {
      case 'jump-time': document.querySelector('#portal-time-record')?.scrollIntoView({ block: 'start', behavior: 'instant' }); break;
      case 'print': window.print(); break;
      case 'csv': csv(); break;
      case 'back': admin(); break;
      case 'reset-dates': days = '7'; admin(); break;
      case 'apply-dates':
        fromDate = document.querySelector('#report-from').value;
        toDate = document.querySelector('#report-to').value;
        admin();
        break;
    }
  });

  // Submit Handler for Forms
  document.addEventListener('submit', async e => {
    // 1. Create User
    if (e.target.id === 'create-user-form') {
      e.preventDefault();
      const btn = document.getElementById('cu-submit-btn');
      const errBox = document.getElementById('create-user-error');
      if (errBox) errBox.style.display = 'none';
      if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

      const name = document.getElementById('cu-name').value.trim();
      const email = document.getElementById('cu-email').value.trim();
      const mspId = document.getElementById('cu-msp').value;
      const role = document.getElementById('cu-role').value;
      const password = document.getElementById('cu-password').value;

      try {
        const res = await Training.api('/api/admin/users/create', {
          method: 'POST',
          body: JSON.stringify({ name, email, mspId, role, password })
        });
        const card = document.getElementById('cu-credentials-card');
        if (card) card.style.display = 'block';
        const copyText = document.getElementById('cu-copy-text');
        if (copyText) {
          copyText.value = `Hi ${name},\nYour L&D-SDRlab account is ready:\nPortal URL: ${window.location.origin}/\nEmail: ${email}\nPassword: ${password}\nAssigned MSP: ${res.user?.msp || 'Pending Confirmation'}`;
        }
        if (btn) btn.style.display = 'none';
        admin();
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message;
          errBox.style.display = 'block';
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Create User'; }
      }
    }

    // 2. Edit User
    if (e.target.id === 'edit-user-form') {
      e.preventDefault();
      const btn = document.getElementById('btn-save-edit-user');
      const errBox = document.getElementById('edit-user-error');
      if (errBox) errBox.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Saving…';

      const userId = document.getElementById('edit-user-id').value;
      const name = document.getElementById('edit-user-name').value.trim();
      const mspId = document.getElementById('edit-user-msp').value;
      const role = document.getElementById('edit-user-role')?.value;

      try {
        await Training.api('/api/admin/users/update', {
          method: 'POST',
          body: JSON.stringify({ userId, name, mspId, role })
        });
        document.getElementById('report-edit-user-dialog')?.close();
        admin();
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message;
          errBox.style.display = 'block';
        }
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    }

    // 3. Reset Password
    if (e.target.id === 'reset-pwd-form') {
      e.preventDefault();
      const btn = document.getElementById('reset-pwd-submit-btn');
      const errBox = document.getElementById('reset-pwd-error');
      if (errBox) errBox.style.display = 'none';
      if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

      const userId = document.getElementById('reset-pwd-userid').value;
      const newPassword = document.getElementById('reset-pwd-input').value;

      try {
        await Training.api('/api/admin/users/reset-password', {
          method: 'POST',
          body: JSON.stringify({ userId, newPassword })
        });
        const card = document.getElementById('reset-pwd-success-card');
        if (card) card.style.display = 'block';
        const copyText = document.getElementById('reset-pwd-copy-text');
        if (copyText) {
          copyText.value = `Hi,\nYour L&D-SDRlab password has been reset:\nPortal URL: ${window.location.origin}/\nNew Password: ${newPassword}`;
        }
        if (btn) btn.style.display = 'none';
        admin();
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message;
          errBox.style.display = 'block';
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Save Password'; }
      }
    }

    // 4. Resolve Profile Change Request
    if (e.target.id === 'resolve-pcr-form') {
      e.preventDefault();
      const btn = document.getElementById('btn-submit-pcr-resolve');
      const errBox = document.getElementById('pcr-resolve-error');
      if (errBox) errBox.style.display = 'none';
      btn.disabled = true;

      const requestId = document.getElementById('pcr-resolve-id').value;
      const decision = document.getElementById('pcr-resolve-decision').value;
      const adminNotes = document.getElementById('pcr-resolve-notes').value.trim();

      try {
        await Training.api('/api/admin/profile-requests/resolve', {
          method: 'POST',
          body: JSON.stringify({ requestId, decision, adminNotes })
        });
        document.getElementById('report-resolve-pcr-dialog')?.close();
        admin();
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message;
          errBox.style.display = 'block';
        }
        btn.disabled = false;
      }
    }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'report-search') {
      query = e.target.value;
      if (activeTab === 'reports') drawPeople();
      else if (activeTab === 'users') {
        const bodyEl = document.querySelector('#admin-tab-body');
        if (bodyEl) bodyEl.innerHTML = renderUsersTab();
      }
    }
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'report-msp') {
      mspFilter = e.target.value;
      drawPeople();
    }
    if (e.target.id === 'report-role-filter') {
      roleFilter = e.target.value;
      drawPeople();
    }
    if (e.target.id === 'report-period') {
      days = e.target.value;
      if (days === 'custom') {
        fromDate = fromDate || new Date(Date.now() - 6 * 86400000 - 21600000).toISOString().slice(0, 10);
        toDate = toDate || new Date(Date.now() - 21600000).toISOString().slice(0, 10);
      }
      admin();
    }
    if (e.target.id === 'report-topic') {
      topic = e.target.value;
      admin();
    }
    if (e.target.id === 'audit-filter-action') {
      auditFilterAction = e.target.value;
      Training.api(`/api/admin/audit?action=${encodeURIComponent(auditFilterAction)}&limit=50`)
        .then(res => {
          auditLogs = res.logs || [];
          const bodyEl = document.querySelector('#admin-tab-body');
          if (bodyEl && activeTab === 'audit') bodyEl.innerHTML = renderAuditTab();
        })
        .catch(() => {});
    }
  });

  function openRecord(userId) {
    if (location.hash === '#reporting' || location.hash === '#admin') training(userId);
    else {
      requestedUser = userId;
      location.hash = 'reporting';
    }
  }

  return { training, admin, openRecord };
})();
