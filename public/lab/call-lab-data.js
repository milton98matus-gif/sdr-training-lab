'use strict';
// Fictional, authored training paths. No live calls, customer records, or AI scoring.
const CALL_LAB_DATA=(()=>{
 const c=(label,say,next,grade,coach)=>({label,say,next,grade,coach});
 const n=(stage,line,skill,options)=>({stage,line,skill,options});
 const end=(line,outcome,title,note)=>({end:true,line,outcome,title,note});
 const calls=[{
  id:'expansion',number:'01',title:'Growing pains. Shared decisions.',tag:'Discovery & ownership',duration:'2–7 decisions',company:'Northline Studio',person:'Jordan · Operations lead',initials:'JS',color:'olive',
  summary:'An internal IT team. Two new offices. A decision that sits with corporate.',
  brief:'Fictional 75-person design business opening two offices. You reach the operations lead. Local needs and buying authority have not been established.',
  approved:'The training MSP offers IT support, cloud projects, and additional project capacity. Service scope and commercial terms need specialist review. No instant-resolution or savings guarantees are approved.',
  opening:'Hi Jordan, this is Alex with an IT services provider. We help businesses with support and cloud projects. How are you handling IT today?',
  start:'internal',nodes:{
   internal:n('Connect','We have our own IT person. We’re opening two offices, so it’s a busy time.','Discovery',[
    c('Explore the change','How will the two openings affect what your IT person needs to cover?','capacity','supported','Uses the expansion signal to explore impact before positioning a service.'),
    c('Lead with a meeting','Would you take fifteen minutes to hear about our services?','skeptical','partial','Asks for time before learning whether the openings create a useful reason to meet.'),
    c('Make an assumption','One IT person definitely won’t be enough. You need an MSP.','defensive','gap','Treats headcount as proof of inadequate support and challenges a setup you have not explored.')]),
   skeptical:n('Discover','Possibly, but why would we need that? We already have support.','Discovery',[
    c('Connect to their plans','You mentioned two openings. Is the existing team fully covered for those, or is there an extra workload?','capacity','supported','Returns to a prospect-supplied signal and tests relevance without assuming a problem.'),
    c('Push the calendar','It’s only fifteen minutes. Are you free tomorrow?','stop','gap','Repeats the ask without supplying a reason the prospect considers useful.')]),
   defensive:n('Recover','Our IT person is excellent. I’m not interested in replacing them.','Listening & boundaries',[
    c('Repair the assumption','You’re right; I assumed too much. Are the openings already covered, or is there a project workload worth understanding?','capacity','supported','Acknowledges the unsupported assumption and offers a focused clarification. Repair does not erase the earlier gap.'),
    c('Challenge their setup','That’s what everyone says until their IT person can’t keep up.','stop','gap','Dismisses the contact’s answer and increases pressure instead of gathering evidence.')]),
   capacity:n('Discover','The day-to-day is fine. The office setups and moving files into the cloud will take time we don’t really have.','Discovery',[
    c('Understand the impact','What could slip if the office setups and file move land on top of day-to-day support?','impact','supported','Explores the business effect of a specific workload the prospect has identified.'),
    c('Skip to a product','We have cybersecurity services. Can we discuss those?','offtrack','gap','Misses an explicit support-and-cloud need and substitutes an unrelated pitch.')]),
   offtrack:n('Recover','Security isn’t the issue I’m describing. It’s having enough time to get the offices ready.','Positioning',[
    c('Return to the actual need','Understood. Which part of getting the offices ready is hardest to resource?','impact','supported','Corrects the mismatch and explores capacity. The original missed signal remains available for coaching.'),
    c('Continue the security pitch','Security has to come first, regardless.','stop','gap','Ignores the clarified business need and insists on your preferred agenda.')]),
   impact:n('Relate','We could miss the opening date or leave our current staff waiting for help. Corporate selects vendors, though.','Positioning',[
    c('Relate capacity to ownership','Extra project capacity may be relevant here. How do local teams bring that kind of need to corporate?','corporate','supported','Connects verified services to the stated impact, then explores the decision route.'),
    c('Promise a result','We guarantee both openings will be on time and every ticket will be fixed immediately.','promise','gap','Commits to project and resolution outcomes that the approved brief does not support.'),
    c('Treat corporate as a dead end','Then there’s nothing we can discuss. Goodbye.','premature','gap','Closes before checking whether a legitimate route to corporate exists.')]),
   promise:n('Recover','How can you guarantee that before seeing the work?','Positioning',[
    c('Correct the commitment','I can’t guarantee it. I overstated that. A specialist would first need to understand the scope. How would corporate review that?','corporate','supported','Corrects the false commitment and returns to scope and ownership. The earlier promise still needs coaching.'),
    c('Double down','It’s just what an MSP does.','unreliable','gap','Repeats an unverified promise rather than clarifying its limits.')]),
   corporate:n('Advance','I can introduce you to our corporate IT lead by email. They’re reviewing project help next month.','Agreement & handoff',[
    c('Define a useful introduction','Would a short note on office setup and cloud project capacity be useful for that introduction? I’ll let corporate decide whether a discovery call makes sense.','introduced','supported','Agrees a relevant route without treating the local contact as the buyer or the introduction as a booked meeting.'),
    c('Claim a meeting','Great, I’ll mark a discovery appointment with corporate for next month.','notbooked','gap','An offered introduction and review window do not constitute an accepted appointment.')]),
   introduced:end('Yes. Send it to me, and I’ll make the introduction. Wait for us to reply; don’t call corporate directly.','route','A useful route is an outcome.','Signal: office setup and cloud migration capacity may affect opening dates. Jordan offered an email introduction to corporate IT during next month’s review. Send the agreed short note to Jordan. Await the introduction or reply; no direct corporate call is authorized. No discovery appointment is booked.'),
   notbooked:end('I haven’t agreed to a meeting. I only offered to forward an introduction. Please send the note and wait for our reply.','route','Correct the record before advancing.','Jordan offered an email introduction, not a meeting. Send only the relevant office-and-cloud capacity note and await a reply. Corporate owns vendor selection. Do not record a booked appointment or invent a callback.'),
   premature:end('Okay, goodbye.','close','A potential route went unexplored.','Current conversation ended after the SDR declined to explore corporate routing. Expansion workload was mentioned; corporate selection authority was known. No future contact, introduction, or appointment was agreed. Do not record the account as categorically unqualified.'),
   stop:end('We’re not interested. Please leave it there.','recycle','The next good move is to stop.','The contact gave a firm refusal after the SDR’s approach. End the pitch respectfully. No future contact was agreed. Recycle is an internal reassessment state, not permission to call again.'),
   unreliable:end('We won’t proceed on that basis. Please end the call.','close','Trust is part of the opportunity.','The contact declined the current approach after unsupported commitments. End the call. No appointment or future contact is agreed. The overpromise requires coaching and correction; do not claim verified service guarantees.')
  },
 },{
  id:'covered',number:'02',title:'“We’re already covered.”',tag:'Positioning & boundaries',duration:'1–6 decisions',company:'Harbor Accounting',person:'Taylor · Office manager',initials:'TM',color:'coral',
  summary:'Microsoft 365 and MFA are in place. The next question has to earn its place.',
  brief:'Fictional 30-person accounting business. The office manager answers. Support ownership, unmet needs, and interest in a second opinion are not yet known.',
  approved:'The training MSP offers support, cloud services, and security services. A specialist can discuss an independent review; eligibility, deliverables, and any fees have not been confirmed. Do not claim the prospect is vulnerable or that an assessment is free.',
  opening:'Hi Taylor, Alex here with an IT services provider. We help with day-to-day support, cloud services, and security. How is IT supported at your office?',start:'m365',nodes:{
   m365:n('Connect','We use Microsoft 365 and two-step verification. We’re already covered.','Positioning',[
    c('Acknowledge and clarify scope','That’s helpful context. Who handles day-to-day support and cloud changes when your team needs help?','support','supported','Acknowledges the existing controls and explores broader IT ownership without making a security diagnosis.'),
    c('Use a fear-based rebuttal','Those won’t stop hackers. You could be attacked any day.','defensive','gap','Uses an unverified threat claim about this account instead of establishing a business need.'),
    c('Assume no fit','Then you don’t need any IT services. Goodbye.','assumed','gap','Treats two named controls as proof that all support, cloud, and service needs are covered.')]),
   defensive:n('Recover','We’re comfortable with our setup. I don’t want a scare pitch.','Listening & boundaries',[
    c('Repair and ask permission','Fair point. I shouldn’t make assumptions about your setup. Is there a support or cloud project worth discussing, or should I leave it here?','covered','supported','Repairs the unsupported premise and gives the contact an easy way to close the conversation.'),
    c('Escalate the fear','People only think that until they get blackmailed.','firm','gap','Ignores the objection to the approach and adds pressure without evidence.')]),
   support:n('Discover','Our internal person does support. We sometimes have a backlog during busy season.','Discovery',[
    c('Explore the backlog','What tends to wait during busy season, and how does that affect the team?','impact','supported','Explores the type and effect of a stated service issue without proposing replacement.'),
    c('Assume a security need','That proves you need a security assessment.','misread','gap','A support backlog does not establish a security weakness or interest in an assessment.'),
    c('Push co-management immediately','Then let’s book a co-managed IT presentation.','comanage','partial','Introduces a service model before understanding the effect of the backlog or whether support help is welcome.')]),
   misread:n('Recover','I said tickets wait. I didn’t say we have a security problem.','Discovery',[
    c('Use the correction','You’re right. What kinds of tickets wait, and is that something you’d actually want help with?','impact','supported','Corrects the inference and checks the prospect’s actual support need.'),
    c('Continue the assessment pitch','The assessment will find something. They always do.','firm','gap','Invents a guaranteed finding and disregards the clarified concern.')]),
   comanage:n('Discover','We’re not looking for co-management.','Listening & boundaries',[
    c('Clarify once, without arguing','Understood. Is the backlog something you want to address another way, or is it acceptable for now?','covered','supported','Uses one proportionate clarification to understand whether any relevant need remains.'),
    c('Repackage the same offer','It’s not really co-management if we call it support coverage.','firm','gap','Renames a rejected offer instead of respecting the stated preference.')]),
   impact:n('Relate','New employee access waits a few days. It holds up client work. We’d be open to a second opinion, but are you going to charge us for an assessment?','Positioning',[
    c('Be precise about what is unknown','I can’t confirm assessment fees or eligibility. Would a discovery call to discuss the access delays and clarify review scope and any costs be useful?','willing','supported','Relates to the stated impact and offers discovery while clearly identifying unconfirmed assessment terms.'),
    c('Call the assessment free','It’s free and there’s no obligation. Let’s book it.','fees','gap','Promises assessment terms that the approved brief does not verify.')]),
   fees:n('Recover','Where does it say it’s free? I don’t want a surprise bill.','Agreement & handoff',[
    c('Correct the claim','I shouldn’t have said it was free. Those terms aren’t confirmed. We can first discuss scope and fees in discovery without authorizing an assessment. Would that be useful?','willing','supported','Retracts the invented fee promise and separates a discovery appointment from assessment authorization.'),
    c('Brush off the concern','We can sort that out after the assessment.','firm','gap','Avoids the fee question and implies a review can proceed without clarified agreement.')]),
   willing:n('Advance','Yes. A fifteen-minute discovery call on Thursday at ten would work. I’ll bring our IT lead.','Agreement & handoff',[
    c('Confirm the purpose and attendees','Thursday at ten for fifteen minutes, with you and the IT lead, to discuss access delays and clarify review scope and any fees. Which time zone and email should I use for the invitation?','booked','supported','Confirms purpose and attendees and resolves logistics. It does not represent discovery as an authorized assessment.'),
    c('Record assessment approval','Great. I’ll mark the assessment approved and tell the team to start testing.','unauthorized','gap','Confuses an accepted discovery conversation with permission to perform an assessment.')]),
   covered:n('Reassess','It’s covered now. We’ve cleared the backlog, no changes are planned, and we don’t want another provider conversation.','Listening & boundaries',[
    c('Accept the clarified situation','Understood. Thanks for clarifying. I’ll leave it there.','resolved','supported','Recognizes that the original possible need has been resolved and the contact has declined further discussion.'),
    c('Try another offer','What about a security assessment anyway?','firm','gap','Switches the pitch after the contact clarified the issue is resolved and declined another provider conversation.')]),
   firm:end('We are not interested. Please stop the pitch.','recycle','A firm refusal changes the next move.','Stop the pitch. The contact firmly declined further discussion. No follow-up or appointment was agreed. Internal recycle does not authorize another contact. The call does not establish a technical weakness.'),
   resolved:end('Thanks. Goodbye.','recycle','Resolved need. Respectful exit.','The possible backlog is now resolved. No changes or provider discussions are wanted. End respectfully; no future contact was agreed. Reassess internally only if a legitimate new basis emerges and contact rules allow it.'),
   assumed:end('Okay, goodbye.','close','The scope was never explored.','The SDR ended the current conversation after hearing M365 and MFA were in place. Broader support needs and interest remain unknown. Do not label the account technically covered in every area or unqualified on that basis.'),
   booked:end('Eastern time. Send it to my work email on file and I’ll include the IT lead. We’ll review scope and costs before approving any assessment.','book','Discovery is agreed. Scope stays open.','Discovery accepted: Thursday 10 a.m. Eastern, fifteen minutes, with office manager and IT lead, using the work email on file in this simulation. Purpose: employee access delays, review eligibility, scope, and any fees. No assessment, testing, free service, or commercial terms are authorized. Record this as an agreed appointment; invitation delivery is not verified.'),
   unauthorized:end('No. We only agreed to a discovery call, not testing. Keep it to Thursday’s discussion and clarify the terms first.','book','An appointment is not testing permission.','The contact retains the Thursday discovery discussion only. Clarify time zone and invitation details before recording complete logistics. Assessment and testing are explicitly not authorized. Coach the unauthorized commitment; no free-assessment terms are verified.')
  },
 },{
  id:'contract',number:'03',title:'The email is the agreement.',tag:'Next steps & restraint',duration:'3–7 decisions',company:'Cedar Logistics',person:'Morgan · Executive assistant',initials:'MA',color:'purple',
  summary:'An active contract. A director on vacation. Permission with a specific limit.',
  brief:'Fictional 50-person logistics business. The assistant answers the main business line. The director is away. You do not yet know vendor review timing or callback permission.',
  approved:'The training MSP offers general IT support and cloud services. No vendor replacement, cost saving, assessment price, or contract termination claim is verified. An assistant may coordinate a route without accepting a meeting for the director.',
  opening:'Hello, Alex calling about IT support and cloud services. Is the person who oversees your IT provider available?',start:'vacation',nodes:{
   vacation:n('Connect','My boss is on vacation, and we already have a contract.','Discovery',[
    c('Ask about a useful route','Understood. Do you coordinate IT provider inquiries, or is there a preferred way to pass along a brief introduction?','route','supported','Respects the absence and active contract while asking for an appropriate route.'),
    c('Assume callback permission','I’ll call your boss Monday morning then.','correction','gap','Invents a return date and permission to call based only on an absence.'),
    c('Attack the contract','You can probably cancel it. We’re likely cheaper.','defensive','gap','Makes unsupported claims about contract rights and savings.')]),
   correction:n('Recover','I didn’t say they’re back Monday, and I haven’t agreed to a callback.','Listening & boundaries',[
    c('Correct the assumption','You’re right. I shouldn’t assume either. Is there a preferred way to share a short introduction?','route','supported','Acknowledges both unsupported assumptions and lets the assistant define the route.'),
    c('Keep the invented callback','I’ll try Monday anyway.','dnc','gap','Overrides an explicit correction and risks the relationship.')]),
   defensive:n('Recover','We’re happy with them. Please don’t tell me how our contract works.','Listening & boundaries',[
    c('Repair the claim','That was an assumption, and I shouldn’t have made it. Is a brief introduction welcome for future reference, or should I leave it here?','route','supported','Retracts unsupported claims and asks permission to continue.'),
    c('Insist on replacing the provider','Every contract has a way out. Let’s discuss switching.','dnc','gap','Continues an unsupported replacement pitch after the contact objects.')]),
   route:n('Discover','You can send me an email and I’ll pass it along. We aren’t looking to switch now.','Agreement & handoff',[
    c('Clarify what would be useful','Would a short overview of support and cloud services be useful for future reference?','useful','supported','Makes the accepted email relevant without treating forwarding as buying interest.'),
    c('Convert forwarding into a meeting','Perfect. I’ll schedule your boss for a discovery meeting.','notmeeting','gap','Treats an assistant’s forwarding offer as the director’s meeting acceptance.')]),
   notmeeting:n('Recover','I only agreed to forward an email. My boss hasn’t agreed to speak with you.','Agreement & handoff',[
    c('Honor the actual agreement','Understood. I’ll keep it to a short introduction for you to forward. What should it focus on?','useful','supported','Corrects the recorded meaning of the agreement and seeks relevant content.'),
    c('Keep pressing for access','Can you give me the boss’s personal mobile instead?','dnc','gap','Escalates access after the assistant has clarified the limited handoff.')]),
   useful:n('Advance','Yes, support and cloud services only. Send it to the general inbox, addressed to me. No follow-up calls; we’ll reply if there’s interest.','Listening & boundaries',[
    c('Confirm the limited permission','I’ll send that short overview to the general inbox, addressed to you, and leave the next response with your team. No follow-up calls.','email','supported','Confirms the content, route, and contact restriction without adding an unsolicited callback.'),
    c('Ask for the review window anyway','When does the contract expire so I can follow up?','firm','gap','Adds an unsolicited follow-up agenda after the contact has explicitly limited permission to the send.'),
    c('Invent a callback','Great. I’ll call when your boss returns.','dnc','gap','Contradicts the express no-follow-up-call restriction.')]),
   firm:n('Reassess','I already said no follow-up. Just the email, please.','Listening & boundaries',[
    c('Stop probing','Understood. Just the agreed email, and no follow-up calls.','email','supported','Accepts the repeated limit and ends further discovery. The unnecessary probe remains a coaching gap.'),
    c('Try another channel','Then I’ll follow up on the director’s personal email.','dnc','gap','Attempts to evade the restriction through a different channel.')]),
   dnc:n('Honor the boundary','Actually, don’t email either. Remove our company from your outreach list.','Listening & boundaries',[
    c('Acknowledge and end','Understood. I’ll record the no-contact request through our process. Thank you for letting me know.','excluded','supported','Stops the pitch and acknowledges the explicit exclusion request. Completion of the operational process still requires verification.'),
    c('Treat it as a timing issue','I’ll recycle you and try again next quarter.','breach','gap','Misclassifies an explicit no-contact request as a future prospecting opportunity.')]),
   email:end('Thank you. That’s all we need.','nurture','A limited handoff can be complete.','Assistant accepts one short email on support and cloud services to the general inbox, addressed to them, for forwarding. Existing provider is satisfactory; no switch is sought. No follow-up calls are permitted; the team will reply if interested. No appointment or callback is agreed. This is a limited email handoff, not an active chase sequence. Email delivery remains unverified.'),
   excluded:end('Thank you. Goodbye.','exclude','Exclusion is a distinct outcome.','Explicit request: remove the company from outreach and do not email. End the pitch and follow the organization’s exclusion process. No nurture, alternate-channel outreach, or recycle-based recontact. Record the request accurately; process completion is not verified by the call alone.'),
   breach:end('No. Do not contact us again.','exclude','The request must be honored.','The contact explicitly prohibits further outreach. Correct any proposed recycle or future-contact plan and follow the exclusion process. The SDR’s stated recontact intention is a critical boundary gap. Completion of suppression must be verified separately.')
  },
 }];
 // Vary answer placement; the recommended response is not always the first card.
 for(const call of calls)for(const [id,node]of Object.entries(call.nodes))if(!node.end){
  const shift=[...call.id+id].reduce((sum,ch)=>sum+ch.charCodeAt(0),0)%node.options.length;
  node.options=[...node.options.slice(shift),...node.options.slice(0,shift)];
 }
 return {calls};
})();
if(typeof module!=='undefined')module.exports=CALL_LAB_DATA;
