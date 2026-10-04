import { Router } from 'express';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  problemReportReporterEnum,
  problemReportStatusEnum,
  problemReports,
} from '../db/schema.js';
import { ApiError } from '../http/errors.js';
import { parseBodyText, parseInteger, parseOptionalEmail, parsePositiveId } from '../http/parse.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { resolveUserId } from '../utils/current-user.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_OFFSET = 10000;

type ReportStatus = (typeof problemReportStatusEnum.enumValues)[number];
type ReporterType = (typeof problemReportReporterEnum.enumValues)[number];

function parseStatus(raw: unknown, field: string): ReportStatus | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw !== 'string' || !problemReportStatusEnum.enumValues.includes(raw as ReportStatus)) {
    throw ApiError.validation(
      `Parametr „${field}” musi mieć jedną z wartości: ${problemReportStatusEnum.enumValues.join(', ')}.`,
    );
  }
  return raw as ReportStatus;
}

function parseReporterType(raw: unknown): ReporterType {
  if (raw === undefined || raw === null || raw === '') return 'resident';
  if (
    typeof raw !== 'string' ||
    !problemReportReporterEnum.enumValues.includes(raw as ReporterType)
  ) {
    throw ApiError.validation(
      `Pole „reporterType” musi mieć jedną z wartości: ${problemReportReporterEnum.enumValues.join(', ')}.`,
    );
  }
  return raw as ReporterType;
}

type ReportRow = typeof problemReports.$inferSelect;

/** Public projection: never exposes the reporter's account id or contact email. */
function toPublicReport(row: ReportRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    municipality: row.municipality,
    county: row.county,
    reporterType: row.reporterType,
    status: row.status,
    adminResponse: row.adminResponse,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const problemReportsRouter = Router();

// 1. GET / - public list of reported problems
problemReportsRouter.get('/', async (req, res, next) => {
  try {
    const status = parseStatus(req.query.status, 'status');
    const limit = parseInteger(req.query.limit, 'limit', DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = parseInteger(req.query.offset, 'offset', 0, 0, MAX_OFFSET);
    const where = status ? eq(problemReports.status, status) : undefined;

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(problemReports)
      .where(where);

    const rows = await db
      .select()
      .from(problemReports)
      .where(where)
      .orderBy(desc(problemReports.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      total: totalRow?.count ?? 0,
      count: rows.length,
      limit,
      offset,
      data: rows.map(toPublicReport),
    });
  } catch (error) {
    next(error);
  }
});

// 2. POST / - report a problem (residents, NGOs and institutions)
problemReportsRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw ApiError.validation('Treść żądania musi być obiektem JSON.');
    }

    const title = parseBodyText(body.title, 'title', 300);
    if (!title || title.length < 3) {
      throw ApiError.validation('Pole „title” jest wymagane (co najmniej 3 znaki).');
    }
    const description = parseBodyText(body.description, 'description', 5000);
    if (!description || description.length < 20) {
      throw ApiError.validation('Pole „description” jest wymagane (co najmniej 20 znaków).');
    }

    const category = parseBodyText(body.category, 'category', 160);
    const municipality = parseBodyText(body.municipality, 'municipality', 160);
    const county = parseBodyText(body.county, 'county', 160);
    const contactEmail = parseOptionalEmail(body.contactEmail);
    const reporterType = parseReporterType(body.reporterType);

    const userId = await resolveUserId(req);

    const [created] = await db
      .insert(problemReports)
      .values({
        userId,
        title,
        description,
        category: category ?? null,
        municipality: municipality ?? null,
        county: county ?? null,
        reporterType,
        contactEmail: contactEmail ?? null,
      })
      .returning();

    res.status(201).json({
      message: 'Dziękujemy. Zgłoszenie problemu zostało przyjęte.',
      data: toPublicReport(created),
    });
  } catch (error) {
    next(error);
  }
});

// 3. GET /:id - single report with the public status and response
problemReportsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id, 'id');
    const [row] = await db
      .select()
      .from(problemReports)
      .where(eq(problemReports.id, id))
      .limit(1);
    if (!row) {
      throw ApiError.notFound('Nie znaleziono zgłoszenia o podanym identyfikatorze.');
    }
    res.json({ data: toPublicReport(row) });
  } catch (error) {
    next(error);
  }
});

// 4. PATCH /:id - administrator updates the status / response
problemReportsRouter.patch('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id, 'id');

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw ApiError.validation('Treść żądania musi być obiektem JSON.');
    }
    const status = parseStatus(body.status, 'status');
    const adminResponse = parseBodyText(body.adminResponse, 'adminResponse', 5000);
    if (status === undefined && adminResponse === undefined) {
      throw ApiError.validation('Podaj „status” lub „adminResponse”.');
    }

    const [updated] = await db
      .update(problemReports)
      .set({
        ...(status === undefined ? {} : { status }),
        ...(adminResponse === undefined ? {} : { adminResponse }),
        updatedAt: new Date(),
      })
      .where(eq(problemReports.id, id))
      .returning();

    if (!updated) {
      throw ApiError.notFound('Nie znaleziono zgłoszenia o podanym identyfikatorze.');
    }

    res.json({ message: 'Zgłoszenie zostało zaktualizowane.', data: toPublicReport(updated) });
  } catch (error) {
    next(error);
  }
});

export default problemReportsRouter;
