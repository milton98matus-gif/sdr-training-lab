'use strict';
const PortalExperience = (() => {
  const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = {
    compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM16 8l-2 6-6 2 2-6Z',
    person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
    target: 'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 12l9-9M16 3h5v5',
    puzzle: 'M9 3h6v4a2 2 0 1 1 4 0h3v6h-4a2 2 0 1 1 0 4v4h-6v-4a2 2 0 1 1-4 0H3v-6h4a2 2 0 1 0 0-4V3Z',
    arrow: 'M5 12h14M13 6l6 6-6 6',
    check: 'M5 12l4 4L19 6'
  };
  const icon = (key = 'compass') => icons[key] ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + icons[key] + '"/></svg>' : LearningPath.icon(key);

  let accounts = [], profileBusy = false, mandatory = false, missionId = null, choices = [], round = 0, reviewed = false, runId = null, gameSaved = false, gameBusy = false, gameMessage = '';

  function illustration() {
    return '<svg class="portal-illustration" viewBox="0 0 320 180" role="img" aria-label="Support, cloud and people connected around a business"><rect x="80" y="45" width="160" height="105" rx="15" fill="#fff"/><rect x="94" y="58" width="132" height="73" rx="7" fill="#e8f1fa"/><path d="M147 150v15m-25 0h76" stroke="#85b836" stroke-width="7" stroke-linecap="round"/><path d="M122 98h28m-28 13h51" stroke="#285782" stroke-width="6" stroke-linecap="round"/><circle cx="195" cy="93" r="16" fill="#a6ce52"/><path d="m187 93 6 6 10-12" fill="none" stroke="#17384e" stroke-width="4"/><path d="M47 50h35m158 46h27M160 25v20" stroke="#8bacce" stroke-width="2" stroke-dasharray="5 5"/><circle cx="42" cy="46" r="25" fill="#dceaf7"/><path d="M29 46v-3a13 13 0 0 1 26 0v3m-26 0h5v11h-5Zm21 0h5v11h-5Z" fill="none" stroke="#285782" stroke-width="3"/><rect x="248" y="72" width="55" height="55" rx="17" fill="#dceec0"/><circle cx="276" cy="90" r="7" fill="none" stroke="#315d25" stroke-width="3"/><path d="M263 113c0-16 25-16 25 0" fill="none" stroke="#315d25" stroke-width="3"/><path d="M144 25a8 8 0 1 1 3-15 12 12 0 0 1 22 1 7 7 0 0 1 0 14Z" fill="#a6ce52"/></svg>';
  }

  function welcome() {
    return '<section class="portal-welcome"><div><span class="eyebrow">YOUR FIRST FIVE MINUTES</span><h2>Find your way. Then make your next move.</h2><p>See where to learn, practice, submit work and find feedback.</p><a class="button accent" href="#walkthrough">' + icon('compass') + ' Portal walkthrough →</a></div>' + illustration() + '</section>';
  }

  function shortcuts() {
    return '<section class="portal-switchup"><a href="#game"><span class="portal-feature-icon">' + icon('puzzle') + '</span><span><small>TRY A SHORT MISSION</small><strong>Find the Opportunity</strong><p>Read the signal. Choose the question. Earn a fitting next step.</p></span><span aria-hidden="true">↗</span></a><a href="#guide"><span class="portal-feature-icon">' + icon('target') + '</span><span><small>TAKE IT INTO YOUR NEXT CALL</small><strong>Call preparation playbook</strong><p>A concise reference with examples you can put into practice.</p></span><span aria-hidden="true">↗</span></a></section>';
  }

  function updateUser(user) {
    Training.setUser(user);
    window.dispatchEvent(new CustomEvent('sdr-profile-updated', { detail: user }));
  }

  function mspOptions(value) {
    const list = accounts.filter(a => a.active && a.id !== 'osr-manage');
    return '<option value="">Not assigned yet</option>' + list.map(a => '<option value="' + h(a.id) + '" ' + (value === a.id ? 'selected' : '') + '>' + h(a.name) + '</option>').join('');
  }

  async function profileDialog(required = false) {
    if (profileBusy) return;
    required = required || !Training.user?.profile?.complete;
    profileBusy = true;
    mandatory = required;
    try {
      const r = await Training.api('/api/portal/profile');
      accounts = (r.accounts || []).filter(a => a.id !== 'osr-manage');
      updateUser(r.user);

      let myRequests = [];
      try {
        const reqRes = await Training.api('/api/portal/my-requests');
        myRequests = reqRes.requests || [];
      } catch (e) {}

      let d = document.querySelector('#portal-profile');
      if (!d) {
        d = document.createElement('dialog');
        d.id = 'portal-profile';
        d.className = 'portal-profile';
        d.setAttribute('aria-labelledby', 'portal-profile-title');
        d.addEventListener('cancel', e => { if (mandatory) e.preventDefault(); });
        document.body.append(d);
      }

      const p = r.user.profile || {};
      const isLeadership = ['owner', 'admin'].includes(r.user.role);
      const assignedMspText = isLeadership ? 'OSR Manage (Leadership · All Accounts)' : (p.approvedMsp || 'Pending Assignment');

      d.innerHTML = `
        <div class="dialog-top">
          <span class="eyebrow">L&amp;D-SDRlab · PERSONAL LEARNING HUB</span>
          ${!required ? '<button class="icon-button" data-portal="close-profile" aria-label="Close profile">×</button>' : ''}
        </div>
        
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
          <span class="portal-feature-icon" style="margin:0;">${icon('person')}</span>
          <div>
            <h2 id="portal-profile-title" style="margin:0;font-size:24px;">${h(r.user.name || 'My Profile')}</h2>
            <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">${h(r.user.email)} · <span class="role-badge ${r.user.role}">${r.user.role === 'owner' ? 'Platform Owner' : r.user.role === 'admin' ? 'Reporting Administrator' : 'SDR Trainee'}</span></p>
          </div>
        </div>

        <div style="background:#0b1730;border:1px solid #1e356d;border-radius:10px;padding:16px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;gap:14px;">
          <div>
            <strong style="display:block;font-size:13px;color:#fff;margin-bottom:2px;">Your Training Progress &amp; Records</strong>
            <p style="font-size:11px;color:#94a3b8;margin:0;">View your completed scenario decisions, call recordings, scores, and active portal time.</p>
          </div>
          <button type="button" class="button accent" data-portal="view-my-record" style="white-space:nowrap;padding:8px 14px;font-size:12px;">📊 View My Record →</button>
        </div>

        <form id="portal-profile-form">
          <div class="portal-name-fields">
            <label>First name
              <input name="firstName" autocomplete="given-name" maxlength="60" required value="${h(p.firstName || '')}">
            </label>
            <label>Last name
              <input name="lastName" autocomplete="family-name" maxlength="60" required value="${h(p.lastName || '')}">
            </label>
          </div>

          <label>Assigned MSP Account
            ${isLeadership ? `
              <input type="text" readonly disabled value="OSR Manage (Leadership)" style="background:#0c1836;color:#94a3b8;border:1px solid #1e356d;padding:10px;border-radius:6px;width:100%;font-size:13px;">
              <small class="ob-caption">As leadership, your account has organization-wide oversight across all MSP accounts.</small>
            ` : `
              <select name="requestedMspId">
                ${mspOptions(p.requestedMspId || p.approvedMspId)}
              </select>
              <small class="ob-caption">Assigned client account. Your administrator confirms this assignment.</small>
            `}
          </label>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0;">
            <div style="background:#0b1730;border:1px solid #1e356d;border-radius:6px;padding:10px;">
              <small style="color:#94a3b8;display:block;font-size:10px;text-transform:uppercase;">Account Role</small>
              <strong style="font-size:12px;color:#fff;">${r.user.role === 'owner' ? 'Platform Owner' : r.user.role === 'admin' ? 'Administrator' : 'SDR Trainee'}</strong>
            </div>
            <div style="background:#0b1730;border:1px solid #1e356d;border-radius:6px;padding:10px;">
              <small style="color:#94a3b8;display:block;font-size:10px;text-transform:uppercase;">Assignment Status</small>
              <strong style="font-size:12px;color:${p.verified ? '#86efac' : '#fde68a'};">${p.verified ? '✓ Verified & Confirmed' : 'Pending Confirmation'}</strong>
            </div>
          </div>

          <div class="dialog-actions">
            ${!required ? '<button type="button" class="button secondary" data-portal="close-profile">Close</button>' : '<a href="/logout" target="_top" class="text-button" style="color:#f87171;">Sign Out</a>'}
            <button class="button accent" type="submit">Save Learning Profile →</button>
          </div>
          <p class="ob-inline-status" role="status"></p>
        </form>

        <!-- REQUEST PROFILE CORRECTION -->
        <details style="margin-top:20px;background:#0b1730;border:1px solid #1e356d;border-radius:8px;padding:14px;">
          <summary style="cursor:pointer;font-size:13px;font-weight:700;color:#fff;">📝 Request Account Information Correction</summary>
          <p style="font-size:11px;color:#94a3b8;margin:8px 0 12px;">Need to update your assigned MSP, name, or account information? Submit a request for administrative review.</p>
          <form id="profile-change-request-form" style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div>
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:3px;">Field</label>
                <select name="fieldName" required style="width:100%;padding:8px;background:#132247;border:1px solid #243c78;border-radius:6px;color:#fff;font-size:12px;">
                  <option value="requestedMspId">Assigned MSP Account</option>
                  <option value="firstName">First Name</option>
                  <option value="lastName">Last Name</option>
                  <option value="email">Work Email</option>
                  <option value="other">Other Account Information</option>
                </select>
              </div>
              <div>
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:3px;">Proposed Correction</label>
                <input type="text" name="proposedValue" required placeholder="e.g. Advantage, correct spelling" style="width:100%;padding:8px;background:#132247;border:1px solid #243c78;border-radius:6px;color:#fff;font-size:12px;">
              </div>
            </div>
            <div>
              <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:3px;">Reason / Explanation</label>
              <textarea name="reason" rows="2" placeholder="Brief reason for the administrator" style="width:100%;padding:8px;background:#132247;border:1px solid #243c78;border-radius:6px;color:#fff;font-size:12px;font-family:inherit;resize:none;"></textarea>
            </div>
            <button type="submit" id="btn-submit-pcr" class="button accent" style="align-self:flex-start;padding:6px 14px;font-size:12px;">Submit Correction Request</button>
            <p id="pcr-status-msg" role="status" style="font-size:12px;margin:0;"></p>
          </form>
        </details>

        <!-- USER CHANGE REQUESTS HISTORY -->
        ${myRequests.length ? `
        <div style="margin-top:16px;">
          <strong style="font-size:12px;color:#94a3b8;display:block;margin-bottom:8px;">Your Submitted Requests</strong>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${myRequests.map(req => `
              <div style="background:#0b1730;border:1px solid #1e356d;border-radius:6px;padding:10px;font-size:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <strong>${h(req.fieldName)}: &ldquo;${h(req.proposedValue)}&rdquo;</strong>
                  <span style="padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;background:${req.status === 'approved' ? '#064e3b;color:#a7f3d0' : req.status === 'rejected' ? '#7f1d1d;color:#fca5a5' : '#78350f;color:#fde68a'}">${h(req.status.toUpperCase())}</span>
                </div>
                <p style="color:#94a3b8;margin:4px 0 0;font-size:11px;">Submitted ${new Date(req.createdAt).toLocaleDateString()}${req.adminNotes ? ` · Note: ${h(req.adminNotes)}` : ''}</p>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      `;

      if (!d.open) d.showModal();
      const title = d.querySelector('h2');
      if (title) { title.tabIndex = -1; title.focus(); }
      d.scrollTop = 0;
    } catch (e) {
      let out = document.querySelector('#portal-profile-error');
      if (!out) {
        out = document.createElement('p');
        out.id = 'portal-profile-error';
        out.setAttribute('role', 'status');
        document.querySelector('#account-status')?.after(out);
      }
      out.textContent = 'Your learning profile could not open. ' + e.message;
    } finally {
      profileBusy = false;
    }
  }

  const steps = [
    { title: 'Set up your profile', icon: 'person', body: 'Confirm your real first and last name and your assigned client MSP account. Your administrator confirms it.', action: 'Open my profile', button: 'profile' },
    { title: 'Follow your learning route', icon: 'book', body: 'Start here shows your next lesson or exercise. MSP Foundations explains support, cloud, coordination, security and business outcomes.', action: 'Continue my training', href: '#onboarding' },
    { title: 'Practice a useful decision', icon: 'phone', body: 'Use Practice lab for a single moment, Find the Opportunity for a short mission, and Call Lab for a complete branching conversation.', action: 'Try a short mission', href: '#game' },
    { title: 'Submit and use the feedback', icon: 'check', body: 'Written drafts are saved in this browser until you submit. Read the coaching, make a concrete adjustment and submit a new attempt.', action: 'Open the practice lab', href: '#lab' },
    { title: 'Check what you have completed', icon: 'planning', body: 'Training record shows submitted work, feedback and observed portal time. Ask for help from Start here if a concept is unclear.', action: 'Open my training record', href: '#training' }
  ];

  function walkthrough() {
    return '<section class="portal-page-intro"><span class="eyebrow">PORTAL WALKTHROUGH</span><h1>A clear start, in five steps.</h1><p>Learn where to go, what to submit and how to find your next step.</p><div class="portal-inline-actions"><button class="button accent" data-tour="start">' + icon('compass') + ' Take the guided tour →</button><a class="button secondary" href="/lab/assets/portal-quick-guide.pdf" target="_blank" rel="noopener">Download the quick guide ↓</a></div></section><div class="portal-walkthrough-grid">' + steps.map((s, i) => '<article class="portal-walkthrough-step"><span class="portal-step-number">0' + (i + 1) + '</span><span class="portal-feature-icon">' + icon(s.icon) + '</span><h2>' + s.title + '</h2><p>' + s.body + '</p>' + (s.href ? '<a class="text-button" href="' + s.href + '">' + s.action + ' →</a>' : '<button class="text-button" data-portal="' + s.button + '">' + s.action + ' →</button>') + '</article>').join('') + '</div><section class="portal-footnote-panel"><strong>What counts as progress?</strong><p>Opening a lesson, submitting an answer and demonstrating a skill are separate signals. Completing the walkthrough records orientation; your required learning checks and readiness review remain part of the route.</p></section>';
  }

  const playCards = [
    { title: 'Know your MSP', icon: 'cloud', goal: 'Explain a relevant service without making an unconfirmed promise.', example: '“We help with the day-to-day support and project work included in the agreement. How is that responsibility handled today?”', boundary: 'Use your approved client brief for services, coverage and assessment terms. Detailed technical scope and pricing belong with the discovery team.', unit: 'msp-model', caseId: 'msp-075' },
    { title: 'Find a reason to talk', icon: 'compass', goal: 'Follow something the contact actually said.', example: '“You mentioned a new location. How are you planning to support both sites with the current team?”', boundary: 'A plan, workload, review window or welcomed second opinion can matter. Discover the effect before labeling it a pain point.', unit: 'discovery', caseId: 'msp-025' },
    { title: 'Handle this moment', icon: 'phone', goal: 'Use one relevant clarification when the contact is receptive.', example: '“Understood. When you say you are covered, is that mainly day-to-day support, or are upcoming projects covered as well?”', boundary: 'There is no required number of rebuttals. A repeated firm refusal or contact restriction changes the appropriate response.', unit: 'boundaries', caseId: 'msp-031' },
    { title: 'Agree the next step', icon: 'target', goal: 'Clarify the purpose and agreement before ending the call.', example: '“I can send that overview. Would a brief follow-up next week be useful, or would you prefer to contact us if it becomes relevant?”', boundary: 'An accepted email is not automatically a callback or appointment. Document the actual agreement.', unit: 'next-steps', caseId: 'msp-033' }
  ];

  function playbook() {
    return '<section class="portal-page-intro"><span class="eyebrow">CALL PREPARATION PLAYBOOK</span><h1>Prepare for your next call.</h1><p>Use this quick reference to choose a discovery question, a relevant benefit and a proportionate next step.</p><div class="portal-purpose"><span class="portal-feature-icon">' + icon('target') + '</span><span><strong>Leave with a simple call plan.</strong><p>Know what to ask, what you can offer and what would make you stop.</p></span></div></section><section class="portal-brief-strip"><div><span class="eyebrow">YOUR APPROVED ACCOUNT INSTRUCTIONS</span><strong>' + h(Training.user?.profile?.approvedMsp || 'Your assigned MSP') + '</strong><p>Confirm the services, coverage and handoff before representing this account.</p></div><button class="button secondary" data-portal="brief">Read my client brief →</button></section><div class="portal-playbook-grid">' + playCards.map((c, i) => '<article class="portal-play-card"><span class="portal-step-number">0' + (i + 1) + '</span><span class="portal-feature-icon">' + icon(c.icon) + '</span><h2>' + c.title + '</h2><p>' + c.goal + '</p><details><summary>See a phrase and when to use it</summary><blockquote>' + h(c.example) + '</blockquote><p>' + c.boundary + '</p></details><div class="portal-inline-actions"><button class="text-button" data-learning-case="' + c.caseId + '">Practice this situation →</button><button class="text-button" data-playbook-unit="' + c.unit + '">Review the lesson</button></div></article>').join('') + '</div><details class="content-card portal-handoff"><summary>Finish with a useful CRM handoff</summary><p><b>Record:</b> confirmed setup · relevant signal · stakeholders · timing · agreed action · unknowns or restrictions.</p><blockquote>“Operations director is reviewing onboarding next month. Outline requested by email today. No discovery call or callback agreed.”</blockquote><p>Recycle means internal reassessment. Apply contact restrictions through the approved process; a recycle date creates no permission to contact.</p></details><section class="portal-game-invite"><span class="portal-feature-icon">' + icon('puzzle') + '</span><div><span class="eyebrow">PUT THE PLAN INTO PRACTICE</span><h2>Find the Opportunity</h2><p>Three decisions. One realistic situation. A useful explanation after every move.</p></div><a class="button accent" href="#game">Choose a mission →</a></section>';
  }

  const mission = () => OPPORTUNITY_GAME.missions.find(m => m.id === missionId);
  function gameDraft() {
    try {
      localStorage.setItem(Training.keyFor('opportunity-mission-v1'), JSON.stringify({ missionId, choices, round, reviewed, runId }));
    } catch {}
  }

  function drawGame() {
    if (location.hash !== '#game') return;
    document.querySelector('#main').innerHTML = game();
    document.querySelector('#mission-title')?.focus({ preventScroll: true });
  }

  function game() {
    const m = mission();
    if (!m) return '<section class="portal-page-intro"><span class="eyebrow">FIND THE OPPORTUNITY · SHORT MISSIONS</span><h1>Make the next move count.</h1><p>Three decisions per mission. Practice discovery, relevance and respectful boundaries.</p></section><div class="portal-game-rule"><span>' + icon('puzzle') + '</span><p><strong>Good judgment earns the points.</strong> A relevant follow-up or a professional exit can be the strongest move. There is no speed bonus.</p></div><div class="portal-mission-grid">' + OPPORTUNITY_GAME.missions.map(m => '<button class="portal-mission-card" data-mission="' + m.id + '"><span class="portal-feature-icon">' + icon(m.icon) + '</span><small>' + h(m.skill) + '</small><strong>' + h(m.title) + '</strong><p>' + h(m.scene) + '</p><span>Start mission · 3 decisions →</span></button>').join('') + '</div>';
    const r = m.rounds[round], choice = choices[round], o = r.options[choice], score = choices.reduce((n, c, i) => n + (m.rounds[i]?.options[c]?.points || 0), 0);
    return '<button class="text-button ob-back" data-portal="missions">← All missions</button><section class="portal-mission-shell"><div class="portal-mission-top"><span class="eyebrow">' + h(m.skill) + ' · DECISION ' + (round + 1) + ' / ' + m.rounds.length + '</span><span class="portal-score">' + score + ' behavior points</span></div><progress max="' + m.rounds.length + '" value="' + (round + (reviewed ? 1 : 0)) + '" aria-label="Mission decisions completed"></progress><h1 id="mission-title" tabindex="-1">' + h(r.title) + '</h1><p>' + h(m.scene) + '</p><blockquote class="portal-prospect-quote">' + h(r.quote) + '</blockquote>' +
      (reviewed ? '<div class="portal-mission-feedback" role="status"><span class="eyebrow">' + (o.points === 2 ? 'NICELY DONE' : o.points === 1 ? 'ALMOST THERE' : 'LET’S WORK THROUGH THIS') + '</span><h2>' + h(r.criterion) + '</h2><p>' + h(o.why) + '</p>' + (o.points < 2 ? '<details open><summary>A stronger move to try</summary><p>' + h(r.options.find(x => x.points === 2).text) + '</p></details>' : '') + '</div>' + (round < m.rounds.length - 1 ? '<p class="ob-caption">The next moment continues from the reference move.</p><button class="button accent" data-portal="next-round">Continue the situation →</button>' : '<section class="portal-mission-result"><h2>' + score + ' / ' + m.rounds.length * 2 + ' behavior points</h2><p>' + (score === m.rounds.length * 2 ? 'You used the evidence and kept the next step proportionate.' : 'Keep the coaching in mind, then try a fresh situation or revisit this mission.') + '</p><div class="portal-inline-actions">' + (!gameSaved && Training.user ? '<button class="button accent" data-portal="save-mission" ' + (gameBusy ? 'disabled' : '') + '>' + (gameBusy ? 'Saving…' : 'Save this mission →') + '</button>' : '') + (gameSaved ? '<a class="button secondary" href="#training">View my record →</a>' : '') + '<button class="text-button" data-portal="missions">Choose another mission</button></div><p role="status">' + h(gameMessage) + '</p></section>') :
      '<form id="portal-mission-form"><fieldset><legend>' + h(r.prompt) + '</legend>' + r.options.map((o, i) => '<label class="ob-option"><input type="radio" name="choice" value="' + i + '" required><span>' + h(o.text) + '</span></label>').join('') + '</fieldset><button class="button accent" type="submit">See the coaching →</button></form>') + '</section>';
  }

  function startMission(id) {
    if (!OPPORTUNITY_GAME.missions.some(m => m.id === id)) return;
    missionId = id;
    choices = [];
    round = 0;
    reviewed = false;
    runId = crypto.randomUUID();
    gameSaved = false;
    gameBusy = false;
    gameMessage = '';
    gameDraft();
    drawGame();
  }

  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-portal],[data-mission],[data-playbook-unit]');
    if (!b) return;

    if (b.dataset.mission) { startMission(b.dataset.mission); return; }
    if (b.dataset.playbookUnit) { Onboarding.openUnit(b.dataset.playbookUnit); return; }

    switch (b.dataset.portal) {
      case 'profile':
        if (Training.user) profileDialog(false);
        else location.href = '/login';
        break;
      case 'close-profile':
        if (!mandatory) document.querySelector('#portal-profile')?.close();
        break;
      case 'view-my-record':
        document.querySelector('#portal-profile')?.close();
        window.location.hash = 'training';
        break;
      case 'brief': Onboarding.openBrief(); break;
      case 'missions': missionId = null; gameMessage = ''; drawGame(); break;
      case 'next-round': round++; reviewed = false; gameDraft(); drawGame(); break;
      case 'save-mission':
        if (gameBusy || gameSaved) return;
        gameBusy = true;
        gameMessage = '';
        drawGame();
        try {
          await Training.api('/api/portal/game', {
            method: 'POST',
            body: JSON.stringify({ id: runId, missionId, version: OPPORTUNITY_GAME.version, choices })
          });
          gameSaved = true;
          try { localStorage.removeItem(Training.keyFor('opportunity-mission-v1')); } catch {}
          window.dispatchEvent(new CustomEvent('sdr-mission-saved'));
        } catch (err) {
          gameMessage = err.message + ' Your decisions remain available; try saving again.';
        } finally {
          gameBusy = false;
          drawGame();
        }
        break;
    }
  });

  document.addEventListener('submit', async e => {
    if (e.target.id === 'portal-mission-form') {
      e.preventDefault();
      const c = Number(new FormData(e.target).get('choice'));
      if (!mission().rounds[round].options[c]) return;
      choices[round] = c;
      reviewed = true;
      gameDraft();
      drawGame();
      return;
    }

    if (e.target.id === 'portal-profile-form') {
      e.preventDefault();
      const form = e.target;
      const button = form.querySelector('button[type="submit"]');
      const out = form.querySelector('[role="status"]');
      button.disabled = true;
      out.textContent = 'Saving your learning profile…';
      try {
        const r = await Training.api('/api/portal/profile', {
          method: 'PUT',
          body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        updateUser(r.user);
        mandatory = false;
        document.querySelector('#portal-profile')?.close();
        document.querySelector('#portal-profile-error')?.remove();
      } catch (err) {
        out.textContent = err.message;
      } finally {
        button.disabled = false;
      }
      return;
    }

    if (e.target.id === 'profile-change-request-form') {
      e.preventDefault();
      const form = e.target;
      const btn = form.querySelector('#btn-submit-pcr');
      const out = form.querySelector('#pcr-status-msg');
      btn.disabled = true;
      out.style.color = '#38bdf8';
      out.textContent = 'Submitting request to administrator…';
      try {
        const formData = Object.fromEntries(new FormData(form));
        await Training.api('/api/portal/profile-request', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        out.style.color = '#86efac';
        out.textContent = '✅ Request submitted! An administrator will review your changes.';
        form.reset();
        setTimeout(() => profileDialog(false), 1500);
      } catch (err) {
        out.style.color = '#fca5a5';
        out.textContent = err.message;
        btn.disabled = false;
      }
      return;
    }
  });

  window.addEventListener('sdr-tour-finished', () => {
    if (Training.user) {
      Training.api('/api/portal/profile', { method: 'PUT', body: JSON.stringify({ tourCompleted: true }) })
        .then(r => updateUser(r.user))
        .catch(() => {});
    }
  });

  Training.ready.then(() => {
    if (!Training.user) return;
    if (!Training.user.profile?.complete) profileDialog(true);
    try {
      const d = JSON.parse(localStorage.getItem(Training.keyFor('opportunity-mission-v1')) || 'null');
      const m = OPPORTUNITY_GAME.missions.find(m => m.id === d?.missionId);
      if (m && Array.isArray(d.choices) && Number.isInteger(d.round) && d.round >= 0 && d.round < m.rounds.length && d.choices.every((c, i) => Number.isInteger(c) && m.rounds[i]?.options[c]) && typeof d.runId === 'string') {
        missionId = d.missionId;
        choices = d.choices;
        round = d.round;
        reviewed = !!d.reviewed && choices[round] !== undefined;
        runId = d.runId;
        if (location.hash === '#game') drawGame();
      }
    } catch {}
  });

  return { welcome, shortcuts, walkthrough, playbook, game, profileDialog, icon, mspOptions };
})();
