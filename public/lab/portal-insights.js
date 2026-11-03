'use strict';
const PortalInsights = (() => {
  const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const date = v => v ? new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Managua' }) : 'No submission yet';
  const msp = p => ['owner', 'admin'].includes(p?.role) ? 'OSR Manage (Leadership)' : (p?.profile?.approvedMsp || p?.profile?.requestedMsp || p?.report?.onboarding?.briefMspName || 'Unassigned');
  const fallback = p => ({ status: p?.report?.onboarding?.status || 'Not started', reasons: [], nextAction: p?.report?.onboarding?.nextRecommendation || 'Review the next required activity' });

  function download(name, rows) {
    const csv = rows.map(row => row.map(v => {
      let s = String(v ?? '');
      if (/^\s*[=+@-]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function cohort(list) {
    if (!Array.isArray(list) || !list.length) {
      return '<section class="portal-executive"><div class="report-section-heading"><div><span class="eyebrow">EXECUTIVE SUMMARY</span><h2>Learning Cohort Overview</h2></div></div><div class="portal-executive-empty"><span>' + PortalExperience.icon('check') + '</span><p>No participants enrolled in this view. Use Create User or adjust filters above.</p></div></section>';
    }

    const attention = list.filter(p => {
      const s = p?.executive || fallback(p);
      const reasons = Array.isArray(s?.reasons) ? s.reasons : [];
      return reasons.length > 0;
    });
    const ready = list.filter(p => p?.report?.onboarding?.status === 'Needs review');
    const cleared = list.filter(p => p?.report?.onboarding?.status === 'Ready for supervised calls');

    const queue = attention.slice().sort((a, b) => 
      Number(!!b?.report?.onboarding?.openHelp) - Number(!!a?.report?.onboarding?.openHelp) || 
      Number(!!b?.report?.onboarding?.overdue) - Number(!!a?.report?.onboarding?.overdue)
    ).slice(0, 6);

    return '<section class="portal-executive"><div class="report-section-heading"><div><span class="eyebrow">EXECUTIVE SUMMARY</span><h2>Who needs your next useful action?</h2></div><span class="portal-executive-tag">Evidence → Coaching → Next step</span></div><div class="portal-executive-stats"><div><span>People in view</span><strong>' + list.length + '</strong><small>' + list.filter(p => p?.report?.activity?.submissions).length + ' submitted learning in this period</small></div><div><span>Need attention</span><strong>' + attention.length + '</strong><small>Profile, question, target or revision</small></div><div><span>Ready for review</span><strong>' + ready.length + '</strong><small>Required evidence submitted · all time</small></div><div><span>Cleared for supervised calls</span><strong>' + cleared.length + '</strong><small>Current human readiness approval</small></div></div>' +
      (queue.length ? '<div class="portal-action-queue">' + queue.map(p => {
        const s = p?.executive || fallback(p);
        const rList = Array.isArray(s?.reasons) ? s.reasons : [];
        return '<article><div><strong>' + h(p.name) + '</strong><small>' + h(msp(p)) + ' · Latest delivery: ' + date(p.report?.activity?.lastSubmitted || p.report?.onboarding?.lastSubmitted) + '</small><p>' + (rList.length ? rList.slice(0, 2).map(r => h(r.text)).join(' · ') : 'Training in progress') + '</p><span>' + h(s.nextAction || 'Continue training') + '</span></div><div class="portal-inline-actions"><button class="button secondary" data-ob-admin="' + h(p.id) + '">Review work →</button><button class="text-button" data-report-user="' + h(p.id) + '">View evidence</button>' + (!p.profile?.verified && p.role === 'participant' ? '<button class="text-button" data-profile-person="' + h(p.id) + '">Assign MSP</button>' : '') + '</div></article>';
      }).join('') + '</div>' + (attention.length > queue.length ? '<p class="ob-caption">Showing ' + queue.length + ' of ' + attention.length + ' people who need attention. All profiles remain in the table below.</p>' : '') : '<div class="portal-executive-empty"><span>' + PortalExperience.icon('check') + '</span><p>No open action signals for this selection. All required progress is on track.</p></div>') +
      '<p class="ob-caption">Learning totals follow the selected period. Profile, assignment and readiness signals show current all-time state.</p></section>';
  }

  let people = [], accounts = [], selected = null;
  function setPeople(value) { people = value || []; }
  function setAccounts(value) { accounts = (value || []).filter(a => a.id !== 'osr-manage'); }

  function options(value) {
    const list = accounts.filter(a => a.id !== 'osr-manage');
    return '<option value="">Not assigned yet</option>' + list.map(a => '<option value="' + h(a.id) + '" ' + (a.id === value ? 'selected' : '') + ' ' + (!a.active ? 'disabled' : '') + '>' + h(a.name) + (a.active ? '' : ' · Archived') + '</option>').join('');
  }

  async function profile(id) {
    selected = people.find(p => p.id === id);
    if (!selected) return;
    let d = document.querySelector('#admin-profile-dialog');
    if (!d) {
      d = document.createElement('dialog');
      d.id = 'admin-profile-dialog';
      d.setAttribute('aria-labelledby', 'admin-profile-title');
      document.body.append(d);
    }
    d.innerHTML = '<p role="status">Loading profile…</p>';
    d.showModal();
    try {
      accounts = ((await Training.api('/api/portal/accounts')).accounts || []).filter(a => a.id !== 'osr-manage');
      const p = selected.profile || {};
      d.innerHTML = '<div class="dialog-top"><span class="eyebrow">MSP ASSIGNMENT GOVERNANCE</span><button class="icon-button" data-insights="close-profile" aria-label="Close profile confirmation">×</button></div><h2 id="admin-profile-title">Assign or Confirm MSP Account</h2><p><strong>' + h(selected.name) + '</strong><br>' + h(selected.email) + '</p><dl class="portal-profile-facts"><div><dt>Name entered</dt><dd>' + h([p.firstName, p.lastName].filter(Boolean).join(' ') || selected.name) + '</dd></div><div><dt>Requested MSP</dt><dd>' + h(p.requestedMsp || 'Not requested') + '</dd></div><div><dt>Current verified assignment</dt><dd>' + h(p.approvedMsp || 'Unassigned') + '</dd></div></dl><form id="admin-profile-form"><label>Approved MSP Account<select name="approvedMspId" required>' + options(p.approvedMspId || p.requestedMspId) + '</select></label><p class="ob-caption">OSR Manage coordinates across all accounts. SDR trainees represent assigned client MSPs.</p><button class="button accent">Save Verified Assignment</button><p role="status" class="ob-inline-status"></p></form>';
    } catch (e) {
      d.innerHTML = '<h2>Profile could not load.</h2><p>' + h(e.message) + '</p><button class="button" data-insights="close-profile">Close</button>';
    }
  }

  function accountList() {
    const list = accounts.filter(a => a.id !== 'osr-manage');
    return '<p class="ob-caption">Centralized MSP Account Registry. Archiving removes an MSP from new SDR assignments while preserving 100% of historical training records.</p><form id="admin-account-create"><label>Official MSP Name<input name="name" minlength="2" maxlength="80" required placeholder="e.g. Advantage, JIG, Apex Cloud"></label><button class="button accent">Add MSP Account</button><p class="ob-inline-status" role="status"></p></form><div class="portal-account-list">' + 
      (list.length ? list.map(a => '<div><span><strong>' + h(a.name) + '</strong><small>' + (a.active ? 'Active · Available for assignment' : 'Archived · Historical records preserved') + (a.sdr_count !== undefined ? ' (' + a.sdr_count + ' SDR' + (a.sdr_count === 1 ? '' : 's') + ')' : '') + '</small></span><button class="text-button" data-account-toggle="' + h(a.id) + '">' + (a.active ? 'Archive MSP' : 'Restore MSP') + '</button></div>').join('') : '<p class="report-muted">No client MSP accounts registered yet. Add your first account above.</p>') + '</div>';
  }

  async function manageAccounts() {
    let d = document.querySelector('#admin-accounts-dialog');
    if (!d) {
      d = document.createElement('dialog');
      d.id = 'admin-accounts-dialog';
      d.setAttribute('aria-labelledby', 'admin-accounts-title');
      document.body.append(d);
    }
    d.innerHTML = '<div class="dialog-top"><h2 id="admin-accounts-title">MSP Accounts Registry</h2><button class="icon-button" data-insights="close-accounts" aria-label="Close MSP accounts">×</button></div><div id="admin-accounts-content" role="status">Loading MSP accounts…</div>';
    d.showModal();
    try {
      accounts = ((await Training.api('/api/portal/accounts')).accounts || []).filter(a => a.id !== 'osr-manage');
      d.querySelector('#admin-accounts-content').innerHTML = accountList();
    } catch (e) {
      d.querySelector('#admin-accounts-content').textContent = e.message;
    }
  }

  function games(g) {
    if (!g) return '';
    return '<section class="content-card portal-game-evidence"><span class="eyebrow">FIND THE OPPORTUNITY</span><h2>Short missions, visible reasoning.</h2><p>' + g.missions + ' / ' + g.totalMissions + ' missions submitted · ' + g.attempts + ' attempts in the selected period.</p><details><summary>First and latest results · all time</summary>' + (g.latest || []).map(r => '<div class="portal-mission-comparison"><strong>' + h(r.title) + '</strong><span>First ' + (r.firstScore ?? r.score) + '/' + (r.firstMaxScore ?? r.maxScore) + ' → Latest ' + r.score + '/' + r.maxScore + '</span></div>').join('') + '</details><details><summary>View submitted mission decisions</summary>' + ((g.recent || []).length ? (g.recent || []).map(r => '<details><summary>' + h(r.title) + ' · ' + r.score + '/' + r.maxScore + ' · ' + date(r.at) + '</summary>' + (r.rounds || []).map(x => '<div><h3>' + h(x.criterion) + '</h3><p>' + h(x.response) + '</p><p class="ob-caption">' + h(x.coaching) + '</p></div>').join('') + '</details>').join('') : '<p>No missions submitted in this period.</p>') + '</details><p class="ob-caption">The latest 12 attempts are shown here. The activity timeline retains earlier submissions.</p></section>';
  }

  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-profile-person],[data-insights],[data-account-toggle]');
    if (!b) return;
    if (b.dataset.profilePerson) {
      profile(b.dataset.profilePerson);
      return;
    }
    if (b.dataset.accountToggle) {
      const a = accounts.find(a => a.id === b.dataset.accountToggle);
      if (!a) return;
      b.disabled = true;
      try {
        const res = await Training.api('/api/admin/msp', {
          method: 'POST',
          body: JSON.stringify({ id: a.id, name: a.name, active: !a.active })
        });
        accounts = ((await Training.api('/api/portal/accounts')).accounts || []).filter(acc => acc.id !== 'osr-manage');
        const content = document.querySelector('#admin-accounts-content');
        if (content) content.innerHTML = accountList();
        // Refresh reporting if open
        if (typeof Reporting !== 'undefined' && Reporting.admin) Reporting.admin();
      } catch (err) {
        b.disabled = false;
        let out = document.querySelector('#admin-accounts-content .ob-inline-status');
        if (out) out.textContent = err.message;
      }
      return;
    }
    switch (b.dataset.insights) {
      case 'accounts': manageAccounts(); break;
      case 'close-accounts': document.querySelector('#admin-accounts-dialog')?.close(); break;
      case 'close-profile': document.querySelector('#admin-profile-dialog')?.close(); break;
    }
  });

  document.addEventListener('submit', async e => {
    const f = e.target;
    if (!['admin-profile-form', 'admin-account-create'].includes(f.id)) return;
    e.preventDefault();
    const b = f.querySelector('button');
    const out = f.querySelector('[role="status"]');
    b.disabled = true;
    out.textContent = 'Saving…';
    try {
      if (f.id === 'admin-profile-form') {
        const formData = Object.fromEntries(new FormData(f));
        const r = await Training.api('/api/portal/verify', {
          method: 'POST',
          body: JSON.stringify({ userId: selected.id, approvedMspId: formData.approvedMspId })
        });
        selected.profile = r.profile;
        document.querySelector('#admin-profile-dialog')?.close();
        if (typeof Reporting !== 'undefined' && Reporting.admin) Reporting.admin();
      } else {
        const formData = Object.fromEntries(new FormData(f));
        await Training.api('/api/admin/msp', {
          method: 'POST',
          body: JSON.stringify({ name: formData.name })
        });
        accounts = ((await Training.api('/api/portal/accounts')).accounts || []).filter(acc => acc.id !== 'osr-manage');
        const content = document.querySelector('#admin-accounts-content');
        if (content) content.innerHTML = accountList();
        if (typeof Reporting !== 'undefined' && Reporting.admin) Reporting.admin();
      }
    } catch (err) {
      out.textContent = err.message;
      b.disabled = false;
    }
  });

  return { cohort, setPeople, setAccounts, msp, games, download };
})();

const PortalTime = (() => {
  const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const date = t => t == null ? 'Not recorded' : new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Managua' });
  const duration = ms => {
    const n = Math.max(0, Math.round((ms || 0) / 1000));
    const hours = Math.floor(n / 3600);
    const minutes = Math.floor((n % 3600) / 60);
    const seconds = n % 60;
    return hours ? hours + 'h ' + minutes + 'm' : minutes ? minutes + 'm ' + seconds + 's' : seconds + 's';
  };

  let user = null, period = 'all', periodStart = null, periodEnd = Date.now(), rows = [], cursor = null, summary = null, analytics = null, busy = false, exporting = false, problem = '', generation = 0, historyOpen = false;
  const sectionNames = {
    onboarding: 'Start here',
    foundations: 'MSP Foundations',
    lab: 'Practice lab',
    calllab: 'Call Lab',
    progress: 'My progress',
    glossary: 'Glossary',
    training: 'Training record',
    reporting: 'Admin Portal',
    game: 'Opportunity missions',
    walkthrough: 'Portal walkthrough',
    guide: 'Call preparation'
  };

  function host() { return document.querySelector('#portal-time-record'); }
  function setBounds() {
    periodEnd = Date.now();
    if (period === 'all') periodStart = null;
    else if (period === 'today') periodStart = Date.parse(new Date(periodEnd - 21600000).toISOString().slice(0, 10) + 'T00:00:00-06:00');
    else periodStart = periodEnd - Number(period) * 86400000;
  }

  function params() {
    const p = new URLSearchParams({ user, limit: '10', to: String(periodEnd) });
    if (periodStart !== null) p.set('from', String(periodStart));
    return p;
  }

  function breakdown() {
    if (!analytics || !Array.isArray(analytics.daily)) return '';
    const max = Math.max(60000, ...analytics.daily.map(d => d.connectedMs || 0));
    return '<section class="portal-daily"><div class="report-section-heading"><div><span class="eyebrow">DAILY DETAIL</span><h3>Time and submitted work, side by side.</h3></div><button class="text-button" data-portal-time="daily-csv">Export daily CSV ↓</button></div><p class="ob-caption">' + (period === 'all' ? 'Daily detail shows the last 14 days.' : 'Selected date window.') + ' Nicaragua time.</p><div class="portal-chart-key"><span><i></i>Observed connection</span><span><i></i>Interaction estimate</span></div><div class="portal-day-chart">' + analytics.daily.slice(-14).map(d => '<div class="portal-day"><span>' + h(d.day.slice(5)) + '</span><div class="portal-day-track" aria-hidden="true"><span style="width:' + Math.min(100, (d.connectedMs || 0) / max * 100) + '%"></span><i style="width:' + Math.min(100, (d.interactionMs || 0) / max * 100) + '%"></i></div><strong>' + duration(d.connectedMs) + '</strong><small>' + (d.submissions || 0) + ' submissions</small></div>').join('') + '</div></section>';
  }

  function render() {
    const el = host();
    if (!el) return;
    if (busy && !summary) {
      el.innerHTML = '<section class="content-card portal-time-card"><p role="status">Loading portal timing…</p></section>';
      return;
    }
    if (!summary) {
      el.innerHTML = '<section class="content-card portal-time-card"><p class="report-muted">No portal sessions recorded yet in this window.</p></section>';
      return;
    }
    el.innerHTML = '<section class="content-card portal-time-card"><div class="report-section-heading"><div><span class="eyebrow">PORTAL PRESENCE</span><h2>Time spent learning in L&amp;D-SDRlab</h2></div></div><div class="portal-executive-stats"><div><span>Connected portal time</span><strong>' + duration(summary.connectedMs) + '</strong><small>Active portal sessions</small></div><div><span>Visible and focused</span><strong>' + duration(summary.visibleMs) + '</strong><small>Window focused</small></div><div><span>Recent interaction</span><strong>' + duration(summary.interactionMs) + '</strong><small>2-minute idle threshold</small></div></div>' + breakdown() + '</section>';
  }

  async function load(more = false) {
    if (busy || !host()) return;
    const token = ++generation;
    busy = true;
    if (!more) { rows = []; cursor = null; summary = null; analytics = null; }
    render();
    try {
      await SessionTiming.flush();
      if (!more) setBounds();
      const p = params();
      if (more && cursor) p.set('cursor', cursor);
      const r = await Training.api('/api/presence?' + p);
      if (token !== generation || !host()) return;
      rows = more ? [...rows, ...(r.sessions || [])] : (r.sessions || []);
      cursor = r.nextCursor;
      summary = r.summary;
      if (!more) {
        const a = params();
        a.delete('limit');
        try {
          const detail = await Training.api('/api/portal/time?' + a);
          if (token === generation && host()) analytics = detail;
        } catch (e) {}
      }
    } catch (e) {
      problem = e.message;
    } finally {
      if (token === generation) { busy = false; render(); }
    }
  }

  function mount(targetUser, selectedDays = 'all', bounds = null) {
    user = targetUser;
    period = selectedDays;
    load(false);
  }

  return { mount, duration };
})();
