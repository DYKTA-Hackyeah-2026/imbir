import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MatchmakingInput } from './domain.js';
import { buildClarifyingQuestions, interpretProblem } from './interpreter.js';

const LONG_SENIOR_PROBLEM =
  'W naszej gminie wiele osób starszych mieszka samotnie i nie ma kontaktu z innymi. ' +
  'Chcemy zorganizować wsparcie sąsiedzkie oraz regularne zajęcia aktywizujące dla seniorów.';

describe('interpretProblem', () => {
  test('extracts recipients, needs and local context', () => {
    const input: MatchmakingInput = {
      problemDescription:
        'W naszej gminie wiele osób starszych mieszka samotnie i potrzebuje wsparcia sąsiedzkiego.',
      userType: 'local_government',
      location: { municipality: 'Kraków', county: 'krakowski' },
    };

    const interpretation = interpretProblem(input);

    assert.ok(interpretation.recipients.includes('Seniorzy'));
    assert.ok(interpretation.needs.some((need) => need.id === 'senior_loneliness'));
    assert.ok(interpretation.localContext.includes('gmina: Kraków'));
    assert.ok(interpretation.localContext.includes('powiat: krakowski'));
  });
});

describe('buildClarifyingQuestions', () => {
  test('returns no questions for a long, clear description with a target group', () => {
    const input: MatchmakingInput = {
      problemDescription: LONG_SENIOR_PROBLEM,
      userType: 'local_government',
      targetGroups: ['Seniorzy'],
      location: { municipality: 'Kraków' },
    };
    const questions = buildClarifyingQuestions(input, interpretProblem(input));
    assert.equal(questions.length, 0);
  });

  test('returns 1..3 questions for a vague short description', () => {
    const input: MatchmakingInput = {
      problemDescription: 'Mamy problem w naszej gminie.',
      userType: 'local_government',
    };
    const questions = buildClarifyingQuestions(input, interpretProblem(input));
    assert.ok(questions.length >= 1, 'expected at least one clarifying question');
    assert.ok(questions.length <= 3, 'expected at most three clarifying questions');
  });
});
