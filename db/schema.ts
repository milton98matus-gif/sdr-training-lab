import {sql} from 'drizzle-orm';
import {sqliteTable,text,integer,primaryKey,index} from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('training_profiles',{
 userId:text('user_id').primaryKey(),email:text('email').notNull(),displayName:text('display_name').notNull(),role:text('role').notNull().default('participant'),createdAt:integer('created_at').notNull(),lastSeenAt:integer('last_seen_at').notNull()
});
export const snapshots=sqliteTable('training_snapshots',{
 userId:text('user_id').notNull(),scope:text('scope').notNull(),payload:text('payload').notNull(),updatedAt:integer('updated_at').notNull()
},t=>[primaryKey({columns:[t.userId,t.scope]})]);
export const events=sqliteTable('training_events',{
 userId:text('user_id').notNull(),eventId:text('event_id').notNull(),kind:text('kind').notNull(),unitType:text('unit_type').notNull(),unitId:text('unit_id').notNull(),topic:text('topic').notNull(),mode:text('mode').notNull(),step:integer('step').notNull(),score:integer('score'),maxScore:integer('max_score'),aligned:integer('aligned'),details:text('details').notNull(),clientAt:integer('client_at'),recordedAt:integer('recorded_at').notNull(),source:text('source').notNull()
},t=>[primaryKey({columns:[t.userId,t.eventId]}),index('training_event_user_date').on(t.userId,t.recordedAt),index('training_event_topic_date').on(t.topic,t.recordedAt)]);
export const roleAudit=sqliteTable('training_role_audit',{
 id:text('id').primaryKey(),actorId:text('actor_id').notNull(),targetId:text('target_id').notNull(),previousRole:text('previous_role').notNull(),newRole:text('new_role').notNull(),createdAt:integer('created_at').notNull()
});
export const onboardingEntries=sqliteTable('training_onboarding_entries',{
 userId:text('user_id').notNull(),eventId:text('event_id').notNull(),kind:text('kind').notNull(),unitId:text('unit_id').notNull(),payload:text('payload').notNull(),createdAt:integer('created_at').notNull()
},t=>[primaryKey({columns:[t.userId,t.eventId]}),index('training_onboarding_user_date').on(t.userId,t.createdAt)]);
export const assignments=sqliteTable('training_assignments',{
 userId:text('user_id').primaryKey(),payload:text('payload').notNull(),dueAt:integer('due_at'),updatedAt:integer('updated_at').notNull(),updatedBy:text('updated_by').notNull()
});
export const readinessReviews=sqliteTable('training_readiness_reviews',{
 userId:text('user_id').primaryKey(),status:text('status').notNull(),comment:text('comment').notNull(),evidenceVersion:text('evidence_version').notNull(),updatedAt:integer('updated_at').notNull(),updatedBy:text('updated_by').notNull()
});
export const mspAccounts=sqliteTable('training_msp_accounts',{
 id:text('id').primaryKey(),name:text('name').notNull(),normalizedName:text('normalized_name').notNull().unique(),active:integer('active').notNull().default(1),updatedAt:integer('updated_at').notNull(),updatedBy:text('updated_by').notNull()
});
export const participantDetails=sqliteTable('training_participant_details',{
 userId:text('user_id').primaryKey(),firstName:text('first_name').notNull(),lastName:text('last_name').notNull(),requestedMspId:text('requested_msp_id'),approvedMspId:text('approved_msp_id'),verifiedAt:integer('verified_at'),verifiedBy:text('verified_by'),tourCompletedAt:integer('tour_completed_at'),updatedAt:integer('updated_at').notNull()
});
export const gameRuns=sqliteTable('training_game_runs',{
 userId:text('user_id').notNull(),eventId:text('event_id').notNull(),missionId:text('mission_id').notNull(),version:text('version').notNull(),score:integer('score').notNull(),maxScore:integer('max_score').notNull(),payload:text('payload').notNull(),createdAt:integer('created_at').notNull()
},t=>[primaryKey({columns:[t.userId,t.eventId]}),index('training_game_user_date').on(t.userId,t.createdAt)]);
export const sectionTimeBuckets=sqliteTable('training_section_time_buckets',{
 userId:text('user_id').notNull(),section:text('section').notNull(),bucketStart:integer('bucket_start').notNull(),connectedMask:integer('connected_mask').notNull(),visibleMask:integer('visible_mask').notNull(),interactionMask:integer('interaction_mask').notNull(),
 connectedSeconds:integer('connected_seconds').generatedAlwaysAs(sql.raw(Array.from({length:30},(_,i)=>`((connected_mask >> ${i}) & 1)`).join(' + ')),{mode:'stored'}),
 visibleSeconds:integer('visible_seconds').generatedAlwaysAs(sql.raw(Array.from({length:30},(_,i)=>`((visible_mask >> ${i}) & 1)`).join(' + ')),{mode:'stored'}),
 interactionSeconds:integer('interaction_seconds').generatedAlwaysAs(sql.raw(Array.from({length:30},(_,i)=>`((interaction_mask >> ${i}) & 1)`).join(' + ')),{mode:'stored'})
},t=>[primaryKey({columns:[t.userId,t.section,t.bucketStart]}),index('training_section_user_date').on(t.userId,t.bucketStart)]);
export const aiReviews=sqliteTable('training_ai_reviews',{
 userId:text('user_id').notNull(),source:text('source').notNull(),eventId:text('event_id').notNull(),contextKey:text('context_key').notNull(),status:text('status').notNull(),payload:text('payload'),model:text('model').notNull(),reviewVersion:text('review_version').notNull(),errorCode:text('error_code'),claimId:text('claim_id').notNull(),attempts:integer('attempts').notNull(),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),inputTokens:integer('input_tokens').notNull(),outputTokens:integer('output_tokens').notNull()
},t=>[primaryKey({columns:[t.userId,t.source,t.eventId,t.contextKey]}),index('training_ai_user_date').on(t.userId,t.updatedAt)]);

export const portalSessions=sqliteTable('training_portal_sessions',{
 userId:text('user_id').notNull(),sessionId:text('session_id').notNull(),startedAt:integer('started_at').notNull(),lastSeenAt:integer('last_seen_at').notNull(),lastSequence:integer('last_sequence').notNull(),state:text('state').notNull(),section:text('section').notNull(),closedAt:integer('closed_at'),closeReason:text('close_reason'),claimId:text('claim_id').notNull()
},t=>[primaryKey({columns:[t.userId,t.sessionId]}),index('training_session_user_start').on(t.userId,t.startedAt)]);
export const timeBuckets=sqliteTable('training_time_buckets',{
 userId:text('user_id').notNull(),sessionId:text('session_id').notNull(),bucketStart:integer('bucket_start').notNull(),connectedMask:integer('connected_mask').notNull(),visibleMask:integer('visible_mask').notNull(),interactionMask:integer('interaction_mask').notNull(),
 connectedSeconds:integer('connected_seconds').generatedAlwaysAs(sql`((connected_mask >> 0) & 1) + ((connected_mask >> 1) & 1) + ((connected_mask >> 2) & 1) + ((connected_mask >> 3) & 1) + ((connected_mask >> 4) & 1) + ((connected_mask >> 5) & 1) + ((connected_mask >> 6) & 1) + ((connected_mask >> 7) & 1) + ((connected_mask >> 8) & 1) + ((connected_mask >> 9) & 1) + ((connected_mask >> 10) & 1) + ((connected_mask >> 11) & 1) + ((connected_mask >> 12) & 1) + ((connected_mask >> 13) & 1) + ((connected_mask >> 14) & 1) + ((connected_mask >> 15) & 1) + ((connected_mask >> 16) & 1) + ((connected_mask >> 17) & 1) + ((connected_mask >> 18) & 1) + ((connected_mask >> 19) & 1) + ((connected_mask >> 20) & 1) + ((connected_mask >> 21) & 1) + ((connected_mask >> 22) & 1) + ((connected_mask >> 23) & 1) + ((connected_mask >> 24) & 1) + ((connected_mask >> 25) & 1) + ((connected_mask >> 26) & 1) + ((connected_mask >> 27) & 1) + ((connected_mask >> 28) & 1) + ((connected_mask >> 29) & 1)`,{mode:'stored'}),
 visibleSeconds:integer('visible_seconds').generatedAlwaysAs(sql`((visible_mask >> 0) & 1) + ((visible_mask >> 1) & 1) + ((visible_mask >> 2) & 1) + ((visible_mask >> 3) & 1) + ((visible_mask >> 4) & 1) + ((visible_mask >> 5) & 1) + ((visible_mask >> 6) & 1) + ((visible_mask >> 7) & 1) + ((visible_mask >> 8) & 1) + ((visible_mask >> 9) & 1) + ((visible_mask >> 10) & 1) + ((visible_mask >> 11) & 1) + ((visible_mask >> 12) & 1) + ((visible_mask >> 13) & 1) + ((visible_mask >> 14) & 1) + ((visible_mask >> 15) & 1) + ((visible_mask >> 16) & 1) + ((visible_mask >> 17) & 1) + ((visible_mask >> 18) & 1) + ((visible_mask >> 19) & 1) + ((visible_mask >> 20) & 1) + ((visible_mask >> 21) & 1) + ((visible_mask >> 22) & 1) + ((visible_mask >> 23) & 1) + ((visible_mask >> 24) & 1) + ((visible_mask >> 25) & 1) + ((visible_mask >> 26) & 1) + ((visible_mask >> 27) & 1) + ((visible_mask >> 28) & 1) + ((visible_mask >> 29) & 1)`,{mode:'stored'}),
 interactionSeconds:integer('interaction_seconds').generatedAlwaysAs(sql`((interaction_mask >> 0) & 1) + ((interaction_mask >> 1) & 1) + ((interaction_mask >> 2) & 1) + ((interaction_mask >> 3) & 1) + ((interaction_mask >> 4) & 1) + ((interaction_mask >> 5) & 1) + ((interaction_mask >> 6) & 1) + ((interaction_mask >> 7) & 1) + ((interaction_mask >> 8) & 1) + ((interaction_mask >> 9) & 1) + ((interaction_mask >> 10) & 1) + ((interaction_mask >> 11) & 1) + ((interaction_mask >> 12) & 1) + ((interaction_mask >> 13) & 1) + ((interaction_mask >> 14) & 1) + ((interaction_mask >> 15) & 1) + ((interaction_mask >> 16) & 1) + ((interaction_mask >> 17) & 1) + ((interaction_mask >> 18) & 1) + ((interaction_mask >> 19) & 1) + ((interaction_mask >> 20) & 1) + ((interaction_mask >> 21) & 1) + ((interaction_mask >> 22) & 1) + ((interaction_mask >> 23) & 1) + ((interaction_mask >> 24) & 1) + ((interaction_mask >> 25) & 1) + ((interaction_mask >> 26) & 1) + ((interaction_mask >> 27) & 1) + ((interaction_mask >> 28) & 1) + ((interaction_mask >> 29) & 1)`,{mode:'stored'}),
},t=>[primaryKey({columns:[t.userId,t.sessionId,t.bucketStart]})]);
