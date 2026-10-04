import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ApiError } from '../http/errors.js';
import { parseFeedbackInput, parseMatchmakingInput } from './validation.js';

const VALID_DESCRIPTION = 'To jest wystarczająco długi opis problemu społecznego.';

function isValidationError(error: unknown): boolean {
  assert.ok(error instanceof ApiError, 'expected an ApiError instance');
  assert.equal(error.statusCode, 400);
  return true;
}

describe('parseMatchmakingInput', () => {
  test('rejects a non-object body', () => {
    assert.throws(() => parseMatchmakingInput('not an object'), isValidationError);
    assert.throws(() => parseMatchmakingInput(null), isValidationError);
  });

  test('rejects a missing problemDescription', () => {
    assert.throws(() => parseMatchmakingInput({ userType: 'resident' }), isValidationError);
  });

  test('rejects a description shorter than 20 characters', () => {
    assert.throws(
      () => parseMatchmakingInput({ problemDescription: 'za krótki', userType: 'resident' }),
      isValidationError,
    );
  });

  test('rejects an invalid userType', () => {
    assert.throws(
      () => parseMatchmakingInput({ problemDescription: VALID_DESCRIPTION, userType: 'mayor' }),
      isValidationError,
    );
  });

  test('rejects a negative budget', () => {
    assert.throws(
      () =>
        parseMatchmakingInput({
          problemDescription: VALID_DESCRIPTION,
          userType: 'resident',
          constraints: { budgetPln: -1 },
        }),
      isValidationError,
    );
  });

  test('rejects a non-integer timeframeWeeks', () => {
    assert.throws(
      () =>
        parseMatchmakingInput({
          problemDescription: VALID_DESCRIPTION,
          userType: 'resident',
          constraints: { timeframeWeeks: 1.5 },
        }),
      isValidationError,
    );
  });

  test('accepts a valid payload', () => {
    const input = parseMatchmakingInput({
      problemDescription: VALID_DESCRIPTION,
      userType: 'ngo',
      targetGroups: ['Seniorzy'],
      constraints: { budgetPln: 1000, timeframeWeeks: 12 },
    });
    assert.equal(input.problemDescription, VALID_DESCRIPTION);
    assert.equal(input.userType, 'ngo');
    assert.equal(input.constraints?.budgetPln, 1000);
    assert.equal(input.constraints?.timeframeWeeks, 12);
  });
});

describe('parseFeedbackInput', () => {
  test('rejects a missing innovationId', () => {
    assert.throws(() => parseFeedbackInput({ useful: true }), isValidationError);
  });

  test('rejects a non-boolean useful', () => {
    assert.throws(
      () => parseFeedbackInput({ innovationId: 'syn-senior-neighborhood', useful: 'yes' }),
      isValidationError,
    );
  });

  test('rejects an invalid reason', () => {
    assert.throws(
      () =>
        parseFeedbackInput({
          innovationId: 'syn-senior-neighborhood',
          useful: true,
          reason: 'because',
        }),
      isValidationError,
    );
  });

  test('accepts a valid payload', () => {
    const input = parseFeedbackInput({
      innovationId: 'syn-senior-neighborhood',
      useful: true,
      reason: 'not_relevant',
    });
    assert.equal(input.innovationId, 'syn-senior-neighborhood');
    assert.equal(input.useful, true);
    assert.equal(input.reason, 'not_relevant');
  });
});
