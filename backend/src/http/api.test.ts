import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, test } from 'node:test';
import { createDeterministicGateway } from '../ai/deterministic.js';
import { createApp } from '../app.js';
import { MatchmakingService } from '../matchmaking/service.js';
import { MemoryCatalogueRepository } from '../repositories/memory.js';
import { loadSeed } from '../repositories/seedLoader.js';

const LONG_SENIOR_PROBLEM =
  'W naszej gminie wiele osób starszych mieszka samotnie i nie ma kontaktu z innymi. ' +
  'Chcemy zorganizować wsparcie sąsiedzkie i zajęcia dla seniorów.';

const MATCHED_BODY = {
  problemDescription: LONG_SENIOR_PROBLEM,
  userType: 'local_government',
  targetGroups: ['Seniorzy'],
};

const JSON_HEADERS = { 'content-type': 'application/json' };

type JsonBody = Record<string, any>;

async function readJson(response: Response): Promise<JsonBody> {
  return (await response.json()) as JsonBody;
}

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const { seed, warnings, hasVerifiedCatalogue } = loadSeed();
  const service = new MatchmakingService({
    repository: new MemoryCatalogueRepository(seed),
    ai: createDeterministicGateway(256),
    seedWarnings: warnings,
    hasVerifiedCatalogue,
  });
  const app = createApp({ matchmakingService: service });
  const server = app.listen(0);
  try {
    await once(server, 'listening');
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe('HTTP API', () => {
  test('POST /api/v1/matchmaking returns a full response and a request id header', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/matchmaking`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(MATCHED_BODY),
      });

      assert.equal(response.status, 200);
      assert.ok(response.headers.get('x-request-id'), 'x-request-id header must be set');

      const body = await readJson(response);
      assert.equal(typeof body.requestId, 'string');
      assert.ok(body.requestId.length > 0);
      assert.equal(typeof body.status, 'string');
      assert.equal(typeof body.mode, 'string');
      assert.ok(Array.isArray(body.matches));
      assert.ok(Array.isArray(body.warnings));
    });
  });

  test('POST /api/v1/matchmaking rejects a too-short description with a validation envelope', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/matchmaking`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ problemDescription: 'za krótko', userType: 'resident' }),
      });

      assert.equal(response.status, 400);
      const body = await readJson(response);
      assert.equal(body.error.code, 'validation_error');
      assert.equal(typeof body.error.message, 'string');
      assert.ok(body.error.message.length > 0);
      assert.ok(/[ąćęłńóśźż]/.test(body.error.message), 'message should be Polish');
      assert.ok(body.error.requestId, 'error.requestId must be present');
      assert.equal(body.error.retryable, false);
    });
  });

  test('GET /api/v1/innovations/:id returns a synthetic detail with disclaimer', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/innovations/syn-senior-neighborhood`);
      assert.equal(response.status, 200);
      const body = await readJson(response);
      assert.equal(body.synthetic, true);
      assert.equal(typeof body.disclaimer, 'string');
      assert.ok(body.disclaimer.length > 0);
    });
  });

  test('GET /api/v1/innovations returns a paginated catalogue list', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/innovations`);
      assert.equal(response.status, 200);
      const body = await readJson(response);
      assert.ok(body.total > 0, 'seed catalogue should not be empty');
      assert.equal(body.limit, 20);
      assert.equal(body.offset, 0);
      assert.equal(body.count, body.data.length);
      assert.equal(body.mode, 'demo');
      assert.ok(Array.isArray(body.warnings));
      const first = body.data[0];
      assert.equal(typeof first.innovationId, 'string');
      assert.equal(typeof first.title, 'string');
      assert.equal(typeof first.summary, 'string');
      assert.equal(typeof first.evidenceStatus, 'string');
      assert.equal(first.synthetic, true);
      assert.ok(Array.isArray(first.problemTags));
    });
  });

  test('GET /api/v1/innovations filters by query and paginates', async () => {
    await withServer(async (baseUrl) => {
      const all = await readJson(await fetch(`${baseUrl}/api/v1/innovations`));
      const filtered = await readJson(await fetch(`${baseUrl}/api/v1/innovations?q=senior`));
      assert.ok(filtered.total > 0, 'expected matches for "senior"');
      assert.ok(filtered.total < all.total, 'query should narrow the catalogue');
      for (const item of filtered.data) {
        const haystack = `${item.title} ${item.summary} ${item.problemTags.join(' ')}`.toLowerCase();
        assert.ok(haystack.includes('senior'), `unexpected match ${item.innovationId}`);
      }

      const page = await readJson(
        await fetch(`${baseUrl}/api/v1/innovations?problemTag=mental_health&limit=2&offset=1`),
      );
      assert.equal(page.limit, 2);
      assert.equal(page.offset, 1);
      assert.ok(page.count <= 2);
      for (const item of page.data) {
        assert.ok(item.problemTags.includes('mental_health'));
      }

      const none = await readJson(await fetch(`${baseUrl}/api/v1/innovations?synthetic=false`));
      assert.equal(none.total, 0);
      assert.equal(none.data.length, 0);
    });
  });

  test('GET /api/v1/innovations rejects invalid query parameters', async () => {
    await withServer(async (baseUrl) => {
      for (const query of ['limit=0', 'limit=abc', 'offset=-1', 'sort=unknown', 'evidenceStatus=bad']) {
        const response = await fetch(`${baseUrl}/api/v1/innovations?${query}`);
        assert.equal(response.status, 400, `expected 400 for ?${query}`);
        const body = await readJson(response);
        assert.equal(body.error.code, 'validation_error');
      }
    });
  });

  test('GET /api/v1/innovations/:id returns 404 for an unknown innovation', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/innovations/does-not-exist`);
      assert.equal(response.status, 404);
      const body = await readJson(response);
      assert.equal(body.error.code, 'not_found');
    });
  });

  test('tester endpoints reject invalid input before touching the database', async () => {
    await withServer(async (baseUrl) => {
      const badId = await fetch(`${baseUrl}/api/v1/tests/abc`);
      assert.equal(badId.status, 400);
      assert.equal((await readJson(badId)).error.code, 'validation_error');

      const badCreate = await fetch(`${baseUrl}/api/v1/tests`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({}),
      });
      assert.equal(badCreate.status, 400);

      const badApplication = await fetch(`${baseUrl}/api/v1/tests/abc/applications`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ motivation: 'Chcę przetestować' }),
      });
      assert.equal(badApplication.status, 400);

      const badFeedback = await fetch(`${baseUrl}/api/v1/tester/applications/abc/feedback`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ overallRating: 5 }),
      });
      assert.equal(badFeedback.status, 400);

      const tooLongId = await fetch(
        `${baseUrl}/api/v1/innovations/${'x'.repeat(201)}/tester-feedback`,
      );
      assert.equal(tooLongId.status, 400);
    });
  });

  test('problem reports reject invalid input before touching the database', async () => {
    await withServer(async (baseUrl) => {
      const empty = await fetch(`${baseUrl}/api/v1/problem-reports`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({}),
      });
      assert.equal(empty.status, 400);

      const shortTitle = await fetch(`${baseUrl}/api/v1/problem-reports`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ title: 'ab', description: 'Opis problemu społecznego.' }),
      });
      assert.equal(shortTitle.status, 400);

      const badEmail = await fetch(`${baseUrl}/api/v1/problem-reports`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          title: 'Brak transportu',
          description: 'Seniorzy z wsi nie mają jak dojechać do lekarza.',
          contactEmail: 'nie-email',
        }),
      });
      assert.equal(badEmail.status, 400);
      const body = await readJson(badEmail);
      assert.equal(body.error.code, 'validation_error');
      assert.ok(/[ąćęłńóśźż]/.test(body.error.message), 'message should be Polish');

      const badLimit = await fetch(`${baseUrl}/api/v1/problem-reports?limit=0`);
      assert.equal(badLimit.status, 400);
    });
  });

  test('PATCH /api/v1/problem-reports/:id requires an administrator', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/problem-reports/1`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'resolved' }),
      });
      assert.equal(response.status, 401);
    });
  });

  test('GET /api/v1/tester/applications requires authentication', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/tester/applications`);
      assert.equal(response.status, 401);
    });
  });

  test('admin endpoints require authentication', async () => {
    await withServer(async (baseUrl) => {
      const stats = await fetch(`${baseUrl}/api/v1/admin/stats`);
      assert.equal(stats.status, 401);

      const submissions = await fetch(`${baseUrl}/api/v1/admin/submissions`);
      assert.equal(submissions.status, 401);

      const patch = await fetch(`${baseUrl}/api/v1/admin/submissions/1`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ isAccepted: true, status: 'approved' }),
      });
      assert.equal(patch.status, 401);
    });
  });

  test('GET / lists the restored wizard (kreator pomysłów) endpoints', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/`);
      assert.equal(response.status, 200);
      const body = await readJson(response);
      assert.equal(body.endpoints.innovations, '/innovations');
      assert.equal(body.endpoints.wizardOptions, '/innovations/options');
    });
  });

  test('GET /openapi.json returns the OpenAPI document', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/openapi.json`);
      assert.equal(response.status, 200);
    });
  });

  test('feedback flow records feedback for the first match', async () => {
    await withServer(async (baseUrl) => {
      const matchResponse = await fetch(`${baseUrl}/api/v1/matchmaking`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(MATCHED_BODY),
      });
      assert.equal(matchResponse.status, 200);
      const matchBody = await readJson(matchResponse);
      const innovationId = matchBody.matches[0]?.innovationId;
      assert.ok(innovationId, 'expected at least one match to give feedback on');

      const feedbackResponse = await fetch(
        `${baseUrl}/api/v1/matchmaking/${matchBody.requestId}/feedback`,
        {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ innovationId, useful: true }),
        },
      );
      assert.equal(feedbackResponse.status, 201);
      const feedbackBody = await readJson(feedbackResponse);
      assert.equal(feedbackBody.recorded, true);
    });
  });
});
