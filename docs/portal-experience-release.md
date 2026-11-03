# Portal experience update - November 2, 2026

The portal stays on Sites. No ownership transfer or migration was performed.

## Preserved restoration point

- Previous saved version: **11**.
- Saved version ID: `appgprj_6ae226411c9c8191b3ac3263dc5dff50~appgver_6c3db5dde9ec8191ba633bba92115e9c`.
- Source commit: `b2a47e08d607d16ab48e37ed06c208f8a30fc9c9`.
- Previous successful deployment: `appgdep_6ae4988047ec81918bea65df521a6aa6`.

Deploy the existing saved version to restore its code and presentation. Do not restore a database backup just to reverse a design change. These migrations only add tables/indexes, so version 11 can coexist with the newer records. New profiles, missions and module intervals remain stored even when the old interface does not display them. Preserve the private access policy independently of a code rollback.

## Changes

- First-visit real-name profile form, authenticated account linkage, requested MSP and separately confirmed administrator assignment. MSP archive preserves older assignments. Names are declared by learners and confirmed by an administrator, not automatically verified against identity documents.
- Training administrators can manage MSP names, confirm profiles, review work and export reporting. Only the application owner can appoint administrators. Hosting permissions, publishing and secrets remain separate Sites owner/editor controls.
- Executive summary with current profile, help, deadline, revision and review signals. Period learning totals remain distinct from current all-time readiness state. MSP filtering uses current confirmed profile assignment or the approved client brief, not a historical account attribution.
- Visible walkthrough in the header, home and navigation, five-step tour and linked five-page quick guide. Tour completion does not award competency credit.
- Concise call preparation reference, expandable phrases/boundaries and related lesson/case actions.
- Six three-decision Opportunity missions. Server-canonical scores, immutable/idempotent attempts and first/latest evidence. These are published scenario explanations, not generated AI responses. Missions contribute submitted-work evidence but do not replace onboarding, six required response cases, a full call or human readiness review.
- Time report with daily connection/focus/interaction estimates, learning submissions, module observations, custom dates and daily/session CSVs. Detailed windows are limited to 90 days; all-time totals remain available. Module observations begin at this release, and can overlap across modules/devices. Person totals deduplicate overlapping visits.

## Data and compatibility

New additive tables: `training_participant_details`, `training_msp_accounts`, `training_game_runs`, `training_section_time_buckets`. No existing training records or historical migrations were deleted. Existing clients can still submit timing packets without module segments.

Time is an observation of portal use, not proof of attendance, comprehension or uninterrupted work. The timer records no keys, answer content, coordinates, audio or other-app activity. Closed or suspended browsers can lose their final signal. Reading may continue beyond the interaction idle threshold.

The live AI integration was not changed or activated by this release. It requires a separately authorized API credential. Do not represent reference coaching or simulated fixture output as live AI verification.

## Verification

Real SQLite migration/service checks cover ownership, roles, profile confirmation, canonical mission scores, idempotency, changed profiles, archival history, midnight and partial-bucket timing, module attribution and period validation. Existing training, onboarding, learning-path, call graph, presence and accountability checks remain applicable.

Browser review uses isolated fictional fixtures, never production participants. Temporary public fixture files must be removed before packaging. The guide screenshots are explicitly fictional and contain only example identities.

The quick guide is built with `python scripts/build-portal-guide.py` using reviewed images in `docs/quick-guide-images/`; its public asset is `public/lab/assets/portal-quick-guide.pdf`.
