import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  cosineSimilarity,
  hashEmbedding,
  lexicalOverlap,
  stem,
  tokenize,
} from './text.js';

describe('text utilities', () => {
  test('tokenize drops Polish stopwords and short tokens', () => {
    assert.deepEqual(tokenize('i oraz kot'), ['kot']);
    assert.deepEqual(tokenize('ab kot'), ['kot']);
    const tokens = tokenize('W to jest bardzo mały dom');
    assert.ok(tokens.includes('dom'));
    assert.ok(!tokens.includes('jest'));
    assert.ok(!tokens.includes('to'));
    for (const token of tokens) {
      assert.ok(token.length >= 3, `token "${token}" should not be shorter than 3`);
    }
  });

  test('stem trims common Polish suffixes but leaves short tokens alone', () => {
    assert.equal(stem('domami'), 'dom');
    assert.equal(stem('rodzinach'), 'rodzin');
    assert.equal(stem('seniorami'), 'senior');
    assert.equal(stem('kot'), 'kot');
  });

  test('cosineSimilarity is ~1 for identical vectors and 0 for orthogonal ones', () => {
    assert.ok(Math.abs(cosineSimilarity([1, 2, 3], [1, 2, 3]) - 1) < 1e-12);
    assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
    assert.equal(cosineSimilarity([], []), 0);
  });

  test('hashEmbedding is deterministic and L2-normalised', () => {
    const a = hashEmbedding('samotność seniora', 256);
    const b = hashEmbedding('samotność seniora', 256);
    assert.deepEqual(a, b);
    assert.equal(a.length, 256);

    const norm = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
    assert.ok(Math.abs(norm - 1) < 1e-9, `expected unit norm, got ${norm}`);

    const other = hashEmbedding('transport wiejski', 256);
    assert.notDeepEqual(a, other);
  });

  test('lexicalOverlap is 0 for disjoint sets and >0 for overlapping ones', () => {
    assert.equal(lexicalOverlap(['senior'], ['smog']), 0);
    assert.equal(lexicalOverlap([], ['senior']), 0);
    const overlap = lexicalOverlap(['senior'], ['senior']);
    assert.ok(overlap > 0);
    assert.ok(overlap <= 1);
  });
});
