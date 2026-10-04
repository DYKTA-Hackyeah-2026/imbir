import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { registerSchema } from './auth.schemas.js';

const base = { email: 'jan@example.com', password: 'Haslo1234' };

describe('registerSchema name field', () => {
  test('accepts a valid name and trims surrounding whitespace', () => {
    const parsed = registerSchema.parse({ ...base, name: '  Jan Kowalski  ' });
    assert.equal(parsed.name, 'Jan Kowalski');
  });

  test('normalizes the email while keeping the name', () => {
    const parsed = registerSchema.parse({ ...base, email: 'JAN@Example.com', name: 'Jan' });
    assert.equal(parsed.email, 'jan@example.com');
    assert.equal(parsed.name, 'Jan');
  });

  test('requires the name field', () => {
    const result = registerSchema.safeParse(base);
    assert.equal(result.success, false);
    assert.equal(result.error?.issues[0]?.path.join('.'), 'name');
  });

  test('rejects a name shorter than 2 characters after trimming', () => {
    const result = registerSchema.safeParse({ ...base, name: ' J ' });
    assert.equal(result.success, false);
    assert.equal(result.error?.issues[0]?.path.join('.'), 'name');
    assert.match(result.error?.issues[0]?.message ?? '', /at least 2/);
  });

  test('rejects a name longer than 60 characters', () => {
    const result = registerSchema.safeParse({ ...base, name: 'x'.repeat(61) });
    assert.equal(result.success, false);
    assert.equal(result.error?.issues[0]?.path.join('.'), 'name');
    assert.match(result.error?.issues[0]?.message ?? '', /at most 60/);
  });
});
