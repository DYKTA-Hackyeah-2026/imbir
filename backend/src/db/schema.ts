import { relations, sql } from 'drizzle-orm';

import {

  bigint,

  boolean,

  doublePrecision,

  index,

  integer,

  jsonb,

  numeric,

  pgEnum,

  pgTable,

  primaryKey,

  serial,

  text,

  timestamp,

  uniqueIndex,

  uuid,

  varchar,

  vector,

} from 'drizzle-orm/pg-core';

import { EMBEDDING_DIMENSIONS } from '../config/constants.js';

import type { ConversationState, ProgramEligibility, ProgramStatus } from '../assistant/domain.js';



export const users = pgTable('users', {

  id: serial('id').primaryKey(),

  email: text('email').notNull().unique(),

  name: text('name').notNull().default(''),

  passwordHash: text('password_hash').notNull().default(''),

  role: text('role').notNull().default('user'),

  isAdmin: boolean('is_admin').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

});



export const refreshTokens = pgTable(

  'refresh_tokens',

  {

    id: uuid('id').primaryKey().defaultRandom(),

    userId: integer('user_id')

      .notNull()

      .references(() => users.id, { onDelete: 'cascade' }),

    tokenHash: text('token_hash').notNull(),

    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    revokedAt: timestamp('revoked_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

  },

  (table) => [

    uniqueIndex('refresh_tokens_token_hash_unique').on(table.tokenHash),

    index('refresh_tokens_user_id_idx').on(table.userId),

  ],

);



export const passwordResetTokens = pgTable(

  'password_reset_tokens',

  {

    id: uuid('id').primaryKey().defaultRandom(),

    userId: integer('user_id')

      .notNull()

      .references(() => users.id, { onDelete: 'cascade' }),

    tokenHash: text('token_hash').notNull(),

    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    usedAt: timestamp('used_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

  },

  (table) => [

    uniqueIndex('password_reset_tokens_token_hash_unique').on(table.tokenHash),

    index('password_reset_tokens_user_id_idx').on(table.userId),

  ],

);



export const categories = pgTable(

  'categories',

  {

    id: uuid('id').primaryKey().defaultRandom(),

    slug: varchar('slug', { length: 160 }).notNull(),

    name: varchar('name', { length: 200 }).notNull(),

    description: text('description'),

    icon: varchar('icon', { length: 64 }).notNull().default('lightbulb'),

    accent: varchar('accent', { length: 32 }).notNull().default('blue'),

    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

  },

  (table) => [uniqueIndex('categories_slug_unique').on(table.slug)],

);



export const topics = pgTable(

  'topics',

  {

    id: uuid('id').primaryKey().defaultRandom(),

    slug: varchar('slug', { length: 160 }).notNull(),

    name: varchar('name', { length: 200 }).notNull(),

    icon: varchar('icon', { length: 64 }).notNull().default('users'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

  },

  (table) => [uniqueIndex('topics_slug_unique').on(table.slug)],

);



export const materials = pgTable(

  'materials',

  {

    id: uuid('id').primaryKey().defaultRandom(),

    slug: varchar('slug', { length: 200 }).notNull(),

    title: text('title').notNull(),

    excerpt: text('excerpt'),

    body: text('body'),

    type: varchar('type', { length: 32 }).notNull(),

    format: varchar('format', { length: 32 }).notNull(),

    status: varchar('status', { length: 16 }).notNull().default('draft'),

    visibility: varchar('visibility', { length: 16 }).notNull().default('public'),

    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),

    coverUrl: text('cover_url'),

    thumbnailUrl: text('thumbnail_url'),

    fileUrl: text('file_url'),

    fileType: varchar('file_type', { length: 32 }),

    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),

    pages: integer('pages'),

    videoUrl: text('video_url'),

    durationSeconds: integer('duration_seconds'),

    author: text('author'),

    region: varchar('region', { length: 120 }),

    language: varchar('language', { length: 8 }).notNull().default('pl'),

    isFeatured: boolean('is_featured').notNull().default(false),

    gallery: jsonb('gallery'),

    publishedAt: timestamp('published_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

  },

  (table) => [

    uniqueIndex('materials_slug_unique').on(table.slug),

    index('materials_status_published_idx').on(table.status, table.publishedAt),

    index('materials_type_idx').on(table.type),

    index('materials_category_id_idx').on(table.categoryId),

    index('materials_featured_idx').on(table.isFeatured),

  ],

);



export const materialTopics = pgTable(

  'material_topics',

  {

    materialId: uuid('material_id')

      .notNull()

      .references(() => materials.id, { onDelete: 'cascade' }),

    topicId: uuid('topic_id')

      .notNull()

      .references(() => topics.id, { onDelete: 'cascade' }),

  },

  (table) => [

    primaryKey({ columns: [table.materialId, table.topicId] }),

    index('material_topics_topic_id_idx').on(table.topicId),

  ],

);



export const materialTags = pgTable(

  'material_tags',

  {

    materialId: uuid('material_id')

      .notNull()

      .references(() => materials.id, { onDelete: 'cascade' }),

    tag: varchar('tag', { length: 120 }).notNull(),

  },

  (table) => [

    primaryKey({ columns: [table.materialId, table.tag] }),

    index('material_tags_tag_idx').on(table.tag),

  ],

);



export const searchTerms = pgTable(

  'search_terms',

  {

    term: varchar('term', { length: 200 }).primaryKey(),

    searches: bigint('searches', { mode: 'number' }).notNull().default(0),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

  },

);



export const contactMessages = pgTable(

  'contact_messages',

  {

    id: uuid('id').primaryKey().defaultRandom(),

    name: varchar('name', { length: 200 }).notNull(),

    email: varchar('email', { length: 320 }).notNull(),

    subject: varchar('subject', { length: 300 }),

    message: text('message').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

  },

  (table) => [index('contact_messages_created_at_idx').on(table.createdAt)],

);



export const innovationStatusEnum = pgEnum('innovation_status', ['draft','completed','submitted','approved','rejected']);

export const problemIntensityEnum = pgEnum('problem_intensity', ['very_serious','strong','moderate','light']);

export const problemFrequencyEnum = pgEnum('problem_frequency', ['very_often','often','sometimes','rarely']);

export const problemScaleEnum = pgEnum('problem_scale', ['individuals','narrow_group','large_group','very_large_group']);

export const actorTypeEnum = pgEnum('actor_type', ['supports_change','blocks_change']);

export const affordabilityEnum = pgEnum('affordability', ['cost_greater_than_benefit','cost_equals_benefit','benefit_greater_than_cost','high_value_low_cost']);

export const simplicityEnum = pgEnum('simplicity', ['unclear','partially_clear','clear','users_can_explain']);

export const costTypeEnum = pgEnum('cost_type', ['fixed','variable']);

export const audienceTypeEnum = pgEnum('audience_type', ['main_user','payer','decision_maker']);

export const revenueValidationEnum = pgEnum('revenue_validation', ['unknown','idea','concrete_proposal','confirmed']);

export const revenueScalabilityEnum = pgEnum('revenue_scalability', ['no_additional_sources','possible_additional_sources','real_growth_paths','replicable']);

export const valueTypeEnum = pgEnum('value_type', ['emotional','functional']);

export const channelTypeEnum = pgEnum('channel_type', ['direct','partner','additional']);

export const innovationTestStatusEnum = pgEnum('innovation_test_status', ['recruiting','active','completed','cancelled']);

export const testerApplicationStatusEnum = pgEnum('tester_application_status', ['pending','accepted','rejected','withdrawn','completed']);

export const problemReportStatusEnum = pgEnum('problem_report_status', ['new','in_review','planned','resolved','rejected']);

export const problemReportReporterEnum = pgEnum('problem_report_reporter', ['resident','ngo','local_government','institution','other']);




/**

 * Approved source locations configured for the hub. A source row describes the

 * provenance of a document; it never implies that the contents were verified.

 */

export const sources = pgTable('sources', {

  id: text('id').primaryKey(),

  title: text('title').notNull(),

  url: text('url'),

  kind: text('kind').notNull(),

  /** True only when an operator confirmed the URL resolves to the described document. */

  urlVerified: boolean('url_verified').notNull().default(false),

  synthetic: boolean('synthetic').notNull().default(false),

  description: text('description'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

});



/**

 * Candidate catalogue. Records sourced from the ROPS Innovation Library or from a

 * manual import use `synthetic = false`; demonstration records use `synthetic = true`

 * and are labelled in every result.

 */

export const innovations = pgTable(

  'innovations',

  {

    id: text('id').primaryKey(),

    title: text('title').notNull(),

    summary: text('summary').notNull(),

    description: text('description').notNull(),

    sourceId: text('source_id').notNull(),

    synthetic: boolean('synthetic').notNull().default(false),

    evidenceStatus: text('evidence_status').notNull(),

    problemTags: jsonb('problem_tags').$type<string[]>().notNull().default([]),

    targetGroups: jsonb('target_groups').$type<string[]>().notNull().default([]),

    /** Places where the innovation was documented as tested. Not a claim about where it fits. */

    testedIn: jsonb('tested_in').$type<string[]>().notNull().default([]),

    /** Contexts the innovation is described as applicable to (urban, rural, county names...). */

    applicableContexts: jsonb('applicable_contexts').$type<string[]>().notNull().default([]),

    prerequisites: jsonb('prerequisites').$type<string[]>().notNull().default([]),

    resourcesRequired: jsonb('resources_required').$type<string[]>().notNull().default([]),

    estimatedCostPln: doublePrecision('estimated_cost_pln'),

    timeframeWeeks: integer('timeframe_weeks'),

    embedding: jsonb('embedding').$type<number[]>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

  },

  (table) => ({

    sourceIdx: index('innovations_source_idx').on(table.sourceId),

    syntheticIdx: index('innovations_synthetic_idx').on(table.synthetic),

  }),

);



export const innovationCitations = pgTable(

  'innovation_citations',

  {

    id: serial('id').primaryKey(),

    innovationId: text('innovation_id').notNull(),

    sourceId: text('source_id').notNull(),

    title: text('title').notNull(),

    url: text('url'),

    page: integer('page'),

    excerpt: text('excerpt').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

  },

  (table) => ({

    innovationIdx: index('innovation_citations_innovation_idx').on(table.innovationId),

  }),

);



/** Contextual evidence: statistics, reports, the challenges map. Never a candidate. */

export const evidenceDocuments = pgTable('evidence_documents', {

  id: text('id').primaryKey(),

  sourceId: text('source_id').notNull(),

  title: text('title').notNull(),

  kind: text('kind').notNull(),

  summary: text('summary').notNull(),

  url: text('url'),

  synthetic: boolean('synthetic').notNull().default(false),

  problemTags: jsonb('problem_tags').$type<string[]>().notNull().default([]),

  embedding: jsonb('embedding').$type<number[]>(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

});



export const matchmakingRequests = pgTable(

  'matchmaking_requests',

  {

    requestId: text('request_id').primaryKey(),

    userType: text('user_type').notNull(),

    status: text('status').notNull(),

    mode: text('mode').notNull(),

    problemSummary: text('problem_summary').notNull(),

    identifiedNeeds: jsonb('identified_needs').$type<string[]>().notNull().default([]),

    input: jsonb('input').$type<Record<string, unknown>>().notNull(),

    response: jsonb('response').$type<Record<string, unknown>>().notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

  },

  (table) => ({

    createdIdx: index('matchmaking_requests_created_idx').on(table.createdAt),

  }),

);



export const matchmakingFeedback = pgTable(

  'matchmaking_feedback',

  {

    id: serial('id').primaryKey(),

    feedbackId: text('feedback_id').notNull(),

    requestId: text('request_id').notNull(),

    innovationId: text('innovation_id').notNull(),

    useful: boolean('useful').notNull(),

    reason: text('reason'),

    comment: text('comment'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

  },

  (table) => ({

    requestIdx: index('matchmaking_feedback_request_idx').on(table.requestId),

    feedbackIdIdx: uniqueIndex('matchmaking_feedback_feedback_id_idx').on(table.feedbackId),

  }),

);



export const innovationSubmissions = pgTable('innovation_submissions', {

  id: serial('id').primaryKey(),

  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  title: text('title').notNull(),

  description: text('description'),

  innovationType: text('innovation_type'),

  socialInclusionDescription: text('social_inclusion_description'),

  deinstitutionalizationDescription: text('deinstitutionalization_description'),

  innovationUniqueness: text('innovation_uniqueness'),

  existingSolutions: text('existing_solutions'),

  problemDescription: text('problem_description'),

  problemStatistics: text('problem_statistics'),

  problemSources: text('problem_sources'),

  socialChallengesMapReference: text('social_challenges_map_reference'),

  audienceDescription: text('audience_description'),

  audienceNeeds: text('audience_needs'),

  exclusionRiskDescription: text('exclusion_risk_description'),

  expectedChange: text('expected_change'),

  socialInclusionImpact: text('social_inclusion_impact'),

  futureVision: text('future_vision'),

  scalabilityDescription: text('scalability_description'),

  implementationEase: text('implementation_ease'),

  requestedGrantAmount: numeric('requested_grant_amount', { precision: 12, scale: 2 }),

  teamExperience: text('team_experience'),

  affordability: affordabilityEnum('affordability'),

  simplicity: simplicityEnum('simplicity'),

  status: innovationStatusEnum('status').notNull().default('draft'),

  currentStep: integer('current_step').notNull().default(1),

  /** Set by an administrator once the submission has been reviewed. */
  isAccepted: boolean('is_accepted').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

});



export const innovationProblems = pgTable('innovation_problems', {

  id: serial('id').primaryKey(),

  innovationId: integer('innovation_id').notNull().unique().references(() => innovationSubmissions.id, { onDelete: 'cascade' }),

  intensity: problemIntensityEnum('intensity'),

  frequency: problemFrequencyEnum('frequency'),

  scale: problemScaleEnum('scale'),

});



export const innovationActors = pgTable('innovation_actors', {

  id: serial('id').primaryKey(),

  innovationId: integer('innovation_id').notNull().references(() => innovationSubmissions.id, { onDelete: 'cascade' }),

  type: actorTypeEnum('type').notNull(),

  name: text('name').notNull(),

  description: text('description'),

});



export const innovationCosts = pgTable('innovation_costs', {

  id: serial('id').primaryKey(),

  innovationId: integer('innovation_id').notNull().references(() => innovationSubmissions.id, { onDelete: 'cascade' }),

  type: costTypeEnum('type').notNull(),

  name: text('name').notNull(),

  amount: numeric('amount', { precision: 12, scale: 2 }),

  description: text('description'),

});



export const innovationAudiences = pgTable('innovation_audiences', {

  id: serial('id').primaryKey(),

  innovationId: integer('innovation_id').notNull().references(() => innovationSubmissions.id, { onDelete: 'cascade' }),

  type: audienceTypeEnum('type').notNull(),

  value: text('value').notNull(),

  customValue: text('custom_value'),

});



export const innovationRevenue = pgTable('innovation_revenue', {

  id: serial('id').primaryKey(),

  innovationId: integer('innovation_id').notNull().unique().references(() => innovationSubmissions.id, { onDelete: 'cascade' }),

  validation: revenueValidationEnum('validation'),

  mainSource: text('main_source'),

  scalability: revenueScalabilityEnum('scalability'),

  additionalSource: text('additional_source'),

});



export const valueOptions = pgTable('value_options', {

  id: serial('id').primaryKey(),

  type: valueTypeEnum('type').notNull(),

  code: text('code').notNull().unique(),

  label: text('label').notNull(),

});



export const innovationValues = pgTable('innovation_values', {

  id: serial('id').primaryKey(),

  innovationId: integer('innovation_id').notNull().references(() => innovationSubmissions.id, { onDelete: 'cascade' }),

  valueOptionId: integer('value_option_id').references(() => valueOptions.id, { onDelete: 'cascade' }),

  customValue: text('custom_value'),

}, (table) => [

  uniqueIndex('innovation_values_option_unique').on(table.innovationId, table.valueOptionId),

]);



export const innovationChannels = pgTable('innovation_channels', {

  id: serial('id').primaryKey(),

  innovationId: integer('innovation_id').notNull().references(() => innovationSubmissions.id, { onDelete: 'cascade' }),

  type: channelTypeEnum('type').notNull(),

  value: text('value').notNull(),

  customValue: text('custom_value'),

});



export const innovationTeamMembers = pgTable('innovation_team_members', {

  id: serial('id').primaryKey(),

  innovationId: integer('innovation_id').notNull().references(() => innovationSubmissions.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),

  role: text('role'),

  experience: text('experience'),

  organization: text('organization'),

});

export const innovationTests = pgTable(
  'innovation_tests',
  {
    id: serial('id').primaryKey(),
    /** Catalogue innovation under test. Seeded with `npm run db:seed:innovations`. */
    innovationId: text('innovation_id')
      .notNull()
      .references(() => innovations.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    instructions: text('instructions'),
    location: text('location'),
    maxTesters: integer('max_testers'),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    status: innovationTestStatusEnum('status').notNull().default('recruiting'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    innovationIdx: index('innovation_tests_innovation_idx').on(table.innovationId),
    statusIdx: index('innovation_tests_status_idx').on(table.status),
  }),
);

export const testerApplications = pgTable(
  'tester_applications',
  {
    id: serial('id').primaryKey(),
    testId: integer('test_id')
      .notNull()
      .references(() => innovationTests.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    motivation: text('motivation'),
    status: testerApplicationStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('tester_applications_user_idx').on(table.userId),
    testIdx: index('tester_applications_test_idx').on(table.testId),
    testUserUnique: uniqueIndex('tester_applications_test_user_unique').on(table.testId, table.userId),
  }),
);

export const testerFeedback = pgTable(
  'tester_feedback',
  {
    id: serial('id').primaryKey(),
    applicationId: integer('application_id')
      .notNull()
      .unique()
      .references(() => testerApplications.id, { onDelete: 'cascade' }),
    overallRating: integer('overall_rating').notNull(),
    usefulnessRating: integer('usefulness_rating'),
    easeOfUseRating: integer('ease_of_use_rating'),
    wouldUseAgain: boolean('would_use_again'),
    whatWorked: text('what_worked'),
    problems: text('problems'),
    suggestions: text('suggestions'),
    comment: text('comment'),
    answers: jsonb('answers').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    applicationIdx: index('tester_feedback_application_idx').on(table.applicationId),
  }),
);



export const problemReports = pgTable(
  'problem_reports',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: varchar('category', { length: 160 }),
    municipality: varchar('municipality', { length: 160 }),
    county: varchar('county', { length: 160 }),
    reporterType: problemReportReporterEnum('reporter_type').notNull().default('resident'),
    /** Contact for follow-up. Never returned by the public list/detail endpoints. */
    contactEmail: varchar('contact_email', { length: 320 }),
    status: problemReportStatusEnum('status').notNull().default('new'),
    adminResponse: text('admin_response'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('problem_reports_status_idx').on(table.status),
    index('problem_reports_created_idx').on(table.createdAt),
    index('problem_reports_user_idx').on(table.userId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  innovationSubmissions: many(innovationSubmissions),
  testerApplications: many(testerApplications),
  problemReports: many(problemReports),
}));

export const problemReportsRelations = relations(problemReports, ({ one }) => ({
  user: one(users, { fields: [problemReports.userId], references: [users.id] }),
}));

export const innovationsRelations = relations(innovations, ({ many }) => ({
  tests: many(innovationTests),
}));

export const innovationTestsRelations = relations(innovationTests, ({ one, many }) => ({
  innovation: one(innovations, {
    fields: [innovationTests.innovationId],
    references: [innovations.id],
  }),
  applications: many(testerApplications),
}));

export const testerApplicationsRelations = relations(testerApplications, ({ one }) => ({
  test: one(innovationTests, {
    fields: [testerApplications.testId],
    references: [innovationTests.id],
  }),
  user: one(users, {
    fields: [testerApplications.userId],
    references: [users.id],
  }),
  feedback: one(testerFeedback),
}));

export const testerFeedbackRelations = relations(testerFeedback, ({ one }) => ({
  application: one(testerApplications, {
    fields: [testerFeedback.applicationId],
    references: [testerApplications.id],
  }),
}));

export const innovationSubmissionsRelations = relations(innovationSubmissions, ({ one, many }) => ({

  user: one(users, { fields: [innovationSubmissions.userId], references: [users.id] }),

  problem: one(innovationProblems),

  revenue: one(innovationRevenue),

  actors: many(innovationActors),

  costs: many(innovationCosts),

  audiences: many(innovationAudiences),

  values: many(innovationValues),

  channels: many(innovationChannels),

  teamMembers: many(innovationTeamMembers),

}));

export const innovationProblemsRelations = relations(innovationProblems, ({ one }) => ({ innovation: one(innovationSubmissions, { fields: [innovationProblems.innovationId], references: [innovationSubmissions.id] }) }));

export const innovationActorsRelations = relations(innovationActors, ({ one }) => ({ innovation: one(innovationSubmissions, { fields: [innovationActors.innovationId], references: [innovationSubmissions.id] }) }));

export const innovationCostsRelations = relations(innovationCosts, ({ one }) => ({ innovation: one(innovationSubmissions, { fields: [innovationCosts.innovationId], references: [innovationSubmissions.id] }) }));

export const innovationAudiencesRelations = relations(innovationAudiences, ({ one }) => ({ innovation: one(innovationSubmissions, { fields: [innovationAudiences.innovationId], references: [innovationSubmissions.id] }) }));

export const innovationRevenueRelations = relations(innovationRevenue, ({ one }) => ({ innovation: one(innovationSubmissions, { fields: [innovationRevenue.innovationId], references: [innovationSubmissions.id] }) }));

export const valueOptionsRelations = relations(valueOptions, ({ many }) => ({ innovationValues: many(innovationValues) }));

export const innovationValuesRelations = relations(innovationValues, ({ one }) => ({ innovation: one(innovationSubmissions, { fields: [innovationValues.innovationId], references: [innovationSubmissions.id] }), valueOption: one(valueOptions, { fields: [innovationValues.valueOptionId], references: [valueOptions.id] }) }));

export const innovationChannelsRelations = relations(innovationChannels, ({ one }) => ({ innovation: one(innovationSubmissions, { fields: [innovationChannels.innovationId], references: [innovationSubmissions.id] }) }));

export const innovationTeamMembersRelations = relations(innovationTeamMembers, ({ one }) => ({ innovation: one(innovationSubmissions, { fields: [innovationTeamMembers.innovationId], references: [innovationSubmissions.id] }) }));



export type User = typeof users.$inferSelect;

export type NewUser = typeof users.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export type Category = typeof categories.$inferSelect;

export type Topic = typeof topics.$inferSelect;

export type Material = typeof materials.$inferSelect;

export type NewMaterial = typeof materials.$inferInsert;

export type SearchTerm = typeof searchTerms.$inferSelect;

export type ContactMessage = typeof contactMessages.$inferSelect;

export type Source = typeof sources.$inferSelect;

export type NewSource = typeof sources.$inferInsert;

export type Innovation = typeof innovations.$inferSelect;

export type NewInnovation = typeof innovations.$inferInsert;

export type InnovationCitation = typeof innovationCitations.$inferSelect;

export type NewInnovationCitation = typeof innovationCitations.$inferInsert;

export type EvidenceDocument = typeof evidenceDocuments.$inferSelect;

export type NewEvidenceDocument = typeof evidenceDocuments.$inferInsert;

export type MatchmakingRequestRow = typeof matchmakingRequests.$inferSelect;

export type NewMatchmakingRequestRow = typeof matchmakingRequests.$inferInsert;

export type MatchmakingFeedbackRow = typeof matchmakingFeedback.$inferSelect;

export type NewMatchmakingFeedbackRow = typeof matchmakingFeedback.$inferInsert;

export type InnovationSubmission = typeof innovationSubmissions.$inferSelect;

export type NewInnovationSubmission = typeof innovationSubmissions.$inferInsert;

export type InnovationProblem = typeof innovationProblems.$inferSelect;

export type NewInnovationProblem = typeof innovationProblems.$inferInsert;

export type InnovationActor = typeof innovationActors.$inferSelect;

export type NewInnovationActor = typeof innovationActors.$inferInsert;

export type InnovationCost = typeof innovationCosts.$inferSelect;

export type NewInnovationCost = typeof innovationCosts.$inferInsert;

export type InnovationAudience = typeof innovationAudiences.$inferSelect;

export type NewInnovationAudience = typeof innovationAudiences.$inferInsert;

export type InnovationRevenue = typeof innovationRevenue.$inferSelect;

export type NewInnovationRevenue = typeof innovationRevenue.$inferInsert;

export type ValueOption = typeof valueOptions.$inferSelect;

export type NewValueOption = typeof valueOptions.$inferInsert;

export type InnovationValue = typeof innovationValues.$inferSelect;

export type NewInnovationValue = typeof innovationValues.$inferInsert;

export type InnovationChannel = typeof innovationChannels.$inferSelect;

export type NewInnovationChannel = typeof innovationChannels.$inferInsert;

export type InnovationTeamMember = typeof innovationTeamMembers.$inferSelect;

export type NewInnovationTeamMember = typeof innovationTeamMembers.$inferInsert;

export type InnovationTest = typeof innovationTests.$inferSelect;

export type NewInnovationTest = typeof innovationTests.$inferInsert;

export type TesterApplication = typeof testerApplications.$inferSelect;

export type NewTesterApplication = typeof testerApplications.$inferInsert;

export type TesterFeedback = typeof testerFeedback.$inferSelect;

export type NewTesterFeedback = typeof testerFeedback.$inferInsert;

export type ProblemReport = typeof problemReports.$inferSelect;

export type NewProblemReport = typeof problemReports.$inferInsert;

// ---------------------------------------------------------------------------
// Assistant: municipal programs, conversations, messages and stable searches.
// ---------------------------------------------------------------------------

export const programs = pgTable(
  'programs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    title: text('title').notNull(),

    summary: text('summary').notNull(),

    description: text('description').notNull(),

    targetGroups: text('target_groups').array().notNull(),

    topics: text('topics').array().notNull(),

    problemsAddressed: text('problems_addressed').array().notNull(),

    eligibility: jsonb('eligibility').$type<ProgramEligibility>(),

    eligibilityDescription: text('eligibility_description'),

    /** Deterministic, human-readable text the embedding is generated from. */
    searchText: text('search_text').notNull(),

    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),

    status: text('status').$type<ProgramStatus>().notNull(),

    url: text('url'),

    validFrom: timestamp('valid_from', { withTimezone: true }),

    validUntil: timestamp('valid_until', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('programs_status_idx').on(table.status),

    index('programs_embedding_hnsw_idx').using('hnsw', sql`${table.embedding} vector_cosine_ops`),
  ],
);

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),

  state: jsonb('state').$type<ConversationState>().notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),

    role: text('role').notNull(),

    content: text('content').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('messages_conversation_idx').on(table.conversationId, table.createdAt)],
);

export const searches = pgTable(
  'searches',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),

    searchQuery: text('search_query').notNull(),

    resultCount: integer('result_count').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('searches_conversation_idx').on(table.conversationId, table.createdAt)],
);

/**
 * Stable ranking snapshot. Pagination reads this table directly; it never
 * re-runs embedding or vector search.
 */
export const searchResults = pgTable(
  'search_results',
  {
    searchId: uuid('search_id')
      .notNull()
      .references(() => searches.id, { onDelete: 'cascade' }),

    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),

    position: integer('position').notNull(),

    similarity: doublePrecision('similarity').notNull(),

    eligibilityStatus: text('eligibility_status').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.searchId, table.position] }),

    index('search_results_program_idx').on(table.programId),
  ],
);

export type Program = typeof programs.$inferSelect;

export type NewProgram = typeof programs.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;

export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;

export type NewMessage = typeof messages.$inferInsert;

export type Search = typeof searches.$inferSelect;

export type NewSearch = typeof searches.$inferInsert;

export type SearchResultRow = typeof searchResults.$inferSelect;

export type NewSearchResultRow = typeof searchResults.$inferInsert;
