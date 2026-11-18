'use strict';

// Fictional learning activities. This advisory route never waives the required
// lessons, submitted evidence, current client brief, or human readiness review.
const LEARNING_PATH = {
  DIAGNOSTIC: [
    {
      id: 'starting-point-model',
      domain: 'MSP knowledge',
      unitId: 'msp-model',
      prompt: 'A business owner asks what an MSP takes responsibility for. Which explanation is most accurate?',
      options: [
        { text: 'Every technology decision and problem, once the customer signs up.', why: 'The customer still has decisions and responsibilities. The service agreement sets the provider’s scope.' },
        { text: 'Ongoing management and support for the technology responsibilities agreed with the customer.', why: 'An MSP manages an agreed scope. That may include support, cloud, infrastructure, security, and other services.' },
        { text: 'Emergency repairs only; ongoing support belongs to an internal team.', why: 'Reactive repair is one model. Managed services can include continuing maintenance and support.' }
      ],
      answer: 1
    },
    {
      id: 'starting-point-cloud',
      domain: 'MSP knowledge',
      unitId: 'cloud',
      prompt: '“We have Microsoft 365 and two-step verification.” What does that establish?',
      options: [
        { text: 'Some tools are in place; support, administration, and wider IT priorities still need context.', why: 'Licenses and a sign-in control do not describe the whole operating model. Ask about responsibilities without declaring a weakness.' },
        { text: 'The business has all the IT support and protection it needs.', why: 'This does not establish support ownership, coverage, other needs, or complete protection.' },
        { text: 'Their configuration is inadequate and needs an assessment.', why: 'No configuration has been assessed. The SDR should not diagnose it or presume an assessment is needed.' }
      ],
      answer: 0
    },
    {
      id: 'starting-point-continuity',
      domain: 'MSP knowledge',
      unitId: 'continuity',
      prompt: '“Our files are backed up.” What useful business-level question could follow, if the contact is receptive?',
      options: [
        { text: 'Which backup product should we replace first?', why: 'The prospect has not identified a replacement need, and product selection belongs with a specialist.' },
        { text: 'Then we can assume the business can resume work immediately.', why: 'Having copies does not establish restore performance or the business’s recovery plan.' },
        { text: 'If an essential system stopped, which work would need to resume first, and who coordinates recovery?', why: 'This explores operational priorities and ownership without prescribing a technical design or assuming a gap.' }
      ],
      answer: 2
    },
    {
      id: 'starting-point-assessment',
      domain: 'MSP knowledge',
      unitId: 'assessments',
      prompt: 'A prospect asks whether a third-party assessment has a fee. Your approved brief does not say. What should you do?',
      options: [
        { text: 'Describe it as free because assessments are usually an introductory offer.', why: 'An industry pattern cannot authorize this MSP’s fee or scope.' },
        { text: 'Require a discovery appointment before acknowledging the fee question.', why: 'An appointment should not be a condition for addressing a concern about unknown terms.' },
        { text: 'Offer to confirm the approved scope and any fees before the prospect decides.', why: 'Acknowledge the condition of interest and get accurate terms without inventing a quote or requiring a meeting first.' }
      ],
      answer: 2
    },
    {
      id: 'starting-point-discovery',
      domain: 'Conversation judgment',
      unitId: 'discovery',
      prompt: '“We are opening another location next quarter.” The contact is open to discussing the plan. What is the most useful move?',
      options: [
        { text: 'Move directly to a company introduction without using the expansion detail.', why: 'The contact has shared a relevant signal. A focused follow-up can make any later introduction more useful.' },
        { text: 'Ask what the new location changes for IT and how support is being planned.', why: 'Use the signal to understand the project and ownership. Expansion alone is not proof of a service gap.' },
        { text: 'Recommend replacing the current provider before the new site opens.', why: 'No dissatisfaction, delivery failure, or replacement intention has been stated.' }
      ],
      answer: 1
    },
    {
      id: 'starting-point-contract',
      domain: 'Conversation judgment',
      unitId: 'next-steps',
      prompt: '“Our contract renews in six months.” The prospect is receptive to one timing question. What remains useful to clarify?',
      options: [
        { text: 'When they review the next term and whether reconnecting before that review would be welcome.', why: 'Review timing and contact permission are separate from the contract end date. Clarify both without assuming a switch.' },
        { text: 'Whether six months from today can be entered as an accepted discovery meeting.', why: 'A renewal date is not a meeting agreement or permission for future contact.' },
        { text: 'Which termination clause lets them switch immediately.', why: 'The SDR does not know the contract terms, and no intention to terminate has been expressed.' }
      ],
      answer: 0
    },
    {
      id: 'starting-point-stakeholders',
      domain: 'Conversation judgment',
      unitId: 'stakeholders',
      prompt: 'Reception says corporate chooses IT providers and offers a general vendor inbox. What is a sound next step?',
      options: [
        { text: 'Ask which team to address and what information helps them route the introduction.', why: 'Make the permitted route useful. This establishes a contact path, not corporate interest or a qualified meeting.' },
        { text: 'Classify the account as uninterested because reception cannot approve a meeting.', why: 'Local authority is limited; that does not establish account-level disinterest.' },
        { text: 'Ask another extension for a director’s personal contact details to avoid the inbox.', why: 'The organization has supplied a route. Do not bypass its stated contact boundaries.' }
      ],
      answer: 0
    },
    {
      id: 'starting-point-boundaries',
      domain: 'Conversation judgment',
      unitId: 'boundaries',
      prompt: 'After an initial clarification, the prospect says: “Do not call or email me again.” What should happen?',
      options: [
        { text: 'Move the lead to recycle and try again when the timing is better.', why: 'Recycle does not override an explicit contact exclusion.' },
        { text: 'End the pitch and record the requested call and email exclusion through the approved process.', why: 'The scope is explicit. Honor it without another benefit, meeting request, or future cadence.' },
        { text: 'Offer one final assessment before processing the request.', why: 'A contact restriction is not an invitation to a final objection-handling attempt.' }
      ],
      answer: 1
    }
  ],

  SERVICES: [
    {
      id: 'support',
      title: 'IT support',
      unitId: 'support-delivery',
      description: 'Help users report issues, get assistance, and reach the right escalation path.',
      outcome: 'Less time coordinating help when support ownership and service expectations are clear.',
      question: 'When someone needs IT help, who owns getting the issue resolved?',
      boundary: 'Confirm supported users, systems, hours, and escalation terms. Availability, response, and resolution are different commitments.',
      icon: 'support'
    },
    {
      id: 'cloud',
      title: 'Cloud & Microsoft 365',
      unitId: 'cloud',
      description: 'Support agreed cloud services, user accounts, access changes, and migration projects.',
      outcome: 'More consistent administration and access as people join, move roles, or leave.',
      question: 'Who handles new accounts and access changes, and how is that working for the team?',
      boundary: 'Licenses do not establish management responsibilities. Specialists confirm platform choices, migration scope, and technical recommendations.',
      icon: 'cloud'
    },
    {
      id: 'network',
      title: 'Devices & networks',
      unitId: 'devices-networks',
      description: 'Manage agreed devices and network components, and coordinate relevant vendors.',
      outcome: 'A clearer response path when device or connectivity problems interrupt work.',
      question: 'When connectivity interrupts work, who coordinates the response?',
      boundary: 'Confirm equipment, locations, onsite availability, and vendor responsibilities. An MSP cannot promise control of every external outage.',
      icon: 'network'
    },
    {
      id: 'continuity',
      title: 'Backup & recovery',
      unitId: 'continuity',
      description: 'Protect agreed data and plan how essential work can resume after disruption.',
      outcome: 'Recovery priorities and responsibilities that match the business’s needs.',
      question: 'If an essential system stopped, which work would need to resume first?',
      boundary: 'A backup is not proof of a tested restore. Confirm protected systems, recovery expectations, and who owns the plan; do not promise zero downtime.',
      icon: 'continuity'
    },
    {
      id: 'security',
      title: 'Cybersecurity',
      unitId: 'security',
      description: 'Support agreed protection, monitoring, access, and incident-response responsibilities.',
      outcome: 'Clearer ownership of ongoing protective work and the response when something needs attention.',
      question: 'Who handles ongoing protection and response responsibilities today?',
      boundary: 'No tool or provider makes an organization immune. An SDR can explore ownership and priorities, but cannot diagnose weaknesses or guarantee protection.',
      icon: 'security'
    },
    {
      id: 'planning',
      title: 'IT planning & projects',
      unitId: 'service-map',
      description: 'Plan and deliver agreed changes such as office moves, migrations, or device rollouts.',
      outcome: 'Better coordination of people, dependencies, and milestones for a defined change.',
      question: 'What needs to be ready by the planned date, and who is coordinating it?',
      boundary: 'Confirm that this MSP offers the relevant project service. Dates, deliverables, staffing, and ongoing support require an agreed scope.',
      icon: 'planning'
    }
  ],

  COMPARISONS: [
    {
      id: 'email',
      title: '“Send me an email.”',
      skill: 'Match the next step to the permission given.',
      unitId: 'next-steps',
      variants: [
        {
          id: 'email-open',
          label: 'Room to clarify',
          context: 'The contact is receptive. They have not specified a topic or whether follow-up is welcome.',
          quote: 'Send me an email about what you do.',
          options: [
            { text: 'Would support coverage or project help be useful to highlight, and would a brief follow-up after review be welcome?', why: 'Clarify relevance and ask about the next step while there is room to do so. The contact can limit or decline it.' },
            { text: 'I’ll send our full catalog and keep following up until you respond.', why: 'A broad email and an assumed cadence do not establish relevance or permission.' },
            { text: 'I’ll email an appointment invitation so we can call this booked.', why: 'Permission for information is not acceptance of a meeting.' }
          ],
          answer: 0,
          action: 'continue',
          reason: 'A useful clarification is still available. Learn what would help before agreeing the send and any follow-up.',
          boundary: 'If the contact limits the agreement to one email, accept that limit. A callback is a request, not a condition of sending information.'
        },
        {
          id: 'email-only',
          label: 'One limited send',
          context: 'You have already clarified the scope. The contact gives an explicit limit.',
          quote: 'Just a short support overview by email. No calls or meeting invitations. We will reply if interested.',
          options: [
            { text: 'I can send it only if we also agree a callback date.', why: 'The contact has already limited the next step. Do not make a useful email conditional on another commitment.' },
            { text: 'I’ll send the overview and call next week to check that it arrived.', why: 'A receipt-check call still violates the restriction on calls.' },
            { text: 'Understood. I’ll send only the overview and record the limits on calls and invitations.', why: 'Complete the permitted handoff and preserve the contact restriction. No meeting or proactive callback is agreed.' }
          ],
          answer: 2,
          action: 'nurture',
          reason: 'The available next step is a limited email handoff. Respecting its scope is sound execution.',
          boundary: 'Record and honor the no-call restriction. Email permission does not authorize a sequence, meeting invitation, or further send.'
        },
        {
          id: 'email-revoked',
          label: 'Permission withdrawn',
          context: 'The contact initially mentioned email. Before the call ends, they clearly withdraw that permission.',
          quote: 'Actually, do not send anything. Remove me from your call and email lists.',
          options: [
            { text: 'I’ll send the overview because you allowed it earlier.', why: 'The latest explicit instruction withdraws the earlier permission.' },
            { text: 'Understood. I’ll stop and record your request for no further calls or emails.', why: 'The current instruction is clear. End the pitch and process the exclusion through the approved workflow.' },
            { text: 'I’ll recycle your contact and try again next quarter.', why: 'A future cadence would ignore the exclusion request.' }
          ],
          answer: 1,
          action: 'exclude',
          reason: 'New information changes the decision. An explicit exclusion overrides the earlier email discussion.',
          boundary: 'No final pitch, assessment offer, or unrequested email. Record the requested channels and follow the exclusion process.'
        }
      ]
    },
    {
      id: 'contract',
      title: '“We have an active contract.”',
      skill: 'Separate review timing, an agreement to reconnect, and no current opening.',
      unitId: 'next-steps',
      variants: [
        {
          id: 'contract-unknown',
          label: 'Review timing unknown',
          context: 'The contact is calm and open to one brief timing question. Their current service is working.',
          quote: 'We have an active contract and we are satisfied.',
          options: [
            { text: 'I’ll call when the contract expires.', why: 'Neither the review window nor future contact permission has been established.' },
            { text: 'You can probably leave the contract early, so let’s talk about switching.', why: 'No termination rights or replacement intention are known.' },
            { text: 'When do you normally review service levels and future priorities before the next term?', why: 'A proportionate timing question can establish whether there is a relevant planning window.' }
          ],
          answer: 2,
          action: 'continue',
          reason: 'The contact remains receptive and review timing is a useful unknown. Satisfaction does not establish immediate buying intent.',
          boundary: 'If further discussion is declined, end respectfully. Do not invent contract terms or assume permission for later outreach.'
        },
        {
          id: 'contract-agreement',
          label: 'A future step is agreed',
          context: 'The contact has answered your timing question and specified the permitted channel and month.',
          quote: 'We review in April. Please email in March about project support before planning starts.',
          options: [
            { text: 'I’ll book a discovery meeting for April and send the invitation now.', why: 'A review month and email agreement do not establish a meeting time or acceptance.' },
            { text: 'I’ll note a March email about project support ahead of the April review, with no meeting assumed.', why: 'This preserves the topic, timing, and channel the contact actually requested.' },
            { text: 'I’ll call in April when the contract is closer to renewal.', why: 'That changes both the requested channel and the planning lead time.' }
          ],
          answer: 1,
          action: 'nurture',
          reason: 'There is an explicit, relevant future-contact agreement. Document it accurately rather than pushing for a present appointment.',
          boundary: 'The March email is not a purchase, a qualified project, or permission for additional calls. Scope and interest still need confirmation.'
        },
        {
          id: 'contract-closed-now',
          label: 'The conversation is complete',
          context: 'You have already clarified coverage and future plans. The prospect is now ending the conversation; no future contact is agreed.',
          quote: 'Support and projects are covered. We have no plans to review anything else. Thanks anyway.',
          options: [
            { text: 'Understood. There is no reason to pursue a meeting now. Thank you for the context.', why: 'The relevant questions are answered and the prospect is closing. A respectful exit is appropriate.' },
            { text: 'Before you go, let me ask about another possible failure.', why: 'Adding hypothetical problems ignores the answer and the closing signal.' },
            { text: 'I’ll put you on monthly callbacks in case your plans change.', why: 'No callback or cadence was agreed.' }
          ],
          answer: 0,
          action: 'recycle',
          reason: 'There is no current opening. Step back without treating a completed conversation as a failed rebuttal.',
          boundary: 'Recycle is an internal status, not contact permission. Future reassessment needs a relevant reason and outreach allowed under the contact’s instructions and campaign rules.'
        }
      ]
    },
    {
      id: 'internal-it',
      title: '“We have internal IT.”',
      skill: 'Understand the operating model without assuming a gap or replacing the team.',
      unitId: 'discovery',
      variants: [
        {
          id: 'internal-it-unknown',
          label: 'Capacity is still unknown',
          context: 'No gap is confirmed. The contact remains conversational, and this MSP can provide scoped project support.',
          quote: 'We have an internal IT department.',
          options: [
            { text: 'Then an outsourced department would clearly be better.', why: 'The internal team’s presence is not evidence that it needs replacing.' },
            { text: 'How does the team handle project spikes or work outside its usual capacity?', why: 'Explore a relevant operating question while allowing that the current model may already work well.' },
            { text: 'I’ll mark this as a project opportunity because you have internal IT.', why: 'A service model alone does not establish demand for additional support.' }
          ],
          answer: 1,
          action: 'continue',
          reason: 'Capacity and priorities remain unknown, and a relevant question is welcome. Use the answer before positioning outside help.',
          boundary: 'Accept a covered setup. Do not invent overload or imply that the internal team is inadequate.'
        },
        {
          id: 'internal-it-project',
          label: 'A specialist conversation is wanted',
          context: 'Local project support is within this MSP’s verified offering. The operations contact coordinates the evaluation, wants the IT lead included, and two discovery times are available.',
          quote: 'Our team is keeping IT, but we want help with the new office rollout. Can we speak with your project specialist?',
          options: [
            { text: 'Let’s confirm the rollout purpose, include your IT lead, and choose a verified discovery time and time zone.', why: 'The contact has identified a relevant project and requested a specialist conversation. Agree the appointment details and handoff context.' },
            { text: 'I’ll send a generic brochure instead of discussing the requested conversation.', why: 'This misses the specific next step the contact has asked for.' },
            { text: 'I’ll confirm delivery dates and tell your team we will take over.', why: 'Discovery does not authorize work, establish delivery dates, or change internal ownership.' }
          ],
          answer: 0,
          action: 'book',
          reason: 'A relevant need and requested conversation support an appointment ask. Record it as booked only after purpose, participants, date, time, and time zone are agreed.',
          boundary: 'Do not promise project delivery, technical fit, or attendance by people who have not accepted.'
        },
        {
          id: 'internal-it-no-fit',
          label: 'The available model is declined',
          context: 'For this campaign, the only approved service is ongoing co-managed support. Standalone projects and assessments are not offered. You have explained this scope once.',
          quote: 'We do not want a co-managed arrangement. We are keeping all ongoing support internal.',
          options: [
            { text: 'I’ll call the same co-managed service a one-time assessment instead.', why: 'Renaming the offer would hide the mismatch and promise a service outside the campaign.' },
            { text: 'Could we still meet so you can hear the co-managed pitch again?', why: 'The prospect has understood and declined the only available model. There is no new reason for the meeting.' },
            { text: 'Understood. That is the model we offer here, so I’ll close this evaluation. Thank you.', why: 'The available offer and the stated requirement do not fit. Acknowledge the mismatch without repackaging it.' }
          ],
          answer: 2,
          action: 'close',
          reason: 'A confirmed offer mismatch removes the current opportunity. It does not justify manufacturing another service.',
          boundary: 'Close the current evaluation accurately. This is not automatically an account-wide no-contact request; any actual contact restriction must still be recorded and honored.'
        }
      ]
    }
  ],

  TEACHBACK: {
    title: 'Explain it like an SDR',
    taskId: 'explain-msp',
    timeLabel: '45–60 seconds',
    context: 'A business owner has never used a managed IT provider. Explain the model naturally, then connect one service to a useful business question.',
    prompt: 'Say it aloud first. Then use the existing written exercise to submit your explanation for review.',
    model: 'An MSP manages and supports agreed parts of a company’s technology, such as user support, cloud services, or security. The agreement defines what is covered and who is responsible. For example, an MSP may give employees a clear place to get help and reduce time spent coordinating issues. How is day-to-day IT support handled in your business today?',
    checklist: [
      'Explain the service model in plain English.',
      'Connect one approved service to a practical business outcome.',
      'Ask one relevant question instead of delivering the full catalog.',
      'Keep coverage, fees, and technical promises within the approved brief.'
    ],
    note: 'Speaking practice is optional and is not recorded here. Submit the written exercise for AI feedback and coach review; this activity does not automatically approve readiness.'
  }
};

if (typeof module !== 'undefined') module.exports = LEARNING_PATH;
