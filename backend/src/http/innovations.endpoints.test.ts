import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, test } from 'node:test';
import { createDeterministicGateway } from '../ai/deterministic.js';
import { createApp } from '../app.js';
import { MatchmakingService } from '../matchmaking/service.js';
import type { CatalogueInnovation, CatalogueRepository, CatalogueSource } from '../repositories/types.js';

/** Minimal in-memory catalogue that mirrors the ROPS import shape. */
const SAMPLE_INNOVATIONS: CatalogueInnovation[] = [
  {
    id: 'rops-bawita',
    title: 'BaWita',
    summary: 'Tablica manipulacyjno-terapeutyczna dla seniorów i osób z chorobami dementywnymi.',
    description: 'BaWita - tablica manipulacyjno terapeutyczna dla seniorów.',
    sourceId: 'src-library',
    synthetic: false,
    evidenceStatus: 'partially_documented',
    problemTags: ['seniorzy', 'senior_loneliness', 'zdrowie'],
    targetGroups: ['Seniorzy'],
    testedIn: ['Małopolska'],
    applicableContexts: ['gmina'],
    prerequisites: [],
    resourcesRequired: [],
    estimatedCostPln: null,
    timeframeWeeks: null,
  },
  {
    id: 'rops-agencja-pracy-incydentalnej',
    title: 'Agencja pracy incydentalnej',
    summary: 'Model pomagający osobom w głębokim kryzysie wrócić na rynek pracy.',
    description: 'Model działania Agencji Pracy Incydentalnej.',
    sourceId: 'src-library',
    synthetic: false,
    evidenceStatus: 'partially_documented',
    problemTags: ['unemployment_activation', 'poverty_exclusion'],
    targetGroups: ['Osoby bezrobotne'],
    testedIn: ['Małopolska'],
    applicableContexts: ['powiat'],
    prerequisites: [],
    resourcesRequired: [],
    estimatedCostPln: null,
    timeframeWeeks: null,
  },
];

const SAMPLE_SOURCE: CatalogueSource = {
  id: 'src-library',
  title: 'Biblioteka Innowacji Społecznych ROPS',
  url: 'https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie',
  kind: 'innovation_library',
  urlVerified: true,
  synthetic: false,
};

/** Read-only repository exposing a non-synthetic (imported) catalogue. */
class SampleRepository implements CatalogueRepository {
  readonly kind = 'memory' as const;

  async listInnovations(): Promise<CatalogueInnovation[]> {
    return SAMPLE_INNOVATIONS;
  }

  async getInnovation(id: string): Promise<CatalogueInnovation | undefined> {
    return SAMPLE_INNOVATIONS.find((innovation) => innovation.id === id);
  }

  async listCitations(innovationId: string) {
    const innovation = SAMPLE_INNOVATIONS.find((item) => item.id === innovationId);
    if (!innovation) return [];
    return [
      {
        innovationId,
        sourceId: innovation.sourceId,
        title: innovation.title,
        url: 'https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/dla-seniorow,bawita',
        excerpt: innovation.summary,
      },
    ];
  }

  async listEvidence() {
    return [];
  }

  async getSource(id: string): Promise<CatalogueSource | undefined> {
    return id === SAMPLE_SOURCE.id ? SAMPLE_SOURCE : undefined;
  }

  async saveRequest(): Promise<void> {}
  async getRequest(): Promise<undefined> {
    return undefined;
  }
  async saveFeedback(): Promise<void> {}
}

type JsonBody = Record<string, any>;

async function readJson(response: Response): Promise<JsonBody> {
  return (await response.json()) as JsonBody;
}

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const service = new MatchmakingService({
    repository: new SampleRepository(),
    ai: createDeterministicGateway(256),
    seedWarnings: [],
    hasVerifiedCatalogue: true,
  });
  const app = createApp({ matchmakingService: service });
  const server = app.listen(0);
  try {
    await once(server, 'listening');
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe('Innovations endpoints (imported ROPS catalogue)', () => {
  test('GET /api/v1/innovations lists imported innovations in live mode', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/innovations`);
      assert.equal(response.status, 200);
      assert.ok(response.headers.get('x-request-id'));

      const body = await readJson(response);
      assert.equal(body.mode, 'live');
      assert.equal(body.total, SAMPLE_INNOVATIONS.length);
      assert.equal(body.count, SAMPLE_INNOVATIONS.length);
      assert.equal(body.limit, 20);
      assert.equal(body.offset, 0);

      const first = body.data[0];
      assert.equal(typeof first.innovationId, 'string');
      assert.equal(typeof first.title, 'string');
      assert.equal(typeof first.summary, 'string');
      assert.equal(first.synthetic, false);
      assert.equal(first.evidenceStatus, 'partially_documented');
      assert.ok(Array.isArray(first.problemTags));
      assert.ok(Array.isArray(first.targetGroups));
    });
  });

  test('GET /api/v1/innovations filters by problemTag, targetGroup and synthetic=false', async () => {
    await withServer(async (baseUrl) => {
      const byTag = await readJson(
        await fetch(`${baseUrl}/api/v1/innovations?problemTag=unemployment_activation`),
      );
      assert.equal(byTag.total, 1);
      assert.equal(byTag.data[0].innovationId, 'rops-agencja-pracy-incydentalnej');
      assert.ok(byTag.data[0].problemTags.includes('unemployment_activation'));

      const byGroup = await readJson(
        await fetch(`${baseUrl}/api/v1/innovations?targetGroup=${encodeURIComponent('Seniorzy')}`),
      );
      assert.equal(byGroup.total, 1);
      assert.equal(byGroup.data[0].innovationId, 'rops-bawita');

      const nonSynthetic = await readJson(
        await fetch(`${baseUrl}/api/v1/innovations?synthetic=false`),
      );
      assert.equal(nonSynthetic.total, SAMPLE_INNOVATIONS.length);
    });
  });

  test('GET /api/v1/innovations paginates and validates parameters', async () => {
    await withServer(async (baseUrl) => {
      const page = await readJson(
        await fetch(`${baseUrl}/api/v1/innovations?limit=1&offset=1&sort=title`),
      );
      assert.equal(page.limit, 1);
      assert.equal(page.offset, 1);
      assert.equal(page.count, 1);
      assert.equal(page.total, SAMPLE_INNOVATIONS.length);

      for (const query of ['limit=0', 'limit=abc', 'offset=-1', 'sort=unknown']) {
        const response = await fetch(`${baseUrl}/api/v1/innovations?${query}`);
        assert.equal(response.status, 400, `expected 400 for ?${query}`);
        assert.equal((await readJson(response)).error.code, 'validation_error');
      }
    });
  });

  test('GET /api/v1/innovations/:id returns imported detail with source and citation', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/innovations/rops-bawita`);
      assert.equal(response.status, 200);

      const body = await readJson(response);
      assert.equal(body.innovationId, 'rops-bawita');
      assert.equal(body.title, 'BaWita');
      assert.equal(body.synthetic, false);
      assert.equal(body.source.sourceId, 'src-library');
      assert.equal(body.source.urlVerified, true);
      assert.ok(Array.isArray(body.citations));
      assert.equal(body.citations.length, 1);
      assert.equal(body.citations[0].sourceId, 'src-library');
      assert.match(body.citations[0].url, /rops\.krakow\.pl/);
    });
  });

  test('GET /api/v1/innovations/:id returns 404 for an unknown id', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/innovations/rops-does-not-exist`);
      assert.equal(response.status, 404);
      assert.equal((await readJson(response)).error.code, 'not_found');
    });
  });

  test('POST /api/v1/matchmaking matches against the imported catalogue', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/matchmaking`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          problemDescription:
            'W naszej gminie wiele osób starszych mieszka samotnie i nie ma kontaktu z innymi. ' +
            'Chcemy zorganizować wsparcie sąsiedzkie oraz zajęcia dla seniorów.',
          userType: 'local_government',
          targetGroups: ['Seniorzy'],
        }),
      });
      assert.equal(response.status, 200);
      const body = await readJson(response);
      assert.equal(body.mode, 'live');
      assert.equal(body.status, 'matched');
      assert.ok(body.matches.length >= 1);
      assert.equal(body.matches[0].innovationId, 'rops-bawita');
      assert.equal(body.matches[0].evidenceStatus, 'partially_documented');
    });
  });
});
