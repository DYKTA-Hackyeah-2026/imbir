import { Router } from 'express';
import { and, eq, desc } from 'drizzle-orm';
import { ApiError } from '../http/errors.js';
import { db } from '../db/index.js';
import {
  innovationSubmissions,
  innovationProblems,
  innovationActors,
  innovationCosts,
  innovationAudiences,
  innovationRevenue,
  valueOptions,
  innovationValues,
  innovationChannels,
  innovationTeamMembers,
  users,
  innovationStatusEnum,
  problemIntensityEnum,
  problemFrequencyEnum,
  problemScaleEnum,
  actorTypeEnum,
  affordabilityEnum,
  simplicityEnum,
  costTypeEnum,
  audienceTypeEnum,
  revenueValidationEnum,
  revenueScalabilityEnum,
  valueTypeEnum,
  channelTypeEnum,
} from '../db/schema.js';

const innovationsRouter = Router();

// Helper to validate enum values
function validateEnumField<T extends readonly string[]>(
  val: unknown,
  allowed: T,
  fieldName: string
): string | null {
  if (val === undefined || val === null) return null;
  if (typeof val !== 'string' || !allowed.includes(val as any)) {
    return `Niepoprawna wartość „${String(val)}” dla pola „${fieldName}”. Dozwolone wartości: ${allowed.join(', ')}.`;
  }
  return null;
}

// Strict identifier parsing: rejects values like "12abc" that Number.parseInt would accept.
function parseInnovationId(raw: string | undefined): number {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw ApiError.validation('Niepoprawny identyfikator innowacji.');
  }
  const id = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw ApiError.validation('Niepoprawny identyfikator innowacji.');
  }
  return id;
}

// 1. GET /innovations/options - Fetch all available enums and value options for wizard forms
innovationsRouter.get('/options', async (_req, res, next) => {
  try {
    const dbValueOptions = await db.select().from(valueOptions);

    res.json({
      enums: {
        innovationStatus: innovationStatusEnum.enumValues,
        problemIntensity: problemIntensityEnum.enumValues,
        problemFrequency: problemFrequencyEnum.enumValues,
        problemScale: problemScaleEnum.enumValues,
        actorType: actorTypeEnum.enumValues,
        affordability: affordabilityEnum.enumValues,
        simplicity: simplicityEnum.enumValues,
        costType: costTypeEnum.enumValues,
        audienceType: audienceTypeEnum.enumValues,
        revenueValidation: revenueValidationEnum.enumValues,
        revenueScalability: revenueScalabilityEnum.enumValues,
        valueType: valueTypeEnum.enumValues,
        channelType: channelTypeEnum.enumValues,
      },
      valueOptions: dbValueOptions,
    });
  } catch (err) {
    next(err);
  }
});

// 2. GET /innovations - List innovations
innovationsRouter.get('/', async (req, res, next) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const acceptedFilter = req.query.accepted as string | undefined;
    if (acceptedFilter !== undefined && acceptedFilter !== 'true' && acceptedFilter !== 'false') {
      throw ApiError.validation('Parametr „accepted” musi mieć wartość „true” albo „false”.');
    }

    const conditions = [];
    if (statusFilter) conditions.push(eq(innovationSubmissions.status, statusFilter as any));
    if (acceptedFilter !== undefined) {
      conditions.push(eq(innovationSubmissions.isAccepted, acceptedFilter === 'true'));
    }

    const query = db.query.innovationSubmissions.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(innovationSubmissions.createdAt)],
      with: {
        user: true,
        problem: true,
        actors: true,
        costs: true,
        audiences: true,
        revenue: true,
        values: {
          with: {
            valueOption: true,
          },
        },
        channels: true,
        teamMembers: true,
      },
    });

    const data = await query;
    res.json({ count: data.length, data });
  } catch (err) {
    next(err);
  }
});

// 3. GET /innovations/:id - Get a single innovation with all related sub-entities and enums
innovationsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseInnovationId(req.params.id);

    const item = await db.query.innovationSubmissions.findFirst({
      where: eq(innovationSubmissions.id, id),
      with: {
        user: true,
        problem: true,
        actors: true,
        costs: true,
        audiences: true,
        revenue: true,
        values: {
          with: {
            valueOption: true,
          },
        },
        channels: true,
        teamMembers: true,
      },
    });

    if (!item) {
      throw ApiError.notFound('Nie znaleziono innowacji o podanym identyfikatorze.');
    }

    res.json({ data: item });
  } catch (err) {
    next(err);
  }
});

// 4. POST /innovations - Create an innovation from the creator/wizard form
innovationsRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body;

    if (!body || typeof body !== 'object') {
      throw ApiError.validation('Treść żądania musi być obiektem JSON.');
    }

    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      throw ApiError.validation('Pole „title” jest wymagane i nie może być puste.');
    }

    // Validate enums in main object
    const errors: string[] = [];
    const check = (err: string | null) => {
      if (err) errors.push(err);
    };

    check(validateEnumField(body.status, innovationStatusEnum.enumValues, 'status'));
    check(validateEnumField(body.affordability, affordabilityEnum.enumValues, 'affordability'));
    check(validateEnumField(body.simplicity, simplicityEnum.enumValues, 'simplicity'));

    // Validate problem enums
    if (body.problem) {
      check(validateEnumField(body.problem.intensity, problemIntensityEnum.enumValues, 'problem.intensity'));
      check(validateEnumField(body.problem.frequency, problemFrequencyEnum.enumValues, 'problem.frequency'));
      check(validateEnumField(body.problem.scale, problemScaleEnum.enumValues, 'problem.scale'));
    }

    // Validate actors enums
    if (Array.isArray(body.actors)) {
      body.actors.forEach((a: any, idx: number) => {
        check(validateEnumField(a.type, actorTypeEnum.enumValues, `actors[${idx}].type`));
      });
    }

    // Validate costs enums
    if (Array.isArray(body.costs)) {
      body.costs.forEach((c: any, idx: number) => {
        check(validateEnumField(c.type, costTypeEnum.enumValues, `costs[${idx}].type`));
      });
    }

    // Validate audiences enums
    if (Array.isArray(body.audiences)) {
      body.audiences.forEach((aud: any, idx: number) => {
        check(validateEnumField(aud.type, audienceTypeEnum.enumValues, `audiences[${idx}].type`));
      });
    }

    // Validate revenue enums
    if (body.revenue) {
      check(validateEnumField(body.revenue.validation, revenueValidationEnum.enumValues, 'revenue.validation'));
      check(validateEnumField(body.revenue.scalability, revenueScalabilityEnum.enumValues, 'revenue.scalability'));
    }

    // Validate channels enums
    if (Array.isArray(body.channels)) {
      body.channels.forEach((ch: any, idx: number) => {
        check(validateEnumField(ch.type, channelTypeEnum.enumValues, `channels[${idx}].type`));
      });
    }

    if (errors.length > 0) {
      throw ApiError.validation(`Niepoprawne wartości pól formularza: ${errors.join(' ')}`);
    }

    // Determine or default userId
    let userId = typeof body.userId === 'number' ? body.userId : null;
    if (!userId) {
      // Find default user or create one
      const [existingUser] = await db.select().from(users).limit(1);
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const [newUser] = await db.insert(users).values({
          email: 'demo@hubmi.io',
          name: 'Użytkownik Demo',
        }).returning();
        userId = newUser.id;
      }
    }

    // Execute insertion in a single transaction
    const createdInnovationId = await db.transaction(async (tx) => {
      // 1. Insert main innovation
      const [newInnovation] = await tx.insert(innovationSubmissions).values({
        userId,
        title: body.title.trim(),
        description: body.description ?? null,
        innovationType: body.innovationType ?? null,
        socialInclusionDescription: body.socialInclusionDescription ?? null,
        deinstitutionalizationDescription: body.deinstitutionalizationDescription ?? null,
        innovationUniqueness: body.innovationUniqueness ?? null,
        existingSolutions: body.existingSolutions ?? null,
        problemDescription: body.problemDescription ?? null,
        problemStatistics: body.problemStatistics ?? null,
        problemSources: body.problemSources ?? null,
        socialChallengesMapReference: body.socialChallengesMapReference ?? null,
        audienceDescription: body.audienceDescription ?? null,
        audienceNeeds: body.audienceNeeds ?? null,
        exclusionRiskDescription: body.exclusionRiskDescription ?? null,
        expectedChange: body.expectedChange ?? null,
        socialInclusionImpact: body.socialInclusionImpact ?? null,
        futureVision: body.futureVision ?? null,
        scalabilityDescription: body.scalabilityDescription ?? null,
        implementationEase: body.implementationEase ?? null,
        requestedGrantAmount: body.requestedGrantAmount ? String(body.requestedGrantAmount) : null,
        teamExperience: body.teamExperience ?? null,
        affordability: body.affordability ?? null,
        simplicity: body.simplicity ?? null,
        status: body.status ?? 'draft',
        currentStep: typeof body.currentStep === 'number' ? body.currentStep : 1,
      }).returning();

      const innovationId = newInnovation.id;

      // 2. Insert problem details if provided
      if (body.problem) {
        await tx.insert(innovationProblems).values({
          innovationId,
          intensity: body.problem.intensity ?? null,
          frequency: body.problem.frequency ?? null,
          scale: body.problem.scale ?? null,
        });
      }

      // 3. Insert actors if provided
      if (Array.isArray(body.actors) && body.actors.length > 0) {
        const actorsData = body.actors
          .filter((a: any) => a.type && a.name)
          .map((a: any) => ({
            innovationId,
            type: a.type,
            name: a.name,
            description: a.description ?? null,
          }));
        if (actorsData.length > 0) {
          await tx.insert(innovationActors).values(actorsData);
        }
      }

      // 4. Insert costs if provided
      if (Array.isArray(body.costs) && body.costs.length > 0) {
        const costsData = body.costs
          .filter((c: any) => c.type && c.name)
          .map((c: any) => ({
            innovationId,
            type: c.type,
            name: c.name,
            amount: c.amount !== undefined ? String(c.amount) : null,
            description: c.description ?? null,
          }));
        if (costsData.length > 0) {
          await tx.insert(innovationCosts).values(costsData);
        }
      }

      // 5. Insert audiences if provided
      if (Array.isArray(body.audiences) && body.audiences.length > 0) {
        const audiencesData = body.audiences
          .filter((aud: any) => aud.type && aud.value)
          .map((aud: any) => ({
            innovationId,
            type: aud.type,
            value: aud.value,
            customValue: aud.customValue ?? null,
          }));
        if (audiencesData.length > 0) {
          await tx.insert(innovationAudiences).values(audiencesData);
        }
      }

      // 6. Insert revenue if provided
      if (body.revenue) {
        await tx.insert(innovationRevenue).values({
          innovationId,
          validation: body.revenue.validation ?? null,
          mainSource: body.revenue.mainSource ?? null,
          scalability: body.revenue.scalability ?? null,
          additionalSource: body.revenue.additionalSource ?? null,
        });
      }

      // 7. Insert values if provided
      if (Array.isArray(body.values) && body.values.length > 0) {
        const valuesData = body.values
          .filter((v: any) => v.valueOptionId || v.customValue)
          .map((v: any) => ({
            innovationId,
            valueOptionId: v.valueOptionId ?? null,
            customValue: v.customValue ?? null,
          }));
        if (valuesData.length > 0) {
          await tx.insert(innovationValues).values(valuesData);
        }
      }

      // 8. Insert channels if provided
      if (Array.isArray(body.channels) && body.channels.length > 0) {
        const channelsData = body.channels
          .filter((ch: any) => ch.type && ch.value)
          .map((ch: any) => ({
            innovationId,
            type: ch.type,
            value: ch.value,
            customValue: ch.customValue ?? null,
          }));
        if (channelsData.length > 0) {
          await tx.insert(innovationChannels).values(channelsData);
        }
      }

      // 9. Insert team members if provided
      if (Array.isArray(body.teamMembers) && body.teamMembers.length > 0) {
        const membersData = body.teamMembers
          .filter((m: any) => m.name)
          .map((m: any) => ({
            innovationId,
            name: m.name,
            role: m.role ?? null,
            experience: m.experience ?? null,
            organization: m.organization ?? null,
          }));
        if (membersData.length > 0) {
          await tx.insert(innovationTeamMembers).values(membersData);
        }
      }

      return innovationId;
    });

    // Fetch the created full record with all relations to return to client
    const fullResult = await db.query.innovationSubmissions.findFirst({
      where: eq(innovationSubmissions.id, createdInnovationId),
      with: {
        user: true,
        problem: true,
        actors: true,
        costs: true,
        audiences: true,
        revenue: true,
        values: {
          with: {
            valueOption: true,
          },
        },
        channels: true,
        teamMembers: true,
      },
    });

    res.status(201).json({
      message: 'Innovation created successfully',
      data: fullResult,
    });
  } catch (err) {
    next(err);
  }
});

// 5. PUT /innovations/:id - Update an innovation (e.g. saving steps in wizard)
innovationsRouter.put('/:id', async (req, res, next) => {
  try {
    const id = parseInnovationId(req.params.id);

    const [existing] = await db.select().from(innovationSubmissions).where(eq(innovationSubmissions.id, id)).limit(1);
    if (!existing) {
      throw ApiError.notFound('Nie znaleziono innowacji o podanym identyfikatorze.');
    }

    const body = req.body;
    if (!body || typeof body !== 'object') {
      throw ApiError.validation('Treść żądania musi być obiektem JSON.');
    }

    const errors: string[] = [];
    const check = (err: string | null) => {
      if (err) errors.push(err);
    };

    if (body.status !== undefined) check(validateEnumField(body.status, innovationStatusEnum.enumValues, 'status'));
    if (body.affordability !== undefined) check(validateEnumField(body.affordability, affordabilityEnum.enumValues, 'affordability'));
    if (body.simplicity !== undefined) check(validateEnumField(body.simplicity, simplicityEnum.enumValues, 'simplicity'));

    if (body.problem) {
      check(validateEnumField(body.problem.intensity, problemIntensityEnum.enumValues, 'problem.intensity'));
      check(validateEnumField(body.problem.frequency, problemFrequencyEnum.enumValues, 'problem.frequency'));
      check(validateEnumField(body.problem.scale, problemScaleEnum.enumValues, 'problem.scale'));
    }

    if (body.revenue) {
      check(validateEnumField(body.revenue.validation, revenueValidationEnum.enumValues, 'revenue.validation'));
      check(validateEnumField(body.revenue.scalability, revenueScalabilityEnum.enumValues, 'revenue.scalability'));
    }

    if (errors.length > 0) {
      throw ApiError.validation(`Niepoprawne wartości pól formularza: ${errors.join(' ')}`);
    }

    await db.transaction(async (tx) => {
      // 1. Update main record fields
      const updateData: Record<string, any> = { updatedAt: new Date() };
      const directFields = [
        'title',
        'description',
        'innovationType',
        'socialInclusionDescription',
        'deinstitutionalizationDescription',
        'innovationUniqueness',
        'existingSolutions',
        'problemDescription',
        'problemStatistics',
        'problemSources',
        'socialChallengesMapReference',
        'audienceDescription',
        'audienceNeeds',
        'exclusionRiskDescription',
        'expectedChange',
        'socialInclusionImpact',
        'futureVision',
        'scalabilityDescription',
        'implementationEase',
        'teamExperience',
        'affordability',
        'simplicity',
        'status',
        'currentStep',
      ];

      for (const field of directFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }
      if (body.requestedGrantAmount !== undefined) {
        updateData.requestedGrantAmount = body.requestedGrantAmount ? String(body.requestedGrantAmount) : null;
      }

      await tx.update(innovationSubmissions).set(updateData).where(eq(innovationSubmissions.id, id));

      // 2. Update problem if provided
      if (body.problem) {
        await tx.delete(innovationProblems).where(eq(innovationProblems.innovationId, id));
        await tx.insert(innovationProblems).values({
          innovationId: id,
          intensity: body.problem.intensity ?? null,
          frequency: body.problem.frequency ?? null,
          scale: body.problem.scale ?? null,
        });
      }

      // 3. Update actors if array provided
      if (Array.isArray(body.actors)) {
        await tx.delete(innovationActors).where(eq(innovationActors.innovationId, id));
        const actorsData = body.actors
          .filter((a: any) => a.type && a.name)
          .map((a: any) => ({
            innovationId: id,
            type: a.type,
            name: a.name,
            description: a.description ?? null,
          }));
        if (actorsData.length > 0) {
          await tx.insert(innovationActors).values(actorsData);
        }
      }

      // 4. Update costs if array provided
      if (Array.isArray(body.costs)) {
        await tx.delete(innovationCosts).where(eq(innovationCosts.innovationId, id));
        const costsData = body.costs
          .filter((c: any) => c.type && c.name)
          .map((c: any) => ({
            innovationId: id,
            type: c.type,
            name: c.name,
            amount: c.amount !== undefined ? String(c.amount) : null,
            description: c.description ?? null,
          }));
        if (costsData.length > 0) {
          await tx.insert(innovationCosts).values(costsData);
        }
      }

      // 5. Update audiences if array provided
      if (Array.isArray(body.audiences)) {
        await tx.delete(innovationAudiences).where(eq(innovationAudiences.innovationId, id));
        const audiencesData = body.audiences
          .filter((aud: any) => aud.type && aud.value)
          .map((aud: any) => ({
            innovationId: id,
            type: aud.type,
            value: aud.value,
            customValue: aud.customValue ?? null,
          }));
        if (audiencesData.length > 0) {
          await tx.insert(innovationAudiences).values(audiencesData);
        }
      }

      // 6. Update revenue if provided
      if (body.revenue) {
        await tx.delete(innovationRevenue).where(eq(innovationRevenue.innovationId, id));
        await tx.insert(innovationRevenue).values({
          innovationId: id,
          validation: body.revenue.validation ?? null,
          mainSource: body.revenue.mainSource ?? null,
          scalability: body.revenue.scalability ?? null,
          additionalSource: body.revenue.additionalSource ?? null,
        });
      }

      // 7. Update values if array provided
      if (Array.isArray(body.values)) {
        await tx.delete(innovationValues).where(eq(innovationValues.innovationId, id));
        const valuesData = body.values
          .filter((v: any) => v.valueOptionId || v.customValue)
          .map((v: any) => ({
            innovationId: id,
            valueOptionId: v.valueOptionId ?? null,
            customValue: v.customValue ?? null,
          }));
        if (valuesData.length > 0) {
          await tx.insert(innovationValues).values(valuesData);
        }
      }

      // 8. Update channels if array provided
      if (Array.isArray(body.channels)) {
        await tx.delete(innovationChannels).where(eq(innovationChannels.innovationId, id));
        const channelsData = body.channels
          .filter((ch: any) => ch.type && ch.value)
          .map((ch: any) => ({
            innovationId: id,
            type: ch.type,
            value: ch.value,
            customValue: ch.customValue ?? null,
          }));
        if (channelsData.length > 0) {
          await tx.insert(innovationChannels).values(channelsData);
        }
      }

      // 9. Update team members if array provided
      if (Array.isArray(body.teamMembers)) {
        await tx.delete(innovationTeamMembers).where(eq(innovationTeamMembers.innovationId, id));
        const membersData = body.teamMembers
          .filter((m: any) => m.name)
          .map((m: any) => ({
            innovationId: id,
            name: m.name,
            role: m.role ?? null,
            experience: m.experience ?? null,
            organization: m.organization ?? null,
          }));
        if (membersData.length > 0) {
          await tx.insert(innovationTeamMembers).values(membersData);
        }
      }
    });

    const updated = await db.query.innovationSubmissions.findFirst({
      where: eq(innovationSubmissions.id, id),
      with: {
        user: true,
        problem: true,
        actors: true,
        costs: true,
        audiences: true,
        revenue: true,
        values: {
          with: {
            valueOption: true,
          },
        },
        channels: true,
        teamMembers: true,
      },
    });

    res.json({
      message: 'Innovation updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// 6. DELETE /innovations/:id - Delete an innovation
innovationsRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInnovationId(req.params.id);

    const [deleted] = await db.delete(innovationSubmissions).where(eq(innovationSubmissions.id, id)).returning();
    if (!deleted) {
      throw ApiError.notFound('Nie znaleziono innowacji o podanym identyfikatorze.');
    }

    res.json({ message: 'Innovation deleted successfully', data: { id: deleted.id } });
  } catch (err) {
    next(err);
  }
});

export default innovationsRouter;
