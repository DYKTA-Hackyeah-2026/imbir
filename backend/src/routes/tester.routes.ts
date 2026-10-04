import { Router } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  innovationTestStatusEnum,
  innovationTests,
  innovations,
  testerApplications,
  testerFeedback,
} from '../db/schema.js';
import { ApiError } from '../http/errors.js';
import {
  parseBodyBoolean,
  parseBodyText,
  parseInteger,
  parseOptionalDate,
  parseOptionalIntInRange,
  parsePositiveId,
  parseRequiredText,
} from '../http/parse.js';
import { resolveUserId, requireUserId } from '../utils/current-user.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_OFFSET = 10000;
const MAX_TEXT = 5000;

type TestStatus = (typeof innovationTestStatusEnum.enumValues)[number];

function parseTestStatus(raw: unknown, field: string): TestStatus | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string' || !innovationTestStatusEnum.enumValues.includes(raw as TestStatus)) {
    throw ApiError.validation(
      `Parametr „${field}” musi mieć jedną z wartości: ${innovationTestStatusEnum.enumValues.join(', ')}.`,
    );
  }
  return raw as TestStatus;
}

const testerRouter = Router();

// 1. GET /tests - list innovation tests for testers
testerRouter.get('/tests', async (req, res, next) => {
  try {
    const status = parseTestStatus(req.query.status, 'status');
    const innovationId = parseRequiredText(req.query.innovationId, 'innovationId', 200);
    const limit = parseInteger(req.query.limit, 'limit', DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = parseInteger(req.query.offset, 'offset', 0, 0, MAX_OFFSET);

    const filters = [];
    if (status) filters.push(eq(innovationTests.status, status));
    if (innovationId) filters.push(eq(innovationTests.innovationId, innovationId));
    const where = filters.length > 0 ? and(...filters) : undefined;

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(innovationTests)
      .where(where);

    const data = await db
      .select({
        id: innovationTests.id,
        innovationId: innovationTests.innovationId,
        title: innovationTests.title,
        description: innovationTests.description,
        location: innovationTests.location,
        maxTesters: innovationTests.maxTesters,
        startAt: innovationTests.startAt,
        endAt: innovationTests.endAt,
        status: innovationTests.status,
        createdAt: innovationTests.createdAt,
        innovationTitle: innovations.title,
        innovationSummary: innovations.summary,
        innovationSynthetic: innovations.synthetic,
      })
      .from(innovationTests)
      .leftJoin(innovations, eq(innovationTests.innovationId, innovations.id))
      .where(where)
      .orderBy(desc(innovationTests.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ total: totalRow?.count ?? 0, count: data.length, limit, offset, data });
  } catch (error) {
    next(error);
  }
});

// 2. POST /tests - create a test (operator / admin panel)
testerRouter.post('/tests', async (req, res, next) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw ApiError.validation('Treść żądania musi być obiektem JSON.');
    }

    const innovationId = parseBodyText(body.innovationId, 'innovationId', 200);
    if (!innovationId) {
      throw ApiError.validation('Pole „innovationId” jest wymagane.');
    }
    const title = parseBodyText(body.title, 'title', 300);
    if (!title) {
      throw ApiError.validation('Pole „title” jest wymagane.');
    }

    const description = parseBodyText(body.description, 'description', MAX_TEXT);
    const instructions = parseBodyText(body.instructions, 'instructions', MAX_TEXT);
    const location = parseBodyText(body.location, 'location', 300);
    const maxTesters = parseOptionalIntInRange(body.maxTesters, 'maxTesters', 1, 100000);
    const startAt = parseOptionalDate(body.startAt, 'startAt');
    const endAt = parseOptionalDate(body.endAt, 'endAt');
    if (startAt && endAt && endAt.getTime() <= startAt.getTime()) {
      throw ApiError.validation('Pole „endAt” musi być późniejsze niż „startAt”.');
    }
    const status = parseTestStatus(body.status, 'status');

    const [innovation] = await db
      .select({ id: innovations.id })
      .from(innovations)
      .where(eq(innovations.id, innovationId))
      .limit(1);
    if (!innovation) {
      throw ApiError.notFound(
        'Nie znaleziono innowacji o podanym identyfikatorze w katalogu.',
      );
    }

    const [created] = await db
      .insert(innovationTests)
      .values({
        innovationId,
        title,
        description: description ?? null,
        instructions: instructions ?? null,
        location: location ?? null,
        maxTesters: maxTesters ?? null,
        startAt: startAt ?? null,
        endAt: endAt ?? null,
        status: status ?? 'recruiting',
      })
      .returning();

    res.status(201).json({ message: 'Test innowacji został utworzony.', data: created });
  } catch (error) {
    next(error);
  }
});

// 3. GET /tests/:testId - test details with recruitment status
testerRouter.get('/tests/:testId', async (req, res, next) => {
  try {
    const testId = parsePositiveId(req.params.testId, 'testId');

    const [test] = await db
      .select({
        id: innovationTests.id,
        innovationId: innovationTests.innovationId,
        title: innovationTests.title,
        description: innovationTests.description,
        instructions: innovationTests.instructions,
        location: innovationTests.location,
        maxTesters: innovationTests.maxTesters,
        startAt: innovationTests.startAt,
        endAt: innovationTests.endAt,
        status: innovationTests.status,
        createdAt: innovationTests.createdAt,
        updatedAt: innovationTests.updatedAt,
        innovationTitle: innovations.title,
        innovationSummary: innovations.summary,
      })
      .from(innovationTests)
      .leftJoin(innovations, eq(innovationTests.innovationId, innovations.id))
      .where(eq(innovationTests.id, testId))
      .limit(1);

    if (!test) {
      throw ApiError.notFound('Nie znaleziono testu o podanym identyfikatorze.');
    }

    const [counts] = await db
      .select({
        applications: sql<number>`count(*)::int`,
        accepted: sql<number>`count(*) filter (where ${testerApplications.status} = 'accepted')::int`,
      })
      .from(testerApplications)
      .where(eq(testerApplications.testId, testId));

    const accepted = counts?.accepted ?? 0;
    const slotsLeft = test.maxTesters === null ? null : Math.max(0, test.maxTesters - accepted);

    res.json({
      data: {
        ...test,
        applicationsCount: counts?.applications ?? 0,
        acceptedCount: accepted,
        slotsLeft,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 4. POST /tests/:testId/applications - declare willingness to test
testerRouter.post('/tests/:testId/applications', async (req, res, next) => {
  try {
    const testId = parsePositiveId(req.params.testId, 'testId');

    const body = req.body ?? {};
    if (typeof body !== 'object' || Array.isArray(body)) {
      throw ApiError.validation('Treść żądania musi być obiektem JSON.');
    }
    const motivation = parseBodyText(body.motivation, 'motivation', 2000);

    const [test] = await db
      .select({ id: innovationTests.id, status: innovationTests.status })
      .from(innovationTests)
      .where(eq(innovationTests.id, testId))
      .limit(1);
    if (!test) {
      throw ApiError.notFound('Nie znaleziono testu o podanym identyfikatorze.');
    }
    if (test.status !== 'recruiting' && test.status !== 'active') {
      throw ApiError.conflict('Nabór do tego testu jest zamknięty.');
    }

    const userId = await resolveUserId(req);

    const [created] = await db
      .insert(testerApplications)
      .values({ testId, userId, motivation: motivation ?? null })
      .onConflictDoNothing({ target: [testerApplications.testId, testerApplications.userId] })
      .returning();

    if (!created) {
      throw ApiError.conflict('Zgłoszenie do tego testu już istnieje.');
    }

    res.status(201).json({
      message: 'Zgłoszenie chęci udziału w testach zostało przyjęte.',
      data: {
        id: created.id,
        testId: created.testId,
        status: created.status,
        motivation: created.motivation,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 5. GET /tester/applications - my applications (requires a valid Bearer token)
testerRouter.get('/tester/applications', async (req, res, next) => {
  try {
    const userId = await requireUserId(req);

    const data = await db.query.testerApplications.findMany({
      where: eq(testerApplications.userId, userId),
      orderBy: [desc(testerApplications.createdAt)],
      with: {
        test: {
          with: {
            innovation: true,
          },
        },
        feedback: true,
      },
    });

    res.json({ count: data.length, data });
  } catch (error) {
    next(error);
  }
});

// 6. POST /tester/applications/:applicationId/feedback - rating, feedback, improvements
testerRouter.post('/tester/applications/:applicationId/feedback', async (req, res, next) => {
  try {
    const applicationId = parsePositiveId(req.params.applicationId, 'applicationId');

    const body = req.body ?? {};
    if (typeof body !== 'object' || Array.isArray(body)) {
      throw ApiError.validation('Treść żądania musi być obiektem JSON.');
    }

    const overallRating = parseOptionalIntInRange(body.overallRating, 'overallRating', 1, 5);
    if (overallRating === undefined) {
      throw ApiError.validation('Pole „overallRating” (ocena ogólna 1–5) jest wymagane.');
    }
    const usefulnessRating = parseOptionalIntInRange(body.usefulnessRating, 'usefulnessRating', 1, 5);
    const easeOfUseRating = parseOptionalIntInRange(body.easeOfUseRating, 'easeOfUseRating', 1, 5);
    const wouldUseAgain = parseBodyBoolean(body.wouldUseAgain, 'wouldUseAgain');
    const whatWorked = parseBodyText(body.whatWorked, 'whatWorked', MAX_TEXT);
    const problems = parseBodyText(body.problems, 'problems', MAX_TEXT);
    const suggestions = parseBodyText(body.suggestions, 'suggestions', MAX_TEXT);
    const comment = parseBodyText(body.comment, 'comment', MAX_TEXT);

    let answers: Record<string, unknown> = {};
    if (body.answers !== undefined && body.answers !== null) {
      if (typeof body.answers !== 'object' || Array.isArray(body.answers)) {
        throw ApiError.validation('Pole „answers” musi być obiektem.');
      }
      answers = body.answers as Record<string, unknown>;
    }

    const [application] = await db
      .select({ id: testerApplications.id })
      .from(testerApplications)
      .where(eq(testerApplications.id, applicationId))
      .limit(1);
    if (!application) {
      throw ApiError.notFound('Nie znaleziono zgłoszenia o podanym identyfikatorze.');
    }

    const feedbackValues = {
      overallRating,
      usefulnessRating: usefulnessRating ?? null,
      easeOfUseRating: easeOfUseRating ?? null,
      wouldUseAgain: wouldUseAgain ?? null,
      whatWorked: whatWorked ?? null,
      problems: problems ?? null,
      suggestions: suggestions ?? null,
      comment: comment ?? null,
      answers,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: testerFeedback.id })
      .from(testerFeedback)
      .where(eq(testerFeedback.applicationId, applicationId))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(testerFeedback)
        .set(feedbackValues)
        .where(eq(testerFeedback.id, existing.id))
        .returning();
      res.json({ message: 'Informacja zwrotna została zaktualizowana.', data: updated });
      return;
    }

    const [created] = await db
      .insert(testerFeedback)
      .values({ applicationId, ...feedbackValues })
      .returning();
    res.status(201).json({ message: 'Dziękujemy. Informacja zwrotna została zapisana.', data: created });
  } catch (error) {
    next(error);
  }
});

// 7. GET /innovations/:innovationId/tester-feedback - aggregated ratings for an innovation
testerRouter.get('/innovations/:innovationId/tester-feedback', async (req, res, next) => {
  try {
    const innovationId = req.params.innovationId;
    if (!innovationId || innovationId.length > 200) {
      throw ApiError.validation('Niepoprawny identyfikator innowacji.');
    }

    const rows = await db
      .select({
        applicationId: testerApplications.id,
        applicationStatus: testerApplications.status,
        createdAt: testerFeedback.createdAt,
        overallRating: testerFeedback.overallRating,
        usefulnessRating: testerFeedback.usefulnessRating,
        easeOfUseRating: testerFeedback.easeOfUseRating,
        wouldUseAgain: testerFeedback.wouldUseAgain,
        whatWorked: testerFeedback.whatWorked,
        problems: testerFeedback.problems,
        suggestions: testerFeedback.suggestions,
        comment: testerFeedback.comment,
      })
      .from(testerApplications)
      .innerJoin(innovationTests, eq(testerApplications.testId, innovationTests.id))
      .leftJoin(testerFeedback, eq(testerFeedback.applicationId, testerApplications.id))
      .where(eq(innovationTests.innovationId, innovationId))
      .orderBy(desc(testerFeedback.createdAt));

    const feedback = rows.filter((row) => row.overallRating !== null);

    const average = (values: number[]): number | null => {
      if (values.length === 0) return null;
      const sum = values.reduce((total, value) => total + value, 0);
      return Math.round((sum / values.length) * 100) / 100;
    };

    const wouldUseAgainAnswers = feedback
      .map((row) => row.wouldUseAgain)
      .filter((value): value is boolean => value !== null);
    const wouldUseAgainRatio =
      wouldUseAgainAnswers.length === 0
        ? null
        : Math.round(
            (wouldUseAgainAnswers.filter(Boolean).length / wouldUseAgainAnswers.length) * 100,
          ) / 100;

    res.json({
      innovationId,
      applicationCount: rows.length,
      feedbackCount: feedback.length,
      averages: {
        overall: average(feedback.map((row) => row.overallRating as number)),
        usefulness: average(
          feedback
            .map((row) => row.usefulnessRating)
            .filter((value): value is number => value !== null),
        ),
        easeOfUse: average(
          feedback
            .map((row) => row.easeOfUseRating)
            .filter((value): value is number => value !== null),
        ),
      },
      wouldUseAgainRatio,
      data: feedback.slice(0, 20),
    });
  } catch (error) {
    next(error);
  }
});

export default testerRouter;
