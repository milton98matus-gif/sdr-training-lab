// Anonymous reconstructed training situations; no source records or customer identifiers.
const ACTIONS={
 continue:{label:'Explore with purpose',short:'Explore',icon:'↗',color:'green',description:'A useful unknown remains and the contact is open to a relevant question.'},
 route:{label:'Build the contact route',short:'Route',icon:'⇢',color:'green',description:'Find ownership, a transfer, a message, or a permitted contact path. Routing is not qualification.'},
 book:{label:'Agree a discovery appointment',short:'Book',icon:'◫',color:'green',description:'Mutual interest supports a defined purpose, participants, and verified meeting time.'},
 nurture:{label:'Nurture within the agreement',short:'Nurture',icon:'◷',color:'purple',description:'An email, callback, or review is welcomed. Preserve its scope, channel, and timing.'},
 recycle:{label:'Step back / recycle',short:'Recycle',icon:'↻',color:'purple',description:'No viable conversation now. Exit well; future reassessment needs a valid reason and permitted outreach.'},
 close:{label:'Close the current opportunity',short:'Close',icon:'↘',color:'amber',description:'A confirmed mismatch or canceled need removes the current reason to pursue.'},
 exclude:{label:'Honor the contact exclusion',short:'Exclude',icon:'⊘',color:'rose',description:'A contact restriction overrides the pitch. Record and handle its requested scope.'}
};
const CRITERIA=[
 {name:'Listening & boundaries',hint:'Uses the answer and respects time, role, channel, and limits.'},
 {name:'Evidence & judgment',hint:'Clarifies a useful unknown or acts on facts already sufficient.'},
 {name:'Relevance & honesty',hint:'Connects verified services without inventing need or promises.'},
 {name:'Agreement & handoff',hint:'Seeks a proportionate next step and records the actual agreement.'}
];
const CASES=[];
const LIMITED_ALTERNATIVES=new Set([17,18,19,20,24,32,37,47,55,56,61,66,67,69,70,71,73,75,78,79]);
const CONTRADICTING_ALTERNATIVES=new Set([13,31,34,41,42,43,44,45,46,48,52,53,54,57,58,59,60,62,63,64,65,68,72,74,76,77,80,81,82,84]);
function add(n,category,title,context,line,action,good,near,bad,evidence,limit,terms=[],nearWhy=''){
 const nearScores=CONTRADICTING_ALTERNATIVES.has(n)?[0,0,0,0]:LIMITED_ALTERNATIVES.has(n)?[1,0,1,0]:[2,1,1,0];
 const options=[{text:good,scores:[2,2,2,2],why:evidence},{text:near,scores:nearScores,why:nearWhy||`This skips a necessary check or adds an unsupported assumption. ${evidence}`},{text:bad,scores:[0,0,0,0],why:`This exceeds the evidence, scope, or permission available. ${limit}`}];
 options.push(...options.splice(0,n%3));
 CASES.push({id:`msp-${String(n).padStart(3,'0')}`,number:n,category,title,context,transcript:[['Prospect',line]],action,options,evidence,limit,terms,model:good,level:n>48?'Applied judgment':n%3===0?'Nuanced judgment':'Foundations',source:n>=73?'Playbook-inspired':n>=49&&n<=66?'Coaching-inspired':'Practice extension',lens:'Use what is available at this moment. Seek a useful next step without forcing a meeting.'});
}
add(1,'Positioning','Outcomes, not another vendor','The MSP offers managed support with an agreed service owner.','I spend half my week chasing IT issues and different people.','continue',
 'Which part takes the most time: coordinating people, getting updates, or getting issues resolved?',
 'We take IT management off your plate. Would you like an introduction?',
 'With us you would never need to be involved in IT again.',
 'The stated issue is management burden. Clarifying it connects service ownership to a real business need.',
 'Do not promise zero client involvement; approvals, decisions, and scope still need agreement.',['msp','accountability','managed-it']);
add(2,'Positioning','Cost efficiency without a quote','The SDR has no pricing or account-specific savings figures.','An MSP sounds more expensive than what we do now.','continue',
 'What are you comparing against: outside support, staff time coordinating IT, or a planned hire?',
 'Our specialist can discuss plans. Let’s book a call.',
 'We guarantee thirty percent savings and always cost less than hiring.',
 'The comparison basis is unknown. Exploring current costs and management burden is useful without quoting.',
 'Do not guarantee savings or use a meeting to avoid acknowledging the concern.',['cost-efficiency','scope','discovery']);
add(3,'Positioning','Who covers nights and weekends?','A confirmed MSP plan provides 24/7 support with defined response targets.','When systems fail at night, the owner usually handles it.','continue',
 'What happens operationally when that occurs, and how is after-hours support arranged today?',
 'We have 24/7 coverage. Should I email an introduction?',
 '24/7 means every issue is resolved immediately.',
 'There is a coverage signal. Explore its impact before connecting the verified service to discovery.',
 'Availability, response, and resolution are different commitments.',['coverage','sla','response-time','resolution-time']);
add(4,'Positioning','One IT person, several responsibilities','Additional support capacity is offered. Staffing decisions remain with the prospect.','Our IT person handles everything, including emergencies.','continue',
 'How do you cover urgent needs when they are away or focused on a large project?',
 'We can provide people if you ever need them.',
 'One person cannot do IT properly. You should replace them.',
 'Headcount alone does not establish weakness. Clarify continuity and available capacity.',
 'If coverage is adequate and no help is wanted, accept the answer.',['coverage','co-managed','overflow']);
add(5,'Positioning','One accountable service owner','The MSP coordinates supported vendors and escalations within its scope.','Every vendor says the problem belongs to someone else.','continue',
 'Who owns an issue through resolution, and where does coordination break down?',
 'We provide a single point of contact. Can we meet?',
 'We take full responsibility for every system and vendor regardless of scope.',
 'The contact describes an ownership problem. Discover the failed handoffs before positioning coordination.',
 'Service accountability does not mean unlimited responsibility.',['accountability','escalation','poc']);
add(6,'Positioning','Extra capacity for a defined project','Project support is verified; ongoing co-management is optional.','We are keeping internal IT, but a rollout is stretching the team.','continue',
 'What is the rollout, and which part could benefit from extra project capacity?',
 'Let’s discuss our full co-managed package.',
 'We can take over the department so your staff no longer needs to do the work.',
 'A stated workload issue supports project discovery while preserving internal ownership.',
 'Do not substitute an ongoing service model for the stated project without agreement.',['project-work','co-managed','overflow']);
add(7,'Positioning','Cloud plans, business outcomes','Architecture and pricing belong with the MSP specialist.','We’re considering moving more services to the cloud.','continue',
 'What is driving that change, and what should it improve for the business?',
 'Our specialist can explain cloud options in a meeting.',
 'Move everything to our platform; it is always cheapest and safest.',
 'There is a planning signal, but desired outcomes and decision stage remain unknown.',
 'Do not prescribe architecture or guarantee cost and security outcomes.',['cloud-migration','discovery','handoff']);
add(8,'Positioning','Support first, security where relevant','The MSP offers IT support, cloud, and security services.','We need better user support, not another security pitch.','continue',
 'Understood. What is not working with the support your users receive?',
 'We also have support. Let me explain our entire portfolio.',
 'Support can wait; a cyberattack is the real issue you should worry about.',
 'The prospect states the priority. Adapt to support instead of returning to a security script.',
 'If required support is outside the offering, acknowledge the mismatch.',['help-desk','msp','discovery']);
add(9,'Objections','Microsoft 365 and MFA are already in place','The account’s technical configuration has not been assessed.','We have Microsoft 365 and two-step verification, so we’re covered.','continue',
 'Good to know. Who manages support and administration, and are there IT priorities you are reviewing?',
 'Those are useful protections. Would you like an assessment?',
 'That is not enough. Your environment is vulnerable and needs us.',
 'Tools describe part of the setup, not all service needs. Ask at business level without diagnosing risk.',
 'Do not dismiss MFA or assert weaknesses. Stop if further discussion is declined.',['microsoft-365','mfa','managed-it']);
add(10,'Objections','Too small to be a target','Security is one service, not the assumed reason every business needs an MSP.','We’re too small for hackers to care about us.','continue',
 'Which systems are essential to daily work, and who supports them when there is a problem?',
 'Small businesses can be targeted too. Let’s book an assessment.',
 'A breach is inevitable unless you hire us.',
 'Explore operational dependency and coverage without turning risk into a scare tactic.',
 'Do not predict an attack or insist on a security discussion after a clear refusal.',['ransomware','business-continuity','discovery']);
add(11,'Objections','A provider trusted for years','Project support may be available when relevant.','We’ve used the same team for years and nothing has ever happened.','continue',
 'That relationship matters. Do you ever need help beyond their usual scope, or are projects and coverage fully handled?',
 'We can be a backup in case that relationship fails.',
 'Longstanding providers miss things, so you should hear us out.',
 'Loyalty deserves acknowledgment. Explore a complementary use case without manufacturing dissatisfaction.',
 'If coverage is confirmed and discussion is declined, do not challenge the relationship.',['vendor-review','project-work','coverage']);
add(12,'Objections','An internal team is already responsible','No gap or interest in external services is confirmed.','We have an internal IT department.','continue',
 'How does the team handle project spikes or work outside its usual capacity?',
 'Then co-managed IT is perfect for you.',
 'Internal departments cannot match MSPs, so outsourcing is obvious.',
 'The support model is known; capacity, priorities, and willingness to use external help remain open.',
 'Internal IT is not evidence of deficiency. Accept a fully covered setup.',['co-managed','overflow','discovery']);
add(13,'Objections','A clear no to co-management','For this account type the only confirmed offer is ongoing co-managed support.','We will not consider a co-managed arrangement.','close',
 'Understood. That is the model we offer here, so I’ll close this evaluation.',
 'Could we meet so you can hear more about co-management?',
 'I’ll rename it an assessment and introduce the same package later.',
 'The rejected model is the only available offer in this case. There is no current fit.',
 'Do not repackage the same offer to bypass the refusal. Contact exclusion is a separate request.',['co-managed','scope','disqualification']);
add(14,'Objections','An active contract that is working','The contact is calm and open to one brief question.','We have an active contract and we’re satisfied.','continue',
 'When do you normally review service levels and future priorities before the next term?',
 'I’ll call when the contract expires.',
 'Every contract has an exit clause. Let’s discuss switching now.',
 'Review timing can be explored with permission. Satisfaction does not create immediate buying intent.',
 'Do not assert termination rights or assume future-contact permission.',['ced','renewal-window','vendor-review']);
add(15,'Objections','Not interested in AI','The MSP also offers ordinary support and cloud services.','We are not interested in AI.','continue',
 'Is the concern specifically AI, or are you declining any discussion about IT support and cloud as well?',
 'Then I’ll send our other services without checking interest.',
 'You need AI to stay competitive. Let me explain why.',
 'One clarification can establish the rejection’s scope and correct a positioning mismatch.',
 'Respect the answer rather than turning AI into a debate.',['ai','positioning','msp']);
add(16,'Objections','A neutral first “not interested”','This is the first rejection. Tone is neutral and the contact has not ended the call.','We’re not interested.','continue',
 'Understood. Is IT fully covered for the foreseeable future, or is the timing simply wrong?',
 'Okay, I’ll put you down for a call next month.',
 'You need to hear every benefit before saying no.',
 'A proportionate clarification can be reasonable while the contact remains receptive.',
 'A repeated, clipped, or emphatic refusal ends the pitch. There is no rebuttal quota.',['objection','permission','recycle']);
add(17,'Gatekeepers','The listed director has left','Reception is willing to help with routing.','That person no longer works here.','route',
 'Who now oversees IT services or outside IT vendors?',
 'I’ll send another email to the former director.',
 'I’ll mark the entire company as not interested.',
 'A stale contact record calls for current ownership, not account-level disqualification.',
 'Respect limits on sharing; a department or general route can be useful.',['dm','poc','crm']);
add(18,'Gatekeepers','The contact changed roles','The former director still works at the company.','She is no longer the director; she moved into another role.','route',
 'Who took over that responsibility, and what is the best way to reach them?',
 'Can she still take a meeting for IT anyway?',
 'A former director must still approve IT purchases.',
 'Employment and decision authority are different. Update the role and find the responsible person.',
 'Do not assume the former role still carries authority.',['dm','poc','handoff']);
add(19,'Gatekeepers','Corporate decides, general inbox only','The local office cannot authorize providers but offers a vendor email route.','Corporate decides. We only have a general email address.','route',
 'Which corporate team should I address, and what helps them route a vendor introduction?',
 'I’ll email and record corporate as interested.',
 'A general inbox is useless. Give me a director’s personal number.',
 'A permitted route exists; no need or meeting is confirmed. Improve the handoff within that route.',
 'Do not demand private details or invent interest.',['corporate-it','gatekeeper','handoff']);
add(20,'Gatekeepers','Who gave you my number?','The CRM confirms a campaign marketing list as the source; no referral is recorded.','Who gave you my number?','continue',
 'It came from the marketing list for this campaign. Would you prefer I stop, or clarify why I reached out?',
 'We have your details. Can I explain the service?',
 'Your colleague referred you, so you should meet us.',
 'The immediate issue is transparent sourcing and whether the contact wants to continue.',
 'Use only the verified source and honor any requested contact restriction.',['crm','permission','opt-out']);
add(21,'Gatekeepers','Leave a message for the boss','No decision-maker conversation has occurred. Reception offers a message.','Leave the message and I’ll pass it to my boss.','route',
 'Thank you. Please pass on my name, callback number, and our IT-project-support purpose. Is there a preferred time to reach them?',
 'Tell your boss we want fifteen minutes to introduce ourselves.',
 'I’ll record the discovery appointment as accepted.',
 'A relevant message and optional routing question are proportionate. Forwarding is not meeting acceptance.',
 'If no timing guidance is available, leave the message and end courteously.',['gatekeeper','voicemail','cta']);
add(22,'Gatekeepers','The boss is on vacation','The return date is unknown. Reception is open to a routing question.','My boss is on vacation.','route',
 'When would be a sensible window to try again, or is there another preferred contact route?',
 'I’ll try tomorrow.',
 'Can you interrupt the vacation to book today?',
 'Unavailability is an access limitation. A realistic window adds more value than an immediate retry.',
 'Do not equate absence with disinterest or pressure for personal access.',['callback','gatekeeper','permission']);
add(23,'Gatekeepers','The assistant coordinates evaluations','Vendor evaluation is part of this assistant’s role.','I coordinate evaluations before the director reviews them.','continue',
 'What do you need to assess relevance, and how does a suitable option move to the director?',
 'I’ll send the complete catalog for you to forward.',
 'I only speak to directors. Please transfer me.',
 'The assistant participates in the process. Understand criteria and handoff rather than dismiss the role.',
 'Do not attribute final approval authority unless confirmed.',['influencer','dm','handoff']);
add(24,'Gatekeepers','The formal procurement route','Supplier introductions are accepted through a portal.','All proposals go through procurement. We do not transfer sales calls.','route',
 'Where can I find the submission requirements and supplier review process?',
 'Can you make an exception for a short introduction?',
 'I’ll call other extensions to get around the policy.',
 'The available opening is procedural routing, not discovery with reception.',
 'Use the accepted channel; do not evade contact restrictions.',['procurement','gatekeeper','scope']);
add(25,'Discovery','Two new locations next quarter','The operations contact is open to discussing the expansion.','We’re opening two locations next quarter.','continue',
 'What does that change for IT, and how are you planning support for the new locations?',
 'That sounds like growth. Let’s introduce our company.',
 'You definitely need to replace your provider.',
 'Expansion is a signal, not a confirmed gap. Explore how support requirements change.',
 'Growth does not automatically create a buying event.',['onsite','project-work','discovery']);
add(26,'Discovery','A cloud migration is being discussed','No platform or outside support has been selected.','We’re planning a cloud migration.','continue',
 'What is driving it, where are you in planning, and who evaluates outside help?',
 'Let’s meet and have the specialist discover all the context.',
 'I can prescribe the exact platform right now.',
 'Motivation, stage, and ownership help establish relevance and prepare a specialist handoff.',
 'Stay at business level; architecture and prices belong with the specialist.',['cloud-migration','dm','handoff']);
add(27,'Discovery','Slow support needs context','A delay is mentioned, but frequency and business effects are unknown.','Support takes too long to get back to us.','continue',
 'What happens while you wait, and which requests are most affected?',
 'We are responsive. I’ll send our details.',
 'We guarantee resolution of every incident within an hour.',
 'Explore operational impact. Response frustration does not justify a resolution guarantee.',
 'Do not promise service levels outside approved scope.',['response-time','resolution-time','sla']);
add(28,'Discovery','The same issue keeps returning','The SDR is gathering business context, not diagnosing a fault.','Problems return even after the tickets are closed.','continue',
 'What repeats, who follows it through, and how does it affect your team?',
 'Our monitoring might help. Shall we meet?',
 'That proves your provider is incompetent.',
 'Recurring issues may reveal ownership or impact worth exploring without assigning a technical cause.',
 'Do not diagnose or blame from this information alone.',['ticket','accountability','rmm']);
add(29,'Discovery','New hires are waiting to work','New staff face delays in equipment readiness and access.','New hires sometimes wait days before they can work normally.','continue',
 'Which part causes the delay, and who coordinates equipment, access, and support?',
 'We handle onboarding. I’ll introduce the whole service.',
 'Send their credentials so I can fix it now.',
 'The operational delay is concrete. Clarify handoffs and impact before proposing specialist discovery.',
 'Do not request credentials or start technical work in a prospecting call.',['onboarding','endpoint','help-desk']);
add(30,'Discovery','A growing internal backlog','Internal IT remains responsible, but projects are uncompleted.','Our team is overloaded and the backlog keeps growing.','continue',
 'Which work is delayed, and what would extra capacity need to accomplish?',
 'We offer co-management. Would a brochure help?',
 'You need to outsource the entire department.',
 'Explore the specific capacity need while preserving internal ownership.',
 'A backlog does not prove the team needs replacing or that one package fits.',['overflow','project-work','co-managed']);
add(31,'Discovery','A stable setup with no review','An initial question has confirmed support, project coverage, and no planned changes.','Everything is covered and we have no plans to evaluate anything else. Thanks anyway.','recycle',
 'Understood. There is no reason to pursue a meeting now. Thank you for the context.',
 'I’ll keep you on monthly callbacks in case that changes.',
 'We need to find something wrong before I end the call.',
 'There is no current opening or future-contact agreement. A respectful exit is appropriate execution.',
 'An internal recycle status is not permission for a new cadence.',['recycle','permission','disqualification']);
add(32,'Discovery','A problem without current priority','The prospect remains conversational but has not explained the low priority.','It is a problem, but it is not a priority right now.','continue',
 'What would need to change for it to become a priority, and is there a review point worth noting?',
 'I’ll mark nurture and call sometime next month.',
 'If it is a real problem you must meet today.',
 'Pain and readiness differ. Clarify the trigger instead of creating urgency or timing.',
 'Without a trigger or permission, step back rather than invent nurture.',['pain-point','nurture','renewal-window']);
add(33,'Next steps','Email with room for a CTA','The contact is receptive; subject and next step are undefined.','Send me an email about what you do.','continue',
 'Would support coverage or project help be useful to highlight, and would a brief follow-up after review be welcome?',
 'Sure, I’ll send the brochure and leave it with you.',
 'I’ll email a calendar invitation and count it as a meeting.',
 'There is room to clarify relevance and ask about follow-up. Email permission alone is not meeting acceptance.',
 'If the contact limits the action to email only, honor that limit.',['cta','permission','nurture']);
add(34,'Next steps','Email permission, nothing more','The contact explicitly limits the scope of the send.','Email a short overview, but that is all. We will contact you if interested.','nurture',
 'Understood. I’ll send the overview and record that no callback or meeting was agreed.',
 'I’ll send it. Can I also get a date for a call?',
 'An email send lets me add you to our call sequence.',
 'A useful email handoff can be complete without a dated callback when permission is expressly limited.',
 'Do not mark a miss for respecting email-only scope.',['permission','nurture','cta'],
 'A new commitment request after “that is all” disregards the limit already stated.');
add(35,'Next steps','A callback after vacation','Reception offers a return window and welcomes a call afterward.','She returns next Monday. Call after she is back.','nurture',
 'Is later that week better, and should I use this number about IT planning?',
 'Great, I’ll call first thing Monday.',
 'I’ll reserve her discovery appointment for Monday.',
 'A callback is welcomed. Clarify the window and route without converting it into a meeting.',
 'Reception’s timing guidance is not the director’s appointment acceptance.',['callback','cta','dm']);
add(36,'Next steps','Renewal date versus review window','The current service works well; the prospect is willing to discuss timing.','Our contract renews in six months.','continue',
 'When do you start reviewing the next term, and would reconnecting before that planning be useful?',
 'I’ll call exactly six months from now.',
 'The renewal means you agreed to evaluate us.',
 'Expiration is known. Review lead time and contact permission remain unknown.',
 'Do not invent notice periods, termination rights, or a future appointment.',['ced','renewal-window','vendor-review']);
add(37,'Next steps','Will the assessment cost us?','The SDR has no approved fee information for this assessment.','If we do a third-party assessment, will you charge us?','continue',
 'I don’t want to give inaccurate terms. May I confirm scope and whether fees apply before you decide?',
 'The specialist can explain once you attend a meeting.',
 'All assessments are free and can never have a charge.',
 'Cost is a condition of interest. Confirming approved terms is a legitimate step without requiring the SDR to quote.',
 'Do not promise gratuity or use an appointment to avoid this concern.',['third-party-assessment','scope','handoff']);
add(38,'Next steps','What is the discovery meeting for?','The prospect wants to explore local support for an office move. Two available slots are verified.','What would we actually discuss in the meeting?','book',
 'Your office move, the onsite help needed, and whether our coverage fits. Would either verified slot work?',
 'It is just an introduction to our company.',
 'It is where you approve our service contract.',
 'Mutual relevance supports explaining purpose and seeking a specific voluntary appointment.',
 'Discovery does not approve an assessment, contract, or purchase.',['discovery','cta','onsite']);
add(39,'Next steps','Another stakeholder needs to join','The contact wants a cloud-planning discussion and says the IT lead should participate.','I’m interested, but our IT lead needs to be involved.','book',
 'What should we cover together, and how would you like to coordinate a time with the IT lead?',
 'I’ll book with you and explain it to them afterward.',
 'I’ll add your director and IT lead without checking.',
 'The prospect identifies a relevant participant. Agree purpose and coordination instead of bypassing the role.',
 'Do not record absent stakeholders as accepted attendees.',['stakeholder','dm','handoff']);
add(40,'Next steps','A soft yes without a time','Relevance is established. Tuesday at 10 and Thursday at 2 are verified options.','Sure, we can talk sometime about coverage.','book',
 'Would Tuesday at 10 or Thursday at 2 work for a 20-minute coverage discussion? Let’s confirm your time zone and attendees.',
 'I’ll send something and we can figure out the time later.',
 'That counts as booked even without a date.',
 'Interest supports a concrete appointment ask. Confirm details before recording a booked meeting.',
 'Two slots are helpful after interest, not a quota to impose after refusal.',['cta','discovery','handoff']);
add(41,'Nurture & exit','Busy today, open another time','The prospect offers another window, without accepting discovery yet.','I’m busy today. Try Thursday afternoon.','nurture',
 'I’ll note Thursday afternoon for a brief introduction. Is this the best number, and which time zone?',
 'I’ll try tomorrow instead.',
 'Before you go, answer all our qualification questions.',
 'Availability is the blocker and a callback window is offered. Preserve the agreement.',
 'Do not convert a callback into an appointment or continue the full pitch now.',['callback','nurture','permission']);
add(42,'Nurture & exit','Retake it after the expansion','Potential project support is acknowledged; the prospect welcomes a later email.','Our expansion decision is in March. You can email afterward.','nurture',
 'I’ll email after the March decision to check whether project support is relevant. Is that the right scope?',
 'I’ll call throughout approval to stay visible.',
 'The expansion is approved, so I’ll forecast a sale.',
 'A trigger, channel, and permission exist. Approval and buying intent are not confirmed.',
 'If the trigger changes or disappears, reassess the opportunity.',['nurture','project-work','permission']);
add(43,'Nurture & exit','“I already answered that.”','The SDR repeats a coverage question after it was answered.','I already told you our current team handles that.','recycle',
 'You’re right; you did answer it. I’ll leave it here. Thank you for your time.',
 'Let me ask the same thing another way.',
 'I need a different answer before I can finish.',
 'Acknowledge the answer and stop repetition rather than add a rebuttal.',
 'Persistence is not a requirement to exhaust the contact’s patience.',['active-listening','recycle','objection']);
add(44,'Nurture & exit','The tone is now defensive','Two clear refusals followed a polite introduction.','This is frustrating. We said we are fine.','recycle',
 'Understood. I’ll stop here. Thank you for your time.',
 'Can I at least send an email before you go?',
 'You misunderstand our value. Let me explain again.',
 'The contact is closing. De-escalation protects the relationship and is appropriate execution.',
 'Do not add a last offer after a firm closing; handle exclusion if requested.',['recycle','permission','objection']);
add(45,'Nurture & exit','Satisfied, no review planned','Discovery confirms full coverage, no project, and no future-contact agreement.','We’re happy and are not evaluating changes.','recycle',
 'Thank you for clarifying. I’ll record that there is no current review or agreed next step and end here.',
 'I’ll interpret that as monthly follow-up permission.',
 'Every business needs alternatives, so you must meet us.',
 'There is no current opening or agreed nurture. Leave an accurate record and a respectful impression.',
 'Future reassessment needs a valid trigger and permitted outreach; recycle is not consent.',['recycle','vendor-review','permission']);
add(46,'Nurture & exit','“Maybe later,” repeatedly','Several windows passed. The prospect declines another date and gives no change trigger.','Maybe later. I cannot say when this would matter or commit to a call.','recycle',
 'Understood. I won’t keep pursuing a date now. I’ll note no follow-up is agreed.',
 'I’ll pick dates and keep sending invitations.',
 'I’ll mark a meeting accepted to keep momentum.',
 'Repeated deferral with no trigger does not support a firm appointment or defined nurture.',
 'A single reasonable reschedule is different; this scenario specifies a repeated pattern.',['recycle','cta','crm']);
add(47,'Nurture & exit','The project was canceled','This opportunity existed only for an office migration.','The migration is canceled. There is no related work to evaluate.','close',
 'Thanks for the update. I’ll close the migration opportunity with that reason.',
 'I’ll leave it open indefinitely in case it returns.',
 'We should meet about the migration as if it were proceeding.',
 'The project need no longer exists. Closing keeps the pipeline accurate.',
 'Do not infer permanent contact exclusion; the project and contact preferences are separate.',['disqualification','crm','project-work']);
add(48,'Nurture & exit','Remove me from the calling list','The request applies to sales calls from this company.','Remove me from your sales calling list. No more calls.','exclude',
 'Understood. I’ll stop and record your request for exclusion from our sales calls through our process.',
 'I’ll mark not interested and try next quarter.',
 'I can avoid that restriction with another number.',
 'This is an explicit contact restriction. End and handle its scope.',
 'Do not recycle the restricted contact or evade the request through another route.',['do-not-contact','opt-out','crm']);
add(49,'Discovery','A migration need in a passing comment','QuickBooks is mentioned. Application-specific service fit still needs specialist verification.','Actually, we need help migrating QuickBooks.','continue',
 'What are you moving from and to, what is the timing, and who coordinates the project?',
 'Great, let’s introduce our company.',
 'I guarantee compatibility and a seamless migration now.',
 'A concrete project deserves follow-up before a meeting ask. Capture context without designing the migration.',
 'Do not assume the MSP supports this application or guarantee results.',['cloud-migration','project-work','handoff']);
add(50,'Discovery','Separating from a parent company','A warm outbound follow-up references a verified transition inquiry.','We need equipment, email, and data moved before our parent-company agreement ends.','continue',
 'Which transition date is fixed, who is involved, and what must be ready by then?',
 'I’ll book an introduction with no handoff context.',
 'I’ll guarantee completion before checking the work.',
 'The transition has dependencies, a deadline, and decision stakeholders that the SDR can clarify.',
 'A contract date is not a delivery commitment.',['project-work','ced','handoff']);
add(51,'Discovery','The landlord handles IT','The business uses web-based applications and some landlord-provided support.','The landlord handles IT. Our applications are all web-based.','continue',
 'Does that cover application access and user support too, or are those owned by someone else?',
 'Then every IT responsibility belongs to the landlord.',
 'Web applications are unsafe; you need our package.',
 'Ownership may differ by service. Clarify the arrangement without declaring a gap.',
 'If the contact does not know or declines details, seek only an appropriate route or close.',['cloud','managed-it','poc']);
add(52,'Discovery','Internal IT plus an MSP','Two support resources are named but their responsibilities are not.','We have internal IT, an MSP, and an AI policy already.','continue',
 'How do internal IT and the MSP divide responsibilities, especially for new projects?',
 'Then I’ll describe our AI conference in detail.',
 'Two teams prove duplication; we can eliminate one.',
 'Build on the mixed model by exploring ownership and priorities instead of returning to a generic offer.',
 'Do not assume overlap is waste or an AI policy is AI buying intent.',['co-managed','ai','project-work']);
add(53,'Discovery','A plan awaiting approval, a rushed contact','The contact contributes to planning but is entering a meeting.','Next year’s plan awaits approval. Email me; we can discuss scheduling. I’m walking into a meeting.','nurture',
 'Of course. I’ll reference the pending priorities briefly. May I include a couple of verified meeting options?',
 'Before you go, explain the entire approval chain.',
 'The plan is approved, so this is a qualified project.',
 'Planning context and email permission exist, but neither approval nor a meeting is confirmed.',
 'Respect the time limit and document the uncertainty.',['stakeholder','permission','handoff']);
add(54,'Call craft','Backup team or data backup?','The SDR meant personnel coverage. The prospect understood data protection.','Yes, we already back up all our data.','continue',
 'Thank you. I meant coverage when your IT person is unavailable, not data copies. How is that handled?',
 'Great, both kinds of backup are covered.',
 'You answered incorrectly. Let me finish.',
 'The ambiguity is in the SDR’s wording. Clarify it without blaming the prospect.',
 'Data backup is not evidence of personnel coverage.',['backup','coverage','active-listening']);
add(55,'Discovery','Can the MSP serve this location?','Required onsite support is outside the MSP’s verified coverage information.','We need someone physically here, and you are in another state.','continue',
 'Let me confirm whether we serve your location before proposing an onsite-support meeting.',
 'Remote support means location cannot matter.',
 'We have immediate technicians in every location.',
 'Geographic fit is unresolved and material. Verify before promising or prematurely disqualifying.',
 'If necessary onsite coverage is unavailable, close that opportunity with the confirmed reason.',['onsite','scope','icp']);
add(56,'Call craft','Do you know what our business does?','Preparation did not establish the company’s business accurately.','Do you actually know what we do?','continue',
 'I don’t want to guess. Could you briefly clarify the operation so I can judge whether my call is relevant?',
 'You are like our other customers, right?',
 'I’ll guess an industry and agree even if corrected.',
 'Honesty can recover credibility. A confident guess does not replace account understanding.',
 'If the contact closes the conversation, stop rather than press to repair the mistake.',['icp','discovery','active-listening']);
add(57,'Gatekeepers','Transferred, but to whom?','Reception transfers the call to an employee whose role is unconfirmed.','I was asked to take your call. What is it about?','route',
 'I’m calling about outside IT support. Do you coordinate that, or is someone else the appropriate contact?',
 'Thanks. Here is our complete AI and support presentation.',
 'A transfer means you are the decision-maker.',
 'A connection does not establish authority. Clarify the role and pause for the answer.',
 'Do not pitch through an unanswered role question.',['dm','gatekeeper','active-listening']);
add(58,'Gatekeepers','Existing customer or sales call?','No customer relationship is recorded.','Is this about an existing account with us?','route',
 'No, this is a prospective vendor introduction about IT support. What is your accepted route for those inquiries?',
 'It is about your IT account; I need the manager.',
 'Yes, we already work with you, so transfer me.',
 'Answer the factual routing question directly before asking for the appropriate process.',
 'Do not imply an existing relationship or deny a commercial purpose.',['gatekeeper','poc','permission']);
add(59,'Gatekeepers','A referral name you may use','The contact identifies the IT owner and allows a name reference.','You can mention that I pointed you to the IT manager.','route',
 'Thank you. What is the best route and timing, and how should I describe your referral?',
 'I’ll say you recommended purchasing our service.',
 'I’ll record that the IT manager accepted a meeting.',
 'The referral improves access; it does not establish buying intent or acceptance by the referred person.',
 'Use the name only within its actual permission and verify details when available.',['referral','dm','handoff']);
add(60,'Gatekeepers','Sold business, no corporate number','Local staff know ownership changed but have no headquarters phone number.','The practice was sold. Headquarters handles IT, but I do not have their number.','route',
 'Do you know the parent-company name or an accepted general route for vendor inquiries?',
 'No number means there is nothing useful to record.',
 'The branch can approve us regardless of corporate ownership.',
 'Corporate identity can be actionable even without a direct number.',
 'Do not demand information the contact does not have.',['corporate-it','crm','poc']);
add(61,'Next steps','January or this time next year?','Two inconsistent descriptions of future timing are given.','Reconnect in January 2028—this time next year.','continue',
 'Which month and year should I record, and is that tied to a service review?',
 'I’ll choose whichever date seems likely.',
 'I’ll record booked meetings for both dates.',
 'Permission exists but timing is ambiguous. Clarify before logging the task.',
 'Do not silently resolve conflicting dates or turn a callback into a meeting.',['callback','ced','crm']);
add(62,'Call craft','An IVR loop without progress','Four minutes of repeated menus produced no live contact or new route.','Automated system: To return to the main menu, press nine.','recycle',
 'Stop the unproductive route, note the limitation, and review a permitted alternative before another attempt.',
 'Repeat the same menus for several more minutes.',
 'Fail discovery and accuse the SDR of intentional call camping.',
 'There was no live discovery opportunity. Navigation time can be coached without inventing intent.',
 'Duration alone does not prove misconduct. Unavailable sales stages are not failures.',['ivr','non-controllable','not-reviewed']);
add(63,'Call craft','One-way audio after retries','An audio issue is evident, but its technical cause is unknown.','I can hear you, but you do not seem to hear me.','recycle',
 'Stop repeated attempts, check the connection, and document the technical limitation before an appropriate retry.',
 'Retry immediately several times without checking audio.',
 'Mark the SDR as intentionally avoiding conversations.',
 'The controllable next step is a connection check. Failed audio does not establish cause or intent.',
 'Separate technical limitations from observable delivery choices.',['non-controllable','not-reviewed','crm']);
add(64,'Call craft','Webinar invitation is not discovery','The campaign is about webinar registration. Only voicemail is reached.','Please leave your message.','route',
 'Leave a brief event message with verified details and callback number; record voicemail, not registration or discovery.',
 'Count the person as registered after leaving a message.',
 'A webinar invitation is a qualified sales appointment.',
 'The available step is an event message. Registration, attendance, and a commercial meeting are separate outcomes.',
 'Use verified registration status and event time zone only.',['voicemail','cta','crm']);
add(65,'Nurture & exit','That benefit is already covered, too','Extra support coverage has been offered, answered, and declined again.','That is covered too. I have your number and will call if things change.','recycle',
 'Understood. You have coverage and my number. Thank you for your time.',
 'Could I ask about one more hypothetical failure?',
 'I’ll keep requesting an email until you agree to something.',
 'The benefit is answered and the prospect is closing. No proactive follow-up was agreed.',
 'Do not keep adding offers after a firm closing.',['active-listening','recycle','permission']);
add(66,'Next steps','Booked meeting, overstated expectations','A meeting is accepted; response commitments and assessment scope remain unverified.','Before we meet, can you guarantee immediate fixes and a complete AI assessment?','continue',
 'I’ll record those priorities, but the specialist needs to confirm response commitments and assessment scope.',
 'We are responsive; I’m sure that will be fine.',
 'Yes, every fix is immediate and the assessment covers everything.',
 'An appointment is positive, but requirements remain unresolved. Acknowledge and hand off without assurances.',
 'Meeting acceptance never makes an unsupported promise acceptable.',['sla','scope','handoff']);
add(67,'Assessments','A second opinion without switching','An approved complimentary initial review is available for this training account, subject to confirmed scope.','Could our current provider use the review findings?','continue',
 'Yes, they can inform your discussion with them. What would make an outside review useful?',
 'It only makes sense if you replace the provider.',
 'We guarantee findings your current provider missed.',
 'Independent input can justify discovery without dissatisfaction or a declared pain point.',
 'Do not guarantee findings or require a switch. Confirm eligibility, scope, and interest.',['third-party-assessment','scope','vendor-review']);
add(68,'Assessments','Our provider reviews everything','The prospect is open to explaining the review process.','Our provider already reviews everything.','continue',
 'What does that review cover, and would an outside perspective add anything—or is that covered too?',
 'A provider’s own review never counts.',
 'All providers miss weaknesses; another assessment is mandatory.',
 'Review scope is unknown. Clarify while allowing that another evaluation may add no value.',
 'External does not automatically mean impartial; do not invent review requirements.',['third-party-assessment','security-risk-assessment','scope']);
add(69,'Assessments','Are you criticizing our provider?','The SDR implied that current providers may miss security or compliance work.','Are you saying our provider cannot do its job?','continue',
 'I should not assume that. I meant an optional outside perspective, if useful—not a claim that they failed.',
 'I’m only saying we are more specialized.',
 'If they did their job, you would accept our assessment.',
 'Repair the unsupported implication and validate the relationship before further exploration.',
 'If clarification is declined, close politely rather than defend the original claim.',['third-party-assessment','positioning','active-listening']);
add(70,'Assessments','A recent independent assessment','A review was recently completed; one follow-up question is welcomed.','We just had an independent assessment.','continue',
 'Are there priorities still open where help would be useful, or is follow-through covered?',
 'Then repeat the same review with us immediately.',
 'Their findings must be wrong because we did not perform it.',
 'The relevant unknown may be implementation, not another assessment. A completed review is not automatic demand.',
 'If actions are covered and help is not wanted, step back.',['third-party-assessment','project-work','vendor-review']);
add(71,'Assessments','What will the assessment provide?','The approved review provides a scoped findings summary and a discussion of priorities.','What would we actually get from the assessment?','continue',
 'A findings summary within the agreed scope and a priority discussion. Which questions would you want it to answer?',
 'It is comprehensive; we can explain details later.',
 'It guarantees compliance and proves you cannot be hacked.',
 'Explain the verified deliverable and discover its desired value rather than rely on the assessment label.',
 'Do not promise immunity, certification, or unverified technical coverage.',['security-risk-assessment','compliance','scope']);
add(72,'Assessments','Discovery is not assessment approval','Only a conversation was accepted; no assessment work or terms were agreed.','I agreed to discovery, not to having you assess our systems.','book',
 'Correct. The call explores goals and options. Any assessment needs a separate agreement on scope and terms.',
 'A calendar acceptance should authorize the assessment.',
 'We can start technical work without discussing it.',
 'Clarifying the existing meeting purpose preserves discovery while respecting the work boundary.',
 'Do not infer assessment authorization or fees from an appointment.',['discovery','third-party-assessment','scope']);
add(73,'Discovery','Monthly renewal does not mean unhappy','The agreement renews monthly; no dissatisfaction is stated.','Our IT support is month to month.','continue',
 'What makes it work well, and what would matter if you reviewed alternatives?',
 'Then you must be ready to switch.',
 'Monthly renewal means there are no notice conditions.',
 'A renewal model describes timing, not satisfaction. Understand fit before comparing.',
 'Do not invent contract terms or infer weak loyalty from a short renewal cycle.',['month-to-month','vendor-review','scope']);
add(74,'Nurture & exit','Prepaid support hours still unused','A substantial balance remains; a review before replenishment is welcomed.','We have hours left. Email before we buy the next block in June.','nurture',
 'I’ll note a June email before replenishment to check whether a comparison would help.',
 'I’ll call weekly until you use those hours.',
 'Unused hours have no value, so switch today.',
 'The balance affects timing and a specific future review is welcomed. Preserve the trigger and channel.',
 'Do not dismiss commitments or record future review as a purchase.',['blocks-of-time','nurture','vendor-review']);
add(75,'Discovery','Break/fix and preventive ownership','The prospect calls a technician when issues occur. Ongoing responsibilities are unknown.','We have a guy. We call when something breaks.','continue',
 'Who handles updates, backup checks, and recurring issues between those calls?',
 'Managed support is automatically a like-for-like replacement.',
 'Break/fix technicians never do preventive work.',
 'Explore the actual service before comparing. A label does not establish missing coverage.',
 'If prevention is covered, use that answer rather than repeat the gap assumption.',['break-fix','patch-management','backup']);
add(76,'Discovery','The technician does prevention, too','Updates, monitoring, and backup checks are confirmed as included.','Our technician handles those things between incidents, too.','continue',
 'Thanks for clarifying. What ongoing agreement and coverage do you have with them?',
 'I’ll keep calling it basic break/fix because that was the first label.',
 'That is impossible unless you have an MSP contract.',
 'The answer changes the picture. Clarify the real arrangement instead of forcing a category.',
 'If coverage and priorities are addressed with no interest, end respectfully.',['break-fix','managed-it','active-listening']);
add(77,'Objections','A friend or family member provides IT','The personal relationship matters and the contact is receptive.','A family friend takes care of our computers.','continue',
 'That can work well. How do urgent issues get handled if they are unavailable?',
 'A company is always better than a family friend.',
 'Stop trusting them and outsource immediately.',
 'Continuity can be explored without judging competence or undermining a personal relationship.',
 'Accept a covered arrangement or a refusal to discuss further.',['coverage','break-fix','active-listening']);
add(78,'Gatekeepers','Why ask for computer count?','Account-size criteria matter for this MSP; reception may not know the count.','Why do you need to know how many computers we have?','route',
 'Only to check basic service fit. No problem if you do not know or prefer not to share; I can ask IT.',
 'We cannot continue without an exact count.',
 'You must disclose inventory before I explain the purpose.',
 'A sizing question can be explained without blocking a useful contact route.',
 'Do not demand inventory or treat refusal as failed discovery.',['icp','endpoint','gatekeeper']);
add(79,'Discovery','Corporate IT needs local hands','Local onsite project support is available in this MSP’s territory.','Corporate handles IT, but hands-on branch work is hard to coordinate.','continue',
 'Which tasks are difficult, and who at corporate evaluates regional onsite partners?',
 'Corporate IT means there is no local opportunity.',
 'We can bypass corporate and take over the branch.',
 'Local needs and central authority can coexist. Explore both.',
 'Do not bypass authority or assume branch-level approval.',['corporate-it','onsite','dm']);
add(80,'Discovery','A strong MSP with late migrations','The prospect values ongoing support but identifies a project issue.','Our MSP is great, but migrations always run late.','continue',
 'What migration is next, and what happens when deadlines slip?',
 'That proves the whole relationship should end.',
 'We guarantee every migration will finish early.',
 'A specific delivery issue can be explored separately from general provider satisfaction.',
 'Do not turn one friction into proof of a bad provider or a guarantee.',['cloud-migration','project-work','pain-point']);
add(81,'Positioning','An apples-to-apples comparison','The prospect welcomes comparison, but current and proposed scope differ.','Can you give an apples-to-apples comparison?','continue',
 'We need the same scope, coverage, and assumptions first. Which parts should the specialist compare?',
 'Any monthly fee compares directly with hourly support.',
 'I can quote exact savings without understanding the services.',
 'A meaningful comparison requires equivalent scope. Gather criteria and hand off the commercial evaluation.',
 'Do not quote prices or call unlike services equivalent.',['apples-to-apples','scope','sla']);
add(82,'Nurture & exit','Projects are on hold','A planning window and later email permission are explicit.','Projects are frozen until our September review. You can write then.','nurture',
 'I’ll email around the September review to check whether priorities and capacity changed.',
 'I’ll send weekly requests until the budget changes.',
 'A freeze means you will never need support again.',
 'This is a timing condition with a welcomed review point, not a pricing negotiation.',
 'Do not manufacture urgency or assume a future project is approved.',['nurture','renewal-window','permission']);
add(83,'Call craft','A first voicemail with a purpose','Only voicemail is reached. Identity and callback details are verified.','Please leave your message after the tone.','route',
 'Leave your name, MSP, a brief support purpose, and the callback number in a concise natural message.',
 'Read the whole service catalog into the voicemail.',
 'Claim an urgent account problem to force a callback.',
 'The available behavior is a clear message, not needs discovery. About 15–25 seconds is a useful natural-delivery guide.',
 'Do not invent an account, prior conversation, or urgent problem.',['voicemail','cta','non-controllable']);
add(84,'Call craft','A truthful follow-up message','An earlier voicemail was left, but there has been no live conversation.','Voicemail: The person is unavailable.','route',
 'Identify yourself and follow up on your earlier message about project support, with a clear callback number.',
 'Say “following up on our conversation” despite only leaving voicemail.',
 'Pretend an urgent assessment was requested.',
 'Accurate context can improve a follow-up without inventing a relationship or request.',
 'Record the actual message outcome; no appointment or assessment was accepted.',['voicemail','handoff','crm']);

function follow(n,line,action,good,near,bad,evidence,limit){
 const p=CASES.find(c=>c.number===n);
 const options=[{text:good,scores:[2,2,2,2],why:evidence},{text:near,scores:n===25?[2,1,1,0]:[0,0,0,0],why:`This does not follow the new evidence. ${evidence}`},{text:bad,scores:[0,0,0,0],why:limit}];
 options.push(...options.splice(0,(n+1)%3));
 p.followup={...p,context:`Initial brief: ${p.context} Reassess using the latest answer below.`,transcript:[...p.transcript,['SDR',p.model],['Prospect',line]],action,options,evidence,limit,model:good,followup:undefined};
}
follow(16,'No. I do not want any more calls from your company.','exclude','Understood. I’ll stop and record your request for no more sales calls.','I’ll wait a few months and try again.','Let me explain one final benefit.','New evidence is an explicit no-contact request. A reasonable initial clarification does not justify another rebuttal.','Stop and handle the exclusion; do not recycle this contact.');
follow(21,'I cannot suggest a time. Leave the message and we will decide whether to respond.','route','Thank you. I’ll leave the brief message and note no callback or meeting was agreed.','I’ll choose a callback time for you.','Passing a message means your boss accepted discovery.','The message route remains useful, but no callback or appointment is authorized.','Do not keep asking after the scope is clear.');
follow(25,'We need local installation support and want to speak with your project specialist.','book','Let’s confirm the project purpose, participants, and a verified discovery time.','I’ll send a generic brochure and leave it there.','I’ll guarantee installation dates before specialist review.','A relevant need and a requested specialist conversation now support an appointment.','The meeting does not authorize work or establish delivery commitments.');
follow(33,'Just the overview by email. No calls or meeting invitations.','nurture','Understood. Only the overview; I’ll record the restriction on calls and invitations.','I’ll include an invitation just in case.','Email implies permission to call next week.','A limited send and explicit channel restriction are now agreed. Record and honor both.','Do not expand permission or add a calling cadence.');
follow(36,'We review in April. Please email in March before that starts.','nurture','I’ll note a March email ahead of the April review, without recording a meeting.','I’ll call in April instead.','I’ll record a likely sale at renewal.','Review lead time, channel, and permission are explicit. Preserve that agreement.','A review contact is not a meeting or purchase.');
follow(67,'A second opinion sounds useful. Can we discuss scope and eligibility before deciding?','book','Let’s arrange discovery to clarify those points before you decide on any assessment.','I’ll mark the assessment itself as approved.','I’ll begin reviewing systems before we speak.','Interest in a second opinion is a valid discovery reason without dissatisfaction.','Assessment work needs separate scope and terms.');
follow(75,'Our technician handles prevention too. We have enough coverage and do not want to discuss alternatives.','recycle','Thanks for clarifying. I’ll leave it here and note no follow-up is agreed.','Let me repeat the prevention pitch.','Your answer cannot be correct because this is break/fix.','The answer removes the assumed gap and closes the conversation. Update your decision.','Do not force a label or keep searching for pain after the refusal.');
follow(80,'We addressed it with them. There is now an agreed project plan, and we do not need another resource.','recycle','Understood. The issue is addressed, so there is no reason to pursue a meeting now.','Let’s meet about the old delays anyway.','I’ll say the provider is still failing despite the update.','The friction is addressed and outside help is not wanted. Reassess the opportunity.','Do not ignore a resolved issue to maintain pipeline.');
for(const n of [17,18,19,21,22,24,57,58,59,60,78,83,84]) CASES.find(c=>c.number===n).lens='Deeper discovery is not available here. Focus on a clear introduction, a legitimate contact route, and the permission actually offered.';
for(const n of [62,63,64]) CASES.find(c=>c.number===n).lens='There is no live discovery opening here. Record the contact outcome accurately; leave technical cause, intent, and downstream actions unconfirmed unless verified.';
for(const c of CASES)if(c.followup)c.followup.lens=c.lens;
if(typeof module!=='undefined')module.exports={CASES,ACTIONS,CRITERIA};
