// Educational simulations. No recordings or customer data.
const LEGACY_CASES = [
  {
    "id": "o1",
    "category": "Objections",
    "title": "An “I’m not interested” without context",
    "level": "Foundations",
    "company": "Scheduling software · 90-person company",
    "context": "The solution coordinates shifts across locations. You only know that the company operates at three sites. This is your first call.",
    "transcript": [
      [
        "SDR",
        "Hi, this is Alex from Turno. We help operations teams coordinate shifts across locations."
      ],
      [
        "Prospect",
        "Not interested. We already have a way to do that."
      ]
    ],
    "question": "What is the best next response?",
    "action": "continue",
    "evidence": "The prospect mentions an existing process but has not explained whether it works well. There is no no-contact request.",
    "limit": "If they decline permission or confirm that the issue is already resolved with no need for change, end the conversation. Do not stack rebuttals.",
    "options": [
      {
        "text": "Understood. May I ask one quick question to see whether this is relevant? How do you coordinate changes across the three sites?",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Acknowledges the objection and asks permission for a relevant question. Explores the process without assuming that having a solution means having a problem."
      },
      {
        "text": "Understood. I’ll mark the entire account as a poor fit and we won’t evaluate it again.",
        "scores": [
          2,
          0,
          0,
          1
        ],
        "why": "Respecting a no is valid. What is missing is evidence to declare the entire account a poor fit. You can end this call without inventing a disqualification."
      },
      {
        "text": "That’s exactly why I’m calling. Our platform is better, and it’s only fifteen minutes.",
        "scores": [
          0,
          0,
          1,
          0
        ],
        "why": "Rebuts before understanding and uses the meeting length to minimize the objection. Does not establish a specific reason to continue."
      },
      {
        "text": "I’ll send you an invitation for tomorrow and we can discuss it then.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "A unilateral invitation is not an agreed next step. The absence of a stronger refusal is not consent."
      }
    ],
    "observed": "The SDR says, “We can save you 30%. I’ll book a demo.” The prospect agrees because they are in a hurry.",
    "audit": "Coaching: a booked meeting does not fix an unsupported promise or missing discovery. Evaluate those behaviors even when the meeting is secured.",
    "model": "Understood. May I ask one quick question to check whether there is something relevant here? If not, we can leave it there."
  },
  {
    "id": "o2",
    "category": "Objections",
    "title": "An existing provider is not a closed door",
    "level": "Intermediate",
    "company": "Sales analytics · Active contract",
    "context": "You are speaking with the sales lead. Their current provider handles reporting, but you should not assume that replacing it is a priority.",
    "transcript": [
      [
        "Prospect",
        "We already use another platform and aren’t planning to replace it."
      ],
      [
        "SDR",
        "Of course. Is there anything in the process that is still difficult?"
      ],
      [
        "Prospect",
        "Consolidating the data takes two days. But we’re halfway through our contract."
      ]
    ],
    "question": "Which response explores the signal without forcing a switch?",
    "action": "continue",
    "evidence": "The prospect has acknowledged a specific friction. The contract affects timing, but impact and priority still need to be understood.",
    "limit": "If the impact does not justify working on it, or they do not want to explore it, do not turn the friction into artificial urgency.",
    "options": [
      {
        "text": "If you’re already under contract, there’s no opportunity. I’ll close the account.",
        "scores": [
          1,
          0,
          0,
          1
        ],
        "why": "A contract alone does not eliminate the need. The impact of the delay and any future evaluation window are still unknown."
      },
      {
        "text": "We can cancel your existing contract for you. Let’s book something today.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Promises something unverified and jumps from pain to a demo. Neither exit costs nor willingness to switch have been confirmed."
      },
      {
        "text": "Without discussing a replacement right now, which decisions are delayed during those two days, and when do you review the contract?",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Separates the problem from a provider switch. Explores impact and timing to decide whether discovery, nurture, or closure is appropriate."
      },
      {
        "text": "Would you like a demo of our 25 features?",
        "scores": [
          1,
          0,
          1,
          0
        ],
        "why": "A feature list does not clarify the impact of consolidating data or the decision window."
      }
    ],
    "observed": "The SDR says, “Having a provider isn’t a problem. What matters is booking the meeting,” and asks for a demo without exploring the delay.",
    "audit": "Coaching: pick up the useful fact—the two-day delay—and explore its consequences. Meeting volume does not replace qualification.",
    "model": "Who does that delay affect, and what happens while they wait for the reports? When would it make sense to review alternatives?"
  },
  {
    "id": "o3",
    "category": "Objections",
    "title": "The repeated boundary is now explicit",
    "level": "Nuanced judgment",
    "company": "Operations · Prospecting call",
    "context": "You already asked permission for one question after the first rejection. The prospect sets the boundary again.",
    "transcript": [
      [
        "Prospect",
        "I’m not interested."
      ],
      [
        "SDR",
        "Understood. May I ask one question to see whether this might be relevant?"
      ],
      [
        "Prospect",
        "No. I don’t want any more calls from your company. Remove my number from these campaigns."
      ]
    ],
    "question": "Which behavior should QA recognize as appropriate?",
    "action": "exclude",
    "evidence": "The request for no more calls from the company is explicit. There is no permission to continue qualifying.",
    "limit": "Stop the pitch. Record and handle the exclusion within the requested scope and internal process. Do not look for another route around it.",
    "options": [
      {
        "text": "I understand. Just one last thing: would you reconsider if I guaranteed savings?",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "“Just one last thing” continues the sale after an explicit boundary. A potential benefit does not override that boundary."
      },
      {
        "text": "Understood. I won’t continue the call. I’ll record your request for no more calls from our company and handle it through our process.",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Recognizes the scope, ends the sale, and commits to a controllable action. Does not claim that data has already been deleted when it has not yet been handled."
      },
      {
        "text": "I’ll put you into nurture and we’ll message you on WhatsApp instead.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Reclassifying as nurture or switching channels to evade the boundary does not demonstrate respect or permission."
      },
      {
        "text": "Okay, I’ll mark you as “not interested” and try the same number next month.",
        "scores": [
          1,
          0,
          0,
          0
        ],
        "why": "The record omits the exclusion request. This is not ordinary lack of interest to recycle into another cadence."
      }
    ],
    "observed": "The SDR stops the pitch, confirms the scope of the request, and records the exclusion. No meeting is booked.",
    "audit": "Coaching: solid behavior even without a meeting. This contact is no longer available for pursuit; respecting the boundary is the controllable objective.",
    "model": "Understood. I’ll end the call and record your request for no more calls from our company. Thank you for letting me know."
  },
  {
    "id": "g1",
    "category": "Gatekeepers",
    "title": "Reach the right person transparently",
    "level": "Foundations",
    "company": "B2B services · Reception",
    "context": "You only know the company name. You are looking for the person responsible for equipment maintenance and have no prior relationship.",
    "transcript": [
      [
        "Reception",
        "Who’s calling, and what is this about?"
      ],
      [
        "SDR",
        "Alex, from Mantenia."
      ],
      [
        "Reception",
        "If this is a sales call, I can’t transfer you without more information."
      ]
    ],
    "question": "What is the strongest next step?",
    "action": "continue",
    "evidence": "Reception is asking for context to decide where to route the call. A legitimate path for guidance still exists.",
    "limit": "If they do not share details or allow a transfer, respect the process. Do not invent a prior relationship or urgency.",
    "options": [
      {
        "text": "Tell them I’m a friend and they’re expecting me.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Inventing a relationship may open a door, but the behavior is not aligned. The outcome does not justify deception."
      },
      {
        "text": "There’s no point talking to reception. I’ll keep calling until someone transfers me.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Repeated attempts without new information are not useful persistence and do not respect the access process."
      },
      {
        "text": "I’m Alex from Mantenia. This is a sales call about maintenance planning. Who evaluates that process, and what is the appropriate channel?",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Identifies the caller and the actual purpose, and asks for specific guidance. Does not demand a transfer or claim authority the SDR does not have."
      },
      {
        "text": "It’s confidential. I just need you to put me through to the manager.",
        "scores": [
          0,
          0,
          1,
          0
        ],
        "why": "Vagueness is used to force access and prevents reception from assessing relevance."
      }
    ],
    "observed": "The SDR states the commercial purpose and asks for the appropriate channel. Reception does not transfer the call but provides the procurement inbox.",
    "audit": "Coaching: useful routing is a valid result even without a decision-maker conversation. Do not mark failure solely because no transfer occurred.",
    "model": "To avoid wasting your time, this is a sales call about maintenance. Which team reviews that, and how do they accept proposals?"
  },
  {
    "id": "g2",
    "category": "Gatekeepers",
    "title": "A procurement policy is useful information",
    "level": "Intermediate",
    "company": "Manufacturing · Formal supplier channel",
    "context": "Receiving an email address does not, by itself, justify recording a meeting or qualifying the account.",
    "transcript": [
      [
        "Reception",
        "We don’t transfer supplier calls. Submit a presentation through the procurement portal."
      ],
      [
        "SDR",
        "Does the portal explain the requirements and when new proposals are reviewed?"
      ],
      [
        "Reception",
        "Yes. They review maintenance suppliers in January. Use the portal, not the phone."
      ]
    ],
    "question": "How should you handle this route?",
    "action": "nurture",
    "evidence": "There is a formal channel and a known window. No need or meeting has been confirmed yet.",
    "limit": "Use the specified route and check its requirements. Portal access is not buying intent or permission to keep calling.",
    "options": [
      {
        "text": "Thank you. I’ll check the portal requirements and record January as the review window, without continuing to call about this proposal.",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Respects the channel and preserves a verifiable trigger. Follow-up uses the authorized route, not a new phone cadence."
      },
      {
        "text": "Great, I’ll record a qualified opportunity and a meeting for January.",
        "scores": [
          1,
          0,
          0,
          0
        ],
        "why": "The channel and review date do not confirm pain, an owner, or acceptance of a meeting."
      },
      {
        "text": "I’ll call different extensions to get around the policy.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Evading the process adds no opportunity evidence and contradicts the channel boundary."
      },
      {
        "text": "That means there is definitely no fit. I’ll disqualify the company.",
        "scores": [
          1,
          0,
          0,
          1
        ],
        "why": "An access barrier does not prove a lack of fit. It may justify leaving the phone cadence and using the specified process."
      }
    ],
    "observed": "The SDR marks “meeting booked” after receiving instructions to submit a proposal through the portal.",
    "audit": "Coaching: correct CRM accuracy. The actual result is a follow-up route and a window, not a meeting or a qualified opportunity.",
    "model": "Thank you. I’ll use the portal and review the requirements. I’ll record that window without recording a meeting we haven’t agreed to."
  },
  {
    "id": "g3",
    "category": "Gatekeepers",
    "title": "Wrong contact, account still unassessed",
    "level": "Nuanced judgment",
    "company": "HR services · Direct number",
    "context": "You are calling about a workforce management solution. The person says the number does not belong to that department and limits its use.",
    "transcript": [
      [
        "Contact",
        "I work at the outside repair shop, not in that company’s HR department."
      ],
      [
        "SDR",
        "Do you know who handles it?"
      ],
      [
        "Contact",
        "No. And this is my personal number. Don’t use it for any more sales calls."
      ]
    ],
    "question": "How should you act and document the case?",
    "action": "exclude",
    "evidence": "This is an incorrect personal number with an explicit request not to use it for sales. The account remains unassessed.",
    "limit": "Exclude this contact from prospecting and correct the data. Do not automatically extend the conclusion to the entire company.",
    "options": [
      {
        "text": "Understood. I’ll correct the contact record and arrange for this number to be excluded from further sales calls. Thank you.",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Addresses the incorrect data and respects the scope of the boundary. Does not invent an account-level disqualification."
      },
      {
        "text": "Since you answered, could I explain it anyway?",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "The contact mismatch and boundary are clear. There is no viable reason for another pitch."
      },
      {
        "text": "I’ll mark the entire company as not interested.",
        "scores": [
          1,
          0,
          0,
          1
        ],
        "why": "The conclusion goes beyond the evidence: a wrong contact does not represent the company’s needs or decisions."
      },
      {
        "text": "I’ll keep you in nurture. Maybe you’ll know the right person later.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "There is no permission or useful trigger for keeping this number in commercial follow-up."
      }
    ],
    "observed": "The SDR removes the number from the cadence and records the incorrect contact without disqualifying the entire company.",
    "audit": "Coaching: good scope management. Evaluate data correction and respect for the boundary, not the lack of access to a decision-maker.",
    "model": "Thank you for clarifying. I’ll record that this contact is incorrect and that the number must not be used for further sales calls."
  },
  {
    "id": "d1",
    "category": "Discovery",
    "title": "A pain signal is not yet business impact",
    "level": "Foundations",
    "company": "Logistics operations · 120 deliveries daily",
    "context": "The product centralizes incidents between warehousing and transport. You do not yet know the cost of the current process.",
    "transcript": [
      [
        "Prospect",
        "We manage incidents by email, and sometimes they get duplicated."
      ],
      [
        "SDR",
        "How often does that happen?"
      ],
      [
        "Prospect",
        "Two or three times a week. I’m not sure that justifies changing systems."
      ]
    ],
    "question": "Which question adds the most useful evidence next?",
    "action": "continue",
    "evidence": "The prospect acknowledges a friction and provides frequency. Its consequences and whether it deserves attention remain unknown.",
    "limit": "Do not turn every inconvenience into a priority pain point. If impact is low and they do not want to change, accept the close.",
    "options": [
      {
        "text": "That qualifies you. Would you prefer a demo on Tuesday or Wednesday?",
        "scores": [
          1,
          0,
          1,
          0
        ],
        "why": "Frequency alone does not confirm impact or priority. The scheduling choice assumes interest that has not been validated."
      },
      {
        "text": "If you don’t know the exact cost, there’s nothing else to explore.",
        "scores": [
          1,
          0,
          0,
          1
        ],
        "why": "You do not need a perfect figure to start. Explore what happens, who gets involved, and whether there are relevant consequences."
      },
      {
        "text": "Our AI automatically eliminates all those duplicates.",
        "scores": [
          0,
          0,
          1,
          0
        ],
        "why": "Promises an absolute outcome without validating the workflow or the solution’s scope."
      },
      {
        "text": "When an incident is duplicated, what happens next, and who ends up with extra work or delays?",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Explores observable consequences without leading the prospect toward a number. Helps distinguish an annoyance from a problem worth progressing."
      }
    ],
    "observed": "The SDR asks about repeated work and discovers that it does not affect deliveries and takes ten minutes per week. The prospect does not want to change.",
    "audit": "Coaching: the exploration was useful even though it ruled out a demo. With this additional evidence, close for low current priority. Do not penalize discovering limited impact.",
    "model": "Could you walk me through the last time it happened? Who had to resolve it, and what changed in the operation?"
  },
  {
    "id": "d2",
    "category": "Discovery",
    "title": "The missing must-have feature",
    "level": "Intermediate",
    "company": "Payroll software · Operational requirement",
    "context": "Your solution only works with an internet connection. There is no offline mode or approved commitment to develop one.",
    "transcript": [
      [
        "Prospect",
        "We need to work offline for several days at remote plants."
      ],
      [
        "SDR",
        "Could you work online at all times?"
      ],
      [
        "Prospect",
        "No. Offline is mandatory. We cannot use the system without it."
      ]
    ],
    "question": "What is the professional decision?",
    "action": "close",
    "evidence": "The solution cannot meet a confirmed must-have requirement. There is no accepted workaround or committed roadmap.",
    "limit": "Close for lack of current fit. Reopen only after a real, verifiable change. Do not promise future functionality.",
    "options": [
      {
        "text": "We’ll have that soon. Take the demo so we can get things moving.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "An unapproved roadmap promise conceals a known blocker. A demo does not resolve the requirement."
      },
      {
        "text": "Given that requirement, our solution is not a fit today: it requires a connection. I’ll document the reason and close this evaluation.",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "States the limitation and closes with a verifiable reason. Does not blame the prospect or invent an opportunity."
      },
      {
        "text": "What if we keep trying other people at the company until someone agrees to work online?",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "The requirement is operational and explicit. Finding another person to bypass it does not provide a solution."
      },
      {
        "text": "I’ll put you into a weekly cadence even if nothing changes.",
        "scores": [
          1,
          0,
          0,
          0
        ],
        "why": "Without a product or requirement change, there is no useful trigger for that follow-up."
      }
    ],
    "observed": "The SDR clarifies the limitation and closes for lack of fit. The call ends without a meeting.",
    "audit": "Coaching: well-supported disqualification. Fewer demos can reflect better judgment when a real blocker is documented.",
    "model": "Our platform requires a connection. Since offline operation is essential, it would not be responsible to ask you to invest time in a demo right now."
  },
  {
    "id": "d3",
    "category": "Discovery",
    "title": "An influencer with useful information",
    "level": "Nuanced judgment",
    "company": "Project management · Operations coordinator",
    "context": "The contact knows the process and experiences the problem but does not control the budget.",
    "transcript": [
      [
        "Prospect",
        "I don’t sign off on purchases. Leadership handles that."
      ],
      [
        "SDR",
        "Do you participate in the evaluation?"
      ],
      [
        "Prospect",
        "Yes. They ask me to compare options, and the team loses hours to manual reports."
      ]
    ],
    "question": "How do you progress without confusing influence with authority?",
    "action": "continue",
    "evidence": "The coordinator participates in the evaluation and knows a specific problem. Impact, criteria, and the decision process still need clarification.",
    "limit": "Do not present her as the decision-maker or dismiss her because she does not sign. Proceed according to her role and the access she voluntarily facilitates.",
    "options": [
      {
        "text": "If you don’t sign, there’s no point talking. I need the director.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Dismisses a relevant source and treats job title as the only measure of value."
      },
      {
        "text": "Then we have the decision-maker. I’ll arrange the closing meeting with you.",
        "scores": [
          1,
          0,
          0,
          0
        ],
        "why": "Assigns authority the contact just denied. Documentation and expectations must reflect her actual role."
      },
      {
        "text": "What do you compare, what is the impact of those hours, and how do you involve leadership when an option looks like a fit?",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Explores value and the buying process while respecting the role. Does not demand immediate access or assume budget."
      },
      {
        "text": "I’ll send the entire catalog and expect her to sell it internally.",
        "scores": [
          1,
          0,
          1,
          0
        ],
        "why": "Transfers the work without understanding criteria or agreeing on a useful action."
      }
    ],
    "observed": "The SDR documents her evaluator role, explores impact, and asks how an option is validated with leadership.",
    "audit": "Coaching: solid behavior. Budget is still unconfirmed, but that is missing information; it does not automatically make this a poor call.",
    "model": "To make the comparison useful, what must an option deliver, and how is the decision made after your evaluation?"
  },
  {
    "id": "n1",
    "category": "Nurture",
    "title": "“Not now” with a specific window",
    "level": "Foundations",
    "company": "Training platform · Audit in progress",
    "context": "The prospect acknowledges problems tracking training, but the team is working through an audit until December.",
    "transcript": [
      [
        "Prospect",
        "Yes, we want to fix training tracking. We can’t do it this month."
      ],
      [
        "SDR",
        "When will you have capacity to review it again?"
      ],
      [
        "Prospect",
        "The second week of January. You can email me a guide and write to me then."
      ]
    ],
    "question": "Which follow-up preserves a viable opportunity?",
    "action": "nurture",
    "evidence": "There is an acknowledged need, explicit timing, and permission for a specific channel and content.",
    "limit": "Do not turn that authorization into weekly contact or an accepted demo. Respect the agreed scope and timing.",
    "options": [
      {
        "text": "Perfect. I’ll email the guide and write during the second week of January to confirm whether it makes sense to revisit this.",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Captures the agreed content, channel, and window. The next contact checks the context rather than assuming a meeting."
      },
      {
        "text": "I’ll book a demo for this Friday so we don’t lose momentum.",
        "scores": [
          0,
          0,
          1,
          0
        ],
        "why": "The SDR’s urgency contradicts the stated availability and replaces an agreement with a unilateral meeting."
      },
      {
        "text": "I’ll disqualify them. If they were interested, they would find time.",
        "scores": [
          0,
          0,
          0,
          1
        ],
        "why": "Confuses interest with immediate availability and ignores a specific trigger and explicit permission."
      },
      {
        "text": "I’ll add you to weekly calls and messages across every channel.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Expands the permission given and disregards the agreed window and channel."
      }
    ],
    "observed": "The SDR records “nurture: second week of January, guide by email” without creating a meeting.",
    "audit": "Coaching: a strong close to a call without a meeting. Quality lies in respecting capacity and documenting a verifiable next contact.",
    "model": "I’ll send the guide we agreed on and write during the second week of January to check whether it is a good time to revisit this."
  },
  {
    "id": "n2",
    "category": "Nurture",
    "title": "“Send me something” is not a next-step agreement",
    "level": "Intermediate",
    "company": "Automation services · Ambiguous interest",
    "context": "No problem or priority has been identified yet. The prospect asks for generic information.",
    "transcript": [
      [
        "Prospect",
        "Send me something by email."
      ],
      [
        "SDR",
        "Of course. What would be useful for you to review?"
      ],
      [
        "Prospect",
        "Whatever you have. I can’t talk any longer right now."
      ]
    ],
    "question": "Which response respects their time and records what you actually know?",
    "action": "nurture",
    "evidence": "There is permission only to email information. No cadence, meeting, or future follow-up has been agreed.",
    "limit": "Nurture here means a limited, requested send, not a qualified opportunity. Without agreement to reconnect, do not invent a date or intent.",
    "options": [
      {
        "text": "Great, that counts as a meeting. I’ll send an invitation for tomorrow.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Requesting information does not mean accepting a meeting. The CRM must reflect the actual scope."
      },
      {
        "text": "Before we end, I need to ask you ten questions.",
        "scores": [
          0,
          1,
          0,
          0
        ],
        "why": "Pushing discovery after the prospect has said they cannot talk ignores their available capacity."
      },
      {
        "text": "I won’t send anything until you give me a demo date.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Makes a simple request conditional on a commitment the prospect did not offer, adding unnecessary pressure."
      },
      {
        "text": "Understood. I’ll email a brief summary with an optional question about relevance. I’ll record it as requested information, with no meeting or further contact agreed.",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Limits the action to the available permission and documents uncertainty. The summary can invite a reply without assuming a cadence."
      }
    ],
    "observed": "The SDR sends the requested summary and records “information requested; need and next contact unconfirmed.”",
    "audit": "Coaching: accurate documentation and respect for time. Use the limited nurture label; do not infer strong interest from an ambiguous phrase.",
    "model": "I’ll email a brief summary. If it is relevant, you can let me know what you would like to explore. We haven’t agreed to a meeting."
  },
  {
    "id": "n3",
    "category": "Nurture",
    "title": "Follow-up that no longer has a reason",
    "level": "Nuanced judgment",
    "company": "Administrative services · Canceled project",
    "context": "The account was in nurture because of a planned expansion. The prospect responds to your status check.",
    "transcript": [
      [
        "SDR",
        "We agreed to review the expansion project this month."
      ],
      [
        "Prospect",
        "It has been permanently canceled. We don’t have that problem or another need your service would solve."
      ],
      [
        "SDR",
        "Is there another related initiative worth considering?"
      ],
      [
        "Prospect",
        "No. We don’t need to evaluate alternatives."
      ]
    ],
    "question": "Which decision avoids maintaining a false opportunity?",
    "action": "close",
    "evidence": "The nurture trigger has disappeared, and the prospect confirmed that there is no other related need.",
    "limit": "Close the current opportunity and document the reason. This is not contact exclusion: they did not request no contact, but they did not authorize a new cadence either.",
    "options": [
      {
        "text": "I’ll keep calling every week. Persistence eventually creates a need.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Repetition does not add value when the buying reason no longer exists and there is no accepted hypothesis."
      },
      {
        "text": "Understood. I’ll close this opportunity because the project was canceled and there is no current need. Thank you for the update.",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Updates the status based on evidence and avoids fictional pipeline. Does not confuse commercial closure with permanent contact exclusion."
      },
      {
        "text": "I’ll mark it as a likely sale because there used to be interest.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Historical interest does not outweigh new information. The record must reflect the current situation."
      },
      {
        "text": "I’ll send an invitation anyway. Maybe they’ll change their mind during the demo.",
        "scores": [
          0,
          0,
          1,
          0
        ],
        "why": "There is no need or agreement for that meeting. The invitation attempts to manufacture an opportunity."
      }
    ],
    "observed": "The SDR closes the opportunity with the reason “expansion canceled” and documents the lack of a current need.",
    "audit": "Coaching: exiting nurture with evidence is a good decision. Do not measure quality by how long the lead remains in pipeline.",
    "model": "Thank you for the update. Without that project or another current need, I’ll close this opportunity instead of leaving follow-up open without a reason."
  },
  {
    "id": "p1",
    "category": "Positioning",
    "title": "Connect a capability to a problem",
    "level": "Foundations",
    "company": "Support software · Duplicate tickets",
    "context": "The solution unifies tickets and assignments. You do not have a verified savings figure for this account.",
    "transcript": [
      [
        "Prospect",
        "Two agents answer the same ticket, and then we have to correct it."
      ],
      [
        "SDR",
        "What does that duplication cause?"
      ],
      [
        "Prospect",
        "Conflicting answers and half an hour of rework every day. We want to reduce it."
      ]
    ],
    "question": "Which positioning is supported by the evidence?",
    "action": "continue",
    "evidence": "There is a stated problem, a consequence, and a desire to reduce it. You can connect a capability and validate its relevance.",
    "limit": "Do not guarantee savings or total elimination of the problem. Validate the workflow and conditions before quantifying outcomes.",
    "options": [
      {
        "text": "Single-owner assignment could help prevent two agents from taking the same ticket. Would it make sense to review how it would fit your workflow?",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Connects a specific capability to duplication and asks for validation. Keeps the result as a hypothesis, not a guarantee."
      },
      {
        "text": "We have AI, dashboards, over fifty integrations, and a modern portal.",
        "scores": [
          1,
          0,
          1,
          0
        ],
        "why": "Lists features without showing how they address the conflicting answers and rework mentioned."
      },
      {
        "text": "I guarantee zero duplicates and twice the productivity from day one.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "The promise goes beyond the available evidence and conditions that have not been validated."
      },
      {
        "text": "Since you already have a problem, I don’t need to ask anything else.",
        "scores": [
          1,
          0,
          1,
          0
        ],
        "why": "Identifying pain does not replace understanding the workflow, conditions, and success criteria."
      }
    ],
    "observed": "The SDR explains single-owner assignment, connects it to rework, and asks whether it is worth reviewing the workflow.",
    "audit": "Coaching: recognize the link between problem and capability and the prospect’s validation. Do not demand an ROI promise without data.",
    "model": "Based on what you described, single-owner assignment could reduce that overlap. We would need to check how it works with your current process."
  },
  {
    "id": "p2",
    "category": "Positioning",
    "title": "Be honest about product scope",
    "level": "Intermediate",
    "company": "Financial automation · Must-have requirement",
    "context": "Your service prepares information and reports. It does not file declarations with the relevant authority and is not authorized to do so.",
    "transcript": [
      [
        "Prospect",
        "We only need a provider that files the declarations for us."
      ],
      [
        "SDR",
        "We automate data preparation, but we don’t handle filing."
      ],
      [
        "Prospect",
        "Then it won’t work for us. We already handle preparation internally."
      ]
    ],
    "question": "Which response reflects the actual fit?",
    "action": "close",
    "evidence": "The only confirmed need is outside the product’s scope. The capability you do offer is already covered.",
    "limit": "Do not redefine “preparation” as “filing.” Reopening would require a different need or a real change in service scope.",
    "options": [
      {
        "text": "It’s practically the same thing. You’ll see in the demo.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Blurs an essential distinction after the prospect has identified it as a blocker."
      },
      {
        "text": "I’ll offer a discount even though we don’t cover what you need.",
        "scores": [
          0,
          0,
          1,
          0
        ],
        "why": "Price does not solve a missing must-have capability."
      },
      {
        "text": "Correct. For that need, we are not the right provider today. I’ll close the evaluation because of the service scope.",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Confirms the distinction and documents the lack-of-fit reason. Avoids a demo that cannot address the requirement."
      },
      {
        "text": "I’ll say we handle filing and work out how to do it later.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Promising a nonexistent service is unaligned behavior, even if it secures a meeting."
      }
    ],
    "observed": "The SDR maintains the scope distinction and closes the case. No discount is offered to force interest.",
    "audit": "Coaching: accuracy and honesty are controllable. Do not penalize closure when the required capability does not exist.",
    "model": "Our capability ends at preparation. Since you already have that covered and need filing, there is no current fit."
  },
  {
    "id": "p3",
    "category": "Positioning",
    "title": "“We’re different” needs relevant evidence",
    "level": "Nuanced judgment",
    "company": "Inventory software · Provider comparison",
    "context": "The prospect is actively comparing options. Your product offers location-level alerts, but you do not yet know their criteria.",
    "transcript": [
      [
        "Prospect",
        "Everyone says they’re easy to use and save time. What makes you different?"
      ],
      [
        "SDR",
        "We have location-level alerts."
      ],
      [
        "Prospect",
        "Why should that matter to me?"
      ]
    ],
    "question": "How do you reposition around relevance?",
    "action": "continue",
    "evidence": "The prospect invites you to show a difference but has not connected the capability to one of their own problems.",
    "limit": "If their criteria do not match the product’s strength, do not force the connection. Acknowledge a lack of fit if it is confirmed.",
    "options": [
      {
        "text": "Because we’re the market leader and all our customers are happy.",
        "scores": [
          0,
          0,
          1,
          0
        ],
        "why": "A generic claim does not explain value for this account or provide relevant evidence."
      },
      {
        "text": "It depends on your operation. How do you detect shortages across locations, and which criterion matters most in your comparison?",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Acknowledges that relevance depends on context and explores a use case and criteria before claiming value."
      },
      {
        "text": "You don’t need to understand it now. Let’s book a demo.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Asks for time without answering the relevance question or checking whether there is a reason to progress."
      },
      {
        "text": "If that feature doesn’t matter to you, your company isn’t a good prospect.",
        "scores": [
          0,
          0,
          0,
          1
        ],
        "why": "Lack of interest in one feature does not by itself disqualify an account. Criteria and context are still missing."
      }
    ],
    "observed": "The SDR acknowledges that the feature’s usefulness is still unknown and asks about shortages and comparison criteria.",
    "audit": "Coaching: adjusting the message to evidence is better than repeating a differentiator. The question checks relevance instead of leading the prospect into it.",
    "model": "That capability matters if shortages by location are a problem. How do you detect them today, and what are you looking to improve?"
  },
  {
    "id": "s1",
    "category": "Next steps",
    "title": "A meeting needs purpose and agreement",
    "level": "Foundations",
    "company": "Quality assurance · Initial evaluation",
    "context": "It has been confirmed that evaluation calibration takes four hours per week. The lead wants to review the workflow with her analyst.",
    "transcript": [
      [
        "Prospect",
        "It does make sense to see how we could calibrate with less rework."
      ],
      [
        "SDR",
        "Who should participate?"
      ],
      [
        "Prospect",
        "My analyst and I. We’re available Tuesday at ten, Managua time."
      ]
    ],
    "question": "Which close makes the next step verifiable?",
    "action": "continue",
    "evidence": "There is a problem, interest, and a specific proposal for participants and timing. Purpose, duration, and invitation channel still need confirmation.",
    "limit": "Do not record attendees or acceptance that have not been confirmed. A meeting is an evaluation step, not a guaranteed sale.",
    "options": [
      {
        "text": "Done, deal closed. I’ll send the contract.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Agreeing to explore a workflow does not mean approving a purchase."
      },
      {
        "text": "You’ll get an invitation. We can decide what to discuss later.",
        "scores": [
          1,
          0,
          1,
          1
        ],
        "why": "Captures general intent but leaves purpose and details unconfirmed, resulting in a vague meeting."
      },
      {
        "text": "I’ll also invite your director, even though we haven’t discussed that.",
        "scores": [
          0,
          0,
          1,
          0
        ],
        "why": "Expands participation without agreement and assumes access that was not granted."
      },
      {
        "text": "Can we confirm 20 minutes on Tuesday at 10 a.m., Managua time, with you and your analyst to review the calibration workflow and decide whether a pilot is worthwhile? Which email addresses should receive the invitation?",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Defines purpose, participants, time, and action, and asks for confirmation. The meeting tests fit rather than assuming it."
      }
    ],
    "observed": "The SDR confirms the purpose, attendees, duration, time zone, and email addresses. The meeting is recorded only after acceptance.",
    "audit": "Coaching: a specific, traceable next step. The behavior remains solid even if they later reschedule or cancel; assess it using the information available at the time.",
    "model": "Let’s confirm the purpose, participants, duration, and invitation channel. Then we can document what we agreed."
  },
  {
    "id": "s2",
    "category": "Next steps",
    "title": "Interest without capacity to act",
    "level": "Intermediate",
    "company": "Support platform · Internal reorganization",
    "context": "The problem and relevance are confirmed. The lead cannot evaluate solutions while a reorganization is being completed.",
    "transcript": [
      [
        "Prospect",
        "I’m interested, but nobody can participate in a pilot right now."
      ],
      [
        "SDR",
        "When will that capacity change?"
      ],
      [
        "Prospect",
        "The team will be finalized on December 15. Write to me the following week, and we’ll see whether we can meet."
      ]
    ],
    "question": "Which next step matches that agreement?",
    "action": "nurture",
    "evidence": "There is a specific trigger and permission to write afterward. There is no meeting acceptance or capacity for a pilot yet.",
    "limit": "Do not turn “we’ll see whether we can” into a firm meeting or accelerate an evaluation with no team available.",
    "options": [
      {
        "text": "I’ll reserve a demo before the 15th and a pilot for that same day.",
        "scores": [
          0,
          0,
          1,
          0
        ],
        "why": "The reservation was not accepted and contradicts the available capacity."
      },
      {
        "text": "I’ll write the week after December 15 to confirm the team setup and whether it makes sense to meet.",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Connects follow-up to the trigger and capacity. Records follow-up, not a meeting that does not yet exist."
      },
      {
        "text": "If you can’t start today, I’ll remove the account entirely.",
        "scores": [
          0,
          0,
          0,
          1
        ],
        "why": "Ignores a specific temporary change and permission to reconnect."
      },
      {
        "text": "I’ll leave it open without a date or reason. What matters is keeping it in pipeline.",
        "scores": [
          1,
          0,
          0,
          0
        ],
        "why": "The prospect provided a condition and window. Omitting them reduces the usefulness of follow-up."
      }
    ],
    "observed": "The SDR records nurture with the team change and agreed week. It is not counted as a booked meeting.",
    "audit": "Coaching: distinguish permission to follow up from acceptance of a meeting. Status must reflect the agreement, not the SDR’s commercial target.",
    "model": "I’ll write after the team is finalized to check whether you have capacity. For now, we have agreed to that contact, without scheduling a demo."
  },
  {
    "id": "s3",
    "category": "Next steps",
    "title": "A demo accepted under pressure",
    "level": "Nuanced judgment",
    "company": "Sales management · Call evaluation",
    "context": "The system has a native integration the prospect needs. Compatibility with their specific version is still unconfirmed and can be checked without a demo.",
    "transcript": [
      [
        "Prospect",
        "If it works with our version, it could make sense. I don’t have time for a demo without checking that."
      ],
      [
        "SDR",
        "You have to accept the demo to find out. I only have availability today."
      ],
      [
        "Prospect",
        "Fine, send the invitation, but I can’t promise I’ll attend."
      ]
    ],
    "question": "How do you recover a valid next step?",
    "action": "continue",
    "evidence": "There is a verifiable technical condition and potential relevance. Ambiguous acceptance does not show commitment; the requirement must be resolved first.",
    "limit": "If the integration is incompatible and essential, close. Without permission to verify or reconnect, do not invent a commitment.",
    "options": [
      {
        "text": "Record a confirmed demo and praise the SDR for overcoming the objection.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "The apparent outcome conceals pressure and an unresolved condition. “I can’t promise I’ll attend” is not a solid commitment."
      },
      {
        "text": "Disqualify the account just because they did not want an immediate demo.",
        "scores": [
          0,
          0,
          0,
          1
        ],
        "why": "The prospect provided a reasonable, verifiable condition. A possible fit still exists."
      },
      {
        "text": "Acknowledge the condition and ask permission to confirm the version and send the result. Only then decide together whether a demo is worthwhile.",
        "scores": [
          2,
          2,
          2,
          2
        ],
        "why": "Reduces uncertainty through a proportionate step. Separates technical verification from the meeting and rebuilds agreement without artificial scarcity."
      },
      {
        "text": "Guarantee compatibility so the invitation is not lost.",
        "scores": [
          0,
          0,
          0,
          0
        ],
        "why": "Promises something that has not been checked. Pressure to keep a meeting does not justify the claim."
      }
    ],
    "observed": "The SDR secures an invitation with “I only have availability today” and marks the objection as resolved without validating the version.",
    "audit": "Coaching: an apparently favorable outcome with unaligned behavior. Check compatibility, remove pressure, and record that the meeting is not confirmed.",
    "model": "It makes sense to check that first. Could you share the version so I can confirm compatibility and send the answer before we decide on a demo?"
  }
];
const LEGACY_ACTIONS = {
  "continue": {
    "label": "Continue with purpose",
    "short": "Continue",
    "icon": "↗",
    "color": "green",
    "description": "There is a relevant unknown and permission to explore or verify a proportionate next step."
  },
  "nurture": {
    "label": "Nurture within scope",
    "short": "Nurture",
    "icon": "◷",
    "color": "purple",
    "description": "There is a window, a trigger, or a requested send. Permission defines channel, timing, and scope."
  },
  "close": {
    "label": "Close the opportunity",
    "short": "Close",
    "icon": "↘",
    "color": "amber",
    "description": "The need has disappeared or a must-have requirement cannot be met. Document the reason."
  },
  "exclude": {
    "label": "Exclude the contact",
    "short": "Exclude",
    "icon": "⊘",
    "color": "rose",
    "description": "There is a no-contact or do-not-use-this-number request. End the pitch and handle its scope."
  }
};
const LEGACY_CRITERIA = [
  {
    "name": "Listening and boundaries",
    "hint": "Acknowledges what was said and respects permission, time, channel, and no-contact requests."
  },
  {
    "name": "Evidence and judgment",
    "hint": "Clarifies only what is needed or uses confirmed evidence; distinguishes facts, hypotheses, and uncertainty."
  },
  {
    "name": "Relevance and honesty",
    "hint": "Connects value to the case, states limitations, and avoids unsupported promises."
  },
  {
    "name": "Agreement and documentation",
    "hint": "Proposes a proportionate action and records only the actual commitment and scope."
  }
];
