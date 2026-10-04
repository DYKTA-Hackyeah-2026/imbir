import { Router } from 'express';
import { and, desc, eq, gte, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  innovationStatusEnum,
  innovationSubmissions,
  innovationTests,
  innovations,
  matchmakingFeedback,
  matchmakingRequests,
  problemReports,
  testerApplications,
  users,
} from '../db/schema.js';
import { ApiError } from '../http/errors.js';
import { parseInteger, parseOptionalText, parsePositiveId } from '../http/parse.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_OFFSET = 10000;
const MAX_QUERY_LENGTH = 200;
const DAY_MS = 24 * 60 * 60 * 1000;
const STATS_WINDOW_DAYS = 14;
const RECENT_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 8;
const RECENT_SOURCE_LIMIT = 3;

type InnovationStatus = (typeof innovationStatusEnum.enumValues)[number];

function parseOptionalAccepted(raw: unknown): boolean | undefined {
  if (raw === undefined) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw ApiError.validation('Parametr „accepted” musi mieć wartość „true” albo „false”.');
}

function parseOptionalStatus(raw: unknown): InnovationStatus | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw !== 'string' || !innovationStatusEnum.enumValues.includes(raw as InnovationStatus)) {
    throw ApiError.validation(
      `Parametr „status” musi mieć jedną z wartości: ${innovationStatusEnum.enumValues.join(', ')}.`,
    );
  }
  return raw as InnovationStatus;
}

function parseOptionalBodyBoolean(raw: unknown, field: string): boolean | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'boolean') {
    throw ApiError.validation(`Pole „${field}” musi być wartością logiczną.`);
  }
  return raw;
}

function parseOptionalBodyStatus(raw: unknown): InnovationStatus | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string' || !innovationStatusEnum.enumValues.includes(raw as InnovationStatus)) {
    throw ApiError.validation(
      `Pole „status” musi mieć jedną z wartości: ${innovationStatusEnum.enumValues.join(', ')}.`,
    );
  }
  return raw as InnovationStatus;
}

interface AdminSubmissionRow {
  id: number;
  title: string;
  description: string | null;
  status: InnovationStatus;
  isAccepted: boolean;
  currentStep: number;
  createdAt: Date;
  updatedAt: Date;
}

function toAdminSubmission(
  row: AdminSubmissionRow,
  authorEmail: string | null,
  authorName: string | null,
) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    isAccepted: row.isAccepted,
    currentStep: row.currentStep,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    authorEmail,
    authorName,
  };
}

const adminRouter = Router();

// 1. GET /stats - admin dashboard statistics
adminRouter.get('/stats', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const activityStart = new Date(todayUtc - (STATS_WINDOW_DAYS - 1) * DAY_MS);
    const submissionsDay = sql`to_char(${innovationSubmissions.createdAt}, 'YYYY-MM-DD')`;
    const reportsDay = sql`to_char(${problemReports.createdAt}, 'YYYY-MM-DD')`;

    const [
      [userCounts],
      [catalogueCounts],
      [submissionCounts],
      [reportCounts],
      [testCounts],
      [applicationCounts],
      [requestCounts],
      [feedbackCounts],
      categoryRows,
      submissionDayRows,
      reportDayRows,
      recentSubmissionRows,
      recentReportRows,
      recentApplicationRows,
      recentTestRows,
    ] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          newThisWeek: sql<number>`count(*) filter (where ${users.createdAt} >= ${weekAgo})::int`,
        })
        .from(users),
      db.select({ catalogue: sql<number>`count(*)::int` }).from(innovations),
      db
        .select({
          total: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where ${innovationSubmissions.isAccepted} = false)::int`,
          accepted: sql<number>`count(*) filter (where ${innovationSubmissions.isAccepted} = true)::int`,
          rejected: sql<number>`count(*) filter (where ${innovationSubmissions.status} = 'rejected')::int`,
          newThisWeek: sql<number>`count(*) filter (where ${innovationSubmissions.createdAt} >= ${weekAgo})::int`,
        })
        .from(innovationSubmissions),
      db
        .select({
          total: sql<number>`count(*)::int`,
          new: sql<number>`count(*) filter (where ${problemReports.status} = 'new')::int`,
          inReview: sql<number>`count(*) filter (where ${problemReports.status} = 'in_review')::int`,
          planned: sql<number>`count(*) filter (where ${problemReports.status} = 'planned')::int`,
          resolved: sql<number>`count(*) filter (where ${problemReports.status} = 'resolved')::int`,
          rejected: sql<number>`count(*) filter (where ${problemReports.status} = 'rejected')::int`,
          newThisWeek: sql<number>`count(*) filter (where ${problemReports.createdAt} >= ${weekAgo})::int`,
        })
        .from(problemReports),
      db
        .select({
          total: sql<number>`count(*)::int`,
          recruiting: sql<number>`count(*) filter (where ${innovationTests.status} = 'recruiting')::int`,
          active: sql<number>`count(*) filter (where ${innovationTests.status} = 'active')::int`,
        })
        .from(innovationTests),
      db
        .select({
          total: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where ${testerApplications.status} = 'pending')::int`,
        })
        .from(testerApplications),
      db.select({ count: sql<number>`count(*)::int` }).from(matchmakingRequests),
      db.select({ count: sql<number>`count(*)::int` }).from(matchmakingFeedback),
      db
        .select({
          category: sql<string>`coalesce(${problemReports.category}, 'Inne')`,
          count: sql<number>`count(*)::int`,
        })
        .from(problemReports)
        .groupBy(sql`coalesce(${problemReports.category}, 'Inne')`)
        .orderBy(desc(sql`count(*)`))
        .limit(5),
      db
        .select({ date: sql<string>`${submissionsDay}`, count: sql<number>`count(*)::int` })
        .from(innovationSubmissions)
        .where(gte(innovationSubmissions.createdAt, activityStart))
        .groupBy(submissionsDay),
      db
        .select({ date: sql<string>`${reportsDay}`, count: sql<number>`count(*)::int` })
        .from(problemReports)
        .where(gte(problemReports.createdAt, activityStart))
        .groupBy(reportsDay),
      db
        .select({
          id: innovationSubmissions.id,
          title: innovationSubmissions.title,
          status: innovationSubmissions.status,
          isAccepted: innovationSubmissions.isAccepted,
          createdAt: innovationSubmissions.createdAt,
          authorEmail: users.email,
        })
        .from(innovationSubmissions)
        .leftJoin(users, eq(innovationSubmissions.userId, users.id))
        .orderBy(desc(innovationSubmissions.id))
        .limit(RECENT_LIMIT),
      db
        .select({
          id: problemReports.id,
          title: problemReports.title,
          status: problemReports.status,
          category: problemReports.category,
          createdAt: problemReports.createdAt,
        })
        .from(problemReports)
        .orderBy(desc(problemReports.id))
        .limit(RECENT_LIMIT),
      db
        .select({
          id: testerApplications.id,
          status: testerApplications.status,
          createdAt: testerApplications.createdAt,
          title: innovationTests.title,
        })
        .from(testerApplications)
        .innerJoin(innovationTests, eq(testerApplications.testId, innovationTests.id))
        .orderBy(desc(testerApplications.id))
        .limit(RECENT_SOURCE_LIMIT),
      db
        .select({
          id: innovationTests.id,
          title: innovationTests.title,
          status: innovationTests.status,
          createdAt: innovationTests.createdAt,
        })
        .from(innovationTests)
        .orderBy(desc(innovationTests.id))
        .limit(RECENT_SOURCE_LIMIT),
    ]);

    const submissionByDay = new Map(submissionDayRows.map((row) => [row.date, row.count]));
    const reportByDay = new Map(reportDayRows.map((row) => [row.date, row.count]));
    const activityByDay = Array.from({ length: STATS_WINDOW_DAYS }, (_, index) => {
      const date = new Date(activityStart.getTime() + index * DAY_MS).toISOString().slice(0, 10);
      return {
        date,
        submissions: submissionByDay.get(date) ?? 0,
        reports: reportByDay.get(date) ?? 0,
      };
    });

    const recentActivity = [
      ...recentSubmissionRows.map((row) => ({
        type: 'submission' as const,
        title: row.title,
        at: row.createdAt.toISOString(),
        status: row.status,
      })),
      ...recentReportRows.map((row) => ({
        type: 'report' as const,
        title: row.title,
        at: row.createdAt.toISOString(),
        status: row.status,
      })),
      ...recentApplicationRows.map((row) => ({
        type: 'application' as const,
        title: row.title,
        at: row.createdAt.toISOString(),
        status: row.status,
      })),
      ...recentTestRows.map((row) => ({
        type: 'test' as const,
        title: row.title,
        at: row.createdAt.toISOString(),
        status: row.status,
      })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, RECENT_ACTIVITY_LIMIT);

    res.json({
      generatedAt: now.toISOString(),
      users: {
        total: userCounts?.total ?? 0,
        newThisWeek: userCounts?.newThisWeek ?? 0,
      },
      innovations: { catalogue: catalogueCounts?.catalogue ?? 0 },
      submissions: {
        total: submissionCounts?.total ?? 0,
        pending: submissionCounts?.pending ?? 0,
        accepted: submissionCounts?.accepted ?? 0,
        rejected: submissionCounts?.rejected ?? 0,
        newThisWeek: submissionCounts?.newThisWeek ?? 0,
      },
      problemReports: {
        total: reportCounts?.total ?? 0,
        new: reportCounts?.new ?? 0,
        inReview: reportCounts?.inReview ?? 0,
        planned: reportCounts?.planned ?? 0,
        resolved: reportCounts?.resolved ?? 0,
        rejected: reportCounts?.rejected ?? 0,
        newThisWeek: reportCounts?.newThisWeek ?? 0,
      },
      tests: {
        total: testCounts?.total ?? 0,
        recruiting: testCounts?.recruiting ?? 0,
        active: testCounts?.active ?? 0,
      },
      testerApplications: {
        total: applicationCounts?.total ?? 0,
        pending: applicationCounts?.pending ?? 0,
      },
      matchmaking: {
        requests: requestCounts?.count ?? 0,
        feedback: feedbackCounts?.count ?? 0,
      },
      categories: categoryRows,
      activityByDay,
      recentSubmissions: recentSubmissionRows,
      recentReports: recentReportRows,
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
});

// 2. GET /submissions - admin list of innovation submissions
adminRouter.get('/submissions', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const q = parseOptionalText(req.query.q, 'q', MAX_QUERY_LENGTH);
    const accepted = parseOptionalAccepted(req.query.accepted);
    const status = parseOptionalStatus(req.query.status);
    const limit = parseInteger(req.query.limit, 'limit', DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = parseInteger(req.query.offset, 'offset', 0, 0, MAX_OFFSET);

    const conditions = [];
    if (accepted !== undefined) conditions.push(eq(innovationSubmissions.isAccepted, accepted));
    if (status !== undefined) conditions.push(eq(innovationSubmissions.status, status));
    if (q !== undefined) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          ilike(innovationSubmissions.title, pattern),
          ilike(innovationSubmissions.description, pattern),
          ilike(users.email, pattern),
        )!,
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [[totalRow], [counts], rows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(innovationSubmissions)
        .leftJoin(users, eq(innovationSubmissions.userId, users.id))
        .where(where),
      db
        .select({
          pending: sql<number>`count(*) filter (where ${innovationSubmissions.isAccepted} = false)::int`,
          accepted: sql<number>`count(*) filter (where ${innovationSubmissions.isAccepted} = true)::int`,
          rejected: sql<number>`count(*) filter (where ${innovationSubmissions.status} = 'rejected')::int`,
        })
        .from(innovationSubmissions),
      db
        .select({
          id: innovationSubmissions.id,
          title: innovationSubmissions.title,
          description: innovationSubmissions.description,
          status: innovationSubmissions.status,
          isAccepted: innovationSubmissions.isAccepted,
          currentStep: innovationSubmissions.currentStep,
          createdAt: innovationSubmissions.createdAt,
          updatedAt: innovationSubmissions.updatedAt,
          authorEmail: users.email,
          authorName: users.name,
        })
        .from(innovationSubmissions)
        .leftJoin(users, eq(innovationSubmissions.userId, users.id))
        .where(where)
        .orderBy(desc(innovationSubmissions.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    res.json({
      total: totalRow?.count ?? 0,
      count: rows.length,
      limit,
      offset,
      counts: {
        pending: counts?.pending ?? 0,
        accepted: counts?.accepted ?? 0,
        rejected: counts?.rejected ?? 0,
      },
      data: rows.map((row) => toAdminSubmission(row, row.authorEmail, row.authorName)),
    });
  } catch (error) {
    next(error);
  }
});

// 3. PATCH /submissions/:submissionId - accept or reject a submission
adminRouter.patch('/submissions/:submissionId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const submissionId = parsePositiveId(req.params.submissionId, 'submissionId');

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw ApiError.validation('Treść żądania musi być obiektem JSON.');
    }

    const isAccepted = parseOptionalBodyBoolean(body.isAccepted, 'isAccepted');
    const status = parseOptionalBodyStatus(body.status);
    if (isAccepted === undefined && status === undefined) {
      throw ApiError.validation('Podaj „isAccepted” lub „status”.');
    }

    const [updated] = await db
      .update(innovationSubmissions)
      .set({
        ...(isAccepted === undefined ? {} : { isAccepted }),
        ...(status === undefined ? {} : { status }),
        updatedAt: new Date(),
      })
      .where(eq(innovationSubmissions.id, submissionId))
      .returning();

    if (!updated) {
      throw ApiError.notFound('Nie znaleziono zgłoszenia innowacji o podanym identyfikatorze.');
    }

    const [author] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, updated.userId))
      .limit(1);

    res.json({
      message: 'Zgłoszenie innowacji zostało zaktualizowane.',
      data: toAdminSubmission(updated, author?.email ?? null, author?.name ?? null),
    });
  } catch (error) {
    next(error);
  }
});

export default adminRouter;
