import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createDeterministicGateway } from '../ai/deterministic.js';
import { ApiError } from '../http/errors.js';
import type { CatalogueRepository } from '../repositories/types.js';
import { loadSeed } from '../repositories/seedLoader.js';
import { MemoryCatalogueRepository } from '../repositories/memory.js';
import { MatchmakingService } from './service.js';

const LONG_SENIOR_PROBLEM =
  'W naszej gminie wiele osób starszych mieszka samotnie i nie ma kontaktu z innymi. ' +
  'Chcemy zorganizować wsparcie sąsiedzkie i zajęcia dla seniorów.';

const VAGUE_PROBLEM = 'Mamy problem w naszej gminie.';

function createService(repository?: CatalogueRepository): MatchmakingService {
  const loaded = loadSeed();
  return new MatchmakingService({
    repository: repository ?? new MemoryCatalogueRepository(loaded.seed),
    ai: createDeterministicGateway(256),
    seedWarnings: loaded.warnings,
    hasVerifiedCatalogue: loaded.hasVerifiedCatalogue,
  });
}

describe('MatchmakingService.match (default synthetic catalogue)', () => {
  test('matches a long senior-loneliness problem in demo mode', async () => {
    const service = createService();
    const response = await service.match({
      problemDescription: LONG_SENIOR_PROBLEM,
      userType: 'local_government',
      targetGroups: ['Seniorzy'],
    });

    assert.equal(response.status, 'matched');
    assert.equal(response.mode, 'demo');
    assert.ok(response.matches.length >= 1);
    assert.ok(response.matches.length <= 5);
    assert.equal(response.matches[0]?.innovationId, 'syn-senior-neighborhood');
    for (const match of response.matches) {
      assert.equal(match.evidenceStatus, 'synthetic');
    }
  });

  test('asks for clarification on a vague description', async () => {
    const service = createService();
    const response = await service.match({
      problemDescription: VAGUE_PROBLEM,
      userType: 'local_government',
    });

    assert.equal(response.status, 'needs_clarification');
    assert.equal(response.matches.length, 0);
    assert.ok(response.clarifyingQuestions.length >= 1);
    assert.ok(response.clarifyingQuestions.length <= 3);
  });

  test('returns no_match for an empty catalogue', async () => {
    const empty = new MemoryCatalogueRepository({
      sources: [],
      innovations: [],
      citations: [],
      evidence: [],
    });
    const service = createService(empty);
    const response = await service.match({
      problemDescription: LONG_SENIOR_PROBLEM,
      userType: 'local_government',
      targetGroups: ['Seniorzy'],
    });

    assert.equal(response.status, 'no_match');
    assert.equal(response.matches.length, 0);
  });

  test('deduplicates match ids and titles', async () => {
    const service = createService();
    const response = await service.match({
      problemDescription: LONG_SENIOR_PROBLEM,
      userType: 'local_government',
      targetGroups: ['Seniorzy'],
    });

    const ids = response.matches.map((match) => match.innovationId);
    const titles = response.matches.map((match) => match.title);
    assert.equal(new Set(ids).size, ids.length, 'innovation ids must be unique');
    assert.equal(new Set(titles).size, titles.length, 'titles must be unique');
  });
});

describe('MatchmakingService.submitFeedback', () => {
  test('records feedback for a recommendation in the response', async () => {
    const service = createService();
    const response = await service.match({
      problemDescription: LONG_SENIOR_PROBLEM,
      userType: 'local_government',
      targetGroups: ['Seniorzy'],
    });
    assert.equal(response.status, 'matched');
    const innovationId = response.matches[0]?.innovationId;
    assert.ok(innovationId);

    const feedback = await service.submitFeedback(response.requestId, {
      innovationId,
      useful: true,
    });
    assert.equal(feedback.recorded, true);
    assert.equal(feedback.innovationId, innovationId);
    assert.equal(feedback.requestId, response.requestId);
  });

  test('rejects feedback for an unknown requestId with a 404 ApiError', async () => {
    const service = createService();
    await assert.rejects(
      () => service.submitFeedback('unknown-request-id', { innovationId: 'x', useful: true }),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 404);
        return true;
      },
    );
  });

  test('rejects feedback for an innovation not in the response with a 400 ApiError', async () => {
    const service = createService();
    const response = await service.match({
      problemDescription: LONG_SENIOR_PROBLEM,
      userType: 'local_government',
      targetGroups: ['Seniorzy'],
    });

    await assert.rejects(
      () =>
        service.submitFeedback(response.requestId, {
          innovationId: 'innovation-not-in-response',
          useful: true,
        }),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 400);
        return true;
      },
    );
  });
});
