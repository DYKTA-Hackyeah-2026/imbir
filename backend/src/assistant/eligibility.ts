import type { ConversationState, EligibilityStatus, Program } from './domain.js';

/**
 * Deterministic eligibility evaluation. A program is only excluded on an
 * explicit conflict; missing user information yields `unknown`, never `conflict`.
 * This is intentionally not a general rule engine.
 */
export function evaluateEligibility(state: ConversationState, program: Program): EligibilityStatus {
  const criteria = program.eligibility;
  if (!criteria) {
    return 'unknown';
  }

  let unknown = false;

  if (criteria.minAge !== undefined || criteria.maxAge !== undefined) {
    const age = state.facts.age;
    if (age === undefined) {
      unknown = true;
    } else if (
      (criteria.minAge !== undefined && age < criteria.minAge) ||
      (criteria.maxAge !== undefined && age > criteria.maxAge)
    ) {
      return 'conflict';
    }
  }

  if (criteria.residentRequired === true && state.facts.location === undefined) {
    unknown = true;
  }

  if (criteria.employmentStatus && criteria.employmentStatus.length > 0) {
    const employmentStatus = state.facts.employmentStatus;
    if (employmentStatus === undefined) {
      unknown = true;
    } else if (!criteria.employmentStatus.includes(employmentStatus)) {
      return 'conflict';
    }
  }

  if (criteria.housingStatus && criteria.housingStatus.length > 0) {
    const housingStatus = state.facts.housingStatus;
    if (housingStatus === undefined) {
      unknown = true;
    } else if (!criteria.housingStatus.includes(housingStatus)) {
      return 'conflict';
    }
  }

  return unknown ? 'unknown' : 'eligible';
}
