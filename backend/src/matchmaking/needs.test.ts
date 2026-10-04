import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { detectNeeds } from './needs.js';

function needIds(text: string): string[] {
  return detectNeeds(text).map((need) => need.id);
}

describe('detectNeeds', () => {
  test('detects senior loneliness and community volunteering in a Polish sentence', () => {
    const ids = needIds(
      'W naszej gminie wiele osób starszych mieszka samotnie. Mamy grupę wolontariuszy gotowych do sąsiedzkiej pomocy.',
    );
    assert.ok(ids.includes('senior_loneliness'), `expected senior_loneliness in ${ids.join(', ')}`);
    assert.ok(ids.includes('volunteering_community'), `expected volunteering_community in ${ids.join(', ')}`);
  });

  test('detects environment for a smog sentence', () => {
    const ids = needIds('W mieście występuje duży smog i zanieczyszczenie powietrza.');
    assert.ok(ids.includes('environment'), `expected environment in ${ids.join(', ')}`);
  });

  test('returns no needs for an unrelated parking sentence', () => {
    assert.deepEqual(detectNeeds('Zbyt mało miejsc parkingowych'), []);
  });
});
